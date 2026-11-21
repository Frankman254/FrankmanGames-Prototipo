// JL-60: Posiciones por defecto según la forma de la pantalla.
import { describe, it, expect } from 'vitest';
import {
    getAspectClass,
    safeZone,
    getDefaultPositions,
    checkDefaultPositionsOverlap,
    checkDefaultPositionsFit,
    type AspectClass,
} from '../src/ui/map/hudProfiles';

describe('JL-60: clases de proporción', () => {
    it('1920x1080 → 16:9', () => {
        expect(getAspectClass(1920, 1080)).toBe('16:9');
    });

    it('1366x768 → 16:9 (ratio 1.778, ≤1.78 → 16:9)', () => {
        // 1366/768 = 1.778... ≤ 1.78 → 16:9
        expect(getAspectClass(1366, 768)).toBe('16:9');
    });

    it('2000x1191 → 16:9 (ratio 1.679, ≤1.78 → 16:9)', () => {
        // 2000/1191 = 1.679... ≤ 1.78 → 16:9
        expect(getAspectClass(2000, 1191)).toBe('16:9');
    });

    it('2560x1080 → 21:9', () => {
        expect(getAspectClass(2560, 1080)).toBe('21:9');
    });

    it('3440x1440 → 21:9', () => {
        expect(getAspectClass(3440, 1440)).toBe('21:9');
    });

    it('5120x1440 → 32:9', () => {
        expect(getAspectClass(5120, 1440)).toBe('32:9');
    });

    it('1024x768 (4:3) → 16:9 (ratio 1.33, ≤1.7)', () => {
        expect(getAspectClass(1024, 768)).toBe('16:9');
    });

    it('viewport inválido → 16:9 por defecto', () => {
        expect(getAspectClass(0, 1080)).toBe('16:9');
        expect(getAspectClass(1920, 0)).toBe('16:9');
    });
});

describe('JL-60: zona segura', () => {
    it('16:9: zona segura = viewport completo', () => {
        const z = safeZone(1920, 1080, '16:9');
        expect(z).toEqual({ left: 0, top: 0, right: 1920, bottom: 1080 });
    });

    it('16:10: zona segura = viewport completo', () => {
        const z = safeZone(2000, 1191, '16:10');
        expect(z).toEqual({ left: 0, top: 0, right: 2000, bottom: 1191 });
    });

    it('21:9: zona segura centrada de proporción 16:9', () => {
        const z = safeZone(2560, 1080, '21:9');
        // safeW = 1080 * 16/9 = 1920; left = (2560-1920)/2 = 320
        expect(z.left).toBe(320);
        expect(z.right).toBe(2560 - 320);
        expect(z.top).toBe(0);
        expect(z.bottom).toBe(1080);
    });

    it('32:9: zona segura centrada de proporción 16:9', () => {
        const z = safeZone(5120, 1440, '32:9');
        // safeW = 1440 * 16/9 = 2560; left = (5120-2560)/2 = 1280
        expect(z.left).toBe(1280);
        expect(z.right).toBe(5120 - 1280);
        expect(z.top).toBe(0);
        expect(z.bottom).toBe(1440);
    });
});

describe('JL-60: posiciones por defecto — sin solapamiento', () => {
    const resolutions: Array<{ label: string; w: number; h: number }> = [
        { label: '1366x768', w: 1366, h: 768 },
        { label: '1920x1080', w: 1920, h: 1080 },
        { label: '2000x1191', w: 2000, h: 1191 },
        { label: '2560x1080', w: 2560, h: 1080 },
        { label: '3440x1440', w: 3440, h: 1440 },
        { label: '5120x1440', w: 5120, h: 1440 },
    ];

    for (const { label, w, h } of resolutions) {
        it(`${label}: ningún par de elementos se solapa`, () => {
            const overlaps = checkDefaultPositionsOverlap(w, h);
            expect(overlaps, `Solapamientos en ${label}`).toHaveLength(0);
        });
    }
});

