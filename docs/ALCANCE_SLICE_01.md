# Slice 01 — Movimiento, enemigos y una pelea

**Estado:** autorizado para implementar · **Fecha:** 2026-10-28
**Base:** `DEC-2026-001` tiempo real · `002` zona continua · `003` clic para
moverse y atacar · `004` recurso + enfriamientos · `005` azar sólo varía el
resultado (sin fallo aleatorio).

## Pasos (en orden; cada uno con su commit y tests)

1. **Esqueleto técnico.** Vite + TS, bucle de simulación a paso fijo y render
   interpolado, cámara que sigue al jugador en una zona mayor que la pantalla.
   Contador de FPS/frame time en pantalla.
2. **Clic para moverse.** Rejilla de colisión invisible, A* con suavizado de
   camino, mantener pulsado para seguir el cursor, obstáculos. Picking del
   cursor separado de la colisión.
2b. **Ventana de escritorio (añadido 2026-10-29).** Envolver el proyecto en
   Electron: `npm run dev` abre una ventana de Windows (no el navegador) con
   recarga en caliente, y `npm run package` genera un ejecutable portable en
   `release/`. Pantalla completa con F11, sin barra de menú. Hacer este paso
   antes del 3, para que la prueba de carga se mida dentro de Electron.
3. **Prueba de carga.** 20 y 200 entidades simples persiguiendo al jugador con
   separación básica. Anotar frame time medio y p95 en `docs/BITACORA.md`.
4. **Enemigos con intención.** Máquina de estados propia
   `Idle → Acquire → Pursue → Telegraph → Attack → Recover (→ Stagger) → Dead`.
   Tres arquetipos: cuerpo a cuerpo, a distancia y soporte/invocador simple.
   Cada ataque peligroso tiene un aviso visible antes del golpe.
5. **Combate del jugador.** Clic sobre enemigo = ataque básico; una evasión;
   dos habilidades (una barata y otra cara en cono con enfriamiento).
   `puedeLanzar = recurso ≥ coste ∧ cooldown ≤ 0 ∧ GCD ≤ 0 ∧ en alcance`.
   Daño = rango mínimo–máximo + crítico con bonus; **nunca** un fallo por tirada.
   Barra de recurso, barrido circular de cooldown, icono gris sin recurso.
6. **Cierre de sesión.** Victoria al limpiar la arena, muerte, reinicio rápido
   sin recargar la página. Telemetría local (tiempo, daño recibido, habilidades
   usadas, muertes) volcada a consola o descargable como JSON.

## El juego es 3D

El creador respondió “3D” el 2026-10-28 (pendiente de que el coordinador lo
registre como `DEC-*`). Consecuencias para este slice:

- **Render temporal en 3D con primitivas** (cápsulas, cajas, plano de suelo),
  sin modelos ni texturas externas. Biblioteca de evaluación: **Babylon.js**
  (voto inicial de la propuesta de ChatGPT; `PEND-TECH-001` sigue abierto).
- Cámara en tercera persona elevada que sigue al jugador (tipo ARPG). Ángulo,
  zoom y rotación en `data/camera.json`, marcados `PROPUESTA`.
- Clic para moverse = **raycast del cursor contra el suelo**; clic sobre un
  enemigo = picking de su malla. La colisión y el A* siguen en una rejilla 2D
  sobre el plano XZ dentro de `src/sim/`.
- La simulación sigue sin importar Babylon: `src/sim/` trabaja con vectores
  propios y `src/render/` traduce a escena. Así se puede cambiar de biblioteca.
- La prueba de carga del paso 3 mide **simulación y render 3D por separado**
  (200 cápsulas con instancing frente a sin dibujar).

Fuera de este slice: personajes modelados, esqueletos, animaciones, luces y
sombras finales. Blender no hace falta todavía.

## Datos

Todo lo ajustable en `data/*.json` con validación al cargar: habilidades
(`resourceCost`, `cooldown`, `globalCooldown`, `castTime`, `range`, `area`,
`damageMin`, `damageMax`, `critChance`, `critBonus`), arquetipos enemigos
(sentidos, correa, velocidad, ataques, tiempos de telegraph/recover) y
encuentros. Los números iniciales son inventados y se marcan `PROPUESTA`.

## Fuera del Slice 01

Objetos, botín, inventario, red, guardado, narrativa, generación procedural,
arte definitivo, sonido, clases, paper doll. Se dejan interfaces vacías sólo si
ahorran trabajo obvio, sin implementarlas.

## Criterios de terminado

- Los tres enemigos se distinguen por conducta antes de leer su nombre.
- Cada ataque peligroso se puede esquivar si se reacciona al aviso.
- Cambiar un número en `data/` cambia el juego sin tocar código.
- 200 entidades se mantienen ≥ 60 FPS en este PC (o se documenta cuánto no).
- `npm test` en verde; `npm run dev` abre la arena en una ventana de Electron.
- `npm run package` produce un `.exe` que arranca sin Node instalado.
- `PROCEDENCIA.md` sin entradas de terceros no licenciadas.
