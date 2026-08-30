import { strict as assert } from 'node:assert';
import type { IdCardPerson, IdCardTemplate, IdCardGeneration, TemplateLayout } from './types';
import {
  validateStudentForIdCard,
  computeStudentIdCardStatus,
  partitionStudentsByReadiness,
} from './statusEngine';
import {
  recordPrintSuccess,
  recordPrintFailure,
  recordReprintRequest,
  getPrintStats,
  getPrintHistory,
} from './printTracker';

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║   ID CARD READINESS, VALIDATION & STATUS ENGINE TESTS         ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// Mock localStorage for Node environment testing
const memoryStore: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => memoryStore[key] || null,
  setItem: (key: string, val: string) => { memoryStore[key] = String(val); },
  removeItem: (key: string) => { delete memoryStore[key]; },
  clear: () => { Object.keys(memoryStore).forEach((k) => delete memoryStore[k]); },
};

const sampleTemplateLayout: TemplateLayout = {
  backgroundColor: '#ffffff',
  fields: [
    { key: 'school_logo', x: 5, y: 5, width: 15, height: 15, visible: true, source: 'static' },
    { key: 'school_name', x: 25, y: 5, width: 50, height: 8, visible: true, source: 'static', value: 'Delhi Public School' },
    { key: 'student_photo', x: 5, y: 25, width: 25, height: 30, visible: true, required: true, source: 'dynamic' },
    { key: 'student_name', x: 35, y: 25, width: 45, height: 6, visible: true, required: true, source: 'dynamic' },
    { key: 'student_id', x: 35, y: 32, width: 45, height: 5, visible: true, required: true, source: 'dynamic' },
    { key: 'class', x: 35, y: 38, width: 20, height: 5, visible: true, required: true, source: 'dynamic' },
    { key: 'blood_group', x: 58, y: 38, width: 22, height: 5, visible: true, required: true, source: 'dynamic' },
    { key: 'phone', x: 35, y: 44, width: 45, height: 5, visible: true, required: true, source: 'dynamic' },
  ],
};

const sampleTemplate: IdCardTemplate = {
  id: 'tmpl_101',
  project_id: 'proj_001',
  name: 'Standard Landscape Template',
  card_width_mm: 85.6,
  card_height_mm: 54.0,
  background_url: null,
  created_by: 'user_1',
  created_at: '2026-08-30T10:00:00Z',
  updated_at: '2026-08-30T10:00:00Z',
  layout: sampleTemplateLayout,
};

const completeStudent: IdCardPerson = {
  id: 'person_1',
  project_id: 'proj_001',
  student_id: '0001',
  name: 'Olivia Wilson',
  class: '8th',
  section: 'A',
  roll_number: '12',
  date_of_birth: '2012-05-15',
  blood_group: 'B+',
  father_name: 'Bravia Wilson',
  mother_name: 'Diana Wilson',
  phone: '9876543210',
  emergency_number: '9905238015',
  address: '136-Anandpuri, Motihari, Bihar',
  photo_url: 'https://example.com/photos/olivia.jpg',
  created_at: '2026-08-30T10:05:00Z',
  updated_at: '2026-08-30T10:05:00Z',
};

const incompleteStudent: IdCardPerson = {
  id: 'person_2',
  project_id: 'proj_001',
  student_id: '0002',
  name: 'Rahul Kumar',
  class: null, // missing required class
  section: null,
  roll_number: null,
  date_of_birth: null,
  blood_group: null, // missing required blood group
  father_name: 'Suresh Kumar',
  mother_name: null,
  phone: null, // missing required phone
  emergency_number: null,
  address: 'Station Road',
  photo_url: null, // missing required photo
  created_at: '2026-08-30T10:05:00Z',
  updated_at: '2026-08-30T10:05:00Z',
};

// ── Test 1: validateStudentForIdCard ──────────────────────────────
{
  const result = validateStudentForIdCard(completeStudent, null, sampleTemplate);
  assert.equal(result.ready, true, 'Complete student must be ready');
  assert.equal(result.missingFields.length, 0, 'No missing fields for complete student');
  console.log('✅ Test 1 Passed: Complete student record passes validation as ready.');
}

