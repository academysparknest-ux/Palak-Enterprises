-- ==============================================================================
-- PALAK ENTERPRISES — ONLINE DIGITAL ID CARD & QR VERIFICATION SYSTEM
-- Migration: 20260830_online_digital_id_system.sql
-- ==============================================================================

-- 1. ADD OPTIONAL SUPPORT COLUMNS TO IDCARD_PERSONS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'idcard_persons' AND column_name = 'person_type') THEN
        ALTER TABLE public.idcard_persons ADD COLUMN person_type TEXT NOT NULL DEFAULT 'student' CHECK (person_type IN ('student', 'teacher', 'staff', 'employee'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'idcard_persons' AND column_name = 'employee_id') THEN
        ALTER TABLE public.idcard_persons ADD COLUMN employee_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'idcard_persons' AND column_name = 'designation') THEN
        ALTER TABLE public.idcard_persons ADD COLUMN designation TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'idcard_persons' AND column_name = 'department') THEN
        ALTER TABLE public.idcard_persons ADD COLUMN department TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'idcard_persons' AND column_name = 'email') THEN
        ALTER TABLE public.idcard_persons ADD COLUMN email TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'idcard_persons' AND column_name = 'emergency_number') THEN
        ALTER TABLE public.idcard_persons ADD COLUMN emergency_number TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'idcard_persons' AND column_name = 'status') THEN
        ALTER TABLE public.idcard_persons ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'transferred', 'archived'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'idcard_persons' AND column_name = 'joining_date') THEN
        ALTER TABLE public.idcard_persons ADD COLUMN joining_date DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'idcard_persons' AND column_name = 'verification_token') THEN
        ALTER TABLE public.idcard_persons ADD COLUMN verification_token TEXT UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'idcard_persons' AND column_name = 'extra_fields') THEN
        ALTER TABLE public.idcard_persons ADD COLUMN extra_fields JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. ADD OPTIONAL SUPPORT COLUMNS TO IDCARD_PROJECTS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'idcard_projects' AND column_name = 'logo_url') THEN
        ALTER TABLE public.idcard_projects ADD COLUMN logo_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'idcard_projects' AND column_name = 'organization_type') THEN
        ALTER TABLE public.idcard_projects ADD COLUMN organization_type TEXT DEFAULT 'School';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'idcard_projects' AND column_name = 'contact_phone') THEN
        ALTER TABLE public.idcard_projects ADD COLUMN contact_phone TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'idcard_projects' AND column_name = 'contact_email') THEN
        ALTER TABLE public.idcard_projects ADD COLUMN contact_email TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'idcard_projects' AND column_name = 'website') THEN
        ALTER TABLE public.idcard_projects ADD COLUMN website TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'idcard_projects' AND column_name = 'address') THEN
        ALTER TABLE public.idcard_projects ADD COLUMN address TEXT;
    END IF;
END $$;

-- Indexes for lightning fast QR lookups
CREATE INDEX IF NOT EXISTS idx_idcard_persons_student_id_lookup ON public.idcard_persons(student_id);
CREATE INDEX IF NOT EXISTS idx_idcard_persons_employee_id_lookup ON public.idcard_persons(employee_id);
CREATE INDEX IF NOT EXISTS idx_idcard_persons_verification_token ON public.idcard_persons(verification_token);

-- 3. SECURE PUBLIC VERIFICATION RPC FUNCTION (SECURITY DEFINER)
-- Allows public visitors / smartphones to verify an ID without table SELECT permissions
CREATE OR REPLACE FUNCTION public.verify_digital_id(p_identifier TEXT)
RETURNS JSONB AS $$
DECLARE
    v_clean TEXT;
    v_person RECORD;
    v_project RECORD;
    v_person_type TEXT;
    v_masked_phone TEXT := NULL;
    v_masked_emergency TEXT := NULL;
    v_photo_full_url TEXT := NULL;
    v_fields JSONB := '{}'::jsonb;
    v_org JSONB := '{}'::jsonb;
    v_normalized_status TEXT := 'active';
    v_raw_id TEXT;
