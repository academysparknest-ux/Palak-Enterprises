-- Fix handle_new_user() trigger function to remove non-existent 'role' column from profiles
-- Roles are stored exclusively in public.user_roles table.

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
        'rishavrajrj572@gmail.com'
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

-- Clean up redundant trigger if present
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;

-- Ensure on_auth_user_created trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
