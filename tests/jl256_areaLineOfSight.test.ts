import { describe, it } from 'vitest';
import { loadGameData } from '../src/data';
import { World } from '../src/sim/world';

/**
 * JL-256: Áreas que atraviesan paredes.
 *
 * Hallazgo (JL-241): los hechizos de área (cono, línea, cruz, estrella,
 * cuadrado) golpean a todos los enemigos dentro de la forma geométrica,
 * incluso si hay una pared entre el centro del área y el enemigo.
 * Los de blanco único ya verifican línea de visión.
 *
 * La regla de combate no se cambia: el creador decide (ver
 * docs/ACCIONES_CREADOR.md, sección JL-256).
 *
 * Opción A (prueba pendiente): las áreas respetan la línea de visión
 * desde el centro del área hasta cada enemigo, igual que los de blanco
 * único.  Cuando el creador elija esta opción, esta prueba deja de ser
 * `todo` y se implementa el filtro en `World` (línea ~1387 de
 * `src/sim/world.ts`, donde `shapeHitsCircle` selecciona los objetivos
 * sin mirar paredes).
 */
describe('JL-256: áreas que atraviesan paredes', () => {
    it.todo('Opción A: un hechizo de área no golpea al enemigo detrás de una pared', () => {
        // Pendiente de decisión del creador (ACCIONES_CREADOR.md § JL-256).
        // Esquema de la prueba:
        // 1. Crear un World con una zona que tenga una pared entre dos salas.
        // 2. Colocar un enemigo en la sala opuesta, dentro del radio del hechizo
        //    pero sin línea de visión desde el centro del área.
        // 3. Lanzar un hechizo de área (cono o línea) cuyo centro esté en la
        //    sala del jugador y cuya forma alcance la sala del enemigo.
        // 4. Verificar que el enemigo NO recibe daño (o que el motivo es 'noLineOfSight').
        //
        // Implementación propuesta en World:
        // - En la función que resuelve objetivos de área (línea ~1387),
        //   añadir `this.grid.lineOfSight(areaCenter, e.pos)` como condición
        //   adicional junto a `shapeHitsCircle`.
        // - El centro del área se calcula a partir del aim y la dirección
        //   del hechizo (mismo origen que usa `shapeHitsCircle`).
        const data = loadGameData();
        const w = new World(data);
        // ... (se completa cuando el creador elija la opción A)
    });
});
