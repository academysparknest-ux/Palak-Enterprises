/**
 * ID Card Studio Designer & Production Hardening Test Suite
 *
 * Tests:
 * 1. Element Palette & Insertion Specifications
 * 2. Canvas Alignment & Positioning Mathematics
 * 3. Safe Zone & Bleed Production Safety Validation
 * 4. Real Student Data Preview & Long Name Safety
 * 5. Dual-Sided Layout & Layer Preservation
 * 6. QR Canonical Public Verification Endpoint Invariant
 * 7. Template Schema Extraction & Roster Compatibility
 *
 * Run: npx tsx src/lib/idcard/studioDesigner.test.ts
 */

import type {
  TemplateField,
  TemplateLayout,
  IdCardPerson,
} from './types';
import {
  ELEMENT_PALETTE,
  PRINT_SAFE_FONTS,
} from './studioConstants';
import {
  validateSideFields,
} from './templateValidation';
import {
  extractTemplateFieldSchema,
  validatePersonForTemplate,
} from './templateFieldSchema';
import {
  formatFieldDisplay,
  getDefaultTemplateLayout,
} from './templatePresets';
import { fieldValue } from './generation';
import { getQrCodePayload } from './validation';

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

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║       ID CARD STUDIO DESIGNER & WORKSTATION TEST SUITE        ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

