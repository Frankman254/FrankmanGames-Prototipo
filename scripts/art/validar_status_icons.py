#!/usr/bin/env python3
import hashlib,json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).parents[2]; folder=ROOT/"assets"/"icons"/"statuses"
expected=set(json.loads((ROOT/"data"/"rpg"/"statuses.json").read_text(encoding="utf-8"))["statuses"])
files={p.stem:p for p in folder.glob("*.png")}; assert set(files)==expected
hashes=set()
for key,path in files.items():
    with Image.open(path) as im:
        assert im.size==(256,256) and im.mode=="RGBA" and im.getchannel("A").getextrema()==(0,255),key
    hashes.add(hashlib.sha256(path.read_bytes()).hexdigest())
assert len(hashes)==len(files)
print(f"iconos de estados válidos: {len(files)} PNG únicos")
