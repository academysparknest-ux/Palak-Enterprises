-- Universal ID Card Management System Schema
-- Created: 2026-08-24
-- Description: Core tables, functions, and policies for the Universal ID Card Management System

--------------------------------------------------------
-- 1. UTILITY FUNCTIONS & TRIGGERS
--------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('STAFF', 'MANAGER', 'ADMIN')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('MANAGER', 'ADMIN')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'ADMIN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Trigger function for auto-updating updated_at columns
CREATE OR REPLACE FUNCTION public.trg_update_idcard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--------------------------------------------------------
-- 2. SEQUENCES & COUNTERS
--------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.idcard_invoice_counters (
    year INTEGER PRIMARY KEY,
    last_number INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.idcard_invoice_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_invoice_counters FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.generate_idcard_invoice_number(p_date TIMESTAMPTZ DEFAULT NOW())
RETURNS TEXT AS $$
DECLARE
    v_year INTEGER;
    v_next_number INTEGER;
    v_invoice_number TEXT;
BEGIN
    v_year := EXTRACT(YEAR FROM p_date);
    
    -- Insert or update the counter for the year
    INSERT INTO public.idcard_invoice_counters (year, last_number)
    VALUES (v_year, 1)
    ON CONFLICT (year) DO UPDATE
    SET last_number = public.idcard_invoice_counters.last_number + 1
    RETURNING last_number INTO v_next_number;
    
    -- Format: IDC-2026-000001
    v_invoice_number := 'IDC-' || v_year::TEXT || '-' || LPAD(v_next_number::TEXT, 6, '0');
    
    RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql;

--------------------------------------------------------
-- 3. TABLES
--------------------------------------------------------

-- idcard_projects
CREATE TABLE IF NOT EXISTS public.idcard_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    project_type TEXT NOT NULL DEFAULT 'school' CHECK (project_type IN ('school', 'college', 'company', 'organization', 'event', 'government', 'custom')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    settings JSONB NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    archived_at TIMESTAMPTZ
);

ALTER TABLE public.idcard_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_projects FORCE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_idcard_projects_updated_at ON public.idcard_projects;
CREATE TRIGGER update_idcard_projects_updated_at
    BEFORE UPDATE ON public.idcard_projects
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_update_idcard_updated_at();

-- idcard_project_fields
CREATE TABLE IF NOT EXISTS public.idcard_project_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.idcard_projects(id) ON DELETE CASCADE,
    field_key TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN ('text', 'long_text', 'number', 'date', 'phone', 'email', 'dropdown', 'checkbox', 'image', 'signature', 'qr', 'barcode')),
    label TEXT NOT NULL,
    placeholder TEXT,
    is_required BOOLEAN NOT NULL DEFAULT false,
    is_unique BOOLEAN NOT NULL DEFAULT false,
    is_searchable BOOLEAN NOT NULL DEFAULT false,
    field_group TEXT NOT NULL DEFAULT 'master' CHECK (field_group IN ('master', 'session')),
    options JSONB DEFAULT '[]',
    validation_rules JSONB DEFAULT '{}',
    default_value TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(project_id, field_key)
);

ALTER TABLE public.idcard_project_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_project_fields FORCE ROW LEVEL SECURITY;

-- idcard_sessions
CREATE TABLE IF NOT EXISTS public.idcard_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.idcard_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'upcoming', 'completed', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(project_id, name)
);

ALTER TABLE public.idcard_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_sessions FORCE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_idcard_sessions_updated_at ON public.idcard_sessions;
CREATE TRIGGER update_idcard_sessions_updated_at
    BEFORE UPDATE ON public.idcard_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_update_idcard_updated_at();

-- idcard_groups
CREATE TABLE IF NOT EXISTS public.idcard_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.idcard_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(project_id, name)
);

ALTER TABLE public.idcard_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_groups FORCE ROW LEVEL SECURITY;

-- idcard_persons
CREATE TABLE IF NOT EXISTS public.idcard_persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.idcard_projects(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.idcard_groups(id) ON DELETE SET NULL,
    person_code TEXT NOT NULL,
    display_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'left', 'transferred', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    archived_at TIMESTAMPTZ,
    UNIQUE(project_id, person_code)
);

CREATE INDEX IF NOT EXISTS idx_idcard_persons_status ON public.idcard_persons(project_id, status);
CREATE INDEX IF NOT EXISTS idx_idcard_persons_display_name ON public.idcard_persons(project_id, display_name);

ALTER TABLE public.idcard_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_persons FORCE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_idcard_persons_updated_at ON public.idcard_persons;
CREATE TRIGGER update_idcard_persons_updated_at
    BEFORE UPDATE ON public.idcard_persons
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_update_idcard_updated_at();

-- idcard_person_field_values
CREATE TABLE IF NOT EXISTS public.idcard_person_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES public.idcard_persons(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES public.idcard_project_fields(id) ON DELETE CASCADE,
    value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(person_id, field_id)
);

ALTER TABLE public.idcard_person_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_person_field_values FORCE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_idcard_person_field_values_updated_at ON public.idcard_person_field_values;
CREATE TRIGGER update_idcard_person_field_values_updated_at
    BEFORE UPDATE ON public.idcard_person_field_values
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_update_idcard_updated_at();