BEGIN
    -- 1. Input sanitization
    v_clean := TRIM(COALESCE(p_identifier, ''));
    IF v_clean = '' OR LENGTH(v_clean) > 128 THEN
        RETURN jsonb_build_object('status', 'invalid', 'error', 'INVALID_IDENTIFIER');
    END IF;

    -- 2. Lookup Person Record
    -- Try multiple identifier matching strategies:
    -- a) Exact student_id or employee_id or verification_token
    -- b) student_id with .jpg extension or stripped prefix
    -- c) UUID match
    SELECT * INTO v_person
    FROM public.idcard_persons
    WHERE 
        LOWER(student_id) = LOWER(v_clean)
        OR LOWER(student_id) = LOWER(v_clean || '.jpg')
        OR LOWER(student_id) = LOWER(REGEXP_REPLACE(v_clean, '^(stu-|stu_|student-|id-)', '', 'i'))
        OR LOWER(student_id) = LOWER(REGEXP_REPLACE(v_clean, '^(stu-|stu_|student-|id-)', '', 'i') || '.jpg')
        OR (employee_id IS NOT NULL AND (
            LOWER(employee_id) = LOWER(v_clean)
            OR LOWER(employee_id) = LOWER(REGEXP_REPLACE(v_clean, '^(tch-|tch_|teacher-|emp-|emp_)', '', 'i'))
        ))
        OR (verification_token IS NOT NULL AND LOWER(verification_token) = LOWER(v_clean))
        OR (
            v_clean ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            AND id = v_clean::uuid
        )
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'invalid', 'error', 'RECORD_NOT_FOUND');
    END IF;

    -- 3. Lookup Organization / Project
    SELECT * INTO v_project
    FROM public.idcard_projects
    WHERE id = v_person.project_id;

    -- 4. Determine Role (Student vs Teacher)
    IF v_person.person_type IN ('teacher', 'staff', 'employee')
       OR v_person.designation IS NOT NULL
       OR v_person.department IS NOT NULL
       OR (v_person.employee_id IS NOT NULL AND v_person.employee_id <> '')
       OR v_clean ILIKE 'tch-%'
       OR v_clean ILIKE 't-%'
       OR v_clean ILIKE 'emp-%' THEN
        v_person_type := 'teacher';
    ELSE
        v_person_type := 'student';
    END IF;

    -- 5. Format Masked Phone Numbers (Privacy Hardening: 9876543210 -> ******3210)
    IF v_person.phone IS NOT NULL AND LENGTH(TRIM(v_person.phone)) >= 4 THEN
        v_masked_phone := '******' || RIGHT(TRIM(v_person.phone), 4);
    END IF;

    IF v_person.emergency_number IS NOT NULL AND LENGTH(TRIM(v_person.emergency_number)) >= 4 THEN
        v_masked_emergency := '******' || RIGHT(TRIM(v_person.emergency_number), 4);
    END IF;

    -- 6. Format Photo Public URL
    IF v_person.photo_url IS NOT NULL AND TRIM(v_person.photo_url) <> '' THEN
        IF v_person.photo_url LIKE 'http%' THEN
            v_photo_full_url := v_person.photo_url;
        ELSE
            v_photo_full_url := 'https://zofddiuswdtbqvqycezy.supabase.co/storage/v1/object/public/idcard-photos/' || v_person.photo_url;
        END IF;
    END IF;

    -- 7. Normalize Status
    IF v_person.status IN ('inactive', 'transferred', 'archived') THEN
        v_normalized_status := 'inactive';
    ELSIF v_person.status = 'expired' THEN
        v_normalized_status := 'expired';
    ELSE
        v_normalized_status := 'active';
    END IF;

    -- 8. Build Clean Display ID
    IF v_person_type = 'teacher' THEN
        v_raw_id := COALESCE(v_person.employee_id, v_person.student_id);
    ELSE
        v_raw_id := REGEXP_REPLACE(COALESCE(v_person.student_id, ''), '\.jpg$', '', 'i');
    END IF;

    -- 9. Construct Dynamic Dynamic Field Key-Values (Only Non-Empty Values)
    IF v_person_type = 'student' THEN
        IF v_raw_id IS NOT NULL AND v_raw_id <> '' THEN
            v_fields := v_fields || jsonb_build_object('studentId', v_raw_id);
        END IF;
        IF v_person.class IS NOT NULL AND TRIM(v_person.class) <> '' THEN
            v_fields := v_fields || jsonb_build_object('class', TRIM(v_person.class));
        END IF;
        IF v_person.section IS NOT NULL AND TRIM(v_person.section) <> '' THEN
            v_fields := v_fields || jsonb_build_object('section', TRIM(v_person.section));
        END IF;
        IF v_person.roll_number IS NOT NULL AND TRIM(v_person.roll_number) <> '' THEN
            v_fields := v_fields || jsonb_build_object('rollNumber', TRIM(v_person.roll_number));
        END IF;
        IF v_person.blood_group IS NOT NULL AND TRIM(v_person.blood_group) <> '' THEN
            v_fields := v_fields || jsonb_build_object('bloodGroup', TRIM(v_person.blood_group));
        END IF;
        IF v_person.father_name IS NOT NULL AND TRIM(v_person.father_name) <> '' THEN
            v_fields := v_fields || jsonb_build_object('fatherName', TRIM(v_person.father_name));
        END IF;
        IF v_person.mother_name IS NOT NULL AND TRIM(v_person.mother_name) <> '' THEN
            v_fields := v_fields || jsonb_build_object('motherName', TRIM(v_person.mother_name));
        END IF;
        IF v_person.date_of_birth IS NOT NULL THEN
            v_fields := v_fields || jsonb_build_object('dateOfBirth', v_person.date_of_birth::text);
        END IF;
        IF v_masked_phone IS NOT NULL THEN
            v_fields := v_fields || jsonb_build_object('phone', v_masked_phone);
        END IF;
        IF v_masked_emergency IS NOT NULL THEN
            v_fields := v_fields || jsonb_build_object('emergencyNumber', v_masked_emergency);
        END IF;
        IF v_person.address IS NOT NULL AND TRIM(v_person.address) <> '' THEN
            v_fields := v_fields || jsonb_build_object('address', TRIM(v_person.address));
        END IF;
        IF v_project.academic_year IS NOT NULL AND TRIM(v_project.academic_year) <> '' THEN
            v_fields := v_fields || jsonb_build_object('academicYear', TRIM(v_project.academic_year));
        END IF;
    ELSE
        -- Teacher Fields
        IF v_raw_id IS NOT NULL AND v_raw_id <> '' THEN
            v_fields := v_fields || jsonb_build_object('employeeId', v_raw_id);
        END IF;
        IF v_person.designation IS NOT NULL AND TRIM(v_person.designation) <> '' THEN
            v_fields := v_fields || jsonb_build_object('designation', TRIM(v_person.designation));
        END IF;
        IF v_person.department IS NOT NULL AND TRIM(v_person.department) <> '' THEN
            v_fields := v_fields || jsonb_build_object('department', TRIM(v_person.department));
        END IF;
        IF v_person.email IS NOT NULL AND TRIM(v_person.email) <> '' THEN
            v_fields := v_fields || jsonb_build_object('email', TRIM(v_person.email));
        END IF;
        IF v_person.blood_group IS NOT NULL AND TRIM(v_person.blood_group) <> '' THEN
            v_fields := v_fields || jsonb_build_object('bloodGroup', TRIM(v_person.blood_group));
        END IF;
        IF v_person.joining_date IS NOT NULL THEN
            v_fields := v_fields || jsonb_build_object('joiningDate', v_person.joining_date::text);
        END IF;
        IF v_masked_phone IS NOT NULL THEN
            v_fields := v_fields || jsonb_build_object('phone', v_masked_phone);
        END IF;
        IF v_masked_emergency IS NOT NULL THEN
            v_fields := v_fields || jsonb_build_object('emergencyNumber', v_masked_emergency);
        END IF;
        IF v_person.address IS NOT NULL AND TRIM(v_person.address) <> '' THEN
            v_fields := v_fields || jsonb_build_object('address', TRIM(v_person.address));
        END IF;
    END IF;

    -- 10. Organization Snapshot
    v_org := jsonb_build_object(
        'name', COALESCE(v_project.name, 'Institution'),
        'academicYear', COALESCE(v_project.academic_year, 'Current Session'),
        'logoUrl', v_project.logo_url,
        'website', v_project.website,
        'address', v_project.address,
        'phone', v_project.contact_phone
    );

    -- 11. Return Unified Verification Payload
    RETURN jsonb_build_object(
        'status', v_normalized_status,
        'personType', v_person_type,
        'verificationStatus', CASE 
            WHEN v_normalized_status = 'active' THEN 'VERIFIED'
            WHEN v_normalized_status = 'inactive' THEN 'INACTIVE'
            WHEN v_normalized_status = 'expired' THEN 'EXPIRED'
            ELSE 'INVALID'
        END,
        'name', v_person.name,
        'id', v_raw_id,
        'photoUrl', v_photo_full_url,
        'organization', v_org,
        'fields', v_fields,
        'verifiedAt', timezone('utc'::text, now())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 4. PERMISSIONS HARDENING
REVOKE ALL ON FUNCTION public.verify_digital_id(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_digital_id(TEXT) TO anon, authenticated;
