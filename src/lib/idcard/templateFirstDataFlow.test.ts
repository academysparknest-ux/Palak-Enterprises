/**
 * Comprehensive Test Suite: Template-First ID Card Data Architecture
 *
 * Validates:
 * 1. Template is the single source of truth for field requirements.
 * 2. Automatic field detection & schema extraction (deduplicated, categorized).
 * 3. Proper categorization:
 *    - student_input: Name, ID, Class, Roll, Blood Group, Father Name, etc.
 *    - student_asset: Photo (student_photo)
 *    - auto_generated: QR Code, Barcode (NEVER manual inputs in form or Excel)
 *    - static: School Name, Subtitle, Academic Year, etc.
 * 4. Add Student form dynamic field derivation (no unnecessary fields shown).
 * 5. Template-specific Sample Excel / CSV generation (Template A vs Template B).
 * 6. Excel import validation against template requirements.
 * 7. Graceful ignoring of extra unnecessary spreadsheet columns without failing import.
 * 8. Non-destructive template modifications (adding/removing fields preserves database data).
 * 9. Multi-project isolation with independent template schemas.
 * 10. Single unified validation for Preview & Generation.
 *
 * Run: npx tsx src/lib/idcard/templateFirstDataFlow.test.ts
 */

import type { IdCardPerson, IdCardTemplate, TemplateLayout } from './types';
import {
  extractTemplateFieldSchema,
  validatePersonForTemplate,
  detectTemplateSchemaDiff,
} from './templateFieldSchema';
import {
  generateSampleCsv,
  getTemplateSampleData,
  parseAndValidateCsv,
  getFullRosterSampleData,
  mapHeaderToCanonical,
} from './csvImport';
import { normalizeDate, normalizeBloodGroup } from './validation';
import { validateBatchBeforeGeneration } from './templateValidation';

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

console.log('\n── Template-First ID Card Data Architecture Verification ──\n');

// ── Test 1: Template Field Schema Extraction (Template A) ──
console.log('1. Template Field Schema Extraction — Template A (Name, ID, Photo, Class, Roll Number)');

const templateA_layout: TemplateLayout = {
  backgroundColor: '#FFFFFF',
  fields: [
    { key: 'school_name', x: 10, y: 10, width: 40, height: 6, visible: true },
    { key: 'student_name', x: 10, y: 20, width: 40, height: 5, visible: true },
    { key: 'student_id', x: 10, y: 26, width: 40, height: 5, visible: true },
    { key: 'student_photo', x: 15, y: 32, width: 25, height: 30, visible: true },
    { key: 'class', x: 10, y: 64, width: 20, height: 5, visible: true },
    { key: 'roll_number', x: 32, y: 64, width: 20, height: 5, visible: true },
    // Duplicate invisible element should be ignored
    { key: 'father_name', x: 10, y: 70, width: 40, height: 5, visible: false },
  ],
};

const schemaA = extractTemplateFieldSchema(templateA_layout);

assert(schemaA.studentInputFields.some((f) => f.key === 'student_name'), 'Schema includes student_name');
assert(schemaA.studentInputFields.some((f) => f.key === 'student_id'), 'Schema includes student_id');
assert(schemaA.studentInputFields.some((f) => f.key === 'class'), 'Schema includes class');
assert(schemaA.studentInputFields.some((f) => f.key === 'roll_number'), 'Schema includes roll_number');
assert(schemaA.assetFields.some((f) => f.key === 'student_photo'), 'Schema includes student_photo in assetFields');
assert(!schemaA.studentInputFields.some((f) => f.key === 'father_name'), 'Invisible father_name is NOT in schema');
assert(!schemaA.studentInputFields.some((f) => f.key === 'mother_name'), 'Mother name is NOT in schema');
assert(!schemaA.studentInputFields.some((f) => f.key === 'date_of_birth'), 'Date of birth is NOT in schema');
assert(!schemaA.studentInputFields.some((f) => f.key === 'address'), 'Address is NOT in schema');
assert(schemaA.staticFields.some((f) => f.key === 'school_name'), 'School name is categorized as static');

// ── Test 2: Template B with QR Code & Barcode (Auto-Generated Categorization) ──
console.log('\n2. Auto-Generated Categorization — Template B (QR Code, Barcode, Father Name, DOB, Address)');

