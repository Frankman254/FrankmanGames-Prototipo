# REPORTE — Fuego de antorchas (Prompt 2, 2026-11-12)

## Estado: **integrado en master local** (pendiente de push del coordinador)

## Qué fallaba

- Todas las llamas del piso respiraban **sincronizadas**: un único pulso global de
  `emissiveColor` del material para todas las thin instances.
- La llama era un cono de dos tubos rectos (silueta de jarrón, simétrica).
- No había humo ni chispas: el fuego terminaba en el aire.

## Qué se hizo

**Modelo (`scripts/blender/mazmorra.py` + `assets/models/mazmorra.glb` regenerado):**

| Pieza | Triángulos | Notas |
|---|---|---|
| `d_llama` (núcleo) | 60 | lágrima torcida de 4 tramos, eje desplazado; conserva el nombre público |
| `d_llama_halo` | 48 | la misma lágrima un 45 % más gorda; aditivo |
| `d_llama_humo` | 4 | dos tarjetas cruzadas sobre la punta |
| `d_llama_chispa` | 8 | octaedro mínimo |
| **fuego total** | **120** | mazmorra.glb: 2.286 → 2.366 (+80) |

Prototipo aislado verificado primero en esta carpeta (`llama.py`,
`llama_fuego.glb/.blend`); el bloque final se portó a `mazmorra.py` y se
regeneró el GLB publicado. Materiales: los tres nuevos (`Llama`, `Halo`,
`Humo`) son propios, sin texturas ni archivos externos. El GLB viaja **sin
materiales** (`materials=False`), como todo el catálogo: el juego los asigna.

**Código (`src/render/torchFlame.ts`, nuevo):** clase `TorchRig` — cuatro mallas
thin-instanced por piso (4 draw calls fijos, no 30; cero sistemas de
partículas), una instancia por antorcha. Animación **asincrónica por fase**:
`fase = x·1.7 + z·2.3 + i` (determinista, el mismo patrón del parpadeo de
luces en `atmosphere.ts`), dos senos de frecuencia conmutada → escala, balance
y giro propios por antorcha. El humo sube en bucle de ~2.4 s (escala + alpha
por instancia); la chispa en bucle corto que se encoge.

**Parche (`src/render/dungeonView.ts`):** se eliminan `flameMat`/`flame`/
`flameColor` y el pulso global; `update(dt)` delega en `torchRig.update`;
`dispose()` libera mallas y materiales (antes `root.dispose(false, true)` ya
los barría; ahora es explícito y lo prueba un test).

## Verificación

- `npx tsc --noEmit` limpio; suite completa `npx vitest run`: **1 184 + 4 nuevos
  pasan** (`tests/dungeonFuego.test.ts`: instancia por antorcha, apoyo en la
  boca del cuenco sin deriva, divergencia asincrónica entre antorchas,
  `dispose` libera 4 mallas y 3 materiales).
- `tests/modelos.test.ts`: contrato de piezas de `mazmorra.glb` ampliado con
  las tres nuevas.
- `CAMBIOS_PROPUESTOS.patch`: aplica limpio sobre `HEAD` (7cd317a) en worktree
  virgen — tsc y tests verificados allí también. Incluye el binario regenerado.
- **Lámina revisada:** `revision.png` (importa el GLB publicado; fila 1: siete
  antorchas con fase propia al mismo tiempo — siluetas distintas, no un pulso
  común; fila 2: una llama en cinco instantes — ciclo de vida del humo y la
  chispa). Primera versión sobreexpuesta y humo desproporcionado: corregidos
  (emisión núcleo 6→2.2; escala de humo topa 1.4→0.95) en ambos lados de la
  fórmula.

## Límites honestos (verificados en el shader de Babylon)

- `finalDiffuse = clamp(diffuseBase·diffuse + emissive + ambient) · baseColor`,
  y `baseColor.rgb *= vColor.rgb` con thin instances: el **tinte y el brillo
  por antorcha se animan pintando colores** (núcleo: emissive blanco, tinte
  del piso × flick por instancia). No existe `DISABLELIGHTING` en el shader;
  `disableLighting` solo vacía el bucle de luces, el emissive pasa igual.
- `vColor.a` escala el alpha **solo si el material mezcla** (`alpha < 1`): lo
  usa el humo. El halo y la chispa suman (`ALPHA_ADD` = ONE,ONE, ignora el
  alpha del fragmento): su desvanecido va multiplicado en el rgb. Dos
  materiales en total: núcleo opaco emitivo; halo+chispa aditivo sin escribir
  profundidad.
- Luces puntuales: sin cambio (ya parpadeaban con fase propia en `atmosphere.ts`).

## Texto para PROCEDENCIA.md (ya registrado)

> 2026-11-12 · `assets/models/mazmorra.glb` (regenerado) — Fuego de antorchas
> en cuatro piezas (núcleo/halo/humo/chispa, +120 triángulos), prototipado en
> `arte/omp-fuego-antorchas/llama.py` y portado a `scripts/blender/mazmorra.py`
> · FrankmanGames + agente local OMP · Propia del proyecto · Modelado desde
> cero con primitivas; sin archivos externos.

## Pendientes para el creador

- Revisión visual en la ventana real (`npm run dev`, preset `mazmorraRonda` o
  partida con cripta): el asincrónico se juzga en movimiento, la lámina solo
  prueba las poses.
