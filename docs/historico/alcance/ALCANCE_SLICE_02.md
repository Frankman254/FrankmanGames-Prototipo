# Slice 02 — Mundo visual (local, con GPU)

**Estado:** autorizado por el creador el 2026-10-29 ("puedes poner al otro
agente a seguir") · **Dónde:** PC del creador, rama `slice02-mundo-visual`
**Objetivo:** que el prototipo deje de ser cápsulas grises y se lea como un
mundo 3D continuo, sin tocar la lógica de combate que se está haciendo en la nube.

## Convivencia con la nube

Una sesión en la nube hace los pasos 4–6 del Slice 01 en la rama
`slice01-pasos-4-6` (IA de enemigos, combate, habilidades, HUD de habilidades,
victoria/muerte, `data/` de enemigos y jugador). En este slice:

- **No tocar** `src/sim/` salvo lo mínimo para registrar obstáculos en la
  rejilla de colisión, ni el HUD de habilidades, ni `data/` de enemigos/jugador.
- Los enemigos siguen siendo cápsulas hasta que se una la rama de la nube.
- Orden de unión previsto: primero `slice01-pasos-4-6` → `master`, después esta rama.

## Recursos: sólo CC0, anotados antes de entrar

- Fuentes permitidas: **Quaternius** (personajes animados glTF), **Kenney**
  (naturaleza, pueblo), **Poly Haven** (texturas PBR, cielos HDRI).
- Nada de FATE, DOFUS ni del video de IKARY: sólo referencia de sensación.
- Antes de descargar, pedir permiso al creador indicando archivo, origen y
  tamaño. Cada recurso va a `assets/<origen>/` y a `PROCEDENCIA.md` (autor,
  licencia, URL) antes del commit.
- Formato: glTF/GLB para modelos; texturas comprimidas razonables (≤ 2K).

## Pasos (commit + push por paso)

1. **Pipeline de assets.** Cargador glTF/GLB con caché, manifiesto
   `data/assets.json` (id → archivo), y un test que falle si un archivo de
   `assets/` no figura en `PROCEDENCIA.md`.
2. **Terreno.** Zona continua mayor que la arena (propuesta 256×256 m) con
   *heightmap* + *splatmap* mezclando hierba, tierra y camino en mosaico.
   La simulación sigue en la rejilla XZ; la altura es visual y se usa para
   apoyar a los personajes en el suelo.
3. **Vegetación y props.** Dispersión con semilla de árboles, arbustos, rocas y
   flores con *thin instances*; hojas con recorte alfa y balanceo de viento por
   shader. Los obstáculos grandes (rocas, casas, troncos) se declaran en datos y
   se marcan en la rejilla de colisión para el A*.
4. **Luz y atmósfera.** Ciclo día/noche (sol direccional, ambiente, niebla y
   cielo) con duración en datos; luces puntuales limitadas (farolas y una luz
   que lleva el jugador de noche); sombras del sol con alcance acotado.
5. **Personaje animado.** Sustituir la cápsula del jugador por un modelo CC0
   animado (reposo, correr, atacar, morir) con mezcla entre animaciones.
   Eventos por fotograma en datos (`footstep`, `hit`, `cast`) que el render
   emite a la simulación; idea tomada del concepto de FATE, no de sus archivos.
6. **Medición.** Repetir la prueba de carga con el mundo visual en Electron a
   1080p: FPS medio y p95, coste de render y draw calls. Objetivo ≥ 60 FPS.

## Fuera de este slice

Arte propio definitivo, sonido y música, interfaz final, modelos de enemigos,
efectos de hechizos, generación procedural de zonas, red.

## Terminado cuando

- Se puede caminar con clic por la zona, de día y de noche, entre vegetación
  que bloquea el paso donde debe.
- El jugador está animado y sus pasos coinciden con el evento `footstep`.
- `npm test` en verde; `PROCEDENCIA.md` cubre todo `assets/`.
- Medición anotada en `docs/BITACORA.md` y handoff en `docs/HANDOFF_SLICE_02.md`.
