#!/usr/bin/env python3
"""T05: iconos PNG sólo para los objetos nuevos de la matriz.

Reutiliza el lenguaje visual determinista de `scripts/art/render_item_icons.py`
sin reescribir los PNG existentes (los de Codex conservan su ilustración).
Lee `scripts/t05/new_items.json` (lo escribe generateGearMatrix.mjs --write).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "art"))

import render_item_icons as base  # noqa: E402

OUT = ROOT / "assets" / "icons" / "items"


def main() -> None:
    ids = json.loads((ROOT / "scripts" / "t05" / "new_items.json").read_text(encoding="utf-8"))
    items = json.loads((ROOT / "data" / "rpg" / "items.json").read_text(encoding="utf-8"))["items"]
    spells = json.loads((ROOT / "data" / "rpg" / "spells.json").read_text(encoding="utf-8"))["spells"]
    made = 0
    for item_id in ids:
        target = OUT / f"{item_id}.png"
        if target.exists():
            continue
        base.draw_item(item_id, items[item_id], spells).save(target, optimize=True)
        made += 1
    print(f"{made} iconos nuevos de {len(ids)} pendientes en {OUT}")


if __name__ == "__main__":
    main()
