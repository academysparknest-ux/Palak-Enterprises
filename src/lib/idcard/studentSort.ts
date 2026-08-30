import type { IdCardPerson, StudentIdCardStatusInfo } from './types';
import { normalizeDate } from './validation';

export type StudentSortField =
  | 'student_id'
  | 'name'
  | 'class'
  | 'roll_number'
  | 'father_name'
  | 'mother_name'
  | 'phone'
  | 'address'
  | 'date_of_birth'
  | 'blood_group'
  | 'photo'
  | 'status'
  | 'information'
  | 'generated'
  | 'printed'
  | 'print_count'
  | 'updated_at';

export interface SortRule {
  field: StudentSortField;
  ascending: boolean;
}

export interface SortOptions {
  field: StudentSortField;
  ascending: boolean;
  statusMap?: Map<string, StudentIdCardStatusInfo>;
}

export type PrintOrderMode =
  | 'table_order'
  | 'custom'
  | 'class_roll'
  | 'student_id'
  | 'name'
  | 'print_status'
  | 'default';

/**
 * Extracts a numeric value from a student ID or string if possible.
 */
export function extractNumericPart(val?: string | null): { hasNumber: boolean; num: number; raw: string } {
  if (!val) return { hasNumber: false, num: 0, raw: '' };
  const raw = String(val).trim();
  const match = raw.match(/\d+/);
  if (match) {
    return {
      hasNumber: true,
      num: parseInt(match[0], 10),
      raw,
    };
  }
  return { hasNumber: false, num: 0, raw };
}

/**
 * Intelligent comparator for Student IDs.
 * Correctly sorts 1, 2, 10, 11, 100 as well as 0001, 0002, 0010, 0100 numerically.
 */
