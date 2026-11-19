// LUZ-02 y LUZ-03 (creador, 2026-11-19: «de día se ven zonas oscuras, la luz no se propaga
// correctamente»; «el personaje debe tener luz propia para iluminar donde camina»).
// Modos de iluminación que se ponen encima de la luz de la hora (`data/lighting.json`) y de la
// de los interiores, sin tocar esos datos:
//  - más ambiente: lo que no da el sol no se queda negro;
//  - rebote: el color de abajo de la luz ambiente se acerca al del cielo y al del sol, como la
//    luz que devuelve el suelo, así que costados y bajos de casas, árboles y personajes reciben
//    luz;
//  - sombras menos cerradas;
//  - luz propia del personaje también de día, más tenue; de noche y en la cripta la de siempre.
// Puro: sin Babylon, así se prueba solo. Las cifras son PROPUESTA de arte.
import type { LightState, Rgb } from '../world/dayNight';

export const LIGHT_MODES = ['vivo', 'claro', 'calido', 'original'] as const;
export type LightMode = (typeof LIGHT_MODES)[number];

export interface LightModeDef {
    name: string;
    /** Multiplica la luz ambiente. */
    ambient: number;
    /** Multiplica el sol (o la luna). */
    sun: number;
    /** 0 = el suelo no devuelve luz (como antes); 1 = el bajo recibe tanto como el cielo. */
    bounce: number;
    /** Oscuridad de la sombra (Babylon: 0 negra, 1 sin sombra). null = la de los datos. */
    shadowDarkness: number | null;
    /** Tinte del sol y del cielo (1 = sin tinte). */
    tint: Rgb;
    /** Luz del personaje de día, de 0 a 1 (de noche y en interiores va entera). */
    heroDay: number;
}

export const LIGHT_MODE_DEFS: Record<LightMode, LightModeDef> = {
    vivo: { name: 'Vivo', ambient: 1.25, sun: 1.05, bounce: 0.5, shadowDarkness: 0.58, tint: [1, 1, 1], heroDay: 0.35 },
    claro: { name: 'Claro', ambient: 1.45, sun: 1, bounce: 0.7, shadowDarkness: 0.7, tint: [1, 1, 1], heroDay: 0.35 },
    calido: {
        name: 'Cálido',
        ambient: 1.3,
        sun: 1.02,
        bounce: 0.55,
        shadowDarkness: 0.6,
        tint: [1.06, 0.98, 0.88],
        heroDay: 0.35,
    },
    original: { name: 'Original (como antes)', ambient: 1, sun: 1, bounce: 0, shadowDarkness: null, tint: [1, 1, 1], heroDay: 0 },
};

/** La parte del estado que el modo cambia (también la usa la luz fija de los interiores). */
export interface ModeLight {
    sun: number;
    sunColor: Rgb;
    ambient: number;
    skyColor: Rgb;
    groundColor: Rgb;
}

const clamp1 = (v: number): number => Math.min(1, Math.max(0, v));

/**
 * Aplica el modo a una luz. El rebote mezcla el color de abajo con el del cielo más un poco
 * del sol, en proporción a lo que brille el sol: de noche apenas cambia.
 */
export function applyLightMode<T extends ModeLight>(s: T, mode: LightMode): T {
    const m = LIGHT_MODE_DEFS[mode];
    if (mode === 'original') return s;
    const sunK = Math.min(1, s.sun / 1.2);
    const tint = (c: Rgb): Rgb => [clamp1(c[0] * m.tint[0]), clamp1(c[1] * m.tint[1]), clamp1(c[2] * m.tint[2])];
    const sky = tint(s.skyColor);
    const sunColor = tint(s.sunColor);
    const bounce = (i: 0 | 1 | 2): number => {
        const lit = sky[i] * 0.6 + sunColor[i] * 0.35 * sunK;
        return clamp1(s.groundColor[i] + (Math.max(lit, s.groundColor[i]) - s.groundColor[i]) * m.bounce);
    };
    return {
        ...s,
        sun: s.sun * m.sun,
        sunColor,
        ambient: s.ambient * m.ambient,
        skyColor: sky,
        groundColor: [bounce(0), bounce(1), bounce(2)],
    };
}

/** Cuánto luce la luz del personaje (0–1): la de la hora, con un mínimo de día según el modo. */
export function heroLightLevel(state: Pick<LightState, 'playerLight'>, mode: LightMode, on: boolean): number {
    if (!on) return 0;
    return Math.max(state.playerLight, LIGHT_MODE_DEFS[mode].heroDay);
}
