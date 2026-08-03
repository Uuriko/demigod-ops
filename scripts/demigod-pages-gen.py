#!/usr/bin/env python3
"""Regenerate product pages if demigod-pages-gen-source.py exists; else verify pages present."""
from pathlib import Path
root = Path(__file__).resolve().parents[1] / "demigod-pages"
need = ["hire","talent","how","pricing","pilot","proof","faq","compare"]
missing = [n for n in need if not (root / f"{n}.html").exists()]
if missing:
    raise SystemExit(f"missing pages: {missing}")
print("pages ok", len(list(root.glob("*.html"))), "at", root)
for n in need:
    t = (root / f"{n}.html").read_text()
    assert "canonical" in t and "Skip to content" in t
print("verify markers ok")
