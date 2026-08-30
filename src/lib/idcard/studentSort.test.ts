import {
  compareStudentId,
  compareClass,
  compareRollNumber,
  compareDob,
  compareText,
  sortStudentRecords,
} from './studentSort';
import type { IdCardPerson } from './types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✓ ${msg}`);
  }
}

console.log('--- TESTING STUDENT SORT ENGINE ---');

// 1. Student ID numeric sorting
const ids = ['0100', '0002', '10', '0001', '2', '11', '1', '0010'];
const sortedIds = [...ids].sort(compareStudentId);
console.log('Sorted IDs:', sortedIds);
assert(sortedIds[0] === '0001' || sortedIds[0] === '1', 'Smallest ID first');
assert(sortedIds[sortedIds.length - 1] === '0100', '0100 is last');
// Test exact sequence of numbers 1, 2, 10, 11, 100
const rawNums = ['100', '2', '1', '11', '10'];
const sortedNums = [...rawNums].sort(compareStudentId);
assert(JSON.stringify(sortedNums) === JSON.stringify(['1', '2', '10', '11', '100']), 'Numeric IDs sort 1, 2, 10, 11, 100');

// 2. Class intelligent sorting
const classes = ['12th', 'Nursery', '10th', '1st', 'LKG', '2nd', 'UKG', '8th', 'Pre-Nursery'];
const sortedClasses = [...classes].sort((a, b) => compareClass(a, null, b, null));
console.log('Sorted Classes:', sortedClasses);
assert(sortedClasses[0] === 'Pre-Nursery', 'Pre-Nursery comes first');
assert(sortedClasses[1] === 'Nursery', 'Nursery comes second');
assert(sortedClasses[2] === 'LKG', 'LKG comes third');
assert(sortedClasses[3] === 'UKG', 'UKG comes fourth');
assert(sortedClasses[4] === '1st', '1st comes fifth');
assert(sortedClasses[5] === '2nd', '2nd comes sixth');
assert(sortedClasses[6] === '8th', '8th comes seventh');
assert(sortedClasses[7] === '10th', '10th comes eighth');
assert(sortedClasses[8] === '12th', '12th comes last');

// 3. Roll number numeric sorting
const rolls = ['20', '2', '1', '11', '3', '10'];
const sortedRolls = [...rolls].sort(compareRollNumber);
assert(JSON.stringify(sortedRolls) === JSON.stringify(['1', '2', '3', '10', '11', '20']), 'Roll numbers sort numerically');

// 4. DOB chronological sorting
const dobs = ['20/03/2010', '01/01/2010', '15/02/2010', '2010-05-15'];
const sortedDobs = [...dobs].sort(compareDob);
console.log('Sorted DOBs:', sortedDobs);
assert(sortedDobs[0] === '01/01/2010', 'Jan 1 2010 first');
assert(sortedDobs[1] === '15/02/2010', 'Feb 15 2010 second');
assert(sortedDobs[2] === '20/03/2010', 'Mar 20 2010 third');
assert(sortedDobs[3] === '2010-05-15', 'May 15 2010 fourth');

// 5. Case-insensitive alphabetical sorting
const names = ['rahul kumar', 'Amit Sharma', 'priya patel', 'anil mehta'];
const sortedNames = [...names].sort(compareText);
console.log('Sorted Names:', sortedNames);
assert(sortedNames[0] === 'Amit Sharma' || sortedNames[0] === 'anil mehta', 'A names first');
assert(sortedNames[3] === 'rahul kumar', 'R names last');

// 6. Complete Record Integrity
const sampleStudents: IdCardPerson[] = [
  {
    id: 'p-1',
    project_id: 'proj-1',
    student_id: '0025',
    name: 'Rahul Kumar',
    class: '8th',
    section: 'A',
    roll_number: '15',
    father_name: 'Raj Kumar',
    mother_name: 'Sunita Kumar',
    phone: '9876543210',
    address: '123 Main St',
    date_of_birth: '15/08/2011',
    blood_group: 'B+',
    photo_url: 'https://example.com/rahul.jpg',
    created_at: '',
    updated_at: '',
  },
  {
    id: 'p-2',
    project_id: 'proj-1',
    student_id: '0002',
    name: 'Aanya Sharma',
    class: '2nd',
    section: 'B',
    roll_number: '5',
    father_name: 'Amit Sharma',
    mother_name: 'Pooja Sharma',
    phone: '9876543211',
    address: '456 Park Ave',
    date_of_birth: '10/01/2017',
    blood_group: 'O+',
    photo_url: null,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'p-3',
    project_id: 'proj-1',
    student_id: '0001',
    name: 'Zoya Khan',
    class: '10th',
    section: 'A',
    roll_number: '1',
    father_name: 'Tariq Khan',
    mother_name: 'Salma Khan',
    phone: '9876543212',
    address: '789 City Rd',
    date_of_birth: '01/01/2009',
    blood_group: 'A+',
    photo_url: 'https://example.com/zoya.jpg',
    created_at: '',
    updated_at: '',
  },
];

// Sort by Student ID ASC
const sortedById = sortStudentRecords(sampleStudents, { field: 'student_id', ascending: true });
assert(sortedById[0].student_id === '0001', '0001 first');
assert(sortedById[0].name === 'Zoya Khan', 'Row integrity preserved: Zoya Khan is 0001');
assert(sortedById[0].father_name === 'Tariq Khan', 'Tariq Khan stays with Zoya');
assert(sortedById[1].student_id === '0002', '0002 second');
assert(sortedById[2].student_id === '0025', '0025 third');
assert(sortedById[2].name === 'Rahul Kumar', 'Rahul Kumar stays with 0025');

// Sort by Name ASC
const sortedByName = sortStudentRecords(sampleStudents, { field: 'name', ascending: true });
assert(sortedByName[0].name === 'Aanya Sharma', 'Aanya Sharma is first');
assert(sortedByName[0].student_id === '0002', 'Aanya keeps ID 0002');
assert(sortedByName[2].name === 'Zoya Khan', 'Zoya Khan is last');

// Sort by Class ASC
const sortedByClass = sortStudentRecords(sampleStudents, { field: 'class', ascending: true });
assert(sortedByClass[0].class === '2nd', '2nd is first');
assert(sortedByClass[1].class === '8th', '8th is second');
assert(sortedByClass[2].class === '10th', '10th is third');

// Sort by Photo ASC (Has photo first)
const sortedByPhoto = sortStudentRecords(sampleStudents, { field: 'photo', ascending: true });
assert(Boolean(sortedByPhoto[0].photo_url), 'First has photo');
assert(Boolean(sortedByPhoto[1].photo_url), 'Second has photo');
assert(!sortedByPhoto[2].photo_url, 'Third does not have photo');

console.log('🎉 ALL STUDENT SORT TESTS PASSED SUCCESSFULLY!');
