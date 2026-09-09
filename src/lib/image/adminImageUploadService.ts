/**
 * Palak Enterprises — Centralized Admin Image Upload Service
 *
 * Exclusively provides optimized WebP uploads for authorized Admin and Manager users.
 * Quick Service and customer document uploads MUST NOT use this service.
 */

import { supabase, isSupabaseConfigured } from '../supabase/client';
import { executeWithAuthRetry } from '../supabase/authSession';
import { ADMIN_IMAGE_CONFIG } from './imageConfig';
import { optimizeAdminImage, type OptimizationResult, type OptimizedImageMetadata } from './adminImageOptimizer';

export interface AdminUploadOptions {
  /** Subfolder inside storage bucket, e.g. 'products', 'banners', 'gallery' */
  folder?: string;
  /** Optional custom filename prefix */
  prefix?: string;
  /** Existing image URL being replaced */
  previousImageUrl?: string;
  /** Callback reporting upload progress stages */
  onStageChange?: (stage: 'validating' | 'optimizing' | 'uploading' | 'completed') => void;
}

export interface AdminUploadResult {
  url: string;
  storagePath: string;
  bucket: string;
  metadata: OptimizedImageMetadata;
  previousImageDeleted?: boolean;
}

export interface SafeReplaceOptions<T = any> {
  file: File | Blob;
  previousImageUrl?: string;
  folder?: string;
  updateDatabaseCallback: (newImageUrl: string) => Promise<T>;
  onStageChange?: (stage: 'validating' | 'optimizing' | 'uploading' | 'saving' | 'completed') => void;
}

/**
 * Validates that current session belongs to an authorized Admin or Manager.
 */
export async function assertAdminAuthorization(): Promise<{ userId: string; role: string }> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured on this environment.');
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session || !session.user) {
    throw new Error('Unauthorized: Authentication required for admin media upload.');
  }

  const user = session.user;
  const metaRole = String(user.user_metadata?.role || '').toUpperCase();
  const appRole = String(user.app_metadata?.role || '').toUpperCase();

  // Fast check from metadata or admin email
  const isAdminEmail = user.email && [
    'palakenterprises198@gmail.com',
    'palakenterprises@gmail.com',
  ].includes(user.email.toLowerCase());

  if (isAdminEmail || metaRole === 'ADMIN' || metaRole === 'MANAGER' || appRole === 'ADMIN' || appRole === 'MANAGER') {
    return { userId: user.id, role: metaRole || (isAdminEmail ? 'ADMIN' : 'STAFF') };
  }

  // Database verification check
  const [profileRes, roleRes] = await Promise.allSettled([
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', user.id),
  ]);

  const profileRole = profileRes.status === 'fulfilled' ? String(profileRes.value?.data?.role || '').toUpperCase() : '';
  const roles = roleRes.status === 'fulfilled' ? (roleRes.value?.data || []).map((r: any) => String(r.role).toUpperCase()) : [];

  const isAuthorized = roles.includes('ADMIN') || roles.includes('MANAGER') || profileRole === 'ADMIN' || profileRole === 'MANAGER';
  if (!isAuthorized) {
    throw new Error('Forbidden: Only authorized administrators or managers can perform admin image uploads.');
  }

  return { userId: user.id, role: profileRole || (roles.includes('ADMIN') ? 'ADMIN' : 'MANAGER') };
}

/**
 * Uploads an optimized WebP buffer to Supabase Storage, trying primary bucket first.
 */
