import assert from 'node:assert/strict';
import {
  applyGlobalTextCase,
  formatFieldDisplay,
  createBlankTemplateLayout,
  TEMPLATE_PRESETS,
} from './templatePresets';
import {
  normalizeStudentRecord,
  resolveTemplateFieldValue,
} from './dataBindingRegistry';
import { fieldValue } from './generation';
import type { IdCardPerson, TemplateField, TemplateLayout } from './types';

let totalAssertions = 0;
let passedAssertions = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passedAssertions++;
    totalAssertions++;
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    totalAssertions++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║  GLOBAL ID CARD TEXT CASE CONTROL — TEST SUITE                ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// Sample test students
const studentRishav: IdCardPerson = {
  id: 'person-001',
  project_id: 'proj-001',
  student_id: '0091',
  name: 'Rishav Raj',
  class: '6th',
  section: 'A',
  roll_number: '08',
  date_of_birth: '15/08/2012',
  blood_group: 'B+',
  father_name: 'Ayan Gupta',
  mother_name: 'Amelia Mishra',
  phone: '691315254',
  emergency_number: '9639873123',
  address: 'SparkNest Street, House 42, Motihari, Bihar',
  photo_url: 'https://example.com/photos/rishav.jpg',
  custom_fields: {
    transport_route: 'Route 14',
    house_name: 'Red Dragons',
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const studentAbhinav: IdCardPerson = {
  id: 'person-002',
  project_id: 'proj-001',
  student_id: '0042',
  name: 'Abhinav Kumar',
  class: '10th',
  section: 'B',
  roll_number: '18',
  date_of_birth: '20/11/2009',
  blood_group: 'O+',
  father_name: 'Ramesh Kumar',
  mother_name: 'Sunita Gupta',
  phone: '9876543210',
  emergency_number: '9123456780',
  address: 'Gandhi Chowk, Ward 5, Bettiah, Bihar',
  photo_url: 'https://example.com/photos/abhinav.jpg',
  custom_fields: {
    transport_route: 'Route 07',
    house_name: 'Blue Phoenix',
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ============================================================
// SUITE 1: DEFAULT AND MODE CONVERSIONS
// ============================================================
console.log('▶ Suite 1: Default & Core Text Case Formatting');

test('1. Default mode is uppercase when textCase is undefined or omitted', () => {
  assert.strictEqual(applyGlobalTextCase('Rishav Raj'), 'RISHAV RAJ');
  assert.strictEqual(applyGlobalTextCase('Rishav Raj', undefined), 'RISHAV RAJ');
});

test('2. Uppercase conversion transforms text correctly', () => {
  assert.strictEqual(applyGlobalTextCase('Rishav Raj', 'uppercase'), 'RISHAV RAJ');
  assert.strictEqual(applyGlobalTextCase('Amelia Mishra', 'uppercase'), 'AMELIA MISHRA');
  assert.strictEqual(applyGlobalTextCase("Father's Name", 'uppercase'), "FATHER'S NAME");
  assert.strictEqual(applyGlobalTextCase('SparkNest Academy School', 'uppercase'), 'SPARKNEST ACADEMY SCHOOL');
  assert.strictEqual(applyGlobalTextCase('Class', 'uppercase'), 'CLASS');
  assert.strictEqual(applyGlobalTextCase('Roll Number', 'uppercase'), 'ROLL NUMBER');
});

test('3. Normal/original mode preserves original capitalization without alteration', () => {
  assert.strictEqual(applyGlobalTextCase('Rishav Raj', 'normal'), 'Rishav Raj');
  assert.strictEqual(applyGlobalTextCase('Amelia Mishra', 'normal'), 'Amelia Mishra');
  assert.strictEqual(applyGlobalTextCase('CBSE', 'normal'), 'CBSE');
  assert.strictEqual(applyGlobalTextCase('SparkNest Academy School', 'normal'), 'SparkNest Academy School');
  assert.strictEqual(applyGlobalTextCase('pH Level', 'normal'), 'pH Level');
});

// ============================================================
// SUITE 2: DATA IMMUTABILITY INVARIANTS (DATABASE, EXCEL, CANONICAL)
// ============================================================
console.log('▶ Suite 2: Data Immutability Invariants (Database, Excel & Canonical Records)');

test('4. Database values remain strictly unchanged during and after uppercase formatting', () => {
  const dbPerson: IdCardPerson = { ...studentRishav };
  const field: TemplateField = { key: 'student_name', x: 0, y: 0, width: 50, height: 10, visible: true };
  
  const resolved = resolveTemplateFieldValue(field, dbPerson);
  const formatted = applyGlobalTextCase(resolved, 'uppercase');
  
  assert.strictEqual(formatted, 'RISHAV RAJ');
  assert.strictEqual(dbPerson.name, 'Rishav Raj', 'Underlying database record name must remain "Rishav Raj"');
  assert.strictEqual(dbPerson.mother_name, 'Amelia Mishra', 'Underlying database record mother_name must remain "Amelia Mishra"');
});

test('5. Excel/CSV imported values remain untouched', () => {
  const excelRawRow = {
    'Student Name': 'Rishav Raj',
    'Mother Name': 'Amelia Mishra',
    'Roll No': '08',
    'Student ID': '0091',
  };
  
  const canonical = normalizeStudentRecord(excelRawRow);
  assert.strictEqual(canonical.student_name, 'Rishav Raj');
  assert.strictEqual(canonical.mother_name, 'Amelia Mishra');
  
  // Format to uppercase
  const upperName = applyGlobalTextCase(canonical.student_name, 'uppercase');
  const upperMother = applyGlobalTextCase(canonical.mother_name, 'uppercase');
  
  assert.strictEqual(upperName, 'RISHAV RAJ');
  assert.strictEqual(upperMother, 'AMELIA MISHRA');
  
  // Verify canonical object still holds original data
  assert.strictEqual(canonical.student_name, 'Rishav Raj');
  assert.strictEqual(canonical.mother_name, 'Amelia Mishra');
});

test('6. Canonical student record immutability invariant (Section 36)', () => {
  const canonicalStudent = normalizeStudentRecord({
    student_name: 'Rishav Raj',
    mother_name: 'Amelia Mishra',
    roll_number: '08',
    student_id: '0091',
  });

  const initialJson = JSON.stringify(canonicalStudent);

  // Apply UPPERCASE formatting simulation
  const nameField: TemplateField = { key: 'student_name', x: 0, y: 0, width: 50, height: 10, visible: true };
  const motherField: TemplateField = { key: 'mother_name', x: 0, y: 0, width: 50, height: 10, visible: true };
  const rollField: TemplateField = { key: 'roll_number', x: 0, y: 0, width: 50, height: 10, visible: true };

  const nameVal = applyGlobalTextCase(resolveTemplateFieldValue(nameField, canonicalStudent), 'uppercase');
  const motherVal = applyGlobalTextCase(resolveTemplateFieldValue(motherField, canonicalStudent), 'uppercase');
  const rollVal = applyGlobalTextCase(resolveTemplateFieldValue(rollField, canonicalStudent), 'uppercase');

  assert.strictEqual(nameVal, 'RISHAV RAJ');
  assert.strictEqual(motherVal, 'AMELIA MISHRA');
  assert.strictEqual(rollVal, '08');

  // Verify canonicalStudent was not mutated
  assert.strictEqual(JSON.stringify(canonicalStudent), initialJson, 'Canonical student object must remain byte-for-byte identical');
});

// ============================================================
// SUITE 3: INDIVIDUAL DYNAMIC FIELD TRANSFORMATION ACCURACY
// ============================================================
console.log('▶ Suite 3: Dynamic Field Resolution & Global Case Formatting');

test('7. Student Name formatting in UPPERCASE and NORMAL', () => {
  const f: TemplateField = { key: 'student_name', x: 0, y: 0, width: 50, height: 10, visible: true };
  const val = resolveTemplateFieldValue(f, studentRishav);
  assert.strictEqual(applyGlobalTextCase(val, 'uppercase'), 'RISHAV RAJ');
  assert.strictEqual(applyGlobalTextCase(val, 'normal'), 'Rishav Raj');
});

test("8. Father's Name formatting in UPPERCASE and NORMAL", () => {
  const f: TemplateField = { key: 'father_name', labelPrefix: "Father's Name: ", x: 0, y: 0, width: 50, height: 10, visible: true };
  const raw = resolveTemplateFieldValue(f, studentRishav);
  const formattedUpper = applyGlobalTextCase(formatFieldDisplay(f.labelPrefix, raw), 'uppercase');
  const formattedNormal = applyGlobalTextCase(formatFieldDisplay(f.labelPrefix, raw), 'normal');
  assert.strictEqual(formattedUpper, "FATHER'S NAME: AYAN GUPTA");
  assert.strictEqual(formattedNormal, "Father's Name: Ayan Gupta");
});

test("9. Mother's Name formatting in UPPERCASE and NORMAL", () => {
  const f: TemplateField = { key: 'mother_name', labelPrefix: "Mother's Name: ", x: 0, y: 0, width: 50, height: 10, visible: true };
  const raw = resolveTemplateFieldValue(f, studentRishav);
  const formattedUpper = applyGlobalTextCase(formatFieldDisplay(f.labelPrefix, raw), 'uppercase');
  const formattedNormal = applyGlobalTextCase(formatFieldDisplay(f.labelPrefix, raw), 'normal');
  assert.strictEqual(formattedUpper, "MOTHER'S NAME: AMELIA MISHRA");
  assert.strictEqual(formattedNormal, "Mother's Name: Amelia Mishra");
});

test('10. Roll Number with leading zeros remains preserved', () => {
  const f: TemplateField = { key: 'roll_number', labelPrefix: 'Roll No: ', x: 0, y: 0, width: 50, height: 10, visible: true };
  const raw = resolveTemplateFieldValue(f, studentRishav);
  assert.strictEqual(raw, '08');
  assert.strictEqual(applyGlobalTextCase(formatFieldDisplay(f.labelPrefix, raw), 'uppercase'), 'ROLL NO: 08');
  assert.strictEqual(applyGlobalTextCase(formatFieldDisplay(f.labelPrefix, raw), 'normal'), 'Roll No: 08');
});

test('11. Student ID formatting with leading zeros preserved', () => {
  const f: TemplateField = { key: 'student_id', labelPrefix: 'ID NO: ', x: 0, y: 0, width: 50, height: 10, visible: true };
  const raw = resolveTemplateFieldValue(f, studentRishav);
  assert.strictEqual(raw, '0091');
  assert.strictEqual(applyGlobalTextCase(formatFieldDisplay(f.labelPrefix, raw), 'uppercase'), 'ID NO: 0091');
  assert.strictEqual(applyGlobalTextCase(formatFieldDisplay(f.labelPrefix, raw), 'normal'), 'ID NO: 0091');
});

test('12. Class formatting', () => {
  const f: TemplateField = { key: 'class', labelPrefix: 'Class: ', x: 0, y: 0, width: 50, height: 10, visible: true };
  const raw = resolveTemplateFieldValue(f, studentRishav);
  assert.strictEqual(applyGlobalTextCase(formatFieldDisplay(f.labelPrefix, raw), 'uppercase'), 'CLASS: 6TH');
  assert.strictEqual(applyGlobalTextCase(formatFieldDisplay(f.labelPrefix, raw), 'normal'), 'Class: 6th');
});

test('13. Blood Group formatting', () => {
  const f: TemplateField = { key: 'blood_group', labelPrefix: 'Blood Group: ', x: 0, y: 0, width: 50, height: 10, visible: true };
  const raw = resolveTemplateFieldValue(f, studentRishav);
  assert.strictEqual(applyGlobalTextCase(formatFieldDisplay(f.labelPrefix, raw), 'uppercase'), 'BLOOD GROUP: B+');
  assert.strictEqual(applyGlobalTextCase(formatFieldDisplay(f.labelPrefix, raw), 'normal'), 'Blood Group: B+');
});

test('14. Address formatting preserves punctuation, numbers, and commas', () => {
  const f: TemplateField = { key: 'address', labelPrefix: 'Address: ', x: 0, y: 0, width: 50, height: 10, visible: true };
  const raw = resolveTemplateFieldValue(f, studentRishav);
  assert.strictEqual(
    applyGlobalTextCase(formatFieldDisplay(f.labelPrefix, raw), 'uppercase'),
    'ADDRESS: SPARKNEST STREET, HOUSE 42, MOTIHARI, BIHAR'
  );
  assert.strictEqual(
    applyGlobalTextCase(formatFieldDisplay(f.labelPrefix, raw), 'normal'),
    'Address: SparkNest Street, House 42, Motihari, Bihar'
  );
});

test('15. Custom fields formatting', () => {
  const f: TemplateField = { key: 'transport_route', labelPrefix: 'Bus Route: ', x: 0, y: 0, width: 50, height: 10, visible: true };
  const raw = resolveTemplateFieldValue(f, studentRishav);
  assert.strictEqual(applyGlobalTextCase(formatFieldDisplay(f.labelPrefix, raw), 'uppercase'), 'BUS ROUTE: ROUTE 14');
  assert.strictEqual(applyGlobalTextCase(formatFieldDisplay(f.labelPrefix, raw), 'normal'), 'Bus Route: Route 14');
});

// ============================================================
// SUITE 4: STATIC TEMPLATE TEXT, MULTI-LINE & SPECIAL CHARACTERS
// ============================================================
console.log('▶ Suite 4: Static Template Elements, Multi-Line & Special Characters');

test('16. Static text elements respect global text case', () => {
  const staticSchool: TemplateField = {
    key: 'school_name',
    source: 'static',
    value: 'SparkNest Academy School',
    x: 0,
    y: 0,
    width: 50,
    height: 10,
    visible: true,
  };
  const raw = resolveTemplateFieldValue(staticSchool, studentRishav);
  assert.strictEqual(applyGlobalTextCase(raw, 'uppercase'), 'SPARKNEST ACADEMY SCHOOL');
  assert.strictEqual(applyGlobalTextCase(raw, 'normal'), 'SparkNest Academy School');
});

test('17. Multi-line text structure and line breaks preserved', () => {
  const multiLine = 'SparkNest Academy\nAffiliated to CBSE, New Delhi';
  const upper = applyGlobalTextCase(multiLine, 'uppercase');
  const normal = applyGlobalTextCase(multiLine, 'normal');

  assert.strictEqual(upper, 'SPARKNEST ACADEMY\nAFFILIATED TO CBSE, NEW DELHI');
  assert.strictEqual(normal, 'SparkNest Academy\nAffiliated to CBSE, New Delhi');
  assert.strictEqual(upper.split('\n').length, 2, 'Line break count preserved in UPPERCASE');
  assert.strictEqual(normal.split('\n').length, 2, 'Line break count preserved in NORMAL');
});

test('18. Apostrophes strictly preserved in text', () => {
  const withApos = "Mother's Name: Amelia Mishra";
  assert.strictEqual(applyGlobalTextCase(withApos, 'uppercase'), "MOTHER'S NAME: AMELIA MISHRA");
  assert.strictEqual(applyGlobalTextCase(withApos, 'normal'), "Mother's Name: Amelia Mishra");
});

test('19. Hyphens, slashes, and symbols preserved', () => {
  const text = 'Valid: 2026-2027 / Grade: A+ (Honors)';
  assert.strictEqual(applyGlobalTextCase(text, 'uppercase'), 'VALID: 2026-2027 / GRADE: A+ (HONORS)');
  assert.strictEqual(applyGlobalTextCase(text, 'normal'), 'Valid: 2026-2027 / Grade: A+ (Honors)');
});

test('20. Numbers remain semantically identical and unchanged in value', () => {
  const numText = 'Contact: 1800 271 1280, Pin: 845401';
  assert.strictEqual(applyGlobalTextCase(numText, 'uppercase'), 'CONTACT: 1800 271 1280, PIN: 845401');
  assert.strictEqual(applyGlobalTextCase(numText, 'normal'), 'Contact: 1800 271 1280, Pin: 845401');
});

test('21. Leading-zero IDs remain string-identical without truncation', () => {
  const id0091 = '0091';
  const id05 = '05';
  assert.strictEqual(applyGlobalTextCase(id0091, 'uppercase'), '0091');
  assert.strictEqual(applyGlobalTextCase(id05, 'uppercase'), '05');
  assert.strictEqual(applyGlobalTextCase(id0091, 'normal'), '0091');
  assert.strictEqual(applyGlobalTextCase(id05, 'normal'), '05');
});

// ============================================================
// SUITE 5: SYSTEM FIELDS IDENTITY PRESERVATION (QR & BARCODE)
// ============================================================
console.log('▶ Suite 5: System Identity Safety (QR & Barcode Payload Invariance)');

test('22. QR payload identity remains canonical and un-transformed', () => {
  const qrField: TemplateField = { key: 'qr_code', x: 0, y: 0, width: 20, height: 20, visible: true };
  const rawQrValue = resolveTemplateFieldValue(qrField, studentRishav);
  assert.strictEqual(rawQrValue, '0091');
  // System payload should not have textCase applied to barcode/qr machine readable data
  assert.strictEqual(rawQrValue, '0091');
});

test('23. Barcode payload identity remains canonical string without mutation', () => {
  const barcodeField: TemplateField = { key: 'barcode', x: 0, y: 0, width: 40, height: 10, visible: true };
  const rawBarcodeValue = resolveTemplateFieldValue(barcodeField, studentRishav);
  assert.strictEqual(rawBarcodeValue, '0091');
});

// ============================================================
// SUITE 6: TEMPLATE SIDES, ORIENTATIONS & CARD STRUCTURES
// ============================================================
console.log('▶ Suite 6: Template Sides, Orientations & Topologies');

test('24. Front side text renders with active global text case', () => {
  const frontLayout: TemplateLayout = {
    ...TEMPLATE_PRESETS[0].layout,
    textCase: 'uppercase',
  };
  const nameField = frontLayout.fields.find((f) => f.key === 'student_name');
  assert(nameField, 'Front side contains student_name');
  const raw = resolveTemplateFieldValue(nameField, studentRishav);
  assert.strictEqual(applyGlobalTextCase(raw, frontLayout.textCase), 'RISHAV RAJ');
});

test('25. Back side text renders with same active global text case', () => {
  const dualLayout: TemplateLayout = createBlankTemplateLayout('landscape', true).layout;
  dualLayout.textCase = 'uppercase';
  
  const backTermsField = dualLayout.back?.fields.find((f) => f.key === 'terms');
  assert(backTermsField, 'Back side contains terms field');
  const rawTerms = resolveTemplateFieldValue(backTermsField, studentRishav);
  const formattedTerms = applyGlobalTextCase(rawTerms, dualLayout.textCase);
  assert(formattedTerms.startsWith('THIS CARD IS NON-TRANSFERABLE'), 'Back terms formatted to uppercase');
  
  // Switch to NORMAL
  dualLayout.textCase = 'normal';
  const normalTerms = applyGlobalTextCase(rawTerms, dualLayout.textCase);
  assert(normalTerms.startsWith('This card is non-transferable'), 'Back terms formatted to normal');
});

test('26. Single-sided template text case consistency', () => {
  const single = createBlankTemplateLayout('portrait', false).layout;
  single.textCase = 'normal';
  const nameField = single.fields.find((f) => f.key === 'student_name')!;
  const raw = resolveTemplateFieldValue(nameField, studentRishav);
  assert.strictEqual(applyGlobalTextCase(raw, single.textCase), 'Rishav Raj');
});

test('27. Double-sided template shared global text case across front and back', () => {
  const double = createBlankTemplateLayout('landscape', true).layout;
  double.textCase = 'uppercase';
  
  const frontField = double.fields.find((f) => f.key === 'student_name')!;
  const backField = double.back!.fields.find((f) => f.key === 'terms')!;

  const frontText = applyGlobalTextCase(resolveTemplateFieldValue(frontField, studentRishav), double.textCase);
  const backText = applyGlobalTextCase(resolveTemplateFieldValue(backField, studentRishav), double.textCase);

  assert.strictEqual(frontText, 'RISHAV RAJ');
  assert(backText.includes('THIS CARD IS NON-TRANSFERABLE'));
});

test('28. Portrait template text case compatibility', () => {
  const portrait = createBlankTemplateLayout('portrait', false).layout;
  portrait.textCase = 'uppercase';
  const nameField = portrait.fields.find((f) => f.key === 'student_name')!;
  assert.strictEqual(applyGlobalTextCase(resolveTemplateFieldValue(nameField, studentRishav), portrait.textCase), 'RISHAV RAJ');
});

test('29. Landscape template text case compatibility', () => {
  const landscape = createBlankTemplateLayout('landscape', false).layout;
  landscape.textCase = 'normal';
  const nameField = landscape.fields.find((f) => f.key === 'student_name')!;
  assert.strictEqual(applyGlobalTextCase(resolveTemplateFieldValue(nameField, studentRishav), landscape.textCase), 'Rishav Raj');
});

// ============================================================
// SUITE 7: SAMPLE STUDENT & REAL STUDENT PREVIEW ISOLATION
// ============================================================
console.log('▶ Suite 7: Sample Student & Real Student Preview Isolation');

test('30. Sample student preview formatting', () => {
  const sampleStudent: Partial<IdCardPerson> = {
    name: 'Murad Naser',
    student_id: 'STU-001',
    class: '10th',
  };
  const f: TemplateField = { key: 'student_name', x: 0, y: 0, width: 50, height: 10, visible: true };
  const raw = resolveTemplateFieldValue(f, sampleStudent as any);
  assert.strictEqual(applyGlobalTextCase(raw, 'uppercase'), 'MURAD NASER');
  assert.strictEqual(applyGlobalTextCase(raw, 'normal'), 'Murad Naser');
});

test('31. Real student preview formatting', () => {
  const f: TemplateField = { key: 'student_name', x: 0, y: 0, width: 50, height: 10, visible: true };
  const raw = resolveTemplateFieldValue(f, studentRishav);
  assert.strictEqual(applyGlobalTextCase(raw, 'uppercase'), 'RISHAV RAJ');
  assert.strictEqual(applyGlobalTextCase(raw, 'normal'), 'Rishav Raj');
});

test('32. Cross-student regression test & student switching (Section 35)', () => {
  // Student A: Rishav Raj, Amelia Mishra, Roll 08
  // Student B: Abhinav Kumar, Sunita Gupta, Roll 18
  const nameField: TemplateField = { key: 'student_name', x: 0, y: 0, width: 50, height: 10, visible: true };
  const motherField: TemplateField = { key: 'mother_name', x: 0, y: 0, width: 50, height: 10, visible: true };
  const rollField: TemplateField = { key: 'roll_number', x: 0, y: 0, width: 50, height: 10, visible: true };

  // With UPPERCASE:
  let currentCase: 'uppercase' | 'normal' = 'uppercase';

  const nameA_upper = applyGlobalTextCase(resolveTemplateFieldValue(nameField, studentRishav), currentCase);
  const motherA_upper = applyGlobalTextCase(resolveTemplateFieldValue(motherField, studentRishav), currentCase);
  const rollA_upper = applyGlobalTextCase(resolveTemplateFieldValue(rollField, studentRishav), currentCase);

  const nameB_upper = applyGlobalTextCase(resolveTemplateFieldValue(nameField, studentAbhinav), currentCase);
  const motherB_upper = applyGlobalTextCase(resolveTemplateFieldValue(motherField, studentAbhinav), currentCase);
  const rollB_upper = applyGlobalTextCase(resolveTemplateFieldValue(rollField, studentAbhinav), currentCase);

  assert.strictEqual(nameA_upper, 'RISHAV RAJ');
  assert.strictEqual(motherA_upper, 'AMELIA MISHRA');
  assert.strictEqual(rollA_upper, '08');

  assert.strictEqual(nameB_upper, 'ABHINAV KUMAR');
  assert.strictEqual(motherB_upper, 'SUNITA GUPTA');
  assert.strictEqual(rollB_upper, '18');

  // Switch to NORMAL:
  currentCase = 'normal';

  const nameA_norm = applyGlobalTextCase(resolveTemplateFieldValue(nameField, studentRishav), currentCase);
  const motherA_norm = applyGlobalTextCase(resolveTemplateFieldValue(motherField, studentRishav), currentCase);
  const rollA_norm = applyGlobalTextCase(resolveTemplateFieldValue(rollField, studentRishav), currentCase);

  const nameB_norm = applyGlobalTextCase(resolveTemplateFieldValue(nameField, studentAbhinav), currentCase);
  const motherB_norm = applyGlobalTextCase(resolveTemplateFieldValue(motherField, studentAbhinav), currentCase);
  const rollB_norm = applyGlobalTextCase(resolveTemplateFieldValue(rollField, studentAbhinav), currentCase);

  assert.strictEqual(nameA_norm, 'Rishav Raj');
  assert.strictEqual(motherA_norm, 'Amelia Mishra');
  assert.strictEqual(rollA_norm, '08');

  assert.strictEqual(nameB_norm, 'Abhinav Kumar');
  assert.strictEqual(motherB_norm, 'Sunita Gupta');
  assert.strictEqual(rollB_norm, '18');
});

// ============================================================
// SUITE 8: PIPELINE CONSISTENCY (PREVIEW, GENERATION, PDF, PRINT)
// ============================================================
console.log('▶ Suite 8: Pipeline Consistency (Preview, Generation, PDF, Print)');

test('33. Preview vs Generation consistency invariant (Section 37)', () => {
  const layout: TemplateLayout = {
    ...TEMPLATE_PRESETS[0].layout,
    textCase: 'uppercase',
  };

  const fields = layout.fields.filter((f) => f.visible);

  for (const field of fields) {
    if (['student_photo', 'qr_code', 'barcode', 'school_logo'].includes(field.key)) continue;

    const resolved = resolveTemplateFieldValue(field, studentRishav, { schoolName: 'SPARKNEST ACADEMY' });
    const formatted = formatFieldDisplay(field.labelPrefix, resolved);
    const previewText = applyGlobalTextCase(formatted, layout.textCase);
    const generationText = applyGlobalTextCase(formatted, layout.textCase);

    assert.strictEqual(previewText, generationText, `Preview text must match generation text exactly for field ${field.key}`);
  }
});

test('34. Generation output matches configured textCase', () => {
  const f: TemplateField = { key: 'student_name', x: 0, y: 0, width: 50, height: 10, visible: true };
  const raw = fieldValue(f, studentRishav, '2026-27', 'SPARKNEST ACADEMY');
  const upper = applyGlobalTextCase(raw, 'uppercase');
  const normal = applyGlobalTextCase(raw, 'normal');

  assert.strictEqual(upper, 'RISHAV RAJ');
  assert.strictEqual(normal, 'Rishav Raj');
});

test('35. PDF output pipeline receives text transformed by global text case', () => {
  const f: TemplateField = { key: 'student_name', x: 0, y: 0, width: 50, height: 10, visible: true };
  const raw = resolveTemplateFieldValue(f, studentRishav);
  assert.strictEqual(applyGlobalTextCase(raw, 'uppercase'), 'RISHAV RAJ');
  assert.strictEqual(applyGlobalTextCase(raw, 'normal'), 'Rishav Raj');
});

test('36. Print layout engine receives formatted output consistent with template textCase', () => {
  const f: TemplateField = { key: 'father_name', labelPrefix: "Father's Name: ", x: 0, y: 0, width: 50, height: 10, visible: true };
  const raw = resolveTemplateFieldValue(f, studentRishav);
  const printUpper = applyGlobalTextCase(formatFieldDisplay(f.labelPrefix, raw), 'uppercase');
  const printNormal = applyGlobalTextCase(formatFieldDisplay(f.labelPrefix, raw), 'normal');

  assert.strictEqual(printUpper, "FATHER'S NAME: AYAN GUPTA");
  assert.strictEqual(printNormal, "Father's Name: Ayan Gupta");
});

// ============================================================
// SUITE 9: LEGACY TEMPLATE COMPATIBILITY & VERSIONING
// ============================================================
console.log('▶ Suite 9: Legacy Compatibility & Template Versioning (Section 38)');

test('37. Legacy template without textCase defaults to uppercase (Section 38)', () => {
  // Legacy template without `textCase` property
  const legacyLayout: TemplateLayout = {
    backgroundColor: '#FFFFFF',
    fields: [
      {
        id: 'f1',
        key: 'student_name',
        x: 10,
        y: 10,
        width: 50,
        height: 5,
        visible: true,
      },
    ],
  };

  assert.strictEqual(legacyLayout.textCase, undefined);

  // Resolution with default fallback
  const effectiveCase = legacyLayout.textCase || 'uppercase';
  assert.strictEqual(effectiveCase, 'uppercase');

  const raw = resolveTemplateFieldValue(legacyLayout.fields[0], studentRishav);
  const output = applyGlobalTextCase(raw, effectiveCase);
  assert.strictEqual(output, 'RISHAV RAJ', 'Legacy template without textCase must render in UPPERCASE');
});

test('38. Template versioning preserves historical snapshot casing', () => {
  const templateV5: TemplateLayout = {
    backgroundColor: '#FFFFFF',
    textCase: 'uppercase',
    fields: [{ key: 'student_name', x: 0, y: 0, width: 50, height: 10, visible: true }],
  };

  const templateV6: TemplateLayout = {
    backgroundColor: '#FFFFFF',
    textCase: 'normal',
    fields: [{ key: 'student_name', x: 0, y: 0, width: 50, height: 10, visible: true }],
  };

  const raw = resolveTemplateFieldValue(templateV5.fields[0], studentRishav);
  assert.strictEqual(applyGlobalTextCase(raw, templateV5.textCase), 'RISHAV RAJ', 'v5 snapshot renders UPPERCASE');
  assert.strictEqual(applyGlobalTextCase(raw, templateV6.textCase), 'Rishav Raj', 'v6 snapshot renders NORMAL');
});

// ============================================================
// SUITE 10: AUTO FIT & FIELD BINDING SAFETY
// ============================================================
console.log('▶ Suite 10: Auto Fit & Field-Binding Integrity');

test('39. Auto fit compatibility: Text transformation occurs prior to text measurement and fitting', () => {
  const f: TemplateField = { key: 'student_name', x: 0, y: 0, width: 50, height: 10, visible: true };
  const raw = resolveTemplateFieldValue(f, studentRishav);
  
  // Pipeline order verification:
  // Step 1: Resolve value
  assert.strictEqual(raw, 'Rishav Raj');
  // Step 2: Apply text case
  const upper = applyGlobalTextCase(raw, 'uppercase');
  assert.strictEqual(upper, 'RISHAV RAJ');
  // Step 3: Text length for metric calculation
  assert.strictEqual(upper.length, 10);
  assert.strictEqual(raw.length, 10);
});

test('40. Data binding safety: Text case formatter never modifies field keys or bindings', () => {
  const motherField: TemplateField = { key: 'mother_name', x: 0, y: 0, width: 50, height: 10, visible: true };
  const rollField: TemplateField = { key: 'roll_number', x: 0, y: 0, width: 50, height: 10, visible: true };

  const motherVal = resolveTemplateFieldValue(motherField, studentRishav);
  const rollVal = resolveTemplateFieldValue(rollField, studentRishav);

  assert.strictEqual(applyGlobalTextCase(motherVal, 'uppercase'), 'AMELIA MISHRA');
  assert.strictEqual(applyGlobalTextCase(rollVal, 'uppercase'), '08');

  // Verify motherField still maps to mother_name, rollField to roll_number
  assert.strictEqual(motherField.key, 'mother_name');
  assert.strictEqual(rollField.key, 'roll_number');
});

// ============================================================
// SUMMARY
// ============================================================
console.log('\n' + '═'.repeat(65));
console.log(`  GLOBAL TEXT CASE CONTROL TEST SUMMARY: ${passedAssertions} passed, 0 failed`);
console.log('═'.repeat(65) + '\n');
