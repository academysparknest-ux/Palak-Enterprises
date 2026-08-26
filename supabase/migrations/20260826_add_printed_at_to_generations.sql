-- Migration: Add printed_at timestamp to idcard_generations
-- Tracks when a generated card was confirmed as physically printed.
-- This is an additive, backward-compatible change — existing rows get NULL.

ALTER TABLE public.idcard_generations
  ADD COLUMN IF NOT EXISTS printed_at TIMESTAMPTZ DEFAULT NULL;

-- Index for efficient queries filtering printed vs unprinted cards
CREATE INDEX IF NOT EXISTS idx_idcard_generations_printed_at
  ON public.idcard_generations (printed_at)
  WHERE printed_at IS NOT NULL;
