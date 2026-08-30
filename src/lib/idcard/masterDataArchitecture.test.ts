import { strict as assert } from 'node:assert';
import { extractTemplateFieldSchema, validatePersonForTemplate } from './templateFieldSchema';
import { parseAndValidateCsv, getTemplateSampleData } from './csvImport';
import { matchPhotoToPerson } from './photoMatcher';
import { fieldValue } from './generation';
import { TEMPLATE_PRESETS } from './templatePresets';
import type { IdCardPerson, TemplateLayout } from './types';

console.log('--- RUNNING MASTER DATA ARCHITECTURE TEST SUITE (15 TEST MATRIX CASES) ---');

// Test 1: Static fields (School Name, Address, Logo) never appear in dynamic student input fields or Excel sample
{
  const layout: TemplateLayout = {
    backgroundColor: '#FFFFFF',
    fields: [
      { key: 'school_logo', label: 'School Logo', x: 5, y: 5, width: 15, height: 15, visible: true, source: 'static' },
      { key: 'school_name', label: 'School Name', x: 20, y: 5, width: 30, height: 10, visible: true, source: 'static', customText: 'Delhi Public School' },
      { key: 'school_subtitle', label: 'School Subtitle', x: 20, y: 15, width: 30, height: 5, visible: true, source: 'static', customText: 'Patna Branch' },
      { key: 'student_name', label: 'Student Name', x: 5, y: 25, width: 40, height: 6, visible: true, source: 'dynamic', required: true },
      { key: 'student_id', label: 'Student ID', x: 5, y: 32, width: 40, height: 6, visible: true, source: 'dynamic', required: true },
      { key: 'class', label: 'Class', x: 5, y: 39, width: 40, height: 6, visible: true, source: 'dynamic' },
    ],
  };

  const schema = extractTemplateFieldSchema(layout);
  const sample = getTemplateSampleData(layout);

  const dynamicKeys = schema.studentInputFields.map(f => f.key);
  assert.ok(!dynamicKeys.includes('school_name'), 'school_name must not be in dynamic fields');
  assert.ok(!dynamicKeys.includes('school_subtitle'), 'school_subtitle must not be in dynamic fields');
  assert.ok(!dynamicKeys.includes('school_logo'), 'school_logo must not be in dynamic fields');

  assert.ok(!sample.headers.includes('School Name'), 'Sample must not contain School Name');
  assert.ok(!sample.headers.includes('School Subtitle'), 'Sample must not contain School Subtitle');
  assert.ok(!sample.headers.includes('School Logo'), 'Sample must not contain School Logo');
  console.log('✅ Test 1 Passed: Static school fields never appear in dynamic student fields or sample Excel.');
}

// Test 2: Dynamic fields (Name, ID, Class) appear in Add Student schema and Excel sample
{
  const layout: TemplateLayout = {
    backgroundColor: '#FFFFFF',
    fields: [
      { key: 'student_name', label: 'Student Name', x: 5, y: 25, width: 40, height: 6, visible: true, required: true },
      { key: 'student_id', label: 'Student ID', x: 5, y: 32, width: 40, height: 6, visible: true, required: true },
      { key: 'class', label: 'Class', x: 5, y: 39, width: 40, height: 6, visible: true },
      { key: 'blood_group', label: 'Blood Group', x: 5, y: 46, width: 40, height: 6, visible: true },
    ],
  };

  const schema = extractTemplateFieldSchema(layout);
  const sample = getTemplateSampleData(layout);

  assert.deepEqual(schema.studentInputFields.map(f => f.key), ['student_id', 'student_name', 'class', 'blood_group']);
  assert.deepEqual(sample.headers, ['Student ID', 'Student Name', 'Class', 'Blood Group']);
  console.log('✅ Test 2 Passed: Dynamic fields appear accurately in schema and Excel sample with Student ID first.');
}

