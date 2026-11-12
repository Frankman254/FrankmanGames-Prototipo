# REPORTE — Rompibles de la cripta (jarra, tonel, caja, cascotes)

Fecha: 2026-11-12. Autor: agente local OMP (Prompt 3 del creador).
Estado: **publicado en master** — GLB regenerado, texturas en `assets/textures/`,
`src/render/dungeonView.ts` patchado, tests en verde, PROCEDENCIA.md registrada.

## Qué se pidió y qué se entregó

Catálogo de rompibles para la cripta con **variantes deterministas por familia**
y **rotura coherente con el material** (barro para jarras, duela para toneles y
cajas). El juego elige la variante con FNV-1a sobre el id del rompiente: al
romperse una pieza, las demás conservan la suya.

| Pieza (nodo GLB) | Triángulos | Dimensiones aprox. | Material en el juego |
|---|---|---|---|
| `d_jarra` (común) | 240 | Ø0.30 × 0.76 m | barro.png, sin tinte |
| `d_jarra_alta` | 240 | Ø0.24 × 0.86 m | barro.png |
| `d_jarra_ancha` | 200 | Ø0.42 × 0.60 m | barro.png |
| `d_jarra_agrietada` | 150 | Ø0.30 × 0.72 m, boca rota | barro.png |
| `d_barril` | 176 | Ø0.52 × 0.78 m | duela.png |
| `d_barril_aros` | 176 | Ø máx 0.57 m | hierro plano (sin textura) |
| `d_barril_bajo` | 352 | Ø0.58 × 0.50 m | duela.png |
| `d_caja` | 132 | 0.62 × 0.44 × 0.46 m | duela.png |
| `d_cascotes` | 100 | montón Ø0.55 × 0.14 m | barro.png |
| `d_cascotes_madera` | 92 | montón Ø0.60 × 0.10 m | duela.png |

Rompibles: 1.858 triángulos. `mazmorra.glb` completo: 2.366 → **3.484**
(tope por objeto ≤500: cumplido; el anterior `d_barril` + `d_jarra` +
`d_cascotes` sumaban 484). Aros y pieza madre comparten la matriz de instancia:
los aros sólo se dibujan bajo la variante alta.

## Materiales / texturas

- `assets/textures/barro.png` — barro cocido terracota con veteado suave,
  goteado de esmalte más claro y micro-manchas; procedural en color, 512².
- `assets/textures/duela.png` — madera de toneles: veta vertical, nudos,
  anillos de aros más oscuros y uniones de duela; procedural en color, 512².
- Las genera `scripts/blender/mazmorra.py` (`make_barro` / `make_duela`) y
  viajan como PNG en `assets/textures/`, registradas en PROCEDENCIA.md.
- Los rompibles **no llevan tinte de tema**: el color lo decide la textura
  (decisión registrada en el comentario de `buildBreakables`).
- Aros: gris hierro 0.16/0.16/0.18 sin textura (metal plano low-poly).

## Integración (cambios de código)

- `src/render/dungeonView.ts`
  - `buildBreakables`: 4 mallas de jarra + 3 de barril + aros + 2 montones,
    todas thin-instance; selección de variante por `hashId(b.id) % n`; los
    ids de feature viajan alineados por mesh (una sola instancia viva por
    rompiente, las huecas a escala 0).
  - `setBroken`: apaga la instancia (y sus aros si los tenía), empuja el
    cascote del tipo correcto y reconstruye ese buffer; idempotente.
  - Roturas ya guardadas en la partida: la pieza nace apagada y su montón
    puesto en `buildBreakables`.
- `scripts/blender/mazmorra.py`: nueva geometría de variantes, caja, astillas
  de duela, texturas uv_metres=0.5; `d_jarra` común intacta para no romper
  layouts existentes.
- `tests/modelos.test.ts`: las 10 piezas nuevas entran en el contrato del GLB.
- `tests/dungeonRompibles.test.ts` (nuevo, NullEngine, piso 50): reparto de
  variantes, apagado por instancia, coherencia barro/duela, idempotencia,
  roturas persistidas, variante estable tras romper a un vecino.

## Verificación

- `npx tsc --noEmit` limpio; `npx vitest run` **1193/1193**.
- Lámina `revision.png` (esta carpeta): importada desde el **GLB publicado**,
  materiales de `assets/textures/`, revisada por el agente — siluetas claras,
  barro vs duela legibles, aros montados sobre el barril alto, cascotes de dos
  materiales distintos. La caja con la tapa abierta y los aros sin textura se
  ven correctos a tamaño de lámina.
- Pendiente para el creador (requiere ventana/GPU): paseo visual en `npm run
  dev` pisando jarras y toneles de la cripta.

## Texto para PROCEDENCIA.md (ya registrado, 2026-11-12)

> `assets/models/mazmorra.glb` (regenerado), `assets/textures/barro.png`,
> `assets/textures/duela.png` y `scripts/blender/mazmorra.py` — catálogo de
> rompibles prototipado y revisado en `arte/omp-rompibles-cripta/`; barro
> cocido y duela procedurales originales, sin archivos externos; mazmorra.glb
> 2.366 → 3.484 triángulos. Autor: FrankmanGames + agente local OMP. Licencia:
> propia del proyecto.
