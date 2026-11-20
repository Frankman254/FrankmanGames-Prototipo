#!/usr/bin/env python3
"""Láminas paginadas a 46 px para revisar el catálogo de objetos."""
from pathlib import Path
import json

from PIL import Image, ImageDraw, ImageFont


ROOT=Path(__file__).parents[2]
items=json.loads((ROOT/"data/rpg/items.json").read_text(encoding="utf-8"))["items"]
ids=sorted(items,key=lambda item_id:(items[item_id].get("category",""),items[item_id].get("kind",""),item_id))
out=ROOT/"work"/"codex-eq06"/"pages"; out.mkdir(parents=True,exist_ok=True)
font=ImageFont.load_default(size=10)
cols,rows,cell_w,cell_h=8,10,176,76
per_page=cols*rows
for page,start in enumerate(range(0,len(ids),per_page),1):
    subset=ids[start:start+per_page]
    sheet=Image.new("RGB",(cols*cell_w,rows*cell_h),(20,25,34)); draw=ImageDraw.Draw(sheet)
    for index,item_id in enumerate(subset):
        x=(index%cols)*cell_w; y=(index//cols)*cell_h
        with Image.open(ROOT/"assets/icons/items"/f"{item_id}.png") as source:
            icon=source.convert("RGBA").resize((46,46),Image.Resampling.LANCZOS)
        sheet.paste(icon,(x+5,y+5),icon)
        name=str(items[item_id].get("name",item_id))
        draw.text((x+56,y+8),name[:21],fill=(239,232,217),font=font)
        draw.text((x+56,y+25),item_id[:24],fill=(143,166,190),font=font)
        draw.text((x+56,y+42),str(items[item_id].get("kind","")),fill=(209,164,76),font=font)
    path=out/f"items_{page:02d}.png"; sheet.save(path); print(path)
