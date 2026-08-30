import { executeWithAuthRetry } from '../supabase/authSession';
import { classifySupabaseError } from './errors';
import type {
  IdCardProject,
  IdCardPerson,
  IdCardTemplate,
  IdCardGeneration,
  ProjectStatus,
  PaginatedResult,
} from './types';

// ============================================================
// PROJECTS
// ============================================================

export async function getIdCardProjects(opts?: {
  search?: string;
  status?: ProjectStatus;
}): Promise<IdCardProject[]> {
  return executeWithAuthRetry(
    async (client) => {
      let query = client.from('idcard_projects').select('*').order('created_at', { ascending: false });

      if (opts?.search) {
        query = query.ilike('name', `%${opts.search}%`);
      }
      if (opts?.status) {
        query = query.eq('status', opts.status);
      }

      const { data, error } = await query;
      if (error) throw classifySupabaseError(error);
      return (data as IdCardProject[]) || [];
    },
    { operationName: 'getIdCardProjects' }
  );
}

export async function getIdCardProject(id: string): Promise<IdCardProject> {
  return executeWithAuthRetry(
    async (client) => {
      const { data, error } = await client.from('idcard_projects').select('*').eq('id', id).single();
      if (error) throw classifySupabaseError(error);
      return data as IdCardProject;
    },
    { operationName: 'getIdCardProject' }
  );
}

export async function createIdCardProject(input: {
  name: string;
  description?: string;
  academic_year: string;
  logo_url?: string | null;
}): Promise<IdCardProject> {
  return executeWithAuthRetry(
    async (client) => {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError || !userData?.user) {
        throw classifySupabaseError(userError || { status: 401, message: 'Active login required' });
      }

      const { logo_url: _logo, ...dbInput } = input;
      const { data, error } = await client
        .from('idcard_projects')
        .insert({ ...dbInput, created_by: userData.user.id })
        .select()
        .single();

      if (error) throw classifySupabaseError(error);
      return data as IdCardProject;
    },
    { operationName: 'createIdCardProject' }
  );
}

export async function updateIdCardProject(
  id: string,
  patch: Partial<Pick<IdCardProject, 'name' | 'description' | 'academic_year' | 'status' | 'template_id' | 'logo_url'>>
): Promise<IdCardProject> {
  return executeWithAuthRetry(
    async (client) => {
      const { logo_url: _logo, ...dbPatch } = patch;
      const { data, error } = await client.from('idcard_projects').update(dbPatch).eq('id', id).select().single();
      if (error) throw classifySupabaseError(error);
      return data as IdCardProject;
    },
    { operationName: 'updateIdCardProject' }
  );
}

export async function archiveIdCardProject(id: string): Promise<void> {
  return executeWithAuthRetry(
    async (client) => {
      const { error } = await client.from('idcard_projects').update({ status: 'ARCHIVED' }).eq('id', id);
      if (error) throw classifySupabaseError(error);
    },
    { operationName: 'archiveIdCardProject' }
  );
}

export async function deleteIdCardProject(id: string): Promise<void> {
  return executeWithAuthRetry(
    async (client) => {
      const { error } = await client.from('idcard_projects').delete().eq('id', id);
      if (error) throw classifySupabaseError(error);
    },
    { operationName: 'deleteIdCardProject' }
  );
}

// ============================================================
// PERSONS
// ============================================================

