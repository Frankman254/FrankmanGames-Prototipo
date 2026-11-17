# Activa blender-mcp-ultra, guarda preferencias y arranca su servidor.
# Uso en Mac:
#   /Applications/Blender.app/Contents/MacOS/Blender \
#     --python scripts/mac/arrancar_blender_mcp.py
import importlib

import addon_utils
import bpy

LEGACY_MODULE = 'blender_mcp'
ULTRA_MODULE = 'bl_ext.user_default.blender_mcp_ultra'

if addon_utils.check(LEGACY_MODULE)[1]:
    addon_utils.disable(LEGACY_MODULE, default_set=True)

if not addon_utils.check(ULTRA_MODULE)[1]:
    addon_utils.enable(ULTRA_MODULE, default_set=True, persistent=True)
bpy.ops.wm.save_userpref()


def _go():
    addon = importlib.import_module(ULTRA_MODULE)
    server = addon._axsock._socket_server
    if server is None or not server.running:
        addon._axsock.start_socket_server()
    print('blender-mcp-ultra activo en localhost:9876')
    return None


bpy.app.timers.register(_go, first_interval=2.0)
