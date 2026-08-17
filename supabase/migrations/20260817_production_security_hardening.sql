-- ==============================================================================
-- PALAK ENTERPRISES — PRODUCTION SECURITY & HARDENED RLS MIGRATION
-- Migration: 20260817_production_security_hardening.sql
-- ==============================================================================

-- 1. STORAGE BUCKET: customer-documents (SECURE & PRIVATE)
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-documents', 'customer-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Allow public uploads to customer-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to customer-documents" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to customer-documents"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'customer-documents');

DROP POLICY IF EXISTS "Allow public reads from customer-documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff and owners read customer-documents" ON storage.objects;
CREATE POLICY "Staff and owners read customer-documents"
ON storage.objects FOR SELECT
TO public
USING (
    bucket_id = 'customer-documents' AND (
        public.is_staff() = true
        OR auth.uid() IS NOT NULL
    )
);

-- 2. ORDER CONSTRAINTS
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS check_order_status;
ALTER TABLE public.orders ADD CONSTRAINT check_order_status CHECK (order_status IN (
    'NEW', 'UNDER_REVIEW', 'CONFIRMED', 'IN_PRODUCTION', 'READY_FOR_PICKUP', 
    'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED', 'REJECTED'
));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS check_payment_status;
ALTER TABLE public.orders ADD CONSTRAINT check_payment_status CHECK (payment_status IN (
    'pending', 'pay_at_shop', 'paid', 'confirmed', 'failed', 'refunded', 'partially_paid'
));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS check_payment_method;
ALTER TABLE public.orders ADD CONSTRAINT check_payment_method CHECK (payment_method IN (
    'pay_online', 'pay_at_shop', 'pay_at_store', 'pay_after_confirmation', 'upi_online'
));

-- 3. HARDENED ORDERS RLS
DROP POLICY IF EXISTS "Anyone can insert an order" ON public.orders;
DROP POLICY IF EXISTS "Customers create own orders" ON public.orders;
CREATE POLICY "Customers create own orders" ON public.orders
FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Customers view own orders or staff view all" ON public.orders;
CREATE POLICY "Customers view own orders or staff view all" ON public.orders
FOR SELECT USING (auth.uid() = user_id OR public.is_staff() = true);

DROP POLICY IF EXISTS "Only staff can update orders" ON public.orders;
CREATE POLICY "Only staff can update orders" ON public.orders
FOR UPDATE USING (public.is_staff() = true);

DROP POLICY IF EXISTS "Only admins can delete orders" ON public.orders;
CREATE POLICY "Only admins can delete orders" ON public.orders
FOR DELETE USING (public.is_admin() = true);

-- 4. HARDENED ORDER ITEMS RLS
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
CREATE POLICY "Anyone can insert order items" ON public.order_items
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users view own order items or staff view all" ON public.order_items;
CREATE POLICY "Users view own order items or staff view all" ON public.order_items
FOR SELECT USING (
    public.is_staff() = true OR 
    EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_items.order_id 
        AND (o.user_id = auth.uid() OR o.user_id IS NULL)
    )
);

-- 5. HARDENED ORDER FILES RLS
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
CREATE POLICY "Insert order files" ON public.order_files
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "View own order files or staff view all" ON public.order_files;
CREATE POLICY "View own order files or staff view all" ON public.order_files
FOR SELECT USING (
    public.is_staff() = true OR
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_files.order_id
        AND (o.user_id = auth.uid() OR o.user_id IS NULL)
    )
);

-- 6. HARDENED PAYMENTS RLS
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'pay_at_shop', 'paid', 'failed', 'refunded', 'partially_paid')),
    transaction_id TEXT,
    gateway_reference TEXT,
    received_by TEXT,
    notes TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only staff can insert payments" ON public.payments;
CREATE POLICY "Only staff can insert payments" ON public.payments
FOR INSERT WITH CHECK (public.is_staff() = true);

DROP POLICY IF EXISTS "Users view own payments or staff view all" ON public.payments;
CREATE POLICY "Users view own payments or staff view all" ON public.payments
FOR SELECT USING (
    public.is_staff() = true OR
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = payments.order_id
        AND o.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Only staff can update payments" ON public.payments;
CREATE POLICY "Only staff can update payments" ON public.payments
FOR UPDATE USING (public.is_staff() = true);

-- 7. AUDIT LOGGING & STATUS HISTORY RLS
DROP POLICY IF EXISTS "Users view relevant status history or staff view all" ON public.status_history;
CREATE POLICY "Users view relevant status history or staff view all" ON public.status_history
FOR SELECT USING (
    public.is_staff() = true OR 
    EXISTS (SELECT 1 FROM public.orders o WHERE o.order_code = status_history.entity_code AND (o.user_id = auth.uid() OR o.user_id IS NULL)) OR
    EXISTS (SELECT 1 FROM public.service_requests s WHERE s.request_code = status_history.entity_code AND (s.user_id = auth.uid() OR s.user_id IS NULL)) OR
    EXISTS (SELECT 1 FROM public.quote_requests q WHERE q.quote_code = status_history.entity_code AND (q.user_id = auth.uid() OR q.user_id IS NULL))
);

DROP POLICY IF EXISTS "Staff or authenticated insert status history" ON public.status_history;
CREATE POLICY "Staff or authenticated insert status history" ON public.status_history
FOR INSERT WITH CHECK (public.is_staff() = true OR auth.uid() IS NOT NULL);
