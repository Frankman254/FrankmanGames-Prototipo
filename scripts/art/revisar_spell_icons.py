#!/usr/bin/env python3
"""Genera una lámina local para revisar la familia de iconos de hechizos."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).parents[2]
files = sorted((ROOT / "assets" / "icons" / "spells").glob("*.png"))
cols, cell_w, cell_h = 5, 220, 145
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * cell_w, rows * cell_h), (19, 26, 31))
draw = ImageDraw.Draw(sheet)
font = ImageFont.load_default(size=14)
for index, path in enumerate(files):
    x, y = (index % cols) * cell_w, (index // cols) * cell_h
    icon = Image.open(path).convert("RGBA").resize((104, 104), Image.Resampling.LANCZOS)
    sheet.paste(icon, (x + (cell_w - 104) // 2, y + 4), icon)
    label = path.stem
    box = draw.textbbox((0, 0), label, font=font)
    draw.text((x + (cell_w - (box[2] - box[0])) / 2, y + 114), label, fill=(220, 224, 220), font=font)
output = ROOT / "work" / "revision" / "spell_icons.png"
output.parent.mkdir(parents=True, exist_ok=True)
sheet.save(output)
print(output)

# Segunda lámina al tamaño real aproximado de la barra: detecta símbolos que
# parecen correctos ampliados pero se vuelven una raya o un punto en el HUD.
hud_cols, hud_w, hud_h, hud_icon = 8, 150, 78, 46
hud_rows = (len(files) + hud_cols - 1) // hud_cols
hud = Image.new("RGB", (hud_cols * hud_w, hud_rows * hud_h), (19, 26, 31))
hud_draw = ImageDraw.Draw(hud)
hud_font = ImageFont.load_default(size=11)
for index, path in enumerate(files):
    x, y = (index % hud_cols) * hud_w, (index // hud_cols) * hud_h
    icon = Image.open(path).convert("RGBA").resize((hud_icon, hud_icon), Image.Resampling.LANCZOS)
    hud.paste(icon, (x + (hud_w - hud_icon) // 2, y + 2), icon)
    label = path.stem
    box = hud_draw.textbbox((0, 0), label, font=hud_font)
    hud_draw.text((x + (hud_w - (box[2] - box[0])) / 2, y + 54), label, fill=(220, 224, 220), font=hud_font)
hud_output = ROOT / "work" / "revision" / "spell_icons_hud.png"
hud.save(hud_output)
print(hud_output)
