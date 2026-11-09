#!/usr/bin/env python3
"""Valida nombres, formato, transparencia y unicidad de los iconos de hechizos."""
import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).parents[2]
folder = ROOT / "assets" / "icons" / "spells"
expected = set(json.loads((ROOT / "data" / "rpg" / "spells.json").read_text(encoding="utf-8"))["spells"])
files = {path.stem: path for path in folder.glob("*.png")}
assert set(files) == expected, f"faltan {sorted(expected-set(files))}; sobran {sorted(set(files)-expected)}"
hashes = set()
for spell_id, path in files.items():
    with Image.open(path) as image:
        assert image.size == (256, 256), (spell_id, image.size)
        assert image.mode == "RGBA", (spell_id, image.mode)
        alpha = image.getchannel("A")
        assert alpha.getextrema() == (0, 255), f"{spell_id}: transparencia incompleta"
        bbox = alpha.getbbox()
        assert bbox, f"{spell_id}: imagen vacía"
        width, height = bbox[2] - bbox[0], bbox[3] - bbox[1]
        assert max(width, height) <= 180, f"{spell_id}: excede caja segura: {bbox}"
        center_x = (bbox[0] + bbox[2]) / 2
        center_y = (bbox[1] + bbox[3]) / 2
        assert abs(center_x - 128) <= 3 and abs(center_y - 128) <= 3, (
            f"{spell_id}: ilustración descentrada: {bbox}"
        )
    hashes.add(hashlib.sha256(path.read_bytes()).hexdigest())
assert len(hashes) == len(files), "hay iconos idénticos"
print(f"iconos de hechizos válidos: {len(files)} PNG RGBA únicos")
