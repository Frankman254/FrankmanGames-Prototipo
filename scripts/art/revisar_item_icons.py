#!/usr/bin/env python3
"""Lámina local para revisar todos los iconos de objetos."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).parents[2]
files=sorted((ROOT/"assets"/"icons"/"items").glob("*.png"))
cols,cell_w,cell_h=10,180,126
rows=(len(files)+cols-1)//cols
sheet=Image.new("RGB",(cols*cell_w,rows*cell_h),(19,26,31)); draw=ImageDraw.Draw(sheet); font=ImageFont.load_default(size=11)
for i,path in enumerate(files):
    x,y=(i%cols)*cell_w,(i//cols)*cell_h
    icon=Image.open(path).convert("RGBA").resize((88,88),Image.Resampling.LANCZOS)
    sheet.paste(icon,(x+(cell_w-88)//2,y+2),icon)
    label=path.stem; box=draw.textbbox((0,0),label,font=font)
    draw.text((x+(cell_w-(box[2]-box[0]))/2,y+96),label,fill=(220,224,220),font=font)
output=ROOT/"work"/"revision"/"item_icons.png"; output.parent.mkdir(parents=True,exist_ok=True); sheet.save(output); print(output)
