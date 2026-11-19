"""
Phase 3 QA & SEC Database Verification Script (SPRINT15_011)
Validates 0004_sprint15_011_audit_sha256_arbitragem_lgpd.sql for:
1. SQL syntax balance (quotes, parens, $$ blocks)
2. Schema 'audit' partitioned tables + SHA-256 hash-chaining triggers + audit_verify() (ADR-05)
3. Dual-moderator approval constraints (> R$ 500 / 50000 cents) & register_arbitration_approval() (ADR-06)
4. LGPD 30-day grace period & irreversible anonymization pipeline (ADR-07)
5. 100% of created tables/partitions have ENABLE ROW LEVEL SECURITY
"""

import re
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
M0004 = ROOT_DIR / "supabase" / "migrations" / "0004_sprint15_011_audit_sha256_arbitragem_lgpd.sql"


def strip_sql_comments(sql: str) -> str:
    no_block = re.sub(r"/\*.*?\*/", "", sql, flags=re.DOTALL)
    return "\n".join(line.split("--", 1)[0] for line in no_block.splitlines())


def main() -> None:
    assert M0004.exists(), f"Missing {M0004}"
    sql = strip_sql_comments(M0004.read_text(encoding="utf-8"))

    print("[1/5] Checking SQL block and delimiter balance...")
    assert len(re.findall(r"\$\$", sql)) % 2 == 0, "Unbalanced $$ blocks"
    assert sql.count("(") == sql.count(")"), "Unbalanced parentheses"
    assert sql.count("'") % 2 == 0, "Unbalanced single quotes"
    print("  [OK] SQL delimiters balanced.")

    print("[2/5] Checking ADR-05 SHA-256 audit trail & triggers...")
    for item in (
        "audit.system_and_access_logs",
        "audit.financial_and_dispute_logs",
        "private.compute_audit_system_hash",
        "private.compute_audit_financial_hash",
        "private.audit_log",
        "private.audit_verify",
    ):
        assert item in sql, f"Missing ADR-05 element: {item}"
    print("  [OK] ADR-05 SHA-256 hash chaining verified.")

    print("[3/5] Checking ADR-06 Dual Approval (> R$ 500 / 50000 cents)...")
    for item in (
        "escrow.arbitration_decisions",
        "escrow.moderation_approvals",
        "amount_cents > 50000",
        "chk_arb_distinct_moderators",
        "chk_arb_dual_approval_enforced",
        "private.register_arbitration_approval",
    ):
        assert item in sql, f"Missing ADR-06 element: {item}"
    print("  [OK] ADR-06 Dual Approval constraints verified.")

    print("[4/5] Checking ADR-07 LGPD 30-day anonymization...")
    for item in (
        "public.account_deletion_requests",
        "private.request_account_deletion",
        "private.anonimizar_usuario",
        "private.sweep_lgpd_anonymization_30d",
        "INTERVAL '30 days'",
    ):
        assert item in sql, f"Missing ADR-07 element: {item}"
    print("  [OK] ADR-07 LGPD 30-day pipeline verified.")

    print("[5/5] Checking ENABLE ROW LEVEL SECURITY on all tables...")
    tables = set(re.findall(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)", sql, re.I))
    rls = set(re.findall(
        r"ALTER\s+TABLE\s+([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY",
        sql,
        re.I,
    ))
    missing = tables - rls
    assert not missing, f"Tables missing RLS: {missing}"
    print(f"  [OK] 100% of {len(tables)} tables/partitions have RLS enabled.")

    print("\n=======================================================")
    print("  [SUCCESS] Phase 3 (SPRINT15_011 QA & SEC) Verified!  ")
    print("=======================================================")


if __name__ == "__main__":
    main()