const templateB_layout: TemplateLayout = {
  backgroundColor: '#FFFFFF',
  isDoubleSided: true,
  fields: [
    { key: 'student_name', x: 10, y: 15, width: 40, height: 5, visible: true },
    { key: 'student_photo', x: 15, y: 22, width: 25, height: 30, visible: true },
    { key: 'father_name', x: 10, y: 55, width: 40, height: 5, visible: true, required: true },
    { key: 'date_of_birth', x: 10, y: 62, width: 40, height: 5, visible: true },
    { key: 'qr_code', x: 15, y: 70, width: 15, height: 15, visible: true },
  ],
  back: {
    backgroundColor: '#FFFFFF',
    fields: [
      { key: 'address', x: 10, y: 10, width: 40, height: 10, visible: true },
      { key: 'barcode', x: 10, y: 25, width: 35, height: 6, visible: true },
      { key: 'terms', x: 5, y: 35, width: 45, height: 10, visible: true },
    ],
  },
};

const schemaB = extractTemplateFieldSchema(templateB_layout);

assert(schemaB.studentInputFields.some((f) => f.key === 'student_name'), 'Template B includes student_name');
assert(schemaB.studentInputFields.some((f) => f.key === 'father_name'), 'Template B includes father_name');
assert(schemaB.studentInputFields.some((f) => f.key === 'date_of_birth'), 'Template B includes date_of_birth');
assert(schemaB.studentInputFields.some((f) => f.key === 'address'), 'Template B includes address from back side');
assert(schemaB.assetFields.some((f) => f.key === 'student_photo'), 'Template B includes student_photo');
assert(schemaB.autoGeneratedFields.some((f) => f.key === 'qr_code'), 'QR Code is categorized as auto_generated');
assert(schemaB.autoGeneratedFields.some((f) => f.key === 'barcode'), 'Barcode is categorized as auto_generated');
assert(!schemaB.studentInputFields.some((f) => f.key === 'qr_code'), 'QR Code is NOT in studentInputFields');
assert(!schemaB.studentInputFields.some((f) => f.key === 'barcode'), 'Barcode is NOT in studentInputFields');

// ── Test 3: Template-Specific Sample Excel / CSV Generation ──
console.log('\n3. Template-Specific Sample CSV & Excel Data Generation');

const sampleDataA = getTemplateSampleData(templateA_layout);
assert(sampleDataA.headers.includes('Student Name'), 'Template A sample includes Student Name');
assert(sampleDataA.headers.includes('Student ID'), 'Template A sample includes Student ID');
assert(sampleDataA.headers.includes('Class'), 'Template A sample includes Class');
assert(sampleDataA.headers.includes('Roll Number'), 'Template A sample includes Roll Number');
assert(!sampleDataA.headers.includes("Father's Name"), 'Template A sample does NOT include Father Name');
assert(!sampleDataA.headers.includes('Address'), 'Template A sample does NOT include Address');

const sampleDataB = getTemplateSampleData(templateB_layout);
assert(sampleDataB.headers.includes('Student Name'), 'Template B sample includes Student Name');
assert(sampleDataB.headers.includes("Father's Name"), "Template B sample includes Father's Name");
assert(sampleDataB.headers.includes('Date of Birth'), 'Template B sample includes Date of Birth');
assert(sampleDataB.headers.includes('Address'), 'Template B sample includes Address');
assert(!sampleDataB.headers.includes('QR Code'), 'Template B sample NEVER includes auto-generated QR Code');
assert(!sampleDataB.headers.includes('Barcode'), 'Template B sample NEVER includes auto-generated Barcode');

const sampleCsvA = generateSampleCsv(templateA_layout);
assert(sampleCsvA.startsWith('Student Name,Student ID,Class,Roll Number'), 'Sample CSV A has exact headers');

// ── Test 4: Excel Import Validation Against Template Schema ──
console.log('\n4. Excel Import Validation Against Template Schema');

// CSV missing required template field 'class' and 'roll_number'
const incompleteCsv = `Student ID,Name,Photo\n0001,John Doe,0001.jpg`;
const importResultMissing = parseAndValidateCsv(incompleteCsv, templateA_layout);
assert(importResultMissing.missingHeaders.includes('Class'), 'Flags missing required column: Class');
assert(importResultMissing.missingHeaders.includes('Roll Number'), 'Flags missing required column: Roll Number');

// CSV matching Template A
const completeCsvA = `Student ID,Name,Class,Roll Number,Photo\n0001,John Doe,8th,1,0001.jpg\n0002,Jane Smith,8th,2,0002.jpg`;
const importResultA = parseAndValidateCsv(completeCsvA, templateA_layout);
assert(importResultA.missingHeaders.length === 0, 'No missing headers for complete CSV matching Template A');
assert(importResultA.validCount === 2, '2 / 2 rows valid for Template A');

// ── Test 5: Ignore Unnecessary Excel Columns Gracefully ──
console.log('\n5. Ignoring Unnecessary Excel Columns');

