-- ==============================================================================
-- PALAK ENTERPRISES — PRODUCTION HARDENING & SECURITY LOCKDOWN MIGRATION
-- Migration: 20260818_production_hardening_final.sql
-- ==============================================================================

-- 1. ENSURE CORE ROLES HELPER FUNCTIONS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND UPPER(role) IN ('STAFF', 'MANAGER', 'ADMIN')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND UPPER(role) IN ('MANAGER', 'ADMIN')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ENSURE ORDERS CHECK CONSTRAINTS ARE ROBUST
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS check_payment_status;
ALTER TABLE public.orders ADD CONSTRAINT check_payment_status CHECK (payment_status IN (
    'pending', 'pay_at_shop', 'paid', 'confirmed', 'failed', 'refunded', 'partially_paid'
));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS check_payment_method;
ALTER TABLE public.orders ADD CONSTRAINT check_payment_method CHECK (payment_method IN (
    'pay_online', 'pay_at_shop', 'pay_at_store', 'pay_after_confirmation', 'upi_online'
));

-- 2. HARDEN STORAGE BUCKETS (All private)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES 
  ('customer-documents', 'customer-documents', false, 52428800),
  ('order-artwork', 'order-artwork', false, 52428800),
  ('design-files', 'design-files', false, 52428800)
ON CONFLICT (id) DO UPDATE SET 
  public = false,
  file_size_limit = 52428800;

-- 3. HARDEN STORAGE OBJECTS RLS POLICIES (No unauthorized delete/update/select)
DROP POLICY IF EXISTS "Allow customer uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to customer-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to customer-documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff and owners read customer-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from customer-documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff only list files" ON storage.objects;
DROP POLICY IF EXISTS "Allow staff updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow staff deletes" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_update" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_delete" ON storage.objects;

-- Storage Insert: Allow customer/guest document uploads for orders
CREATE POLICY "storage_objects_insert" ON storage.objects
FOR INSERT TO public
WITH CHECK (bucket_id IN ('customer-documents', 'order-artwork', 'design-files'));

-- Storage Select: Restricted to staff ERP operators (customers access via signed URLs)
CREATE POLICY "storage_objects_select" ON storage.objects
FOR SELECT TO public
USING (
  bucket_id IN ('customer-documents', 'order-artwork', 'design-files') AND 
  public.is_staff() = true
);

-- Storage Update: Staff only
CREATE POLICY "storage_objects_update" ON storage.objects
FOR UPDATE TO public
USING (
  bucket_id IN ('customer-documents', 'order-artwork', 'design-files') AND 
  public.is_staff() = true
);

-- Storage Delete: Staff only
CREATE POLICY "storage_objects_delete" ON storage.objects
FOR DELETE TO public
USING (
  bucket_id IN ('customer-documents', 'order-artwork', 'design-files') AND 
  public.is_staff() = true
);

-- 4. HARDEN ORDERS RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert an order" ON public.orders;
DROP POLICY IF EXISTS "Customers create own orders" ON public.orders;
DROP POLICY IF EXISTS "orders_public_insert" ON public.orders;
CREATE POLICY "orders_public_insert" ON public.orders
FOR INSERT TO public
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Customers view own orders or staff view all" ON public.orders;
CREATE POLICY "Customers view own orders or staff view all" ON public.orders
FOR SELECT TO public
USING ((auth.uid() IS NOT NULL AND auth.uid() = user_id) OR public.is_staff() = true);

DROP POLICY IF EXISTS "Only staff can update orders" ON public.orders;
CREATE POLICY "Only staff can update orders" ON public.orders
FOR UPDATE TO public
USING (public.is_staff() = true);

DROP POLICY IF EXISTS "Only admins can delete orders" ON public.orders;
CREATE POLICY "Only admins can delete orders" ON public.orders
FOR DELETE TO public
USING (public.is_admin() = true);

