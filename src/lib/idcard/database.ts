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
}): Promise<IdCardProject> {
  return executeWithAuthRetry(
    async (client) => {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError || !userData?.user) {
        throw classifySupabaseError(userError || { status: 401, message: 'Active login required' });
      }

      const { data, error } = await client
        .from('idcard_projects')
        .insert({ ...input, created_by: userData.user.id })
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
  patch: Partial<Pick<IdCardProject, 'name' | 'description' | 'academic_year' | 'status' | 'template_id'>>
): Promise<IdCardProject> {
  return executeWithAuthRetry(
    async (client) => {
      const { data, error } = await client.from('idcard_projects').update(patch).eq('id', id).select().single();
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

const PHOTO_BUCKET = 'idcard-photos';
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function uploadPersonPhoto(personId: string, file: File): Promise<string> {
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    throw classifySupabaseError({ message: 'storage: unsupported file type' });
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw classifySupabaseError({ message: 'storage: file too large (max 5MB)' });
  }

  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${personId}/${Date.now()}.${ext}`;

  return executeWithAuthRetry(
    async (client) => {
      const { error: uploadError } = await client.storage.from(PHOTO_BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type,
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
      let query = client.from('idcard_templates').select('*').order('created_at', { ascending: false });
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
  input: Pick<IdCardTemplate, 'project_id' | 'name' | 'layout' | 'card_width_mm' | 'card_height_mm' | 'background_url'>
): Promise<IdCardTemplate> {
  return executeWithAuthRetry(
    async (client) => {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError || !userData?.user) {
        throw classifySupabaseError(userError || { status: 401, message: 'Active login required' });
      }

      const { data, error } = await client
        .from('idcard_templates')
        .insert({ ...input, created_by: userData.user.id })
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
  patch: Partial<Pick<IdCardTemplate, 'name' | 'layout' | 'card_width_mm' | 'card_height_mm' | 'background_url'>>
): Promise<IdCardTemplate> {
  return executeWithAuthRetry(
    async (client) => {
      const { data, error } = await client.from('idcard_templates').update(patch).eq('id', id).select().single();
      if (error) throw classifySupabaseError(error);
      return data as IdCardTemplate;
    },
    { operationName: 'updateIdCardTemplate' }
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

