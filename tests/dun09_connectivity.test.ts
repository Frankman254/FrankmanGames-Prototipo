// DUN-09: Validador de conectividad de los 100 pisos de la cripta.
// Comprueba:
//   1. Toda escalera es alcanzable desde la llegada.
//   2. Ningún enemigo nace dentro de una pared.
//   3. Toda puerta de proximidad es alcanzable desde la llegada (se abre sola).
//   4. Toda puerta de clic es alcanzable desde al menos un lado.
// Los pisos manuales (0-4) se validan con las reglas de designedDungeon;
// aquí nos centramos en la conectividad del piso generado.
import { describe, it, expect } from 'vitest';
import { loadGameData } from '../src/data';
import { loadDungeon } from '../src/data/dungeonSchema';
import { generateFloor, floodDistances } from '../src/world/dungeon';
import fs from 'fs';
import path from 'path';

const data = loadGameData();
const def = loadDungeon(data);

/** Convierte una posición en metros a coordenadas de baldosa. */
function posToTile(ts: number, x: number, y: number): { c: number; r: number } {
    return { c: Math.floor(x / ts - 0.5), r: Math.floor(y / ts - 0.5) };
}

/** Verifica que una posición esté sobre suelo caminable. */
function isOnFloor(floor: ReturnType<typeof generateFloor>, x: number, y: number): boolean {
    const { c, r } = posToTile(floor.tileSize, x, y);
    return c >= 0 && r >= 0 && c < floor.cols && r < floor.rows && floor.cells[r * floor.cols + c] === 1;
}

