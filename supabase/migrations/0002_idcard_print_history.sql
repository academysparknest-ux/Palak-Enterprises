-- ==============================================================================
-- PALAK ENTERPRISES — ID CARD PRINT HISTORY & SESSION DATABASE MIGRATION
-- Migration: 0002_idcard_print_history.sql
-- Purpose: Move print history and sessions from localStorage to durable DB storage
-- ==============================================================================

-- 1. PRINT HISTORY TABLE
-- Stores individual print events (success, failure, reprint requests)
CREATE TABLE IF NOT EXISTS public.idcard_print_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.idcard_projects(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES public.idcard_persons(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    generation_id UUID REFERENCES public.idcard_generations(id) ON DELETE SET NULL,
    template_id UUID REFERENCES public.idcard_templates(id) ON DELETE SET NULL,
    template_name TEXT,
    session_id TEXT,
    print_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'REPRINT_REQUESTED')),
    reprint_reason TEXT,
    notes TEXT,
    printed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    printed_by_name TEXT NOT NULL DEFAULT 'Admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_idcard_print_history_project ON public.idcard_print_history(project_id);
CREATE INDEX IF NOT EXISTS idx_idcard_print_history_person ON public.idcard_print_history(person_id);
CREATE INDEX IF NOT EXISTS idx_idcard_print_history_session ON public.idcard_print_history(session_id);
CREATE INDEX IF NOT EXISTS idx_idcard_print_history_status ON public.idcard_print_history(project_id, status);

-- 2. PRINT SESSIONS TABLE
-- Stores bulk print operations with full audit trail
CREATE TABLE IF NOT EXISTS public.idcard_print_sessions (
    id TEXT PRIMARY KEY,  -- PS-YYYY-MM-DD-XXXX format
    project_id UUID NOT NULL REFERENCES public.idcard_projects(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES public.idcard_templates(id) ON DELETE RESTRICT,
    template_name TEXT NOT NULL,
    template_version TEXT NOT NULL,
    operator UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    operator_name TEXT NOT NULL DEFAULT 'Admin',
    print_order TEXT NOT NULL DEFAULT 'STUDENT_ID_ASC',
    status TEXT NOT NULL DEFAULT 'INITIALIZING' CHECK (status IN (
        'INITIALIZING', 'PRE_REVIEW', 'IN_PROGRESS', 'COMPLETED',
        'PARTIALLY_FAILED', 'INTERRUPTED', 'CANCELLED'
    )),
    requested_count INTEGER NOT NULL DEFAULT 0,
    successful_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    unconfirmed_count INTEGER NOT NULL DEFAULT 0,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_idcard_print_sessions_project ON public.idcard_print_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_idcard_print_sessions_status ON public.idcard_print_sessions(project_id, status);

-- 3. PRINT LOCKS TABLE
-- Prevents concurrent printing of the same student card
CREATE TABLE IF NOT EXISTS public.idcard_print_locks (
    person_id UUID PRIMARY KEY REFERENCES public.idcard_persons(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '10 minutes')
);

CREATE INDEX IF NOT EXISTS idx_idcard_print_locks_session ON public.idcard_print_locks(session_id);
CREATE INDEX IF NOT EXISTS idx_idcard_print_locks_expiry ON public.idcard_print_locks(expires_at);

-- 4. ROW LEVEL SECURITY
ALTER TABLE public.idcard_print_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_print_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_print_locks ENABLE ROW LEVEL SECURITY;

-- Print History policies (staff+ can read, manager+ can write)
DROP POLICY IF EXISTS idcard_print_history_select ON public.idcard_print_history;
CREATE POLICY idcard_print_history_select ON public.idcard_print_history
    FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS idcard_print_history_insert ON public.idcard_print_history;
CREATE POLICY idcard_print_history_insert ON public.idcard_print_history
    FOR INSERT WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS idcard_print_history_update ON public.idcard_print_history;
CREATE POLICY idcard_print_history_update ON public.idcard_print_history
    FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS idcard_print_history_delete ON public.idcard_print_history;
CREATE POLICY idcard_print_history_delete ON public.idcard_print_history
    FOR DELETE USING (public.is_admin());

-- Print Sessions policies
DROP POLICY IF EXISTS idcard_print_sessions_select ON public.idcard_print_sessions;
CREATE POLICY idcard_print_sessions_select ON public.idcard_print_sessions
    FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS idcard_print_sessions_insert ON public.idcard_print_sessions;
CREATE POLICY idcard_print_sessions_insert ON public.idcard_print_sessions
    FOR INSERT WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS idcard_print_sessions_update ON public.idcard_print_sessions;
CREATE POLICY idcard_print_sessions_update ON public.idcard_print_sessions
    FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS idcard_print_sessions_delete ON public.idcard_print_sessions;
CREATE POLICY idcard_print_sessions_delete ON public.idcard_print_sessions
    FOR DELETE USING (public.is_admin());

-- Print Locks policies
DROP POLICY IF EXISTS idcard_print_locks_select ON public.idcard_print_locks;
CREATE POLICY idcard_print_locks_select ON public.idcard_print_locks
    FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS idcard_print_locks_insert ON public.idcard_print_locks;
CREATE POLICY idcard_print_locks_insert ON public.idcard_print_locks
    FOR INSERT WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS idcard_print_locks_update ON public.idcard_print_locks;
CREATE POLICY idcard_print_locks_update ON public.idcard_print_locks
    FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS idcard_print_locks_delete ON public.idcard_print_locks;
CREATE POLICY idcard_print_locks_delete ON public.idcard_print_locks
    FOR DELETE USING (public.is_staff());

-- 5. HELPER FUNCTION: Clean expired print locks
CREATE OR REPLACE FUNCTION public.cleanup_expired_print_locks()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.idcard_print_locks
    WHERE expires_at < timezone('utc'::text, now());
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
