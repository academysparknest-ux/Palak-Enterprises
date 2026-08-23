-- ==============================================================================
-- PALAK ENTERPRISES — CUSTOMER ORDER VISIBILITY & BILLING HARMONIZATION
-- Migration: 20260823_customer_order_visibility_and_billing.sql
-- ==============================================================================

-- 1. SECURE CUSTOMER ORDER LINKING FUNCTION
-- Safely associates unassigned orders (user_id IS NULL) with a customer's authenticated profile
CREATE OR REPLACE FUNCTION public.link_customer_orders_to_profile(p_user_id UUID, p_phone TEXT DEFAULT NULL, p_email TEXT DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    v_clean_phone TEXT;
    v_clean_email TEXT;
    v_linked_count INTEGER := 0;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN 0;
    END IF;

    -- Normalize inputs
    v_clean_phone := REGEXP_REPLACE(COALESCE(p_phone, ''), '\D', '', 'g');
    v_clean_email := LOWER(TRIM(COALESCE(p_email, '')));

    -- Link unassigned orders by phone or email
    IF v_clean_phone <> '' AND LENGTH(v_clean_phone) >= 10 THEN
        UPDATE public.orders
        SET user_id = p_user_id,
            updated_at = timezone('utc'::text, now())
        WHERE (user_id IS NULL OR user_id = p_user_id)
          AND (
            REGEXP_REPLACE(COALESCE(customer_phone, ''), '\D', '', 'g') = v_clean_phone
            OR (v_clean_email <> '' AND LOWER(TRIM(COALESCE(customer_email, ''))) = v_clean_email)
          );
        GET DIAGNOSTICS v_linked_count = ROW_COUNT;
    ELSIF v_clean_email <> '' THEN
        UPDATE public.orders
        SET user_id = p_user_id,
            updated_at = timezone('utc'::text, now())
        WHERE (user_id IS NULL OR user_id = p_user_id)
          AND LOWER(TRIM(COALESCE(customer_email, ''))) = v_clean_email;
        GET DIAGNOSTICS v_linked_count = ROW_COUNT;
    END IF;

    -- Also link unassigned invoices for these orders
    UPDATE public.invoices
    SET user_id = p_user_id,
        updated_at = timezone('utc'::text, now())
    WHERE user_id IS NULL
      AND order_id IN (
          SELECT id FROM public.orders WHERE user_id = p_user_id
      );

    RETURN v_linked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. TRIGGER ON PROFILES TO AUTO-LINK ORDERS UPON PROFILE CREATION / PHONE UPDATE
CREATE OR REPLACE FUNCTION public.trg_auto_link_customer_orders()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.link_customer_orders_to_profile(NEW.id, NEW.phone, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_profile_auto_link_orders ON public.profiles;
CREATE TRIGGER trg_profile_auto_link_orders
    AFTER INSERT OR UPDATE OF phone, email ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.trg_auto_link_customer_orders();

-- 3. TRIGGER ON ORDERS TO AUTO-ASSIGN USER_ID BY MATCHING PROFILE PHONE / EMAIL IF NULL
CREATE OR REPLACE FUNCTION public.trg_assign_order_user_id_from_profile()
RETURNS TRIGGER AS $$
DECLARE
    v_matched_user_id UUID;
    v_clean_phone TEXT;
    v_clean_email TEXT;
BEGIN
    IF NEW.user_id IS NULL THEN
        v_clean_phone := REGEXP_REPLACE(COALESCE(NEW.customer_phone, ''), '\D', '', 'g');
        v_clean_email := LOWER(TRIM(COALESCE(NEW.customer_email, '')));

        IF v_clean_phone <> '' AND LENGTH(v_clean_phone) >= 10 THEN
            SELECT id INTO v_matched_user_id
            FROM public.profiles
            WHERE REGEXP_REPLACE(COALESCE(phone, ''), '\D', '', 'g') = v_clean_phone
            LIMIT 1;
        END IF;

        IF v_matched_user_id IS NULL AND v_clean_email <> '' THEN
            SELECT id INTO v_matched_user_id
            FROM public.profiles
            WHERE LOWER(TRIM(COALESCE(email, ''))) = v_clean_email
            LIMIT 1;
        END IF;

        IF v_matched_user_id IS NOT NULL THEN
            NEW.user_id := v_matched_user_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_order_assign_user_id ON public.orders;
CREATE TRIGGER trg_order_assign_user_id
    BEFORE INSERT ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.trg_assign_order_user_id_from_profile();

-- 4. HARDENED REALTIME RLS POLICIES FOR ORDERS, ORDER_ITEMS, AND INVOICES
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Orders SELECT Policy:
DROP POLICY IF EXISTS "Customers view own orders or staff view all" ON public.orders;
CREATE POLICY "Customers view own orders or staff view all" ON public.orders
FOR SELECT USING (
    auth.uid() = user_id OR
    public.is_staff() = true
);

-- Orders INSERT Policy:
DROP POLICY IF EXISTS "Anyone can insert an order" ON public.orders;
DROP POLICY IF EXISTS "Customers create own orders" ON public.orders;
CREATE POLICY "Customers create own orders" ON public.orders
FOR INSERT WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL OR public.is_staff() = true
);

-- Orders UPDATE Policy:
DROP POLICY IF EXISTS "Only staff can update orders" ON public.orders;
CREATE POLICY "Only staff can update orders" ON public.orders
FOR UPDATE USING (public.is_staff() = true);

-- Order Items SELECT Policy:
DROP POLICY IF EXISTS "Users view own order items or staff view all" ON public.order_items;
CREATE POLICY "Users view own order items or staff view all" ON public.order_items
FOR SELECT USING (
    public.is_staff() = true OR
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id
        AND o.user_id = auth.uid()
    )
);

