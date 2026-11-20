-- =============================================================================
-- Steely Platform - Migration 0005 (SPRINT14_017 - DB & API)
-- Schema esg, Projeto 2 DaaS (k >= 30 & >= 3 sellers), Jobs pg_cron + Outbox
-- & Endpoints Support for ESG / Doacao ONG / DaaS / LGPD
--
-- Conforms to: ADR-04, ADR-07, ADR-08, ADR-09, ADR-16, ADR-22
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extensions & Schemas (esg, daas)
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

CREATE SCHEMA IF NOT EXISTS esg;
CREATE SCHEMA IF NOT EXISTS daas;

REVOKE ALL ON SCHEMA esg FROM PUBLIC, anon;
REVOKE ALL ON SCHEMA daas FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA esg TO service_role;
GRANT USAGE ON SCHEMA daas TO service_role;

COMMENT ON SCHEMA esg IS 'Materialized views and LCA sustainability aggregations with k >= 30 regional anonymity (ADR-22).';
COMMENT ON SCHEMA daas IS 'Anonymized market intelligence indicators enforcing k >= 30 transactions and >= 3 distinct sellers (ADR-04).';

-- -----------------------------------------------------------------------------
-- 2. App Configuration, Transactional Outbox & NGO Donations / Ecopontos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_config (
    key VARCHAR(80) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.app_config (key, value, description)
VALUES
    ('daas_min_k_transactions', '30'::jsonb, 'Minimum k-anonymity transaction sample per slice (ADR-04 / PRM-61)'),
    ('daas_min_distinct_sellers', '3'::jsonb, 'Minimum distinct sellers per slice to prevent single-seller inference (ADR-04)'),
    ('esg_min_k_transactions', '30'::jsonb, 'Shared k >= 30 threshold for regional ESG breakdown (ADR-22)'),
    ('escrow_warranty_hours', '168'::jsonb, '7-day (168h) warranty custody window after server-timestamped QR delivery (ADR-03)'),
    ('moderator_sla_hours', '72'::jsonb, '72-hour SLA for human moderation review (ADR-06 / ADR-16)')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Transactional Outbox for pg_cron + pg_net -> FastAPI internal webhooks (ADR-16)
CREATE TABLE IF NOT EXISTS private.outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(60) NOT NULL,
    target_webhook VARCHAR(200) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    status VARCHAR(25) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'DISPATCHED', 'PROCESSED', 'FAILED')),
    attempts INT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    last_error TEXT,
    dispatched_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending ON private.outbox_events(status, created_at ASC)
    WHERE status = 'PENDING';

