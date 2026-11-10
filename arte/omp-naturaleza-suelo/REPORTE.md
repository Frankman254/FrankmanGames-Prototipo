# REPORTE — Naturaleza suelo (lote 01, Panamá) — para revisión humana

Estado: **preparado para revisión, NO integrado**. Nada se copió a `assets/models/`,
no se registró en `PROCEDENCIA.md`, no se tocó el mapa ni el juego, no hay commit.
Todo vive en `work/omp-naturaleza-suelo/` (carpeta ignorada por Git).
Fecha: 2026-11-09. Herramienta: Blender 5.2.3 LTS vía MCP (addon 1.8, protocolo 15/15).
Método: geometría y materiales desde cero con primitivas (`fg.Builder` de
`scripts/blender/fg.py` reutilizado como ayuda de build). Sin `generate_3d`,
sin `search_assets`, sin `import_asset`, sin `read_factory_settings` ni `fg.reset()`
en la sesión del usuario. Clean-room: no se leyeron ni copiaron assets de Dofus/FATE.

## Archivos

| Archivo | Qué es |
|---|---|
| `naturaleza_suelo.py` | Generador reproducible (re-ejecutable por MCP o `blender --background --python`) |
| `naturaleza_suelo.blend` | Copia editable guardada con `copy=True` (la sesión del usuario no quedó ligada a él) |
| `naturaleza_suelo.glb` | Catálogo exportado: 18 nodos, 130 388 bytes; cada nodo con origen en (0,0,0) y apoyo en z=0 |
| `revision.png` | Lámina de contacto renderizada desde el GLB re-importado, cámara ¾ ortogonal |
| `hacer_revision.py` | Script que genera la lámina (patrón de `revisar_naturaleza_modular.py`) |
| `dimensiones.py` | Volcado de dimensiones/triángulos del GLB para esta tabla |

Nota: el encargo listaba `work/omelo/naturaleza_suelo.glb`; interpretado como errata
de `work/omp-naturaleza-suelo/naturaleza_suelo.glb` (ruta usada por los entregables).

## Contrato cumplido

- +Z arriba, origen de cada nodo en (0,0,0) y la malla apoyada en z=0 (mínimo z = 0.000
  en los 18 nodos, medido sobre el GLB re-importado).
- Escala en metros reales.
- Triángulos: máx. roca individual 80 (límite 350); máx. tronco/tocón 163 (límite 500);
  total 1 320 (límite 6 000). Asumidos por `assert` en el generador y comprobados
  de nuevo en el GLB.
- Siluetas: cada talla tiene su propia construcción (nudo/ligera distinto en redondas;
  giro de corona e inclinación de punta en puntiagudas; laja / losa con lasca / losa
  escalonada en planas), no la misma malla escalada.

## Tabla por nodo (dimensión X × Y × Z en metros, desde el GLB)

| Nodo | X | Y | Z | Triángulos | Materiales usados |
|---|---:|---:|---:|---:|---|
| roca_redonda_pequena | 0.61 | 0.51 | 0.48 | 40 | piedra_clara |
| roca_redonda_mediana | 1.15 | 0.88 | 0.88 | 40 | piedra_clara |
| roca_redonda_grande | 2.00 | 1.43 | 1.44 | 40 | piedra_clara |
| roca_puntiaguda_pequena | 0.35 | 0.32 | 0.53 | 44 | piedra_oscura |
| roca_puntiaguda_mediana | 0.58 | 0.56 | 0.91 | 44 | piedra_oscura |
| roca_puntiaguda_grande | 0.84 | 0.80 | 1.25 | 44 | piedra_oscura |
| roca_plana_pequena | 0.93 | 0.75 | 0.14 | 32 | piedra_clara |
| roca_plana_mediana | 1.54 | 1.19 | 0.26 | 44 | piedra_clara + piedra_oscura |
| roca_plana_grande | 2.41 | 1.79 | 0.39 | 56 | piedra_clara + piedra_oscura |
| roca_partida | 1.39 | 0.90 | 0.46 | 72 | piedra_oscura + piedra_clara (cara fresca) |
| roca_musgosa | 1.34 | 0.99 | 1.04 | 80 | piedra_oscura + musgo |
| grupo_rocas_bajo | 1.56 | 0.86 | 0.77 | 80 | piedra_oscura + piedra_clara |
| tronco_recto | 1.94 | 0.70 | 0.62 | 104 | corteza + madera |
| tronco_curvo | 2.06 | 0.57 | 0.69 | 163 | corteza + madera |
| tronco_hueco | 1.77 | 0.55 | 0.54 | 108 | corteza + madera + piedra_oscura (interior) |
| tronco_musgoso | 1.62 | 0.50 | 0.53 | 146 | corteza + corteza_clara (setas) + musgo + madera |
| tocon_bajo | 0.69 | 0.63 | 0.45 | 68 | corteza + madera (tapa) + piedra_oscura (grieta) |
| tocon_raices | 1.08 | 1.08 | 0.65 | 115 | corteza + madera (tapa) |
| **Total** | | | | **1 320** | 6 materiales, 0 texturas |