-- idcard_session_records
CREATE TABLE IF NOT EXISTS public.idcard_session_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.idcard_sessions(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES public.idcard_persons(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'promoted', 'left', 'transferred', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(session_id, person_id)
);

ALTER TABLE public.idcard_session_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_session_records FORCE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_idcard_session_records_updated_at ON public.idcard_session_records;
CREATE TRIGGER update_idcard_session_records_updated_at
    BEFORE UPDATE ON public.idcard_session_records
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_update_idcard_updated_at();

-- idcard_session_field_values
CREATE TABLE IF NOT EXISTS public.idcard_session_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_record_id UUID NOT NULL REFERENCES public.idcard_session_records(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES public.idcard_project_fields(id) ON DELETE CASCADE,
    value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(session_record_id, field_id)
);

ALTER TABLE public.idcard_session_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_session_field_values FORCE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_idcard_session_field_values_updated_at ON public.idcard_session_field_values;
CREATE TRIGGER update_idcard_session_field_values_updated_at
    BEFORE UPDATE ON public.idcard_session_field_values
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_update_idcard_updated_at();

-- idcard_photos
CREATE TABLE IF NOT EXISTS public.idcard_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES public.idcard_persons(id) ON DELETE CASCADE,
    original_url TEXT NOT NULL,
    original_storage_path TEXT NOT NULL,
    processed_url TEXT,
    processed_storage_path TEXT,
    thumbnail_url TEXT,
    status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'ready', 'needs_review', 'invalid', 'failed')),
    quality_flags JSONB DEFAULT '{}',
    processing_metadata JSONB DEFAULT '{}',
    is_current BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_idcard_photos_person_current ON public.idcard_photos(person_id, is_current);

ALTER TABLE public.idcard_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_photos FORCE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_idcard_photos_updated_at ON public.idcard_photos;
CREATE TRIGGER update_idcard_photos_updated_at
    BEFORE UPDATE ON public.idcard_photos
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_update_idcard_updated_at();

-- idcard_designs
CREATE TABLE IF NOT EXISTS public.idcard_designs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.idcard_projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'student' CHECK (category IN ('student', 'teacher', 'employee', 'staff', 'principal', 'event', 'visitor', 'custom')),
    is_double_sided BOOLEAN NOT NULL DEFAULT true,
    card_width_mm NUMERIC(6,2) NOT NULL DEFAULT 85.6,
    card_height_mm NUMERIC(6,2) NOT NULL DEFAULT 53.98,
    front_config JSONB NOT NULL DEFAULT '{}',
    back_config JSONB NOT NULL DEFAULT '{}',
    thumbnail_url TEXT,
    is_system_template BOOLEAN NOT NULL DEFAULT false,
    source_template_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.idcard_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_designs FORCE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_idcard_designs_updated_at ON public.idcard_designs;
CREATE TRIGGER update_idcard_designs_updated_at
    BEFORE UPDATE ON public.idcard_designs
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_update_idcard_updated_at();

-- idcard_design_versions
CREATE TABLE IF NOT EXISTS public.idcard_design_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id UUID NOT NULL REFERENCES public.idcard_designs(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    front_config JSONB NOT NULL,
    back_config JSONB NOT NULL DEFAULT '{}',
    card_width_mm NUMERIC(6,2) NOT NULL,
    card_height_mm NUMERIC(6,2) NOT NULL,
    is_double_sided BOOLEAN NOT NULL DEFAULT true,
    change_notes TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(design_id, version_number)
);

ALTER TABLE public.idcard_design_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_design_versions FORCE ROW LEVEL SECURITY;

