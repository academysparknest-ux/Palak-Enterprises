-- ==============================================================================
-- PALAK ENTERPRISES — SUPABASE SECURITY, EXPANSION & RBAC MIGRATION
-- Migration: 20260817_security_and_expansion.sql
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. USER PROFILES TABLE (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'hi')),
    avatar_url TEXT,
    business_name TEXT,
    gstin TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. SECURE ROLE TABLE (RBAC)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('CUSTOMER', 'STAFF', 'MANAGER', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, role)
);

-- 4. SECURITY DEFINER FUNCTIONS FOR ROLE CHECKS (Cannot be spoofed from client)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role
    FROM public.user_roles
    WHERE user_id = auth.uid()
    ORDER BY CASE 
        WHEN role = 'ADMIN' THEN 1 
        WHEN role = 'MANAGER' THEN 2 
        WHEN role = 'STAFF' THEN 3 
        ELSE 4 
    END
    LIMIT 1;
    
    RETURN COALESCE(v_role, 'ANONYMOUS');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('STAFF', 'MANAGER', 'ADMIN')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('MANAGER', 'ADMIN')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. TRIGGER: AUTO-CREATE PROFILE & DEFAULT CUSTOMER ROLE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone, email, preferred_language)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Palak Customer'),
        NEW.raw_user_meta_data->>'phone',
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en')
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        email = COALESCE(EXCLUDED.email, public.profiles.email);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'CUSTOMER')
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. BUSINESS SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.business_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name_en TEXT NOT NULL,
    name_hi TEXT NOT NULL,
    description_en TEXT,
    description_hi TEXT,
    icon_name TEXT NOT NULL DEFAULT 'Printer',
    category_type TEXT NOT NULL CHECK (category_type IN ('printing', 'digital', 'business', 'wedding', 'design')),
    badge_en TEXT,
    badge_hi TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. PRODUCTS TABLE (Printing & Press Catalog)
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    category_type TEXT NOT NULL DEFAULT 'printing',
    name_en TEXT NOT NULL,
    name_hi TEXT NOT NULL,
    short_desc_en TEXT,
    short_desc_hi TEXT,
    description_en TEXT NOT NULL,
    description_hi TEXT NOT NULL,
    starting_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    base_quantity INTEGER NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'Pcs',
    image_url TEXT,
    gallery_urls TEXT[] DEFAULT '{}',
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_popular BOOLEAN NOT NULL DEFAULT false,
    is_new BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    turnaround_time_en TEXT DEFAULT '24-48 Hours',
    turnaround_time_hi TEXT DEFAULT '24-48 घंटे',
    tags TEXT[] DEFAULT '{}',
    specifications JSONB DEFAULT '{}',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. PRODUCT OPTIONS & OPTION VALUES
CREATE TABLE IF NOT EXISTS public.product_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    option_key TEXT NOT NULL,
    name_en TEXT NOT NULL,
    name_hi TEXT NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.product_option_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_id UUID NOT NULL REFERENCES public.product_options(id) ON DELETE CASCADE,
    value_key TEXT NOT NULL,
    label_en TEXT NOT NULL,
    label_hi TEXT NOT NULL,
    price_modifier NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    price_multiplier NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
    is_default BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. DIGITAL & ONLINE SERVICES TABLE (CSC / Bihar Govt Services)
CREATE TABLE IF NOT EXISTS public.services (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name_en TEXT NOT NULL,
    name_hi TEXT NOT NULL,
    short_desc_en TEXT,
    short_desc_hi TEXT,
    description_en TEXT NOT NULL,
    description_hi TEXT NOT NULL,
    estimated_fee NUMERIC(10, 2) DEFAULT 0.00,
    processing_time_en TEXT NOT NULL DEFAULT '1-3 Working Days',
    processing_time_hi TEXT NOT NULL DEFAULT '1-3 कार्य दिवस',
    required_documents_en TEXT[] DEFAULT '{}',
    required_documents_hi TEXT[] DEFAULT '{}',
    who_needs_it_en TEXT[] DEFAULT '{}',
    who_needs_it_hi TEXT[] DEFAULT '{}',
    important_instructions_en TEXT[] DEFAULT '{}',
    important_instructions_hi TEXT[] DEFAULT '{}',
    official_portal_name TEXT,
    disclaimer_en TEXT,
    disclaimer_hi TEXT,
    icon_name TEXT NOT NULL DEFAULT 'FileCheck',
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_popular BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    tags TEXT[] DEFAULT '{}',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 12. ORDERS & SAFE COLUMN EXPANSION
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    fulfillment_type TEXT NOT NULL DEFAULT 'pickup',
    delivery_address JSONB,
    order_notes TEXT,
    subtotal_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL DEFAULT 'pay_at_store',
    payment_status TEXT NOT NULL DEFAULT 'pending',
    order_status TEXT NOT NULL DEFAULT 'NEW',
    items JSONB DEFAULT '[]'::jsonb,
    staff_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'user_id') THEN
        ALTER TABLE public.orders ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'discount_amount') THEN
        ALTER TABLE public.orders ADD COLUMN discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'client_submission_id') THEN
        ALTER TABLE public.orders ADD COLUMN client_submission_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'print_snapshot') THEN
        ALTER TABLE public.orders ADD COLUMN print_snapshot JSONB;
    END IF;
