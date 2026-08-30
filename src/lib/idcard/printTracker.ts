import { executeWithAuthRetry } from '../supabase/authSession';
import { classifySupabaseError } from './errors';
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

// ============================================================
// LOCAL STORAGE CACHE (fast reads, fallback when DB unavailable)
// ============================================================

function getLocalPrintHistory(projectId: string, personId?: string): PrintHistoryEntry[] {
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

function saveLocalPrintHistory(projectId: string, entries: PrintHistoryEntry[]): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(getStorageKey(projectId), JSON.stringify(entries));
  } catch (err) {
    console.warn('Failed to save print history to localStorage:', err);
  }
}

// ============================================================
// DATABASE OPERATIONS (authoritative source of truth)
// ============================================================

async function fetchDbPrintHistory(projectId: string, personId?: string): Promise<PrintHistoryEntry[]> {
  try {
    return await executeWithAuthRetry(
      async (client) => {
        let query = client
          .from('idcard_print_history')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (personId) {
          query = query.eq('person_id', personId);
        }

        const { data, error } = await query;
        if (error) throw classifySupabaseError(error);

        // Map DB columns to PrintHistoryEntry shape
        return (data || []).map((row: any) => ({
          id: row.id,
          project_id: row.project_id,
          person_id: row.person_id,
          student_id: row.student_id,
          generation_id: row.generation_id || undefined,
          template_id: row.template_id || undefined,
          template_name: row.template_name || undefined,
          session_id: row.session_id || undefined,
          print_number: row.print_number,
          status: row.status,
          reprint_reason: row.reprint_reason || undefined,
          notes: row.notes || undefined,
          printed_by: row.printed_by_name || 'Admin',
          timestamp: row.created_at,
        }));
      },
      { operationName: 'fetchDbPrintHistory' }
    );
  } catch (err) {
    console.warn('Failed to fetch print history from DB, falling back to localStorage:', err);
    return [];
  }
}

async function insertDbPrintEntry(entry: PrintHistoryEntry & { project_id: string }): Promise<void> {
  try {
    await executeWithAuthRetry(
      async (client) => {
        const { data: userData } = await client.auth.getUser();
        const userId = userData?.user?.id || null;

        const { error } = await client.from('idcard_print_history').insert({
          project_id: entry.project_id,
          person_id: entry.person_id,
          student_id: entry.student_id,
          generation_id: entry.generation_id || null,
          template_id: entry.template_id || null,
          template_name: entry.template_name || null,
          session_id: entry.session_id || null,
          print_number: entry.print_number,
          status: entry.status,
          reprint_reason: entry.reprint_reason || null,
          notes: entry.notes || null,
          printed_by: userId,
          printed_by_name: entry.printed_by || 'Admin',
        });
        if (error) throw classifySupabaseError(error);
      },
      { operationName: 'insertDbPrintEntry' }
    );
  } catch (err) {
    console.warn('Failed to save print history to DB (localStorage used as fallback):', err);
  }
}

// ============================================================
// PUBLIC API (DB-first with localStorage cache)
// ============================================================

/**
 * Gets print history. Tries DB first, falls back to localStorage.
 * Syncs DB data to localStorage cache on success.
 */
export async function getPrintHistoryAsync(projectId: string, personId?: string): Promise<PrintHistoryEntry[]> {
  const dbHistory = await fetchDbPrintHistory(projectId, personId);
  if (dbHistory.length > 0) {
    // Sync full project history to localStorage cache
    if (!personId) {
      saveLocalPrintHistory(projectId, dbHistory);
    }
    return dbHistory;
  }
  // Fallback to localStorage if DB returned nothing
  return getLocalPrintHistory(projectId, personId);
}

/**
 * Synchronous version for status engine compatibility.
 * Reads from localStorage cache. Call getPrintHistoryAsync first to populate.
 */
export function getPrintHistory(projectId: string, personId?: string): PrintHistoryEntry[] {
  return getLocalPrintHistory(projectId, personId);
}

export function savePrintHistoryEntries(projectId: string, entries: PrintHistoryEntry[]): void {
  saveLocalPrintHistory(projectId, entries);
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
  printedBy?: string,
  sessionId?: string
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
    session_id: sessionId,
    print_number: nextPrintNumber,
    status: 'SUCCESS',
    printed_by: printedBy || 'Admin',
    timestamp: new Date().toISOString(),
  };

  // Write to localStorage immediately (synchronous)
  history.unshift(entry);
  savePrintHistoryEntries(projectId, history);

  // Write to DB asynchronously (fire-and-forget with error logging)
  insertDbPrintEntry(entry).catch(() => {
    // Already logged in insertDbPrintEntry
  });

  return entry;
}

export function recordPrintFailure(
  projectId: string,
  person: IdCardPerson,
  errorNotes?: string,
  generationId?: string,
  printedBy?: string,
  sessionId?: string
): PrintHistoryEntry {
  const history = getPrintHistory(projectId);
  const personHistory = history.filter((e) => e.person_id === person.id && e.status === 'SUCCESS');

  const entry: PrintHistoryEntry = {
    id: `fail_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    project_id: projectId,
    person_id: person.id,
    student_id: person.student_id,
    generation_id: generationId,
    session_id: sessionId,
    print_number: personHistory.length,
    status: 'FAILED',
    notes: errorNotes || 'Print operation failed or was cancelled.',
    printed_by: printedBy || 'Admin',
    timestamp: new Date().toISOString(),
  };

  history.unshift(entry);
  savePrintHistoryEntries(projectId, history);

  // Write to DB asynchronously
  insertDbPrintEntry(entry).catch(() => {});

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

  // Write to DB asynchronously
  insertDbPrintEntry(entry).catch(() => {});

  return entry;
}

/**
 * Migrates existing localStorage print history to the database.
 * Called once on first load of a project. Idempotent — checks if DB already has data.
 */
export async function migrateLocalStorageToDb(projectId: string): Promise<{ migrated: number; skipped: boolean }> {
  try {
    // Check if DB already has entries for this project
    const dbEntries = await fetchDbPrintHistory(projectId);
    if (dbEntries.length > 0) {
      return { migrated: 0, skipped: true };
    }

    const localEntries = getLocalPrintHistory(projectId);
    if (localEntries.length === 0) {
      return { migrated: 0, skipped: true };
    }

    // Batch insert to DB
    let migrated = 0;
    for (const entry of localEntries) {
      await insertDbPrintEntry({ ...entry, project_id: projectId });
      migrated++;
    }

    console.info(`[PRINT_TRACKER] Migrated ${migrated} print history entries from localStorage to DB for project ${projectId}`);
    return { migrated, skipped: false };
  } catch (err) {
    console.warn('Failed to migrate localStorage print history to DB:', err);
    return { migrated: 0, skipped: true };
  }
}
