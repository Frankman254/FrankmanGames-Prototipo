import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { FishingManager, type FishingHost } from '../src/sim/fishing';
import { waterCircles, waterDistance } from '../src/sim/navGrid';
import { Rng } from '../src/sim/rng';
import type { Vec2 } from '../src/sim/vec2';
import type { Character } from '../src/rpg/character';
import type { FishingSpotDef } from '../src/rpg/content';
import type { Player } from '../src/sim/world';

const data = loadGameData();
const OPEN_WATER_SPOTS = ['meadow_pond', 'poza_iguanera'] as const;

function legacyApproaches(spot: FishingSpotDef, player: Vec2, castRange: number): Vec2[] {
    const points: Vec2[] = [];
    for (const offset of [1, 2, Math.max(2.5, castRange - 1)]) {
        for (let i = 0; i < 24; i++) {
            const angle = (i / 24) * Math.PI * 2;
            points.push({
                x: spot.x + Math.cos(angle) * (spot.radius + offset),
                y: spot.y + Math.sin(angle) * (spot.radius + offset),
            });
        }
    }
    return points.sort((a, b) => distanceSquared(a, player) - distanceSquared(b, player));
}

function distanceSquared(a: Vec2, b: Vec2): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}

function makeFishingManager(playerPos: Vec2): { manager: FishingManager; walkTargets: Vec2[] } {
    const walkTargets: Vec2[] = [];
    const player = { pos: playerPos, path: [], alive: true } as unknown as Player;
    const character = { spectral: { active: false } } as unknown as Character;
    const host: FishingHost = {
        time: 0,
        night: false,
        interior: false,
        rng: new Rng(1),
        player,
        character,
        grid: { walkable: () => true },
        content: data.rpg,
        spots: data.rpg.fishing.spots,
        shoals: null,
        walkTo: (target) => walkTargets.push({ ...target }),
        pushEvent: () => {},
        dropLoot: () => {},
        stopGathering: () => {},
        stopTalk: () => {},
    };
    return { manager: new FishingManager(host), walkTargets };
}

describe('JL-366: estanques circulares del mundo abierto conservan su comportamiento', () => {
    for (const spotId of OPEN_WATER_SPOTS) {
        it(`${spotId}: conserva orilla, selección y puntos de aproximación`, () => {
            const spot = data.rpg.fishing.spots[spotId]!;
            expect(spot.lobes ?? []).toEqual([]);
            expect(waterCircles(spot)).toEqual([{ x: spot.x, y: spot.y, radius: spot.radius }]);

            const shorelinePoints = [
                { x: spot.x, y: spot.y },
                { x: spot.x + spot.radius, y: spot.y },
                { x: spot.x + spot.radius + 0.25, y: spot.y },
                { x: spot.x + spot.radius - 0.25, y: spot.y },
                { x: spot.x + spot.radius * 0.6, y: spot.y + spot.radius * 0.8 },
            ];
            for (const point of shorelinePoints) {
                expect(waterDistance(spot, point)).toBeCloseTo(
                    Math.hypot(point.x - spot.x, point.y - spot.y) - spot.radius,
                    12,
                );
            }

            const playerPos = {
                x: spot.x - spot.radius - data.rpg.fishing.rules.castRange - 20,
                y: spot.y + 3,
            };
            const { manager, walkTargets } = makeFishingManager(playerPos);
            expect(manager.spotAt({ x: spot.x, y: spot.y })?.id).toBe(spot.id);
            expect(manager.spotAt({ x: spot.x + spot.radius, y: spot.y })?.id).toBe(spot.id);
            expect(manager.spotAt({ x: spot.x + spot.radius + 0.01, y: spot.y })).toBeNull();

            expect(manager.command({ x: spot.x, y: spot.y })).toBe(true);
            expect(manager.fishing).toBeNull();
            expect(walkTargets).toEqual(legacyApproaches(spot, playerPos, data.rpg.fishing.rules.castRange));
            expect(walkTargets).toHaveLength(72);
        });
    }
});
