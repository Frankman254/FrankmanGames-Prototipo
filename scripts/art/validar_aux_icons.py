#!/usr/bin/env python3
"""Valida cobertura y contrato técnico de las familias auxiliares de iconos."""

from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
ICON_ROOT = ROOT / "assets" / "icons"

EXPECTED: dict[Path, set[str]] = {
    ROOT / "assets" / "emotes": {
        "wave", "laugh", "dance", "cry", "angry", "love", "sleep", "doubt",
    },
    ICON_ROOT / "classes": {"ember_vanguard", "storm_weaver", "mangrove_hunter"},
    ICON_ROOT / "pets": {"ash_fox", "archivist_owl", "moss_turtle", "spirit_wolf"},
    ICON_ROOT / "professions": {"woodcutter", "miner", "farmer", "fisher", "smith", "tailor"},
    ICON_ROOT / "stats": {"strength", "agility", "intellect", "vitality", "spirit", "calm", "flow", "will"},
    ICON_ROOT / "editor": {
        "chest", "barrel", "jar", "door", "torch", "spawn", "npc", "resource",
        "decoration", "structural", "zone", "trigger", "entrance", "exit", "tree",
        "water", "start", "stone", "station", "visibility",
    },
}

STATUS_EXPECTED = {
    "body_lock", "burn", "chilled", "dazed", "disoriented", "frozen", "haste", "hawk_eye",
    "iron_shout", "mark_earth", "mark_fire", "mark_frost", "mark_lightning", "mark_water",
    "numb", "reaction_fracture", "reaction_hardFrost", "reaction_mud", "reaction_vapor",
    "regeneration", "retaliation", "rooted", "self_stack", "share_damage", "shield", "soaked",
    "static_charge", "still_aegis", "stone_skin", "storm_focus", "storm_mirror", "stunned",
    "tackled", "thorn_ward", "time_echo", "ward_melee", "ward_ranged", "weapon_mastery",
    "weariness",
}

UI_REQUIRED = {
    "continue", "new_game", "load_game", "test_game", "options", "quit", "save_game",
    "edit_hud", "quit_to_title", "emotes", "chat_combat", "chat_loot", "chat_system",
}


def validate_image(path: Path) -> bytes:
    with Image.open(path) as image:
        if image.mode != "RGBA" or image.size != (256, 256):
            raise AssertionError(f"{path}: esperado RGBA 256x256, recibido {image.mode} {image.size}")
        alpha = image.getchannel("A")
        extrema = alpha.getextrema()
        if extrema != (0, 255):
            raise AssertionError(f"{path}: alfa debe incluir transparencia y opacidad, recibido {extrema}")
        if any(alpha.getpixel(corner) != 0 for corner in ((0, 0), (255, 0), (0, 255), (255, 255))):
            raise AssertionError(f"{path}: las esquinas deben ser transparentes")
        return image.tobytes()


def main() -> None:
    validated = 0
    for directory, expected in EXPECTED.items():
        actual = {path.stem for path in directory.glob("*.png")}
        if actual != expected:
            raise AssertionError(
                f"{directory}: cobertura distinta; faltan={sorted(expected - actual)}, sobran={sorted(actual - expected)}"
            )
        fingerprints = {validate_image(directory / f"{icon_id}.png") for icon_id in expected}
        if len(fingerprints) != len(expected):
            raise AssertionError(f"{directory}: hay PNG visualmente duplicados")
        validated += len(expected)

    statuses = ICON_ROOT / "statuses"
    actual_statuses = {path.stem for path in statuses.glob("*.png")}
    if actual_statuses != STATUS_EXPECTED:
        raise AssertionError(
            f"{statuses}: cobertura distinta; faltan={sorted(STATUS_EXPECTED - actual_statuses)}, "
            f"sobran={sorted(actual_statuses - STATUS_EXPECTED)}"
        )
    for status_id in STATUS_EXPECTED:
        validate_image(statuses / f"{status_id}.png")
    validated += len(STATUS_EXPECTED)

    ui_directory = ICON_ROOT / "ui"
    actual_ui = {path.stem for path in ui_directory.glob("*.png")}
    if not UI_REQUIRED <= actual_ui:
        raise AssertionError(f"{ui_directory}: faltan={sorted(UI_REQUIRED - actual_ui)}")
    for icon_id in UI_REQUIRED:
        validate_image(ui_directory / f"{icon_id}.png")
    validated += len(UI_REQUIRED)

    print(f"iconos auxiliares válidos: {validated} PNG RGBA")


if __name__ == "__main__":
    main()
