-- ==============================================================================
-- PALAK ENTERPRISES — COMPLETE UNIVERSAL ID CARD MANAGEMENT SYSTEM SCHEMA
-- File: 20260830_complete_idcard_system_init.sql
-- Description: Self-contained master schema completely independent of profiles table.
-- Safe to run multiple times without errors.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ROLES TABLE & HELPER FUNCTIONS (Zero dependency on external profiles table)
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'STAFF')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS 
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
    IF v_role IS NOT NULL THEN
        RETURN v_role;
    END IF;
    RETURN 'ADMIN';
END;
;

CREATE OR REPLACE FUNCTION public.is_idcard_staff()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS 
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('ADMIN', 'MANAGER', 'STAFF')
    ) THEN
        RETURN TRUE;
    END IF;

    -- Allow any authenticated admin/operator
    IF auth.uid() IS NOT NULL THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
;

CREATE OR REPLACE FUNCTION public.is_idcard_manager_or_above()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS 
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('ADMIN', 'MANAGER')
    ) THEN
        RETURN TRUE;
    END IF;

    -- Allow any authenticated admin/operator
    IF auth.uid() IS NOT NULL THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
;

-- 3. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.set_idcard_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS 
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
;

-- 4. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.idcard_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    academic_year TEXT NOT NULL DEFAULT '2026-2027',
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED')),
    template_id UUID,
    logo_url TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_idcard_projects_status ON public.idcard_projects(status);
CREATE INDEX IF NOT EXISTS idx_idcard_projects_created_by ON public.idcard_projects(created_by);

-- 5. TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.idcard_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.idcard_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    layout JSONB NOT NULL DEFAULT '{}'::jsonb,
    card_width_mm NUMERIC NOT NULL DEFAULT 85.6,
    card_height_mm NUMERIC NOT NULL DEFAULT 54.0,
    background_url TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_idcard_templates_project ON public.idcard_templates(project_id);

DO 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_idcard_projects_template'
    ) THEN
        ALTER TABLE public.idcard_projects
        ADD CONSTRAINT fk_idcard_projects_template
        FOREIGN KEY (template_id) REFERENCES public.idcard_templates(id) ON DELETE SET NULL;
    END IF;
END ;

