# Continuidad de desarrollo en Mac

Corte: 2026-11-07. Base inspeccionada: `2859a47`. Esta guía y el [paquete de contexto](referencias/README.md) preparan la continuidad de desarrollo en Mac; no certifican una plataforma comercial.

## 1. Qué llevar

Conservar el repositorio y su historial, package-lock.json, data, assets propios registrados en PROCEDENCIA y scripts. Para continuar modelado, conservar además los editables propios de arte/blender que se necesiten, aunque estén ignorados. Comprobar los archivos locales ignorados antes de transferirlos; Git no garantiza incluirlos. No trasladar node_modules, dist, dist-electron, release ni cachés: se regeneran para el Mac.

Los dos resúmenes y el README de docs/referencias bastan para el contexto de diseño sin las carpetas vecinas. Incluyen procedencia y límites de autoridad. No llevar instalaciones de juegos, out, evidence, código decompilado ni assets de terceros. reference_assets es material de estudio ignorado, no requisito de continuidad ni entrada del juego. Las configuraciones personales y credenciales se recrean en el Mac, no se copian al repositorio.

## 2. Preparar y probar el juego

Usar una instalación nativa de Node 20 como línea base de reproducción de este checkout; no implica recomendación de soporte futuro. En Windows se observó Node 20.19.1 y npm 10.8.2. package-lock fija Electron 33.2.1, electron-builder 25.1.8, Babylon core 7.54.3, Vite 5.4.21 y TypeScript 5.9.3. No actualizar versiones como parte de la mudanza.

Diagnóstico de lectura: `sh scripts/mac/check.sh` (opcional: BLENDER_BIN con ruta distinta). No instala nada ni abre Blender. Este script queda sin ejecutar en macOS durante esta entrega.

Desde la raíz en Terminal:

```sh
uname -m
node -p 'process.platform + " " + process.arch'
npm ci
npm run docs:check
npm test
npm run typecheck
npm run build
npm run dev
npm start
```

Apple Silicon debe mostrar arm64 en Node para evitar una instalación Intel accidental. npm ci necesita descargar dependencias y el binario Electron del destino. No reutilizar node_modules de Windows. Cerrar Electron al terminar la prueba.

Prueba de aceptación pendiente en Mac: crear personaje, mover/atacar con clic y clic secundario, lanzar habilidades, abrir mochila, guardar/cargar, escuchar audio, comprobar modelos/texturas, zoom y escalado Retina, tamaños de ventana y pantalla completa. Medir FPS con ventana visible. F11 puede requerir Fn según el teclado. app.on(window-all-closed) cierra la aplicación y no hay manejador activate: comportamiento actual que hay que comprobar en Dock, no un fallo de rutas.

Para QA automatizado en ventana: `npm run qa:electron -- interfaz`. Usa Vite, Electron y CDP locales; no prueba la aplicación empaquetada. Revisar los informes en work/qa y repetir apertura del paquete sin servidor Vite.

## 3. Empaquetado local, todavía sin verificar

`npm run package` conserva el destino Windows. Se añade `npm run package:mac` para generar una aplicación local en el Mac con la arquitectura de su Node:

```sh
npm run package:mac
```

Para elegir la arquitectura explícitamente, después de build:

```sh
npx --no-install electron-builder --mac dir --arm64 --publish never
# En Intel usar --x64 en lugar de --arm64.
```

La salida configurada es release; localizar dentro la aplicación .app y abrirla para comprobar la carga file:// con Vite cerrado. Es un ensayo local: no se preparan certificados, notarización ni publicación. Si el firmado del entorno bloquea el ensayo, registrar el error antes de establecer una política de firma; no desactivar protecciones globales. No prometer un instalador distribuible hasta probarlo en macOS.

