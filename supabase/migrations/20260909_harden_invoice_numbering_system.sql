-- 1. INDIAN FINANCIAL YEAR FUNCTION (Strictly in Indian Standard Time: 1 April – 31 March)
CREATE OR REPLACE FUNCTION public.get_financial_year_start(p_date TIMESTAMPTZ DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    v_ist_timestamp TIMESTAMP;
    v_year INTEGER;
    v_month INTEGER;
BEGIN
    -- Indian Financial Year is strictly evaluated in Indian Standard Time (UTC+5:30 / Asia/Kolkata)
    v_ist_timestamp := COALESCE(p_date, timezone('utc'::text, now())) AT TIME ZONE 'Asia/Kolkata';
    v_year := EXTRACT(YEAR FROM v_ist_timestamp)::INTEGER;
    v_month := EXTRACT(MONTH FROM v_ist_timestamp)::INTEGER;
    
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

-- 2. ENHANCE PUBLIC.INVOICE_COUNTERS
CREATE TABLE IF NOT EXISTS public.invoice_counters (
    year INTEGER PRIMARY KEY,
    last_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_invoice_counters_year'
    ) THEN
        ALTER TABLE public.invoice_counters
            ADD CONSTRAINT chk_invoice_counters_year CHECK (year >= 2020 AND year <= 2100);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_invoice_counters_last_num'
    ) THEN
        ALTER TABLE public.invoice_counters
            ADD CONSTRAINT chk_invoice_counters_last_num CHECK (last_number >= 0);
    END IF;
END $$;

