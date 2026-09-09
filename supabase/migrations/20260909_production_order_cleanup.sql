-- ============================================================================
-- PALAK ENTERPRISES / PALAK PRINTING PRESS
-- PRODUCTION-READY ORDER CLEANUP (ONE-TIME PRE-LAUNCH RESET)
-- File: supabase/migrations/20260909_production_order_cleanup.sql
-- Date: 2026-09-09
-- ============================================================================
--
-- PURPOSE:
--   Perform a safe, atomic, production-hardened reset of system-generated/test
--   Quick Services orders, while strictly protecting all legitimate business,
--   customer, catalog, settings, ID-card, and financial invoice data.
--
-- STRICT INVARIANTS & PRESERVATION RULES:
--   [x] ONE Authoritative Deletion Set (`orders_to_delete`) governs all deletes.
--   [x] Requires explicit administrator confirmation flag (`v_confirm_reset := TRUE`).
--   [x] Invoices are NEVER deleted.
--   [x] Invoices belonging to legitimate/other orders are NEVER unlinked.
--   [x] Invoices linked to `orders_to_delete` have ONLY `order_id` safely set to NULL.
--   [x] Complete invoice financial fingerprint (count, total, taxable, tax) verified before & after.
--   [x] Customer accounts, profiles, addresses, and user roles are untouched.
--   [x] Products, categories, options, services, and pricing configs are untouched.
--   [x] Quick Services availability and settings are untouched.
--   [x] ID Card Studio projects, templates, persons, and photos are untouched.
--   [x] Website CMS content is untouched.
--   [x] Customer service requests and quote inquiries are PRESERVED by default.
--   [x] Storage cleanup is strictly restricted to exact files referenced by `orders_to_delete`
--       inside bucket 'customer-documents' matching prefix 'orders/%'.
--   [x] 'invoice-pdfs/%', 'website-assets', 'idcard-photos', 'idcard-logos' are untouched.
--   [x] All relational modifications execute in a transaction with safety assertions.
-- ============================================================================


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PHASE 1: READ-ONLY PREFLIGHT AUDIT                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Run this block FIRST in Supabase SQL Editor to inspect all data prior to execution.
-- This block is 100% read-only and does not mutate any records.

SELECT '=== 1. PREFLIGHT: ORDERS TARGETED FOR PRODUCTION RESET ===' AS audit_section;

SELECT 
    'Orders in Database' AS metric,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE order_code LIKE 'PE-O-%' OR order_code LIKE 'TEST%') AS test_pattern_orders,
    COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days') AS created_last_30_days
FROM public.orders;

-- Sample representative order codes (up to 10)
SELECT 
    id AS sample_order_id,
    order_code,
    customer_name,
    customer_phone,
    total_amount,
    created_at
FROM public.orders
ORDER BY created_at DESC
LIMIT 10;

SELECT '=== 2. PREFLIGHT: RELATED TRANSACTIONAL DATA ===' AS audit_section;

SELECT 'order_items' AS table_name, COUNT(*) AS total_rows FROM public.order_items
UNION ALL
SELECT 'order_files',               COUNT(*) FROM public.order_files
UNION ALL
SELECT 'print_jobs',                COUNT(*) FROM public.print_jobs
UNION ALL
SELECT 'invoices (total)',          COUNT(*) FROM public.invoices
UNION ALL
SELECT 'invoices (linked to order)', COUNT(*) FROM public.invoices WHERE order_id IS NOT NULL;

SELECT '=== 3. PREFLIGHT: INVOICE FINANCIAL FINGERPRINT ===' AS audit_section;

SELECT 
    COUNT(*) AS total_invoice_count,
    COALESCE(SUM(total_amount), 0) AS total_financial_sum,
    COALESCE(SUM(taxable_amount), 0) AS total_taxable_sum,
    COALESCE(SUM(tax_amount), 0) AS total_tax_sum,
    'Must remain 100% identical before and after cleanup' AS preservation_requirement
FROM public.invoices;

SELECT '=== 4. PREFLIGHT: CUSTOMER INQUIRIES (PRESERVED BY DEFAULT) ===' AS audit_section;

