# Para revisar al despertar — 2026-10-29

Todo lo de esta noche está en `master`. Todo el contenido, los números y las
reglas son **PROPUESTA**: están para que los cambies.

## Cómo abrirlo

```bash
git checkout master
git pull
npm install
npm run dev
```

- `npm run dev` abre la ventana de Electron.
- Si en `master` aparece un `.claude/launch.json` sin guardar, no es tuyo: déjalo o descártalo.
- `npm run package` genera el `.exe` portable en `release/`.

## Qué hay

| Parte | Qué verás | Dónde se cambia |
|---|---|---|
| Título y creación | Nueva partida, continuar, cargar, opciones. Eliges una de 2 clases con sus estadísticas, recurso y hechizos | `data/rpg/classes.json` |
| Mundo | Zona de 256 × 256 m con relieve, caminos, pueblo, ~14 000 plantas con viento y ciclo de día/noche de 5 min con farolas | `data/terrain.json`, `vegetation.json`, `lighting.json` |
| Cámara | Rueda pulsada + arrastrar para girar (estilo Tower of Fantasy) y rueda para zoom | `data/camera.json` |
| Control | Clic para moverse; clic en enemigo para atacar con el arma; 1–6 hechizos; Q/E pociones; Espacio evasión | `data/ui/keybindings.json` |
| Clases | **Vanguardia de Brasa** (cuerpo a cuerpo, Vigor) y **Tejedora de Tormentas** (a distancia, Maná) | `data/rpg/classes.json` |
| Hechizos | 6 por clase y 4 universales por pergamino. Cualquier clase puede equipar cualquier hechizo que conozca (lo que te gustaba de Temporis y de FATE) | `data/rpg/spells.json` |
| Estados | Quemadura, ralentizado, inmovilizado, aturdido, escudo, grito de hierro, piel de piedra, regeneración, prisa, carga estática | `data/rpg/statuses.json` |
| Objetos | 37 objetos (armas, armaduras, 2 sets, joyas, pociones, pergaminos, amuletos de mascota, materiales) con rarezas y tiradas, para que dos copias no sean iguales | `data/rpg/items.json`, `sets.json` |
| Mascotas | Zorro de ceniza (lucha), Búho archivero (recoge botín) y Tortuga de musgo (aura de regeneración). Se invocan con clic derecho en su amuleto | `data/rpg/pets.json` |
| Enemigos | Lobo de pradera, Hostigador goblin, Chamán de hueso con sus diablillos, Lobo alfa y Hostigador veterano. Todos avisan antes de atacar | `data/enemies.json`, `data/rpg/enemies.json` |
| Progresión | XP, niveles (máximo 20), 3 puntos por nivel, botín al suelo, monedas | `data/rpg/progression.json`, `loot.json` |
| Interfaz | Mochila con equipo (I), personaje (C), libro de hechizos (K), pausa (Esc), tooltips con comparación y guardado en 3 ranuras | `src/ui/menus/` |
| **Tienda** | En el pueblo están **Brunilda Yunque** (herrera: armas y armaduras) y **Tobías Cardo** (boticario: pociones, pergaminos, la tortuga). Clic sobre ellos para hablar. Comprar con clic, vender con clic derecho o arrastrando, recomprar lo vendido. La tienda se cierra al alejarte | `data/rpg/merchants.json` |
| **Pesca** | **Estanque del prado**, al suroeste del pueblo. Clic en el agua (o F) lanza el sedal. Espera; a veces el corcho tiembla sin picar (si sacas ahí, se asusta). Cuando se hunde tienes ~1 s para hacer clic. Salen percas, carpas, anguilas, la rara **pez linterna**, botas viejas y, muy de vez en cuando, un anillo o un pergamino | `data/rpg/fishing.json`, `data/terrain.json` (`ponds`) |

El kit inicial de cada clase trae más cosas de lo normal (pergaminos, tónicos,
una segunda mascota, piezas sueltas) para que puedas probarlo todo sin farmear.

**Cómo está programado (lo que pediste: orientación a objetos):**
- Cada cosa del juego tiene dos partes: una *definición*, que es la ficha en un JSON, y una *instancia*, que es la copia viva en la partida.
- Por eso, una clase, un hechizo, un objeto o una mascota nuevos son solo una entrada más en el JSON; no hace falta tocar código.
- Solo hace falta programar cuando quieres un **tipo de efecto** o una **conducta de mascota** que todavía no existe. Cada uno es una subclase de `Effect` o de `PetBehavior` en `src/rpg/`.

