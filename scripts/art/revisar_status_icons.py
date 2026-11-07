#!/usr/bin/env python3
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).parents[2]; files=sorted((ROOT/"assets"/"icons"/"statuses").glob("*.png"))
cols,cw,ch=5,210,142; rows=(len(files)+cols-1)//cols
sheet=Image.new("RGB",(cols*cw,rows*ch),(19,26,31)); d=ImageDraw.Draw(sheet); font=ImageFont.load_default(size=13)
for i,path in enumerate(files):
    x,y=(i%cols)*cw,(i//cols)*ch; icon=Image.open(path).convert("RGBA").resize((104,104),Image.Resampling.LANCZOS); sheet.paste(icon,(x+53,y+2),icon)
    box=d.textbbox((0,0),path.stem,font=font); d.text((x+(cw-box[2]+box[0])/2,y+112),path.stem,fill=(220,224,220),font=font)
out=ROOT/"work"/"revision"/"status_icons.png"; out.parent.mkdir(parents=True,exist_ok=True); sheet.save(out); print(out)
