-- ==============================================================================
-- PALAK ENTERPRISES — INVOICE PDF STORAGE HARDENING
-- Migration: 20260823_invoice_pdf_storage.sql
-- ==============================================================================

-- 1. Ensure 'customer-documents' private bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'customer-documents',
  'customer-documents',
  false,
  52428800 -- 50MB
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800;

-- 2. Storage Object Policies for 'customer-documents' including 'invoice-pdfs'
DROP POLICY IF EXISTS "customer_documents_owner_insert" ON storage.objects;
CREATE POLICY "customer_documents_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'customer-documents'
    AND (
      public.is_staff() = true
      OR auth.uid() IS NOT NULL
      OR (storage.foldername(name))[1] = 'invoice-pdfs'
      OR (storage.foldername(name))[1] = 'orders'
      OR (storage.foldername(name))[1] LIKE 'guest_%'
    )
  );

DROP POLICY IF EXISTS "customer_documents_owner_update" ON storage.objects;
CREATE POLICY "customer_documents_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'customer-documents'
    AND (
      public.is_staff() = true
      OR auth.uid() IS NOT NULL
      OR (storage.foldername(name))[1] = 'invoice-pdfs'
      OR (storage.foldername(name))[1] = 'orders'
      OR (storage.foldername(name))[1] LIKE 'guest_%'
    )
  );

DROP POLICY IF EXISTS "customer_documents_private_read" ON storage.objects;
CREATE POLICY "customer_documents_private_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'customer-documents'
    AND NOT (name LIKE 'website-assets/%')
    AND (
      public.is_staff() = true
      OR auth.uid()::text = (storage.foldername(name))[1]
      OR (storage.foldername(name))[1] = 'invoice-pdfs'
    )
  );