// ── Test 2: Incomplete student validation & missing checklist ─────
{
  const result = validateStudentForIdCard(incompleteStudent, null, sampleTemplate);
  assert.equal(result.ready, false, 'Incomplete student must NOT be ready');
  assert.ok(result.missingFields.includes('Student Photo'), 'Must flag missing photo');
  assert.ok(result.missingFields.includes('Class'), 'Must flag missing class');
  assert.ok(result.missingFields.includes('Blood Group'), 'Must flag missing blood group');
  assert.ok(result.missingFields.includes('Phone'), 'Must flag missing phone');

  const photoCheck = result.checklist.find((c) => c.key === 'student_photo');
  const nameCheck = result.checklist.find((c) => c.key === 'student_name');
  assert.equal(photoCheck?.complete, false, 'Photo checklist item must be incomplete');
  assert.equal(nameCheck?.complete, true, 'Name checklist item must be complete');
  console.log('✅ Test 2 Passed: Incomplete student accurately flags missing fields in checklist.');
}

// ── Test 3: Status computation: NOT_READY ────────────────────────
{
  const statusInfo = computeStudentIdCardStatus({
    person: incompleteStudent,
    template: sampleTemplate,
    latestGen: null,
  });

  assert.equal(statusInfo.status, 'NOT_READY');
  assert.equal(statusInfo.canGenerate, false);
  assert.equal(statusInfo.canPrint, false);
  console.log('✅ Test 3 Passed: Incomplete student is locked into NOT_READY status.');
}

// ── Test 4: Status computation: READY_TO_GENERATE ────────────────
{
  const statusInfo = computeStudentIdCardStatus({
    person: completeStudent,
    template: sampleTemplate,
    latestGen: null,
  });

  assert.equal(statusInfo.status, 'READY_TO_GENERATE');
  assert.equal(statusInfo.canGenerate, true);
  assert.equal(statusInfo.canPrint, false);
  console.log('✅ Test 4 Passed: Fully validated student with no generation is READY_TO_GENERATE.');
}

// ── Test 5: Status computation: READY_TO_PRINT ───────────────────
{
  const generation: IdCardGeneration = {
    id: 'gen_101',
    project_id: 'proj_001',
    person_id: completeStudent.id,
    template_id: sampleTemplate.id,
    status: 'SUCCESS',
    file_url: 'https://example.com/cards/0001.png',
    error_message: null,
    generated_by: 'admin',
    created_at: '2026-08-30T10:10:00Z',
    printed_at: null,
  };

  const statusInfo = computeStudentIdCardStatus({
    person: completeStudent,
    template: sampleTemplate,
    latestGen: generation,
  });

  assert.equal(statusInfo.status, 'READY_TO_PRINT');
  assert.equal(statusInfo.canPrint, true);
  assert.equal(statusInfo.printCount, 0);
  console.log('✅ Test 5 Passed: Successfully generated card becomes READY_TO_PRINT.');
}

// ── Test 6: Status computation: PRINTED & Duplicate Prevention ───
{
  const generation: IdCardGeneration = {
    id: 'gen_101',
    project_id: 'proj_001',
    person_id: completeStudent.id,
    template_id: sampleTemplate.id,
    status: 'SUCCESS',
    file_url: 'https://example.com/cards/0001.png',
    error_message: null,
    generated_by: 'admin',
    created_at: '2026-08-30T10:10:00Z',
    printed_at: '2026-08-30T10:15:00Z',
  };

  recordPrintSuccess('proj_001', completeStudent, generation.id, sampleTemplate.name);

  const statusInfo = computeStudentIdCardStatus({
    person: completeStudent,
    template: sampleTemplate,
    latestGen: generation,
  });

  assert.equal(statusInfo.status, 'PRINTED');
  assert.equal(statusInfo.printCount, 1);
  assert.equal(statusInfo.canPrint, false, 'PRINTED card must NOT allow accidental duplicate print');
  console.log('✅ Test 6 Passed: Confirmed print updates status to PRINTED with duplicate protection.');
}

