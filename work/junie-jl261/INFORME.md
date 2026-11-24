# JL-261: Vuelo en la barriada — Diagnóstico

**Fecha:** 2026-11-24
**Tipo:** Pregunta al creador (sin código)

## Problema

En la barriada de Praderas del Norte no se puede volar con una montura que vuele (F21). El juego muestra "Hace falta una montura que vuele" aunque el jugador lleve una montura voladora equipada.

## Causa raíz

- `src/scenes/houseScene.ts:383` — `enter()` pasa `interior: true` a `makeWorld` para **todas** las salas, incluida la barriada.
- `src/scenes/houseScene.ts:397` — `enterBarriada()` llama a `enter(..., 'barriada')`, heredando `interior: true`.
- `src/sim/world.ts:2903` — `canFly()` devuelve `false` cuando `this.interior` es `true`.

La barriada es un espacio exterior (calle, casas, cielo) pero usa la infraestructura de "salas interiores" del juego (compartida con casas, banco, etc.), por lo que hereda el flag `interior: true` que bloquea el vuelo.

## Pregunta

Escrita en `docs/ACCIONES_CREADOR.md` (§ JL-261). Opciones:
- **A:** Permitir vuelo sin restricciones.
- **B:** Permitir vuelo con tope de altura (ej. 30 m).
- **C:** Permitir vuelo con tope de altura y borde (ej. 30 m, 80 m radio).
- **D:** No permitir vuelo (mantener bloqueo).

## Evidencia

Sin código modificado. Solo diagnóstico y pregunta al creador.