-- idcard_design_assignments
CREATE TABLE IF NOT EXISTS public.idcard_design_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.idcard_projects(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.idcard_groups(id) ON DELETE CASCADE,
    person_id UUID REFERENCES public.idcard_persons(id) ON DELETE CASCADE,
    design_id UUID NOT NULL REFERENCES public.idcard_designs(id) ON DELETE CASCADE,
    design_version_id UUID REFERENCES public.idcard_design_versions(id) ON DELETE SET NULL,
    is_individual_override BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CHECK ((group_id IS NOT NULL AND person_id IS NULL) OR (group_id IS NULL AND person_id IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_idcard_design_assignments_group ON public.idcard_design_assignments(project_id, group_id) WHERE group_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_idcard_design_assignments_person ON public.idcard_design_assignments(project_id, person_id) WHERE person_id IS NOT NULL;

ALTER TABLE public.idcard_design_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_design_assignments FORCE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_idcard_design_assignments_updated_at ON public.idcard_design_assignments;
CREATE TRIGGER update_idcard_design_assignments_updated_at
    BEFORE UPDATE ON public.idcard_design_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_update_idcard_updated_at();

-- idcard_generated_cards
CREATE TABLE IF NOT EXISTS public.idcard_generated_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.idcard_projects(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.idcard_sessions(id) ON DELETE SET NULL,
    person_id UUID NOT NULL REFERENCES public.idcard_persons(id) ON DELETE CASCADE,
    session_record_id UUID REFERENCES public.idcard_session_records(id) ON DELETE SET NULL,
    design_version_id UUID NOT NULL REFERENCES public.idcard_design_versions(id) ON DELETE RESTRICT,
    card_number TEXT NOT NULL,
    qr_token TEXT UNIQUE NOT NULL,
    qr_verification_url TEXT,
    data_snapshot JSONB NOT NULL,
    photo_snapshot_url TEXT,
    front_render_url TEXT,
    back_render_url TEXT,
    status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'downloaded', 'printed', 'not_printed', 'print_failed', 'reprint_required', 'reprinted', 'cancelled')),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    generated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_idcard_generated_cards_status ON public.idcard_generated_cards(project_id, session_id, status);
CREATE INDEX IF NOT EXISTS idx_idcard_generated_cards_qr ON public.idcard_generated_cards(qr_token);
CREATE INDEX IF NOT EXISTS idx_idcard_generated_cards_person ON public.idcard_generated_cards(person_id);

ALTER TABLE public.idcard_generated_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_generated_cards FORCE ROW LEVEL SECURITY;

-- idcard_print_batches
CREATE TABLE IF NOT EXISTS public.idcard_print_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.idcard_projects(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.idcard_sessions(id) ON DELETE SET NULL,
    batch_number TEXT NOT NULL,
    paper_size TEXT NOT NULL DEFAULT 'A4',
    paper_orientation TEXT NOT NULL DEFAULT 'portrait' CHECK (paper_orientation IN ('portrait', 'landscape')),
    card_width_mm NUMERIC(6,2) NOT NULL,
    card_height_mm NUMERIC(6,2) NOT NULL,
    cards_per_page INTEGER NOT NULL DEFAULT 8,
    rows_per_page INTEGER NOT NULL DEFAULT 4,
    cols_per_page INTEGER NOT NULL DEFAULT 2,
    margin_top_mm NUMERIC(6,2) NOT NULL DEFAULT 10,
    margin_bottom_mm NUMERIC(6,2) NOT NULL DEFAULT 10,
    margin_left_mm NUMERIC(6,2) NOT NULL DEFAULT 12,
    margin_right_mm NUMERIC(6,2) NOT NULL DEFAULT 12,
    spacing_h_mm NUMERIC(6,2) NOT NULL DEFAULT 5,
    spacing_v_mm NUMERIC(6,2) NOT NULL DEFAULT 5,
    total_cards INTEGER NOT NULL DEFAULT 0,
    printed_cards INTEGER NOT NULL DEFAULT 0,
    failed_cards INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'generating', 'ready', 'printing', 'completed', 'partial', 'failed', 'cancelled')),
    pdf_url TEXT,
    pdf_storage_path TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_idcard_print_batches_status ON public.idcard_print_batches(project_id, status);

ALTER TABLE public.idcard_print_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_print_batches FORCE ROW LEVEL SECURITY;

-- idcard_print_jobs
CREATE TABLE IF NOT EXISTS public.idcard_print_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.idcard_print_batches(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES public.idcard_generated_cards(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'printed', 'failed', 'skipped')),
    page_number INTEGER,
    position_on_page INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    printed_at TIMESTAMPTZ
);

ALTER TABLE public.idcard_print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_print_jobs FORCE ROW LEVEL SECURITY;