export function compareStudentId(a?: string | null, b?: string | null): number {
  const strA = (a || '').trim();
  const strB = (b || '').trim();
  if (!strA && !strB) return 0;
  if (!strA) return 1;
  if (!strB) return -1;

  const parsedA = extractNumericPart(strA);
  const parsedB = extractNumericPart(strB);

  // If both have numbers
  if (parsedA.hasNumber && parsedB.hasNumber) {
    if (parsedA.num !== parsedB.num) {
      return parsedA.num - parsedB.num;
    }
    // Tiebreak with exact natural string
    return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
  }

  // Fallback to natural string sort
  return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Maps preschool and kindergarten grades to relative negative rankings.
 */
export function getPreschoolRank(classStr: string): number | null {
  const s = classStr.toLowerCase().replace(/[\s\-_]/g, '');
  if (s.includes('prenursery') || s.includes('playgroup') || s === 'pg') return -5;
  if (s.includes('nursery') || s === 'nur') return -4;
  if (s.includes('lkg') || s.includes('lowerkg') || s.includes('jrkg') || s.includes('juniorkg') || s === 'pp1') return -3;
  if (s.includes('ukg') || s.includes('upperkg') || s.includes('srkg') || s.includes('seniorkg') || s === 'pp2' || s === 'prep' || s === 'kg') return -2;
  return null;
}

/**
 * Intelligent comparator for school Classes (e.g. Nursery, LKG, 1st, 2nd... 10th, 11th, 12th).
 */
export function compareClass(
  classA?: string | null,
  secA?: string | null,
  classB?: string | null,
  secB?: string | null
): number {
  const strA = (classA || '').trim();
  const strB = (classB || '').trim();
  if (!strA && !strB) return 0;
  if (!strA) return 1;
  if (!strB) return -1;

  const preA = getPreschoolRank(strA);
  const preB = getPreschoolRank(strB);

  if (preA !== null && preB !== null) {
    if (preA !== preB) return preA - preB;
  } else if (preA !== null) {
    return -1; // Preschool before numerical grades
  } else if (preB !== null) {
    return 1;
  } else {
    // Check numeric grade (e.g., "1st", "10th", "Class 5")
    const matchA = strA.match(/\d+/);
    const matchB = strB.match(/\d+/);

    if (matchA && matchB) {
      const numA = parseInt(matchA[0], 10);
      const numB = parseInt(matchB[0], 10);
      if (numA !== numB) return numA - numB;
    } else if (matchA) {
      return -1;
    } else if (matchB) {
      return 1;
    } else {
      const textDiff = strA.localeCompare(strB, undefined, { sensitivity: 'base', numeric: true });
      if (textDiff !== 0) return textDiff;
    }
  }

  // Tiebreaker: Section (e.g. A, B, C)
  const sA = (secA || '').trim();
  const sB = (secB || '').trim();
  return sA.localeCompare(sB, undefined, { sensitivity: 'base', numeric: true });
}

/**
 * Numeric comparator for Roll Numbers (1, 2, 3, 10, 11, 20...).
 */
export function compareRollNumber(a?: string | null, b?: string | null): number {
  const strA = (a || '').trim();
  const strB = (b || '').trim();
  if (!strA && !strB) return 0;
  if (!strA) return 1;
  if (!strB) return -1;

  const numA = parseInt(strA, 10);
  const numB = parseInt(strB, 10);

  if (!isNaN(numA) && !isNaN(numB)) {
    if (numA !== numB) return numA - numB;
  }

  return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Chronological comparator for Date of Birth.
 */
export function compareDob(a?: string | null, b?: string | null): number {
  const strA = (a || '').trim();
  const strB = (b || '').trim();
  if (!strA && !strB) return 0;
  if (!strA) return 1;
  if (!strB) return -1;

  const normA = normalizeDate(strA);
  const normB = normalizeDate(strB);

  const timeA = normA ? Date.parse(normA) : NaN;
  const timeB = normB ? Date.parse(normB) : NaN;

  if (!isNaN(timeA) && !isNaN(timeB)) {
    return timeA - timeB;
  }
  if (!isNaN(timeA)) return -1;
  if (!isNaN(timeB)) return 1;

  return strA.localeCompare(strB, undefined, { numeric: true });
}

/**
 * Case-insensitive natural alphabetical comparator for text (Name, Parent, Address, etc.).
 */
export function compareText(a?: string | null, b?: string | null): number {
  const strA = (a || '').trim();
  const strB = (b || '').trim();
  if (!strA && !strB) return 0;
  if (!strA) return 1;
  if (!strB) return -1;

  return strA.localeCompare(strB, undefined, { sensitivity: 'base', numeric: true });
}

/**
 * Blood group rank comparator.
 */
const BLOOD_GROUP_RANK: Record<string, number> = {
  'A+': 1,
  'A-': 2,
  'B+': 3,
  'B-': 4,
  'AB+': 5,
  'AB-': 6,
  'O+': 7,
  'O-': 8,
};

export function compareBloodGroup(a?: string | null, b?: string | null): number {
  const strA = (a || '').trim().toUpperCase();
  const strB = (b || '').trim().toUpperCase();
  if (!strA && !strB) return 0;
  if (!strA) return 1;
  if (!strB) return -1;

  const rankA = BLOOD_GROUP_RANK[strA] ?? 99;
  const rankB = BLOOD_GROUP_RANK[strB] ?? 99;

  if (rankA !== rankB) return rankA - rankB;
  return strA.localeCompare(strB);
}

/**
 * Status priority rank comparator for ID card workflow.
 */
const STATUS_RANK: Record<string, number> = {
  NOT_READY: 1,
  READY_TO_GENERATE: 2,
  READY_TO_PRINT: 3,
  PRINTED: 4,
  PRINT_FAILED: 5,
  REPRINT_REQUIRED: 6,
  OUTDATED: 7,
};

export function compareStatus(
  personA: IdCardPerson,
  personB: IdCardPerson,
  statusMap?: Map<string, StudentIdCardStatusInfo>
): number {
  const statusA = statusMap?.get(personA.id)?.status || 'NOT_READY';
  const statusB = statusMap?.get(personB.id)?.status || 'NOT_READY';

  const rankA = STATUS_RANK[statusA] ?? 99;
  const rankB = STATUS_RANK[statusB] ?? 99;

  if (rankA !== rankB) return rankA - rankB;
  // Tiebreak by student name
  return compareText(personA.name, personB.name);
}

/**
 * Comparator for Photo presence (Photo available vs missing).
 */
export function comparePhoto(a: IdCardPerson, b: IdCardPerson): number {
  const hasA = Boolean(a.photo_url && a.photo_url.trim().length > 0);
  const hasB = Boolean(b.photo_url && b.photo_url.trim().length > 0);

  if (hasA === hasB) {
    return compareStudentId(a.student_id, b.student_id);
  }
  // has photo comes first in ascending order
  return hasA ? -1 : 1;
}

export function compareInformation(
  personA: IdCardPerson,
  personB: IdCardPerson,
  statusMap?: Map<string, StudentIdCardStatusInfo>
): number {
  const infoA = statusMap?.get(personA.id);
  const infoB = statusMap?.get(personB.id);

  const missingA = infoA?.missingFields.length || 0;
  const missingB = infoB?.missingFields.length || 0;

  return missingA - missingB;
}

export function compareGenerated(
  personA: IdCardPerson,
  personB: IdCardPerson,
  statusMap?: Map<string, StudentIdCardStatusInfo>
): number {
  const genA = statusMap?.get(personA.id)?.lastGeneration ? 1 : 0;
  const genB = statusMap?.get(personB.id)?.lastGeneration ? 1 : 0;

  return genA - genB;
}

export function comparePrinted(
  personA: IdCardPerson,
  personB: IdCardPerson,
  statusMap?: Map<string, StudentIdCardStatusInfo>
): number {
  const printedA = (statusMap?.get(personA.id)?.printCount || 0) > 0 ? 1 : 0;
  const printedB = (statusMap?.get(personB.id)?.printCount || 0) > 0 ? 1 : 0;

  return printedA - printedB;
}

export function comparePrintCount(
  personA: IdCardPerson,
  personB: IdCardPerson,
  statusMap?: Map<string, StudentIdCardStatusInfo>
): number {
  const countA = statusMap?.get(personA.id)?.printCount || 0;
  const countB = statusMap?.get(personB.id)?.printCount || 0;

  return countA - countB;
}

/**
 * Single field comparison evaluator.
 */
function evaluateFieldComparison(
  a: IdCardPerson,
  b: IdCardPerson,
  field: StudentSortField,
  statusMap?: Map<string, StudentIdCardStatusInfo>
): number {
  switch (field) {
    case 'student_id':
      return compareStudentId(a.student_id, b.student_id);

    case 'name':
      return compareText(a.name, b.name);

    case 'class':
      return compareClass(a.class, a.section, b.class, b.section);

    case 'roll_number':
      return compareRollNumber(a.roll_number, b.roll_number);

    case 'father_name': {
      const parentA = a.father_name || a.mother_name || '';
      const parentB = b.father_name || b.mother_name || '';
      return compareText(parentA, parentB);
    }

    case 'mother_name':
      return compareText(a.mother_name, b.mother_name);

    case 'phone': {
      const phoneA = a.phone || a.emergency_number || '';
      const phoneB = b.phone || b.emergency_number || '';
      return compareText(phoneA, phoneB);
    }

    case 'address':
      return compareText(a.address, b.address);

    case 'date_of_birth':
      return compareDob(a.date_of_birth, b.date_of_birth);

    case 'blood_group':
      return compareBloodGroup(a.blood_group, b.blood_group);

    case 'photo':
      return comparePhoto(a, b);

    case 'status':
      return compareStatus(a, b, statusMap);

    case 'information':
      return compareInformation(a, b, statusMap);

    case 'generated':
      return compareGenerated(a, b, statusMap);

    case 'printed':
      return comparePrinted(a, b, statusMap);

    case 'print_count':
      return comparePrintCount(a, b, statusMap);

    case 'updated_at': {
      const timeA = a.updated_at ? Date.parse(a.updated_at) : 0;
      const timeB = b.updated_at ? Date.parse(b.updated_at) : 0;
      return timeA - timeB;
    }

    default:
      return compareStudentId(a.student_id, b.student_id);
  }
}

/**
 * Master sort function that sorts complete student records by single column.
 * NEVER sorts individual column arrays — always preserves whole student objects.
 */
export function sortStudentRecords(
  records: IdCardPerson[],
  options: SortOptions
): IdCardPerson[] {
  const { field, ascending, statusMap } = options;
  const sorted = [...records];

  sorted.sort((a, b) => {
    let diff = evaluateFieldComparison(a, b, field, statusMap);

    if (diff === 0 && field !== 'student_id') {
      diff = compareStudentId(a.student_id, b.student_id);
    }

    return ascending ? diff : -diff;
  });

  return sorted;
}

/**
 * Multi-level sorting function that cascades across multiple SortRules.
 */
export function sortStudentRecordsMulti(
  records: IdCardPerson[],
  rules: SortRule[],
  statusMap?: Map<string, StudentIdCardStatusInfo>
): IdCardPerson[] {
  if (!rules || rules.length === 0) {
    return sortStudentRecords(records, { field: 'student_id', ascending: true, statusMap });
  }

  const sorted = [...records];

  sorted.sort((a, b) => {
    for (const rule of rules) {
      const diff = evaluateFieldComparison(a, b, rule.field, statusMap);
      if (diff !== 0) {
        return rule.ascending ? diff : -diff;
      }
    }
    // Final tiebreaker by student ID
    return compareStudentId(a.student_id, b.student_id);
  });

  return sorted;
}

export const sortStudentsMulti = sortStudentRecordsMulti;

/**
 * Applies predefined or custom print ordering mode.
 */
export function applyPrintOrdering(
  records: IdCardPerson[],
  mode: PrintOrderMode | 'print_status' | 'custom',
  customRulesOrTableOrder?: SortRule[] | IdCardPerson[],
  statusMap?: Map<string, StudentIdCardStatusInfo>
): IdCardPerson[] {
  switch (mode) {
    case 'table_order':
      if (Array.isArray(customRulesOrTableOrder) && customRulesOrTableOrder.length > 0) {
        // If passed an array of persons representing current table view
        if ('student_id' in customRulesOrTableOrder[0]) {
          const tableList = customRulesOrTableOrder as IdCardPerson[];
          const targetIds = new Set(records.map((r) => r.id));
          const matched = tableList.filter((r) => targetIds.has(r.id));
          const missing = records.filter((r) => !matched.some((m) => m.id === r.id));
          return [...matched, ...missing];
        }
      }
      return sortStudentRecords(records, { field: 'student_id', ascending: true, statusMap });

    case 'class_roll':
      return sortStudentRecordsMulti(
        records,
        [
          { field: 'class', ascending: true },
          { field: 'roll_number', ascending: true },
          { field: 'student_id', ascending: true },
        ],
        statusMap
      );

    case 'student_id':
      return sortStudentRecords(records, { field: 'student_id', ascending: true, statusMap });

    case 'name':
      return sortStudentRecords(records, { field: 'name', ascending: true, statusMap });

    case 'print_status':
      return sortStudentRecordsMulti(
        records,
        [
          { field: 'status', ascending: true },
          { field: 'class', ascending: true },
          { field: 'roll_number', ascending: true },
        ],
        statusMap
      );

    case 'custom':
      if (Array.isArray(customRulesOrTableOrder) && customRulesOrTableOrder.length > 0 && 'field' in customRulesOrTableOrder[0]) {
        return sortStudentRecordsMulti(records, customRulesOrTableOrder as SortRule[], statusMap);
      }
      return sortStudentRecords(records, { field: 'student_id', ascending: true, statusMap });

    default:
      return sortStudentRecords(records, { field: 'student_id', ascending: true, statusMap });
  }
}

export const getStudentsInPrintOrder = applyPrintOrdering;