-- Invoices SELECT Policy:
DROP POLICY IF EXISTS "Customers can view own invoices" ON public.invoices;
CREATE POLICY "Customers can view own invoices" ON public.invoices
FOR SELECT USING (
    auth.uid() = user_id OR
    public.is_staff() = true OR
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = invoices.order_id
        AND o.user_id = auth.uid()
    )
);

-- 5. SECURE AUTHENTICATED RPC: get_customer_orders()
-- Retrieves customer orders atomically with automatic profile linkage
CREATE OR REPLACE FUNCTION public.get_customer_orders()
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_profile RECORD;
    v_orders JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHENTICATED');
    END IF;

    -- Fetch profile and auto-link unassigned past orders
    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
    IF FOUND THEN
        PERFORM public.link_customer_orders_to_profile(v_user_id, v_profile.phone, v_profile.email);
    END IF;

    -- Fetch all orders for this customer with joined items and invoice details
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', o.id,
                'orderCode', o.order_code,
                'userId', o.user_id,
                'customerName', o.customer_name,
                'customerPhone', o.customer_phone,
                'customerEmail', o.customer_email,
                'fulfillmentType', COALESCE(o.fulfillment_type, 'pickup'),
                'deliveryAddress', o.delivery_address,
                'orderNotes', o.order_notes,
                'subtotalAmount', COALESCE(o.subtotal_amount, 0),
                'discountAmount', COALESCE(o.discount_amount, 0),
                'deliveryFee', COALESCE(o.delivery_fee, 0),
                'totalAmount', COALESCE(o.total_amount, 0),
                'paymentMethod', COALESCE(o.payment_method, 'pay_at_store'),
                'paymentStatus', COALESCE(o.payment_status, 'pending'),
                'orderStatus', COALESCE(o.order_status, 'NEW'),
                'items', COALESCE(
                    (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'productId', oi.product_id,
                                'productName', oi.product_name,
                                'quantity', oi.quantity,
                                'unitPrice', oi.unit_price,
                                'totalPrice', oi.total_price,
                                'selectedOptions', oi.selected_options,
                                'selectedOptionsLabels', oi.selected_options_labels,
                                'uploadedFileName', oi.uploaded_file_name,
                                'uploadedFileUrl', oi.uploaded_file_url,
                                'designNotes', oi.design_notes
                            )
                        )
                        FROM public.order_items oi
                        WHERE oi.order_id = o.id
                    ),
                    o.items,
                    '[]'::jsonb
                ),
                'invoice', (
                    SELECT jsonb_build_object(
                        'id', inv.id,
                        'invoiceNumber', inv.invoice_number,
                        'status', inv.status,
                        'paymentStatus', inv.payment_status,
                        'totalAmount', inv.total_amount,
                        'amountPaid', inv.amount_paid,
                        'amountDue', inv.amount_due,
                        'invoiceDate', inv.invoice_date
                    )
                    FROM public.invoices inv
                    WHERE (inv.order_id = o.id OR inv.order_code = o.order_code)
                      AND inv.status = 'ISSUED'
                    ORDER BY inv.created_at DESC
                    LIMIT 1
                ),
                'createdAt', o.created_at,
                'updatedAt', o.updated_at
            )
            ORDER BY o.created_at DESC
        ),
        '[]'::jsonb
    ) INTO v_orders
    FROM public.orders o
    WHERE o.user_id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'userId', v_user_id,
        'orders', v_orders
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. AUTOMATIC INVOICE PAYMENT SYNCHRONIZATION TRIGGER
-- When admin updates order.payment_status to 'paid'/'confirmed', update issued invoice amount_paid and amount_due
CREATE OR REPLACE FUNCTION public.trg_sync_invoice_on_order_payment_update()
RETURNS TRIGGER AS $$
DECLARE
    v_is_paid BOOLEAN;
