-- ==============================================================================
-- Palak Enterprises — Online Printing Preferences, Snapshots & Print Center
-- Migration: 20260822_online_print_preferences_and_print_center.sql
-- ==============================================================================

-- 1. Ensure print_snapshot column exists on public.orders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'print_snapshot'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN print_snapshot JSONB;
    END IF;
END $$;

-- 2. User Saved Print Preferences Table
CREATE TABLE IF NOT EXISTS public.user_print_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_print_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own print preferences" ON public.user_print_preferences;
CREATE POLICY "Users can view their own print preferences"
    ON public.user_print_preferences
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own print preferences" ON public.user_print_preferences;
CREATE POLICY "Users can update their own print preferences"
    ON public.user_print_preferences
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Print Pricing Versions Table
CREATE TABLE IF NOT EXISTS public.print_pricing_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_code TEXT UNIQUE NOT NULL,
    pricing_config JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.print_pricing_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active print pricing" ON public.print_pricing_versions;
CREATE POLICY "Public can view active print pricing"
    ON public.print_pricing_versions
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can manage print pricing" ON public.print_pricing_versions;
CREATE POLICY "Admins can manage print pricing"
    ON public.print_pricing_versions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

-- 4. Print Jobs Table
CREATE TABLE IF NOT EXISTS public.print_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    order_code TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'READY_TO_PRINT', 'PRINTING', 'PRINTED', 'QUALITY_CHECK', 'READY', 'COMPLETED', 'FAILED', 'CANCELLED'
    )),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    overrides JSONB NOT NULL DEFAULT '[]'::jsonb,
    audit_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by_name TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_print_jobs_order_id ON public.print_jobs(order_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_order_code ON public.print_jobs(order_code);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON public.print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_created_at ON public.print_jobs(created_at DESC);

ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can create and view print jobs for own orders" ON public.print_jobs;
DROP POLICY IF EXISTS "Admins and staff have full access to print jobs" ON public.print_jobs;

-- Staff and Admins can view all print jobs
CREATE POLICY "Staff and admins can view all print jobs"
    ON public.print_jobs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

-- Customers can view print jobs for their own orders
CREATE POLICY "Customers can view their own order print jobs"
    ON public.print_jobs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = print_jobs.order_id AND orders.user_id = auth.uid()
        )
    );

-- Only Staff and Admins can modify or delete print jobs
CREATE POLICY "Staff and admins can manage print jobs"
    ON public.print_jobs
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
        )
    );

