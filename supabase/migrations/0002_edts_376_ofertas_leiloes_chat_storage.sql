-- =============================================================================
-- Steely Platform - Migration 0002 (EDTS-376 / SPRINT13_004)
-- DDL Ofertas, Leiloes, Chat Cego & Buckets Privados do Supabase Storage:
--   - Tables: offers, offer_media, offer_specs, private.offer_exact_addresses
--             auctions, bids
--             chat_threads, chat_messages
--   - Composite, GIST PostGIS & GIN Trigram Indexes
--   - Strict RLS Policies for Owners & Participants (ADR-08, ADR-11, ADR-15)
--   - 3 Private Storage Buckets (public = false):
--       offers-media, disputes-laudos, chat-attachments (ADR-11)
-- Target Engine: PostgreSQL 15+ / Supabase
-- Dependencies: 0001_edts_378_core_public_private.sql ONLY
-- Note: Escrow, Coin Ledger / place_bid() (EDTS-412) and ESG/DaaS (EDTS-444) excluded.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Domain Enums (Idempotent)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.offer_type AS ENUM ('PECA', 'MAQUINA', 'LOTE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.hardware_condition AS ENUM ('NOVO', 'SEMINOVO', 'USADO', 'DEFEITO_SUCATA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.offer_status AS ENUM (
        'RASCUNHO', 'ATIVA', 'PAUSADA', 'RESERVADA', 'VENDIDA', 'FINALIZADA', 'REMOVIDA'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.auction_status AS ENUM (
        'AGENDADO', 'ABERTO', 'ENCERRADO', 'CANCELADO', 'AGUARDANDO_RESGATE'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.bid_status AS ENUM ('LEADING', 'OUTBID', 'WON', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.chat_thread_status AS ENUM ('ABERTA', 'ENCERRADA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 2. Offers (Anuncios, Midias, Especificacoes & Endereco Exato RB-06)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.users(id),
    category_id INT NOT NULL REFERENCES public.hardware_categories(id),
    model_id UUID REFERENCES public.hardware_models(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    offer_type public.offer_type NOT NULL DEFAULT 'PECA',
    condition public.hardware_condition NOT NULL,
    price_cents BIGINT NOT NULL CHECK (price_cents >= 0),
    allows_proposals BOOLEAN NOT NULL DEFAULT TRUE,
    allows_trade BOOLEAN NOT NULL DEFAULT FALSE,
    is_combo BOOLEAN NOT NULL DEFAULT FALSE,
    status public.offer_status NOT NULL DEFAULT 'RASCUNHO',
    -- Fuzzy location publicly visible; exact address is isolated in private (RB-06)
    location_geom GEOMETRY(Point, 4326),
    approx_neighborhood VARCHAR(120),
    city VARCHAR(100) NOT NULL,
    state CHAR(2) NOT NULL,
    boost_active_until TIMESTAMPTZ,
    views_count INT NOT NULL DEFAULT 0 CHECK (views_count >= 0),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.offer_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    sort_order SMALLINT NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    is_cover BOOLEAN NOT NULL DEFAULT FALSE,
    scanner_verified BOOLEAN NOT NULL DEFAULT FALSE,
    scanner_confidence NUMERIC(4, 3)
        CHECK (scanner_confidence IS NULL OR (scanner_confidence >= 0.000 AND scanner_confidence <= 1.000)),
    scanner_detected_sku VARCHAR(120),
    scanner_result_id UUID REFERENCES public.scanner_results(id) ON DELETE SET NULL,
    bounding_box JSONB,
    perceptual_hash CHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.offer_specs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
    spec_key VARCHAR(80) NOT NULL,
    spec_value TEXT NOT NULL,
    spec_unit VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_offer_specs_key UNIQUE (offer_id, spec_key)
);

-- Exact physical address protected under unexposed schema 'private' (RB-06)
CREATE TABLE IF NOT EXISTS private.offer_exact_addresses (
    offer_id UUID PRIMARY KEY REFERENCES public.offers(id) ON DELETE CASCADE,
    cep CHAR(8) NOT NULL,
    address_encrypted BYTEA NOT NULL,
    exact_lat NUMERIC(10, 7) NOT NULL,
    exact_lng NUMERIC(10, 7) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. Auctions & Bids (ADR-15)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID UNIQUE NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
    starting_price_cents BIGINT NOT NULL CHECK (starting_price_cents > 0),
    min_increment_cents BIGINT NOT NULL DEFAULT 500 CHECK (min_increment_cents > 0),
    current_price_cents BIGINT NOT NULL DEFAULT 0 CHECK (current_price_cents >= 0),
    winner_id UUID REFERENCES public.users(id),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL,
    anti_sniping_extensions INT NOT NULL DEFAULT 0 CHECK (anti_sniping_extensions >= 0),
    status public.auction_status NOT NULL DEFAULT 'ABERTO',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_auction_window CHECK (ends_at > starts_at)
);

-- Note: hold_ledger_id is kept decoupled (without FK) until EDTS-412 creates wallet_ledger.
CREATE TABLE IF NOT EXISTS public.bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
    bidder_id UUID NOT NULL REFERENCES public.users(id),
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    coin_fee_amount SMALLINT NOT NULL DEFAULT 5 CHECK (coin_fee_amount >= 0),
    hold_ledger_id UUID,
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    status public.bid_status NOT NULL DEFAULT 'LEADING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. Blind Chat & Anti-PII Messaging (ADR-02, RB-15)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.users(id),
    seller_id UUID NOT NULL REFERENCES public.users(id),
    status public.chat_thread_status NOT NULL DEFAULT 'ABERTA',
    closed_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_chat_thread_offer_buyer UNIQUE (offer_id, buyer_id),
    CONSTRAINT chk_chat_distinct_parties CHECK (buyer_id <> seller_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id),
    sanitized_content TEXT NOT NULL,
    attachment_path TEXT,
    pii_detected BOOLEAN NOT NULL DEFAULT FALSE,
    pii_type VARCHAR(50),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. Composite, GIST & Search Indexes
-- -----------------------------------------------------------------------------
-- Offers listing, geo-radius & full/trigram search
CREATE INDEX IF NOT EXISTS idx_offers_listing_composite
    ON public.offers(status, category_id, price_cents, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_seller_status
    ON public.offers(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_offers_model
    ON public.offers(model_id);
CREATE INDEX IF NOT EXISTS idx_offers_geom
    ON public.offers USING gist (location_geom);
CREATE INDEX IF NOT EXISTS idx_offers_title_trgm
    ON public.offers USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_offer_media_order
    ON public.offer_media(offer_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_offer_specs_offer
    ON public.offer_specs(offer_id);

-- Auctions & Bids ordering
CREATE INDEX IF NOT EXISTS idx_auctions_status_ends
    ON public.auctions(status, ends_at);
CREATE INDEX IF NOT EXISTS idx_bids_auction_amount
    ON public.bids(auction_id, amount_cents DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_bids_bidder_time
    ON public.bids(bidder_id, created_at DESC);

-- Chat threads & message history
CREATE INDEX IF NOT EXISTS idx_chat_threads_buyer
    ON public.chat_threads(buyer_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_threads_seller
    ON public.chat_threads(seller_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_history
    ON public.chat_messages(thread_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 6. Row-Level Security (RLS) Enablement & Policies (ADR-08, ADR-11, ADR-15)
-- -----------------------------------------------------------------------------
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.offer_exact_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Offers: public reads active listings; sellers manage their own
CREATE POLICY rls_offers_select_active_or_own ON public.offers
    FOR SELECT TO authenticated, anon
    USING (status = 'ATIVA' OR seller_id = auth.uid());

CREATE POLICY rls_offers_insert_own ON public.offers
    FOR INSERT TO authenticated
    WITH CHECK (seller_id = auth.uid());

CREATE POLICY rls_offers_update_own ON public.offers
    FOR UPDATE TO authenticated
    USING (seller_id = auth.uid())
    WITH CHECK (seller_id = auth.uid());

CREATE POLICY rls_offers_delete_own ON public.offers
    FOR DELETE TO authenticated
    USING (seller_id = auth.uid());

-- Offer Media & Specs: visible if parent offer is active or owned by user
CREATE POLICY rls_offer_media_select ON public.offer_media
    FOR SELECT TO authenticated, anon
    USING (EXISTS (
        SELECT 1 FROM public.offers o
        WHERE o.id = offer_id AND (o.status = 'ATIVA' OR o.seller_id = auth.uid())
    ));

CREATE POLICY rls_offer_media_modify_own ON public.offer_media
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.offers o
        WHERE o.id = offer_id AND o.seller_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.offers o
        WHERE o.id = offer_id AND o.seller_id = auth.uid()
    ));

CREATE POLICY rls_offer_specs_select ON public.offer_specs
    FOR SELECT TO authenticated, anon
    USING (EXISTS (
        SELECT 1 FROM public.offers o
        WHERE o.id = offer_id AND (o.status = 'ATIVA' OR o.seller_id = auth.uid())
    ));

CREATE POLICY rls_offer_specs_modify_own ON public.offer_specs
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.offers o
        WHERE o.id = offer_id AND o.seller_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.offers o
        WHERE o.id = offer_id AND o.seller_id = auth.uid()
    ));

-- Auctions & Bids (ADR-15: direct bid insertion will be handled via private.rpc_place_auction_bid in EDTS-412)
CREATE POLICY rls_auctions_select_public ON public.auctions
    FOR SELECT TO authenticated, anon
    USING (TRUE);

CREATE POLICY rls_auctions_modify_seller ON public.auctions
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.offers o
        WHERE o.id = offer_id AND o.seller_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.offers o
        WHERE o.id = offer_id AND o.seller_id = auth.uid()
    ));

CREATE POLICY rls_bids_select_authenticated ON public.bids
    FOR SELECT TO authenticated
    USING (TRUE);

-- Blind Chat: strict tenant isolation between buyer and seller
CREATE POLICY rls_chat_threads_select_participant ON public.chat_threads
    FOR SELECT TO authenticated
    USING (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY rls_chat_threads_insert_participant ON public.chat_threads
    FOR INSERT TO authenticated
    WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY rls_chat_threads_update_participant ON public.chat_threads
    FOR UPDATE TO authenticated
    USING (buyer_id = auth.uid() OR seller_id = auth.uid())
    WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY rls_chat_messages_select_participant ON public.chat_messages
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.chat_threads t
        WHERE t.id = thread_id AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    ));

CREATE POLICY rls_chat_messages_insert_participant ON public.chat_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.chat_threads t
            WHERE t.id = thread_id
              AND t.status = 'ABERTA'
              AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
        )
    );

-- -----------------------------------------------------------------------------
-- 7. Supabase Storage: 3 Mandatory Private Buckets & RLS Policies (ADR-11)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    (
        'offers-media',
        'offers-media',
        FALSE,
        2097152, -- 2 MB
        ARRAY['image/webp', 'image/jpeg', 'image/png']
    ),
    (
        'disputes-laudos',
        'disputes-laudos',
        FALSE,
        52428800, -- 50 MB (ADR-11 video evidence limit)
        ARRAY['image/webp', 'image/jpeg', 'image/png', 'video/mp4', 'video/webm']
    ),
    (
        'chat-attachments',
        'chat-attachments',
        FALSE,
        2097152, -- 2 MB
        ARRAY['image/webp', 'image/jpeg', 'image/png']
    )
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage Object RLS: block anonymous access; authenticated users operate within their uid prefix
-- (FastAPI service_role issues Signed URLs for cross-party reads such as chat/disputes/catalog)
DROP POLICY IF EXISTS rls_storage_offers_media_select ON storage.objects;
DROP POLICY IF EXISTS rls_storage_offers_media_insert ON storage.objects;
DROP POLICY IF EXISTS rls_storage_offers_media_delete ON storage.objects;
DROP POLICY IF EXISTS rls_storage_disputes_laudos_select ON storage.objects;
DROP POLICY IF EXISTS rls_storage_disputes_laudos_insert ON storage.objects;
DROP POLICY IF EXISTS rls_storage_chat_attachments_select ON storage.objects;
DROP POLICY IF EXISTS rls_storage_chat_attachments_insert ON storage.objects;

CREATE POLICY rls_storage_offers_media_select ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'offers-media');

CREATE POLICY rls_storage_offers_media_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'offers-media'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY rls_storage_offers_media_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'offers-media'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY rls_storage_disputes_laudos_select ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'disputes-laudos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY rls_storage_disputes_laudos_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'disputes-laudos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY rls_storage_chat_attachments_select ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'chat-attachments'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY rls_storage_chat_attachments_insert ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'chat-attachments'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