La [documentación de electron-builder consultada](https://www.electron.build/v26/docs/mac/) confirma el destino dir y las arquitecturas; es documentación v26, mientras el lock local es 25.1.8. La ejecución con la versión instalada queda pendiente y debe prevalecer sobre asumir compatibilidad completa con documentación posterior.

## 4. Blender MCP: evidencia y configuración mínima

Estado de conexión comunicado por el coordinador en esta sesión: get_addon_status devuelve **Could not connect**. No hay conexión MCP activa acreditada y no se verificó Blender en Mac. No se abrió ni modificó una escena para esta entrega.

Inspección local limitada a los campos pertinentes:

- El archivo personal ~/.codex/config.toml de Windows contiene mcp_servers.blender, command con ruta absoluta a WinGet/uvx.EXE y args = ["mcp-for-blender"]. ~/.claude.json contiene el mismo comando/paquete. No se copian esos archivos completos ni sus otros campos.
- El addon local está en %APPDATA%/Blender Foundation/Blender/5.2/scripts/addons/blender_mcp.py: bl_info version (1, 8), servidor con localhost y puerto 9876; registra blendermcp_auto_start_server con valor predeterminado True y el operador blendermcp.start_server. Esto acredita el archivo, no que Blender esté abierto o escuche.
- docs/GUIA_BLENDER_MCP.md recoge rutas Windows y el procedimiento existente. No se debe interpretar su nota de arranque automático como prueba de conexión actual.

En Mac instalar Blender y uv para la arquitectura local. Confirmar las rutas reales:

```sh
command -v uvx
/Applications/Blender.app/Contents/MacOS/Blender --version
uvx mcp-for-blender install-addon
```

La ruta de Blender es la habitual, sustituirla si la aplicación está en otra carpeta. El instalador determina el directorio de addons; no copiar el addon a una carpeta 5.2 supuesta. Habilitar MCP for Blender en Preferences/Add-ons, guardar preferencias y conectar desde su panel en la vista 3D. Mantener el listener en localhost, puerto 9876.

Fragmento mínimo de configuración del servidor, trasladado del bloque real de Windows; sustituir command por la salida absoluta de command -v uvx en ese Mac:

```toml
[mcp_servers.blender]
command = "/ruta/absoluta/real/a/uvx"
args = ["mcp-for-blender"]
```

Es un ejemplo, no un archivo instalado. No añadir claves de proveedores: no se requieren para scripts originales. Reiniciar por completo el cliente después de cambiar su configuración. La [guía del proveedor](https://www.mcp-for-blender.com/docs/installation) documenta install-addon y recomienda ruta absoluta para clientes gráficos; el paquete uvx del equipo Windows no está fijado por versión en su configuración.

Diagnóstico local en Mac: `lsof -nP -iTCP:9876 -sTCP:LISTEN`. Un listener solo prueba el puerto: después llamar get_addon_status y get_scene_info y registrar versión y resultado. Si falla, comprobar addon habilitado, panel conectado, mismo puerto y ruta de uvx. No declarar éxito por tener Blender abierto.

## 5. Ejecutar scripts sin rutas Windows

Para MCP, pasar siempre __file__ explícito. Ejemplo para la montura cuya ruta de reserva actualmente es Windows; sustituir la raíz por la del Mac:

```python
from pathlib import Path
import sys
p = Path("/Users/USUARIO/Projects/FrankmanGames-Prototipo/scripts/blender/diostede.py").resolve(strict=True)
sys.path.insert(0, str(p.parent))
exec(compile(p.read_text(encoding="utf-8"), str(p), "exec"),
     {"__name__": "__main__", "__file__": str(p)})
```

Este ejemplo genera/sobrescribe el GLB y el editable propios del Diostedé; ejecutarlo solo al querer regenerarlos. No se ejecutó en esta entrega. Preferir sesión nueva si se cambió de checkout: Python puede conservar fg importado desde otra carpeta.

El script diostede.py usa fg.fresh_scene y guarda con copy=True cuando hay ventana; no representa a todos los scripts. fg.reset y read_factory_settings reinician Blender y pueden descargar el addon. Los validadores, revisar.py y generadores como personaje/equipo/enemigos usan esos reinicios: ejecutarlos en proceso separado, no por MCP sobre la sesión del creador.

```sh
"/Applications/Blender.app/Contents/MacOS/Blender" --background --python scripts/blender/validar_diostede.py
```

Inspeccionar entradas/salidas antes de regenerar otro modelo. Revisar el resultado visual con look cuando MCP esté disponible; los validadores no sustituyen esa revisión.

## 6. Auditoría acotada de rutas y supuestos

| Evidencia local | Consecuencia para Mac |
|---|---|
| scripts/dev.mjs importa electron y usa spawn, sin .exe fijo; buildMain.mjs usa rutas relativas | No se encontró bloqueo Windows en esos lanzadores; falta ejecución Mac |
| vite.config.ts usa base ./; electron/main.ts carga dist por path.join | Preparados para rutas relativas en file://; verificar recursos del paquete |
| package.json conserva --win portable y añade package:mac | Usar package:mac o la orden Mac explícita del apartado 3; falta probar en Mac |
| scripts/blender/diostede.py, reserva HERE en except NameError | Pasar __file__ como en el apartado 5; el proceso background ya lo proporciona |
| Comentarios de numerosos scripts Blender contienen Program Files | Ejemplos Windows; sustituir ejecutable por Blender.app, no modificar geometría |
| scripts/localMusic.ts usa carpeta vecina o FMG_MUSIC_DIR | Música externa opcional de desarrollo; ausente en build. Si se necesita, configurar ruta Mac propia |
| scripts/local-ai/e2e.mjs llama taskkill sin guardia; subagent.mjs sí comprueba win32 | El ensayo local-ai e2e requiere adaptación separada; no es requisito para arrancar juego |
| electron/main.ts añade force_high_performance_gpu y elimina el menú | No demuestra selección de GPU ni experiencia de menú correctas en Mac; revisar visualmente |
| Rutas de herramientas personales Windows en configuración de clientes | Reinstalar herramientas y recrear solo los bloques necesarios, sin importar configuración completa |

La búsqueda cubrió scripts, electron y vite.config.ts; no es auditoría exhaustiva de cada importación ni de diferencias de mayúsculas en sistemas de archivos. No se modificaron rutas fuera del alcance.

## 7. Evidencia de entrega y pendientes

Lecturas: AGENTS; docs/README, ESTADO_ACTUAL, TAREAS, PREGUNTAS_CREADOR, ARQUITECTURA y GUIA_BLENDER_MCP; las cuatro fuentes vecinas obligatorias en orden; README y sección inicial de arquitectura del REPORT de FATE. El paquete de referencias registra seis fuentes por SHA-256, commit de origen y estado local. Resúmenes propios, no exportaciones del material investigado.

Verificación de esta entrega: npm run docs:check pasó (41 Markdown, enlaces locales correctos); se revisó el estado de Git para delimitar los archivos nuevos. El diagnóstico shell se revisó por lectura y queda sin prueba en Mac. Solo documentación nueva; no se necesitan pruebas de combate para esta entrega. No se ejecutaron npm ci, tests, typecheck, build, empaquetado, regeneración de modelos ni QA visual como parte de esta tarea. Pendiente en el Mac: todos los pasos de instalación, arranque, paquete, GPU, audio, controles, guardado y Blender/MCP descritos arriba. No hay certificación Mac ni MCP activo.