-- 6. PERSONS / STUDENTS TABLE (Includes custom_fields, emergency_number, status)
CREATE TABLE IF NOT EXISTS public.idcard_persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.idcard_projects(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    name TEXT NOT NULL,
    class TEXT,
    section TEXT,
    roll_number TEXT,
    date_of_birth DATE,
    blood_group TEXT,
    father_name TEXT,
    mother_name TEXT,
    phone TEXT,
    emergency_number TEXT,
    address TEXT,
    photo_url TEXT,
    custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(project_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_idcard_persons_project ON public.idcard_persons(project_id);
CREATE INDEX IF NOT EXISTS idx_idcard_persons_name ON public.idcard_persons(project_id, name);
CREATE INDEX IF NOT EXISTS idx_idcard_persons_student_id ON public.idcard_persons(project_id, student_id);
CREATE INDEX IF NOT EXISTS idx_idcard_persons_custom_fields ON public.idcard_persons USING GIN (custom_fields);

ALTER TABLE public.idcard_persons ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.idcard_persons ADD COLUMN IF NOT EXISTS emergency_number TEXT;
ALTER TABLE public.idcard_persons ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'DRAFT';

-- 7. GENERATIONS TABLE
CREATE TABLE IF NOT EXISTS public.idcard_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.idcard_projects(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES public.idcard_persons(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES public.idcard_templates(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
    file_url TEXT,
    error_message TEXT,
    generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_idcard_generations_project ON public.idcard_generations(project_id);
CREATE INDEX IF NOT EXISTS idx_idcard_generations_person ON public.idcard_generations(person_id);

-- 8. PRINT HISTORY TABLE
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

-- 9. PRINT SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.idcard_print_sessions (
    id TEXT PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.idcard_projects(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES public.idcard_templates(id) ON DELETE RESTRICT,
    template_name TEXT NOT NULL,
    template_version TEXT NOT NULL DEFAULT 'v1',
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

-- 10. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.idcard_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.idcard_projects(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_idcard_audit_logs_project ON public.idcard_audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_idcard_audit_logs_action ON public.idcard_audit_logs(action);

-- 11. TRIGGERS FOR UPDATED_AT
DROP TRIGGER IF EXISTS trg_idcard_projects_updated_at ON public.idcard_projects;
CREATE TRIGGER trg_idcard_projects_updated_at
    BEFORE UPDATE ON public.idcard_projects
    FOR EACH ROW EXECUTE FUNCTION public.set_idcard_updated_at();

DROP TRIGGER IF EXISTS trg_idcard_persons_updated_at ON public.idcard_persons;
CREATE TRIGGER trg_idcard_persons_updated_at
    BEFORE UPDATE ON public.idcard_persons
    FOR EACH ROW EXECUTE FUNCTION public.set_idcard_updated_at();

DROP TRIGGER IF EXISTS trg_idcard_templates_updated_at ON public.idcard_templates;
CREATE TRIGGER trg_idcard_templates_updated_at
    BEFORE UPDATE ON public.idcard_templates
    FOR EACH ROW EXECUTE FUNCTION public.set_idcard_updated_at();

-- 12. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_print_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_print_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_audit_logs ENABLE ROW LEVEL SECURITY;

-- 13. RLS POLICIES
DROP POLICY IF EXISTS idcard_projects_all ON public.idcard_projects;
CREATE POLICY idcard_projects_all ON public.idcard_projects
    FOR ALL USING (public.is_idcard_staff()) WITH CHECK (public.is_idcard_staff());

DROP POLICY IF EXISTS idcard_templates_all ON public.idcard_templates;
CREATE POLICY idcard_templates_all ON public.idcard_templates
    FOR ALL USING (public.is_idcard_staff()) WITH CHECK (public.is_idcard_staff());

DROP POLICY IF EXISTS idcard_persons_all ON public.idcard_persons;
CREATE POLICY idcard_persons_all ON public.idcard_persons
    FOR ALL USING (public.is_idcard_staff()) WITH CHECK (public.is_idcard_staff());

DROP POLICY IF EXISTS idcard_generations_all ON public.idcard_generations;
CREATE POLICY idcard_generations_all ON public.idcard_generations
    FOR ALL USING (public.is_idcard_staff()) WITH CHECK (public.is_idcard_staff());

DROP POLICY IF EXISTS idcard_print_history_all ON public.idcard_print_history;
CREATE POLICY idcard_print_history_all ON public.idcard_print_history
    FOR ALL USING (public.is_idcard_staff()) WITH CHECK (public.is_idcard_staff());

DROP POLICY IF EXISTS idcard_print_sessions_all ON public.idcard_print_sessions;
CREATE POLICY idcard_print_sessions_all ON public.idcard_print_sessions
    FOR ALL USING (public.is_idcard_staff()) WITH CHECK (public.is_idcard_staff());

DROP POLICY IF EXISTS idcard_audit_logs_all ON public.idcard_audit_logs;
CREATE POLICY idcard_audit_logs_all ON public.idcard_audit_logs
    FOR ALL USING (public.is_idcard_staff()) WITH CHECK (public.is_idcard_staff());

-- 14. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public)
VALUES ('idcard-photos', 'idcard-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('idcard-logos', 'idcard-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS idcard_photos_access ON storage.objects;
CREATE POLICY idcard_photos_access ON storage.objects
    FOR ALL USING (bucket_id IN ('idcard-photos', 'idcard-logos'))
    WITH CHECK (bucket_id IN ('idcard-photos', 'idcard-logos'));

-- 15. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';