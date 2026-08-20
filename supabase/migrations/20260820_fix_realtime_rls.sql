-- ==============================================================================
-- Palak Enterprises — Fix Realtime Publication & RLS for Orders & Requests
-- Migration: 20260820_fix_realtime_rls.sql
--
-- Applied to live Supabase database on 2026-08-20.
-- Ensures:
--   1. REPLICA IDENTITY FULL on all realtime tables
--   2. All relevant tables added to supabase_realtime publication
--   3. SELECT policy allows staff, customer owner, and guest orders
--   4. INSERT policies allow order creation
-- ==============================================================================

-- 1. REPLICA IDENTITY FULL
ALTER TABLE IF EXISTS public.orders REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.order_items REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.service_requests REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.quote_requests REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.design_requests REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.notifications REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.status_history REPLICA IDENTITY FULL;

-- 2. Ensure tables are in supabase_realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'order_items') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'service_requests') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'quote_requests') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_requests;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'design_requests') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.design_requests;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'status_history') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.status_history;
    END IF;
  END IF;
END $$;

-- 3. RLS policies on orders
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
DROP POLICY IF EXISTS "Customers view own orders or staff view all" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public read access on orders" ON public.orders;

CREATE POLICY "orders_select_policy" ON public.orders
  FOR SELECT TO public
  USING (
    public.is_staff() = true
    OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR user_id IS NULL
  );

DROP POLICY IF EXISTS "orders_public_insert" ON public.orders;
DROP POLICY IF EXISTS "Anyone can insert an order" ON public.orders;
DROP POLICY IF EXISTS "Customers create own orders" ON public.orders;

CREATE POLICY "orders_public_insert" ON public.orders
  FOR INSERT TO public
  WITH CHECK (true);

-- 4. RLS policies on order_items
DROP POLICY IF EXISTS "order_items_select_policy" ON public.order_items;
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "order_items_select_policy" ON public.order_items
  FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "order_items_public_insert" ON public.order_items;
CREATE POLICY "order_items_public_insert" ON public.order_items
  FOR INSERT TO public
  WITH CHECK (true);
