/**
 * Palak Enterprises — Admin Image Security & Validation
 *
 * Implements strict format, size, and magic-byte inspection
 * to ensure non-image files renamed to .jpg/.png are authoritatively rejected.
 * 
 * Supports UTF-8 BOM, XML declarations, and standard SVG formatting.
 * Detects animated GIFs to prevent accidental single-frame loss.
 */

import { ADMIN_IMAGE_CONFIG } from './imageConfig';

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  detectedFormat?: string;
  fileSize?: number;
  isAnimated?: boolean;
}

/**
 * Checks whether a GIF binary buffer contains multiple frames (animated GIF).
 */
export function isAnimatedGif(buffer: Uint8Array): boolean {
  if (buffer.length < 16) return false;
  // Must be GIF87a or GIF89a
  if (
    buffer[0] !== 0x47 || buffer[1] !== 0x49 || buffer[2] !== 0x46 ||
    buffer[3] !== 0x38 || (buffer[4] !== 0x37 && buffer[4] !== 0x39) || buffer[5] !== 0x61
  ) {
    return false;
  }

  // Count image separator blocks (0x2C)
  let frameCount = 0;
  for (let i = 10; i < buffer.length - 1; i++) {
    // 0x2C is the Image Descriptor indicator
    if (buffer[i] === 0x2C) {
      frameCount++;
      if (frameCount > 1) return true;
    }
  }
  return false;
}

/**
 * Inspects binary bytes to authoritatively verify true image format.
 * Inspects up to 1024 bytes to safely accommodate XML declarations,
 * DOCTYPEs, comments, and BOMs in SVGs.
 */
export async function detectImageFormatFromBytes(
  file: File | Blob | ArrayBuffer
): Promise<{ mime: string | null; isAnimated?: boolean }> {
  let buffer: Uint8Array;

  if (file instanceof ArrayBuffer) {
    buffer = new Uint8Array(file.slice(0, Math.min(file.byteLength, 1024)));
  } else if (file instanceof Blob) {
    const slice = file.slice(0, Math.min(file.size, 1024));
    const arrayBuf = await slice.arrayBuffer();
    buffer = new Uint8Array(arrayBuf);
  } else {
    return { mime: null };
  }

  if (buffer.length < 4) return { mime: null };

  // 1. JPEG check: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { mime: 'image/jpeg' };
  }

  // 2. PNG check: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return { mime: 'image/png' };
  }

  // 3. WebP check: RIFF .... WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // 'RIFF'
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50  // 'WEBP'
  ) {
    return { mime: 'image/webp' };
  }

  // 4. GIF check: GIF87a or GIF89a
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) && buffer[5] === 0x61
  ) {
    // Read slightly larger chunk if possible to detect animation
    let fullBuffer = buffer;
    if (file instanceof Blob && file.size > buffer.length) {
      const extendedSlice = file.slice(0, Math.min(file.size, 65536));
      const extendedBuf = await extendedSlice.arrayBuffer();
      fullBuffer = new Uint8Array(extendedBuf);
    }
    const animated = isAnimatedGif(fullBuffer);
    return { mime: 'image/gif', isAnimated: animated };
  }

  // 5. SVG check: handles UTF-8 BOM, XML prolog, comments, whitespace, and <svg
  try {
    let textBytes = buffer;
    // Check and strip UTF-8 BOM (EF BB BF)
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      textBytes = buffer.subarray(3);
    }

    const decoder = new TextDecoder('utf-8');
    const rawText = decoder.decode(textBytes);
    // Strip XML comments: <!-- ... -->
    const cleanedText = rawText.replace(/<!--[\s\S]*?-->/g, '').trim().toLowerCase();

    // Check for standard SVG markers
    if (
      cleanedText.startsWith('<svg') ||
      cleanedText.startsWith('<?xml') ||
      cleanedText.startsWith('<!doctype svg') ||
      cleanedText.includes('<svg')
    ) {
      // Must contain svg element opening
      if (cleanedText.includes('<svg') || cleanedText.includes('xmlns="http://www.w3.org/2000/svg"')) {
        return { mime: 'image/svg+xml' };
      }
    }
  } catch {
    // Ignore decode error for non-text binaries
  }

  return { mime: null };
}

/**
 * Authoritatively validates an admin image file prior to optimization and storage.
 */
export async function validateAdminImage(
  file: File | Blob,
  fileName?: string
): Promise<ImageValidationResult> {
  const name = fileName || (file instanceof File ? file.name : 'image');
  const size = file.size;

  // 1. Check size limit
  if (size === 0) {
    return {
      isValid: false,
      error: 'The selected file is empty (0 bytes). Please choose a valid image.',
      fileSize: size,
    };
  }

  if (size > ADMIN_IMAGE_CONFIG.maxUploadSizeBytes) {
    const sizeMB = (size / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      error: `File size (${sizeMB} MB) exceeds maximum allowed limit of ${ADMIN_IMAGE_CONFIG.maxUploadSizeMB} MB.`,
      fileSize: size,
    };
  }

  // 2. Check filename extension if available
  const ext = ('.' + (name.split('.').pop() || '')).toLowerCase();
  const validExtension = (ADMIN_IMAGE_CONFIG.supportedExtensions as readonly string[]).includes(ext);
  if (!validExtension && name.includes('.')) {
    return {
      isValid: false,
      error: `Unsupported file extension "${ext}". Supported formats: ${ADMIN_IMAGE_CONFIG.supportedExtensions.join(', ')}`,
      fileSize: size,
    };
  }

  // 3. Inspect actual magic bytes
  const { mime: detectedMime, isAnimated } = await detectImageFormatFromBytes(file);
  if (!detectedMime) {
    return {
      isValid: false,
      error: 'The file contents do not match a valid image format. Disguised or corrupted files are rejected.',
      fileSize: size,
    };
  }

  const isSupportedMime = (ADMIN_IMAGE_CONFIG.supportedMimeTypes as readonly string[]).includes(detectedMime as any);
  if (!isSupportedMime) {
    return {
      isValid: false,
      error: `Unsupported image format (${detectedMime}). Supported formats: JPEG, PNG, WebP, GIF, SVG.`,
      detectedFormat: detectedMime,
      fileSize: size,
      isAnimated,
    };
  }

  return {
    isValid: true,
    detectedFormat: detectedMime,
    fileSize: size,
    isAnimated,
  };
}