-- 2. CREATE / ENHANCE PUBLIC.IDCARD_INVOICE_COUNTERS
CREATE TABLE IF NOT EXISTS public.idcard_invoice_counters (
    year INTEGER PRIMARY KEY CHECK (year >= 2020 AND year <= 2100),
    last_number INTEGER NOT NULL DEFAULT 0 CHECK (last_number >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.idcard_invoice_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff manage idcard invoice counters" ON public.idcard_invoice_counters;
CREATE POLICY "Staff manage idcard invoice counters" ON public.idcard_invoice_counters FOR ALL USING (public.is_staff() = true);

-- 3. ENHANCE PUBLIC.INVOICES SCHEMA FOR SEQUENCE STORAGE & IDEMPOTENCY
ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS sequence_number INTEGER,
    ADD COLUMN IF NOT EXISTS financial_year_start INTEGER,
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Safely backfill existing invoices
UPDATE public.invoices
SET 
    financial_year_start = COALESCE(
        financial_year_start, 
        public.get_financial_year_start(invoice_date)
    ),
    sequence_number = COALESCE(
        sequence_number,
        CASE 
            WHEN invoice_number ~ '^PE-[0-9]{4}-([0-9]+)$' THEN (regexp_match(invoice_number, '^PE-[0-9]{4}-([0-9]+)$'))[1]::INTEGER
            ELSE NULL
        END
    )
WHERE status = 'ISSUED' AND (sequence_number IS NULL OR financial_year_start IS NULL);

-- Constraints on public.invoices
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_invoices_sequence_num'
    ) THEN
        ALTER TABLE public.invoices
            ADD CONSTRAINT chk_invoices_sequence_num CHECK (sequence_number IS NULL OR sequence_number > 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_invoices_fy_start'
    ) THEN
        ALTER TABLE public.invoices
            ADD CONSTRAINT chk_invoices_fy_start CHECK (financial_year_start IS NULL OR (financial_year_start >= 2020 AND financial_year_start <= 2100));
    END IF;
END $$;

-- Unique partial indexes to enforce business invariants
-- Invariant A: In any single financial year, each sequence number is strictly unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_fy_seq_issued 
    ON public.invoices (financial_year_start, sequence_number) 
    WHERE sequence_number IS NOT NULL AND status IN ('ISSUED', 'CANCELLED');

-- Invariant B: Client idempotency key guarantees exactly-one invoice allocation
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_idempotency_key 
    ON public.invoices (idempotency_key) 
    WHERE idempotency_key IS NOT NULL AND idempotency_key <> '';

-- Invariant C: Offline temporary bill number can only be converted once
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_temporary_number_unique 
    ON public.invoices (temporary_number) 
    WHERE temporary_number IS NOT NULL AND temporary_number <> '';

-- Invariant D: Active order can have at most one issued invoice
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_order_id_unique_issued 
    ON public.invoices (order_id) 
    WHERE order_id IS NOT NULL AND status = 'ISSUED';

-- 4. ENSURE PUBLIC.IDCARD_INVOICES TABLE & CONSTRAINTS
CREATE TABLE IF NOT EXISTS public.idcard_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.idcard_projects(id) ON DELETE CASCADE,
    session_id UUID,
    invoice_number TEXT UNIQUE NOT NULL,
    sequence_number INTEGER,
    financial_year_start INTEGER,
    financial_year TEXT,
    invoice_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    customer_name TEXT NOT NULL DEFAULT 'Customer',
    customer_organization TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    customer_address TEXT,
    customer_gstin TEXT,
    pricing_snapshot_id UUID,
    line_items JSONB NOT NULL DEFAULT '[]',
    cards_generated INTEGER NOT NULL DEFAULT 0,
    cards_printed INTEGER NOT NULL DEFAULT 0,
    cards_reprinted INTEGER NOT NULL DEFAULT 0,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    taxable_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
    amount_due NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    status TEXT NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_by TEXT,
    cancelled_at TIMESTAMPTZ,
    cancelled_by TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.idcard_invoices
    ADD COLUMN IF NOT EXISTS sequence_number INTEGER,
    ADD COLUMN IF NOT EXISTS financial_year_start INTEGER,
    ADD COLUMN IF NOT EXISTS financial_year TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_idcard_invoices_fy_seq 
    ON public.idcard_invoices (financial_year_start, sequence_number) 
    WHERE sequence_number IS NOT NULL AND status IN ('issued', 'cancelled');

-- 5. ATOMIC SERIALIZED COUNTER ALLOCATION FUNCTIONS
-- Internal function for Tax Invoices
CREATE OR REPLACE FUNCTION public.allocate_next_invoice_number(
    p_fy_year INTEGER,
    OUT p_seq INTEGER,
    OUT p_formatted TEXT
)
RETURNS RECORD AS $$
DECLARE
    v_next_num INTEGER;
BEGIN
    IF p_fy_year IS NULL OR p_fy_year < 2020 OR p_fy_year > 2100 THEN
        RAISE EXCEPTION 'Invalid financial year: %', p_fy_year;
    END IF;

    -- Row-level serialization using INSERT ... ON CONFLICT DO UPDATE
    -- PostgreSQL serializes concurrent updates to the same row for (year)
    INSERT INTO public.invoice_counters (year, last_number, updated_at)
    VALUES (p_fy_year, 1, timezone('utc'::text, now()))
    ON CONFLICT (year) DO UPDATE
    SET last_number = public.invoice_counters.last_number + 1,
        updated_at = timezone('utc'::text, now())
    RETURNING last_number INTO v_next_num;

    p_seq := v_next_num;
    p_formatted := 'PE-' || p_fy_year::TEXT || '-' || LPAD(v_next_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Internal function for ID Card Invoices (Financial Year Aware)
CREATE OR REPLACE FUNCTION public.allocate_next_idcard_invoice_number(
    p_fy_year INTEGER,
    OUT p_seq INTEGER,
    OUT p_formatted TEXT
)
RETURNS RECORD AS $$
DECLARE
    v_next_num INTEGER;
BEGIN
    IF p_fy_year IS NULL OR p_fy_year < 2020 OR p_fy_year > 2100 THEN
        RAISE EXCEPTION 'Invalid financial year: %', p_fy_year;
    END IF;

    INSERT INTO public.idcard_invoice_counters (year, last_number, updated_at)
    VALUES (p_fy_year, 1, timezone('utc'::text, now()))
    ON CONFLICT (year) DO UPDATE
    SET last_number = public.idcard_invoice_counters.last_number + 1,
        updated_at = timezone('utc'::text, now())
    RETURNING last_number INTO v_next_num;

    p_seq := v_next_num;
    p_formatted := 'IDC-' || p_fy_year::TEXT || '-' || LPAD(v_next_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Canonical format wrapper for Tax Invoices
CREATE OR REPLACE FUNCTION public.generate_next_invoice_number(p_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    v_fy_year INTEGER;
    v_res RECORD;
BEGIN
    v_fy_year := public.get_financial_year_start(p_date);
    SELECT p_formatted INTO v_res FROM public.allocate_next_invoice_number(v_fy_year);
    RETURN v_res.p_formatted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Canonical format wrapper for ID Card Invoices (FINANCIAL YEAR AWARE)
CREATE OR REPLACE FUNCTION public.generate_idcard_invoice_number(p_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
    v_fy_year INTEGER;
    v_res RECORD;
BEGIN
    -- Uses Indian Financial Year Start Year (1 April - 31 March)
    v_fy_year := public.get_financial_year_start(COALESCE(p_date, timezone('utc'::text, now())));
    SELECT p_formatted INTO v_res FROM public.allocate_next_idcard_invoice_number(v_fy_year);
    RETURN v_res.p_formatted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. HARDEN CREATE_OR_REGENERATE_INVOICE WITH STRICT CONCURRENCY & IDEMPOTENCY
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
    v_sequence_number INTEGER;
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
    v_alloc RECORD;
    v_prev_snapshot JSONB;
    v_new_snapshot JSONB;
BEGIN
    IF v_clean_code = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_ORDER_CODE');
    END IF;

    -- Concurrency control: Advisory lock on order code
    PERFORM pg_advisory_xact_lock(hashtext('order_' || v_clean_code));

    -- 1. Concurrency control: Lock order row
    SELECT * INTO v_order 
    FROM public.orders 
    WHERE UPPER(order_code) = v_clean_code 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
    END IF;

    -- 2. Concurrency control & Idempotency: Check existing active invoice
    SELECT * INTO v_existing_invoice 
    FROM public.invoices 
    WHERE (UPPER(order_code) = v_clean_code OR (v_order.id IS NOT NULL AND order_id = v_order.id)) 
      AND status = 'ISSUED'
    FOR UPDATE;
    
    IF FOUND AND NOT p_force_regenerate THEN
        RETURN jsonb_build_object(
            'success', true,
            'isNew', false,
            'invoiceId', v_existing_invoice.id,
            'invoiceNumber', v_existing_invoice.invoice_number,
            'sequenceNumber', v_existing_invoice.sequence_number,
            'financialYear', v_existing_invoice.financial_year,
            'invoice', to_jsonb(v_existing_invoice)
        );
    END IF;

    v_fy_start := public.get_financial_year_start(v_now);
    v_fy_code := public.get_financial_year_code(v_now);

    -- 3. Calculations
    v_subtotal := ROUND(GREATEST(COALESCE(v_order.subtotal_amount, 0.00), 0.00), 2);
    v_discount := ROUND(GREATEST(COALESCE(v_order.discount_amount, 0.00), 0.00), 2);
    v_taxable := ROUND(GREATEST(v_subtotal - v_discount, 0.00), 2);
    v_tax := 0.00;
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

    -- 4. Snapshots
    v_cust_snapshot := jsonb_build_object(
        'name', COALESCE(v_order.customer_name, 'Valued Customer'),
        'phone', COALESCE(v_order.customer_phone, ''),
        'email', v_order.customer_email,
        'fulfillmentType', COALESCE(v_order.fulfillment_type, 'pickup'),
        'deliveryAddress', v_order.delivery_address,
        'orderNotes', v_order.order_notes
    );

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
        'addressLine', 'Near Block Gate',
        'landmark', 'Near Block Gate',
        'city', 'Chakia',
        'district', 'East Champaran',
        'state', 'Bihar',
        'pincode', '845412',
        'fullAddressEn', 'Near Block Gate, Chakia, East Champaran, Bihar',
        'fullAddressHi', 'ब्लॉक गेट के पास, चकिया, पूर्वी चंपारण, बिहार',
        'cscId', '634165120013',
        'udyamNo', 'UDYAM-BR-11-0061705',
        'gstin', '10AVUPP3470E1ZK',
        'logoUrl', '/logo.webp',
        'terms', jsonb_build_array(
            '1. This is a computer generated invoice and does not require physical signature.',
            '2. Goods/prints once inspected and delivered will not be returned.',
            '3. Online services fees are non-refundable once portal filing is initiated.',
            '4. Jurisdiction for disputes: Chakia / Motihari, East Champaran, Bihar.'
        )
    );

    v_items := COALESCE(v_order.items, '[]'::jsonb);

    -- 5. Atomic Action
    IF FOUND AND p_force_regenerate THEN
        -- Keep original invoice number and sequence number
        v_invoice_number := v_existing_invoice.invoice_number;
        v_sequence_number := v_existing_invoice.sequence_number;
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
        -- Atomic allocation inside transaction
        SELECT p_seq, p_formatted INTO v_alloc FROM public.allocate_next_invoice_number(v_fy_start);
        v_sequence_number := v_alloc.p_seq;
        v_invoice_number := v_alloc.p_formatted;
        
        INSERT INTO public.invoices (
            invoice_number,
            sequence_number,
            financial_year_start,
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
            v_sequence_number,
            v_fy_start,
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
        RETURNING * INTO v_result;

        v_target_invoice_id := v_result.id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'isNew', NOT (FOUND AND p_force_regenerate),
        'invoiceId', v_target_invoice_id,
        'invoiceNumber', v_invoice_number,
        'sequenceNumber', v_sequence_number,
        'financialYear', v_result.financial_year,
        'invoice', to_jsonb(v_result)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. HARDEN CREATE_ADMIN_BILL WITH IDEMPOTENCY & LOCKING
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
    p_draft_id UUID DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_fy_start INTEGER;
    v_fy_code TEXT;
    v_invoice_number TEXT;
    v_sequence_number INTEGER := NULL;
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
    v_draft RECORD;
    v_existing_idempotent RECORD;
    v_alloc RECORD;
    v_clean_idempotency_key TEXT := NULLIF(TRIM(p_idempotency_key), '');
BEGIN
    -- Check idempotency key first to prevent double-click / duplicate billing
    IF v_clean_idempotency_key IS NOT NULL THEN
        -- Advisory lock serializes parallel requests with identical idempotency keys
        PERFORM pg_advisory_xact_lock(hashtext('idemp_' || v_clean_idempotency_key));

        SELECT * INTO v_existing_idempotent
        FROM public.invoices
        WHERE idempotency_key = v_clean_idempotency_key;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', true,
                'isIdempotentReplay', true,
                'invoiceId', v_existing_idempotent.id,
                'invoiceNumber', v_existing_idempotent.invoice_number,
                'sequenceNumber', v_existing_idempotent.sequence_number,
                'status', v_existing_idempotent.status,
                'invoice', to_jsonb(v_existing_idempotent)
            );
        END IF;
    END IF;

    v_fy_start := public.get_financial_year_start(v_now);
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
        'addressLine', 'Near Block Gate',
        'landmark', 'Near Block Gate',
        'city', 'Chakia',
        'district', 'East Champaran',
        'state', 'Bihar',
        'pincode', '845412',
        'fullAddressEn', 'Near Block Gate, Chakia, East Champaran, Bihar',
        'fullAddressHi', 'ब्लॉक गेट के पास, चकिया, पूर्वी चंपारण, बिहार',
        'cscId', '634165120013',
        'udyamNo', 'UDYAM-BR-11-0061705',
        'gstin', '10AVUPP3470E1ZK',
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
                idempotency_key = v_clean_idempotency_key,
                updated_at = v_now
            WHERE id = p_draft_id AND status = 'DRAFT'
            RETURNING * INTO v_result;
        ELSE
            INSERT INTO public.invoices (
                invoice_number,
                source,
                document_type,
                financial_year,
                financial_year_start,
                sequence_number,
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
                notes,
                idempotency_key
            ) VALUES (
                v_invoice_number,
                'ADMIN',
                p_document_type,
                v_fy_code,
                v_fy_start,
                NULL,
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
                p_notes,
                v_clean_idempotency_key
            )
            RETURNING * INTO v_result;
        END IF;

    ELSE -- p_action = 'ISSUE'
        v_status := 'ISSUED';

        -- If draft_id is supplied, lock it and verify it has not already been issued
        IF p_draft_id IS NOT NULL THEN
            SELECT * INTO v_draft 
            FROM public.invoices 
            WHERE id = p_draft_id 
            FOR UPDATE;

            IF FOUND AND v_draft.status = 'ISSUED' THEN
                RETURN jsonb_build_object(
                    'success', true,
                    'isIdempotentReplay', true,
                    'invoiceId', v_draft.id,
                    'invoiceNumber', v_draft.invoice_number,
                    'sequenceNumber', v_draft.sequence_number,
                    'status', v_draft.status,
                    'invoice', to_jsonb(v_draft)
                );
            END IF;
        END IF;

        -- Allocate next official sequential number atomically
        SELECT p_seq, p_formatted INTO v_alloc FROM public.allocate_next_invoice_number(v_fy_start);
        v_sequence_number := v_alloc.p_seq;
        v_invoice_number := v_alloc.p_formatted;

        IF p_draft_id IS NOT NULL AND FOUND THEN
            UPDATE public.invoices SET
                invoice_number = v_invoice_number,
                sequence_number = v_sequence_number,
                financial_year_start = v_fy_start,
                financial_year = v_fy_code,
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
                idempotency_key = v_clean_idempotency_key,
                updated_at = v_now
            WHERE id = p_draft_id
            RETURNING * INTO v_result;
        ELSE
            BEGIN
                INSERT INTO public.invoices (
                    invoice_number,
                    sequence_number,
                    financial_year_start,
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
                    notes,
                    idempotency_key
                ) VALUES (
                    v_invoice_number,
                    v_sequence_number,
                    v_fy_start,
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
                    p_notes,
                    v_clean_idempotency_key
                )
                RETURNING * INTO v_result;
            EXCEPTION WHEN unique_violation THEN
                IF v_clean_idempotency_key IS NOT NULL THEN
                    SELECT * INTO v_result FROM public.invoices WHERE idempotency_key = v_clean_idempotency_key;
                    IF FOUND THEN
                        RETURN jsonb_build_object(
                            'success', true,
                            'isIdempotentReplay', true,
                            'invoiceId', v_result.id,
                            'invoiceNumber', v_result.invoice_number,
                            'sequenceNumber', v_result.sequence_number,
                            'status', v_result.status,
                            'invoice', to_jsonb(v_result)
                        );
                    END IF;
                END IF;
                RAISE;
            END;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'invoiceId', v_result.id,
        'invoiceNumber', v_result.invoice_number,
        'sequenceNumber', v_result.sequence_number,
        'status', v_result.status,
        'invoice', to_jsonb(v_result)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. HARDEN SYNC_OFFLINE_INVOICE WITH IDEMPOTENCY
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
    v_clean_temp TEXT := UPPER(TRIM(COALESCE(p_temp_number, '')));
    v_existing RECORD;
    v_fy_start INTEGER;
    v_fy_code TEXT;
    v_official_num TEXT;
    v_seq_num INTEGER;
    v_subtotal NUMERIC(10, 2);
    v_discount NUMERIC(10, 2);
    v_taxable NUMERIC(10, 2);
    v_tax NUMERIC(10, 2);
    v_total NUMERIC(10, 2);
    v_paid NUMERIC(10, 2);
    v_due NUMERIC(10, 2);
    v_biz_snapshot JSONB;
    v_alloc RECORD;
    v_result RECORD;
BEGIN
    IF v_clean_temp = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_TEMP_NUMBER');
    END IF;

    -- Concurrency control: Advisory lock on offline temporary number
    PERFORM pg_advisory_xact_lock(hashtext('temp_' || v_clean_temp));

    -- Check if offline invoice was already synced
    SELECT * INTO v_existing 
    FROM public.invoices 
    WHERE UPPER(temporary_number) = v_clean_temp;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'isIdempotentReplay', true,
            'temporaryNumber', v_clean_temp,
            'officialInvoiceNumber', v_existing.invoice_number,
            'sequenceNumber', v_existing.sequence_number,
            'invoice', to_jsonb(v_existing)
        );
    END IF;

    v_fy_start := public.get_financial_year_start(v_now);
    v_fy_code := public.get_financial_year_code(v_now);

    SELECT p_seq, p_formatted INTO v_alloc FROM public.allocate_next_invoice_number(v_fy_start);
    v_seq_num := v_alloc.p_seq;
    v_official_num := v_alloc.p_formatted;

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
        'addressLine', 'Near Block Gate',
        'landmark', 'Near Block Gate',
        'city', 'Chakia',
        'district', 'East Champaran',
        'state', 'Bihar',
        'pincode', '845412',
        'fullAddressEn', 'Near Block Gate, Chakia, East Champaran, Bihar',
        'fullAddressHi', 'ब्लॉक गेट के पास, चकिया, पूर्वी चंपारण, बिहार',
        'cscId', '634165120013',
        'udyamNo', 'UDYAM-BR-11-0061705',
        'gstin', '10AVUPP3470E1ZK',
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
        sequence_number,
        financial_year_start,
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
        v_seq_num,
        v_fy_start,
        v_clean_temp,
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
        'Synced from offline bill ' || v_clean_temp
    )
    RETURNING * INTO v_result;

    RETURN jsonb_build_object(
        'success', true,
        'temporaryNumber', v_clean_temp,
        'officialInvoiceNumber', v_official_num,
        'sequenceNumber', v_seq_num,
        'invoice', to_jsonb(v_result)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. CONTROLLED PRE-PRODUCTION RESET FUNCTION WITH STRICT SAFETY CONFIRMATION
CREATE OR REPLACE FUNCTION public.admin_reset_preproduction_invoices(
    p_confirmation_token TEXT,
    p_reset_counters BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
    v_deleted_count INTEGER := 0;
BEGIN
    -- Strict confirmation token check
    IF p_confirmation_token <> 'CONFIRM_RESET_ALL_INVOICE_COUNTERS_PRE_PRODUCTION' THEN
        RAISE EXCEPTION 'PERMISSION DENIED: Confirmation token does not match CONFIRM_RESET_ALL_INVOICE_COUNTERS_PRE_PRODUCTION.';
    END IF;

    -- Safety check: only staff or service_role can run this
    IF NOT public.is_staff() THEN
        RAISE EXCEPTION 'PERMISSION DENIED: Staff role required for pre-production reset.';
    END IF;

    -- Delete all invoices and audit logs in test environment
    DELETE FROM public.invoice_audit_logs;
    DELETE FROM public.invoices;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    IF p_reset_counters THEN
        -- Safely reset counters to 0 since all invoices were cleared
        UPDATE public.invoice_counters SET last_number = 0, updated_at = now();
        UPDATE public.idcard_invoice_counters SET last_number = 0, updated_at = now();
    END IF;

    -- Audit log the pre-production reset action
    INSERT INTO public.audit_logs (
        action_type,
        entity_type,
        actor_name,
        actor_role,
        details
    ) VALUES (
        'PRE_PRODUCTION_RESET',
        'invoices',
        'System Admin',
        'admin',
        jsonb_build_object(
            'deleted_invoices_count', v_deleted_count,
            'counters_reset', p_reset_counters,
            'timestamp', now()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'deletedInvoicesCount', v_deleted_count,
        'countersReset', p_reset_counters
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. PERMISSIONS & GRANTS
REVOKE EXECUTE ON FUNCTION public.allocate_next_invoice_number(INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.allocate_next_idcard_invoice_number(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_next_invoice_number(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_next_idcard_invoice_number(INTEGER) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_financial_year_start(TIMESTAMPTZ) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_year_code(TIMESTAMPTZ) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_next_invoice_number(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_idcard_invoice_number(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_or_regenerate_invoice(TEXT, BOOLEAN, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_admin_bill(TEXT, TEXT, JSONB, JSONB, JSONB, TEXT, TEXT, NUMERIC, TEXT, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_offline_invoice(TEXT, TEXT, JSONB, JSONB, JSONB, TEXT, TEXT, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_preproduction_invoices(TEXT, BOOLEAN) TO authenticated;
