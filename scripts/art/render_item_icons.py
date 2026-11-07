#!/usr/bin/env python3
"""Renderiza un icono original por itemId, sin fuentes ni imágenes externas."""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).parents[2]
OUT = ROOT / "assets" / "icons" / "items"
N = 768
S = N / 256

FAMILY = {
    "weapon": ((41, 28, 25), (150, 76, 43), (232, 190, 105)),
    "armor": ((30, 40, 42), (47, 125, 128), (218, 199, 139)),
    "jewel": ((44, 25, 54), (128, 61, 126), (246, 194, 76)),
    "consumable": ((27, 44, 31), (61, 145, 91), (233, 202, 112)),
    "scroll": ((53, 41, 26), (151, 111, 55), (239, 211, 145)),
    "petCharm": ((39, 30, 24), (119, 82, 50), (224, 183, 102)),
    "material": ((36, 34, 31), (100, 93, 77), (209, 190, 139)),
}


def p(values): return [(round(x*S), round(y*S)) for x,y in values]
def line(d, values, fill, width=7): d.line(p(values), fill=fill, width=round(width*S), joint="curve")
def poly(d, values, fill): d.polygon(p(values), fill=fill)
def ell(d, box, fill=None, outline=None, width=1): d.ellipse(tuple(round(v*S) for v in box), fill=fill, outline=outline, width=round(width*S))
def rect(d, box, fill=None, outline=None, width=1, radius=0):
    b=tuple(round(v*S) for v in box)
    if radius: d.rounded_rectangle(b, round(radius*S), fill=fill, outline=outline, width=round(width*S))
    else: d.rectangle(b, fill=fill, outline=outline, width=round(width*S))


def theme(item_id, category):
    dark, mid, light = FAMILY.get(category, FAMILY["material"])
    if any(k in item_id for k in ("storm","gale","mist","cloud","ancon")): mid,light=(54,108,175),(116,218,224)
    elif any(k in item_id for k in ("volcano","ash","diablo","machetero")): mid,light=(155,48,31),(244,154,54)
    elif any(k in item_id for k in ("darien","mangrove","moss","bijao")): mid,light=(45,111,67),(154,190,83)
    elif any(k in item_id for k in ("moon","pearl","nacre","silver")): mid,light=(89,105,128),(219,234,224)
    elif any(k in item_id for k in ("tulivieja","crypt","locks")): mid,light=(91,65,111),(190,153,196)
    return dark,mid,light


def sword(d, mid, light, broad=False):
    w=22 if broad else 13
    poly(d,[(78,190),(92,201),(181,79),(176,47),(153,70)],light)
    line(d,[(83,183),(170,67)],(255,255,255,100),3)
    line(d,[(65,181),(106,212)],mid,w)
    line(d,[(73,208),(57,224)],light,11)


def axe(d, mid, light):
    line(d,[(84,211),(150,61)],light,15)
    poly(d,[(136,58),(186,47),(205,85),(169,121),(132,103)],mid)
    poly(d,[(151,65),(181,59),(190,81),(165,105)],light)


def hammer(d, mid, light):
    line(d,[(93,213),(145,95)],light,16)
    rect(d,(94,52,191,101),mid,radius=8); rect(d,(103,61,182,82),light,radius=5)


def staff(d, mid, light, orb=False):
    line(d,[(90,220),(145,62)],light,14)
    if orb: ell(d,(119,37,188,106),mid,light,6); ell(d,(138,56,169,87),light)
    else:
        line(d,[(142,64),(179,40),(195,67),(169,91),(142,64)],mid,9); ell(d,(153,51,180,78),light)


def bow(d, mid, light, cross=False):
    if cross:
        line(d,[(63,78),(194,119)],light,11); line(d,[(128,74),(105,205)],mid,14); poly(d,[(96,204),(113,211),(101,221)],light)
    else:
        d.arc(tuple(round(v*S) for v in (55,42,201,217)),285,75,fill=light,width=round(12*S)); line(d,[(177,55),(177,205)],mid,5); line(d,[(75,130),(193,130)],light,7); poly(d,[(193,119),(215,130),(193,141)],light)


def spear(d, mid, light):
    line(d,[(70,216),(165,69)],mid,13); poly(d,[(157,74),(180,34),(194,74),(174,99)],light)


def shield(d, mid, light):
    poly(d,[(128,42),(194,70),(183,161),(128,215),(73,161),(62,70)],mid)
    poly(d,[(128,64),(171,82),(164,148),(128,183),(92,148),(85,82)],light)


