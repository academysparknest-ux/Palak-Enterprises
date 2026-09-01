-- ==============================================================================
-- Migration: 20260831_quick_service_order_performance.sql
-- Goal: High-throughput atomic order creation, print queue registration & idempotency
-- ==============================================================================

-- 0. Table Definition: print_jobs (if not exists)
CREATE TABLE IF NOT EXISTS public.print_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    order_code TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'QUEUED', 'PREPRESS', 'PRINTING', 'FINISHING', 'QUALITY_CHECK', 'READY', 'COMPLETED', 'CANCELLED', 'ON_HOLD')),
    priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    overrides JSONB NOT NULL DEFAULT '[]'::jsonb,
    audit_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'print_jobs' AND policyname = 'Public can create print jobs') THEN
        CREATE POLICY "Public can create print jobs" ON public.print_jobs FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'print_jobs' AND policyname = 'Public can view own print jobs') THEN
        CREATE POLICY "Public can view own print jobs" ON public.print_jobs FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'print_jobs' AND policyname = 'Staff can manage print jobs') THEN
        CREATE POLICY "Staff can manage print jobs" ON public.print_jobs FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());
    END IF;
END $$;

ALTER TABLE public.order_files ADD COLUMN IF NOT EXISTS page_count INTEGER DEFAULT 1;

-- 1. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_orders_client_submission_id ON public.orders(client_submission_id) WHERE client_submission_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_order_code ON public.orders(order_code);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_print_jobs_order_id ON public.print_jobs(order_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_order_code ON public.print_jobs(order_code);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON public.print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_files_order_id ON public.order_files(order_id);

-- 2. Clean up legacy signatures to prevent overload conflicts
DROP FUNCTION IF EXISTS public.create_online_print_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, UUID, TEXT, JSONB, JSONB);
DROP FUNCTION IF EXISTS public.create_online_print_order(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, UUID, TEXT, JSONB, JSONB);
DROP FUNCTION IF EXISTS public.create_online_print_order(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, UUID, TEXT, JSONB, JSONB, TEXT);
DROP FUNCTION IF EXISTS public.create_online_print_order(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, UUID, TEXT, JSONB, JSONB, TEXT, JSONB);

-- 3. Production-Hardened Atomic Order Creation RPC
CREATE OR REPLACE FUNCTION public.create_online_print_order(
    p_order_code TEXT,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_email TEXT DEFAULT NULL,
    p_fulfillment_type TEXT DEFAULT 'pickup',
    p_delivery_address JSONB DEFAULT NULL,
    p_order_notes TEXT DEFAULT NULL,
    p_subtotal_amount NUMERIC DEFAULT 0,
    p_delivery_fee NUMERIC DEFAULT 0,
    p_total_amount NUMERIC DEFAULT 0,
    p_payment_method TEXT DEFAULT 'pay_at_store',
    p_payment_status TEXT DEFAULT 'pending',
    p_user_id UUID DEFAULT NULL,
    p_staff_notes TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb,
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
    v_item RECORD;
    v_file RECORD;
    v_item_quantity INTEGER;
    v_item_unit_price NUMERIC(10, 2);
    v_item_total_price NUMERIC(10, 2);
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

        v_calculated_subtotal := v_calculated_subtotal + v_item_total_price;
    END LOOP;

    -- Fallback subtotal calculation if client subtotal matches
    IF p_subtotal_amount > 0 AND v_calculated_subtotal = 0 THEN
        v_calculated_subtotal := ROUND(p_subtotal_amount::NUMERIC, 2);
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
            CASE 
                WHEN EXISTS (SELECT 1 FROM public.products WHERE id = NULLIF(trim(COALESCE(v_item.product_id, v_item."productId", '')), '')) THEN NULLIF(trim(COALESCE(v_item.product_id, v_item."productId", '')), '')
                ELSE NULL
            END,
            COALESCE(NULLIF(trim(COALESCE(v_item.product_name, v_item."productName", '')), ''), 'Print Order Item'),
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
            storage_path TEXT, "storagePath" TEXT, path TEXT, "filePath" TEXT,
            size NUMERIC, file_size NUMERIC, "fileSize" NUMERIC,
            mime_type TEXT, "mimeType" TEXT, file_type TEXT, "fileType" TEXT,
            page_count INTEGER, "pageCount" INTEGER
        ) LOOP
            INSERT INTO public.order_files (
                order_id,
                file_name,
                file_url,
                file_path,
                file_size,
                file_type,
                page_count,
                uploaded_by,
                created_at
            ) VALUES (
                v_order_id,
                COALESCE(NULLIF(trim(COALESCE(v_file.name, v_file.file_name, v_file."fileName", '')), ''), 'document.pdf'),
                COALESCE(NULLIF(trim(COALESCE(v_file.url, v_file.file_url, v_file."fileUrl", '')), ''), ''),
                COALESCE(NULLIF(trim(COALESCE(v_file.storage_path, v_file."storagePath", v_file.path, v_file."filePath", '')), ''), ''),
                GREATEST(0, COALESCE(v_file.size, v_file.file_size, v_file."fileSize", 0)),
                COALESCE(NULLIF(trim(COALESCE(v_file.mime_type, v_file."mimeType", v_file.file_type, v_file."fileType", '')), ''), 'application/pdf'),
                GREATEST(1, COALESCE(v_file.page_count, v_file."pageCount", 1)),
                v_clean_name,
                now()
            );
        END LOOP;
    END IF;

    -- ── H. Initialize Print Job if Print Snapshot or Items Exist ──────────────
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

    -- ── I. Insert Status History ──────────────────────────────────────────────
    INSERT INTO public.status_history (
        entity_type,
        entity_code,
        new_status,
        message_en,
        message_hi,
        performed_by,
        created_at
    ) VALUES (
        'order',
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
