import { executeWithAuthRetry } from '../supabase/authSession';
import { classifySupabaseError } from './errors';
import { uploadAndPersistSchoolLogo } from './logoUpload';
import {
  auditStudentCreated, auditStudentUpdated, auditStudentDeleted,
  auditBulkImport, auditPhotoChanged, auditTemplateUpdated,
  auditCardGenerated,
} from './auditLog';
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
  patch: Partial<Pick<IdCardProject, 'name' | 'description' | 'academic_year' | 'status' | 'template_id' | 'logo_url'>>
): Promise<IdCardProject> {
  return executeWithAuthRetry(
    async (client) => {
      if (Object.keys(patch).length === 0) {
        return await getIdCardProject(id);
      }
      const { data, error } = await client.from('idcard_projects').update(patch).eq('id', id).select().maybeSingle();
      if (error) throw classifySupabaseError(error);
      if (data) return data as IdCardProject;
      return await getIdCardProject(id);
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
      const allPersons: IdCardPerson[] = [];
      const batchSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const to = from + batchSize - 1;
        const { data, error } = await client
          .from('idcard_persons')
          .select('*')
          .eq('project_id', projectId)
          .order('student_id', { ascending: true })
          .range(from, to);

        if (error) throw classifySupabaseError(error);
        const batch = (data as IdCardPerson[]) || [];
        allPersons.push(...batch);

        if (batch.length < batchSize) {
          hasMore = false;
        } else {
          from += batchSize;
        }
      }

      return allPersons;
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

// ============================================================
// SCHEMA RESILIENCE: Auto-detect & adapt to remote DB columns
// ============================================================

const unsupportedPersonColumns = new Set<string>();

function isSchemaColumnError(err: any): { isSchemaError: boolean; missingColumn?: string } {
  if (!err) return { isSchemaError: false };
  const msg = String(err.message || err.error || err || '');
  const code = String(err.code || '');

  if (
    code === 'PGRST204' ||
    /Could not find the '([^']+)' column of 'idcard_persons' in the schema cache/i.test(msg) ||
    /column "([^"]+)" of relation "idcard_persons" does not exist/i.test(msg) ||
    /in the schema cache/i.test(msg)
  ) {
    const match = msg.match(/Could not find the '([^']+)' column/i) || msg.match(/column "([^"]+)"/i);
    const col = match ? match[1] : undefined;
    return { isSchemaError: true, missingColumn: col };
  }
  return { isSchemaError: false };
}

function cleanPersonPayload<T extends Record<string, any>>(payload: T): T {
  const result: Record<string, any> = { ...payload };
  for (const col of unsupportedPersonColumns) {
    delete result[col];
  }
  return result as T;
}

export async function createIdCardPerson(
  input: Omit<IdCardPerson, 'id' | 'created_at' | 'updated_at'>
): Promise<IdCardPerson> {
  return executeWithAuthRetry(
    async (client) => {
      let sanitized: Record<string, any> = {
        project_id: input.project_id,
        student_id: input.student_id,
        name: input.name,
        class: input.class ?? null,
        section: input.section ?? null,
        roll_number: input.roll_number ?? null,
        date_of_birth: input.date_of_birth ?? null,
        blood_group: input.blood_group ?? null,
        father_name: input.father_name ?? null,
        mother_name: input.mother_name ?? null,
        phone: input.phone ?? null,
        emergency_number: input.emergency_number ?? null,
        address: input.address ?? null,
        photo_url: input.photo_url ?? null,
      };
      // Include custom fields if present
      if (input.custom_fields && Object.keys(input.custom_fields).length > 0) {
        sanitized.custom_fields = input.custom_fields;
      }
      sanitized = cleanPersonPayload(sanitized);

      let { data, error } = await client.from('idcard_persons').insert(sanitized).select().single();

      // If database reports column not in schema cache, strip column and retry automatically
      if (error) {
        const check = isSchemaColumnError(error);
        if (check.isSchemaError && check.missingColumn) {
          console.warn(`[IDCard Schema] Column '${check.missingColumn}' not in idcard_persons table; auto-adapting and retrying.`);
          unsupportedPersonColumns.add(check.missingColumn);
          delete sanitized[check.missingColumn];
          const retryRes = await client.from('idcard_persons').insert(sanitized).select().single();
          data = retryRes.data;
          error = retryRes.error;
        }
      }

      if (error) throw classifySupabaseError(error);
      const person = data as IdCardPerson;
      auditStudentCreated(person.project_id, person.student_id, person.name);
      return person;
    },
    { operationName: 'createIdCardPerson' }
  );
}

