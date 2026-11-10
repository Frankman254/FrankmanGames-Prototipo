# REPORTE — Detalle de suelo no bloqueante (lote 02, Panamá) — para revisión humana

Estado: **preparado para revisión, NO integrado**. Nada en `assets/models/`, sin
registro en `PROCEDENCIA.md`, sin tocar mapa ni juego, sin commit. Todo en
`work/omp-detalle-suelo/` (carpeta ignorada por Git).
Fecha: 2026-11-09. Herramienta: Blender 5.2.3 LTS vía MCP (addon 1.8, protocolo
15/15 confirmado antes de empezar). Clean-room: primitivas y materiales propios,
sin `generate_3d`/`search_assets`/`import_asset`, sin `read_factory_settings` ni
`fg.reset()` en la sesión del usuario.

## Concepto: no bloqueante

- Ninguna pieza supera **0,13 m** de alto (todas ≤ 0,08 salvo la madera de
  arrastre larga, 0,13). Pasables por diseño: el integrador NO debe ponerles
  colisión; no estorban combates ni movimiento.
- Sin planos perfectamente coplanares con el suelo: cada hoja y concha es un
  sólido de bajo relieve (dos contornos unidos) inclinado 0,1–0,5 rad, con el
  borde de apoyo en z≈0,004–0,014 — entre 0,4 y 2 cm de peralte propio más la
  inclinación. Los guijarros y semillas son semiesferas semienterradas.
- Origen de cada nodo en (0,0,0) y malla apoyada en z=0 (mín-z 0.000 en los 18,
  medido sobre el GLB re-importado). +Z arriba, metros reales. En las seis piezas
  planas muestreadas en el GLB (z de vértice, dos hojarascas, hojas grandes,
  conchas pequeñas, semillas, una rama) la mediana de altura va de 1,9 cm a
  4,1 cm y el máximo de 3,0 a 7,7 cm: el contacto con z=0 es sólo el borde de
  apoyo, nunca una cara. El resto (raíces, madera, piedritas) es volumétrico por
  construcción (tubos y semiesferas).

## Archivos

| Archivo | Qué es |
|---|---|
| `detalle_suelo.py` | Generador reproducible (MCP o `blender --background --python`); autovalida 250/nodo, 4000 total, apoyo, altura ≤0,20 |
| `detalle_suelo.blend` | Copia editable (`copy=True`; la sesión del usuario no quedó ligada) |
| `detalle_suelo.glb` | Catálogo exportado, 18 nodos, 199 736 bytes |
| `revision.png` | Lámina renderizada **desde el GLB re-importado**, cámara ¾ ortogonal sobre tierra media |
| `hacer_revision.py` | Script de la lámina (eleva el detalle ×1,9 para lectura visual; la nota está en el script) |

## Presupuesto (verificado en el GLB re-importado)

Máximo por nodo 240 (límite 250); total **2 310** (límite 4 000).

| Nodo | X | Y | Z (m) | Triángulos | Materiales |
|---|---:|---:|---:|---:|---|
| rama_corta | 0.35 | 0.13 | 0.06 | 48 | corteza |
| rama_larga | 0.62 | 0.24 | 0.07 | 92 | corteza |
| rama_bifurcada | 0.38 | 0.21 | 0.09 | 52 | corteza |
| rama_con_hojas | 0.37 | 0.17 | 0.06 | 112 | corteza_clara + hoja + hoja_clara + seco |
| raices_bajas | 0.34 | 0.30 | 0.07 | 132 | corteza |
| raices_serpenteantes | 0.61 | 0.40 | 0.06 | 240 | corteza |
| hojarasca_redonda | 0.30 | 0.28 | 0.03 | 216 | seco + seco_oscuro |
| hojarasca_alargada | 0.32 | 0.29 | 0.06 | 100 | seco + seco_oscuro |
| hojarasca_dispersa | 0.75 | 0.68 | 0.08 | 200 | seco + seco_oscuro |
| piedritas_claras | 0.63 | 0.42 | 0.07 | 120 | piedra_clara + concha (1) |
| piedritas_oscuras | 0.63 | 0.42 | 0.07 | 120 | piedra_oscura |
| piedritas_mixtas | 0.59 | 0.48 | 0.06 | 164 | piedra_clara + piedra_oscura |
| madera_arrastre_corta | 0.33 | 0.13 | 0.09 | 51 | seco + madera (tapa) |
| madera_arrastre_larga | 0.60 | 0.19 | 0.13 | 115 | seco + corteza + madera (tapa) |
| conchas_pequenas | 0.24 | 0.20 | 0.04 | 96 | concha + piedra_clara |
| conchas_grupo | 0.30 | 0.23 | 0.07 | 140 | concha + piedra_clara |
| semillas_caidas | 0.24 | 0.18 | 0.04 | 192 | seco + corteza_clara + corteza (rabitos) |
| hojas_grandes_caidas | 0.49 | 0.55 | 0.08 | 120 | seco + seco_oscuro |
| **Total** | | | | **2 310** | 9 materiales, 0 texturas |

