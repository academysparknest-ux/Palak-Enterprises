import { executeWithAuthRetry } from '../supabase/authSession';
import { classifySupabaseError } from './errors';

export type AuditAction =
  | 'STUDENT_CREATED' | 'STUDENT_UPDATED' | 'STUDENT_DELETED' | 'STUDENT_ARCHIVED'
  | 'STUDENTS_BULK_IMPORTED' | 'STUDENTS_BULK_DELETED'
  | 'PHOTO_UPLOADED' | 'PHOTO_DELETED' | 'PHOTO_CHANGED'
  | 'TEMPLATE_CREATED' | 'TEMPLATE_UPDATED' | 'TEMPLATE_DELETED'
  | 'PROJECT_CREATED' | 'PROJECT_UPDATED' | 'PROJECT_ARCHIVED' | 'PROJECT_DELETED'
  | 'CARD_GENERATED' | 'CARDS_BULK_GENERATED'
  | 'CARD_PRINTED' | 'CARD_PRINT_FAILED'
  | 'REPRINT_REQUESTED' | 'CARD_REGENERATED'
  | 'PRINT_SESSION_CREATED' | 'PRINT_SESSION_COMPLETED' | 'PRINT_SESSION_INTERRUPTED'
  | 'BULK_OPERATION';

export type AuditTargetType =
  | 'STUDENT' | 'TEMPLATE' | 'PROJECT' | 'GENERATION' | 'PRINT_SESSION' | 'PHOTO' | 'BULK';

export type AuditResult = 'SUCCESS' | 'FAILED' | 'PARTIAL';

export interface AuditLogEntry {
  id: string;
  project_id: string | null;
  user_id: string | null;
  user_name: string;
  action: AuditAction;
  target_type: AuditTargetType;
  target_id: string | null;
  target_name: string | null;
  details: Record<string, any>;
  result: AuditResult;
  created_at: string;
}

/**
 * Records an audit log entry for an ID card operation.
 * Fire-and-forget — never throws, never blocks the calling operation.
 */
export async function recordAuditLog(params: {
  projectId?: string | null;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string | null;
  targetName?: string | null;
  details?: Record<string, any>;
  result?: AuditResult;
}): Promise<void> {
  try {
    await executeWithAuthRetry(
      async (client) => {
        const { data: userData } = await client.auth.getUser();
        const userId = userData?.user?.id || null;
        const userName = userData?.user?.user_metadata?.full_name
          || userData?.user?.user_metadata?.name
          || userData?.user?.email
          || 'Admin';

        const { error } = await client.from('idcard_audit_log').insert({
          project_id: params.projectId || null,
          user_id: userId,
          user_name: userName,
          action: params.action,
          target_type: params.targetType,
          target_id: params.targetId || null,
          target_name: params.targetName || null,
          details: params.details || {},
          result: params.result || 'SUCCESS',
        });

        if (error) throw classifySupabaseError(error);
      },
      { operationName: 'recordAuditLog' }
    );
  } catch (err) {
    // Audit log failures must never break the main operation
    console.warn('[AUDIT] Failed to record audit log entry:', params.action, err);
  }
}

/**
 * Retrieves audit log entries for a project, with optional filtering.
 */
export async function getAuditLog(params: {
  projectId: string;
  action?: AuditAction;
  targetType?: AuditTargetType;
  targetId?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  return executeWithAuthRetry(
    async (client) => {
      let query = client
        .from('idcard_audit_log')
        .select('*')
        .eq('project_id', params.projectId)
        .order('created_at', { ascending: false })
        .limit(params.limit || 100);

      if (params.action) query = query.eq('action', params.action);
      if (params.targetType) query = query.eq('target_type', params.targetType);
      if (params.targetId) query = query.eq('target_id', params.targetId);

      const { data, error } = await query;
      if (error) throw classifySupabaseError(error);
      return (data as AuditLogEntry[]) || [];
    },
    { operationName: 'getAuditLog' }
  );
}

// ============================================================
// CONVENIENCE FUNCTIONS for common audit events
// ============================================================

export function auditStudentCreated(projectId: string, studentId: string, studentName: string): void {
  recordAuditLog({
    projectId, action: 'STUDENT_CREATED', targetType: 'STUDENT',
    targetId: studentId, targetName: studentName,
  });
}

export function auditStudentUpdated(projectId: string, studentId: string, studentName: string, changedFields: string[]): void {
  recordAuditLog({
    projectId, action: 'STUDENT_UPDATED', targetType: 'STUDENT',
    targetId: studentId, targetName: studentName,
    details: { changedFields },
  });
}

export function auditStudentDeleted(projectId: string, studentId: string, studentName: string): void {
  recordAuditLog({
    projectId, action: 'STUDENT_DELETED', targetType: 'STUDENT',
    targetId: studentId, targetName: studentName,
  });
}

export function auditBulkImport(projectId: string, imported: number, skipped: number, errors: number): void {
  recordAuditLog({
    projectId, action: 'STUDENTS_BULK_IMPORTED', targetType: 'BULK',
    details: { imported, skipped, errors },
    result: errors > 0 ? 'PARTIAL' : 'SUCCESS',
  });
}

export function auditPhotoChanged(projectId: string, studentId: string, studentName: string): void {
  recordAuditLog({
    projectId, action: 'PHOTO_CHANGED', targetType: 'PHOTO',
    targetId: studentId, targetName: studentName,
  });
}

export function auditTemplateUpdated(projectId: string, templateId: string, templateName: string, version: number): void {
  recordAuditLog({
    projectId, action: 'TEMPLATE_UPDATED', targetType: 'TEMPLATE',
    targetId: templateId, targetName: templateName,
    details: { version },
  });
}

export function auditCardGenerated(projectId: string, personId: string, studentName: string, templateId: string): void {
  recordAuditLog({
    projectId, action: 'CARD_GENERATED', targetType: 'GENERATION',
    targetId: personId, targetName: studentName,
    details: { templateId },
  });
}

export function auditPrintSessionCreated(projectId: string, sessionId: string, cardCount: number): void {
  recordAuditLog({
    projectId, action: 'PRINT_SESSION_CREATED', targetType: 'PRINT_SESSION',
    targetId: sessionId,
    details: { cardCount },
  });
}

export function auditPrintSessionCompleted(
  projectId: string, sessionId: string,
  successCount: number, failedCount: number, skippedCount: number
): void {
  recordAuditLog({
    projectId, action: 'PRINT_SESSION_COMPLETED', targetType: 'PRINT_SESSION',
    targetId: sessionId,
    details: { successCount, failedCount, skippedCount },
    result: failedCount > 0 ? 'PARTIAL' : 'SUCCESS',
  });
}
