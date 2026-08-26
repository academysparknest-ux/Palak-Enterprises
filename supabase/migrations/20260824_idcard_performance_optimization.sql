-- Universal ID Card Management System Performance Optimization Migration
-- Created: 2026-08-24
-- Description: Composite indexes, STABLE RLS functions, and server-side aggregation RPCs

--------------------------------------------------------
-- 1. RLS PERFORMANCE HARDENING (STABLE MODIFIER)
--------------------------------------------------------
-- Marking security definer helper functions STABLE allows PostgreSQL
-- to cache results per query statement instead of evaluating the auth
-- subquery for every single row scanned during RLS policy checks.

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


--------------------------------------------------------
-- 2. PERFORMANCE INDEXES
--------------------------------------------------------

-- Projects
CREATE INDEX IF NOT EXISTS idx_idcard_projects_status_updated ON public.idcard_projects(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_idcard_projects_created_by ON public.idcard_projects(created_by);

-- Project Fields
CREATE INDEX IF NOT EXISTS idx_idcard_project_fields_lookup ON public.idcard_project_fields(project_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_idcard_project_fields_group ON public.idcard_project_fields(project_id, field_group);

-- Sessions
CREATE INDEX IF NOT EXISTS idx_idcard_sessions_lookup ON public.idcard_sessions(project_id, is_current, status);

-- Groups
CREATE INDEX IF NOT EXISTS idx_idcard_groups_lookup ON public.idcard_groups(project_id, is_active, sort_order);

-- Persons
CREATE INDEX IF NOT EXISTS idx_idcard_persons_query ON public.idcard_persons(project_id, group_id, status, display_name);
CREATE INDEX IF NOT EXISTS idx_idcard_persons_person_code ON public.idcard_persons(project_id, person_code);

-- Person Field Values (EAV)
CREATE INDEX IF NOT EXISTS idx_idcard_person_field_values_person ON public.idcard_person_field_values(person_id);
CREATE INDEX IF NOT EXISTS idx_idcard_person_field_values_field ON public.idcard_person_field_values(field_id, person_id);

-- Session Records
CREATE INDEX IF NOT EXISTS idx_idcard_session_records_query ON public.idcard_session_records(session_id, status, person_id);
CREATE INDEX IF NOT EXISTS idx_idcard_session_records_person ON public.idcard_session_records(person_id);

-- Session Field Values
CREATE INDEX IF NOT EXISTS idx_idcard_session_field_values_record ON public.idcard_session_field_values(session_record_id);
CREATE INDEX IF NOT EXISTS idx_idcard_session_field_values_field ON public.idcard_session_field_values(field_id, session_record_id);

-- Photos
CREATE INDEX IF NOT EXISTS idx_idcard_photos_status_current ON public.idcard_photos(status, is_current);
CREATE INDEX IF NOT EXISTS idx_idcard_photos_person_current_status ON public.idcard_photos(person_id, is_current, status);

-- Designs & Versions
CREATE INDEX IF NOT EXISTS idx_idcard_designs_lookup ON public.idcard_designs(project_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_idcard_design_versions_lookup ON public.idcard_design_versions(design_id, version_number DESC);

-- Generated Cards
CREATE INDEX IF NOT EXISTS idx_idcard_generated_cards_project_status ON public.idcard_generated_cards(project_id, status, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_idcard_generated_cards_session_status ON public.idcard_generated_cards(session_id, status);
CREATE INDEX IF NOT EXISTS idx_idcard_generated_cards_design_version ON public.idcard_generated_cards(design_version_id);

-- Print Batches & Jobs
CREATE INDEX IF NOT EXISTS idx_idcard_print_batches_lookup ON public.idcard_print_batches(project_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_idcard_print_jobs_batch_status ON public.idcard_print_jobs(batch_id, status);
CREATE INDEX IF NOT EXISTS idx_idcard_print_jobs_card ON public.idcard_print_jobs(card_id);

-- Reprint History
CREATE INDEX IF NOT EXISTS idx_idcard_reprint_history_card ON public.idcard_reprint_history(card_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_idcard_reprint_history_batch ON public.idcard_reprint_history(batch_id);

-- Pricing & Invoices
CREATE INDEX IF NOT EXISTS idx_idcard_pricing_configs_lookup ON public.idcard_pricing_configs(project_id, is_active);
CREATE INDEX IF NOT EXISTS idx_idcard_pricing_snapshots_config ON public.idcard_pricing_snapshots(pricing_config_id);
CREATE INDEX IF NOT EXISTS idx_idcard_invoices_lookup ON public.idcard_invoices(project_id, status, payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_idcard_invoice_payments_invoice ON public.idcard_invoice_payments(invoice_id, payment_date DESC);

-- Audit Logs
CREATE INDEX IF NOT EXISTS idx_idcard_audit_logs_lookup ON public.idcard_audit_logs(project_id, created_at DESC);


--------------------------------------------------------
-- 3. SERVER-SIDE AGGREGATION RPC FUNCTIONS
--------------------------------------------------------

-- 3.1 Complete Project Stats (Single Query RPC)
CREATE OR REPLACE FUNCTION public.get_idcard_project_stats(p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_total_records INTEGER := 0;
    v_photos_ready INTEGER := 0;
    v_photos_missing INTEGER := 0;
    v_photos_needs_review INTEGER := 0;
    v_photos_invalid INTEGER := 0;
    v_cards_generated INTEGER := 0;
    v_cards_printed INTEGER := 0;
    v_cards_not_printed INTEGER := 0;
    v_cards_reprint_required INTEGER := 0;
    v_cards_reprinted INTEGER := 0;
    v_cards_failed INTEGER := 0;
BEGIN
    -- 1. Persons count
    SELECT COUNT(*) INTO v_total_records
    FROM public.idcard_persons
    WHERE project_id = p_project_id AND status = 'active';

    -- 2. Photo stats
    SELECT 
        COUNT(*) FILTER (WHERE ph.status = 'ready'),
        COUNT(*) FILTER (WHERE ph.status = 'needs_review'),
        COUNT(*) FILTER (WHERE ph.status IN ('invalid', 'failed')),
        COUNT(*) FILTER (WHERE ph.id IS NULL)
    INTO 
        v_photos_ready,
        v_photos_needs_review,
        v_photos_invalid,
        v_photos_missing
    FROM public.idcard_persons p
    LEFT JOIN public.idcard_photos ph 
        ON ph.person_id = p.id AND ph.is_current = true
    WHERE p.project_id = p_project_id AND p.status = 'active';

    -- 3. Generated cards stats
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'printed'),
        COUNT(*) FILTER (WHERE status IN ('generated', 'downloaded', 'not_printed')),
        COUNT(*) FILTER (WHERE status = 'reprint_required'),
        COUNT(*) FILTER (WHERE status = 'reprinted'),
        COUNT(*) FILTER (WHERE status = 'print_failed')
    INTO 
        v_cards_generated,
        v_cards_printed,
        v_cards_not_printed,
        v_cards_reprint_required,
        v_cards_reprinted,
        v_cards_failed
    FROM public.idcard_generated_cards
    WHERE project_id = p_project_id;

    RETURN jsonb_build_object(
        'totalRecords', v_total_records,
        'photosReady', v_photos_ready,
        'photosMissing', v_photos_missing,
        'photosNeedsReview', v_photos_needs_review,
        'photosInvalid', v_photos_invalid,
        'generated', v_cards_generated,
        'printed', v_cards_printed,
        'notPrinted', v_cards_not_printed,
        'reprintRequired', v_cards_reprint_required,
        'reprinted', v_cards_reprinted,
        'failed', v_cards_failed,
        'dataErrors', 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 3.2 Billing Dashboard Stats (Single Query RPC)
CREATE OR REPLACE FUNCTION public.get_idcard_billing_stats(p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_total_invoices INTEGER := 0;
    v_paid_invoices INTEGER := 0;
    v_unpaid_invoices INTEGER := 0;
    v_partially_paid_invoices INTEGER := 0;
    v_total_revenue NUMERIC(12,2) := 0;
    v_total_paid NUMERIC(12,2) := 0;
    v_total_outstanding NUMERIC(12,2) := 0;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE payment_status = 'paid'),
        COUNT(*) FILTER (WHERE payment_status = 'unpaid'),
        COUNT(*) FILTER (WHERE payment_status = 'partially_paid'),
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(amount_paid), 0),
        COALESCE(SUM(amount_due), 0)
    INTO 
        v_total_invoices,
        v_paid_invoices,
        v_unpaid_invoices,
        v_partially_paid_invoices,
        v_total_revenue,
        v_total_paid,
        v_total_outstanding
    FROM public.idcard_invoices
    WHERE project_id = p_project_id AND status != 'cancelled';

    RETURN jsonb_build_object(
        'totalInvoices', v_total_invoices,
        'paidInvoices', v_paid_invoices,
        'unpaidInvoices', v_unpaid_invoices,
        'partiallyPaidInvoices', v_partially_paid_invoices,
        'totalRevenue', v_total_revenue,
        'totalPaid', v_total_paid,
        'totalOutstanding', v_total_outstanding
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 3.3 Group Breakdown Report (Single Query RPC)
CREATE OR REPLACE FUNCTION public.get_idcard_group_reports(p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    WITH group_stats AS (
        SELECT 
            g.id,
            g.name,
            g.sort_order,
            COUNT(DISTINCT p.id) AS members,
            COUNT(DISTINCT c.id) AS cards_generated,
            COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'printed') AS cards_printed
        FROM public.idcard_groups g
        LEFT JOIN public.idcard_persons p 
            ON p.group_id = g.id AND p.status != 'archived'
        LEFT JOIN public.idcard_generated_cards c 
            ON c.person_id = p.id
        WHERE g.project_id = p_project_id AND g.is_active = true
        GROUP BY g.id, g.name, g.sort_order
    )
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', gs.id,
            'name', gs.name,
            'members', gs.members,
            'cardsGenerated', gs.cards_generated,
            'cardsPrinted', gs.cards_printed
        ) ORDER BY gs.sort_order ASC, gs.name ASC
    ), '[]'::jsonb)
    INTO v_result
    FROM group_stats gs;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 3.4 Paginated Persons with EAV Dynamic Fields (Zero N+1)
CREATE OR REPLACE FUNCTION public.get_idcard_persons_with_fields(
    p_project_id UUID,
    p_status TEXT DEFAULT NULL,
    p_group_id UUID DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    project_id UUID,
    group_id UUID,
    group_name TEXT,
    person_code TEXT,
    display_name TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    current_photo JSONB,
    field_values JSONB,
    total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH filtered_persons AS (
        SELECT 
            p.id,
            p.project_id,
            p.group_id,
            g.name AS group_name,
            p.person_code,
            p.display_name,
            p.status,
            p.created_at,
            p.updated_at,
            p.archived_at,
            COUNT(*) OVER() AS total_count
        FROM public.idcard_persons p
        LEFT JOIN public.idcard_groups g ON g.id = p.group_id
        WHERE p.project_id = p_project_id
          AND (p_status IS NULL OR p.status = p_status)
          AND (p_status IS NOT NULL OR p.status != 'archived')
          AND (p_group_id IS NULL OR p.group_id = p_group_id)
          AND (
              p_search IS NULL OR 
              p.display_name ILIKE ('%' || p_search || '%') OR 
              p.person_code ILIKE ('%' || p_search || '%')
          )
        ORDER BY p.display_name ASC
        LIMIT p_limit
        OFFSET p_offset
    )
    SELECT 
        fp.id,
        fp.project_id,
        fp.group_id,
        fp.group_name,
        fp.person_code,
        fp.display_name,
        fp.status,
        fp.created_at,
        fp.updated_at,
        fp.archived_at,
        (
            SELECT row_to_json(ph)::jsonb 
            FROM public.idcard_photos ph 
            WHERE ph.person_id = fp.id AND ph.is_current = true 
            LIMIT 1
        ) AS current_photo,
        COALESCE(
            (
                SELECT jsonb_object_agg(f.field_key, pfv.value)
                FROM public.idcard_person_field_values pfv
                JOIN public.idcard_project_fields f ON f.id = pfv.field_id
                WHERE pfv.person_id = fp.id
            ),
            '{}'::jsonb
        ) AS field_values,
        fp.total_count
    FROM filtered_persons fp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;
