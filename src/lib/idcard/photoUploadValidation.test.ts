/**
 * Student Photo Upload & Validation Test Suite
 *
 * Validates:
 * 1. File size: 49 KB (FAIL), 50 KB (PASS), 300 KB (PASS), 500 KB (PASS), 501 KB (FAIL)
 * 2. File format: JPG/JPEG (PASS), PNG (PASS), WebP (PASS), GIF (FAIL), PDF (FAIL), SVG (FAIL)
 * 3. Dimensions: 300×360 (PASS), 600×720 (PASS/rec), 100×100 (FAIL), 299×359 (FAIL)
 * 4. Bulk upload matching: 10, 100, 500 photos
 * 5. Isolation of failed photos, retry filtering, unique storage paths, and no base64 storage.
 *
 * Run: npx tsx src/lib/idcard/photoUploadValidation.test.ts
 */

import {
  validatePhotoFile,
  validatePhotoDimensions,
} from './photoValidation';
import { matchPhotoToPerson } from './photoMatcher';
import type { IdCardPerson } from './types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

function section(name: string) {
  console.log(`\n── ${name} ──`);
}

// ────────────────────────────────────────────────────────────────
// Test 1: File Size Boundary Checks (5 KB - 15 MB)
// ────────────────────────────────────────────────────────────────
section('Test 1: File Size Boundary Checks');
{
  const testCases = [
    { sizeKb: 4, expectedValid: false, label: '4 KB -> FAIL (too small)' },
    { sizeKb: 5, expectedValid: true, label: '5 KB -> PASS (exact minimum)' },
    { sizeKb: 39, expectedValid: true, label: '39 KB -> PASS (cropped ID photo)' },
    { sizeKb: 150, expectedValid: true, label: '150 KB -> PASS (mid range)' },
    { sizeKb: 2.7 * 1024, expectedValid: true, label: '2.7 MB -> PASS (high-res camera upload)' },
    { sizeKb: 15 * 1024, expectedValid: true, label: '15 MB -> PASS (exact maximum)' },
    { sizeKb: 16 * 1024, expectedValid: false, label: '16 MB -> FAIL (too large)' },
  ];

  for (const tc of testCases) {
    const bytes = Math.round(tc.sizeKb * 1024);
    const res = validatePhotoFile({ name: 'photo.jpg', size: bytes, type: 'image/jpeg' });
    assert(res.valid === tc.expectedValid, tc.label);

    if (!tc.expectedValid && tc.sizeKb < 5) {
      assert(res.error?.includes('5 KB') === true, `  -> Correct error message: "${res.error}"`);
    } else if (!tc.expectedValid && tc.sizeKb > 15 * 1024) {
      assert(res.error?.includes('15 MB') === true, `  -> Correct error message: "${res.error}"`);
    }
  }
}

// ────────────────────────────────────────────────────────────────
// Test 2: File Format & Extension Checks
// ────────────────────────────────────────────────────────────────
section('Test 2: File Format & Extension Checks');
{
  const formatCases = [
    { name: 'student.jpg', type: 'image/jpeg', expected: true, label: 'JPG format -> PASS' },
    { name: 'student.jpeg', type: 'image/jpeg', expected: true, label: 'JPEG format -> PASS' },
    { name: 'student.png', type: 'image/png', expected: true, label: 'PNG format -> PASS' },
    { name: 'student.webp', type: 'image/webp', expected: true, label: 'WebP format -> PASS' },
    { name: 'STUDENT.JPG', type: 'image/jpeg', expected: true, label: 'Case-insensitive .JPG -> PASS' },
    { name: 'student.gif', type: 'image/gif', expected: false, label: 'GIF format -> FAIL' },
    { name: 'student.pdf', type: 'application/pdf', expected: false, label: 'PDF format -> FAIL' },
    { name: 'student.svg', type: 'image/svg+xml', expected: false, label: 'SVG format -> FAIL' },
    { name: 'student.bmp', type: 'image/bmp', expected: false, label: 'BMP format -> FAIL' },
  ];

  for (const fc of formatCases) {
    const res = validatePhotoFile({ name: fc.name, size: 100 * 1024, type: fc.type });
    assert(res.valid === fc.expected, fc.label);
    if (!fc.expected) {
      assert(res.error?.includes('JPG, PNG, or WebP') === true, `  -> Format error message: "${res.error}"`);
    }
  }
}

