-- =============================================================================
-- Palak Enterprises — Grant Admin Privilege to computerworldchakia@gmail.com
-- Created: 2026-09-04
-- Purpose:
-- 1. Whitelist computerworldchakia@gmail.com in RLS helper functions (is_admin, is_manager, is_staff).
-- 2. Update sync_current_user_role() and handle_new_user() triggers.
-- 3. Grant 'ADMIN' role in public.user_roles and set metadata in auth.users.
-- =============================================================================

-- 1. UPDATE is_admin()
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
        'rishavrajrj572@gmail.com',
        'computerworldchakia@gmail.com'
    ) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 2. UPDATE is_manager()
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
        'rishavrajrj572@gmail.com',
        'computerworldchakia@gmail.com'
    ) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 3. UPDATE is_staff()
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
        'rishavrajrj572@gmail.com',
        'computerworldchakia@gmail.com'
    ) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 4. UPDATE sync_current_user_role()
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
    
    IF v_email IN (
        'academysparknest@gmail.com',
        'palakenterprises@gmail.com',
        'palakprintingpress@gmail.com',
        'kumarpankaj@gmail.com',
        'rishavraj05072002@gmail.com',
        'rishavrajrj572@gmail.com',
        'computerworldchakia@gmail.com'
    ) THEN
        v_target_role := 'ADMIN';
    END IF;

    INSERT INTO public.profiles (id, full_name, email)
    VALUES (
        v_user_id,
        COALESCE(auth.jwt() ->> 'full_name', auth.jwt() ->> 'name', split_part(v_email, '@', 1), 'Palak User'),
        v_email
    )
    ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        updated_at = timezone('utc'::text, now());

    IF v_target_role = 'ADMIN' THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_user_id, 'ADMIN')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

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

-- 5. UPDATE handle_new_user()
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_clean_email TEXT;
    v_initial_role TEXT := 'CUSTOMER';
    v_full_name TEXT;
    v_avatar_url TEXT;
BEGIN
    v_clean_email := lower(coalesce(NEW.email, ''));

    IF v_clean_email IN (
        'academysparknest@gmail.com',
        'palakenterprises@gmail.com',
        'palakprintingpress@gmail.com',
        'kumarpankaj@gmail.com',
        'rishavraj05072002@gmail.com',
        'rishavrajrj572@gmail.com',
        'computerworldchakia@gmail.com'
    ) THEN
        v_initial_role := 'ADMIN';
    END IF;

    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(v_clean_email, '@', 1),
        'Palak Customer'
    );

    v_avatar_url := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture'
    );

    -- 1. Insert or update the public.profiles record
    INSERT INTO public.profiles (id, full_name, phone, email, preferred_language, avatar_url)
    VALUES (
        NEW.id,
        v_full_name,
        NEW.raw_user_meta_data->>'phone',
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en'),
        v_avatar_url
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = timezone('utc'::text, now());

    -- 2. Insert the user role into public.user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_initial_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. GRANT ADMIN ROLE TO computerworldchakia@gmail.com IF USER EXISTS
DO $$
DECLARE
    v_uid UUID;
BEGIN
    SELECT id INTO v_uid FROM auth.users WHERE lower(email) = 'computerworldchakia@gmail.com';
    IF v_uid IS NOT NULL THEN
        -- Insert ADMIN role into public.user_roles
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_uid, 'ADMIN')
        ON CONFLICT (user_id, role) DO NOTHING;

        -- Update user metadata to reflect ADMIN role
        UPDATE auth.users
        SET 
            raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "ADMIN"}'::jsonb,
            raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "ADMIN"}'::jsonb
        WHERE id = v_uid;
    END IF;
END $$;