-- Ecopontos & NGO Donations (Telas 050, 051 - ADR-22 / ADR-26)
CREATE TABLE IF NOT EXISTS public.ecopontos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(160) NOT NULL,
    responsible_entity VARCHAR(160) NOT NULL,
    accepted_materials TEXT[] NOT NULL DEFAULT '{}',
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state CHAR(2) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    opening_hours VARCHAR(120),
    contact_info VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ong_donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID NOT NULL REFERENCES public.users(id),
    ong_user_id UUID REFERENCES public.verified_organizations(user_id),
    category_id INT REFERENCES public.hardware_categories(id),
    offer_id UUID REFERENCES public.offers(id),
    coins_donated INT NOT NULL DEFAULT 0 CHECK (coins_donated >= 0),
    hardware_description TEXT,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    protocol_code VARCHAR(40) UNIQUE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMADA'
        CHECK (status IN ('PENDENTE', 'CONFIRMADA', 'ENTREGUE', 'CANCELADA')),
    esg_points_awarded INT NOT NULL DEFAULT 0 CHECK (esg_points_awarded >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ong_donations_donor ON public.ong_donations(donor_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 3. Schema 'esg': LCA Factors, Materialized Views & Summary RPCs (ADR-22)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.esg_lca_factors (
    id SERIAL PRIMARY KEY,
    category_slug VARCHAR(60) UNIQUE NOT NULL,
    avg_mass_kg NUMERIC(6, 3) NOT NULL CHECK (avg_mass_kg > 0),
    co2e_avoided_kg NUMERIC(8, 2) NOT NULL CHECK (co2e_avoided_kg >= 0),
    minerals_preserved_g NUMERIC(8, 2) NOT NULL CHECK (minerals_preserved_g >= 0),
    water_saved_liters NUMERIC(8, 2) NOT NULL CHECK (water_saved_liters >= 0),
    version VARCHAR(20) NOT NULL DEFAULT 'v1.0-2026',
    methodology_source TEXT NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.esg_lca_factors (
    category_slug, avg_mass_kg, co2e_avoided_kg, minerals_preserved_g, water_saved_liters, version, methodology_source
) VALUES
    ('gpu', 1.250, 42.50, 185.00, 1200.00, 'v1.0-2026', 'LCA Ecoinvent 3.8 / Circular Electronics Partnership - Desktop GPUs'),
    ('motherboard', 0.950, 31.20, 310.00, 950.00, 'v1.0-2026', 'E-waste Inventory & Precious Metals Recovery Benchmark - ATX/mATX'),
    ('ram', 0.045, 4.80, 22.50, 180.00, 'v1.0-2026', 'Semiconductor Energy Intensity Studies - DDR4/DDR5 Modules'),
    ('cpu', 0.035, 18.40, 48.00, 640.00, 'v1.0-2026', 'Silicon Ingot Refining & Fabrication Embodied Carbon Model'),
    ('psu', 1.850, 24.60, 45.00, 420.00, 'v1.0-2026', 'Power Supply SMPS Copper & Magnetics Circular Reutilization Index'),
    ('cpu_cooler', 0.720, 8.50, 12.00, 150.00, 'v1.0-2026', 'Extruded Aluminum & Sintered Heatpipe Environmental Footprint'),
    ('storage', 0.080, 9.60, 34.00, 280.00, 'v1.0-2026', 'NAND Flash and Solid State Drive Manufacturing Footprint Guide'),
    ('case_chassis', 6.200, 16.80, 5.00, 90.00, 'v1.0-2026', 'Recycled Sheet Metal and Tempered Glass Lifecycle Standard')
ON CONFLICT (category_slug) DO UPDATE SET
    avg_mass_kg = EXCLUDED.avg_mass_kg,
    co2e_avoided_kg = EXCLUDED.co2e_avoided_kg,
    minerals_preserved_g = EXCLUDED.minerals_preserved_g,
    water_saved_liters = EXCLUDED.water_saved_liters,
    methodology_source = EXCLUDED.methodology_source;

CREATE MATERIALIZED VIEW IF NOT EXISTS esg.user_monthly AS
SELECT
    ord.buyer_id AS user_id,
    DATE_TRUNC('month', ord.created_at)::DATE AS month_date,
    COUNT(DISTINCT ord.id) AS completed_orders,
    SUM(COALESCE(f.avg_mass_kg, 0.500)) AS ewaste_avoided_kg,
    SUM(COALESCE(f.co2e_avoided_kg, 15.00)) AS co2e_avoided_kg,
    SUM(COALESCE(f.minerals_preserved_g, 50.00)) AS minerals_preserved_g,
    SUM(COALESCE(f.water_saved_liters, 300.00)) AS water_saved_liters
FROM escrow.orders ord
JOIN public.offers off ON off.id = ord.offer_id
JOIN public.hardware_categories cat ON cat.id = off.category_id
LEFT JOIN public.esg_lca_factors f ON f.category_slug = cat.slug
WHERE ord.status = 'COMPLETED'
GROUP BY ord.buyer_id, DATE_TRUNC('month', ord.created_at)::DATE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_esg_user_monthly_pk
    ON esg.user_monthly(user_id, month_date);

CREATE MATERIALIZED VIEW IF NOT EXISTS esg.platform_monthly AS
SELECT
    DATE_TRUNC('month', ord.created_at)::DATE AS month_date,
    off.state AS macro_region,
    cat.slug AS category_slug,
    COUNT(DISTINCT ord.id) AS completed_orders,
    COUNT(DISTINCT ord.seller_id) AS distinct_sellers,
    SUM(COALESCE(f.avg_mass_kg, 0.500)) AS ewaste_avoided_kg,
    SUM(COALESCE(f.co2e_avoided_kg, 15.00)) AS co2e_avoided_kg,
    SUM(COALESCE(f.minerals_preserved_g, 50.00)) AS minerals_preserved_g,
    SUM(COALESCE(f.water_saved_liters, 300.00)) AS water_saved_liters
FROM escrow.orders ord
JOIN public.offers off ON off.id = ord.offer_id
JOIN public.hardware_categories cat ON cat.id = off.category_id
LEFT JOIN public.esg_lca_factors f ON f.category_slug = cat.slug
WHERE ord.status = 'COMPLETED'
GROUP BY DATE_TRUNC('month', ord.created_at)::DATE, off.state, cat.slug;

CREATE UNIQUE INDEX IF NOT EXISTS idx_esg_platform_monthly_pk
    ON esg.platform_monthly(month_date, macro_region, category_slug);

CREATE OR REPLACE FUNCTION private.esg_platform_summary(
    p_region VARCHAR DEFAULT 'BRASIL_CONSOLIDADO',
    p_min_k INT DEFAULT 30,
    p_min_sellers INT DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, esg, private, extensions, pg_temp
AS $$
DECLARE
    v_req_region VARCHAR := COALESCE(upper(p_region), 'BRASIL_CONSOLIDADO');
    v_eff_region VARCHAR := v_req_region;
    v_escalated BOOLEAN := FALSE;
    v_orders BIGINT := 0;
    v_sellers BIGINT := 0;
    v_ewaste NUMERIC := 0;
    v_co2 NUMERIC := 0;
    v_minerals NUMERIC := 0;
    v_water NUMERIC := 0;
BEGIN
    SELECT
        COALESCE(SUM(completed_orders), 0),
        COALESCE(SUM(distinct_sellers), 0),
        COALESCE(SUM(ewaste_avoided_kg), 0),
        COALESCE(SUM(co2e_avoided_kg), 0),
        COALESCE(SUM(minerals_preserved_g), 0),
        COALESCE(SUM(water_saved_liters), 0)
    INTO v_orders, v_sellers, v_ewaste, v_co2, v_minerals, v_water
    FROM esg.platform_monthly
    WHERE (v_req_region = 'BRASIL_CONSOLIDADO' OR macro_region = v_req_region);

    -- Enforce k >= 30 and >= 3 distinct sellers; escalate to BRASIL_CONSOLIDADO if sub-threshold
    IF (v_orders < p_min_k OR v_sellers < p_min_sellers) AND v_req_region <> 'BRASIL_CONSOLIDADO' THEN
        v_eff_region := 'BRASIL_CONSOLIDADO';
        v_escalated := TRUE;

        SELECT
            COALESCE(SUM(completed_orders), 0),
            COALESCE(SUM(distinct_sellers), 0),
            COALESCE(SUM(ewaste_avoided_kg), 0),
            COALESCE(SUM(co2e_avoided_kg), 0),
            COALESCE(SUM(minerals_preserved_g), 0),
            COALESCE(SUM(water_saved_liters), 0)
        INTO v_orders, v_sellers, v_ewaste, v_co2, v_minerals, v_water
        FROM esg.platform_monthly;
    END IF;

    RETURN jsonb_build_object(
        'requested_region', v_req_region,
        'effective_region', v_eff_region,
        'escalation_applied', v_escalated,
        'k_anonymity_satisfied', (v_orders >= p_min_k AND v_sellers >= p_min_sellers),
        'sample_orders', v_orders,
        'distinct_sellers', v_sellers,
        'ewaste_avoided_kg', v_ewaste,
        'co2e_avoided_kg', v_co2,
        'minerals_preserved_g', v_minerals,
        'water_saved_liters', v_water,
        'methodology_version', 'v1.0-2026'
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. Schema 'daas': Segregated Tables & k >= 30 + >= 3 Sellers Sync (ADR-04)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daas.market_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_slug VARCHAR(60) NOT NULL,
    aggregation_level VARCHAR(20) NOT NULL
        CHECK (aggregation_level IN ('MODEL', 'FAMILY', 'MANUFACTURER', 'CATEGORY')),
    subject_key VARCHAR(150) NOT NULL,
    macro_region VARCHAR(40) NOT NULL DEFAULT 'BRASIL_CONSOLIDADO',
    reference_month CHAR(7) NOT NULL,
    -- Structural k-anonymity constraints: never stores a slice with k < 30 or < 3 sellers (ADR-04)
    sample_k INT NOT NULL CHECK (sample_k >= 30),
    distinct_sellers INT NOT NULL CHECK (distinct_sellers >= 3),
    avg_price_cents BIGINT NOT NULL CHECK (avg_price_cents >= 0),
    median_price_cents BIGINT NOT NULL CHECK (median_price_cents >= 0),
    reuse_rate_pct NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
    is_synthetic_demo BOOLEAN NOT NULL DEFAULT FALSE,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_daas_indicator_slice
        UNIQUE (category_slug, aggregation_level, subject_key, macro_region, reference_month)
);

CREATE TABLE IF NOT EXISTS daas.reports_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    reference_month CHAR(7) NOT NULL,
    total_slices INT NOT NULL CHECK (total_slices >= 0),
    min_k_enforced INT NOT NULL DEFAULT 30 CHECK (min_k_enforced >= 30),
    min_sellers_enforced INT NOT NULL DEFAULT 3 CHECK (min_sellers_enforced >= 3),
    is_synthetic_demo BOOLEAN NOT NULL DEFAULT FALSE,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION private.sync_daas_k30(
    p_reference_month CHAR(7) DEFAULT to_char(NOW(), 'YYYY-MM')
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, escrow, daas, private, audit, extensions, pg_temp
AS $$
DECLARE
    v_synced INT := 0;
    v_suppressed INT := 0;
    v_rec RECORD;
BEGIN
    -- Count sub-threshold category slices suppressed by k < 30 or distinct_sellers < 3
    SELECT COUNT(*) INTO v_suppressed
    FROM (
        SELECT cat.slug
        FROM escrow.orders ord
        JOIN public.offers off ON off.id = ord.offer_id
        JOIN public.hardware_categories cat ON cat.id = off.category_id
        WHERE ord.status = 'COMPLETED'
          AND to_char(ord.created_at, 'YYYY-MM') = p_reference_month
        GROUP BY cat.slug
        HAVING COUNT(DISTINCT ord.id) < 30 OR COUNT(DISTINCT ord.seller_id) < 3
    ) sub;

    -- Aggregate valid slices meeting k >= 30 and distinct_sellers >= 3
    FOR v_rec IN
        SELECT
            cat.slug AS category_slug,
            COUNT(DISTINCT ord.id)::INT AS sample_k,
            COUNT(DISTINCT ord.seller_id)::INT AS distinct_sellers,
            AVG(ord.amount_cents)::BIGINT AS avg_price_cents,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ord.amount_cents)::BIGINT AS median_price_cents
        FROM escrow.orders ord
        JOIN public.offers off ON off.id = ord.offer_id
        JOIN public.hardware_categories cat ON cat.id = off.category_id
        WHERE ord.status = 'COMPLETED'
          AND to_char(ord.created_at, 'YYYY-MM') = p_reference_month
        GROUP BY cat.slug
        HAVING COUNT(DISTINCT ord.id) >= 30
           AND COUNT(DISTINCT ord.seller_id) >= 3
    LOOP
        INSERT INTO daas.market_indicators (
            category_slug, aggregation_level, subject_key, macro_region, reference_month,
            sample_k, distinct_sellers, avg_price_cents, median_price_cents, is_synthetic_demo, synced_at
        ) VALUES (
            v_rec.category_slug, 'CATEGORY', v_rec.category_slug, 'BRASIL_CONSOLIDADO', p_reference_month,
            v_rec.sample_k, v_rec.distinct_sellers, v_rec.avg_price_cents, v_rec.median_price_cents, FALSE, NOW()
        )
        ON CONFLICT (category_slug, aggregation_level, subject_key, macro_region, reference_month)
        DO UPDATE SET
            sample_k = EXCLUDED.sample_k,
            distinct_sellers = EXCLUDED.distinct_sellers,
            avg_price_cents = EXCLUDED.avg_price_cents,
            median_price_cents = EXCLUDED.median_price_cents,
            synced_at = NOW();

        v_synced := v_synced + 1;
    END LOOP;

    -- Enqueue Outbox event for Project 2 external sync webhook (ADR-04 / ADR-16)
    INSERT INTO private.outbox_events (
        event_type, target_webhook, payload, idempotency_key
    ) VALUES (
        'DAAS_SYNC_K30',
        '/api/v1/daas/internal/jobs/sync-daas',
        jsonb_build_object(
            'reference_month', p_reference_month,
            'synced_slices', v_synced,
            'suppressed_sub_k30', v_suppressed
        ),
        'daas-sync:' || p_reference_month || ':' || to_char(NOW(), 'YYYYMMDD')
    )
    ON CONFLICT (idempotency_key) DO UPDATE SET
        payload = EXCLUDED.payload,
        status = 'PENDING';

    PERFORM private.audit_log(
        'SYSTEM',
        'DAAS_SYNC_EXECUTED',
        NULL,
        'daas:' || p_reference_month,
        jsonb_build_object('synced_slices', v_synced, 'suppressed_sub_k30', v_suppressed)
    );

    RETURN jsonb_build_object(
        'reference_month', p_reference_month,
        'synced_slices', v_synced,
        'suppressed_sub_k30', v_suppressed,
        'min_k_enforced', 30,
        'min_sellers_enforced', 3
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. Scheduled Sweep Procedures (Auctions, Escrow 7d, ESG Refresh - ADR-16)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.sweep_close_expired_auctions()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, audit, extensions, pg_temp
AS $$
DECLARE
    v_auc RECORD;
    v_closed INT := 0;
    v_req_hash CHAR(64);
BEGIN
    FOR v_auc IN
        SELECT * FROM public.auctions
        WHERE status = 'ABERTO' AND ends_at <= NOW()
        FOR UPDATE SKIP LOCKED
    LOOP
        UPDATE public.auctions
        SET status = CASE WHEN v_auc.winner_id IS NOT NULL THEN 'AGUARDANDO_RESGATE'::public.auction_status ELSE 'ENCERRADO'::public.auction_status END,
            updated_at = NOW()
        WHERE id = v_auc.id;

        IF v_auc.winner_id IS NOT NULL THEN
            v_req_hash := encode(digest('close:' || v_auc.id::text, 'sha256'), 'hex');

            UPDATE public.wallets
            SET locked_balance = GREATEST(0, locked_balance - 5),
                updated_at = NOW()
            WHERE user_id = v_auc.winner_id;

            INSERT INTO public.coin_ledger (
                user_id, entry_type, delta_available, delta_locked,
                reference_type, reference_id, idempotency_key, request_hash
            ) VALUES (
                v_auc.winner_id, 'BID_CAPTURE_BURN', 0, -5,
                'AUCTION', v_auc.id, 'close:' || v_auc.id::text, v_req_hash
            )
            ON CONFLICT (user_id, entry_type, idempotency_key) DO NOTHING;

            UPDATE public.bids
            SET status = 'WON'
            WHERE auction_id = v_auc.id AND bidder_id = v_auc.winner_id AND status = 'LEADING';
        END IF;

        INSERT INTO private.outbox_events (
            event_type, target_webhook, payload, idempotency_key
        ) VALUES (
            'AUCTION_CLOSED',
            '/api/v1/internal/jobs/auction-closed',
            jsonb_build_object('auction_id', v_auc.id, 'winner_id', v_auc.winner_id, 'final_price_cents', v_auc.current_price_cents),
            'auction-close:' || v_auc.id::text
        )
        ON CONFLICT (idempotency_key) DO NOTHING;

        v_closed := v_closed + 1;
    END LOOP;

    RETURN v_closed;
END;
$$;

CREATE OR REPLACE FUNCTION private.sweep_release_escrow_7d()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, escrow, private, audit, extensions, pg_temp
AS $$
DECLARE
    v_esc RECORD;
    v_released INT := 0;
BEGIN
    FOR v_esc IN
        SELECT * FROM escrow.escrow_accounts
        WHERE status = 'RETIDO'
          AND custody_releases_at <= NOW()
          AND NOT EXISTS (
              SELECT 1 FROM escrow.disputes d
              WHERE d.escrow_account_id = escrow.escrow_accounts.id
                AND d.status IN ('ABERTA', 'EM_MEDIACAO', 'EM_ANALISE_TECNICA', 'AGUARDANDO_DUPLA_APROVACAO')
          )
        FOR UPDATE SKIP LOCKED
    LOOP
        IF private.release_escrow(v_esc.order_id, 'LIBERACAO_AUTOMATICA') THEN
            INSERT INTO private.outbox_events (
                event_type, target_webhook, payload, idempotency_key
            ) VALUES (
                'ESCROW_RELEASED_7D',
                '/api/v1/internal/jobs/escrow-released',
                jsonb_build_object('escrow_id', v_esc.id, 'order_id', v_esc.order_id, 'seller_id', v_esc.seller_id),
                'escrow-release-7d:' || v_esc.id::text
            )
            ON CONFLICT (idempotency_key) DO NOTHING;

            v_released := v_released + 1;
        END IF;
    END LOOP;

    RETURN v_released;
END;
$$;

CREATE OR REPLACE FUNCTION private.sweep_refresh_esg_views()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, esg, private, pg_temp
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY esg.user_monthly;
    REFRESH MATERIALIZED VIEW CONCURRENTLY esg.platform_monthly;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. pg_cron Job Schedules (Idempotent Registration - ADR-16)
-- -----------------------------------------------------------------------------
SELECT cron.schedule(
    'steely-sweep-auctions-1m',
    '* * * * *',
    'SELECT private.sweep_close_expired_auctions();'
);

SELECT cron.schedule(
    'steely-sweep-escrow-7d',
    '*/15 * * * *',
    'SELECT private.sweep_release_escrow_7d();'
);

SELECT cron.schedule(
    'steely-hourly-esg-refresh',
    '0 * * * *',
    'SELECT private.sweep_refresh_esg_views();'
);

SELECT cron.schedule(
    'steely-daily-lgpd-purge-30d',
    '0 3 * * *',
    'SELECT private.sweep_lgpd_anonymization_30d();'
);

SELECT cron.schedule(
    'steely-daily-daas-sync-k30',
    '0 4 * * *',
    'SELECT private.sync_daas_k30();'
);

-- -----------------------------------------------------------------------------
-- 7. Row-Level Security (RLS) Enablement & Policies
-- -----------------------------------------------------------------------------
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecopontos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ong_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esg_lca_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE daas.market_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE daas.reports_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_app_config_select ON public.app_config
    FOR SELECT TO authenticated
    USING (TRUE);

CREATE POLICY rls_ecopontos_select_public ON public.ecopontos
    FOR SELECT TO authenticated, anon
    USING (is_active = TRUE);

CREATE POLICY rls_ong_donations_select_own ON public.ong_donations
    FOR SELECT TO authenticated
    USING (donor_id = auth.uid() OR ong_user_id = auth.uid());

CREATE POLICY rls_ong_donations_insert_own ON public.ong_donations
    FOR INSERT TO authenticated
    WITH CHECK (donor_id = auth.uid());

CREATE POLICY rls_esg_factors_select_public ON public.esg_lca_factors
    FOR SELECT TO authenticated, anon
    USING (TRUE);

REVOKE ALL ON FUNCTION private.esg_platform_summary(VARCHAR, INT, INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.sync_daas_k30(CHAR) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.sweep_close_expired_auctions() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.sweep_release_escrow_7d() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.sweep_refresh_esg_views() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION private.esg_platform_summary(VARCHAR, INT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.sync_daas_k30(CHAR) TO service_role;
GRANT EXECUTE ON FUNCTION private.sweep_close_expired_auctions() TO service_role;
GRANT EXECUTE ON FUNCTION private.sweep_release_escrow_7d() TO service_role;
GRANT EXECUTE ON FUNCTION private.sweep_refresh_esg_views() TO service_role;

-- -----------------------------------------------------------------------------
-- 8. In-Database Automated Validation Suite (SPRINT14_017)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.run_sprint14_017_validation_suite()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, escrow, esg, daas, private, audit, extensions, pg_temp
AS $$
DECLARE
    v_k29_blocked BOOLEAN := FALSE;
    v_sellers2_blocked BOOLEAN := FALSE;
    v_k30_inserted BOOLEAN := FALSE;
    v_esg_summary JSONB;
    v_sync_res JSONB;
    v_cron_count INT := 0;
    v_outbox_count INT := 0;
    v_lca_count INT := 0;
BEGIN
    -- 1. Verify ADR-04 structural constraint: k=29 must be rejected
    BEGIN
        INSERT INTO daas.market_indicators (
            category_slug, aggregation_level, subject_key, macro_region, reference_month,
            sample_k, distinct_sellers, avg_price_cents, median_price_cents, is_synthetic_demo
        ) VALUES (
            'gpu', 'MODEL', 'RTX-3060-SUB-K', 'BRASIL_CONSOLIDADO', '2026-11',
            29, 5, 145000, 142000, TRUE
        );
    EXCEPTION WHEN check_violation THEN
        v_k29_blocked := TRUE;
    END;

    -- 2. Verify ADR-04 structural constraint: distinct_sellers=2 (< 3) must be rejected
    BEGIN
        INSERT INTO daas.market_indicators (
            category_slug, aggregation_level, subject_key, macro_region, reference_month,
            sample_k, distinct_sellers, avg_price_cents, median_price_cents, is_synthetic_demo
        ) VALUES (
            'gpu', 'MODEL', 'RTX-3060-SUB-SELLERS', 'BRASIL_CONSOLIDADO', '2026-11',
            35, 2, 145000, 142000, TRUE
        );
    EXCEPTION WHEN check_violation THEN
        v_sellers2_blocked := TRUE;
    END;

    -- 3. Verify valid slice (k=42 >= 30, distinct_sellers=7 >= 3) succeeds
    INSERT INTO daas.market_indicators (
        category_slug, aggregation_level, subject_key, macro_region, reference_month,
        sample_k, distinct_sellers, avg_price_cents, median_price_cents, is_synthetic_demo
    ) VALUES (
        'gpu', 'MODEL', 'RTX-3060-12GB-DEMO', 'BRASIL_CONSOLIDADO', '2026-11',
        42, 7, 145000, 142000, TRUE
    )
    ON CONFLICT (category_slug, aggregation_level, subject_key, macro_region, reference_month)
    DO UPDATE SET sample_k = EXCLUDED.sample_k;
    v_k30_inserted := TRUE;

    -- 4. Run ESG refresh, ESG regional escalation summary, and DaaS sync + outbox enqueue
    PERFORM private.sweep_refresh_esg_views();
    v_esg_summary := private.esg_platform_summary('NORTE', 30, 3);
    v_sync_res := private.sync_daas_k30('2026-11');

    SELECT COUNT(*)::INT INTO v_cron_count
    FROM cron.job
    WHERE jobname IN (
        'steely-sweep-auctions-1m',
        'steely-sweep-escrow-7d',
        'steely-hourly-esg-refresh',
        'steely-daily-lgpd-purge-30d',
        'steely-daily-daas-sync-k30'
    );

    SELECT COUNT(*)::INT INTO v_outbox_count
    FROM private.outbox_events
    WHERE event_type = 'DAAS_SYNC_K30';

    SELECT COUNT(*)::INT INTO v_lca_count
    FROM public.esg_lca_factors;

    RETURN jsonb_build_object(
        'adr04_k29_rejected', v_k29_blocked,
        'adr04_sellers2_rejected', v_sellers2_blocked,
        'adr04_k30_valid_accepted', v_k30_inserted,
        'adr16_pg_cron_jobs_scheduled', v_cron_count,
        'adr16_outbox_daas_event_queued', (v_outbox_count >= 1),
        'adr22_lca_factors_seeded', v_lca_count,
        'adr22_esg_regional_escalation_applied', (v_esg_summary->>'escalation_applied')::boolean
    );
END;
$$;

REVOKE ALL ON FUNCTION private.run_sprint14_017_validation_suite() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.run_sprint14_017_validation_suite() TO service_role;
