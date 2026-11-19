-- =============================================================================
-- Steely Platform - Migration 0004 (SPRINT15_011 - QA & SEC)
-- Especificacao e Testes das Regras de Arbitragem (Dupla Aprovacao > R$ 500),
-- Trilha de Auditoria Imutavel SHA-256 (ADR-05) e Anonimizacao LGPD 30d (ADR-07)
--
-- Includes:
--   1. Schema 'audit': partitioned system_and_access_logs (12m) &
--      financial_and_dispute_logs (60m/5y) with SHA-256 hash-chaining triggers,
--      anti-UPDATE/DELETE triggers, private.audit_log() & private.audit_verify()
--   2. Arbitration & Dual Approval (ADR-06): escrow.arbitration_decisions,
--      escrow.moderation_approvals, constraint > R$ 500 (50000 cents) requiring
--      2 distinct moderators, private.register_arbitration_approval()
--   3. LGPD 30-Day Anonymization (ADR-07): public.account_deletion_requests,
--      private.request_account_deletion(), private.anonimizar_usuario(),
--      private.sweep_lgpd_anonymization_30d()
--   4. Automated QA & Security In-Database Test Suite:
--      private.run_qa_sec_validation_suite()
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Schema 'audit' & Partitioned Append-Only Tables (ADR-05)
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS audit;

REVOKE ALL ON SCHEMA audit FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA audit TO service_role;

COMMENT ON SCHEMA audit IS 'Immutable partitioned audit trail with SHA-256 hash chaining (12m system logs, 60m financial/dispute logs - ADR-05).';

CREATE TABLE IF NOT EXISTS audit.system_and_access_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    seq_no BIGSERIAL,
    user_id UUID,
    event_type VARCHAR(60) NOT NULL,
    endpoint VARCHAR(150),
    ip_hash VARCHAR(64),
    correlation_id VARCHAR(128),
    payload_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    prev_hash CHAR(64) NOT NULL,
    row_hash CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS audit.financial_and_dispute_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    seq_no BIGSERIAL,
    entity_type VARCHAR(40) NOT NULL,
    entity_id UUID NOT NULL,
    actor_id UUID,
    action VARCHAR(50) NOT NULL,
    financial_delta_cents BIGINT,
    coins_delta INT,
    correlation_id VARCHAR(128),
    prev_state JSONB,
    new_state JSONB,
    prev_hash CHAR(64) NOT NULL,
    row_hash CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Monthly Partitions + Default Partition
CREATE TABLE IF NOT EXISTS audit.system_logs_y2026m11 PARTITION OF audit.system_and_access_logs
    FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit.system_logs_y2026m12 PARTITION OF audit.system_and_access_logs
    FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit.system_logs_default PARTITION OF audit.system_and_access_logs
    DEFAULT;

CREATE TABLE IF NOT EXISTS audit.financial_logs_y2026m11 PARTITION OF audit.financial_and_dispute_logs
    FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit.financial_logs_y2026m12 PARTITION OF audit.financial_and_dispute_logs
    FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit.financial_logs_default PARTITION OF audit.financial_and_dispute_logs
    DEFAULT;

CREATE INDEX IF NOT EXISTS idx_audit_system_seq ON audit.system_and_access_logs(seq_no);
CREATE INDEX IF NOT EXISTS idx_audit_financial_seq ON audit.financial_and_dispute_logs(seq_no);

REVOKE UPDATE, DELETE, TRUNCATE ON TABLE audit.system_and_access_logs FROM PUBLIC, authenticated, anon;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE audit.financial_and_dispute_logs FROM PUBLIC, authenticated, anon;

-- Anti-UPDATE / Anti-DELETE Immutability Triggers on Audit Tables
DROP TRIGGER IF EXISTS trg_audit_system_immutable ON audit.system_and_access_logs;
CREATE TRIGGER trg_audit_system_immutable
    BEFORE UPDATE OR DELETE ON audit.system_and_access_logs
    FOR EACH ROW EXECUTE FUNCTION private.prevent_append_only_mutation();

DROP TRIGGER IF EXISTS trg_audit_financial_immutable ON audit.financial_and_dispute_logs;
CREATE TRIGGER trg_audit_financial_immutable
    BEFORE UPDATE OR DELETE ON audit.financial_and_dispute_logs
    FOR EACH ROW EXECUTE FUNCTION private.prevent_append_only_mutation();

