# HANDOFF — Zonas con franja de niveles

- **Objetivo autorizado:** petición del creador: «esto es por zonas, debe haber zonas de franjas de niveles como en dofus y los monstruos escalan en características y habilidades en función de eso; para que un jugador de nivel bajo quiera ir a una zona de nivel alto le va a exigir alto nivel de habilidad, inclusive los bichos le podrían hacer oneshot».
- **Rama:** `zonas-nivel`. Sin fusionar con `master` y sin PR.
- **Estado de las cifras:** todo es PROPUESTA y vive en `data/`.

## Qué cambió

### Zonas (`data/zones.json`)

Seis regiones sobre el mundo de 256 × 256 m. Cada una es una unión de círculos y rectángulos. Si dos se solapan, manda la primera de la lista.

| Zona | Franja | Dónde | Monstruos |
|---|---|---|---|
| Aldea del Cruce | segura | el pueblo (círculo de 18 m) | ninguno |
| Prados del Cruce | 1–5 | alrededor del pueblo y el prado del antiguo encuentro | los del encuentro: lobo, hostigador, chamán, alfa y veterano (+1 nivel) |
| Pradera de los lobos | 5–12 | mitad oeste, con el estanque | lobos, alfas, algún hostigador |
| Barranco de los hostigadores | 9–15 | cuadrante noreste | hostigadores y veteranos |
| Hondonada del Hueso | 13–20 | cuadrante sudeste | chamanes y brutos de cripta |
| Páramo de Ceniza (élite) | 20–24 | borde sudeste | lobos de ceniza, brutos, veteranos (+1), chamanes |

- **Cuántos monstruos:** la densidad está en monstruos por hectárea de suelo caminable. Con las cifras actuales salen unos 43 monstruos vivos: 10, 6, 12, 8 y 7 por zona.
- **Reposición:** cada baja se repone tras `respawnSeconds`, a 24 m o más del jugador.
- **Cadáveres:** se retiran al acabar su animación.
- **El encuentro fijo pasa a ser la primera zona.** Con zonas, `data/encounter.json` ya no se usa en el juego.
  - Sigue en los tests, en la arena y en `?bench`.
  - Ya no hay «victoria» al limpiar: el mundo abierto sólo se acaba al caer.

### Nivel de los monstruos

- **Nivel al nacer:** cada monstruo nace con un nivel uniforme dentro de la franja, más el `levelBonus` de su entrada.
- **Escalado relativo al nivel base** de su ficha (`data/rpg/enemies.json`). A su nivel base un monstruo queda exactamente igual que antes, así que los tests y el equilibrio anterior siguen valiendo.
- **Curvas:** curva(n) = (1 + linear·(n−1))·(1 + compound)^(n−1). Hay una para cada una de estas cosas:
  - vida, que también mueve el umbral de aturdimiento;
  - daño del ataque básico y de los hechizos;
  - XP;
  - monedas.
- **Por nivel** se suman power, armadura, crítico, bonus de crítico y todas las resistencias.
- **Botín:** una tirada de objeto más cada 6 niveles por encima del base. Las tablas siguen siendo las mismas: no hay objetos de nivel alto.
- **Esbirros:** conservan con su invocador la diferencia de nivel que tenían.
- **Hechizos por nivel:** cada hechizo de `spells` admite un `minLevel` opcional.
  - Cada arquetipo tiene uno o dos hechizos nuevos de nivel 8–20 al final de la lista. Van al final para no cambiar la prioridad ni los índices de los de siempre.
  - Ejemplos: Desgarro (8), Salto de caza (15), Andanada (8), Aplastar (20), Bombarda (18).
- **Variantes nuevas** (vía `base`):
  - **Bruto de la cripta** (`grave_brute`, base melee, tierra).
  - **Lobo de ceniza** (`ash_alpha`, base alpha_wolf, fuego).
  - Las dos tienen ficha RPG y entrada procedural en `data/assets.json`. Reutilizan tablas de botín existentes.

### Diferencia de nivel y golpe único

- **Regla:** daño × (1 + 0,05 · (nivel del atacante − nivel del defensor)), con un tope de +100 % y de −40 %.
- **A quién afecta:** a todos, jugador, mascotas (con el nivel del dueño) y monstruos. También en la arena del Slice 01, donde el lobo alfa (nivel 4) pega ahora un 15 % más a un nivel 1.
- **Golpe único:** un jugador de nivel 1 que no esquiva muere de un golpe en la élite.
  - Pasa en el 92–100 % de las partidas medidas.
  - El test `tests/zones.test.ts` usa sólo el básico del lobo de ceniza de nivel 26.
- **Los avisos no cambian:** el mismo test comprueba que evadir al ver el aviso deja al jugador intacto.

### Interfaz

- **Banner al entrar en una zona,** con un margen de 0,6 s en el borde: «Pradera de los lobos» y debajo «niv. 5–12» (o «zona segura»).
  - Si la franja empieza 5 o más niveles por encima del jugador, sale además un toast de aviso.
- **Registro:**
  - «Entras en: Pradera de los lobos · niv. 5–12».
  - Los golpes, avisos y muertes llevan el nivel, p. ej. «Lobo de pradera (niv. 7) · Desgarro: 34».
- **Cartel sobre cada monstruo** (`src/render/enemyView.ts`): «Lobo de pradera · niv. 7», con un color según su nivel menos el del jugador:
  - gris si es más bajo;
  - blanco;
  - amarillo desde +3;
  - naranja desde +6;
  - rojo desde +10.
  - Los umbrales están en `levelColors`.

### Equilibrio

