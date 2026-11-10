# Auditoría de densidad — cómo repetir el análisis

Trabajo de análisis del 2026-11-09. **No integrado**: no toca `src/`, `data/`,
`docs/`, assets ni Git. Todo lo que produce vive en esta carpeta.

Qué mide: distribución de vegetación y props sólidos, caminos y espacios de
combate del mundo real que pisa la simulación (páginas de 128 m de
`data/terrain.json`, zonas de `data/zones.json`, cuadrícula interna de 16 m),
sin cambiar ninguna posición. Los umbrales de riesgo son **PROPUESTA** de la
auditoría; el balance y la aprobación de cifras siguen siendo humanos.

## Requisitos

- Node 20+ y dependencias del repositorio instaladas (`npm ci`).
- Trabajar desde la raíz del repositorio.

## Ejecutar

```bash
npx vite-node work/omp-auditoria-densidad/analizar_densidad.ts
```

Tarda ~70 s (genera las 117 páginas del mundo y recorre su rejilla de 2 m:
479 232 muestras, cada caminable probada con tres discos de combate). Al
terminar imprime un resumen y escribe:

| Archivo | Contenido |
|---|---|
| `resultados.json` | Todas las mediciones: por página (128 m), por cuadrícula interna (16 m), por zona, caminos (cuellos e invasiones), anclas y los umbrales PROPUESTA usados |
| `mapa_densidad.svg` | Las 117 páginas coloreadas por riesgo; `%` = caminable sobre tierra |
| `REPORTE.md` | Lectura humana de los hechos |

## Determinismo

El analizador no usa azar: las posiciones vienen de la dispersión sembrada de
`src/world/scatter.ts` (semillas fijas en los datos) y de los props del JSON.
Repetir el comando produce `resultados.json` idéntico byte a byte —comprobado
el 2026-11-09 con `cmp` entre dos corridas—. El campo `_inputsSha256` es la
huella SHA-256 de los nueve JSON de entrada listados en `ENTRADAS` dentro de
`analizar_densidad.ts` (también determinista): si un dato cambia, la huella
cambia y hay que volver a correr.

Comprobación rápida:

```bash
npx vite-node work/omp-auditoria-densidad/analizar_densidad.ts > /tmp/paso1.txt 2>&1
cp work/omp-auditoria-densidad/resultados.json /tmp/res1.json
npx vite-node work/omp-auditoria-densidad/analizar_densidad.ts > /tmp/paso2.txt 2>&1
cmp /tmp/res1.json work/omp-auditoria-densidad/resultados.json && echo idéntico
```

## Qué reproduce del juego (y por qué es el suelo real)

- `buildOverworld(loadWorldData())` + `stream.ensure()` de **todas** las
  páginas del mundo: misma `NavGrid` de 0.5 m que verá un jugador que lo
  recorre entero.
- Agua de los estanques de pesca (`data/rpg/fishing.json`) y celdas pintadas
  (`data/navpaint.json`), igual que `buildZoneGrid` al crear el `World`.
- Discos de combate: réplica exacta de `combatSpaceOpen` (dos anillos de 16
  muestras, tope de 4 bloqueadas). El propio script verifica la réplica contra
  la función real del juego en 3 000 posiciones × 3 radios y aborta si difiere.
- Obstáculos sólidos: props del JSON + colocados a mano + ejemplares generados
  con `blockRadius > 0` (los mismos que marca `scatterRegion`).

## Limitaciones del método

- Caminabilidad muestreada a 2 m (la rejilla de anclas del juego), no celda a
  celda: celdas libres diminutas entre obstáculos pueden no contarse.
- El ancho de camino mide la racha caminable a lo largo de la normal al
  segmento, cada 1 m de arco; no comprueba conectividad (un tramo puede ser
  ancho pero estar aislado).
- «Mar/borde» incluye región no jugable: una página costera penaliza igual que
  una página cerrada por colinas. La bandera `combate_bajo` sólo se aplica con
  ≥50 % de tierra (umbral PROPUESTA): una página 90 % mar no necesita claros.
- No mide monstruos vivos, spawns de oficios ni FPS: es densidad geométrica.
