-- ==============================================================================
-- PALAK ENTERPRISES — AUTOMATED INVOICE & BILLING MANAGEMENT SYSTEM
-- Migration: 20260820_invoices_system.sql
-- ==============================================================================

-- 1. INVOICE COUNTERS (Atomic sequential invoice numbers per fiscal/calendar year)
CREATE TABLE IF NOT EXISTS public.invoice_counters (
    year INTEGER PRIMARY KEY,
    last_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Initialize current year counter
INSERT INTO public.invoice_counters (year, last_number)
VALUES (2026, 0)
ON CONFLICT (year) DO NOTHING;

-- 2. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    order_code TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    invoice_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completion_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    
    -- Immutable Snapshots
    customer_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    business_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Amounts and Financials
    subtotal_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    taxable_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    other_charges NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    amount_due NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    
    -- Status and Metadata
    payment_status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT NOT NULL DEFAULT 'pay_at_store',
    status TEXT NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED', 'CANCELLED', 'VOID')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. INDEXES FOR HIGH PERFORMANCE LOOKUP
CREATE INDEX IF NOT EXISTS idx_invoices_order_code ON public.invoices(order_code);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON public.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON public.invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- 4. ATOMIC SEQUENTIAL INVOICE NUMBER GENERATION FUNCTION
CREATE OR REPLACE FUNCTION public.generate_next_invoice_number(p_year INTEGER DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    v_year INTEGER;
    v_next_num INTEGER;
    v_formatted_code TEXT;
BEGIN
    v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
    
    -- Atomically insert or update the counter for the year
    INSERT INTO public.invoice_counters (year, last_number, updated_at)
    VALUES (v_year, 1, timezone('utc'::text, now()))
    ON CONFLICT (year) DO UPDATE
    SET last_number = public.invoice_counters.last_number + 1,
        updated_at = timezone('utc'::text, now())
    RETURNING last_number INTO v_next_num;
    
    -- Format: PE-2026-000001
    v_formatted_code := 'PE-' || v_year::TEXT || '-' || LPAD(v_next_num::TEXT, 6, '0');
    
    RETURN v_formatted_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ATOMIC CREATE / REGENERATE INVOICE RPC
CREATE OR REPLACE FUNCTION public.create_or_regenerate_invoice(
    p_order_code TEXT,
    p_force_regenerate BOOLEAN DEFAULT FALSE,
    p_performed_by TEXT DEFAULT 'System'
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_existing_invoice RECORD;
    v_invoice_number TEXT;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_cust_snapshot JSONB;
    v_biz_snapshot JSONB;
    v_items JSONB;
    v_subtotal NUMERIC(10, 2);
    v_discount NUMERIC(10, 2);
    v_delivery NUMERIC(10, 2);
    v_total NUMERIC(10, 2);
    v_amount_paid NUMERIC(10, 2);
    v_amount_due NUMERIC(10, 2);
    v_new_invoice_id UUID;
    v_result RECORD;
BEGIN
    -- 1. Fetch the order
    SELECT * INTO v_order FROM public.orders WHERE UPPER(order_code) = UPPER(TRIM(p_order_code));
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
    END IF;

    -- 2. Check if invoice already exists for this order
    SELECT * INTO v_existing_invoice FROM public.invoices WHERE UPPER(order_code) = UPPER(TRIM(p_order_code)) AND status = 'ISSUED' LIMIT 1;
    
    IF FOUND AND NOT p_force_regenerate THEN
        -- Return existing invoice safely without duplicating
        RETURN jsonb_build_object(
            'success', true,
            'isNew', false,
            'invoiceId', v_existing_invoice.id,
            'invoiceNumber', v_existing_invoice.invoice_number,
            'invoice', to_jsonb(v_existing_invoice)
        );
    END IF;

    -- 3. Calculate financial figures
    v_subtotal := COALESCE(v_order.subtotal_amount, 0.00);
    v_discount := COALESCE(v_order.discount_amount, 0.00);
    v_delivery := COALESCE(v_order.delivery_fee, 0.00);
    v_total := COALESCE(v_order.total_amount, (v_subtotal - v_discount + v_delivery));
    
    IF v_order.payment_status IN ('confirmed', 'paid') THEN
        v_amount_paid := v_total;
        v_amount_due := 0.00;
    ELSE
        v_amount_paid := 0.00;
        v_amount_due := v_total;
    END IF;

    -- 4. Prepare Customer Snapshot
    v_cust_snapshot := jsonb_build_object(
        'name', v_order.customer_name,
        'phone', v_order.customer_phone,
        'email', v_order.customer_email,
        'fulfillmentType', v_order.fulfillment_type,
        'deliveryAddress', v_order.delivery_address,
        'orderNotes', v_order.order_notes
    );

    -- 5. Prepare Business Snapshot
    v_biz_snapshot := jsonb_build_object(
        'nameEn', 'Palak Enterprises',
        'nameHi', 'पालक इंटरप्राइजेज',
        'unitEn', 'Palak Printing Press & Digital CSC Hub',
        'unitHi', 'पालक प्रिंटिंग प्रेस एवं डिजिटल सेवा केंद्र',
        'taglineEn', 'Printing & Digital Services, All in One Place',
        'taglineHi', 'आपकी हर प्रिंटिंग और ऑनलाइन सेवा, एक ही जगह',
        'ownerName', 'Kumar Pankaj',
        'primaryPhone', '+91 99052 38015',
        'secondaryPhone', '+91 73249 64770',
        'email', 'support@palakenterprises.in',
        'addressLine', 'Ward No. 7, Saniganj Mohalla, Near Block Gate',
        'city', 'Chakia',
        'district', 'East Champaran',
        'state', 'Bihar',
        'pincode', '845412',
        'cscId', '634165120013',
        'udyamNo', 'UDYAM-BR-11-0061705',
        'gstin', '10BRKPK1234F1Z5',
        'logoUrl', '/logo.webp',
        'terms', jsonb_build_array(
            '1. This is a computer generated invoice and does not require physical signature.',
            '2. Goods/prints once inspected and delivered will not be returned.',
            '3. Online services fees are non-refundable once portal filing is initiated.',
            '4. Jurisdiction for disputes: Chakia / Motihari, East Champaran, Bihar.'
        )
    );

    -- 6. Items JSONB
    v_items := COALESCE(v_order.items, '[]'::jsonb);

    -- 7. Handle invoice number (reuse existing number if regenerating, else generate new)
    IF FOUND AND p_force_regenerate THEN
        v_invoice_number := v_existing_invoice.invoice_number;
        
        -- Update existing invoice record
        UPDATE public.invoices SET
            invoice_date = v_now,
            completion_date = v_now,
            customer_snapshot = v_cust_snapshot,
            business_snapshot = v_biz_snapshot,
            items = v_items,
            subtotal_amount = v_subtotal,
            discount_amount = v_discount,
            taxable_amount = v_subtotal - v_discount,
            tax_amount = 0.00,
            delivery_fee = v_delivery,
            other_charges = 0.00,
            total_amount = v_total,
            amount_paid = v_amount_paid,
            amount_due = v_amount_due,
            payment_status = v_order.payment_status,
            payment_method = v_order.payment_method,
            notes = 'Regenerated by ' || p_performed_by || ' on ' || v_now::TEXT,
            updated_at = v_now
        WHERE id = v_existing_invoice.id
        RETURNING * INTO v_result;

        v_new_invoice_id := v_existing_invoice.id;
    ELSE
        -- Generate fresh sequential number
        v_invoice_number := public.generate_next_invoice_number(EXTRACT(YEAR FROM v_now)::INTEGER);
        
        INSERT INTO public.invoices (
            invoice_number,
            order_id,
            order_code,
            user_id,
            invoice_date,
            completion_date,
            customer_snapshot,
            business_snapshot,
            items,
            subtotal_amount,
            discount_amount,
            taxable_amount,
            tax_amount,
            delivery_fee,
            other_charges,
            total_amount,
            amount_paid,
            amount_due,
            payment_status,
            payment_method,
            status,
            notes
        ) VALUES (
            v_invoice_number,
            v_order.id,
            v_order.order_code,
            v_order.user_id,
            v_now,
            v_now,
            v_cust_snapshot,
            v_biz_snapshot,
            v_items,
            v_subtotal,
            v_discount,
            v_subtotal - v_discount,
            0.00,
            v_delivery,
            0.00,
            v_total,
            v_amount_paid,
            v_amount_due,
            v_order.payment_status,
            v_order.payment_method,
            'ISSUED',
            'Generated upon completion by ' || p_performed_by
        )
        RETURNING * INTO v_result;

        v_new_invoice_id := v_result.id;
    END IF;

    -- Add status history log
    INSERT INTO public.status_history (
        entity_type,
        entity_code,
        previous_status,
        new_status,
        message_en,
        message_hi,
        performed_by
    ) VALUES (
        'order',
        v_order.order_code,
        v_order.order_status,
        'INVOICE_GENERATED',
        'Official Invoice ' || v_invoice_number || ' generated (Total: ₹' || v_total || ').',
        'आधिकारिक बिल ' || v_invoice_number || ' जनरेट किया गया (कुल: ₹' || v_total || ')।',
        p_performed_by
    );

    RETURN jsonb_build_object(
        'success', true,
        'isNew', NOT (FOUND AND p_force_regenerate),
        'invoiceId', v_new_invoice_id,
        'invoiceNumber', v_invoice_number,
        'invoice', to_jsonb(v_result)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. PUBLIC SECURE FETCH ORDER INVOICE RPC
CREATE OR REPLACE FUNCTION public.get_order_invoice(
    p_order_code TEXT,
    p_phone TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_clean_code TEXT := UPPER(TRIM(p_order_code));
    v_clean_phone TEXT := REGEXP_REPLACE(COALESCE(p_phone, ''), '\D', '', 'g');
    v_invoice RECORD;
    v_order RECORD;
BEGIN
    SELECT * INTO v_invoice FROM public.invoices WHERE UPPER(order_code) = v_clean_code AND status = 'ISSUED' LIMIT 1;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVOICE_NOT_FOUND');
    END IF;

    -- If phone verification provided, verify matching phone
    IF v_clean_phone <> '' THEN
        SELECT customer_phone INTO v_order FROM public.orders WHERE UPPER(order_code) = v_clean_code;
        IF FOUND AND NOT (REGEXP_REPLACE(v_order.customer_phone, '\D', '', 'g') LIKE '%' || v_clean_phone) THEN
            RETURN jsonb_build_object('success', false, 'error', 'PHONE_MISMATCH');
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'invoice', to_jsonb(v_invoice)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.generate_next_invoice_number(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_or_regenerate_invoice(TEXT, BOOLEAN, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_invoice(TEXT, TEXT) TO anon, authenticated;

-- 7. ROW LEVEL SECURITY (RLS) POLICIES FOR INVOICES TABLE
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage all invoices" ON public.invoices;
CREATE POLICY "Staff can manage all invoices" ON public.invoices FOR ALL USING (public.is_staff() = true);

DROP POLICY IF EXISTS "Customers can view own invoices" ON public.invoices;
CREATE POLICY "Customers can view own invoices" ON public.invoices FOR SELECT USING (
    auth.uid() = user_id OR
    public.is_staff() = true OR
    user_id IS NULL
);

DROP POLICY IF EXISTS "Staff manage invoice counters" ON public.invoice_counters;
CREATE POLICY "Staff manage invoice counters" ON public.invoice_counters FOR ALL USING (public.is_staff() = true);
