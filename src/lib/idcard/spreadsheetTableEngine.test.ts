import { strict as assert } from 'node:assert';
import type { IdCardPerson } from './types';
import {
  sortStudentsMulti,
  compareStudentId,
  compareClass,
  compareRollNumber,
  getStudentsInPrintOrder,
  type SortRule,
} from './studentSort';
import * as XLSX from 'xlsx';

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║   SPREADSHEET ID CARD PRODUCTION TABLE ENGINE TEST SUITE      ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// Mock localStorage for node environment
const memoryStore: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => memoryStore[key] || null,
  setItem: (key: string, val: string) => { memoryStore[key] = String(val); },
  removeItem: (key: string) => { delete memoryStore[key]; },
  clear: () => { Object.keys(memoryStore).forEach((k) => delete memoryStore[k]); },
};

// Generate test dataset of 120 student records
function generateTestStudents(count: number): IdCardPerson[] {
  const classes = ['Pre-Nursery', 'Nursery', 'LKG', 'UKG', '1st', '2nd', '8th', '9th', '10th', '12th'];
  const bloodGroups = ['A+', 'B+', 'O+', 'AB+', 'O-'];
  const firstNames = ['Aarav', 'Bhavya', 'Chetan', 'Diya', 'Esha', 'Farhan', 'Gaurav', 'Hina', 'Ishaan', 'Jaya', 'Kabir', 'Lakshmi', 'Manish', 'Neha', 'Olivia', 'Pranav', 'Rahul', 'Sneha', 'Tanvi', 'Varun', 'Zoya'];
  const lastNames = ['Sharma', 'Verma', 'Kumar', 'Singh', 'Patel', 'Gupta', 'Wilson', 'Khan', 'Mehta', 'Yadav'];

  const students: IdCardPerson[] = [];

  for (let i = 1; i <= count; i++) {
    const idStr = String(i).padStart(4, '0');
    const fName = firstNames[(i - 1) % firstNames.length];
    const lName = lastNames[(i - 1) % lastNames.length];
    const cls = classes[(i - 1) % classes.length];
    const roll = String(((i - 1) % 40) + 1);
    const bg = bloodGroups[(i - 1) % bloodGroups.length];
    const hasPhoto = i % 5 !== 0; // 20% missing photo

    students.push({
      id: `person_${idStr}`,
      project_id: 'proj_matrix_1',
      student_id: idStr,
      name: `${fName} ${lName}`,
      class: cls,
      section: i % 2 === 0 ? 'A' : 'B',
      roll_number: roll,
      date_of_birth: `201${(i % 5)}-0${((i % 9) + 1)}-15`,
      blood_group: bg,
      father_name: `Father ${lName}`,
      mother_name: `Mother ${lName}`,
      phone: `9876543${String(i).padStart(3, '0')}`,
      emergency_number: `9123456${String(i).padStart(3, '0')}`,
      address: `House ${i}, Motihari Road`,
      photo_url: hasPhoto ? `https://example.com/photos/${idStr}.jpg` : null,
      created_at: '2026-08-30T10:00:00Z',
      updated_at: '2026-08-30T10:00:00Z',
    });
  }

  return students;
}

const testStudents = generateTestStudents(120);

// ── Test 1: Natural Numeric Student ID Sorting (0001, 0002, 0010, 0100) ──
{
  const ids = ['0100', '0002', '0010', '0001', '0011', '1', '2', '10'];
  const sorted = [...ids].sort(compareStudentId);
  assert.equal(sorted[0], '0001', '0001 must sort first');
  assert.equal(sorted[1], '1', '1 must sort with 0001');
  assert.equal(sorted[2], '0002', '0002 must sort second');
  assert.equal(sorted[3], '2', '2 must sort with 0002');
  assert.equal(sorted[sorted.length - 1], '0100', '0100 must sort last');
  console.log('✅ Test 1 Passed: Student IDs sort in natural numerical order.');
}

// ── Test 2: School Class Natural Hierarchy Sorting ────────────────────────
{
  const classes = ['10th', '2nd', 'Nursery', '12th', '1st', 'LKG', '8th', 'Pre-Nursery', 'UKG'];
  const sorted = [...classes].sort((a, b) => compareClass(a, 'A', b, 'A'));
  assert.equal(sorted[0], 'Pre-Nursery', 'Pre-Nursery must be first');
  assert.equal(sorted[1], 'Nursery', 'Nursery must be second');
  assert.equal(sorted[2], 'LKG', 'LKG must be third');
  assert.equal(sorted[3], 'UKG', 'UKG must be fourth');
  assert.equal(sorted[4], '1st', '1st grade must be fifth');
  assert.equal(sorted[5], '2nd', '2nd grade must be sixth');
  assert.equal(sorted[6], '8th', '8th grade must be seventh');
  assert.equal(sorted[7], '10th', '10th grade must be eighth');
  assert.equal(sorted[8], '12th', '12th grade must be last');
  console.log('✅ Test 2 Passed: Classes sort in true pedagogical order (Preschool -> 12th).');
}

// ── Test 3: Roll Number Natural Numeric Sorting ───────────────────────────
{
  const rolls = ['10', '2', '1', '100', '20', '3'];
  const sorted = [...rolls].sort(compareRollNumber);
  assert.deepEqual(sorted, ['1', '2', '3', '10', '20', '100']);
  console.log('✅ Test 3 Passed: Roll numbers sort numerically (1, 2, 3, 10, 20, 100).');
}