const csvWithExtraColumns = `Student ID,Name,Class,Roll Number,Photo,Father Name,Mother Name,Address,Blood Group\n0001,John Doe,8th,1,0001.jpg,Robert Doe,Mary Doe,123 Main St,O+\n0002,Jane Smith,8th,2,0002.jpg,David Smith,Sarah Smith,456 Oak St,B+`;
const importResultExtra = parseAndValidateCsv(csvWithExtraColumns, templateA_layout);

assert(importResultExtra.missingHeaders.length === 0, 'Import succeeds without failing on extra columns');
assert(importResultExtra.validCount === 2, '2 / 2 rows imported successfully');
assert(importResultExtra.ignoredHeaders.length > 0, 'Ignored headers reported');
assert(
  importResultExtra.ignoredHeaders.some((h) => h.toLowerCase().includes('father')),
  'Father Name header identified as ignored'
);
assert(
  importResultExtra.ignoredHeaders.some((h) => h.toLowerCase().includes('address')),
  'Address header identified as ignored'
);

// ── Test 6: Non-Destructive Template Schema Evolution ──
console.log('\n6. Non-Destructive Template Schema Evolution (Adding & Removing Fields)');

const studentInDb: IdCardPerson = {
  id: 'person-1',
  project_id: 'proj-1',
  student_id: '0001',
  name: 'John Doe',
  class: '8th',
  section: 'A',
  roll_number: '10',
  date_of_birth: '2012-05-15',
  blood_group: 'B+',
  father_name: 'Robert Doe',
  mother_name: 'Mary Doe',
  phone: '9876543210',
  address: 'Motihari, Bihar',
  photo_url: '0001.jpg',
  created_at: '2026-08-27T00:00:00.000Z',
  updated_at: '2026-08-27T00:00:00.000Z',
};

// 6A: Check student against Template A
const validationA = validatePersonForTemplate(studentInDb, templateA_layout);
assert(validationA.valid, 'Student is valid for Template A');

// 6B: Evolve template by adding emergency_no or a new required field
const templateA_evolved: TemplateLayout = {
  ...templateA_layout,
  fields: [
    ...templateA_layout.fields,
    { key: 'phone', x: 10, y: 75, width: 40, height: 5, visible: true },
  ],
};

const diff = detectTemplateSchemaDiff(templateA_layout, templateA_evolved);
assert(diff.addedRequiredFields.length === 0, 'No new required fields added (phone is optional)');

// 6C: Incomplete student check
const incompleteStudent: Partial<IdCardPerson> = {
  student_id: '0002',
  name: 'Jane Smith',
  // missing class and roll_number
};
const validationIncomplete = validatePersonForTemplate(incompleteStudent, templateA_layout);
assert(!validationIncomplete.valid, 'Incomplete student is flagged as invalid');
assert(validationIncomplete.missingFields.includes('Class'), 'Identifies missing Class');
assert(validationIncomplete.missingFields.includes('Roll Number'), 'Identifies missing Roll Number');

// ── Test 7: Multi-Project Isolation ──
console.log('\n7. Multi-Project Template Schema Isolation');

const proj1_template: IdCardTemplate = {
  id: 'tmpl-p1',
  project_id: 'proj-1',
  name: 'Project 1 Template',
  card_width_mm: 54,
  card_height_mm: 85.6,
  background_url: null,
  created_by: 'admin',
  created_at: '2026-08-27T00:00:00.000Z',
  updated_at: '2026-08-27T00:00:00.000Z',
  layout: templateA_layout,
};

const proj2_template: IdCardTemplate = {
  id: 'tmpl-p2',
  project_id: 'proj-2',
  name: 'Project 2 Template',
  card_width_mm: 54,
  card_height_mm: 85.6,
  background_url: null,
  created_by: 'admin',
  created_at: '2026-08-27T00:00:00.000Z',
  updated_at: '2026-08-27T00:00:00.000Z',
  layout: templateB_layout,
};

const studentProj1: IdCardPerson = {
  ...studentInDb,
  project_id: 'proj-1',
  father_name: null, // Project 1 does not require father_name
  date_of_birth: null,
  address: null,
};

const valP1 = validatePersonForTemplate(studentProj1, proj1_template);
assert(valP1.valid, 'Student without father_name is VALID for Project 1');

// But same student without father_name is INVALID for Project 2 which requires father_name
const valP2 = validatePersonForTemplate(studentProj1, proj2_template);
assert(!valP2.valid, 'Student without father_name is INVALID for Project 2');
assert(valP2.missingFields.includes("Father's Name"), 'Project 2 correctly reports missing Father Name');

