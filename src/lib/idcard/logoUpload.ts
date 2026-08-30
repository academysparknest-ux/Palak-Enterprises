/**
 * School / Institution Logo Upload & Optimization Service
 *
 * Provides:
 * 1. Fast format and size validation (PNG, JPG, WebP, SVG, max 15MB)
 * 2. Client-side canvas optimization (max 1600x1600px, preserves transparency for PNG/WebP)
 * 3. High-speed Supabase Storage upload to 'idcard-photos' bucket
 * 4. Atomic database persistence into `idcard_projects.logo_url`
 */

import { executeWithAuthRetry } from '../supabase/authSession';
import { classifySupabaseError } from './errors';
import { PHOTO_BUCKET } from './database';

export const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
export const ALLOWED_LOGO_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
export const MAX_LOGO_INPUT_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_LOGO_DIMENSION = 1600; // 1600 × 1600 px target

export interface LogoValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates file format and reasonable input size before upload
 */
export function validateLogoFile(file: { name: string; size: number; type?: string }): LogoValidationResult {
  const mime = (file.type || '').toLowerCase();
  const ext = ('.' + (file.name.split('.').pop() || '')).toLowerCase();

  const isMimeValid = mime ? ALLOWED_LOGO_TYPES.includes(mime) : true;
  const isExtValid = ALLOWED_LOGO_EXTENSIONS.includes(ext);

  if (!isMimeValid && !isExtValid) {
    return {
      valid: false,
      error: 'Unsupported image format. Please upload a PNG, JPG, or WebP image.',
    };
  }

  if (mime && !ALLOWED_LOGO_TYPES.includes(mime)) {
    return {
      valid: false,
      error: 'Unsupported image format. Please upload a PNG, JPG, or WebP image.',
    };
  }

  if (file.size > MAX_LOGO_INPUT_BYTES) {
    return {
      valid: false,
      error: 'Logo file is too large. Please choose an image under 15 MB.',
    };
  }

  return { valid: true };
}

/**
 * Optimizes/resizes large raster logo files client-side while preserving PNG/WebP transparency.
 * Leaves SVG files untouched as vector.
 */
export async function optimizeLogoFile(file: File): Promise<File | Blob> {
  const mime = (file.type || '').toLowerCase();
  const isSvg = mime.includes('svg') || file.name.toLowerCase().endsWith('.svg');

  // SVGs are already compact vector assets
  if (isSvg) return file;

  // In Node / non-browser test environments, return file directly
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof Image === 'undefined') {
    return file;
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      // If dimensions are within bounds and file is reasonably sized (< 500 KB), no resize needed
      if (width <= MAX_LOGO_DIMENSION && height <= MAX_LOGO_DIMENSION && file.size <= 500 * 1024) {
        resolve(file);
        return;
      }

      // Calculate scaled dimensions
      const scale = Math.min(1, MAX_LOGO_DIMENSION / width, MAX_LOGO_DIMENSION / height);
      const targetWidth = Math.max(1, Math.round(width * scale));
      const targetHeight = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(file);
        return;
      }

      // Transparent background preservation for PNG / WebP
      ctx.clearRect(0, 0, targetWidth, targetHeight);
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const outputMime = mime.includes('png') ? 'image/png' : mime.includes('webp') ? 'image/webp' : 'image/jpeg';
      const quality = outputMime === 'image/png' ? undefined : 0.92;

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            const optimizedFile = new File([blob], file.name, {
              type: outputMime,
              lastModified: Date.now(),
            });
            resolve(optimizedFile);
          } else {
            resolve(file);
          }
        },
        outputMime,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Uploads a school / institution logo to Supabase Storage and atomically persists it to idcard_projects.logo_url
 */
export async function uploadAndPersistSchoolLogo(projectId: string, file: File): Promise<string> {
  // 1. Validation
  const validation = validateLogoFile(file);
  if (!validation.valid) {
    throw classifySupabaseError({ message: validation.error || 'Invalid logo file' });
  }

  // 2. Optimization
  const optimized = await optimizeLogoFile(file);

  // 3. Storage Upload
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const cleanExt = ext === 'jpeg' ? 'jpg' : ext;
  const storagePath = `logos/${projectId}/logo_${Date.now()}.${cleanExt}`;

  return executeWithAuthRetry(
    async (client) => {
      const { error: uploadError } = await client.storage.from(PHOTO_BUCKET).upload(storagePath, optimized, {
        upsert: true,
        contentType: file.type || 'image/png',
        cacheControl: '3600',
      });

      if (uploadError) {
        throw classifySupabaseError(uploadError);
      }

      // 4. Resolve URL
      const { data: publicUrlData } = client.storage.from(PHOTO_BUCKET).getPublicUrl(storagePath);
      const finalLogoUrl = publicUrlData?.publicUrl || storagePath;

      // 5. Atomic Database Update to idcard_projects
      const { error: dbError } = await client
        .from('idcard_projects')
        .update({ logo_url: finalLogoUrl })
        .eq('id', projectId);

      if (dbError) {
        throw classifySupabaseError(dbError);
      }

      return finalLogoUrl;
    },
    { operationName: 'uploadAndPersistSchoolLogo' }
  );
}