-- 5. HARDEN ORDER ITEMS RLS (Fix guest order item public leakage)
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "order_items_public_insert" ON public.order_items;
CREATE POLICY "order_items_public_insert" ON public.order_items
FOR INSERT TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Users view own order items or staff view all" ON public.order_items;
CREATE POLICY "Users view own order items or staff view all" ON public.order_items
FOR SELECT TO public
USING (
    public.is_staff() = true OR 
    EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_items.order_id 
        AND auth.uid() IS NOT NULL
        AND o.user_id = auth.uid()
    )
);

-- 6. HARDEN ORDER FILES RLS
CREATE TABLE IF NOT EXISTS public.order_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT,
    file_type TEXT,
    file_size BIGINT,
    uploaded_by TEXT DEFAULT 'customer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.order_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Insert order files" ON public.order_files;
DROP POLICY IF EXISTS "order_files_insert" ON public.order_files;
CREATE POLICY "order_files_insert" ON public.order_files
FOR INSERT TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "View own order files or staff view all" ON public.order_files;
DROP POLICY IF EXISTS "order_files_select" ON public.order_files;
CREATE POLICY "order_files_select" ON public.order_files
FOR SELECT TO public
USING (
    public.is_staff() = true OR
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_files.order_id
        AND auth.uid() IS NOT NULL
        AND o.user_id = auth.uid()
    )
);

-- 7. HARDEN STATUS HISTORY RLS
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view relevant status history or staff view all" ON public.status_history;
CREATE POLICY "Users view relevant status history or staff view all" ON public.status_history
FOR SELECT TO public
USING (
    public.is_staff() = true OR 
    (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.orders o WHERE o.order_code = status_history.entity_code AND o.user_id = auth.uid())) OR
    (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.service_requests s WHERE s.request_code = status_history.entity_code AND s.user_id = auth.uid())) OR
    (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.quote_requests q WHERE q.quote_code = status_history.entity_code AND q.user_id = auth.uid()))
);

DROP POLICY IF EXISTS "Staff or authenticated insert status history" ON public.status_history;
DROP POLICY IF EXISTS "Only staff or authenticated can insert status history" ON public.status_history;
DROP POLICY IF EXISTS "status_history_insert" ON public.status_history;
CREATE POLICY "status_history_insert" ON public.status_history
FOR INSERT TO public
WITH CHECK (true);

-- 8. ATOMIC SECURE ORDER CREATION RPC (SECURITY DEFINER)
DROP FUNCTION IF EXISTS public.create_online_print_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, UUID, TEXT, JSONB, JSONB);
DROP FUNCTION IF EXISTS public.create_online_print_order(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, UUID, TEXT, JSONB, JSONB);
DROP FUNCTION IF EXISTS public.create_online_print_order;

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
    p_files JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_order_id UUID;
    v_item RECORD;
    v_file RECORD;
    v_item_id UUID;
