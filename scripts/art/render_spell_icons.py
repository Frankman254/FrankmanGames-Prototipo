#!/usr/bin/env python3
"""Generador heredado de respaldo; el catálogo publicable usa arte sin marco."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).parents[2]
OUT = ROOT / "assets" / "icons" / "spells"
SIZE = 1024
S = SIZE / 256

PALETTES = {
    "fire": ((80, 19, 21), (238, 82, 32), (255, 195, 66)),
    "frost": ((18, 54, 76), (55, 177, 198), (213, 247, 244)),
    "storm": ((35, 25, 78), (77, 121, 218), (243, 212, 89)),
    "earth": ((51, 43, 28), (116, 132, 72), (232, 184, 78)),
    "physical": ((54, 31, 28), (147, 72, 52), (226, 188, 119)),
}


def pts(values):
    return [(round(x * S), round(y * S)) for x, y in values]


def line(draw, values, fill, width=8, joint="curve"):
    draw.line(pts(values), fill=fill, width=round(width * S), joint=joint)


def ellipse(draw, box, fill=None, outline=None, width=1):
    draw.ellipse(tuple(round(v * S) for v in box), fill=fill, outline=outline, width=round(width * S))


def polygon(draw, values, fill):
    draw.polygon(pts(values), fill=fill)


def arc(draw, box, start, end, fill, width=8):
    draw.arc(tuple(round(v * S) for v in box), start, end, fill=fill, width=round(width * S))


def bolt(draw, color, offset=(0, 0)):
    ox, oy = offset
    polygon(draw, [(132+ox, 48+oy), (91+ox, 130+oy), (124+ox, 126+oy), (105+ox, 207+oy), (172+ox, 106+oy), (137+ox, 111+oy)], color)


def crystal(draw, color, center=(128, 128), scale=1.0):
    x, y = center
    polygon(draw, [(x, y-68*scale), (x+40*scale, y-12*scale), (x+20*scale, y+58*scale), (x, y+75*scale), (x-25*scale, y+52*scale), (x-42*scale, y-10*scale)], color)
    line(draw, [(x, y-60*scale), (x, y+66*scale)], (255,255,255,120), 3)


def shield(draw, color):
    polygon(draw, [(128, 49), (190, 72), (181, 154), (128, 207), (75, 154), (66, 72)], color)
    polygon(draw, [(128, 69), (168, 84), (162, 143), (128, 179), (95, 143), (88, 84)], (27,25,24,150))


def flame(draw, color):
    polygon(draw, [(128, 207), (83, 168), (96, 112), (128, 54), (139, 112), (169, 88), (178, 156)], color)
    polygon(draw, [(128, 185), (109, 158), (126, 116), (148, 157)], (255,220,97,255))


def snowflake(draw, color, center=(128,128), radius=68):
    cx, cy = center
    for i in range(6):
        a = math.pi*i/3
        ex, ey = cx+math.cos(a)*radius, cy+math.sin(a)*radius
        line(draw, [(cx,cy),(ex,ey)], color, 7)
        for sign in (-1,1):
            b = a + sign*math.pi*0.77
            line(draw, [(cx+math.cos(a)*radius*.68,cy+math.sin(a)*radius*.68),(cx+math.cos(a)*radius*.68+math.cos(b)*18,cy+math.sin(a)*radius*.68+math.sin(b)*18)], color, 4)


def arrows(draw, color):
    line(draw, [(62,94),(183,94)], color, 10)
    polygon(draw, [(183,75),(211,94),(183,113)], color)
    line(draw, [(194,162),(73,162)], color, 10)
    polygon(draw, [(73,143),(45,162),(73,181)], color)


def trap(draw, color):
    ellipse(draw, (65,135,191,190), None, color, 8)
    for x in (78,103,128,153,178):
        polygon(draw, [(x-9,145),(x,88),(x+9,145)], color)


def wind(draw, color):
    for y, end in ((91,183),(127,205),(163,176)):
        line(draw, [(48,y),(end,y)], color, 8)
        arc(draw, (end-34,y-22,end+10,y+22),270,90,color,7)


def motif(draw, spell_id, light, accent):
    if spell_id == "fiery_slash":
        line(draw, [(75,190),(178,62)], light, 16); polygon(draw, [(70,174),(101,204),(58,210)], accent)
    elif spell_id == "charge":
        polygon(draw, [(52,154),(79,75),(115,124),(141,70),(204,151),(167,194),(91,194)], light)
    elif spell_id == "ember_whirl":
        for r in (28,48,68): arc(draw,(128-r,128-r,128+r,128+r),210,520,light,8)
        flame(draw, accent)
    elif spell_id == "iron_shout":
        polygon(draw, [(72,102),(129,79),(129,177),(72,154)], light)
        for r in (22,42,62): arc(draw,(126-r,128-r,126+r,128+r),300,60,accent,7)
    elif spell_id == "searing_mark":
        ellipse(draw,(62,62,194,194),None,light,10); flame(draw,accent)
    elif spell_id == "bulwark": shield(draw, light)
    elif spell_id == "ember_chain":
        for x,y in ((88,94),(118,123),(148,152)): ellipse(draw,(x-27,y-16,x+27,y+16),None,light,9)
        flame(draw, accent)
    elif spell_id == "retaliation":
        line(draw,[(68,190),(184,64)],light,13); line(draw,[(188,190),(72,64)],accent,13)
    elif spell_id == "spark":
        bolt(draw,light); ellipse(draw,(112,112,144,144),accent)
    elif spell_id == "glacial_lance":
        polygon(draw,[(46,178),(176,49),(198,61),(68,192)],light); crystal(draw,accent,(153,87),.45)
    elif spell_id == "frost_nova": snowflake(draw,light); ellipse(draw,(45,45,211,211),None,accent,5)
    elif spell_id == "lightning_step":
        bolt(draw,light,(24,-12)); polygon(draw,[(52,164),(126,164),(151,199),(104,211),(55,198)],accent)
    elif spell_id == "static_field":
        for r in (28,51,76): ellipse(draw,(128-r,128-r,128+r,128+r),None,light,6)
        bolt(draw,accent,(0,2))
    elif spell_id == "voltaic_arc":
        for a in (-42,0,42):
            ex=128+math.sin(math.radians(a))*76; ey=64+math.cos(math.radians(a))*76
            line(draw,[(128,191),(110,150),(145,124),(ex,ey)],light,7)
    elif spell_id == "storm_swap": arrows(draw,light); snowflake(draw,accent,(128,128),28)
    elif spell_id == "frost_recoil": wind(draw,light); polygon(draw,[(82,191),(45,170),(82,149)],accent)
    elif spell_id == "storm_mirror":
        polygon(draw,[(128,45),(190,78),(174,187),(128,211),(82,187),(66,78)],light); bolt(draw,accent,(0,3))
    elif spell_id == "storm_focus":
        ellipse(draw,(53,84,203,172),light); ellipse(draw,(91,91,165,165),accent); bolt(draw,(255,255,255,230),(0,0))
    elif spell_id == "rime_shard": crystal(draw,light)
    elif spell_id == "light_bandage":
        polygon(draw,[(62,103),(103,62),(194,153),(153,194)],light); polygon(draw,[(153,62),(194,103),(103,194),(62,153)],accent)
    elif spell_id == "stone_skin":
        polygon(draw,[(76,183),(63,112),(91,74),(123,90),(144,62),(187,88),(197,160),(161,202)],light)
    elif spell_id == "wolf_spirit":
        polygon(draw,[(62,157),(78,72),(112,105),(128,76),(144,105),(178,72),(194,157),(161,201),(95,201)],light)
        ellipse(draw,(95,130,111,146),accent); ellipse(draw,(145,130,161,146),accent)
    elif spell_id in {"gust","leaden_gale"}: wind(draw,light); snowflake(draw,accent,(169,91),24) if spell_id=="leaden_gale" else None
    elif spell_id == "time_echo":
        polygon(draw,[(77,55),(179,55),(159,104),(139,128),(159,152),(179,201),(77,201),(97,152),(117,128),(97,104)],light)
        ellipse(draw,(103,108,153,158),accent)
    elif spell_id == "still_aegis": shield(draw,light); polygon(draw,[(103,164),(91,115),(112,75),(145,75),(166,115),(153,164)],accent)
    elif spell_id == "ember_mine": trap(draw,light); flame(draw,accent)
    elif spell_id == "stunning_pommel":
        polygon(draw,[(66,76),(108,54),(195,142),(170,168)],light); line(draw,[(137,154),(82,208)],accent,18)
    elif spell_id == "vertigo_whistle":
        arc(draw,(54,54,202,202),210,520,light,10); arc(draw,(84,84,172,172),210,500,accent,8); ellipse(draw,(119,119,137,137),light)
    elif spell_id == "bramble_snare":
        trap(draw,light); line(draw,[(67,178),(94,138),(126,175),(158,132),(190,174)],accent,8)
    elif spell_id == "seer_dust":
        ellipse(draw,(61,88,195,168),light); ellipse(draw,(103,103,153,153),accent)
        for x,y in ((61,61),(188,72),(78,195),(182,190)): ellipse(draw,(x-7,y-7,x+7,y+7),accent)


def render(spell_id, element):
    dark, mid, light = PALETTES[element]
    image = Image.new("RGBA", (SIZE, SIZE), (0,0,0,0))
    draw = ImageDraw.Draw(image, "RGBA")
    ellipse(draw,(19,19,237,237),(15,17,19,240),(232,188,92,255),8)
    ellipse(draw,(29,29,227,227),(*dark,255),(*mid,255),7)
    for r, alpha in ((84,30),(62,22),(40,16)):
        ellipse(draw,(128-r,128-r,128+r,128+r),(*mid,alpha))
    motif(draw, spell_id, (*light,255), (*mid,255))
    # Tres remaches propios de la familia, útiles al reducir a 32 px.
    for angle in (-140,0,140):
        x=128+math.cos(math.radians(angle))*91; y=128+math.sin(math.radians(angle))*91
        ellipse(draw,(x-4,y-4,x+4,y+4),(235,190,92,255))
    image.resize((256,256),Image.Resampling.LANCZOS).save(OUT/f"{spell_id}.png", optimize=True)


def main():
    if "--legacy-fallback" not in sys.argv:
        raise SystemExit(
            "Generador heredado bloqueado: sobrescribiría el arte sin marco. "
            "Use --legacy-fallback sólo para producir un respaldo deliberado."
        )
    OUT.mkdir(parents=True, exist_ok=True)
    spells = json.loads((ROOT/"data"/"rpg"/"spells.json").read_text(encoding="utf-8"))["spells"]
    for spell_id, spell in spells.items():
        render(spell_id, spell["element"])
    print(f"{len(spells)} iconos de hechizo en {OUT}")


if __name__ == "__main__":
    main()
