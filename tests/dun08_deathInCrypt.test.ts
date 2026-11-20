import { describe, it, expect } from 'vitest';
import { SpectralState } from '../src/rpg/spectral';

describe('DUN-08: Muerte dentro de la cripta', () => {
    const def = {
        speedMultiplier: 0.72,
        resurrectRadius: 3,
        pulseAtZero: 'weakened' as const,
        resurrectors: [{ id: 'test', name: 'Test', region: 'test', x: 0, y: 0 }],
    };

    it('al morir, el estado espectral se activa', () => {
        const s = new SpectralState(def);
        expect(s.active).toBe(false);
        s.die();
        expect(s.active).toBe(true);
        expect(s.deaths).toBe(1);
    });

    it('rememberFloor guarda el piso y takeFloor lo devuelve una vez', () => {
        const s = new SpectralState(def);
        s.rememberFloor(49); // piso 50 (0-indexed)
        expect(s.lastDungeonFloor).toBe(49);
        const f = s.takeFloor();
        expect(f).toBe(49);
        // Segunda llamada devuelve null
        expect(s.takeFloor()).toBeNull();
    });

    it('rememberFloor ignora pisos negativos', () => {
        const s = new SpectralState(def);
        s.rememberFloor(-1);
        expect(s.lastDungeonFloor).toBeNull();
    });

    it('un espectro no puede combatir ni saquear', () => {
        const s = new SpectralState(def);
        s.die();
        expect(s.canFight()).toBe(false);
        expect(s.canLoot()).toBe(false);
        expect(s.ignoredByEnemies()).toBe(true);
    });

    it('la velocidad se reduce en forma espectral', () => {
        const s = new SpectralState(def);
        expect(s.speed(6)).toBe(6); // normal
        s.die();
        expect(s.speed(6)).toBeCloseTo(4.32); // 6 * 0.72
    });

    it('resurrectAt solo funciona dentro del radio de un Alzador', () => {
        const s = new SpectralState(def);
        s.die();
        // Fuera del radio (resurrectRadius = 3)
        expect(s.resurrectAt('test', { x: 10, y: 0 })).toBe(false);
        expect(s.active).toBe(true);
        // Dentro del radio
        expect(s.resurrectAt('test', { x: 1, y: 0 })).toBe(true);
        expect(s.active).toBe(false);
    });

    it('resurrectAt rechaza coordenadas inválidas', () => {
        const s = new SpectralState(def);
        s.die();
        expect(s.resurrectAt('test', { x: NaN, y: 0 })).toBe(false);
        expect(s.resurrectAt('test', { x: Infinity, y: 0 })).toBe(false);
    });

    it('toSave incluye lastDungeonFloor cuando está guardado', () => {
        const s = new SpectralState(def);
        s.rememberFloor(99);
        s.die();
        const saved = s.toSave();
        expect(saved.active).toBe(true);
        expect(saved.deaths).toBe(1);
        expect(saved.lastDungeonFloor).toBe(99);
    });

    it('cargar guardado con lastDungeonFloor restaura el piso', () => {
        const s = new SpectralState(def, { active: true, deaths: 2, lastDungeonFloor: 74 });
        expect(s.active).toBe(true);
        expect(s.deaths).toBe(2);
        expect(s.lastDungeonFloor).toBe(74);
    });

    it('cargar guardado sin lastDungeonFloor da null', () => {
        const s = new SpectralState(def, { active: false, deaths: 0 });
        expect(s.lastDungeonFloor).toBeNull();
    });
});