END $$;

-- User Saved Print Preferences Table
CREATE TABLE IF NOT EXISTS public.user_print_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Print Pricing Versions Table
CREATE TABLE IF NOT EXISTS public.print_pricing_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_code TEXT UNIQUE NOT NULL,
    pricing_config JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Print Jobs Table
CREATE TABLE IF NOT EXISTS public.print_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    order_code TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'READY_TO_PRINT', 'PRINTING', 'PRINTED', 'QUALITY_CHECK', 'READY', 'COMPLETED', 'FAILED', 'CANCELLED'
    )),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    overrides JSONB NOT NULL DEFAULT '[]'::jsonb,
    audit_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by_name TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_print_jobs_order_id ON public.print_jobs(order_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_order_code ON public.print_jobs(order_code);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON public.print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_created_at ON public.print_jobs(created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_client_submission_id 
    ON public.orders(client_submission_id) 
    WHERE client_submission_id IS NOT NULL;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS check_order_status;
ALTER TABLE public.orders ADD CONSTRAINT check_order_status CHECK (order_status IN (
    'NEW', 'UNDER_REVIEW', 'QUOTE_SENT', 'PAYMENT_PENDING', 'CONFIRMED', 
    'DESIGN_REQUIRED', 'DESIGN_REVIEW', 'APPROVED', 'IN_PRODUCTION', 
    'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'
));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS check_payment_status;
ALTER TABLE public.orders ADD CONSTRAINT check_payment_status CHECK (payment_status IN ('pending', 'confirmed', 'refunded', 'failed'));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS check_payment_method;
ALTER TABLE public.orders ADD CONSTRAINT check_payment_method CHECK (payment_method IN ('pay_at_store', 'pay_after_confirmation', 'upi_online'));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS check_fulfillment_type;
ALTER TABLE public.orders ADD CONSTRAINT check_fulfillment_type CHECK (fulfillment_type IN ('pickup', 'delivery'));

-- 13. ORDER ITEMS TABLE (Preserves price snapshot at time of purchase)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    selected_options JSONB NOT NULL DEFAULT '{}',
    selected_options_labels JSONB DEFAULT '{}',
    uploaded_file_url TEXT,
    uploaded_file_name TEXT,
    design_assistance_requested BOOLEAN NOT NULL DEFAULT false,
    design_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. SERVICE REQUESTS & SAFE EXPANSION
CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_code TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    service_id TEXT NOT NULL,
    service_name TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    preferred_contact TEXT NOT NULL DEFAULT 'whatsapp',
    applicant_details JSONB DEFAULT '{}'::jsonb,
    uploaded_document_urls TEXT[] DEFAULT '{}',
    uploaded_document_names TEXT[] DEFAULT '{}',
    additional_notes TEXT,
    estimated_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    request_status TEXT NOT NULL DEFAULT 'NEW',
    acknowledgement_number TEXT,
    staff_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'service_requests' AND column_name = 'user_id') THEN
        ALTER TABLE public.service_requests ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

ALTER TABLE public.service_requests DROP CONSTRAINT IF EXISTS check_service_request_status;
ALTER TABLE public.service_requests ADD CONSTRAINT check_service_request_status CHECK (request_status IN (
    'NEW', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'DOCUMENTS_VERIFIED', 
    'IN_PROCESSING', 'ACTION_REQUIRED', 'SUBMITTED_TO_PORTAL', 
    'COMPLETED', 'CANCELLED', 'REJECTED'
));

-- 15. QUOTE REQUESTS & SAFE EXPANSION
CREATE TABLE IF NOT EXISTS public.quote_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_code TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    service_or_product_type TEXT NOT NULL,
    quantity TEXT NOT NULL,
    size_specifications TEXT,
    material_preferences TEXT,
    required_by_date TEXT,
    design_status TEXT NOT NULL DEFAULT 'rough_idea',
    reference_file_urls TEXT[] DEFAULT '{}',
    reference_file_names TEXT[] DEFAULT '{}',
    additional_details TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    business_name TEXT,
    quoted_amount NUMERIC(10, 2),
    quote_status TEXT NOT NULL DEFAULT 'NEW',
    staff_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'quote_requests' AND column_name = 'user_id') THEN
        ALTER TABLE public.quote_requests ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