## Materiales (originales, genéricos, sin imágenes)

Reutilizan la paleta exacta de `naturaleza_modular.glb` / `naturaleza_suelo.glb`
con prefijo propio: `detalle_hoja`, `detalle_hoja_clara`, `detalle_seco`,
`detalle_seco_oscuro` (nuevo: hoja muy marchita, cacao oscuro), `detalle_corteza`,
`detalle_corteza_clara`, `detalle_piedra_clara`, `detalle_piedra_oscura`,
`detalle_madera`, `detalle_concha` (nuevo: crema de playa genérico). Principled
con color base y rugosidad; metálico 0.

## Capturas revisadas (look)

1. ¾ de la rejilla completa — primera pasada; detecta hojarasca con hojas verdes
   (deben ser marchitas) y centro con hueco.
2. Cenital de la rejilla — mismo hallazgo; confirma distribuciones sin patrones.
3. Altura baja (dir [0,-1,0.06] y [0,-1,0.08] y [0,-1,0.12]) sobre ramas, hojarasca,
   madera, conchas y semillas — comprueba peralte y lectura contra fondo medio.
4. Correcciones aplicadas: hojarasca y hojas grandes 100 % secas (el verde queda
   sólo en `rama_con_hojas`, rama fresca); 9.ª hoja cierra el hueco central de
   `hojarasca_redonda`; gajo amarillo de piedritas → crema de concha; tercera raíz
   serpeante a 4 lados y nudo subdiv 0 para entrar en 250.
5. Regeneración final + GLB + .blend; `revision.png` desde el GLB re-importado,
   revisada pieza a pieza con etiqueta.

## Fallos y limitaciones pendientes (honesto)

- `revision.png` eleva el Z ×1,9 para poder leer siluetas planas en ortogonal:
  **la lámina exagera el volumen real**; las medidas de la tabla son las del GLB,
  no las de la imagen.
- `semillas_caidas` (frutos de 3,4–4,4 cm con rabito de 3 mm) es lo más fino del
  lote: a cámara de juego puede parpadear; candidate a escalar ×1,4 en integración
  o a no instanciarse en zonas de mucha densidad.
- `piedritas_oscuras` contra tierra oscura de mapa de zona seca puede desaparecer;
  el integrador debe alternar claras/oscuras según el sustrato.
- Las conchas son para orilla/muelle; si la zona no es costera, no instanciar.
- El `seco_oscuro` es el único color nuevo del lote (no existe en modular/suelo);
  si se quisiera paleta cerrada, sustituirlo por `seco` con variación de valor.
- Sin medición en juego (fuera de alcance).

## Texto para PROCEDENCIA.md (sólo si la revisión aprueba mover a `assets/models/`)

> | 2026-11-XX | `assets/models/detalle_suelo.glb` (18 nodos: ramas, raíces, hojarasca, piedritas, madera de arrastre, conchas, semillas y hojas caídas) | Geometría y materiales procedurales originales de `work/omp-detalle-suelo/detalle_suelo.py` (lote en revisión); Blender 5.2 por MCP | FrankmanGames | Propia del proyecto | Detalle de suelo NO bloqueante para Panamá: todo por debajo de 0,13 m y sin colisión; 2 310 triángulos, nueve materiales planos compartiendo paleta con `naturaleza_modular.glb` y `naturaleza_suelo.glb`; sin texturas ni archivos externos. Formas genéricas, no especies ni lugares reales |