-- -----------------------------------------------------------------------------
-- 2. SHA-256 Hash-Chaining Triggers & Verification RPCs (ADR-05)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.compute_audit_system_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, audit, pg_temp
AS $$
DECLARE
    v_prev_hash CHAR(64);
    v_canonical TEXT;
BEGIN
    SELECT row_hash INTO v_prev_hash
    FROM audit.system_and_access_logs
    ORDER BY seq_no DESC
    LIMIT 1;

    v_prev_hash := COALESCE(v_prev_hash, repeat('0', 64));
    NEW.prev_hash := v_prev_hash;

    v_canonical := COALESCE(NEW.event_type, '') || '|' ||
                   COALESCE(NEW.user_id::text, '') || '|' ||
                   COALESCE(NEW.correlation_id, '') || '|' ||
                   COALESCE(NEW.payload_snapshot::text, '{}') || '|' ||
                   v_prev_hash;

    NEW.row_hash := encode(digest(v_canonical, 'sha256'), 'hex');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_system_sha256_chain ON audit.system_and_access_logs;
CREATE TRIGGER trg_audit_system_sha256_chain
    BEFORE INSERT ON audit.system_and_access_logs
    FOR EACH ROW EXECUTE FUNCTION private.compute_audit_system_hash();

CREATE OR REPLACE FUNCTION private.compute_audit_financial_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, audit, pg_temp
AS $$
DECLARE
    v_prev_hash CHAR(64);
    v_canonical TEXT;
BEGIN
    SELECT row_hash INTO v_prev_hash
    FROM audit.financial_and_dispute_logs
    ORDER BY seq_no DESC
    LIMIT 1;

    v_prev_hash := COALESCE(v_prev_hash, repeat('0', 64));
    NEW.prev_hash := v_prev_hash;

    v_canonical := COALESCE(NEW.entity_type, '') || '|' ||
                   COALESCE(NEW.entity_id::text, '') || '|' ||
                   COALESCE(NEW.actor_id::text, '') || '|' ||
                   COALESCE(NEW.action, '') || '|' ||
                   COALESCE(NEW.financial_delta_cents::text, '0') || '|' ||
                   COALESCE(NEW.new_state::text, '{}') || '|' ||
                   v_prev_hash;

    NEW.row_hash := encode(digest(v_canonical, 'sha256'), 'hex');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_financial_sha256_chain ON audit.financial_and_dispute_logs;
CREATE TRIGGER trg_audit_financial_sha256_chain
    BEFORE INSERT ON audit.financial_and_dispute_logs
    FOR EACH ROW EXECUTE FUNCTION private.compute_audit_financial_hash();

