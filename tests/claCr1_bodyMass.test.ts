// CLA-CR1 (creador, 2026-11-22): «la complexión solo ensancha o achica horizontalmente» y
// «no se ve la altura en la vista previa».
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { boneMass, chainMass, inflatePositions, massMeters, residualWidth } from '../src/render/characters/bodyMass';

describe('CLA-CR1: masa de la complexión por huesos', () => {
    it('el tronco y los muslos ganan masa; cabeza, manos y pies no', () => {
        expect(boneMass('player:chest')).toBe(1);
        expect(boneMass('spine_02')).toBe(1);
        expect(boneMass('thighL')).toBeGreaterThan(boneMass('shinL'));
        expect(boneMass('upperarm_l')).toBeGreaterThan(boneMass('lowerarm_l'));
        for (const b of ['head', 'Head', 'handL', 'hand_r', 'footR', 'ball_l', 'index_01_l']) expect(boneMass(b), b).toBe(0);
    });

    it('una falda (`fis_` bajo la cadera) sigue a la cadera; el pelo (`fis_` bajo la cabeza) no se hincha', () => {
        const bone = (name: string, parent: unknown = null) => ({ name, getParent: () => parent as never });
        const hips = bone('hips');
        const head = bone('head');
        expect(chainMass(bone('fis_falda_2', bone('fis_falda_1', hips)))).toBe(1);
        expect(chainMass(bone('fis_pelo_1', head))).toBe(0);
        expect(chainMass(bone('tela_capa3', bone('tela_capa2', bone('tela_capa1', bone('chest', null)))))).toBe(1);
    });

    it('desplaza por la normal en proporción al peso, y nada donde manda la cabeza', () => {
        // Vértice 0: todo del hueso 0 (tronco). Vértice 1: todo del hueso 1 (cabeza).
        const pos = [0, 1, 0, 0, 1.6, 0];
        const nor = [1, 0, 0, 0, 1, 0];
        const idx = [0, 0, 0, 0, 1, 0, 0, 0];
        const wgt = [1, 0, 0, 0, 1, 0, 0, 0];
        const out = inflatePositions(pos, nor, idx, wgt, (b) => (b === 0 ? 1 : 0), 0.03);
        expect(out[0]).toBeCloseTo(0.03);
        expect(Array.from(out.slice(3))).toEqual([0, 1.6, 0].map(Math.fround));
    });

    it('los vértices duplicados de una costura se mueven igual (sin grietas)', () => {
        const pos = [0, 1, 0, 0, 1, 0];
        const nor = [1, 0, 0, 0, 0, 1];
        const idx = [0, 0, 0, 0, 0, 0, 0, 0];
        const wgt = [1, 0, 0, 0, 1, 0, 0, 0];
        const out = inflatePositions(pos, nor, idx, wgt, () => 1, 0.02);
        expect(out[0]).toBeCloseTo(out[3]!);
        expect(out[2]).toBeCloseTo(out[5]!);
    });

    it('robusto gana masa, delgado la pierde, y el ancho uniforme se queda en menos de la mitad', () => {
        expect(massMeters(1)).toBe(0);
        expect(massMeters(1.12)).toBeGreaterThan(0.03);
        expect(massMeters(0.9)).toBeLessThan(-0.015);
        expect(residualWidth(1.12) - 1).toBeLessThan(0.12 / 2);
    });
});

describe('CLA-CR1: la vista previa encuadra con la altura de referencia', () => {
    it('divide la altura del modelo por la escala de altura elegida', () => {
        const src = readFileSync(new URL('../src/render/characterPreview.ts', import.meta.url), 'utf-8');
        expect(src).toMatch(/bodyScale\?\.\[0\]/);
        expect(src).toMatch(/\(m\.height \|\| 1\.9\) \/ sy/);
    });
});
