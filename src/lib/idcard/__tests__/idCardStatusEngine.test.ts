import { describe, it, expect, beforeEach } from 'vitest';
import type { IdCardPerson, IdCardTemplate, IdCardGeneration, TemplateLayout } from '../types';
import {
  validateStudentForIdCard,
  computeStudentIdCardStatus,
  detectStudentDataOutdated,
  partitionStudentsByReadiness,
} from '../statusEngine';
import {
  recordPrintSuccess,
  recordPrintFailure,
  recordReprintRequest,
  getPrintStats,
  getPrintHistory,
} from '../printTracker';

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

describe('ID Card Readiness, Validation & Status Engine', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('1. validateStudentForIdCard', () => {
    it('accurately identifies complete student as ready', () => {
      const result = validateStudentForIdCard(completeStudent, null, sampleTemplate);
      expect(result.ready).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('accurately identifies incomplete student as NOT ready with exact missing fields', () => {
      const result = validateStudentForIdCard(incompleteStudent, null, sampleTemplate);
      expect(result.ready).toBe(false);
      expect(result.missingFields).toContain('Student Photo');
      expect(result.missingFields).toContain('Class');
      expect(result.missingFields).toContain('Blood Group');
      expect(result.missingFields).toContain('Phone');
    });

    it('generates itemized checklist with complete and missing status flags', () => {
      const result = validateStudentForIdCard(incompleteStudent, null, sampleTemplate);
      const photoItem = result.checklist.find((c) => c.key === 'student_photo');
      const nameItem = result.checklist.find((c) => c.key === 'student_name');

      expect(photoItem?.complete).toBe(false);
      expect(nameItem?.complete).toBe(true);
      expect(nameItem?.value).toBe('Rahul Kumar');
    });
  });

  describe('2. computeStudentIdCardStatus & Status Transitions', () => {
    it('returns NOT_READY for incomplete student', () => {
      const statusInfo = computeStudentIdCardStatus({
        person: incompleteStudent,
        template: sampleTemplate,
        latestGen: null,
      });

      expect(statusInfo.status).toBe('NOT_READY');
      expect(statusInfo.canGenerate).toBe(false);
      expect(statusInfo.canPrint).toBe(false);
      expect(statusInfo.missingFields.length).toBeGreaterThan(0);
    });

    it('returns READY_TO_GENERATE for complete student without generation record', () => {
      const statusInfo = computeStudentIdCardStatus({
        person: completeStudent,
        template: sampleTemplate,
        latestGen: null,
      });

      expect(statusInfo.status).toBe('READY_TO_GENERATE');
      expect(statusInfo.canGenerate).toBe(true);
      expect(statusInfo.canPrint).toBe(false);
    });

    it('returns READY_TO_PRINT after successful generation', () => {
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

      expect(statusInfo.status).toBe('READY_TO_PRINT');
      expect(statusInfo.canPrint).toBe(true);
      expect(statusInfo.printCount).toBe(0);
    });

    it('returns PRINTED after confirmed print operation', () => {
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

      expect(statusInfo.status).toBe('PRINTED');
      expect(statusInfo.printCount).toBe(1);
      expect(statusInfo.canPrint).toBe(false); // Prevents accidental duplicate print
    });

    it('returns PRINT_FAILED when print attempt fails', () => {
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

      recordPrintFailure('proj_001', completeStudent, 'Paper jam during printing', generation.id);

      const statusInfo = computeStudentIdCardStatus({
        person: completeStudent,
        template: sampleTemplate,
        latestGen: generation,
      });

      expect(statusInfo.status).toBe('PRINT_FAILED');
      expect(statusInfo.canPrint).toBe(true); // Eligible for retry print
    });

    it('returns REPRINT_REQUIRED when explicit reprint is requested', () => {
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
      recordReprintRequest('proj_001', completeStudent, 'DAMAGED_CARD', 'Card physically cracked');

      const statusInfo = computeStudentIdCardStatus({
        person: completeStudent,
        template: sampleTemplate,
        latestGen: generation,
      });

      expect(statusInfo.status).toBe('REPRINT_REQUIRED');
      expect(statusInfo.canPrint).toBe(true);
      expect(statusInfo.reprintReason).toBe('DAMAGED_CARD');
    });

    it('returns OUTDATED when student data is modified after generation timestamp', () => {
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

      const updatedStudent: IdCardPerson = {
        ...completeStudent,
        phone: '9123456789', // phone changed
        updated_at: '2026-08-30T10:20:00Z', // 10 mins after generation
      };

      const statusInfo = computeStudentIdCardStatus({
        person: updatedStudent,
        template: sampleTemplate,
        latestGen: generation,
      });

      expect(statusInfo.status).toBe('OUTDATED');
      expect(statusInfo.isOutdated).toBe(true);
      expect(statusInfo.canGenerate).toBe(true); // Must regenerate
    });
  });

  describe('3. partitionStudentsByReadiness (Bulk Safety)', () => {
    it('safely separates ready students from incomplete students', () => {
      const batch = [completeStudent, incompleteStudent];
      const { readyStudents, notReadyStudents } = partitionStudentsByReadiness(
        batch,
        null,
        sampleTemplate
      );

      expect(readyStudents).toHaveLength(1);
      expect(readyStudents[0].id).toBe(completeStudent.id);

      expect(notReadyStudents).toHaveLength(1);
      expect(notReadyStudents[0].person.id).toBe(incompleteStudent.id);
      expect(notReadyStudents[0].missingFields.length).toBeGreaterThan(0);
    });
  });

  describe('4. Print Tracker & History Audit Trail', () => {
    it('maintains complete chronological history without overwriting past entries', () => {
      recordPrintSuccess('proj_001', completeStudent, 'gen_1', 'Template v1');
      recordPrintFailure('proj_001', completeStudent, 'Printer offline');
      recordReprintRequest('proj_001', completeStudent, 'LOST_CARD', 'Student lost original');
      recordPrintSuccess('proj_001', completeStudent, 'gen_2', 'Template v2');

      const history = getPrintHistory('proj_001', completeStudent.id);
      expect(history).toHaveLength(4);

      const stats = getPrintStats('proj_001', completeStudent.id);
      expect(stats.printCount).toBe(2);
    });
  });
});
