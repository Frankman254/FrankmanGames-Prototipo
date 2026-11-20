#!/usr/bin/env python3
"""Compone un PNG propio por item desde el lenguaje modular de iconos."""
from __future__ import annotations

import json
import argparse
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

from icon_primitives import render_item_icon


ROOT = Path(__file__).parents[2]
OUT = ROOT / "assets" / "icons" / "items"


def main() -> None:
    parser=argparse.ArgumentParser()
    parser.add_argument("ids",nargs="*",help="IDs concretos; vacío regenera todo el catálogo")
    args=parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    items = json.loads((ROOT / "data/rpg/items.json").read_text(encoding="utf-8"))["items"]
    selected={item_id:items[item_id] for item_id in args.ids} if args.ids else items

    def render(entry: tuple[str, dict]) -> None:
        item_id, item = entry
        spell_emblem = None
        if item.get("kind") == "scroll" or item.get("category") == "scroll":
            spell_id = (item.get("use") or {}).get("spellId")
            spell_path = ROOT / "assets/icons/spells" / f"{spell_id}.png"
            if spell_id and spell_path.exists():
                with Image.open(spell_path) as source:
                    spell_emblem = source.convert("RGBA")
        render_item_icon(item_id, item, spell_emblem).save(OUT / f"{item_id}.png", optimize=True)

    # Pillow libera el GIL en filtros y codificación PNG; cuatro hilos aceleran
    # el catálogo sin saturar la máquina ni involucrar ningún modelo local.
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(render, selected.items()))
    print(f"{len(selected)} iconos modulares en {OUT}")


if __name__ == "__main__":
    main()
