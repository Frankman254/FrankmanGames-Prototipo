#!/usr/bin/env python3
"""Renderiza insignias originales para todos los estados de combate."""
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT=Path(__file__).parents[2]
sys.path.insert(0,str(Path(__file__).parent))
import render_spell_icons as spell

OUT=ROOT/"assets"/"icons"/"statuses"
MOTIFS={
    "burn":("searing_mark","fire"), "chilled":("frost_nova","frost"),
    "rooted":("bramble_snare","earth"), "stunned":("static_field","storm"),
    "shield":("bulwark","earth"), "iron_shout":("iron_shout","physical"),
    "storm_focus":("storm_focus","storm"), "stone_skin":("stone_skin","earth"),
    "regeneration":("light_bandage","earth"), "haste":("lightning_step","storm"),
    "static_charge":("spark","storm"), "retaliation":("retaliation","physical"),
    "storm_mirror":("storm_mirror","storm"), "time_echo":("time_echo","storm"),
    "still_aegis":("still_aegis","earth"), "weariness":("leaden_gale","frost"),
    "dazed":("stunning_pommel","physical"), "disoriented":("vertigo_whistle","physical"),
    "body_lock":("ember_chain","physical"), "tackled":("charge","physical"),
}

def render(status_id,kind):
    motif_id,element=MOTIFS[status_id]; dark,mid,light=spell.PALETTES[element]
    image=Image.new("RGBA",(spell.SIZE,spell.SIZE),(0,0,0,0)); d=ImageDraw.Draw(image,"RGBA")
    border=(76,190,116,255) if kind=="buff" else (218,73,61,255)
    spell.polygon(d,[(128,15),(222,70),(222,178),(128,241),(34,178),(34,70)],(13,17,18,246))
    spell.line(d,[(128,15),(222,70),(222,178),(128,241),(34,178),(34,70),(128,15)],border,8)
    spell.polygon(d,[(128,30),(207,78),(207,169),(128,222),(49,169),(49,78)],(*dark,255))
    if status_id=="body_lock":
        spell.ellipse(d,(66,82,128,126),None,(*light,255),9); spell.ellipse(d,(128,82,190,126),None,(*light,255),9)
        d.rounded_rectangle(tuple(round(v*spell.S) for v in (87,119,169,194)),radius=round(12*spell.S),fill=(*mid,255),outline=(*light,255),width=round(7*spell.S)); spell.arc(d,(101,84,155,145),180,360,(*light,255),9)
    elif status_id=="tackled":
        spell.polygon(d,[(54,83),(112,111),(112,145),(54,173),(73,128)],(*light,255)); spell.polygon(d,[(202,83),(144,111),(144,145),(202,173),(183,128)],(*mid,255)); spell.ellipse(d,(111,111,145,145),(*light,255))
    else:
        spell.motif(d,motif_id,(*light,255),(*mid,255))
    # Punto de identidad evita duplicados y ayuda a distinguir estados cercanos.
    seed=int(hashlib.sha256(status_id.encode()).hexdigest()[:4],16); x=64+(seed%129); y=196+(seed%15)
    spell.ellipse(d,(x-6,y-6,x+6,y+6),border)
    return image.resize((256,256),Image.Resampling.LANCZOS)

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    statuses=json.loads((ROOT/"data"/"rpg"/"statuses.json").read_text(encoding="utf-8"))["statuses"]
    assert set(statuses)==set(MOTIFS),f"actualiza MOTIFS: {sorted(set(statuses)^set(MOTIFS))}"
    for status_id,status in statuses.items(): render(status_id,status["kind"]).save(OUT/f"{status_id}.png",optimize=True)
    print(f"{len(statuses)} iconos de estado en {OUT}")

if __name__=="__main__": main()
