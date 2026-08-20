-- ==============================================================================
-- PALAK ENTERPRISES — FINAL INVOICE INTEGRITY & SECURITY HARDENING
-- Migration: 20260820_invoices_hardening.sql
-- ==============================================================================

-- 1. UNIQUE CONSTRAINT ON ORDER CODE (Database-level guarantee: 1 Order = Maximum 1 Active Invoice)
DO $$
BEGIN
    -- Ensure duplicate check constraint or unique index on order_code
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_invoices_order_code'
    ) THEN
        -- If any duplicates existed previously, keep latest and remove older duplicates before adding constraint
        DELETE FROM public.invoices a USING public.invoices b
        WHERE a.id < b.id 
          AND UPPER(a.order_code) = UPPER(b.order_code);

        ALTER TABLE public.invoices ADD CONSTRAINT uq_invoices_order_code UNIQUE (order_code);
    END IF;
END $$;

-- 2. INVOICE AUDIT LOGS TABLE (For full immutable history of admin regenerations)
CREATE TABLE IF NOT EXISTS public.invoice_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    order_code TEXT NOT NULL,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL DEFAULT 'System',
    actor_role TEXT NOT NULL DEFAULT 'staff',
    action_type TEXT NOT NULL DEFAULT 'REGENERATE',
    reason TEXT,
    previous_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    new_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_invoice_audit_logs_order_code ON public.invoice_audit_logs(order_code);
CREATE INDEX IF NOT EXISTS idx_invoice_audit_logs_invoice_id ON public.invoice_audit_logs(invoice_id);

