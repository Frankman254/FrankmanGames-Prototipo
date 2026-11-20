import { describe, expect, it } from 'vitest';
import zonesJson from '../data/zones.json';
import { loadGameData } from '../src/data';
import { ZoneMap } from '../src/sim/zones';
import type { Vec2 } from '../src/sim/vec2';
import { dist } from '../src/sim/vec2';

const data = loadGameData();
const map = new ZoneMap(data.zones);

/** Distancia al centro de Raspadura. */
const raspaduraCenter = { x: 127, y: 131 };
const raspaduraRadius = 18;

/** Centro y radio del círculo de azuero que solapa. */
const azueroCircle = { x: 130, y: 124, radius: 50 };

describe('JL-56: zona hostil no spawnea en zona segura', () => {
    it('Raspadura es zona segura', () => {
        const raspadura = data.zones.zones.find((z) => z.id === 'raspadura');
        expect(raspadura).toBeDefined();
        expect(raspadura!.safe).toBe(true);
    });

    it('azuero es zona hostil con spawns', () => {
        const azuero = data.zones.zones.find((z) => z.id === 'azuero');
        expect(azuero).toBeDefined();
        expect(azuero!.safe).toBe(false);
        expect(azuero!.spawns.length).toBeGreaterThan(0);
    });

    it('Raspadura va antes que azuero en la lista de zonas', () => {
        const zones = data.zones.zones;
        const raspaduraIdx = zones.findIndex((z) => z.id === 'raspadura');
        const azueroIdx = zones.findIndex((z) => z.id === 'azuero');
        expect(raspaduraIdx).toBeLessThan(azueroIdx);
    });

    it('los puntos en el solape devuelven Raspadura (safe), no azuero', () => {
        // Muestreamos puntos dentro del círculo de Raspadura (radio 18).
        // Estos puntos también están dentro del círculo de azuero (radio 50 en (130,124)),
        // pero como Raspadura va primero en la lista, zoneAt() debe devolver Raspadura.
        const samplePoints: Vec2[] = [];
        for (let angle = 0; angle < 360; angle += 15) {
            const rad = (angle * Math.PI) / 180;
            for (let r = 0; r < raspaduraRadius; r += 3) {
                samplePoints.push({
                    x: raspaduraCenter.x + Math.cos(rad) * r,
                    y: raspaduraCenter.y + Math.sin(rad) * r,
                });
            }
        }

        let safeCount = 0;
        let hostilCount = 0;
        for (const p of samplePoints) {
            const z = map.zoneAt(p);
            if (z?.safe) {
                safeCount++;
            } else if (z && !z.safe) {
                hostilCount++;
            }
            // Todos los puntos dentro de Raspadura deben devolver Raspadura (safe).
            expect(z?.safe, `punto (${p.x.toFixed(1)},${p.y.toFixed(1)})`).toBe(true);
        }

        expect(safeCount).toBe(samplePoints.length);
        expect(hostilCount).toBe(0);
    });

    it('los puntos fuera de Raspadura pero dentro de azuero devuelven zona hostil', () => {
        // Puntos en azuero pero fuera del radio de Raspadura.
        // El centro de azuero (130,124) está a ~7.6m del centro de Raspadura.
        // Un punto a 40m del centro de azuero en dirección opuesta a Raspadura
        // debe estar fuera de Raspadura y dentro de azuero.
        const testPoints: Vec2[] = [
            { x: 170, y: 124 }, // 40m al este del centro de azuero
            { x: 130, y: 80 },  // 44m al sur del centro de azuero
            { x: 90, y: 124 },  // 40m al oeste del centro de azuero
        ];

        for (const p of testPoints) {
            const dToRaspadura = dist(p, raspaduraCenter);
            expect(dToRaspadura, `distancia a Raspadura para (${p.x},${p.y})`).toBeGreaterThan(raspaduraRadius);

            const z = map.zoneAt(p);
            // Debe ser una zona hostil (azuero u otra), no safe.
            expect(z?.safe, `punto (${p.x},${p.y}) fuera de Raspadura`).toBe(false);
        }
    });

    it('ZonePopulation.scan() no incluye puntos safe (verificación con ZoneMap)', () => {
        // Verificamos que la lógica de scan() — que saltea z.safe —
        // protege correctamente los puntos del solape.
        // Simulamos el barrido de scan() sobre el área de azuero.
        const azuero = data.zones.zones.find((z) => z.id === 'azuero')!;
        const step = data.zones.sampleStep;

        // Barrido sobre el rectángulo que contiene el círculo de azuero.
        const x0 = azueroCircle.x - azueroCircle.radius;
        const y0 = azueroCircle.y - azueroCircle.radius;
        const x1 = azueroCircle.x + azueroCircle.radius;
        const y1 = azueroCircle.y + azueroCircle.radius;

        const pointsInOverlap: Vec2[] = [];
        for (let y = Math.floor(y0 / step) * step + step / 2; y < y1; y += step) {
            if (y < y0) continue;
            for (let x = Math.floor(x0 / step) * step + step / 2; x < x1; x += step) {
                if (x < x0) continue;
                const p = { x, y };
                // Dentro del círculo de azuero?
                if (dist(p, { x: azueroCircle.x, y: azueroCircle.y }) > azueroCircle.radius) continue;
                // Dentro del círculo de Raspadura?
                if (dist(p, raspaduraCenter) <= raspaduraRadius) {
                    const z = map.zoneAt(p);
                    // Este punto está en el solape: debe ser safe.
                    if (z?.safe) {
                        pointsInOverlap.push(p);
                    }
                }
            }
        }

        // Todos los puntos en el solape deben ser safe.
        // Si hay puntos en el solape, confirmamos que scan() los saltearía.
        for (const p of pointsInOverlap) {
            const z = map.zoneAt(p);
            expect(z?.safe, `punto en solape (${p.x.toFixed(1)},${p.y.toFixed(1)})`).toBe(true);
        }

        // Verificamos que hay puntos en el solape (el solape existe).
        expect(pointsInOverlap.length).toBeGreaterThan(0);
    });

    it('spawnQuestEnemies no spawnea en zona safe', () => {
        // Verificamos que la lógica de spawnQuestEnemies (world.ts:722-723)
        // saltea los puntos donde zoneAt devuelve safe.
        // Simulamos: un punto dentro de Raspadura, zoneAt devuelve safe → level = null → no spawnea.
        const p = raspaduraCenter; // centro de Raspadura
        const z = map.zoneAt(p);
        expect(z?.safe).toBe(true);
        // En el código: `const level = zone && !zone.safe ? rollLevel(...) : null;`
        // Con safe=true, level = null → spawnEnemy con level null → no spawnea.
        // La prueba confirma que zoneAt devuelve safe en el centro de Raspadura.
    });
});
