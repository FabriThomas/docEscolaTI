"""
Phase 2 Database Verification Script (EDTS-412 / SPRINT15_004)
Validates 0003_edts_412_escrow_coin_ledger_place_bid.sql for:
1. SQL syntax balance (quotes, parens, $$ blocks)
2. Required schema 'escrow' and 6 escrow tables (orders, escrow_accounts, meetups, qr_tokens, disputes, escrow_events)
3. Immutable append-only coin_ledger + FIFO lots + anti-UPDATE/DELETE trigger
4. private.place_bid() with SELECT FOR UPDATE & 3-minute anti-sniping
5. 100% of created tables have ENABLE ROW LEVEL SECURITY
"""

import re
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
M0003 = ROOT_DIR / "supabase" / "migrations" / "0003_edts_412_escrow_coin_ledger_place_bid.sql"


def strip_sql_comments(sql: str) -> str:
    no_block = re.sub(r"/\*.*?\*/", "", sql, flags=re.DOTALL)
    return "\n".join(line.split("--", 1)[0] for line in no_block.splitlines())


def main() -> None:
    assert M0003.exists(), f"Missing {M0003}"
    sql = strip_sql_comments(M0003.read_text(encoding="utf-8"))

    print("[1/5] Checking SQL block and delimiter balance...")
    assert len(re.findall(r"\$\$", sql)) % 2 == 0, "Unbalanced $$ blocks"
    assert sql.count("(") == sql.count(")"), "Unbalanced parentheses"
    assert sql.count("'") % 2 == 0, "Unbalanced single quotes"
    print("  [OK] SQL delimiters balanced.")

    print("[2/5] Checking escrow schema and tables...")
    for tbl in (
        "escrow.orders",
        "escrow.escrow_accounts",
        "escrow.escrow_events",
        "escrow.meetups",
        "escrow.qr_tokens",
        "escrow.disputes",
    ):
        assert f"CREATE TABLE IF NOT EXISTS {tbl}" in sql, f"Missing table {tbl}"
    print("  [OK] All 6 escrow tables verified.")

    print("[3/5] Checking coin_ledger, FIFO lots, and anti-UPDATE/DELETE trigger...")
    assert "CREATE TABLE IF NOT EXISTS public.coin_ledger" in sql
    assert "CREATE TABLE IF NOT EXISTS public.coin_fifo_lots" in sql
    assert "BEFORE UPDATE OR DELETE ON public.coin_ledger" in sql
    assert "private.consume_coins_fifo" in sql
    print("  [OK] coin_ledger, FIFO lots, and immutability trigger verified.")

    print("[4/5] Checking private.place_bid() with FOR UPDATE & 3-min anti-sniping...")
    assert "CREATE OR REPLACE FUNCTION private.place_bid" in sql
    assert "FOR UPDATE" in sql
    assert "INTERVAL '3 minutes'" in sql
    print("  [OK] private.place_bid() verified.")

    print("[5/5] Checking ENABLE ROW LEVEL SECURITY on 100% of created tables...")
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
    print("  [SUCCESS] Phase 2 (EDTS-412 / SPRINT15_004) Verified!")
    print("=======================================================")


if __name__ == "__main__":
    main()
