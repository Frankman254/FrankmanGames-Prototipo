# JL-179: Manejadores de error silenciosos en src/

Barrido de `.catch()` y `catch {}` en `src/` (2026-11-23).

## Resumen

- **19** `.catch()` encontrados en total.
- **12** ya registran el error (`console.warn` / `console.error` / mensaje al usuario).
- **7** tragan el error en silencio → se cambiaron a `console.warn` con la ruta.
- **0** `catch {}` vacíos de try/catch.

## Ya registran el error (sin cambiar)

| Archivo | Línea | Qué hace |
|---|---|---|
| `src/audio/contextMusic.ts` | 226 | `console.warn` con track y error |
| `src/audio/localMusic.ts` | 112 | `console.warn` con file y error |
| `src/audio/stingers.ts` | 49 | `console.warn` con id y error |
| `src/boot.ts` | 6 | `console.error` + re-throw |
| `src/render/ambientView.ts` | 155 | `console.error` "[ambiente]" |
| `src/render/characters/ghostBody.ts` | 39 | `console.error` fantasma.glb |
| `src/render/characters/gltfCharacter.ts` | 211 | `console.error` con nombre |
| `src/render/characters/heldGear.ts` | 57 | `console.warn` equipo.glb |
| `src/render/mountView.ts` | 259 | `console.error` con file |
| `src/scenes/bankScene.ts` | 345 | `console.error` cofre del banco |
| `src/scenes/bankScene.ts` | 372 | `console.error` moneda decorativa |
| `src/ui/editor/index.ts` | 405 | `say('No se pudo aplicar...')` — mensaje al usuario |

## Cambiados a console.warn (cargan assets o datos)

| Archivo | Línea | Qué carga | Antes | Después |
|---|---|---|---|---|
| `src/audio/samples.ts` | 52 | WAV de efectos | `.catch(() => null)` | `.catch((e) => { console.warn('[audio] no se pudo decodificar', s.file, e); return null; })` |
| `src/render/assetCache.ts` | 56 | GLB/GLTF genéricos | `.catch(() => this.containers.delete(id))` | `.catch((e) => { console.warn('[assets] no se pudo cargar', id, e); this.containers.delete(id); })` |
| `src/render/dungeonView.ts` | 489 | `utileria_cripta.glb` | `.catch(() => { // GLB no disponible })` | `.catch((e) => { console.warn('[dungeon] no se pudo cargar utileria_cripta.glb', e); })` |
| `src/ui/loadingScreen.ts` | 104 | deps.ready() | `.catch(() => undefined)` | `.catch((e) => { console.warn('[carga] deps.ready falló', e); return undefined; })` |
| `src/ui/menus/index.ts` | 258 | Keyboard Layout API | `.catch(() => undefined)` | `.catch((e) => { console.warn('[menus] no se pudo leer el layout del teclado', e); })` |
| `src/ui/menus/index.ts` | 1109 | requestFullscreen | `.catch(() => { // Fallback })` | `.catch((e) => { console.warn('[menus] requestFullscreen falló', e); // Fallback... })` |
| `src/ui/menus/index.ts` | 1116 | exitFullscreen | `.catch(() => undefined)` | `.catch((e) => { console.warn('[menus] exitFullscreen falló', e); })` |

## Notas

- `src/ui/editor/index.ts:405` ya avisa al usuario con `say()`. No se añadió `console.warn` porque el mensaje es suficiente para el contexto del editor.
- `src/ui/menus/index.ts:1109` el fallback a `frankmanDesktop.setFullScreen` se mantiene intacto; solo se añadió el warn antes.
- Los archivos de Claude (`gltfCharacter.ts`, `characterPreview.ts`, `arenaView.ts`, `hudLayout.ts`, `hudProfiles.ts`) no se tocaron.
