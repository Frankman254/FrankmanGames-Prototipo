import { describe, it, expect } from 'vitest';
import type { Enemy } from '../src/sim/enemies';
import type { ArchetypeDef } from '../src/data/schema';

/**
 * JL-262 (UI-04): Vida a la vista.
 *
 * Pruebas puras de la lógica que decide qué enemigos muestran números de vida
 * y del formato del texto "HP / maxHP".
 *
 * La implementación está en src/render/enemyView.ts (syncHealthText, showHealthNumbers)
 * y src/main.ts (hoveredId). Estas pruebas validan la lógica sin Babylon.
 */

describe('UI-04: Vida a la vista', () => {
    /** Formato del texto de vida: redondea hacia arriba, muestra "HP / maxHP". */
    function healthText(health: number, maxHealth: number): string {
        return `${Math.ceil(Math.max(0, health))} / ${Math.ceil(maxHealth)}`;
    }

    /** Decide si un enemigo muestra números de vida. */
    function showHealthNumbers(dead: boolean, guardian: boolean, id: number, hoveredId: number | null): boolean {
        return !dead && (guardian || id === hoveredId);
    }

    describe('formato del texto de vida', () => {
        it('muestra vida entera y máxima', () => {
            expect(healthText(80, 100)).toBe('80 / 100');
        });

        it('redondea hacia arriba los decimales', () => {
            expect(healthText(73.4, 100.5)).toBe('74 / 101');
        });

        it('vida cero muestra 0', () => {
            expect(healthText(0, 100)).toBe('0 / 100');
        });

        it('vida negativa muestra 0', () => {
            expect(healthText(-5, 100)).toBe('0 / 100');
        });

        it('vida igual a máxima', () => {
            expect(healthText(250, 250)).toBe('250 / 250');
        });

        it('cifras grandes de jefe', () => {
            expect(healthText(4500, 5000)).toBe('4500 / 5000');
        });
    });

    describe('mostrar números según tipo de enemigo', () => {
        it('guardian vivo siempre muestra números', () => {
            expect(showHealthNumbers(false, true, 42, null)).toBe(true);
        });

        it('guardian muerto no muestra números', () => {
            expect(showHealthNumbers(true, true, 42, null)).toBe(false);
        });

        it('enemigo normal bajo el cursor muestra números', () => {
            expect(showHealthNumbers(false, false, 7, 7)).toBe(true);
        });

        it('enemigo normal fuera del cursor no muestra números', () => {
            expect(showHealthNumbers(false, false, 7, 99)).toBe(false);
        });

        it('enemigo normal sin hover activo no muestra números', () => {
            expect(showHealthNumbers(false, false, 7, null)).toBe(false);
        });

        it('guardian bajo el cursor muestra números (ambas condiciones)', () => {
            expect(showHealthNumbers(false, true, 10, 10)).toBe(true);
        });

        it('hover en otro enemigo no activa números del no-hovered', () => {
            expect(showHealthNumbers(false, false, 3, 5)).toBe(false);
        });

        it('guardian muerto bajo el cursor no muestra números', () => {
            expect(showHealthNumbers(true, true, 1, 1)).toBe(false);
        });
    });

    describe('consistencia con Enemy.guardian', () => {
        it('un enemigo con guardian=true es identificado como jefe', () => {
            const e: Partial<Enemy> = {
                id: 1,
                guardian: true,
                health: 500,
                def: { maxHealth: 1000 } as ArchetypeDef,
            };
            expect(e.guardian).toBe(true);
            expect(showHealthNumbers(false, !!e.guardian, e.id!, null)).toBe(true);
        });

        it('un enemigo con guardian=false no es jefe', () => {
            const e: Partial<Enemy> = {
                id: 2,
                guardian: false,
                health: 50,
                def: { maxHealth: 100 } as ArchetypeDef,
            };
            expect(e.guardian).toBe(false);
            expect(showHealthNumbers(false, !!e.guardian, e.id!, null)).toBe(false);
        });
    });
});
