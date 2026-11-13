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

---

## Addendum 2026-11-13 (ronda OMP, prompt 5 / O6)

Esta ronda rehizo el trabajo como **pipeline reproducible por configuración**
en `scripts/` + `config/` de esta carpeta (no en `scripts/blender/`), y
comprobó lo que faltaba del encargo original (O6). **No se integró nada nuevo
en `assets/models/`**: la v2 publicada sigue vigente y correcta. Rutas de
evidencia en `work/omp-cazador-animacion/` (sandbox NO versionado; los scripts
y configs canónicos viven aquí).

### Pipeline por configuración (M y F corren idénticos por datos)

`python3 scripts/run_pipeline.py -- config/cazador_m.json` (y `_f`). Etapas
separas en módulos (`rig_mapping`, `locomotion`, `bow_animation`,
`casting_animation`) compartidas por ambos riggers; los blancos de arco
(`GRIP/NOCK_*/RELEASE/POLE_*`), los del lanzamiento y los fotogramas de evento
viven en el JSON, no hardcodeados. `fps` añadido a ambas configs y al template.

### Regresión demostrada (Disparar/Lanzar por config)

Al reconstruir `--bow --cast` desde el config sobre la v2 de entrada, el
residuo IK mano↔cuerda reproduce la entrega v2 **exacta**: `19.6 / 33.0 / 19.6 cm`
y validador en `31.0/32.6` (M), `31.7/31.4` (F), cierre de bucle `0.0`. El
refactor no cambió el resultado verificado.

### Locomoción: el re-bake v3 se RECHAZA (no integrado)

Intento de clavar el pie con IK horneada global. El pin local es exacto
(`ik_err 0.0`, pin reproyectado `0.0 cm` en ambos rigs), PERO el validador
del contrato (métrica autorizada, no la del sandbox) lo rechaza:

```
Caminar: hips avanza 11.6 cm (M) / 8.8 cm (F) en el bucle (debe ir en sitio) → FALLO
```

Esto reproduce la regresión ya documentada arriba: los pilotos son
**walk-in-place** (cadera sin avance, `avance hips` correcto en v2); clavar los
pies a puntos de contacto absolutos convierte el clip en *root motion* y rompe
el cierre de bucle. Arrastre «suelto» medido en la GLB (F v3 22–27 cm/f en
Correr) vs. la v2 integrada (13.7–14.2 cm/f en F) confirma que el bake **peora**
el barrido en las transiciones talón→puntera. Conclusión: **v2 se queda en
producción**; el fix `cazador_anime_fix.py` y su `fix_slide` (umbral 2 cm/f, no
toca clips por debajo) siguen siendo la red de seguridad honesta. La locomoción
se mueve en el runtime con root motion (motor), no en el clip.

### O6-1 · Flecha y arco con un arco REAL equipado (era la Incertidumbre 1)

Montado el nodo `obj_mangrove_bow` de `assets/models/equipo.glb` sobre `handL`
con la transformación que usa el juego (`heldGear.ts`: el arco es `offhand` →
`handL`, sin matriz local = identidad) y leída la pose `Disparar` en el
fotograma de ancla:

- **distancia manoR → cuerda 29,0 cm** — dentro de la banda validada [15, 45]
  y junto a la barbilla. La mano derecha sí llega a la cuerda del arco real.
- El arco real tiene sus brazos a lo largo del **eje local Y** (punta/punta
  ±0,65 m) y el vientre en +Z. Como el modelo mira a −Y, el montaje identidad
  deja los brazos del arco **verticales** (correcto para disparar). La empuñadura
  del arco cae en el origen del nodo = el `handL`, que es donde el IK ancla la
  muñeca izquierda (`GRIP`). Coherente.

Queda sólo la comprobación final en pantalla (Electron/GPU, tarea local), no
bloqueante: el número ya está medido sobre la geometría real.

### O6-2 · Brazos naturales (no pegados a la cadera)

Correlación del avance de muñeca L vs R sobre Caminar = **−0,98** (Correr
−0,63): balanceo alternado opuesto al pie, correcto. Amplitud de muñeca en el
ciclo: Caminar y Correr con recorrido real; Reposo ~1 cm (quieto, intencional).
Ninguna mano queda clavada en la cadera.

### O6-3 · Clavículas: NO se añaden (justificado)

El skin es de 16 *joints* y el validador lo exige intacto. Añadir huesos
auxiliares obligaría a repesar la malla completa y a cambiar el contrato GLTF;
el hombro al apuntar ya lo resuelve el IK de cadena hombro→codo→muñeca con el
pole vector (`POLE_L/R`) del config, visible en las láminas como deltoides
limpio. Coste/beneficio no lo justifica.

### O6-4 · Vista de PERFIL

Añadida: `revision_o6.png` (M y F, Caminar y Correr, en frente / ¾ / **perfil**).

### O6-5 · Notas de transferencia al Centinela y al Oráculo

Mismo esqueleto común (16 joints, `huesos` idénticos en config). Reutilizable
sin cambio: `rig_mapping`, `bow_animation` (sólo si llevan arco — el Centinela
lleva lanza/espada, usa `casting_animation` para sus lanzamientos), la máquina
de estados de clip y el esquema de nombres. Cambia:

- **Centinela**: `Atacar` es tajo/estocada, no tracción; los blancos van en el
  config (`eventos`, `arcos`→`armas`), no en código. Su lanza es `weapon` →
  `handR` (a diferencia del arco, que es `offhand` → `handL`).
- **Oráculo**: `Lanzar` ya existe como bastón (`Arma_baston`); el bastón es
  una mano y no tiene cuerda, así que `bow_animation` no aplica y sólo se usa
  `casting_animation` con objetivos de bastón en el config.
- El `pipeline_core` lee huesos, fps y fotogramas del config: crear un
  `cazador.json`-equivalente (`centinela.json`, `oraculo.json`) es el único
  trabajo para portarlos.

### Entregables de esta ronda (sandbox, sin integrar)

| Archivo | Contenido |
|---|---|
| `scripts/{pipeline_core,locomotion,rig_mapping,bow_animation,casting_animation,run_pipeline}.py` | pipeline reproducible por config |
| `config/cazador_{m,f}.json`, `config/template_character.json` | blancos, huesos, fps, clips |
| `revision_o6.png` | frente / ¾ / **perfil**, M y F, Caminar/Correr |
| `vid/{M,F}_{Caminar,Correr}_v3.mp4` | ciclo completo re-renderizado (EEVEE) |
| `../work/omp-cazador-animacion/comparacion_locomocion.png` | antes/después del intento de bake (rechazado) |

Ninguna decisión creativa tomada: sólo rig, animación y medición del prototipo.
El cazador en juego **no cambia** respecto a la v2 verificada del 2026-11-12.
