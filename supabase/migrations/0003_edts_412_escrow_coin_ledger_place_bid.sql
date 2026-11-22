-- =============================================================================
-- Steely Platform - Migration 0003 (EDTS-412 / SPRINT15_004)
-- DDL Schema escrow, Immutable Append-Only coin_ledger (FIFO 12m) & place_bid():
--   - Schema: escrow (orders, escrow_accounts, meetups, qr_tokens, disputes, escrow_events)
--   - Tables: public.wallets, public.coin_ledger, public.coin_fifo_lots
--   - Triggers: Strict anti-UPDATE/DELETE on public.coin_ledger & escrow.escrow_events
--   - Functions (private.*, SECURITY DEFINER):
--       private.consume_coins_fifo()
--       private.place_bid() (SELECT FOR UPDATE + Anti-Sniping 3 min)
--       private.reter_escrow(), private.release_escrow(), private.estornar_escrow()
-- Target Engine: PostgreSQL 15+ / Supabase
-- Dependencies: 0001_edts_378_core_public_private.sql, 0002_edts_376_ofertas_leiloes_chat_storage.sql
-- Conforms to: ADR-03, ADR-09, ADR-10, ADR-14, ADR-15
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Schema 'escrow' & Access Hardening (ADR-03, ADR-09)
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS escrow;

REVOKE ALL ON SCHEMA escrow FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA escrow TO service_role;

COMMENT ON SCHEMA escrow IS 'Simulated 7-day financial custody in cents (BIGINT), isolated from coin_ledger (RB-09, ADR-03).';