export async function getIdCardPersons(
  projectId: string,
  opts?: { search?: string; page?: number; pageSize?: number }
): Promise<PaginatedResult<IdCardPerson>> {
  return executeWithAuthRetry(
    async (client) => {
      const page = opts?.page ?? 1;
      const pageSize = opts?.pageSize ?? 25;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = client
        .from('idcard_persons')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId)
        .order('name', { ascending: true })
        .range(from, to);

      if (opts?.search) {
        query = query.or(`name.ilike.%${opts.search}%,student_id.ilike.%${opts.search}%,roll_number.ilike.%${opts.search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw classifySupabaseError(error);

      return { data: (data as IdCardPerson[]) || [], total: count ?? 0, page, pageSize };
    },
    { operationName: 'getIdCardPersons' }
  );
}

export async function getAllIdCardPersons(projectId: string): Promise<IdCardPerson[]> {
  return executeWithAuthRetry(
    async (client) => {
      const { data, error } = await client
        .from('idcard_persons')
        .select('*')
        .eq('project_id', projectId)
        .order('name', { ascending: true })
        .limit(5000);

      if (error) throw classifySupabaseError(error);
      return (data as IdCardPerson[]) || [];
    },
    { operationName: 'getAllIdCardPersons' }
  );
}

export async function getIdCardPerson(id: string): Promise<IdCardPerson> {
  return executeWithAuthRetry(
    async (client) => {
      const { data, error } = await client.from('idcard_persons').select('*').eq('id', id).single();
      if (error) throw classifySupabaseError(error);
      return data as IdCardPerson;
    },
    { operationName: 'getIdCardPerson' }
  );
}

export async function createIdCardPerson(
  input: Omit<IdCardPerson, 'id' | 'created_at' | 'updated_at'>
): Promise<IdCardPerson> {
  return executeWithAuthRetry(
    async (client) => {
      const { data, error } = await client.from('idcard_persons').insert(input).select().single();
      if (error) throw classifySupabaseError(error);
      return data as IdCardPerson;
    },
    { operationName: 'createIdCardPerson' }
  );
}

export async function createIdCardPersonsBulk(
  inputs: Omit<IdCardPerson, 'id' | 'created_at' | 'updated_at'>[]
): Promise<{ inserted: number }> {
  return executeWithAuthRetry(
    async (client) => {
      const { error, count } = await client.from('idcard_persons').insert(inputs, { count: 'exact' });
      if (error) throw classifySupabaseError(error);
      return { inserted: count ?? inputs.length };
    },
    { operationName: 'createIdCardPersonsBulk' }
  );
}

export async function updateIdCardPerson(
  id: string,
  patch: Partial<Omit<IdCardPerson, 'id' | 'project_id' | 'created_at' | 'updated_at'>>
): Promise<IdCardPerson> {
  return executeWithAuthRetry(
    async (client) => {
      const { data, error } = await client.from('idcard_persons').update(patch).eq('id', id).select().single();
      if (error) throw classifySupabaseError(error);
      return data as IdCardPerson;
    },
    { operationName: 'updateIdCardPerson' }
  );
}

export async function deleteIdCardPerson(id: string): Promise<void> {
  return executeWithAuthRetry(
    async (client) => {
      const { error } = await client.from('idcard_persons').delete().eq('id', id);
      if (error) throw classifySupabaseError(error);
    },
    { operationName: 'deleteIdCardPerson' }
  );
}

// ============================================================
// PHOTOS
// ============================================================

export const PHOTO_BUCKET = 'idcard-photos';
export const MIN_PHOTO_BYTES = 50 * 1024; // 50 KB
export const MAX_PHOTO_BYTES = 500 * 1024; // 500 KB
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function uploadPersonPhoto(personId: string, file: File): Promise<string> {
  const mime = (file.type || '').toLowerCase();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const isAllowedMime = mime ? ALLOWED_PHOTO_TYPES.includes(mime) : true;
  const isAllowedExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext);

  if (!isAllowedMime || !isAllowedExt) {
    throw classifySupabaseError({ message: 'Unsupported image format. Please upload JPG, PNG, or WebP.' });
  }
  if (file.size < MIN_PHOTO_BYTES) {
    throw classifySupabaseError({ message: 'Photo is too small. Minimum file size is 50 KB.' });
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw classifySupabaseError({ message: 'Photo is too large. Maximum file size is 500 KB.' });
  }

  // Clean filename and make unique path: student-photos/{personId}/{timestamp}_{filename}
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${personId}/${Date.now()}_${cleanFileName}`;

  return executeWithAuthRetry(
    async (client) => {
      const { error: uploadError } = await client.storage.from(PHOTO_BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });
      if (uploadError) throw classifySupabaseError(uploadError);

      const { error: updateError } = await client.from('idcard_persons').update({ photo_url: path }).eq('id', personId);
      if (updateError) throw classifySupabaseError(updateError);

      return path;
    },
    { operationName: 'uploadPersonPhoto' }
  );
}

export async function deletePersonPhoto(personId: string, path: string): Promise<void> {
  return executeWithAuthRetry(
    async (client) => {
      const { error: removeError } = await client.storage.from(PHOTO_BUCKET).remove([path]);
      if (removeError) throw classifySupabaseError(removeError);

      const { error: updateError } = await client.from('idcard_persons').update({ photo_url: null }).eq('id', personId);
      if (updateError) throw classifySupabaseError(updateError);
    },
    { operationName: 'deletePersonPhoto' }
  );
}

export async function getPhotoSignedUrl(path: string): Promise<string> {
  return executeWithAuthRetry(
    async (client) => {
      const { data, error } = await client.storage.from(PHOTO_BUCKET).createSignedUrl(path, 60 * 60);
      if (error) throw classifySupabaseError(error);
      return data.signedUrl;
    },
    { operationName: 'getPhotoSignedUrl' }
  );
}

// ============================================================
// TEMPLATES
// ============================================================

export async function getIdCardTemplates(projectId?: string): Promise<IdCardTemplate[]> {
  return executeWithAuthRetry(
    async (client) => {
      let query = client
        .from('idcard_templates')
        .select('*')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (projectId) query = query.eq('project_id', projectId);

      const { data, error } = await query;
      if (error) throw classifySupabaseError(error);
      return (data as IdCardTemplate[]) || [];
    },
    { operationName: 'getIdCardTemplates' }
  );
}

export async function getIdCardTemplate(id: string): Promise<IdCardTemplate> {
  return executeWithAuthRetry(
    async (client) => {
      const { data, error } = await client.from('idcard_templates').select('*').eq('id', id).single();
      if (error) throw classifySupabaseError(error);
      return data as IdCardTemplate;
    },
    { operationName: 'getIdCardTemplate' }
  );
}

export async function createIdCardTemplate(
  input: Pick<IdCardTemplate, 'project_id' | 'name' | 'layout' | 'card_width_mm' | 'card_height_mm' | 'background_url'> & {
    logo_url?: string | null;
  }
): Promise<IdCardTemplate> {
  return executeWithAuthRetry(
    async (client) => {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError || !userData?.user) {
        throw classifySupabaseError(userError || { status: 401, message: 'Active login required' });
      }

      const { logo_url: _logo, ...dbInput } = input;
      const { data, error } = await client
        .from('idcard_templates')
        .insert({ ...dbInput, created_by: userData.user.id })
        .select()
        .single();

      if (error) throw classifySupabaseError(error);
      return data as IdCardTemplate;
    },
    { operationName: 'createIdCardTemplate' }
  );
}

export async function updateIdCardTemplate(
  id: string,
  patch: Partial<Pick<IdCardTemplate, 'name' | 'layout' | 'card_width_mm' | 'card_height_mm' | 'background_url' | 'logo_url'>>
): Promise<IdCardTemplate> {
  return executeWithAuthRetry(
    async (client) => {
      const { logo_url: _logo, ...dbPatch } = patch;
      const { data, error } = await client.from('idcard_templates').update(dbPatch).eq('id', id).select().single();
      if (error) throw classifySupabaseError(error);
      return data as IdCardTemplate;
    },
    { operationName: 'updateIdCardTemplate' }
  );
}

/**
 * Converts a File or Blob into a base64 Data URL string
 */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a school / institution logo file to Supabase Storage and returns its public URL.
 * If storage bucket upload encounters any error (e.g. bucket permissions or network),
 * it seamlessly falls back to a high-fidelity base64 Data URL so logo upload never fails.
 */
export async function uploadSchoolLogo(projectId: string, file: File): Promise<string> {
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `logos/${projectId}_${Date.now()}_${cleanFileName}`;

  try {
    return await executeWithAuthRetry(
      async (client) => {
        const { error: uploadError } = await client.storage.from(PHOTO_BUCKET).upload(path, file, {
          upsert: true,
          contentType: file.type || 'image/png',
        });
        if (uploadError) throw classifySupabaseError(uploadError);

        const { data: publicUrlData } = client.storage.from(PHOTO_BUCKET).getPublicUrl(path);
        return publicUrlData?.publicUrl || path;
      },
      { operationName: 'uploadSchoolLogo' }
    );
  } catch (storageErr) {
    console.warn('[uploadSchoolLogo] Storage upload failed, falling back to base64 data URL:', storageErr);
    return await fileToDataUrl(file);
  }
}

export async function deleteIdCardTemplate(id: string): Promise<void> {
  return executeWithAuthRetry(
    async (client) => {
      const { error } = await client.from('idcard_templates').delete().eq('id', id);
      if (error) throw classifySupabaseError(error);
    },
    { operationName: 'deleteIdCardTemplate' }
  );
}

// ============================================================
// GENERATIONS
// ============================================================

export async function recordGenerationResult(input: {
  project_id: string;
  person_id: string;
  template_id: string;
  status: 'SUCCESS' | 'FAILED';
  file_url?: string;
  error_message?: string;
}): Promise<IdCardGeneration> {
  return executeWithAuthRetry(
    async (client) => {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError || !userData?.user) {
        throw classifySupabaseError(userError || { status: 401, message: 'Active login required' });
      }

      const { data, error } = await client
        .from('idcard_generations')
        .insert({ ...input, generated_by: userData.user.id })
        .select()
        .single();

      if (error) throw classifySupabaseError(error);
      return data as IdCardGeneration;
    },
    { operationName: 'recordGenerationResult' }
  );
}

export async function getIdCardGenerations(projectId: string): Promise<IdCardGeneration[]> {
  return executeWithAuthRetry(
    async (client) => {
      const { data, error } = await client
        .from('idcard_generations')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw classifySupabaseError(error);
      return (data as IdCardGeneration[]) || [];
    },
    { operationName: 'getIdCardGenerations' }
  );
}

/**
 * Bulk-mark generation records as printed.
 * Sets `printed_at` to the current timestamp for all given IDs in one request.
 * Only updates IDs actually included — does not affect other records.
 */
export async function markGenerationsAsPrinted(generationIds: string[]): Promise<void> {
  if (generationIds.length === 0) return;
  return executeWithAuthRetry(
    async (client) => {
      const { error } = await client
        .from('idcard_generations')
        .update({ printed_at: new Date().toISOString() })
        .in('id', generationIds);

      if (error) throw classifySupabaseError(error);
    },
    { operationName: 'markGenerationsAsPrinted' }
  );
}

