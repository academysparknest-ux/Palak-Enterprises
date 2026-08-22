-- ==============================================================================
-- PALAK ENTERPRISES — PUBLIC INVOICE AUTHENTICITY VERIFICATION RPC (HARDENED)
-- Migration: 20260822_invoice_verification_rpc.sql
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.verify_invoice_authenticity(p_invoice_number TEXT)
RETURNS JSONB AS $$
DECLARE
    v_clean_num TEXT;
    v_is_uuid BOOLEAN;
    v_inv RECORD;
    v_status TEXT;
    v_is_cancelled BOOLEAN;
BEGIN
    -- 1. Input sanitization & canonical normalization
    v_clean_num := UPPER(TRIM(COALESCE(p_invoice_number, '')));

    -- 2. Reject empty, overly long, control chars, or wildcard-containing inputs
    IF v_clean_num = '' OR LENGTH(v_clean_num) > 64 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_INVOICE_IDENTIFIER'
        );
    END IF;

    -- 3. Strict format whitelist: Alphanumeric with hyphens, underscores, slashes
    IF v_clean_num !~ '^[A-Z0-9\-_/]+$' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_INVOICE_IDENTIFIER'
        );
    END IF;

    -- 4. Reject unpersisted client-side draft or temporary bill prefixes
    IF v_clean_num LIKE 'TEMP-%' OR v_clean_num LIKE 'DRAFT-%' OR v_clean_num LIKE 'LOCAL-%' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_INVOICE_IDENTIFIER'
        );
    END IF;

    -- 5. Safe UUID test before UUID casting
    v_is_uuid := (p_invoice_number ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

    -- 6. Authoritative Database Lookup (Parameterized)
    IF v_is_uuid THEN
        SELECT * INTO v_inv
        FROM public.invoices
        WHERE UPPER(invoice_number) = v_clean_num
           OR id = p_invoice_number::UUID
        ORDER BY created_at DESC
        LIMIT 1;
    ELSE
        SELECT * INTO v_inv
        FROM public.invoices
        WHERE UPPER(invoice_number) = v_clean_num
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    -- 7. Not found in authoritative ledger
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVOICE_NOT_FOUND'
        );
    END IF;

    -- 8. Consistent Status Determination
    v_status := UPPER(COALESCE(v_inv.status, 'ISSUED'));
    v_is_cancelled := (v_status IN ('CANCELLED', 'VOID'));

    -- 9. Return strictly sanitized public fields (Zero customer PII or DB internals)
    RETURN jsonb_build_object(
        'success', true,
        'isValid', (NOT v_is_cancelled),
        'isCancelled', v_is_cancelled,
        'invoiceNumber', v_inv.invoice_number,
        'invoiceDate', v_inv.invoice_date,
        'completionDate', v_inv.completion_date,
        'documentType', COALESCE(v_inv.document_type, 'TAX_INVOICE'),
        'financialYear', COALESCE(v_inv.financial_year, '2026-27'),
        'orderCode', v_inv.order_code,
        'source', COALESCE(v_inv.source, 'OFFICIAL'),
        'totalAmount', COALESCE(v_inv.total_amount, 0.00),
        'amountPaid', COALESCE(v_inv.amount_paid, 0.00),
        'amountDue', COALESCE(v_inv.amount_due, 0.00),
        'paymentStatus', COALESCE(v_inv.payment_status, 'pending'),
        'paymentMethod', COALESCE(v_inv.payment_method, 'pay_at_store'),
        'status', v_status,
        'businessName', 'Palak Enterprises',
        'itemCount', jsonb_array_length(COALESCE(v_inv.items, '[]'::jsonb)),
        'cancellationReason', v_inv.cancellation_reason,
        'verifiedAt', timezone('utc'::text, now())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Revoke all default execution rights, grant strictly to anon and authenticated roles
REVOKE ALL ON FUNCTION public.verify_invoice_authenticity(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_invoice_authenticity(TEXT) TO anon, authenticated;