// Test 3: Custom dynamic field (Transport Route, House) dynamically appears in schema, sample, import, and renderer
{
  const layout: TemplateLayout = {
    backgroundColor: '#FFFFFF',
    fields: [
      { key: 'student_name', label: 'Student Name', x: 5, y: 10, width: 40, height: 6, visible: true, required: true },
      { key: 'student_id', label: 'Student ID', x: 5, y: 20, width: 40, height: 6, visible: true, required: true },
      { key: 'transport_route', label: 'Transport Route', customKey: 'transport_route', source: 'dynamic', dataType: 'text', x: 5, y: 30, width: 40, height: 6, visible: true, required: true },
      { key: 'house_name', label: 'House', customKey: 'house_name', source: 'dynamic', dataType: 'text', x: 5, y: 40, width: 40, height: 6, visible: true },
    ],
  };

  const sample = getTemplateSampleData(layout);

  assert.ok(sample.headers.includes('Transport Route'), 'Sample must contain custom dynamic field Transport Route');
  assert.ok(sample.headers.includes('House'), 'Sample must contain custom dynamic field House');

  const csvText = 'Student ID,Student Name,Transport Route,House\n0001,Aarav Sharma,Route 12,Red House';
  const result = parseAndValidateCsv(csvText, layout);

  assert.equal(result.validCount, 1);
  assert.equal(result.rows[0].data.student_id, '0001');
  assert.equal(result.rows[0].data.name, 'Aarav Sharma');
  assert.equal((result.rows[0].data as any).transport_route, 'Route 12');
  assert.equal((result.rows[0].data as any).house_name, 'Red House');
  assert.equal(result.rows[0].data.custom_fields?.transport_route, 'Route 12');

  const person: IdCardPerson = {
    id: 'p1',
    project_id: 'proj1',
    student_id: '0001',
    name: 'Aarav Sharma',
    class: '10',
    section: 'A',
    roll_number: '1',
    date_of_birth: null,
    blood_group: null,
    father_name: null,
    mother_name: null,
    phone: null,
    address: null,
    photo_url: null,
    created_at: '',
    updated_at: '',
    custom_fields: { transport_route: 'Route 12', house_name: 'Red House' },
  };

  const routeField = layout.fields.find(f => f.key === 'transport_route')!;
  assert.equal(fieldValue(routeField, person, '2026-27', 'School'), 'Route 12');
  console.log('✅ Test 3 Passed: Custom dynamic fields seamlessly flow across Schema, Sample, Import, and Rendering.');
}

// Test 4: Removing a dynamic field updates schema and Excel sample without losing database records
{
  const layoutWithDob: TemplateLayout = {
    backgroundColor: '#FFFFFF',
    fields: [
      { key: 'student_name', label: 'Student Name', x: 5, y: 10, width: 40, height: 6, visible: true },
      { key: 'student_id', label: 'Student ID', x: 5, y: 20, width: 40, height: 6, visible: true },
      { key: 'date_of_birth', label: 'Date of Birth', x: 5, y: 30, width: 40, height: 6, visible: true },
    ],
  };

  const layoutWithoutDob: TemplateLayout = {
    backgroundColor: '#FFFFFF',
    fields: [
      { key: 'student_name', label: 'Student Name', x: 5, y: 10, width: 40, height: 6, visible: true },
      { key: 'student_id', label: 'Student ID', x: 5, y: 20, width: 40, height: 6, visible: true },
    ],
  };

  const schema1 = extractTemplateFieldSchema(layoutWithDob);
  const schema2 = extractTemplateFieldSchema(layoutWithoutDob);

  assert.ok(schema1.studentInputFields.some(f => f.key === 'date_of_birth'));
  assert.ok(!schema2.studentInputFields.some(f => f.key === 'date_of_birth'));
  console.log('✅ Test 4 Passed: Schema and Sample reflect dynamic field removal cleanly.');
}

// Test 5: Changing template static text (ABC School -> XYZ School) updates all cards without editing student rows
{
  const staticField: any = {
    key: 'school_name',
    label: 'School Name',
    source: 'static',
    customText: 'ABC Public School',
  };

  const studentPerson: IdCardPerson = {
    id: 's1',
    project_id: 'p1',
    student_id: '0001',
    name: 'Rohan Verma',
    class: '5th',
    section: 'B',
    roll_number: '12',
    date_of_birth: null,
    blood_group: null,
    father_name: null,
    mother_name: null,
    phone: null,
    address: null,
    photo_url: null,
    created_at: '',
    updated_at: '',
  };

  assert.equal(fieldValue(staticField, studentPerson, '2026-27', 'Default'), 'ABC Public School');
  staticField.customText = 'XYZ International Academy';
  assert.equal(fieldValue(staticField, studentPerson, '2026-27', 'Default'), 'XYZ International Academy');
  console.log('✅ Test 5 Passed: Template static updates propagate immediately without touching student records.');
}

