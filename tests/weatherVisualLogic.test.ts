import { describe, expect, it } from 'vitest';
import weatherJson from '../data/weather.json';
import { parseWeather } from '../src/data/weatherSchema';
import { WEATHER_KINDS } from '../src/data/zonesSchema';
import type { WeatherDef } from '../src/data/weatherSchema';
import { weatherVisualState } from '../src/render/weatherVisualLogic';

const visual: WeatherDef['visual'] = {
    clear: { particles: 20, dim: 0.4, fog: 0.08, tint: [0.8, 1.2, 0.6] },
    rain: { particles: 240, dim: 0.4, fog: 0.08, tint: [0.8, 1.2, 0.6] },
    sun: { particles: 0, dim: 0, fog: 0, tint: [1, 1, 1] },
    snow: { particles: 80, dim: 0.2, fog: 0.04, tint: [0.6, 1.1, 1.4] },
};

describe('weatherVisualState', () => {
    it('aplica partículas, niebla y luz de cada tiempo configurado', () => {
        const weather = parseWeather(weatherJson);

        for (const kind of WEATHER_KINDS) {
            const configured = weather.visual[kind];
            const state = weatherVisualState(weather.visual, kind, 1);
            const emitter = kind === 'rain' ? 'rain' : kind === 'snow' ? 'snow' : null;

            expect(state).toEqual({
                rainEmitRate: emitter === 'rain' ? configured.particles : 0,
                snowEmitRate: emitter === 'snow' ? configured.particles : 0,
                rainActive: emitter === 'rain' && configured.particles > 0.01,
                snowActive: emitter === 'snow' && configured.particles > 0.01,
                dim: configured.dim,
                fog: configured.fog,
                tint: configured.tint,
            });
        }
    });

    it('scales rain particles and atmosphere by the weather intensity', () => {
        expect(weatherVisualState(visual, 'rain', 0.5)).toEqual({
            rainEmitRate: 120,
            snowEmitRate: 0,
            rainActive: true,
            snowActive: false,
            dim: 0.2,
            fog: 0.04,
            tint: [0.9, 1.1, 0.8],
        });
    });

    it('selects snow particles and keeps the existing activation threshold', () => {
        expect(weatherVisualState(visual, 'snow', 0.01)).toEqual({
            rainEmitRate: 0,
            snowEmitRate: 0.8,
            rainActive: false,
            snowActive: false,
            dim: 0.002,
            fog: 0.0004,
            tint: [0.996, 1.001, 1.004],
        });
    });

    it('uses the clear visual for explicit clear weather', () => {
        expect(weatherVisualState(visual, 'clear', 0.25)).toEqual({
            rainEmitRate: 0,
            snowEmitRate: 0,
            rainActive: false,
            snowActive: false,
            dim: 0.1,
            fog: 0.02,
            tint: [0.95, 1.05, 0.9],
        });
    });

    it('turns weather off indoors regardless of the supplied intensity', () => {
        expect(weatherVisualState(visual, null, 1)).toEqual({
            rainEmitRate: 0,
            snowEmitRate: 0,
            rainActive: false,
            snowActive: false,
            dim: 0,
            fog: 0,
            tint: [1, 1, 1],
        });
    });
});