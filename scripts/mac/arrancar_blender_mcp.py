# Activa el addon «MCP for Blender», guarda preferencias y arranca su servidor.
# Uso en Mac:
#   open -na Blender --args --python scripts/mac/arrancar_blender_mcp.py
# Solo hace falta la primera vez (o si el addon queda desactivado): después el
# addon arranca solo al abrir Blender (blendermcp_auto_start_server = True).
import bpy
import addon_utils

addon_utils.enable('blender_mcp', default_set=True, persistent=True)
bpy.ops.wm.save_userpref()


def _go():
    scene = bpy.context.scene
    scene.blendermcp_auto_start_server = True
    if not getattr(scene, 'blendermcp_server_running', False):
        bpy.ops.blendermcp.start_server()
    return None


bpy.app.timers.register(_go, first_interval=2.0)
