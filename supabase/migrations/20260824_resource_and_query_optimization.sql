-- ==============================================================================
-- PALAK ENTERPRISES — SUPABASE RESOURCE EXHAUSTION & QUERY PERFORMANCE HARDENING
-- Migration: 20260824_resource_and_query_optimization.sql
-- ==============================================================================

-- 1. FOREIGN KEY & HIGH-FREQUENCY FILTER INDEXES (Eliminates Seq Scans & Join Spikes)
-- ------------------------------------------------------------------------------

-- Order items & files
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_files_order_id ON public.order_files (order_id);
CREATE INDEX IF NOT EXISTS idx_order_files_order_item_id ON public.order_files (order_item_id);

-- Orders table query acceleration
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON public.orders (order_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_created_at ON public.orders (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_upper_order_code ON public.orders (UPPER(order_code));
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders (customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders (customer_email) WHERE customer_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_client_submission_id ON public.orders (client_submission_id) WHERE client_submission_id IS NOT NULL;

-- Invoices table & verification index
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_order_code ON public.invoices (order_code) WHERE order_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_customer_phone ON public.invoices ((customer_snapshot->>'phone')) WHERE customer_snapshot IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_upper_invoice_number ON public.invoices (UPPER(invoice_number));
CREATE INDEX IF NOT EXISTS idx_invoices_status_created_at ON public.invoices (status, created_at DESC);

-- Notifications & Audit Logs
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs (actor_id, created_at DESC) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_audit_logs_actor_id ON public.invoice_audit_logs (actor_id, created_at DESC) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_idcard_audit_logs_actor_id ON public.idcard_audit_logs (actor_id, created_at DESC) WHERE actor_id IS NOT NULL;

-- Status History (Accelerate RLS subqueries and timeline lookups)
CREATE INDEX IF NOT EXISTS idx_status_history_entity_code ON public.status_history (entity_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_history_entity_type_code ON public.status_history (entity_type, entity_code);

-- Service & Quote Requests
CREATE INDEX IF NOT EXISTS idx_service_requests_user_created ON public.service_requests (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_requests_request_code ON public.service_requests (UPPER(request_code));
CREATE INDEX IF NOT EXISTS idx_service_requests_customer_phone ON public.service_requests (customer_phone);

CREATE INDEX IF NOT EXISTS idx_quote_requests_user_created ON public.quote_requests (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quote_requests_quote_code ON public.quote_requests (UPPER(quote_code));
CREATE INDEX IF NOT EXISTS idx_quote_requests_customer_phone ON public.quote_requests (customer_phone);

-- Addresses & User Roles
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON public.user_roles (user_id, role);

-- Design Requests
CREATE INDEX IF NOT EXISTS idx_design_requests_user_id ON public.design_requests (user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- Catalog & Options
CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services (category_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_options_product_id ON public.product_options (product_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_option_values_option_id ON public.product_option_values (option_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_active_sort ON public.categories (is_active, sort_order);

-- ID Card System Indexes
CREATE INDEX IF NOT EXISTS idx_idcard_persons_group_id ON public.idcard_persons (group_id);
CREATE INDEX IF NOT EXISTS idx_idcard_persons_project_group ON public.idcard_persons (project_id, group_id, status);
CREATE INDEX IF NOT EXISTS idx_idcard_design_assignments_group ON public.idcard_design_assignments (group_id);
CREATE INDEX IF NOT EXISTS idx_idcard_design_assignments_design ON public.idcard_design_assignments (design_id);
CREATE INDEX IF NOT EXISTS idx_idcard_design_assignments_person ON public.idcard_design_assignments (person_id);
CREATE INDEX IF NOT EXISTS idx_idcard_design_assignments_version ON public.idcard_design_assignments (design_version_id);
CREATE INDEX IF NOT EXISTS idx_idcard_generated_cards_session_rec ON public.idcard_generated_cards (session_record_id);
CREATE INDEX IF NOT EXISTS idx_idcard_invoices_session_id ON public.idcard_invoices (session_id);
CREATE INDEX IF NOT EXISTS idx_idcard_invoices_snapshot_id ON public.idcard_invoices (pricing_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_idcard_print_batches_session_id ON public.idcard_print_batches (session_id);

-- 2. STABLE FUNCTION VOLATILITY (Caches role lookups per transaction during RLS checks)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 PARALLEL SAFE
AS $function$
DECLARE
    v_role TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN 'ANONYMOUS';
    END IF;

    SELECT role INTO v_role
    FROM public.user_roles
    WHERE user_id = auth.uid()
    ORDER BY CASE 
        WHEN role = 'ADMIN' THEN 1 
        WHEN role = 'MANAGER' THEN 2 
        WHEN role = 'STAFF' THEN 3 
        ELSE 4 
    END
    LIMIT 1;
    
    RETURN COALESCE(v_role, 'ANONYMOUS');
END;
$function$;

-- 3. REPLICA IDENTITY OPTIMIZATION FOR REALTIME
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.orders REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.status_history REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.notifications REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.service_requests REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.quote_requests REPLICA IDENTITY FULL;

-- 4. UPDATE STATS ACROSS ALL PUBLIC TABLES
-- ------------------------------------------------------------------------------
ANALYZE public.orders;
ANALYZE public.order_items;
ANALYZE public.order_files;
ANALYZE public.invoices;
ANALYZE public.invoice_audit_logs;
ANALYZE public.status_history;
ANALYZE public.service_requests;
ANALYZE public.quote_requests;
ANALYZE public.notifications;
ANALYZE public.categories;
ANALYZE public.products;
ANALYZE public.services;
ANALYZE public.product_options;
ANALYZE public.product_option_values;
ANALYZE public.user_roles;
ANALYZE public.profiles;
ANALYZE public.idcard_projects;
ANALYZE public.idcard_groups;
ANALYZE public.idcard_persons;
ANALYZE public.idcard_designs;
ANALYZE public.idcard_design_assignments;
ANALYZE public.idcard_invoices;