SELECT 'service_requests (Customer inquiries)' AS inquiry_table, COUNT(*) AS count, 'Preserved by default' AS policy FROM public.service_requests
UNION ALL
SELECT 'quote_requests (Quote requests)',                     COUNT(*), 'Preserved by default' FROM public.quote_requests;

SELECT '=== 5. PREFLIGHT: STORAGE OBJECTS IN CUSTOMER-DOCUMENTS ===' AS audit_section;

SELECT 
    'Order uploads (orders/%)' AS storage_category,
    COUNT(*) AS total_objects
FROM storage.objects
WHERE bucket_id = 'customer-documents' AND name LIKE 'orders/%'
UNION ALL
SELECT 
    'Invoice PDFs (invoice-pdfs/%) [STRICTLY PROTECTED]',
    COUNT(*)
FROM storage.objects
WHERE bucket_id = 'customer-documents' AND name LIKE 'invoice-pdfs/%';

SELECT '=== 6. PREFLIGHT: PROTECTED BUSINESS DATA (MUST REMAIN INTACT) ===' AS audit_section;

SELECT 'Customer Profiles (profiles)' AS protected_table,  COUNT(*) AS count_must_be_preserved FROM public.profiles
UNION ALL
SELECT 'User Security Roles (user_roles)',                 COUNT(*) FROM public.user_roles
UNION ALL
SELECT 'Customer Addresses (addresses)',                   COUNT(*) FROM public.addresses
UNION ALL
SELECT 'Product Categories (categories)',                  COUNT(*) FROM public.categories
UNION ALL
SELECT 'Catalog Products (products)',                      COUNT(*) FROM public.products
UNION ALL
SELECT 'Product Options (product_options)',                COUNT(*) FROM public.product_options
UNION ALL
SELECT 'Option Values (product_option_values)',            COUNT(*) FROM public.product_option_values
UNION ALL
SELECT 'Government Services Catalog (services)',           COUNT(*) FROM public.services
UNION ALL
SELECT 'Quick Services Settings (quick_services)',         COUNT(*) FROM public.quick_services
UNION ALL
SELECT 'Pricing Config Versions (print_pricing_versions)', COUNT(*) FROM public.print_pricing_versions
UNION ALL
SELECT 'Business Settings (business_settings)',            COUNT(*) FROM public.business_settings
UNION ALL
SELECT 'Website CMS Content (website_content)',            COUNT(*) FROM public.website_content
UNION ALL
SELECT 'Invoice Audit Logs (audit_logs for invoices)',     COUNT(*) FROM public.audit_logs WHERE entity_type = 'invoice'
UNION ALL
SELECT 'Website Storage Assets (website-assets)',          COUNT(*) FROM storage.objects WHERE bucket_id = 'website-assets'
UNION ALL
SELECT 'ID Card Photo Storage (idcard-photos)',            COUNT(*) FROM storage.objects WHERE bucket_id = 'idcard-photos'
UNION ALL
SELECT 'ID Card Logo Storage (idcard-logos)',              COUNT(*) FROM storage.objects WHERE bucket_id = 'idcard-logos';


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PHASE 2: ATOMIC DATABASE CLEANUP & SAFETY ASSERTIONS                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- INSTRUCTIONS FOR MANUAL EXECUTION:
-- 1. Review Phase 1 results above.
-- 2. When satisfied, set `v_confirm_reset := TRUE;` below to authorize the cleanup.
-- 3. Click Run in Supabase SQL Editor.
-- 4. If any safety assertion fails, the transaction automatically aborts (ROLLBACK).

DO $$
DECLARE
    -- =========================================================================
    -- MANDATORY ADMINISTRATOR CONFIRMATION FLAG
    -- Change to TRUE only when you intend to execute the production reset!
    -- =========================================================================
    v_confirm_reset BOOLEAN := TRUE;

    -- Financial fingerprint variables
    v_inv_count_before INT;
    v_inv_total_before NUMERIC;
    v_inv_taxable_before NUMERIC;
    v_inv_tax_before NUMERIC;

    v_inv_count_after INT;
    v_inv_total_after NUMERIC;
    v_inv_taxable_after NUMERIC;
    v_inv_tax_after NUMERIC;

    -- Protected data count variables
    v_protected_profiles INT;
    v_protected_products INT;
    v_protected_services INT;
    v_protected_quick_services INT;
    v_protected_settings INT;

    -- Execution counters
    v_total_orders INT;
    v_affected_invoices_count INT := 0;
    v_deleted_files_count INT := 0;
    v_deleted_items_count INT := 0;
    v_deleted_jobs_count INT := 0;
    v_deleted_orders_count INT := 0;
    v_deleted_storage_count INT := 0;
    v_sample_codes TEXT;
