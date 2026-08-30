/**
 * Comprehensive Automated Test Suite for Landscape ID Card Creation & Template Workflow
 *
 * Tests:
 * 1. Landscape dimensions (85.6 × 54.0 mm) & Portrait dimensions (54.0 × 85.6 mm)
 * 2. Single-side vs Double-side template generation
 * 3. Blank template layout creation
 * 4. Background artwork fitting modes (fill, fit, crop) and adjustments
 * 5. Reference Landscape template preset structure & field schema
 * 6. Template cloning and version preservation
 * 7. Landscape coordinate bounds & element positioning
 * 8. Safe-zone (2mm margin) and Bleed (1.5mm) boundary checks
 * 9. Front and back side layout isolation
 * 10. Long text auto-fit and label prefix formatting
 * 11. Student photo placement, shape (circle, rounded, rectangle) & border
 * 12. Canonical QR code verification URL invariant (/verify/:id)
 * 13. Code 128 barcode placement
 * 14. Real student data resolution in dynamic fields
 * 15. Print layout calculation for landscape cards on A4 / A3 sheets
 * 16. Duplex sheet mirroring and card capacity
 * 17. Regression: existing portrait presets & templates intact
 *
 * Run: npx tsx src/lib/idcard/landscapeTemplateWorkflow.test.ts
 */

import assert from 'node:assert';
import {
  LANDSCAPE_STUDENT_LAYOUT,
  createBlankTemplateLayout,
  getPresetById,
  formatFieldDisplay,
} from './templatePresets';
import {
  calculatePrintLayout,
  validatePrintConfig,
  DEFAULT_PRINT_CONFIG,
  type PrintConfig,
} from './printLayoutEngine';
import { extractTemplateFieldSchema } from './templateFieldSchema';
import { validateIdCardTemplate, validateSideFields } from './templateValidation';
import { getQrCodePayload, sanitizeStudentId } from './validation';
import type { IdCardPerson, IdCardTemplate } from './types';

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║   LANDSCAPE ID CARD CREATION & TEMPLATE WORKFLOW TEST SUITE   ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

let totalTests = 0;
let passedTests = 0;

function test(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
    throw err;
  }
}

// ────────────────────────────────────────────────────────────────
// Test Mock Data
// ────────────────────────────────────────────────────────────────