export async function createIdCardPersonsBulk(
  inputs: Omit<IdCardPerson, 'id' | 'created_at' | 'updated_at'>[]
): Promise<{ inserted: number }> {
  return executeWithAuthRetry(
    async (client) => {
      let sanitized = inputs.map((input) => {
        const row: Record<string, any> = {
          project_id: input.project_id,
          student_id: input.student_id,
          name: input.name,
          class: input.class ?? null,
          section: input.section ?? null,
          roll_number: input.roll_number ?? null,
          date_of_birth: input.date_of_birth ?? null,
          blood_group: input.blood_group ?? null,
          father_name: input.father_name ?? null,
          mother_name: input.mother_name ?? null,
          phone: input.phone ?? null,
          emergency_number: input.emergency_number ?? null,
          address: input.address ?? null,
          photo_url: input.photo_url ?? null,
        };
        if (input.custom_fields && Object.keys(input.custom_fields).length > 0) {
          row.custom_fields = input.custom_fields;
        }
        return cleanPersonPayload(row);
      });

      let { error, count } = await client.from('idcard_persons').insert(sanitized, { count: 'exact' });

      // If database reports column not in schema cache, strip column and retry automatically
      if (error) {
        const check = isSchemaColumnError(error);
        if (check.isSchemaError && check.missingColumn) {
          console.warn(`[IDCard Schema] Column '${check.missingColumn}' not in idcard_persons table; auto-adapting bulk payload.`);
          unsupportedPersonColumns.add(check.missingColumn);
          const colToStrip = check.missingColumn;
          sanitized = sanitized.map((r) => {
            const copy = { ...r };
            delete copy[colToStrip];
            return copy;
          });
          const retryRes = await client.from('idcard_persons').insert(sanitized, { count: 'exact' });
          error = retryRes.error;
          count = retryRes.count;
        }
      }

      if (error) throw classifySupabaseError(error);
      const inserted = count ?? inputs.length;
      // Audit log for bulk import
      if (inputs.length > 0) {
        auditBulkImport(inputs[0].project_id, inserted, 0, 0);
      }
      return { inserted };
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
      const allowedCols = [
        'student_id',
        'name',
        'class',
        'section',
        'roll_number',
        'date_of_birth',
        'blood_group',
        'father_name',
        'mother_name',
        'phone',
        'emergency_number',
        'address',
        'photo_url',
        'custom_fields',
        'status',
      ];
      let sanitized: Record<string, any> = {};
      const changedFields: string[] = [];
      for (const col of allowedCols) {
        if ((patch as any)[col] !== undefined && !unsupportedPersonColumns.has(col)) {
          sanitized[col] = (patch as any)[col];
          changedFields.push(col);
        }
      }
      let { data, error } = await client.from('idcard_persons').update(sanitized).eq('id', id).select().single();

      // If database reports column not in schema cache, strip column and retry automatically
      if (error) {
        const check = isSchemaColumnError(error);
        if (check.isSchemaError && check.missingColumn) {
          console.warn(`[IDCard Schema] Column '${check.missingColumn}' not in idcard_persons table; auto-adapting update payload.`);
          unsupportedPersonColumns.add(check.missingColumn);
          delete sanitized[check.missingColumn];
          const retryRes = await client.from('idcard_persons').update(sanitized).eq('id', id).select().single();
          data = retryRes.data;
          error = retryRes.error;
        }
      }

      if (error) throw classifySupabaseError(error);
      const person = data as IdCardPerson;
      auditStudentUpdated(person.project_id, person.student_id, person.name, changedFields);
      return person;
    },
    { operationName: 'updateIdCardPerson' }
  );
}

