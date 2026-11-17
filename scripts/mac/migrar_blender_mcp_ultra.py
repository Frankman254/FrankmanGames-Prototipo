"""Migra Blender del addon MCP legado a blender-mcp-ultra.

Uso (con Blender cerrado):
  /Applications/Blender.app/Contents/MacOS/Blender --background --python \
    scripts/mac/migrar_blender_mcp_ultra.py -- <ruta-al-zip>

El zip se construye desde el commit fijado en docs/GUIA_BLENDER_MCP.md. Este
script no descarga nada ni toca escenas del proyecto.
"""

from __future__ import annotations

import sys
from pathlib import Path

import addon_utils
import bpy


LEGACY_MODULE = "blender_mcp"
ULTRA_MODULE = "bl_ext.user_default.blender_mcp_ultra"


def addon_zip_from_args() -> Path:
    try:
        separator = sys.argv.index("--")
        value = sys.argv[separator + 1]
    except (ValueError, IndexError) as error:
        raise SystemExit("Falta la ruta al zip después de --") from error

    addon_zip = Path(value).expanduser().resolve()
    if not addon_zip.is_file():
        raise SystemExit(f"No existe el paquete: {addon_zip}")
    return addon_zip


def main() -> None:
    addon_zip = addon_zip_from_args()

    if addon_utils.check(LEGACY_MODULE)[1]:
        addon_utils.disable(LEGACY_MODULE, default_set=True)

    result = bpy.ops.extensions.package_install_files(
        filepath=str(addon_zip),
        repo="user_default",
        enable_on_install=True,
        overwrite=True,
    )
    if result != {"FINISHED"}:
        raise SystemExit(f"Blender no instaló el paquete: {result}")

    if not addon_utils.check(ULTRA_MODULE)[1]:
        addon_utils.enable(ULTRA_MODULE, default_set=True, persistent=True)

    bpy.ops.wm.save_userpref()
    print(f"FG_MCP_ULTRA_OK module={ULTRA_MODULE}")


if __name__ == "__main__":
    main()