// ── Test 8: Unified Batch Validation for Generation ──
console.log('\n8. Unified Batch Validation for Card Generation');

const batchValidation = validateBatchBeforeGeneration([studentInDb], proj1_template);
assert(batchValidation.valid, 'Valid student passes batch generation validation');
assert(batchValidation.errors.length === 0, 'No errors for complete student record');

const invalidBatchResult = validateBatchBeforeGeneration(
  [incompleteStudent as IdCardPerson],
  proj1_template
);
assert(!invalidBatchResult.valid, 'Batch validation catches missing student fields');
assert(
  invalidBatchResult.errors.some((e) => e.includes('Class')),
  'Batch validation error explicitly cites missing Class'
);

// ── Test 9: Back Side Details Extraction & Side Detection ──
console.log('\n9. Back Side Details Extraction & Side Detection');

const nameField = schemaB.studentInputFields.find((f) => f.key === 'student_name');
const fatherField = schemaB.studentInputFields.find((f) => f.key === 'father_name');
const dobField = schemaB.studentInputFields.find((f) => f.key === 'date_of_birth');
const addressField = schemaB.studentInputFields.find((f) => f.key === 'address');

assert(nameField?.side === 'front', 'Name is identified as Front Side element');
assert(fatherField?.side === 'front', 'Father Name is identified as Front Side element on Template B');
assert(dobField?.side === 'front', 'DOB is identified as Front Side element on Template B');
assert(addressField?.side === 'back', 'Address is identified as Back Side element on Template B');

// ── Test 10: Comprehensive Header Alias Mapping for Back Side Fields ──
console.log('\n10. Comprehensive Header Alias Mapping for Back Side Fields');

assert(mapHeaderToCanonical("Father's Name") === 'father_name', 'Maps "Father\'s Name" -> father_name');
assert(mapHeaderToCanonical('Guardian Name') === 'father_name', 'Maps "Guardian Name" -> father_name');
assert(mapHeaderToCanonical("Mother's Name") === 'mother_name', 'Maps "Mother\'s Name" -> mother_name');
assert(mapHeaderToCanonical('Residential Address') === 'address', 'Maps "Residential Address" -> address');
assert(mapHeaderToCanonical('Permanent Address') === 'address', 'Maps "Permanent Address" -> address');
assert(mapHeaderToCanonical('DOB') === 'date_of_birth', 'Maps "DOB" -> date_of_birth');
assert(mapHeaderToCanonical('Blood Group') === 'blood_group', 'Maps "Blood Group" -> blood_group');
assert(mapHeaderToCanonical('Emergency No') === 'emergency_number', 'Maps "Emergency No" -> emergency_number');
assert(mapHeaderToCanonical('Mobile Number') === 'phone', 'Maps "Mobile Number" -> phone');

// ── Test 11: Normalization of Date & Blood Group (Excel Serial, Dots, Slashing) ──
console.log('\n11. Normalization of Date & Blood Group');

assert(normalizeDate('44561') === '2021-12-31', 'Normalizes Excel numeric serial date 44561 -> 2021-12-31');
assert(normalizeDate('44562') === '2022-01-01', 'Normalizes Excel numeric serial date 44562 -> 2022-01-01');
assert(normalizeDate('15.05.2010') === '2010-05-15', 'Normalizes dot-separated date 15.05.2010 -> 2010-05-15');
assert(normalizeDate('2010/05/15') === '2010-05-15', 'Normalizes slash-separated date 2010/05/15 -> 2010-05-15');
assert(normalizeBloodGroup('b positive') === 'B+', 'Normalizes "b positive" -> "B+"');
assert(normalizeBloodGroup('o negative') === 'O-', 'Normalizes "o negative" -> "O-"');
assert(normalizeBloodGroup('AB POS') === 'AB+', 'Normalizes "AB POS" -> "AB+"');

const fullRoster = getFullRosterSampleData();
assert(fullRoster.headers.includes("Father's Name"), 'Full roster sample includes Father\'s Name');
assert(fullRoster.headers.includes("Mother's Name"), 'Full roster sample includes Mother\'s Name');
assert(fullRoster.headers.includes('Date of Birth'), 'Full roster sample includes Date of Birth');
assert(fullRoster.headers.includes('Blood Group'), 'Full roster sample includes Blood Group');
assert(fullRoster.headers.includes('Address'), 'Full roster sample includes Address');
assert(fullRoster.rows.length === 3, 'Full roster sample has 3 complete student rows');

console.log(`\n${'═'.repeat(55)}`);
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log(`${'═'.repeat(55)}\n`);

if (failed > 0) process.exit(1);

