# Auditoría de densidad del mundo jugable — 2026-11-09

Estado: **preparada para revisión humana, NO integrada**. No toca `src/`,
`data/`, `docs/`, assets ni Git. Herramienta: `analizar_densidad.ts` (ver
`README.md` para repetirla; ~70 s; byte a byte determinista — comprobado con
`cmp` entre dos corridas—). Huella de entradas: SHA-256 `56d881240b4a6cbf…`.

Qué es: una foto de la **densidad geométrica** del mundo real que pisa la
simulación (117 páginas de 128 m de Los Santos y Herrera): qué fracción de
tierra es caminable, dónde caben discos de combate de 4/5/6 m, si los caminos
tienen cuellos o props encima, y qué tan juntas están las rocas y matas.
No cambia ninguna posición y no aprueba ninguna cifra: los umbrales son
**PROPUESTA** y viven en el script.

## Verificación del instrumento

- Los discos de combate se calculan con una réplica exacta de
  `combatSpaceOpen` (dos anillos de 16 muestras, tope de 4 bloqueadas). El
  propio script la contrasta contra la función del juego en 3 000 posiciones ×
  3 radios y aborta si difiere: pasó en todas las corridas.
- Vegetación y props se leen de las **páginas activas** del `PageStream` tras
  `ensure()` del mundo completo. Primera versión del analizador usaba
  `ow.scatter`, que sólo contenía las 4 páginas de la parcela, y subcontaba
  sólidos 17 veces (814 frente a 13 622 reales). Detectado y corregido: la
  huella estable de entradas y la réplica siguen valiendo; el conteo correcto
  es 13 622 sólidos bloqueantes en todo el mundo.

## Hallazgo metodológico importante (los umbrales se calibraron mal al principio)

La primera PROPUESTA llevaba «máx. 6 sólidos/ha», inventado sin ver los datos.
La distribución real de las 46 páginas con ≥25 % de tierra: mediana 137
sólidos/ha, p90 282. Con ese umbral se banderaban 43/117 páginas sin decir
nada útil. Se recalibró contra la distribución medida y se sustituyó el
indicador bruto por uno funcional: **qué % de la tierra caminable admite un
disco de combate de 6 m** (`combate_bajo` si < 50 %; la mediana real es 85 %,
p10 72 %). Los umbrales vigentes, con su justificación empírica, están en las
líneas 25-44 de `analizar_densidad.ts`.

## Cuadro general

| Medida | Valor |
|---|---|
| Páginas del mundo | 117 (56 con ≥5 % tierra; 46 con ≥25 %) |
| Sólidos bloqueantes | 13 622 |
| Caminable sobre tierra | mediana 93,1 % · mínimo 78,2 % (p3_8) · máximo 95,0 % |
| Páginas con alguna bandera | 12 / 117 (una de ellas de riesgo *alto*) |
| Cuellos de camino (racha ≥5 muestras < 3 m) | 0 · mejor candidato: racha 4 en (512, 14) |
| Props que invaden la calzada | 0 |
| Anclas de combate con < 80 % caminable en 10 m | 0 (peor: playerStart 81,7 %) |

**Lectura: el mundo está bien, con una mancha concreta al noroeste.** La
caminabilidad mínima (78 %) es alta; las anclas del juego tienen claras de
combate inmediatas; ningún camino está cortado ni invadido.

## Las 12 páginas banderadas (vigilancia, no veto)

| Página | Riesgo | Banderas | cam % | combate % | obst/ha | núcleos | Zona |
|---|---|---|---|---|---|---|---|
| p3_7 | **alto** | obstaculos_altos, grupos_densos, combate_bajo | 83,3 | 42,6 | 308 | 13 | macanas |
| p2_8 | medio | combate_bajo | 78,7 | 11,1 | 1452 | 7 | macanas |
| p3_8 | medio | combate_bajo | 78,2 | 16,3 | 886 | 9 | macanas |
| p9_2 | medio | combate_bajo | 93,0 | 45,3 | 175 | 0 | sabanas (franja costera, 1,4 % tierra) |
| p2_2 | medio | grupos_densos | 92,1 | 53,7 | 1363 | 13 | cane_pese (10,5 % tierra) |
| p2_6 | medio | grupos_densos | 89,6 | 71,9 | 222 | 15 | cane_pese / sabanas |
| p2_7 | medio | grupos_densos | 85,7 | 55,5 | 282 | 14 | macanas |
| p3_6 | medio | grupos_densos | 85,5 | 52,6 | 291 | 15 | cane_pese / sabanas |
| p4_5 | medio | grupos_densos | 90,8 | 80,1 | 186 | 13 | cane_pese |
| p4_6 | medio | grupos_densos | 89,9 | 74,8 | 217 | 12 | parrita / sabanas |
| p5_5 | medio | grupos_densos | 91,7 | 81,6 | 178 | 11 | cane_pese |
| p1_6 | medio | grupos_densos | 92,5 | 81,4 | 232 | 10 | ocua / sabanas |