BEGIN
    -- 1. Insert Order
    INSERT INTO public.orders (
        order_code, customer_name, customer_phone, customer_email,
        fulfillment_type, delivery_address, order_notes,
        subtotal_amount, delivery_fee, total_amount,
        payment_method, payment_status, order_status,
        user_id, staff_notes, items, created_at, updated_at
    ) VALUES (
        p_order_code, p_customer_name, p_customer_phone, p_customer_email,
        p_fulfillment_type, p_delivery_address, p_order_notes,
        p_subtotal_amount, p_delivery_fee, p_total_amount,
        p_payment_method, p_payment_status, 'NEW',
        p_user_id, p_staff_notes, p_items, now(), now()
    ) RETURNING id INTO v_order_id;

    -- 2. Insert Order Items from JSONB if provided
    IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
            product_name TEXT, "productName" TEXT,
            quantity NUMERIC,
            unit_price NUMERIC, "unitPrice" NUMERIC,
            total_price NUMERIC, "totalPrice" NUMERIC,
            selected_options JSONB, "selectedOptions" JSONB,
            selected_options_labels JSONB, "selectedOptionsLabels" JSONB,
            uploaded_file_name TEXT, "uploadedFileName" TEXT,
            uploaded_file_url TEXT, "uploadedFileUrl" TEXT
        ) LOOP
            INSERT INTO public.order_items (
                order_id, product_name, quantity, unit_price, total_price,
                selected_options, selected_options_labels,
                uploaded_file_name, uploaded_file_url
            ) VALUES (
                v_order_id,
                COALESCE(v_item.product_name, v_item."productName", 'Print Service'),
                COALESCE(v_item.quantity, 1),
                COALESCE(v_item.unit_price, v_item."unitPrice", 0),
                COALESCE(v_item.total_price, v_item."totalPrice", 0),
                COALESCE(v_item.selected_options, v_item."selectedOptions", '{}'::jsonb),
                COALESCE(v_item.selected_options_labels, v_item."selectedOptionsLabels", '{}'::jsonb),
                COALESCE(v_item.uploaded_file_name, v_item."uploadedFileName"),
                COALESCE(v_item.uploaded_file_url, v_item."uploadedFileUrl")
            ) RETURNING id INTO v_item_id;
        END LOOP;
    END IF;

    -- 3. Insert Order Files from JSONB if provided
    IF p_files IS NOT NULL AND jsonb_array_length(p_files) > 0 THEN
        FOR v_file IN SELECT * FROM jsonb_to_recordset(p_files) AS f(
            name TEXT, file_name TEXT, "fileName" TEXT,
            path TEXT, file_path TEXT, "filePath" TEXT, "storagePath" TEXT,
            url TEXT, file_url TEXT, "fileUrl" TEXT,
            type TEXT, file_type TEXT, "fileType" TEXT, "mimeType" TEXT,
            size BIGINT, file_size BIGINT, "fileSize" BIGINT
        ) LOOP
            INSERT INTO public.order_files (
                order_id, order_item_id, file_name, file_path, file_url, file_type, file_size, uploaded_by
            ) VALUES (
                v_order_id,
                v_item_id,
                COALESCE(v_file.name, v_file.file_name, v_file."fileName", 'Document'),
                COALESCE(v_file.path, v_file.file_path, v_file."filePath", v_file."storagePath", ''),
                COALESCE(v_file.url, v_file.file_url, v_file."fileUrl", ''),
                COALESCE(v_file.type, v_file.file_type, v_file."fileType", v_file."mimeType", 'application/pdf'),
                COALESCE(v_file.size, v_file.file_size, v_file."fileSize"),
                p_customer_name
            );
        END LOOP;
    END IF;

    -- 4. Insert Initial Status History
    INSERT INTO public.status_history (
        entity_type, entity_code, new_status, message_en, message_hi, performed_by
    ) VALUES (
        'order', p_order_code, 'NEW',
        'Print order received online.',
        'ऑनलाइन प्रिंट ऑर्डर प्राप्त हुआ।',
        'Online Customer'
    );

    RETURN jsonb_build_object(
        'success', true,
        'orderId', v_order_id,
        'orderCode', p_order_code
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_online_print_order(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, UUID, TEXT, JSONB, JSONB) TO anon, authenticated;

-- 9. PRIVACY-PRESERVING PUBLIC TRACKING RPC
CREATE OR REPLACE FUNCTION public.get_public_order_tracking(
    p_tracking_code TEXT,
    p_phone TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_clean_code TEXT := UPPER(TRIM(p_tracking_code));
    v_clean_phone TEXT := REGEXP_REPLACE(COALESCE(p_phone, ''), '\D', '', 'g');
    v_result JSONB;
    v_order RECORD;
    v_service RECORD;
    v_quote RECORD;
    v_history JSONB;
BEGIN
    -- 1. Check Orders
    SELECT * INTO v_order FROM public.orders WHERE UPPER(order_code) = v_clean_code;
    IF FOUND THEN
        IF v_clean_phone <> '' THEN
            IF NOT (REGEXP_REPLACE(v_order.customer_phone, '\D', '', 'g') LIKE '%' || v_clean_phone) THEN
                RETURN jsonb_build_object('success', false, 'error', 'PHONE_MISMATCH');
            END IF;
        END IF;

        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'previousStatus', previous_status,
            'newStatus', new_status,
            'messageEn', message_en,
            'messageHi', message_hi,
            'performedBy', performed_by,
            'createdAt', created_at
        ) ORDER BY created_at ASC), '[]'::jsonb)
        INTO v_history
        FROM public.status_history
        WHERE entity_code = v_clean_code;

        RETURN jsonb_build_object(
            'success', true,
            'entityType', 'order',
            'record', jsonb_build_object(
                'orderCode', v_order.order_code,
                'customerName', v_order.customer_name,
                'customerPhoneMasked', SUBSTRING(v_order.customer_phone FROM 1 FOR 3) || '****' || RIGHT(v_order.customer_phone, 3),
                'fulfillmentType', v_order.fulfillment_type,
                'totalAmount', v_order.total_amount,
                'paymentMethod', v_order.payment_method,
                'paymentStatus', v_order.payment_status,
                'orderStatus', v_order.order_status,
                'items', v_order.items,
                'createdAt', v_order.created_at,
                'updatedAt', v_order.updated_at
            ),
            'timeline', v_history
        );
    END IF;

    -- 2. Check Service Requests
    SELECT * INTO v_service FROM public.service_requests WHERE UPPER(request_code) = v_clean_code;
    IF FOUND THEN
        IF v_clean_phone <> '' THEN
            IF NOT (REGEXP_REPLACE(v_service.customer_phone, '\D', '', 'g') LIKE '%' || v_clean_phone) THEN
                RETURN jsonb_build_object('success', false, 'error', 'PHONE_MISMATCH');
            END IF;
        END IF;

        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'previousStatus', previous_status,
            'newStatus', new_status,
            'messageEn', message_en,
            'messageHi', message_hi,
            'performedBy', performed_by,
            'createdAt', created_at
        ) ORDER BY created_at ASC), '[]'::jsonb)
        INTO v_history
        FROM public.status_history
        WHERE entity_code = v_clean_code;

        RETURN jsonb_build_object(
            'success', true,
            'entityType', 'service_request',
            'record', jsonb_build_object(
                'requestCode', v_service.request_code,
                'serviceId', v_service.service_id,
                'serviceName', v_service.service_name,
                'customerName', v_service.customer_name,
                'customerPhoneMasked', SUBSTRING(v_service.customer_phone FROM 1 FOR 3) || '****' || RIGHT(v_service.customer_phone, 3),
                'estimatedFee', v_service.estimated_fee,
                'requestStatus', v_service.request_status,
                'acknowledgementNumber', v_service.acknowledgement_number,
                'createdAt', v_service.created_at,
                'updatedAt', v_service.updated_at
            ),
            'timeline', v_history
        );
    END IF;

    -- 3. Check Quote Requests
    SELECT * INTO v_quote FROM public.quote_requests WHERE UPPER(quote_code) = v_clean_code;
    IF FOUND THEN
        IF v_clean_phone <> '' THEN
            IF NOT (REGEXP_REPLACE(v_quote.customer_phone, '\D', '', 'g') LIKE '%' || v_clean_phone) THEN
                RETURN jsonb_build_object('success', false, 'error', 'PHONE_MISMATCH');
            END IF;
        END IF;

        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'previousStatus', previous_status,
            'newStatus', new_status,
            'messageEn', message_en,
            'messageHi', message_hi,
            'performedBy', performed_by,
            'createdAt', created_at
        ) ORDER BY created_at ASC), '[]'::jsonb)
        INTO v_history
        FROM public.status_history
        WHERE entity_code = v_clean_code;

        RETURN jsonb_build_object(
            'success', true,
            'entityType', 'quote_request',
            'record', jsonb_build_object(
                'quoteCode', v_quote.quote_code,
                'serviceOrProductType', v_quote.service_or_product_type,
                'quantity', v_quote.quantity,
                'customerName', v_quote.customer_name,
                'customerPhoneMasked', SUBSTRING(v_quote.customer_phone FROM 1 FOR 3) || '****' || RIGHT(v_quote.customer_phone, 3),
                'quotedAmount', v_quote.quoted_amount,
                'quoteStatus', v_quote.quote_status,
                'createdAt', v_quote.created_at,
                'updatedAt', v_quote.updated_at
            ),
            'timeline', v_history
        );
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_public_order_tracking(TEXT, TEXT) TO anon, authenticated;