-- 5. Updated Atomic Print Order RPC with Snapshot & Print Job Initialization
CREATE OR REPLACE FUNCTION public.create_online_print_order(
    p_order_code TEXT,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_email TEXT,
    p_fulfillment_type TEXT,
    p_delivery_address JSONB,
    p_order_notes TEXT,
    p_subtotal_amount NUMERIC,
    p_delivery_fee NUMERIC,
    p_total_amount NUMERIC,
    p_payment_method TEXT,
    p_payment_status TEXT,
    p_user_id UUID,
    p_staff_notes TEXT,
    p_items JSONB,
    p_files JSONB DEFAULT '[]'::jsonb,
    p_client_submission_id TEXT DEFAULT NULL,
    p_print_snapshot JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_existing_id UUID;
    v_existing_code TEXT;
    v_order_id UUID;
    v_final_order_code TEXT;
    v_clean_name TEXT;
    v_clean_phone TEXT;
    v_calculated_subtotal NUMERIC(10, 2) := 0.00;
    v_item JSONB;
    v_file JSONB;
    v_item_quantity INTEGER;
    v_item_unit_price NUMERIC(10, 2);
    v_item_total_price NUMERIC(10, 2);
    v_product_id TEXT;
    v_product_base_price NUMERIC(10, 2);
    v_rand_suffix INTEGER;
    v_retry_count INTEGER := 0;
    v_print_job_id UUID;
    v_job_items JSONB := '[]'::jsonb;
    v_doc JSONB;
BEGIN
    -- ── A. Database-Level Idempotency Check ─────────────────────────────────────
    IF p_client_submission_id IS NOT NULL AND length(trim(p_client_submission_id)) > 0 THEN
        SELECT id, order_code INTO v_existing_id, v_existing_code
        FROM public.orders
        WHERE client_submission_id = trim(p_client_submission_id)
        LIMIT 1;

        IF v_existing_id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'orderId', v_existing_id,
                'orderCode', v_existing_code,
                'isDuplicate', true,
                'message', 'Order already placed with this submission ID.'
            );
        END IF;
    END IF;

    -- ── B. Input Validation ───────────────────────────────────────────────────
    v_clean_name := trim(COALESCE(p_customer_name, ''));
    IF length(v_clean_name) < 2 THEN
        RAISE EXCEPTION 'Invalid customer name. Name must be at least 2 characters.';
    END IF;

    v_clean_phone := regexp_replace(COALESCE(p_customer_phone, ''), '\D', '', 'g');
    IF length(v_clean_phone) < 10 THEN
        RAISE EXCEPTION 'Invalid phone number. Must contain at least 10 digits.';
    END IF;

    IF p_subtotal_amount < 0 OR p_delivery_fee < 0 OR p_total_amount < 0 THEN
        RAISE EXCEPTION 'Monetary amounts cannot be negative.';
    END IF;

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order must contain at least one item.';
    END IF;

    -- ── C. Concurrency-Safe Order Code Allocation ─────────────────────────────
    v_final_order_code := trim(COALESCE(p_order_code, ''));
    IF length(v_final_order_code) = 0 THEN
        v_final_order_code := 'PE-O-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(floor(random() * 90000 + 10000)::TEXT, 5, '0');
    END IF;

    WHILE EXISTS (SELECT 1 FROM public.orders WHERE order_code = v_final_order_code) AND v_retry_count < 10 LOOP
        v_retry_count := v_retry_count + 1;
        v_rand_suffix := floor(random() * 90000 + 10000)::INTEGER;
        v_final_order_code := 'PE-O-' || to_char(now(), 'YYYYMMDD') || '-' || v_rand_suffix::TEXT;
    END LOOP;

    IF EXISTS (SELECT 1 FROM public.orders WHERE order_code = v_final_order_code) THEN
        RAISE EXCEPTION 'Could not allocate a unique order code. Please retry.';
    END IF;

    -- ── D. Authoritative Price & Item Calculation ─────────────────────────────
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        product_id TEXT, "productId" TEXT,
        product_name TEXT, "productName" TEXT,
        quantity NUMERIC,
        unit_price NUMERIC, "unitPrice" NUMERIC,
        total_price NUMERIC, "totalPrice" NUMERIC,
        selected_options JSONB, "selectedOptions" JSONB,
        selected_options_labels JSONB, "selectedOptionsLabels" JSONB,
        uploaded_file_name TEXT, "uploadedFileName" TEXT,
        uploaded_file_url TEXT, "uploadedFileUrl" TEXT
    ) LOOP
        v_item_quantity := GREATEST(1, floor(COALESCE(v_item.quantity, 1))::INTEGER);
        v_item_unit_price := ROUND(GREATEST(0, COALESCE(v_item.unit_price, v_item."unitPrice", 0))::NUMERIC, 2);
        v_item_total_price := ROUND(GREATEST(0, COALESCE(v_item.total_price, v_item."totalPrice", v_item_unit_price * v_item_quantity))::NUMERIC, 2);

        v_product_id := COALESCE(v_item.product_id, v_item."productId");
        IF v_product_id IS NOT NULL AND length(v_product_id) > 0 THEN
            SELECT base_price INTO v_product_base_price 
            FROM public.products 
            WHERE id = v_product_id AND is_active = true 
            LIMIT 1;
        END IF;

        v_calculated_subtotal := v_calculated_subtotal + v_item_total_price;
    END LOOP;

    -- Exact 2-decimal financial verification (zero tolerance)
    IF ROUND(COALESCE(p_subtotal_amount, 0)::NUMERIC, 2) <> ROUND(v_calculated_subtotal::NUMERIC, 2) THEN
        RAISE EXCEPTION 'Subtotal amount mismatch. Calculated: %, Provided: %', ROUND(v_calculated_subtotal::NUMERIC, 2), ROUND(COALESCE(p_subtotal_amount, 0)::NUMERIC, 2);
    END IF;

    IF ROUND(COALESCE(p_total_amount, 0)::NUMERIC, 2) <> ROUND((v_calculated_subtotal + COALESCE(p_delivery_fee, 0))::NUMERIC, 2) THEN
        RAISE EXCEPTION 'Total amount mismatch. Expected: %, Provided: %', ROUND((v_calculated_subtotal + COALESCE(p_delivery_fee, 0))::NUMERIC, 2), ROUND(COALESCE(p_total_amount, 0)::NUMERIC, 2);
    END IF;

    -- Verify Print Snapshot internal mathematical consistency if provided
    IF p_print_snapshot IS NOT NULL AND (p_print_snapshot->'documents') IS NOT NULL AND jsonb_array_length(p_print_snapshot->'documents') > 0 THEN
        DECLARE
            v_snap_doc JSONB;
            v_snap_subtotal NUMERIC(10, 2) := 0.00;
            v_snap_doc_total NUMERIC(10, 2);
        BEGIN
            FOR v_snap_doc IN SELECT * FROM jsonb_array_elements(p_print_snapshot->'documents') LOOP
                v_snap_doc_total := ROUND(GREATEST(0, COALESCE((v_snap_doc->>'totalPrice')::NUMERIC, (v_snap_doc->>'total_price')::NUMERIC, 0)), 2);
                v_snap_subtotal := v_snap_subtotal + v_snap_doc_total;
            END LOOP;

            IF ROUND(v_snap_subtotal, 2) <> ROUND(v_calculated_subtotal, 2) THEN
                RAISE EXCEPTION 'Print snapshot subtotal mismatch. Items total: %, Snapshot items total: %', v_calculated_subtotal, v_snap_subtotal;
            END IF;
        END;
    END IF;

    -- ── E. Insert Order (Atomic Transaction) ──────────────────────────────────
    INSERT INTO public.orders (
        order_code, client_submission_id, customer_name, customer_phone, customer_email,
        fulfillment_type, delivery_address, order_notes,
        subtotal_amount, delivery_fee, total_amount,
        payment_method, payment_status, order_status,
        user_id, staff_notes, items, print_snapshot, created_at, updated_at
    ) VALUES (
        v_final_order_code,
        NULLIF(trim(p_client_submission_id), ''),
        v_clean_name,
        v_clean_phone,
        NULLIF(trim(p_customer_email), ''),
        COALESCE(NULLIF(trim(p_fulfillment_type), ''), 'pickup'),
        p_delivery_address,
        NULLIF(trim(p_order_notes), ''),
        v_calculated_subtotal,
        ROUND(COALESCE(p_delivery_fee, 0)::NUMERIC, 2),
        ROUND((v_calculated_subtotal + COALESCE(p_delivery_fee, 0))::NUMERIC, 2),
        COALESCE(NULLIF(trim(p_payment_method), ''), 'pay_at_store'),
        COALESCE(NULLIF(trim(p_payment_status), ''), 'pending'),
        'NEW',
        p_user_id,
        NULLIF(trim(p_staff_notes), ''),
        p_items,
        p_print_snapshot,
        now(),
        now()
    ) RETURNING id INTO v_order_id;

    -- ── F. Insert Order Items ─────────────────────────────────────────────────
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        product_id TEXT, "productId" TEXT,
        product_name TEXT, "productName" TEXT,
        quantity NUMERIC,
        unit_price NUMERIC, "unitPrice" NUMERIC,
        total_price NUMERIC, "totalPrice" NUMERIC,
        selected_options JSONB, "selectedOptions" JSONB,
        selected_options_labels JSONB, "selectedOptionsLabels" JSONB,
        uploaded_file_name TEXT, "uploadedFileName" TEXT,
        uploaded_file_url TEXT, "uploadedFileUrl" TEXT
    ) LOOP
        v_item_quantity := GREATEST(1, floor(COALESCE(v_item.quantity, 1))::INTEGER);
        v_item_unit_price := ROUND(GREATEST(0, COALESCE(v_item.unit_price, v_item."unitPrice", 0))::NUMERIC, 2);
        v_item_total_price := ROUND(GREATEST(0, COALESCE(v_item.total_price, v_item."totalPrice", v_item_unit_price * v_item_quantity))::NUMERIC, 2);

        INSERT INTO public.order_items (
            order_id,
            product_id,
            product_name,
            quantity,
            unit_price,
            total_price,
            selected_options,
            selected_options_labels,
            uploaded_file_name,
            uploaded_file_url,
            created_at
        ) VALUES (
            v_order_id,
            NULLIF(trim(COALESCE(v_item.product_id, v_item."productId", '')), ''),
            COALESCE(NULLIF(trim(COALESCE(v_item.product_name, v_item."productName", '')), ''), 'Custom Print Item'),
            v_item_quantity,
            v_item_unit_price,
            v_item_total_price,
            COALESCE(v_item.selected_options, v_item."selectedOptions", '{}'::jsonb),
            COALESCE(v_item.selected_options_labels, v_item."selectedOptionsLabels", '{}'::jsonb),
            NULLIF(trim(COALESCE(v_item.uploaded_file_name, v_item."uploadedFileName", '')), ''),
            NULLIF(trim(COALESCE(v_item.uploaded_file_url, v_item."uploadedFileUrl", '')), ''),
            now()
        );
    END LOOP;

    -- ── G. Insert Order Files ─────────────────────────────────────────────────
    IF p_files IS NOT NULL AND jsonb_array_length(p_files) > 0 THEN
        FOR v_file IN SELECT * FROM jsonb_to_recordset(p_files) AS f(
            name TEXT, file_name TEXT, "fileName" TEXT,
            url TEXT, file_url TEXT, "fileUrl" TEXT,
            storage_path TEXT, "storagePath" TEXT,
            size NUMERIC, file_size NUMERIC, "fileSize" NUMERIC,
            mime_type TEXT, "mimeType" TEXT,
            page_count INTEGER, "pageCount" INTEGER
        ) LOOP
            INSERT INTO public.order_files (
                order_id,
                file_name,
                file_url,
                file_path,
                file_size,
                mime_type,
                page_count,
                created_at
            ) VALUES (
                v_order_id,
                COALESCE(NULLIF(trim(COALESCE(v_file.name, v_file.file_name, v_file."fileName", '')), ''), 'document.pdf'),
                COALESCE(NULLIF(trim(COALESCE(v_file.url, v_file.file_url, v_file."fileUrl", '')), ''), ''),
                COALESCE(NULLIF(trim(COALESCE(v_file.storage_path, v_file."storagePath", '')), ''), ''),
                GREATEST(0, COALESCE(v_file.size, v_file.file_size, v_file."fileSize", 0)),
                COALESCE(NULLIF(trim(COALESCE(v_file.mime_type, v_file."mimeType", '')), ''), 'application/pdf'),
                GREATEST(1, COALESCE(v_file.page_count, v_file."pageCount", 1)),
                now()
            );
        END LOOP;
    END IF;

    -- ── H. Initialize Print Job if Print Snapshot Exists ──────────────────────
    IF p_print_snapshot IS NOT NULL AND (p_print_snapshot->'documents') IS NOT NULL AND jsonb_array_length(p_print_snapshot->'documents') > 0 THEN
        v_job_items := '[]'::jsonb;
        FOR v_doc IN SELECT * FROM jsonb_array_elements(p_print_snapshot->'documents') LOOP
            v_job_items := v_job_items || jsonb_build_object(
                'id', gen_random_uuid(),
                'documentId', COALESCE(v_doc->>'documentId', gen_random_uuid()::TEXT),
                'fileName', COALESCE(v_doc->>'fileName', 'Document'),
                'storagePath', COALESCE(v_doc->>'storagePath', ''),
                'fileUrl', COALESCE(v_doc->>'fileUrl', ''),
                'pageCount', COALESCE((v_doc->>'selectedPageCount')::INTEGER, 1),
                'colorMode', COALESCE(v_doc->>'colorMode', 'bw'),
                'colorPages', COALESCE((v_doc->>'colorPageCount')::INTEGER, 0),
                'bwPages', COALESCE((v_doc->>'bwPageCount')::INTEGER, 1),
                'copies', GREATEST(1, COALESCE((v_doc->>'copies')::INTEGER, 1)),
                'paperSize', COALESCE(v_doc->>'paperSize', 'a4'),
                'paperType', COALESCE(v_doc->>'paperType', 'normal'),
                'gsm', COALESCE((v_doc->>'gsm')::INTEGER, 75),
                'orientation', COALESCE(v_doc->>'orientation', 'auto'),
                'sides', COALESCE(v_doc->>'sides', 'double_long'),
                'pagesPerSheet', COALESCE((v_doc->>'pagesPerSheet')::INTEGER, 1),
                'scaling', COALESCE(v_doc->>'scaling', 'fit'),
                'binding', COALESCE(v_doc->>'binding', 'none'),
                'frontCover', COALESCE(v_doc->>'frontCover', 'none'),
                'backCover', COALESCE(v_doc->>'backCover', 'none'),
                'finishing', COALESCE(v_doc->'finishing', '{}'::jsonb),
                'status', 'QUEUED'
            );
        END LOOP;

        INSERT INTO public.print_jobs (
            order_id,
            order_code,
            customer_name,
            customer_phone,
            status,
            items,
            overrides,
            audit_logs,
            created_at,
            updated_at
        ) VALUES (
            v_order_id,
            v_final_order_code,
            v_clean_name,
            v_clean_phone,
            'PENDING',
            v_job_items,
            '[]'::jsonb,
            jsonb_build_array(
                jsonb_build_object(
                    'id', gen_random_uuid(),
                    'jobId', gen_random_uuid(),
                    'orderCode', v_final_order_code,
                    'action', 'ORDER_SUBMITTED',
                    'performedBy', 'Customer',
                    'timestamp', now(),
                    'notes', 'Initial print job created with immutable snapshot'
                )
            ),
            now(),
            now()
        ) RETURNING id INTO v_print_job_id;
    END IF;

    -- ── I. Insert Initial Status History ──────────────────────────────────────
    INSERT INTO public.status_history (
        entity_type,
        entity_id,
        entity_code,
        new_status,
        message_en,
        message_hi,
        performed_by,
        created_at
    ) VALUES (
        'order',
        v_order_id,
        v_final_order_code,
        'NEW',
        'Order submitted with exact print configuration.',
        'ऑर्डर सटीक प्रिंट कॉन्फ़िगरेशन के साथ दर्ज किया गया।',
        'Customer',
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'orderId', v_order_id,
        'orderCode', v_final_order_code,
        'isDuplicate', false,
        'message', 'Print order created successfully with immutable snapshot.'
    );

EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Atomic order creation failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_online_print_order(
    TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, UUID, TEXT, JSONB, JSONB, TEXT, JSONB
) TO anon, authenticated;

-- 6. Server-Side RPC: Update Staff Print Job Status with State Machine & Audit Validation
CREATE OR REPLACE FUNCTION public.update_staff_print_job_status(
    p_order_code TEXT,
    p_new_status TEXT,
    p_performed_by TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_is_staff BOOLEAN;
    v_job RECORD;
    v_now TIMESTAMPTZ := now();
    v_audit_entry JSONB;
BEGIN
    -- Authorize staff/admin role
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    ) INTO v_is_staff;

    IF NOT v_is_staff THEN
        RAISE EXCEPTION 'Unauthorized: Only staff or admins can update print job status.';
    END IF;

    SELECT * INTO v_job
    FROM public.print_jobs
    WHERE order_code = trim(p_order_code)
    FOR UPDATE;

    IF v_job.id IS NULL THEN
        RAISE EXCEPTION 'Print job for order % not found.', p_order_code;
    END IF;

    -- Validate transition from terminal states
    IF v_job.status IN ('COMPLETED', 'CANCELLED') AND v_job.status <> p_new_status THEN
        RAISE EXCEPTION 'Cannot transition print job from terminal status %.', v_job.status;
    END IF;

    v_audit_entry := jsonb_build_object(
        'id', gen_random_uuid(),
        'jobId', v_job.id,
        'orderCode', p_order_code,
        'action', 'STATUS_CHANGED_' || p_new_status,
        'performedBy', COALESCE(NULLIF(trim(p_performed_by), ''), 'Admin Staff'),
        'timestamp', v_now,
        'notes', COALESCE(NULLIF(trim(p_notes), ''), 'Status transitioned from ' || v_job.status || ' to ' || p_new_status)
    );

    UPDATE public.print_jobs
    SET status = p_new_status,
        audit_logs = jsonb_insert(COALESCE(audit_logs, '[]'::jsonb), '{0}', v_audit_entry),
        started_at = CASE WHEN p_new_status = 'PRINTING' AND started_at IS NULL THEN v_now ELSE started_at END,
        completed_at = CASE WHEN p_new_status IN ('COMPLETED', 'PRINTED') AND completed_at IS NULL THEN v_now ELSE completed_at END,
        updated_at = v_now
    WHERE id = v_job.id;

    RETURN jsonb_build_object(
        'success', true,
        'jobId', v_job.id,
        'orderCode', p_order_code,
        'status', p_new_status
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_staff_print_job_status(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 7. Server-Side RPC: Add Staff Print Job Override with Audit Trail
CREATE OR REPLACE FUNCTION public.add_staff_print_job_override(
    p_order_code TEXT,
    p_document_id TEXT,
    p_file_name TEXT,
    p_field TEXT,
    p_requested_value TEXT,
    p_actual_value TEXT,
    p_changed_by TEXT,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_is_staff BOOLEAN;
    v_job RECORD;
    v_now TIMESTAMPTZ := now();
    v_override_entry JSONB;
    v_audit_entry JSONB;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    ) INTO v_is_staff;

    IF NOT v_is_staff THEN
        RAISE EXCEPTION 'Unauthorized: Only staff or admins can record print overrides.';
    END IF;

    IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
        RAISE EXCEPTION 'Override reason is strictly mandatory (minimum 3 characters).';
    END IF;

    SELECT * INTO v_job
    FROM public.print_jobs
    WHERE order_code = trim(p_order_code)
    FOR UPDATE;

    IF v_job.id IS NULL THEN
        RAISE EXCEPTION 'Print job for order % not found.', p_order_code;
    END IF;

    v_override_entry := jsonb_build_object(
        'id', gen_random_uuid(),
        'documentId', p_document_id,
        'fileName', p_file_name,
        'field', p_field,
        'requestedValue', p_requested_value,
        'actualValue', p_actual_value,
        'changedBy', COALESCE(NULLIF(trim(p_changed_by), ''), 'Admin Staff'),
        'changedAt', v_now,
        'reason', trim(p_reason)
    );

    v_audit_entry := jsonb_build_object(
        'id', gen_random_uuid(),
        'jobId', v_job.id,
        'orderCode', p_order_code,
        'action', 'ADMIN_OVERRIDE',
        'performedBy', COALESCE(NULLIF(trim(p_changed_by), ''), 'Admin Staff'),
        'timestamp', v_now,
        'notes', 'Changed ' || p_field || ' for ' || p_file_name || ' to ' || p_actual_value || '. Reason: ' || trim(p_reason),
        'details', jsonb_build_object('override', v_override_entry)
    );

    UPDATE public.print_jobs
    SET overrides = jsonb_insert(COALESCE(overrides, '[]'::jsonb), '{0}', v_override_entry),
        audit_logs = jsonb_insert(COALESCE(audit_logs, '[]'::jsonb), '{0}', v_audit_entry),
        updated_at = v_now
    WHERE id = v_job.id;

    RETURN jsonb_build_object(
        'success', true,
        'jobId', v_job.id,
        'orderCode', p_order_code
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_staff_print_job_override(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

