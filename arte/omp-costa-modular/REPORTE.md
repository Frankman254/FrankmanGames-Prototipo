# REPORTE — Costa modular (escenario costero) — para revisión humana

Estado: **preparado para revisión, NO integrado**. Nada se copió a `assets/models/`,
no se registró en `PROCEDENCIA.md`, no se tocó el mapa ni el juego, no hay commit.
Todo vive en `work/omp-costa-modular/` (carpeta ignorada por Git).
Fecha: 2026-11-09. Herramienta: Blender 5.2.3 LTS vía MCP (addon 1.8, protocolo
15/15 confirmado antes de empezar). Método: geometría y materiales desde cero con
primitivas (`fg.Builder` de `scripts/blender/fg.py`). Sin `generate_3d`, sin
`search_assets`, sin `import_asset`, sin `read_factory_settings` ni `fg.reset()` en
la sesión del usuario (guardado del `.blend` con `copy=True`; la escena abierta del
creador quedó intacta). Clean-room: no se leyeron ni copiaron assets de otros juegos;
formas fantásticas genéricas, sin animales, basura moderna, barcos, banderas, texto
ni símbolos.

## Concepto

Catálogo de borde de mar para playas, costas rocosas, esteros y márgenes de manglar:
seis rocas de silueta propia, tres piezas de madera de arrastre, dos formaciones de
raíz (zarpas bajas y andamio de zancos), un montículo de arena, el cerco de piedras de
una poza de marea (sin agua) y cinco piezas de decoración muy pegada al suelo. Ninguna
afirma representar una playa, especie o comunidad concreta.

## Archivos

| Archivo | Qué es |
|---|---|
| `costa_modular.py` | Generador reproducible (`blender --background --python` o por MCP); autovalida ≤450 tris/nodo, ≤6000 total, ≤6 materiales |
| `costa_modular.blend` | Copia editable guardada con `copy=True` (la sesión del usuario no quedó ligada a él) |
| `costa_modular.glb` | Catálogo exportado: 18 nodos, 190 652 bytes; cada nodo con origen en (0,0,0) y apoyo en z=0 |
| `validar_costa_modular.py` | Validador sin interfaz del GLB re-importado: IDs exactos, apoyo, huella centrada, límites y tope de altura en las piezas 14–18 |
| `hacer_revision.py` | Script de la lámina: tres vistas etiquetadas (¾, cenital y a ras del suelo) desde el GLB re-importado |
| `revision.png` | Lámina final unida (¾ + cenital + línea baja a escala de peatón) |
| `revision_trescuartos.png`, `revision_cenital.png`, `revision_baja.png` | Las tres tomas sueltas |
| `dimensiones.json` | Volcado de dimensiones/triángulos/materiales del GLB para esta tabla |

## Contrato cumplido

- +Z arriba, escala métrica, origen de cada nodo en (0,0,0) y la malla apoyada en
  z=0 (mínimo z = 0.000 en los 18 nodos, huella centrada en X e Y; medido sobre el
  GLB re-importado por el validador).
- Triángulos: máximo por nodo **380** (`costa_mata_duna_grande`; límite 450);
  total **2 052** (límite 6 000). Asumidos por `assert` en el generador y
  comprobados de nuevo en el GLB.
- Materiales: **6** (`costa_arena`, `costa_piedra_clara`, `costa_piedra_oscura`,
  `costa_madera`, `costa_raiz`, `costa_concha`), Principled con color base y
  rugosidad, sin mapas ni texturas.
- Piezas **14–18** (huellas de olas, mata de duna pequeña, mata de duna grande,
  grupo de conchas, restos de ramas): muy pegadas al suelo (altura real ≤0,26 m,
  todas ≤0,17 salvo la mata grande), pensadas como decoración **no bloqueante**.
- `costa_borde_poza` sólo modela piedras y lengua de arena; **no lleva agua**.
- Siluetas: cada roca/madera/raíz tiene su propia construcción (redonda con
  guijarro, dorsal doble, laja escalonada de dos pisos, socavada tipo hongo, partida
  con grieta oscura, grupo irregular); la madera recta, la curva en tres quiebres y
  el pan de raíces son armados distintos; las raíces bajas serpentean y el andamio de
  zancos cruza arcos. No es una sola malla escalada.

