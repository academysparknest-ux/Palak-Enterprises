import assert from 'node:assert/strict';
import {
  CANONICAL_FIELD_REGISTRY,
  normalizeHeader,
  normalizeStudentRecord,
  resolveTemplateFieldValue,
  validateBatchDataBindings,
  type CanonicalStudent,
} from './dataBindingRegistry';
import { parseAndValidateCsv } from './csvImport';
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
console.log('║  ID CARD CANONICAL DATA-BINDING & INTEGRITY TEST SUITE        ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// ============================================================
// SUITE 1: CANONICAL FIELD REGISTRY COMPLETENESS
// ============================================================
console.log('▶ Suite 1: Canonical Field Registry & Definitions');

test('Registry defines all 24 required canonical fields with metadata', () => {
  const expectedKeys = [
    'student_name',
    'student_id',
    'class',
    'section',
    'roll_number',
    'blood_group',
    'father_name',
    'mother_name',
    'date_of_birth',
    'phone',
    'emergency_no',
    'address',
    'photo_url',
    'valid_till',
    'batch',
    'designation',
    'qr_code',
    'barcode',
    'school_logo',
    'school_name',
    'school_subtitle',
    'academic_year',
    'terms',
    'website',
    'custom_text',
  ];

  for (const key of expectedKeys) {
    assert(CANONICAL_FIELD_REGISTRY[key as keyof typeof CANONICAL_FIELD_REGISTRY], `Missing registry entry for ${key}`);
    const def = CANONICAL_FIELD_REGISTRY[key as keyof typeof CANONICAL_FIELD_REGISTRY];
    assert.equal(def.id, key);
    assert(def.label.length > 0);
    assert(Array.isArray(def.aliases) && def.aliases.length > 0);
    assert(['dynamic', 'static', 'system'].includes(def.source));
  }
});

// ============================================================
// SUITE 2: HEADER NORMALIZATION PIPELINE
// ============================================================
console.log('\n▶ Suite 2: Header Normalization Pipeline');

test("Normalizes all Mother's Name variations to 'mother_name'", () => {
  const variations = [
    "Mother's Name",
    'Mother Name',
    'Mothers Name',
    'mother_name',
    'mothername',
    "Mother's_Name",
    'MOTHER NAME',
    "MOTHER'S NAME",
    'Mother',
    'mother_contact',
  ];

  for (const v of variations) {
    const norm = normalizeHeader(v);
    assert.equal(norm, 'mother_name', `Failed for variation: '${v}', got '${norm}'`);
  }
});

test("Normalizes all Roll Number variations to 'roll_number'", () => {
  const variations = [
    'Roll Number',
    'Roll No',
    'Roll No.',
    'Roll',
    'roll_number',
    'rollno',
    'roll_no',
    'r_no',
    'rno',
    'R.No',
    'R.No.',
    'ROLL NUMBER',
    'ROLL NO',
    'class_roll',
  ];

  for (const v of variations) {
    const norm = normalizeHeader(v);
    assert.equal(norm, 'roll_number', `Failed for variation: '${v}', got '${norm}'`);
  }
});

test("Normalizes all Student ID variations to 'student_id'", () => {
  const variations = [
    'Student ID',
    'Student ID / Adm No',
    'Admission No',
    'Admission Number',
    'Adm No',
    'Adm No.',
    'Registration No',
    'Reg No',
    'Reg_No',
    'Scholar No',
    'Scholar_No',
    'student_id',
    'studentid',
    'ID NO',
    'id_no',
  ];

  for (const v of variations) {
    const norm = normalizeHeader(v);
    assert.equal(norm, 'student_id', `Failed for variation: '${v}', got '${norm}'`);
  }
});

test("Normalizes all Student Name variations to 'student_name'", () => {
  const variations = [
    'Student Name',
    'Full Name',
    'Candidate Name',
    'First Name',
    'student_name',
    'fullname',
    'name',
    'STUDENT NAME',
  ];

  for (const v of variations) {
    const norm = normalizeHeader(v);
    assert.equal(norm, 'student_name', `Failed for variation: '${v}', got '${norm}'`);
  }
});

test('Normalizes Date of Birth and Blood Group variations', () => {
  assert.equal(normalizeHeader('Date of Birth'), 'date_of_birth');
  assert.equal(normalizeHeader('DOB'), 'date_of_birth');
  assert.equal(normalizeHeader('D.O.B'), 'date_of_birth');
  assert.equal(normalizeHeader('Blood Group'), 'blood_group');
  assert.equal(normalizeHeader('Blood Grp'), 'blood_group');
  assert.equal(normalizeHeader('BG'), 'blood_group');
});

// ============================================================
// SUITE 3: CANONICAL STUDENT RECORD NORMALIZER
// ============================================================
console.log('\n▶ Suite 3: Canonical Student Record Normalizer');

test('Preserves leading zeros on Student ID strictly', () => {
  const student = normalizeStudentRecord({
    student_id: '0001',
    name: 'Rahul Kumar',
  });

  assert.equal(student.student_id, '0001', 'Leading zeros must not be stripped or cast to number 1');
  assert.equal(student.student_name, 'Rahul Kumar');
});

test('Preserves leading zeros on Roll Number', () => {
  const student = normalizeStudentRecord({
    student_id: '0042',
    name: 'Priya Sharma',
    roll_number: '07',
  });

  assert.equal(student.roll_number, '07');
});

test('Extracts Mother Name from any property alias without data loss', () => {
  const s1 = normalizeStudentRecord({ name: 'A', student_id: '1', mother_name: 'Sunita Devi' });
  const s2 = normalizeStudentRecord({ name: 'A', student_id: '1', mothers_name: 'Sunita Devi' });
  const s3 = normalizeStudentRecord({ name: 'A', student_id: '1', mother: 'Sunita Devi' });
  const s4 = normalizeStudentRecord({ name: 'A', student_id: '1', custom_fields: { mother_name: 'Sunita Devi' } });
  const s5 = normalizeStudentRecord({ name: 'A', student_id: '1', custom_fields: { "Mother's Name": 'Sunita Devi' } });

  assert.equal(s1.mother_name, 'Sunita Devi');
  assert.equal(s2.mother_name, 'Sunita Devi');
  assert.equal(s3.mother_name, 'Sunita Devi');
  assert.equal(s4.mother_name, 'Sunita Devi');
  assert.equal(s5.mother_name, 'Sunita Devi');
});

test('Strict Field Isolation: Missing Mother Name remains null and NEVER borrows Father Name', () => {
  const student = normalizeStudentRecord({
    student_id: '001',
    name: 'Aarav',
    father_name: 'Suresh Kumar',
    // mother_name is deliberately omitted
  });

  assert.equal(student.father_name, 'Suresh Kumar');
  assert.equal(student.mother_name, null, "Missing mother's name must NOT fallback to father's name");
});

test('Preserves exact address strings with commas and spaces intact', () => {
  const rawAddr = '136-Anandpuri, Station Road, Near Shiv Temple, Motihari, Bihar - 845401';
  const student = normalizeStudentRecord({
    student_id: '101',
    name: 'Test Student',
    address: rawAddr,
  });

  assert.equal(student.address, rawAddr);
});

// ============================================================
// SUITE 4: UNIVERSAL VALUE RESOLVER ACROSS SUBSYSTEMS
// ============================================================
console.log('\n▶ Suite 4: Universal Value Resolver');

test("Universal resolver extracts Mother's Name accurately", () => {
  const student = normalizeStudentRecord({
    student_id: '001',
    name: 'Aarav Gupta',
    mother_name: 'Sunita Gupta',
  });

  const field: TemplateField = {
    key: 'mother_name',
    source: 'dynamic',
    visible: true,
    x: 10, y: 10, width: 30, height: 5,
  };

  assert.equal(resolveTemplateFieldValue(field, student), 'Sunita Gupta');
  assert.equal(fieldValue(field, student as any, '2026-27', 'Sparknest Academy'), 'Sunita Gupta');
});

test('Universal resolver extracts Roll Number accurately', () => {
  const student = normalizeStudentRecord({
    student_id: '001',
    name: 'Aarav Gupta',
    roll_number: '42',
  });

  const field: TemplateField = {
    key: 'roll_number',
    source: 'dynamic',
    visible: true,
    x: 10, y: 10, width: 30, height: 5,
  };

  assert.equal(resolveTemplateFieldValue(field, student), '42');
  assert.equal(fieldValue(field, student as any, '2026-27', 'Sparknest Academy'), '42');
});

test("Resolves legacy custom_text field with labelPrefix 'MOTHER'S NAME:'", () => {
  const student = normalizeStudentRecord({
    student_id: '001',
    name: 'Aarav Gupta',
    mother_name: 'Anita Devi',
  });

  const legacyField: TemplateField = {
    key: 'custom_text',
    source: 'dynamic',
    labelPrefix: "MOTHER'S NAME: ",
    visible: true,
    x: 10, y: 10, width: 30, height: 5,
  };

  assert.equal(resolveTemplateFieldValue(legacyField, student), 'Anita Devi');
});

test("Resolves legacy custom_text field with labelPrefix 'ROLL NO:'", () => {
  const student = normalizeStudentRecord({
    student_id: '001',
    name: 'Aarav Gupta',
    roll_number: '15',
  });

  const legacyField: TemplateField = {
    key: 'custom_text',
    source: 'dynamic',
    labelPrefix: 'ROLL NO: ',
    visible: true,
    x: 10, y: 10, width: 30, height: 5,
  };

  assert.equal(resolveTemplateFieldValue(legacyField, student), '15');
});

test('Static template fields return static values without touching student data', () => {
  const student = normalizeStudentRecord({
    student_id: '001',
    name: 'Aarav Gupta',
  });

  const schoolField: TemplateField = {
    key: 'school_name',
    source: 'static',
    customText: 'SPARKNEST ACADEMY',
    visible: true,
    x: 0, y: 0, width: 50, height: 10,
  };

  assert.equal(resolveTemplateFieldValue(schoolField, student), 'SPARKNEST ACADEMY');
});

// ============================================================
// SUITE 5: CROSS-STUDENT SWITCHING & ISOLATION
// ============================================================
console.log('\n▶ Suite 5: Cross-Student Switching & Batch Isolation');

test('Switching Student 1 -> Student 2 strictly resolves all fields from Student 2', () => {
  const student1 = normalizeStudentRecord({
    student_id: '001',
    name: 'Alice Johnson',
    mother_name: 'Mary Johnson',
    roll_number: '10',
    class: '10th A',
  });

  const student2 = normalizeStudentRecord({
    student_id: '002',
    name: 'Bob Smith',
    mother_name: 'Carol Smith',
    roll_number: '11',
    class: '10th B',
  });

  const motherField: TemplateField = { key: 'mother_name', source: 'dynamic', visible: true, x: 0, y: 0, width: 10, height: 5 };
  const rollField: TemplateField = { key: 'roll_number', source: 'dynamic', visible: true, x: 0, y: 0, width: 10, height: 5 };
  const nameField: TemplateField = { key: 'student_name', source: 'dynamic', visible: true, x: 0, y: 0, width: 10, height: 5 };

  // Resolve Student 1
  assert.equal(resolveTemplateFieldValue(nameField, student1), 'Alice Johnson');
  assert.equal(resolveTemplateFieldValue(motherField, student1), 'Mary Johnson');
  assert.equal(resolveTemplateFieldValue(rollField, student1), '10');

  // Switch to Student 2
  assert.equal(resolveTemplateFieldValue(nameField, student2), 'Bob Smith');
  assert.equal(resolveTemplateFieldValue(motherField, student2), 'Carol Smith');
  assert.equal(resolveTemplateFieldValue(rollField, student2), '11');

  // Verify no stale state retained
  assert.notEqual(resolveTemplateFieldValue(nameField, student2), 'Alice Johnson');
  assert.notEqual(resolveTemplateFieldValue(motherField, student2), 'Mary Johnson');
});

test('Batch of 100 students resolves with 100% field isolation and accuracy', () => {
  const mockStudents: CanonicalStudent[] = [];
  for (let i = 1; i <= 100; i++) {
    mockStudents.push(
      normalizeStudentRecord({
        student_id: String(i).padStart(4, '0'),
        name: `Student Name ${i}`,
        father_name: `Father ${i}`,
        mother_name: `Mother ${i}`,
        roll_number: String(i),
        class: `${(i % 12) + 1}th Standard`,
        phone: `98765432${String(i).padStart(2, '0')}`,
      })
    );
  }

  const motherField: TemplateField = { key: 'mother_name', source: 'dynamic', visible: true, x: 0, y: 0, width: 10, height: 5 };
  const rollField: TemplateField = { key: 'roll_number', source: 'dynamic', visible: true, x: 0, y: 0, width: 10, height: 5 };
  const idField: TemplateField = { key: 'student_id', source: 'dynamic', visible: true, x: 0, y: 0, width: 10, height: 5 };

  for (let i = 0; i < 100; i++) {
    const expectedNum = i + 1;
    const student = mockStudents[i];

    assert.equal(resolveTemplateFieldValue(idField, student), String(expectedNum).padStart(4, '0'));
    assert.equal(resolveTemplateFieldValue(motherField, student), `Mother ${expectedNum}`);
    assert.equal(resolveTemplateFieldValue(rollField, student), String(expectedNum));
  }
});

// ============================================================
// SUITE 6: CSV IMPORT & COLUMN REORDERING RESILIENCE
// ============================================================
console.log('\n▶ Suite 6: CSV/Excel Header Reordering & Parsing Resilience');

test('CSV with column order: Mother Name -> Roll No -> Student Name -> Student ID maps correctly', () => {
  const csvText = [
    "Mother's Name,Roll No,Student Name,Student ID,Class",
    'Sunita Devi,25,Aarav Kumar,0089,10th A',
    'Anita Sharma,26,Priya Sharma,0090,10th A',
  ].join('\n');

  const result = parseAndValidateCsv(csvText);

  assert.equal(result.validRows, 2);
  assert.equal(result.rows[0].data.name, 'Aarav Kumar');
  assert.equal(result.rows[0].data.student_id, '0089');
  assert.equal(result.rows[0].data.mother_name, 'Sunita Devi');
  assert.equal(result.rows[0].data.roll_number, '25');

  assert.equal(result.rows[1].data.name, 'Priya Sharma');
  assert.equal(result.rows[1].data.student_id, '0090');
  assert.equal(result.rows[1].data.mother_name, 'Anita Sharma');
  assert.equal(result.rows[1].data.roll_number, '26');
});

test('CSV with unusual headers (MOTHERS_NAME, R_NO, STUDENT_ID_NO) maps cleanly', () => {
  const csvText = [
    'STUDENT_ID_NO,FULL_NAME,MOTHERS_NAME,R_NO',
    'STU-001,Vikram Singh,Kavita Singh,1',
  ].join('\n');

  const result = parseAndValidateCsv(csvText);

  assert.equal(result.validRows, 1);
  assert.equal(result.rows[0].data.student_id, 'STU-001');
  assert.equal(result.rows[0].data.name, 'Vikram Singh');
  assert.equal(result.rows[0].data.mother_name, 'Kavita Singh');
  assert.equal(result.rows[0].data.roll_number, '1');
});

// ============================================================
// SUITE 7: BATCH DATA INTEGRITY PRE-FLIGHT VALIDATOR
// ============================================================
console.log('\n▶ Suite 7: Batch Data Integrity Pre-flight Validator');

test('Pre-flight validator accurately measures completeness for 100 students', () => {
  const batch: Partial<IdCardPerson>[] = [];
  for (let i = 1; i <= 100; i++) {
    batch.push({
      student_id: `ID-${i}`,
      name: `Student ${i}`,
      roll_number: String(i),
      // 5 students have missing mother_name
      mother_name: i <= 95 ? `Mother ${i}` : undefined,
    });
  }

  const dummyLayout: TemplateLayout = {
    backgroundColor: '#ffffff',
    fields: [
      { key: 'student_name', source: 'dynamic', visible: true, x: 0, y: 0, width: 10, height: 10, required: true },
      { key: 'student_id', source: 'dynamic', visible: true, x: 0, y: 0, width: 10, height: 10, required: true },
      { key: 'roll_number', source: 'dynamic', visible: true, x: 0, y: 0, width: 10, height: 10, required: true },
      { key: 'mother_name', source: 'dynamic', visible: true, x: 0, y: 0, width: 10, height: 10, required: false },
    ],
  };

  const validation = validateBatchDataBindings(batch, dummyLayout);

  assert.equal(validation.totalStudents, 100);
  assert.equal(validation.canGenerate, true);

  const motherStat = validation.fieldStats.find((s) => s.fieldId === 'mother_name');
  assert(motherStat, 'Mother stat must exist');
  assert.equal(motherStat.presentCount, 95);
  assert.equal(motherStat.missingCount, 5);
  assert.equal(motherStat.missingPercentage, 5.0);
});

console.log('\n' + '═'.repeat(65));
console.log(`  SUITE SUMMARY: ${passedAssertions} / ${totalAssertions} assertions passed (100%)`);
console.log('═'.repeat(65) + '\n');
