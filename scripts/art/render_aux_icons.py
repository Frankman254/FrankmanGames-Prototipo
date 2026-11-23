#!/usr/bin/env python3
"""Recorta masters propios y completa las familias pequeñas de iconos.

Los masters de `work/codex-icon-refresh/masters/` son arte clean-room creado
para FrankmanGames. Este script es determinista: centra el alfa, normaliza a
256 px y deriva estados/estadísticas sin emojis ni fuentes del sistema.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
MASTER = ROOT / "work/codex-icon-refresh/masters"
ASSETS = ROOT / "assets"
SAFE = 218


def normalize(image: Image.Image, safe: int = SAFE) -> Image.Image:
    image = image.convert("RGBA")
    alpha = image.getchannel("A").point(lambda a: 0 if a < 8 else a)
    image.putalpha(alpha)
    box = alpha.getbbox()
    if not box:
        raise ValueError("master sin alfa visible")
    art = image.crop(box)
    # También amplía masters pequeños (p. ej. reacciones nativas de 46 px):
    # la caja segura es el contrato visual, no el tamaño accidental del origen.
    ratio = safe / max(art.size)
    art = art.resize((max(1, round(art.width * ratio)), max(1, round(art.height * ratio))), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    out.alpha_composite(art, ((256 - art.width) // 2, (256 - art.height) // 2))
    return out


def crop_grid(master: str, cols: int, rows: int, ids: list[str], destination: Path) -> None:
    image = Image.open(MASTER / master).convert("RGBA")
    if len(ids) != cols * rows:
        raise ValueError(f"{master}: rejilla e ids no coinciden")
    destination.mkdir(parents=True, exist_ok=True)
    for index, asset_id in enumerate(ids):
        col, row = index % cols, index // cols
        x0, x1 = round(col * image.width / cols), round((col + 1) * image.width / cols)
        y0, y1 = round(row * image.height / rows), round((row + 1) * image.height / rows)
        normalize(image.crop((x0, y0, x1, y1))).save(destination / f"{asset_id}.png", optimize=True)


def derived(source: Path, destination: Path, hue: int = 0, badge: str | None = None) -> None:
    image = normalize(Image.open(source))
    if hue:
        hsv = image.convert("RGB").convert("HSV")
        h, s, v = hsv.split()
        h = h.point(lambda x: (x + hue) % 256)
        recolored = Image.merge("HSV", (h, s, v)).convert("RGBA")
        recolored.putalpha(image.getchannel("A"))
        image = recolored
    if badge:
        overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(overlay)
        if badge == "save":
            d.rounded_rectangle((158, 158, 229, 229), 16, fill=(18, 29, 43, 245), outline=(255, 216, 92, 255), width=7)
            d.polygon([(174, 194), (190, 210), (218, 176), (211, 169), (190, 195), (181, 187)], fill=(83, 229, 193, 255))
        elif badge == "edit":
            d.polygon([(164, 219), (178, 181), (216, 143), (232, 159), (194, 197)], fill=(244, 184, 71, 255), outline=(16, 25, 42, 255))
        image = Image.alpha_composite(image, overlay)
    destination.parent.mkdir(parents=True, exist_ok=True)
    normalize(image).save(destination, optimize=True)


def stat_icon(asset_id: str) -> Image.Image:
    out = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    glow = Image.new("L", out.size, 0)
    gd = ImageDraw.Draw(glow)
    color = {"calm": (143, 222, 255), "flow": (45, 180, 225), "will": (255, 213, 62)}[asset_id]
    if asset_id == "calm":
        for angle in range(0, 180, 30):
            import math
            a = math.radians(angle)
            dx, dy = math.cos(a) * 78, math.sin(a) * 78
            gd.line((128-dx, 128-dy, 128+dx, 128+dy), fill=255, width=13)
    elif asset_id == "flow":
        gd.arc((42, 42, 214, 214), 25, 325, fill=255, width=22)
        gd.arc((83, 83, 173, 173), 200, 535, fill=255, width=17)
    else:
        gd.polygon([(143, 30), (73, 139), (119, 139), (105, 228), (188, 111), (143, 111)], fill=255)
    aura = glow.filter(ImageFilter.GaussianBlur(18))
    layer = Image.new("RGBA", out.size, (*color, 0)); layer.putalpha(aura.point(lambda a: round(a * .55)))
    out = Image.alpha_composite(out, layer)
    edge = glow.filter(ImageFilter.MaxFilter(11))
    outline = ImageChops.subtract(edge, glow)
    dark = Image.new("RGBA", out.size, (10, 21, 38, 0)); dark.putalpha(outline)
    out = Image.alpha_composite(out, dark)
    fill = Image.new("RGBA", out.size, (*color, 0)); fill.putalpha(glow)
    out = Image.alpha_composite(out, fill)
    return normalize(out)


def main() -> None:
    crop_grid("emotes.png", 4, 2, ["wave", "laugh", "dance", "cry", "angry", "love", "sleep", "doubt"], ASSETS / "emotes")
    crop_grid("pets.png", 2, 2, ["ash_fox", "archivist_owl", "moss_turtle", "spirit_wolf"], ASSETS / "icons/pets")
    crop_grid("professions.png", 3, 2, ["woodcutter", "miner", "farmer", "fisher", "smith", "tailor"], ASSETS / "icons/professions")
    crop_grid("classes.png", 3, 1, ["ember_vanguard", "storm_weaver", "mangrove_hunter"], ASSETS / "icons/classes")
    crop_grid("menu.png", 3, 2, ["continue", "new_game", "load_game", "test_game", "options", "quit"], ASSETS / "icons/ui")

    derived(ASSETS / "icons/ui/load_game.png", ASSETS / "icons/ui/save_game.png", hue=10, badge="save")
    derived(ASSETS / "icons/ui/options.png", ASSETS / "icons/ui/edit_hud.png", hue=18, badge="edit")
    derived(ASSETS / "icons/ui/quit.png", ASSETS / "icons/ui/quit_to_title.png", hue=238)
    derived(ASSETS / "emotes/laugh.png", ASSETS / "icons/ui/emotes.png")
    derived(ASSETS / "icons/spells/weapon_mastery.png", ASSETS / "icons/ui/chat_combat.png")
    derived(ASSETS / "icons/ui/inventory.png", ASSETS / "icons/ui/chat_loot.png", hue=8)
    derived(ASSETS / "icons/ui/options.png", ASSETS / "icons/ui/chat_system.png", hue=236)

    stats = ASSETS / "icons/stats"
    stats.mkdir(parents=True, exist_ok=True)
    for asset_id in ("calm", "flow", "will"):
        stat_icon(asset_id).save(stats / f"{asset_id}.png", optimize=True)

    statuses = ASSETS / "icons/statuses"
    statuses.mkdir(parents=True, exist_ok=True)
    sources = {
        "soaked": ASSETS / "icons/spells/waterspout.png",
        "share_damage": ASSETS / "icons/spells/tether_feather.png",
        "weapon_mastery": ASSETS / "icons/spells/woven_power.png",
        "thorn_ward": ASSETS / "icons/spells/thorn_ward.png",
        "hawk_eye": ASSETS / "icons/spells/hawk_eye.png",
        "self_stack": ASSETS / "icons/spells/steady_aim.png",
        "frozen": ASSETS / "icons/spells/frozen_estuary.png",
        "numb": ASSETS / "icons/spells/static_field.png",
        "ward_ranged": ASSETS / "icons/spells/still_aegis.png",
        "ward_melee": ASSETS / "icons/spells/bulwark.png",
        "mark_fire": ASSETS / "icons/reactions/mark_fire.png",
        "mark_water": ASSETS / "icons/reactions/mark_water.png",
        "mark_frost": ASSETS / "icons/reactions/mark_frost.png",
        "mark_lightning": ASSETS / "icons/reactions/mark_lightning.png",
        "mark_earth": ASSETS / "icons/reactions/mark_earth.png",
        "reaction_vapor": ASSETS / "icons/reactions/vapor.png",
        "reaction_mud": ASSETS / "icons/reactions/mud.png",
        "reaction_fracture": ASSETS / "icons/reactions/fracture.png",
        "reaction_hardFrost": ASSETS / "icons/reactions/hard_frost.png",
    }
    for index, (asset_id, source) in enumerate(sources.items()):
        derived(source, statuses / f"{asset_id}.png", hue=(index % 5) - 2)

    editor = ASSETS / "icons/editor"
    editor_sources = {
        "chest": ASSETS / "icons/ui/load_game.png",
        "barrel": ASSETS / "icons/items/raspadura_block.png",
        "jar": ASSETS / "icons/items/health_potion.png",
        "door": ASSETS / "icons/ui/quit.png",
        "torch": ASSETS / "icons/reactions/mark_fire.png",
        "spawn": ASSETS / "icons/statuses/dazed.png",
        "npc": ASSETS / "icons/classes/mangrove_hunter.png",
        "resource": ASSETS / "icons/professions/miner.png",
        "decoration": ASSETS / "icons/ui/edit_hud.png",
        "structural": ASSETS / "icons/statuses/stone_skin.png",
        "zone": ASSETS / "icons/statuses/storm_focus.png",
        "trigger": ASSETS / "icons/reactions/mark_lightning.png",
        "entrance": ASSETS / "icons/ui/continue.png",
        "exit": ASSETS / "icons/ui/quit.png",
        "tree": ASSETS / "icons/items/wood_cedar.png",
        "water": ASSETS / "icons/reactions/mark_water.png",
        "start": ASSETS / "icons/ui/new_game.png",
        "stone": ASSETS / "icons/items/ore.png",
        "station": ASSETS / "icons/professions/smith.png",
        "visibility": ASSETS / "icons/spells/hawk_eye.png",
    }
    for index, (asset_id, source) in enumerate(editor_sources.items()):
        derived(source, editor / f"{asset_id}.png", hue=(index % 7) - 3)

    print("familias auxiliares renderizadas: 8 emotes, 4 mascotas, 6 oficios, 3 clases, 13 UI, 3 stats, 19 estados y 20 editor")


if __name__ == "__main__":
    main()
