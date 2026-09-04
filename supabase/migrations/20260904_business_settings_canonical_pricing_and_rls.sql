-- ==============================================================================
-- Migration: Canonical Print Pricing Configuration, RLS Policies, & Realtime
-- Date: 2026-09-04
-- ==============================================================================

ALTER TABLE public.business_settings REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'business_settings'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.business_settings;
    END IF;
  END IF;
END $$;

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'business_settings' 
      AND policyname = 'Public business settings are viewable'
  ) THEN
    CREATE POLICY "Public business settings are viewable" 
      ON public.business_settings FOR SELECT 
      USING (true);
  END IF;
END $$;

DROP POLICY IF EXISTS "Staff can insert business settings" ON public.business_settings;
CREATE POLICY "Staff can insert business settings" 
  ON public.business_settings FOR INSERT 
  WITH CHECK (is_staff() = true);

DROP POLICY IF EXISTS "Staff can update business settings" ON public.business_settings;
CREATE POLICY "Staff can update business settings" 
  ON public.business_settings FOR UPDATE 
  USING (is_staff() = true)
  WITH CHECK (is_staff() = true);

DROP POLICY IF EXISTS "Staff can delete business settings" ON public.business_settings;
CREATE POLICY "Staff can delete business settings" 
  ON public.business_settings FOR DELETE 
  USING (is_admin() = true);

INSERT INTO public.business_settings (key, value, description, updated_at)
VALUES (
  'print_pricing_config',
  '{"documentPrinting":{"paperSizes":{"a4":{"name":"A4 (Standard 210 × 297 mm)","multiplier":1,"enabled":true},"a3":{"name":"A3 (Large 297 × 420 mm)","multiplier":2,"enabled":true},"a5":{"name":"A5 (Booklet 148 × 210 mm)","multiplier":0.75,"enabled":true}},"baseRatePerPage":{"bwSingle":2,"bwDouble":1.5,"colorSingle":10,"colorDouble":9},"finishing":{"spiralBinding":{"id":"spiral_binding","name":{"en":"Spiral Binding (Plastic Coil and Transparent Covers)","hi":"स्पाइरल बाइंडिंग (प्लास्टिक कॉइल व पारदर्शी कवर)"},"enabled":true,"price":30,"minPages":1},"combBinding":{"id":"comb_binding","name":{"en":"Comb Binding (Ring Spine and Protective Covers)","hi":"कॉम्ब बाइंडिंग (रिंग स्पाइन व सुरक्षा कवर)"},"enabled":true,"price":25,"minPages":1},"lamination":{"id":"lamination","name":{"en":"Thermal Lamination (Durable Waterproof Seal)","hi":"थर्मल लैमिनेशन (वॉटरप्रूफ सुरक्षा शीट)"},"enabled":true,"pricePerPage":15},"stapling":{"id":"stapling","name":{"en":"Corner / Saddle Stapling","hi":"कॉर्नर स्टेपलिंग (पिन लगाना)"},"enabled":true,"price":5}}},"passportPhoto":{"sheet8":50,"sheet16":90,"sheet32":160,"singlePrint":20},"visitingCards":{"base100Single":250,"base100Double":400,"base500Single":850,"base500Double":1200,"base1000Single":1500,"base1000Double":2000,"matteFinishExtra":50,"glossFinishExtra":50,"velvetFinishExtra":150},"idCards":{"pvcSingle":60,"pvcDouble":80,"withLanyardHolder":25},"posters":{"a4Photo":20,"a3Glossy":40,"a2Photo":120,"vinylPerSqFt":45,"flexPerSqFt":18}}'::jsonb,
  'Authoritative pricing configuration for instant online printing services',
  NOW()
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = EXCLUDED.updated_at;
