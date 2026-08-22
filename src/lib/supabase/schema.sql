-- ==============================================================================
-- PALAK ENTERPRISES — SUPABASE DATABASE SCHEMA
-- Printing • Digital Services • Online Applications • Business Solutions
-- Location: Chakia, East Champaran, Bihar - 845412
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. CATEGORIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_hi TEXT NOT NULL,
    description_en TEXT,
    description_hi TEXT,
    icon_name TEXT NOT NULL DEFAULT 'Printer',
    category_type TEXT NOT NULL CHECK (category_type IN ('printing', 'digital', 'business', 'wedding', 'design')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 2. PRODUCTS TABLE (Physical & Printing Catalog)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name_en TEXT NOT NULL,
    name_hi TEXT NOT NULL,
    description_en TEXT NOT NULL,
    description_hi TEXT NOT NULL,
    short_desc_en TEXT,
    short_desc_hi TEXT,
    starting_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    min_quantity INTEGER NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'Pcs',
    image_url TEXT,
    gallery_urls TEXT[] DEFAULT '{}',
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_popular BOOLEAN NOT NULL DEFAULT false,
    is_new BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    turnaround_time TEXT DEFAULT '24-48 Hours',
    tags TEXT[] DEFAULT '{}',
    specifications JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 3. PRODUCT OPTIONS & VARIANTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name_en TEXT NOT NULL,
    name_hi TEXT NOT NULL,
    option_key TEXT NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.product_option_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    option_id UUID NOT NULL REFERENCES public.product_options(id) ON DELETE CASCADE,
    label_en TEXT NOT NULL,
    label_hi TEXT NOT NULL,
    value_key TEXT NOT NULL,
    price_modifier NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    price_multiplier NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
    is_default BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 4. DIGITAL & ONLINE SERVICES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name_en TEXT NOT NULL,
    name_hi TEXT NOT NULL,
    description_en TEXT NOT NULL,
    description_hi TEXT NOT NULL,
    short_desc_en TEXT,
    short_desc_hi TEXT,
    estimated_fee NUMERIC(10, 2) DEFAULT 0.00,
    processing_time_en TEXT NOT NULL DEFAULT '1-3 Working Days',
    processing_time_hi TEXT NOT NULL DEFAULT '1-3 कार्य दिवस',
    required_documents_en TEXT[] DEFAULT '{}',
    required_documents_hi TEXT[] DEFAULT '{}',
    who_needs_it_en TEXT,
    who_needs_it_hi TEXT,
    important_instructions_en TEXT,
    important_instructions_hi TEXT,
    official_portal_name TEXT,
    disclaimer_en TEXT,
    disclaimer_hi TEXT,
    icon_name TEXT NOT NULL DEFAULT 'FileCheck',
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_popular BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 5. CUSTOMER PROFILES & ADDRESSES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    business_name TEXT,
    gstin TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    landmark TEXT,
    city TEXT NOT NULL DEFAULT 'Chakia',
    district TEXT NOT NULL DEFAULT 'East Champaran',
    state TEXT NOT NULL DEFAULT 'Bihar',
    pincode TEXT NOT NULL DEFAULT '845412',
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 6. ORDERS & ORDER ITEMS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    fulfillment_type TEXT NOT NULL DEFAULT 'pickup' CHECK (fulfillment_type IN ('pickup', 'delivery')),
    delivery_address JSONB,
    order_notes TEXT,
    subtotal_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL DEFAULT 'pay_at_store' CHECK (payment_method IN ('pay_at_store', 'pay_after_confirmation', 'upi_online')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed', 'refunded')),
    order_status TEXT NOT NULL DEFAULT 'NEW' CHECK (order_status IN (
        'NEW', 'UNDER_REVIEW', 'PAYMENT_PENDING', 'CONFIRMED', 
        'DESIGN_REVIEW', 'IN_PRODUCTION', 'READY_FOR_PICKUP', 
        'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'
    )),
    staff_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    selected_options JSONB NOT NULL DEFAULT '{}',
    uploaded_file_url TEXT,
    uploaded_file_name TEXT,
    design_assistance_requested BOOLEAN NOT NULL DEFAULT false,
    design_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 7. SERVICE REQUESTS (Digital / Government / CSC)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_code TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    service_id TEXT NOT NULL REFERENCES public.services(id),
    service_name TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    preferred_contact TEXT NOT NULL DEFAULT 'whatsapp' CHECK (preferred_contact IN ('whatsapp', 'phone', 'email')),
    applicant_details JSONB DEFAULT '{}',
    uploaded_document_urls TEXT[] DEFAULT '{}',
    additional_notes TEXT,
    estimated_fee NUMERIC(10, 2) DEFAULT 0.00,
    request_status TEXT NOT NULL DEFAULT 'NEW' CHECK (request_status IN (
        'NEW', 'DOCUMENTS_VERIFIED', 'IN_PROCESSING', 'ACTION_REQUIRED', 
        'SUBMITTED_TO_PORTAL', 'COMPLETED', 'REJECTED'
    )),
    acknowledgement_number TEXT,
    staff_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 8. CUSTOM QUOTE REQUESTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quote_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_code TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    service_or_product_type TEXT NOT NULL,
    quantity TEXT NOT NULL,
    size_specifications TEXT,
    material_preferences TEXT,
    required_by_date DATE,
    design_status TEXT NOT NULL DEFAULT 'have_design' CHECK (design_status IN ('have_design', 'need_design', 'rough_idea')),
    reference_file_urls TEXT[] DEFAULT '{}',
    additional_details TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    business_name TEXT,
    quoted_amount NUMERIC(10, 2),
    quote_status TEXT NOT NULL DEFAULT 'NEW' CHECK (quote_status IN ('NEW', 'ESTIMATE_PREPARED', 'QUOTE_SENT', 'ACCEPTED', 'DECLINED', 'CONVERTED_TO_ORDER')),
    staff_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 9. DESIGN ASSISTANCE REQUESTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.design_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    design_code TEXT UNIQUE NOT NULL,
    user_id REFERENCES public.profiles(id) ON DELETE SET NULL,
    design_category TEXT NOT NULL,
    title_or_event TEXT NOT NULL,
    content_text TEXT NOT NULL,
    color_preferences TEXT,
    reference_file_urls TEXT[] DEFAULT '{}',
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    design_status TEXT NOT NULL DEFAULT 'NEW' CHECK (design_status IN ('NEW', 'IN_DESIGN', 'PROOF_SENT', 'REVISION_REQUESTED', 'APPROVED', 'SENT_TO_PRINT')),
    proof_file_url TEXT,
    staff_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 10. UNIVERSAL STATUS HISTORY & LOGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('order', 'service_request', 'quote_request', 'design_request')),
    entity_id UUID NOT NULL,
    entity_code TEXT NOT NULL,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    message_en TEXT NOT NULL,
    message_hi TEXT,
    performed_by TEXT NOT NULL DEFAULT 'System',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public categories are viewable by everyone" ON public.categories FOR SELECT USING (is_active = true);
CREATE POLICY "Public products are viewable by everyone" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Public product options are viewable by everyone" ON public.product_options FOR SELECT USING (true);
CREATE POLICY "Public product option values are viewable by everyone" ON public.product_option_values FOR SELECT USING (true);
CREATE POLICY "Public services are viewable by everyone" ON public.services FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own addresses" ON public.addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own addresses" ON public.addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own addresses" ON public.addresses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own addresses" ON public.addresses FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Anyone can create an order" ON public.orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Anyone can create order items" ON public.order_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own service requests" ON public.service_requests FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Anyone can create service requests" ON public.service_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own quote requests" ON public.quote_requests FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Anyone can create quote requests" ON public.quote_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own design requests" ON public.design_requests FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Anyone can create design requests" ON public.design_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view status history for tracking" ON public.order_status_history FOR SELECT USING (true);
CREATE POLICY "System/Staff can insert status history" ON public.order_status_history FOR INSERT WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 12. HIGH-PERFORMANCE DATABASE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders(order_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_created ON public.orders(payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_code ON public.orders(order_code);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status_created ON public.service_requests(request_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_code ON public.service_requests(request_code);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status_created ON public.quote_requests(quote_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_requests_code ON public.quote_requests(quote_code);
CREATE INDEX IF NOT EXISTS idx_design_requests_status_created ON public.design_requests(design_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_history_entity ON public.order_status_history(entity_code, created_at DESC);

-- ------------------------------------------------------------------------------
-- 13. INVOICES & VERIFICATION LEDGER
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL UNIQUE,
    financial_year TEXT NOT NULL DEFAULT '2026-27',
    sequence_number INT NOT NULL,
    document_type TEXT NOT NULL DEFAULT 'TAX_INVOICE',
    order_code TEXT,
    order_id UUID,
    customer_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    business_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    other_charges NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    amount_due NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT NOT NULL DEFAULT 'pay_at_store',
    status TEXT NOT NULL DEFAULT 'ISSUED',
    source TEXT NOT NULL DEFAULT 'ONLINE_STORE',
    cancellation_reason TEXT,
    invoice_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completion_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_order_code ON public.invoices(order_code);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);

-- Enable RLS on Invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view and manage all invoices" ON public.invoices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.staff_profiles
            WHERE staff_profiles.user_id = auth.uid()
               OR staff_profiles.email = auth.jwt() ->> 'email'
        )
    );

-- Authoritative Public Verification Function
CREATE OR REPLACE FUNCTION public.verify_invoice_authenticity(p_invoice_number TEXT)
RETURNS JSONB AS $$
DECLARE
    v_clean_num TEXT;
    v_is_uuid BOOLEAN;
    v_inv RECORD;
    v_status TEXT;
    v_is_cancelled BOOLEAN;
BEGIN
    v_clean_num := UPPER(TRIM(COALESCE(p_invoice_number, '')));

    IF v_clean_num = '' OR LENGTH(v_clean_num) > 64 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_INVOICE_IDENTIFIER');
    END IF;

    IF v_clean_num !~ '^[A-Z0-9\-_/]+$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_INVOICE_IDENTIFIER');
    END IF;

    IF v_clean_num LIKE 'TEMP-%' OR v_clean_num LIKE 'DRAFT-%' OR v_clean_num LIKE 'LOCAL-%' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_INVOICE_IDENTIFIER');
    END IF;

    v_is_uuid := (p_invoice_number ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

    IF v_is_uuid THEN
        SELECT * INTO v_inv
        FROM public.invoices
        WHERE UPPER(invoice_number) = v_clean_num
           OR id = p_invoice_number::UUID
        ORDER BY created_at DESC
        LIMIT 1;
    ELSE
        SELECT * INTO v_inv
        FROM public.invoices
        WHERE UPPER(invoice_number) = v_clean_num
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVOICE_NOT_FOUND');
    END IF;

    v_status := UPPER(COALESCE(v_inv.status, 'ISSUED'));
    v_is_cancelled := (v_status IN ('CANCELLED', 'VOID'));

    RETURN jsonb_build_object(
        'success', true,
        'isValid', (NOT v_is_cancelled),
        'isCancelled', v_is_cancelled,
        'invoiceNumber', v_inv.invoice_number,
        'invoiceDate', v_inv.invoice_date,
        'completionDate', v_inv.completion_date,
        'documentType', COALESCE(v_inv.document_type, 'TAX_INVOICE'),
        'financialYear', COALESCE(v_inv.financial_year, '2026-27'),
        'orderCode', v_inv.order_code,
        'source', COALESCE(v_inv.source, 'OFFICIAL'),
        'totalAmount', COALESCE(v_inv.total_amount, 0.00),
        'amountPaid', COALESCE(v_inv.amount_paid, 0.00),
        'amountDue', COALESCE(v_inv.amount_due, 0.00),
        'paymentStatus', COALESCE(v_inv.payment_status, 'pending'),
        'paymentMethod', COALESCE(v_inv.payment_method, 'pay_at_store'),
        'status', v_status,
        'businessName', 'Palak Enterprises',
        'itemCount', jsonb_array_length(COALESCE(v_inv.items, '[]'::jsonb)),
        'cancellationReason', v_inv.cancellation_reason,
        'verifiedAt', timezone('utc'::text, now())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.verify_invoice_authenticity(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_invoice_authenticity(TEXT) TO anon, authenticated;


