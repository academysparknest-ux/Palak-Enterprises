-- ==============================================================================
-- Migration: Quick Services Availability Control (Admin Start / Stop System)
-- Date: 2026-08-23
-- Description:
--   1. Creates public.quick_services table to persist availability state.
--   2. Seeds default quick services with is_active = true.
--   3. Configures RLS (public read, staff-only write/toggle).
--   4. Provides toggle_quick_service_status RPC for atomic admin state changes.
--   5. Hardens create_online_print_order RPC to reject orders for inactive services.
-- ==============================================================================

-- 1. Create quick_services table
CREATE TABLE IF NOT EXISTS public.quick_services (
    id TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_hi TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'quick_service', -- 'quick_service' | 'sub_service'
    description_en TEXT,
    description_hi TEXT,
    path TEXT,
    icon_name TEXT DEFAULT 'Printer',
    is_active BOOLEAN NOT NULL DEFAULT true,
    stop_reason TEXT,
    stop_reason_hi TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_by TEXT DEFAULT 'Admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Seed Default Quick Services (Ensuring All Are ACTIVE on Deploy)
INSERT INTO public.quick_services (id, name_en, name_hi, category, description_en, description_hi, path, icon_name, is_active, sort_order)
VALUES
    ('passport-photo', 'Passport Photo Printing', 'पासपोर्ट फोटो प्रिंटिंग', 'quick_service', '8, 16, 32 photo sheets & 4x6 single prints', '8, 16, 32 फोटो शीट व 4x6 सिंगल प्रिंट', '/online-services/passport-photo', 'Camera', true, 1),
    ('document-printing', 'Document Printing', 'दस्तावेज प्रिंटिंग', 'quick_service', 'Notes, assignments, forms, reports & all documents', 'नोट्स, असाइनमेंट, फॉर्म, रिपोर्ट एवं अन्य दस्तावेज', '/online-services/document-printing', 'FileText', true, 2),
    ('color-printing', 'Color Printing', 'रंगीन प्रिंटिंग', 'sub_service', 'High-quality vibrant color laser printing', 'उच्च गुणवत्ता वाली रंगीन लेजर प्रिंटिंग', '/online-services/document-printing', 'Printer', true, 3),
    ('bw-printing', 'Black & White Printing', 'ब्लैक एंड व्हाइट प्रिंटिंग', 'sub_service', 'Standard crisp B&W document printing', 'स्पष्ट ब्लैक एंड व्हाइट दस्तावेज प्रिंटिंग', '/online-services/document-printing', 'Printer', true, 4),
    ('lamination', 'Document Lamination', 'लेमिनेशन सेवा', 'sub_service', 'Glossy protective lamination for certificates & documents', 'प्रमाणपत्रों व दस्तावेजों के लिए सुरक्षात्मक लेमिनेशन', '/online-services/document-printing', 'Shield', true, 5),
    ('spiral-binding', 'Spiral Binding', 'स्पाइरल बाइंडिंग', 'sub_service', 'Plastic coil binding with transparent protective covers', 'पारदर्शी कवर के साथ प्लास्टिक कॉइल बाइंडिंग', '/online-services/document-printing', 'BookOpen', true, 6),
    ('visiting-cards', 'Visiting Cards', 'विजिटिंग कार्ड प्रिंटिंग', 'quick_service', '100, 500, 1000 cards (Matte, Gloss, Velvet finish)', '100, 500, 1000 कार्ड्स (मैट, ग्लॉस, वेलवेट फिनिश)', '/online-services/visiting-cards', 'CreditCard', true, 7),
    ('id-cards', 'ID Cards', 'पहचान पत्र (ID Card)', 'quick_service', 'PVC single/double sided with lanyard & card holder', 'पीवीसी सिंगल/डबल साइडेड लैनयार्ड व कार्ड होल्डर सहित', '/online-services/id-cards', 'Contact', true, 8),
    ('poster-banner', 'Poster & Flex Banner', 'पोस्टर एवं बैनर प्रिंटिंग', 'quick_service', 'A4, A3, A2 glossy photo & vinyl flex per sq.ft', 'A4, A3, A2 फोटो शीट, विनाइल व फ्लेक्स प्रति वर्ग फीट', '/online-services/poster-banner', 'ImageIcon', true, 9),
    ('invitation-cards', 'Invitation Cards', 'शादी एवं निमंत्रण कार्ड', 'quick_service', 'Customized wedding and ceremony invitation printing', 'शादी और समारोह के लिए कस्टमाइज्ड निमंत्रण पत्र', '/online-services/invitation-cards', 'Sparkles', true, 10),
    ('custom-print', 'Custom Print Order', 'कस्टम प्रिंट ऑर्डर', 'quick_service', 'Pamphlets, bill books, stickers, menus & custom jobs', 'पम्पलेट, बिल बुक, स्टिकर, मेन्यू व अन्य आवश्यकताएं', '/online-services/custom-print', 'Printer', true, 11)
ON CONFLICT (id) DO UPDATE SET
    name_en = EXCLUDED.name_en,
    name_hi = EXCLUDED.name_hi,
    category = EXCLUDED.category,
    description_en = EXCLUDED.description_en,
    description_hi = EXCLUDED.description_hi,
    path = EXCLUDED.path,
    icon_name = EXCLUDED.icon_name,
    sort_order = EXCLUDED.sort_order;

-- 3. Row Level Security Policies
ALTER TABLE public.quick_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view quick services" ON public.quick_services;
CREATE POLICY "Public can view quick services" ON public.quick_services
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can insert quick services" ON public.quick_services;
CREATE POLICY "Staff can insert quick services" ON public.quick_services
    FOR INSERT WITH CHECK (public.is_staff() = true);

DROP POLICY IF EXISTS "Staff can update quick services" ON public.quick_services;
CREATE POLICY "Staff can update quick services" ON public.quick_services
    FOR UPDATE USING (public.is_staff() = true);

DROP POLICY IF EXISTS "Staff can delete quick services" ON public.quick_services;
CREATE POLICY "Staff can delete quick services" ON public.quick_services
    FOR DELETE USING (public.is_admin() = true);

-- Ensure status_history entity_type constraint supports quick services
DO $$
BEGIN
    ALTER TABLE public.status_history DROP CONSTRAINT IF EXISTS status_history_entity_type_check;
    ALTER TABLE public.status_history ADD CONSTRAINT status_history_entity_type_check 
        CHECK (entity_type IN ('order', 'service_request', 'quote_request', 'design_request', 'quick_service', 'quick_service_bulk', 'custom'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 4. Hardened RPC for Individual Status Toggle
CREATE OR REPLACE FUNCTION public.toggle_quick_service_status(
    p_service_id TEXT,
    p_is_active BOOLEAN,
    p_stop_reason TEXT DEFAULT NULL,
    p_performed_by TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_operator TEXT;
    v_profile RECORD;
    v_service RECORD;
    v_old_active BOOLEAN;
    v_old_status TEXT;
    v_new_status TEXT;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    -- 1. Security & Operator Identification
    IF v_uid IS NULL THEN
        v_operator := COALESCE(NULLIF(trim(p_performed_by), ''), 'Admin Staff');
    ELSE
        SELECT full_name, email, role INTO v_profile FROM public.profiles WHERE id = v_uid;
        IF FOUND THEN
            v_operator := COALESCE(NULLIF(trim(v_profile.full_name), ''), NULLIF(trim(v_profile.email), ''), 'Staff (' || v_uid || ')');
        ELSE
            v_operator := COALESCE(auth.jwt() ->> 'email', NULLIF(trim(p_performed_by), ''), 'Staff (' || v_uid || ')');
        END IF;
    END IF;

    -- 2. Service Lookup & State Capture
    SELECT id, is_active, stop_reason, name_en, name_hi INTO v_service 
    FROM public.quick_services 
    WHERE id = p_service_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Service with ID % not found.', p_service_id;
    END IF;

    v_old_active := v_service.is_active;
    v_old_status := CASE WHEN v_old_active THEN 'ACTIVE' ELSE 'STOPPED' END;
    v_new_status := CASE WHEN p_is_active THEN 'ACTIVE' ELSE 'STOPPED' END;

    -- 3. Atomic State Update
    UPDATE public.quick_services
    SET is_active = p_is_active,
        stop_reason = CASE WHEN p_is_active THEN NULL ELSE COALESCE(NULLIF(trim(p_stop_reason), ''), 'Temporarily unavailable') END,
        updated_by = v_operator,
        updated_at = v_now
    WHERE id = p_service_id;

    -- 4. Server-Side Audit Trail Record in status_history
    BEGIN
        INSERT INTO public.status_history (
            entity_type,
            entity_code,
            previous_status,
            new_status,
            message_en,
            message_hi,
            performed_by,
            created_at
        ) VALUES (
            'quick_service',
            p_service_id,
            v_old_status,
            v_new_status,
            CASE WHEN p_is_active 
                THEN 'Service ' || v_service.name_en || ' was started (ACTIVE).' 
                ELSE 'Service ' || v_service.name_en || ' was stopped. Reason: ' || COALESCE(p_stop_reason, 'Temporarily unavailable')
            END,
            CASE WHEN p_is_active 
                THEN 'सेवा ' || v_service.name_hi || ' सक्रिय (ACTIVE) की गई।' 
                ELSE 'सेवा ' || v_service.name_hi || ' बंद की गई।'
            END,
            v_operator,
            v_now
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'serviceId', p_service_id,
        'previousState', v_old_status,
        'isActive', p_is_active,
        'stopReason', CASE WHEN p_is_active THEN NULL ELSE p_stop_reason END,
        'operator', v_operator,
        'updatedAt', v_now
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.toggle_quick_service_status(TEXT, BOOLEAN, TEXT, TEXT) TO authenticated, anon;

-- 4b. Hardened RPC for Bulk Start / Stop of All Quick Services (Atomic Transaction)
CREATE OR REPLACE FUNCTION public.toggle_all_quick_services(
    p_is_active BOOLEAN,
    p_stop_reason TEXT DEFAULT NULL,
    p_performed_by TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_operator TEXT;
    v_profile RECORD;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_count INT;
    v_op_type TEXT;
BEGIN
    -- 1. Security & Operator Identification
    IF v_uid IS NULL THEN
        v_operator := COALESCE(NULLIF(trim(p_performed_by), ''), 'Admin Staff');
    ELSE
        SELECT full_name, email, role INTO v_profile FROM public.profiles WHERE id = v_uid;
        IF FOUND THEN
            v_operator := COALESCE(NULLIF(trim(v_profile.full_name), ''), NULLIF(trim(v_profile.email), ''), 'Staff (' || v_uid || ')');
        ELSE
            v_operator := COALESCE(auth.jwt() ->> 'email', NULLIF(trim(p_performed_by), ''), 'Staff (' || v_uid || ')');
        END IF;
    END IF;

    v_op_type := CASE WHEN p_is_active THEN 'BULK_START_ALL' ELSE 'BULK_STOP_ALL' END;

    -- 2. Atomic Bulk Update with WHERE clause
    UPDATE public.quick_services
    SET is_active = p_is_active,
        stop_reason = CASE WHEN p_is_active THEN NULL ELSE COALESCE(NULLIF(trim(p_stop_reason), ''), 'All quick services temporarily paused') END,
        updated_by = v_operator,
        updated_at = v_now
    WHERE id IS NOT NULL;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- 3. Authoritative Bulk Audit Record in status_history
    BEGIN
        INSERT INTO public.status_history (
            entity_type,
            entity_code,
            previous_status,
            new_status,
            message_en,
            message_hi,
            performed_by,
            created_at
        ) VALUES (
            'quick_service_bulk',
            'ALL_SERVICES',
            CASE WHEN p_is_active THEN 'STOPPED' ELSE 'ACTIVE' END,
            v_op_type,
            CASE WHEN p_is_active 
                THEN 'Bulk operation: All ' || v_count || ' quick services were started (ACTIVE).' 
                ELSE 'Bulk operation: All ' || v_count || ' quick services were stopped. Reason: ' || COALESCE(p_stop_reason, 'All quick services temporarily paused')
            END,
            CASE WHEN p_is_active 
                THEN 'थोक कार्रवाई: सभी ' || v_count || ' त्वरित सेवाएँ सक्रिय की गईं।' 
                ELSE 'थोक कार्रवाई: सभी ' || v_count || ' त्वरित सेवाएँ बंद की गईं।'
            END,
            v_operator,
            v_now
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'operation', v_op_type,
        'affectedCount', v_count,
        'isActive', p_is_active,
        'stopReason', CASE WHEN p_is_active THEN NULL ELSE p_stop_reason END,
        'operator', v_operator,
        'updatedAt', v_now
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.toggle_all_quick_services(BOOLEAN, TEXT, TEXT) TO authenticated, anon;

-- 5. Harden create_online_print_order to reject orders for inactive services
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
    p_client_submission_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_existing_id UUID;
    v_existing_code TEXT;
    v_final_order_code TEXT;
    v_order_id UUID;
    v_item RECORD;
    v_file RECORD;
    v_item_id UUID;
    v_calculated_subtotal NUMERIC(10, 2) := 0;
    v_item_quantity INTEGER;
    v_item_unit_price NUMERIC(10, 2);
    v_item_total_price NUMERIC(10, 2);
    v_product_id TEXT;
    v_service_active BOOLEAN;
    v_service_name TEXT;
    v_stop_reason TEXT;
    v_clean_phone TEXT;
    v_clean_name TEXT;
    v_rand_suffix INTEGER;
    v_retry_count INTEGER := 0;
BEGIN
    -- ── A. Idempotency Check ──────────────────────────────────────────────────
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

    -- ── B. Server-Side Input Validation ───────────────────────────────────────
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

    -- ── C. Server-Side Quick Service Active/Stopped Validation ────────────────
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
        v_product_id := COALESCE(v_item.product_id, v_item."productId");

        IF v_product_id IS NOT NULL AND length(v_product_id) > 0 THEN
            SELECT is_active, name_en, stop_reason 
            INTO v_service_active, v_service_name, v_stop_reason
            FROM public.quick_services
            WHERE id = v_product_id
            LIMIT 1;

            IF FOUND AND v_service_active = false THEN
                RAISE EXCEPTION 'Service "%" is temporarily unavailable and not accepting new orders. %',
                    COALESCE(v_service_name, v_product_id),
                    COALESCE(v_stop_reason, 'Please check back later or choose another service.');
            END IF;
        END IF;

        v_item_quantity := GREATEST(1, floor(COALESCE(v_item.quantity, 1))::INTEGER);
        v_item_unit_price := ROUND(GREATEST(0, COALESCE(v_item.unit_price, v_item."unitPrice", 0))::NUMERIC, 2);
        v_item_total_price := ROUND(GREATEST(0, COALESCE(v_item.total_price, v_item."totalPrice", v_item_unit_price * v_item_quantity))::NUMERIC, 2);
        v_calculated_subtotal := v_calculated_subtotal + v_item_total_price;
    END LOOP;

    -- Validate subtotal
    IF ROUND(COALESCE(p_subtotal_amount, 0)::NUMERIC, 2) <> ROUND(v_calculated_subtotal::NUMERIC, 2) THEN
        RAISE EXCEPTION 'Subtotal amount mismatch. Calculated: %, Provided: %', ROUND(v_calculated_subtotal::NUMERIC, 2), ROUND(COALESCE(p_subtotal_amount, 0)::NUMERIC, 2);
    END IF;

    -- Validate total
    IF ROUND(COALESCE(p_total_amount, 0)::NUMERIC, 2) <> ROUND((v_calculated_subtotal + COALESCE(p_delivery_fee, 0))::NUMERIC, 2) THEN
        RAISE EXCEPTION 'Total amount mismatch. Expected: %, Provided: %', ROUND((v_calculated_subtotal + COALESCE(p_delivery_fee, 0))::NUMERIC, 2), ROUND(COALESCE(p_total_amount, 0)::NUMERIC, 2);
    END IF;

    -- ── D. Concurrency-Safe Collision-Resistant Order Code Allocation ──────────
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

    -- ── E. Insert Order (Atomic Transaction) ──────────────────────────────────
    INSERT INTO public.orders (
        order_code, client_submission_id, customer_name, customer_phone, customer_email,
        fulfillment_type, delivery_address, order_notes,
        subtotal_amount, delivery_fee, total_amount,
        payment_method, payment_status, order_status,
        user_id, staff_notes, items, created_at, updated_at
    ) VALUES (
        v_final_order_code,
        NULLIF(trim(p_client_submission_id), ''),
        v_clean_name,
        v_clean_phone,
        NULLIF(trim(p_customer_email), ''),
        COALESCE(NULLIF(trim(p_fulfillment_type), ''), 'pickup'),
        p_delivery_address,
        NULLIF(trim(p_order_notes), ''),
        ROUND(COALESCE(p_subtotal_amount, 0)::NUMERIC, 2),
        ROUND(COALESCE(p_delivery_fee, 0)::NUMERIC, 2),
        ROUND(COALESCE(p_total_amount, 0)::NUMERIC, 2),
        COALESCE(NULLIF(trim(p_payment_method), ''), 'pay_at_store'),
        COALESCE(NULLIF(trim(p_payment_status), ''), 'pending'),
        'NEW',
        p_user_id,
        NULLIF(trim(p_staff_notes), ''),
        p_items,
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    ) RETURNING id INTO v_order_id;

    -- ── F. Insert Order Items & Files ─────────────────────────────────────────
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        product_id TEXT, "productId" TEXT,
        product_name TEXT, "productName" TEXT,
        quantity NUMERIC,
        unit_price NUMERIC, "unitPrice" NUMERIC,
        total_price NUMERIC, "totalPrice" NUMERIC,
        selected_options JSONB, "selectedOptions" JSONB,
        selected_options_labels JSONB, "selectedOptionsLabels" JSONB,
        uploaded_file_name TEXT, "uploadedFileName" TEXT,
        uploaded_file_url TEXT, "uploadedFileUrl" TEXT,
        design_notes TEXT, "designNotes" TEXT
    ) LOOP
        INSERT INTO public.order_items (
            order_id, product_id, product_name, quantity, unit_price, total_price,
            selected_options, selected_options_labels,
            uploaded_file_name, uploaded_file_url, design_notes,
            created_at
        ) VALUES (
            v_order_id,
            COALESCE(v_item.product_id, v_item."productId", 'print-service'),
            COALESCE(v_item.product_name, v_item."productName", 'Print Item'),
            GREATEST(1, floor(COALESCE(v_item.quantity, 1))::INTEGER),
            ROUND(GREATEST(0, COALESCE(v_item.unit_price, v_item."unitPrice", 0))::NUMERIC, 2),
            ROUND(GREATEST(0, COALESCE(v_item.total_price, v_item."totalPrice", 0))::NUMERIC, 2),
            COALESCE(v_item.selected_options, v_item."selectedOptions", '{}'::jsonb),
            COALESCE(v_item.selected_options_labels, v_item."selectedOptionsLabels", '{}'::jsonb),
            COALESCE(v_item.uploaded_file_name, v_item."uploadedFileName"),
            COALESCE(v_item.uploaded_file_url, v_item."uploadedFileUrl"),
            COALESCE(v_item.design_notes, v_item."designNotes"),
            timezone('utc'::text, now())
        ) RETURNING id INTO v_item_id;
    END LOOP;

    -- Insert files if provided
    IF p_files IS NOT NULL AND jsonb_array_length(p_files) > 0 THEN
        FOR v_file IN SELECT * FROM jsonb_to_recordset(p_files) AS f(
            file_name TEXT, "fileName" TEXT, name TEXT,
            file_url TEXT, "fileUrl" TEXT, url TEXT,
            file_size BIGINT, "fileSize" BIGINT, size BIGINT,
            file_type TEXT, "fileType" TEXT, type TEXT,
            page_count INTEGER, "pageCount" INTEGER
        ) LOOP
            BEGIN
                INSERT INTO public.order_files (
                    order_id, file_name, file_url, file_size, file_type, page_count, created_at
                ) VALUES (
                    v_order_id,
                    COALESCE(v_file.file_name, v_file."fileName", v_file.name, 'document.pdf'),
                    COALESCE(v_file.file_url, v_file."fileUrl", v_file.url, ''),
                    COALESCE(v_file.file_size, v_file."fileSize", v_file.size, 0),
                    COALESCE(v_file.file_type, v_file."fileType", v_file.type, 'application/pdf'),
                    COALESCE(v_file.page_count, v_file."pageCount", 1),
                    timezone('utc'::text, now())
                );
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END LOOP;
    END IF;

    -- Record initial status history
    BEGIN
        INSERT INTO public.status_history (
            entity_type, entity_code, new_status,
            message_en, message_hi, performed_by
        ) VALUES (
            'order', v_final_order_code, 'NEW',
            'Order submitted online by customer.',
            'ग्राहक द्वारा ऑनलाइन ऑर्डर सबमिट किया गया।',
            v_clean_name
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'orderId', v_order_id,
        'orderCode', v_final_order_code,
        'isDuplicate', false,
        'message', 'Order placed successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_online_print_order(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, UUID, TEXT, JSONB, JSONB, TEXT) TO authenticated, anon;
