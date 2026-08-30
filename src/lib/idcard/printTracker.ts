import type { IdCardPerson, PrintHistoryEntry, ReprintReason } from './types';

const STORAGE_PREFIX = 'idcard_print_history_v1_';

export const REPRINT_REASON_LABELS: Record<ReprintReason, string> = {
  DAMAGED_CARD: 'Damaged Physical Card',
  INCORRECT_PRINT: 'Incorrect Physical Printing / Alignment',
  LOST_CARD: 'Lost Student ID Card',
  INFO_CHANGED: 'Student Information Changed',
  PHOTO_CHANGED: 'Student Photo Changed',
  ADMIN_REQUEST: 'Administrative Reprint Request',
};

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof localStorage !== 'undefined') return localStorage;
  return null;
}

function getStorageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`;
}

export function getPrintHistory(projectId: string, personId?: string): PrintHistoryEntry[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(getStorageKey(projectId));
    if (!raw) return [];
    const entries: PrintHistoryEntry[] = JSON.parse(raw);
    if (!Array.isArray(entries)) return [];
    if (personId) {
      return entries.filter((e) => e.person_id === personId).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
    }
    return entries.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  } catch (err) {
    console.warn('Failed to load print history from localStorage:', err);
    return [];
  }
}

export function savePrintHistoryEntries(projectId: string, entries: PrintHistoryEntry[]): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(getStorageKey(projectId), JSON.stringify(entries));
  } catch (err) {
    console.warn('Failed to save print history to localStorage:', err);
  }
}

export function getPrintStats(projectId: string, personId: string): {
  printCount: number;
  firstPrintedAt: string | null;
  lastPrintedAt: string | null;
  lastFailedAt: string | null;
  reprintRequired: boolean;
  reprintReason: string | null;
  history: PrintHistoryEntry[];
} {
  const history = getPrintHistory(projectId, personId);
  const successEntries = history.filter((e) => e.status === 'SUCCESS');
  const failedEntries = history.filter((e) => e.status === 'FAILED');

  const printCount = successEntries.length;
  const firstPrintedAt = successEntries.length > 0 ? successEntries[successEntries.length - 1].timestamp : null;
  const lastPrintedAt = successEntries.length > 0 ? successEntries[0].timestamp : null;
  const lastFailedAt = failedEntries.length > 0 ? failedEntries[0].timestamp : null;

  // If latest entry is a reprint request, reprint is required
  const latestEntry = history[0];
  const reprintRequired = latestEntry?.status === 'REPRINT_REQUESTED';
  const reprintReason = reprintRequired ? latestEntry.reprint_reason || 'Reprint requested' : null;

  return {
    printCount,
    firstPrintedAt,
    lastPrintedAt,
    lastFailedAt,
    reprintRequired,
    reprintReason,
    history,
  };
}

export function recordPrintSuccess(
  projectId: string,
  person: IdCardPerson,
  generationId?: string,
  templateName?: string,
  printedBy?: string
): PrintHistoryEntry {
  const history = getPrintHistory(projectId);
  const personHistory = history.filter((e) => e.person_id === person.id && e.status === 'SUCCESS');
  const nextPrintNumber = personHistory.length + 1;

  const entry: PrintHistoryEntry = {
    id: `print_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    project_id: projectId,
    person_id: person.id,
    student_id: person.student_id,
    generation_id: generationId,
    template_name: templateName,
    print_number: nextPrintNumber,
    status: 'SUCCESS',
    printed_by: printedBy || 'Admin',
    timestamp: new Date().toISOString(),
  };

  history.unshift(entry);
  savePrintHistoryEntries(projectId, history);
  return entry;
}

export function recordPrintFailure(
  projectId: string,
  person: IdCardPerson,
  errorNotes?: string,
  generationId?: string,
  printedBy?: string
): PrintHistoryEntry {
  const history = getPrintHistory(projectId);
  const personHistory = history.filter((e) => e.person_id === person.id && e.status === 'SUCCESS');

  const entry: PrintHistoryEntry = {
    id: `fail_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    project_id: projectId,
    person_id: person.id,
    student_id: person.student_id,
    generation_id: generationId,
    print_number: personHistory.length,
    status: 'FAILED',
    notes: errorNotes || 'Print operation failed or was cancelled.',
    printed_by: printedBy || 'Admin',
    timestamp: new Date().toISOString(),
  };

  history.unshift(entry);
  savePrintHistoryEntries(projectId, history);
  return entry;
}

export function recordReprintRequest(
  projectId: string,
  person: IdCardPerson,
  reason: ReprintReason | string,
  notes?: string,
  requestedBy?: string
): PrintHistoryEntry {
  const history = getPrintHistory(projectId);
  const personHistory = history.filter((e) => e.person_id === person.id && e.status === 'SUCCESS');

  const entry: PrintHistoryEntry = {
    id: `reprint_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    project_id: projectId,
    person_id: person.id,
    student_id: person.student_id,
    print_number: personHistory.length + 1,
    status: 'REPRINT_REQUESTED',
    reprint_reason: reason,
    notes: notes?.trim() || undefined,
    printed_by: requestedBy || 'Admin',
    timestamp: new Date().toISOString(),
  };

  history.unshift(entry);
  savePrintHistoryEntries(projectId, history);
  return entry;
}
