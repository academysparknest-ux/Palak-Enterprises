-- ==============================================================================
-- PALAK ENTERPRISES — TEMPLATE VERSIONING & AUDIT LOG MIGRATION
-- Migration: 0003_template_versioning_and_audit.sql
-- ==============================================================================

-- 1. TEMPLATE VERSIONING
-- Add version column to track template iterations
ALTER TABLE public.idcard_templates
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Add layout snapshot to generations so historical cards are reproducible
ALTER TABLE public.idcard_generations
    ADD COLUMN IF NOT EXISTS template_version INTEGER,
    ADD COLUMN IF NOT EXISTS template_layout_snapshot JSONB;

-- Auto-increment template version on layout changes
CREATE OR REPLACE FUNCTION public.auto_increment_template_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Only increment if layout actually changed
    IF OLD.layout IS DISTINCT FROM NEW.layout THEN
        NEW.version := COALESCE(OLD.version, 0) + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_idcard_templates_version ON public.idcard_templates;
CREATE TRIGGER trg_idcard_templates_version
    BEFORE UPDATE ON public.idcard_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_increment_template_version();

-- 2. AUDIT LOG TABLE
-- Tracks all important administrative actions for ID card operations
CREATE TABLE IF NOT EXISTS public.idcard_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.idcard_projects(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL DEFAULT 'System',
    action TEXT NOT NULL CHECK (action IN (
        'STUDENT_CREATED', 'STUDENT_UPDATED', 'STUDENT_DELETED', 'STUDENT_ARCHIVED',
        'STUDENTS_BULK_IMPORTED', 'STUDENTS_BULK_DELETED',
        'PHOTO_UPLOADED', 'PHOTO_DELETED', 'PHOTO_CHANGED',
        'TEMPLATE_CREATED', 'TEMPLATE_UPDATED', 'TEMPLATE_DELETED',
        'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_ARCHIVED', 'PROJECT_DELETED',
        'CARD_GENERATED', 'CARDS_BULK_GENERATED',
        'CARD_PRINTED', 'CARD_PRINT_FAILED',
        'REPRINT_REQUESTED', 'CARD_REGENERATED',
        'PRINT_SESSION_CREATED', 'PRINT_SESSION_COMPLETED', 'PRINT_SESSION_INTERRUPTED',
        'BULK_OPERATION'
    )),
    target_type TEXT NOT NULL CHECK (target_type IN (
        'STUDENT', 'TEMPLATE', 'PROJECT', 'GENERATION', 'PRINT_SESSION', 'PHOTO', 'BULK'
    )),
    target_id TEXT,
    target_name TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    result TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (result IN ('SUCCESS', 'FAILED', 'PARTIAL')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_idcard_audit_log_project ON public.idcard_audit_log(project_id);
CREATE INDEX IF NOT EXISTS idx_idcard_audit_log_action ON public.idcard_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_idcard_audit_log_target ON public.idcard_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_idcard_audit_log_created ON public.idcard_audit_log(created_at DESC);

-- 3. RLS FOR AUDIT LOG
ALTER TABLE public.idcard_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS idcard_audit_log_select ON public.idcard_audit_log;
CREATE POLICY idcard_audit_log_select ON public.idcard_audit_log
    FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS idcard_audit_log_insert ON public.idcard_audit_log;
CREATE POLICY idcard_audit_log_insert ON public.idcard_audit_log
    FOR INSERT WITH CHECK (public.is_staff());

-- Audit logs should never be updated or deleted (immutable)
DROP POLICY IF EXISTS idcard_audit_log_delete ON public.idcard_audit_log;
CREATE POLICY idcard_audit_log_delete ON public.idcard_audit_log
    FOR DELETE USING (false);  -- Never allow deletion
