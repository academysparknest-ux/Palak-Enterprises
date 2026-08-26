import { supabase } from '../supabase/client';
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
  let query = supabase.from('idcard_projects').select('*').order('created_at', { ascending: false });

  if (opts?.search) {
    query = query.ilike('name', `%${opts.search}%`);
  }
  if (opts?.status) {
    query = query.eq('status', opts.status);
  }

  const { data, error } = await query;
  if (error) throw classifySupabaseError(error);
  return data as IdCardProject[];
}

export async function getIdCardProject(id: string): Promise<IdCardProject> {
  const { data, error } = await supabase.from('idcard_projects').select('*').eq('id', id).single();
  if (error) throw classifySupabaseError(error);
  return data as IdCardProject;
}

export async function createIdCardProject(input: {
  name: string;
  description?: string;
  academic_year: string;
}): Promise<IdCardProject> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw classifySupabaseError({ status: 401 });

  const { data, error } = await supabase
    .from('idcard_projects')
    .insert({ ...input, created_by: userData.user.id })
    .select()
    .single();

  if (error) throw classifySupabaseError(error);
  return data as IdCardProject;
}

export async function updateIdCardProject(
  id: string,
  patch: Partial<Pick<IdCardProject, 'name' | 'description' | 'academic_year' | 'status' | 'template_id'>>
): Promise<IdCardProject> {
  const { data, error } = await supabase.from('idcard_projects').update(patch).eq('id', id).select().single();
  if (error) throw classifySupabaseError(error);
  return data as IdCardProject;
}

export async function archiveIdCardProject(id: string): Promise<void> {
  const { error } = await supabase.from('idcard_projects').update({ status: 'ARCHIVED' }).eq('id', id);
  if (error) throw classifySupabaseError(error);
}

export async function deleteIdCardProject(id: string): Promise<void> {
  const { error } = await supabase.from('idcard_projects').delete().eq('id', id);
  if (error) throw classifySupabaseError(error);
}

// ============================================================
// PERSONS
// ============================================================

export async function getIdCardPersons(
  projectId: string,
  opts?: { search?: string; page?: number; pageSize?: number }
): Promise<PaginatedResult<IdCardPerson>> {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
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

  return { data: data as IdCardPerson[], total: count ?? 0, page, pageSize };
}

export async function getIdCardPerson(id: string): Promise<IdCardPerson> {
  const { data, error } = await supabase.from('idcard_persons').select('*').eq('id', id).single();
  if (error) throw classifySupabaseError(error);
  return data as IdCardPerson;
}

export async function createIdCardPerson(
  input: Omit<IdCardPerson, 'id' | 'created_at' | 'updated_at' | 'photo_url'>
): Promise<IdCardPerson> {
  const { data, error } = await supabase.from('idcard_persons').insert(input).select().single();
  if (error) throw classifySupabaseError(error);
  return data as IdCardPerson;
}

export async function createIdCardPersonsBulk(
  inputs: Omit<IdCardPerson, 'id' | 'created_at' | 'updated_at' | 'photo_url'>[]
): Promise<{ inserted: number }> {
  const { error, count } = await supabase.from('idcard_persons').insert(inputs, { count: 'exact' });
  if (error) throw classifySupabaseError(error);
  return { inserted: count ?? inputs.length };
}

export async function updateIdCardPerson(
  id: string,
  patch: Partial<Omit<IdCardPerson, 'id' | 'project_id' | 'created_at' | 'updated_at'>>
): Promise<IdCardPerson> {
  const { data, error } = await supabase.from('idcard_persons').update(patch).eq('id', id).select().single();
  if (error) throw classifySupabaseError(error);
  return data as IdCardPerson;
}

export async function deleteIdCardPerson(id: string): Promise<void> {
  const { error } = await supabase.from('idcard_persons').delete().eq('id', id);
  if (error) throw classifySupabaseError(error);
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

  const { error: uploadError } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (uploadError) throw classifySupabaseError(uploadError);

  const { error: updateError } = await supabase.from('idcard_persons').update({ photo_url: path }).eq('id', personId);
  if (updateError) throw classifySupabaseError(updateError);

  return path;
}

export async function deletePersonPhoto(personId: string, path: string): Promise<void> {
  const { error: removeError } = await supabase.storage.from(PHOTO_BUCKET).remove([path]);
  if (removeError) throw classifySupabaseError(removeError);

  const { error: updateError } = await supabase.from('idcard_persons').update({ photo_url: null }).eq('id', personId);
  if (updateError) throw classifySupabaseError(updateError);
}

// Photos are stored in a private bucket, so callers need a signed URL to
// actually display one. Cached for an hour — plenty for a preview session.
export async function getPhotoSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw classifySupabaseError(error);
  return data.signedUrl;
}

// ============================================================
// TEMPLATES
// ============================================================

export async function getIdCardTemplates(projectId?: string): Promise<IdCardTemplate[]> {
  let query = supabase.from('idcard_templates').select('*').order('created_at', { ascending: false });
  if (projectId) query = query.eq('project_id', projectId);

  const { data, error } = await query;
  if (error) throw classifySupabaseError(error);
  return data as IdCardTemplate[];
}

export async function getIdCardTemplate(id: string): Promise<IdCardTemplate> {
  const { data, error } = await supabase.from('idcard_templates').select('*').eq('id', id).single();
  if (error) throw classifySupabaseError(error);
  return data as IdCardTemplate;
}

export async function createIdCardTemplate(
  input: Pick<IdCardTemplate, 'project_id' | 'name' | 'layout' | 'card_width_mm' | 'card_height_mm' | 'background_url'>
): Promise<IdCardTemplate> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw classifySupabaseError({ status: 401 });

  const { data, error } = await supabase
    .from('idcard_templates')
    .insert({ ...input, created_by: userData.user.id })
    .select()
    .single();

  if (error) throw classifySupabaseError(error);
  return data as IdCardTemplate;
}

export async function updateIdCardTemplate(
  id: string,
  patch: Partial<Pick<IdCardTemplate, 'name' | 'layout' | 'card_width_mm' | 'card_height_mm' | 'background_url'>>
): Promise<IdCardTemplate> {
  const { data, error } = await supabase.from('idcard_templates').update(patch).eq('id', id).select().single();
  if (error) throw classifySupabaseError(error);
  return data as IdCardTemplate;
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
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw classifySupabaseError({ status: 401 });

  const { data, error } = await supabase
    .from('idcard_generations')
    .insert({ ...input, generated_by: userData.user.id })
    .select()
    .single();

  if (error) throw classifySupabaseError(error);
  return data as IdCardGeneration;
}

export async function getIdCardGenerations(projectId: string): Promise<IdCardGeneration[]> {
  const { data, error } = await supabase
    .from('idcard_generations')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw classifySupabaseError(error);
  return data as IdCardGeneration[];
}
