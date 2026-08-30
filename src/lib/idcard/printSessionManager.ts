import type { IdCardPerson, IdCardTemplate, IdCardGeneration } from './types';
import type { PrintOrderMode } from './studentSort';
import { recordPrintSuccess, recordPrintFailure } from './printTracker';
import * as XLSX from 'xlsx';

export type SessionStatus =
  | 'INITIALIZING'
  | 'PRE_REVIEW'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PARTIALLY_FAILED'
  | 'INTERRUPTED'
  | 'CANCELLED';

export type SessionItemStatus =
  | 'QUEUED'
  | 'PRINTING'
  | 'PRINTED'
  | 'FAILED'
  | 'SKIPPED'
  | 'UNCONFIRMED';

export interface PrintSessionItem {
  sequence: number;
  personId: string;
  studentId: string;
  studentName: string;
  class: string | null;
  section: string | null;
  rollNumber: string | null;
  cardVersion: string; // Generation ID or hash
  studentDataVersion: string; // Updated_at ISO timestamp
  photoUrl: string | null;
  status: SessionItemStatus;
  failureReason: string | null;
  printedAt: string | null;
  attemptCount: number;
}

export interface PrintSession {
  sessionId: string;
  projectId: string;
  templateId: string;
  templateName: string;
  templateVersion: string;
  operator: string;
  createdAt: string;
  completedAt: string | null;
  printOrder: PrintOrderMode;
  status: SessionStatus;
  requestedCount: number;
  successfulCount: number;
  failedCount: number;
  skippedCount: number;
  unconfirmedCount: number;
  items: PrintSessionItem[];
  notes?: string | null;
}

const STORAGE_SESSIONS_PREFIX = 'palak_print_sessions_';
const STORAGE_ACTIVE_SESSION_PREFIX = 'palak_active_session_';
const STORAGE_PRINT_LOCKS_PREFIX = 'palak_print_locks_';

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof localStorage !== 'undefined') return localStorage;
  return null;
}

/**
 * Generates a standard readable Print Session ID: PS-YYYY-MM-DD-XXXX
 */
export function generatePrintSessionId(existingSessionsCount = 0): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const seq = String(existingSessionsCount + 1).padStart(4, '0');
  return `PS-${dateStr}-${seq}`;
}

/**
 * Retrieves all stored print sessions for a project.
 */
export function getProjectPrintSessions(projectId: string): PrintSession[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(`${STORAGE_SESSIONS_PREFIX}${projectId}`);
    if (!raw) return [];
    const sessions: PrintSession[] = JSON.parse(raw);
    return Array.isArray(sessions) ? sessions.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)) : [];
  } catch (err) {
    console.warn('Failed to read print sessions:', err);
    return [];
  }
}

/**
 * Saves all print sessions for a project.
 */
export function saveProjectPrintSessions(projectId: string, sessions: PrintSession[]): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(`${STORAGE_SESSIONS_PREFIX}${projectId}`, JSON.stringify(sessions));
  } catch (err) {
    console.warn('Failed to save print sessions:', err);
  }
}

/**
 * Gets currently active or interrupted session for a project.
 */
export function getActivePrintSession(projectId: string): PrintSession | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(`${STORAGE_ACTIVE_SESSION_PREFIX}${projectId}`);
    if (!raw) return null;
    return JSON.parse(raw) as PrintSession;
  } catch {
    return null;
  }
}

/**
 * Sets or clears the active print session lock.
 */
export function setActivePrintSession(projectId: string, session: PrintSession | null): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    if (session) {
      storage.setItem(`${STORAGE_ACTIVE_SESSION_PREFIX}${projectId}`, JSON.stringify(session));
    } else {
      storage.removeItem(`${STORAGE_ACTIVE_SESSION_PREFIX}${projectId}`);
    }
  } catch (err) {
    console.warn('Failed to set active print session:', err);
  }
}

/**
 * Concurrency Lock: Checks if a student is currently locked by an ongoing print session.
 */
