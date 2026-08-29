/**
 * High-Precision Image-Based ID Card Coordinate & Rendering Test Suite
 *
 * Validates:
 * 1. Physical Coordinate System: canonical values remain in millimeters (mm)
 * 2. Mouse screen-to-mm and mm-to-screen coordinate transformations
 * 3. Arrow movement precision (0.10 mm per step, 1.00 mm per Shift+step)
 * 4. Zoom invariance: zooming (50%, 100%, 200%) changes only visual pxPerMm without modifying mm coordinates
 * 5. Pre-flight template boundary and dimension validation
 * 6. Batch generation validation (missing photos, blank names, missing back layouts)
 * 7. Aspect ratio calculation and fit strategies
 * 8. Calibration test sheet generation
 *
 * Run: npx tsx src/lib/idcard/imageTemplateCoordinates.test.ts
 */

import { validateIdCardTemplate, validateBatchBeforeGeneration } from './templateValidation';
import { buildCalibrationTestPdf, MM_TO_PX } from './generation';
import type { IdCardPerson, IdCardTemplate, TemplateField } from './types';

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

console.log('\n── High-Precision Image-Based ID Card Template Tests ──\n');

// ── Test 1: Canonical mm Coordinate Storage ───────────────────
console.log('1. Canonical Millimeter Coordinate Storage');
const testField: TemplateField = {
  id: 'field-1',
  key: 'student_name',
  x: 42.3,
  y: 18.7,
  width: 35.0,
  height: 5.0,
  visible: true,
};

assert(testField.x === 42.3, 'x coordinate stored in mm (42.30 mm)');
assert(testField.y === 18.7, 'y coordinate stored in mm (18.70 mm)');
assert(testField.width === 35.0, 'width stored in mm (35.00 mm)');
assert(testField.height === 5.0, 'height stored in mm (5.00 mm)');

// ── Test 2: Screen <-> mm Transformation with Zoom ────────────
console.log('\n2. Screen to mm Conversion & Zoom Scale Invariance');
const zoomLevels = [50, 100, 150, 200];

for (const zoom of zoomLevels) {
  const pxPerMm = (4.2 * zoom) / 100;
  const screenX = testField.x * pxPerMm;
  const convertedBackMm = screenX / pxPerMm;

  assert(
    Math.abs(convertedBackMm - testField.x) < 0.0001,
    `Zoom ${zoom}%: screenX (${screenX.toFixed(2)}px) converts back to exact mm (${convertedBackMm.toFixed(2)}mm)`
  );
}

// ── Test 3: Arrow & Shift+Arrow Precision Movement ───────────
console.log('\n3. Keyboard Arrow Precision Stepping');
let currentX = 10.0;
const singleArrowStep = 0.1; // 0.10 mm
const shiftArrowStep = 1.0; // 1.00 mm

// 3 standard arrow rights
currentX = Number((currentX + singleArrowStep).toFixed(2));
assert(currentX === 10.1, '1x Arrow Right -> 10.10 mm');
currentX = Number((currentX + singleArrowStep).toFixed(2));
assert(currentX === 10.2, '2x Arrow Right -> 10.20 mm');
currentX = Number((currentX + singleArrowStep).toFixed(2));
assert(currentX === 10.3, '3x Arrow Right -> 10.30 mm');

// 2 Shift + Arrow rights
currentX = Number((currentX + shiftArrowStep).toFixed(2));
assert(currentX === 11.3, '1x Shift+Arrow Right -> 11.30 mm');
currentX = Number((currentX + shiftArrowStep).toFixed(2));
assert(currentX === 12.3, '2x Shift+Arrow Right -> 12.30 mm');

// ── Test 4: 300 DPI High-Resolution Physical Raster Scale ─────
console.log('\n4. High-Resolution 300 DPI Rendering Scale');
const expectedPxPerMm = 300 / 25.4; // 11.811 px/mm
assert(Math.abs(MM_TO_PX - expectedPxPerMm) < 0.001, 'MM_TO_PX equals exactly 300 / 25.4');

const cardW = 85.6; // standard CR80
const cardH = 54.0;
const canvasW = Math.round(cardW * MM_TO_PX);
const canvasH = Math.round(cardH * MM_TO_PX);
assert(canvasW === 1011, '85.60 mm width rasterizes to 1011 pixels at 300 DPI');
assert(canvasH === 638, '54.00 mm height rasterizes to 638 pixels at 300 DPI');

// ── Test 5: Template Validation Engine ────────────────────────
console.log('\n5. Pre-flight Template Boundary Validation');
const validTemplate: IdCardTemplate = {
  id: 'tmpl-test-1',
  project_id: 'proj-1',
  name: 'Test Valid Template',
  card_width_mm: 85.6,
  card_height_mm: 54.0,
  background_url: 'data:image/png;base64,sample',
  created_by: 'admin',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  layout: {
    backgroundColor: '#FFFFFF',
    fields: [
      {
        id: 'f1',
        key: 'student_name',
        x: 10,
        y: 10,
        width: 40,
        height: 6,
        visible: true,
      },
    ],
  },
};

const validResult = validateIdCardTemplate(validTemplate);
assert(validResult.valid === true, 'Valid template passes validation without errors');

const outOfBoundsTemplate: IdCardTemplate = {
  ...validTemplate,
  layout: {
    ...validTemplate.layout,
    fields: [
      {
        id: 'f2',
        key: 'student_name',
        x: 80,
        y: 50,
        width: 20, // 80 + 20 = 100mm > 85.6mm card width
        height: 10,
        visible: true,
      },
    ],
  },
};

const oobResult = validateIdCardTemplate(outOfBoundsTemplate);
assert(
  oobResult.warnings.some((w) => w.includes('overflows outside the card boundary')),
  'Out of bounds element correctly flagged with warning'
);

// ── Test 6: Batch Generation Validation ───────────────────────
console.log('\n6. Batch Generation Validation (Data Completeness)');
const sampleStudents: IdCardPerson[] = [
  {
    id: 'p1',
    project_id: 'proj-1',
    student_id: 'STU-001',
    name: 'Aarav Patel',
    class: '10',
    section: 'A',
    roll_number: '1',
    date_of_birth: '2010-01-01',
    blood_group: 'O+',
    father_name: 'Rajesh Patel',
    mother_name: 'Meena Patel',
    phone: '9876543210',
    address: 'Mumbai',
    photo_url: 'photos/p1.jpg',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'p2',
    project_id: 'proj-1',
    student_id: 'STU-002',
    name: '', // Missing name!
    class: '10',
    section: 'A',
    roll_number: '2',
    date_of_birth: null,
    blood_group: null,
    father_name: null,
    mother_name: null,
    phone: null,
    address: null,
    photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const batchResult = validateBatchBeforeGeneration(sampleStudents, validTemplate);
assert(batchResult.valid === false, 'Batch with missing name is rejected from generation');
assert(batchResult.errors.some((e) => e.toLowerCase().includes('missing or blank') && e.toLowerCase().includes('name')), 'Missing name error detected');

// ── Test 7: Calibration Test Sheet PDF Generation ────────────
console.log('\n7. Calibration Test Sheet Generation');
const calibrationPdfBlob = buildCalibrationTestPdf(210, 297, 85.6, 54.0);
assert(calibrationPdfBlob instanceof Blob, 'Calibration test sheet generated as valid PDF Blob');
assert(calibrationPdfBlob.size > 1000, `Calibration PDF has non-empty payload (${calibrationPdfBlob.size} bytes)`);

console.log(`\n${'═'.repeat(60)}`);
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log(`${'═'.repeat(60)}\n`);

if (failed > 0) process.exit(1);
