-- ==============================================================================
-- PALAK ENTERPRISES — ID CARD PUBLIC VERIFICATION & ATOMIC SESSION PROMOTION
-- Migration: 20260824_idcard_public_verification_and_promotion.sql
-- ==============================================================================

-- 1. Public ID Card QR Verification RPC (SECURITY DEFINER)
-- Allows public smartphone scans without exposing sensitive PII or requiring table SELECT permissions
CREATE OR REPLACE FUNCTION public.verify_idcard_by_token(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
    v_clean_token TEXT;
    v_card RECORD;
    v_person RECORD;
    v_group RECORD;
    v_session RECORD;
    v_project RECORD;
    v_privacy JSONB;
    v_is_expired BOOLEAN := false;
    v_is_revoked BOOLEAN := false;
    v_revocation_reason TEXT := NULL;
    v_data JSONB;
BEGIN
    -- 1. Input sanitization
    v_clean_token := TRIM(COALESCE(p_token, ''));
    IF v_clean_token = '' OR LENGTH(v_clean_token) > 128 THEN
        RETURN jsonb_build_object('status', 'invalid');
    END IF;

    -- 2. Lookup Generated Card
    SELECT * INTO v_card
    FROM public.idcard_generated_cards
    WHERE qr_token = v_clean_token
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'invalid');
    END IF;

    -- Check card status
    IF v_card.status = 'cancelled' THEN
        RETURN jsonb_build_object(
            'status', 'revoked',
            'data', jsonb_build_object('reason', 'Card has been cancelled')
        );
    END IF;

    -- 3. Lookup Person
    SELECT * INTO v_person
    FROM public.idcard_persons
    WHERE id = v_card.person_id;

    IF FOUND THEN
        IF v_person.status IN ('left', 'transferred', 'archived') THEN
            v_is_revoked := true;
            v_revocation_reason := 'Person status: ' || v_person.status;
        END IF;

        IF v_person.group_id IS NOT NULL THEN
            SELECT * INTO v_group
            FROM public.idcard_groups
            WHERE id = v_person.group_id;
        END IF;
    END IF;

    -- 4. Lookup Session
    IF v_card.session_id IS NOT NULL THEN
        SELECT * INTO v_session
        FROM public.idcard_sessions
        WHERE id = v_card.session_id;

        IF FOUND AND v_session.end_date IS NOT NULL THEN
            IF v_session.end_date < CURRENT_DATE THEN
                v_is_expired := true;
            END IF;
        END IF;
    END IF;

    -- 5. Lookup Project & Privacy Settings
    SELECT * INTO v_project
    FROM public.idcard_projects
    WHERE id = v_card.project_id;

    v_privacy := COALESCE(v_project.settings->'verificationPrivacy', '{}'::jsonb);

    -- If revoked
    IF v_is_revoked THEN
        RETURN jsonb_build_object(
            'status', 'revoked',
            'data', jsonb_build_object('reason', v_revocation_reason)
        );
    END IF;

    -- If expired
    IF v_is_expired THEN
        RETURN jsonb_build_object(
            'status', 'expired',
            'data', jsonb_build_object(
                'sessionName', COALESCE(v_session.name, 'Past Session'),
                'cardNumber', v_card.card_number
            )
        );
    END IF;

    -- 6. Construct Authorized Response Payload
    v_data := jsonb_build_object(
        'cardNumber', v_card.card_number,
        'isActive', (v_person.status = 'active')
    );

    IF (v_privacy->>'showName')::boolean IS NOT FALSE AND v_person.display_name IS NOT NULL THEN
        v_data := v_data || jsonb_build_object('name', v_person.display_name);
    END IF;

    IF (v_privacy->>'showId')::boolean IS NOT FALSE AND v_person.person_code IS NOT NULL THEN
        v_data := v_data || jsonb_build_object('id', v_person.person_code);
    END IF;

    IF (v_privacy->>'showOrganization')::boolean IS NOT FALSE AND v_project.name IS NOT NULL THEN
        v_data := v_data || jsonb_build_object('organization', v_project.name);
    END IF;

    IF (v_privacy->>'showRole')::boolean IS NOT FALSE AND v_group.name IS NOT NULL THEN
        v_data := v_data || jsonb_build_object('group', v_group.name);
    END IF;

    IF (v_privacy->>'showSession')::boolean IS NOT FALSE AND v_session.name IS NOT NULL THEN
        v_data := v_data || jsonb_build_object('session', v_session.name);
    END IF;

    IF (v_privacy->>'showIssueDate')::boolean IS NOT FALSE AND v_card.generated_at IS NOT NULL THEN
        v_data := v_data || jsonb_build_object('issueDate', v_card.generated_at);
    END IF;

    IF (v_privacy->>'showPhoto')::boolean IS NOT FALSE AND v_card.photo_snapshot_url IS NOT NULL THEN
        v_data := v_data || jsonb_build_object('photo', v_card.photo_snapshot_url);
    END IF;

    RETURN jsonb_build_object(
        'status', 'valid',
        'data', v_data
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Revoke default public execution & grant to anon, authenticated
REVOKE ALL ON FUNCTION public.verify_idcard_by_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_idcard_by_token(TEXT) TO anon, authenticated;


-- 2. Atomic Server-Side Session Promotion RPC (SECURITY DEFINER)
-- Promotes active persons from one session to another without downloading large datasets to the client
CREATE OR REPLACE FUNCTION public.promote_idcard_session(
    p_project_id UUID,
    p_source_session_id UUID,
    p_target_session_id UUID,
    p_field_mappings JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_source_session RECORD;
    v_target_session RECORD;
    v_record RECORD;
    v_promoted_count INTEGER := 0;
    v_skipped_count INTEGER := 0;
    v_new_record_id UUID;
    v_mapping_key TEXT;
    v_mapping_val TEXT;
    v_field RECORD;
    v_curr_val TEXT;
    v_new_val TEXT;
BEGIN
    -- 1. Validate permissions
    IF NOT public.is_manager() THEN
        RAISE EXCEPTION 'Unauthorized: Manager role required for session promotion';
    END IF;

    -- 2. Validate sessions
    SELECT * INTO v_source_session FROM public.idcard_sessions WHERE id = p_source_session_id AND project_id = p_project_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source session not found';
    END IF;

    SELECT * INTO v_target_session FROM public.idcard_sessions WHERE id = p_target_session_id AND project_id = p_project_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target session not found';
    END IF;

    -- 3. Iterate through active records in the source session
    FOR v_record IN
        SELECT sr.id AS session_record_id, sr.person_id, p.status AS person_status
        FROM public.idcard_session_records sr
        JOIN public.idcard_persons p ON p.id = sr.person_id
        WHERE sr.session_id = p_source_session_id
          AND sr.status = 'active'
          AND p.status = 'active'
    LOOP
        -- Check if person already has a record in the target session
        IF EXISTS (SELECT 1 FROM public.idcard_session_records WHERE session_id = p_target_session_id AND person_id = v_record.person_id) THEN
            v_skipped_count := v_skipped_count + 1;
            CONTINUE;
        END IF;

        -- Create target session record
        INSERT INTO public.idcard_session_records (session_id, person_id, status)
        VALUES (p_target_session_id, v_record.person_id, 'active')
        RETURNING id INTO v_new_record_id;

        -- Copy and transform session field values
        FOR v_field IN
            SELECT sfv.field_id, sfv.value, f.field_key
            FROM public.idcard_session_field_values sfv
            JOIN public.idcard_project_fields f ON f.id = sfv.field_id
            WHERE sfv.session_record_id = v_record.session_record_id
        LOOP
            v_curr_val := v_field.value;
            v_new_val := v_curr_val;

            -- Apply field promotion mapping if configured
            -- e.g. p_field_mappings = { "class": { "Class 4": "Class 5", "Class 5": "Class 6" } }
            IF p_field_mappings ? v_field.field_key THEN
                IF (p_field_mappings->v_field.field_key) ? v_curr_val THEN
                    v_new_val := p_field_mappings->v_field.field_key->>v_curr_val;
                END IF;
            END IF;

            INSERT INTO public.idcard_session_field_values (session_record_id, field_id, value)
            VALUES (v_new_record_id, v_field.field_id, v_new_val);
        END LOOP;

        v_promoted_count := v_promoted_count + 1;
    END LOOP;

    -- 4. Log Audit Event
    INSERT INTO public.idcard_audit_logs (
        project_id,
        entity_type,
        entity_id,
        action,
        actor_name,
        details
    ) VALUES (
        p_project_id,
        'session_promotion',
        p_target_session_id::TEXT,
        'PROMOTED_SESSION_RECORDS',
        'Admin',
        jsonb_build_object(
            'sourceSession', v_source_session.name,
            'targetSession', v_target_session.name,
            'promotedCount', v_promoted_count,
            'skippedCount', v_skipped_count
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'promotedCount', v_promoted_count,
        'skippedCount', v_skipped_count,
        'sourceSession', v_source_session.name,
        'targetSession', v_target_session.name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Revoke default public execution & grant to authenticated
REVOKE ALL ON FUNCTION public.promote_idcard_session(UUID, UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_idcard_session(UUID, UUID, UUID, JSONB) TO authenticated;