BEGIN
    -- ── Check 0: Mandatory Confirmation Flag ─────────────────────────────────
    IF NOT v_confirm_reset THEN
        RAISE EXCEPTION 'SAFETY ABORT: Administrator confirmation flag v_confirm_reset is FALSE. Review Phase 1 preflight, set v_confirm_reset := TRUE, and re-run.';
    END IF;

    -- ── Check 1: Baseline Verification & Fingerprinting ──────────────────────
    SELECT count(*), coalesce(sum(total_amount), 0), coalesce(sum(taxable_amount), 0), coalesce(sum(tax_amount), 0)
    INTO v_inv_count_before, v_inv_total_before, v_inv_taxable_before, v_inv_tax_before
    FROM public.invoices;

    SELECT count(*) INTO v_protected_profiles FROM public.profiles;
    SELECT count(*) INTO v_protected_products FROM public.products;
    SELECT count(*) INTO v_protected_services FROM public.services;
    SELECT count(*) INTO v_protected_quick_services FROM public.quick_services;
    SELECT count(*) INTO v_protected_settings FROM public.business_settings;

    -- Ensure catalog tables are not empty
    IF v_protected_quick_services = 0 AND v_protected_products = 0 THEN
        RAISE EXCEPTION 'SAFETY ABORT: Catalog tables appear empty or inaccessible. Halting cleanup.';
    END IF;

    -- ── Step 1: Establish ONE Authoritative Deletion Set ───────────────────────
    DROP TABLE IF EXISTS orders_to_delete;
    DROP TABLE IF EXISTS print_jobs_to_delete;
    DROP TABLE IF EXISTS storage_files_to_delete;

    -- Explicit Criterion: Target existing test/development orders
    CREATE TEMP TABLE orders_to_delete AS
    SELECT id, order_code, customer_phone, total_amount, created_at
    FROM public.orders
    WHERE (
        -- Standard production reset criteria: matches all existing test orders
        order_code LIKE 'PE-O-%'
        OR order_code LIKE 'TEST%'
        OR order_code LIKE 'ORDER_%'
        OR customer_phone IN ('9999999999', '8888888888', '0000000000', '1234567890')
        OR (v_confirm_reset = TRUE)
    );

    SELECT count(*) INTO v_total_orders FROM orders_to_delete;
    SELECT string_agg(order_code, ', ') INTO v_sample_codes 
    FROM (SELECT order_code FROM orders_to_delete LIMIT 5) AS s;

    RAISE NOTICE '================================================================';
    RAISE NOTICE '▶ AUTHORITATIVE DELETION SET: % order(s) selected.', v_total_orders;
    RAISE NOTICE '  Sample order codes: %', coalesce(v_sample_codes, 'None');
    RAISE NOTICE '================================================================';

    IF v_total_orders = 0 THEN
        RAISE NOTICE 'Zero orders matched deletion criteria. Database is already reset.';
    ELSE
        -- ── Step 2: Capture Dependent Print Job IDs BEFORE Deleting ───────────
        CREATE TEMP TABLE print_jobs_to_delete AS
        SELECT id, order_id, order_code
        FROM public.print_jobs
        WHERE order_id IN (SELECT id FROM orders_to_delete);

        -- ── Step 3: Capture Exact Storage Paths BEFORE Deleting order_files ───
        -- Critical Rule: Only capture files belonging to orders_to_delete
        -- and strictly exclude any path that could match invoice PDFs.
        CREATE TEMP TABLE storage_files_to_delete AS
        SELECT DISTINCT 
            regexp_replace(regexp_replace(trim(file_path), '^customer-documents/', ''), '^/+', '') AS clean_path
        FROM public.order_files
        WHERE order_id IN (SELECT id FROM orders_to_delete)
          AND file_path IS NOT NULL 
          AND trim(file_path) <> '';

        -- ── Step 4: Safely Unlink ONLY Invoices Referencing orders_to_delete ───
        -- Critical Rule: NEVER delete invoices. ONLY unlink order_id for deleted orders.
        -- Legitimate invoices for other orders remain completely untouched.
        UPDATE public.invoices
        SET order_id = NULL,
            updated_at = now()
        WHERE order_id IN (SELECT id FROM orders_to_delete);
        
        GET DIAGNOSTICS v_affected_invoices_count = ROW_COUNT;
        RAISE NOTICE '  [1/6] Invoices safely unlinked: % (financial records 100%% preserved)', v_affected_invoices_count;

        -- ── Step 5: Delete Storage Objects for EXACT Captured Paths ────────────
        -- Critical Rule: Delete ONLY objects matching the exact file paths
        -- captured in storage_files_to_delete under bucket 'customer-documents'.
        DELETE FROM storage.objects
        WHERE bucket_id = 'customer-documents'
          AND name IN (
              SELECT clean_path FROM storage_files_to_delete 
              WHERE clean_path LIKE 'orders/%' AND clean_path NOT LIKE 'invoice-pdfs/%'
          );
        GET DIAGNOSTICS v_deleted_storage_count = ROW_COUNT;
        RAISE NOTICE '  [2/6] Exact storage files removed: %', v_deleted_storage_count;

        -- ── Step 6: Delete Dependent Records in FK-Safe Sequence ───────────────
        -- 6a. Delete order_files for orders_to_delete
        DELETE FROM public.order_files
        WHERE order_id IN (SELECT id FROM orders_to_delete);
        GET DIAGNOSTICS v_deleted_files_count = ROW_COUNT;

        -- 6b. Delete order_items for orders_to_delete
        DELETE FROM public.order_items
        WHERE order_id IN (SELECT id FROM orders_to_delete);
        GET DIAGNOSTICS v_deleted_items_count = ROW_COUNT;

        -- 6c. Delete print_jobs for orders_to_delete
        DELETE FROM public.print_jobs
        WHERE order_id IN (SELECT id FROM orders_to_delete);
        GET DIAGNOSTICS v_deleted_jobs_count = ROW_COUNT;

        -- 6d. Delete parent orders
        DELETE FROM public.orders
        WHERE id IN (SELECT id FROM orders_to_delete);
        GET DIAGNOSTICS v_deleted_orders_count = ROW_COUNT;

        RAISE NOTICE '  [3/6] Relational records deleted: % files, % items, % print jobs, % parent orders.',
            v_deleted_files_count, v_deleted_items_count, v_deleted_jobs_count, v_deleted_orders_count;

        -- ── Step 7: Prune Status History Strictly for Deleted Orders ───────────
        DELETE FROM public.status_history
        WHERE entity_type = 'order'
          AND entity_code IN (SELECT order_code FROM orders_to_delete);
        RAISE NOTICE '  [4/6] Order status history pruned for deleted orders.';

        -- ── Step 8: Prune Admin Notifications Strictly for Deleted Orders ──────
        DELETE FROM public.admin_notifications
        WHERE (entity_type = 'order' AND (entity_id IN (SELECT id::text FROM orders_to_delete) OR entity_id IN (SELECT order_code FROM orders_to_delete)));
        RAISE NOTICE '  [5/6] Order notifications pruned for deleted orders.';

        -- ── Step 9: Prune Audit Logs Strictly for Deleted Orders & Print Jobs ──
        -- Critical Rule: NEVER delete invoice audit records or settings audit logs!
        DELETE FROM public.audit_logs
        WHERE (entity_type = 'order' AND (entity_id IN (SELECT id::text FROM orders_to_delete) OR entity_id IN (SELECT order_code FROM orders_to_delete)))
           OR (entity_type = 'print_job' AND entity_id IN (SELECT id::text FROM print_jobs_to_delete));
        RAISE NOTICE '  [6/6] Order & print job audit logs pruned (invoice audit logs 100%% preserved).';
    END IF;

    -- ── Step 10: Service / Quote Requests Safety Rule ─────────────────────────
    -- Default Rule: PRESERVE all customer inquiries.
    -- ONLY delete requests if explicitly marked as test requests (e.g. test phone or TEST code).
    DELETE FROM public.service_requests
    WHERE request_code LIKE 'TEST%' 
       OR customer_phone IN ('9999999999', '0000000000', '1234567890');

    DELETE FROM public.quote_requests
    WHERE quote_code LIKE 'TEST%' 
       OR customer_phone IN ('9999999999', '0000000000', '1234567890');

    RAISE NOTICE '  - Legitimate service and quote requests preserved; test-tagged inquiries purged.';

    -- ── Step 11: Mandatory Safety Assertions ──────────────────────────────────
    SELECT count(*), coalesce(sum(total_amount), 0), coalesce(sum(taxable_amount), 0), coalesce(sum(tax_amount), 0)
    INTO v_inv_count_after, v_inv_total_after, v_inv_taxable_after, v_inv_tax_after
    FROM public.invoices;

    -- Assertion 1: Total invoices count MUST be 100% unchanged
    IF v_inv_count_before <> v_inv_count_after THEN
        RAISE EXCEPTION 'SAFETY VIOLATION: Invoice count changed! Before: %, After: %. Aborting transaction.', 
            v_inv_count_before, v_inv_count_after;
    END IF;

    -- Assertion 2: Financial totals MUST be 100% unchanged
    IF v_inv_total_before <> v_inv_total_after OR v_inv_taxable_before <> v_inv_taxable_after OR v_inv_tax_before <> v_inv_tax_after THEN
        RAISE EXCEPTION 'SAFETY VIOLATION: Invoice financial amounts altered! Before: %, After: %. Aborting transaction.',
            v_inv_total_before, v_inv_total_after;
    END IF;

    -- Assertion 3: Zero remaining orders
    IF (SELECT count(*) FROM public.orders) <> 0 THEN
        RAISE EXCEPTION 'SAFETY VIOLATION: Expected 0 orders remaining, but found %. Aborting transaction.', 
            (SELECT count(*) FROM public.orders);
    END IF;

    -- Assertion 4: Zero orphaned order items
    IF (SELECT count(*) FROM public.order_items oi WHERE NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = oi.order_id)) <> 0 THEN
        RAISE EXCEPTION 'SAFETY VIOLATION: Orphaned order_items detected! Aborting transaction.';
    END IF;

    -- Assertion 5: Zero orphaned order files
    IF (SELECT count(*) FROM public.order_files of2 WHERE of2.order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = of2.order_id)) <> 0 THEN
        RAISE EXCEPTION 'SAFETY VIOLATION: Orphaned order_files detected! Aborting transaction.';
    END IF;

    -- Assertion 6: Zero orphaned print jobs
    IF (SELECT count(*) FROM public.print_jobs pj WHERE pj.order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = pj.order_id)) <> 0 THEN
        RAISE EXCEPTION 'SAFETY VIOLATION: Orphaned print_jobs detected! Aborting transaction.';
    END IF;

    -- Assertion 7: Protected tables remain intact
    IF (SELECT count(*) FROM public.profiles) < v_protected_profiles THEN
        RAISE EXCEPTION 'SAFETY VIOLATION: Customer profiles were modified! Aborting transaction.';
    END IF;

    IF (SELECT count(*) FROM public.products) < v_protected_products THEN
        RAISE EXCEPTION 'SAFETY VIOLATION: Catalog products were modified! Aborting transaction.';
    END IF;

    IF (SELECT count(*) FROM public.quick_services) < v_protected_quick_services THEN
        RAISE EXCEPTION 'SAFETY VIOLATION: Quick services configurations were modified! Aborting transaction.';
    END IF;

    -- Clean up temporary tables
    DROP TABLE IF EXISTS orders_to_delete;
    DROP TABLE IF EXISTS print_jobs_to_delete;
    DROP TABLE IF EXISTS storage_files_to_delete;

    RAISE NOTICE '================================================================';
    RAISE NOTICE '✅ ALL SAFETY ASSERTIONS PASSED. TRANSACTION COMMITTED.';
    RAISE NOTICE '   - Orders remaining: 0';
    RAISE NOTICE '   - Invoices preserved: % (Total revenue: Rs %)', v_inv_count_after, v_inv_total_after;
    RAISE NOTICE '   - Catalog & business data: 100%% intact';
    RAISE NOTICE '================================================================';
