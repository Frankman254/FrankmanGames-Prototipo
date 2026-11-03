# Slice 03 — Contenido RPG: clases, hechizos, objetos, mascotas, inventario y menús

**Estado:** autorizado por el creador el 2026-10-29: «trata de ir creando las
clases, hechizos, objetos, el menú del juego, el sistema de inventario… hazlo a
tu manera, yo después lo reviso y ajustamos». **Todo el contenido y los números
son `PROPUESTA`**: el creador los revisará. Nombres 100 % originales.

**Contrato:** `src/rpg/contracts.ts`. Las dos ramas lo implementan o lo consumen;
si hace falta algo nuevo, se **añade** (nunca se renombra) y se anota en el handoff.

## Reparto

| Rama | Dónde | Archivos propios | No tocar |
|---|---|---|---|
| `slice03-sistemas` | nube A | `src/rpg/**` (salvo `contracts.ts`, sólo añadir), `data/rpg/**`, `tests/rpg/**`, integración en `src/sim/world.ts`, `src/sim/combat.ts`, `src/sim/damage.ts`, `src/data/*`, `src/render/lootView.ts` (nuevo) | `src/ui/menus/**`, `src/render/` existente, cámara, `electron/` |
| `slice03-interfaz` | nube B | `src/ui/menus/**`, `src/ui/styles/**`, `data/ui/**`, `tests/ui/**`, `src/main.ts` (montaje de menús), `index.html` | `src/rpg/**` salvo un `FakeSession` en `src/ui/menus/fake/`, `src/sim/**` |
| `slice02-mundo-visual` | PC local | terreno, vegetación, luz, modelo del jugador, **cámara orbital** | combate, contenido RPG, menús |

Orden de unión: `slice03-sistemas` → `master`, luego `slice03-interfaz`
(cambiando `FakeSession` por la real), luego `slice02-mundo-visual`.

## Diseño (PROPUESTA)

### Programación orientada a objetos + datos
- **Definición ≠ instancia** (lección de FATE): `ItemDef` es el prototipo,
  `ItemInstance` la copia con sus tiradas. Igual para hechizo (`SpellDef` +
  rango conocido) y clase (`ClassDef` + `Character`).
- Jerarquía de runtime: `Entity` → `Actor` (vida, estadísticas, estados) →
  `Character` (jugador: clase, nivel, inventario, equipo, libro de hechizos),
  `Enemy`, `Pet`. El `World` actual se adapta a ella sin romper los tests.
- `Effect` abstracto con subclases (`DamageEffect`, `HealEffect`,
  `StatusEffect`, `ShieldEffect`, `KnockbackEffect`, `DashEffect`,
  `TeleportEffect`, `RestoreResourceEffect`, `SummonEffect`) creadas por un
  **registro** `type → clase`. Un hechizo es una lista de efectos.
- `PetBehavior` abstracto: `FighterBehavior`, `CollectorBehavior`, `GuardianBehavior`.
- `StatSheet`: suma modificadores por fuente (nivel, puntos, objetos, set,
  estados, mascota) y da el desglose para la hoja de personaje.

### Daño (idea tomada de la estructura de DOFUS y FATE, números propios)
1. Tirada uniforme `[min, max]` del efecto (o del arma, en el ataque básico),
   más `scaling × estadística principal de la clase`.
2. `× (1 + (estadística del elemento + power + afinidad de clase) / 100)`.
   Elemento → estadística: físico y tierra → fuerza; fuego e hielo → intelecto;
   tormenta → agilidad (PROPUESTA).
3. `+ damage.<elemento>` plano.
4. Crítico: `× (1 + critBonus)` con probabilidad `critChance`. **Nunca falla.**
5. Objetivo: `− armor` (sólo físico), después `× (1 − min(resist.<elemento>, resistCap)/100)`.
6. Redondeo hacia abajo en cada paso; mínimo 1 si el golpe conecta.

### Progresión
- XP por enemigo (en datos), `xpToNext(n) = round(base · n^exponent)`, nivel
  máximo 20 en el prototipo. Al subir: `statsPerLevel` de la clase + 3 puntos
  libres para estadísticas principales.
- Hechizos: **cualquier clase puede equipar cualquier hechizo que conozca**
  (lo que el creador valoró de Temporis IV y de FATE). La clase aporta
  estadísticas, afinidad elemental, recurso y kit inicial. Los hechizos nuevos
  se aprenden con pergaminos; un pergamino de un hechizo ya conocido sube su rango.
- Barra de 6 huecos (teclas 1–6). Recurso distinto por clase (prueba de
  `PEND-COMBATE-002`; si el creador prefiere uno universal es un cambio de datos).

## Contenido mínimo

