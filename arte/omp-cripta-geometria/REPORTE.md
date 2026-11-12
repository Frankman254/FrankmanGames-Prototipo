# REPORTE — Auditoría de geometría `mazmorra.glb` (2026-11-11)

Estado: **INTEGRADO 2026-11-12**: `CAMBIOS_PROPUESTOS.patch` aplicado a
`scripts/blender/mazmorra.py`, `assets/models/mazmorra.glb` regenerado y
validado (`validar_mazmorra.py` → `VALIDO`), batería de contratos en verde.
El fix del muro quedó a la vista en la ventana de Blender del creador.

## Método

1. Auditor del GLB publicado (`assets/models/mazmorra.glb`): extensión por
   nodo, huella frente al contrato del juego (`TILE = 1.5`, paso de losa
   `MODEL_TILE`), altura (`WALL_H = 3.2`), apoyo, orígenes, normales y
   solapes coplanares. Referencia de consumo: `src/render/dungeonView.ts`
   (muros instanciados a paso `ts`, losas fin-instanciadas, remate a
   `y = wh + 0.01`, boca a `y = 0.02`).
2. `mazmorra_corregida.py`: copia del generador con los fixes de geometría;
   escribe SOLO en esta carpeta (escena `Mazmorra` del usuario no tocada;
   `fg.MODELS` y `TEXTURES` reorientados a `work/`).
3. `validar_mazmorra.py`: import del GLB y comprobaciones automáticas
   (nombres, huellas, apoyo hundido 5 mm, orígenes, normales/volumen con
   signo, triángulos, caras en el plano del suelo). Corriendo contra el GLB
   publicado da los 4 fallos de la auditoría; contra el corregido: `VALIDO`.
4. `revisar_mazmorra.py`: sala de prueba con los materiales que aplica el
   juego (muro/baldosa texturados, remate oscuro, boca negra, runa y llama
   emisivas) y 4 cámaras → `vistas/*.png`, montadas en `revision.png`.

## Hallazgos en el GLB publicado

| # | Nodo | Problema | Efecto en el juego |
|---|------|----------|--------------------|
| 1 | `d_muro` | zócalo ±0.80 y cornisa ±0.79 desbordan la huella TILE (±0.75) | dos paredes contiguas clavan sus molduras; el zócalo sobresale 5 cm sobre la baldosa vecina |
| 2 | `d_remate` | placa ±0.79 | remates contiguos coplanares solapados 8 cm → z-fighting en la cota `wh+0.01` |
| 3 | `d_entrada_boca` | llega a x=-2.3: 40 cm fuera del montículo (x≥-1.9) y franja entre montículo y umbral | lama negra flotando frente a la cripta |
| 4 | `d_bajada` / `d_subida` / `d_entrada` / `d_jarra` / `d_barril` / `d_cascotes` / `d_puerta_poste` / `d_puerta_hoja` / `d_muro` | base exactamente en z=0 | cara inferior coplanar con `d_baldosa` (plano de losa y=0) → parpadeo en rasante |
| 5 | `d_bajada` peldaños internos | banda z [0.005, 0.065] cruzando el plano de `d_boca` (y=0.02) | la losa negra corta los peldaños por la mitad |

No hallazgos (verificado OK): los 21 nombres del contrato, orígenes en
(0,0,0), volumen/normales de las cajas y tornos, `d_anillo` y `d_llama`
suspendidos intencionadamente por el juego, `d_estanque_piedra` semienterrada
por diseño.

## Correcciones aplicadas

- `d_muro`: tres cajas apiladas DENTRO de TILE (zócalo retraído 5 cm/lado con
  1 cm de solape para no dejar cara interna coplanar; cuerpo exacto TILE;
  cornisa retraída 3 cm). Altura total 3.2 intacta: el código de juego escala
  el muro por `wh / MODEL_WALL_HEIGHT` y sigue cuadrando.
- `d_remate`: placa exacta ±0.75; los remates contiguos comparten borde, sin
  solape coplanar.
- `d_entrada_boca`: recortada a x∈[-1.525, -0.1], justo bajo los tres
  peldaños del umbral de `d_entrada` (nada visible asoma fuera del montículo).
- Peldaños de `d_bajada` subidos a z∈[0.04, 0.10]: por encima del plano de
  `d_boca`.
- `sink_base()` al final del generador: hunde 5 mm las vértices en z=0 de las
  piezas macizas apoyadas (patrón que `d_entrada` ya usaba en sus pasos).
  `d_barril_aros` (va sobre el barril) y `d_estanque_piedra` (semienterrada)
  quedan fuera.

## Antes / después (validador automático)

- Publicado: `FALLO: huella d_remate 1.58x1.58`, `FALLO: huella d_muro
  1.60x1.60`, bocaza x=-2.3, 2 caras de `d_bajada` en el plano del suelo, etc.
