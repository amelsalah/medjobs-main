#!/usr/bin/env python3
"""Rebuild data/uae_hospitals.json from an Apple Numbers file (requires: pip install numbers-parser).

  NUMBERS_PATH=/path/to/file.numbers python3 scripts/rebuild-hospitals-json.py
"""
import json
import os
from pathlib import Path

try:
    from numbers_parser import Document
except ImportError:
    raise SystemExit("Install numbers-parser: python3 -m pip install numbers-parser") from None

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "uae_hospitals.json"
SRC = Path(os.environ.get("NUMBERS_PATH", Path.home() / "Documents" / "uae_hospitals_careers_full_1.numbers"))

def main():
    if not SRC.is_file():
        raise SystemExit(f"Numbers file not found: {SRC}")
    doc = Document(str(SRC))
    rows = []
    for sheet in doc.sheets:
        for table in sheet.tables:
            rows.extend(table.rows(values_only=True))
    header = [str(h or "").strip() for h in rows[0]]
    out = []
    for row in rows[1:]:
        if not any(row):
            continue
        rec = {}
        for i, key in enumerate(header):
            rec[key] = row[i] if i < len(row) else None
        out.append(rec)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=2, default=str), encoding="utf-8")
    print(f"Wrote {len(out)} rows to {OUT}")


if __name__ == "__main__":
    main()
