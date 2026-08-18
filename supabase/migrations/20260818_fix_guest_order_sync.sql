-- =============================================================================
-- Migration: 20260818_fix_guest_order_sync.sql
-- Purpose: Ensure production database has correct RLS policies, constraints,
--          and helper functions for proper order sync between Customer Website
--          and Admin Staff ERP.
-- =============================================================================

-- 1. ENSURE HELPER FUNCTIONS EXIST (SECURITY DEFINER = bypass RLS for role checks)
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

-- 2. ENSURE ORDERS CHECK CONSTRAINTS ARE EXPANDED
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

-- 3. ENSURE RLS IS ENABLED
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

-- 4. HARDENED ORDERS RLS — allows guest orders (user_id IS NULL) 
--    and staff to view ALL orders
DROP POLICY IF EXISTS "Anyone can insert an order" ON public.orders;
DROP POLICY IF EXISTS "Customers create own orders" ON public.orders;
CREATE POLICY "Customers create own orders" ON public.orders
FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Customers view own orders or staff view all" ON public.orders;
CREATE POLICY "Customers view own orders or staff view all" ON public.orders
FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL OR public.is_staff() = true);

DROP POLICY IF EXISTS "Only staff can update orders" ON public.orders;
CREATE POLICY "Only staff can update orders" ON public.orders
FOR UPDATE USING (public.is_staff() = true);

DROP POLICY IF EXISTS "Only admins can delete orders" ON public.orders;
CREATE POLICY "Only admins can delete orders" ON public.orders
FOR DELETE USING (public.is_admin() = true);

-- 5. ORDER ITEMS RLS
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

-- 6. ORDER FILES TABLE + RLS
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

-- 7. STATUS HISTORY RLS
DROP POLICY IF EXISTS "Users view relevant status history or staff view all" ON public.status_history;
CREATE POLICY "Users view relevant status history or staff view all" ON public.status_history
FOR SELECT USING (
    public.is_staff() = true OR 
    EXISTS (SELECT 1 FROM public.orders o WHERE o.order_code = status_history.entity_code AND (o.user_id = auth.uid() OR o.user_id IS NULL)) OR
    EXISTS (SELECT 1 FROM public.service_requests s WHERE s.request_code = status_history.entity_code AND (s.user_id = auth.uid() OR s.user_id IS NULL)) OR
    EXISTS (SELECT 1 FROM public.quote_requests q WHERE q.quote_code = status_history.entity_code AND (q.user_id = auth.uid() OR q.user_id IS NULL))
);

DROP POLICY IF EXISTS "Staff or authenticated insert status history" ON public.status_history;
DROP POLICY IF EXISTS "Only staff or authenticated can insert status history" ON public.status_history;
CREATE POLICY "Staff or authenticated insert status history" ON public.status_history
FOR INSERT WITH CHECK (public.is_staff() = true OR auth.uid() IS NOT NULL);

-- 8. PRIVATE STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-documents', 'customer-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage upload policy: allow authenticated AND anonymous uploads
DROP POLICY IF EXISTS "Allow public uploads to customer-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to customer-documents" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to customer-documents"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'customer-documents');

-- Storage read policy: staff or authenticated users
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

-- 9. ENSURE get_public_order_tracking RPC IS GRANTED TO anon AND authenticated
GRANT EXECUTE ON FUNCTION public.get_public_order_tracking(TEXT, TEXT) TO anon, authenticated;

-- =============================================================================
-- DIAGNOSTIC: Run this query after migration to verify your admin user's roles
-- Replace 'YOUR_ADMIN_EMAIL' with the actual admin email address
-- =============================================================================
-- SELECT p.full_name, p.email, ur.role 
-- FROM public.profiles p 
-- JOIN public.user_roles ur ON ur.user_id = p.id 
-- WHERE p.email = 'YOUR_ADMIN_EMAIL';
--
-- Expected result: Should show ADMIN or MANAGER role.
-- If no rows returned, insert the role:
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'ADMIN' FROM public.profiles WHERE email = 'YOUR_ADMIN_EMAIL'
-- ON CONFLICT (user_id, role) DO NOTHING;
-- =============================================================================
