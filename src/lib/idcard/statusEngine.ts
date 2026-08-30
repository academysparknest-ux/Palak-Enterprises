import type {
  IdCardPerson,
  IdCardTemplate,
  IdCardGeneration,
  TemplateFieldSchema,
  IdCardStatus,
  StudentIdCardStatusInfo,
} from './types';
import { validatePersonForTemplate, extractTemplateFieldSchema } from './templateFieldSchema';
import { getPrintStats } from './printTracker';

/**
 * Validates whether a student record is complete and meets all requirements
 * specified by the active template.
 */
export function validateStudentForIdCard(
  person: IdCardPerson,
  schema?: TemplateFieldSchema | null,
  template?: IdCardTemplate | null
): {
  ready: boolean;
  missingFields: string[];
  missingFieldKeys: string[];
  checklist: Array<{ key: string; label: string; complete: boolean; value?: string | null }>;
} {
  const activeSchema = schema || (template ? extractTemplateFieldSchema(template.layout) : null);
  if (!activeSchema) {
    // If no schema available, check core required identity fields
    const hasName = Boolean(person.name && person.name.trim());
    const hasId = Boolean(person.student_id && person.student_id.trim());
    const hasPhoto = Boolean(person.photo_url && person.photo_url.trim());
    const missing: string[] = [];
    const missingKeys: string[] = [];
    if (!hasId) { missing.push('Student ID'); missingKeys.push('student_id'); }
    if (!hasName) { missing.push('Student Name'); missingKeys.push('name'); }
    if (!hasPhoto) { missing.push('Student Photo'); missingKeys.push('student_photo'); }

    return {
      ready: missing.length === 0,
      missingFields: missing,
      missingFieldKeys: missingKeys,
      checklist: [
        { key: 'student_id', label: 'Student ID', complete: hasId, value: person.student_id },
        { key: 'name', label: 'Student Name', complete: hasName, value: person.name },
        { key: 'student_photo', label: 'Student Photo', complete: hasPhoto, value: person.photo_url },
      ],
    };
  }

  const result = validatePersonForTemplate(person, activeSchema);
  const checklist: Array<{ key: string; label: string; complete: boolean; value?: string | null }> = [];

  // Build full checklist of required and optional template fields
  const allFields = [...activeSchema.studentInputFields, ...activeSchema.assetFields];
  for (const field of allFields) {
    let val: any = null;
    let complete = true;
    if (field.category === 'student_asset' && field.key === 'student_photo') {
      val = person.photo_url;
      complete = Boolean(val && String(val).trim());
    } else if (field.isCustom) {
      val = person.custom_fields?.[field.key] ?? (person as any)[field.key];
      complete = val !== undefined && val !== null && String(val).trim() !== '';
    } else {
      const modelKey = (field.modelKey || field.key) as keyof IdCardPerson;
      val = (person as any)[modelKey] ?? person.custom_fields?.[field.key];
      complete = val !== undefined && val !== null && String(val).trim() !== '';
    }

    if (field.required) {
      checklist.push({
        key: field.key,
        label: field.label,
        complete,
        value: typeof val === 'string' ? val : val ? String(val) : null,
      });
    }
  }

  return {
    ready: result.valid,
    missingFields: result.missingFields,
    missingFieldKeys: result.missingFieldKeys,
    checklist,
  };
}

/**
 * Detects whether a student's data was modified after the card was generated or printed.
 */
export function detectStudentDataOutdated(
  person: IdCardPerson,
  latestGen?: IdCardGeneration | null
): { isOutdated: boolean; reason?: string | null } {
  if (!latestGen || latestGen.status !== 'SUCCESS') {
    return { isOutdated: false };
  }

  if (!person.updated_at || !latestGen.created_at) {
    return { isOutdated: false };
  }

  const personUpdatedMs = Date.parse(person.updated_at);
  const genCreatedMs = Date.parse(latestGen.created_at);

  // If person was updated more than 1 second after generation, card data is outdated
  if (!isNaN(personUpdatedMs) && !isNaN(genCreatedMs) && personUpdatedMs > genCreatedMs + 1000) {
    return {
      isOutdated: true,
      reason: 'Student information or photo was updated after ID card was generated.',
    };
  }

  return { isOutdated: false };
}

/**
 * Computes the single authoritative ID card lifecycle status for a student record.
 */
