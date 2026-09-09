import { createClient } from '@supabase/supabase-js';

const defaultUrl = 'https://zofddiuswdtbqvqycezy.supabase.co';
const defaultAnonKey = 'sb_publishable_3Tq3aFWatBH3kBSTbcULtg_Ip2pzPGj';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || defaultUrl;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || defaultAnonKey;

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') return res.status(204).end();
    res.writeHead(204);
    return res.end();
  }

  if (req.method !== 'POST') {
    const err = { error: 'Method Not Allowed. Use POST.' };
    if (typeof res.status === 'function') return res.status(405).json(err);
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(err));
  }

  // 1. Authorize caller via Supabase JWT
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = { error: 'Unauthorized: Missing or invalid Authorization header.' };
    if (typeof res.status === 'function') return res.status(401).json(err);
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(err));
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    const err = { error: 'Unauthorized: Invalid or expired authentication session.' };
    if (typeof res.status === 'function') return res.status(401).json(err);
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(err));
  }

  const isAuthorized = await verifyUserRole(user, supabase);
  if (!isAuthorized) {
    const err = { error: 'Forbidden: Admin authorization required for image optimization.' };
    if (typeof res.status === 'function') return res.status(403).json(err);
    res.writeHead(403, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(err));
  }

  // 2. Parse Request Body
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  } else if (!body) {
    body = await new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk: any) => { data += chunk; });
      req.on('end', () => {
        try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
      });
      req.on('error', () => resolve({}));
    });
  }

  const { fileName = 'image.webp', folder = 'admin-optimized', dataBase64, metadata = {} } = body || {};

  if (!dataBase64) {
    const err = { error: 'Bad Request: Missing image data in request body.' };
    if (typeof res.status === 'function') return res.status(400).json(err);
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(err));
  }

  // Extract base64 buffer
  const cleanBase64 = dataBase64.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');

  // Enforce 10 MB limit
  if (buffer.length > 10 * 1024 * 1024) {
    const err = { error: 'Payload Too Large: Image exceeds maximum limit of 10 MB.' };
    if (typeof res.status === 'function') return res.status(413).json(err);
    res.writeHead(413, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(err));
  }

  // Magic byte validation on server
  let detectedMime = 'image/webp';
  if (buffer.length >= 12 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    detectedMime = 'image/webp';
  } else if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    detectedMime = 'image/png';
  } else if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    detectedMime = 'image/jpeg';
  } else {
    // Check SVG text
    const headText = buffer.slice(0, 32).toString('utf-8').trim().toLowerCase();
    if (headText.startsWith('<svg') || headText.startsWith('<?xml')) {
      detectedMime = 'image/svg+xml';
    } else {
      const err = { error: 'Invalid file content: The uploaded data does not match a valid image format.' };
      if (typeof res.status === 'function') return res.status(400).json(err);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(err));
    }
  }

  try {
    // Upload buffer to Supabase storage
    const storagePath = `${folder}/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('website-assets')
      .upload(storagePath, buffer, {
        contentType: detectedMime,
        cacheControl: '31536000',
        upsert: true,
      });

    if (uploadError) {
      // Try fallback to business-assets
      const { error: fallbackErr } = await supabase.storage
        .from('business-assets')
        .upload(storagePath, buffer, {
          contentType: detectedMime,
          cacheControl: '31536000',
          upsert: true,
        });

      if (fallbackErr) {
        throw new Error(fallbackErr.message || uploadError.message);
      }
    }

    const { data: urlData } = supabase.storage.from('website-assets').getPublicUrl(storagePath);
    const publicUrl = urlData?.publicUrl || '';

    const responsePayload = {
      success: true,
      url: publicUrl,
      storagePath,
      format: detectedMime,
      sizeBytes: buffer.length,
      metadata,
    };

    if (typeof res.status === 'function') return res.status(200).json(responsePayload);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(responsePayload));
  } catch (err: any) {
    console.error('[API Admin Upload Error]:', err);
    const errorMsg = { error: 'Server error processing admin image upload.' };
    if (typeof res.status === 'function') return res.status(500).json(errorMsg);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(errorMsg));
  }
}

/**
 * Authoritatively verifies whether an authenticated Supabase user possesses ADMIN or MANAGER privileges.
 */
export async function verifyUserRole(user: any, supabaseClient?: any): Promise<boolean> {
  if (!user) return false;

  const meta = user.user_metadata || {};
  const metaRole = String(meta.role || '').toUpperCase();
  const userEmail = (user.email || '').toLowerCase();
  const isAdminEmail = ['palakenterprises198@gmail.com', 'palakenterprises@gmail.com'].includes(userEmail);

  if (isAdminEmail || metaRole === 'ADMIN' || metaRole === 'MANAGER') {
    return true;
  }

  if (supabaseClient) {
    // Check user_roles table
    try {
      const { data: roleData } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const roles = (roleData || []).map((r: any) => String(r.role).toUpperCase());
      if (roles.includes('ADMIN') || roles.includes('MANAGER')) {
        return true;
      }
    } catch {}

    // Check profiles table
    try {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const profileRole = String(profile?.role || '').toUpperCase();
      if (profileRole === 'ADMIN' || profileRole === 'MANAGER') {
        return true;
      }
    } catch {}
  }

  return false;
}