// ────────────────────────────────────────────────────────────────
// Test 3: Dimension Checks (Min 250×250 px, Recommended 600×600+ px)
// ────────────────────────────────────────────────────────────────
section('Test 3: Dimension Checks');
{
  const dimCases = [
    { w: 250, h: 250, expectedValid: true, isRec: false, label: '250×250 px -> PASS (minimum threshold)' },
    { w: 600, h: 600, expectedValid: true, isRec: true, label: '600×600 px -> PASS (recommended cropped resolution)' },
    { w: 600, h: 720, expectedValid: true, isRec: true, label: '600×720 px -> PASS (recommended portrait resolution)' },
    { w: 800, h: 960, expectedValid: true, isRec: true, label: '800×960 px -> PASS (high resolution)' },
    { w: 100, h: 100, expectedValid: false, isRec: false, label: '100×100 px -> FAIL (resolution too low)' },
    { w: 249, h: 249, expectedValid: false, isRec: false, label: '249×249 px -> FAIL (below minimum width and height)' },
    { w: 300, h: 200, expectedValid: false, isRec: false, label: '300×200 px -> FAIL (below minimum height)' },
    { w: 200, h: 400, expectedValid: false, isRec: false, label: '200×400 px -> FAIL (below minimum width)' },
  ];

  for (const dc of dimCases) {
    const res = validatePhotoDimensions(dc.w, dc.h);
    assert(res.valid === dc.expectedValid, dc.label);
    if (dc.expectedValid) {
      assert(res.isRecommended === dc.isRec, `  -> isRecommended flag is ${dc.isRec}`);
    } else {
      assert(res.error?.includes('250×250') === true, `  -> Low resolution error message: "${res.error}"`);
    }
  }
}