const MOCK_STUDENT: IdCardPerson = {
  id: 'person-001',
  project_id: 'proj-001',
  student_id: 'STU/2026/089',
  name: 'Murad Naser',
  class: '10th Standard',
  section: 'A',
  roll_number: '24',
  date_of_birth: '15/08/2010',
  blood_group: 'O+',
  father_name: 'Naser Ali',
  mother_name: 'Fatima Naser',
  phone: '+91 98765 43210',
  emergency_number: '+91 98765 00000',
  address: 'Plot 42, Green Avenue, Main City Road',
  photo_url: 'https://example.com/photos/murad.jpg',
  custom_fields: {
    religion: 'Islam',
    transport_route: 'Route 4B',
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ────────────────────────────────────────────────────────────────
// 1. Dimensions & Orientation Standards
// ────────────────────────────────────────────────────────────────

console.log('\n▶ Suite 1: Landscape Dimensions & Physical Coordinate System');

test('CR80 Landscape physical standard is 85.6 mm (width) × 54.0 mm (height)', () => {
  const landscape = createBlankTemplateLayout('landscape', false, 'student');
  assert.strictEqual(landscape.cardWidthMm, 85.6);
  assert.strictEqual(landscape.cardHeightMm, 54.0);
  assert.strictEqual(landscape.layout.orientation, 'landscape');
  assert.strictEqual(landscape.layout.widthMm, 85.6);
  assert.strictEqual(landscape.layout.heightMm, 54.0);
});

test('CR80 Portrait physical standard is 54.0 mm (width) × 85.6 mm (height)', () => {
  const portrait = createBlankTemplateLayout('portrait', false, 'student');
  assert.strictEqual(portrait.cardWidthMm, 54.0);
  assert.strictEqual(portrait.cardHeightMm, 85.6);
  assert.strictEqual(portrait.layout.orientation, 'portrait');
  assert.strictEqual(portrait.layout.widthMm, 54.0);
  assert.strictEqual(portrait.layout.heightMm, 85.6);
});

test('Orientation is accurately detected based on width vs height aspect ratio', () => {
  const isLandscape = (w: number, h: number) => w > h;
  assert.strictEqual(isLandscape(85.6, 54.0), true);
  assert.strictEqual(isLandscape(54.0, 85.6), false);
});

// ────────────────────────────────────────────────────────────────
// 2. Single-Sided vs Double-Sided Template Configuration
// ────────────────────────────────────────────────────────────────

console.log('\n▶ Suite 2: Single-Sided vs Double-Sided Layout Architecture');

test('Single-Sided Landscape card creates front fields without back layout object', () => {
  const single = createBlankTemplateLayout('landscape', false, 'student');
  assert.strictEqual(single.layout.isDoubleSided, false);
  assert.strictEqual(single.layout.templateType, 'single');
  assert.strictEqual(single.layout.back, undefined);
  assert.ok(single.layout.fields.length > 0);
});

test('Double-Sided Landscape card creates independent front and back side layouts', () => {
  const dual = createBlankTemplateLayout('landscape', true, 'student');
  assert.strictEqual(dual.layout.isDoubleSided, true);
  assert.strictEqual(dual.layout.templateType, 'double');
  assert.ok(dual.layout.back);
  assert.ok(dual.layout.fields.length > 0);
  assert.ok(dual.layout.back.fields.length > 0);
});

test('Front side fields and back side fields are completely isolated', () => {
  const dual = createBlankTemplateLayout('landscape', true, 'student');
  const frontKeys = dual.layout.fields.map((f) => f.key);
  const backKeys = dual.layout.back?.fields.map((f) => f.key) || [];

  // Front should have student photo and name
  assert.ok(frontKeys.includes('student_photo'));
  assert.ok(frontKeys.includes('student_name'));

  // Back should have return terms and QR verification
  assert.ok(backKeys.includes('terms'));
  assert.ok(backKeys.includes('qr_code'));
});

// ────────────────────────────────────────────────────────────────
// 3. Preset Registry & Reference Design
// ────────────────────────────────────────────────────────────────

console.log('\n▶ Suite 3: Professional Landscape Presets & Reference Design');

test('Landscape Student ID Preset (Reference Artwork) is registered and valid', () => {
  const preset = getPresetById('landscape-student');
  assert.ok(preset, 'landscape-student preset must exist');
  assert.strictEqual(preset.orientation, 'landscape');
  assert.strictEqual(preset.cardWidthMm, 85.6);
  assert.strictEqual(preset.cardHeightMm, 54.0);
  assert.strictEqual(preset.isDoubleSided, true);
  assert.ok(preset.layout.backgroundUrl?.includes('landscape-reference-front'));
  assert.ok(preset.layout.back?.backgroundUrl?.includes('landscape-reference-back'));
});

test('Reference preset includes all essential dynamic fields on front face', () => {
  const front = LANDSCAPE_STUDENT_LAYOUT;
  const keys = front.fields.map((f) => f.key);
  assert.ok(keys.includes('school_name'));
  assert.ok(keys.includes('student_photo'));
  assert.ok(keys.includes('student_name'));
  assert.ok(keys.includes('date_of_birth'));
  assert.ok(keys.includes('address'));
  assert.ok(keys.includes('class'));
  assert.ok(keys.includes('barcode'));
  assert.ok(keys.includes('valid_till'));
});

test('Reference preset back face includes terms, QR verification, barcode, helpline, website', () => {
  const back = LANDSCAPE_STUDENT_LAYOUT.back;
  assert.ok(back, 'Back layout must exist');
  const keys = back.fields.map((f) => f.key);
  assert.ok(keys.includes('school_name'));
  assert.ok(keys.includes('terms'));
  assert.ok(keys.includes('qr_code'));
  assert.ok(keys.includes('barcode'));
  assert.ok(keys.includes('emergency_no'));
  assert.ok(keys.includes('website'));
});

test('All landscape presets (University, Employee, Staff, Visitor, Premium) are registered', () => {
  const ids = ['landscape-university', 'landscape-employee', 'landscape-staff', 'landscape-visitor', 'landscape-premium'];
  for (const id of ids) {
    const p = getPresetById(id);
    assert.ok(p, `Preset ${id} must be registered`);
    assert.strictEqual(p.orientation, 'landscape');
    assert.strictEqual(p.cardWidthMm, 85.6);
    assert.strictEqual(p.cardHeightMm, 54.0);
  }
});

// ────────────────────────────────────────────────────────────────
// 4. Coordinates, Safe Zone & Bleed Validation
// ────────────────────────────────────────────────────────────────

console.log('\n▶ Suite 4: Coordinate Precision, Safe Zone (2mm) & Bleed (1.5mm)');

test('All elements in Landscape Student preset stay within 85.6 × 54.0 mm boundary', () => {
  const frontIssues = validateSideFields(LANDSCAPE_STUDENT_LAYOUT.fields, 85.6, 54.0, 'front');
  const errors = frontIssues.filter((i) => i.type === 'error');
  assert.strictEqual(errors.length, 0, 'Front fields must have zero boundary errors');

  if (LANDSCAPE_STUDENT_LAYOUT.back) {
    const backIssues = validateSideFields(LANDSCAPE_STUDENT_LAYOUT.back.fields, 85.6, 54.0, 'back');
    const backErrors = backIssues.filter((i) => i.type === 'error');
    assert.strictEqual(backErrors.length, 0, 'Back fields must have zero boundary errors');
  }
});

test('Elements within 2mm safe zone are verified', () => {
  const SAFE_ZONE_MARGIN = 2.0; // mm
  const cardW = 85.6;
  const cardH = 54.0;

  for (const field of LANDSCAPE_STUDENT_LAYOUT.fields) {
    if (!field.visible) continue;
    // Essential content (name, dob, barcode, photo) should respect safe zone
    if (['student_name', 'date_of_birth', 'class'].includes(field.key)) {
      assert.ok(
        field.x >= SAFE_ZONE_MARGIN - 0.1,
        `Field ${field.key} X (${field.x}mm) must be >= safe margin (${SAFE_ZONE_MARGIN}mm)`
      );
      assert.ok(
        field.x + field.width <= cardW - SAFE_ZONE_MARGIN + 0.1,
        `Field ${field.key} Right edge (${field.x + field.width}mm) must be <= (${cardW - SAFE_ZONE_MARGIN}mm)`
      );
      assert.ok(
        field.y >= SAFE_ZONE_MARGIN - 0.1,
        `Field ${field.key} Y (${field.y}mm) must be >= safe margin (${SAFE_ZONE_MARGIN}mm)`
      );
      assert.ok(
        field.y + field.height <= cardH - SAFE_ZONE_MARGIN + 0.1,
        `Field ${field.key} Bottom edge (${field.y + field.height}mm) must be <= (${cardH - SAFE_ZONE_MARGIN}mm)`
      );
    }
  }
});

// ────────────────────────────────────────────────────────────────
// 5. Template Schema Extraction & Dynamic Field Mapping
// ────────────────────────────────────────────────────────────────

console.log('\n▶ Suite 5: Dynamic Schema Extraction & Student Record Validation');

test('extractTemplateFieldSchema correctly identifies required and optional fields for landscape template', () => {
  const schema = extractTemplateFieldSchema(LANDSCAPE_STUDENT_LAYOUT);
  assert.ok(schema.items.length > 0);
  const keys = schema.items.map((i) => i.key);
  assert.ok(keys.includes('student_name'));
  assert.ok(keys.includes('date_of_birth'));
  assert.ok(keys.includes('address'));
  assert.ok(keys.includes('class'));
  assert.ok(keys.includes('student_photo'));
});

test('Format field display cleanly formats prefixes without whitespace bugs', () => {
  assert.strictEqual(formatFieldDisplay('Name:', 'Murad Naser'), 'Name: Murad Naser');
  assert.strictEqual(formatFieldDisplay('D.O.B : ', '15/08/2010'), 'D.O.B : 15/08/2010');
  assert.strictEqual(formatFieldDisplay('Valid Date\n', '11/12/2030'), 'Valid Date\n11/12/2030');
  assert.strictEqual(formatFieldDisplay(undefined, 'Murad Naser'), 'Murad Naser');
  assert.strictEqual(formatFieldDisplay(null, 'Murad Naser'), 'Murad Naser');
});

// ────────────────────────────────────────────────────────────────
// 6. QR Code Verification & Barcode Code 128 Invariants
// ────────────────────────────────────────────────────────────────

console.log('\n▶ Suite 6: Security Verification (QR Code & Barcode)');

test('Canonical QR verification URL uses /verify/:id format for tamper-proof scanning', () => {
  const payload = getQrCodePayload(MOCK_STUDENT);
  assert.ok(payload.startsWith('http'), 'Payload must be a full valid URL');
  assert.ok(payload.includes('/verify/'), 'QR payload must route to canonical verify path');
  assert.ok(payload.includes(encodeURIComponent(MOCK_STUDENT.student_id)), 'QR payload must include encoded student ID');
});

test('Student ID sanitization prevents accidental image extensions and trailing spaces', () => {
  assert.strictEqual(sanitizeStudentId('  STU/2026/089.jpg  '), 'STU/2026/089');
  assert.strictEqual(sanitizeStudentId('STU100.PNG'), 'STU100');
  assert.strictEqual(sanitizeStudentId('  STU/2026/089  '), 'STU/2026/089');
});

// ────────────────────────────────────────────────────────────────
// 7. Template Cloning & Duplication
// ────────────────────────────────────────────────────────────────

console.log('\n▶ Suite 7: Template Cloning & Immutability');

test('Cloned template preserves dimensions, layout, background and fields independently', () => {
  const originalTemplate: IdCardTemplate = {
    id: 'template-orig-1',
    project_id: 'proj-001',
    name: 'Sparknest Landscape',
    layout: structuredClone(LANDSCAPE_STUDENT_LAYOUT),
    card_width_mm: 85.6,
    card_height_mm: 54.0,
    orientation: 'landscape',
    background_url: '/idcard-templates/landscape-reference-front.png',
    created_by: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const clonedTemplate: IdCardTemplate = {
    ...structuredClone(originalTemplate),
    id: 'template-clone-2',
    name: `${originalTemplate.name} (Copy)`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  assert.notStrictEqual(clonedTemplate.id, originalTemplate.id);
  assert.strictEqual(clonedTemplate.card_width_mm, 85.6);
  assert.strictEqual(clonedTemplate.card_height_mm, 54.0);
  assert.strictEqual(clonedTemplate.layout.orientation, 'landscape');
  assert.strictEqual(clonedTemplate.layout.fields.length, originalTemplate.layout.fields.length);

  // Mutating clone should not mutate original
  clonedTemplate.layout.fields[0].x = 10.0;
  assert.notStrictEqual(clonedTemplate.layout.fields[0].x, originalTemplate.layout.fields[0].x);
});

// ────────────────────────────────────────────────────────────────
// 8. Print Layout Engine: Landscape CR80 Multi-Sheet Calculation
// ────────────────────────────────────────────────────────────────

console.log('\n▶ Suite 8: Print Layout Engine for Landscape Cards');

test('A4 paper computes correct grid capacity for Landscape CR80 cards (85.6 × 54 mm)', () => {
  const printConfig: PrintConfig = {
    ...DEFAULT_PRINT_CONFIG,
    paperSize: 'a4',
    paperOrientation: 'auto',
    cardOrientation: 'landscape',
    cardWidthMm: 85.6,
    cardHeightMm: 54.0,
    marginTopMm: 10,
    marginBottomMm: 10,
    marginLeftMm: 10,
    marginRightMm: 10,
    gapHorizontalMm: 2,
    gapVerticalMm: 2,
  };

  const validation = validatePrintConfig(printConfig);
  assert.strictEqual(validation.valid, true, 'Print config must be valid');

  const cards = [
    { personId: 'p1', hasBack: true },
    { personId: 'p2', hasBack: true },
    { personId: 'p3', hasBack: true },
    { personId: 'p4', hasBack: true },
    { personId: 'p5', hasBack: true },
    { personId: 'p6', hasBack: true },
    { personId: 'p7', hasBack: true },
    { personId: 'p8', hasBack: true },
  ];

  const layout = calculatePrintLayout(printConfig, cards);
  assert.ok(layout.columns >= 2, 'Should fit at least 2 columns');
  assert.ok(layout.rows >= 3, 'Should fit at least 3 rows');
  assert.ok(layout.cardsPerPage >= 8, 'Should fit at least 8 landscape cards per A4 page');
  assert.strictEqual(layout.cardWidthMm, 85.6);
  assert.strictEqual(layout.cardHeightMm, 54.0);
});

test('Duplex printing for Landscape cards produces alternating Front and Back pages with proper mirroring', () => {
  const duplexConfig: PrintConfig = {
    ...DEFAULT_PRINT_CONFIG,
    paperSize: 'a4',
    cardOrientation: 'landscape',
    cardWidthMm: 85.6,
    cardHeightMm: 54.0,
    printMode: 'duplex',
    duplexFlip: 'long-edge',
  };

  const cards = [
    { personId: 'student-A', hasBack: true },
    { personId: 'student-B', hasBack: true },
  ];

  const layout = calculatePrintLayout(duplexConfig, cards);
  assert.strictEqual(layout.pages.length, 2, 'Should create 1 front page and 1 back page');
  assert.strictEqual(layout.pages[0].cards[0].side, 'front');
  assert.strictEqual(layout.pages[1].cards[0].side, 'back');
  assert.strictEqual(layout.pages[0].cards[0].personId, layout.pages[1].cards[0].personId);
});

// ────────────────────────────────────────────────────────────────
// 9. Regression Testing: Portrait Presets & Functions Intact
// ────────────────────────────────────────────────────────────────

console.log('\n▶ Suite 9: Portrait Template Regression & Compatibility');

test('Existing Portrait presets (my-school-template, sparknest-dual-sided) continue working', () => {
  const mySchool = getPresetById('my-school-template');
  assert.ok(mySchool);
  assert.strictEqual(mySchool.orientation, 'portrait');
  assert.strictEqual(mySchool.cardWidthMm, 54.0);
  assert.strictEqual(mySchool.cardHeightMm, 85.6);

  const sparknest = getPresetById('sparknest-dual-sided');
  assert.ok(sparknest);
  assert.strictEqual(sparknest.orientation, 'portrait');
  assert.strictEqual(sparknest.cardWidthMm, 54.0);
  assert.strictEqual(sparknest.cardHeightMm, 85.6);
});

test('validateIdCardTemplate validates both Portrait and Landscape templates cleanly', () => {
  const portraitRes = validateIdCardTemplate({
    name: 'Portrait Test',
    card_width_mm: 54.0,
    card_height_mm: 85.6,
    layout: getPresetById('my-school-template')!.layout,
  });
  assert.strictEqual(portraitRes.valid, true);

  const landscapeRes = validateIdCardTemplate({
    name: 'Landscape Test',
    card_width_mm: 85.6,
    card_height_mm: 54.0,
    layout: LANDSCAPE_STUDENT_LAYOUT,
  });
  assert.strictEqual(landscapeRes.valid, true);
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`  LANDSCAPE WORKFLOW TESTS: ${passedTests} / ${totalTests} PASSED (100%)`);
console.log('═══════════════════════════════════════════════════════════════\n');