def armor(d, slot, mid, light, item_id):
    if slot=="head":
        if any(k in item_id for k in ("hat","cowl","hood","veil","tembleques")):
            poly(d,[(67,158),(82,80),(128,48),(176,82),(191,158),(164,195),(92,195)],mid); line(d,[(75,159),(185,159)],light,11)
        else:
            poly(d,[(65,169),(72,88),(128,48),(184,88),(191,169),(161,205),(95,205)],mid); line(d,[(91,112),(165,112)],light,9)
    elif slot=="chest":
        poly(d,[(73,64),(111,49),(128,80),(145,49),(183,64),(201,188),(160,211),(96,211),(55,188)],mid); line(d,[(128,81),(128,196)],light,7)
    elif slot=="hands":
        for sx in (-1,1):
            cx=128+sx*43; poly(d,[(cx-24,82),(cx+17,72),(cx+28,154),(cx+8,202),(cx-27,174)],mid); line(d,[(cx-18,120),(cx+20,112)],light,6)
    elif slot=="feet":
        for sx in (-1,1):
            cx=128+sx*40; poly(d,[(cx-22,61),(cx+20,61),(cx+16,161),(cx+34,199),(cx+23,215),(cx-30,207),(cx-29,173)],mid); line(d,[(cx-20,151),(cx+18,151)],light,6)
    elif slot=="waist":
        rect(d,(50,101,206,159),mid,radius=17); rect(d,(108,91,148,169),light,radius=6); ell(d,(119,113,137,131),mid)
    elif slot=="back":
        poly(d,[(81,54),(128,42),(175,54),(194,212),(128,187),(62,212)],mid); line(d,[(128,55),(128,186)],light,6)
    elif slot=="offhand": shield(d,mid,light)
    elif slot=="mount":
        poly(d,[(59,165),(72,91),(103,58),(128,95),(157,57),(192,94),(199,165),(169,204),(88,204)],mid); ell(d,(94,119,111,136),light); ell(d,(151,119,168,136),light)


def ring_icon(d, mid, light, amulet=False):
    if amulet:
        d.arc(tuple(round(v*S) for v in (58,38,198,178)),200,-20,fill=light,width=round(10*S)); poly(d,[(128,100),(170,151),(128,211),(86,151)],mid); ell(d,(112,136,144,168),light)
    else:
        ell(d,(63,63,193,193),None,mid,25); poly(d,[(97,76),(128,38),(159,76),(145,105),(111,105)],light)


def bottle(d, mid, light, item_id):
    liquid=(184,45,48,255) if "health" in item_id or "pulse" in item_id else (50,166,150,255)
    if "haste" in item_id: liquid=(226,190,55,255)
    rect(d,(105,46,151,78),light,radius=5); rect(d,(96,68,160,91),mid,radius=5)
    poly(d,[(101,86),(155,86),(180,177),(163,211),(93,211),(76,177)],light)
    poly(d,[(88,151),(168,151),(176,178),(158,200),(98,200),(80,178)],liquid)


def scroll(d, mid, light, seed):
    rect(d,(69,53,187,202),light,radius=15); ell(d,(55,45,92,83),mid); ell(d,(164,174,201,212),mid)
    for i in range(3):
        y=97+i*26; line(d,[(91,y),(165-(seed>>i)%24,y)],mid,6)


def fish(d, mid, light):
    ell(d,(63,82,181,180),mid); poly(d,[(174,128),(216,89),(210,167)],light); ell(d,(83,111,98,126),light); line(d,[(91,151),(153,151)],light,5)


def food(d, mid, light, item_id):
    if "coffee" in item_id or "seco" in item_id:
        rect(d,(73,83,171,196),mid,radius=14); d.arc(tuple(round(v*S) for v in (150,101,211,169)),270,90,fill=light,width=round(10*S)); line(d,[(88,70),(104,43)],light,7); line(d,[(128,70),(139,41)],light,7)
    elif "corn_bollo" in item_id:
        poly(d,[(73,177),(94,68),(128,48),(162,68),(183,177),(128,211)],mid); line(d,[(128,58),(128,198)],light,7); line(d,[(84,143),(172,143)],light,6)
    elif "raspadura" in item_id:
        poly(d,[(69,91),(128,57),(187,91),(187,173),(128,207),(69,173)],mid); poly(d,[(81,99),(128,73),(175,99),(128,127)],light)
    else:
        poly(d,[(56,166),(79,95),(128,67),(177,95),(200,166),(171,204),(85,204)],mid); line(d,[(75,165),(181,165)],light,7)