export async function deleteIdCardPerson(id: string): Promise<void> {
  return executeWithAuthRetry(
    async (client) => {
      // Fetch student info before delete for audit trail
      const { data: person } = await client.from('idcard_persons').select('project_id, student_id, name').eq('id', id).maybeSingle();
      const { error } = await client.from('idcard_persons').delete().eq('id', id);
      if (error) throw classifySupabaseError(error);
      if (person) {
        auditStudentDeleted(person.project_id, person.student_id, person.name);
      }
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
      let { error: uploadError } = await client.storage.from(PHOTO_BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });

      // Self-healing: if bucket not found, create bucket and retry upload
      if (uploadError && /bucket not found|bucket_not_found/i.test(uploadError.message || '')) {
        try {
          await client.storage.createBucket(PHOTO_BUCKET, { public: true });
          const retry = await client.storage.from(PHOTO_BUCKET).upload(path, file, {
            upsert: true,
            contentType: file.type || 'image/jpeg',
          });
          uploadError = retry.error;
        } catch {
          // Ignore create error and let error classifier handle it
        }
      }

      if (uploadError) throw classifySupabaseError(uploadError);

      const { error: updateError } = await client.from('idcard_persons').update({ photo_url: path }).eq('id', personId);
      if (updateError) {
        // Rollback: clean up orphaned file in storage (best-effort)
        try {
          await client.storage.from(PHOTO_BUCKET).remove([path]);
        } catch (cleanupErr) {
          console.warn('[PHOTO] Failed to clean up orphaned photo after DB update failure:', cleanupErr);
        }
        throw classifySupabaseError(updateError);
      }

      // Audit the photo change (get project_id from the person record)
      const { data: personData } = await client.from('idcard_persons').select('project_id, student_id, name').eq('id', personId).maybeSingle();
      if (personData) {
        auditPhotoChanged(personData.project_id, personData.student_id, personData.name);
      }

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
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  return executeWithAuthRetry(
    async (client) => {
      const { data, error } = await client.storage.from(PHOTO_BUCKET).createSignedUrl(path, 60 * 60);
      if (error) {
        const { data: pubData } = client.storage.from(PHOTO_BUCKET).getPublicUrl(path);
        if (pubData?.publicUrl) return pubData.publicUrl;
        throw classifySupabaseError(error);
      }
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
      if (Object.keys(dbPatch).length === 0) {
        const { data } = await client.from('idcard_templates').select('*').eq('id', id).single();
        return data as IdCardTemplate;
      }
      const { data, error } = await client.from('idcard_templates').update(dbPatch).eq('id', id).select().maybeSingle();
      if (error) throw classifySupabaseError(error);
      const updated = (data as IdCardTemplate) || (await client.from('idcard_templates').select('*').eq('id', id).single()).data;
      if (updated) {
        auditTemplateUpdated(updated.project_id || '', updated.id, updated.name, updated.version || 1);
      }
      return updated as IdCardTemplate;
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
 * Uploads a school / institution logo file to Supabase Storage,
 * optimizes it client-side if oversized, and persists the resulting URL in idcard_projects.logo_url.
 */
export async function uploadSchoolLogo(projectId: string, file: File): Promise<string> {
  return await uploadAndPersistSchoolLogo(projectId, file);
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
  template_version?: number | null;
  template_layout_snapshot?: any;
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
      const gen = data as IdCardGeneration;
      if (gen.status === 'SUCCESS') {
        auditCardGenerated(gen.project_id, gen.person_id, `Person ${gen.person_id}`, gen.template_id);
      }
      return gen;
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
  if (!generationIds || generationIds.length === 0) return;
  const validIds = generationIds.filter((id) => id && typeof id === 'string' && id.trim().length > 0);
  if (validIds.length === 0) return;

  try {
    await executeWithAuthRetry(
      async (client) => {
        const { error } = await client
          .from('idcard_generations')
          .update({ printed_at: new Date().toISOString() })
          .in('id', validIds);

        if (error) {
          console.warn('Could not update printed_at in Supabase idcard_generations:', error);
        }
      },
      { operationName: 'markGenerationsAsPrinted' }
    );
  } catch (err) {
    console.warn('markGenerationsAsPrinted non-fatal error:', err);
  }
}

