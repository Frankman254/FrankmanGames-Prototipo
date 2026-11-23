#!/usr/bin/env python3
"""Crea una lámina de revisión de las familias auxiliares a tamaño de juego."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "work" / "codex-icon-refresh" / "review" / "auxiliares.png"
FAMILIES = (
    ("Emotes", ROOT / "assets" / "emotes", None),
    ("Clases", ROOT / "assets" / "icons" / "classes", None),
    ("Mascotas", ROOT / "assets" / "icons" / "pets", None),
    ("Oficios", ROOT / "assets" / "icons" / "professions", None),
    ("Estadísticas", ROOT / "assets" / "icons" / "stats", None),
    ("Estados", ROOT / "assets" / "icons" / "statuses", None),
    ("Menú y sistema", ROOT / "assets" / "icons" / "ui", {
        "continue", "new_game", "load_game", "test_game", "options", "quit", "save_game",
        "edit_hud", "quit_to_title", "emotes", "chat_combat", "chat_loot", "chat_system",
    }),
    ("Editor", ROOT / "assets" / "icons" / "editor", None),
)


def main() -> None:
    font = ImageFont.load_default()
    cols, cell_w, cell_h = 10, 128, 94
    rows = sum(1 + (len([p for p in directory.glob("*.png") if allowed is None or p.stem in allowed]) + cols - 1) // cols for _, directory, allowed in FAMILIES)
    sheet = Image.new("RGB", (cols * cell_w + 40, rows * cell_h + 30), (19, 25, 36))
    draw = ImageDraw.Draw(sheet)
    y = 18
    for title, directory, allowed in FAMILIES:
        paths = sorted(p for p in directory.glob("*.png") if allowed is None or p.stem in allowed)
        draw.text((20, y), f"{title} ({len(paths)})", font=font, fill=(241, 219, 176))
        y += 24
        for index, path in enumerate(paths):
            col, row = index % cols, index // cols
            x = 20 + col * cell_w
            top = y + row * cell_h
            with Image.open(path) as source:
                icon = source.convert("RGBA").resize((46, 46), Image.Resampling.LANCZOS)
            sheet.paste(icon, (x + 40, top), icon)
            label = path.stem[:18]
            draw.text((x + 4, top + 54), label, font=font, fill=(202, 211, 226))
        y += ((len(paths) + cols - 1) // cols) * cell_h + 12
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.crop((0, 0, sheet.width, y + 8)).save(OUT, optimize=True)
    print(OUT)


if __name__ == "__main__":
    main()