-- 3. HARDENED ATOMIC SEQUENTIAL INVOICE NUMBER GENERATOR
CREATE OR REPLACE FUNCTION public.generate_next_invoice_number(p_year INTEGER DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    v_year INTEGER;
    v_next_num INTEGER;
    v_formatted_code TEXT;
BEGIN
    v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
    
    -- Atomic upsert & increment per fiscal/calendar year
    INSERT INTO public.invoice_counters (year, last_number, updated_at)
    VALUES (v_year, 1, timezone('utc'::text, now()))
    ON CONFLICT (year) DO UPDATE
    SET last_number = public.invoice_counters.last_number + 1,
        updated_at = timezone('utc'::text, now())
    RETURNING last_number INTO v_next_num;
    
    -- Format: PE-YYYY-000001
    v_formatted_code := 'PE-' || v_year::TEXT || '-' || LPAD(v_next_num::TEXT, 6, '0');
    
    RETURN v_formatted_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. HARDENED ATOMIC CREATE OR REGENERATE INVOICE RPC
CREATE OR REPLACE FUNCTION public.create_or_regenerate_invoice(
    p_order_code TEXT,
    p_force_regenerate BOOLEAN DEFAULT FALSE,
    p_performed_by TEXT DEFAULT 'System',
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_clean_code TEXT := UPPER(TRIM(COALESCE(p_order_code, '')));
    v_order RECORD;
    v_existing_invoice RECORD;
    v_invoice_number TEXT;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_cust_snapshot JSONB;
    v_biz_snapshot JSONB;
    v_items JSONB;
    v_subtotal NUMERIC(10, 2);
    v_discount NUMERIC(10, 2);
    v_taxable NUMERIC(10, 2);
    v_tax NUMERIC(10, 2) := 0.00;
    v_delivery NUMERIC(10, 2);
    v_total NUMERIC(10, 2);
    v_amount_paid NUMERIC(10, 2);
    v_amount_due NUMERIC(10, 2);
    v_target_invoice_id UUID;
    v_result RECORD;
    v_prev_snapshot JSONB;
    v_new_snapshot JSONB;
BEGIN
    IF v_clean_code = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_ORDER_CODE');
    END IF;

    -- 1. Fetch and row-lock the order to prevent concurrent race conditions
    SELECT * INTO v_order 
    FROM public.orders 
    WHERE UPPER(order_code) = v_clean_code 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
    END IF;

    -- 2. Check existing active invoice
    SELECT * INTO v_existing_invoice 
    FROM public.invoices 
    WHERE UPPER(order_code) = v_clean_code AND status = 'ISSUED'
    FOR UPDATE;
    
    -- Idempotency check: Return existing invoice if already created and not explicitly forced
    IF FOUND AND NOT p_force_regenerate THEN
        RETURN jsonb_build_object(
            'success', true,
            'isNew', false,
            'invoiceId', v_existing_invoice.id,
            'invoiceNumber', v_existing_invoice.invoice_number,
            'invoice', to_jsonb(v_existing_invoice)
        );
    END IF;

    -- 3. Authoritative Financial Calculations (strict non-negative two-decimal precision)
    v_subtotal := ROUND(GREATEST(COALESCE(v_order.subtotal_amount, 0.00), 0.00), 2);
    v_discount := ROUND(GREATEST(COALESCE(v_order.discount_amount, 0.00), 0.00), 2);
    v_taxable := ROUND(GREATEST(v_subtotal - v_discount, 0.00), 2);
    v_tax := 0.00; -- Palak Enterprises CSC/Standard Print Services (0% or Exempt unless configured)
    v_delivery := ROUND(GREATEST(COALESCE(v_order.delivery_fee, 0.00), 0.00), 2);
    v_total := ROUND(COALESCE(v_order.total_amount, (v_taxable + v_tax + v_delivery)), 2);
    
    -- Verify payment status against amounts
    IF v_order.payment_status IN ('confirmed', 'paid') THEN
        v_amount_paid := v_total;
        v_amount_due := 0.00;
    ELSIF v_order.payment_status = 'partially_paid' THEN
        v_amount_paid := ROUND(v_total / 2.0, 2);
        v_amount_due := ROUND(v_total - v_amount_paid, 2);
    ELSE
        v_amount_paid := 0.00;
        v_amount_due := v_total;
    END IF;

    -- 4. Customer Snapshot
    v_cust_snapshot := jsonb_build_object(
        'name', COALESCE(v_order.customer_name, 'Valued Customer'),
        'phone', COALESCE(v_order.customer_phone, ''),
        'email', v_order.customer_email,
        'fulfillmentType', COALESCE(v_order.fulfillment_type, 'pickup'),
        'deliveryAddress', v_order.delivery_address,
        'orderNotes', v_order.order_notes
    );

    -- 5. Authoritative Business Snapshot
    v_biz_snapshot := jsonb_build_object(
        'nameEn', 'Palak Enterprises',
        'nameHi', 'पालक इंटरप्राइजेज',
        'unitEn', 'Palak Printing Press & Digital CSC Hub',
        'unitHi', 'पालक प्रिंटिंग प्रेस एवं डिजिटल सेवा केंद्र',
        'taglineEn', 'Printing & Digital Services, All in One Place',
        'taglineHi', 'आपकी हर प्रिंटिंग और ऑनलाइन सेवा, एक ही जगह',
        'ownerName', 'Kumar Pankaj',
        'ownerTitle', 'Proprietor',
        'primaryPhone', '+91 99052 38015',
        'secondaryPhone', '+91 73249 64770',
        'email', 'support@palakenterprises.in',
        'addressLine', 'Ward No. 7, Saniganj Mohalla, Near Block Gate',
        'landmark', 'Near Block Gate',
        'city', 'Chakia',
        'district', 'East Champaran',
        'state', 'Bihar',
        'pincode', '845412',
        'fullAddressEn', 'Ward No. 7, Saniganj Mohalla, Near Block Gate, Chakia, East Champaran, Bihar - 845412',
        'fullAddressHi', 'वार्ड नं. 7, सनिगंज मोहल्ला, ब्लॉक गेट के पास, चकिया, पूर्वी चंपारण, बिहार - 845412',
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

    v_items := COALESCE(v_order.items, '[]'::jsonb);

    -- 6. Execute Insert or Update
    IF FOUND AND p_force_regenerate THEN
        -- Preserve original invoice number and created_at date
        v_invoice_number := v_existing_invoice.invoice_number;
        v_target_invoice_id := v_existing_invoice.id;

        -- Capture previous snapshot for audit trail
        v_prev_snapshot := to_jsonb(v_existing_invoice);

        UPDATE public.invoices SET
            completion_date = v_now,
            customer_snapshot = v_cust_snapshot,
            business_snapshot = v_biz_snapshot,
            items = v_items,
            subtotal_amount = v_subtotal,
            discount_amount = v_discount,
            taxable_amount = v_taxable,
            tax_amount = v_tax,
            delivery_fee = v_delivery,
            other_charges = 0.00,
            total_amount = v_total,
            amount_paid = v_amount_paid,
            amount_due = v_amount_due,
            payment_status = v_order.payment_status,
            payment_method = v_order.payment_method,
            notes = COALESCE(p_reason, 'Regenerated by ' || p_performed_by || ' on ' || v_now::TEXT),
            updated_at = v_now
        WHERE id = v_existing_invoice.id
        RETURNING * INTO v_result;

        v_new_snapshot := to_jsonb(v_result);

        -- Record in audit logs
        INSERT INTO public.invoice_audit_logs (
            invoice_id,
            invoice_number,
            order_code,
            actor_name,
            actor_role,
            action_type,
            reason,
            previous_snapshot,
            new_snapshot
        ) VALUES (
            v_target_invoice_id,
            v_invoice_number,
            v_order.order_code,
            p_performed_by,
            'admin',
            'REGENERATE',
            p_reason,
            v_prev_snapshot,
            v_new_snapshot
        );
    ELSE
        -- Generate brand new official sequential number
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
            v_taxable,
            v_tax,
            v_delivery,
            0.00,
            v_total,
            v_amount_paid,
            v_amount_due,
            v_order.payment_status,
            v_order.payment_method,
            'ISSUED',
            'Generated automatically upon completion by ' || p_performed_by
        )
        ON CONFLICT (order_code) DO UPDATE
        SET updated_at = v_now
        RETURNING * INTO v_result;

        v_target_invoice_id := v_result.id;
    END IF;

    -- Add status history entry
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
        'invoiceId', v_target_invoice_id,
        'invoiceNumber', v_invoice_number,
        'invoice', to_jsonb(v_result)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. SECURE PUBLIC ORDER TRACKING INVOICE RPC
CREATE OR REPLACE FUNCTION public.get_order_invoice(
    p_order_code TEXT,
    p_phone TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_clean_code TEXT := UPPER(TRIM(COALESCE(p_order_code, '')));
    v_clean_phone TEXT := REGEXP_REPLACE(COALESCE(p_phone, ''), '\D', '', 'g');
    v_invoice RECORD;
    v_order RECORD;
BEGIN
    IF v_clean_code = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_CODE');
    END IF;

    SELECT * INTO v_invoice 
    FROM public.invoices 
    WHERE UPPER(order_code) = v_clean_code AND status = 'ISSUED' 
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVOICE_NOT_FOUND');
    END IF;

    -- If phone verification requested, verify matching phone
    IF v_clean_phone <> '' THEN
        SELECT customer_phone INTO v_order FROM public.orders WHERE UPPER(order_code) = v_clean_code;
        IF FOUND AND NOT (REGEXP_REPLACE(COALESCE(v_order.customer_phone, ''), '\D', '', 'g') LIKE '%' || v_clean_phone) THEN
            RETURN jsonb_build_object('success', false, 'error', 'PHONE_MISMATCH');
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'invoice', to_jsonb(v_invoice)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions
GRANT EXECUTE ON FUNCTION public.create_or_regenerate_invoice(TEXT, BOOLEAN, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_invoice(TEXT, TEXT) TO anon, authenticated;

-- RLS Hardening: Customers only select their own user_id or staff
ALTER TABLE public.invoice_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can view invoice audit logs" ON public.invoice_audit_logs;
CREATE POLICY "Staff can view invoice audit logs" ON public.invoice_audit_logs FOR SELECT USING (public.is_staff() = true);