describe('DUN-09: conectividad de los 100 pisos', () => {
    const issues: Array<{ floor: number; type: string; detail: string }> = [];

    for (let i = 0; i < def.floors.length; i++) {
        const floor = generateFloor(def, i);
        const ts = floor.tileSize;

        // BFS desde la llegada del jugador.
        const startTile = posToTile(ts, floor.arrivalFromAbove.x, floor.arrivalFromAbove.y);
        const dist = floodDistances(floor.cells, floor.cols, floor.rows, startTile.c, startTile.r);

        // --- 1. Escaleras alcanzables ---

        // Escalera de subida.
        const upTile = posToTile(ts, floor.upStairs.x, floor.upStairs.y);
        const upIdx = upTile.r * floor.cols + upTile.c;
        if ((dist[upIdx] ?? -1) < 0) {
            issues.push({
                floor: i + 1,
                type: 'UP_STAIRS_UNREACHABLE',
                detail: `Escalera de subida en (${upTile.c},${upTile.r}) inalcanzable desde la llegada`,
            });
        }

        // Escalera de bajada (si existe).
        if (floor.downStairs) {
            const downTile = posToTile(ts, floor.downStairs.x, floor.downStairs.y);
            const downIdx = downTile.r * floor.cols + downTile.c;
            if ((dist[downIdx] ?? -1) < 0) {
                issues.push({
                    floor: i + 1,
                    type: 'DOWN_STAIRS_UNREACHABLE',
                    detail: `Escalera de bajada en (${downTile.c},${downTile.r}) inalcanzable desde la llegada`,
                });
            }
        }

        // --- 2. Enemigos dentro de paredes ---

        for (const spawn of floor.spawns) {
            if (!isOnFloor(floor, spawn.pos.x, spawn.pos.y)) {
                const st = posToTile(ts, spawn.pos.x, spawn.pos.y);
                issues.push({
                    floor: i + 1,
                    type: 'SPAWN_IN_WALL',
                    detail: `${spawn.archetype} niv. ${spawn.level} en (${st.c},${st.r}) — fuera del suelo`,
                });
            }
        }

        // Emboscadas también.
        for (const ambush of floor.ambushes) {
            for (const spawn of ambush.spawns) {
                if (!isOnFloor(floor, spawn.pos.x, spawn.pos.y)) {
                    const st = posToTile(ts, spawn.pos.x, spawn.pos.y);
                    issues.push({
                        floor: i + 1,
                        type: 'AMBUSH_IN_WALL',
                        detail: `Emboscada ${ambush.id}: ${spawn.archetype} en (${st.c},${st.r}) — fuera del suelo`,
                    });
                }
            }
        }

        // --- 3. Puertas de proximidad alcanzables ---

        for (const door of floor.doors) {
            if (door.activation === 'proximity') {
                // La puerta se abre sola al acercarse; debe ser alcanzable desde la llegada.
                // Verificamos que al menos una baldosa adyacente al hueco sea alcanzable.
                let reachable = false;
                for (const cell of door.cells) {
                    // Revisar vecinos de la celda de puerta.
                    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
                        const nc = cell.c + dc;
                        const nr = cell.r + dr;
                        if (nc >= 0 && nr >= 0 && nc < floor.cols && nr < floor.rows && floor.cells[nr * floor.cols + nc] === 1) {
                            const nIdx = nr * floor.cols + nc;
                            if ((dist[nIdx] ?? -1) >= 0) {
                                reachable = true;
                                break;
                            }
                        }
                    }
                    if (reachable) break;
                }
                if (!reachable) {
                    issues.push({
                        floor: i + 1,
                        type: 'PROXIMITY_DOOR_UNREACHABLE',
                        detail: `Puerta ${door.id} (proximity) sin baldosa caminable alcanzable`,
                    });
                }
            }
        }

        // --- 4. Puertas de clic: al menos un lado alcanzable ---

        for (const door of floor.doors) {
            if (door.activation === 'click') {
                // Una puerta de clic debe tener al menos un lado alcanzable
                // (el jugador puede llegar a pulsarla).
                let anySideReachable = false;
                for (const cell of door.cells) {
                    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
                        const nc = cell.c + dc;
                        const nr = cell.r + dr;
                        if (nc >= 0 && nr >= 0 && nc < floor.cols && nr < floor.rows && floor.cells[nr * floor.cols + nc] === 1) {
                            const nIdx = nr * floor.cols + nc;
                            if ((dist[nIdx] ?? -1) >= 0) {
                                anySideReachable = true;
                                break;
                            }
                        }
                    }
                    if (anySideReachable) break;
                }
                if (!anySideReachable) {
                    issues.push({
                        floor: i + 1,
                        type: 'CLICK_DOOR_UNREACHABLE',
                        detail: `Puerta ${door.id} (click) sin ningún lado alcanzable desde la llegada`,
                    });
                }
            }
        }

        // --- 5. Cofres alcanzables ---

        for (const chest of floor.chests) {
            if (!isOnFloor(floor, chest.pos.x, chest.pos.y)) {
                const ct = posToTile(ts, chest.pos.x, chest.pos.y);
                issues.push({
                    floor: i + 1,
                    type: 'CHEST_IN_WALL',
                    detail: `Cofre ${chest.id} en (${ct.c},${ct.r}) — fuera del suelo`,
                });
            } else {
                const ct = posToTile(ts, chest.pos.x, chest.pos.y);
                const cIdx = ct.r * floor.cols + ct.c;
                if ((dist[cIdx] ?? -1) < 0) {
                    issues.push({
                        floor: i + 1,
                        type: 'CHEST_UNREACHABLE',
                        detail: `Cofre ${chest.id} en (${ct.c},${ct.r}) inalcanzable desde la llegada`,
                    });
                }
            }
        }
    }

    // Guardar reporte
    const byType: Record<string, number> = {};
    for (const iss of issues) {
        byType[iss.type] = (byType[iss.type] || 0) + 1;
    }

    const reportPath = path.resolve(__dirname, '../work/junie-dun09/auditoria.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({ total: issues.length, byType, issues }, null, 2));

    // --- Tests individuales ---

    it('todas las escaleras de subida son alcanzables', () => {
        const ups = issues.filter((i) => i.type === 'UP_STAIRS_UNREACHABLE');
        if (ups.length > 0) {
            console.log('UP_STAIRS_UNREACHABLE:', ups.map((d) => `Piso ${d.floor}: ${d.detail}`).join('\n  '));
        }
        expect(ups.length, `escaleras de subida inalcanzables`).toBe(0);
    });

    it('todas las escaleras de bajada son alcanzables', () => {
        const downs = issues.filter((i) => i.type === 'DOWN_STAIRS_UNREACHABLE');
        if (downs.length > 0) {
            console.log('DOWN_STAIRS_UNREACHABLE:', downs.map((d) => `Piso ${d.floor}: ${d.detail}`).join('\n  '));
        }
        expect(downs.length, `escaleras de bajada inalcanzables`).toBe(0);
    });

    it('ningún enemigo nace dentro de una pared', () => {
        const spawns = issues.filter((i) => i.type === 'SPAWN_IN_WALL');
        if (spawns.length > 0) {
            console.log('SPAWN_IN_WALL:', spawns.map((d) => `Piso ${d.floor}: ${d.detail}`).join('\n  '));
        }
        expect(spawns.length, `enemigos dentro de paredes`).toBe(0);
    });

    it('ninguna emboscada nace dentro de una pared', () => {
        const ambushes = issues.filter((i) => i.type === 'AMBUSH_IN_WALL');
        if (ambushes.length > 0) {
            console.log('AMBUSH_IN_WALL:', ambushes.map((d) => `Piso ${d.floor}: ${d.detail}`).join('\n  '));
        }
        expect(ambushes.length, `emboscadas dentro de paredes`).toBe(0);
    });

    it('las puertas de proximidad son alcanzables', () => {
        const prox = issues.filter((i) => i.type === 'PROXIMITY_DOOR_UNREACHABLE');
        if (prox.length > 0) {
            console.log('PROXIMITY_DOOR_UNREACHABLE:', prox.map((d) => `Piso ${d.floor}: ${d.detail}`).join('\n  '));
        }
        expect(prox.length, `puertas de proximidad inalcanzables`).toBe(0);
    });

    it('las puertas de clic tienen al menos un lado alcanzable', () => {
        const clicks = issues.filter((i) => i.type === 'CLICK_DOOR_UNREACHABLE');
        if (clicks.length > 0) {
            console.log('CLICK_DOOR_UNREACHABLE:', clicks.map((d) => `Piso ${d.floor}: ${d.detail}`).join('\n  '));
        }
        expect(clicks.length, `puertas de clic inalcanzables`).toBe(0);
    });

    it('los cofres están sobre suelo y son alcanzables', () => {
        const chests = issues.filter((i) => i.type === 'CHEST_IN_WALL' || i.type === 'CHEST_UNREACHABLE');
        if (chests.length > 0) {
            console.log('CHEST_ISSUES:', chests.map((d) => `Piso ${d.floor}: ${d.detail}`).join('\n  '));
        }
        expect(chests.length, `cofres en pared o inalcanzables`).toBe(0);
    });

    it('resumen de hallazgos', () => {
        console.log(`\nDUN-09 Auditoría: ${issues.length} problemas en total`);
        for (const [type, count] of Object.entries(byType)) {
            console.log(`  ${type}: ${count}`);
        }
        expect(issues.length, `problemas de conectividad`).toBe(0);
    });
});
