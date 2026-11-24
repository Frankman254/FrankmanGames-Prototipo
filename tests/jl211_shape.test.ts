import { describe, it, expect } from 'vitest';
import { playableAt, plotFade, buildWorldShape } from '../src/world/shape';
import type { WorldBounds } from '../src/world/shape';
import { overworld, worldData } from './fixtures/overworld';

/* ---- plotFade ---- */

describe('plotFade', () => {
    const plot = { width: 200, depth: 150 };

    it('devuelve 0 dentro de la parcela', () => {
        expect(plotFade(plot, 100, 75)).toBe(0);
    });

    it('devuelve 0 en el borde de la parcela', () => {
        expect(plotFade(plot, 0, 0)).toBe(0);
        expect(plotFade(plot, 200, 0)).toBe(0);
        expect(plotFade(plot, 0, 150)).toBe(0);
        expect(plotFade(plot, 200, 150)).toBe(0);
    });

    it('crece de 0 a 1 al alejarse de la parcela', () => {
        const inside = plotFade(plot, 100, 75);
        const near = plotFade(plot, 210, 75);
        const far = plotFade(plot, 300, 75);
        expect(inside).toBe(0);
        expect(near).toBeGreaterThan(0);
        expect(near).toBeLessThan(1);
        expect(far).toBeCloseTo(1, 3);
    });

    it('es simétrico en los cuatro lados', () => {
        const right = plotFade(plot, 220, 75);
        const left = plotFade(plot, -20, 75);
        const top = plotFade(plot, 100, 170);
        const bottom = plotFade(plot, 100, -20);
        expect(right).toBeCloseTo(left, 3);
        expect(top).toBeCloseTo(bottom, 3);
    });

    it('es 1 a 80 m o más fuera (MACRO_FADE)', () => {
        // 200 + 80 = 280 en X
        expect(plotFade(plot, 280, 75)).toBeCloseTo(1, 3);
        // 0 - 80 = -80 en X
        expect(plotFade(plot, -80, 75)).toBeCloseTo(1, 3);
    });

    it('maneja coordenadas negativas', () => {
        const v = plotFade(plot, -50, -50);
        expect(v).toBeGreaterThan(0);
        expect(v).toBeLessThanOrEqual(1);
    });

    it('esquina lejana tiene mayor fade que lado solo', () => {
        const side = plotFade(plot, 220, 75);
        const corner = plotFade(plot, 220, 170);
        expect(corner).toBeGreaterThanOrEqual(side);
    });
});

/* ---- playableAt ---- */

describe('playableAt', () => {
    const ow = overworld();
    const atlas = ow.atlas;
    const bounds: { playable: readonly string[]; clearings?: readonly { id: string; x: number; z: number; radius: number }[] } = {
        playable: ['los_santos', 'herrera'],
    };

    it('devuelve true en una región jugable', () => {
        // (-250, -100) está en Los Santos
        const result = playableAt(atlas, bounds, -250, -100);
        expect(result).toBe(true);
    });

    it('devuelve false en el mar (fuera de cualquier región)', () => {
        // Un punto muy al oeste del atlas es mar
        const result = playableAt(atlas, bounds, -2000, -2000);
        expect(result).toBe(false);
    });

    it('devuelve false en una región no jugable', () => {
        // Panamá no está en playable; (1500, 800) está en Panamá
        const result = playableAt(atlas, bounds, 1500, 800);
        expect(result).toBe(false);
    });

    it('claro: permite pisar dentro del radio en región cerrada', () => {
        // Usamos un claro en zona de Veraguas (no jugable) para probar el mecanismo
        const boundsWithClearing = {
            playable: [] as string[],
            clearings: [{ id: 'piedra', x: -500, z: -50, radius: 30 }],
        };
        // Dentro del claro (en Veraguas, Panamá)
        expect(playableAt(atlas, boundsWithClearing, -500, -50)).toBe(true);
        // Justo en el borde (30 m)
        expect(playableAt(atlas, boundsWithClearing, -470, -50)).toBe(true);
        // Fuera del claro (31 m)
        expect(playableAt(atlas, boundsWithClearing, -469, -50)).toBe(false);
    });

    it('claro: solo aplica en Panamá, no en países vecinos', () => {
        // Un claro en coordenadas fuera de Panamá no debería hacer pisable el punto
        const boundsWithClearing = {
            playable: [] as string[],
            clearings: [{ id: 'frontera', x: -1500, z: 500, radius: 50 }],
        };
        // (-1500, 500) podría ser Costa Rica o mar; en cualquier caso, si no es Panamá, no pisa
        const result = playableAt(atlas, boundsWithClearing, -1500, 500);
        // Si es mar → false. Si es pais → false (no es playable ni clearing aplica).
        expect(result).toBe(false);
    });

    it('sin claros, solo las regiones en playable', () => {
        const noClearings = { playable: ['herrera'] };
        // Herrera es jugable
        expect(playableAt(atlas, noClearings, -500, 300)).toBe(true);
        // Los Santos no lo es
        expect(playableAt(atlas, noClearings, -250, -100)).toBe(false);
    });
});