-- -----------------------------------------------------------------------------
-- 2. Domain Enums (Idempotent)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE escrow.order_status AS ENUM (
        'CREATED', 'AWAITING_MEETUP', 'IN_CUSTODY', 'COMPLETED', 'DISPUTED', 'CANCELLED', 'REFUNDED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE escrow.custody_status AS ENUM ('RETIDO', 'LIBERADO', 'ESTORNADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE escrow.custody_final_type AS ENUM (
        'LIBERACAO_AUTOMATICA', 'LIBERACAO_ANTECIPADA', 'ESTORNO'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE escrow.meetup_status AS ENUM ('AGENDADO', 'CONCLUIDO', 'CANCELADO', 'NAO_COMPARECEU');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE escrow.dispute_status AS ENUM (
        'ABERTA', 'EM_MEDIACAO', 'EM_ANALISE_TECNICA',
        'AGUARDANDO_DUPLA_APROVACAO', 'RESOLVIDA_COMPRADOR', 'RESOLVIDA_VENDEDOR', 'ENCERRADA'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.coin_entry_type AS ENUM (
        'SIGNUP_BONUS', 'SCANNER_REWARD', 'CAPTCHA_REWARD', 'REVIEW_REWARD', 'ECOPONTO_REWARD',
        'BID_HOLD', 'BID_RELEASE', 'BID_CAPTURE_BURN',
        'BOOST_PURCHASE', 'SERVICE_DISCOUNT',
        'CASHBACK_HOLD', 'CASHBACK_RELEASE', 'CASHBACK_CANCEL',
        'DEBIT_EXPIRATION', 'ADMIN_ADJUSTMENT'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 3. Schema 'escrow' Tables (orders, escrow_accounts, meetups, qr_tokens, disputes)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS escrow.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES public.offers(id),
    buyer_id UUID NOT NULL REFERENCES public.users(id),
    seller_id UUID NOT NULL REFERENCES public.users(id),
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    platform_fee_cents BIGINT NOT NULL DEFAULT 0 CHECK (platform_fee_cents >= 0),
    status escrow.order_status NOT NULL DEFAULT 'CREATED',
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_order_distinct_parties CHECK (buyer_id <> seller_id)
);

CREATE TABLE IF NOT EXISTS escrow.escrow_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID UNIQUE NOT NULL REFERENCES escrow.orders(id),
    buyer_id UUID NOT NULL REFERENCES public.users(id),
    seller_id UUID NOT NULL REFERENCES public.users(id),
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    status escrow.custody_status NOT NULL DEFAULT 'RETIDO',
    held_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    custody_releases_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    finalized_at TIMESTAMPTZ,
    final_type escrow.custody_final_type,
    moderator_1_id UUID REFERENCES public.users(id),
    moderator_2_id UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_escrow_single_finality UNIQUE (id, final_type)
);

CREATE TABLE IF NOT EXISTS escrow.escrow_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escrow_account_id UUID NOT NULL REFERENCES escrow.escrow_accounts(id) ON DELETE RESTRICT,
    from_status TEXT,
    to_status TEXT NOT NULL,
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    correlation_id VARCHAR(128),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escrow.meetups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES escrow.orders(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.users(id),
    seller_id UUID NOT NULL REFERENCES public.users(id),
    safe_point_name VARCHAR(200) NOT NULL,
    safe_point_address TEXT NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    scheduled_at TIMESTAMPTZ NOT NULL,
    tolerance_minutes SMALLINT NOT NULL DEFAULT 15 CHECK (tolerance_minutes >= 0),
    status escrow.meetup_status NOT NULL DEFAULT 'AGENDADO',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escrow.qr_tokens (
    jti UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meetup_id UUID NOT NULL REFERENCES escrow.meetups(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES escrow.orders(id) ON DELETE CASCADE,
    signature TEXT NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escrow.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES escrow.orders(id),
    escrow_account_id UUID NOT NULL REFERENCES escrow.escrow_accounts(id),
    opened_by UUID NOT NULL REFERENCES public.users(id),
    respondent_id UUID NOT NULL REFERENCES public.users(id),
    reason TEXT NOT NULL,
    evidence_paths TEXT[] NOT NULL DEFAULT '{}',
    status escrow.dispute_status NOT NULL DEFAULT 'ABERTA',
    resolution_notes TEXT,
    moderator_1_id UUID REFERENCES public.users(id),
    moderator_2_id UUID REFERENCES public.users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. Coin Wallets, Immutable Append-Only coin_ledger & FIFO Lots (ADR-10, ADR-14)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallets (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    available_balance INT NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
    locked_balance INT NOT NULL DEFAULT 0 CHECK (locked_balance >= 0),
    pending_balance INT NOT NULL DEFAULT 0 CHECK (pending_balance >= 0),
    is_frozen BOOLEAN NOT NULL DEFAULT FALSE,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coin_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.wallets(user_id) ON DELETE CASCADE,
    entry_type public.coin_entry_type NOT NULL,
    delta_available INT NOT NULL DEFAULT 0,
    delta_locked INT NOT NULL DEFAULT 0,
    delta_pending INT NOT NULL DEFAULT 0,
    reference_type VARCHAR(40),
    reference_id UUID,
    expires_at TIMESTAMPTZ,
    idempotency_key VARCHAR(128) NOT NULL,
    request_hash CHAR(64) NOT NULL,
    response_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_coin_ledger_idempotency UNIQUE (user_id, entry_type, idempotency_key)
);

-- Mutable FIFO lot tracker so public.coin_ledger stays 100% immutable (append-only)
CREATE TABLE IF NOT EXISTS public.coin_fifo_lots (
    ledger_id UUID PRIMARY KEY REFERENCES public.coin_ledger(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES public.wallets(user_id) ON DELETE CASCADE,
    initial_amount INT NOT NULL CHECK (initial_amount > 0),
    remaining_amount INT NOT NULL CHECK (remaining_amount >= 0 AND remaining_amount <= initial_amount),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '12 months'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link public.bids.hold_ledger_id (from 0002) to public.coin_ledger(id)
DO $$ BEGIN
    ALTER TABLE public.bids
        ADD CONSTRAINT fk_bids_hold_ledger
        FOREIGN KEY (hold_ledger_id) REFERENCES public.coin_ledger(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 5. Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_escrow_orders_buyer ON escrow.orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_escrow_orders_seller ON escrow.orders(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_escrow_accounts_status_release ON escrow.escrow_accounts(status, custody_releases_at);
CREATE INDEX IF NOT EXISTS idx_escrow_events_account ON escrow.escrow_events(escrow_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_escrow_meetups_order ON escrow.meetups(order_id);
CREATE INDEX IF NOT EXISTS idx_escrow_qr_meetup ON escrow.qr_tokens(meetup_id, used);
CREATE INDEX IF NOT EXISTS idx_escrow_disputes_order_status ON escrow.disputes(order_id, status);

CREATE INDEX IF NOT EXISTS idx_coin_ledger_user_time ON public.coin_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_fifo_lots_consume
    ON public.coin_fifo_lots(user_id, expires_at ASC, created_at ASC)
    WHERE remaining_amount > 0;

-- -----------------------------------------------------------------------------
-- 6. Immutability Triggers (Anti-UPDATE / Anti-DELETE on coin_ledger & escrow_events)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.prevent_append_only_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, escrow, private, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'Table %.% is strictly append-only: % operations are prohibited.',
        TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_coin_ledger_immutable ON public.coin_ledger;
CREATE TRIGGER trg_coin_ledger_immutable
    BEFORE UPDATE OR DELETE ON public.coin_ledger
    FOR EACH ROW EXECUTE FUNCTION private.prevent_append_only_mutation();

DROP TRIGGER IF EXISTS trg_escrow_events_immutable ON escrow.escrow_events;
CREATE TRIGGER trg_escrow_events_immutable
    BEFORE UPDATE OR DELETE ON escrow.escrow_events
    FOR EACH ROW EXECUTE FUNCTION private.prevent_append_only_mutation();

REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.coin_ledger FROM PUBLIC, authenticated, anon;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE escrow.escrow_events FROM PUBLIC, authenticated, anon;

-- -----------------------------------------------------------------------------
-- 7. Transactional Procedures in schema 'private' (ADR-03, ADR-09, ADR-10, ADR-15)
-- -----------------------------------------------------------------------------

-- 7.1 FIFO 12-month Lot Consumption Helper
CREATE OR REPLACE FUNCTION private.consume_coins_fifo(
    p_user_id UUID,
    p_amount INT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
    v_remaining_to_burn INT := p_amount;
    v_lot RECORD;
    v_take INT;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'FIFO consume amount must be positive, got %', p_amount;
    END IF;

    FOR v_lot IN
        SELECT ledger_id, remaining_amount
        FROM public.coin_fifo_lots
        WHERE user_id = p_user_id
          AND remaining_amount > 0
          AND expires_at > NOW()
        ORDER BY expires_at ASC, created_at ASC
        FOR UPDATE
    LOOP
        EXIT WHEN v_remaining_to_burn <= 0;

        v_take := LEAST(v_lot.remaining_amount, v_remaining_to_burn);

        UPDATE public.coin_fifo_lots
        SET remaining_amount = remaining_amount - v_take
        WHERE ledger_id = v_lot.ledger_id;

        v_remaining_to_burn := v_remaining_to_burn - v_take;
    END LOOP;

    IF v_remaining_to_burn > 0 THEN
        RAISE EXCEPTION '409 INSUFFICIENT_VALID_FIFO_LOTS: missing % coins', v_remaining_to_burn;
    END IF;

    RETURN p_amount;
END;
$$;

-- 7.2 Atomic Auction Bid with Pessimistic Lock (SELECT FOR UPDATE) & 3-Min Anti-Sniping (ADR-15)
CREATE OR REPLACE FUNCTION private.place_bid(
    p_auction_id UUID,
    p_amount_cents BIGINT,
    p_last_seen_bid_cents BIGINT,
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
    v_bidder_id UUID := auth.uid();
    v_existing_bid RECORD;
    v_auction RECORD;
    v_user RECORD;
    v_prev_leader_id UUID;
    v_bid_fee SMALLINT := 5;
    v_min_required BIGINT;
    v_extended BOOLEAN := FALSE;
    v_new_ends_at TIMESTAMPTZ;
    v_hold_ledger_id UUID;
    v_new_bid_id UUID;
    v_lock_uid UUID;
    v_req_hash CHAR(64);
BEGIN
    IF v_bidder_id IS NULL THEN
        RAISE EXCEPTION '401 UNAUTHENTICATED: auth.uid() is required';
    END IF;

    IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
        RAISE EXCEPTION '422 INVALID_IDEMPOTENCY_KEY';
    END IF;

    -- Idempotency check
    SELECT id, auction_id, bidder_id, amount_cents, status, created_at
    INTO v_existing_bid
    FROM public.bids
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'idempotent_replay', TRUE,
            'bid_id', v_existing_bid.id,
            'auction_id', v_existing_bid.auction_id,
            'amount_cents', v_existing_bid.amount_cents,
            'status', v_existing_bid.status
        );
    END IF;

    -- Defense-in-depth SQL check (ADR-09: ACTIVE, KYC verified, Trust Score >= 70)
    SELECT id, status, kyc_verified, trust_score
    INTO v_user
    FROM public.users
    WHERE id = v_bidder_id;

    IF NOT FOUND OR v_user.status <> 'ACTIVE' OR NOT v_user.kyc_verified OR v_user.trust_score < 70.00 THEN
        RAISE EXCEPTION '403 ELIGIBILITY_FAILED: account must be ACTIVE, kyc_verified=true, trust_score>=70';
    END IF;

    -- Step 1 Lock: Auction row (SELECT ... FOR UPDATE)
    SELECT *
    INTO v_auction
    FROM public.auctions
    WHERE id = p_auction_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION '404 AUCTION_NOT_FOUND';
    END IF;

    IF v_auction.status <> 'ABERTO' OR NOW() >= v_auction.ends_at THEN
        RAISE EXCEPTION '409 AUCTION_CLOSED';
    END IF;

    IF p_last_seen_bid_cents IS DISTINCT FROM v_auction.current_price_cents THEN
        RAISE EXCEPTION '409 BID_OUTDATED: current_price_cents=%', v_auction.current_price_cents;
    END IF;

    IF v_auction.winner_id = v_bidder_id THEN
        RAISE EXCEPTION '409 ALREADY_LEADING';
    END IF;

    v_min_required := CASE
        WHEN v_auction.current_price_cents = 0 THEN v_auction.starting_price_cents
        ELSE v_auction.current_price_cents + v_auction.min_increment_cents
    END;

    IF p_amount_cents < v_min_required THEN
        RAISE EXCEPTION '422 BID_TOO_LOW: minimum required=%', v_min_required;
    END IF;

    v_prev_leader_id := v_auction.winner_id;

    -- Step 2 Lock: Wallets in deterministic ORDER BY user_id FOR UPDATE (deadlock prevention)
    FOR v_lock_uid IN
        SELECT user_id
        FROM public.wallets
        WHERE user_id = v_bidder_id
           OR (v_prev_leader_id IS NOT NULL AND user_id = v_prev_leader_id)
        ORDER BY user_id ASC
        FOR UPDATE
    LOOP
        NULL;
    END LOOP;

    -- Verify bidder wallet balance
    IF NOT EXISTS (
        SELECT 1 FROM public.wallets
        WHERE user_id = v_bidder_id AND NOT is_frozen AND available_balance >= v_bid_fee
    ) THEN
        RAISE EXCEPTION '409 INSUFFICIENT_COINS_OR_FROZEN';
    END IF;

    v_req_hash := encode(digest(p_auction_id::text || ':' || p_amount_cents::text || ':' || p_idempotency_key, 'sha256'), 'hex');

    -- Hold 5 coins from new bidder
    UPDATE public.wallets
    SET available_balance = available_balance - v_bid_fee,
        locked_balance = locked_balance + v_bid_fee,
        last_activity_at = NOW(),
        updated_at = NOW()
    WHERE user_id = v_bidder_id;

    INSERT INTO public.coin_ledger (
        user_id, entry_type, delta_available, delta_locked,
        reference_type, reference_id, idempotency_key, request_hash
    ) VALUES (
        v_bidder_id, 'BID_HOLD', -v_bid_fee, v_bid_fee,
        'AUCTION', p_auction_id, 'hold:' || p_idempotency_key, v_req_hash
    )
    RETURNING id INTO v_hold_ledger_id;

    -- Release 5 coins to outbid previous leader (if any)
    IF v_prev_leader_id IS NOT NULL THEN
        UPDATE public.wallets
        SET available_balance = available_balance + v_bid_fee,
            locked_balance = GREATEST(0, locked_balance - v_bid_fee),
            updated_at = NOW()
        WHERE user_id = v_prev_leader_id;

        INSERT INTO public.coin_ledger (
            user_id, entry_type, delta_available, delta_locked,
            reference_type, reference_id, idempotency_key, request_hash
        ) VALUES (
            v_prev_leader_id, 'BID_RELEASE', v_bid_fee, -v_bid_fee,
            'AUCTION', p_auction_id, 'release:' || p_idempotency_key, v_req_hash
        );

        UPDATE public.bids
        SET status = 'OUTBID'
        WHERE auction_id = p_auction_id AND status = 'LEADING';
    END IF;

    -- Anti-Sniping: extend by +3 minutes if bid arrives in the last 3 minutes
    v_new_ends_at := v_auction.ends_at;
    IF (v_auction.ends_at - NOW()) <= INTERVAL '3 minutes' THEN
        v_new_ends_at := v_auction.ends_at + INTERVAL '3 minutes';
        v_extended := TRUE;
    END IF;

    INSERT INTO public.bids (
        auction_id, bidder_id, amount_cents, coin_fee_amount,
        hold_ledger_id, idempotency_key, status
    ) VALUES (
        p_auction_id, v_bidder_id, p_amount_cents, v_bid_fee,
        v_hold_ledger_id, p_idempotency_key, 'LEADING'
    )
    RETURNING id INTO v_new_bid_id;

    UPDATE public.auctions
    SET current_price_cents = p_amount_cents,
        winner_id = v_bidder_id,
        ends_at = v_new_ends_at,
        anti_sniping_extensions = anti_sniping_extensions + CASE WHEN v_extended THEN 1 ELSE 0 END,
        updated_at = NOW()
    WHERE id = p_auction_id;

    RETURN jsonb_build_object(
        'idempotent_replay', FALSE,
        'bid_id', v_new_bid_id,
        'auction_id', p_auction_id,
        'amount_cents', p_amount_cents,
        'ends_at', v_new_ends_at,
        'anti_sniping_extended', v_extended
    );
END;
$$;

-- 7.3 Escrow Custody Procedures (ADR-03: 7-day hold, release, refund)
CREATE OR REPLACE FUNCTION private.reter_escrow(
    p_order_id UUID,
    p_idempotency_key TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, escrow, private, pg_temp
AS $$
DECLARE
    v_order RECORD;
    v_escrow_id UUID;
BEGIN
    SELECT * INTO v_order FROM escrow.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION '404 ORDER_NOT_FOUND';
    END IF;

    INSERT INTO escrow.escrow_accounts (
        order_id, buyer_id, seller_id, amount_cents, status, held_at, custody_releases_at
    ) VALUES (
        v_order.id, v_order.buyer_id, v_order.seller_id, v_order.amount_cents,
        'RETIDO', NOW(), NOW() + INTERVAL '7 days'
    )
    ON CONFLICT (order_id) DO NOTHING
    RETURNING id INTO v_escrow_id;

    IF v_escrow_id IS NULL THEN
        SELECT id INTO v_escrow_id FROM escrow.escrow_accounts WHERE order_id = p_order_id;
        RETURN v_escrow_id;
    END IF;

    UPDATE escrow.orders
    SET status = 'IN_CUSTODY',
        delivered_at = COALESCE(delivered_at, NOW()),
        updated_at = NOW()
    WHERE id = p_order_id;

    INSERT INTO escrow.escrow_events (escrow_account_id, from_status, to_status, idempotency_key)
    VALUES (v_escrow_id, NULL, 'RETIDO', 'reter:' || p_idempotency_key)
    ON CONFLICT (idempotency_key) DO NOTHING;

    RETURN v_escrow_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.release_escrow(
    p_order_id UUID,
    p_final_type escrow.custody_final_type DEFAULT 'LIBERACAO_AUTOMATICA'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, escrow, private, pg_temp
AS $$
DECLARE
    v_escrow RECORD;
BEGIN
    SELECT * INTO v_escrow FROM escrow.escrow_accounts WHERE order_id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION '404 ESCROW_NOT_FOUND';
    END IF;

    IF v_escrow.status <> 'RETIDO' THEN
        RETURN FALSE;
    END IF;

    IF EXISTS (
        SELECT 1 FROM escrow.disputes
        WHERE escrow_account_id = v_escrow.id
          AND status IN ('ABERTA', 'EM_MEDIACAO', 'EM_ANALISE_TECNICA', 'AGUARDANDO_DUPLA_APROVACAO')
    ) THEN
        RAISE EXCEPTION '409 ACTIVE_DISPUTE_BLOCKS_RELEASE';
    END IF;

    UPDATE escrow.escrow_accounts
    SET status = 'LIBERADO',
        finalized_at = NOW(),
        final_type = p_final_type,
        updated_at = NOW()
    WHERE id = v_escrow.id;

    UPDATE escrow.orders
    SET status = 'COMPLETED', updated_at = NOW()
    WHERE id = p_order_id;

    INSERT INTO escrow.escrow_events (escrow_account_id, from_status, to_status, idempotency_key)
    VALUES (v_escrow.id, 'RETIDO', 'LIBERADO', 'release:' || v_escrow.id::text)
    ON CONFLICT (idempotency_key) DO NOTHING;

    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION private.estornar_escrow(
    p_order_id UUID,
    p_dispute_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, escrow, private, pg_temp
AS $$
DECLARE
    v_escrow RECORD;
    v_dispute RECORD;
BEGIN
    SELECT * INTO v_escrow FROM escrow.escrow_accounts WHERE order_id = p_order_id FOR UPDATE;
    IF NOT FOUND OR v_escrow.status <> 'RETIDO' THEN
        RETURN FALSE;
    END IF;

    SELECT * INTO v_dispute FROM escrow.disputes WHERE id = p_dispute_id;
    IF NOT FOUND OR v_dispute.moderator_1_id IS NULL OR v_dispute.moderator_2_id IS NULL
       OR v_dispute.moderator_1_id = v_dispute.moderator_2_id THEN
        RAISE EXCEPTION '403 DUAL_MODERATOR_APPROVAL_REQUIRED';
    END IF;

    UPDATE escrow.escrow_accounts
    SET status = 'ESTORNADO',
        finalized_at = NOW(),
        final_type = 'ESTORNO',
        moderator_1_id = v_dispute.moderator_1_id,
        moderator_2_id = v_dispute.moderator_2_id,
        updated_at = NOW()
    WHERE id = v_escrow.id;

    UPDATE escrow.orders
    SET status = 'REFUNDED', updated_at = NOW()
    WHERE id = p_order_id;

    INSERT INTO escrow.escrow_events (escrow_account_id, from_status, to_status, idempotency_key)
    VALUES (v_escrow.id, 'RETIDO', 'ESTORNADO', 'estorno:' || v_escrow.id::text)
    ON CONFLICT (idempotency_key) DO NOTHING;

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION private.consume_coins_fifo(UUID, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.place_bid(UUID, BIGINT, BIGINT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.reter_escrow(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.release_escrow(UUID, escrow.custody_final_type) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.estornar_escrow(UUID, UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION private.consume_coins_fifo(UUID, INT) TO service_role;
GRANT EXECUTE ON FUNCTION private.place_bid(UUID, BIGINT, BIGINT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.reter_escrow(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION private.release_escrow(UUID, escrow.custody_final_type) TO service_role;
GRANT EXECUTE ON FUNCTION private.estornar_escrow(UUID, UUID) TO service_role;

-- -----------------------------------------------------------------------------
-- 8. Row-Level Security (RLS) Enablement & Policies (ADR-03, ADR-09, ADR-10)
-- -----------------------------------------------------------------------------
ALTER TABLE escrow.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow.escrow_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow.escrow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow.meetups ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow.qr_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow.disputes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_fifo_lots ENABLE ROW LEVEL SECURITY;

-- Wallets & Coin Ledger: owners can read their own balances/entries; writes only via private.*
CREATE POLICY rls_wallets_select_own ON public.wallets
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY rls_coin_ledger_select_own ON public.coin_ledger
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY rls_coin_fifo_lots_select_own ON public.coin_fifo_lots
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Note: escrow.* tables intentionally have no permissive policies for anon/authenticated;
-- all access is mediated by service_role / FastAPI and private.* SECURITY DEFINER RPCs.