// ── Test 7: Status computation: PRINT_FAILED & Retry Print ───────
{
  const student3: IdCardPerson = { ...completeStudent, id: 'person_3', student_id: '0003' };
  const generation: IdCardGeneration = {
    id: 'gen_103',
    project_id: 'proj_001',
    person_id: student3.id,
    template_id: sampleTemplate.id,
    status: 'SUCCESS',
    file_url: 'https://example.com/cards/0003.png',
    error_message: null,
    generated_by: 'admin',
    created_at: '2026-08-30T10:10:00Z',
    printed_at: null,
  };

  recordPrintFailure('proj_001', student3, 'Paper jam during printing', generation.id);

  const statusInfo = computeStudentIdCardStatus({
    person: student3,
    template: sampleTemplate,
    latestGen: generation,
  });

  assert.equal(statusInfo.status, 'PRINT_FAILED');
  assert.equal(statusInfo.canPrint, true, 'PRINT_FAILED card must allow Retry Print');
  console.log('✅ Test 7 Passed: Interrupted print operation sets status to PRINT_FAILED.');
}

// ── Test 8: Status computation: REPRINT_REQUIRED ─────────────────
{
  const student4: IdCardPerson = { ...completeStudent, id: 'person_4', student_id: '0004' };
  const generation: IdCardGeneration = {
    id: 'gen_104',
    project_id: 'proj_001',
    person_id: student4.id,
    template_id: sampleTemplate.id,
    status: 'SUCCESS',
    file_url: 'https://example.com/cards/0004.png',
    error_message: null,
    generated_by: 'admin',
    created_at: '2026-08-30T10:10:00Z',
    printed_at: '2026-08-30T10:15:00Z',
  };

  recordPrintSuccess('proj_001', student4, generation.id, sampleTemplate.name);
  recordReprintRequest('proj_001', student4, 'DAMAGED_CARD', 'Physical card cracked');

  const statusInfo = computeStudentIdCardStatus({
    person: student4,
    template: sampleTemplate,
    latestGen: generation,
  });

  assert.equal(statusInfo.status, 'REPRINT_REQUIRED');
  assert.equal(statusInfo.canPrint, true);
  assert.equal(statusInfo.reprintReason, 'DAMAGED_CARD');
  console.log('✅ Test 8 Passed: Official reprint request updates status to REPRINT_REQUIRED.');
}

// ── Test 9: Status computation: OUTDATED (Data Changed After Print)
{
  const student5: IdCardPerson = { ...completeStudent, id: 'person_5', student_id: '0005' };
  const generation: IdCardGeneration = {
    id: 'gen_105',
    project_id: 'proj_001',
    person_id: student5.id,
    template_id: sampleTemplate.id,
    status: 'SUCCESS',
    file_url: 'https://example.com/cards/0005.png',
    error_message: null,
    generated_by: 'admin',
    created_at: '2026-08-30T10:10:00Z',
    printed_at: '2026-08-30T10:15:00Z',
  };

  const updatedStudent5: IdCardPerson = {
    ...student5,
    phone: '9988776655', // student phone updated after card generated
    updated_at: '2026-08-30T10:25:00Z',
  };

  const statusInfo = computeStudentIdCardStatus({
    person: updatedStudent5,
    template: sampleTemplate,
    latestGen: generation,
  });

  assert.equal(statusInfo.status, 'OUTDATED');
  assert.equal(statusInfo.isOutdated, true);
  assert.equal(statusInfo.canGenerate, true, 'Outdated card must be eligible for regeneration');
  console.log('✅ Test 9 Passed: Modifying student data after generation flags card as OUTDATED.');
}

// ── Test 10: partitionStudentsByReadiness for Bulk Operations ─────
{
  const batch = [completeStudent, incompleteStudent];
  const { readyStudents, notReadyStudents } = partitionStudentsByReadiness(
    batch,
    null,
    sampleTemplate
  );

  assert.equal(readyStudents.length, 1);
  assert.equal(readyStudents[0].id, completeStudent.id);
  assert.equal(notReadyStudents.length, 1);
  assert.equal(notReadyStudents[0].person.id, incompleteStudent.id);
  console.log('✅ Test 10 Passed: Bulk operations strictly partition ready vs skipped students.');
}

// ── Test 11: Print Tracker Permanent History ───────────────────────
{
  const history = getPrintHistory('proj_001', completeStudent.id);
  assert.ok(history.length >= 1, 'History must contain print records');
  const stats = getPrintStats('proj_001', completeStudent.id);
  assert.ok(stats.printCount >= 1, 'Print stats must accurately report total print count');
  console.log('✅ Test 11 Passed: Permanent chronological audit history preserved.');
}

console.log('\n🎉 ALL 11 STATUS ENGINE & PRINT READINESS TESTS PASSED ACCURATELY! 🎉\n');