async function uploadToStorageWithFallback(
  storagePath: string,
  file: File | Blob,
  contentType: string
): Promise<{ bucket: string; publicUrl: string; storagePath: string }> {
  const bucketsToTry = [
    ADMIN_IMAGE_CONFIG.primaryStorageBucket,
    ...ADMIN_IMAGE_CONFIG.fallbackStorageBuckets,
  ];

  let lastError: any = null;

  for (const bucket of bucketsToTry) {
    try {
      const uploadRes = await executeWithAuthRetry(
        async (client) => {
          let { error: uploadError } = await client.storage
            .from(bucket)
            .upload(storagePath, file, {
              cacheControl: '31536000', // 1 year immutable cache for unique WebP filenames
              contentType,
              upsert: true,
            });

          // Auto-create bucket if missing and permissible
          if (uploadError && /bucket not found|bucket_not_found/i.test(uploadError.message || '')) {
            try {
              await client.storage.createBucket(bucket, { public: true });
              const retry = await client.storage
                .from(bucket)
                .upload(storagePath, file, {
                  cacheControl: '31536000',
                  contentType,
                  upsert: true,
                });
              uploadError = retry.error;
            } catch {}
          }

          if (uploadError) throw uploadError;

          const { data: urlData } = client.storage.from(bucket).getPublicUrl(storagePath);
          return {
            bucket,
            publicUrl: urlData.publicUrl,
            storagePath,
          };
        },
        1,
        `upload_admin_image_${bucket}`
      );

      if (uploadRes && uploadRes.publicUrl) {
        return uploadRes;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[AdminImageUpload] Upload to bucket "${bucket}" notice:`, err);
    }
  }

  throw new Error(`Failed to store image in cloud storage. ${lastError?.message || ''}`);
}

/**
 * Safely removes a superseded image from Supabase storage if safe to do so.
 */
export async function deletePreviousAdminImage(imageUrl: string): Promise<boolean> {
  if (!imageUrl || !isSupabaseConfigured || !supabase) return false;

  try {
    for (const bucket of [ADMIN_IMAGE_CONFIG.primaryStorageBucket, ...ADMIN_IMAGE_CONFIG.fallbackStorageBuckets]) {
      const bucketIdentifier = `/${bucket}/`;
      if (imageUrl.includes(bucketIdentifier)) {
        const pathPart = imageUrl.split(bucketIdentifier)[1];
        if (pathPart) {
          const cleanPath = decodeURIComponent(pathPart.split('?')[0]);
          await executeWithAuthRetry(
            async (client) => {
              await client.storage.from(bucket).remove([cleanPath]);
            },
            1,
            'delete_superseded_admin_image'
          );
          return true;
        }
      }
    }
  } catch (err) {
    console.warn('[AdminImageUpload] Cleanup of previous image skipped:', err);
  }
  return false;
}

/**
 * Primary centralized entry point for all Admin image uploads.
 */
export async function uploadAdminImage(
  file: File | Blob,
  options?: AdminUploadOptions
): Promise<AdminUploadResult> {
  // 1. Authorize admin / manager
  options?.onStageChange?.('validating');
  await assertAdminAuthorization();

  // 2. Optimize & Convert to WebP
  options?.onStageChange?.('optimizing');
  const optimizedResult: OptimizationResult = await optimizeAdminImage(file);

  // 3. Build collision-safe, path-sanitized storage path
  options?.onStageChange?.('uploading');
  const folder = options?.folder
    ? options.folder.replace(/[^a-zA-Z0-9_-]/g, '')
    : ADMIN_IMAGE_CONFIG.storageFolder;
  const storagePath = `${folder}/${optimizedResult.metadata.fileName}`;

  // 4. Store optimized WebP
  const stored = await uploadToStorageWithFallback(
    storagePath,
    optimizedResult.file,
    optimizedResult.metadata.mimeType
  );

  // 5. Safe replacement cleanup
  let previousDeleted = false;
  if (options?.previousImageUrl && options.previousImageUrl !== stored.publicUrl) {
    previousDeleted = await deletePreviousAdminImage(options.previousImageUrl);
  }

  options?.onStageChange?.('completed');

  return {
    url: stored.publicUrl,
    storagePath: stored.storagePath,
    bucket: stored.bucket,
    metadata: optimizedResult.metadata,
    previousImageDeleted: previousDeleted,
  };
}

/**
 * Transactionally replaces an existing Admin image:
 * 1. Optimizes new image
 * 2. Uploads new image
 * 3. Updates database
 * 4. IF database update fails: removes newly uploaded asset so no orphaned file is left, and keeps old image intact.
 * 5. IF database update succeeds: deletes old image safely.
 */
export async function safeReplaceAdminImage<T = any>(
  options: SafeReplaceOptions<T>
): Promise<{ result: AdminUploadResult; dbResult: T }> {
  // Step 1 & 2: Upload new image (without deleting old image yet)
  const uploadResult = await uploadAdminImage(options.file, {
    folder: options.folder,
    onStageChange: (stage) => options.onStageChange?.(stage as any),
  });

  // Step 3: Attempt database update
  options.onStageChange?.('saving');
  let dbResult: T;
  try {
    dbResult = await options.updateDatabaseCallback(uploadResult.url);
  } catch (dbErr: any) {
    // Database failed! Clean up newly uploaded image to avoid orphaned file
    console.error('[SafeReplace] Database update failed, rolling back uploaded image:', dbErr);
    await deletePreviousAdminImage(uploadResult.url);
    throw new Error(`Database update failed. The previous image has been preserved. ${dbErr?.message || ''}`);
  }

  // Step 4: Database succeeded! Safely clean up previous image
  if (options.previousImageUrl && options.previousImageUrl !== uploadResult.url) {
    uploadResult.previousImageDeleted = await deletePreviousAdminImage(options.previousImageUrl);
  }

  options.onStageChange?.('completed');
  return { result: uploadResult, dbResult };
}

/**
 * Batch upload multiple Admin images with individual error tolerance and progress tracking.
 */
export async function uploadAdminImagesBatch(
  files: (File | Blob)[],
  options?: Omit<AdminUploadOptions, 'previousImageUrl'>,
  onFileProgress?: (completedCount: number, totalCount: number, currentItem?: AdminUploadResult) => void
): Promise<{ successful: AdminUploadResult[]; failed: { fileName: string; error: string }[] }> {
  await assertAdminAuthorization();

  const successful: AdminUploadResult[] = [];
  const failed: { fileName: string; error: string }[] = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const name = f instanceof File ? f.name : `image_${i}`;
    try {
      const result = await uploadAdminImage(f, options);
      successful.push(result);
      onFileProgress?.(successful.length + failed.length, files.length, result);
    } catch (err: any) {
      console.error(`[AdminImageUpload] Error processing ${name}:`, err);
      failed.push({ fileName: name, error: err?.message || 'Processing failed' });
      onFileProgress?.(successful.length + failed.length, files.length);
    }
  }

  return { successful, failed };
}