export function isStudentPrintLocked(projectId: string, personId: string, currentSessionId?: string): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const raw = storage.getItem(`${STORAGE_PRINT_LOCKS_PREFIX}${projectId}`);
    if (!raw) return false;
    const locks: Record<string, { sessionId: string; lockedAt: number }> = JSON.parse(raw);
    const lock = locks[personId];
    if (!lock) return false;

    // Auto-expire locks older than 10 minutes to prevent permanent deadlocks
    if (Date.now() - lock.lockedAt > 10 * 60 * 1000) {
      delete locks[personId];
      storage.setItem(`${STORAGE_PRINT_LOCKS_PREFIX}${projectId}`, JSON.stringify(locks));
      return false;
    }

    if (currentSessionId && lock.sessionId === currentSessionId) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Locks a batch of students for a print session.
 */
export function lockStudentsForSession(projectId: string, sessionId: string, personIds: string[]): { success: boolean; conflictPersonId?: string } {
  const storage = getStorage();
  if (!storage) return { success: true };
  try {
    const key = `${STORAGE_PRINT_LOCKS_PREFIX}${projectId}`;
    const raw = storage.getItem(key);
    const locks: Record<string, { sessionId: string; lockedAt: number }> = raw ? JSON.parse(raw) : {};

    const now = Date.now();
    for (const pid of personIds) {
      const existing = locks[pid];
      if (existing && existing.sessionId !== sessionId && (now - existing.lockedAt < 10 * 60 * 1000)) {
        return { success: false, conflictPersonId: pid };
      }
    }

    for (const pid of personIds) {
      locks[pid] = { sessionId, lockedAt: now };
    }
    storage.setItem(key, JSON.stringify(locks));
    return { success: true };
  } catch {
    return { success: true };
  }
}

/**
 * Releases student print locks for a session.
 */
export function releaseStudentLocks(projectId: string, sessionId: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    const key = `${STORAGE_PRINT_LOCKS_PREFIX}${projectId}`;
    const raw = storage.getItem(key);
    if (!raw) return;
    const locks: Record<string, { sessionId: string; lockedAt: number }> = JSON.parse(raw);
    for (const [pid, lock] of Object.entries(locks)) {
      if (lock.sessionId === sessionId) {
        delete locks[pid];
      }
    }
    storage.setItem(key, JSON.stringify(locks));
  } catch (err) {
    console.warn('Failed to release student print locks:', err);
  }
}

/**
 * Data change & card version verification before printing.
 */
export function verifyStudentCardIntegrity(
  person: IdCardPerson,
  template: IdCardTemplate | null,
  latestGen?: IdCardGeneration | null
): { valid: boolean; reason?: string; detail?: string } {
  if (!latestGen || latestGen.status !== 'SUCCESS') {
    return { valid: false, reason: 'NOT_GENERATED', detail: 'ID card has not been generated yet.' };
  }

  // Verify student data modification timestamp
  if (person.updated_at && latestGen.created_at) {
    const personUpdated = Date.parse(person.updated_at);
    const genCreated = Date.parse(latestGen.created_at);
    if (personUpdated - genCreated > 1500) {
      return {
        valid: false,
        reason: 'DATA_CHANGED',
        detail: `Student record was modified on ${new Date(personUpdated).toLocaleString()} after the card was generated on ${new Date(genCreated).toLocaleString()}. Card regeneration is required.`,
      };
    }
  }

  // Verify template modification timestamp
  if (template?.updated_at && latestGen.created_at) {
    const templateUpdated = Date.parse(template.updated_at);
    const genCreated = Date.parse(latestGen.created_at);
    if (templateUpdated - genCreated > 1500) {
      return {
        valid: false,
        reason: 'TEMPLATE_CHANGED',
        detail: 'The ID card template layout was modified after this card was generated. Regeneration required.',
      };
    }
  }

  return { valid: true };
}

/**
 * Creates and initializes a new Print Session.
 */