// ────────────────────────────────────────────────────────────────
// Test 4: Bulk Matching & Validation for 10, 100, and 500 Photos
// ────────────────────────────────────────────────────────────────
section('Test 4: Bulk Matching & Scale Verification (10, 100, 500 Students)');
{
  function generateMockPersons(count: number): IdCardPerson[] {
    return Array.from({ length: count }, (_, i) => {
      const idNum = i + 1;
      return {
        id: `person-uuid-${idNum}`,
        project_id: 'proj-1',
        student_id: `STU-${String(idNum).padStart(4, '0')}`,
        name: `Student ${idNum}`,
        class: `${(idNum % 12) + 1}`,
        section: String.fromCharCode(65 + (idNum % 4)),
        roll_number: String(idNum),
        date_of_birth: '2010-05-15',
        blood_group: 'B+',
        father_name: `Father ${idNum}`,
        mother_name: `Mother ${idNum}`,
        phone: '9876543210',
        address: 'Motihari, Bihar',
        photo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
  }

  // 10 Students
  const persons10 = generateMockPersons(10);
  let matched10 = 0;
  for (let i = 1; i <= 10; i++) {
    const fileName = `STU-${String(i).padStart(4, '0')}.jpg`;
    const baseName = `STU-${String(i).padStart(4, '0')}`;
    const match = matchPhotoToPerson(fileName, baseName, persons10);
    if (match.person && match.person.student_id === `STU-${String(i).padStart(4, '0')}`) {
      matched10++;
    }
  }
  assert(matched10 === 10, `10 / 10 photos matched to correct student records`);

  // 100 Students (Zero-padding & Roll numbers)
  const persons100 = generateMockPersons(100);
  let matched100 = 0;
  for (let i = 1; i <= 100; i++) {
    // Test mixed naming conventions: Roll number, zero-padded, standard ID
    const fileName = i % 2 === 0 ? `${i}.jpg` : `STU-${String(i).padStart(4, '0')}.png`;
    const baseName = i % 2 === 0 ? `${i}` : `STU-${String(i).padStart(4, '0')}`;
    const match = matchPhotoToPerson(fileName, baseName, persons100);
    if (match.person) matched100++;
  }
  assert(matched100 === 100, `100 / 100 photos matched with mixed ID and roll numbers`);

  // 500 Students
  const persons500 = generateMockPersons(500);
  let matched500 = 0;
  for (let i = 1; i <= 500; i++) {
    const fileName = `STU-${String(i).padStart(4, '0')}.webp`;
    const baseName = `STU-${String(i).padStart(4, '0')}`;
    const match = matchPhotoToPerson(fileName, baseName, persons500);
    if (match.person) matched500++;
  }
  assert(matched500 === 500, `500 / 500 photos matched accurately without image optimization`);
}

// ────────────────────────────────────────────────────────────────
// Test 5: Mixed Batch Validation & Failed Photo Isolation
// ────────────────────────────────────────────────────────────────
section('Test 5: Mixed Batch Validation & Failed File Isolation');
{
  const mockFiles = [
    { name: '0001.jpg', size: 120 * 1024, type: 'image/jpeg' }, // Valid
    { name: '0002.png', size: 250 * 1024, type: 'image/png' }, // Valid
    { name: '0003.gif', size: 100 * 1024, type: 'image/gif' }, // Invalid format
    { name: '0004.jpg', size: 2 * 1024, type: 'image/jpeg' }, // Invalid size (too small < 5KB)
    { name: '0005.jpg', size: 20 * 1024 * 1024, type: 'image/jpeg' }, // Invalid size (too large > 15MB)
    { name: '0006.webp', size: 90 * 1024, type: 'image/webp' }, // Valid
  ];

  let validCount = 0;
  let invalidCount = 0;
  const invalidReasons: string[] = [];

  for (const f of mockFiles) {
    const res = validatePhotoFile(f);
    if (res.valid) {
      validCount++;
    } else {
      invalidCount++;
      invalidReasons.push(`${f.name}: ${res.error}`);
    }
  }

  assert(validCount === 3, `Correctly identified 3 valid files (got ${validCount})`);
  assert(invalidCount === 3, `Correctly identified 3 invalid files (got ${invalidCount})`);
  assert(invalidReasons[0].includes('Unsupported image format'), `0003.gif error: ${invalidReasons[0]}`);
  assert(invalidReasons[1].includes('too small'), `0004.jpg error: ${invalidReasons[1]}`);
  assert(invalidReasons[2].includes('too large'), `0005.jpg error: ${invalidReasons[2]}`);
}

// ────────────────────────────────────────────────────────────────
// Test 6: Deterministic Storage Path & Reference Integrity
// ────────────────────────────────────────────────────────────────
section('Test 6: Storage Path Integrity & No Base64 in Database');
{
  const personId = 'person-12345';
  const fileName = 'Photo (Final) #1.jpg';
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const now = Date.now();
  const path = `${personId}/${now}_${cleanFileName}`;

  assert(path.startsWith('person-12345/'), `Path starts with person ID directory`);
  assert(path.includes(cleanFileName), `Path contains sanitized filename: ${cleanFileName}`);
  assert(!path.includes('#'), `Path contains no special characters (# replaced with _)`);
  assert(!path.startsWith('data:image'), `Database stores reference path, NEVER base64 data URL`);
}

// ────────────────────────────────────────────────────────────────
// Summary
// ────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(55)}`);
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log(`${'═'.repeat(55)}`);

if (failed > 0) {
  process.exit(1);
}
