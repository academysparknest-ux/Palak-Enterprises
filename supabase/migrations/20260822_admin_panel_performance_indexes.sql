-- ==============================================================================
-- Migration: 20260822_admin_panel_performance_indexes.sql
-- Goal: High-performance composite and single-column indexes for Admin Panel
-- ==============================================================================

-- 1. Orders Table Indexes for Admin Queue & Filtering
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders(order_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_created ON public.orders(payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_code ON public.orders(order_code);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- 2. Order Items Table Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- 3. Service Requests Table Indexes
CREATE INDEX IF NOT EXISTS idx_service_requests_status_created ON public.service_requests(request_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_code ON public.service_requests(request_code);
CREATE INDEX IF NOT EXISTS idx_service_requests_user_id ON public.service_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON public.service_requests(created_at DESC);

-- 4. Quote Requests Table Indexes
CREATE INDEX IF NOT EXISTS idx_quote_requests_status_created ON public.quote_requests(quote_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_requests_code ON public.quote_requests(quote_code);
CREATE INDEX IF NOT EXISTS idx_quote_requests_user_id ON public.quote_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_created_at ON public.quote_requests(created_at DESC);

-- 5. Design Requests Table Indexes
CREATE INDEX IF NOT EXISTS idx_design_requests_status_created ON public.design_requests(design_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_design_requests_user_id ON public.design_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_design_requests_created_at ON public.design_requests(created_at DESC);

-- 6. Status History Table Indexes
CREATE INDEX IF NOT EXISTS idx_order_status_history_entity ON public.order_status_history(entity_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_history_entity_created ON public.status_history(entity_type, entity_code, created_at DESC);
