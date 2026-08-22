-- ==============================================================================
-- PALAK ENTERPRISES — PRODUCTION INVOICE & BILLING MANAGEMENT SYSTEM
-- Migration: 20260821_production_invoice_billing_system.sql
-- ==============================================================================

-- 1. INDIAN FINANCIAL YEAR FUNCTION (1 April – 31 March)
CREATE OR REPLACE FUNCTION public.get_financial_year_start(p_date TIMESTAMPTZ DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    v_date DATE;
    v_year INTEGER;
    v_month INTEGER;
BEGIN
    v_date := COALESCE(p_date::DATE, CURRENT_DATE);
    v_year := EXTRACT(YEAR FROM v_date)::INTEGER;
    v_month := EXTRACT(MONTH FROM v_date)::INTEGER;
    
    -- In India: April (4) to March (3) of next calendar year
    -- If month is 1, 2, or 3 -> FY started in (v_year - 1)
    IF v_month < 4 THEN
        RETURN v_year - 1;
    ELSE
        RETURN v_year;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.get_financial_year_code(p_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    v_start_year INTEGER;
    v_end_short TEXT;
BEGIN
    v_start_year := public.get_financial_year_start(p_date);
    v_end_short := LPAD(((v_start_year + 1) % 100)::TEXT, 2, '0');
    RETURN v_start_year::TEXT || '-' || v_end_short;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. INVOICE COUNTERS TABLE
CREATE TABLE IF NOT EXISTS public.invoice_counters (
    year INTEGER PRIMARY KEY, -- Financial year start (e.g. 2026 for FY 2026-27)
    last_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Initialize 2026 FY counter if not exists
INSERT INTO public.invoice_counters (year, last_number)
VALUES (2026, 0)
ON CONFLICT (year) DO NOTHING;

-- 3. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    order_code TEXT,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    source TEXT NOT NULL DEFAULT 'ONLINE',
    document_type TEXT NOT NULL DEFAULT 'TAX_INVOICE',
    financial_year TEXT DEFAULT '2026-27',
    temporary_number TEXT,
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
    status TEXT NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('DRAFT', 'ISSUED', 'CANCELLED', 'VOID', 'PENDING_SYNC')),
    signature_url TEXT,
    notes TEXT,
    created_by TEXT DEFAULT 'System',
    cancelled_at TIMESTAMPTZ,
    cancelled_by TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure all columns exist if table was already present
ALTER TABLE public.invoices 
    ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ONLINE',
    ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'TAX_INVOICE',
    ADD COLUMN IF NOT EXISTS financial_year TEXT DEFAULT '2026-27',
    ADD COLUMN IF NOT EXISTS temporary_number TEXT,
    ADD COLUMN IF NOT EXISTS signature_url TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_by TEXT,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'System';

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check 
    CHECK (status IN ('DRAFT', 'ISSUED', 'CANCELLED', 'VOID', 'PENDING_SYNC'));

ALTER TABLE public.invoices ALTER COLUMN order_code DROP NOT NULL;

-- 4. INVOICE AUDIT LOGS TABLE
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_order_code ON public.invoices(order_code);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON public.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_source ON public.invoices(source);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_audit_logs_invoice_id ON public.invoice_audit_logs(invoice_id);

-- 5. ATOMIC SEQUENTIAL INVOICE NUMBER GENERATOR (Indian Financial Year Sequence)
CREATE OR REPLACE FUNCTION public.generate_next_invoice_number(p_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    v_fy_year INTEGER;
    v_next_num INTEGER;
    v_formatted_code TEXT;
BEGIN
    v_fy_year := public.get_financial_year_start(p_date);
    
    -- Atomically increment counter for this financial year
    INSERT INTO public.invoice_counters (year, last_number, updated_at)
    VALUES (v_fy_year, 1, timezone('utc'::text, now()))
    ON CONFLICT (year) DO UPDATE
    SET last_number = public.invoice_counters.last_number + 1,
        updated_at = timezone('utc'::text, now())
    RETURNING last_number INTO v_next_num;
    
    -- Format: PE-YYYY-000001 (e.g. PE-2026-000128)
    v_formatted_code := 'PE-' || v_fy_year::TEXT || '-' || LPAD(v_next_num::TEXT, 6, '0');
    
    RETURN v_formatted_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. ATOMIC CREATE / REGENERATE INVOICE FOR ONLINE ORDER RPC
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
    v_fy_start INTEGER;
    v_fy_code TEXT;
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

    -- 1. Lock order
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
    
    IF FOUND AND NOT p_force_regenerate THEN
        RETURN jsonb_build_object(
            'success', true,
            'isNew', false,
            'invoiceId', v_existing_invoice.id,
            'invoiceNumber', v_existing_invoice.invoice_number,
            'invoice', to_jsonb(v_existing_invoice)
        );
    END IF;

    v_fy_start := public.get_financial_year_start(v_now);
    v_fy_code := public.get_financial_year_code(v_now);

    -- 3. Calculations
    v_subtotal := ROUND(GREATEST(COALESCE(v_order.subtotal_amount, 0.00), 0.00), 2);
    v_discount := ROUND(GREATEST(COALESCE(v_order.discount_amount, 0.00), 0.00), 2);
    v_taxable := ROUND(GREATEST(v_subtotal - v_discount, 0.00), 2);
    v_tax := ROUND(GREATEST(COALESCE(v_order.tax_amount, 0.00), 0.00), 2);
    v_delivery := ROUND(GREATEST(COALESCE(v_order.delivery_fee, 0.00), 0.00), 2);
    v_total := ROUND(COALESCE(v_order.total_amount, (v_taxable + v_tax + v_delivery)), 2);
    
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

    -- 5. Business Snapshot
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

    -- 6. Insert / Update
    IF FOUND AND p_force_regenerate THEN
        v_invoice_number := v_existing_invoice.invoice_number;
        v_target_invoice_id := v_existing_invoice.id;
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
        v_invoice_number := public.generate_next_invoice_number(v_now);
        
        INSERT INTO public.invoices (
            invoice_number,
            order_id,
            order_code,
            user_id,
            source,
            document_type,
            financial_year,
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
            created_by,
            notes
        ) VALUES (
            v_invoice_number,
            v_order.id,
            v_order.order_code,
            v_order.user_id,
            'ONLINE',
            'TAX_INVOICE',
            v_fy_code,
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
            p_performed_by,
            'Generated automatically upon completion by ' || p_performed_by
        )
        ON CONFLICT (invoice_number) DO UPDATE
        SET updated_at = v_now
        RETURNING * INTO v_result;

        v_target_invoice_id := v_result.id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'isNew', NOT (FOUND AND p_force_regenerate),
        'invoiceId', v_target_invoice_id,
        'invoiceNumber', v_invoice_number,
        'invoice', to_jsonb(v_result)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. ATOMIC CREATE ADMIN BILL RPC (Supports Save Draft & Issue Official Invoice)
CREATE OR REPLACE FUNCTION public.create_admin_bill(
    p_action TEXT, -- 'DRAFT' or 'ISSUE'
    p_document_type TEXT, -- 'TAX_INVOICE' or 'RETAIL_BILL'
    p_customer JSONB,
    p_items JSONB,
    p_financials JSONB,
    p_payment_mode TEXT DEFAULT 'cash',
    p_payment_status TEXT DEFAULT 'paid',
    p_amount_paid NUMERIC DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_performed_by TEXT DEFAULT 'Admin Staff',
    p_draft_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_fy_code TEXT;
    v_invoice_number TEXT;
    v_subtotal NUMERIC(10, 2);
    v_discount NUMERIC(10, 2);
    v_taxable NUMERIC(10, 2);
    v_tax NUMERIC(10, 2);
    v_total NUMERIC(10, 2);
    v_paid NUMERIC(10, 2);
    v_due NUMERIC(10, 2);
    v_status TEXT;
    v_biz_snapshot JSONB;
    v_result RECORD;
BEGIN
    v_fy_code := public.get_financial_year_code(v_now);

    -- Extract financials
    v_subtotal := ROUND(GREATEST(COALESCE((p_financials->>'subtotal')::NUMERIC, 0.00), 0.00), 2);
    v_discount := ROUND(GREATEST(COALESCE((p_financials->>'discount')::NUMERIC, 0.00), 0.00), 2);
    v_taxable := ROUND(GREATEST(COALESCE((p_financials->>'taxableAmount')::NUMERIC, (v_subtotal - v_discount)), 0.00), 2);
    v_tax := ROUND(GREATEST(COALESCE((p_financials->>'taxAmount')::NUMERIC, 0.00), 0.00), 2);
    v_total := ROUND(GREATEST(COALESCE((p_financials->>'grandTotal')::NUMERIC, (v_taxable + v_tax)), 0.00), 2);

    IF p_amount_paid IS NOT NULL THEN
        v_paid := ROUND(GREATEST(p_amount_paid, 0.00), 2);
    ELSIF p_payment_status IN ('paid', 'confirmed') THEN
        v_paid := v_total;
    ELSIF p_payment_status = 'partially_paid' THEN
        v_paid := ROUND(v_total / 2.0, 2);
    ELSE
        v_paid := 0.00;
    END IF;

    v_due := ROUND(GREATEST(v_total - v_paid, 0.00), 2);

    -- Build default business snapshot
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

    IF p_action = 'DRAFT' THEN
        v_status := 'DRAFT';
        v_invoice_number := 'DRAFT-' || EXTRACT(EPOCH FROM v_now)::BIGINT::TEXT;

        IF p_draft_id IS NOT NULL THEN
            UPDATE public.invoices SET
                customer_snapshot = p_customer,
                document_type = p_document_type,
                items = p_items,
                subtotal_amount = v_subtotal,
                discount_amount = v_discount,
                taxable_amount = v_taxable,
                tax_amount = v_tax,
                total_amount = v_total,
                amount_paid = v_paid,
                amount_due = v_due,
                payment_method = p_payment_mode,
                payment_status = p_payment_status,
                notes = p_notes,
                updated_at = v_now
            WHERE id = p_draft_id AND status = 'DRAFT'
            RETURNING * INTO v_result;
        ELSE
            INSERT INTO public.invoices (
                invoice_number,
                source,
                document_type,
                financial_year,
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
                created_by,
                notes
            ) VALUES (
                v_invoice_number,
                'ADMIN',
                p_document_type,
                v_fy_code,
                v_now,
                v_now,
                p_customer,
                v_biz_snapshot,
                p_items,
                v_subtotal,
                v_discount,
                v_taxable,
                v_tax,
                0.00,
                0.00,
                v_total,
                v_paid,
                v_due,
                p_payment_status,
                p_payment_mode,
                'DRAFT',
                p_performed_by,
                p_notes
            )
            RETURNING * INTO v_result;
        END IF;

    ELSE -- p_action = 'ISSUE'
        v_status := 'ISSUED';
        -- Allocate official sequential number atomically
        v_invoice_number := public.generate_next_invoice_number(v_now);

        IF p_draft_id IS NOT NULL THEN
            UPDATE public.invoices SET
                invoice_number = v_invoice_number,
                status = 'ISSUED',
                document_type = p_document_type,
                customer_snapshot = p_customer,
                business_snapshot = v_biz_snapshot,
                items = p_items,
                subtotal_amount = v_subtotal,
                discount_amount = v_discount,
                taxable_amount = v_taxable,
                tax_amount = v_tax,
                total_amount = v_total,
                amount_paid = v_paid,
                amount_due = v_due,
                payment_method = p_payment_mode,
                payment_status = p_payment_status,
                notes = p_notes,
                updated_at = v_now
            WHERE id = p_draft_id
            RETURNING * INTO v_result;
        ELSE
            INSERT INTO public.invoices (
                invoice_number,
                source,
                document_type,
                financial_year,
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
                created_by,
                notes
            ) VALUES (
                v_invoice_number,
                'ADMIN',
                p_document_type,
                v_fy_code,
                v_now,
                v_now,
                p_customer,
                v_biz_snapshot,
                p_items,
                v_subtotal,
                v_discount,
                v_taxable,
                v_tax,
                0.00,
                0.00,
                v_total,
                v_paid,
                v_due,
                p_payment_status,
                p_payment_mode,
                'ISSUED',
                p_performed_by,
                p_notes
            )
            RETURNING * INTO v_result;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'invoiceId', v_result.id,
        'invoiceNumber', v_result.invoice_number,
        'status', v_result.status,
        'invoice', to_jsonb(v_result)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. ATOMIC CANCEL INVOICE RPC (Preserves number, marks CANCELLED, never reuses)
CREATE OR REPLACE FUNCTION public.cancel_invoice(
    p_invoice_number TEXT,
    p_cancelled_by TEXT,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_inv RECORD;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    SELECT * INTO v_inv 
    FROM public.invoices 
    WHERE UPPER(invoice_number) = UPPER(TRIM(p_invoice_number))
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVOICE_NOT_FOUND');
    END IF;

    IF v_inv.status = 'CANCELLED' THEN
        RETURN jsonb_build_object('success', true, 'message', 'ALREADY_CANCELLED', 'invoice', to_jsonb(v_inv));
    END IF;

    UPDATE public.invoices SET
        status = 'CANCELLED',
        cancelled_at = v_now,
        cancelled_by = p_cancelled_by,
        cancellation_reason = p_reason,
        updated_at = v_now
    WHERE id = v_inv.id
    RETURNING * INTO v_inv;

    -- Add audit record
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
        v_inv.id,
        v_inv.invoice_number,
        COALESCE(v_inv.order_code, '-'),
        p_cancelled_by,
        'admin',
        'CANCEL',
        p_reason,
        jsonb_build_object('status', 'ISSUED'),
        to_jsonb(v_inv)
    );

    RETURN jsonb_build_object(
        'success', true,
        'invoice', to_jsonb(v_inv)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. OFFLINE SYNC INVOICE RPC
CREATE OR REPLACE FUNCTION public.sync_offline_invoice(
    p_temp_number TEXT,
    p_document_type TEXT,
    p_customer JSONB,
    p_items JSONB,
    p_financials JSONB,
    p_payment_mode TEXT,
    p_payment_status TEXT,
    p_amount_paid NUMERIC,
    p_performed_by TEXT DEFAULT 'Offline Sync Engine'
)
RETURNS JSONB AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_fy_code TEXT;
    v_official_num TEXT;
    v_subtotal NUMERIC(10, 2);
    v_discount NUMERIC(10, 2);
    v_taxable NUMERIC(10, 2);
    v_tax NUMERIC(10, 2);
    v_total NUMERIC(10, 2);
    v_paid NUMERIC(10, 2);
    v_due NUMERIC(10, 2);
    v_biz_snapshot JSONB;
    v_result RECORD;
BEGIN
    v_fy_code := public.get_financial_year_code(v_now);
    v_official_num := public.generate_next_invoice_number(v_now);

    v_subtotal := ROUND(GREATEST(COALESCE((p_financials->>'subtotal')::NUMERIC, 0.00), 0.00), 2);
    v_discount := ROUND(GREATEST(COALESCE((p_financials->>'discount')::NUMERIC, 0.00), 0.00), 2);
    v_taxable := ROUND(GREATEST(COALESCE((p_financials->>'taxableAmount')::NUMERIC, (v_subtotal - v_discount)), 0.00), 2);
    v_tax := ROUND(GREATEST(COALESCE((p_financials->>'taxAmount')::NUMERIC, 0.00), 0.00), 2);
    v_total := ROUND(GREATEST(COALESCE((p_financials->>'grandTotal')::NUMERIC, (v_taxable + v_tax)), 0.00), 2);

    IF p_amount_paid IS NOT NULL THEN
        v_paid := ROUND(GREATEST(p_amount_paid, 0.00), 2);
    ELSIF p_payment_status IN ('paid', 'confirmed') THEN
        v_paid := v_total;
    ELSE
        v_paid := 0.00;
    END IF;

    v_due := ROUND(GREATEST(v_total - v_paid, 0.00), 2);

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

    INSERT INTO public.invoices (
        invoice_number,
        temporary_number,
        source,
        document_type,
        financial_year,
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
        created_by,
        notes
    ) VALUES (
        v_official_num,
        p_temp_number,
        'OFFLINE',
        p_document_type,
        v_fy_code,
        v_now,
        v_now,
        p_customer,
        v_biz_snapshot,
        p_items,
        v_subtotal,
        v_discount,
        v_taxable,
        v_tax,
        0.00,
        0.00,
        v_total,
        v_paid,
        v_due,
        p_payment_status,
        p_payment_mode,
        'ISSUED',
        p_performed_by,
        'Synced from offline bill ' || p_temp_number
    )
    RETURNING * INTO v_result;

    RETURN jsonb_build_object(
        'success', true,
        'temporaryNumber', p_temp_number,
        'officialInvoiceNumber', v_official_num,
        'invoice', to_jsonb(v_result)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RLS & GRANTS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_audit_logs ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Staff can view invoice audit logs" ON public.invoice_audit_logs;
CREATE POLICY "Staff can view invoice audit logs" ON public.invoice_audit_logs FOR SELECT USING (public.is_staff() = true);

GRANT EXECUTE ON FUNCTION public.get_financial_year_start(TIMESTAMPTZ) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_year_code(TIMESTAMPTZ) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_next_invoice_number(TIMESTAMPTZ) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_or_regenerate_invoice(TEXT, BOOLEAN, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_admin_bill(TEXT, TEXT, JSONB, JSONB, JSONB, TEXT, TEXT, NUMERIC, TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_invoice(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_offline_invoice(TEXT, TEXT, JSONB, JSONB, JSONB, TEXT, TEXT, NUMERIC, TEXT) TO anon, authenticated;
