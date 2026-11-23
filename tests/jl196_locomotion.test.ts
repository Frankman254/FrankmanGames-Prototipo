import { describe, it, expect } from 'vitest';
import { pickGait, GAIT_BAND } from '../src/world/locomotion';

/* ---------- locomotion.ts ---------- */

// Héroe con runSpeed = 2.75 m/s (valor típico de data/assets.json)
const HERO_RUN = 2.75;

describe('pickGait', () => {
    it('caso feliz: corre a velocidad normal', () => {
        expect(pickGait('run', HERO_RUN, HERO_RUN, true)).toBe('run');
    });

    it('caso feliz: anda a velocidad baja', () => {
        expect(pickGait('walk', 1.0, HERO_RUN, true)).toBe('walk');
    });

    it('histéresis: de run a walk al bajar de runExit', () => {
        // ratio = 0.74 < 0.75 (runExit) → walk
        expect(pickGait('run', HERO_RUN * 0.74, HERO_RUN, true)).toBe('walk');
    });

    it('histéresis: de walk a run al subir de runEnter', () => {
        // ratio = 0.86 >= 0.85 (runEnter) → run
        expect(pickGait('walk', HERO_RUN * 0.86, HERO_RUN, true)).toBe('run');
    });

    it('histéresis: en la banda conserva la marcha actual (run)', () => {
        // ratio = 0.80, entre 0.75 y 0.85 → conserva run
        expect(pickGait('run', HERO_RUN * 0.80, HERO_RUN, true)).toBe('run');
    });

    it('histéresis: en la banda conserva la marcha actual (walk)', () => {
        // ratio = 0.80, entre 0.75 y 0.85 → conserva walk
        expect(pickGait('walk', HERO_RUN * 0.80, HERO_RUN, true)).toBe('walk');
    });

    it('sin clip de caminar siempre corre', () => {
        expect(pickGait('walk', 1.0, HERO_RUN, false)).toBe('run');
    });

    it('naturalRun cero siempre corre', () => {
        expect(pickGait('walk', 1.0, 0, true)).toBe('run');
    });

    it('naturalRun negativo siempre corre', () => {
        expect(pickGait('walk', 1.0, -1, true)).toBe('run');
    });

    it('justo en el umbral runEnter (inclusive)', () => {
        // ratio = 0.85 exactamente → run
        expect(pickGait('walk', HERO_RUN * GAIT_BAND.runEnter, HERO_RUN, true)).toBe('run');
    });

    it('justo en el umbral runExit (exclusivo)', () => {
        // ratio = 0.75 exactamente → no es < 0.75, conserva run
        expect(pickGait('run', HERO_RUN * GAIT_BAND.runExit, HERO_RUN, true)).toBe('run');
    });

    it('velocidad cero anda', () => {
        expect(pickGait('run', 0, HERO_RUN, true)).toBe('walk');
    });
});