- Las páginas `combate_bajo` de poco % de tierra (p2_8, p3_8, p2_2, p9_2) son
  franjas costeras de manglar/estuario: vegetación cerrada *por intención de
  bioma*. El indicador avisa, no manda talar: ahí el combate pasa en la playa
  o en el claro contiguo.
- `grupos_densos` (≥10 núcleos de 10 sólidos a 12 m) marca donde la dispersión
  hace parches apretados; 9 de las 46 páginas de tierra. Ninguna pierde el
  disco-6: la mediana es 2 944 muestras con claro de 6 m por página.
- **p3_7 es la única página alta**: bosque de macanas, 100 % tierra, 83 %
  caminable pero solo 42 % del área caminable admite combate de 6 m. Es el
  punto del mapa que un diseñador debería mirar primero (`mapa_densidad.svg`,
  mancha naranja noroeste).

## Cuello único del mundo: (512, 14)

Cuatro muestras consecutivas de un camino de 3 m de ancho con paso obstruido a
menos de 3 m — el mejor candidato a cuello de todo el mundo (umbral: 5). Zona
sabanas, junto al esteque de la costa este. **No llega a bandera** y el ancho
peor medido es −0,25 m (un prop rectangular toca la línea central del tramo).
Vale una mirada visual en el editor; probablemente un palmo de piedra o un
mangle. Los demás caminos: sin rachas.

## Cuadrícula interna de 16 m

Contrato del paso: también por sub-celdas. 16 de 7 488 celdas-16 con ≥16
muestras de tierra no admiten ningún disco de 6 m — y 7 de ellas están en la
esquina noroeste de la mancha de macanas (p2_8 y p3_8). El resto son
solitarios costeros, dos en páginas de ancla (p3_6, p5_3); no afectan al
anclaje: las 16 anclas (jugador, encuentros, pueblos, pesquerías) tienen cada
una un disco de 6 m a ≤2 m de su centro (campo `disco6Cerca`).

## Zonas (espacios abiertos por 100 muestras caminables)

| Zona | cam % | d6/100 | nota |
|---|---|---|---|
| macanas | 82,5 | 38,7 | la más cerrada del mundo |
| azuero | 84,2 | 74,7 | |
| cane_pese | 90,2 | 75,2 | 50 núcleos |
| ocua | 92,0 | 79,0 | 67 núcleos |
| sabanas | 93,6 | 88,5 | 145 núcleos; única zona con racha de cuello (4 < 5) |
| chitri | 91,3 | 89,9 | la más abierta |

Las 10 zonas planeadas sin áreas (baru, darién, perlas…) aparecen con 0
muestras: correcto, no están en el mundo actual. Distancia media al camino:
iguanera 337 m (desierto jugable intencional); el resto por debajo.

## Limitaciones

- Muestreo de caminabilidad a 2 m (la rejilla de anclas del juego): claros
  diminutos entre obstáculos pueden no contarse.
- El ancho de camino mide la racha sobre la normal; no comprueba conectividad.
- «mar» incluye región no jugable: franjas costeras penalizan igual que
  colinas cerradas.
- No mide monstruos vivos, spawns de oficios, alturas de suelo ni FPS.

## Qué NO hace este trabajo

No modifica datos ni código, no propone cifras de balance aprobadas, no
reordena vegetación. Entrega medición + umbral PROPUESTA + lista de
vigilancia. Si el coordinador quiere intervenir, los candidatos concretos, en
orden: **p3_7** (bosque de macanas centro), **(512, 14)** (cuello de camino),
p2_8/p3_8 (franja manglar sin claros).
