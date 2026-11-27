import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadDungeon } from '../src/data/dungeonSchema';
import { World } from '../src/sim/world';
import { applyDoors, cryptStaffSpots, floorGameData, generateFloor } from '../src/world/dungeon';

const data = loadGameData();
const def = loadDungeon(data);
const STAFF = [
    { id: 'crypt_peddler', merchantId: 'crypt_peddler' },
    { id: 'crypt_guide', merchantId: null },
] as const;
const MIN_CLEARANCE = 1;

function hasRouteAroundStaff(
    world: World,
    start: { x: number; y: number },
    end: { x: number; y: number },
    staff: readonly { x: number; y: number }[],
): boolean {
    const grid = world.grid;
    const blocked = grid.blocked.slice();
    for (let i = 0; i < blocked.length; i++) {
        const p = grid.center(i);
        if (staff.some((npc) => Math.hypot(p.x - npc.x, p.y - npc.y) < MIN_CLEARANCE)) blocked[i] = 1;
    }

    const startCell = grid.cellOf(start);
    const endCell = grid.cellOf(end);
    const from = grid.index(startCell.cx, startCell.cy);
    const to = grid.index(endCell.cx, endCell.cy);
    if (blocked[from] || blocked[to]) return false;

    const visited = new Uint8Array(blocked.length);
    const queue = new Int32Array(blocked.length);
    let head = 0;
    let tail = 0;
    queue[tail++] = from;
    visited[from] = 1;
    while (head < tail) {
        const index = queue[head++]!;
        if (index === to) return true;
        const x = index % grid.cols;
        const y = (index - x) / grid.cols;
        for (const next of [
            x > 0 ? index - 1 : -1,
            x + 1 < grid.cols ? index + 1 : -1,
            y > 0 ? index - grid.cols : -1,
            y + 1 < grid.rows ? index + grid.cols : -1,
        ]) {
            if (next < 0 || blocked[next] || visited[next]) continue;
            visited[next] = 1;
            queue[tail++] = next;
        }
    }
    return false;
}

describe('JL-362: sitios de Chalo y Nina en los 100 pisos', () => {
    it('mantiene un metro de separación de los objetos y deja paso a la bajada', () => {
        expect(def.floors).toHaveLength(100);
        const failures: string[] = [];

        for (let index = 0; index < def.floors.length; index++) {
            const floor = generateFloor(def, index);
            const world = new World(floorGameData(data, floor, floor.arrivalFromAbove), {
                seed: 7,
                encounter: false,
                interior: true,
                pools: floor.pools,
            });
            const baseBlocked = world.grid.blocked.slice();
            applyDoors(world.grid, baseBlocked, floor, new Set(), data.zone.navRadius);
            const obstacles = [
                { kind: 'escalera de subida', pos: floor.upStairs },
                ...(floor.downStairs ? [{ kind: 'escalera de bajada', pos: floor.downStairs }] : []),
                { kind: 'poste del hilo de retorno', pos: floor.arrivalFromAbove },
                ...floor.chests.map((chest) => ({ kind: `cofre ${chest.id}`, pos: chest.pos })),
                ...floor.breakables.map((breakable) => ({
                    kind: `${breakable.kind === 'jar' ? 'jarra' : 'barril'} ${breakable.id}`,
                    pos: breakable.pos,
                })),
                ...floor.doors.map((door) => ({ kind: `puerta ${door.id}`, pos: { x: door.x, y: door.y } })),
            ];
            const candidates = cryptStaffSpots(
                floor.arrivalFromAbove,
                STAFF.length,
                (p) => world.grid.walkable(p),
                obstacles.map(({ pos }) => pos),
            );
            const placed = STAFF.map((npc, i) => {
                const candidate = candidates[i];
                return candidate ? world.placeInteriorNpc(npc.id, npc.merchantId, candidate) : null;
            });
            const staff = placed.filter((p): p is { x: number; y: number } => p !== null);
            if (staff.length !== STAFF.length) {
                failures.push(`piso ${index + 1}: solo se colocaron ${staff.length}/${STAFF.length} PNJ`);
                continue;
            }

            for (const [npcIndex, pos] of staff.entries()) {
                for (const obstacle of obstacles) {
                    const distance = Math.hypot(pos.x - obstacle.pos.x, pos.y - obstacle.pos.y);
                    if (distance < MIN_CLEARANCE) {
                        failures.push(
                            `piso ${index + 1}: ${STAFF[npcIndex]!.id} a ${distance.toFixed(2)} m de ${obstacle.kind}`,
                        );
                    }
                }
            }

            world.grid.blocked.set(baseBlocked);
            if (floor.downStairs && !hasRouteAroundStaff(world, floor.arrivalFromAbove, floor.downStairs, staff)) {
                failures.push(`piso ${index + 1}: los PNJ bloquean el paso entre la llegada y la escalera de bajada`);
            }
        }

        expect(failures, failures.join('\n')).toEqual([]);
    });
});