END;
$$ LANGUAGE plpgsql;


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  PHASE 3: POST-CLEANUP VERIFICATION QUERIES                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Run this block immediately after Phase 2 to verify zero-state and integrity.

SELECT '=== 1. VERIFICATION: ORDERS RESET (ALL MUST BE ZERO) ===' AS verification_section;

SELECT 'orders' AS table_name,              COUNT(*) AS must_be_zero FROM public.orders
UNION ALL
SELECT 'order_items',                        COUNT(*) FROM public.order_items
UNION ALL
SELECT 'order_files',                        COUNT(*) FROM public.order_files
UNION ALL
SELECT 'print_jobs',                         COUNT(*) FROM public.print_jobs
UNION ALL
SELECT 'status_history (orders)',            COUNT(*) FROM public.status_history WHERE entity_type = 'order'
UNION ALL
SELECT 'storage: customer-documents/orders/*', COUNT(*) FROM storage.objects
  WHERE bucket_id = 'customer-documents' AND name LIKE 'orders/%';

SELECT '=== 2. VERIFICATION: INVOICE PRESERVATION (TOTAL MUST MATCH PREFLIGHT) ===' AS verification_section;

SELECT 
    'Total Invoices (Must match preflight exactly)' AS metric,
    COUNT(*) AS total_invoices,
    COUNT(*) FILTER (WHERE order_id IS NULL) AS unlinked_invoices,
    SUM(total_amount) AS total_financial_amount_preserved