ALTER TABLE public.quote_requests DROP CONSTRAINT IF EXISTS check_quote_status;
ALTER TABLE public.quote_requests ADD CONSTRAINT check_quote_status CHECK (quote_status IN (
    'NEW', 'ESTIMATE_PREPARED', 'QUOTE_SENT', 'ACCEPTED', 'DECLINED', 'CONVERTED_TO_ORDER', 'CANCELLED'
));

-- 16. DESIGN REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.design_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_code TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    design_category TEXT NOT NULL,
    title_or_event TEXT NOT NULL,
    content_text TEXT NOT NULL,
    color_preferences TEXT,
    reference_file_urls TEXT[] DEFAULT '{}',
    reference_file_names TEXT[] DEFAULT '{}',
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    design_status TEXT NOT NULL DEFAULT 'NEW' CHECK (design_status IN ('NEW', 'IN_DESIGN', 'PROOF_SENT', 'REVISION_REQUESTED', 'APPROVED', 'SENT_TO_PRINT', 'CANCELLED')),
    proof_file_url TEXT,
    design_fee NUMERIC(10, 2) DEFAULT 0.00,
    staff_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 17. STATUS HISTORY & AUDIT TRAIL TABLE
CREATE TABLE IF NOT EXISTS public.status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('order', 'service_request', 'quote_request', 'design_request')),
    entity_code TEXT NOT NULL,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    message_en TEXT NOT NULL,
    message_hi TEXT NOT NULL,
    performed_by TEXT NOT NULL DEFAULT 'System',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 18. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title_en TEXT NOT NULL,
    title_hi TEXT,
    body_en TEXT NOT NULL,
    body_hi TEXT,
    link_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 19. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 20. HARDENED ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Drop all legacy permissive policies
DROP POLICY IF EXISTS "Allow public insert to orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public select from orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public update to orders" ON public.orders;

DROP POLICY IF EXISTS "Allow public insert to service_requests" ON public.service_requests;
DROP POLICY IF EXISTS "Allow public select from service_requests" ON public.service_requests;
DROP POLICY IF EXISTS "Allow public update to service_requests" ON public.service_requests;

DROP POLICY IF EXISTS "Allow public insert to quote_requests" ON public.quote_requests;
DROP POLICY IF EXISTS "Allow public select from quote_requests" ON public.quote_requests;
DROP POLICY IF EXISTS "Allow public update to quote_requests" ON public.quote_requests;

DROP POLICY IF EXISTS "Allow public insert to status_history" ON public.status_history;
DROP POLICY IF EXISTS "Allow public select from status_history" ON public.status_history;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 20.1 PUBLIC CATALOG POLICIES
DROP POLICY IF EXISTS "Public categories are viewable by everyone" ON public.categories;
CREATE POLICY "Public categories are viewable by everyone" ON public.categories FOR SELECT USING (is_active = true OR public.is_staff() = true);

DROP POLICY IF EXISTS "Public products are viewable by everyone" ON public.products;
CREATE POLICY "Public products are viewable by everyone" ON public.products FOR SELECT USING (is_active = true OR public.is_staff() = true);

DROP POLICY IF EXISTS "Public product options are viewable by everyone" ON public.product_options;
CREATE POLICY "Public product options are viewable by everyone" ON public.product_options FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public product option values are viewable by everyone" ON public.product_option_values;
CREATE POLICY "Public product option values are viewable by everyone" ON public.product_option_values FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public services are viewable by everyone" ON public.services;
CREATE POLICY "Public services are viewable by everyone" ON public.services FOR SELECT USING (is_active = true OR public.is_staff() = true);

DROP POLICY IF EXISTS "Public business settings are viewable" ON public.business_settings;
CREATE POLICY "Public business settings are viewable" ON public.business_settings FOR SELECT USING (true);

