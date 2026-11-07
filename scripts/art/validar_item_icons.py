#!/usr/bin/env python3
"""Valida correspondencia, formato, transparencia y unicidad de iconos de objetos."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).parents[2]; folder=ROOT/"assets"/"icons"/"items"
expected=set(json.loads((ROOT/"data"/"rpg"/"items.json").read_text(encoding="utf-8"))["items"])
files={path.stem:path for path in folder.glob("*.png")}
assert set(files)==expected,f"faltan {sorted(expected-set(files))}; sobran {sorted(set(files)-expected)}"
hashes=set()
for item_id,path in files.items():
    with Image.open(path) as image:
        assert image.size==(256,256),(item_id,image.size)
        assert image.mode=="RGBA",(item_id,image.mode)
        assert image.getchannel("A").getextrema()==(0,255),f"{item_id}: alfa incompleto"
    hashes.add(hashlib.sha256(path.read_bytes()).hexdigest())
assert len(hashes)==len(files),f"sólo {len(hashes)} iconos únicos de {len(files)}"
print(f"iconos de objetos válidos: {len(files)} PNG RGBA únicos")
