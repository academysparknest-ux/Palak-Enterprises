/**
 * Palak Enterprises — Centralized Admin Image Optimization Configuration
 * 
 * All configuration parameters governing Admin image uploads, resizing,
 * compression, and WebP conversion are centralized here.
 * 
 * NOTE: Quick Service user/customer document uploads do NOT use this configuration.
 */

export const ADMIN_IMAGE_CONFIG = {
  /** Maximum original upload size in Megabytes */
  maxUploadSizeMB: 10,
  /** Maximum upload size in bytes (10 MB = 10,485,760 bytes) */
  maxUploadSizeBytes: 10 * 1024 * 1024,
  
  /** Maximum proportional width in pixels */
  maxWidth: 2000,
  /** Maximum proportional height in pixels */
  maxHeight: 2000,

  /** WebP compression quality (0.0 to 1.0) — 80 provides exceptional visual fidelity with small file size */
  webpQuality: 0.80,

  /** Target output format for raster admin images */
  outputFormat: 'image/webp' as const,
  outputExtension: '.webp' as const,

  /** Supported input MIME types for Admin upload */
  supportedMimeTypes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
  ] as const,

  /** Supported input file extensions */
  supportedExtensions: [
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.gif',
    '.svg',
  ] as const,

  /** Supabase Storage primary bucket for website and admin media assets */
  primaryStorageBucket: 'website-assets',
  /** Fallback buckets in order of priority */
  fallbackStorageBuckets: ['business-assets', 'customer-documents'] as const,
  /** Storage path prefix for admin uploads */
  storageFolder: 'admin-optimized',
} as const;

export type AdminImageConfig = typeof ADMIN_IMAGE_CONFIG;
