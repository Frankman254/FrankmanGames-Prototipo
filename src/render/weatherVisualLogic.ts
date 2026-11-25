import type { WeatherDef } from '../data/weatherSchema';
import type { WeatherKind } from '../data/zonesSchema';

export interface WeatherVisualState {
    rainEmitRate: number;
    snowEmitRate: number;
    rainActive: boolean;
    snowActive: boolean;
    dim: number;
    fog: number;
    tint: [number, number, number];
}

export function weatherVisualState(
    visual: WeatherDef['visual'],
    kind: WeatherKind | null,
    intensity: number,
): WeatherVisualState {
    const weather = kind ?? 'clear';
    const values = visual[weather];
    const level = kind ? intensity : 0;
    const mix = (channel: number): number => 1 + (channel - 1) * level;

    return {
        rainEmitRate: weather === 'rain' ? values.particles * level : 0,
        snowEmitRate: weather === 'snow' ? values.particles * level : 0,
        rainActive: weather === 'rain' && level > 0.01,
        snowActive: weather === 'snow' && level > 0.01,
        dim: values.dim * level,
        fog: values.fog * level,
        tint: [mix(values.tint[0]), mix(values.tint[1]), mix(values.tint[2])],
    };
}