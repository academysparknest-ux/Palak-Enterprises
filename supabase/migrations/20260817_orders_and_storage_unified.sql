-- ==============================================================================
-- PALAK ENTERPRISES — UNIFIED ORDERS, PAYMENTS, STORAGE & RBAC MIGRATION
-- Migration: 20260817_orders_and_storage_unified.sql
-- ==============================================================================

-- 1. STORAGE BUCKET: customer-documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-documents', 'customer-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Allow public uploads to customer-documents" ON storage.objects;
CREATE POLICY "Allow public uploads to customer-documents"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'customer-documents');

DROP POLICY IF EXISTS "Allow public reads from customer-documents" ON storage.objects;
CREATE POLICY "Allow public reads from customer-documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'customer-documents');

DROP POLICY IF EXISTS "Allow public updates to customer-documents" ON storage.objects;
CREATE POLICY "Allow public updates to customer-documents"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'customer-documents');

DROP POLICY IF EXISTS "Allow public deletes to customer-documents" ON storage.objects;
CREATE POLICY "Allow public deletes to customer-documents"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'customer-documents');

-- 2. EXPAND ORDERS TABLE CONSTRAINTS
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS check_order_status;
ALTER TABLE public.orders ADD CONSTRAINT check_order_status CHECK (order_status IN (
    'NEW', 'PENDING', 'UNDER_REVIEW', 'QUOTE_SENT', 'PAYMENT_PENDING', 'CONFIRMED', 
    'DESIGN_REQUIRED', 'DESIGN_REVIEW', 'APPROVED', 'IN_PRODUCTION', 'PROCESSING',
    'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED', 'REJECTED'
));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS check_payment_status;
ALTER TABLE public.orders ADD CONSTRAINT check_payment_status CHECK (payment_status IN (
    'pending', 'paid', 'pay_at_shop', 'confirmed', 'failed', 'refunded', 'partially_paid'
));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS check_payment_method;
ALTER TABLE public.orders ADD CONSTRAINT check_payment_method CHECK (payment_method IN (
    'pay_online', 'pay_at_shop', 'pay_at_store', 'pay_after_confirmation', 'upi_online'
));

-- 3. ORDER FILES TABLE
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

-- 4. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'pay_at_shop', 'failed', 'refunded', 'partially_paid')),
    transaction_id TEXT,
    gateway_reference TEXT,
    received_by TEXT,
    notes TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. ENABLE RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

-- 6. PERMISSIVE YET SECURE POLICIES FOR ORDERS
DROP POLICY IF EXISTS "Allow select orders" ON public.orders;
CREATE POLICY "Allow select orders" ON public.orders
FOR SELECT USING (
    auth.uid() IS NULL 
    OR user_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('STAFF', 'MANAGER', 'ADMIN'))
);

DROP POLICY IF EXISTS "Allow insert orders" ON public.orders;
CREATE POLICY "Allow insert orders" ON public.orders
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update orders" ON public.orders;
CREATE POLICY "Allow update orders" ON public.orders
FOR UPDATE USING (
    auth.uid() IS NULL 
    OR user_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('STAFF', 'MANAGER', 'ADMIN'))
);

-- Policies for order_items
DROP POLICY IF EXISTS "Allow select order_items" ON public.order_items;
CREATE POLICY "Allow select order_items" ON public.order_items
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert order_items" ON public.order_items;
CREATE POLICY "Allow insert order_items" ON public.order_items
FOR INSERT WITH CHECK (true);

-- Policies for order_files
DROP POLICY IF EXISTS "Allow select order_files" ON public.order_files;
CREATE POLICY "Allow select order_files" ON public.order_files
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert order_files" ON public.order_files;
CREATE POLICY "Allow insert order_files" ON public.order_files
FOR INSERT WITH CHECK (true);

-- Policies for payments
DROP POLICY IF EXISTS "Allow select payments" ON public.payments;
CREATE POLICY "Allow select payments" ON public.payments
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert payments" ON public.payments;
CREATE POLICY "Allow insert payments" ON public.payments
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update payments" ON public.payments;
CREATE POLICY "Allow update payments" ON public.payments
FOR UPDATE USING (true);

-- Policies for status_history
DROP POLICY IF EXISTS "Allow select status_history" ON public.status_history;
CREATE POLICY "Allow select status_history" ON public.status_history
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert status_history" ON public.status_history;
CREATE POLICY "Allow insert status_history" ON public.status_history
FOR INSERT WITH CHECK (true);
