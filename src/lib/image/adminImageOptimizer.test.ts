import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_IMAGE_CONFIG } from './imageConfig';
import {
  validateAdminImage,
  detectImageFormatFromBytes,
  isAnimatedGif,
} from './imageValidation';
import {
  calculateProportionalDimensions,
  generateOptimizedFileName,
  optimizeAdminImage,
} from './adminImageOptimizer';
import { assertAdminAuthorization, safeReplaceAdminImage } from './adminImageUploadService';

describe('Admin Image Optimization & WebP System', () => {
  describe('1. Centralized Configuration', () => {
    it('enforces 10 MB maximum upload limit', () => {
      assert.equal(ADMIN_IMAGE_CONFIG.maxUploadSizeMB, 10);
      assert.equal(ADMIN_IMAGE_CONFIG.maxUploadSizeBytes, 10 * 1024 * 1024);
    });

    it('enforces max 2000x2000 proportional boundary', () => {
      assert.equal(ADMIN_IMAGE_CONFIG.maxWidth, 2000);
      assert.equal(ADMIN_IMAGE_CONFIG.maxHeight, 2000);
    });

    it('specifies WebP quality 0.80', () => {
      assert.equal(ADMIN_IMAGE_CONFIG.webpQuality, 0.80);
      assert.equal(ADMIN_IMAGE_CONFIG.outputFormat, 'image/webp');
      assert.equal(ADMIN_IMAGE_CONFIG.outputExtension, '.webp');
    });

    it('supports standard input formats: JPEG, PNG, WebP, GIF, SVG', () => {
      assert.ok(ADMIN_IMAGE_CONFIG.supportedMimeTypes.includes('image/jpeg'));
      assert.ok(ADMIN_IMAGE_CONFIG.supportedMimeTypes.includes('image/png'));
      assert.ok(ADMIN_IMAGE_CONFIG.supportedMimeTypes.includes('image/webp'));
      assert.ok(ADMIN_IMAGE_CONFIG.supportedMimeTypes.includes('image/gif'));
      assert.ok(ADMIN_IMAGE_CONFIG.supportedMimeTypes.includes('image/svg+xml'));
    });
  });

  describe('2. Binary Magic-Byte Detection & Security Validation', () => {
    it('identifies JPEG magic bytes (FF D8 FF)', async () => {
      const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);
      const res = await detectImageFormatFromBytes(jpegBytes.buffer);
      assert.equal(res.mime, 'image/jpeg');
    });

    it('identifies PNG magic bytes (89 50 4E 47)', async () => {
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const res = await detectImageFormatFromBytes(pngBytes.buffer);
      assert.equal(res.mime, 'image/png');
    });

    it('identifies WebP magic bytes (RIFF ... WEBP)', async () => {
      const webpBytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, // 'RIFF'
        0x00, 0x00, 0x00, 0x00, // file size
        0x57, 0x45, 0x42, 0x50, // 'WEBP'
      ]);
      const res = await detectImageFormatFromBytes(webpBytes.buffer);
      assert.equal(res.mime, 'image/webp');
    });

    it('identifies SVG XML content and handles UTF-8 BOM, comments, and XML declarations', async () => {
      // 1. Direct <svg
      const encoder = new TextEncoder();
      const directSvg = encoder.encode('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>');
      assert.equal((await detectImageFormatFromBytes(directSvg.buffer)).mime, 'image/svg+xml');

      // 2. SVG with XML declaration and comments
      const xmlSvg = encoder.encode('<?xml version="1.0" encoding="UTF-8"?>\n<!-- Generator: Adobe Illustrator -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>');
      assert.equal((await detectImageFormatFromBytes(xmlSvg.buffer)).mime, 'image/svg+xml');

      // 3. SVG with UTF-8 BOM (0xEF, 0xBB, 0xBF)
      const bomSvg = new Uint8Array([0xEF, 0xBB, 0xBF, ...encoder.encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')]);
      assert.equal((await detectImageFormatFromBytes(bomSvg.buffer)).mime, 'image/svg+xml');
    });

    it('detects animated GIF vs static GIF correctly', () => {
      // Static GIF with 1 image separator (0x2C)
      const staticGif = new Uint8Array([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
        0x0A, 0x00, 0x0A, 0x00, 0x80, 0x00, 0x00,
        0x2C, 0x00, 0x00, 0x00, 0x00, // Frame 1
      ]);
      assert.equal(isAnimatedGif(staticGif), false);

      // Animated GIF with 2 image separators (0x2C)
      const animatedGif = new Uint8Array([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
        0x0A, 0x00, 0x0A, 0x00, 0x80, 0x00, 0x00,
        0x2C, 0x00, 0x00, 0x00, 0x00, // Frame 1
        0x00, 0x00,
        0x2C, 0x00, 0x00, 0x00, 0x00, // Frame 2
      ]);
      assert.equal(isAnimatedGif(animatedGif), true);
    });

    it('rejects disguised non-image files (e.g. PDF renamed to photo.jpg)', async () => {
      const fakeJpg = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34])], 'photo.jpg', {
        type: 'image/jpeg',
      });
      const result = await validateAdminImage(fakeJpg);
      assert.equal(result.isValid, false);
      assert.match(result.error || '', /do not match a valid image format/i);
    });

    it('rejects empty files (0 bytes)', async () => {
      const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' });
      const result = await validateAdminImage(emptyFile);
      assert.equal(result.isValid, false);
      assert.match(result.error || '', /empty/i);
    });

    it('rejects files exceeding 10 MB limit', async () => {
      const elevenMB = 11 * 1024 * 1024;
      const oversizedBlob = {
        size: elevenMB,
        name: 'huge.jpg',
        type: 'image/jpeg',
        slice: () => new Blob([]),
      } as any;

      const result = await validateAdminImage(oversizedBlob, 'huge.jpg');
      assert.equal(result.isValid, false);
      assert.match(result.error || '', /exceeds maximum allowed limit of 10 MB/i);
    });

    it('rejects unsupported extensions like .exe or .pdf', async () => {
      const invalidExt = new File([new Uint8Array([1, 2, 3, 4])], 'script.exe', { type: 'application/octet-stream' });
      const result = await validateAdminImage(invalidExt);
      assert.equal(result.isValid, false);
      assert.match(result.error || '', /unsupported file extension/i);
    });
  });

  describe('3. Proportional Scaling & Aspect Ratio Preservation', () => {
    it('does not upscale images smaller than 2000x2000', () => {
      const res = calculateProportionalDimensions(800, 600);
      assert.equal(res.width, 800);
      assert.equal(res.height, 600);
      assert.equal(res.wasScaled, false);
    });

    it('scales down landscape 6000x4000 proportionally to 2000x1333', () => {
      const res = calculateProportionalDimensions(6000, 4000);
      assert.equal(res.width, 2000);
      assert.equal(res.height, 1333);
      assert.equal(res.wasScaled, true);
    });

    it('scales down portrait 3000x6000 proportionally to 1000x2000', () => {
      const res = calculateProportionalDimensions(3000, 6000);
      assert.equal(res.width, 1000);
      assert.equal(res.height, 2000);
      assert.equal(res.wasScaled, true);
    });

    it('scales down square 4000x4000 proportionally to 2000x2000', () => {
      const res = calculateProportionalDimensions(4000, 4000);
      assert.equal(res.width, 2000);
      assert.equal(res.height, 2000);
      assert.equal(res.wasScaled, true);
    });
  });

  describe('4. Filename Generation & Path Traversal Protection', () => {
    it('sanitizes path traversal attempts in filenames', () => {
      const maliciousName = '../../../../etc/passwd_exploit.PNG';
      const safeName = generateOptimizedFileName(maliciousName);
      assert.ok(!safeName.includes('/'));
      assert.ok(!safeName.includes('\\'));
      assert.ok(!safeName.includes('..'));
      assert.ok(safeName.startsWith('admin_passwd_exploit_'));
      assert.ok(safeName.endsWith('.webp'));
    });

    it('generates distinct filenames for rapid sequential uploads', () => {
      const name1 = generateOptimizedFileName('banner.jpg');
      const name2 = generateOptimizedFileName('banner.jpg');
      assert.notEqual(name1, name2);
    });
  });

  describe('5. SVG and Animated GIF Preservation', () => {
    it('preserves SVG as vector graphic without rasterization', async () => {
      const encoder = new TextEncoder();
      const svgContent = encoder.encode('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><circle cx="100" cy="100" r="50"/></svg>');
      const svgFile = new File([svgContent], 'vector_logo.svg', { type: 'image/svg+xml' });

      const result = await optimizeAdminImage(svgFile);
      assert.equal(result.metadata.format, 'svg');
      assert.equal(result.metadata.mimeType, 'image/svg+xml');
      assert.ok(result.metadata.fileName.endsWith('.svg'));
    });

    it('preserves animated GIF intact without single-frame WebP destruction', async () => {
      const animatedGifBytes = new Uint8Array([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
        0x0A, 0x00, 0x0A, 0x00, 0x80, 0x00, 0x00,
        0x2C, 0x00, 0x00, 0x00, 0x00, // Frame 1
        0x00, 0x00,
        0x2C, 0x00, 0x00, 0x00, 0x00, // Frame 2
      ]);
      const gifFile = new File([animatedGifBytes], 'animated.gif', { type: 'image/gif' });

      const result = await optimizeAdminImage(gifFile);
      assert.equal(result.metadata.format, 'gif');
      assert.equal(result.metadata.mimeType, 'image/gif');
      assert.ok(result.metadata.fileName.endsWith('.gif'));
    });
  });

  describe('6. Admin Authorization Protection', () => {
    it('assertAdminAuthorization rejects unauthenticated calls', async () => {
      await assert.rejects(
        async () => {
          await assertAdminAuthorization();
        },
        {
          message: /Unauthorized|Authentication required/i,
        }
      );
    });

    it('safeReplaceAdminImage protects database update and rejects unauthenticated sessions', async () => {
      let dbUpdated = false;
      const fakeFile = new File([new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0])], 'test.jpg', { type: 'image/jpeg' });

      await assert.rejects(
        async () => {
          await safeReplaceAdminImage({
            file: fakeFile,
            previousImageUrl: 'https://example.com/old.webp',
            updateDatabaseCallback: async () => {
              dbUpdated = true;
            },
          });
        },
        {
          message: /Unauthorized|Authentication required/i,
        }
      );

      assert.equal(dbUpdated, false, 'Database must not be updated if authentication fails');
    });
  });

  describe('7. Quick Service Isolation & Regression Invariant', () => {
    it('confirms Quick Service orderUploadEngine does NOT import admin image optimizer', async () => {
      const fs = await import('node:fs/promises');
      const engineSource = await fs.readFile('src/lib/orders/orderUploadEngine.ts', 'utf-8');
      assert.ok(!engineSource.includes('adminImageOptimizer'), 'orderUploadEngine must not import adminImageOptimizer');
      assert.ok(!engineSource.includes('adminImageUploadService'), 'orderUploadEngine must not import adminImageUploadService');
      assert.ok(engineSource.includes('100% Original File Integrity'), 'orderUploadEngine must preserve 100% original file integrity');
    });

    it('confirms FileUploadZone does NOT route customer files through admin optimizer', async () => {
      const fs = await import('node:fs/promises');
      const zoneSource = await fs.readFile('src/components/FileUploadZone.tsx', 'utf-8');
      assert.ok(!zoneSource.includes('adminImageOptimizer'), 'FileUploadZone must not import adminImageOptimizer');
      assert.ok(!zoneSource.includes('uploadAdminImage'), 'FileUploadZone must not import uploadAdminImage');
    });
  });
});
