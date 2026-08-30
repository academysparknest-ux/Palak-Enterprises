import {
  sortStudentRecords,
  sortStudentRecordsMulti,
  applyPrintOrdering,
} from './studentSort';
import type { IdCardPerson, StudentIdCardStatusInfo } from './types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`❌ Assertion failed: ${msg}`);
  }
  console.log(`✅ ${msg}`);
}

export async function runProductionTableTests() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   ADVANCED PRODUCTION TABLE & PRINT MANAGEMENT TESTS          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const mockStudents: IdCardPerson[] = [
    {
      id: 'p-1',
      project_id: 'proj-1',
      student_id: '0010',
      name: 'Rohan Sharma',
      class: '10th',
      section: 'A',
      roll_number: '25',
      photo_url: 'https://example.com/p1.jpg',
      date_of_birth: '2008-05-10',
      blood_group: 'O+',
      father_name: 'Suresh Sharma',
      mother_name: 'Anita Sharma',
      phone: '9876543210',
      address: 'Dehradun',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
    },
    {
      id: 'p-2',
      project_id: 'proj-1',
      student_id: '0001',
      name: 'Aanya Verma',
      class: '8th',
      section: 'B',
      roll_number: '5',
      photo_url: 'https://example.com/p2.jpg',
      date_of_birth: '2010-02-14',
      blood_group: 'B+',
      father_name: 'Rajesh Verma',
      mother_name: 'Sunita Verma',
      phone: '9876543211',
      address: 'Dehradun',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
    },
    {
      id: 'p-3',
      project_id: 'proj-1',
      student_id: '0002',
      name: 'Kabir Mehta',
      class: '8th',
      section: 'A',
      roll_number: '2',
      photo_url: null,
      date_of_birth: '2010-08-20',
      blood_group: 'A+',
      father_name: 'Alok Mehta',
      mother_name: 'Neeta Mehta',
      phone: '9876543212',
      address: 'Dehradun',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
    },
    {
      id: 'p-4',
      project_id: 'proj-1',
      student_id: '0100',
      name: 'Diya Patel',
      class: '2nd',
      section: 'A',
      roll_number: '12',
      photo_url: 'https://example.com/p4.jpg',
      date_of_birth: '2016-11-01',
      blood_group: 'AB+',
      father_name: 'Vikram Patel',
      mother_name: 'Pooja Patel',
      phone: '9876543213',
      address: 'Dehradun',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
    },
  ];

  const mockStatusMap = new Map<string, StudentIdCardStatusInfo>([
    [
      'p-1',
      {
        status: 'PRINTED',
        ready: true,
        missingFields: [],
        missingFieldKeys: [],
        lastGeneration: {
          id: 'gen-1',
          project_id: 'proj-1',
          person_id: 'p-1',
          template_id: 'tmpl-1',
          status: 'SUCCESS',
          file_url: 'https://example.com/c1.png',
          error_message: null,
          generated_by: 'admin',
          created_at: '2026-08-15T10:00:00Z',
          printed_at: '2026-08-15T10:30:00Z',
        },
        printCount: 1,
        lastPrintedAt: '2026-08-15T10:30:00Z',
        isOutdated: false,
        canGenerate: true,
        canPrint: false,
      },
    ],
    [
      'p-2',
      {
        status: 'READY_TO_PRINT',
        ready: true,
        missingFields: [],
        missingFieldKeys: [],
        lastGeneration: {
          id: 'gen-2',
          project_id: 'proj-1',
          person_id: 'p-2',
          template_id: 'tmpl-1',
          status: 'SUCCESS',
          file_url: 'https://example.com/c2.png',
          error_message: null,
          generated_by: 'admin',
          created_at: '2026-08-16T11:00:00Z',
          printed_at: null,
        },
        printCount: 0,
        lastPrintedAt: null,
        isOutdated: false,
        canGenerate: true,
        canPrint: true,
      },
    ],
    [
      'p-3',
      {
        status: 'NOT_READY',
        ready: false,
        missingFields: ['Photo'],
        missingFieldKeys: ['student_photo'],
        lastGeneration: null,
        printCount: 0,
        lastPrintedAt: null,
        isOutdated: false,
        canGenerate: false,
        canPrint: false,
      },
    ],
    [
      'p-4',
      {
        status: 'READY_TO_GENERATE',
        ready: true,
        missingFields: [],
        missingFieldKeys: [],
        lastGeneration: null,
        printCount: 0,
        lastPrintedAt: null,
        isOutdated: false,
        canGenerate: true,
        canPrint: false,
      },
    ],
  ]);

  // Test 1: Numeric Student ID sorting preserving leading zeros
  console.log('── Test 1: Numeric Student ID Sorting ──');
  const sortedByIdAsc = sortStudentRecords(mockStudents, { field: 'student_id', ascending: true });
  assert(sortedByIdAsc[0].student_id === '0001', '0001 comes first in numeric ascending');
  assert(sortedByIdAsc[1].student_id === '0002', '0002 comes second');
  assert(sortedByIdAsc[2].student_id === '0010', '0010 comes third');
  assert(sortedByIdAsc[3].student_id === '0100', '0100 comes fourth');

  const sortedByIdDesc = sortStudentRecords(mockStudents, { field: 'student_id', ascending: false });
  assert(sortedByIdDesc[0].student_id === '0100', '0100 comes first in numeric descending');
  assert(sortedByIdDesc[3].student_id === '0001', '0001 comes last in numeric descending');

  // Test 2: Multi-Column Sorting (Class Ascending -> Roll Number Ascending)
  console.log('\n── Test 2: Multi-Column Sorting Hierarchy (Class -> Roll) ──');
  const sortedMulti = sortStudentRecordsMulti(
    mockStudents,
    [
      { field: 'class', ascending: true },
      { field: 'roll_number', ascending: true },
    ],
    mockStatusMap
  );
  assert(sortedMulti[0].class === '2nd', 'Class 2nd comes before 8th and 10th');
  assert(sortedMulti[1].class === '8th' && sortedMulti[1].roll_number === '2', 'Class 8th Roll 2 comes before Roll 5');
  assert(sortedMulti[2].class === '8th' && sortedMulti[2].roll_number === '5', 'Class 8th Roll 5 comes next');
  assert(sortedMulti[3].class === '10th', 'Class 10th comes last');

  // Test 3: Print Order Strategies
  console.log('\n── Test 3: Print Order Strategies ──');
  const orderById = applyPrintOrdering(mockStudents, 'student_id', undefined, mockStatusMap);
  assert(orderById[0].student_id === '0001', 'Print Order student_id puts 0001 first');

  const orderByClassRoll = applyPrintOrdering(mockStudents, 'class_roll', undefined, mockStatusMap);
  assert(orderByClassRoll[0].class === '2nd', 'Print Order class_roll puts 2nd grade first');

  const orderByName = applyPrintOrdering(mockStudents, 'name', undefined, mockStatusMap);
  assert(orderByName[0].name === 'Aanya Verma', 'Print Order name puts Aanya first');

  const tableOrder = [mockStudents[3], mockStudents[0], mockStudents[1], mockStudents[2]];
  const orderByTable = applyPrintOrdering(mockStudents, 'table_order', tableOrder, mockStatusMap);
  assert(orderByTable[0].student_id === '0100', 'Print Order table_order exactly preserves custom table view');

  // Test 4: Information Readiness & Status Comparators
  console.log('\n── Test 4: Information Readiness and Print Count Comparators ──');
  const sortedByInfo = sortStudentRecords(mockStudents, {
    field: 'information',
    ascending: true,
    statusMap: mockStatusMap,
  });
  assert(mockStatusMap.get(sortedByInfo[0].id)?.ready === true, 'Complete student record sorted first');
  assert(mockStatusMap.get(sortedByInfo[sortedByInfo.length - 1].id)?.ready === false, 'Incomplete record sorted last');

  const sortedByPrintCount = sortStudentRecords(mockStudents, {
    field: 'print_count',
    ascending: false,
    statusMap: mockStatusMap,
  });
  assert(mockStatusMap.get(sortedByPrintCount[0].id)?.printCount === 1, 'Highest print count sorted first in descending');

  // Test 5: Row Integrity Preservation
  console.log('\n── Test 5: Whole Student Row Integrity Invariant ──');
  for (const s of sortedMulti) {
    if (s.student_id === '0001') {
      assert(s.name === 'Aanya Verma', 'Aanya Verma maintains ID 0001');
      assert(s.father_name === 'Rajesh Verma', 'Rajesh Verma maintains relationship with Aanya');
      assert(s.class === '8th', 'Class 8th maintains relationship with Aanya');
    }
  }

  console.log('\n🎉 ALL PRODUCTION TABLE & PRINT ORDER TESTS PASSED SUCCESSFULLY! 🎉\n');
}

// Direct runner
runProductionTableTests().catch((err) => {
  console.error(err);
  process.exit(1);
});

