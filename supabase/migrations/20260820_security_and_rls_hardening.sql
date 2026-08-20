-- ==============================================================================
-- PALAK ENTERPRISES — COMPREHENSIVE PRODUCTION SECURITY & RLS HARDENING
-- Migration: 20260820_security_and_rls_hardening.sql
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ROLE CHECK SECURITY DEFINER FUNCTIONS (Cannot be spoofed from client)
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

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('MANAGER', 'ADMIN')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_strict_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'ADMIN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ENABLE RLS ON ALL TABLES
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.website_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;

-- 4. HARDENED CATEGORIES POLICIES
DROP POLICY IF EXISTS "Public categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "categories_select_policy" ON public.categories;
CREATE POLICY "categories_select_policy"
  ON public.categories FOR SELECT
  USING (is_active = true OR public.is_staff() = true);

DROP POLICY IF EXISTS "categories_insert_policy" ON public.categories;
CREATE POLICY "categories_insert_policy"
  ON public.categories FOR INSERT
  WITH CHECK (public.is_manager() = true);

DROP POLICY IF EXISTS "categories_update_policy" ON public.categories;
CREATE POLICY "categories_update_policy"
  ON public.categories FOR UPDATE
  USING (public.is_manager() = true)
  WITH CHECK (public.is_manager() = true);

DROP POLICY IF EXISTS "categories_delete_policy" ON public.categories;
CREATE POLICY "categories_delete_policy"
  ON public.categories FOR DELETE
  USING (public.is_strict_admin() = true);

-- 5. DATABASE-LEVEL CATEGORY ORPHAN DELETION GUARD TRIGGER
CREATE OR REPLACE FUNCTION public.prevent_in_use_category_deletion()
RETURNS TRIGGER AS $$
DECLARE
    v_prod_count INT;
    v_serv_count INT;
BEGIN
    SELECT COUNT(*) INTO v_prod_count FROM public.products WHERE category_id = OLD.id;
    SELECT COUNT(*) INTO v_serv_count FROM public.services WHERE category_id = OLD.id;
    
    IF v_prod_count > 0 OR v_serv_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete category "%" (ID: %) because it is in use by % product(s) and % service(s). Reassign or delete dependent items first.',
            OLD.name_en, OLD.id, v_prod_count, v_serv_count;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_in_use_category_deletion ON public.categories;
CREATE TRIGGER trg_prevent_in_use_category_deletion
    BEFORE DELETE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.prevent_in_use_category_deletion();

-- 6. HARDENED PRODUCTS POLICIES
DROP POLICY IF EXISTS "Public products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "products_select_policy" ON public.products;
CREATE POLICY "products_select_policy"
  ON public.products FOR SELECT
  USING (is_active = true OR public.is_staff() = true);

DROP POLICY IF EXISTS "products_insert_policy" ON public.products;
CREATE POLICY "products_insert_policy"
  ON public.products FOR INSERT
  WITH CHECK (public.is_manager() = true);

DROP POLICY IF EXISTS "products_update_policy" ON public.products;
CREATE POLICY "products_update_policy"
  ON public.products FOR UPDATE
  USING (public.is_manager() = true)
  WITH CHECK (public.is_manager() = true);

DROP POLICY IF EXISTS "products_delete_policy" ON public.products;
CREATE POLICY "products_delete_policy"
  ON public.products FOR DELETE
  USING (public.is_strict_admin() = true);

-- 7. HARDENED DIGITAL SERVICES POLICIES
DROP POLICY IF EXISTS "Public services are viewable by everyone" ON public.services;
DROP POLICY IF EXISTS "services_select_policy" ON public.services;
CREATE POLICY "services_select_policy"
  ON public.services FOR SELECT
  USING (is_active = true OR public.is_staff() = true);

DROP POLICY IF EXISTS "services_insert_policy" ON public.services;
CREATE POLICY "services_insert_policy"
  ON public.services FOR INSERT
  WITH CHECK (public.is_manager() = true);

DROP POLICY IF EXISTS "services_update_policy" ON public.services;
CREATE POLICY "services_update_policy"
  ON public.services FOR UPDATE
  USING (public.is_manager() = true)
  WITH CHECK (public.is_manager() = true);

DROP POLICY IF EXISTS "services_delete_policy" ON public.services;
CREATE POLICY "services_delete_policy"
  ON public.services FOR DELETE
  USING (public.is_strict_admin() = true);

-- 8. HARDENED BUSINESS SETTINGS & PRICING ENGINE POLICIES
DROP POLICY IF EXISTS "Public business settings are viewable" ON public.business_settings;
DROP POLICY IF EXISTS "business_settings_select_policy" ON public.business_settings;
CREATE POLICY "business_settings_select_policy"
  ON public.business_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "business_settings_insert_policy" ON public.business_settings;
CREATE POLICY "business_settings_insert_policy"
  ON public.business_settings FOR INSERT
  WITH CHECK (public.is_manager() = true);

DROP POLICY IF EXISTS "business_settings_update_policy" ON public.business_settings;
CREATE POLICY "business_settings_update_policy"
  ON public.business_settings FOR UPDATE
  USING (public.is_manager() = true)
  WITH CHECK (public.is_manager() = true);

