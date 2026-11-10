# REPORTE — Caminos rurales (lote 02, Panamá) — para revisión humana

Estado: **preparado para revisión, NO integrado**. Nada se copió a `assets/models/`,
no se registró en `PROCEDENCIA.md`, no se tocó el mapa ni el juego, no hay commit.
Todo vive en `work/omp-caminos-rurales/` (carpeta ignorada por Git).
Fecha: 2026-11-09. Herramienta: Blender 5.2.3 LTS vía MCP (addon 1.8, protocolo 15/15).
Método: geometría y materiales desde cero con primitivas (`fg.Builder` de
`scripts/blender/fg.py`). Sin `generate_3d`, sin `search_assets`, sin `import_asset`,
sin `read_factory_settings` ni `fg.reset()` en la sesión del usuario. Clean-room:
no se leyeron ni copiaron assets de Dofus/FATE.

## Archivos

| Archivo | Qué es |
|---|---|
| `caminos_rurales.py` | Generador reproducible (`blender --background --python`) |
| `caminos_rurales.blend` | Copia editable guardada con `copy=True` (la sesión del usuario no quedó ligada a él) |
| `caminos_rurales.glb` | Catálogo exportado: 18 nodos, 215 920 bytes; cada nodo con origen en (0,0,0) y apoyo en z=0 |
| `validar_caminos_rurales.py` | Validador del GLB re-importado: IDs exactos, apoyo, límites por nodo y ensamblado (costuras 2m/4m/esquina) |
| `revision.png` | Lámina final: ¾ etiquetado + cenital + línea ensamblada a altura de jinete, renderizada **desde el GLB re-importado** |
| `revision_trescuartos.png`, `revision_cenital.png`, `revision_baja.png` | Las tres tomas sueltas |
| `hacer_revision.py` | Script que genera la lámina (patrón de `revisar_naturaleza_modular.py`) |
| `dimensiones.json` | Volcado de dimensiones/triángulos/materiales del GLB para esta tabla |

## Contrato cumplido

- +Z arriba, origen de cada nodo en (0,0,0) y la malla apoyada en z=0 (mínimo z = 0.000
  en los 18 nodos, medido sobre el GLB re-importado).
- Escala en metros reales (la cerca de 2 m mide 2.00 m, el puente de 4 m mide 4.00 m;
  `validar_caminos_rurales.py` lo exige).
- Triángulos: máx. por nodo 244 (`camino_alcantarilla_piedra`; límite 600);
  total 2 406 (límite 7 000). `assert` en el generador y comprobado de nuevo en el GLB.
- Siluetas: cada pieza tiene su propia construcción; los módulos de cerca comparten
  lenguaje a propósito (familia ensamblable) pero la esquina es un L con poste
  cuadrado, la rota tiene listón caído y despostillado, y los portones cerrado/abierto
  difieren en hoja y pestillo.
- Ensamblado sin huecos: verificado por el validador (costuras de 2m+2m+4m+esquina
  dentro de tolerancia) y visualmente en la vista baja de la lámina.

## Tabla por nodo (dimensión X × Y × Z en metros, desde el GLB)

| Nodo | X | Y | Z | Triángulos | Materiales usados |
|---|---:|---:|---:|---:|---|
| camino_cerca_2m | 2.00 | 0.09 | 1.00 | 48 | madera |
| camino_cerca_4m | 4.00 | 0.10 | 1.05 | 60 | madera + madera_oscura |
| camino_cerca_esquina | 1.05 | 1.07 | 1.12 | 90 | madera |
| camino_cerca_rota | 2.27 | 0.30 | 1.03 | 80 | madera + madera_oscura + tierra |
| camino_porton_cerrado | 2.12 | 0.16 | 1.49 | 212 | madera + madera_oscura + hierro |
| camino_porton_abierto | 2.57 | 1.03 | 1.49 | 180 | madera + madera_oscura |
| camino_poste_simple | 0.34 | 0.34 | 1.66 | 50 | madera + cuerda + piedra_oscura |
| camino_letrero_doble | 1.23 | 0.40 | 2.34 | 158 | madera_oscura + madera_clara + madera + hierro + piedra_oscura |
| camino_mojon_piedra | 0.84 | 0.84 | 0.52 | 68 | piedra_clara + piedra_oscura + musgo |
| camino_puente_tablas_2m | 2.00 | 0.93 | 0.11 | 84 | madera + madera_clara + madera_oscura |
| camino_puente_tablas_4m | 4.00 | 0.93 | 0.64 | 228 | madera + madera_clara + madera_oscura |
| camino_alcantarilla_piedra | 1.68 | 1.32 | 0.61 | 244 | piedra_clara + piedra_oscura + tierra |
| camino_escalones_tierra | 1.57 | 1.46 | 0.55 | 192 | piedra_clara + piedra_oscura + tierra |
| camino_banco_rustico | 1.40 | 0.33 | 0.52 | 60 | madera + madera_clara + madera_oscura + piedra_oscura |
| camino_abrevadero | 1.14 | 1.12 | 0.36 | 140 | piedra_clara + piedra_oscura + tierra + agua |
| camino_carretilla | 1.05 | 0.62 | 0.62 | 176 | madera + madera_clara + madera_oscura + hierro + tierra |
| camino_pila_madera | 1.05 | 0.78 | 1.02 | 168 | 7 (maderas, cuerda, hierro, piedra_oscura, agua) |
| camino_barrera_caida | 1.63 | 0.74 | 0.81 | 168 | madera_clara + madera_oscura + tierra |
| **Total** | | | | **2 406** | 10 materiales, 0 texturas |

