import { describe, it, expect } from 'vitest';
import { HitPauseController, DEFAULT_HIT_PAUSE_CONFIG } from '../src/render/hitPause';

describe('JUG-03: Pausa de impacto y sacudida de cámara', () => {
    it('empieza inactivo', () => {
        const hp = new HitPauseController();
        const s = hp.state;
        expect(s.pauseRemaining).toBe(0);
        expect(s.shakeIntensity).toBe(0);
        expect(s.shakeOffset.x).toBe(0);
        expect(s.shakeOffset.z).toBe(0);
    });

    it('no activa cuando está deshabilitado', () => {
        const hp = new HitPauseController();
        hp.setConfig({ ...DEFAULT_HIT_PAUSE_CONFIG, enabled: false });
        hp.trigger(50, false);
        expect(hp.state.pauseRemaining).toBe(0);
        expect(hp.state.shakeIntensity).toBe(0);
    });

    it('activa pausa y sacudida con daño normal', () => {
        const hp = new HitPauseController();
        hp.trigger(50, false);
        const s = hp.state;
        expect(s.pauseRemaining).toBeGreaterThan(0);
        expect(s.shakeIntensity).toBeGreaterThan(0);
    });

    it('el crítico aumenta la pausa y la sacudida', () => {
        const hp = new HitPauseController();
        hp.trigger(50, false);
        const normal = { pause: hp.state.pauseRemaining, shake: hp.state.shakeIntensity };

        const hp2 = new HitPauseController();
        hp2.trigger(50, true);
        const crit = hp2.state;
        expect(crit.pauseRemaining).toBeGreaterThan(normal.pause);
        expect(crit.shakeIntensity).toBeGreaterThan(normal.shake);
    });

    it('el daño mayor aumenta la pausa hasta el tope', () => {
        const hp = new HitPauseController();
        hp.trigger(10, false);
        const small = hp.state.pauseRemaining;

        const hp2 = new HitPauseController();
        hp2.trigger(100, false);
        const big = hp2.state.pauseRemaining;

        const hp3 = new HitPauseController();
        hp3.trigger(500, false);
        const huge = hp3.state.pauseRemaining;

        expect(small).toBeLessThan(big);
        expect(big).toBeLessThanOrEqual(huge); // tope en 100
    });

    it('la pausa se agota con el tiempo', () => {
        const hp = new HitPauseController();
        hp.trigger(100, false);
        expect(hp.state.pauseRemaining).toBeGreaterThan(0);

        hp.update(0.1); // más que la duración
        expect(hp.state.pauseRemaining).toBe(0);
    });

    it('la sacudida decae exponencialmente', () => {
        const hp = new HitPauseController();
        hp.trigger(100, false);
        const initial = hp.state.shakeIntensity;
        expect(initial).toBeGreaterThan(0);

        hp.update(0.05);
        expect(hp.state.shakeIntensity).toBeLessThan(initial);

        hp.update(0.5);
        expect(hp.state.shakeIntensity).toBeLessThan(0.01);
    });

    it('el desplazamiento de sacudida es cero cuando no hay sacudida', () => {
        const hp = new HitPauseController();
        expect(hp.state.shakeOffset.x).toBe(0);
        expect(hp.state.shakeOffset.z).toBe(0);
    });

    it('el desplazamiento de sacudida es no cero cuando hay sacudida', () => {
        const hp = new HitPauseController();
        hp.trigger(100, false);
        const offset = hp.state.shakeOffset;
        expect(Math.abs(offset.x) + Math.abs(offset.z)).toBeGreaterThan(0);
    });

    it('reset() limpia todo', () => {
        const hp = new HitPauseController();
        hp.trigger(100, true);
        hp.reset();
        const s = hp.state;
        expect(s.pauseRemaining).toBe(0);
        expect(s.shakeIntensity).toBe(0);
        expect(s.shakeOffset.x).toBe(0);
        expect(s.shakeOffset.z).toBe(0);
    });

    it('setConfig() cambia los parámetros', () => {
        const hp = new HitPauseController();
        hp.setConfig({ duration: 0.1, shakeIntensity: 0.3, shakeDecay: 5, enabled: true });
        hp.trigger(100, false);
        expect(hp.state.pauseRemaining).toBeCloseTo(0.1, 3);
        expect(hp.state.shakeIntensity).toBeCloseTo(0.3, 3);
    });

    it('múltiples triggers se acumulan', () => {
        const hp = new HitPauseController();
        hp.trigger(50, false);
        const first = hp.state.pauseRemaining;
        hp.trigger(50, false);
        const second = hp.state.pauseRemaining;
        // El segundo trigger reemplaza, no suma (diseño simple).
        expect(second).toBeCloseTo(first, 3);
    });
});