export function createPrintSession(params: {
  projectId: string;
  template: IdCardTemplate;
  operator: string;
  printOrder: PrintOrderMode;
  orderedPersons: IdCardPerson[];
  generations: IdCardGeneration[];
  notes?: string;
}): { session: PrintSession; lockError?: string } {
  const existingSessions = getProjectPrintSessions(params.projectId);
  const sessionId = generatePrintSessionId(existingSessions.length);

  const personIds = params.orderedPersons.map((p) => p.id);
  const lockResult = lockStudentsForSession(params.projectId, sessionId, personIds);
  if (!lockResult.success) {
    return {
      session: null as any,
      lockError: `Student ${lockResult.conflictPersonId} is currently locked by another print session.`,
    };
  }

  const items: PrintSessionItem[] = params.orderedPersons.map((person, idx) => {
    const gen = params.generations.find((g) => g.person_id === person.id);
    return {
      sequence: idx + 1,
      personId: person.id,
      studentId: person.student_id,
      studentName: person.name,
      class: person.class || null,
      section: person.section || null,
      rollNumber: person.roll_number || null,
      cardVersion: gen?.id || `gen-${person.id}`,
      studentDataVersion: person.updated_at || person.created_at,
      photoUrl: person.photo_url || null,
      status: 'QUEUED',
      failureReason: null,
      printedAt: null,
      attemptCount: 0,
    };
  });

  const session: PrintSession = {
    sessionId,
    projectId: params.projectId,
    templateId: params.template.id,
    templateName: params.template.name,
    templateVersion: params.template.updated_at || params.template.created_at,
    operator: params.operator || 'Admin',
    createdAt: new Date().toISOString(),
    completedAt: null,
    printOrder: params.printOrder,
    status: 'IN_PROGRESS',
    requestedCount: items.length,
    successfulCount: 0,
    failedCount: 0,
    skippedCount: 0,
    unconfirmedCount: items.length,
    items,
    notes: params.notes || null,
  };

  setActivePrintSession(params.projectId, session);
  saveProjectPrintSessions(params.projectId, [session, ...existingSessions]);

  return { session };
}

/**
 * Finalizes print session with explicit per-card or batch outcome.
 */
export function recordSessionCompletion(params: {
  sessionId: string;
  projectId: string;
  results: Array<{
    personId: string;
    status: 'PRINTED' | 'FAILED' | 'SKIPPED' | 'UNCONFIRMED';
    failureReason?: string;
  }>;
  templateName?: string;
}): PrintSession {
  const sessions = getProjectPrintSessions(params.projectId);
  const session = sessions.find((s) => s.sessionId === params.sessionId) || getActivePrintSession(params.projectId);
  if (!session) throw new Error(`Print session ${params.sessionId} not found.`);

  const resultMap = new Map(params.results.map((r) => [r.personId, r]));
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;
  let unconfirmedCount = 0;

  const nowIso = new Date().toISOString();

  session.items = session.items.map((item) => {
    const res = resultMap.get(item.personId);
    if (!res) {
      unconfirmedCount++;
      return { ...item, status: 'UNCONFIRMED' };
    }

    if (res.status === 'PRINTED') {
      successCount++;
      // Sync with global print tracker
      recordPrintSuccess(
        params.projectId,
        { id: item.personId, student_id: item.studentId, name: item.studentName } as IdCardPerson,
        item.cardVersion,
        params.templateName || session.templateName,
        session.operator,
        session.sessionId
      );
      return {
        ...item,
        status: 'PRINTED',
        printedAt: nowIso,
        attemptCount: item.attemptCount + 1,
      };
    } else if (res.status === 'FAILED') {
      failCount++;
      recordPrintFailure(
        params.projectId,
        { id: item.personId, student_id: item.studentId, name: item.studentName } as IdCardPerson,
        res.failureReason || 'Print execution failed',
        item.cardVersion,
        session.operator,
        session.sessionId
      );
      return {
        ...item,
        status: 'FAILED',
        failureReason: res.failureReason || 'Physical print failed',
        attemptCount: item.attemptCount + 1,
      };
    } else if (res.status === 'SKIPPED') {
      skipCount++;
      return {
        ...item,
        status: 'SKIPPED',
        failureReason: res.failureReason || 'Skipped due to validation/duplicate protection',
      };
    } else {
      unconfirmedCount++;
      return {
        ...item,
        status: 'UNCONFIRMED',
      };
    }
  });

  session.successfulCount = successCount;
  session.failedCount = failCount;
  session.skippedCount = skipCount;
  session.unconfirmedCount = unconfirmedCount;
  session.completedAt = nowIso;

  if (failCount > 0 && successCount > 0) {
    session.status = 'PARTIALLY_FAILED';
  } else if (failCount > 0 && successCount === 0) {
    session.status = 'PARTIALLY_FAILED';
  } else if (unconfirmedCount > 0) {
    session.status = 'INTERRUPTED';
  } else {
    session.status = 'COMPLETED';
  }

  // Update session store and clear locks
  const updatedList = sessions.map((s) => (s.sessionId === session.sessionId ? session : s));
  if (!sessions.some((s) => s.sessionId === session.sessionId)) {
    updatedList.unshift(session);
  }
  saveProjectPrintSessions(params.projectId, updatedList);
  setActivePrintSession(params.projectId, null);
  releaseStudentLocks(params.projectId, session.sessionId);

  return session;
}

