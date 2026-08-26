-- =============================================================================
-- Migration: 20260825_idcard_management_system.sql
-- Description: Creates ID Card tables, constraints, indexes, triggers, and RLS policies.
-- =============================================================================

-- 1. TABLES
CREATE TABLE IF NOT EXISTS public.idcard_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  academic_year text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED')),
  template_id uuid,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_idcard_projects_status ON public.idcard_projects(status);
CREATE INDEX IF NOT EXISTS idx_idcard_projects_created_by ON public.idcard_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_idcard_projects_created_at ON public.idcard_projects(created_at DESC);

CREATE TABLE IF NOT EXISTS public.idcard_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.idcard_projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  card_width_mm numeric NOT NULL DEFAULT 85.6,
  card_height_mm numeric NOT NULL DEFAULT 54,
  background_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_idcard_projects_template'
  ) THEN
    ALTER TABLE public.idcard_projects
      ADD CONSTRAINT fk_idcard_projects_template
      FOREIGN KEY (template_id) REFERENCES public.idcard_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_idcard_templates_project ON public.idcard_templates(project_id);

CREATE TABLE IF NOT EXISTS public.idcard_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.idcard_projects(id) ON DELETE CASCADE,
  student_id text NOT NULL,
  name text NOT NULL,
  class text,
  section text,
  roll_number text,
  date_of_birth date,
  blood_group text,
  father_name text,
  mother_name text,
  phone text,
  address text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_idcard_persons_project ON public.idcard_persons(project_id);
CREATE INDEX IF NOT EXISTS idx_idcard_persons_name ON public.idcard_persons(project_id, name);

CREATE TABLE IF NOT EXISTS public.idcard_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.idcard_projects(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.idcard_persons(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.idcard_templates(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
  file_url text,
  error_message text,
  generated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_idcard_generations_project ON public.idcard_generations(project_id);
CREATE INDEX IF NOT EXISTS idx_idcard_generations_person ON public.idcard_generations(person_id);

-- 2. UPDATED_AT TRIGGERS
CREATE OR REPLACE FUNCTION public.set_idcard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- 3. ENABLE RLS
ALTER TABLE public.idcard_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_generations ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES
-- idcard_projects
DROP POLICY IF EXISTS idcard_projects_select ON public.idcard_projects;
CREATE POLICY idcard_projects_select ON public.idcard_projects
  FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS idcard_projects_insert ON public.idcard_projects;
CREATE POLICY idcard_projects_insert ON public.idcard_projects
  FOR INSERT WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS idcard_projects_update ON public.idcard_projects;
CREATE POLICY idcard_projects_update ON public.idcard_projects
  FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS idcard_projects_delete ON public.idcard_projects;
CREATE POLICY idcard_projects_delete ON public.idcard_projects
  FOR DELETE USING (public.is_staff());

-- idcard_templates
DROP POLICY IF EXISTS idcard_templates_select ON public.idcard_templates;
CREATE POLICY idcard_templates_select ON public.idcard_templates
  FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS idcard_templates_insert ON public.idcard_templates;
CREATE POLICY idcard_templates_insert ON public.idcard_templates
  FOR INSERT WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS idcard_templates_update ON public.idcard_templates;
CREATE POLICY idcard_templates_update ON public.idcard_templates
  FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS idcard_templates_delete ON public.idcard_templates;
CREATE POLICY idcard_templates_delete ON public.idcard_templates
  FOR DELETE USING (public.is_staff());

-- idcard_persons
DROP POLICY IF EXISTS idcard_persons_select ON public.idcard_persons;
CREATE POLICY idcard_persons_select ON public.idcard_persons
  FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS idcard_persons_insert ON public.idcard_persons;
CREATE POLICY idcard_persons_insert ON public.idcard_persons
  FOR INSERT WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS idcard_persons_update ON public.idcard_persons;
CREATE POLICY idcard_persons_update ON public.idcard_persons
  FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS idcard_persons_delete ON public.idcard_persons;
CREATE POLICY idcard_persons_delete ON public.idcard_persons
  FOR DELETE USING (public.is_staff());

-- idcard_generations
DROP POLICY IF EXISTS idcard_generations_select ON public.idcard_generations;
CREATE POLICY idcard_generations_select ON public.idcard_generations
  FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS idcard_generations_insert ON public.idcard_generations;
CREATE POLICY idcard_generations_insert ON public.idcard_generations
  FOR INSERT WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS idcard_generations_update ON public.idcard_generations;
CREATE POLICY idcard_generations_update ON public.idcard_generations
  FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS idcard_generations_delete ON public.idcard_generations;
CREATE POLICY idcard_generations_delete ON public.idcard_generations
  FOR DELETE USING (public.is_staff());

-- 5. STORAGE BUCKET FOR IDCARD PHOTOS
INSERT INTO storage.buckets (id, name, public)
VALUES ('idcard-photos', 'idcard-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "idcard_photos_select" ON storage.objects;
CREATE POLICY "idcard_photos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'idcard-photos');

DROP POLICY IF EXISTS "idcard_photos_insert" ON storage.objects;
CREATE POLICY "idcard_photos_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'idcard-photos' AND (auth.role() = 'authenticated' OR public.is_staff()));

DROP POLICY IF EXISTS "idcard_photos_update" ON storage.objects;
CREATE POLICY "idcard_photos_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'idcard-photos' AND (auth.role() = 'authenticated' OR public.is_staff()));

DROP POLICY IF EXISTS "idcard_photos_delete" ON storage.objects;
CREATE POLICY "idcard_photos_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'idcard-photos' AND (auth.role() = 'authenticated' OR public.is_staff()));
