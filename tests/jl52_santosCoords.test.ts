// JL-52: Punta Venada no se pisa — la coordenada del escenario (300, -106) estaba
// fuera de la zona segura y del flatArea. Corregida a (300, -80).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

interface ZoneArea {
    type: string;
    x?: number;
    y?: number;
    radius?: number;
    x0?: number;
    y0?: number;
    x1?: number;
    y1?: number;
}
interface ZoneDef {
    id: string;
    areas: ZoneArea[];
}
interface StoneDef {
    id: string;
    x: number;
    y: number;
}
interface FlatAreaDef {
    x: number;
    y: number;
    radius: number;
}

const zones: ZoneDef[] = JSON.parse(readFileSync(join(ROOT, 'data', 'zones.json'), 'utf8')).zones;
const terrainData = JSON.parse(readFileSync(join(ROOT, 'data', 'terrain.json'), 'utf8'));
const flatAreas: FlatAreaDef[] = terrainData.flatAreas;
const stones: StoneDef[] = JSON.parse(readFileSync(join(ROOT, 'data', 'stones.json'), 'utf8')).stones;

// Las coordenadas del escenario santos en qaElectron.mjs
const scenarioCoords = [
    { id: 'pedasol', x: 438, y: 12 },
    { id: 'venada', x: 300, y: -80 },
    { id: 'cambutal', x: 44, y: -228 },
    { id: 'canajagua', x: -60, y: -16 },
];

function pointInZoneArea(x: number, y: number, area: ZoneArea): boolean {
    if (area.type === 'circle') {
        return Math.hypot(x - (area.x ?? 0), y - (area.y ?? 0)) <= (area.radius ?? 0);
    }
    if (area.type === 'rect') {
        return x >= (area.x0 ?? 0) && x <= (area.x1 ?? 0) && y >= (area.y0 ?? 0) && y <= (area.y1 ?? 0);
    }
    return false;
}

function pointInZone(x: number, y: number, zone: ZoneDef): boolean {
    return zone.areas.some((a) => pointInZoneArea(x, y, a));
}

function pointInFlatArea(x: number, y: number, fa: FlatAreaDef): boolean {
    return Math.hypot(x - fa.x, y - fa.y) <= fa.radius;
}

describe('JL-52: coordenadas del escenario santos', () => {
    it('cada coordenada del escenario está dentro de su zona', () => {
        for (const { id, x, y } of scenarioCoords) {
            const zoneId = id === 'venada' ? 'punta_venada' : id;
            const zone = zones.find((z) => z.id === zoneId);
            expect(zone, `${id}: zona ${zoneId} existe`).toBeDefined();
            expect(
                pointInZone(x, y, zone!),
                `${id}: (${x},${y}) dentro de zona ${zoneId}`,
            ).toBe(true);
        }
    });

    it('cada coordenada del escenario está dentro de su flatArea', () => {
        for (const { id, x, y } of scenarioCoords) {
            const zoneId = id === 'venada' ? 'punta_venada' : id;
            const zone = zones.find((z) => z.id === zoneId)!;
            const zoneCenter = zone.areas[0]!;
            const flatArea = flatAreas.find(
                (f) => Math.hypot(f.x - (zoneCenter.x ?? 0), f.y - (zoneCenter.y ?? 0)) < 5,
            );
            if (flatArea) {
                expect(
                    pointInFlatArea(x, y, flatArea),
                    `${id}: (${x},${y}) dentro de flatArea (${flatArea.x},${flatArea.y}) radio ${flatArea.radius}`,
                ).toBe(true);
            }
        }
    });

    it('la piedra de cada pueblo está cerca de la coordenada del escenario (< 20m)', () => {
        for (const { id, x, y } of scenarioCoords) {
            const stoneId = id === 'venada' ? 'punta_venada' : id;
            const stone = stones.find((s) => s.id === stoneId);
            expect(stone, `${id}: piedra ${stoneId} existe`).toBeDefined();
            const dist = Math.hypot(stone!.x - x, stone!.y - y);
            expect(
                dist,
                `${id}: piedra a ${dist.toFixed(1)}m de (${x},${y})`,
            ).toBeLessThan(20);
        }
    });

    it('la coordenada anterior de Punta Venada (300, -106) estaba fuera de la zona', () => {
        const zone = zones.find((z) => z.id === 'punta_venada')!;
        const outside = pointInZone(300, -106, zone);
        expect(outside, '(300,-106) fuera de zona punta_venada').toBe(false);

        const flatArea = flatAreas.find(
            (f) => Math.hypot(f.x - 300, f.y - (-78)) < 5,
        )!;
        const outsideFlat = pointInFlatArea(300, -106, flatArea);
        expect(outsideFlat, '(300,-106) fuera de flatArea').toBe(false);
    });
});
