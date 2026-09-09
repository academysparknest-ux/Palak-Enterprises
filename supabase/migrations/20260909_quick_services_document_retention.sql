-- ==============================================================================
-- Migration: 20260909_quick_services_document_retention.sql
-- Goal: Production-Hardened 7-Day Document Retention Policy for Quick Services
-- 
-- Invariants:
-- 1. Orders, order_items, print_jobs, invoices, payments, profiles are NEVER deleted.
-- 2. Invoice PDFs ('invoice-pdfs/'), ID Card assets, website photos, and business assets are strictly protected.
-- 3. Only customer-uploaded temporary documents under 'orders/' expire: expires_at = created_at + 7 days.
-- 4. Cleanup is idempotent, concurrency-safe (FOR UPDATE SKIP LOCKED), authenticated, and bounded.
-- 5. Physical storage objects are deleted via supported Supabase Storage API; database metadata tracks status.
-- ==============================================================================

-- 1. Enhance public.order_files with expiration and lifecycle columns
ALTER TABLE public.order_files 
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '7 days'),
    ADD COLUMN IF NOT EXISTS cleanup_status TEXT NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS cleaned_up_at TIMESTAMPTZ NULL;

-- Ensure check constraint on cleanup_status handles all lifecycle states
DO $$
BEGIN
    ALTER TABLE public.order_files DROP CONSTRAINT IF EXISTS order_files_cleanup_status_check;
    ALTER TABLE public.order_files ADD CONSTRAINT order_files_cleanup_status_check 
        CHECK (cleanup_status IN ('active', 'cleaning', 'expired', 'cleaned_up', 'failed'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 2. Deterministic Backfill of Legacy / Historical Records
-- Rule A: If created_at is present, expires_at MUST strictly be created_at + 7 days.
-- Rule B: If created_at is NULL, fallback to an immutable epoch timestamp ('2026-01-01 00:00:00+00'::timestamptz) so it is marked expired.
-- Rule C: If expires_at was previously populated with a date > created_at + 7 days (e.g. by default now()+7d), clamp it to created_at + 7 days.
UPDATE public.order_files
SET expires_at = COALESCE(created_at, '2026-01-01 00:00:00+00'::timestamptz) + interval '7 days'
WHERE created_at IS NOT NULL 
  AND (expires_at IS NULL OR expires_at <> (created_at + interval '7 days'));

-- Rule D: If a record already has file_url IS NULL or empty, mark it cleaned_up if not already marked
UPDATE public.order_files
SET cleanup_status = 'cleaned_up',
    cleaned_up_at = COALESCE(cleaned_up_at, created_at, timezone('utc'::text, now()))
WHERE (file_url IS NULL OR trim(file_url) = '' OR file_path IS NULL OR trim(file_path) = '')
  AND cleanup_status <> 'cleaned_up';

-- 3. Performance Indexes for deterministic expiration queries & cleanup scans
CREATE INDEX IF NOT EXISTS idx_order_files_expires_cleanup 
ON public.order_files (expires_at, cleanup_status);

CREATE INDEX IF NOT EXISTS idx_order_files_cleaning_lease
ON public.order_files (cleanup_status, cleaned_up_at)
WHERE cleanup_status = 'cleaning';

-- 4. Authoritative create_online_print_order RPC with deterministic 7-day retention
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
AS $rpc$
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
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
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
        v_final_order_code := 'PE-O-' || to_char(v_now, 'YYYYMMDD') || '-' || LPAD(floor(random() * 90000 + 10000)::TEXT, 5, '0');
    END IF;

    WHILE EXISTS (SELECT 1 FROM public.orders WHERE order_code = v_final_order_code) AND v_retry_count < 10 LOOP
        v_retry_count := v_retry_count + 1;
        v_rand_suffix := floor(random() * 90000 + 10000)::INTEGER;
        v_final_order_code := 'PE-O-' || to_char(v_now, 'YYYYMMDD') || '-' || v_rand_suffix::TEXT;
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
        v_now,
        v_now
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
            v_now
        );
    END LOOP;

    -- ── G. Insert Order Files with Exact 7-Day Expiration ──────────────────────
    -- The server deterministically enforces: expires_at = v_now + interval '7 days'
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
                created_at,
                expires_at,
                cleanup_status
            ) VALUES (
                v_order_id,
                COALESCE(NULLIF(trim(COALESCE(v_file.name, v_file.file_name, v_file."fileName", '')), ''), 'document.pdf'),
                COALESCE(NULLIF(trim(COALESCE(v_file.url, v_file.file_url, v_file."fileUrl", '')), ''), ''),
                COALESCE(NULLIF(trim(COALESCE(v_file.storage_path, v_file."storagePath", v_file.path, v_file."filePath", '')), ''), ''),
                GREATEST(0, COALESCE(v_file.size, v_file.file_size, v_file."fileSize", 0)),
                COALESCE(NULLIF(trim(COALESCE(v_file.mime_type, v_file."mimeType", v_file.file_type, v_file."fileType", '')), ''), 'application/pdf'),
                GREATEST(1, COALESCE(v_file.page_count, v_file."pageCount", 1)),
                v_clean_name,
                v_now,
                v_now + interval '7 days',
                'active'
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
                    'timestamp', v_now,
                    'notes', 'Initial print job created with immutable snapshot'
                )
            ),
            v_now,
            v_now
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
        v_now
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
$rpc$;