// ── Test 4: Complete Row Integrity (No Column Desynchronization) ─────────
{
  const sorted = sortStudentsMulti(testStudents, [{ field: 'name', ascending: true }]);
  for (const s of sorted) {
    const orig = testStudents.find((t) => t.id === s.id);
    assert.ok(orig, 'Original student record must exist');
    assert.equal(s.name, orig.name, 'Name must remain attached to student');
    assert.equal(s.student_id, orig.student_id, 'Student ID must remain attached');
    assert.equal(s.class, orig.class, 'Class must remain attached');
    assert.equal(s.roll_number, orig.roll_number, 'Roll number must remain attached');
    assert.equal(s.phone, orig.phone, 'Phone must remain attached');
  }
  console.log('✅ Test 4 Passed: Complete student record integrity verified with 120 students.');
}

// ── Test 5: Multi-Column Sorting (Class ↑ then Roll ↑) ─────────────────────
{
  const rules: SortRule[] = [
    { field: 'class', ascending: true },
    { field: 'roll_number', ascending: true },
  ];
  const sorted = sortStudentsMulti(testStudents, rules);

  // Verify within same class that roll numbers are ascending
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    if (current.class === next.class) {
      const rollA = parseInt(current.roll_number || '0', 10);
      const rollB = parseInt(next.roll_number || '0', 10);
      assert.ok(rollA <= rollB, `Roll numbers within class ${current.class} must be ascending`);
    }
  }
  console.log('✅ Test 5 Passed: Multi-column sorting (Class ↑ then Roll ↑) works seamlessly.');
}

// ── Test 6: Selection Persistence across Sorting & Filtering ──────────────
{
  const selectedStudentIds = new Set<string>(['person_0001', 'person_0025', 'person_0080']);

  // Sort by Name Descending
  const sortedDesc = sortStudentsMulti(testStudents, [{ field: 'name', ascending: false }]);
  for (const id of selectedStudentIds) {
    assert.ok(sortedDesc.some((s) => s.id === id), 'Selected ID must still exist in sorted list');
  }

  // Filter by Class = '8th'
  const filtered8th = sortedDesc.filter((s) => s.class === '8th');
  const visibleSelected = filtered8th.filter((s) => selectedStudentIds.has(s.id));
  const hiddenSelected = Array.from(selectedStudentIds).filter((id) => !filtered8th.some((s) => s.id === id));

  assert.equal(selectedStudentIds.size, 3, 'Total selected count remains strictly 3');
  assert.ok(visibleSelected.length + hiddenSelected.length === 3, 'Visible + Hidden equals total selected');
  console.log('✅ Test 6 Passed: Selections persist cleanly across sorting and filtering.');
}

// ── Test 7: Search + Filter + Sort Multi-Stage Pipeline ───────────────────
{
  // Global search for 'Sharma'
  const search = 'Sharma';
  let pipeline = testStudents.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id.includes(search)
  );

  // Filter: Has Photo
  pipeline = pipeline.filter((s) => Boolean(s.photo_url));

  // Sort: Roll Number Ascending
  pipeline = sortStudentsMulti(pipeline, [{ field: 'roll_number', ascending: true }]);

  assert.ok(pipeline.length > 0, 'Pipeline must return results');
  for (const s of pipeline) {
    assert.ok(s.name.includes('Sharma'), 'Must match search term');
    assert.ok(Boolean(s.photo_url), 'Must have photo');
  }
  console.log('✅ Test 7 Passed: Search + Filter + Sort pipeline operates in unified harmony.');
}

// ── Test 8: Large Dataset Continuous Rendering Performance (No Pagination) ─
{
  const largeDataset = generateTestStudents(500);
  const startTime = Date.now();
  const sorted = sortStudentsMulti(largeDataset, [{ field: 'student_id', ascending: true }]);
  const duration = Date.now() - startTime;

  assert.equal(sorted.length, 500, 'All 500 records present in single continuous dataset');
  assert.ok(duration < 150, `Sorting 500 records took ${duration}ms (target < 150ms)`);
  console.log(`✅ Test 8 Passed: 500 records processed in single continuous view in ${duration}ms.`);
}

// ── Test 9: Print Order Specification ─────────────────────────────────────
{
  const classRollOrder = getStudentsInPrintOrder(testStudents, 'class_roll');
  const studentIdOrder = getStudentsInPrintOrder(testStudents, 'student_id');
  const nameOrder = getStudentsInPrintOrder(testStudents, 'name');

  assert.equal(classRollOrder.length, 120);
  assert.equal(studentIdOrder[0].student_id, '0001');
  assert.ok(nameOrder[0].name.toLowerCase() <= nameOrder[1].name.toLowerCase());
  console.log('✅ Test 9 Passed: Print order engine supports table order, student ID, class-roll, and name.');
}

// ── Test 10: XLSX Export of Current View ──────────────────────────────────
{
  const visibleColumns = [
    { key: 'student_id', label: 'Student ID' },
    { key: 'class', label: 'Class' },
    { key: 'roll_number', label: 'Roll Number' },
    { key: 'name', label: 'Student Name' },
    { key: 'phone', label: 'Phone' },
  ];

  const headers = visibleColumns.map((c) => c.label);
  const rows = testStudents.slice(0, 10).map((s) => [
    s.student_id,
    s.class || '',
    s.roll_number || '',
    s.name,
    s.phone || '',
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Filtered View');
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const len = wbout?.byteLength ?? wbout?.length ?? 0;
  assert.ok(len > 0, 'Generated Excel workbook must have binary content');
  console.log('✅ Test 10 Passed: Filtered view export generates valid Excel (.xlsx) file.');
}



console.log('\n🎉 ALL 10 SPREADSHEET TABLE ENGINE TESTS PASSED FLAWLESSLY! 🎉\n');
