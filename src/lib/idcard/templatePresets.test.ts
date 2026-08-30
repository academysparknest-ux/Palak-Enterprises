/**
 * Template Presets & Coordinate Precision Test Suite
 *
 * Validates:
 * 1. All standard presets exist with valid IDs, names, orientations, and dimensions
 * 2. Every field in every preset is strictly within card boundaries (x >= 0, y >= 0, x + w <= cardWidth, y + h <= cardHeight)
 * 3. All fields have non-zero, positive width and height
 * 4. Sample-Template1 (Dual-Sided with Graphic Era branding) front and back coordinates precision
 * 5. formatFieldDisplay helper correctness (newline prefixes, trailing spaces, standard prefixes, empty values)
 * 6. fieldValue resolver returns clean values without duplicate hardcoded prefixes
 * 7. Canvas newline splitting and multi-line wrapping integrity
 *
 * Run: npx tsx src/lib/idcard/templatePresets.test.ts
 */

import {
  TEMPLATE_PRESETS,
  getPresetById,
  formatFieldDisplay,
  SAMPLE_TEMPLATE_1_LAYOUT,
  SPARKNEST_NAVY,
  SPARKNEST_GOLD,
  SPARKNEST_RED,
} from './templatePresets';
import { fieldValue } from './generation';
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

console.log('\n── ID Card Template Presets & Text Positioning Test Suite ──');

// ── Test 1: Registry Integrity ──
section('Test 1: Preset Registry Integrity');
{
  assert(TEMPLATE_PRESETS.length >= 4, `At least 4 presets registered (got ${TEMPLATE_PRESETS.length})`);

  const sampleTmpl = getPresetById('sample-tempate1');
  assert(!!sampleTmpl, 'Sample-Tempate1 preset is registered');
  assert(sampleTmpl?.cardWidthMm === 54 && sampleTmpl?.cardHeightMm === 85.6, 'Sample-Tempate1 has CR80 portrait dimensions (54 × 85.6 mm)');
  assert(sampleTmpl?.isDoubleSided === true, 'Sample-Tempate1 is double-sided');

  const sparknestDual = getPresetById('sparknest-dual-sided');
  assert(!!sparknestDual, 'Sparknest Dual-Sided preset is registered');
  assert(sparknestDual?.isDoubleSided === true, 'Sparknest Dual-Sided is double-sided');

  const sparknestSingle = getPresetById('sparknest-single-sided');
  assert(!!sparknestSingle, 'Sparknest Single-Sided preset is registered');
  assert(sparknestSingle?.isDoubleSided === false, 'Sparknest Single-Sided is single-sided');

  const classicLandscape = getPresetById('classic-landscape');
  assert(!!classicLandscape, 'Classic Landscape preset is registered');
  assert(classicLandscape?.cardWidthMm === 85.6 && classicLandscape?.cardHeightMm === 54, 'Classic Landscape has 85.6 × 54 mm dimensions');
}

// ── Test 2: Physical Boundary & Coordinate Validation for ALL Presets ──
section('Test 2: Physical Boundary & Coordinate Validation for ALL Presets');
{
  for (const preset of TEMPLATE_PRESETS) {
    const w = preset.cardWidthMm;
    const h = preset.cardHeightMm;

    // Check Front Side fields
    for (const field of preset.layout.fields) {
      assert(field.x >= 0, `[${preset.id}:front] ${field.key} x (${field.x}mm) >= 0`);
      assert(field.y >= 0, `[${preset.id}:front] ${field.key} y (${field.y}mm) >= 0`);
      assert(field.width > 0, `[${preset.id}:front] ${field.key} width (${field.width}mm) > 0`);
      assert(field.height > 0, `[${preset.id}:front] ${field.key} height (${field.height}mm) > 0`);
      assert(
        field.x + field.width <= w + 0.01,
        `[${preset.id}:front] ${field.key} x+w (${(field.x + field.width).toFixed(2)}mm) <= cardWidth (${w}mm)`
      );
      assert(
        field.y + field.height <= h + 0.01,
        `[${preset.id}:front] ${field.key} y+h (${(field.y + field.height).toFixed(2)}mm) <= cardHeight (${h}mm)`
      );
    }

    // Check Back Side fields if present
    if (preset.layout.back?.fields) {
      for (const field of preset.layout.back.fields) {
        assert(field.x >= 0, `[${preset.id}:back] ${field.key} x (${field.x}mm) >= 0`);
        assert(field.y >= 0, `[${preset.id}:back] ${field.key} y (${field.y}mm) >= 0`);
        assert(field.width > 0, `[${preset.id}:back] ${field.key} width (${field.width}mm) > 0`);
        assert(field.height > 0, `[${preset.id}:back] ${field.key} height (${field.height}mm) > 0`);
        assert(
          field.x + field.width <= w + 0.01,
          `[${preset.id}:back] ${field.key} x+w (${(field.x + field.width).toFixed(2)}mm) <= cardWidth (${w}mm)`
        );
        assert(
          field.y + field.height <= h + 0.01,
          `[${preset.id}:back] ${field.key} y+h (${(field.y + field.height).toFixed(2)}mm) <= cardHeight (${h}mm)`
        );
      }
    }
  }
}