## Tabla por nodo (dimensión X × Y × Z en metros, desde el GLB)

| Nodo | X | Y | Z | Triángulos | Materiales usados |
|---|---:|---:|---:|---:|---|
| costa_roca_baja_pequena | 0.52 | 0.45 | 0.26 | 40 | piedra_clara + piedra_oscura |
| costa_roca_baja_mediana | 1.23 | 0.70 | 0.56 | 60 | piedra_clara + piedra_oscura |
| costa_roca_baja_grande | 1.57 | 1.27 | 0.69 | 60 | piedra_clara + piedra_oscura |
| costa_roca_erosionada | 0.83 | 0.91 | 0.86 | 60 | piedra_clara + piedra_oscura |
| costa_roca_con_hendidura | 1.51 | 0.80 | 0.62 | 52 | piedra_clara + piedra_oscura |
| costa_grupo_rocoso | 1.33 | 1.07 | 0.62 | 80 | piedra_clara + piedra_oscura |
| costa_madera_arrasta | 1.74 | 0.33 | 0.45 | 60 | madera |
| costa_madera_arrastre_curva | 1.64 | 0.24 | 0.37 | 80 | madera + piedra_oscura |
| costa_madera_arrastre_raices | 1.37 | 0.68 | 0.26 | 92 | madera + raiz |
| costa_raices_bajas | 0.93 | 1.03 | 0.31 | 132 | raiz |
| costa_raices_entrelazadas | 0.97 | 1.05 | 0.84 | 220 | raiz |
| costa_monticulo_arena | 1.30 | 1.01 | 0.51 | 60 | arena |
| costa_borde_poza | 1.67 | 1.52 | 0.28 | 200 | arena + piedra_clara + piedra_oscura |
| costa_huellas_olas | 0.69 | 1.32 | 0.07 | 48 | arena |
| costa_mata_duna_pequena | 0.38 | 0.32 | 0.17 | 216 | madera |
| costa_mata_duna_grande | 0.75 | 0.72 | 0.26 | 380 | arena + madera |
| costa_conchas_grupo | 0.51 | 0.47 | 0.14 | 120 | concha |
| costa_restos_ramas | 0.66 | 0.47 | 0.04 | 92 | madera + raiz |
| **Total** | | | | **2 052** | 6 materiales, 0 texturas |

## Piezas bloqueantes / no bloqueantes (propuesta para el integrador)

- **No bloqueantes por contrato (14–18):** `costa_huellas_olas`, `costa_mata_duna_pequena`,
  `costa_mata_duna_grande`, `costa_conchas_grupo`, `costa_restos_ramas`. Perfil ≤0,26 m y
  relieve bajo; no ponerles colisión. El validador exige z ≤ 0,40 en estas cinco.
- **Bajas pero volumétricas (criterio del integrador):** `costa_raices_bajas` (0,31),
  `costa_madera_arrastre_raices` (0,26), `costa_madera_arrastre_curva` (0,37). Pueden
  ir sin colisión como obstáculo visual, o con caja de paso si se quieren sólidas.
- **Candidatas bloqueantes:** las seis rocas (hasta 0,86), `costa_madera_arrasta` (0,45),
  `costa_raices_entrelazadas` (0,84), `costa_monticulo_arena` (0,51) y
  `costa_borde_poza` (0,28 de anillo de piedras). El andamio de zancos es hueco por
  debajo: decidir si el personaje pasa entre las patas o choca con el nudo superior.

## Materiales (originales, genéricos, sin imágenes)

`costa_arena` (beige cálido), `costa_piedra_clara` y `costa_piedra_oscura` (misma
familia de valor que `naturaleza_suelo.glb` / `detalle_suelo.glb`), `costa_madera`
(madera de arrastre blanqueada por el sol, más clara que la corteza de los troncos),
`costa_raiz` (cacao oscuro de raíz aérea húmeda) y `costa_concha` (crema de playa
genérico, ya presente en detalle_suelo). Principled con color base y rugosidad,
metálico 0. Cada material lleva prefijo propio `costa_` para no chocar con otros lotes.