/**
 * Handles browser interruption recovery: Marks remaining as INTERRUPTED.
 */
export function handleInterruptedPrintSession(projectId: string, sessionId: string): PrintSession | null {
  const session = getActivePrintSession(projectId);
  if (!session || session.sessionId !== sessionId) return null;

  session.status = 'INTERRUPTED';
  session.items = session.items.map((i) => (i.status === 'QUEUED' || i.status === 'PRINTING' ? { ...i, status: 'UNCONFIRMED' } : i));
  session.unconfirmedCount = session.items.filter((i) => i.status === 'UNCONFIRMED').length;

  const sessions = getProjectPrintSessions(projectId);
  const updatedList = sessions.map((s) => (s.sessionId === session.sessionId ? session : s));
  saveProjectPrintSessions(projectId, updatedList);
  setActivePrintSession(projectId, session); // Keep active for recovery prompt
  releaseStudentLocks(projectId, sessionId);

  return session;
}

/**
 * Exports complete print session audit report to Excel (.xlsx).
 */
export function exportPrintSessionReport(session: PrintSession): void {
  const summaryData = [
    ['PRINT SESSION AUDIT REPORT', ''],
    ['Session ID', session.sessionId],
    ['Project ID', session.projectId],
    ['Template', session.templateName],
    ['Template Version', session.templateVersion],
    ['Operator', session.operator],
    ['Created At', new Date(session.createdAt).toLocaleString()],
    ['Completed At', session.completedAt ? new Date(session.completedAt).toLocaleString() : 'Interrupted / Ongoing'],
    ['Print Order', session.printOrder],
    ['Session Status', session.status],
    ['Total Cards Requested', session.requestedCount],
    ['Successfully Printed', session.successfulCount],
    ['Failed Cards', session.failedCount],
    ['Skipped Cards', session.skippedCount],
    ['Unconfirmed Cards', session.unconfirmedCount],
    [],
  ];

  const headers = [
    'Sequence',
    'Student ID',
    'Student Name',
    'Class',
    'Section',
    'Roll Number',
    'Card Version',
    'Print Status',
    'Printed Timestamp',
    'Failure / Skip Reason',
    'Attempts',
  ];

  const rows = session.items.map((item) => [
    item.sequence,
    item.studentId,
    item.studentName,
    item.class || '',
    item.section || '',
    item.rollNumber || '',
    item.cardVersion,
    item.status,
    item.printedAt ? new Date(item.printedAt).toLocaleString() : '',
    item.failureReason || '',
    item.attemptCount,
  ]);

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  const itemsSheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Session Summary');
  XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Card Details');

  const filename = `${session.sessionId}_Report.xlsx`;
  XLSX.writeFile(workbook, filename);
}
