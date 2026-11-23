#!/usr/bin/env python3
"""Lenguaje visual modular para iconos de FrankmanGames.

Las recetas combinan cuatro capas independientes: efecto elemental, silueta,
material y heráldica. El marco, cantidad, nivel y rareza pertenecen a la UI.
No usa fuentes, imágenes ni símbolos externos.
"""
from __future__ import annotations

import hashlib
import math
import random
import re
from dataclasses import dataclass

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps


SIZE = 512
S = SIZE / 256

ELEMENTS = {
    "earth": (154, 103, 50),
    "fire": (229, 70, 35),
    "air": (79, 195, 188),
    "water": (38, 137, 211),
    "frost": (126, 202, 237),
    "lightning": (238, 195, 46),
}
RARITY = {
    "common": (176, 183, 178),
    "uncommon": (95, 194, 112),
    "rare": (72, 145, 232),
    "epic": (173, 91, 218),
    "legendary": (239, 163, 45),
}
MATERIALS = {
    "steel": ((43, 50, 62), (145, 157, 176), (241, 245, 247)),
    "bronze": ((62, 38, 24), (160, 91, 43), (244, 192, 102)),
    "wood": ((49, 31, 20), (126, 77, 39), (210, 151, 78)),
    "leather": ((53, 32, 23), (132, 75, 44), (215, 143, 84)),
    "cloth": ((39, 42, 58), (84, 98, 133), (172, 184, 211)),
    "gold": ((67, 43, 15), (190, 119, 24), (255, 224, 111)),
    "stone": ((43, 44, 47), (104, 103, 98), (205, 196, 169)),
    "glass": ((22, 47, 59), (58, 153, 173), (194, 244, 240)),
    "paper": ((71, 53, 31), (190, 153, 86), (250, 228, 166)),
    "organic": ((35, 50, 30), (86, 129, 62), (182, 207, 105)),
}


def seed_for(value: str) -> int:
    return int(hashlib.sha256(value.encode("utf-8")).hexdigest()[:16], 16)


def element_for(item_id: str, name: str = "") -> str | None:
    text = f"_{item_id.lower()}_ {name.lower()}"
    aliases = {
        "earth": ("_earth_", "tierra", "piedra", "mangle", "raíz"),
        "fire": ("_fire_", "fuego", "brasa", "volcán", "carbón", "fogón"),
        "air": ("_air_", "aire", "viento", "brisa", "vendaval", "nube"),
        "water": ("_water_", "agua", "marea", "río", "estero"),
        "frost": ("_frost_", "escarcha", "hielo", "sereno", "frío"),
        "lightning": ("_lightning_", "rayo", "trueno", "relámpago"),
    }
    return next((key for key, words in aliases.items() if any(word in text for word in words)), None)


def material_for(item_id: str, kind: str, category: str, name: str = "") -> str:
    text = f"{item_id} {name}".lower()
    if any(x in text for x in ("oro", "gold", "huaca", "fortuna")): return "gold"
    if any(x in text for x in ("madera", "wood", "cedro", "guayacán", "coco")): return "wood"
    if any(x in text for x in ("cuero", "leather", "piel", "hide")): return "leather"
    if any(x in text for x in ("piedra", "stone", "granito", "basalto", "ore")): return "stone"
    if kind in {"ring", "amulet", "huaca", "gem", "orb"}: return "gold"
    if kind in {"potion", "elixir"}: return "glass"
    if kind == "scroll": return "paper"
    if category in {"food", "material"} or kind in {"fish", "fang", "hide", "essence"}: return "organic"
    if category == "armor" and kind in {"robe", "cape", "hood", "hat"}: return "cloth"
    if category == "armor" and kind in {"boots", "gloves", "belt", "sandals", "bracers"}: return "leather"
    return "steel" if category in {"weapon", "armor"} else "bronze"


def _scaled(points):
    return [(round(x*S), round(y*S)) for x, y in points]


@dataclass(frozen=True)
class Recipe:
    kind: str
    category: str
    slot: str
    element: str | None
    rarity: str
    material: str


