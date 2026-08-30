-- ============================================================
-- ID Card Management System: Schema Alignment for idcard_persons
-- Date: 2026-08-30
-- Description: Ensures idcard_persons has custom_fields, emergency_number,
-- and status columns, and refreshes the PostgREST schema cache.
-- ============================================================

-- 1. Add custom_fields column if missing
ALTER TABLE public.idcard_persons
ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Add emergency_number column if missing
ALTER TABLE public.idcard_persons
ADD COLUMN IF NOT EXISTS emergency_number TEXT;

-- 3. Add status column if missing
ALTER TABLE public.idcard_persons
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'DRAFT';

-- 4. Create GIN index for custom_fields JSON queries if not exists
CREATE INDEX IF NOT EXISTS idx_idcard_persons_custom_fields
ON public.idcard_persons USING GIN (custom_fields);

-- 5. Force reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';