- Corregido: `VALIDO: nombres, huellas, apoyo, origenes, normales y
  z-fighting OK` — 21 nodos, 2286 triángulos (idéntico al publicado).

## Tabla por nodo (GLB corregido; dims = ancho×profundidad×alto en m, zmin =
base local; el juego ubica antorcha/llama/anillo/dintel en altura)

| nodo | dims (m) | tris | zmin |
|---|---|---|---|
| d_anillo | 3.26×3.26×0.06 | 384 | -0.03 |
| d_antorcha | 0.20×0.17×0.59 | 44 | -0.25 |
| d_bajada | 2.80×2.80×0.31 | 72 | -0.005 |
| d_baldosa | 1.50×1.50×0.00 | 2 | 0 |
| d_barril | 0.71×0.71×0.91 | 176 | -0.005 |
| d_barril_aros | 0.71×0.71×0.82 | 176 | 0.04 |
| d_boca | 2.20×2.20×0.00 | 2 | 0 |
| d_cascotes | 0.96×0.66×0.13 | 148 | -0.005 |
| d_entrada | 2.83×4.00×3.78 | 132 | -0.005 |
| d_entrada_boca | 1.43×2.16×0.04 | 12 | 0.01 |
| d_entrada_monticulo | 4.80×6.90×3.30 | 320 | -1.65 |
| d_entrada_runa | 0.08×1.08×1.08 | 240 | 2.66 |
| d_estanque_piedra | 0.75×0.37×0.52 | 20 | -0.18 |
| d_jarra | 0.53×0.54×0.77 | 240 | -0.005 |
| d_llama | 0.22×0.19×0.38 | 40 | -0.10 |
| d_muro | 1.50×1.50×3.21 | 36 | -0.005 |
| d_puerta_dintel | 1.00×0.52×0.36 | 12 | 2.60 |
| d_puerta_hoja | 0.99×0.13×2.55 | 84 | -0.005 |
| d_puerta_poste | 0.42×0.60×2.91 | 24 | -0.005 |
| d_remate | 1.50×1.50×0.00 | 2 | 0 |
| d_subida | 2.78×3.00×3.10 | 120 | -0.005 |
| **total** | | **2286** | |

Materiales: los mismos del original (piedra muro/baldosa con PNG de ruido
propio generado en `texturas/`, oscuro, hierro, llama, montículo, runa, barro,
madera). El exportador no embebe materiales (`materials=False`); el juego los
asigna por nombre.

## Capturas revisadas (`revision.png`, 2×2; originales en `vistas/`)

- `frontal`: dos muros contiguos + losa — junta limpia, sin molduras
  sobresalientes, sin banda sobre la baldosa.
- `cenital`: sala con escaleras arriba/abajo — peldaños del hueco leídos por
  encima de la losa negra del pozo; losas sin parpadeo.
- `rasante`: esquina de dos muros a 90° a la altura del ojo — base hundida
  5 mm, la junta de esquina no pelea con el suelo.
- `entrada`: pórtico de la cripta desde fuera — la boca oscura ya no asoma
  ante el montículo; runa y dintel intactos.

## Fallos y advertencias pendientes

- El zócalo retraído se lee como junta horizontal, no como moldura saliente:
  es el cambio estético real del fix; la alternativa (mantener saliente) viola
  la huella TILE. Decide el coordinador al aprobar el parche.
- No probado dentro del juego en marcha (Electron requiere ventana/GPU;
  queda para local en el PC del creador).
- `d_entrada_boca` recortada deja de tapar el hueco entre montículo y primer
  peldaño: el suelo del mundo abierto asoma ahí (antes lo tapaba una lama
  negra flotante, que era el bug). Si se quiere negro continuo, es cambio de
  diseño de `d_entrada`, no de este patch.

## Entregables de esta carpeta

- `mazmorra_corregida.py` — generador corregido (escribe solo en `work/`).
- `mazmorra_corregida.glb` / `.blend` — artefactos revisados.
- `validar_mazmorra.py` — validador automático (pasó sobre el corregido).
- `revisar_mazmorra.py` + `vistas/` + `revision.png` — lámina revisada.
- `CAMBIOS_PROPUESTOS.patch` — diff mínimo para `scripts/blender/mazmorra.py`
  (solo hunks de geometría; `candidata.py` es el preimagen del diff).

## Texto para PROCEDENCIA.md (al integrar)

> `assets/models/mazmorra.glb` (regenerado): geometría de la cripta generada
> por código con Blender 5.2.3 (`scripts/blender/mazmorra.py`), limpia de
> referencia externa. Corrección 2026-11-11: huella TILE estricta en muros y
> remates, boca de entrada recortada, bases hundidas contra z-fighting.
> Autor: agente OMP (FrankmanGames). Licencia: propia, sin terceros.
