-- ==============================================================================
-- Palak Enterprises — Realtime Publication Configuration Migration
-- Ensures the orders, admin_notifications, service_requests, and quote_requests 
-- tables stream full replica payloads for instant event-driven admin updates.
-- ==============================================================================

-- 1. Set REPLICA IDENTITY to FULL so updates and deletes include all columns
ALTER TABLE IF EXISTS public.orders REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.admin_notifications REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.service_requests REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.quote_requests REPLICA IDENTITY FULL;

-- 2. Ensure tables are added to supabase_realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Orders
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;

    -- Admin Notifications
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'admin_notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
    END IF;

    -- Service Requests
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'service_requests'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;
    END IF;

    -- Quote Requests
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'quote_requests'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_requests;
    END IF;
  END IF;
END $$;