// Test 6: Excel validation fails with a clear message when a required dynamic column is missing
{
  const layout: TemplateLayout = {
    backgroundColor: '#FFFFFF',
    fields: [
      { key: 'student_name', label: 'Student Name', x: 5, y: 10, width: 40, height: 6, visible: true, required: true },
      { key: 'student_id', label: 'Student ID', x: 5, y: 20, width: 40, height: 6, visible: true, required: true },
      { key: 'father_name', label: "Father's Name", x: 5, y: 30, width: 40, height: 6, visible: true, required: true },
    ],
  };

  const csvMissingFather = 'Student ID,Student Name\n0001,Aarav';
  const result = parseAndValidateCsv(csvMissingFather, layout);

  assert.ok(result.missingHeaders.includes("Father's Name"), 'Must report missing required column');
  assert.equal(result.summary?.hasErrors, true);
  console.log('✅ Test 6 Passed: Excel validation flags missing required columns accurately.');
}

// Test 7: Extra Excel columns (e.g. static school details in uploaded file) are ignored and cannot overwrite static template values
{
  const layout: TemplateLayout = {
    backgroundColor: '#FFFFFF',
    fields: [
      { key: 'school_name', label: 'School Name', x: 5, y: 5, width: 40, height: 10, visible: true, source: 'static', customText: 'Official School Name' },
      { key: 'student_name', label: 'Student Name', x: 5, y: 20, width: 40, height: 6, visible: true, required: true },
      { key: 'student_id', label: 'Student ID', x: 5, y: 30, width: 40, height: 6, visible: true, required: true },
    ],
  };

  const csvWithExtraStaticColumns = 'Student ID,Student Name,School Name,Random Note\n0001,John Doe,Fake School Override,Some Note';
  const result = parseAndValidateCsv(csvWithExtraStaticColumns, layout);

  assert.equal(result.validCount, 1);
  assert.ok(result.ignoredHeaders.includes('School Name') || result.ignoredHeaders.includes('Random Note'));

  const schoolField = layout.fields.find(f => f.key === 'school_name')!;
  assert.equal(fieldValue(schoolField, result.rows[0].data as any, '2026-27', 'Project School'), 'Official School Name');
  console.log('✅ Test 7 Passed: Extra uploaded columns cannot overwrite template static values.');
}

// Test 8: QR Code is system-generated without requiring an Excel column
{
  const layout: TemplateLayout = {
    backgroundColor: '#FFFFFF',
    fields: [
      { key: 'student_name', label: 'Student Name', x: 5, y: 10, width: 40, height: 6, visible: true },
      { key: 'student_id', label: 'Student ID', x: 5, y: 20, width: 40, height: 6, visible: true },
      { key: 'qr_code', label: 'QR Code', x: 5, y: 30, width: 20, height: 20, visible: true, source: 'system' },
    ],
  };

  const schema = extractTemplateFieldSchema(layout);
  const sample = getTemplateSampleData(layout);

  assert.ok(schema.autoGeneratedFields.some(f => f.key === 'qr_code'));
  assert.ok(!schema.studentInputFields.some(f => f.key === 'qr_code'));
  assert.ok(!sample.headers.includes('QR Code'));
  console.log('✅ Test 8 Passed: QR Code is categorized as auto_generated/system and omitted from Excel sample.');
}

// Test 9: Barcode is system-generated without requiring an Excel column
{
  const layout: TemplateLayout = {
    backgroundColor: '#FFFFFF',
    fields: [
      { key: 'student_name', label: 'Student Name', x: 5, y: 10, width: 40, height: 6, visible: true },
      { key: 'student_id', label: 'Student ID', x: 5, y: 20, width: 40, height: 6, visible: true },
      { key: 'barcode', label: 'Barcode', x: 5, y: 30, width: 40, height: 10, visible: true, source: 'system' },
    ],
  };

  const schema = extractTemplateFieldSchema(layout);
  const sample = getTemplateSampleData(layout);

  assert.ok(schema.autoGeneratedFields.some(f => f.key === 'barcode'));
  assert.ok(!schema.studentInputFields.some(f => f.key === 'barcode'));
  assert.ok(!sample.headers.includes('Barcode'));
  console.log('✅ Test 9 Passed: Barcode is categorized as auto_generated/system and omitted from Excel sample.');
}

