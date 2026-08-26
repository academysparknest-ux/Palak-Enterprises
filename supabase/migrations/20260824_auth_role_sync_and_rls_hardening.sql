-- =============================================================================
-- Palak Enterprises — Auth Role Synchronization & RLS Hardening Migration
-- Created: 2026-08-24
-- Purpose: 
-- 1. Automate admin role assignment for authorized administrators.
-- 2. Provide idempotent RPC for syncing user roles between Supabase Auth and public schema.
-- 3. Harden is_staff(), is_manager(), and is_admin() RLS security functions.
-- =============================================================================

-- 1. HARDENED SECURITY DEFINER RLS FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_email text;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'ADMIN'
    ) THEN
        RETURN true;
    END IF;

    user_email := lower(coalesce(auth.jwt() ->> 'email', ''));
    IF user_email IN (
        'academysparknest@gmail.com',
        'palakenterprises@gmail.com',
        'palakprintingpress@gmail.com',
        'kumarpankaj@gmail.com',
        'rishavraj05072002@gmail.com',
        'rishavrajrj572@gmail.com'
    ) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN AS $$
DECLARE
    user_email text;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('MANAGER', 'ADMIN')
    ) THEN
        RETURN true;
    END IF;

    user_email := lower(coalesce(auth.jwt() ->> 'email', ''));
    IF user_email IN (
        'academysparknest@gmail.com',
        'palakenterprises@gmail.com',
        'palakprintingpress@gmail.com',
        'kumarpankaj@gmail.com',
        'rishavraj05072002@gmail.com',
        'rishavrajrj572@gmail.com'
    ) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
DECLARE
    user_email text;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('STAFF', 'MANAGER', 'ADMIN')
    ) THEN
        RETURN true;
    END IF;

    user_email := lower(coalesce(auth.jwt() ->> 'email', ''));
    IF user_email IN (
        'academysparknest@gmail.com',
        'palakenterprises@gmail.com',
        'palakprintingpress@gmail.com',
        'kumarpankaj@gmail.com',
        'rishavraj05072002@gmail.com',
        'rishavrajrj572@gmail.com'
    ) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 2. SECURE ROLE SYNCHRONIZATION RPC
CREATE OR REPLACE FUNCTION public.sync_current_user_role()
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_target_role TEXT := 'CUSTOMER';
    v_current_role TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated');
    END IF;

    v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
    
    -- Check if user is an authorized admin
    IF v_email IN (
        'academysparknest@gmail.com',
        'palakenterprises@gmail.com',
        'palakprintingpress@gmail.com',
        'kumarpankaj@gmail.com',
        'rishavraj05072002@gmail.com',
        'rishavrajrj572@gmail.com'
    ) THEN
        v_target_role := 'ADMIN';
    END IF;

    -- Upsert profile
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
        v_user_id,
        COALESCE(auth.jwt() ->> 'full_name', auth.jwt() ->> 'name', split_part(v_email, '@', 1), 'Palak User'),
        v_email,
        v_target_role
    )
    ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        role = CASE 
            WHEN v_target_role = 'ADMIN' THEN 'ADMIN'
            ELSE public.profiles.role 
        END,
        updated_at = timezone('utc'::text, now());

    -- Upsert user_roles if target role is ADMIN
    IF v_target_role = 'ADMIN' THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_user_id, 'ADMIN')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    -- Return the effective highest role
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role = 'ADMIN') OR v_target_role = 'ADMIN' THEN
        v_current_role := 'ADMIN';
    ELSIF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role = 'MANAGER') THEN
        v_current_role := 'MANAGER';
    ELSIF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role = 'STAFF') THEN
        v_current_role := 'STAFF';
    ELSE
        v_current_role := 'CUSTOMER';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'userId', v_user_id,
        'email', v_email,
        'role', v_current_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution permissions
REVOKE ALL ON FUNCTION public.sync_current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_current_user_role() TO authenticated;

-- 3. HARDEN NEW USER SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_clean_email TEXT;
    v_initial_role TEXT := 'CUSTOMER';
BEGIN
    v_clean_email := lower(coalesce(NEW.email, ''));

    IF v_clean_email IN (
        'academysparknest@gmail.com',
        'palakenterprises@gmail.com',
        'palakprintingpress@gmail.com',
        'kumarpankaj@gmail.com',
        'rishavraj05072002@gmail.com',
        'rishavrajrj572@gmail.com'
    ) THEN
        v_initial_role := 'ADMIN';
    END IF;

    INSERT INTO public.profiles (id, full_name, phone, email, preferred_language, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Palak Customer'),
        NEW.raw_user_meta_data->>'phone',
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en'),
        v_initial_role
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        role = CASE WHEN v_initial_role = 'ADMIN' THEN 'ADMIN' ELSE public.profiles.role END;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_initial_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
