#!/usr/bin/env python3
"""Centra ilustraciones RGBA en un lienzo común sin hornear marcos de UI."""

from __future__ import annotations

import argparse
import os
from pathlib import Path

from PIL import Image


def visible_bbox(image: Image.Image, threshold: int) -> tuple[int, int, int, int] | None:
    alpha = image.getchannel("A")
    return alpha.point(lambda value: 255 if value >= threshold else 0).getbbox()


def normalize(path: Path, canvas: int, safe_box: int, alpha_threshold: int) -> None:
    with Image.open(path) as source:
        image = source.convert("RGBA")

    bbox = visible_bbox(image, alpha_threshold)
    if not bbox:
        raise ValueError(f"{path}: imagen totalmente transparente")

    art = image.crop(bbox)
    scale = min(1.0, safe_box / max(art.size))
    if scale < 1.0:
        size = tuple(max(1, round(value * scale)) for value in art.size)
        art = art.resize(size, Image.Resampling.LANCZOS)

    resized_bbox = visible_bbox(art, alpha_threshold)
    if resized_bbox:
        art = art.crop(resized_bbox)

    output = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    position = ((canvas - art.width) // 2, (canvas - art.height) // 2)
    output.alpha_composite(art, position)
    temporary = path.with_name(f".{path.stem}.normalizado.png")
    output.save(temporary, optimize=True)
    os.replace(temporary, path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("folder", type=Path)
    parser.add_argument("--canvas", type=int, default=256)
    parser.add_argument("--safe-box", type=int, default=176)
    parser.add_argument("--alpha-threshold", type=int, default=8)
    args = parser.parse_args()

    files = [args.folder] if args.folder.is_file() else sorted(args.folder.glob("*.png"))
    if not files:
        raise SystemExit(f"No hay PNG en {args.folder}")
    for path in files:
        normalize(path, args.canvas, args.safe_box, args.alpha_threshold)
    print(f"{len(files)} iconos centrados en caja segura de {args.safe_box}px")


if __name__ == "__main__":
    main()