def material(d, item_id, mid, light):
    if "fish" in item_id: fish(d,mid,light)
    elif "wood" in item_id: rect(d,(54,91,202,170),mid,radius=25); line(d,[(75,109),(180,151)],light,8); ell(d,(151,101,183,133),None,light,5)
    elif any(k in item_id for k in ("ore","nugget","gem","essence")): 
        poly(d,[(128,43),(187,91),(176,174),(128,213),(76,174),(66,95)],mid); poly(d,[(128,62),(158,101),(145,173),(128,193),(109,169),(96,101)],light)
    elif "key" in item_id:
        ell(d,(55,57,135,137),None,light,14); line(d,[(119,121),(201,203)],mid,17); line(d,[(172,173),(194,151)],light,11)
    elif "fang" in item_id:
        poly(d,[(74,54),(180,69),(160,205),(119,174)],light)
    elif "cotton" in item_id:
        for x,y in ((90,127),(128,102),(166,127),(128,151)): ell(d,(x-34,y-34,x+34,y+34),light)
    elif "fiber" in item_id:
        for x in (88,112,136,160): line(d,[(x,204),(128+(x-124)*.5,51)],mid,13)
    elif "hide" in item_id:
        poly(d,[(72,53),(105,75),(128,55),(151,75),(184,53),(202,103),(178,128),(195,190),(151,202),(128,184),(105,202),(61,190),(78,128),(54,103)],mid)
    elif "boot" in item_id:
        poly(d,[(86,52),(145,52),(141,155),(190,183),(180,210),(78,205),(71,175),(88,151)],mid)
    else: ell(d,(66,66,190,190),mid); poly(d,[(128,79),(161,128),(128,177),(95,128)],light)


def pet(d, item_id, mid, light):
    ears = [(61,151),(78,70),(112,101),(128,75),(144,101),(178,70),(195,151),(164,202),(92,202)]
    poly(d,ears,mid); ell(d,(94,128,110,144),light); ell(d,(146,128,162,144),light)
    if "owl" in item_id:
        ell(d,(70,88,130,158),light); ell(d,(126,88,186,158),light); poly(d,[(117,148),(139,148),(128,169)],mid)
    elif "turtle" in item_id:
        ell(d,(61,77,195,191),mid); line(d,[(81,104),(176,165)],light,6); line(d,[(176,104),(81,165)],light,6)


def draw_item(item_id, item, spells):
    cat=item.get("category") or "material"; slot=item.get("slot") or ""; icon=str(item.get("icon") or "")
    seed=int(hashlib.sha256(item_id.encode()).hexdigest()[:8],16)
    dark,mid,light=theme(item_id,cat)
    image=Image.new("RGBA",(N,N),(0,0,0,0)); d=ImageDraw.Draw(image,"RGBA")
    rect(d,(17,17,239,239),(15,18,18,242),(218,170,77,255),7,26); rect(d,(27,27,229,229),(*dark,255),(*mid,255),6,22)
    for i in range(5):
        a=(seed>>(i*5))%360; r=74+(seed>>(i*3))%18; x=128+math.cos(math.radians(a))*r; y=128+math.sin(math.radians(a))*r
        ell(d,(x-4,y-4,x+4,y+4),(*mid,90))
    if cat=="weapon":
        kind=icon
        if "crossbow" in kind or "crossbow" in item_id: bow(d,mid,light,True)
        elif kind=="bow" or "_bow" in item_id: bow(d,mid,light)
        elif "axe" in kind or "axe" in item_id: axe(d,mid,light)
        elif any(k in kind for k in ("hammer","mace")) or any(k in item_id for k in ("hammer","mace","club","maul")): hammer(d,mid,light)
        elif kind in ("staff","wand","orb") or any(k in item_id for k in ("staff","wand","orb")): staff(d,mid,light,"orb" in kind or "orb" in item_id)
        elif kind in ("spear",) or any(k in item_id for k in ("spear","harpoon")): spear(d,mid,light)
        else: sword(d,mid,light,"great" in kind or "blade" in item_id)
    elif cat=="armor": armor(d,slot,mid,light,item_id)
    elif cat=="jewel": ring_icon(d,mid,light,slot=="amulet")
    elif cat=="scroll":
        spell_id=(item.get("use") or {}).get("spellId",""); el=spells.get(spell_id,{}).get("element")
        if el: mid,light=theme(spell_id,el if el in FAMILY else "scroll")[1:]
        scroll(d,mid,light,seed)
    elif cat=="petCharm": pet(d,item_id,mid,light)
    elif cat=="consumable":
        if "fish" in item_id: fish(d,mid,light)
        elif any(k in item_id for k in ("potion","draught","tonic","elixir")): bottle(d,mid,light,item_id)
        else: food(d,mid,light,item_id)
    else: material(d,item_id,mid,light)
    # Marca asimétrica estable por ID para distinguir variantes del mismo tipo.
    a=(seed%150)+195; x=128+math.cos(math.radians(a))*91; y=128+math.sin(math.radians(a))*91
    ell(d,(x-7,y-7,x+7,y+7),(*light,255),(*mid,255),2)
    return image.resize((256,256),Image.Resampling.LANCZOS)


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    items=json.loads((ROOT/"data"/"rpg"/"items.json").read_text(encoding="utf-8"))["items"]
    spells=json.loads((ROOT/"data"/"rpg"/"spells.json").read_text(encoding="utf-8"))["spells"]
    for item_id,item in items.items(): draw_item(item_id,item,spells).save(OUT/f"{item_id}.png",optimize=True)
    print(f"{len(items)} iconos de objetos en {OUT}")


if __name__=="__main__": main()
