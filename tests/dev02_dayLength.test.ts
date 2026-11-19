// DEV-02 (creador, 2026-11-18): el día dura 20 minutos por defecto, una partida
// nueva empieza por la mañana y cambiar la duración no salta la hora del día.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadWorldData } from '../src/data/worldData';
import {
    DAY_LENGTH_DEFAULT_MINUTES,
    DAY_LENGTH_MINUTES,
    dayLengthSeconds,
    dayPhaseName,
    normalizeDayLengthMinutes,
} from '../src/world/dayNight';
import { DEFAULT_OPTIONS, normalizeOptions } from '../src/ui/menus/saveStore';

describe('DEV-02: duración del día', () => {
    it('las opciones elegibles son 5, 10, 20, 30 y 60 minutos', () => {
        expect([...DAY_LENGTH_MINUTES]).toEqual([5, 10, 20, 30, 60]);
    });

    it('por defecto el día dura 20 minutos (antes 5), en las opciones y en los datos', () => {
        expect(DAY_LENGTH_DEFAULT_MINUTES).toBe(20);
        expect(DEFAULT_OPTIONS.dayLengthMinutes).toBe(20);
        // `data/lighting.json` trae la nueva duración por defecto (1200 s = 20 min).
        expect(loadWorldData().lighting.dayLengthSeconds).toBe(1200);
        expect(loadGameData().lighting.dayLengthSeconds).toBe(1200);
        expect(dayLengthSeconds(20)).toBe(1200);
        // Duración antigua: seguía elegible.
        expect(dayLengthSeconds(5)).toBe(300);
    });

    it('la normalización sólo admite las cinco duraciones; lo demás cae al defecto', () => {
        for (const m of DAY_LENGTH_MINUTES) {
            expect(normalizeDayLengthMinutes(m)).toBe(m);
            expect(normalizeDayLengthMinutes(String(m))).toBe(m);
        }
        expect(normalizeDayLengthMinutes(7)).toBe(20);
        expect(normalizeDayLengthMinutes(0)).toBe(20);
        expect(normalizeDayLengthMinutes(1440)).toBe(20);
        expect(normalizeDayLengthMinutes('20min')).toBe(20);
        expect(normalizeDayLengthMinutes(undefined)).toBe(20);
        expect(normalizeDayLengthMinutes(null)).toBe(20);
        // Las opciones guardadas por un jugador pasan la misma regla.
        expect(normalizeOptions({ ...DEFAULT_OPTIONS, dayLengthMinutes: 7 }).dayLengthMinutes).toBe(20);
        expect(normalizeOptions({ ...DEFAULT_OPTIONS, dayLengthMinutes: 60 }).dayLengthMinutes).toBe(60);
        // Un guardado antiguo sin la clave recibe el defecto.
        const { dayLengthMinutes: _drop, ...old } = DEFAULT_OPTIONS;
        expect(normalizeOptions(old).dayLengthMinutes).toBe(20);
    });
});

describe('DEV-02: la hora inicial y el cambio sin salto', () => {
    it('una partida nueva empieza por la mañana (la hora inicial de `lighting.json`)', () => {
        const start = loadWorldData().lighting.startTime;
        // main.ts fija `world.timeOfDay = data.lighting.startTime` al crear la partida.
        expect(dayPhaseName(start, loadGameData().weather?.night)).toBe('Mañana');
    });

    it('cambiar la duración conserva la fracción del día: la hora no salta', () => {
        // El reloj de la simulación (src/sim/world.ts): t' = (t + dt·timeScale) / day % 1.
        // main.ts cambia sólo el divisor; `timeOfDay` no se toca, así que la hora sigue.
        const w = loadGameData();
        const def = w.lighting;
        const t = 0.5; // mediodía
        const dt = 60; // un minuto real
        def.dayLengthSeconds = dayLengthSeconds(20);
        const after20 = (t + dt / def.dayLengthSeconds) % 1;
        def.dayLengthSeconds = dayLengthSeconds(5);
        // El cambio de opción no reescribe `timeOfDay`: el siguiente tic sigue de mediodía.
        const afterSwitch = (after20 + dt / def.dayLengthSeconds) % 1;
        expect(after20).toBeGreaterThan(0.5);
        expect(afterSwitch).toBeGreaterThan(after20);
        expect(afterSwitch - after20).toBeLessThan(0.5); // no saltó (p. ej. a la noche)
        // Con el día corto el reloj avanza 4 veces más deprisa, desde la misma hora.
        expect((afterSwitch - after20) / (dt / dayLengthSeconds(20))).toBeCloseTo(4, 6);
    });

    it('cada duración da su velocidad de reloj desde la misma hora', () => {
        const def = loadGameData().lighting;
        const night = loadGameData().weather?.night;
        const t = 0.5; // mediodía
        const dt = 60; // un minuto real de simulación (timeScale = 1)
        for (const min of DAY_LENGTH_MINUTES) {
            def.dayLengthSeconds = dayLengthSeconds(min);
            const next = (t + dt / def.dayLengthSeconds) % 1;
            // Un minuto real recorre la fracción 1/(min·60) del día; cuanto más corto, más avanza.
            expect(next - t).toBeCloseTo(dt / dayLengthSeconds(min), 9);
            // La hora del instante actual no depende del divisor: cambiarlo no la mueve.
            expect(dayPhaseName(t, night)).toBe('Tarde');
        }
        // Orden estricto: 5 min corre el reloj más deprisa que 60 min.
        def.dayLengthSeconds = dayLengthSeconds(5);
        const fast = (t + dt / def.dayLengthSeconds) % 1 - t;
        def.dayLengthSeconds = dayLengthSeconds(60);
        const slow = (t + dt / def.dayLengthSeconds) % 1 - t;
        expect(fast).toBeGreaterThan(slow);
    });
});
