"""
Phase 4 Database & API Verification Script (SPRINT14_017)
Validates 0005_sprint14_017_esg_daas_pg_cron_outbox.sql for:
1. SQL syntax balance (quotes, parens, $$ blocks)
2. Extensions pg_cron & pg_net + schemas 'esg' & 'daas'
3. Transactional outbox (private.outbox_events) + 5 scheduled cron jobs
4. DaaS k-anonymity constraints (sample_k >= 30, distinct_sellers >= 3)
5. ESG materialized views (esg.user_monthly, esg.platform_monthly) & NGO donations
6. 100% of created tables have ENABLE ROW LEVEL SECURITY
"""

import re
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
M0005 = ROOT_DIR / "supabase" / "migrations" / "0005_sprint14_017_esg_daas_pg_cron_outbox.sql"


def strip_sql_comments(sql: str) -> str:
    no_block = re.sub(r"/\*.*?\*/", "", sql, flags=re.DOTALL)
    return "\n".join(line.split("--", 1)[0] for line in no_block.splitlines())


def main() -> None:
    assert M0005.exists(), f"Missing {M0005}"
    sql = strip_sql_comments(M0005.read_text(encoding="utf-8"))

    print("[1/6] Checking SQL block and delimiter balance...")
    assert len(re.findall(r"\$\$", sql)) % 2 == 0, "Unbalanced $$ blocks"
    assert sql.count("(") == sql.count(")"), "Unbalanced parentheses"
    assert sql.count("'") % 2 == 0, "Unbalanced single quotes"
    print("  [OK] SQL delimiters balanced.")

    print("[2/6] Checking pg_cron, pg_net, and schemas esg / daas...")
    for item in ('"pg_cron"', '"pg_net"', "CREATE SCHEMA IF NOT EXISTS esg", "CREATE SCHEMA IF NOT EXISTS daas"):
        assert item in sql, f"Missing {item}"
    print("  [OK] Extensions and schemas verified.")

    print("[3/6] Checking transactional outbox & 5 pg_cron schedules...")
    assert "private.outbox_events" in sql
    for job in (
        "steely-sweep-auctions-1m",
        "steely-sweep-escrow-7d",
        "steely-hourly-esg-refresh",
        "steely-daily-lgpd-purge-30d",
        "steely-daily-daas-sync-k30",
    ):
        assert job in sql, f"Missing cron job {job}"
    print("  [OK] Outbox and 5 pg_cron jobs verified.")

    print("[4/6] Checking DaaS k >= 30 and distinct_sellers >= 3 constraints...")
    assert "daas.market_indicators" in sql
    assert "CHECK (sample_k >= 30)" in sql
    assert "CHECK (distinct_sellers >= 3)" in sql
    assert "private.sync_daas_k30" in sql
    print("  [OK] DaaS k-anonymity constraints verified.")

    print("[5/6] Checking ESG materialized views & NGO donations...")
    for item in (
        "public.esg_lca_factors",
        "esg.user_monthly",
        "esg.platform_monthly",
        "public.ecopontos",
        "public.ong_donations",
    ):
        assert item in sql, f"Missing ESG/NGO item {item}"
    print("  [OK] ESG materialized views and NGO tables verified.")

    print("[6/6] Checking ENABLE ROW LEVEL SECURITY on all tables...")
    tables = set(re.findall(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)", sql, re.I))
    rls = set(re.findall(
        r"ALTER\s+TABLE\s+([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY",
        sql,
        re.I,
    ))
    missing = tables - rls
    assert not missing, f"Tables missing RLS: {missing}"
    print(f"  [OK] 100% of {len(tables)} tables have RLS enabled.")

    print("\n=======================================================")
    print("  [SUCCESS] Phase 4 (SPRINT14_017 ESG/DaaS/Cron) OK!   ")
    print("=======================================================")


if __name__ == "__main__":
    main()