## Capturas revisadas (look + lámina)

1. `look` angles de la rejilla viva MCP, en sombreado material — primera pasada.
   Detección: `costa_roca_baja_grande` y `costa_roca_erosionada` leían como bloques
   prismáticos (lajAs de pared vertical) → reconstruidas con icosaedros achatados y
   girados. `costa_mata_duna_*` leían como picos de tienda → hojas rearmadas en tres
   segmentos con arco suave.
2. `look` acercado de rocas, maderas y raíces — confirma siluetas distintas y grieta
   oscura visible en `costa_roca_con_hendidura`.
3. `look` de las cinco piezas 14–18 a ángulo bajo y cenital — verificado el poco
   peralte (huellas y restos casi a nivel, mata grande y conchas ≤0,26).
4. GLB y `.blend` regenerados en `--background` (la sesión viva MCP tiene otros lotes
   abiertos; el export por MCP arrastraba sus objetos seleccionados, así que los
   entregables finales salen sólo de background). Byte-idéntico tras la última
   regeneración: 190 652 B, 18 nodos exactos, VALIDO.
5. `revision.png` final renderizado **desde el GLB re-importado** (no desde la escena
   de trabajo): ¾ etiquetado (3×6), cenital y línea a ras del suelo con las seis
   piezas de orilla juntas a escala de peatón. EEVEE, revisada pieza a pieza.

## Fallos y limitaciones pendientes (honesto)

- Las **hojas de las matas de duna** reutilizan `costa_madera` (el lote no tiene
  material de pasto). Leen como junco seco por color y grosor; si se quisiera verde
  de duna haría falta un séptimo material, lo que rompería el tope de seis (decisión
  de revisión: se prefirió silueta y presupuesto de triángulos).
- `costa_conchas_grupo` son semiesferas achatadas genéricas, no conchas enrolladas:
  a tamaño de mapa leen como pedrería clara de orilla; de cerca son simples.
- `costa_raices_entrelazadas` es la más cara del lote (220 tris) y su lectura de
  andamio depende del grosor de las patas (5,5–6 cm); por debajo de ~120 px de mapa
  las patas pueden parpadear en Babylon. Revisar con el juego abierto antes de
  decidir si hace falta una variante simplificada (fuera de alcance aquí).
- El estilo es facetado (icosaedros subdiv 0/1, tubos de 4–7 lados). Coherente con
  `naturaleza_suelo.glb`; si el integrador aplica smooth por material, ajustar allí.
- El `costa_madera_arrasta` apoya tangente al suelo (cilindro tumbado): su línea de
  contacto es casi una recta; el integrador puede hundirlo 2–3 cm al colocarlo para
  que no parezca rodando.
- No medido en juego (fuera de alcance: «no integrar todavía»). Sin red ni assets
  externos.

## Fila propuesta para PROCEDENCIA.md (sólo si la revisión aprueba mover a `assets/models/`)

> | 2026-11-XX | `assets/models/costa_modular.glb` (18 nodos `costa_<id>`: 6 rocas, 3 maderas de arrastre, 2 raíces de manglar, montículo, borde de poza y 5 piezas de decoración) | Geometría y materiales procedurales originales de `work/omp-costa-modular/costa_modular.py` (lote en revisión); Blender 5.2 por MCP | FrankmanGames + agente local OMP | Propia del proyecto | Catálogo de escenario costero (playa, costa rocosa, estero, borde de manglar): rocas bajas en tres tallas, erosionada y partida, grupo rocoso; madera de arrastre recta, curva y con raíces; zarpas bajas y andamio de zancos; montículo de arena y cerco de piedras de poza (sin agua); huellas de olas, matas de duna, conchas y restos de ramas como decoración no bloqueante. 2 052 triángulos, seis materiales planos sin texturas ni archivos externos. Formas fantásticas genéricas, no especies, playas ni lugares reales |