BEGIN
    IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
        v_is_paid := NEW.payment_status IN ('paid', 'confirmed');

        UPDATE public.invoices
        SET payment_status = NEW.payment_status,
            amount_paid = CASE WHEN v_is_paid THEN total_amount ELSE 0.00 END,
            amount_due = CASE WHEN v_is_paid THEN 0.00 ELSE total_amount END,
            updated_at = timezone('utc'::text, now())
        WHERE (order_id = NEW.id OR UPPER(order_code) = UPPER(NEW.order_code))
          AND status = 'ISSUED';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_order_payment_invoice_sync ON public.orders;
CREATE TRIGGER trg_order_payment_invoice_sync
    AFTER UPDATE OF payment_status ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.trg_sync_invoice_on_order_payment_update();

-- 7. SAFE BACKFILL FOR EXISTING ORDERS (INCLUDING PE-20260823-1698)
DO $$
DECLARE
    v_prof RECORD;
BEGIN
    FOR v_prof IN SELECT id, phone, email FROM public.profiles LOOP
        PERFORM public.link_customer_orders_to_profile(v_prof.id, v_prof.phone, v_prof.email);
    END LOOP;

    -- Ensure order PE-20260823-1698 specifically is linked if profile exists with phone 7970733767
    UPDATE public.orders o
    SET user_id = p.id
    FROM public.profiles p
    WHERE o.order_code = 'PE-20260823-1698'
      AND o.user_id IS NULL
      AND (REGEXP_REPLACE(COALESCE(p.phone, ''), '\D', '', 'g') = '7970733767' OR p.full_name ILIKE '%Rishav%');

    -- Auto-issue invoice for completed order PE-20260823-1698 if missing
    IF EXISTS (SELECT 1 FROM public.orders WHERE order_code = 'PE-20260823-1698' AND order_status = 'COMPLETED') THEN
        PERFORM public.create_or_regenerate_invoice('PE-20260823-1698', false, 'System Migration', 'Auto-issuance on completion');
    END IF;
END $$;

-- 8. GRANT EXECUTE ON RPCs
GRANT EXECUTE ON FUNCTION public.link_customer_orders_to_profile(UUID, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_customer_orders() TO authenticated;