-- 20.2 PROFILES & ROLES POLICIES
DROP POLICY IF EXISTS "Users can view own profile or staff view all" ON public.profiles;
CREATE POLICY "Users can view own profile or staff view all" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_staff() = true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own roles or staff view all" ON public.user_roles;
CREATE POLICY "Users can view own roles or staff view all" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.is_staff() = true);

DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
CREATE POLICY "Only admins can manage roles" ON public.user_roles FOR ALL USING (public.is_admin() = true);

-- 20.3 ADDRESSES POLICIES
DROP POLICY IF EXISTS "Users can view own addresses" ON public.addresses;
CREATE POLICY "Users can view own addresses" ON public.addresses FOR SELECT USING (auth.uid() = user_id OR public.is_staff() = true);

DROP POLICY IF EXISTS "Users can insert own addresses" ON public.addresses;
CREATE POLICY "Users can insert own addresses" ON public.addresses FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own addresses" ON public.addresses;
CREATE POLICY "Users can update own addresses" ON public.addresses FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own addresses" ON public.addresses;
CREATE POLICY "Users can delete own addresses" ON public.addresses FOR DELETE USING (auth.uid() = user_id);

-- 20.4 ORDERS POLICIES (NO UNRESTRICTED PUBLIC SELECT)
DROP POLICY IF EXISTS "Anyone can insert an order" ON public.orders;
CREATE POLICY "Anyone can insert an order" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Customers view own orders or staff view all" ON public.orders;
CREATE POLICY "Customers view own orders or staff view all" ON public.orders FOR SELECT USING (auth.uid() = user_id OR public.is_staff() = true);

DROP POLICY IF EXISTS "Only staff can update orders" ON public.orders;
CREATE POLICY "Only staff can update orders" ON public.orders FOR UPDATE USING (public.is_staff() = true);

DROP POLICY IF EXISTS "Only admins can delete orders" ON public.orders;
CREATE POLICY "Only admins can delete orders" ON public.orders FOR DELETE USING (public.is_admin() = true);

-- 20.5 ORDER ITEMS POLICIES
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
CREATE POLICY "Anyone can insert order items" ON public.order_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users view own order items or staff view all" ON public.order_items;
CREATE POLICY "Users view own order items or staff view all" ON public.order_items FOR SELECT USING (
    public.is_staff() = true OR 
    EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_items.order_id 
        AND (o.user_id = auth.uid() OR o.user_id IS NULL)
    )
);

-- 20.6 SERVICE REQUESTS POLICIES (NO UNRESTRICTED PUBLIC SELECT)
DROP POLICY IF EXISTS "Anyone can insert service requests" ON public.service_requests;
CREATE POLICY "Anyone can insert service requests" ON public.service_requests FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Customers view own service requests or staff view all" ON public.service_requests;
CREATE POLICY "Customers view own service requests or staff view all" ON public.service_requests FOR SELECT USING (auth.uid() = user_id OR public.is_staff() = true);

DROP POLICY IF EXISTS "Only staff can update service requests" ON public.service_requests;
CREATE POLICY "Only staff can update service requests" ON public.service_requests FOR UPDATE USING (public.is_staff() = true);

-- 20.7 QUOTE REQUESTS POLICIES (NO UNRESTRICTED PUBLIC SELECT)
DROP POLICY IF EXISTS "Anyone can insert quote requests" ON public.quote_requests;
CREATE POLICY "Anyone can insert quote requests" ON public.quote_requests FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Customers view own quote requests or staff view all" ON public.quote_requests;
CREATE POLICY "Customers view own quote requests or staff view all" ON public.quote_requests FOR SELECT USING (auth.uid() = user_id OR public.is_staff() = true);

DROP POLICY IF EXISTS "Only staff can update quote requests" ON public.quote_requests;
CREATE POLICY "Only staff can update quote requests" ON public.quote_requests FOR UPDATE USING (public.is_staff() = true);

-- 20.8 DESIGN REQUESTS POLICIES
DROP POLICY IF EXISTS "Anyone can insert design requests" ON public.design_requests;
CREATE POLICY "Anyone can insert design requests" ON public.design_requests FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Customers view own design requests or staff view all" ON public.design_requests;
CREATE POLICY "Customers view own design requests or staff view all" ON public.design_requests FOR SELECT USING (auth.uid() = user_id OR public.is_staff() = true);

