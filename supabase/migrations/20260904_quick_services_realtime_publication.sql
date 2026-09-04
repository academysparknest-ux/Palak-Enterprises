-- ==============================================================================
-- Migration: Add quick_services to supabase_realtime publication
-- Date: 2026-09-04
-- Description:
--   Ensures real-time postgres_changes events are broadcasted by Supabase
--   for public.quick_services when service availability changes.
-- ==============================================================================

DO $$
BEGIN
  -- 1. Ensure quick_services table has REPLICA IDENTITY FULL for detailed change payloads
  ALTER TABLE public.quick_services REPLICA IDENTITY FULL;

  -- 2. Add quick_services to supabase_realtime publication if not already present
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'quick_services'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.quick_services;
      RAISE NOTICE 'Added public.quick_services to supabase_realtime publication.';
    ELSE
      RAISE NOTICE 'public.quick_services is already in supabase_realtime publication.';
    END IF;
  ELSE
    RAISE NOTICE 'supabase_realtime publication not found, skipping publication registration.';
  END IF;
END $$;