describe('JL-60: posiciones por defecto — caben en el viewport', () => {
    const resolutions: Array<{ label: string; w: number; h: number }> = [
        { label: '1366x768', w: 1366, h: 768 },
        { label: '1920x1080', w: 1920, h: 1080 },
        { label: '2000x1191', w: 2000, h: 1191 },
        { label: '2560x1080', w: 2560, h: 1080 },
        { label: '3440x1440', w: 3440, h: 1440 },
        { label: '5120x1440', w: 5120, h: 1440 },
    ];

    for (const { label, w, h } of resolutions) {
        it(`${label}: todos los elementos caben dentro del viewport`, () => {
            const outside = checkDefaultPositionsFit(w, h);
            expect(outside, `Elementos fuera en ${label}`).toHaveLength(0);
        });
    }
});

describe('JL-60: getDefaultPositions — estructura', () => {
    it('1920x1080 devuelve posiciones para los 7 elementos principales', () => {
        const pos = getDefaultPositions(1920, 1080);
        const keys = Object.keys(pos);
        expect(keys).toContain('minimap');
        expect(keys).toContain('quest-tracker');
        expect(keys).toContain('world-info');
        expect(keys).toContain('combat-bar');
        expect(keys).toContain('chat');
        expect(keys).toContain('hud-bar');
        expect(keys).toContain('hud-pet');
    });

    it('cada posición tiene fracciones entre 0 y 1', () => {
        const pos = getDefaultPositions(1920, 1080);
        for (const p of Object.values(pos)) {
            expect(p.x).toBeGreaterThanOrEqual(0);
            expect(p.x).toBeLessThanOrEqual(1);
            expect(p.y).toBeGreaterThanOrEqual(0);
            expect(p.y).toBeLessThanOrEqual(1);
        }
    });

    it('ultrawide: minimap dentro de la zona segura', () => {
        const pos = getDefaultPositions(3440, 1440);
        // 3440×1440 es 21:9. Zona segura: left=320, right=3120 (ancho 2800).
        // El minimap debe estar dentro de esa zona.
        const scaleX = 3440 / 2560;
        const scaleY = 1440 / 1080;
        const estW = Math.round(220 * scaleX);
        const fromF = (frac: number, size: number, view: number) => Math.round(frac * (view - size));
        const minimapX = fromF(pos['minimap']!.x, estW, 3440);
        expect(minimapX).toBeGreaterThanOrEqual(320);
    });

    it('1920x1080 y 2560x1080 producen posiciones distintas', () => {
        const p1 = getDefaultPositions(1920, 1080);
        const p2 = getDefaultPositions(2560, 1080);
        // El minimap en ultrawide está dentro de la zona segura, no al borde.
        expect(p1['minimap']!.x).not.toBeCloseTo(p2['minimap']!.x, 2);
    });
});

describe('JL-60: elementos centrados', () => {
    it('hud-bar centrado en 1920x1080', () => {
        const pos = getDefaultPositions(1920, 1080);
        const fromF = (frac: number, size: number, view: number) => Math.round(frac * (view - size));
        const barW = 640; // escala 1:1 en referencia
        const barX = fromF(pos['hud-bar']!.x, barW, 1920);
        // Centro del viewport: 1920/2 - 640/2 = 640
        expect(barX).toBeCloseTo(640, 0);
    });

    it('hud-bar centrado dentro de zona segura en 2560x1080', () => {
        const pos = getDefaultPositions(2560, 1080);
        const scaleX = 2560 / 2560; // ref de 21:9
        const barW = Math.round(640 * scaleX);
        const fromF = (frac: number, size: number, view: number) => Math.round(frac * (view - size));
        const barX = fromF(pos['hud-bar']!.x, barW, 2560);
        // Centro de zona segura: (320+2240)/2 = 1280; menos mitad de barra: 1280-320 = 960
        expect(barX).toBeCloseTo(960, 0);
    });
});
