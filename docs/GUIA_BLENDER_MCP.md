# Guía: modelar con Blender por MCP

Para el agente que tenga que crear o tocar un modelo 3D del juego. Recoge lo que costó descubrir al hacer las monturas voladoras (2026-11-07). Las reglas generales siguen siendo las de [AGENTS](../AGENTS.md) y la [guía de integración](GUIA_INTEGRACION_ARTE_AUDIO.md).

## 1. Conectar el MCP de Blender

El servidor vigente es `blender-mcp-ultra==3.2.0` del proyecto
[`carlosh7/blender-mcp`](https://github.com/carlosh7/blender-mcp), fijado al
commit `7a1538c432e8382732ade4db65cadb8999918805`. El gateway se lanza con `uvx`
y habla con el addon `blender_mcp_ultra` por `localhost:9876`, con token local.
Expone 248 herramientas tipadas para escena, malla, materiales, rig, animación,
render y exportación. La configuración antigua `mcp-for-blender@2.2.7` es
incompatible con el addon nuevo y no debe quedar activa a la vez.

Las integraciones de assets externos (PolyHaven, Sketchfab, AmbientCG,
Hyper3D), generación remota y proveedores de IA **no se usan** en este
proyecto: violarían el flujo clean-room y el registro previo en
`PROCEDENCIA.md`. Para arte productivo se mantienen los scripts reproducibles
de `scripts/blender/`, el editable final y los validadores del proyecto.

### 1a. Mac (migrado el 2026-11-16)

| Pieza | Valor en este Mac |
|---|---|
| Blender | 5.2.3 LTS, `/Applications/Blender.app/Contents/MacOS/Blender` |
| uv/uvx | Homebrew (`brew install uv`), `/opt/homebrew/bin/uvx` |
| Servidor | `blender-mcp-ultra==3.2.0`, lanzado de forma aislada por `uvx` |
| Addon | extensión `bl_ext.user_default.blender_mcp_ultra` 3.2.0, activada en `userpref.blend` |
| Codex | `.codex/config.toml`, servidor de proyecto `blender` |
| Claude Code / clientes compatibles | `.mcp.json`, servidor de proyecto `blender` |
| Junie Free | `.junie/mcp/mcp.json` y `~/.junie/mcp/mcp.json`, gateway `--lite` (26 herramientas), `timeout` 120000 |
| OMP / Qwen Flash Next | Dos modos. **Programador** (perfil por defecto, `scripts/mac/omp_programador.sh`): `~/.omp/agent/mcp.json` vacío, sin Blender. **Blender** (perfil `blender`, `scripts/mac/omp_blender.sh`): `~/.omp/profiles/blender/agent/mcp.json` con el catálogo completo. Contexto 180K, salida 16K, compactación al 80 % |

Configuración de los clientes. Las rutas son absolutas porque las apps gráficas no heredan el `PATH` de la terminal:

```sh
claude mcp add -s project blender -- /opt/homebrew/bin/uvx --from blender-mcp-ultra==3.2.0 blender-mcp-server
```

```json
// .mcp.json (Claude y clientes compatibles)
{ "mcpServers": { "blender": { "command": "/opt/homebrew/bin/uvx", "args": ["--from", "blender-mcp-ultra==3.2.0", "blender-mcp-server"] } } }
```

```json
// .junie/mcp/mcp.json
{ "mcpServers": { "blender": { "command": "/opt/homebrew/bin/uvx", "args": ["--from", "blender-mcp-ultra==3.2.0", "blender-mcp", "--lite"], "timeout": 120000 } } }
```

```json
// ~/.omp/agent/mcp.json (OMP modo programador: sin Blender)
{ "mcpServers": {} }

// ~/.omp/profiles/blender/agent/mcp.json (OMP modo Blender: catálogo completo)
{ "mcpServers": { "blender": { "command": "/opt/homebrew/bin/uvx", "args": ["--from", "blender-mcp-ultra==3.2.0", "blender-mcp"] } } }
```

En Junie, las herramientas se llaman `mcp_blender_<herramienta>` (para
`--allowed-tools`); OMP las monta como `mcp__blender_<herramienta>`. Las rutas
actuales son las del Mac de producción; Windows
debe sustituir el `command` por la ruta absoluta de `uvx.exe` en sus archivos
de cliente locales.

Después de cambiar la configuración hay que reiniciar Claude, OMP o Junie. Una sesión abierta no carga servidores nuevos.

- **Uso normal:** abre Blender y el addon arranca el servidor solo. Para comprobarlo: `lsof -nP -iTCP:9876 -sTCP:LISTEN`, y después `scene_get_info`.
- **Si no escucha en 9876** (primera vez, addon desactivado o preferencias perdidas), cierra Blender y ábrelo con el script del repo, que activa el addon, guarda las preferencias y arranca el servidor:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --python scripts/mac/arrancar_blender_mcp.py &
```

  Lanza el ejecutable directamente. Con `open -na Blender --args --python …` el script no se ejecutó en la prueba del 2026-11-09.
- **Reinstalar el addon fijado:** descarga el tarball del commit indicado,
  comprueba SHA-256 `8819f829c8a32034052ae61b80da35a5f6ba8c91e7747365f493425a5504d869`,
  ejecuta su `scripts/build_extension.py` y luego, con Blender cerrado,
  `Blender --background --python scripts/mac/migrar_blender_mcp_ultra.py -- <zip>`.
  No actualices sólo el gateway o sólo el addon.
- **Diagnóstico general del Mac:** `sh scripts/mac/check.sh`.
- **Verificado el 2026-11-16:** gateway 3.2.0 con protocolo MCP
  `2025-06-18` y 248 herramientas; registro del addon en Blender 5.2.3; extensión
  instalada y activada. El catálogo completo ocupa ~20k tokens. Junie Free usa
  el gateway lite porque su cliente admite como máximo 100 herramientas y su
  sesión observada (Qwen3.6-27B-FP8) agotó el contexto al acumular documentos y
  resultados. OMP usa Qwen3.8-Flash-Next en Skynet con 180K de contexto. El 2026-11-17 se
  bajó por error a 8192: los rechazos «8192 tokens» de ese día venían del modelo
  local de LM Studio (gemma), no de Skynet. Medido ese día: Skynet aceptó una
  petición real de 152.569 tokens. La sesión de cliente ya abierta no recarga MCP:
  hay que abrir un chat/proceso nuevo.

### 1c. Perfil por agente

- **Junie Free:** gateway lite, una tarea y un asset por sesión, referencia más
  contrato en el primer mensaje, lecturas por rangos y renders pequeños. Abrir
  una sesión nueva al empezar el asset; no arrastrar el historial de otra tarea.
- **OMP / Qwen Flash Next:** el agente preferido para modelar, por inferencia
  ilimitada. Tiene dos modos, cada uno en su propio perfil de OMP (sesiones e
  historial separados; `models.yml` compartido por enlace):

  | Modo | Lanzador | Blender MCP | Prompt fijo medido |
  |---|---|---|---|
  | Programador | `scripts/mac/omp_programador.sh` o `omp` | Ninguno | ~9.400 tokens |
  | Blender | `scripts/mac/omp_blender.sh` | Catálogo completo (~240 herramientas, esculpido, multires, remesh, bake) | ~17.600 tokens |

  Los dos ignoran el `.mcp.json` del repo y `~/.claude.json`
  (`mcp.enableProjectConfig: false`, `disabledProviders: [claude]`), que
  cargaban Blender completo por duplicado. OMP llama a cada herramienta como
  `xd://mcp__blender_<herramienta>`; no son archivos. Los roles
  main/plan/slow/smol apuntan a `skynet-qwen` por Tailscale: nunca LM Studio ni
  Ollama, para no cargar el Mac del creador. El proveedor `lm-studio` sigue
  declarado en `models.yml` solo para uso manual.

```sh
scripts/mac/omp_blender.sh @/ruta/referencia.png "Modela este asset y cumple el contrato de calidad"
```

El lanzador de Blender piensa en `medium` y añade al prompt la metodología
(hitos, escultura, render comparativo). No impone duración máxima ni debe
envolverse en `timeout`: una entrega compleja puede durar horas. El `timeout`
de 120 s del gateway limita una llamada MCP individual, no la sesión; las
operaciones largas se dividen en hitos guardados y llamadas observables.
- **Claude:** gateway completo y ventana de compactación de 250k. Debe existir
  un solo servidor `blender`; el endpoint global antiguo
  `mcp-for-blender@2.2.7` entra en conflicto con el endpoint de proyecto Ultra.
- **Codex:** gateway completo en `.codex/config.toml`; usar inspección visual y
  renders durante el trabajo, no sólo generar un script y exportar.

Tener 248 herramientas no añade criterio artístico ni convierte una imagen en
geometría. La referencia aporta silueta, proporciones, materiales y detalle
visible; con una sola vista, los lados ocultos son inferencias. Una hoja con
frente, perfil, trasera y piezas separadas reduce mucho esa ambigüedad.

### 1b. Windows

Blender 5.2 está en `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`.
Instala el mismo zip fijado como extensión `blender_mcp_ultra`; escucha sólo en
localhost:9876 y comparte el token local con el gateway.

- **Síntoma:** una herramienta responde que no puede conectar con Blender.
- **Causa habitual:** Blender está abierto, pero el servidor del addon no arrancó. Compruébalo en PowerShell: si `Get-NetTCPConnection -LocalPort 9876` no devuelve nada, el servidor no está escuchando.
- **Arreglo, sin pedírselo al creador:** abre una instancia de Blender con un script que active el addon, guarde las preferencias y arranque el servidor:

```python
# arrancar_mcp.py (en tu carpeta temporal, no en el repo)
import bpy, addon_utils
addon_utils.enable('bl_ext.user_default.blender_mcp_ultra', default_set=True, persistent=True)
bpy.ops.wm.save_userpref()
def go():
    import importlib
    addon = importlib.import_module('bl_ext.user_default.blender_mcp_ultra')
    addon._axsock.start_socket_server()
bpy.app.timers.register(go, first_interval=2.0)
```

Lánzalo con `blender.exe --python arrancar_mcp.py`, en segundo plano. Desde el 2026-11-07 el addon queda activado y con arranque automático, así que normalmente basta con abrir Blender.

- **Arreglo manual:** Preferences → Add-ons → `blender-mcp-ultra` → Save Preferences. Después, en la vista 3D, pulsa N → pestaña MCP → Start Server.

## 2. Reglas para trabajar en el Blender abierto

- **Nunca llames a `bpy.ops.wm.read_factory_settings` ni a `fg.reset()` por MCP.** Descargan los addons y tumban el servidor. Usa `fg.fresh_scene('Nombre')`, que en Blender con ventana solo vacía su propia escena.
- **Los scripts reproducibles se ejecutan con Blender CLI, no por MCP Ultra.**
  `execute_blender_code` bloquea deliberadamente `exec`, `compile`, `open`,
  `pathlib`, `os` y `sys`; por tanto no puede cargar un archivo del repo. Usa:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/blender/diostede.py
```

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python scripts/blender/diostede.py
```
- **MCP se usa para inspección y retoque tipado:** `scene_get_info`,
  `scene_query`, `io_import_gltf` mediante `tool_execute`, materiales, cámara,
  luces y render. Junie, en modo lite, descubre el resto del catálogo con `tools_search`.
- **Limpia los datos huérfanos al repetir.** Si no, Blender renombra las mallas a `.001` y se exportan con ese nombre. `diostede.py` borra al empezar sus colecciones, mallas, materiales y acciones `DIOS_`/`montura_`.
- **Guarda el `.blend` con `save_as_mainfile(..., copy=True)`.** Sin `copy`, la sesión del creador pasaría a ser ese archivo.
- **Revisa visualmente siempre.** Usa `inspect_view`/`render_preview` por MCP y
  `scripts/blender/revisar.py` o los revisores específicos para láminas y clips.
  Un número verde no sustituye a mirar.

## 3. Pipeline de un modelo

### Contrato de calidad visual (obligatorio)

No se acepta como modelo detallado una composición de primitivas con materiales
planos, aunque exporte y pase el validador. Antes de modelar, el agente debe
extraer de la referencia una tabla breve de proporciones, silueta, materiales,
capas, detalles primarios/secundarios y vistas que faltan. Después trabaja en
estas pasadas, guardando captura o render en `work/<agente>-<tarea>/`:

1. **Referencia y cámaras:** cargar la imagen sólo como referencia de trabajo,
   fijar escala, suelo y cámaras equivalentes. Para un personaje u objeto
   asimétrico, pedir o construir vistas adicionales antes del detalle fino.
2. **Blockout:** resolver volumen y silueta desde frente, perfil y tres cuartos.
   No avanzar mientras la comparación de contorno falle.
3. **Forma primaria y secundaria:** usar topología editable, curvas, booleanos,
   bevel, subdivision, shrinkwrap, multires o voxel remesh según corresponda.
   La escultura sirve para planos, pliegues, desgaste y transiciones; no para
   esconder proporciones incorrectas.
4. **Detalle:** separar piezas reales cuando cambie el material o la lectura de
   silueta. El microdetalle repetitivo va a normal/height/roughness; no se llena
   el GLB de geometría que no cambia la forma a la distancia de juego.
5. **Retopología y UV:** conservar un high-poly de trabajo cuando haya bake;
   producir una malla de juego limpia, UV sin solapes accidentales y texel
   density coherente. Revisar normales, tangentes y escala aplicada.
6. **PBR:** base color, roughness, metallic y normal deben explicar materiales
   distintos bajo luz neutra. No hornear sombras pintadas como sustituto de
   volumen. Para metal antiguo, combinar variación de rugosidad, golpes y pátina
   localizada, no sólo color dorado.
7. **Comparación:** renderizar al menos frente, perfil, tres cuartos y una vista
   de detalle con iluminación neutra. Comparar referencia y render lado a lado;
   anotar las tres diferencias más visibles y corregirlas. Repetir al menos dos
   ciclos después del blockout.
8. **Entrega:** ejecutar validador, abrir el GLB exportado, comprobarlo dentro
   del juego y documentar límites reales. Un export correcto no sustituye la
   aprobación visual.

En piezas de relieve como monedas, el flujo preferido es un disco o polígono
base con canto real, relieve high-poly (curvas/malla o displacement controlado),
bake a normal/height para el modelo de juego y material metálico con rugosidad
variable. En criaturas, empezar por masas anatómicas y silueta, luego remesh o
multires, retopología, UV y bake; las plumas, pelo o placas se agrupan por capas
y lectura, no como conos repetidos sin dirección.

| Paso | Dónde |
|---|---|
| Script reproducible, geometría por código | `scripts/blender/<modelo>.py` (ayudas en `fg.py` y `fg_rig.py`) |
| Exportación GLB con clips en pistas NLA | `fg.export()` → `assets/models/<modelo>.glb` |
| Archivo editable | `arte/blender/<modelo>.blend` |
| Pruebas, láminas, vídeos, variantes y reportes del agente | `work/<agente>-<tarea>/` (ignorado; nunca `arte/omp-*`) |
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

- **Archivos:** `scripts/blender/diostede.py` (con `-- --capturas` también renderiza las láminas en `work/diostede/`), `scripts/blender/capturas_montura.py` (genérico), `scripts/blender/validar_diostede.py`, `assets/models/diostede.glb` y `arte/blender/diostede.blend`. Capturas de revisión en `work/capturas/diostede/`.
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