DROP POLICY IF EXISTS "business_settings_delete_policy" ON public.business_settings;
CREATE POLICY "business_settings_delete_policy"
  ON public.business_settings FOR DELETE
  USING (public.is_strict_admin() = true);

-- 9. HARDENED WEBSITE CONTENT POLICIES
DROP POLICY IF EXISTS "public_read_active_website_content" ON public.website_content;
DROP POLICY IF EXISTS "website_content_select_policy" ON public.website_content;
CREATE POLICY "website_content_select_policy"
  ON public.website_content FOR SELECT
  USING (is_active = true OR public.is_staff() = true);

DROP POLICY IF EXISTS "staff_insert_website_content" ON public.website_content;
DROP POLICY IF EXISTS "website_content_insert_policy" ON public.website_content;
CREATE POLICY "website_content_insert_policy"
  ON public.website_content FOR INSERT
  WITH CHECK (public.is_manager() = true);

DROP POLICY IF EXISTS "staff_update_website_content" ON public.website_content;
DROP POLICY IF EXISTS "website_content_update_policy" ON public.website_content;
CREATE POLICY "website_content_update_policy"
  ON public.website_content FOR UPDATE
  USING (public.is_manager() = true)
  WITH CHECK (public.is_manager() = true);

DROP POLICY IF EXISTS "admin_delete_website_content" ON public.website_content;
DROP POLICY IF EXISTS "website_content_delete_policy" ON public.website_content;
CREATE POLICY "website_content_delete_policy"
  ON public.website_content FOR DELETE
  USING (public.is_strict_admin() = true);

-- 10. HARDENED ADMIN NOTIFICATIONS POLICIES
DROP POLICY IF EXISTS "staff_select_admin_notifications" ON public.admin_notifications;
CREATE POLICY "staff_select_admin_notifications"
  ON public.admin_notifications FOR SELECT
  USING (public.is_staff() = true);

DROP POLICY IF EXISTS "staff_insert_admin_notifications" ON public.admin_notifications;
CREATE POLICY "staff_insert_admin_notifications"
  ON public.admin_notifications FOR INSERT
  WITH CHECK (public.is_staff() = true);

DROP POLICY IF EXISTS "staff_update_admin_notifications" ON public.admin_notifications;
CREATE POLICY "staff_update_admin_notifications"
  ON public.admin_notifications FOR UPDATE
  USING (public.is_staff() = true);

DROP POLICY IF EXISTS "staff_delete_admin_notifications" ON public.admin_notifications;
CREATE POLICY "staff_delete_admin_notifications"
  ON public.admin_notifications FOR DELETE
  USING (public.is_strict_admin() = true);

-- 11. HARDENED AUDIT LOGS POLICIES (IMMUTABLE LOGGING)
DROP POLICY IF EXISTS "Only admins view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_select_policy"
  ON public.audit_logs FOR SELECT
  USING (public.is_manager() = true);

DROP POLICY IF EXISTS "Staff insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_policy"
  ON public.audit_logs FOR INSERT
  WITH CHECK (public.is_staff() = true);

-- Audit logs cannot be modified or deleted by anyone
-- (No UPDATE or DELETE policy is granted)

-- 12. STORAGE BUCKET SEGREGATION & ACCESS CONTROL
-- Ensure 'website-assets' is public for storefront images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'website-assets',
  'website-assets',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- Ensure 'customer-documents' is PRIVATE (never publicly exposed)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'customer-documents',
  'customer-documents',
  false,
  52428800 -- 50MB
)
ON CONFLICT (id) DO UPDATE SET
  public = false;

-- Storage Object Policies for 'website-assets'
DROP POLICY IF EXISTS "website_assets_public_read" ON storage.objects;
CREATE POLICY "website_assets_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'website-assets' OR (bucket_id = 'customer-documents' AND name LIKE 'website-assets/%'));

DROP POLICY IF EXISTS "website_assets_manager_insert" ON storage.objects;
CREATE POLICY "website_assets_manager_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    (bucket_id = 'website-assets' OR (bucket_id = 'customer-documents' AND name LIKE 'website-assets/%'))
    AND public.is_manager() = true
  );

DROP POLICY IF EXISTS "website_assets_manager_update" ON storage.objects;
CREATE POLICY "website_assets_manager_update"
  ON storage.objects FOR UPDATE
  USING (
    (bucket_id = 'website-assets' OR (bucket_id = 'customer-documents' AND name LIKE 'website-assets/%'))
    AND public.is_manager() = true
  );

DROP POLICY IF EXISTS "website_assets_manager_delete" ON storage.objects;
CREATE POLICY "website_assets_manager_delete"
  ON storage.objects FOR DELETE
  USING (
    (bucket_id = 'website-assets' OR (bucket_id = 'customer-documents' AND name LIKE 'website-assets/%'))
    AND public.is_manager() = true
  );

-- Storage Object Policies for private 'customer-documents'
DROP POLICY IF EXISTS "customer_documents_private_read" ON storage.objects;
CREATE POLICY "customer_documents_private_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'customer-documents'
    AND NOT (name LIKE 'website-assets/%')
    AND (
      public.is_staff() = true
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "customer_documents_owner_insert" ON storage.objects;
CREATE POLICY "customer_documents_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'customer-documents'
    AND (
      public.is_staff() = true
      OR auth.uid() IS NOT NULL
      OR (storage.foldername(name))[1] LIKE 'guest_%'
    )
  );