**Clases (2):**
- **Vanguardia de Brasa** — cuerpo a cuerpo, fuerza/vitalidad, afinidad fuego y
  físico, recurso **Vigor** (pequeño, se regenera rápido). Hechizos:
  *Tajo ígneo* (golpe único fuerte), *Embestida* (dash con daño y empuje),
  *Remolino de brasas* (círculo alrededor, quemadura), *Grito de hierro*
  (+power y armadura temporal), *Marca ardiente* (daño en el tiempo),
  *Baluarte* (escudo).
- **Tejedora de Tormentas** — a distancia, intelecto/agilidad, afinidad
  tormenta y hielo, recurso **Maná** (grande, se regenera lento). Hechizos:
  *Chispa* (proyectil barato), *Lanza glacial* (línea que atraviesa, ralentiza),
  *Nova de escarcha* (círculo alrededor, inmoviliza), *Paso del relámpago*
  (teletransporte corto), *Campo estático* (zona en el objetivo que daña por segundos),
  *Arco voltaico* (cono de rayos).

**Hechizos universales por pergamino (≥ 4):** *Vendaje de luz* (cura),
*Piel de piedra* (+armadura, tierra), *Espíritu lobuno* (invoca un aliado
temporal), *Ráfaga* (empuje en cono).

**Estados (≥ 8):** quemadura, ralentización, inmovilizado, aturdido, escudo,
grito de hierro, piel de piedra, regeneración.

**Objetos (≥ 30):** 6 armas (espada corta, hacha de leñador, maza de
herrero, bastón de roble, varita de cobre, orbe de tormenta) con daño y
alcance propios; 12 piezas de armadura en dos sets de 3–4 piezas con bono
(«del Explorador», «del Aprendiz de Tormenta») y sueltas; 4 joyas (anillos y
amuletos) con tiradas; 4 consumibles (poción de vida menor y media, tónico de
recurso, elixir de prisa); 4 pergaminos de hechizo; 3 amuletos de mascota;
4 materiales (colmillo, cuero, mineral, esencia) para un futuro oficio.
Rarezas con color y peso de botín; las tiradas hacen que dos copias del mismo
objeto difieran.

**Mascotas (3):** *Zorro de ceniza* (lucha a tu lado), *Búho archivero*
(recoge botín en un radio y da +radio de recogida), *Tortuga de musgo*
(aura de regeneración y +armadura). Se invocan desde su amuleto; sólo una activa.

**Enemigos:** los tres arquetipos existentes reciben nombre, nivel, XP y tabla
de botín (*Lobo de pradera*, *Hostigador goblin*, *Chamán de hueso*; el esbirro
*Diablillo de hueso*). Se añaden 2 variantes por datos (p. ej. lobo alfa, élite).

## Interfaz (rama B)

- **Pantalla de título** (fondo con la escena 3D si es fácil; si no, degradado):
  Nueva partida, Continuar (si hay guardado), Opciones, Salir.
- **Creación de personaje:** elegir entre las dos clases con descripción,
  estadísticas iniciales, recurso y hechizos de inicio; escribir nombre.
- **HUD:** vida, recurso con el color de la clase, XP, nivel, barra de 6
  hechizos con barrido de enfriamiento, pociones rápidas (Q vida, E recurso),
  estados activos con tiempo, retrato de la mascota, mensajes de botín y subida de nivel.
- **Inventario (I):** cuadrícula, arrastrar y soltar, apilar, ordenar, tirar,
  usar con clic derecho, monedas; **equipo** con muñeco de huecos al lado.
- **Tooltips** con color de rareza, tiradas, set y comparación con lo equipado (verde/rojo).
- **Personaje (C):** estadísticas con desglose al pasar el ratón y reparto de puntos.
- **Libro de hechizos (K):** hechizos conocidos con rango; arrastrar a la barra.
- **Pausa (Esc):** continuar, guardar, opciones, salir al título.
- **Opciones:** sensibilidad de cámara, invertir eje, mostrar FPS, volumen
  (sin sonido aún), guardadas en `localStorage`.
- **Guardado:** `SaveData` en `localStorage` (3 ranuras), con autoguardado al subir de nivel.
- Atajos en `data/ui/keybindings.json`. La prueba de carga pasa a F6/F7/F8 y el
  reinicio de arena a F9 para liberar 1–6, Q, E, R.
- Estilo: panel de pergamino oscuro, legible, sin imitar la interfaz de DOFUS ni de FATE.

## Terminado cuando

- Rama A: `npm test` y `npm run typecheck` en verde con tests de cada efecto,
  la pila de estadísticas, el pipeline de daño, tiradas de objetos, equipar
  y desequipar, sets, inventario (apilar, mover, ordenar), aprender o subir
  hechizos, XP y niveles, botín, mascotas y guardar/cargar ida y vuelta.
- Rama B: menús funcionando contra `FakeSession` y probados con capturas en
  Chromium headless; `npm run typecheck` en verde.
- Cada rama deja `docs/HANDOFF_SLICE_03_<A|B>.md` y anota en `docs/BITACORA.md`
  lo que hay que revisar a ojo en el PC.