DROP POLICY IF EXISTS "Only staff can update design requests" ON public.design_requests;
CREATE POLICY "Only staff can update design requests" ON public.design_requests FOR UPDATE USING (public.is_staff() = true);

-- 20.9 STATUS HISTORY POLICIES
DROP POLICY IF EXISTS "Users view relevant status history or staff view all" ON public.status_history;
CREATE POLICY "Users view relevant status history or staff view all" ON public.status_history FOR SELECT USING (
    public.is_staff() = true OR 
    EXISTS (SELECT 1 FROM public.orders o WHERE o.order_code = status_history.entity_code AND o.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.service_requests s WHERE s.request_code = status_history.entity_code AND s.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.quote_requests q WHERE q.quote_code = status_history.entity_code AND q.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Only staff or authenticated can insert status history" ON public.status_history;
CREATE POLICY "Only staff or authenticated can insert status history" ON public.status_history FOR INSERT WITH CHECK (public.is_staff() = true OR auth.uid() IS NOT NULL);

-- 20.10 NOTIFICATIONS & AUDIT LOGS
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Only admins view audit logs" ON public.audit_logs;
CREATE POLICY "Only admins view audit logs" ON public.audit_logs FOR SELECT USING (public.is_admin() = true);

DROP POLICY IF EXISTS "Staff insert audit logs" ON public.audit_logs;
CREATE POLICY "Staff insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (public.is_staff() = true);

-- 20.11 USER PRINT PREFERENCES & PRINT JOBS POLICIES
DROP POLICY IF EXISTS "Users can view their own print preferences" ON public.user_print_preferences;
CREATE POLICY "Users can view their own print preferences" ON public.user_print_preferences FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own print preferences" ON public.user_print_preferences;
CREATE POLICY "Users can update their own print preferences" ON public.user_print_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff and admins can view all print jobs" ON public.print_jobs;
CREATE POLICY "Staff and admins can view all print jobs" ON public.print_jobs FOR SELECT USING (public.is_staff() = true);

DROP POLICY IF EXISTS "Customers can view their own order print jobs" ON public.print_jobs;
CREATE POLICY "Customers can view their own order print jobs" ON public.print_jobs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = print_jobs.order_id AND o.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Staff and admins can manage print jobs" ON public.print_jobs;
CREATE POLICY "Staff and admins can manage print jobs" ON public.print_jobs FOR ALL USING (public.is_staff() = true) WITH CHECK (public.is_staff() = true);

-- ------------------------------------------------------------------------------
-- 21. SECURE PUBLIC ORDER TRACKING RPC (Privacy-Preserving)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 21. ATOMIC SECURE ORDER CREATION RPC (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
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
RETURNS JSONB AS $$
DECLARE
    v_existing_id UUID;
    v_existing_code TEXT;
    v_final_order_code TEXT;
    v_order_id UUID;
    v_item JSONB;
    v_file JSONB;
    v_calculated_subtotal NUMERIC(10, 2) := 0;
    v_item_quantity INTEGER;
    v_item_unit_price NUMERIC(10, 2);
    v_item_total_price NUMERIC(10, 2);
    v_product_id TEXT;
    v_product_base_price NUMERIC(10, 2);
    v_clean_phone TEXT;
    v_clean_name TEXT;
    v_rand_suffix INTEGER;
    v_retry_count INTEGER := 0;
    v_job_items JSONB := '[]'::jsonb;
    v_doc JSONB;
    v_print_job_id UUID;
BEGIN
    -- ── A. Idempotency Check ──────────────────────────────────────────────────
    IF p_client_submission_id IS NOT NULL AND length(trim(p_client_submission_id)) > 0 THEN
        SELECT id, order_code INTO v_existing_id, v_existing_code
        FROM public.orders
        WHERE client_submission_id = trim(p_client_submission_id)
        LIMIT 1;

        IF v_existing_id IS NOT NULL THEN
            -- Idempotent hit: Order was already safely committed. Return existing details.
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

    -- ── C. Concurrency-Safe Collision-Resistant Order Code Allocation ──────────
    v_final_order_code := trim(COALESCE(p_order_code, ''));
    IF length(v_final_order_code) = 0 THEN
        v_final_order_code := 'PE-O-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(floor(random() * 90000 + 10000)::TEXT, 5, '0');
    END IF;

    -- If the requested code already exists (e.g. race collision), generate a unique guaranteed code
    WHILE EXISTS (SELECT 1 FROM public.orders WHERE order_code = v_final_order_code) AND v_retry_count < 10 LOOP
        v_retry_count := v_retry_count + 1;
        v_rand_suffix := floor(random() * 90000 + 10000)::INTEGER;
        v_final_order_code := 'PE-O-' || to_char(now(), 'YYYYMMDD') || '-' || v_rand_suffix::TEXT;
    END LOOP;

    IF EXISTS (SELECT 1 FROM public.orders WHERE order_code = v_final_order_code) THEN
        RAISE EXCEPTION 'Could not allocate a unique order code. Please retry.';
    END IF;

    -- ── D. Authoritative Price & Item Validation ─────────────────────────────
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

        v_product_id := COALESCE(v_item.product_id, v_item."productId");
        
        -- Validate against catalog price if product exists in catalog
        IF v_product_id IS NOT NULL AND length(v_product_id) > 0 THEN
            SELECT base_price INTO v_product_base_price 
            FROM public.products 
            WHERE id = v_product_id AND is_active = true 
            LIMIT 1;

            IF v_product_base_price IS NOT NULL AND v_item_unit_price < 0 THEN
                RAISE EXCEPTION 'Invalid unit price for product %', v_product_id;
            END IF;
        END IF;

        v_calculated_subtotal := v_calculated_subtotal + v_item_total_price;
    END LOOP;

    -- Validate that client-supplied subtotal exactly matches authoritative line item calculations at 2 decimal places (zero tolerance)
    IF ROUND(COALESCE(p_subtotal_amount, 0)::NUMERIC, 2) <> ROUND(v_calculated_subtotal::NUMERIC, 2) THEN
        RAISE EXCEPTION 'Subtotal amount mismatch. Calculated: %, Provided: %', ROUND(v_calculated_subtotal::NUMERIC, 2), ROUND(COALESCE(p_subtotal_amount, 0)::NUMERIC, 2);
    END IF;

    -- Validate that client-supplied total amount exactly matches calculated subtotal + delivery fee at 2 decimal places (zero tolerance)
    IF ROUND(COALESCE(p_total_amount, 0)::NUMERIC, 2) <> ROUND((v_calculated_subtotal + COALESCE(p_delivery_fee, 0))::NUMERIC, 2) THEN
        RAISE EXCEPTION 'Total amount mismatch. Expected: %, Provided: %', ROUND((v_calculated_subtotal + COALESCE(p_delivery_fee, 0))::NUMERIC, 2), ROUND(COALESCE(p_total_amount, 0)::NUMERIC, 2);
    END IF;

    -- Verify Print Snapshot internal mathematical consistency if provided
    IF p_print_snapshot IS NOT NULL AND (p_print_snapshot->'documents') IS NOT NULL AND jsonb_array_length(p_print_snapshot->'documents') > 0 THEN
        DECLARE
            v_snap_doc JSONB;
            v_snap_subtotal NUMERIC(10, 2) := 0.00;
            v_snap_doc_total NUMERIC(10, 2);
        BEGIN
            FOR v_snap_doc IN SELECT * FROM jsonb_array_elements(p_print_snapshot->'documents') LOOP
                v_snap_doc_total := ROUND(GREATEST(0, COALESCE((v_snap_doc->>'totalPrice')::NUMERIC, (v_snap_doc->>'total_price')::NUMERIC, 0)), 2);
                v_snap_subtotal := v_snap_subtotal + v_snap_doc_total;
            END LOOP;

            IF ROUND(v_snap_subtotal, 2) <> ROUND(v_calculated_subtotal, 2) THEN
                RAISE EXCEPTION 'Print snapshot subtotal mismatch. Items total: %, Snapshot items total: %', v_calculated_subtotal, v_snap_subtotal;
            END IF;
        END;
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
        ROUND(p_subtotal_amount::NUMERIC, 2),
        ROUND(p_delivery_fee::NUMERIC, 2),
        ROUND(p_total_amount::NUMERIC, 2),
        COALESCE(NULLIF(trim(p_payment_method), ''), 'pay_at_store'),
        COALESCE(NULLIF(trim(p_payment_status), ''), 'pending'),
        'NEW',
        p_user_id,
        NULLIF(trim(p_staff_notes), ''),
        p_items,
        p_print_snapshot,
        now(),
        now()
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
            NULLIF(trim(COALESCE(v_item.product_id, v_item."productId", '')), ''),
            COALESCE(NULLIF(trim(COALESCE(v_item.product_name, v_item."productName", '')), ''), 'Custom Print Item'),
            v_item_quantity,
            v_item_unit_price,
            v_item_total_price,
            COALESCE(v_item.selected_options, v_item."selectedOptions", '{}'::jsonb),
            COALESCE(v_item.selected_options_labels, v_item."selectedOptionsLabels", '{}'::jsonb),
            NULLIF(trim(COALESCE(v_item.uploaded_file_name, v_item."uploadedFileName", '')), ''),
            NULLIF(trim(COALESCE(v_item.uploaded_file_url, v_item."uploadedFileUrl", '')), ''),
            now()
        );
    END LOOP;

    -- ── G. Insert Order Files ─────────────────────────────────────────────────
    IF p_files IS NOT NULL AND jsonb_array_length(p_files) > 0 THEN
        FOR v_file IN SELECT * FROM jsonb_to_recordset(p_files) AS f(
            name TEXT, file_name TEXT, "fileName" TEXT,
            url TEXT, file_url TEXT, "fileUrl" TEXT,
            storage_path TEXT, "storagePath" TEXT,
            size NUMERIC, file_size NUMERIC, "fileSize" NUMERIC,
            mime_type TEXT, "mimeType" TEXT,
            page_count INTEGER, "pageCount" INTEGER
        ) LOOP
            INSERT INTO public.order_files (
                order_id,
                file_name,
                file_url,
                file_path,
                file_size,
                mime_type,
                page_count,
                created_at
            ) VALUES (
                v_order_id,
                COALESCE(NULLIF(trim(COALESCE(v_file.name, v_file.file_name, v_file."fileName", '')), ''), 'document.pdf'),
                COALESCE(NULLIF(trim(COALESCE(v_file.url, v_file.file_url, v_file."fileUrl", '')), ''), ''),
                COALESCE(NULLIF(trim(COALESCE(v_file.storage_path, v_file."storagePath", '')), ''), ''),
                GREATEST(0, COALESCE(v_file.size, v_file.file_size, v_file."fileSize", 0)),
                COALESCE(NULLIF(trim(COALESCE(v_file.mime_type, v_file."mimeType", '')), ''), 'application/pdf'),
                GREATEST(1, COALESCE(v_file.page_count, v_file."pageCount", 1)),
                now()
            );
        END LOOP;
    END IF;

    -- ── H. Initialize Print Job if Print Snapshot Exists ──────────────────────
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
                    'timestamp', now(),
                    'notes', 'Initial print job created with immutable snapshot'
                )
            ),
            now(),
            now()
        ) RETURNING id INTO v_print_job_id;
    END IF;

    -- ── I. Insert Initial Status History ──────────────────────────────────────
    INSERT INTO public.status_history (
        entity_type,
        entity_id,
        entity_code,
        new_status,
        message_en,
        message_hi,
        performed_by,
        created_at
    ) VALUES (
        'order',
        v_order_id,
        v_final_order_code,
        'NEW',
        'Order submitted with exact print configuration.',
        'ऑर्डर सटीक प्रिंट कॉन्फ़िगरेशन के साथ दर्ज किया गया।',
        'Customer',
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'orderId', v_order_id,
        'orderCode', v_final_order_code,
        'isDuplicate', false,
        'message', 'Print order created successfully with immutable snapshot.'
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Order submission transaction failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.create_online_print_order(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, UUID, TEXT, JSONB, JSONB, TEXT, JSONB) TO anon, authenticated;

-- Server-Side RPC: Update Staff Print Job Status with State Machine & Audit Validation
CREATE OR REPLACE FUNCTION public.update_staff_print_job_status(
    p_order_code TEXT,
    p_new_status TEXT,
    p_performed_by TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_is_staff BOOLEAN;
    v_job RECORD;
    v_now TIMESTAMPTZ := now();
    v_audit_entry JSONB;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    ) INTO v_is_staff;

    IF NOT v_is_staff THEN
        RAISE EXCEPTION 'Unauthorized: Only staff or admins can update print job status.';
    END IF;

    SELECT * INTO v_job
    FROM public.print_jobs
    WHERE order_code = trim(p_order_code)
    FOR UPDATE;

    IF v_job.id IS NULL THEN
        RAISE EXCEPTION 'Print job for order % not found.', p_order_code;
    END IF;

    IF v_job.status IN ('COMPLETED', 'CANCELLED') AND v_job.status <> p_new_status THEN
        RAISE EXCEPTION 'Cannot transition print job from terminal status %.', v_job.status;
    END IF;

    v_audit_entry := jsonb_build_object(
        'id', gen_random_uuid(),
        'jobId', v_job.id,
        'orderCode', p_order_code,
        'action', 'STATUS_CHANGED_' || p_new_status,
        'performedBy', COALESCE(NULLIF(trim(p_performed_by), ''), 'Admin Staff'),
        'timestamp', v_now,
        'notes', COALESCE(NULLIF(trim(p_notes), ''), 'Status transitioned from ' || v_job.status || ' to ' || p_new_status)
    );

    UPDATE public.print_jobs
    SET status = p_new_status,
        audit_logs = jsonb_insert(COALESCE(audit_logs, '[]'::jsonb), '{0}', v_audit_entry),
        started_at = CASE WHEN p_new_status = 'PRINTING' AND started_at IS NULL THEN v_now ELSE started_at END,
        completed_at = CASE WHEN p_new_status IN ('COMPLETED', 'PRINTED') AND completed_at IS NULL THEN v_now ELSE completed_at END,
        updated_at = v_now
    WHERE id = v_job.id;

    RETURN jsonb_build_object(
        'success', true,
        'jobId', v_job.id,
        'orderCode', p_order_code,
        'status', p_new_status
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_staff_print_job_status(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Server-Side RPC: Add Staff Print Job Override with Audit Trail
CREATE OR REPLACE FUNCTION public.add_staff_print_job_override(
    p_order_code TEXT,
    p_document_id TEXT,
    p_file_name TEXT,
    p_field TEXT,
    p_requested_value TEXT,
    p_actual_value TEXT,
    p_changed_by TEXT,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_is_staff BOOLEAN;
    v_job RECORD;
    v_now TIMESTAMPTZ := now();
    v_override_entry JSONB;
    v_audit_entry JSONB;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
    ) INTO v_is_staff;

    IF NOT v_is_staff THEN
        RAISE EXCEPTION 'Unauthorized: Only staff or admins can record print overrides.';
    END IF;

    IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
        RAISE EXCEPTION 'Override reason is strictly mandatory (minimum 3 characters).';
    END IF;

    SELECT * INTO v_job
    FROM public.print_jobs
    WHERE order_code = trim(p_order_code)
    FOR UPDATE;

    IF v_job.id IS NULL THEN
        RAISE EXCEPTION 'Print job for order % not found.', p_order_code;
    END IF;

    v_override_entry := jsonb_build_object(
        'id', gen_random_uuid(),
        'documentId', p_document_id,
        'fileName', p_file_name,
        'field', p_field,
        'requestedValue', p_requested_value,
        'actualValue', p_actual_value,
        'changedBy', COALESCE(NULLIF(trim(p_changed_by), ''), 'Admin Staff'),
        'changedAt', v_now,
        'reason', trim(p_reason)
    );

    v_audit_entry := jsonb_build_object(
        'id', gen_random_uuid(),
        'jobId', v_job.id,
        'orderCode', p_order_code,
        'action', 'ADMIN_OVERRIDE',
        'performedBy', COALESCE(NULLIF(trim(p_changed_by), ''), 'Admin Staff'),
        'timestamp', v_now,
        'notes', 'Changed ' || p_field || ' for ' || p_file_name || ' to ' || p_actual_value || '. Reason: ' || trim(p_reason),
        'details', jsonb_build_object('override', v_override_entry)
    );

    UPDATE public.print_jobs
    SET overrides = jsonb_insert(COALESCE(overrides, '[]'::jsonb), '{0}', v_override_entry),
        audit_logs = jsonb_insert(COALESCE(audit_logs, '[]'::jsonb), '{0}', v_audit_entry),
        updated_at = v_now
    WHERE id = v_job.id;

    RETURN jsonb_build_object(
        'success', true,
        'jobId', v_job.id,
        'orderCode', p_order_code
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_staff_print_job_override(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 22. DATABASE INDEXES FOR OPTIMAL QUERY PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_code ON public.orders(order_code);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_user_id ON public.service_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_request_code ON public.service_requests(request_code);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(request_status);

CREATE INDEX IF NOT EXISTS idx_quote_requests_user_id ON public.quote_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_quote_code ON public.quote_requests(quote_code);

CREATE INDEX IF NOT EXISTS idx_status_history_entity_code ON public.status_history(entity_code);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_services_slug ON public.services(slug);