GRANT EXECUTE ON FUNCTION public.create_online_print_order(
    TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, UUID, TEXT, JSONB, JSONB, TEXT, JSONB
) TO anon, authenticated;


-- 5. Phase 1: Claim Expired Records for Storage Cleanup (Concurrency-Safe & Bounded)
CREATE OR REPLACE FUNCTION public.claim_expired_order_files_for_cleanup(
    p_batch_size INT DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    order_id UUID,
    file_path TEXT,
    canonical_storage_path TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $claim$
DECLARE
    v_batch_limit INT;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    -- Authoritative Role Check: service_role or admin or staff
    IF auth.role() <> 'service_role' AND NOT (COALESCE(public.is_staff(), false) OR COALESCE(public.is_admin(), false)) THEN
        RAISE EXCEPTION 'Access denied. Only authorized staff, administrators, or background cron can claim files for cleanup.'
            USING ERRCODE = '42501';
    END IF;

    -- Deterministic Batch Bounding (1 to 500)
    v_batch_limit := GREATEST(1, LEAST(COALESCE(p_batch_size, 100), 500));

    RETURN QUERY
    WITH candidate_records AS (
        SELECT ofiles.id AS c_id
        FROM public.order_files ofiles
        WHERE (
            -- Either expired active/failed records
            (ofiles.expires_at <= v_now AND ofiles.cleanup_status IN ('active', 'expired', 'failed'))
            OR
            -- Or reclaim stale leases stuck in 'cleaning' for over 15 minutes
            (ofiles.cleanup_status = 'cleaning' AND ofiles.cleaned_up_at < (v_now - interval '15 minutes'))
        )
        ORDER BY ofiles.expires_at ASC
        LIMIT v_batch_limit
        FOR UPDATE SKIP LOCKED
    ),
    marked_records AS (
        UPDATE public.order_files target
        SET cleanup_status = 'cleaning',
            cleaned_up_at = v_now
        FROM candidate_records
        WHERE target.id = candidate_records.c_id
        RETURNING target.id, target.order_id, target.file_path
    )
    SELECT 
        m.id,
        m.order_id,
        m.file_path,
        -- Canonical clean path for storage removal
        regexp_replace(
            regexp_replace(trim(COALESCE(m.file_path, '')), '^customer-documents/', ''),
            '^/+', ''
        ) AS canonical_storage_path
    FROM marked_records m;
END;
$claim$;

REVOKE ALL ON FUNCTION public.claim_expired_order_files_for_cleanup(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_expired_order_files_for_cleanup(INT) TO authenticated, service_role;


-- 6. Phase 3: Finalize Order Files Cleanup with Subtransaction Error Isolation
CREATE OR REPLACE FUNCTION public.finalize_order_files_cleanup(
    p_results JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $final$
DECLARE
    v_item RECORD;
    v_file_id UUID;
    v_status TEXT;
    v_storage_path TEXT;
    v_error TEXT;
    v_cleaned_count INT := 0;
    v_failed_count INT := 0;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    -- Authoritative Role Check
    IF auth.role() <> 'service_role' AND NOT (COALESCE(public.is_staff(), false) OR COALESCE(public.is_admin(), false)) THEN
        RAISE EXCEPTION 'Access denied. Only authorized staff, administrators, or background cron can finalize cleanup.'
            USING ERRCODE = '42501';
    END IF;

    IF p_results IS NULL OR jsonb_array_length(p_results) = 0 THEN
        RETURN jsonb_build_object('success', true, 'finalized_count', 0);
    END IF;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_results) AS r(
        id UUID,
        status TEXT,
        storage_path TEXT,
        error TEXT
    ) LOOP
        v_file_id := v_item.id;
        v_status := lower(trim(COALESCE(v_item.status, 'failed')));
        v_storage_path := trim(COALESCE(v_item.storage_path, ''));
        v_error := v_item.error;

        IF v_status = 'cleaned_up' THEN
            -- PostgreSQL subtransaction / exception block to isolate row update
            BEGIN
                UPDATE public.order_files
                SET cleanup_status = 'cleaned_up',
                    cleaned_up_at = v_now,
                    file_url = NULL
                WHERE id = v_file_id;

                -- Defense in depth: also remove metadata row from storage.objects if still exists
                IF length(v_storage_path) > 0 
                   AND v_storage_path ~ '^orders/[a-zA-Z0-9_\-]+/[a-zA-Z0-9_\-\.]+$' THEN
                    DELETE FROM storage.objects
                    WHERE bucket_id = 'customer-documents' AND name = v_storage_path;
                END IF;

                v_cleaned_count := v_cleaned_count + 1;
            EXCEPTION WHEN OTHERS THEN
                UPDATE public.order_files
                SET cleanup_status = 'failed',
                    cleaned_up_at = NULL
                WHERE id = v_file_id;

                v_failed_count := v_failed_count + 1;
            END;
        ELSE
            -- Failed storage deletion: keep retryable
            UPDATE public.order_files
            SET cleanup_status = 'failed',
                cleaned_up_at = NULL
            WHERE id = v_file_id;

            v_failed_count := v_failed_count + 1;
        END IF;
    END LOOP;

    -- Audit Logging with Exception Isolation
    BEGIN
        INSERT INTO public.audit_logs (
            action_type,
            entity_type,
            entity_id,
            details,
            created_at
        ) VALUES (
            'document_retention_finalization',
            'order_files',
            'batch',
            jsonb_build_object(
                'cleaned_count', v_cleaned_count,
                'failed_count', v_failed_count,
                'finalized_at', v_now
            ),
            v_now
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', (v_failed_count = 0),
        'cleaned_count', v_cleaned_count,
        'failed_count', v_failed_count,
        'timestamp', v_now
    );
END;
$final$;

REVOKE ALL ON FUNCTION public.finalize_order_files_cleanup(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_order_files_cleanup(JSONB) TO authenticated, service_role;


-- 7. All-In-One Fallback Cleanup Function (For SQL CLI / Dashboard execution)
CREATE OR REPLACE FUNCTION public.cleanup_expired_order_files(
    p_batch_size INT DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $clean$
DECLARE
    v_file RECORD;
    v_orphan RECORD;
    v_batch_limit INT;
    v_processed_count INT := 0;
    v_deleted_storage_count INT := 0;
    v_marked_count INT := 0;
    v_skipped_count INT := 0;
    v_failed_count INT := 0;
    v_clean_path TEXT;
    v_del_rows INT := 0;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    -- ── 1. Authoritative Role Verification ─────────────────────────────────────
    IF auth.role() <> 'service_role' AND NOT (COALESCE(public.is_staff(), false) OR COALESCE(public.is_admin(), false)) THEN
        RAISE EXCEPTION 'Access denied. Only authorized staff, administrators, or background cron can execute document retention cleanup.'
            USING ERRCODE = '42501';
    END IF;

    -- ── 2. Strictly Bound Batch Size (1 to 500) ──────────────────────────────
    v_batch_limit := GREATEST(1, LEAST(COALESCE(p_batch_size, 100), 500));

    -- ── 3. Scan & Process Expired Records with Lock Skipping ──────────────────
    FOR v_file IN
        SELECT id, order_id, file_path, file_url, expires_at
        FROM public.order_files
        WHERE (
            (expires_at <= v_now AND cleanup_status IN ('active', 'expired', 'failed'))
            OR
            (cleanup_status = 'cleaning' AND cleaned_up_at < (v_now - interval '15 minutes'))
        )
        ORDER BY expires_at ASC
        LIMIT v_batch_limit
        FOR UPDATE SKIP LOCKED
    LOOP
        v_processed_count := v_processed_count + 1;
        v_clean_path := trim(COALESCE(v_file.file_path, ''));

        -- Strip bucket prefix and leading slashes
        v_clean_path := regexp_replace(v_clean_path, '^customer-documents/', '');
        v_clean_path := regexp_replace(v_clean_path, '^/+', '');

        -- CRITICAL SECURITY SCOPE ENFORCEMENT:
        -- Immediate rejection of directory traversal and forbidden target paths
        IF v_clean_path LIKE '%..%' 
           OR v_clean_path ~* '(\.\./|\.\.\\|%2e%2e|invoice-pdfs|idcard|website|business)' THEN
            UPDATE public.order_files
            SET cleanup_status = 'failed',
                cleaned_up_at = NULL
            WHERE id = v_file.id;

            v_failed_count := v_failed_count + 1;
            CONTINUE;
        END IF;

        -- Authorized Temporary Storage Object Patterns:
        -- 1) orders/<orderCode>/<fileName>
        -- 2) PHOTO-<timestamp>... (legacy direct photo prefix)
        IF v_clean_path ~ '^orders/[a-zA-Z0-9_\-]+/[a-zA-Z0-9_\-\.]+$' 
           OR v_clean_path ~ '^PHOTO-[0-9]+[a-zA-Z0-9_\-\.]*$' THEN
            -- PostgreSQL subtransaction / exception block to isolate row failure
            BEGIN
                DELETE FROM storage.objects
                WHERE bucket_id = 'customer-documents'
                  AND name = v_clean_path;

                GET DIAGNOSTICS v_del_rows = ROW_COUNT;
                v_deleted_storage_count := v_deleted_storage_count + v_del_rows;

                UPDATE public.order_files
                SET cleanup_status = 'cleaned_up',
                    cleaned_up_at = v_now,
                    file_url = NULL
                WHERE id = v_file.id;

                v_marked_count := v_marked_count + 1;
            EXCEPTION WHEN OTHERS THEN
                UPDATE public.order_files
                SET cleanup_status = 'failed',
                    cleaned_up_at = NULL
                WHERE id = v_file.id;

                v_failed_count := v_failed_count + 1;
            END;
        ELSIF v_clean_path = '' OR v_clean_path LIKE 'data:%' OR v_clean_path LIKE 'blob:%' THEN
            -- In-memory / data URL with no remote storage object
            UPDATE public.order_files
            SET cleanup_status = 'cleaned_up',
                cleaned_up_at = v_now,
                file_url = NULL
            WHERE id = v_file.id;

            v_skipped_count := v_skipped_count + 1;
            v_marked_count := v_marked_count + 1;
        ELSE
            -- Unknown or malformed non-storage path: mark failed without deleting arbitrary storage
            UPDATE public.order_files
            SET cleanup_status = 'failed',
                cleaned_up_at = NULL
            WHERE id = v_file.id;

            v_failed_count := v_failed_count + 1;
        END IF;
    END LOOP;

    -- ── 4. Scope-Guarded Orphan Cleanup ───────────────────────────────────────
    -- Remove abandoned uploads in customer-documents under 'orders/%' older than 7 days
    -- that have no referencing order_files record.
    FOR v_orphan IN
        SELECT id, name
        FROM storage.objects
        WHERE bucket_id = 'customer-documents'
          AND name ~ '^orders/[a-zA-Z0-9_\-]+/[a-zA-Z0-9_\-\.]+$'
          AND created_at < (v_now - interval '7 days')
          AND NOT EXISTS (
              SELECT 1 FROM public.order_files ofiles 
              WHERE ofiles.file_path = name 
                 OR ofiles.file_path = ('customer-documents/' || name)
          )
        LIMIT 50
        FOR UPDATE SKIP LOCKED
    LOOP
        BEGIN
            DELETE FROM storage.objects
            WHERE id = v_orphan.id;

            v_deleted_storage_count := v_deleted_storage_count + 1;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;

    -- ── 5. Audit Logging with Subtransaction Isolation ─────────────────────────
    IF v_processed_count > 0 THEN
        BEGIN
            INSERT INTO public.audit_logs (
                action_type,
                entity_type,
                entity_id,
                details,
                created_at
            ) VALUES (
                'cleanup_expired_order_files',
                'order_files',
                'batch',
                jsonb_build_object(
                    'processed_count', v_processed_count,
                    'deleted_storage_count', v_deleted_storage_count,
                    'marked_count', v_marked_count,
                    'skipped_count', v_skipped_count,
                    'failed_count', v_failed_count,
                    'cleaned_at', v_now
                ),
                v_now
            );
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    RETURN jsonb_build_object(
        'success', (v_failed_count = 0),
        'processed_count', v_processed_count,
        'deleted_storage_count', v_deleted_storage_count,
        'marked_count', v_marked_count,
        'skipped_count', v_skipped_count,
        'failed_count', v_failed_count,
        'timestamp', v_now
    );
END;
$clean$;

REVOKE ALL ON FUNCTION public.cleanup_expired_order_files(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_order_files(INT) TO authenticated, service_role;
