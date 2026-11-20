import { describe, expect, it } from 'vitest';
import {
    DEFAULT_OPTIONS,
    MemoryStore,
    OPTION_LIMITS,
    loadOptions,
    normalizeOptions,
    saveOptions,
} from '../src/ui/menus/saveStore';
import { BUSES } from '../src/audio/data';
import type { VolumeOptions } from '../src/audio/director';

describe('AUD-J1: volúmenes separados', () => {
    it('BUSES incluye music, sfx, ambience y ui', () => {
        expect(BUSES).toContain('master');
        expect(BUSES).toContain('music');
        expect(BUSES).toContain('sfx');
        expect(BUSES).toContain('ambience');
        expect(BUSES).toContain('ui');
    });

    it('GameOptions tiene los 5 campos de volumen', () => {
        const o = normalizeOptions({});
        expect(o.volume).toBe(DEFAULT_OPTIONS.volume);
        expect(o.musicVolume).toBe(DEFAULT_OPTIONS.musicVolume);
        expect(o.sfxVolume).toBe(DEFAULT_OPTIONS.sfxVolume);
        expect(o.ambienceVolume).toBe(DEFAULT_OPTIONS.ambienceVolume);
        expect(o.uiVolume).toBe(DEFAULT_OPTIONS.uiVolume);
    });

    it('DEFAULT_OPTIONS tiene valores distintos para cada bus', () => {
        // Música más baja por defecto; efectos al máximo; ambiente e interfaz intermedios.
        expect(DEFAULT_OPTIONS.volume).toBe(0.8);
        expect(DEFAULT_OPTIONS.musicVolume).toBe(0.8);
        expect(DEFAULT_OPTIONS.sfxVolume).toBe(1);
        expect(DEFAULT_OPTIONS.ambienceVolume).toBe(0.7);
        expect(DEFAULT_OPTIONS.uiVolume).toBe(0.6);
    });

    it('OPTION_LIMITS define ambienceVolume y uiVolume (0..1, paso 0.05)', () => {
        expect(OPTION_LIMITS.ambienceVolume).toEqual({ min: 0, max: 1, step: 0.05 });
        expect(OPTION_LIMITS.uiVolume).toEqual({ min: 0, max: 1, step: 0.05 });
    });

    it('normalizeOptions acepta valores personalizados para los 4 buses', () => {
        const o = normalizeOptions({
            volume: 0.5,
            musicVolume: 0.3,
            sfxVolume: 0.9,
            ambienceVolume: 0.4,
            uiVolume: 0.2,
        });
        expect(o.volume).toBe(0.5);
        expect(o.musicVolume).toBe(0.3);
        expect(o.sfxVolume).toBe(0.9);
        expect(o.ambienceVolume).toBe(0.4);
        expect(o.uiVolume).toBe(0.2);
    });

    it('normalizeOptions recorta ambienceVolume y uiVolume a los límites', () => {
        const o = normalizeOptions({
            ambienceVolume: 2,
            uiVolume: -0.5,
        });
        expect(o.ambienceVolume).toBe(1);
        expect(o.uiVolume).toBe(0);
    });

    it('normalizeOptions usa el default cuando faltan los campos nuevos', () => {
        // Guardado antiguo sin ambienceVolume ni uiVolume.
        const o = normalizeOptions({ volume: 0.6, musicVolume: 0.4, sfxVolume: 0.8 });
        expect(o.ambienceVolume).toBe(DEFAULT_OPTIONS.ambienceVolume);
        expect(o.uiVolume).toBe(DEFAULT_OPTIONS.uiVolume);
    });

    it('saveOptions / loadOptions conserva los 5 volúmenes', () => {
        const store = new MemoryStore();
        const opts = {
            ...DEFAULT_OPTIONS,
            volume: 0.5,
            musicVolume: 0.3,
            sfxVolume: 0.9,
            ambienceVolume: 0.4,
            uiVolume: 0.2,
        };
        saveOptions(store, opts);
        const loaded = loadOptions(store);
        expect(loaded.volume).toBe(0.5);
        expect(loaded.musicVolume).toBe(0.3);
        expect(loaded.sfxVolume).toBe(0.9);
        expect(loaded.ambienceVolume).toBe(0.4);
        expect(loaded.uiVolume).toBe(0.2);
    });

    it('loadOptions con guardado vacío recibe los defaults nuevos', () => {
        const store = new MemoryStore();
        const loaded = loadOptions(store);
        expect(loaded.ambienceVolume).toBe(DEFAULT_OPTIONS.ambienceVolume);
        expect(loaded.uiVolume).toBe(DEFAULT_OPTIONS.uiVolume);
    });

    it('VolumeOptions tiene los 5 campos', () => {
        // Verificación estática: si compila, la interfaz tiene los campos.
        const vol: VolumeOptions = {
            volume: 1,
            musicVolume: 1,
            sfxVolume: 1,
            ambienceVolume: 1,
            uiVolume: 1,
        };
        expect(vol.ambienceVolume).toBeDefined();
        expect(vol.uiVolume).toBeDefined();
    });

    it('un guardado con solo volume y musicVolume conserva los nuevos defaults', () => {
        const mem = new MemoryStore();
        mem.setItem('frankmangames.options', JSON.stringify({ volume: 0.5, musicVolume: 0.7 }));
        const loaded = loadOptions(mem);
        expect(loaded.volume).toBe(0.5);
        expect(loaded.musicVolume).toBe(0.7);
        expect(loaded.ambienceVolume).toBe(DEFAULT_OPTIONS.ambienceVolume);
        expect(loaded.uiVolume).toBe(DEFAULT_OPTIONS.uiVolume);
        expect(loaded.sfxVolume).toBe(DEFAULT_OPTIONS.sfxVolume);
    });
});