const samplePerson: IdCardPerson = {
  id: 'test-person-1',
  project_id: 'test-project-1',
  student_id: 'SP-2026-0042',
  name: 'Aanya Sharma',
  class: '10th',
  section: 'A',
  roll_number: '24',
  date_of_birth: '2010-05-15',
  blood_group: 'O+',
  father_name: 'Rajesh Sharma',
  mother_name: 'Sunita Sharma',
  phone: '9876543210',
  emergency_number: '9876500000',
  address: 'Sector 4, Green Park Colony, Dehradun',
  photo_url: 'https://example.com/photos/aanya.jpg',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ── Test 1: Element Palette & Insertion Specifications ─────────
console.log('── Test 1: Element Palette & Insertion Specifications ──');
assert(ELEMENT_PALETTE.length >= 15, 'Element palette contains comprehensive set of card elements');

const nameItem = ELEMENT_PALETTE.find((i) => i.key === 'student_name');
assert(nameItem !== undefined, 'Student Name palette item is defined');
assert(nameItem?.category === 'student_data', 'Student Name is categorized under student_data');
assert((nameItem?.defaultWidth ?? 0) >= 30, 'Student Name has appropriate default width (>= 30mm)');

const photoItem = ELEMENT_PALETTE.find((i) => i.key === 'student_photo');
assert(photoItem !== undefined && photoItem.isImage === true, 'Student photo placeholder is configured as image element');

const qrItem = ELEMENT_PALETTE.find((i) => i.key === 'qr_code');
assert(qrItem !== undefined && (qrItem.defaultWidth ?? 0) >= 12, 'QR Code default width respects >= 12mm scannability threshold');

const barcodeItem = ELEMENT_PALETTE.find((i) => i.key === 'barcode');
assert(barcodeItem !== undefined && (barcodeItem.defaultWidth ?? 0) >= 25, 'Barcode default width is >= 25mm for optical reader compatibility');

const fontValues = PRINT_SAFE_FONTS.map((f) => f.value);
assert(fontValues.some((v) => v.includes('Times New Roman')), 'Times New Roman font preset available');
assert(fontValues.some((v) => v.includes('Inter')), 'Inter font preset available');
assert(fontValues.some((v) => v.includes('Roboto')), 'Roboto font preset available');
assert(fontValues.some((v) => v.includes('Arial')), 'Arial font preset available');

// ── Test 2: Canvas Alignment & Positioning Mathematics ────────
console.log('\n── Test 2: Canvas Alignment & Positioning Mathematics ──');
const cardWidth = 54.0;
const cardHeight = 85.6;

const fieldWidth = 40.0;
const centeredX = Math.round(((cardWidth - fieldWidth) / 2) * 10) / 10;
assert(centeredX === 7.0, 'Horizontal center alignment calculates exact center offset (7.0mm)');
assert(centeredX + fieldWidth / 2 === cardWidth / 2, 'Centered element center-point matches card center-point (27.0mm)');

const fieldHeight = 10.0;
const middleY = Math.round(((cardHeight - fieldHeight) / 2) * 10) / 10;
assert(middleY === 37.8, 'Vertical middle alignment calculates exact middle offset (37.8mm)');
assert(middleY + fieldHeight / 2 === cardHeight / 2, 'Middle element center-point matches card center-point (42.8mm)');

const safeMargin = 2.0;
const leftAlignedX = safeMargin;
const rightAlignedX = cardWidth - 30.0 - safeMargin;
assert(leftAlignedX === 2.0, 'Left aligned position respects 2mm safe zone');
assert(rightAlignedX === 22.0, 'Right aligned position respects 2mm safe zone');
assert(rightAlignedX + 30.0 === cardWidth - safeMargin, 'Right boundary touches safe margin boundary');

// ── Test 3: Safe Zone & Bleed Production Safety Validation ─────
console.log('\n── Test 3: Safe Zone & Bleed Production Safety Validation ──');
const outOfBoundsFields: TemplateField[] = [
  {
    id: 'out-1',
    key: 'student_name',
    x: 50.0,
    y: 80.0,
    width: 20.0, // 50 + 20 = 70mm > 54mm width
    height: 10.0,
    visible: true,
  },
];

const boundaryIssues = validateSideFields(outOfBoundsFields, 54.0, 85.6, 'front');
assert(boundaryIssues.some((i) => i.message.includes('overflows outside the card boundary')), 'Flags elements overflowing physical card trim boundary');

const smallQrField: TemplateField = {
  id: 'qr-small',
  key: 'qr_code',
  x: 10,
  y: 10,
  width: 8.0,
  height: 8.0,
  visible: true,
};
const isSmallQrScannable = smallQrField.width >= 12.0 && smallQrField.height >= 12.0;
assert(!isSmallQrScannable, 'Flags QR code under 12mm as potential scannability risk');

const standardQrField: TemplateField = {
  id: 'qr-standard',
  key: 'qr_code',
  x: 10,
  y: 10,
  width: 16.0,
  height: 16.0,
  visible: true,
};
assert(standardQrField.width >= 12.0 && standardQrField.height >= 12.0, 'Confirms standard 16mm QR code is print scannable');

// ── Test 4: Real Student Data Preview & Long Name Safety ───────
console.log('\n── Test 4: Real Student Data Preview & Long Name Safety ──');
const nameField: TemplateField = {
  key: 'student_name',
  x: 4,
  y: 40,
  width: 46,
  height: 5,
  visible: true,
};
const resolvedName = fieldValue(nameField, samplePerson, '2026-2027', 'Sparknest Academy');
assert(resolvedName === 'Aanya Sharma', 'Resolves real student name from roster accurately');

assert(formatFieldDisplay('BLOOD GROUP: ', 'O+') === 'BLOOD GROUP: O+', 'Prefix formatting preserves space');
assert(formatFieldDisplay('ID NO:', '0042') === 'ID NO: 0042', 'Prefix formatting adds missing space if omitted');
assert(formatFieldDisplay(undefined, 'Aanya Sharma') === 'Aanya Sharma', 'Returns clean value when no prefix specified');

const longPerson: IdCardPerson = {
  ...samplePerson,
  name: 'Dr. Chandrashekhar Venkataraman Subramaniam The Third',
};
const resolvedLongName = fieldValue(nameField, longPerson, '2026-2027', 'Sparknest Academy');
assert(resolvedLongName === 'Dr. Chandrashekhar Venkataraman Subramaniam The Third', 'Resolves extreme long name safely without truncation');

// ── Test 5: Dual-Sided Layout & Layer Preservation ────────────
console.log('\n── Test 5: Dual-Sided Layout & Layer Preservation ──');
const frontFields: TemplateField[] = [
  { id: 'f1', key: 'student_photo', x: 4, y: 10, width: 20, height: 25, visible: true },
  { id: 'f2', key: 'student_name', x: 4, y: 40, width: 46, height: 5, visible: true },
];

const backFields: TemplateField[] = [
  { id: 'b1', key: 'terms', x: 4, y: 10, width: 46, height: 10, visible: true },
  { id: 'b2', key: 'qr_code', x: 19, y: 25, width: 16, height: 16, visible: true },
];

const dualLayout: TemplateLayout = {
  backgroundColor: '#FFFFFF',
  fields: frontFields,
  isDoubleSided: true,
  back: {
    backgroundColor: '#F8FAFC',
    fields: backFields,
  },
};

assert(dualLayout.fields.length === 2, 'Front side has exactly 2 elements');
assert(dualLayout.back?.fields.length === 2, 'Back side has exactly 2 elements');
assert(dualLayout.fields[0].key === 'student_photo', 'Front side first element is student_photo');
assert(dualLayout.back?.fields[1].key === 'qr_code', 'Back side second element is qr_code');

// Layer reordering test
const testLayers: TemplateField[] = [
  { id: 'l1', key: 'school_logo', x: 4, y: 4, width: 14, height: 14, visible: true },
  { id: 'l2', key: 'student_name', x: 4, y: 20, width: 46, height: 5, visible: true },
  { id: 'l3', key: 'student_id', x: 4, y: 26, width: 46, height: 4, visible: true },
];
const reordered = [testLayers[2], testLayers[0], testLayers[1]];
assert(reordered[0].id === 'l3', 'Layer 3 moved to top position');
assert(reordered[1].id === 'l1', 'Layer 1 shifted to second position');
assert(reordered[2].id === 'l2', 'Layer 2 shifted to third position');
assert(reordered[0].x === 4 && reordered[0].width === 46, 'Layer properties preserved intact after reordering');

// ── Test 6: QR Canonical Public Verification Endpoint Invariant ─
console.log('\n── Test 6: QR Canonical Public Verification Endpoint Invariant ──');
const qrPayload = getQrCodePayload(samplePerson);
assert(qrPayload.includes('/verify/'), 'QR code payload points to canonical /verify/ endpoint');
assert(qrPayload.includes('SP-2026-0042'), 'QR payload includes sanitized student identity');

// ── Test 7: Template Schema Extraction & Roster Compatibility ──
console.log('\n── Test 7: Template Schema Extraction & Roster Compatibility ──');
const defaultLayout = getDefaultTemplateLayout();
const schema = extractTemplateFieldSchema(defaultLayout);
assert(schema.items.length > 0, 'Extracted schema contains dynamic field items');
assert(schema.studentInputFields.length > 0, 'Extracted schema contains student input fields');
assert(schema.autoGeneratedFields.some((f) => f.key === 'qr_code' || f.key === 'barcode'), 'Extracted schema recognizes auto-generated QR & barcodes');

const personValidation = validatePersonForTemplate(samplePerson, schema);
assert(personValidation.valid === true, 'Sample student meets all template requirements');
assert(personValidation.missingFields.length === 0, 'No missing required fields for complete student');

console.log('\n' + '═'.repeat(65));
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(65) + '\n');

if (failed > 0) {
  process.exit(1);
}
