-- =============================================================================
-- Steely Platform - Migration 0001 (EDTS-378 / SPRINT13_003)
-- Setup Supabase Core + DDL Schemas public & private:
--   - Extensions: postgis, pgcrypto, pg_trgm, unaccent, uuid-ossp
--   - Schemas: public, private (ADR-08, ADR-09)
--   - Identity & Access (Users, Profiles, Addresses, Reputation, Sanctions, KYC)
--   - Catalog & AI Scanner (Categories, Homologated Models, Scanner Refs/Results)
--   - PostGIS GIST & B-Tree/GIN Indexes + Base RLS Policies
-- Target Engine: PostgreSQL 15+ / Supabase
-- Note: Escrow, Coin Ledger (EDTS-412) and ESG/DaaS/pg_cron (EDTS-444) excluded.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Required Extensions (ADR-08)
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- -----------------------------------------------------------------------------
-- 2. Schemas & Access Hardening (ADR-08, ADR-09)
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

COMMENT ON SCHEMA private IS 'Unexposed schema for sensitive PII/KYC, exact addresses (RB-06), and SECURITY DEFINER functions (ADR-09).';

-- -----------------------------------------------------------------------------
-- 3. Domain Enums (Idempotent)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('USER', 'ONG', 'PARTNER_TECH', 'MODERATOR', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.account_status AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_DELETION', 'DELETED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.sanction_type AS ENUM ('WARNING', 'TEMP_SUSPENSION', 'PERMANENT_BAN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.organization_type AS ENUM ('ONG', 'ESCOLA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.scanner_confidence_band AS ENUM ('AUTO_FILL', 'HYPOTHESES', 'MANUAL_LT_50');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 4. Package 1: Identity & Access (public + private)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    cpf_hash TEXT UNIQUE,
    password_hash TEXT,
    role public.user_role NOT NULL DEFAULT 'USER',
    status public.account_status NOT NULL DEFAULT 'ACTIVE',
    kyc_verified BOOLEAN NOT NULL DEFAULT FALSE,
    trust_score NUMERIC(5, 2) NOT NULL DEFAULT 100.00
        CHECK (trust_score >= 0.00 AND trust_score <= 100.00),
    phone_masked VARCHAR(30),
    deletion_requested_at TIMESTAMPTZ,
    grace_period_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    display_name VARCHAR(120) NOT NULL,
    avatar_path TEXT,
    bio TEXT,
    reputation_avg NUMERIC(3, 2) NOT NULL DEFAULT 5.00
        CHECK (reputation_avg >= 0.00 AND reputation_avg <= 5.00),
    total_reviews INT NOT NULL DEFAULT 0 CHECK (total_reviews >= 0),
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Publicly visible fuzzy location (RB-06: exact coordinates live in private)
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    label VARCHAR(60) NOT NULL DEFAULT 'Principal',
    approx_neighborhood VARCHAR(120),
    city VARCHAR(100) NOT NULL,
    state CHAR(2) NOT NULL,
    location_geom GEOMETRY(Point, 4326),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exact physical address protected in unexposed schema 'private' (RB-06)
CREATE TABLE IF NOT EXISTS private.user_exact_addresses (
    address_id UUID PRIMARY KEY REFERENCES public.user_addresses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    cep CHAR(8) NOT NULL,
    street_encrypted BYTEA NOT NULL,
    number_encrypted BYTEA NOT NULL,
    complement_encrypted BYTEA,
    exact_lat NUMERIC(10, 7) NOT NULL,
    exact_lng NUMERIC(10, 7) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sensitive KYC documents stored in unexposed schema 'private' (ADR-08, ADR-09)
CREATE TABLE IF NOT EXISTS private.user_kyc_docs (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    cpf_encrypted BYTEA NOT NULL,
    doc_front_path TEXT NOT NULL,
    doc_back_path TEXT NOT NULL,
    selfie_path TEXT NOT NULL,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5-year legal fiscal retention without FK to deleted user (ADR-07)
CREATE TABLE IF NOT EXISTS private.legal_retention (
    pseudonym_id UUID PRIMARY KEY,
    fiscal_cpf_encrypted BYTEA NOT NULL,
    retain_until DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_reputation_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id UUID NOT NULL REFERENCES public.users(id),
    reviewed_id UUID NOT NULL REFERENCES public.users(id),
    reference_offer_id UUID,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    editable_until TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_no_self_review CHECK (reviewer_id <> reviewed_id)
);

CREATE TABLE IF NOT EXISTS public.user_sanctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type public.sanction_type NOT NULL,
    reason TEXT NOT NULL,
    applied_by UUID REFERENCES public.users(id),
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_permanent BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.verified_organizations (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    cnpj VARCHAR(14) UNIQUE NOT NULL,
    legal_name TEXT NOT NULL,
    org_type public.organization_type NOT NULL,
    verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.partner_technicians (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    registry_code TEXT NOT NULL,
    specialties TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.moderators (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    level SMALLINT NOT NULL DEFAULT 1 CHECK (level IN (1, 2)),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Login attempt tracker for rate-limiting and anti-abuse (ADR-21, no FK)
CREATE TABLE IF NOT EXISTS public.auth_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_hash TEXT NOT NULL,
    email TEXT NOT NULL,
    failures INT NOT NULL DEFAULT 0 CHECK (failures >= 0),
    blocked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. Package 2: Catalog & AI Scanner (public)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hardware_categories (
    id SERIAL PRIMARY KEY,
    parent_id INT REFERENCES public.hardware_categories(id) ON DELETE SET NULL,
    slug VARCHAR(60) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hardware_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id INT NOT NULL REFERENCES public.hardware_categories(id),
    manufacturer VARCHAR(80) NOT NULL,
    family VARCHAR(80),
    model_name TEXT NOT NULL,
    sku VARCHAR(120) UNIQUE,
    msrp_cents BIGINT CHECK (msrp_cents IS NULL OR msrp_cents >= 0),
    specs_template JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_homologated BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.scanner_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES public.hardware_models(id) ON DELETE CASCADE,
    scanner_version VARCHAR(40) NOT NULL DEFAULT 'v4',
    embedding_key TEXT NOT NULL,
    ocr_keywords TEXT[] NOT NULL DEFAULT '{}',
    confidence_threshold NUMERIC(4, 3) NOT NULL DEFAULT 0.800
        CHECK (confidence_threshold > 0.000 AND confidence_threshold <= 1.000),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_scanner_ref_model_version UNIQUE (model_id, scanner_version, embedding_key)
);

CREATE TABLE IF NOT EXISTS public.scanner_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    image_hash CHAR(64) NOT NULL,
    detected_model_id UUID REFERENCES public.hardware_models(id) ON DELETE SET NULL,
    confidence NUMERIC(4, 3) NOT NULL CHECK (confidence >= 0.000 AND confidence <= 1.000),
    confidence_band public.scanner_confidence_band NOT NULL,
    bounding_box JSONB,
    raw_ocr JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.scanner_hypotheses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id UUID NOT NULL REFERENCES public.scanner_results(id) ON DELETE CASCADE,
    model_id UUID NOT NULL REFERENCES public.hardware_models(id),
    confidence NUMERIC(4, 3) NOT NULL CHECK (confidence >= 0.000 AND confidence <= 1.000),
    confidence_band public.scanner_confidence_band NOT NULL,
    is_selected BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. Indexes (PostGIS GIST, B-Tree FKs/Filters, GIN Trigram)
-- -----------------------------------------------------------------------------
-- Identity & Access
CREATE INDEX IF NOT EXISTS idx_users_status_kyc ON public.users(status, kyc_verified);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email_trgm ON public.users USING gin (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user ON public.user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_geom ON public.user_addresses USING gist (location_geom);
CREATE INDEX IF NOT EXISTS idx_user_exact_addresses_user ON private.user_exact_addresses(user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewed ON public.user_reputation_reviews(reviewed_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON public.user_reputation_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_sanctions_user ON public.user_sanctions(user_id, applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_email ON public.auth_login_attempts(ip_hash, email);

-- Catalog & AI Scanner
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.hardware_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_models_category_homologated ON public.hardware_models(category_id, is_homologated);
CREATE INDEX IF NOT EXISTS idx_models_manufacturer ON public.hardware_models(manufacturer);
CREATE INDEX IF NOT EXISTS idx_models_name_trgm ON public.hardware_models USING gin (model_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_scanner_refs_model ON public.scanner_references(model_id, is_active);
CREATE INDEX IF NOT EXISTS idx_scanner_results_user ON public.scanner_results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scanner_results_model ON public.scanner_results(detected_model_id);
CREATE INDEX IF NOT EXISTS idx_scanner_hypotheses_result ON public.scanner_hypotheses(result_id);

-- -----------------------------------------------------------------------------
-- 7. Row-Level Security (RLS) Enablement & Base Policies (ADR-08, ADR-09)
-- -----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.user_exact_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.user_kyc_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.legal_retention ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reputation_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sanctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hardware_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hardware_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scanner_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scanner_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scanner_hypotheses ENABLE ROW LEVEL SECURITY;

-- Users & Profiles
CREATE POLICY rls_users_select_active ON public.users
    FOR SELECT TO authenticated
    USING (status = 'ACTIVE' OR id = auth.uid());

CREATE POLICY rls_users_update_own ON public.users
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY rls_profiles_select_public ON public.profiles
    FOR SELECT TO authenticated, anon
    USING (is_public = TRUE OR user_id = auth.uid());

CREATE POLICY rls_profiles_modify_own ON public.profiles
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Addresses (public fuzzy vs private exact)
CREATE POLICY rls_user_addresses_own ON public.user_addresses
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Reputation & Sanctions
CREATE POLICY rls_reviews_select_all ON public.user_reputation_reviews
    FOR SELECT TO authenticated, anon
    USING (TRUE);

CREATE POLICY rls_reviews_insert_own ON public.user_reputation_reviews
    FOR INSERT TO authenticated
    WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY rls_sanctions_select_own ON public.user_sanctions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Organizations, Technicians & Moderators
CREATE POLICY rls_verified_orgs_select ON public.verified_organizations
    FOR SELECT TO authenticated, anon
    USING (verification_status = 'VERIFIED' OR user_id = auth.uid());

CREATE POLICY rls_partner_techs_select ON public.partner_technicians
    FOR SELECT TO authenticated
    USING (is_active = TRUE OR user_id = auth.uid());

CREATE POLICY rls_moderators_select_own ON public.moderators
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Catalog & AI Scanner
CREATE POLICY rls_categories_select_active ON public.hardware_categories
    FOR SELECT TO authenticated, anon
    USING (is_active = TRUE);

CREATE POLICY rls_models_select_homologated ON public.hardware_models
    FOR SELECT TO authenticated, anon
    USING (is_homologated = TRUE);

CREATE POLICY rls_scanner_refs_select_active ON public.scanner_references
    FOR SELECT TO authenticated
    USING (is_active = TRUE);

CREATE POLICY rls_scanner_results_own ON public.scanner_results
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY rls_scanner_hypotheses_own ON public.scanner_hypotheses
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.scanner_results r
        WHERE r.id = result_id AND r.user_id = auth.uid()
    ));

-- Note: private.* tables and public.auth_login_attempts intentionally have no
-- permissive policies for anon/authenticated; access is restricted to service_role
-- and future SECURITY DEFINER functions.