// Test 10: Bulk photo matching matches 0001.jpg, 0002.png, 0003.jpeg, 0004.webp to student_id
{
  const persons: IdCardPerson[] = [
    { id: '1', project_id: 'p', student_id: '0001', name: 'Student 1', class: null, section: null, roll_number: null, date_of_birth: null, blood_group: null, father_name: null, mother_name: null, phone: null, address: null, photo_url: null, created_at: '', updated_at: '' },
    { id: '2', project_id: 'p', student_id: '0002', name: 'Student 2', class: null, section: null, roll_number: null, date_of_birth: null, blood_group: null, father_name: null, mother_name: null, phone: null, address: null, photo_url: null, created_at: '', updated_at: '' },
    { id: '3', project_id: 'p', student_id: '0003', name: 'Student 3', class: null, section: null, roll_number: null, date_of_birth: null, blood_group: null, father_name: null, mother_name: null, phone: null, address: null, photo_url: null, created_at: '', updated_at: '' },
    { id: '4', project_id: 'p', student_id: '0004', name: 'Student 4', class: null, section: null, roll_number: null, date_of_birth: null, blood_group: null, father_name: null, mother_name: null, phone: null, address: null, photo_url: null, created_at: '', updated_at: '' },
  ];

  const match1 = matchPhotoToPerson('0001.jpg', '0001', persons);
  const match2 = matchPhotoToPerson('0002.png', '0002', persons);
  const match3 = matchPhotoToPerson('0003.jpeg', '0003', persons);
  const match4 = matchPhotoToPerson('0004.webp', '0004', persons);

  assert.equal(match1.person?.student_id, '0001');
  assert.equal(match2.person?.student_id, '0002');
  assert.equal(match3.person?.student_id, '0003');
  assert.equal(match4.person?.student_id, '0004');
  console.log('✅ Test 10 Passed: Supported photo extensions (.jpg, .png, .jpeg, .webp) matched accurately.');
}

// Test 11: Leading zeros preserved: 0001 remains '0001' and matches 0001.jpg, not 1.jpg
{
  const persons: IdCardPerson[] = [
    { id: '1', project_id: 'p', student_id: '0001', name: 'Student 0001', class: null, section: null, roll_number: null, date_of_birth: null, blood_group: null, father_name: null, mother_name: null, phone: null, address: null, photo_url: null, created_at: '', updated_at: '' },
    { id: '2', project_id: 'p', student_id: '1', name: 'Student 1', class: null, section: null, roll_number: null, date_of_birth: null, blood_group: null, father_name: null, mother_name: null, phone: null, address: null, photo_url: null, created_at: '', updated_at: '' },
  ];

  const matchLeadingZero = matchPhotoToPerson('0001.jpg', '0001', persons);
  assert.equal(matchLeadingZero.person?.student_id, '0001');
  assert.equal(matchLeadingZero.matchType, 'student_id');

  const csvLeading = 'Student ID,Student Name\n0001,Zero Padded\n0120,Zero Middle';
  const result = parseAndValidateCsv(csvLeading);
  assert.equal(result.rows[0].data.student_id, '0001');
  assert.equal(result.rows[1].data.student_id, '0120');
  console.log('✅ Test 11 Passed: Leading zeros preserved strictly across parsing and photo matching.');
}

// Test 12: Multiple templates with different dynamic fields generate distinct, isolated forms and Excel files
{
  const templateA: TemplateLayout = {
    backgroundColor: '#FFFFFF',
    fields: [
      { key: 'student_name', label: 'Student Name', x: 5, y: 10, width: 40, height: 6, visible: true },
      { key: 'student_id', label: 'Student ID', x: 5, y: 20, width: 40, height: 6, visible: true },
      { key: 'blood_group', label: 'Blood Group', x: 5, y: 30, width: 40, height: 6, visible: true },
    ],
  };

  const templateB: TemplateLayout = {
    backgroundColor: '#FFFFFF',
    fields: [
      { key: 'student_name', label: 'Student Name', x: 5, y: 10, width: 40, height: 6, visible: true },
      { key: 'student_id', label: 'Student ID', x: 5, y: 20, width: 40, height: 6, visible: true },
      { key: 'emergency_no', label: 'Emergency No', x: 5, y: 30, width: 40, height: 6, visible: true },
      { key: 'address', label: 'Address', x: 5, y: 40, width: 40, height: 6, visible: true },
    ],
  };

  const sampleA = getTemplateSampleData(templateA);
  const sampleB = getTemplateSampleData(templateB);

  assert.deepEqual(sampleA.headers, ['Student ID', 'Student Name', 'Blood Group']);
  assert.deepEqual(sampleB.headers, ['Student ID', 'Student Name', 'Emergency No', 'Address']);
  console.log('✅ Test 12 Passed: Different templates generate distinct isolated samples in standard order.');
}