## Materiales (originales, genéricos, sin imágenes)

`camino_madera` (cacao medio), `camino_madera_clara`, `camino_madera_oscura`,
`camino_piedra_clara`, `camino_piedra_oscura`, `camino_cuerda`, `camino_hierro`
(único con metálico 0.25), `camino_musgo`, `camino_tierra`, `camino_agua`
(rugosidad 0.3, opaco por presupuesto — ver limitaciones). Paleta coherente con
`naturaleza_modular.glb`, `naturaleza_suelo.glb` y `utileria.glb`; cada uno es un
Principled con color base y rugosidad, sin mapas.

## Capturas revisadas

1. `look` ¾ y cenital del conjunto en rejilla (escena viva MCP) — silueta y lectura
   de cada familia.
2. `look` de la línea ensamblada cerca 2m+2m+4m+esquina+2m + rota — costuras sin
   hueco ni solape; esquina en L correcta.
3. `look` a altura baja de portones, letrero, mojón, alcantarilla, escalones, poste
   y banco — detección: hojas del portón dejaban ~10 cm de luz central → se
   ensancharon a 1.0 m y se regeneró el GLB.
4. Regeneración limpia en segundo plano (el GLB intermedio quedó contaminado por
   objetos de otro lote seleccionados en la sesión viva; rehecho con
   `--background`: 215 920 B, 18 nodos exactos, VALIDO).
5. `revision.png` final renderizado **desde el GLB re-importado** (no desde la escena
   de trabajo): tres vistas etiquetadas, EEVEE, revisadas pieza a pieza. Corrección
   intermedia: `add_cam` no asignaba `location` a la cámara y las tomas salían
   vacías/recortadas; encuadres reajustados hasta ver las 18 piezas completas.

## Fallos y limitaciones pendientes (honesto)

- `camino_agua` es opaco (sin alpha) para no abrir la discusión de blendidos en
  glTF; el abrevadero y la pilona leen por color turquesa enrasado. Si se quiere
  agua translúcida, añadir `blendMode` en el exportador (decisión de revisión).
- La cuerda del poste y de la pilona es geometría de segmento recto con holgura,
  no catenaria; a tamaño de juego lee bien pero de cerca es poligonal.
- `camino_cerca_rota` no encaja con la línea: es intentional (hueco narrativo),
  pero el integrador NO debe usarla como módulo contiguo; los ensambles son
  2m/4m/esquina (+ portón).
- Los travesaños de las cercas miden 0.06 m de sección; por debajo de 100 px de
  mapa pueden parpadear en Babylon — revisar con el juego abierto antes de
  decidir LOD (fuera de alcance aquí).
- El mojón y las escaleras reutilizan piedra_clara/oscura/tierra del lenguaje de
  naturaleza_suelo; si el coordinador pide diferenciación por lote, hace falta
  paleta propia (decisión de revisión).
- No medido en juego (fuera de alcance: «preparar para revisión, no integrar»).

## Texto para PROCEDENCIA.md (sólo si la revisión aprueba mover a `assets/models/`)

> | 2026-11-XX | `assets/models/caminos_rurales.glb` (18 nodos: cercas/portones, señalética, pasos de agua, aperos) | Geometría y materiales procedurales originales de `work/omp-caminos-rurales/caminos_rurales.py` (lote en revisión); Blender 5.2 por MCP | FrankmanGames | Propia del proyecto | Utilería de caminos para Panamá: cerca modular 2m/4m/esquina y rota, portón cerrado/abierto, poste y letrero doble, mojón, puentes de tablas 2m/4m, alcantarilla, escalones, banco, abrevadero, carretilla, pila de madera y barrera caída. 2 406 triángulos, diez materiales planos sin texturas ni archivos externos. Formas genéricas de finca, sin marcas ni lugares reales |