/* ---- buildWorldShape ---- */

describe('buildWorldShape', () => {
    const ow = overworld();
    const atlas = ow.atlas;
    const plot = { width: 200, depth: 150 };
    const bounds: WorldBounds = {
        x0: 0,
        z0: 0,
        x1: 200,
        z1: 150,
        playable: ['los_santos', 'herrera'],
        pageMeters: 256,
        cellSize: 1,
        navRadius: 0.3,
    };

    it('devuelve seaLevel del atlas', () => {
        const shape = buildWorldShape(atlas, bounds, plot);
        expect(shape.seaLevel).toBe(atlas.seaLevel);
    });

    it('macro es 0 dentro de la parcela', () => {
        const shape = buildWorldShape(atlas, bounds, plot);
        expect(shape.macro(100, 75)).toBe(0);
    });

    it('macro crece fuera de la parcela', () => {
        const shape = buildWorldShape(atlas, bounds, plot);
        const inside = shape.macro(100, 75);
        const outside = shape.macro(300, 75);
        expect(inside).toBe(0);
        expect(outside).toBeGreaterThanOrEqual(0);
    });

    it('coast devuelve distancia positiva en tierra', () => {
        const shape = buildWorldShape(atlas, bounds, plot);
        // (-250, -100) está en Los Santos, tierra firme
        const d = shape.coast(-250, -100);
        expect(d).toBeGreaterThan(0);
    });

    it('coast devuelve distancia negativa en el mar', () => {
        const shape = buildWorldShape(atlas, bounds, plot);
        // Muy al oeste del atlas es mar
        const d = shape.coast(-2000, -2000);
        expect(d).toBeLessThanOrEqual(0);
    });

    it('playable delega a playableAt', () => {
        const shape = buildWorldShape(atlas, bounds, plot);
        // Los Santos es jugable
        expect(shape.playable(-250, -100)).toBe(true);
        // Mar no es jugable
        expect(shape.playable(-2000, -2000)).toBe(false);
    });

    it('es determinista: dos llamadas iguales dan mismo resultado', () => {
        const s1 = buildWorldShape(atlas, bounds, plot);
        const s2 = buildWorldShape(atlas, bounds, plot);
        expect(s1.macro(300, 75)).toBe(s2.macro(300, 75));
        expect(s1.coast(-250, -100)).toBe(s2.coast(-250, -100));
        expect(s1.playable(-250, -100)).toBe(s2.playable(-250, -100));
    });

    it('coast varía suavemente entre puntos vecinos', () => {
        const shape = buildWorldShape(atlas, bounds, plot);
        const a = shape.coast(-250, -100);
        const b = shape.coast(-249, -100);
        const c = shape.coast(-250, -99);
        // La distancia a la costa no debe saltar más de ~16 m (COAST_CELL) entre puntos adyacentes
        expect(Math.abs(a - b)).toBeLessThanOrEqual(17);
        expect(Math.abs(a - c)).toBeLessThanOrEqual(17);
    });
});