export function computeStudentIdCardStatus(params: {
  person: IdCardPerson;
  schema?: TemplateFieldSchema | null;
  template?: IdCardTemplate | null;
  latestGen?: IdCardGeneration | null;
  printStats?: ReturnType<typeof getPrintStats> | null;
}): StudentIdCardStatusInfo {
  const { person, schema, template, latestGen } = params;
  const validation = validateStudentForIdCard(person, schema, template);
  const printStats = params.printStats || (person.project_id ? getPrintStats(person.project_id, person.id) : null);

  const printCount = (printStats?.printCount || 0) + (latestGen?.printed_at && (printStats?.printCount || 0) === 0 ? 1 : 0);
  const firstPrintedAt = printStats?.firstPrintedAt || latestGen?.printed_at || null;
  const lastPrintedAt = printStats?.lastPrintedAt || latestGen?.printed_at || null;
  const lastFailedAt = printStats?.lastFailedAt || null;

  // 1. Check NOT READY
  if (!validation.ready) {
    return {
      status: 'NOT_READY',
      ready: false,
      missingFields: validation.missingFields,
      missingFieldKeys: validation.missingFieldKeys,
      lastGeneration: latestGen,
      printCount,
      firstPrintedAt,
      lastPrintedAt,
      lastFailedAt,
      reprintReason: null,
      isOutdated: false,
      canGenerate: false,
      canPrint: false,
    };
  }

  // 2. Ready to generate (no successful generation yet)
  if (!latestGen || latestGen.status !== 'SUCCESS') {
    return {
      status: 'READY_TO_GENERATE',
      ready: true,
      missingFields: [],
      missingFieldKeys: [],
      lastGeneration: latestGen,
      printCount,
      firstPrintedAt,
      lastPrintedAt,
      lastFailedAt,
      reprintReason: null,
      isOutdated: false,
      canGenerate: true,
      canPrint: false,
    };
  }

  // 3. Has generation: check if OUTDATED
  const outdatedCheck = detectStudentDataOutdated(person, latestGen);
  if (outdatedCheck.isOutdated) {
    return {
      status: 'OUTDATED',
      ready: true,
      missingFields: [],
      missingFieldKeys: [],
      lastGeneration: latestGen,
      printCount,
      firstPrintedAt,
      lastPrintedAt,
      lastFailedAt,
      reprintReason: null,
      isOutdated: true,
      outdatedReason: outdatedCheck.reason,
      canGenerate: true,
      canPrint: false,
    };
  }

  // 4. Check REPRINT REQUIRED
  if (printStats?.reprintRequired) {
    return {
      status: 'REPRINT_REQUIRED',
      ready: true,
      missingFields: [],
      missingFieldKeys: [],
      lastGeneration: latestGen,
      printCount,
      firstPrintedAt,
      lastPrintedAt,
      lastFailedAt,
      reprintReason: printStats.reprintReason,
      isOutdated: false,
      canGenerate: true,
      canPrint: true,
    };
  }

  // 5. Check PRINT FAILED (latest print attempt failed and occurred after any success)
  if (lastFailedAt && (!lastPrintedAt || Date.parse(lastFailedAt) > Date.parse(lastPrintedAt))) {
    return {
      status: 'PRINT_FAILED',
      ready: true,
      missingFields: [],
      missingFieldKeys: [],
      lastGeneration: latestGen,
      printCount,
      firstPrintedAt,
      lastPrintedAt,
      lastFailedAt,
      reprintReason: null,
      isOutdated: false,
      canGenerate: true,
      canPrint: true,
    };
  }

  // 6. Check PRINTED
  if (printCount > 0 || latestGen.printed_at) {
    return {
      status: 'PRINTED',
      ready: true,
      missingFields: [],
      missingFieldKeys: [],
      lastGeneration: latestGen,
      printCount: Math.max(1, printCount),
      firstPrintedAt,
      lastPrintedAt,
      lastFailedAt,
      reprintReason: null,
      isOutdated: false,
      canGenerate: true,
      canPrint: false, // Prevent accidental duplicate print unless reprint requested
    };
  }

  // 7. Otherwise GENERATED / READY TO PRINT
  return {
    status: 'READY_TO_PRINT',
    ready: true,
    missingFields: [],
    missingFieldKeys: [],
    lastGeneration: latestGen,
    printCount: 0,
    firstPrintedAt: null,
    lastPrintedAt: null,
    lastFailedAt: null,
    reprintReason: null,
    isOutdated: false,
    canGenerate: true,
    canPrint: true,
  };
}

/**
 * Filter and partition a list of students for bulk operations.
 */
export function partitionStudentsByReadiness(
  persons: IdCardPerson[],
  schema?: TemplateFieldSchema | null,
  template?: IdCardTemplate | null
): {
  readyStudents: IdCardPerson[];
  notReadyStudents: Array<{ person: IdCardPerson; missingFields: string[] }>;
} {
  const readyStudents: IdCardPerson[] = [];
  const notReadyStudents: Array<{ person: IdCardPerson; missingFields: string[] }> = [];

  for (const person of persons) {
    const val = validateStudentForIdCard(person, schema, template);
    if (val.ready) {
      readyStudents.push(person);
    } else {
      notReadyStudents.push({ person, missingFields: val.missingFields });
    }
  }

  return { readyStudents, notReadyStudents };
}
