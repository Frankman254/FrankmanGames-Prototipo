# REPORTE — Corrección de animación del cazador (anime), 2026-11-12

Integrado el 2026-11-12: los `*_fix.glb` sustituyen a `assets/models/cazador_anime.glb`
y `cazador_f_anime.glb` (v2); el pipeline canónico es
`scripts/blender/cazador_anime_fix.py` (etapa de post-proceso tras
`heroe_anime.py`; idempotente, verificado); el contrato lo revisa
`python3 scripts/blender/validar_cazador_anime.py` (exit 0). Registro en
`PROCEDENCIA.md`; `.blend` de referencia en `arte/blender/`.
Esta carpeta conserva la evidencia de la ronda de sandbox.

## Alcance

Partes de los GLB publicados el 2026-11-09 (`cazador_anime.glb`, M, y
`cazador_f_anime.glb`, F, copiados aquí como fuentes de referencia). Corre:

1. **Disparar ilegible**: la mano derecha (cuerda) se alejaba de la cara
   durante la tracción (manoR→cabeza 49→59 cm M, 40→51 cm F; el ancla correcta
   es ~30 cm, en la barbilla). Reescrito con IK de cadena hombro→codo→muñeca
   horneada por fotograma: muñeca L a la empuñadura del arco, muñeca R a la
   muesca (media→plena→suelta).
2. **Lanzar ilegible**: recorrido de la mano derecha de sólo 35 cm (f6→f13).
   Reescrito con IK: carga detrás de la nuca, suelta por delante, izquierda
   apunta. Recorrido corregido: 64.9 cm (M), 69.6 cm (F).
3. **Fotograma final** de ambos clips = pose neutra de Reposo: transición
   limpia al volver.

## El "derrape de pies" no existía (hallazgo)

El informe preliminar medía 14–21 cm/f de derrape en Caminar/Correr. Al
reproducirlo con `diagnostico.py` sobre el GLB **original**: los pilotos son
**walk-in-place** — `hips` no avanza nada (avance neto del bucle 0.5–0.8 cm) y,
mientras la suela está a nivel, la puntera no se mueve **0.0 cm/f**. El
desplazamiento que contaba como derrape es el barrido de la puntera/talón en
las transiciones talón→puntera (la rótula pivotando), que es anatomía correcta
del paso. Intentos de "arreglarlo" clavando el punto más bajo **creaban**
deslizamientos de 40–59 cm y saltos de cadera; se han descartado.

`fix_slide` (en `cazador_fix.py`) queda como red de seguridad honesta: mide sólo
desplazamiento con la suela a nivel y **no toca** clips por debajo de 2 cm/f
(ambos pilotos salen `ok`); sólo corregiría clips que deslicen de verdad.
Conclusión operativa: el motor debe mover al personaje con *root motion*
(velocidad de clip ~3.3 m/s), porque el clip en sí va en sitio.

## Verificación

- `python3 scripts/blender/validar_cazador_anime.py` — contrato de la entrega; **exit 0 en ambos
  fix GLB**: 17 clips exactos, sin duplicados; skin de 16 joints intacto (sin
  clavículas nuevas); marcha en sitio con derrape plano 0.0 cm/f; ancla
  Disparar 31.0/32.6 cm (M) y 31.7/31.4 cm (F) dentro de [15, 45]; cierre de
  bucle Disparar 0.0 cm; recorrido Lanzar > 60 cm; duraciones y keyframes
  sanos (sin NaN) en los 17 clips. Sobre el original **falla** exactamente en
  los defectos (53.4/58.0 cm de ancla; Lanzar 35.5 cm) — el validador
  discrimina, no aprueba cualquier cosa.
- Residuos IK en cocción (distancia muñeca→objetivo, reportada por el fix):
  Disparar 0.0 cm (M/F); Lanzar 1.3 cm (M), 4.8 cm (F — brazos más cortos; el
  objetivo de carga queda al borde del alcance 0.44 m, visible en vídeo como
  pose correcta).
- Revisión visual MCP (`look`): tira de fotogramas y ángulos ¾/frontal de
  Disparar, Lanzar y Caminar en M y F → `revision.png` (8 paneles: fila sup.
  M Disparar f15/f17, Lanzar f6/f13; fila inf. F igual).
- Vídeo: `vid/{M,F}_{Caminar,Correr,Disparar,Lanzar}.mp4` (448², 24 fps, dos
  vueltas del ciclo, EEVEE).

## Entregables (rutas canónicas tras la integración)

| Archivo | Contenido |
|---|---|
| `assets/models/cazador_anime.glb` / `cazador_f_anime.glb` | 17 clips, animación corregida (v2) |
| `arte/blender/cazador_anime_fix.blend` / `cazador_f_anime_fix.blend` | escenas de trabajo |
| `scripts/blender/cazador_anime_fix.py` | fix reproducible (import → slide-check → IK → reexport) |
| `scripts/blender/diagnostico.py` / `validar_cazador_anime.py` | medición y contrato |
| `arte/omp-cazador-animacion/vid/*.mp4`, `revision.png` | revisión humana |

## Incertidumbres / pendiente para el coordinador

1. **Arco ausente en el GLB**: el personaje se vende sin arma (el arco vive en
   `equipo`/`items.json`). Las manos anclan a posiciones del arco montado; la
   lectura final de "mano en la cuerda" debe confirmarse **en juego con el arco
   equipado**, ajustando `GRIP/NOCK_*` del script si el prop difiere.
2. El F no tiene malla `Ojos` (diferencia de la fuente original, no creada
   aquí).
3. El fix **no** re-graba `Atacar` (se conservó del original: ya era legible).
4. Ninguna decisión creativa tomada: sólo rig y animación del prototipo anime.

## Procedencia

Ya registrada en `PROCEDENCIA.md` (fila 2026-11-12, cazador anime v2): regrabación
propia de «Disparar» y «Lanzar» con IK horneada, derivada de la v1 (2026-11-09),
sin fuente externa.
