-- ============================================================================
-- PALAK ENTERPRISES / PALAK PRINTING PRESS
-- PRODUCTION ORDER HISTORY RESET
-- ============================================================================

-- 1. Unlink invoices (set order_id to NULL to preserve all financial records)
UPDATE public.invoices 
SET order_id = NULL 
WHERE order_id IS NOT NULL;

-- 2. Delete dependent child records
DELETE FROM public.order_files;
DELETE FROM public.order_items;
DELETE FROM public.print_jobs;

-- 3. Delete parent orders
DELETE FROM public.orders;

-- 4. Delete order-specific status history
DELETE FROM public.status_history 
WHERE entity_type = 'order';

-- 5. Delete order document storage objects from storage.objects
DELETE FROM storage.objects 
WHERE bucket_id = 'customer-documents' 
  AND (name LIKE 'orders/%' OR name LIKE 'PHOTO-%');
