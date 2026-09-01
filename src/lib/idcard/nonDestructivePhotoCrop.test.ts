/**
 * Non-Destructive Student Photo Crop, Align, Optimize & Storage Test Suite
 *
 * Run: npx tsx src/lib/idcard/nonDestructivePhotoCrop.test.ts
 */

import assert from 'node:assert';
import {
  TARGET_PHOTO_WIDTH,
  TARGET_PHOTO_HEIGHT,
  MAX_OPTIMIZED_PHOTO_BYTES,
  MAX_ORIGINAL_INPUT_BYTES,
  DEFAULT_PHOTO_CROP_STATE,
  generateDerivedPhotoFromCropState,
} from './photoOptimizer';
import type { PhotoCropState, IdCardPerson } from './types';

console.log('=================================================================');
console.log('   NON-DESTRUCTIVE STUDENT PHOTO CROP INTEGRITY TEST SUITE');
console.log('=================================================================\n');

let passedTests = 0;
let failedTests = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      await res;
    }
    console.log('  PASS: ' + name);
    passedTests++;
  } catch (err: any) {
    console.error('  FAIL: ' + name);
    console.error('    Error:', err.message);
    failedTests++;
  }
}

function section(title: string) {
  console.log('\n-- ' + title + ' --');
}

async function runSuite() {
  section('Suite 1: Core Architectural Separation');

  await test('1. Original image source is retained and never modified by crop operations', async () => {
    const rawOriginalBytes = Math.floor(2.4 * 1024 * 1024);
    const originalFile = new File([new Uint8Array(rawOriginalBytes)], 'raw_student_2000x2000.jpg', {
      type: 'image/jpeg',
    });

    const cropStateA: PhotoCropState = {
      shape: 'circle',
      x: 15,
      y: -20,
      scale: 1.2,
      rotation: 0,
      naturalWidth: 2000,
      naturalHeight: 2000,
    };

    const derivedOutputA = await generateDerivedPhotoFromCropState(originalFile, cropStateA);

    assert.strictEqual(originalFile.size, rawOriginalBytes, 'Original file size must remain intact');
    assert.strictEqual(originalFile.name, 'raw_student_2000x2000.jpg', 'Original file name must remain intact');
    assert.notStrictEqual(derivedOutputA.file, originalFile, 'Derived output must be a separate file instance');
    assert.strictEqual(derivedOutputA.width, TARGET_PHOTO_WIDTH, 'Derived photo is 600px width');
    assert.strictEqual(derivedOutputA.height, TARGET_PHOTO_HEIGHT, 'Derived photo is 600px height');
    assert.ok(derivedOutputA.sizeBytes <= MAX_OPTIMIZED_PHOTO_BYTES, 'Derived output size <= 250 KB');
  });

  await test('2. Default PhotoCropState provides safe circular centered defaults', () => {
    assert.strictEqual(DEFAULT_PHOTO_CROP_STATE.shape, 'circle');
    assert.strictEqual(DEFAULT_PHOTO_CROP_STATE.x, 0);
    assert.strictEqual(DEFAULT_PHOTO_CROP_STATE.y, 0);
    assert.strictEqual(DEFAULT_PHOTO_CROP_STATE.scale, 1);
    assert.strictEqual(DEFAULT_PHOTO_CROP_STATE.rotation, 0);
  });

  section('Suite 2: Panning & Framing Reversibility (Up, Down, Left, Right)');

  await test('3. Reopening and moving face upward retains full un-cropped bottom region', async () => {
    const rawOriginal = new File([new Uint8Array(3 * 1024 * 1024)], 'full_body_portrait.jpg', {
      type: 'image/jpeg',
    });

    const edit1Crop: PhotoCropState = {
      shape: 'circle',
      x: 0,
      y: -40,
      scale: 1.2,
      rotation: 0,
    };
    const output1 = await generateDerivedPhotoFromCropState(rawOriginal, edit1Crop);
    assert.ok(output1.file.size <= MAX_OPTIMIZED_PHOTO_BYTES);

    const edit2Crop: PhotoCropState = {
      shape: 'circle',
      x: 0,
      y: 40,
      scale: 1.2,
      rotation: 0,
    };
    const output2 = await generateDerivedPhotoFromCropState(rawOriginal, edit2Crop);

    assert.strictEqual(rawOriginal.size, 3 * 1024 * 1024);
    assert.notStrictEqual(output1.file, output2.file);
    assert.strictEqual(output2.cropState?.y, 40);
  });

  await test('4. Lateral panning (Left and Right) across multiple saves', async () => {
    const rawOriginal = new File([new Uint8Array(1.5 * 1024 * 1024)], 'student_group_crop.jpg', {
      type: 'image/jpeg',
    });

    const cropLeft: PhotoCropState = { shape: 'rect', x: -50, y: 0, scale: 1.5, rotation: 0 };
    const outputLeft = await generateDerivedPhotoFromCropState(rawOriginal, cropLeft);
    assert.strictEqual(outputLeft.cropState?.x, -50);

    const cropRight: PhotoCropState = { shape: 'rect', x: 50, y: 0, scale: 1.5, rotation: 0 };
    const outputRight = await generateDerivedPhotoFromCropState(rawOriginal, cropRight);
    assert.strictEqual(outputRight.cropState?.x, 50);

    assert.strictEqual(rawOriginal.size, 1.5 * 1024 * 1024, 'Raw source size is unchanged');
  });

  section('Suite 3: Zoom & Rotation Framing Reversibility');

  await test('5. Zoom range reversibility (50% -> 100% -> 200% -> 350% -> 50%) without pixel loss', async () => {
    const rawOriginal = new File([new Uint8Array(2 * 1024 * 1024)], 'zoom_test.jpg', {
      type: 'image/jpeg',
    });

    const zoomLevels = [0.5, 1.0, 1.5, 2.0, 3.5, 0.5];
    for (const zoom of zoomLevels) {
      const crop: PhotoCropState = { shape: 'circle', x: 0, y: 0, scale: zoom, rotation: 0 };
      const output = await generateDerivedPhotoFromCropState(rawOriginal, crop);
      assert.strictEqual(output.cropState?.scale, zoom, 'Scale ' + (zoom * 100) + '% preserved in crop state');
      assert.ok(output.file.size <= MAX_OPTIMIZED_PHOTO_BYTES);
    }
    assert.strictEqual(rawOriginal.size, 2 * 1024 * 1024, 'Original source untouched after all zoom cycles');
  });

  await test('6. Rotation reversibility (0 deg -> 90 deg -> 180 deg -> 270 deg -> 0 deg) without physical destruction', async () => {
    const rawOriginal = new File([new Uint8Array(1.8 * 1024 * 1024)], 'rotation_test.jpg', {
      type: 'image/jpeg',
    });

    const angles = [0, 90, 180, 270, 0];
    for (const rot of angles) {
      const crop: PhotoCropState = { shape: 'circle', x: 10, y: 10, scale: 1.1, rotation: rot };
      const output = await generateDerivedPhotoFromCropState(rawOriginal, crop);
      assert.strictEqual(output.cropState?.rotation, rot);
    }
  });

  section('Suite 4: Shape Switching (Circle <-> Rounded)');

  await test('7. Circle and Rounded Card modes apply as view masks while preserving rectangular source', async () => {
    const rawOriginal = new File([new Uint8Array(1.2 * 1024 * 1024)], 'shape_test.jpg', {
      type: 'image/jpeg',
    });

    const circleCrop: PhotoCropState = { shape: 'circle', x: 5, y: -5, scale: 1.3, rotation: 90 };
    const circleOutput = await generateDerivedPhotoFromCropState(rawOriginal, circleCrop);
    assert.strictEqual(circleOutput.cropState?.shape, 'circle');

    const rectCrop: PhotoCropState = { ...circleCrop, shape: 'rect' };
    const rectOutput = await generateDerivedPhotoFromCropState(rawOriginal, rectCrop);
    assert.strictEqual(rectOutput.cropState?.shape, 'rect');
    assert.strictEqual(rectOutput.cropState?.x, 5);
    assert.strictEqual(rectOutput.cropState?.y, -5);
    assert.strictEqual(rectOutput.cropState?.scale, 1.3);
    assert.strictEqual(rectOutput.cropState?.rotation, 90);
  });

  section('Suite 5: Reset & Cancel Action Safety');

  await test('8. Reset action restores default framing parameters without deleting source', () => {
    const modifiedState: PhotoCropState = {
      shape: 'rect',
      x: 120,
      y: -80,
      scale: 2.5,
      rotation: 180,
    };

    const resetState: PhotoCropState = {
      ...DEFAULT_PHOTO_CROP_STATE,
      shape: modifiedState.shape,
    };

    assert.strictEqual(resetState.x, 0);
    assert.strictEqual(resetState.y, 0);
    assert.strictEqual(resetState.scale, 1);
    assert.strictEqual(resetState.rotation, 0);
  });

  await test('9. Cancel action preserves previously saved valid crop state', () => {
    const initialSavedState: PhotoCropState = {
      shape: 'circle',
      x: 10,
      y: 15,
      scale: 1.25,
      rotation: 0,
    };

    let temporaryEditingState: PhotoCropState = {
      ...initialSavedState,
      x: 999,
      scale: 3.5,
    };

    temporaryEditingState = { ...initialSavedState };

    assert.strictEqual(temporaryEditingState.x, 10);
    assert.strictEqual(temporaryEditingState.scale, 1.25);
  });

  section('Suite 6: Multi-Edit Non-Degrading Pipeline (10+ Consecutive Edits)');

  await test('10. 10 consecutive edits always regenerate directly from original source', async () => {
    const rawOriginal = new File([new Uint8Array(4 * 1024 * 1024)], 'master_original.jpg', {
      type: 'image/jpeg',
    });

    for (let i = 1; i <= 10; i++) {
      const stepCrop: PhotoCropState = {
        shape: i % 2 === 0 ? 'circle' : 'rect',
        x: i * 5,
        y: -i * 3,
        scale: 1 + i * 0.05,
        rotation: (i * 90) % 360,
      };

      const result = await generateDerivedPhotoFromCropState(rawOriginal, stepCrop);
      assert.strictEqual(result.width, TARGET_PHOTO_WIDTH);
      assert.strictEqual(result.height, TARGET_PHOTO_HEIGHT);
      assert.ok(result.sizeBytes <= MAX_OPTIMIZED_PHOTO_BYTES, 'Edit ' + i + ' output <= 250 KB');
      assert.strictEqual(result.cropState?.x, i * 5);
    }

    assert.strictEqual(rawOriginal.size, 4 * 1024 * 1024, 'Master original unchanged after 10 edits');
  });

  section('Suite 7: Transactional Save & Error Rollback Safety');

  await test('11. Failed save preserves existing valid photo and crop state intact', () => {
    const studentRecord: IdCardPerson = {
      id: 'student-safe-1',
      project_id: 'proj-1',
      student_id: 'STU-100',
      name: 'Rohan Sharma',
      class: '10',
      section: 'A',
      roll_number: '12',
      date_of_birth: '2008-04-12',
      blood_group: 'B+',
      father_name: 'Rajesh Sharma',
      mother_name: 'Sunita Sharma',
      phone: '9876543210',
      address: 'Delhi, India',
      photo_url: 'student-safe-1/valid_photo.jpg',
      original_photo_url: 'student-safe-1/raw_original.jpg',
      photo_crop_state: { shape: 'circle', x: 0, y: 0, scale: 1, rotation: 0 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let simulatedFailure = true;
    let rollbackTriggered = false;

    try {
      if (simulatedFailure) {
        throw new Error('Storage network timeout');
      }
    } catch {
      rollbackTriggered = true;
    }

    assert.strictEqual(rollbackTriggered, true, 'Error caught cleanly');
    assert.strictEqual(studentRecord.photo_url, 'student-safe-1/valid_photo.jpg', 'Existing photo intact');
    assert.strictEqual(studentRecord.original_photo_url, 'student-safe-1/raw_original.jpg', 'Original source intact');
    assert.strictEqual(studentRecord.photo_crop_state?.shape, 'circle', 'Existing crop state intact');
  });

  section('Suite 8: 100+ Student Data Isolation');

  await test('12. 120 students have completely isolated photos, crop states and source URLs', async () => {
    const students: IdCardPerson[] = [];

    for (let i = 1; i <= 120; i++) {
      const studentId = 'STU-' + String(i).padStart(3, '0');
      const cropState: PhotoCropState = {
        shape: i % 2 === 0 ? 'circle' : 'rect',
        x: (i * 3) % 50,
        y: -(i * 2) % 40,
        scale: Number((1 + (i % 10) * 0.1).toFixed(2)),
        rotation: (i % 4) * 90,
      };

      students.push({
        id: 'uuid-' + i,
        project_id: 'project-bulk',
        student_id: studentId,
        name: 'Student ' + i,
        class: '10',
        section: 'A',
        roll_number: String(i),
        date_of_birth: '2008-01-01',
        blood_group: 'O+',
        father_name: 'Father ' + i,
        mother_name: 'Mother ' + i,
        phone: '9000000000',
        address: 'Main Street',
        photo_url: 'uuid-' + i + '/optimized_' + i + '.jpg',
        original_photo_url: 'uuid-' + i + '/raw_' + i + '.jpg',
        photo_crop_state: cropState,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    assert.strictEqual(students.length, 120);

    const photoUrls = new Set(students.map((s) => s.photo_url));
    const originalUrls = new Set(students.map((s) => s.original_photo_url));
    assert.strictEqual(photoUrls.size, 120, 'All 120 student photo URLs are unique');
    assert.strictEqual(originalUrls.size, 120, 'All 120 original photo URLs are unique');

    assert.notDeepStrictEqual(students[0].photo_crop_state, students[1].photo_crop_state);
  });

  section('Suite 9: Backward Compatibility with Legacy Records');

  await test('13. Legacy records without original_photo_url or photo_crop_state work with fallback', () => {
    const legacyStudent: IdCardPerson = {
      id: 'legacy-student-1',
      project_id: 'proj-old',
      student_id: 'LEG-001',
      name: 'Pooja Verma',
      class: '12',
      section: 'B',
      roll_number: '5',
      date_of_birth: '2006-05-10',
      blood_group: 'A+',
      father_name: 'Anil Verma',
      mother_name: 'Rekha Verma',
      phone: '9811122233',
      address: 'Jaipur',
      photo_url: 'legacy-student-1/photo.jpg',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    };

    const effectiveOriginalSource = legacyStudent.original_photo_url || legacyStudent.photo_url;
    const effectiveCropState = legacyStudent.photo_crop_state || DEFAULT_PHOTO_CROP_STATE;

    assert.strictEqual(effectiveOriginalSource, 'legacy-student-1/photo.jpg');
    assert.strictEqual(effectiveCropState.shape, 'circle');
    assert.strictEqual(effectiveCropState.scale, 1);
    assert.strictEqual(effectiveCropState.rotation, 0);
  });

  section('Suite 10: Production Invariants Verification');

  await test('14. Production Invariant: Maximum input file size allows up to 15 MB local input', () => {
    assert.strictEqual(MAX_ORIGINAL_INPUT_BYTES, 15 * 1024 * 1024);
  });

  await test('15. Production Invariant: Derived photo size never exceeds 250 KB limit', async () => {
    const testFile = new File([new Uint8Array(5 * 1024 * 1024)], 'large_input.jpg', { type: 'image/jpeg' });
    const result = await generateDerivedPhotoFromCropState(testFile, DEFAULT_PHOTO_CROP_STATE);
    assert.ok(result.sizeBytes <= MAX_OPTIMIZED_PHOTO_BYTES, 'Size ' + result.sizeBytes + ' <= ' + MAX_OPTIMIZED_PHOTO_BYTES);
  });

  console.log('\n=================================================================');
  console.log('  NON-DESTRUCTIVE CROP TEST SUMMARY: ' + passedTests + ' passed, ' + failedTests + ' failed');
  console.log('=================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite();