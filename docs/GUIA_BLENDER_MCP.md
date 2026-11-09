# Guía: modelar con Blender por MCP

Para el agente que tenga que crear o tocar un modelo 3D del juego. Recoge lo que costó descubrir al hacer las monturas voladoras (2026-11-07). Las reglas generales siguen siendo las de [AGENTS](../AGENTS.md) y la [guía de integración](GUIA_INTEGRACION_ARTE_AUDIO.md).

## 1. Conectar el MCP de Blender

El servidor es el paquete `mcp-for-blender` (proyecto ahujasid/blender-mcp), lanzado con `uvx`. Habla con el addon «MCP for Blender» por `localhost:9876`. Herramientas: `get_addon_status`, `get_scene_info`, `execute_blender_code`, `look` y otras. `generate_3d`, `search_assets` e `import_asset` traen modelos de terceros: no se usan (regla clean-room y `PROCEDENCIA.md`). Sus integraciones vienen desactivadas, igual que la telemetría.

### 1a. Mac (configurado el 2026-11-09)

| Pieza | Valor en este Mac |
|---|---|
| Blender | 5.2.3 LTS, `/Applications/Blender.app/Contents/MacOS/Blender` |
| uv/uvx | Homebrew (`brew install uv`), `/opt/homebrew/bin/uvx` |
| Servidor | `mcp-for-blender@2.2.7`, versión fijada para que case con el addon instalado |
| Addon | `~/Library/Application Support/Blender/5.2/scripts/addons/blender_mcp.py` (v1.8, protocolo 15), activado y con arranque automático guardado en `userpref.blend` |
| Claude Code | `~/.claude.json`, ámbito usuario, servidor `blender` |
| OMP | `~/.omp/agent/mcp.json`, servidor `blender` (OMP también lee `~/.claude.json`) |

Configuración de los clientes. Las rutas son absolutas porque las apps gráficas no heredan el `PATH` de la terminal:

```sh
claude mcp add -s user blender -- /opt/homebrew/bin/uvx mcp-for-blender@2.2.7
```

```json
// ~/.omp/agent/mcp.json
{ "mcpServers": { "blender": { "command": "/opt/homebrew/bin/uvx", "args": ["mcp-for-blender@2.2.7"] } } }
```

Después de cambiar la configuración hay que reiniciar Claude u OMP. Una sesión abierta no carga servidores nuevos.

- **Uso normal:** abre Blender y el addon arranca el servidor solo. Para comprobarlo: `lsof -nP -iTCP:9876 -sTCP:LISTEN`, y después `get_addon_status`.
- **Si no escucha en 9876** (primera vez, addon desactivado o preferencias perdidas), cierra Blender y ábrelo con el script del repo, que activa el addon, guarda las preferencias y arranca el servidor:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --python scripts/mac/arrancar_blender_mcp.py &
```

  Lanza el ejecutable directamente. Con `open -na Blender --args --python …` el script no se ejecutó en la prueba del 2026-11-09.
- **Reinstalar o actualizar el addon:** `uvx mcp-for-blender@<versión> install-addon`. Usa la misma versión en el addon y en la configuración de los clientes, porque `get_addon_status` compara el protocolo. Después reinicia Blender.
- **Diagnóstico general del Mac:** `sh scripts/mac/check.sh`.
- **Verificado el 2026-11-09:** handshake MCP con 9 herramientas, `get_addon_status` al día (protocolo 15/15) y `get_scene_info` con la escena por defecto. También respondió desde `omp -p`. Claude Code muestra `claude mcp get blender` como «Connected».

### 1b. Windows

Blender 5.2 está en `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`. El addon es `%APPDATA%\Blender Foundation\Blender\5.2\scripts\addons\blender_mcp.py` y escucha en el puerto 9876.

- **Síntoma:** `get_addon_status` responde «Could not connect to Blender».
- **Causa habitual:** Blender está abierto, pero el servidor del addon no arrancó. Compruébalo en PowerShell: si `Get-NetTCPConnection -LocalPort 9876` no devuelve nada, el servidor no está escuchando.
- **Arreglo, sin pedírselo al creador:** abre una instancia de Blender con un script que active el addon, guarde las preferencias y arranque el servidor:

```python
# arrancar_mcp.py (en tu carpeta temporal, no en el repo)
import bpy, addon_utils
addon_utils.enable('blender_mcp', default_set=True, persistent=True)
bpy.ops.wm.save_userpref()
def go():
    bpy.context.scene.blendermcp_auto_start_server = True
    bpy.ops.blendermcp.start_server()
bpy.app.timers.register(go, first_interval=2.0)
```

Lánzalo con `blender.exe --python arrancar_mcp.py`, en segundo plano. Desde el 2026-11-07 el addon queda activado y con arranque automático, así que normalmente basta con abrir Blender.

- **Arreglo manual:** Preferences → Add-ons → «Blender MCP» → Save Preferences. Después, en la vista 3D, pulsa N → pestaña BlenderMCP → Start MCP Server.

## 2. Reglas para trabajar en el Blender abierto

- **Nunca llames a `bpy.ops.wm.read_factory_settings` ni a `fg.reset()` por MCP.** Descargan los addons y tumban el servidor. Usa `fg.fresh_scene('Nombre')`, que en Blender con ventana solo vacía su propia escena.
- **Ejecuta los scripts del repo con `exec`.** Así el mismo archivo sirve sin interfaz (`blender --background --python ...`) y por MCP:

```python
p = r'C:\Users\frank\Desktop\2026\FrankmanGames-Prototipo\scripts\blender\diostede.py'
exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), {'__name__': '__main__'})
```

  Con `exec` no existe `__file__`. El script debe tener una ruta de reserva (mira el `try/except NameError` al principio de `diostede.py`). Esa reserva apunta a Windows, así que en Mac pasa `__file__` explícito:

```python
from pathlib import Path
import sys
p = Path('/Users/frankman254/Desktop/Personal-Projects/FrankmanGames-Prototipo/scripts/blender/diostede.py')
sys.path.insert(0, str(p.parent))
exec(compile(p.read_text(encoding='utf-8'), str(p), 'exec'), {'__name__': '__main__', '__file__': str(p)})
```
- **Limpia los datos huérfanos al repetir.** Si no, Blender renombra las mallas a `.001` y se exportan con ese nombre. `diostede.py` borra al empezar sus colecciones, mallas, materiales y acciones `DIOS_`/`montura_`.
- **Guarda el `.blend` con `save_as_mainfile(..., copy=True)`.** Sin `copy`, la sesión del creador pasaría a ser ese archivo.
- **Revisa con `look`, siempre.** Usa `mode=angles` con varias vistas para la forma, `mode=frames` para los clips y `target` para acercarte a una pieza. Un número verde no sustituye a mirar.

## 3. Pipeline de un modelo

| Paso | Dónde |
|---|---|
| Script reproducible, geometría por código | `scripts/blender/<modelo>.py` (ayudas en `fg.py` y `fg_rig.py`) |
| Exportación GLB con clips en pistas NLA | `fg.export()` → `assets/models/<modelo>.glb` |
| Archivo editable | `arte/blender/<modelo>.blend` |
| Validador sin interfaz | `scripts/blender/validar_<modelo>.py` |
| Foto rápida de un GLB | `scripts/blender/revisar.py -- <glb> <png>` |
| Registro obligatorio antes de añadirlo | `PROCEDENCIA.md` (si falta, `tests/assets.test.ts` falla) |

- **Ejes:** el modelo mira a −Y, con +Z arriba y los pies en z=0. Babylon lo recibe mirando a +Z y `MountView`/`characterModel` lo giran.
- **Animación:** cada modelo lleva sus clips dentro del GLB (memoria del proyecto). Usa una acción por clip y una pista NLA por acción (`fg.to_tracks`).
- **Antes de seguir una referencia, busca su origen:** `grep -ri dofus docs/REPARTO_CODEX.md docs/TAREAS.md`. Una lámina hecha con ChatGPT puede reinterpretar una criatura de DOFUS y llevar su nombre, como pasó con la «Falcolomba». En ese caso la regla clean-room manda: idea general sí; nombre, silueta, paleta, rollo de silla y detalles, no. Pararse y avisar al creador antes de modelar.
- **Referencias:** las láminas de `reference_assets/` solo se miran. No se cargan, no se recortan y no se copian (AGENTS, regla 2). Las texturas del creador recortadas en `assets/textures/personajes/` sí se pueden usar, y ya están registradas.
- **Desglose modular:** si la lámina trae un «desglose modular», modela pieza por pieza siguiéndolo, y compara proporciones con las vistas antes que con la ilustración principal.

## 4. Probar en el juego

- **Pruebas sin ventana:** `npx tsc --noEmit` y `npx vitest run`. Un objeto nuevo necesita una fuente (botín, tienda, misión…) o una exención de desarrollo (`DEV_ONLY_ITEM_IDS`), además de su texto en `data/i18n/en.content.json`.
- **Prueba visual:** usa el panel del navegador con Vite. Cuando otros agentes editan el repo, Vite recarga la página y corta las pruebas a mitad. Arranca entonces un servidor sin recarga, con un archivo de configuración en `work/` (ignorado):

```ts
// work/<tarea>/vite.estatico.config.ts
import base from '../../vite.config';
export default { ...base, server: { port: 5199, strictPort: true, hmr: false, watch: { ignored: ['**/*'] } } };
```

  Añade una entrada temporal en `.claude/launch.json` y quítala al terminar. Si el panel está oculto, los FPS no sirven como medida.
- **Desde la consola:** `__game.world`, `__game.session` y `__game.view.scene` dan acceso a todo. Para comprobar clips de una sola vez, escucha `onAnimationGroupPlayObservable` en vez de muestrear.
- **Nombres de personaje:** solo letras, espacios, apóstrofo o guion. Con un número, «Empezar» no hace nada.

## 5. Monturas con variantes: el Diostedé

El Diostedé es un tucán montable con diseño propio. Sustituyó a la «Falcolomba», que se descartó el 2026-11-07 por venir de una montura de DOFUS (sección 3). Sirve de plantilla para la próxima montura con variantes.

- **Archivos:** `scripts/blender/diostede.py` (con `-- --capturas` también renderiza las láminas en `work/diostede/`), `scripts/blender/capturas_montura.py` (genérico), `scripts/blender/validar_diostede.py`, `assets/models/diostede.glb` y `arte/blender/diostede.blend`. Capturas de revisión en `docs/capturas/diostede/`.
- **Piezas:** `body`, `head` (con el pico), `crest` (remolino), `wing_L`, `wing_R`, `tail`, `leg_L`, `leg_R`, `saddle` (manta en capas con borde en zigzag), `reins` y `accessories` (bolsas laterales). Los anclajes son `mount_seat` y `rider_root`, colgados del hueso `hips`.
- **Clips:** `idle_ground`, `walk`, `run`, `takeoff`, `fly_idle`, `fly_forward` y `land`. `src/render/mountView.ts` elige paso o carrera según la velocidad, y reproduce el despegue y el aterrizaje una sola vez en el cambio suelo↔aire. También acepta los nombres de la arpía (`Reposo`, `Trotar`, `Volar`, `Planear`).
- **Jinete:** sube a la altura animada de `rider_root` y va con la pose `ride`, sin animación de caminar.
- **Colores:** cualquier modelo con materiales `montura_<region>` y una paleta `data/art/<modelo>_variantes.json` se tiñe sin tocar código. El render y la interfaz encuentran la paleta por el nombre del modelo.
- **Añadir una variante:** añádela a la paleta y al array `mount.variants` del objeto en `data/rpg/items.json`.
- **Cambiar apariencia:** botón del menú contextual del objeto en el inventario (`src/ui/menus/itemContextMenu.ts`). Guarda `ItemInstance.look` mediante `GameSession.setItemLook` y se conserva en la partida.
- **Disponibilidad:** de momento solo en desarrollo. `npm run dev` deja `mount_dev_diostede` en la mochila (`src/rpg/devMount.ts`). Venderlo o soltarlo como botín necesita una decisión de contenido y balance que no se ha tomado.

## 6. Entregas aisladas del agente local OMP

OMP puede usar el mismo MCP, pero sus entregas de arte empiezan aisladas en
`work/omp-<tarea>/`: script reproducible, `.blend`, `.glb`, captura y reporte.
No toca `src/`, `data/`, documentación activa ni Git. El coordinador revisa la
captura y el contrato, copia sólo lo aceptado a las rutas del paso 3, regenera
el GLB desde el script y ejecuta el validador antes de integrarlo.

Primer caso aceptado: `naturaleza_suelo`. El catálogo final está en
`assets/models/naturaleza_suelo.glb`; se reproduce con
`scripts/blender/naturaleza_suelo.py` y se acredita con
`scripts/blender/validar_naturaleza_suelo.py`. Contiene 18 nodos con origen en
el centro de su huella y apoyo en Z=0; el total validado es de 1.320 triángulos.
Los nombres son contrato de datos: no renombrarlos sin migrar
`data/vegetation.json` y sus pruebas.