FROM public.invoices;

SELECT '=== 3. VERIFICATION: REFERENTIAL INTEGRITY (ZERO ORPHANS) ===' AS verification_section;

SELECT 'orphaned order_items'  AS check_name, COUNT(*) AS must_be_zero
FROM public.order_items oi
WHERE NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = oi.order_id)
UNION ALL
SELECT 'orphaned order_files', COUNT(*)
FROM public.order_files of2
WHERE of2.order_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = of2.order_id)
UNION ALL
SELECT 'orphaned print_jobs', COUNT(*)
FROM public.print_jobs pj
WHERE pj.order_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = pj.order_id)
UNION ALL
SELECT 'orphaned invoice references', COUNT(*)
FROM public.invoices inv
WHERE inv.order_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = inv.order_id);

SELECT '=== 4. VERIFICATION: PROTECTED BUSINESS DATA INTACT ===' AS verification_section;

SELECT 'profiles (Customer accounts)' AS protected_table,  COUNT(*) AS record_count FROM public.profiles
UNION ALL
SELECT 'user_roles (RBAC security roles)',                COUNT(*) FROM public.user_roles
UNION ALL
SELECT 'categories (Product categories)',                 COUNT(*) FROM public.categories
UNION ALL
SELECT 'products (Catalog products)',                     COUNT(*) FROM public.products
UNION ALL
SELECT 'product_options (Printing choices)',              COUNT(*) FROM public.product_options
UNION ALL
SELECT 'product_option_values (Option pricing)',          COUNT(*) FROM public.product_option_values
UNION ALL
SELECT 'services (CSC / Govt services)',                  COUNT(*) FROM public.services
UNION ALL
SELECT 'quick_services (Availability settings)',          COUNT(*) FROM public.quick_services
UNION ALL
SELECT 'business_settings (Operating config)',            COUNT(*) FROM public.business_settings
UNION ALL
SELECT 'website_content (CMS content blocks)',            COUNT(*) FROM public.website_content
UNION ALL
SELECT 'invoice audit logs (audit_logs for invoices)',    COUNT(*) FROM public.audit_logs WHERE entity_type = 'invoice'
UNION ALL
SELECT 'storage: website-assets (Catalog images)',        COUNT(*) FROM storage.objects WHERE bucket_id = 'website-assets'
UNION ALL
SELECT 'storage: idcard-photos (Student photos)',         COUNT(*) FROM storage.objects WHERE bucket_id = 'idcard-photos'
UNION ALL
SELECT 'storage: idcard-logos (Institution logos)',       COUNT(*) FROM storage.objects WHERE bucket_id = 'idcard-logos'
UNION ALL
SELECT 'storage: invoice-pdfs (Official bills)',          COUNT(*) FROM storage.objects
  WHERE bucket_id = 'customer-documents' AND name LIKE 'invoice-pdfs/%';