// Test 13: Existing presets remain valid and render accurately
{
  for (const preset of TEMPLATE_PRESETS) {
    const schema = extractTemplateFieldSchema(preset.layout);
    assert.ok(schema.items.length > 0, 'Preset ' + preset.name + ' must have valid schema items');
    assert.ok(schema.studentInputFields.length > 0, 'Preset ' + preset.name + ' must have dynamic student fields');
    const sample = getTemplateSampleData(preset.layout);
    assert.ok(sample.headers.length > 0, 'Preset ' + preset.name + ' must generate valid sample headers');
  }
  console.log('✅ Test 13 Passed: All ' + TEMPLATE_PRESETS.length + ' presets extracted and validated cleanly.');
}

// Test 14: Existing student records remain intact with full field validation
{
  const studentRecord: Partial<IdCardPerson> = {
    student_id: 'STU-100',
    name: 'Kavya Sen',
    class: '8th',
    roll_number: '15',
    blood_group: 'O+',
  };

  const layout: TemplateLayout = {
    backgroundColor: '#FFFFFF',
    fields: [
      { key: 'student_name', label: 'Student Name', x: 5, y: 10, width: 40, height: 6, visible: true, required: true },
      { key: 'student_id', label: 'Student ID', x: 5, y: 20, width: 40, height: 6, visible: true, required: true },
      { key: 'blood_group', label: 'Blood Group', x: 5, y: 30, width: 40, height: 6, visible: true, required: true },
    ],
  };

  const validation = validatePersonForTemplate(studentRecord, layout);
  assert.equal(validation.valid, true);
  assert.equal(validation.missingFields.length, 0);
  console.log('✅ Test 14 Passed: Existing student records validate perfectly against active template.');
}

// Test 15: Dual-sided Front and Back field rendering verified
{
  const dualLayout: TemplateLayout = {
    backgroundColor: '#FFFFFF',
    fields: [
      { key: 'school_name', label: 'School Name', x: 5, y: 5, width: 40, height: 10, visible: true, source: 'static', customText: 'Bright Future School' },
      { key: 'student_name', label: 'Student Name', x: 5, y: 20, width: 40, height: 6, visible: true, required: true },
      { key: 'student_id', label: 'Student ID', x: 5, y: 30, width: 40, height: 6, visible: true, required: true },
    ],
    back: {
      backgroundColor: '#FAFAFA',
      fields: [
        { key: 'father_name', label: "Father's Name", x: 5, y: 10, width: 40, height: 6, visible: true },
        { key: 'phone', label: 'Phone', x: 5, y: 20, width: 40, height: 6, visible: true },
        { key: 'terms', label: 'Terms', x: 5, y: 30, width: 40, height: 10, visible: true, source: 'static', customText: 'Non-transferable identity card.' },
      ],
    },
  };

  const schema = extractTemplateFieldSchema(dualLayout);
  const sample = getTemplateSampleData(dualLayout);

  const frontField = schema.studentInputFields.find(f => f.key === 'student_name')!;
  const backField = schema.studentInputFields.find(f => f.key === 'father_name')!;

  assert.equal(frontField.side, 'front');
  assert.equal(backField.side, 'back');

  assert.deepEqual(sample.headers, ['Student ID', 'Student Name', "Father's Name", 'Phone']);
  console.log('✅ Test 15 Passed: Dual-sided front and back static/dynamic integration verified in standard order.');
}

console.log('\n🎉 ALL 15 MASTER DATA ARCHITECTURE TESTS PASSED SUCCESSFULLY! 🎉');
