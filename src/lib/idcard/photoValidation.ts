/**
 * ID Card Student Photo Validation (Lightweight - No Image Processing)
 *
 * Enforces:
 * - File Size: Min 50 KB (51,200 bytes), Max 500 KB (512,000 bytes)
 * - Format: JPG/JPEG, PNG, WebP
 * - Dimensions: Min 300 × 360 px, Recommended: 600 × 720 px, Aspect Ratio preferred ~5:6
 *
 * NOTE: Strict zero-image-processing rule for Free Supabase plan.
 * Validates metadata without Canvas, OffscreenCanvas, or pixel modification.
 */

export const MIN_PHOTO_BYTES = 5 * 1024; // 5 KB = 5,120 bytes
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024; // 15 MB = 15,728,640 bytes

export const MIN_PHOTO_WIDTH = 250;
export const MIN_PHOTO_HEIGHT = 250;

export const RECOMMENDED_PHOTO_WIDTH = 600;
export const RECOMMENDED_PHOTO_HEIGHT = 600;

export const ALLOWED_PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

export const ALLOWED_PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;

export interface PhotoValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  formattedSize?: string;
  dimensionsText?: string;
  isRecommended?: boolean;
}

/**
 * Format bytes to readable KB/MB string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

/**
 * Checks file name extension
 */
export function hasAllowedExtension(fileName: string): boolean {
  if (!fileName) return false;
  const ext = ('.' + (fileName.split('.').pop() || '')).toLowerCase();
  return (ALLOWED_PHOTO_EXTENSIONS as readonly string[]).includes(ext);
}

/**
 * Checks MIME type
 */
export function hasAllowedMimeType(mimeType: string): boolean {
  if (!mimeType) return false;
  return (ALLOWED_PHOTO_MIME_TYPES as readonly string[]).includes(mimeType.toLowerCase());
}

/**
 * Fast synchronous file type and size validation
 */
export function validatePhotoFile(file: { name: string; size: number; type?: string }): {
  valid: boolean;
  error?: string;
} {
  // 1. Format check
  const isMimeValid = file.type ? hasAllowedMimeType(file.type) : true;
  const isExtValid = hasAllowedExtension(file.name);

  if (!isMimeValid && !isExtValid) {
    return {
      valid: false,
      error: 'Unsupported image format. Please upload JPG, PNG, or WebP.',
    };
  }

  // If MIME is explicitly given and invalid (e.g. image/gif, application/pdf)
  if (file.type && !hasAllowedMimeType(file.type)) {
    return {
      valid: false,
      error: 'Unsupported image format. Please upload JPG, PNG, or WebP.',
    };
  }

  // 2. Minimum file size check
  if (file.size < MIN_PHOTO_BYTES) {
    return {
      valid: false,
      error: 'Photo is too small. Minimum file size is 5 KB.',
    };
  }

  // 3. Maximum file size check
  if (file.size > MAX_PHOTO_BYTES) {
    return {
      valid: false,
      error: 'Photo is too large. Maximum file size is 15 MB.',
    };
  }

  return { valid: true };
}

/**
 * Dimension validation (Min 250x250, Recommended 600x600+)
 */
export function validatePhotoDimensions(
  width: number,
  height: number
): {
  valid: boolean;
  isRecommended: boolean;
  error?: string;
} {
  if (width < MIN_PHOTO_WIDTH || height < MIN_PHOTO_HEIGHT) {
    return {
      valid: false,
      isRecommended: false,
      error: `Photo resolution is too low. Minimum recommended resolution is ${MIN_PHOTO_WIDTH}×${MIN_PHOTO_HEIGHT} px.`,
    };
  }

  const isRecommended =
    (width >= RECOMMENDED_PHOTO_WIDTH && height >= 500) ||
    (width >= 500 && height >= RECOMMENDED_PHOTO_HEIGHT) ||
    (width >= 600 && height >= 600);

  return {
    valid: true,
    isRecommended,
  };
}

/**
 * Reads image dimensions in the browser without modifying pixels or using canvas.
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    // If not in a browser environment (e.g. Node tests), resolve cleanly
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      resolve({ width: RECOMMENDED_PHOTO_WIDTH, height: RECOMMENDED_PHOTO_HEIGHT });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Corrupted or unreadable image file.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Complete browser-side validation: file format, size, and dimensions.
 * Does NOT alter the file.
 */
export async function validatePhoto(file: File): Promise<PhotoValidationResult> {
  const fileCheck = validatePhotoFile(file);
  if (!fileCheck.valid) {
    return {
      valid: false,
      error: fileCheck.error,
      sizeBytes: file.size,
      formattedSize: formatBytes(file.size),
    };
  }

  try {
    const { width, height } = await getImageDimensions(file);
    const dimCheck = validatePhotoDimensions(width, height);

    if (!dimCheck.valid) {
      return {
        valid: false,
        error: dimCheck.error,
        width,
        height,
        sizeBytes: file.size,
        formattedSize: formatBytes(file.size),
        dimensionsText: `${width} × ${height} px`,
        isRecommended: false,
      };
    }

    return {
      valid: true,
      width,
      height,
      sizeBytes: file.size,
      formattedSize: formatBytes(file.size),
      dimensionsText: `${width} × ${height} px`,
      isRecommended: dimCheck.isRecommended,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err?.message || 'Unable to read image file dimensions.',
      sizeBytes: file.size,
      formattedSize: formatBytes(file.size),
    };
  }
}