class IconCanvas:
    def __init__(self, key: str, recipe: Recipe):
        self.key = key
        self.recipe = recipe
        self.seed = seed_for(key)
        self.random = random.Random(self.seed)
        self.image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

    def mask(self): return Image.new("L", (SIZE, SIZE), 0)
    def polygon(self, points):
        m=self.mask(); ImageDraw.Draw(m).polygon(_scaled(points), fill=255); return m
    def ellipse(self, box):
        m=self.mask(); ImageDraw.Draw(m).ellipse(tuple(round(v*S) for v in box), fill=255); return m
    def rounded(self, box, radius):
        m=self.mask(); ImageDraw.Draw(m).rounded_rectangle(tuple(round(v*S) for v in box), round(radius*S), fill=255); return m
    def stroke(self, points, width):
        m=self.mask(); ImageDraw.Draw(m).line(_scaled(points), fill=255, width=round(width*S), joint="curve"); return m

    def merge(self, *masks):
        out=self.mask()
        for mask in masks: out=ImageChops.lighter(out, mask)
        return out

    def material(self, mask, material=None, accent=None, texture=0.13):
        dark, mid, light = MATERIALS[material or self.recipe.material]
        if accent:
            mid = tuple(round(mid[i]*.58 + accent[i]*.42) for i in range(3))
            light = tuple(round(light[i]*.68 + accent[i]*.32) for i in range(3))
        gradient = Image.linear_gradient("L").resize((SIZE, SIZE))
        colored = ImageOps.colorize(gradient, dark, light).convert("RGBA")
        if texture:
            noise = Image.effect_noise((SIZE, SIZE), 18 + self.random.random()*14)
            noise = ImageOps.colorize(noise, (15, 18, 23), (245, 238, 216)).convert("RGBA")
            colored = Image.blend(colored, noise, texture)
        colored.putalpha(mask)

        # Bisel oscuro exterior y filo luminoso interior.
        spread = mask.filter(ImageFilter.MaxFilter(15))
        outer = ImageChops.subtract(spread, mask)
        outline = Image.new("RGBA", (SIZE, SIZE), (12, 16, 22, 0)); outline.putalpha(outer.point(lambda a: min(235, a)))
        inner = ImageChops.subtract(mask, mask.filter(ImageFilter.MinFilter(11)))
        shine = Image.new("RGBA", (SIZE, SIZE), (*light, 0)); shine.putalpha(inner.point(lambda a: round(a*.62)))
        self.image = Image.alpha_composite(self.image, outline)
        self.image = Image.alpha_composite(self.image, colored)
        self.image = Image.alpha_composite(self.image, shine)

    def glow(self, mask, color, strength=.42, blur=15):
        alpha=mask.filter(ImageFilter.GaussianBlur(round(blur*S))).point(lambda a: round(a*strength))
        layer=Image.new("RGBA",(SIZE,SIZE),(*color,0)); layer.putalpha(alpha)
        self.image=Image.alpha_composite(layer,self.image)

    def element_backdrop(self):
        element=self.recipe.element
        if not element: return
        color=ELEMENTS[element]; r=self.random
        m=self.mask(); d=ImageDraw.Draw(m)
        if element == "fire":
            for x in (91,128,165):
                h=r.randint(35,70); d.polygon(_scaled([(x-24,190),(x-15,135),(x,160-h),(x+16,132),(x+24,190)]),fill=175)
        elif element == "water":
            d.arc(tuple(round(v*S) for v in (47,63,209,216)),195,348,fill=210,width=round(15*S))
            d.arc(tuple(round(v*S) for v in (69,90,187,201)),200,350,fill=150,width=round(9*S))
        elif element == "air":
            for y, start in ((94,48),(132,69),(171,43)):
                d.arc(tuple(round(v*S) for v in (start,y-28,217,y+32)),190,351,fill=190,width=round(9*S))
        elif element == "frost":
            for a in range(0,360,60):
                x=128+math.cos(math.radians(a))*78; y=128+math.sin(math.radians(a))*78
                d.line(_scaled([(128,128),(x,y)]),fill=175,width=round(8*S))
        elif element == "lightning":
            d.line(_scaled([(82,51),(118,108),(96,120),(156,205),(143,139),(174,127)]),fill=225,width=round(13*S),joint="curve")
        else:
            for x,y in ((75,151),(111,79),(158,91),(185,157)):
                d.polygon(_scaled([(x,y-26),(x+24,y-5),(x+17,y+25),(x-20,y+20),(x-25,y-4)]),fill=165)
        self.glow(m,color,.48,18)
        layer=Image.new("RGBA",(SIZE,SIZE),(*color,0)); layer.putalpha(m)
        self.image=Image.alpha_composite(self.image,layer)

    def gem(self, x=128, y=128, size=14):
        color=ELEMENTS.get(self.recipe.element or "",RARITY.get(self.recipe.rarity,RARITY["common"]))
        sides=3+self.seed%4
        pts=[]
        for i in range(sides):
            a=-math.pi/2+i*math.tau/sides; pts.append((x+math.cos(a)*size,y+math.sin(a)*size))
        mask=self.polygon(pts); self.glow(mask,color,.55,7); self.material(mask,"glass",color,0.04)

    def trim(self, points, width=6):
        color=RARITY.get(self.recipe.rarity,RARITY["common"])
        mask=self.stroke(points,width); self.material(mask,"gold" if self.recipe.rarity=="legendary" else "bronze",color,0.05)

    def finish(self):
        alpha=self.image.getchannel("A"); bbox=alpha.point(lambda a:255 if a>=8 else 0).getbbox()
        if not bbox: return Image.new("RGBA",(256,256),(0,0,0,0))
        art=self.image.crop(bbox)
        # Más presencia a 46 px: la ilustración ocupa 84 % del master y la UI
        # aporta el marco/aire exterior.
        safe=round(216*S); ratio=min(1,safe/max(art.size))
        if ratio<1: art=art.resize((round(art.width*ratio),round(art.height*ratio)),Image.Resampling.LANCZOS)
        canvas=Image.new("RGBA",(SIZE,SIZE),(0,0,0,0)); canvas.alpha_composite(art,((SIZE-art.width)//2,(SIZE-art.height)//2))
        return canvas.resize((256,256),Image.Resampling.LANCZOS)


WEAPONS = {"sword","axe","mace","wand","orb","staff","bow","dagger","crossbow","greatsword","hammer","spear"}
ARMOR_KINDS = {"armor","hat","boots","gloves","cape","belt","hood","helmet","robe","bracers","sandals","shield","buckler","feet"}


def _draw_weapon(c: IconCanvas, kind: str):
    r=c.random; metal=c.recipe.material if c.recipe.material in {"steel","bronze","gold","stone"} else "steel"
    if kind in {"sword","dagger","greatsword"}:
        half={"dagger":10,"sword":15,"greatsword":22}[kind]+r.randint(-2,3)
        blade=c.polygon([(72,190),(89,207),(183-half*.15,84),(184,47),(157,70)])
        if kind=="greatsword": blade=c.polygon([(66,196),(91,214),(190,76),(184,35),(151,67)])
        c.material(blade,metal,texture=.08)
        c.trim([(65,181),(106,212)],8 if kind=="dagger" else 11)
        grip=c.stroke([(78,205),(57,226)],11); c.material(grip,"leather",texture=.15)
        c.gem(91,192,8)
    elif kind in {"axe","mace","hammer"}:
        shaft=c.stroke([(78,216),(150,64)],14+r.randint(-2,3)); c.material(shaft,"wood",texture=.18)
        if kind=="axe":
            head=c.polygon([(132,61),(184,43),(207,78),(172,121),(128,106)]); c.material(head,metal,texture=.1)
            edge=c.stroke([(181,50),(198,79),(169,110)],8); c.material(edge,"steel",texture=.03)
        elif kind=="hammer":
            head=c.rounded((91,46,196,99),9); c.material(head,metal,texture=.09); c.trim([(102,59),(185,59)],7)
        else:
            head=c.ellipse((116,39,192,114)); c.material(head,metal,texture=.12)
            for a in range(0,360,60):
                x=154+math.cos(math.radians(a))*48; y=77+math.sin(math.radians(a))*48
                spike=c.polygon([(151,76),(x,y),(158,80)]); c.material(spike,metal,texture=.05)
        c.gem(148,91,9)
    elif kind in {"bow","crossbow"}:
        if kind=="bow":
            body=c.merge(c.stroke([(73,49),(111,81),(126,128),(111,177),(73,211)],12),c.stroke([(73,49),(73,211)],3))
            c.material(body,"wood",texture=.2); string=c.stroke([(73,49),(73,211)],3); c.material(string,"cloth",texture=0)
            arrow=c.merge(c.stroke([(61,130),(210,130)],7),c.polygon([(210,117),(230,130),(210,143)])); c.material(arrow,metal,texture=.04)
        else:
            body=c.merge(c.stroke([(66,82),(199,119)],12),c.stroke([(128,74),(103,209)],15)); c.material(body,"wood",texture=.2)
            bow=c.stroke([(60,78),(129,129),(204,103)],5); c.material(bow,"steel",texture=.04)
            c.gem(127,130,9)
    elif kind in {"staff","wand","orb"}:
        shaft=c.stroke([(78,220),(145,61)],13 if kind!="wand" else 9); c.material(shaft,"wood",texture=.18)
        if kind=="orb":
            head=c.ellipse((111,33,194,116)); c.glow(head,ELEMENTS.get(c.recipe.element or "",(145,112,218)),.55,15); c.material(head,"glass",ELEMENTS.get(c.recipe.element or "",None),.03)
        else:
            horns=c.merge(c.stroke([(142,67),(176,37),(199,70)],10),c.stroke([(142,67),(173,96),(199,70)],8)); c.material(horns,metal,texture=.07)
            c.gem(176,67,13 if kind=="staff" else 10)
    elif kind=="spear":
        shaft=c.stroke([(62,221),(171,65)],12); c.material(shaft,"wood",texture=.2)
        blade=c.polygon([(160,73),(185,27),(202,75),(175,104)]); c.material(blade,metal,texture=.06); c.gem(171,91,7)


def _draw_set_ornament(c: IconCanvas, kind: str) -> None:
    """Rompe la silueta repetida de rutas/especializaciones por familia y grado."""
    if not c.key.startswith(("route_", "spec_", "learning_", "bi_", "tri_")):
        return
    match = re.search(r"_(\d{2})_", c.key)
    grade = int(match.group(1)) if match else 1 + c.seed % 10
    variant = (grade - 1) % 10
    accent = ELEMENTS.get(c.recipe.element or "", RARITY.get(c.recipe.rarity, RARITY["common"]))
    slot = c.recipe.slot
    masks = []
    if slot == "head" or kind in {"hat", "hood", "helmet"}:
        shapes = [
            [(91,86),(66,36),(111,64)], [(165,86),(190,36),(145,64)],
            [(112,63),(128,19),(144,63)], [(83,103),(42,73),(76,126)],
            [(173,103),(214,73),(180,126)],
        ]
        masks = [c.polygon(shapes[variant % len(shapes)])]
        if variant >= 5: masks.append(c.polygon(shapes[(variant + 2) % len(shapes)]))
    elif slot == "chest" or kind in {"armor", "robe"}:
        left = [(70,89),(28,70),(45,126),(86,123)] if variant % 2 == 0 else [(74,80),(39,42),(50,116),(91,126)]
        right = [(186,89),(228,70),(211,126),(170,123)] if variant % 2 == 0 else [(182,80),(217,42),(206,116),(165,126)]
        masks = [c.polygon(left), c.polygon(right)]
        if variant in {2,5,8}: masks.append(c.polygon([(111,60),(128,23),(145,60),(128,91)]))
    elif slot == "hands" or kind in {"gloves", "bracers"}:
        masks = [c.polygon([(55,103),(25,79),(48,140),(72,151)]), c.polygon([(201,103),(231,79),(208,140),(184,151)])]
    elif slot == "feet" or kind in {"boots", "sandals", "feet"}:
        masks = [c.polygon([(53,173),(24,190),(60,208),(81,190)]), c.polygon([(203,173),(232,190),(196,208),(175,190)])]
    elif slot == "back" or kind == "cape":
        masks = [c.polygon([(78,73),(43,42),(58,124),(91,138)]), c.polygon([(178,73),(213,42),(198,124),(165,138)])]
    elif slot == "waist" or kind == "belt":
        masks = [c.polygon([(55,105),(20,128),(55,151),(87,128)]), c.polygon([(201,105),(236,128),(201,151),(169,128)])]
    if masks:
        merged = c.merge(*masks)
        c.glow(merged, accent, .24, 8)
        c.material(merged, "gold" if variant in {4,9} else c.recipe.material, accent, .08)
    # Firma central distinta por grado: barra, chevrón, cruz, corona o espiral.
    motifs = [
        [(99,132),(157,132)], [(103,146),(128,116),(153,146)],
        [(128,104),(128,158),(101,131),(155,131)], [(101,148),(113,116),(128,141),(143,116),(155,148)],
        [(105,119),(151,143)], [(105,143),(151,119)],
    ]
    c.trim(motifs[variant % len(motifs)], 4 + variant % 3)


def _draw_armor(c: IconCanvas, kind: str):
    slot=c.recipe.slot; r=c.random
    material=c.recipe.material
    if kind=="mount" or slot=="mount":
        winged=any(word in c.key for word in ("harpy","diostede","crestalba","falcopama"))
        if winged:
            left=c.polygon([(119,121),(71,59),(39,70),(69,125),(35,164),(94,166),(128,205)])
            right=c.polygon([(137,121),(185,59),(217,70),(187,125),(221,164),(162,166),(128,205)])
            c.material(c.merge(left,right),"cloth",ELEMENTS.get(c.recipe.element or "",None),.13)
        head=c.polygon([(81,174),(77,91),(107,55),(128,89),(154,53),(187,92),(181,174),(153,211),(103,211)])
        c.material(head,material,ELEMENTS.get(c.recipe.element or "",None),.17)
        if "falcopama" in c.key or "harpy" in c.key:
            beak=c.polygon([(103,135),(153,125),(205,145),(153,165),(112,158)]); c.material(beak,"gold",texture=.06)
        elif "tapir" in c.key:
            snout=c.rounded((102,132,169,191),18); c.material(snout,"leather",texture=.17)
        else:
            snout=c.rounded((103,130,159,186),15); c.material(snout,"leather",texture=.15)
        c.gem(107,122,7); c.gem(154,119,7)
    elif kind in {"hat","hood","helmet"} or slot=="head":
        if kind in {"hat","hood"}:
            base=c.polygon([(57,171),(75,92),(128,47),(181,92),(199,171),(165,206),(91,206)])
        else:
            base=c.polygon([(62,173),(70,83),(128,43),(186,83),(194,173),(159,211),(97,211)])
        c.material(base,material,texture=.16); c.trim([(78,164),(181,164)],8); c.gem(128,93,9)
    elif kind in {"armor","robe"} or slot=="chest":
        base=c.polygon([(68,66),(109,45),(128,78),(147,45),(188,66),(205,190),(161,216),(95,216),(51,190)])
        c.material(base,material,texture=.17)
        c.trim([(128,78),(128,203)],6); c.trim([(75,92),(105,119),(151,119),(181,92)],5)
        c.gem(128,122,10)
    elif kind in {"gloves","bracers"} or slot=="hands":
        for cx,flip in ((84,-1),(172,1)):
            base=c.polygon([(cx-25,81),(cx+19,70),(cx+30,154),(cx+9,207),(cx-29,177)])
            c.material(base,material,texture=.18); c.trim([(cx-21,121),(cx+22,112)],6)
            if flip>0: c.gem(cx+3,142,7)
    elif kind in {"boots","sandals","feet"} or slot=="feet":
        for cx in (87,169):
            base=c.polygon([(cx-22,55),(cx+21,55),(cx+17,157),(cx+38,194),(cx+24,217),(cx-35,208),(cx-33,176)])
            c.material(base,material,texture=.18); c.trim([(cx-24,150),(cx+18,150)],6)
    elif kind=="belt" or slot=="waist":
        base=c.rounded((43,96,213,164),18); c.material(base,material,texture=.2)
        buckle=c.rounded((103,86,153,174),7); c.material(buckle,"gold" if c.recipe.rarity=="legendary" else "bronze",texture=.05)
        c.gem(128,130,9)
    elif kind=="cape" or slot=="back":
        base=c.polygon([(78,48),(128,37),(178,48),(201,217),(128,187),(55,217)])
        c.material(base,material,texture=.2); c.trim([(128,52),(128,185)],5); c.gem(128,65,8)
    elif kind in {"shield","buckler"} or slot=="offhand":
        if kind=="buckler": base=c.ellipse((55,53,201,199))
        else: base=c.polygon([(128,37),(200,68),(187,165),(128,220),(69,165),(56,68)])
        c.material(base,material,texture=.13)
        boss=c.ellipse((101,101,155,155)); c.material(boss,"gold" if c.recipe.rarity=="legendary" else "steel",texture=.04); c.gem(128,128,9)
    else:
        base=c.polygon([(59,165),(72,91),(103,58),(128,95),(157,57),(192,94),(199,165),(169,204),(88,204)])
        c.material(base,material,texture=.17); c.gem(128,131,9)
    _draw_set_ornament(c, kind)


def _draw_jewel(c: IconCanvas, kind: str):
    if kind=="huaca":
        animal=c.key.removeprefix("huaca_")
        if animal=="tortuga": base=c.merge(c.ellipse((66,74,190,188)),c.ellipse((180,111,222,149)))
        elif animal=="murcielago": base=c.polygon([(128,72),(91,111),(45,75),(65,168),(109,188),(128,220),(147,188),(191,168),(211,75),(165,111)])
        elif animal=="aguila": base=c.polygon([(128,48),(151,103),(216,76),(184,155),(145,176),(128,222),(111,176),(72,155),(40,76),(105,103)])
        elif animal=="caiman": base=c.polygon([(45,142),(88,88),(177,80),(222,118),(187,160),(88,179)])
        elif animal=="rana": base=c.merge(c.ellipse((77,86,179,190)),c.ellipse((52,69,105,122)),c.ellipse((151,69,204,122)))
        else: base=c.polygon([(70,178),(76,86),(108,57),(128,91),(148,57),(180,86),(186,178),(153,214),(103,214)])
        c.material(base,"gold",texture=.12); c.gem(128,128,8)
    elif kind=="amulet":
        chain=c.stroke([(64,58),(81,125),(128,174),(175,125),(192,58)],7); c.material(chain,"gold",texture=.06)
        variant=c.seed%5
        pendants=[
            [(128,96),(174,151),(128,217),(82,151)],
            [(128,94),(181,132),(160,207),(96,207),(75,132)],
            [(128,91),(170,119),(178,176),(128,219),(78,176),(86,119)],
            [(128,91),(151,132),(199,137),(164,168),(176,215),(128,187),(80,215),(92,168),(57,137),(105,132)],
            [(128,91),(184,148),(128,218),(72,148)],
        ]
        pendant=c.polygon(pendants[variant]); c.material(pendant,c.recipe.material,texture=.08); c.gem(128,154,15)
        if c.key.startswith(("route_","learning_")): c.trim([(98,171),(128,112),(158,171)],4+variant)
    else:
        variant=c.seed%4
        outer=(50-variant*3,51-variant*2,206+variant*3,207+variant*2)
        inner=(82+variant*2,83+variant*2,174-variant*2,175-variant*2)
        band=c.ellipse(outer); band=ImageChops.subtract(band,c.ellipse(inner))
        c.material(band,c.recipe.material,texture=.08)
        crown_shapes=[
            [(91,88),(128,39),(165,88),(147,114),(109,114)],
            [(83,94),(105,48),(128,73),(151,48),(173,94),(148,118),(108,118)],
            [(92,92),(106,46),(128,31),(150,46),(164,92),(146,119),(110,119)],
            [(77,102),(98,55),(128,77),(158,55),(179,102),(146,121),(110,121)],
        ]
        crown=c.polygon(crown_shapes[variant]); c.material(crown,"gold",texture=.05); c.gem(128,82,15)


def _draw_consumable(c: IconCanvas, kind: str):
    if "ovillo" in c.key:
        coil=c.ellipse((67,66,189,188)); c.material(coil,"cloth",texture=.2)
        for inset in (17,32,47):
            ring=c.ellipse((67+inset,66+inset,189-inset,188-inset)); c.trim([(128-inset//2,128),(128+inset//2,128)],3)
        thread=c.stroke([(161,169),(195,194),(211,184)],6); c.material(thread,"cloth",texture=.12)
        c.gem(128,127,7)
    elif kind in {"potion","elixir"}:
        bottle=c.polygon([(105,45),(151,45),(151,82),(164,99),(183,177),(162,215),(94,215),(73,177),(92,99),(105,82)])
        c.material(bottle,"glass",ELEMENTS.get(c.recipe.element or "",None),.03)
        liquid=c.polygon([(82,155),(174,155),(180,180),(158,204),(98,204),(76,180)])
        color=ELEMENTS.get(c.recipe.element or "",(204,61,66)); c.glow(liquid,color,.35,9); layer=Image.new("RGBA",(SIZE,SIZE),(*color,0)); layer.putalpha(liquid); c.image=Image.alpha_composite(c.image,layer)
        cork=c.rounded((101,42,155,78),6); c.material(cork,"wood",texture=.16); c.gem(128,122,7)
    elif kind=="scroll":
        paper=c.rounded((64,50,192,207),17); c.material(paper,"paper",texture=.18)
        top=c.ellipse((51,42,95,86)); bottom=c.ellipse((161,171,205,215)); c.material(c.merge(top,bottom),"bronze",texture=.1)
        c.trim([(89,103),(167,103)],4); c.trim([(89,130),(157,130)],4); c.trim([(89,157),(145,157)],4)
    elif kind=="fish":
        body=c.ellipse((57,79,184,183)); tail=c.polygon([(173,128),(220,83),(212,173)]); c.material(c.merge(body,tail),"organic",ELEMENTS.get(c.recipe.element or "",None),.2); c.gem(91,121,6)
    elif kind=="food":
        base=c.polygon([(53,166),(78,91),(128,61),(178,91),(203,166),(170,210),(86,210)]); c.material(base,"organic",texture=.22); c.trim([(73,163),(183,163)],5)
    else:
        base=c.ellipse((62,61,194,193)); c.material(base,c.recipe.material,texture=.2); c.gem(128,128,11)


def _draw_material(c: IconCanvas, kind: str):
    if kind in {"ore","gem","essence"}:
        base=c.polygon([(128,38),(191,89),(178,177),(128,218),(72,177),(62,94)])
        c.material(base,"glass" if kind in {"gem","essence"} else "stone",ELEMENTS.get(c.recipe.element or "",None),.14); c.gem(128,128,10)
    elif kind=="key":
        ring=c.ellipse((48,48,139,139)); hole=c.ellipse((72,72,115,115)); ring=ImageChops.subtract(ring,hole)
        shaft=c.merge(c.stroke([(119,120),(207,208)],17),c.stroke([(177,179),(201,155)],11)); c.material(c.merge(ring,shaft),"gold",texture=.06)
    elif kind=="fang":
        base=c.polygon([(67,48),(185,64),(163,216),(115,180)]); c.material(base,"organic",texture=.12)
    elif kind=="hide":
        base=c.polygon([(69,48),(104,73),(128,51),(152,73),(187,48),(207,101),(180,130),(198,195),(151,209),(128,187),(105,209),(58,195),(76,130),(49,101)])
        c.material(base,"leather",texture=.24)
    elif kind=="junk":
        base=c.merge(c.ellipse((68,68,188,188)),c.stroke([(84,84),(181,181)],16)); c.material(base,"stone",texture=.24)
    else:
        base=c.rounded((51,90,205,174),27); c.material(base,"wood" if "wood" in c.key else c.recipe.material,texture=.23); c.trim([(76,109),(181,151)],6)


def render_item_icon(item_id: str, item: dict, spell_emblem: Image.Image | None = None) -> Image.Image:
    category=str(item.get("category") or "material")
    slot=str(item.get("slot") or "")
    kind=str(item.get("kind") or item.get("type") or ("scroll" if category=="scroll" else "") or slot or category or "other")
    element=element_for(item_id,str(item.get("name") or ""))
    rarity=str(item.get("rarity") or "common")
    material=material_for(item_id,kind,category,str(item.get("name") or ""))
    c=IconCanvas(item_id,Recipe(kind,category,slot,element,rarity,material))
    c.element_backdrop()
    if kind in WEAPONS: _draw_weapon(c,kind)
    elif kind in {"ring","amulet","huaca","charm"} or category in {"jewel","petCharm"}: _draw_jewel(c,kind)
    elif kind in {"potion","elixir","scroll","fish","food"} or category in {"consumable","scroll"}: _draw_consumable(c,kind)
    elif kind in ARMOR_KINDS or category=="armor": _draw_armor(c,kind)
    else: _draw_material(c,kind)

    # Los pergaminos llevan la forma simple del hechizo real, no un rollo genérico.
    if kind=="scroll" and spell_emblem is not None:
        emblem=spell_emblem.convert("RGBA"); emblem.thumbnail((round(70*S),round(70*S)),Image.Resampling.LANCZOS)
        c.image.alpha_composite(emblem,((SIZE-emblem.width)//2,round(105*S)))

    # Detalle secundario estable: cambia posición y tamaño por ID.
    if kind not in {"scroll","huaca","ring","amulet"}:
        x=105+(c.seed>>9)%47; y=113+(c.seed>>17)%38; c.gem(x,y,6+(c.seed>>25)%5)
    return c.finish()