CREATE OR REPLACE FUNCTION private.audit_log(
    p_trail TEXT,
    p_event_or_entity TEXT,
    p_actor_id UUID,
    p_correlation_id TEXT,
    p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, audit, pg_temp
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    IF upper(p_trail) = 'SYSTEM' THEN
        INSERT INTO audit.system_and_access_logs (
            user_id, event_type, correlation_id, payload_snapshot, prev_hash, row_hash
        ) VALUES (
            p_actor_id, p_event_or_entity, p_correlation_id, COALESCE(p_payload, '{}'::jsonb), repeat('0', 64), repeat('0', 64)
        )
        RETURNING id INTO v_log_id;
    ELSE
        INSERT INTO audit.financial_and_dispute_logs (
            entity_type,
            entity_id,
            actor_id,
            action,
            financial_delta_cents,
            correlation_id,
            prev_state,
            new_state,
            prev_hash,
            row_hash
        ) VALUES (
            p_event_or_entity,
            COALESCE((p_payload->>'entity_id')::uuid, gen_random_uuid()),
            p_actor_id,
            COALESCE(p_payload->>'action', 'EVENT'),
            COALESCE((p_payload->>'financial_delta_cents')::bigint, 0),
            p_correlation_id,
            p_payload->'prev_state',
            COALESCE(p_payload->'new_state', p_payload),
            repeat('0', 64),
            repeat('0', 64)
        )
        RETURNING id INTO v_log_id;
    END IF;

    RETURN v_log_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.audit_verify(p_trail TEXT DEFAULT 'FINANCIAL')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, audit, pg_temp
AS $$
DECLARE
    v_expected_prev CHAR(64) := repeat('0', 64);
    v_recomputed CHAR(64);
    v_row RECORD;
    v_count BIGINT := 0;
BEGIN
    IF upper(p_trail) = 'SYSTEM' THEN
        FOR v_row IN
            SELECT * FROM audit.system_and_access_logs ORDER BY seq_no ASC
        LOOP
            v_count := v_count + 1;
            v_recomputed := encode(digest(
                COALESCE(v_row.event_type, '') || '|' ||
                COALESCE(v_row.user_id::text, '') || '|' ||
                COALESCE(v_row.correlation_id, '') || '|' ||
                COALESCE(v_row.payload_snapshot::text, '{}') || '|' ||
                v_expected_prev,
                'sha256'
            ), 'hex');

            IF v_row.prev_hash <> v_expected_prev OR v_row.row_hash <> v_recomputed THEN
                RETURN jsonb_build_object(
                    'trail', 'SYSTEM',
                    'is_valid', FALSE,
                    'checked_rows', v_count,
                    'broken_row_id', v_row.id,
                    'expected_hash', v_recomputed,
                    'actual_hash', v_row.row_hash
                );
            END IF;
            v_expected_prev := v_row.row_hash;
        END LOOP;
    ELSE
        FOR v_row IN
            SELECT * FROM audit.financial_and_dispute_logs ORDER BY seq_no ASC
        LOOP
            v_count := v_count + 1;
            v_recomputed := encode(digest(
                COALESCE(v_row.entity_type, '') || '|' ||
                COALESCE(v_row.entity_id::text, '') || '|' ||
                COALESCE(v_row.actor_id::text, '') || '|' ||
                COALESCE(v_row.action, '') || '|' ||
                COALESCE(v_row.financial_delta_cents::text, '0') || '|' ||
                COALESCE(v_row.new_state::text, '{}') || '|' ||
                v_expected_prev,
                'sha256'
            ), 'hex');

            IF v_row.prev_hash <> v_expected_prev OR v_row.row_hash <> v_recomputed THEN
                RETURN jsonb_build_object(
                    'trail', 'FINANCIAL',
                    'is_valid', FALSE,
                    'checked_rows', v_count,
                    'broken_row_id', v_row.id,
                    'expected_hash', v_recomputed,
                    'actual_hash', v_row.row_hash
                );
            END IF;
            v_expected_prev := v_row.row_hash;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'trail', upper(p_trail),
        'is_valid', TRUE,
        'checked_rows', v_count,
        'head_hash', v_expected_prev
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. Arbitration Rubric & Dual Approval Constraints (> R$ 500,00 - ADR-06)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    ALTER TABLE escrow.disputes
        ADD CONSTRAINT chk_disputes_distinct_moderators
        CHECK (moderator_1_id IS NULL OR moderator_2_id IS NULL OR moderator_1_id <> moderator_2_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS escrow.arbitration_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID UNIQUE NOT NULL REFERENCES escrow.disputes(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES escrow.orders(id),
    decision_type VARCHAR(20) NOT NULL
        CHECK (decision_type IN ('REVELIA', 'MODERADOR')),
    outcome VARCHAR(30) NOT NULL
        CHECK (outcome IN ('REFUND_BUYER', 'RELEASE_SELLER')),
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    rubric_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    reason TEXT NOT NULL,
    escalation_level SMALLINT NOT NULL DEFAULT 1 CHECK (escalation_level IN (1, 2)),
    -- High-value disputes (> R$ 500,00 = 50000 cents) or moderator refunds require dual approval (ADR-06)
    requires_dual_approval BOOLEAN GENERATED ALWAYS AS (
        decision_type = 'MODERADOR' AND (outcome = 'REFUND_BUYER' OR amount_cents > 50000)
    ) STORED,
    moderator_1_id UUID REFERENCES public.users(id),
    moderator_2_id UUID REFERENCES public.users(id),
    finalized BOOLEAN NOT NULL DEFAULT FALSE,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_arb_distinct_moderators
        CHECK (moderator_1_id IS NULL OR moderator_2_id IS NULL OR moderator_1_id <> moderator_2_id),
    CONSTRAINT chk_arb_dual_approval_enforced
        CHECK (
            NOT finalized
            OR NOT requires_dual_approval
            OR (moderator_1_id IS NOT NULL AND moderator_2_id IS NOT NULL AND moderator_1_id <> moderator_2_id)
        )
);

CREATE TABLE IF NOT EXISTS escrow.moderation_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID NOT NULL REFERENCES escrow.arbitration_decisions(id) ON DELETE CASCADE,
    moderator_id UUID NOT NULL REFERENCES public.users(id),
    approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_decision_distinct_moderator UNIQUE (decision_id, moderator_id)
);

CREATE OR REPLACE FUNCTION private.register_arbitration_approval(
    p_dispute_id UUID,
    p_moderator_id UUID,
    p_outcome VARCHAR,
    p_reason TEXT,
    p_rubric JSONB DEFAULT '{}'::jsonb,
    p_is_revelia BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, escrow, private, audit, pg_temp
AS $$
DECLARE
    v_dispute RECORD;
    v_order RECORD;
    v_decision RECORD;
    v_decision_type VARCHAR(20);
    v_needs_dual BOOLEAN;
BEGIN
    SELECT * INTO v_dispute FROM escrow.disputes WHERE id = p_dispute_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION '404 DISPUTE_NOT_FOUND';
    END IF;

    SELECT * INTO v_order FROM escrow.orders WHERE id = v_dispute.order_id;
    v_decision_type := CASE WHEN p_is_revelia THEN 'REVELIA' ELSE 'MODERADOR' END;

    IF NOT p_is_revelia AND p_moderator_id IS NULL THEN
        RAISE EXCEPTION '422 MODERATOR_ID_REQUIRED';
    END IF;

    SELECT * INTO v_decision FROM escrow.arbitration_decisions WHERE dispute_id = p_dispute_id FOR UPDATE;

    IF NOT FOUND THEN
        v_needs_dual := (v_decision_type = 'MODERADOR' AND (p_outcome = 'REFUND_BUYER' OR v_order.amount_cents > 50000));

        INSERT INTO escrow.arbitration_decisions (
            dispute_id, order_id, decision_type, outcome, amount_cents,
            rubric_criteria, reason, moderator_1_id, finalized
        ) VALUES (
            p_dispute_id, v_order.id, v_decision_type, p_outcome, v_order.amount_cents,
            COALESCE(p_rubric, '{}'::jsonb), p_reason, p_moderator_id, (NOT v_needs_dual)
        )
        RETURNING * INTO v_decision;

        IF p_moderator_id IS NOT NULL THEN
            INSERT INTO escrow.moderation_approvals (decision_id, moderator_id)
            VALUES (v_decision.id, p_moderator_id);
        END IF;

        IF v_needs_dual THEN
            UPDATE escrow.disputes
            SET status = 'AGUARDANDO_DUPLA_APROVACAO',
                moderator_1_id = p_moderator_id,
                updated_at = NOW()
            WHERE id = p_dispute_id;

            RETURN jsonb_build_object(
                'decision_id', v_decision.id,
                'finalized', FALSE,
                'status', 'AGUARDANDO_DUPLA_APROVACAO',
                'requires_dual_approval', TRUE,
                'amount_cents', v_order.amount_cents
            );
        END IF;
    ELSE
        IF v_decision.finalized THEN
            RETURN jsonb_build_object(
                'decision_id', v_decision.id,
                'finalized', TRUE,
                'status', 'ALREADY_FINALIZED'
            );
        END IF;

        IF v_decision.moderator_1_id = p_moderator_id THEN
            RAISE EXCEPTION '403 DISTINCT_SECOND_MODERATOR_REQUIRED: same moderator cannot approve twice (R-04)';
        END IF;

        INSERT INTO escrow.moderation_approvals (decision_id, moderator_id)
        VALUES (v_decision.id, p_moderator_id);

        UPDATE escrow.arbitration_decisions
        SET moderator_2_id = p_moderator_id,
            finalized = TRUE,
            updated_at = NOW()
        WHERE id = v_decision.id
        RETURNING * INTO v_decision;
    END IF;

    -- Finalize dispute & execute escrow effect + SHA-256 audit log
    UPDATE escrow.disputes
    SET status = CASE WHEN v_decision.outcome = 'REFUND_BUYER' THEN 'RESOLVIDA_COMPRADOR'::escrow.dispute_status ELSE 'RESOLVIDA_VENDEDOR'::escrow.dispute_status END,
        moderator_1_id = v_decision.moderator_1_id,
        moderator_2_id = v_decision.moderator_2_id,
        resolution_notes = p_reason,
        resolved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_dispute_id;

    IF v_decision.outcome = 'REFUND_BUYER' THEN
        IF v_decision.decision_type = 'REVELIA' THEN
            UPDATE escrow.escrow_accounts
            SET status = 'ESTORNADO', finalized_at = NOW(), final_type = 'ESTORNO', updated_at = NOW()
            WHERE id = v_dispute.escrow_account_id;

            UPDATE escrow.orders SET status = 'REFUNDED', updated_at = NOW() WHERE id = v_order.id;
        ELSE
            PERFORM private.estornar_escrow(v_order.id, p_dispute_id);
        END IF;
    ELSE
        PERFORM private.release_escrow(v_order.id, 'LIBERACAO_ANTECIPADA');
    END IF;

    PERFORM private.audit_log(
        'FINANCIAL',
        'ARBITRATION_DECISION',
        COALESCE(p_moderator_id, v_decision.moderator_1_id),
        'arb:' || v_decision.id::text,
        jsonb_build_object(
            'entity_id', v_decision.id,
            'action', v_decision.outcome,
            'financial_delta_cents', v_order.amount_cents,
            'new_state', jsonb_build_object(
                'dispute_id', p_dispute_id,
                'decision_type', v_decision.decision_type,
                'requires_dual_approval', v_decision.requires_dual_approval,
                'moderator_1_id', v_decision.moderator_1_id,
                'moderator_2_id', v_decision.moderator_2_id
            )
        )
    );

    RETURN jsonb_build_object(
        'decision_id', v_decision.id,
        'finalized', TRUE,
        'outcome', v_decision.outcome,
        'requires_dual_approval', v_decision.requires_dual_approval
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. LGPD 30-Day Grace Period & Irreversible Anonymization Pipeline (ADR-07)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    notice_sent_at TIMESTAMPTZ,
    anonymized_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'EM_CARENCIA'
        CHECK (status IN ('EM_CARENCIA', 'CANCELADA_POR_LOGIN', 'ANONIMIZADA'))
);

CREATE OR REPLACE FUNCTION private.request_account_deletion(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, escrow, private, audit, pg_temp
AS $$
DECLARE
    v_effective TIMESTAMPTZ := NOW() + INTERVAL '30 days';
    v_req_id UUID;
BEGIN
    -- STY010-RN01: Block if user has active orders/escrow or open disputes
    IF EXISTS (
        SELECT 1 FROM escrow.orders
        WHERE (buyer_id = p_user_id OR seller_id = p_user_id)
          AND status IN ('CREATED', 'AWAITING_MEETUP', 'IN_CUSTODY', 'DISPUTED')
    ) THEN
        RAISE EXCEPTION '409 ACTIVE_ORDER_OR_ESCROW_BLOCKS_DELETION (STY010-RN01)';
    END IF;

    -- STY010-RN01: Block if user leads an active auction
    IF EXISTS (
        SELECT 1 FROM public.auctions
        WHERE winner_id = p_user_id AND status IN ('ABERTO', 'AGUARDANDO_RESGATE')
    ) THEN
        RAISE EXCEPTION '409 ACTIVE_AUCTION_BLOCKS_DELETION (STY010-RN01)';
    END IF;

    -- STY010-RN02: Block if user has non-zero coin balance
    IF EXISTS (
        SELECT 1 FROM public.wallets
        WHERE user_id = p_user_id AND (available_balance > 0 OR locked_balance > 0)
    ) THEN
        RAISE EXCEPTION '409 NON_ZERO_COIN_BALANCE_BLOCKS_DELETION (STY010-RN02)';
    END IF;

    UPDATE public.users
    SET status = 'PENDING_DELETION',
        deletion_requested_at = NOW(),
        grace_period_until = v_effective,
        updated_at = NOW()
    WHERE id = p_user_id;

    INSERT INTO public.account_deletion_requests (user_id, requested_at, effective_at, status)
    VALUES (p_user_id, NOW(), v_effective, 'EM_CARENCIA')
    ON CONFLICT (user_id) DO UPDATE SET
        requested_at = EXCLUDED.requested_at,
        effective_at = EXCLUDED.effective_at,
        status = 'EM_CARENCIA',
        anonymized_at = NULL
    RETURNING id INTO v_req_id;

    RETURN jsonb_build_object(
        'request_id', v_req_id,
        'user_id', p_user_id,
        'status', 'EM_CARENCIA',
        'effective_at', v_effective
    );
END;
$$;

CREATE OR REPLACE FUNCTION private.anonimizar_usuario(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, escrow, private, audit, pg_temp
AS $$
DECLARE
    v_user RECORD;
    v_anon_tag TEXT;
BEGIN
    SELECT * INTO v_user FROM public.users WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION '404 USER_NOT_FOUND';
    END IF;

    -- Idempotent replay if already deleted/anonymized
    IF v_user.status = 'DELETED' THEN
        RETURN jsonb_build_object('user_id', p_user_id, 'already_anonymized', TRUE);
    END IF;

    IF v_user.grace_period_until IS NULL OR v_user.grace_period_until > NOW() THEN
        RAISE EXCEPTION '409 GRACE_PERIOD_30_DAYS_NOT_EXPIRED: effective_at=%', v_user.grace_period_until;
    END IF;

    v_anon_tag := 'anon_' || substr(encode(digest(p_user_id::text || ':lgpd', 'sha256'), 'hex'), 1, 16);

    -- Preserve 5-year legal fiscal retention under non-FK pseudonym (ADR-07 / PRM-63)
    INSERT INTO private.legal_retention (pseudonym_id, fiscal_cpf_encrypted, retain_until)
    VALUES (
        p_user_id,
        digest(COALESCE(v_user.cpf_hash, v_anon_tag), 'sha256'),
        (CURRENT_DATE + INTERVAL '5 years')::date
    )
    ON CONFLICT (pseudonym_id) DO NOTHING;

    -- Physical deletion of PII without legal retention mandate
    DELETE FROM private.user_kyc_docs WHERE user_id = p_user_id;
    DELETE FROM private.user_exact_addresses WHERE user_id = p_user_id;
    DELETE FROM public.user_addresses WHERE user_id = p_user_id;

    UPDATE public.chat_messages
    SET sanitized_content = '[Mensagem removida por eliminacao de conta LGPD]',
        attachment_path = NULL,
        is_deleted = TRUE
    WHERE sender_id = p_user_id;

    -- Irreversible anonymization of user & public profile ("Usuario removido" - STY010-RN05)
    UPDATE public.users
    SET email = v_anon_tag || '@removed.steely.local',
        cpf_hash = NULL,
        password_hash = NULL,
        phone_masked = NULL,
        status = 'DELETED',
        updated_at = NOW()
    WHERE id = p_user_id;

    UPDATE public.profiles
    SET display_name = 'Usuário removido',
        avatar_path = NULL,
        bio = NULL,
        is_public = FALSE,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    UPDATE public.account_deletion_requests
    SET status = 'ANONIMIZADA',
        anonymized_at = NOW()
    WHERE user_id = p_user_id;

    PERFORM private.audit_log(
        'FINANCIAL',
        'LGPD_ACCOUNT_ANONYMIZED',
        p_user_id,
        'lgpd:' || p_user_id::text,
        jsonb_build_object(
            'entity_id', p_user_id,
            'action', 'ANONYMIZE_30D',
            'new_state', jsonb_build_object('pseudonym', v_anon_tag, 'status', 'DELETED')
        )
    );

    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'already_anonymized', FALSE,
        'pseudonym', v_anon_tag,
        'status', 'DELETED'
    );
END;
$$;

CREATE OR REPLACE FUNCTION private.sweep_lgpd_anonymization_30d()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
    v_uid UUID;
    v_processed INT := 0;
BEGIN
    FOR v_uid IN
        SELECT id FROM public.users
        WHERE status = 'PENDING_DELETION'
          AND grace_period_until IS NOT NULL
          AND grace_period_until <= NOW()
    LOOP
        PERFORM private.anonimizar_usuario(v_uid);
        v_processed := v_processed + 1;
    END LOOP;

    RETURN v_processed;
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. RLS & Permissions for New Tables and Functions
-- -----------------------------------------------------------------------------
ALTER TABLE audit.system_and_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.system_logs_y2026m11 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.system_logs_y2026m12 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.system_logs_default ENABLE ROW LEVEL SECURITY;

ALTER TABLE audit.financial_and_dispute_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.financial_logs_y2026m11 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.financial_logs_y2026m12 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.financial_logs_default ENABLE ROW LEVEL SECURITY;

ALTER TABLE escrow.arbitration_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow.moderation_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_deletion_requests_select_own ON public.account_deletion_requests
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

REVOKE ALL ON FUNCTION private.audit_log(TEXT, TEXT, UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.audit_verify(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.register_arbitration_approval(UUID, UUID, VARCHAR, TEXT, JSONB, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.request_account_deletion(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.anonimizar_usuario(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.sweep_lgpd_anonymization_30d() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION private.audit_log(TEXT, TEXT, UUID, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION private.audit_verify(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION private.register_arbitration_approval(UUID, UUID, VARCHAR, TEXT, JSONB, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION private.request_account_deletion(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION private.anonimizar_usuario(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION private.sweep_lgpd_anonymization_30d() TO service_role;

-- -----------------------------------------------------------------------------
-- 6. In-Database Automated QA & Security Test Runner (SPRINT15_011)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.run_qa_sec_validation_suite()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, escrow, private, audit, pg_temp
AS $$
DECLARE
    v_buyer UUID := gen_random_uuid();
    v_seller UUID := gen_random_uuid();
    v_mod1 UUID := gen_random_uuid();
    v_mod2 UUID := gen_random_uuid();
    v_lgpd_user UUID := gen_random_uuid();
    v_cat_id INT;
    v_offer_id UUID;
    v_order_id UUID;
    v_escrow_id UUID;
    v_dispute_id UUID;
    v_res_step1 JSONB;
    v_res_step2 JSONB;
    v_res_lgpd1 JSONB;
    v_res_lgpd2 JSONB;
    v_verify_sys JSONB;
    v_verify_fin JSONB;
    v_audit_update_blocked BOOLEAN := FALSE;
    v_same_mod_blocked BOOLEAN := FALSE;
    v_early_lgpd_blocked BOOLEAN := FALSE;
    v_balance_lgpd_blocked BOOLEAN := FALSE;
    v_profile_name TEXT;
BEGIN
    -- Create temporary test users
    INSERT INTO public.users (id, email, role, status, kyc_verified, trust_score)
    VALUES
        (v_buyer, 'qa_buyer_' || v_buyer::text || '@steely.test', 'USER', 'ACTIVE', TRUE, 95.00),
        (v_seller, 'qa_seller_' || v_seller::text || '@steely.test', 'USER', 'ACTIVE', TRUE, 95.00),
        (v_mod1, 'qa_mod1_' || v_mod1::text || '@steely.test', 'MODERATOR', 'ACTIVE', TRUE, 100.00),
        (v_mod2, 'qa_mod2_' || v_mod2::text || '@steely.test', 'MODERATOR', 'ACTIVE', TRUE, 100.00),
        (v_lgpd_user, 'qa_lgpd_' || v_lgpd_user::text || '@steely.test', 'USER', 'ACTIVE', TRUE, 90.00);

    INSERT INTO public.profiles (user_id, display_name)
    VALUES (v_lgpd_user, 'Fulano LGPD Original');

    INSERT INTO public.hardware_categories (slug, name)
    VALUES ('qa-gpu-' || substr(v_buyer::text, 1, 8), 'QA GPU')
    RETURNING id INTO v_cat_id;

    -- Test 1: SHA-256 Chained Audit Trail & Anti-UPDATE/DELETE Immutability (ADR-05)
    PERFORM private.audit_log('SYSTEM', 'QA_LOGIN_SUCCESS', v_buyer, 'corr-qa-001', '{"ip_masked":"192.0.2.x"}'::jsonb);
    PERFORM private.audit_log('SYSTEM', 'QA_ROLE_CHECK', v_mod1, 'corr-qa-002', '{"role":"MODERATOR"}'::jsonb);

    BEGIN
        UPDATE audit.system_and_access_logs SET event_type = 'TAMPERED' WHERE correlation_id = 'corr-qa-001';
    EXCEPTION WHEN OTHERS THEN
        v_audit_update_blocked := TRUE;
    END;

    -- Test 2: High-Value Dispute (> R$ 500 = 75000 cents) Dual Moderator Approval (ADR-06)
    INSERT INTO public.offers (seller_id, category_id, title, condition, price_cents, status, city, state)
    VALUES (v_seller, v_cat_id, 'RTX 4070 QA Test', 'SEMINOVO', 75000, 'RESERVADA', 'Maringa', 'PR')
    RETURNING id INTO v_offer_id;

    INSERT INTO escrow.orders (offer_id, buyer_id, seller_id, amount_cents, status)
    VALUES (v_offer_id, v_buyer, v_seller, 75000, 'CREATED')
    RETURNING id INTO v_order_id;

    v_escrow_id := private.reter_escrow(v_order_id, 'qa-reter-' || v_order_id::text);

    INSERT INTO escrow.disputes (order_id, escrow_account_id, opened_by, respondent_id, reason)
    VALUES (v_order_id, v_escrow_id, v_buyer, v_seller, 'Serial divergente no teste de bancada')
    RETURNING id INTO v_dispute_id;

    -- 1st Moderator approves -> must remain finalized=false (AGUARDANDO_DUPLA_APROVACAO)
    v_res_step1 := private.register_arbitration_approval(
        v_dispute_id, v_mod1, 'REFUND_BUYER', 'Evidencia de video e serial confirmada', '{"serial_mismatch":true}'::jsonb, FALSE
    );

    -- Same moderator tries to be 2nd approver -> must fail (R-04)
    BEGIN
        PERFORM private.register_arbitration_approval(
            v_dispute_id, v_mod1, 'REFUND_BUYER', 'Tentativa duplicada mesmo moderador', '{}'::jsonb, FALSE
        );
    EXCEPTION WHEN OTHERS THEN
        v_same_mod_blocked := TRUE;
    END;

    -- 2nd distinct Moderator approves -> finalizes & refunds escrow
    v_res_step2 := private.register_arbitration_approval(
        v_dispute_id, v_mod2, 'REFUND_BUYER', 'Segunda aprovacao confirmada', '{"serial_mismatch":true}'::jsonb, FALSE
    );

    -- Test 3: LGPD 30-Day Grace Period & Irreversible Anonymization (ADR-07)
    INSERT INTO public.wallets (user_id, available_balance) VALUES (v_lgpd_user, 50);

    -- Must block deletion while coin balance > 0 (STY010-RN02)
    BEGIN
        PERFORM private.request_account_deletion(v_lgpd_user);
    EXCEPTION WHEN OTHERS THEN
        v_balance_lgpd_blocked := TRUE;
    END;

    UPDATE public.wallets SET available_balance = 0 WHERE user_id = v_lgpd_user;
    PERFORM private.request_account_deletion(v_lgpd_user);

    -- Must block anonymization before 30 days expire
    BEGIN
        PERFORM private.anonimizar_usuario(v_lgpd_user);
    EXCEPTION WHEN OTHERS THEN
        v_early_lgpd_blocked := TRUE;
    END;

    -- Fast-forward grace period to expired (-31 days) and run anonymization + idempotency replay
    UPDATE public.users
    SET deletion_requested_at = NOW() - INTERVAL '31 days',
        grace_period_until = NOW() - INTERVAL '1 day'
    WHERE id = v_lgpd_user;

    v_res_lgpd1 := private.anonimizar_usuario(v_lgpd_user);
    v_res_lgpd2 := private.anonimizar_usuario(v_lgpd_user);

    SELECT display_name INTO v_profile_name FROM public.profiles WHERE user_id = v_lgpd_user;

    -- Verify both SHA-256 chains after all operations
    v_verify_sys := private.audit_verify('SYSTEM');
    v_verify_fin := private.audit_verify('FINANCIAL');

    RETURN jsonb_build_object(
        'adr05_audit_update_blocked', v_audit_update_blocked,
        'adr05_system_chain_valid', (v_verify_sys->>'is_valid')::boolean,
        'adr05_financial_chain_valid', (v_verify_fin->>'is_valid')::boolean,
        'adr06_first_mod_pending_dual', (NOT (v_res_step1->>'finalized')::boolean),
        'adr06_same_mod_twice_blocked', v_same_mod_blocked,
        'adr06_second_mod_finalized', (v_res_step2->>'finalized')::boolean,
        'adr07_nonzero_balance_blocked', v_balance_lgpd_blocked,
        'adr07_before_30d_blocked', v_early_lgpd_blocked,
        'adr07_anonymized_profile_name', v_profile_name,
        'adr07_idempotent_second_run', (v_res_lgpd2->>'already_anonymized')::boolean
    );
END;
$$;

REVOKE ALL ON FUNCTION private.run_qa_sec_validation_suite() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.run_qa_sec_validation_suite() TO service_role;
