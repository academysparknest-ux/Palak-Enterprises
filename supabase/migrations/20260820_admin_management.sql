-- ============================================================================
-- PALAK ENTERPRISES — Admin Website Management & Control Center
-- Migration: 20260820_admin_management.sql
-- ============================================================================

-- 1. Admin Notifications Table (staff-scoped, separate from customer notifications)
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT,
  entity_type TEXT,
  entity_id TEXT,
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Website Content Management Table
CREATE TABLE IF NOT EXISTS public.website_content (
  id TEXT PRIMARY KEY,
  section TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 3. Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_content ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for admin_notifications
CREATE POLICY "staff_select_admin_notifications"
  ON public.admin_notifications FOR SELECT
  USING (public.is_staff());

CREATE POLICY "staff_insert_admin_notifications"
  ON public.admin_notifications FOR INSERT
  WITH CHECK (public.is_staff());

CREATE POLICY "staff_update_admin_notifications"
  ON public.admin_notifications FOR UPDATE
  USING (public.is_staff());

CREATE POLICY "staff_delete_admin_notifications"
  ON public.admin_notifications FOR DELETE
  USING (public.is_admin());

-- 5. RLS Policies for website_content
CREATE POLICY "public_read_active_website_content"
  ON public.website_content FOR SELECT
  USING (is_active = true OR public.is_staff());

CREATE POLICY "staff_insert_website_content"
  ON public.website_content FOR INSERT
  WITH CHECK (public.is_staff());

CREATE POLICY "staff_update_website_content"
  ON public.website_content FOR UPDATE
  USING (public.is_staff());

CREATE POLICY "admin_delete_website_content"
  ON public.website_content FOR DELETE
  USING (public.is_admin());

-- 6. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created
  ON public.admin_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread
  ON public.admin_notifications(is_read)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_admin_notifications_type
  ON public.admin_notifications(notification_type);

CREATE INDEX IF NOT EXISTS idx_website_content_section
  ON public.website_content(section);

CREATE INDEX IF NOT EXISTS idx_website_content_active
  ON public.website_content(is_active)
  WHERE is_active = true;

-- 7. Seed default website content sections
INSERT INTO public.website_content (id, section, content, is_active, sort_order) VALUES
  ('hero_main', 'hero', '{
    "heading_en": "Palak Enterprises",
    "heading_hi": "पालक इंटरप्राइजेज",
    "subtitle_en": "Printing & Digital Services, All in One Place",
    "subtitle_hi": "आपकी हर प्रिंटिंग और ऑनलाइन सेवा, एक ही जगह",
    "cta_text_en": "Explore Services",
    "cta_text_hi": "सेवाएँ देखें",
    "hero_image": ""
  }'::jsonb, true, 1),
  ('promo_1', 'promo', '{
    "heading_en": "Fast & Reliable Printing",
    "heading_hi": "तेज़ और भरोसेमंद प्रिंटिंग",
    "description_en": "Get your documents printed with premium quality and quick turnaround.",
    "description_hi": "प्रीमियम क्वालिटी और तेज़ डिलीवरी के साथ अपने दस्तावेज प्रिंट करवाएं।",
    "image": ""
  }'::jsonb, true, 2),
  ('business_info', 'business_info', '{
    "phone_primary": "9905238015",
    "phone_secondary": "7324964770",
    "whatsapp": "919905238015",
    "address_en": "Ward No. 7, Saniganj Mohalla, Near Block Gate, Chakia, East Champaran, Bihar - 845412",
    "address_hi": "वार्ड नं. 7, सनिगंज मोहल्ला, ब्लॉक गेट के पास, चकिया, पूर्वी चंपारण, बिहार - 845412",
    "hours_en": "Monday - Saturday: 8:00 AM - 8:00 PM | Sunday: 9:00 AM - 5:00 PM",
    "hours_hi": "सोमवार - शनिवार: सुबह 8:00 से शाम 8:00 बजे | रविवार: सुबह 9:00 से शाम 5:00 बजे"
  }'::jsonb, true, 3)
ON CONFLICT (id) DO NOTHING;

-- 8. Add Realtime support (if publication exists)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'supabase_realtime publication not found, skipping realtime for admin_notifications.';
  WHEN duplicate_object THEN
    RAISE NOTICE 'admin_notifications already in supabase_realtime publication.';
END
$$;
