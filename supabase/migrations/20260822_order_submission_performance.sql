-- ==============================================================================
-- Migration: 20260822_order_submission_performance.sql
-- Goal: Ensure create_online_print_order RPC is up-to-date and supports high-throughput atomic checkout.
-- ==============================================================================

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
    -- 1. Insert Order Atomically
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
        'Order received online.',
        'ऑनलाइन ऑर्डर प्राप्त हुआ।',
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

-- Ensure essential performance indexes exist
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_code ON public.orders(order_code);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_files_order_id ON public.order_files(order_id);
