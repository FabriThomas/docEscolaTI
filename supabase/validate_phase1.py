"""
Phase 1 Database Verification Script (EDTS-378 & EDTS-376)
Validates:
1. Required files existence (supabase/config.toml, .env.example, 0001, 0002)
2. Supabase config.toml settings (PostgreSQL 15, Data API disabled)
3. SQL syntax balance (quotes, parens, $$ blocks)
4. Phase 1 scope isolation (no escrow, wallet_ledger, place_bid, esg, daas, pg_cron)
5. FK dependency ordering (0002 only references tables from 0001 or itself)
6. 100% of created tables have ENABLE ROW LEVEL SECURITY
7. 3 mandatory private storage buckets (offers-media, disputes-laudos, chat-attachments)
"""

import re
import tomllib
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
SUPABASE_DIR = ROOT_DIR / "supabase"
MIGRATIONS_DIR = SUPABASE_DIR / "migrations"

M0001 = MIGRATIONS_DIR / "0001_edts_378_core_public_private.sql"
M0002 = MIGRATIONS_DIR / "0002_edts_376_ofertas_leiloes_chat_storage.sql"
CONFIG_TOML = SUPABASE_DIR / "config.toml"
ENV_EXAMPLE = ROOT_DIR / ".env.example"


def strip_sql_comments(sql: str) -> str:
    no_block = re.sub(r"/\*.*?\*/", "", sql, flags=re.DOTALL)
    return "\n".join(line.split("--", 1)[0] for line in no_block.splitlines())


def check_files_and_config() -> None:
    print("[1/6] Checking files, .env.example, and supabase/config.toml...")
    for path in (CONFIG_TOML, ENV_EXAMPLE, M0001, M0002):
        assert path.exists(), f"Missing required file: {path}"

    cfg = tomllib.loads(CONFIG_TOML.read_text(encoding="utf-8"))
    assert cfg.get("db", {}).get("major_version") == 15, "db.major_version must be 15"
    assert cfg.get("api", {}).get("enabled") is False, "api.enabled (Data API) must be false per ADR-08/09"

    env_text = ENV_EXAMPLE.read_text(encoding="utf-8")
    for var in ("SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "DATABASE_URL"):
        assert f"{var}=" in env_text, f"Missing {var} in .env.example"
    print("  [OK] Config and .env.example verified.")


def check_sql_balance() -> None:
    print("[2/6] Checking SQL block and delimiter balance...")
    for filepath in (M0001, M0002):
        sql = strip_sql_comments(filepath.read_text(encoding="utf-8"))
        dollar_tags = re.findall(r"\$\$", sql)
        assert len(dollar_tags) % 2 == 0, f"Unbalanced $$ blocks in {filepath.name}"
        assert sql.count("(") == sql.count(")"), f"Unbalanced parentheses in {filepath.name}"
        assert sql.count("'") % 2 == 0, f"Unbalanced single quotes in {filepath.name}"
    print("  [OK] SQL delimiters balanced in 0001 and 0002.")


def check_scope_isolation() -> None:
    print("[3/6] Checking Phase 1 scope isolation (no EDTS-412 / EDTS-444 artifacts)...")
    forbidden_patterns = [
        r"\bCREATE\s+SCHEMA\s+(?:IF\s+NOT\s+EXISTS\s+)?escrow\b",
        r"\bCREATE\s+SCHEMA\s+(?:IF\s+NOT\s+EXISTS\s+)?esg\b",
        r"\bCREATE\s+SCHEMA\s+(?:IF\s+NOT\s+EXISTS\s+)?daas\b",
        r"\bwallet_ledger\b",
        r"\bcoin_ledger\b",
        r"\brpc_place_auction_bid\b",
        r"\bplace_bid\b",
        r"\bpg_cron\b",
        r"\bpg_net\b",
    ]
    for filepath in (M0001, M0002):
        sql = strip_sql_comments(filepath.read_text(encoding="utf-8"))
        for pat in forbidden_patterns:
            assert not re.search(pat, sql, re.IGNORECASE), (
                f"Forbidden Phase 2/3 reference matching '{pat}' found in {filepath.name}"
            )
    print("  [OK] Scope isolation verified.")


def check_fk_dependencies() -> None:
    print("[4/6] Checking FK ordering and dependencies...")
    sql1 = strip_sql_comments(M0001.read_text(encoding="utf-8"))
    sql2 = strip_sql_comments(M0002.read_text(encoding="utf-8"))

    t1 = set(re.findall(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)", sql1, re.I))
    t2 = set(re.findall(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)", sql2, re.I))

    refs1 = set(re.findall(r"REFERENCES\s+([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)", sql1, re.I))
    refs2 = set(re.findall(r"REFERENCES\s+([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)", sql2, re.I))

    missing1 = refs1 - t1
    missing2 = refs2 - (t1 | t2)
    assert not missing1, f"0001 references unknown tables: {missing1}"
    assert not missing2, f"0002 references unknown tables: {missing2}"
    print(f"  [OK] 0001 defines {len(t1)} tables; 0002 defines {len(t2)} tables; all FKs valid.")


def check_rls_coverage() -> None:
    print("[5/6] Checking ENABLE ROW LEVEL SECURITY on 100% of created tables...")
    for filepath in (M0001, M0002):
        sql = strip_sql_comments(filepath.read_text(encoding="utf-8"))
        tables = set(re.findall(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)", sql, re.I))
        rls_enabled = set(re.findall(
            r"ALTER\s+TABLE\s+([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY",
            sql,
            re.I,
        ))
        missing = tables - rls_enabled
        assert not missing, f"Tables missing ENABLE ROW LEVEL SECURITY in {filepath.name}: {missing}"
    print("  [OK] 100% of tables in 0001 and 0002 have RLS enabled.")


def check_private_buckets() -> None:
    print("[6/6] Checking 3 private Storage buckets and storage.objects policies...")
    sql2 = strip_sql_comments(M0002.read_text(encoding="utf-8"))
    for bucket in ("offers-media", "disputes-laudos", "chat-attachments"):
        pattern = rf"'{bucket}'\s*,\s*'{bucket}'\s*,\s*FALSE"
        assert re.search(pattern, sql2, re.IGNORECASE), (
            f"Bucket '{bucket}' missing or not set to public=FALSE in 0002"
        )
        assert f"bucket_id = '{bucket}'" in sql2, f"Missing storage.objects RLS policy for '{bucket}'"
    print("  [OK] All 3 private buckets (public = false) and RLS policies verified.")


if __name__ == "__main__":
    check_files_and_config()
    check_sql_balance()
    check_scope_isolation()
    check_fk_dependencies()
    check_rls_coverage()
    check_private_buckets()
    print("\n=======================================================")
    print("  [SUCCESS] Phase 1 (EDTS-378 & EDTS-376) Verified!    ")
    print("=======================================================")
