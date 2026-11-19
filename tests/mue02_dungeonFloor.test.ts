import { describe, it, expect } from 'vitest';
import { parseSpectralDef, SpectralState } from '../src/rpg/spectral';

const spectralDef = parseSpectralDef({
    speedMultiplier: 0.5,
    resurrectRadius: 5,
    pulseAtZero: 'longRevive',
    resurrectors: [{ id: 'piedra_1', name: 'Piedra Pintada', region: 'pueblo', x: 100, y: 100 }],
}) as ReturnType<typeof parseSpectralDef>;

describe('MUE-02: Retomar piso de la cripta', () => {
    it('estado nuevo sin piso guardado', () => {
        const s = new SpectralState(spectralDef);
        expect(s.lastDungeonFloor).toBeNull();
        expect(s.active).toBe(false);
    });

    it('rememberFloor guarda el piso', () => {
        const s = new SpectralState(spectralDef);
        s.rememberFloor(5);
        expect(s.lastDungeonFloor).toBe(5);
    });

    it('rememberFloor ignora pisos negativos', () => {
        const s = new SpectralState(spectralDef);
        s.rememberFloor(-1);
        expect(s.lastDungeonFloor).toBeNull();
    });

    it('rememberFloor acepta piso 0', () => {
        const s = new SpectralState(spectralDef);
        s.rememberFloor(0);
        expect(s.lastDungeonFloor).toBe(0);
    });

    it('takeFloor devuelve y borra el piso', () => {
        const s = new SpectralState(spectralDef);
        s.rememberFloor(7);
        const f = s.takeFloor();
        expect(f).toBe(7);
        expect(s.lastDungeonFloor).toBeNull();
    });

    it('takeFloor devuelve null si no hay piso', () => {
        const s = new SpectralState(spectralDef);
        expect(s.takeFloor()).toBeNull();
    });

    it('toSave incluye lastDungeonFloor cuando hay piso', () => {
        const s = new SpectralState(spectralDef);
        s.rememberFloor(3);
        const saved = s.toSave();
        expect(saved.lastDungeonFloor).toBe(3);
    });

    it('toSave omite lastDungeonFloor cuando no hay piso', () => {
        const s = new SpectralState(spectralDef);
        const saved = s.toSave();
        expect(saved.lastDungeonFloor).toBeUndefined();
    });

    it('constructor carga lastDungeonFloor desde guardado', () => {
        const s = new SpectralState(spectralDef, { active: false, deaths: 2, lastDungeonFloor: 4 });
        expect(s.lastDungeonFloor).toBe(4);
        expect(s.deaths).toBe(2);
    });

    it('constructor ignora lastDungeonFloor negativa', () => {
        const s = new SpectralState(spectralDef, { lastDungeonFloor: -5 });
        expect(s.lastDungeonFloor).toBeNull();
    });

    it('constructor ignora lastDungeonFloor no numérico', () => {
        const s = new SpectralState(spectralDef, { lastDungeonFloor: 'hola' as unknown as number });
        expect(s.lastDungeonFloor).toBeNull();
    });

    it('guardado viejo sin lastDungeonFloor carga sin error', () => {
        const s = new SpectralState(spectralDef, { active: false, deaths: 0 });
        expect(s.lastDungeonFloor).toBeNull();
    });

    it('die no borra el piso guardado', () => {
        const s = new SpectralState(spectralDef);
        s.rememberFloor(10);
        s.die();
        expect(s.active).toBe(true);
        expect(s.lastDungeonFloor).toBe(10);
    });

    it('resurrectAt no borra el piso guardado', () => {
        const s = new SpectralState(spectralDef);
        s.rememberFloor(2);
        s.die();
        const ok = s.resurrectAt('piedra_1', { x: 100, y: 100 });
        expect(ok).toBe(true);
        expect(s.active).toBe(false);
        // El piso se conserva hasta que se usa o se toma con takeFloor.
        expect(s.lastDungeonFloor).toBe(2);
    });
});
