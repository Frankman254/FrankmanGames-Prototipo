import { describe, it, expect } from 'vitest';
import { HeightField } from '../src/world/terrain';
import { SwitchableHeightField } from '../src/world/switchableGround';

/** Crea un HeightField con alturas conocidas. `heights` debe tener (round(w/s)+1)*(round(d/s)+1) elementos. */
function makeBase(width: number, depth: number, step: number, heights: number[]): HeightField {
    return new HeightField(width, depth, step, new Float32Array(heights));
}

/** Crea un HeightField plano (todas las alturas = 0) de las dimensiones dadas. */
function makeFlat(width: number, depth: number, step: number): HeightField {
    const cols = Math.round(width / step) + 1;
    const rows = Math.round(depth / step) + 1;
    return new HeightField(width, depth, step, new Float32Array(cols * rows));
}

/** Crea un HeightField 1×1 (2×2 grid) con las 4 alturas dadas: [tl, tr, bl, br] = [(0,0), (1,0), (0,1), (1,1)]. */
function makeTiny(heights: number[]): HeightField {
    return new HeightField(1, 1, 1, new Float32Array(heights));
}

describe('SwitchableHeightField', () => {
    it('sin flatHeight devuelve el terreno base', () => {
        const base = makeFlat(10, 10, 1);
        const shf = new SwitchableHeightField(base);
        // Terreno plano a 0
        expect(shf.sample(0, 0)).toBe(0);
        expect(shf.sample(5, 0)).toBe(0);
        expect(shf.sample(9, 0)).toBe(0);
    });

    it('flatHeight activa devuelve altura plana en todos los puntos', () => {
        const base = makeFlat(10, 10, 1);
        const shf = new SwitchableHeightField(base);
        shf.flatHeight = 2.5;
        expect(shf.sample(0, 0)).toBe(2.5);
        expect(shf.sample(5, 0)).toBe(2.5);
        expect(shf.sample(9, 0)).toBe(2.5);
        expect(shf.sample(3, 5)).toBe(2.5);
    });

    it('quitar flatHeight restaura el terreno base', () => {
        const base = makeFlat(10, 10, 1);
        const shf = new SwitchableHeightField(base);
        shf.flatHeight = 2.5;
        expect(shf.sample(0, 0)).toBe(2.5);
        shf.flatHeight = null;
        expect(shf.sample(0, 0)).toBe(0);
        expect(shf.sample(3, 0)).toBe(0);
    });

    it('flatHeight con relief suma el relieve a la altura plana', () => {
        const base = makeFlat(10, 10, 1);
        const shf = new SwitchableHeightField(base);
        shf.flatHeight = 3;
        shf.relief = (x: number, z: number) => x * 0.1 + z * 0.2;
        expect(shf.sample(0, 0)).toBe(3 + 0);
        expect(shf.sample(5, 0)).toBe(3 + 0.5);
        expect(shf.sample(0, 5)).toBe(3 + 1.0);
        expect(shf.sample(5, 5)).toBe(3 + 1.5);
    });

    it('quitar relief mantiene flatHeight sin relieve', () => {
        const base = makeFlat(10, 10, 1);
        const shf = new SwitchableHeightField(base);
        shf.flatHeight = 3;
        shf.relief = (x: number, z: number) => x * 0.1;
        expect(shf.sample(5, 0)).toBe(3.5);
        shf.relief = null;
        expect(shf.sample(5, 0)).toBe(3);
    });

    it('quitar flatHeight con relief activa vuelve al terreno base', () => {
        const base = makeFlat(10, 10, 1);
        const shf = new SwitchableHeightField(base);
        shf.flatHeight = 3;
        shf.relief = (x: number, z: number) => x * 0.1;
        expect(shf.sample(5, 0)).toBe(3.5);
        shf.flatHeight = null;
        expect(shf.sample(5, 0)).toBe(0);
        // relief sigue asignado pero no se usa sin flatHeight
        shf.relief = null;
        expect(shf.sample(5, 0)).toBe(0);
    });

    it('flatHeight cero es válido (plano a nivel 0)', () => {
        const base = makeFlat(10, 10, 1);
        const shf = new SwitchableHeightField(base);
        shf.flatHeight = 0;
        expect(shf.sample(0, 0)).toBe(0);
        expect(shf.sample(9, 0)).toBe(0);
    });

    it('flatHeight negativo es válido (sótano)', () => {
        const base = makeFlat(10, 10, 1);
        const shf = new SwitchableHeightField(base);
        shf.flatHeight = -2;
        expect(shf.sample(0, 0)).toBe(-2);
        expect(shf.sample(5, 0)).toBe(-2);
    });

    it('relief con valores negativos resta a flatHeight', () => {
        const base = makeFlat(10, 10, 1);
        const shf = new SwitchableHeightField(base);
        shf.flatHeight = 5;
        shf.relief = () => -1.5;
        expect(shf.sample(0, 0)).toBe(3.5);
        expect(shf.sample(5, 0)).toBe(3.5);
    });

    it('conserva las propiedades del base (width, depth, step, origin)', () => {
        const heights = new Float32Array(121); // 10×10 con step 1 → 11×11
        const base = new HeightField(10, 10, 1, heights, -5, -5);
        const shf = new SwitchableHeightField(base);
        expect(shf.width).toBe(10);
        expect(shf.depth).toBe(10);
        expect(shf.step).toBe(1);
        expect(shf.originX).toBe(-5);
        expect(shf.originZ).toBe(-5);
    });

    it('interpolación del terreno base funciona sin flatHeight', () => {
        // Grid 2×2: alturas [0, 10, 20, 30] en (0,0), (1,0), (0,1), (1,1)
        const base = makeTiny([0, 10, 20, 30]);
        const shf = new SwitchableHeightField(base);
        // En (0.5, 0.5) la interpolación bilineal: 0*0.25 + 10*0.25 + 20*0.25 + 30*0.25 = 15
        expect(shf.sample(0.5, 0.5)).toBeCloseTo(15);
    });

    it('flatHeight ignora la interpolación del terreno', () => {
        const base = makeTiny([0, 10, 20, 30]);
        const shf = new SwitchableHeightField(base);
        shf.flatHeight = 7;
        // Aunque el terreno varía de 0 a 30, flatHeight es constante
        expect(shf.sample(0, 0)).toBe(7);
        expect(shf.sample(0.5, 0.5)).toBe(7);
        expect(shf.sample(1, 1)).toBe(7);
    });

    it('cambiar flatHeight varias veces', () => {
        const base = makeFlat(10, 10, 1);
        const shf = new SwitchableHeightField(base);
        shf.flatHeight = 1;
        expect(shf.sample(0, 0)).toBe(1);
        shf.flatHeight = 5;
        expect(shf.sample(0, 0)).toBe(5);
        shf.flatHeight = null;
        expect(shf.sample(0, 0)).toBe(0);
        shf.flatHeight = -3;
        expect(shf.sample(0, 0)).toBe(-3);
    });

    it('cambiar relief varias veces', () => {
        const base = makeFlat(10, 10, 1);
        const shf = new SwitchableHeightField(base);
        shf.flatHeight = 10;
        shf.relief = () => 1;
        expect(shf.sample(0, 0)).toBe(11);
        shf.relief = () => -2;
        expect(shf.sample(0, 0)).toBe(8);
        shf.relief = null;
        expect(shf.sample(0, 0)).toBe(10);
    });

    it('relief depende de las coordenadas (x, z)', () => {
        const base = makeFlat(10, 10, 1);
        const shf = new SwitchableHeightField(base);
        shf.flatHeight = 0;
        shf.relief = (x: number, z: number) => x + z;
        expect(shf.sample(3, 4)).toBe(7);
        expect(shf.sample(-1, 2)).toBe(1);
        expect(shf.sample(0, 0)).toBe(0);
    });
});
