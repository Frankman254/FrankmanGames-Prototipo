// JL-96: Prueba de migración de una partida vieja "dorada": una partida de antes
// de JL-59 (escala del HUD como número) y JL-65 (modo de cámara legacy) carga con
// los valores correctos tras la migración.
import { describe, expect, it } from 'vitest';
import { LEGACY_CAMERA_MODE_MAP } from '../src/camera/types';
import { loadOptions, normalizeOptions } from '../src/ui/menus/saveStore';
import { MemoryStore } from '../src/ui/menus/saveStore';
import { normalizeProfiles, parseScales, migrateScale } from '../src/ui/map/hudProfiles';

describe('JL-96: migración de partida vieja (HUD scale + cámara)', () => {
    /* ── HUD: escala de número a {x, y} ── */

    describe('parseScales: migración de número a {x, y}', () => {
        it('un número único se convierte en {x, y} iguales', () => {
            const raw = { 'hud-bar': 1.2, 'minimap': 0.8 };
            const parsed = parseScales(raw);
            expect(parsed['hud-bar']).toEqual({ x: 1.2, y: 1.2 });
            expect(parsed['minimap']).toEqual({ x: 0.8, y: 0.8 });
        });

        it('un {x, y} ya migrado se conserva', () => {
            const raw = { 'hud-bar': { x: 1.4, y: 0.9 } };
            const parsed = parseScales(raw);
            expect(parsed['hud-bar']).toEqual({ x: 1.4, y: 0.9 });
        });

        it('mezcla de número y {x, y} en el mismo perfil', () => {
            const raw = {
                'hud-bar': 1.0,
                'minimap': { x: 1.3, y: 1.3 },
                'chat': { x: 0.8, y: 1.1 },
            };
            const parsed = parseScales(raw);
            expect(parsed['hud-bar']).toEqual({ x: 1, y: 1 });
            expect(parsed['minimap']).toEqual({ x: 1.3, y: 1.3 });
            expect(parsed['chat']).toEqual({ x: 0.8, y: 1.1 });
        });

        it('valores fuera de rango se clampean', () => {
            const raw = { 'hud-bar': 3.0, 'minimap': 0.1 };
            const parsed = parseScales(raw);
            // HUD_SCALE_MAX = 1.8, HUD_SCALE_MIN = 0.6
            const bar = parsed['hud-bar'];
            const mini = parsed['minimap'];
            expect(bar).toBeDefined();
            expect(mini).toBeDefined();
            expect(bar!.x).toBeLessThanOrEqual(1.8);
            expect(bar!.y).toBeLessThanOrEqual(1.8);
            expect(mini!.x).toBeGreaterThanOrEqual(0.6);
            expect(mini!.y).toBeGreaterThanOrEqual(0.6);
        });

        it('input nulo o inválido devuelve objeto vacío', () => {
            expect(parseScales(null)).toEqual({});
            expect(parseScales(undefined)).toEqual({});
            expect(parseScales('bad')).toEqual({});
            expect(parseScales(42)).toEqual({});
        });

        it('migrateScale clampa y devuelve {x, y}', () => {
            const result = migrateScale(1.5);
            expect(result).toEqual({ x: 1.5, y: 1.5 });
        });
    });

    describe('normalizeProfiles: perfiles viejos con escala numérica', () => {
        it('un perfil guardado con scales como números los migra a {x, y}', () => {
            const raw = {
                active: 'p1',
                profiles: [
                    {
                        id: 'p1',
                        name: 'Principal',
                        positions: {},
                        minimapSize: null,
                        scales: { 'hud-bar': 1.3, 'minimap': 0.9 },
                    },
                ],
            };
            // Verificar que parseScales funciona con los datos crudos
            const rawScales = (raw.profiles as any[])[0].scales;
            const parsed = parseScales(rawScales);
            expect(parsed['hud-bar']).toEqual({ x: 1.3, y: 1.3 });

            const state = normalizeProfiles(raw);
            const profile = state.profiles.find((p) => p.id === state.active)!;
            expect(profile.scales).toBeDefined();
            expect(Object.keys(profile.scales!)).toHaveLength(2);
            expect(profile.scales!['hud-bar']).toEqual({ x: 1.3, y: 1.3 });
            expect(profile.scales!['minimap']).toEqual({ x: 0.9, y: 0.9 });
        });

        it('un perfil sin scales no se rompe', () => {
            const raw = {
                active: 'p1',
                profiles: [
                    {
                        id: 'p1',
                        name: 'Principal',
                        positions: {},
                        minimapSize: null,
                    },
                ],
            };
            const state = normalizeProfiles(raw);
            const profile = state.profiles.find((p) => p.id === state.active)!;
            // parseScales(undefined) devuelve {} — el perfil tiene scales vacías, no undefined
            expect(profile.scales).toEqual({});
        });
    });

    /* ── Cámara: modos legacy a nuevos ── */

    describe('normalizeOptions: migración de cameraMode', () => {
        it('follow → manual', () => {
            const opts = normalizeOptions({ cameraMode: 'follow' });
            expect(opts.cameraMode).toBe('manual');
        });

        it('smart → auto', () => {
            const opts = normalizeOptions({ cameraMode: 'smart' });
            expect(opts.cameraMode).toBe('auto');
        });

        it('autoFocus → combat', () => {
            const opts = normalizeOptions({ cameraMode: 'autoFocus' });
            expect(opts.cameraMode).toBe('combat');
        });

        it('zone se conserva', () => {
            const opts = normalizeOptions({ cameraMode: 'zone' });
            expect(opts.cameraMode).toBe('zone');
        });

        it('un modo nuevo se conserva', () => {
            const opts = normalizeOptions({ cameraMode: 'semiAuto' });
            expect(opts.cameraMode).toBe('semiAuto');
        });

        it('un modo desconocido vuelve al por defecto (manual)', () => {
            const opts = normalizeOptions({ cameraMode: 'unknown_mode' });
            expect(opts.cameraMode).toBe('manual');
        });

        it('LEGACY_CAMERA_MODE_MAP cubre los 3 modos antiguos', () => {
            expect(LEGACY_CAMERA_MODE_MAP['follow']).toBe('manual');
            expect(LEGACY_CAMERA_MODE_MAP['smart']).toBe('auto');
            expect(LEGACY_CAMERA_MODE_MAP['autoFocus']).toBe('combat');
        });
    });

    /* ── Integración: partida completa con opciones y perfiles viejos ── */

    describe('migración integrada: opciones + perfiles HUD', () => {
        it('una partida con cameraMode "follow" y scales numéricas carga correctamente', () => {
            // Opciones viejas: cámara "follow", HUD con escala numérica
            const oldOptions = {
                cameraMode: 'follow',
                uiScale: 1.0,
            };
            const oldProfiles = {
                active: 'p1',
                profiles: [
                    {
                        id: 'p1',
                        name: 'Principal',
                        positions: {},
                        minimapSize: null,
                        scales: { 'hud-bar': 1.2, 'minimap': 1.0, 'chat': 0.9 },
                    },
                ],
            };

            // Migrar opciones
            const opts = normalizeOptions(oldOptions);
            expect(opts.cameraMode).toBe('manual');

            // Migrar perfiles
            const profiles = normalizeProfiles(oldProfiles);
            const p = profiles.profiles.find((pr) => pr.id === profiles.active)!;
            expect(p.scales?.['hud-bar']).toEqual({ x: 1.2, y: 1.2 });
            expect(p.scales?.['minimap']).toEqual({ x: 1, y: 1 });
            expect(p.scales?.['chat']).toEqual({ x: 0.9, y: 0.9 });
        });

        it('una partida con cameraMode "smart" y sin scales no se rompe', () => {
            const oldOptions = { cameraMode: 'smart' };
            const oldProfiles = {
                active: 'p1',
                profiles: [
                    {
                        id: 'p1',
                        name: 'Principal',
                        positions: {},
                        minimapSize: null,
                    },
                ],
            };

            const opts = normalizeOptions(oldOptions);
            expect(opts.cameraMode).toBe('auto');

            const profiles = normalizeProfiles(oldProfiles);
            const p = profiles.profiles.find((pr) => pr.id === profiles.active)!;
            // parseScales(undefined) devuelve {} — el perfil tiene scales vacías
            expect(p.scales).toEqual({});
        });

        it('una partida con cameraMode "autoFocus" y scales mixtas', () => {
            const oldOptions = { cameraMode: 'autoFocus' };
            const oldProfiles = {
                active: 'p1',
                profiles: [
                    {
                        id: 'p1',
                        name: 'Principal',
                        positions: {},
                        minimapSize: null,
                        scales: {
                            'hud-bar': 1.5, // número viejo
                            'minimap': { x: 1.2, y: 1.4 }, // ya migrado
                        },
                    },
                ],
            };

            const opts = normalizeOptions(oldOptions);
            expect(opts.cameraMode).toBe('combat');

            const profiles = normalizeProfiles(oldProfiles);
            const p = profiles.profiles.find((pr) => pr.id === profiles.active)!;
            expect(p.scales?.['hud-bar']).toEqual({ x: 1.5, y: 1.5 });
            expect(p.scales?.['minimap']).toEqual({ x: 1.2, y: 1.4 });
        });
    });

    /* ── SaveStore: las opciones se leen y migran correctamente ── */

    describe('loadOptions: opciones migradas desde localStorage', () => {
        it('cargar opciones con cameraMode legacy las migra al leer', () => {
            const mem = new MemoryStore();
            // Simula opciones guardadas con cameraMode legacy
            const legacyRaw = { cameraMode: 'follow', uiScale: 1.1 };
            mem.setItem('frankmangames.options', JSON.stringify(legacyRaw));

            const opts = loadOptions(mem);
            expect(opts.cameraMode).toBe('manual');
            expect(opts.uiScale).toBe(1.1);
        });
    });
});