## Lo que se probó y lo que no

- **Pruebas automáticas:** 237 en verde y `typecheck` limpio.
- **Probado en el navegador de desarrollo:**
  - título y creación de personaje;
  - HUD con la barra de 6 hechizos;
  - mochila con equipo y hoja de personaje;
  - combate contra el lobo: aviso en cono, Remolino de brasas, Tajo ígneo, aturdido y números de daño.
- **Rendimiento:** medido por el agente local en Electron a 1080p. Con el mundo visual y 200 perseguidores, 100 FPS (el tope del monitor); con 30 enemigos animados, 98 FPS.
- **No probado por nadie a ojo todavía:**
  - si los ataques se sienten bien;
  - el equilibrio (daño, vida, XP);
  - arrastrar y soltar con el ratón real;
  - el `.exe` con todo lo nuevo.

## Decisiones que son tuyas (las fue dejando cada agente)

1. ¿Un recurso por clase (Vigor/Maná, como ahora) o uno universal? Es `PEND-COMBATE-002`.
2. ¿Cualquier clase equipa cualquier hechizo? Hoy sí.
3. ¿Los bonos de set se acumulan por escalones (como ahora) o solo cuenta el mayor?
4. ¿Las mascotas pueden morir? Hoy no reciben golpes.
5. Teclas: 1–6 hechizos, Q/E pociones, Espacio evasión, I/C/K/Esc.
6. ¿El mundo se pausa al abrir el menú de pausa? Hoy sí (es de un jugador).
7. Nombres de clases, hechizos, objetos, sets y mascotas: todos inventados y cambiables.
8. **Descargas pendientes:** el agente local quería modelos animados CC0 (Quaternius) para el personaje. Mientras tanto se hicieron personajes por código. Si apruebas la descarga, cambiarlo es una línea en `data/assets.json`.

## Pulido visual (ya en `master`)

- **Hechizos:** efectos por elemento, proyectiles con estela y áreas con su forma real.
- **Estados sobre los personajes:** llamas, escarcha, hielo, estrellas, escudo y auras.
- **Mascotas:** zorro, búho, tortuga y lobo espectral, animados.
- **Botín:** bolsas, un cofre con haz de luz para lo raro y monedas que giran, con el nombre al pasar el cursor.
- **Números de daño en 3D** (los críticos, más grandes) y un destello al subir de nivel.
- **Rendimiento** medido en Electron a 1080p: 99 FPS con 200 perseguidores, 33 enemigos animados y todos los efectos.
- **Fallo corregido:** el HUD tapaba los clics y no se podía andar con el ratón. Ya está arreglado y comprobado con un clic real.

## Qué queda por hacer
- **Ya hecho después:** tienda y pesca (arriba). Probado en el navegador: hablar con la herrera, comprar, vender y recomprar, y lanzar el sedal. La captura con el ratón queda por probar en Electron, porque el navegador de pruebas iba a pocos FPS.
- **Arreglado después:** los árboles, rocas y casas que quedan delante del personaje se recortan en un círculo alrededor de él, y los goblins disparan flechas visibles. Ajustes en `data/fx.json`.
- **Sonido y música (ya en `master`)**, todo generado por código y sin descargas:
  - Efectos por elemento y por arma, pasos, botín, aviso de ataque, tienda y pesca (con una picada inconfundible).
  - Ambiente de día y de noche, y agua cerca del estanque.
  - Música propia en Re dórico: calma misteriosa, tensa en combate y con arpa mientras pescas.
  - El audio arranca con el primer clic. Ajustes en `data/audio/`.
- **Antes pendiente de que tú lo lanzaras:**
  - **Sonido y música** generados por código: efectos por elemento, aviso de ataque, ambiente de día y de noche, y música tranquila y misteriosa que se tensa en combate.
  - Más estanques (en el piso de una mazmorra, de noche…) y que la pesca se combine con mascotas, como en FATE.
- **Cómo se trabajó:** con ramas por tarea y un contrato en `src/rpg/contracts.ts`. Los informes de cada agente están en `docs/HANDOFF_SLICE_0*.md`, y lo que hay que mirar a ojo en `docs/BITACORA.md`.