-- idcard_reprint_history
CREATE TABLE IF NOT EXISTS public.idcard_reprint_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.idcard_generated_cards(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.idcard_print_batches(id) ON DELETE SET NULL,
    reason TEXT NOT NULL CHECK (reason IN ('lost', 'damaged', 'printing_error', 'incorrect_info', 'photo_correction', 'not_printed', 'other')),
    notes TEXT,
    performed_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.idcard_reprint_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_reprint_history FORCE ROW LEVEL SECURITY;

-- idcard_pricing_configs
CREATE TABLE IF NOT EXISTS public.idcard_pricing_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.idcard_projects(id) ON DELETE CASCADE,
    price_per_card NUMERIC(10,2) NOT NULL DEFAULT 20.00,
    price_per_print NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    price_per_reprint NUMERIC(10,2) NOT NULL DEFAULT 10.00,
    lamination_price NUMERIC(10,2) NOT NULL DEFAULT 5.00,
    design_charge NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    photo_processing_charge NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    other_charge NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    other_charge_label TEXT,
    discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    billing_basis TEXT NOT NULL DEFAULT 'generated' CHECK (billing_basis IN ('generated', 'printed', 'total_prints', 'custom')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.idcard_pricing_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_pricing_configs FORCE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_idcard_pricing_configs_updated_at ON public.idcard_pricing_configs;
CREATE TRIGGER update_idcard_pricing_configs_updated_at
    BEFORE UPDATE ON public.idcard_pricing_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_update_idcard_updated_at();

-- idcard_pricing_snapshots
CREATE TABLE IF NOT EXISTS public.idcard_pricing_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pricing_config_id UUID REFERENCES public.idcard_pricing_configs(id) ON DELETE SET NULL,
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.idcard_pricing_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_pricing_snapshots FORCE ROW LEVEL SECURITY;

-- idcard_invoices
CREATE TABLE IF NOT EXISTS public.idcard_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.idcard_projects(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.idcard_sessions(id) ON DELETE SET NULL,
    invoice_number TEXT UNIQUE NOT NULL,
    invoice_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    customer_name TEXT NOT NULL,
    customer_organization TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    customer_address TEXT,
    customer_gstin TEXT,
    pricing_snapshot_id UUID REFERENCES public.idcard_pricing_snapshots(id) ON DELETE SET NULL,
    line_items JSONB NOT NULL DEFAULT '[]',
    cards_generated INTEGER NOT NULL DEFAULT 0,
    cards_printed INTEGER NOT NULL DEFAULT 0,
    cards_reprinted INTEGER NOT NULL DEFAULT 0,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    taxable_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
    amount_due NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid', 'cancelled')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'cancelled')),
    notes TEXT,
    created_by TEXT,
    cancelled_at TIMESTAMPTZ,
    cancelled_by TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_idcard_invoices_status ON public.idcard_invoices(project_id, status);

ALTER TABLE public.idcard_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_invoices FORCE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_idcard_invoices_updated_at ON public.idcard_invoices;
CREATE TRIGGER update_idcard_invoices_updated_at
    BEFORE UPDATE ON public.idcard_invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_update_idcard_updated_at();

-- idcard_invoice_payments
CREATE TABLE IF NOT EXISTS public.idcard_invoice_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.idcard_invoices(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'card', 'cheque', 'other')),
    payment_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    reference_number TEXT,
    notes TEXT,
    received_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.idcard_invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_invoice_payments FORCE ROW LEVEL SECURITY;

-- idcard_audit_logs
CREATE TABLE IF NOT EXISTS public.idcard_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.idcard_projects(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    action TEXT NOT NULL,
    actor_name TEXT NOT NULL DEFAULT 'System',
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}',
    before_data JSONB,
    after_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_idcard_audit_logs_search ON public.idcard_audit_logs(project_id, entity_type, created_at DESC);

ALTER TABLE public.idcard_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_audit_logs FORCE ROW LEVEL SECURITY;

-- idcard_templates
CREATE TABLE IF NOT EXISTS public.idcard_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('student', 'teacher', 'employee', 'staff', 'principal', 'event', 'visitor', 'custom')),
    sub_category TEXT,
    is_double_sided BOOLEAN NOT NULL DEFAULT true,
    card_width_mm NUMERIC(6,2) NOT NULL DEFAULT 85.6,
    card_height_mm NUMERIC(6,2) NOT NULL DEFAULT 53.98,
    front_config JSONB NOT NULL,
    back_config JSONB NOT NULL DEFAULT '{}',
    thumbnail_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.idcard_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idcard_templates FORCE ROW LEVEL SECURITY;


--------------------------------------------------------
-- 4. RLS POLICIES
--------------------------------------------------------

-- Policies for idcard_projects
DROP POLICY IF EXISTS "Staff can view active and archived projects" ON public.idcard_projects;
DROP POLICY IF EXISTS "Staff can view active and archived projects" ON public.idcard_projects;
CREATE POLICY "Staff can view active and archived projects" ON public.idcard_projects FOR SELECT USING (public.is_staff() AND status IN ('active', 'archived'));
DROP POLICY IF EXISTS "Managers can insert projects" ON public.idcard_projects;
DROP POLICY IF EXISTS "Managers can insert projects" ON public.idcard_projects;
CREATE POLICY "Managers can insert projects" ON public.idcard_projects FOR INSERT WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "Managers can update projects" ON public.idcard_projects;
DROP POLICY IF EXISTS "Managers can update projects" ON public.idcard_projects;
CREATE POLICY "Managers can update projects" ON public.idcard_projects FOR UPDATE USING (public.is_manager());
DROP POLICY IF EXISTS "Admins can delete projects" ON public.idcard_projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON public.idcard_projects;
CREATE POLICY "Admins can delete projects" ON public.idcard_projects FOR DELETE USING (public.is_admin());

-- Policies for idcard_project_fields
DROP POLICY IF EXISTS "Staff can view fields" ON public.idcard_project_fields;
DROP POLICY IF EXISTS "Staff can view fields" ON public.idcard_project_fields;
CREATE POLICY "Staff can view fields" ON public.idcard_project_fields FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "Managers can insert fields" ON public.idcard_project_fields;
DROP POLICY IF EXISTS "Managers can insert fields" ON public.idcard_project_fields;
CREATE POLICY "Managers can insert fields" ON public.idcard_project_fields FOR INSERT WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "Managers can update fields" ON public.idcard_project_fields;
DROP POLICY IF EXISTS "Managers can update fields" ON public.idcard_project_fields;
CREATE POLICY "Managers can update fields" ON public.idcard_project_fields FOR UPDATE USING (public.is_manager());
DROP POLICY IF EXISTS "Managers can delete fields" ON public.idcard_project_fields;
DROP POLICY IF EXISTS "Managers can delete fields" ON public.idcard_project_fields;
CREATE POLICY "Managers can delete fields" ON public.idcard_project_fields FOR DELETE USING (public.is_manager());

-- Policies for idcard_sessions
DROP POLICY IF EXISTS "Staff can view sessions" ON public.idcard_sessions;
DROP POLICY IF EXISTS "Staff can view sessions" ON public.idcard_sessions;
CREATE POLICY "Staff can view sessions" ON public.idcard_sessions FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "Managers can insert sessions" ON public.idcard_sessions;
DROP POLICY IF EXISTS "Managers can insert sessions" ON public.idcard_sessions;
CREATE POLICY "Managers can insert sessions" ON public.idcard_sessions FOR INSERT WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "Managers can update sessions" ON public.idcard_sessions;
DROP POLICY IF EXISTS "Managers can update sessions" ON public.idcard_sessions;
CREATE POLICY "Managers can update sessions" ON public.idcard_sessions FOR UPDATE USING (public.is_manager());

-- Policies for idcard_groups
DROP POLICY IF EXISTS "Staff can view groups" ON public.idcard_groups;
DROP POLICY IF EXISTS "Staff can view groups" ON public.idcard_groups;
CREATE POLICY "Staff can view groups" ON public.idcard_groups FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "Managers can insert groups" ON public.idcard_groups;
DROP POLICY IF EXISTS "Managers can insert groups" ON public.idcard_groups;
CREATE POLICY "Managers can insert groups" ON public.idcard_groups FOR INSERT WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "Managers can update groups" ON public.idcard_groups;
DROP POLICY IF EXISTS "Managers can update groups" ON public.idcard_groups;
CREATE POLICY "Managers can update groups" ON public.idcard_groups FOR UPDATE USING (public.is_manager());
DROP POLICY IF EXISTS "Managers can delete groups" ON public.idcard_groups;
DROP POLICY IF EXISTS "Managers can delete groups" ON public.idcard_groups;
CREATE POLICY "Managers can delete groups" ON public.idcard_groups FOR DELETE USING (public.is_manager());

-- Policies for idcard_persons
DROP POLICY IF EXISTS "Staff can view persons" ON public.idcard_persons;
DROP POLICY IF EXISTS "Staff can view persons" ON public.idcard_persons;
CREATE POLICY "Staff can view persons" ON public.idcard_persons FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "Managers can insert persons" ON public.idcard_persons;
DROP POLICY IF EXISTS "Managers can insert persons" ON public.idcard_persons;
CREATE POLICY "Managers can insert persons" ON public.idcard_persons FOR INSERT WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "Managers can update persons" ON public.idcard_persons;
DROP POLICY IF EXISTS "Managers can update persons" ON public.idcard_persons;
CREATE POLICY "Managers can update persons" ON public.idcard_persons FOR UPDATE USING (public.is_manager());
DROP POLICY IF EXISTS "Managers can delete persons" ON public.idcard_persons;
DROP POLICY IF EXISTS "Managers can delete persons" ON public.idcard_persons;
CREATE POLICY "Managers can delete persons" ON public.idcard_persons FOR DELETE USING (public.is_manager());

-- Policies for idcard_person_field_values
DROP POLICY IF EXISTS "Staff can view person fields" ON public.idcard_person_field_values;
DROP POLICY IF EXISTS "Staff can view person fields" ON public.idcard_person_field_values;
CREATE POLICY "Staff can view person fields" ON public.idcard_person_field_values FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "Managers can insert person fields" ON public.idcard_person_field_values;
DROP POLICY IF EXISTS "Managers can insert person fields" ON public.idcard_person_field_values;
CREATE POLICY "Managers can insert person fields" ON public.idcard_person_field_values FOR INSERT WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "Managers can update person fields" ON public.idcard_person_field_values;
DROP POLICY IF EXISTS "Managers can update person fields" ON public.idcard_person_field_values;
CREATE POLICY "Managers can update person fields" ON public.idcard_person_field_values FOR UPDATE USING (public.is_manager());
DROP POLICY IF EXISTS "Managers can delete person fields" ON public.idcard_person_field_values;
DROP POLICY IF EXISTS "Managers can delete person fields" ON public.idcard_person_field_values;
CREATE POLICY "Managers can delete person fields" ON public.idcard_person_field_values FOR DELETE USING (public.is_manager());

-- Policies for idcard_session_records
DROP POLICY IF EXISTS "Staff can view session records" ON public.idcard_session_records;
DROP POLICY IF EXISTS "Staff can view session records" ON public.idcard_session_records;
CREATE POLICY "Staff can view session records" ON public.idcard_session_records FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "Managers can insert session records" ON public.idcard_session_records;
DROP POLICY IF EXISTS "Managers can insert session records" ON public.idcard_session_records;
CREATE POLICY "Managers can insert session records" ON public.idcard_session_records FOR INSERT WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "Managers can update session records" ON public.idcard_session_records;
DROP POLICY IF EXISTS "Managers can update session records" ON public.idcard_session_records;
CREATE POLICY "Managers can update session records" ON public.idcard_session_records FOR UPDATE USING (public.is_manager());
DROP POLICY IF EXISTS "Managers can delete session records" ON public.idcard_session_records;
DROP POLICY IF EXISTS "Managers can delete session records" ON public.idcard_session_records;
CREATE POLICY "Managers can delete session records" ON public.idcard_session_records FOR DELETE USING (public.is_manager());

-- Policies for idcard_session_field_values
DROP POLICY IF EXISTS "Staff can view session field values" ON public.idcard_session_field_values;
DROP POLICY IF EXISTS "Staff can view session field values" ON public.idcard_session_field_values;
CREATE POLICY "Staff can view session field values" ON public.idcard_session_field_values FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "Managers can insert session field values" ON public.idcard_session_field_values;
DROP POLICY IF EXISTS "Managers can insert session field values" ON public.idcard_session_field_values;
CREATE POLICY "Managers can insert session field values" ON public.idcard_session_field_values FOR INSERT WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "Managers can update session field values" ON public.idcard_session_field_values;
DROP POLICY IF EXISTS "Managers can update session field values" ON public.idcard_session_field_values;
CREATE POLICY "Managers can update session field values" ON public.idcard_session_field_values FOR UPDATE USING (public.is_manager());
DROP POLICY IF EXISTS "Managers can delete session field values" ON public.idcard_session_field_values;
DROP POLICY IF EXISTS "Managers can delete session field values" ON public.idcard_session_field_values;
CREATE POLICY "Managers can delete session field values" ON public.idcard_session_field_values FOR DELETE USING (public.is_manager());

-- Policies for idcard_photos
DROP POLICY IF EXISTS "Staff can view photos" ON public.idcard_photos;
DROP POLICY IF EXISTS "Staff can view photos" ON public.idcard_photos;
CREATE POLICY "Staff can view photos" ON public.idcard_photos FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "Managers can insert photos" ON public.idcard_photos;
DROP POLICY IF EXISTS "Managers can insert photos" ON public.idcard_photos;
CREATE POLICY "Managers can insert photos" ON public.idcard_photos FOR INSERT WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "Managers can update photos" ON public.idcard_photos;
DROP POLICY IF EXISTS "Managers can update photos" ON public.idcard_photos;
CREATE POLICY "Managers can update photos" ON public.idcard_photos FOR UPDATE USING (public.is_manager());
DROP POLICY IF EXISTS "Managers can delete photos" ON public.idcard_photos;
DROP POLICY IF EXISTS "Managers can delete photos" ON public.idcard_photos;
CREATE POLICY "Managers can delete photos" ON public.idcard_photos FOR DELETE USING (public.is_manager());

-- Policies for idcard_designs
DROP POLICY IF EXISTS "Staff can view designs" ON public.idcard_designs;
DROP POLICY IF EXISTS "Staff can view designs" ON public.idcard_designs;
CREATE POLICY "Staff can view designs" ON public.idcard_designs FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "Managers can insert designs" ON public.idcard_designs;
DROP POLICY IF EXISTS "Managers can insert designs" ON public.idcard_designs;
CREATE POLICY "Managers can insert designs" ON public.idcard_designs FOR INSERT WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "Managers can update designs" ON public.idcard_designs;
DROP POLICY IF EXISTS "Managers can update designs" ON public.idcard_designs;
CREATE POLICY "Managers can update designs" ON public.idcard_designs FOR UPDATE USING (public.is_manager());
DROP POLICY IF EXISTS "Managers can delete designs" ON public.idcard_designs;
DROP POLICY IF EXISTS "Managers can delete designs" ON public.idcard_designs;
CREATE POLICY "Managers can delete designs" ON public.idcard_designs FOR DELETE USING (public.is_manager());

-- Policies for idcard_design_versions
DROP POLICY IF EXISTS "Staff can view design versions" ON public.idcard_design_versions;
DROP POLICY IF EXISTS "Staff can view design versions" ON public.idcard_design_versions;
CREATE POLICY "Staff can view design versions" ON public.idcard_design_versions FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "Managers can insert design versions" ON public.idcard_design_versions;
DROP POLICY IF EXISTS "Managers can insert design versions" ON public.idcard_design_versions;
CREATE POLICY "Managers can insert design versions" ON public.idcard_design_versions FOR INSERT WITH CHECK (public.is_manager());

-- Policies for idcard_design_assignments
DROP POLICY IF EXISTS "Staff can view design assignments" ON public.idcard_design_assignments;
DROP POLICY IF EXISTS "Staff can view design assignments" ON public.idcard_design_assignments;
CREATE POLICY "Staff can view design assignments" ON public.idcard_design_assignments FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "Managers can insert design assignments" ON public.idcard_design_assignments;
DROP POLICY IF EXISTS "Managers can insert design assignments" ON public.idcard_design_assignments;
CREATE POLICY "Managers can insert design assignments" ON public.idcard_design_assignments FOR INSERT WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "Managers can update design assignments" ON public.idcard_design_assignments;
DROP POLICY IF EXISTS "Managers can update design assignments" ON public.idcard_design_assignments;
CREATE POLICY "Managers can update design assignments" ON public.idcard_design_assignments FOR UPDATE USING (public.is_manager());
DROP POLICY IF EXISTS "Managers can delete design assignments" ON public.idcard_design_assignments;
DROP POLICY IF EXISTS "Managers can delete design assignments" ON public.idcard_design_assignments;
CREATE POLICY "Managers can delete design assignments" ON public.idcard_design_assignments FOR DELETE USING (public.is_manager());

-- Policies for idcard_generated_cards
DROP POLICY IF EXISTS "Staff can view generated cards" ON public.idcard_generated_cards;
DROP POLICY IF EXISTS "Staff can view generated cards" ON public.idcard_generated_cards;
CREATE POLICY "Staff can view generated cards" ON public.idcard_generated_cards FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "Managers can insert generated cards" ON public.idcard_generated_cards;
DROP POLICY IF EXISTS "Managers can insert generated cards" ON public.idcard_generated_cards;
CREATE POLICY "Managers can insert generated cards" ON public.idcard_generated_cards FOR INSERT WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "Managers can update generated cards" ON public.idcard_generated_cards;
DROP POLICY IF EXISTS "Managers can update generated cards" ON public.idcard_generated_cards;
CREATE POLICY "Managers can update generated cards" ON public.idcard_generated_cards FOR UPDATE USING (public.is_manager());
DROP POLICY IF EXISTS "Managers can delete generated cards" ON public.idcard_generated_cards;
DROP POLICY IF EXISTS "Managers can delete generated cards" ON public.idcard_generated_cards;
CREATE POLICY "Managers can delete generated cards" ON public.idcard_generated_cards FOR DELETE USING (public.is_manager());

-- Policies for idcard_print_batches
DROP POLICY IF EXISTS "Staff can view print batches" ON public.idcard_print_batches;
DROP POLICY IF EXISTS "Staff can view print batches" ON public.idcard_print_batches;
CREATE POLICY "Staff can view print batches" ON public.idcard_print_batches FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "Managers can insert print batches" ON public.idcard_print_batches;
DROP POLICY IF EXISTS "Managers can insert print batches" ON public.idcard_print_batches;
CREATE POLICY "Managers can insert print batches" ON public.idcard_print_batches FOR INSERT WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "Managers can update print batches" ON public.idcard_print_batches;
DROP POLICY IF EXISTS "Managers can update print batches" ON public.idcard_print_batches;
CREATE POLICY "Managers can update print batches" ON public.idcard_print_batches FOR UPDATE USING (public.is_manager());
DROP POLICY IF EXISTS "Managers can delete print batches" ON public.idcard_print_batches;
DROP POLICY IF EXISTS "Managers can delete print batches" ON public.idcard_print_batches;
CREATE POLICY "Managers can delete print batches" ON public.idcard_print_batches FOR DELETE USING (public.is_manager());

-- Policies for idcard_print_jobs
DROP POLICY IF EXISTS "Staff can view print jobs" ON public.idcard_print_jobs;
DROP POLICY IF EXISTS "Staff can view print jobs" ON public.idcard_print_jobs;
CREATE POLICY "Staff can view print jobs" ON public.idcard_print_jobs FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "Managers can insert print jobs" ON public.idcard_print_jobs;
DROP POLICY IF EXISTS "Managers can insert print jobs" ON public.idcard_print_jobs;
CREATE POLICY "Managers can insert print jobs" ON public.idcard_print_jobs FOR INSERT WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "Managers can update print jobs" ON public.idcard_print_jobs;
DROP POLICY IF EXISTS "Managers can update print jobs" ON public.idcard_print_jobs;
CREATE POLICY "Managers can update print jobs" ON public.idcard_print_jobs FOR UPDATE USING (public.is_manager());
DROP POLICY IF EXISTS "Managers can delete print jobs" ON public.idcard_print_jobs;
DROP POLICY IF EXISTS "Managers can delete print jobs" ON public.idcard_print_jobs;
CREATE POLICY "Managers can delete print jobs" ON public.idcard_print_jobs FOR DELETE USING (public.is_manager());

-- Policies for idcard_reprint_history
DROP POLICY IF EXISTS "Staff can view reprint history" ON public.idcard_reprint_history;
DROP POLICY IF EXISTS "Staff can view reprint history" ON public.idcard_reprint_history;
CREATE POLICY "Staff can view reprint history" ON public.idcard_reprint_history FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "Managers can insert reprint history" ON public.idcard_reprint_history;
DROP POLICY IF EXISTS "Managers can insert reprint history" ON public.idcard_reprint_history;
CREATE POLICY "Managers can insert reprint history" ON public.idcard_reprint_history FOR INSERT WITH CHECK (public.is_manager());

-- Policies for idcard_pricing_configs
DROP POLICY IF EXISTS "Staff can view pricing configs" ON public.idcard_pricing_configs;
DROP POLICY IF EXISTS "Staff can view pricing configs" ON public.idcard_pricing_configs;
CREATE POLICY "Staff can view pricing configs" ON public.idcard_pricing_configs FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "Managers can insert pricing configs" ON public.idcard_pricing_configs;
DROP POLICY IF EXISTS "Managers can insert pricing configs" ON public.idcard_pricing_configs;
CREATE POLICY "Managers can insert pricing configs" ON public.idcard_pricing_configs FOR INSERT WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "Managers can update pricing configs" ON public.idcard_pricing_configs;
DROP POLICY IF EXISTS "Managers can update pricing configs" ON public.idcard_pricing_configs;
CREATE POLICY "Managers can update pricing configs" ON public.idcard_pricing_configs FOR UPDATE USING (public.is_manager());
DROP POLICY IF EXISTS "Managers can delete pricing configs" ON public.idcard_pricing_configs;
DROP POLICY IF EXISTS "Managers can delete pricing configs" ON public.idcard_pricing_configs;
CREATE POLICY "Managers can delete pricing configs" ON public.idcard_pricing_configs FOR DELETE USING (public.is_manager());

-- Policies for idcard_pricing_snapshots
DROP POLICY IF EXISTS "Staff can view pricing snapshots" ON public.idcard_pricing_snapshots;
DROP POLICY IF EXISTS "Staff can view pricing snapshots" ON public.idcard_pricing_snapshots;
CREATE POLICY "Staff can view pricing snapshots" ON public.idcard_pricing_snapshots FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "Managers can insert pricing snapshots" ON public.idcard_pricing_snapshots;
DROP POLICY IF EXISTS "Managers can insert pricing snapshots" ON public.idcard_pricing_snapshots;
CREATE POLICY "Managers can insert pricing snapshots" ON public.idcard_pricing_snapshots FOR INSERT WITH CHECK (public.is_manager());

-- Policies for idcard_invoices
DROP POLICY IF EXISTS "Staff can view invoices" ON public.idcard_invoices;
DROP POLICY IF EXISTS "Staff can view invoices" ON public.idcard_invoices;
CREATE POLICY "Staff can view invoices" ON public.idcard_invoices FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "Managers can insert invoices" ON public.idcard_invoices;
DROP POLICY IF EXISTS "Managers can insert invoices" ON public.idcard_invoices;
CREATE POLICY "Managers can insert invoices" ON public.idcard_invoices FOR INSERT WITH CHECK (public.is_manager());
DROP POLICY IF EXISTS "Managers can update invoices" ON public.idcard_invoices;
DROP POLICY IF EXISTS "Managers can update invoices" ON public.idcard_invoices;
CREATE POLICY "Managers can update invoices" ON public.idcard_invoices FOR UPDATE USING (public.is_manager());
DROP POLICY IF EXISTS "Managers can delete invoices" ON public.idcard_invoices;
DROP POLICY IF EXISTS "Managers can delete invoices" ON public.idcard_invoices;
CREATE POLICY "Managers can delete invoices" ON public.idcard_invoices FOR DELETE USING (public.is_manager());

-- Policies for idcard_invoice_payments
DROP POLICY IF EXISTS "Staff can view invoice payments" ON public.idcard_invoice_payments;
DROP POLICY IF EXISTS "Staff can view invoice payments" ON public.idcard_invoice_payments;
CREATE POLICY "Staff can view invoice payments" ON public.idcard_invoice_payments FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "Managers can insert invoice payments" ON public.idcard_invoice_payments;
DROP POLICY IF EXISTS "Managers can insert invoice payments" ON public.idcard_invoice_payments;
CREATE POLICY "Managers can insert invoice payments" ON public.idcard_invoice_payments FOR INSERT WITH CHECK (public.is_manager());

-- Policies for idcard_audit_logs
DROP POLICY IF EXISTS "Staff can view audit logs" ON public.idcard_audit_logs;
DROP POLICY IF EXISTS "Staff can view audit logs" ON public.idcard_audit_logs;
CREATE POLICY "Staff can view audit logs" ON public.idcard_audit_logs FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "Managers can insert audit logs" ON public.idcard_audit_logs;
DROP POLICY IF EXISTS "Managers can insert audit logs" ON public.idcard_audit_logs;
CREATE POLICY "Managers can insert audit logs" ON public.idcard_audit_logs FOR INSERT WITH CHECK (public.is_manager());

-- Policies for idcard_templates
DROP POLICY IF EXISTS "Anyone can view active templates" ON public.idcard_templates;
DROP POLICY IF EXISTS "Anyone can view active templates" ON public.idcard_templates;
CREATE POLICY "Anyone can view active templates" ON public.idcard_templates FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Managers can manage templates" ON public.idcard_templates;
DROP POLICY IF EXISTS "Managers can manage templates" ON public.idcard_templates;
CREATE POLICY "Managers can manage templates" ON public.idcard_templates USING (public.is_manager());


--------------------------------------------------------
-- 5. STORAGE BUCKETS
--------------------------------------------------------

-- Insert the idcard-assets bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('idcard-assets', 'idcard-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for storage.objects in idcard-assets
DROP POLICY IF EXISTS "Staff can upload to idcard-assets" ON storage.objects;
CREATE POLICY "Staff can upload to idcard-assets" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'idcard-assets' AND public.is_staff());

DROP POLICY IF EXISTS "Staff can update idcard-assets" ON storage.objects;
CREATE POLICY "Staff can update idcard-assets" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'idcard-assets' AND public.is_staff());

DROP POLICY IF EXISTS "Staff can delete from idcard-assets" ON storage.objects;
CREATE POLICY "Staff can delete from idcard-assets" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'idcard-assets' AND public.is_staff());

DROP POLICY IF EXISTS "Public can read idcard-assets" ON storage.objects;
CREATE POLICY "Public can read idcard-assets" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'idcard-assets');

