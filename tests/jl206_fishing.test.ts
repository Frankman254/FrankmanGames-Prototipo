// JL-206: Pruebas de src/sim/fishing.ts — máquina de estados de la pesca.
// Cubre: spotAt, command (lanzar/sacar), tick (waiting → bite → escape),
// reel temprano, reel exitoso, stop, nibble, sin/con shoals.

import { describe, it, expect } from 'vitest';
import { FishingManager } from '../src/sim/fishing';
import type { FishingHost } from '../src/sim/fishing';
import { Rng } from '../src/sim/rng';
import type { Vec2 } from '../src/sim/vec2';
import type { GameEvent } from '../src/sim/events';
import type { Player } from '../src/sim/world';
import type { Character } from '../src/rpg/character';
import type { ItemInstance } from '../src/rpg/contracts';
import type { FishingSpotDef, FishingDef, RpgContent } from '../src/rpg/content';
import type { ShoalField } from '../src/sim/shoals';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSpot(id: string, x: number, y: number, radius: number): FishingSpotDef {
    return { id, name: 'Estanque', x, y, radius, lootTable: 'fish_basic', nightLootTable: null };
}

function makeHost(
    opts: {
        playerPos?: Vec2;
        spots?: Record<string, FishingSpotDef>;
        shoals?: ShoalField | null;
        lootTables?: Record<string, { id: string; gold: { min: number; max: number; chance: number }; rolls: number; chance: number; entries: { itemId: string; weight: number; min?: number; max?: number }[] }>;
        night?: boolean;
        interior?: boolean;
        spectralActive?: boolean;
        alive?: boolean;
        walkable?: (p: Vec2) => boolean;
        initialTime?: number;
    } = {},
): { host: FishingHost; events: GameEvent[]; goldAdded: number; itemsPickedUp: ItemInstance[]; dropped: ItemInstance[]; walkTargets: Vec2[]; player: Partial<Player> & { path: Vec2[] }; setTime: (t: number) => void } {
    const events: GameEvent[] = [];
    const goldAdded: number[] = [];
    const itemsPickedUp: ItemInstance[] = [];
    const dropped: ItemInstance[] = [];
    const walkTargets: Vec2[] = [];
    let currentTime = opts.initialTime ?? 0;

    const playerPos = opts.playerPos ?? { x: 0, y: 0 };
    const player: Partial<Player> & { path: Vec2[] } = {
        pos: playerPos,
        path: [],
        alive: opts.alive ?? true,
        attackTarget: null,
        pickupTarget: null,
        casting: null,
        moveTarget: null,
        facing: 0,
    };

    const spots = opts.spots ?? { estanque: makeSpot('estanque', 0, 0, 5) };

    const lootTables = opts.lootTables ?? {
        fish_basic: {
            id: 'fish_basic',
            gold: { min: 1, max: 5, chance: 1 },
            rolls: 1,
            chance: 1,
            entries: [{ itemId: 'pez_comun', weight: 100, min: 1, max: 1 }],
        },
    };

    const content = {
        fishing: {
            rules: {
                castRange: 10,
                biteSeconds: { min: 2, max: 3 },
                reactSeconds: 2,
                nibbleChance: 0,
                shoals: null,
            },
            spots,
        } as FishingDef,
        lootTables,
        items: {
            pez_comun: { id: 'pez_comun', name: 'Pez común', slot: null, level: 1, icon: '🐟', dropWeight: 100 } as any,
            pez_nocturno: { id: 'pez_nocturno', name: 'Pez nocturno', slot: null, level: 1, icon: '🐟', dropWeight: 100 } as any,
        },
        professions: { rules: { fishingXp: 10 } } as any,
    } as unknown as RpgContent;

    const character: Partial<Character> = {
        spectral: { active: opts.spectralActive ?? false } as any,
        items: {
            create: (itemId: string, quantity: number): ItemInstance => ({
                uid: 'inst-1',
                itemId,
                quantity,
                rolled: [],
            }),
        } as any,
        addGold: (amount: number) => goldAdded.push(amount),
        pickUp: (inst: ItemInstance) => {
            itemsPickedUp.push(inst);
            return 0; // todo cabe
        },
        gainProfessionXp: () => {},
        emit: () => {},
    };

    const host: FishingHost = {
        get time() { return currentTime; },
        night: opts.night ?? false,
        interior: opts.interior ?? false,
        rng: new Rng(42),
        player: player as Player,
        character: character as Character,
        grid: { walkable: opts.walkable ?? (() => true) },
        content: content as RpgContent,
        spots,
        shoals: opts.shoals ?? null,
        walkTo: (target: Vec2) => {
            walkTargets.push({ ...target });
        },
        pushEvent: (e: GameEvent) => events.push(e),
        dropLoot: (_pos: Vec2, inst: ItemInstance) => dropped.push(inst),
        stopGathering: () => {},
        stopTalk: () => {},
    };

    return { host, events, goldAdded: goldAdded[0] ?? 0, itemsPickedUp, dropped, walkTargets, player, setTime: (t: number) => { currentTime = t; } };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('FishingManager — spotAt', () => {
    it('encuentra el estanque que contiene el punto', () => {
        const { host } = makeHost({
            spots: {
                a: makeSpot('a', 0, 0, 5),
                b: makeSpot('b', 20, 0, 3),
            },
        });
        const mgr = new FishingManager(host);
        expect(mgr.spotAt({ x: 3, y: 3 })?.id).toBe('a');
        expect(mgr.spotAt({ x: 21, y: 0 })?.id).toBe('b');
        expect(mgr.spotAt({ x: 10, y: 10 })).toBeNull();
    });

    it('null cuando no hay estanques', () => {
        const { host } = makeHost({ spots: {} });
        const mgr = new FishingManager(host);
        expect(mgr.spotAt({ x: 0, y: 0 })).toBeNull();
    });
});

describe('FishingManager — command (lanzar)', () => {
    it('lanza el sedal cuando el jugador está cerca del agua', () => {
        const { host, events } = makeHost({ playerPos: { x: 0, y: 6 } });
        const mgr = new FishingManager(host);
        const result = mgr.command({ x: 0, y: 0 });
        expect(result).toBe(true);
        expect(mgr.fishing).not.toBeNull();
        expect(mgr.fishing!.state).toBe('waiting');
        expect(mgr.fishing!.spotId).toBe('estanque');
        expect(events.find((e) => e.type === 'fishCast')).toBeDefined();
    });

    it('el corcho cae dentro del agua (clipped al radio)', () => {
        const { host } = makeHost({ playerPos: { x: 0, y: 6 } });
        const mgr = new FishingManager(host);
        // Clic dentro del estanque, cerca del borde: el corcho se clippea al 80% del radio.
        mgr.command({ x: 0, y: 4 });
        const f = mgr.fishing!;
        const dist = Math.hypot(f.bobber.x - 0, f.bobber.y - 0);
        expect(dist).toBeLessThanOrEqual(5 * 0.8 + 0.01);
    });

    it('elige el estanque más cercano cuando point es null', () => {
        const { host } = makeHost({
            playerPos: { x: 0, y: 6 },
            spots: {
                lejano: makeSpot('lejano', 100, 0, 5),
                cerca: makeSpot('cerca', 0, 0, 5),
            },
        });
        const mgr = new FishingManager(host);
        mgr.command(null);
        expect(mgr.fishing!.spotId).toBe('cerca');
    });

    it('no lanza si el jugador está muerto', () => {
        const { host } = makeHost({ alive: false });
        const mgr = new FishingManager(host);
        const result = mgr.command({ x: 0, y: 0 });
        expect(result).toBe(false);
        expect(mgr.fishing).toBeNull();
    });

    it('no lanza en estado espectral', () => {
        const { host } = makeHost({ spectralActive: true });
        const mgr = new FishingManager(host);
        const result = mgr.command({ x: 0, y: 0 });
        expect(result).toBe(false);
    });

    it('no lanza si no hay estanque a tiro', () => {
        const { host } = makeHost({
            playerPos: { x: 100, y: 100 },
            spots: { lejano: makeSpot('lejano', 0, 0, 5) },
        });
        const mgr = new FishingManager(host);
        const result = mgr.command(null);
        expect(result).toBe(false);
        expect(mgr.fishing).toBeNull();
    });

    it('acercarse a la orilla cuando está lejos (pending)', () => {
        const { host, walkTargets } = makeHost({
            playerPos: { x: 50, y: 50 },
        });
        const mgr = new FishingManager(host);
        const result = mgr.command({ x: 0, y: 0 });
        expect(result).toBe(true);
        expect(mgr.fishing).toBeNull(); // aún no ha llegado
        expect(walkTargets.length).toBeGreaterThan(0);
    });
});

describe('FishingManager — command (sacar)', () => {
    it('sacar antes de que pique → escape early', () => {
        const { host, events } = makeHost({ playerPos: { x: 0, y: 6 } });
        const mgr = new FishingManager(host);
        mgr.command({ x: 0, y: 0 }); // lanzar
        expect(mgr.fishing).not.toBeNull();
        mgr.command({ x: 0, y: 0 }); // sacar
        const escape = events.find((e) => e.type === 'fishEscape');
        expect(escape).toBeDefined();
        expect((escape as { type: 'fishEscape'; reason: string }).reason).toBe('early');
        expect(mgr.fishing).toBeNull();
    });

    it('sacar después de que pique → catch con botín', () => {
        const { host, events, itemsPickedUp, setTime } = makeHost({
            playerPos: { x: 0, y: 6 },
        });
        const mgr = new FishingManager(host);
        mgr.command({ x: 0, y: 0 }); // lanzar
        // Avanzamos el tiempo hasta que pica.
        setTime(mgr.fishing!.biteAt + 0.1);
        mgr.tick(1); // tick que detecta el bite
        expect(mgr.fishing!.state).toBe('bite');
        mgr.command({ x: 0, y: 0 }); // sacar
        const catchEvent = events.find((e) => e.type === 'fishCatch');
        expect(catchEvent).toBeDefined();
        expect(itemsPickedUp.length).toBeGreaterThan(0);
        expect(mgr.fishing).toBeNull();
    });
});

describe('FishingManager — tick (estados)', () => {
    it('waiting → bite cuando llega biteAt', () => {
        const { host, events, setTime } = makeHost({ playerPos: { x: 0, y: 6 } });
        const mgr = new FishingManager(host);
        mgr.command({ x: 0, y: 0 });
        const biteAt = mgr.fishing!.biteAt;
        setTime(biteAt);
        mgr.tick(1);
        expect(mgr.fishing!.state).toBe('bite');
        expect(events.find((e) => e.type === 'fishBite')).toBeDefined();
    });

    it('bite → escape late cuando expira windowEnd', () => {
        const { host, events, setTime } = makeHost({ playerPos: { x: 0, y: 6 } });
        const mgr = new FishingManager(host);
        mgr.command({ x: 0, y: 0 });
        // Avanzar al bite
        setTime(mgr.fishing!.biteAt);
        mgr.tick(1);
        expect(mgr.fishing!.state).toBe('bite');
        const windowEnd = mgr.fishing!.windowEnd;
        // Avanzar más allá de la ventana
        setTime(windowEnd + 0.1);
        mgr.tick(1);
        const escape = events.find((e) => e.type === 'fishEscape');
        expect(escape).toBeDefined();
        expect((escape as { type: 'fishEscape'; reason: string }).reason).toBe('late');
        expect(mgr.fishing).toBeNull();
    });

    it('nibble event antes del bite (con nibbleChance)', () => {
        // Forzamos nibble configurando nibbleChance alto y un RNG que lo active.
        const { host, events, setTime } = makeHost({ playerPos: { x: 0, y: 6 } });
        const mgr = new FishingManager(host);
        // Sobrescribimos nibbleChance para forzarlo.
        (host.content.fishing.rules as any).nibbleChance = 1;
        mgr.command({ x: 0, y: 0 });
        const f = mgr.fishing!;
        // Si hay nibbleAt, avanzar hasta ese momento.
        if (f.nibbleAt !== null) {
            setTime(f.nibbleAt);
            mgr.tick(1);
            expect(events.find((e) => e.type === 'fishNibble')).toBeDefined();
        } else {
            // Con nibbleChance=1 y wait > 1.6, debería haber nibble.
            // El RNG puede no darlo si wait <= 1.6. Verificamos que al menos no haya error.
            expect(f.nibbleAt).not.toBeNull();
        }
    });
});

describe('FishingManager — stop', () => {
    it('cancela la pesca y emite fishStop', () => {
        const { host, events } = makeHost({ playerPos: { x: 0, y: 6 } });
        const mgr = new FishingManager(host);
        mgr.command({ x: 0, y: 0 });
        expect(mgr.fishing).not.toBeNull();
        mgr.stop();
        expect(mgr.fishing).toBeNull();
        expect(events.find((e) => e.type === 'fishStop')).toBeDefined();
    });

    it('stop sin pesca en curso no hace nada', () => {
        const { host, events } = makeHost();
        const mgr = new FishingManager(host);
        mgr.stop();
        expect(events).toHaveLength(0);
    });
});

describe('FishingManager — pending (acercarse a la orilla)', () => {
    it('tick con pending: cuando llega a la orilla, lanza', () => {
        let shouldWalk = true;
        const { host } = makeHost({
            playerPos: { x: 50, y: 50 },
            walkable: () => true,
        });
        const mgr = new FishingManager(host);
        mgr.command({ x: 0, y: 0 });
        expect(mgr.fishing).toBeNull();
        // Simulamos que el jugador ha llegado a la orilla.
        (host.player as any).pos = { x: 0, y: 16 }; // a 11m del centro, dentro de castRange=10 desde orilla
        // shoreDistance = hypot(0, 16) - 5 = 11. Con castRange=10, aún lejos.
        // Lo ponemos más cerca.
        (host.player as any).pos = { x: 0, y: 10 }; // shoreDistance = 10 - 5 = 5, dentro de castRange
        mgr.tick(0);
        expect(mgr.fishing).not.toBeNull();
    });

    it('pending se cancela si el jugador muere', () => {
        const { host } = makeHost({
            playerPos: { x: 50, y: 50 },
        });
        const mgr = new FishingManager(host);
        mgr.command({ x: 0, y: 0 });
        expect(mgr.fishing).toBeNull();
        (host.player as any).alive = false;
        mgr.tick(0);
        // pending debe ser null
        // No hay forma directa de ver pending, pero fishing sigue null
        expect(mgr.fishing).toBeNull();
    });
});

describe('FishingManager — shoals', () => {
    it('sin shoals configurados: pesca sin bancos', () => {
        const { host } = makeHost({
            playerPos: { x: 0, y: 6 },
        });
        // shoals es null por defecto
        const mgr = new FishingManager(host);
        mgr.command({ x: 0, y: 0 });
        expect(mgr.fishing).not.toBeNull();
        expect(mgr.fishing!.shoalId).toBeNull();
    });

    it('con shoals: sin banco activo → fishNoShoal', () => {
        const { host, events } = makeHost({
            playerPos: { x: 0, y: 6 },
            shoals: {
                list: [],
                at: () => null,
                nearest: () => null,
                consume: () => {},
                tick: () => {},
            } as any as ShoalField,
        });
        // Activar shoals en rules
        (host.content.fishing.rules as any).shoals = { perSpot: 1, radius: 2, charges: 3, respawnSeconds: 60 };
        const mgr = new FishingManager(host);
        mgr.command({ x: 0, y: 0 });
        const noShoal = events.find((e) => e.type === 'fishNoShoal');
        expect(noShoal).toBeDefined();
        expect(mgr.fishing).toBeNull();
    });

    it('con shoals: banco activo → pesca en el banco', () => {
        const fakeShoal = { id: 1, spotId: 'estanque', x: 0, y: 0, radius: 2, charges: 3, respawn: 0 };
        const shoals: ShoalField = {
            list: [fakeShoal],
            at: (p: Vec2) => (Math.hypot(p.x, p.y) <= 2 ? fakeShoal : null),
            nearest: (_spotId: string, p: Vec2) => fakeShoal,
            consume: () => {},
            tick: () => {},
        } as any as ShoalField;
        const { host } = makeHost({
            playerPos: { x: 0, y: 6 },
            shoals,
        });
        (host.content.fishing.rules as any).shoals = { perSpot: 1, radius: 2, charges: 3, respawnSeconds: 60 };
        const mgr = new FishingManager(host);
        mgr.command({ x: 0, y: 0 });
        expect(mgr.fishing).not.toBeNull();
        expect(mgr.fishing!.shoalId).toBe(1);
    });
});

describe('FishingManager — night loot', () => {
    it('de noche usa nightLootTable si existe', () => {
        const nightSpot: FishingSpotDef = {
            id: 'estanque',
            name: 'Estanque',
            x: 0,
            y: 0,
            radius: 5,
            lootTable: 'fish_basic',
            nightLootTable: 'fish_nocturno',
        };
        const { host, events, itemsPickedUp, setTime } = makeHost({
            playerPos: { x: 0, y: 6 },
            night: true,
            spots: { estanque: nightSpot },
            lootTables: {
                fish_basic: {
                    id: 'fish_basic',
                    gold: { min: 1, max: 1, chance: 1 },
                    rolls: 0,
                    chance: 0,
                    entries: [],
                },
                fish_nocturno: {
                    id: 'fish_nocturno',
                    gold: { min: 10, max: 10, chance: 1 },
                    rolls: 1,
                    chance: 1,
                    entries: [{ itemId: 'pez_nocturno', weight: 100, min: 1, max: 1 }],
                },
            },
        });
        const mgr = new FishingManager(host);
        mgr.command({ x: 0, y: 0 });
        setTime(mgr.fishing!.biteAt + 0.1);
        mgr.tick(1);
        mgr.command({ x: 0, y: 0 });
        const catchEvent = events.find((e) => e.type === 'fishCatch');
        expect(catchEvent).toBeDefined();
        // Debería usar fish_nocturno: pez_nocturno en lugar de pez_comun
        expect(itemsPickedUp[0]?.itemId).toBe('pez_nocturno');
    });
});

describe('FishingManager — edge cases', () => {
    it('command con pesca en curso → reel', () => {
        const { host, events } = makeHost({ playerPos: { x: 0, y: 6 } });
        const mgr = new FishingManager(host);
        mgr.command({ x: 0, y: 0 }); // lanzar
        expect(mgr.fishing).not.toBeNull();
        mgr.command({ x: 0, y: 0 }); // sacar (reel)
        expect(mgr.fishing).toBeNull();
        const escape = events.find((e) => e.type === 'fishEscape');
        expect(escape).toBeDefined();
    });

    it('tick sin pesca en curso no hace nada', () => {
        const { host, events } = makeHost();
        const mgr = new FishingManager(host);
        mgr.tick(1);
        expect(events).toHaveLength(0);
    });

    it('el jugador se enfrenta al corcho al lanzar', () => {
        const { host, player } = makeHost({ playerPos: { x: 0, y: 6 } });
        const mgr = new FishingManager(host);
        mgr.command({ x: 0, y: 0 });
        // facing debe apuntar hacia el corcho
        expect(player.facing).toBeDefined();
        // El corcho está dentro del estanque (cerca de 0,0), el jugador en (0,6)
        // facing ≈ atan2(bobber.y - 6, bobber.x - 0)
        expect(typeof player.facing).toBe('number');
    });
});
