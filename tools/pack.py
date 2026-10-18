#!/usr/bin/env python3
"""Pack each trade into the zip AgentOrch downloads (one per trade), plus its checksum.

    python3 tools/pack.py                 # → dist/trade-<id>.zip, dist/trade-<id>.zip.sha256 for every trade folder
    python3 tools/pack.py --tag v0.1.0    # same, and fail unless every trade's manifest.json is at that version

A trade is a folder with a manifest.json ({"name": "trade-<id>", "version", "entry", "requires": {"host": n}}).
Every release carries all of them: AgentOrch fetches releases/latest/download/trade-<id>.zip (and .sha256), and
compares the release's tag with the installed trade's version, so they move together.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP_SUFFIX = {".png", ".md", ".DS_Store"}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tag", help="the release tag; must be v<every manifest's version>")
    a = ap.parse_args()
    dist = ROOT / "dist"
    dist.mkdir(exist_ok=True)
    trades = sorted(p.parent for p in ROOT.glob("*/manifest.json"))
    if not trades:
        print("no trades found", file=sys.stderr)
        return 1
    for folder in trades:
        m = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
        name, version = m["name"], m["version"]
        if a.tag and a.tag.lstrip("v") != version:
            print(f"{name}: tag {a.tag} doesn't match its version {version}", file=sys.stderr)
            return 1
        if not (folder / m["entry"]).is_file():
            print(f"{name}: no entry {m['entry']}", file=sys.stderr)
            return 1
        files = [p for p in sorted(folder.rglob("*")) if p.is_file() and p.suffix not in SKIP_SUFFIX and not p.name.startswith(".")]
        out = dist / f"{name}.zip"
        with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
            for p in files:
                z.write(p, p.relative_to(folder).as_posix())
            for extra in ("LICENSE",):   # the licence travels with every pack
                if (ROOT / extra).is_file():
                    z.write(ROOT / extra, extra)
        digest = hashlib.sha256(out.read_bytes()).hexdigest()
        (dist / f"{name}.zip.sha256").write_text(f"{digest}  {out.name}\n", encoding="utf-8")
        print(f"{out.relative_to(ROOT)}  {len(files)} files  {digest[:12]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