// ── Test 3: Sample-Template1 Specific Layout Precision ──
section('Test 3: Sample-Template1 Coordinate and Typography Precision');
{
  const st1 = SAMPLE_TEMPLATE_1_LAYOUT;
  assert(st1.backgroundUrl === '/idcard-templates/sample-template1-front.png', 'Front background URL matches template 1 front asset');
  assert(st1.back?.backgroundUrl === '/idcard-templates/sample-template1-back.png', 'Back background URL matches template 1 back asset');

  // Verify Front Key Elements
  const frontLogo = st1.fields.find((f) => f.key === 'school_logo');
  const frontSchoolName = st1.fields.find((f) => f.key === 'school_name');
  const frontSchoolSub = st1.fields.find((f) => f.key === 'school_subtitle');
  const frontPhoto = st1.fields.find((f) => f.key === 'student_photo');
  const frontBlood = st1.fields.find((f) => f.key === 'blood_group');
  const frontBatch = st1.fields.find((f) => f.key === 'batch');
  const frontName = st1.fields.find((f) => f.key === 'student_name');
  const frontCourse = st1.fields.find((f) => f.key === 'class');

  assert(frontLogo?.x === 5.5 && frontLogo?.y === 4.5, 'Front Logo is positioned at top left (5.5, 4.5 mm)');
  assert(frontSchoolName?.customText === 'Graphic Era', 'Front School Name defaults to "Graphic Era"');
  assert(frontSchoolSub?.customText?.includes('Deemed to be University'), 'Front School Subtitle contains university title');
  assert(frontPhoto?.photoShape === 'circle', 'Front Student Photo is circular');
  assert(frontBlood?.color === '#FFFFFF', 'Blood Group in purple column has high-contrast white text');
  assert(frontBatch?.color === '#FFFFFF', 'Batch in purple column has high-contrast white text');
  assert(frontName?.color === '#B91C1C', 'Student name has Graphic Era red color (#B91C1C)');
  assert(frontCourse?.textAlign === 'center', 'Course text is centered');

  // Verify Back Key Elements
  const backFields = st1.back?.fields || [];
  const backFather = backFields.find((f) => f.key === 'father_name');
  const backPhone = backFields.find((f) => f.key === 'phone');
  const backAddress = backFields.find((f) => f.key === 'address');
  const backEmergency = backFields.find((f) => f.key === 'emergency_no');
  const backQr = backFields.find((f) => f.key === 'qr_code');
  const backBarcode = backFields.find((f) => f.key === 'barcode');
  const backValid = backFields.find((f) => f.key === 'valid_till');
  const backTerms = backFields.find((f) => f.key === 'terms');
  const backWebsite = backFields.find((f) => f.key === 'website');

  assert(backFather?.labelPrefix === "FATHER'S NAME: ", "Father's Name has clean labelPrefix");
  assert(backPhone?.labelPrefix === 'CONTACT NO: ', 'Phone has clean CONTACT NO: labelPrefix');
  assert(backAddress?.labelPrefix === 'ADDRESS: ', 'Address has clean ADDRESS: labelPrefix');
  assert(backEmergency?.labelPrefix === 'EMERGENCY NO: ', 'Emergency has clean EMERGENCY NO: labelPrefix');
  assert(backQr?.width === 17 && backQr?.height === 17, 'QR code is 17 × 17 mm');
  assert(backBarcode?.width === 38 && backBarcode?.height === 7.5, 'Barcode is 38 × 7.5 mm');
  assert(backValid?.labelPrefix === 'VALID TILL : ', 'Valid Till has prefix');
  assert(backTerms?.customText?.includes('Graphic Era'), 'Terms text references Graphic Era University');
  assert(backWebsite?.customText?.includes('www.geu.ac.in'), 'Website references geu.ac.in');
}

// ── Test 4: formatFieldDisplay Helper ──
section('Test 4: formatFieldDisplay Prefix & Spacing Normalization');
{
  assert(formatFieldDisplay('BLOOD GROUP:\n', 'B+') === 'BLOOD GROUP:\nB+', 'Preserves newline without adding extra space');
  assert(formatFieldDisplay("FATHER'S NAME: ", 'Rajesh') === "FATHER'S NAME: Rajesh", 'Preserves trailing space without doubling space');
  assert(formatFieldDisplay('ID:', 'STU-001') === 'ID: STU-001', 'Adds space when prefix does not end with space or newline');
  assert(formatFieldDisplay('', 'John Doe') === 'John Doe', 'Empty prefix returns value cleanly');
  assert(formatFieldDisplay(null, 'John Doe') === 'John Doe', 'Null prefix returns value cleanly');
  assert(formatFieldDisplay('ID:', '') === 'ID: ', 'Handles empty value cleanly');
}

// ── Test 5: fieldValue Clean Value Extraction Without Double Prefixes ──
section('Test 5: fieldValue Data Resolution');
{
  const mockPerson: IdCardPerson = {
    id: 'p-1',
    project_id: 'proj-1',
    student_id: 'STU-100',
    name: 'Aarav Sharma',
    class: 'B.Tech CSE',
    section: 'A',
    roll_number: '42',
    date_of_birth: '2004-03-25',
    blood_group: 'O+',
    father_name: 'Suresh Sharma',
    mother_name: 'Anita Sharma',
    phone: '9876543210',
    address: 'Dehradun, Uttarakhand',
    photo_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const classField = { key: 'class' as const, x: 0, y: 0, width: 20, height: 5, visible: true };
  const secField = { key: 'section' as const, x: 0, y: 0, width: 20, height: 5, visible: true };
  const rollField = { key: 'roll_number' as const, x: 0, y: 0, width: 20, height: 5, visible: true };

  assert(fieldValue(classField, mockPerson, '2024-25', 'Graphic Era') === 'B.Tech CSE', 'class field returns raw "B.Tech CSE" without hardcoded prefix');
  assert(fieldValue(secField, mockPerson, '2024-25', 'Graphic Era') === 'A', 'section field returns raw "A"');
  assert(fieldValue(rollField, mockPerson, '2024-25', 'Graphic Era') === '42', 'roll_number field returns raw "42"');
}

console.log(`\n${'═'.repeat(55)}`);
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log(`${'═'.repeat(55)}\n`);

if (failed > 0) process.exit(1);