## Materiales (originales, genéricos, sin imágenes)

`suelo_piedra_clara`, `suelo_piedra_oscura`, `suelo_corteza`, `suelo_corteza_clara`,
`suelo_musgo`, `suelo_madera`. Paleta coherente con `naturaleza_modular.glb`
(piedras gris claro/oscuras, corteza cacao, musgo verde profundo); cada uno es un
Principled con color base y rugosidad, sin mapas, metálico 0.

## Capturas revisadas

1. `look` angles (¾, frente, cenital) del conjunto apilado en origen — primera pasada.
2. `look` de rejilla con las 18 separadas — detección: roca_partida leía como dos
   cubos, grieta del tocon_bajo flotaba, musgo del tronco_musgoso como balsa.
3. `look` aislado de roca_partida, tocon_bajo, tronco_hueco — verificado el fix
   (mitades redondeadas con cara fresca; grieta enrasada; hueco y anillo oscuros visibles).
4. Regeneración con musgo de roca_musgosa asomando; GLB y .blend re-escritos.
5. `revision.png` final renderizado **desde el GLB re-importado** (no desde la escena
   de trabajo): 18 nodos con etiqueta, cámara ¾ ortogonal, EEVEE. Revisada pieza a pieza.

## Fallos y limitaciones pendientes (honesto)

- El hueco de `tronco_hueco` sólo lee bien mirando la boca (+X); de perfil es un
  extremo plano. Aceptable para escenario, pero el integrador debería girarlo al
  colocarlo cerca de caminos.
- `tocon_bajo` lleva la tapa como abanico de triángulos sin anillos concéntricos
  (presupuesto bajo); la lectura de «corte» depende de la tapa clara.
- Las tres rocas planas comparten lenguaje de losa: se distinguen por talla y
  añadidos (lasca/escalon), no por una silueta radicalmente distinta a 24 px de mapa.
- El estilo es facetado (normales planas implícitas en GLB sin smooth). En Babylon
  se verá igual que `naturaleza_modular.glb`; si el integrador usa smooth por
  material, ajustar allí, no aquí.
- La grieta del tocón y el interior del hueco reutilizan `suelo_piedra_oscura` por
  economía de materiales; si se quisiera carbón/madera quemada propia, hace falta
  un séptimo material (decisión de revisión).
- No medido en juego (fuera de alcance: «no integrar todavía»).

## Texto para PROCEDENCIA.md (sólo si la revisión aprueba mover a `assets/models/`)

> | 2026-11-XX | `assets/models/naturaleza_suelo.glb` (18 nodos: 12 rocas, 4 troncos, 2 tocones) | Geometría y materiales procedurales originales de `work/omp-naturaleza-suelo/naturaleza_suelo.py` (lote en revisión); Blender 5.2 por MCP | FrankmanGames | Propia del proyecto | Catálogo de suelo para Panamá: rocas redondas/puntiagudas/planas en tres tallas, partida, musgosa y grupo bajo; troncos recto, curvo, hueco y musgoso; tocones bajo y con raíces. 1 320 triángulos, seis materiales planos sin texturas ni archivos externos. Formas genéricas, no especies ni lugares reales |
