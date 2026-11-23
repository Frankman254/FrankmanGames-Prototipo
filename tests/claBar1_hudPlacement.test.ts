// CLA-BAR1 (creador, 2026-11-22): «la barra de hechizos tiene un bug, la pongo toda abajo y cierro
// su candado y vuelve a una posicion mas arriba dejando espacio vacio abajo de la pantalla».
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { getDefaultPositions } from '../src/ui/map/hudProfiles';
import { fromFraction } from '../src/ui/menus/windows';

describe('CLA-BAR1: posiciones por defecto que WindowLayout entiende', () => {
    for (const [vw, vh] of [
        [1024, 768],
        [1280, 720],
        [1920, 1080],
        [2560, 1080],
    ] as const) {
        it(`${vw}x${vh}: la barra de abajo queda abajo y centrada, no en la esquina`, () => {
            const p = getDefaultPositions(vw, vh)['hud-bar']!;
            expect(p.fx).toBeDefined();
            expect(p.fy).toBeDefined();
            const w = 600;
            const h = 110;
            const corner = fromFraction(p, w, h, vw, vh);
            expect(corner.y + h).toBeGreaterThan(vh - 40);
            expect(corner.x).toBeGreaterThan(vw * 0.05);
        });
    }

    it('coordenadas y barra de combate van arriba y centradas, no pegadas a la izquierda', () => {
        const pos = getDefaultPositions(1920, 1080);
        for (const key of ['world-info', 'combat-bar']) {
            const corner = fromFraction(pos[key]!, 300, 24, 1920, 1080);
            expect(corner.x, key).toBeGreaterThan(400);
            expect(corner.y, key).toBeLessThan(120);
        }
    });
});

describe('CLA-BAR1: la escala del HUD no choca con la colocación', () => {
    const src = readFileSync(new URL('../src/ui/map/hudLayout.ts', import.meta.url), 'utf-8');
    it('applyScale usa la propiedad `scale`, que WindowLayout.place no anula', () => {
        const body = src.slice(src.indexOf('private applyScale'), src.indexOf('bindBar('));
        expect(body).toContain("setProperty('scale'");
        expect(body).not.toMatch(/setProperty\('transform',\s*`scale/);
    });
});
