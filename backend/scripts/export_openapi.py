"""Gera/verifica backend/openapi/openapi.snapshot.json (ADR-13).

    python scripts/export_openapi.py          # reescreve o snapshot
    python scripts/export_openapi.py --check  # falha se o código divergir (usado no CI)
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.core.config import Settings
from app.main import create_app

SNAPSHOT = ROOT / "openapi" / "openapi.snapshot.json"


def render() -> str:
    spec = create_app(Settings(_env_file=None)).openapi()
    return json.dumps(spec, indent=2, ensure_ascii=False, sort_keys=True) + "\n"


def main() -> int:
    current = render()
    if "--check" in sys.argv:
        if not SNAPSHOT.exists() or SNAPSHOT.read_text(encoding="utf-8") != current:
            print("openapi.snapshot.json desatualizado. Rode: python scripts/export_openapi.py")
            return 1
        print("openapi.snapshot.json em dia.")
        return 0
    SNAPSHOT.parent.mkdir(exist_ok=True)
    SNAPSHOT.write_text(current, encoding="utf-8", newline="\n")
    print(f"Escrito {SNAPSHOT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