- `npm run balance` hace ahora también el escenario de zonas.
- `npm run balance -- --zones` hace sólo ese. Tarda unos 7 s.
- El resultado está en `docs/EQUILIBRIO_ZONAS.md`.

## Mediciones

Resumen de `docs/EQUILIBRIO_ZONAS.md` (12 partidas por celda, grupos de 2 monstruos):

- **Dentro de la franja, habilidad media,** muere el 0–25 %:
  - nivel 5 en la pradera: 8 %;
  - nivel 10 en el barranco: 25 %;
  - nivel 20 en la hondonada: 0 %.
- **5 o más niveles por debajo,** muere mucho más quien no esquiva:
  - nivel 1 en el barranco: 58 % con habilidad media y 8 % con buena;
  - nivel 5 en la hondonada: 100 % con media y 67 % con buena.
- **En la élite, nivel 1 sin esquivar:** muere de un golpe en el 92 % de las partidas. El golpe más fuerte quita el 228 % de la vida.
- **En la élite, nivel 20:** con habilidad media muere el 100 %, con buena el 42 %. Es la comprobación ✘ del informe; ver preguntas.
- **XP por minuto:** sube con la zona mientras se sobrevive. Ese es el premio de ir más arriba.
- **Lo que no se pudo medir aquí (nube):**
  - FPS con unos 43 monstruos animados y sus carteles. Antes se medían 20 personajes.
  - Revisión visual.
  - Los dos quedan para el PC del creador.

## Qué revisar a ojo (local)

- **Rendimiento.** Con `npm run dev`, recorrer el mundo y mirar el panel de FPS con unos 43 monstruos vivos. `?bench` sigue sin zonas.
  - Si va justo, hay dos palancas: bajar `density` en `data/zones.json` o activar los monstruos sólo cerca del jugador. Lo segundo no está hecho.
- **Carteles:** que se lean, que no tapen la barra de vida y que el color se entienda. Hay 43 texturas dinámicas, una por monstruo.
- **Banner:** que salga al pasar del pueblo a los prados y a la pradera, y que no parpadee andando por el borde.
- **Hechizos nuevos:** que se vean venir y se puedan esquivar, sobre todo Aplastar (cono de 5 m, 1,4 s) y Bombarda (círculo a los pies, 1,5 s).
- **Monstruos al nacer:** que ninguno aparezca dentro del pueblo ni encima del jugador.
- **Misiones:** las de lobos y goblins siguen poniendo sus monstruos (caen en la franja 1–5).

## Decisiones técnicas (PROPUESTA)

- **Escalado relativo al nivel base de la ficha** y no a un nivel 1 absoluto. Así no se toca nada de lo ya equilibrado.
- **El arquetipo escalado es una copia cacheada por (arquetipo, nivel)** que mantiene el orden de los hechizos.
- **El mundo por zonas se activa con `World({ zones: true })`.** En `src/main.ts` sólo cambia esa opción.
  - Los tests y el simulador siguen con la arena.
- **La lógica de zonas** está en `src/sim/zones.ts`, sin DOM. Su parseo está en `src/data/zonesSchema.ts`.
- **Las zonas que van a un pueblo no tienen franja** (`safe`).

## Preguntas para el creador

1. **La élite (20–24) está por encima del nivel máximo del jugador (20).** Con el equipo actual, de nivel ≤ 4, un nivel 20 medio muere siempre. ¿Debe ser así (contenido para quien esquiva muy bien) o se baja la élite o se sube el nivel máximo?
2. **Diferencia de nivel en los dos sentidos** (el jugador también hace menos daño, hasta −40 %). ¿Se queda, o sólo debe castigar al jugador?
3. **XP de monstruos muy por debajo:** ¿debe bajar? Ahora un nivel 20 saca XP completa en los prados (1–5).
4. **Colores del cartel** según la diferencia de nivel: ¿se queda la escala gris, blanco, amarillo, naranja, rojo?
5. **Las bajas se reponen** en 45–90 s según la zona. ¿Ritmo bien, o se prefiere otro sistema (grupos fijos, oleadas)?
6. **Botín:** hace falta equipo de nivel alto para que las zonas altas premien con algo más que monedas, XP y tiradas extra.
7. **El encuentro fijo y la «victoria» del Slice 01** ya no se usan en el juego. ¿Se retiran del HUD o se dejan para la arena de pruebas?

## Archivos principales

- `data/zones.json` (nuevo).
- `data/enemies.json`: `minLevel`, hechizos nuevos y dos variantes.
- `data/rpg/enemies.json`.
- `data/assets.json`.
- `src/data/zonesSchema.ts` y `src/sim/zones.ts` (nuevos).
- `src/data/schema.ts`.
- `src/data/index.ts`.
- `src/sim/enemies.ts`.
- `src/sim/world.ts`.
- `src/sim/events.ts`.
- `src/rpg/enemy.ts`.
- `src/rpg/contracts.ts`.
- `src/render/enemyView.ts`.
- `src/render/arenaView.ts`.
- `src/ui/hud.ts`.
- `src/ui/menus/index.ts`: sólo el caso `zoneEnter`.
- `src/main.ts`: sólo la opción `zones`.
- `scripts/balance/zones.ts`, `scripts/balance/zonesReport.ts`, `scripts/balance/run.ts` y `scripts/balance/scenarios.ts` (`makeSessionAt`).
- `tests/zones.test.ts` y `tests/balance/zones.test.ts`.
- `docs/EQUILIBRIO_ZONAS.md`.

**Sin regenerar:** `docs/EQUILIBRIO_2026-10.md` no se volvió a generar. La diferencia de nivel cambia un poco la arena; pasar `npm run balance` entero en local.

No se tomó ninguna decisión creativa: nombres, franjas y cifras son PROPUESTA para revisar.
