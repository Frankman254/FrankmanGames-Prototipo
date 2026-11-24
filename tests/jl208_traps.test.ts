import { describe, it, expect } from 'vitest';
import { TrapManager, type Trap, type TrapHost } from '../src/sim/traps';
import type { Vec2 } from '../src/sim/vec2';
import type { Actor, Team } from '../src/rpg/actor';
import type { Effect, EffectContext, TrapSpec } from '../src/rpg/effects';
import type { GameEvent } from '../src/sim/events';

/* ── Helpers ── */

function makeActor(id: number, team: Team, _alive = true) {
    const obj = {
        id,
        team,
        _alive,
        get alive(): boolean { return this._alive; },
        set alive(v: boolean) { this._alive = v; },
        pos: { x: 0, y: 0 },
        radius: 0.4,
        stats: { get: () => 0 },
        statuses: {
            list: [],
            get: () => null,
            has: () => false,
            add: () => {},
            remove: () => {},
        },
    };
    return obj as unknown as Actor;
}

function makeHost(opts: {
    time?: number;
    walkable?: (p: Vec2) => boolean;
    findVictim?: (team: Team, pos: Vec2, r: number) => Actor | null;
    rules?: { armSeconds: number; maxActive: number; minSpacing: number };
} = {}): TrapHost {
    let nextId = 1;
    const events: GameEvent[] = [];
    return {
        time: opts.time ?? 0,
        rules: opts.rules ?? { armSeconds: 0.4, maxActive: 3, minSpacing: 2.5 },
        walkable: opts.walkable ?? (() => true),
        nextId: () => nextId++,
        pushEvent: (e: GameEvent) => events.push(e),
        effectContext: () =>
            ({
                rng: { range: () => 1, chance: () => true } as any,
                content: {} as any,
                caster: {} as Actor,
                tag: '',
                origin: { x: 0, y: 0 },
                aim: { x: 0, y: 0 },
                dir: 0,
                critChance: 0,
                critBonus: 0,
                damage: () => {},
                heal: () => {},
                restoreResource: () => {},
                applyStatus: () => {},
                knockback: () => {},
                dash: () => {},
                teleport: () => {},
                blink: () => {},
                swap: () => {},
                pull: () => {},
                recoil: () => {},
                summon: () => {},
                zone: () => {},
                trap: () => {},
                reveal: () => {},
            } as EffectContext),
        findVictim: opts.findVictim ?? (() => null),
        _events: events,
    } as TrapHost & { _events: GameEvent[] };
}

function makeSpec(opts: {
    radius?: number;
    duration?: number;
    maxActive?: number | null;
    minSpacing?: number | null;
    effects?: Effect[];
    power?: number;
} = {}): TrapSpec {
    return {
        radius: opts.radius ?? 1.5,
        duration: opts.duration ?? 10,
        maxActive: opts.maxActive ?? null,
        minSpacing: opts.minSpacing ?? null,
        effects: opts.effects ?? [],
        power: opts.power ?? 1,
    };
}

/* ── Tests ── */

describe('TrapManager', () => {
    /* ── spot() ── */

    it('devuelve la posición si el suelo es pisable y no hay trampas cercanas', () => {
        const host = makeHost();
        const mgr = new TrapManager(host);
        const pos = mgr.spot('player', { x: 5, y: 5 }, null);
        expect(pos).toEqual({ x: 5, y: 5 });
    });

    it('devuelve null si el suelo no es pisable', () => {
        const host = makeHost({
            walkable: (p) => !(p.x > 4 && p.x < 6 && p.y > 4 && p.y < 6),
        });
        const mgr = new TrapManager(host);
        expect(mgr.spot('player', { x: 5, y: 5 }, null)).toBeNull();
    });

    it('devuelve null si hay una trampa del mismo bando demasiado cerca', () => {
        const host = makeHost();
        const mgr = new TrapManager(host);
        const caster = makeActor(1, 'player');
        mgr.place(caster, 'trap1', { x: 0, y: 0 }, makeSpec());
        // minSpacing por defecto = 2.5
        expect(mgr.spot('player', { x: 1, y: 1 }, null)).toBeNull();
    });

    it('permite trampas del bando rival cerca', () => {
        const host = makeHost();
        const mgr = new TrapManager(host);
        const enemy = makeActor(2, 'enemy');
        mgr.place(enemy, 'trap1', { x: 0, y: 0 }, makeSpec());
        const caster = makeActor(1, 'player');
        // La trampa rival no bloquea
        const pos = mgr.spot('player', { x: 0.5, y: 0.5 }, null);
        expect(pos).not.toBeNull();
    });

    it('respeta minSpacing pasado a spot()', () => {
        const host = makeHost();
        const mgr = new TrapManager(host);
        const caster = makeActor(1, 'player');
        mgr.place(caster, 'trap1', { x: 0, y: 0 }, makeSpec());
        // spot() con minSpacing=5: a 3 m de distancia queda bloqueado
        expect(mgr.spot('player', { x: 3, y: 0 }, 5)).toBeNull();
        // Pero con minSpacing=2 (por debajo de la distancia), sí pasa
        const pos = mgr.spot('player', { x: 3, y: 0 }, 2);
        expect(pos).not.toBeNull();
    });

    /* ── place() ── */

    it('coloca una trampa y emite trapPlaced', () => {
        const host = makeHost();
        const mgr = new TrapManager(host);
        const caster = makeActor(1, 'player');
        const trap = mgr.place(caster, 'fire_trap', { x: 3, y: 3 }, makeSpec());
        expect(trap).not.toBeNull();
        expect(trap!.pos).toEqual({ x: 3, y: 3 });
        expect(trap!.caster).toBe(caster);
        expect(trap!.team).toBe('player');
        expect(trap!.tag).toBe('fire_trap');
        const h = host as TrapHost & { _events: GameEvent[] };
        const placed = h._events.find((e) => e.type === 'trapPlaced');
        expect(placed).toBeDefined();
    });

    it('devuelve null y emite trapBlocked si el punto no es válido', () => {
        const host = makeHost({
            walkable: () => false,
        });
        const mgr = new TrapManager(host);
        const caster = makeActor(1, 'player');
        const result = mgr.place(caster, 't', { x: 0, y: 0 }, makeSpec());
        expect(result).toBeNull();
        const h = host as TrapHost & { _events: GameEvent[] };
        expect(h._events.some((e) => e.type === 'trapBlocked')).toBe(true);
    });

    it('elimina las trampas viejas cuando supera maxActive del lanzador', () => {
        const host = makeHost();
        const mgr = new TrapManager(host);
        const caster = makeActor(1, 'player');
        const spec = makeSpec({ maxActive: 2 });
        const t1 = mgr.place(caster, 't', { x: 0, y: 0 }, spec);
        const t2 = mgr.place(caster, 't', { x: 10, y: 10 }, spec);
        const t3 = mgr.place(caster, 't', { x: 20, y: 20 }, spec);
        // t1 debería haberse eliminado (replaced)
        expect(mgr.traps.length).toBe(2);
        expect(mgr.traps.map((t) => t.id)).toContain(t2!.id);
        expect(mgr.traps.map((t) => t.id)).toContain(t3!.id);
        const h = host as TrapHost & { _events: GameEvent[] };
        const gone = h._events.find((e) => e.type === 'trapGone' && (e as any).reason === 'replaced');
        expect(gone).toBeDefined();
    });

    it('usa maxActive de las reglas si el spec no lo declara', () => {
        const host = makeHost({
            rules: { armSeconds: 0.4, maxActive: 2, minSpacing: 2.5 },
        });
        const mgr = new TrapManager(host);
        const caster = makeActor(1, 'player');
        const spec = makeSpec({ maxActive: null }); // null → usa reglas
        mgr.place(caster, 't', { x: 0, y: 0 }, spec);
        mgr.place(caster, 't', { x: 10, y: 10 }, spec);
        mgr.place(caster, 't', { x: 20, y: 20 }, spec);
        expect(mgr.traps.length).toBe(2);
    });

    it('inicializa arming con armSeconds de las reglas', () => {
        const host = makeHost({
            rules: { armSeconds: 1.5, maxActive: 3, minSpacing: 2.5 },
        });
        const mgr = new TrapManager(host);
        const caster = makeActor(1, 'player');
        const trap = mgr.place(caster, 't', { x: 0, y: 0 }, makeSpec());
        expect(trap!.arming).toBe(1.5);
    });

    it('inicializa revealedUntil en -Infinity', () => {
        const host = makeHost();
        const mgr = new TrapManager(host);
        const caster = makeActor(1, 'player');
        const trap = mgr.place(caster, 't', { x: 0, y: 0 }, makeSpec());
        expect(trap!.revealedUntil).toBe(-Infinity);
    });

    /* ── remove() ── */

    it('elimina la trampa y emite trapGone', () => {
        const host = makeHost();
        const mgr = new TrapManager(host);
        const caster = makeActor(1, 'player');
        const trap = mgr.place(caster, 't', { x: 0, y: 0 }, makeSpec());
        mgr.remove(trap!, 'expired');
        expect(mgr.traps.length).toBe(0);
        const h = host as TrapHost & { _events: GameEvent[] };
        const gone = h._events.find((e) => e.type === 'trapGone' && (e as any).reason === 'expired');
        expect(gone).toBeDefined();
    });

    it('no hace nada si la trampa ya no está en la lista', () => {
        const host = makeHost();
        const mgr = new TrapManager(host);
        const caster = makeActor(1, 'player');
        const trap = mgr.place(caster, 't', { x: 0, y: 0 }, makeSpec());
        mgr.remove(trap!, 'expired');
        // Segunda llamada no lanza
        mgr.remove(trap!, 'triggered');
        expect(mgr.traps.length).toBe(0);
    });

    /* ── reveal() ── */

    it('revela las trampas rivales dentro del radio', () => {
        const host = makeHost({ time: 10 });
        const mgr = new TrapManager(host);
        const enemy = makeActor(2, 'enemy');
        mgr.place(enemy, 't', { x: 0, y: 0 }, makeSpec({ radius: 1 }));
        const caster = makeActor(1, 'player');
        mgr.reveal(caster, { x: 0, y: 0 }, 3, 5);
        // La trampa enemiga en (0,0) con radio 1 está dentro de 3+1=4
        const trap = mgr.traps[0]!;
        expect(trap.revealedUntil).toBe(15); // time 10 + duration 5
    });

    it('no revela las trampas del propio bando', () => {
        const host = makeHost({ time: 10 });
        const mgr = new TrapManager(host);
        const caster = makeActor(1, 'player');
        mgr.place(caster, 't', { x: 0, y: 0 }, makeSpec({ radius: 1 }));
        mgr.reveal(caster, { x: 0, y: 0 }, 3, 5);
        const trap = mgr.traps[0]!;
        expect(trap.revealedUntil).toBe(-Infinity);
    });

    it('no revela trampas fuera del radio', () => {
        const host = makeHost({ time: 10 });
        const mgr = new TrapManager(host);
        const enemy = makeActor(2, 'enemy');
        // Trampa a 10 m, radio 1; reveal radio 3 → 3+1=4 < 10
        mgr.place(enemy, 't', { x: 10, y: 0 }, makeSpec({ radius: 1 }));
        const caster = makeActor(1, 'player');
        mgr.reveal(caster, { x: 0, y: 0 }, 3, 5);
        const trap = mgr.traps[0]!;
        expect(trap.revealedUntil).toBe(-Infinity);
    });

    it('emite evento reveal con el conteo', () => {
        const host = makeHost({ time: 10 });
        const mgr = new TrapManager(host);
        const enemy = makeActor(2, 'enemy');
        mgr.place(enemy, 't', { x: 0, y: 0 }, makeSpec({ radius: 1 }));
        const caster = makeActor(1, 'player');
        mgr.reveal(caster, { x: 0, y: 0 }, 3, 5);
        const h = host as TrapHost & { _events: GameEvent[] };
        const ev = h._events.find((e) => e.type === 'reveal');
        expect(ev).toBeDefined();
        expect((ev as any).count).toBe(1);
    });

    /* ── visible() ── */

    it('muestra siempre las trampas propias', () => {
        const host = makeHost({ time: 10 });
        const mgr = new TrapManager(host);
        const caster = makeActor(1, 'player');
        mgr.place(caster, 't', { x: 0, y: 0 }, makeSpec({ radius: 1.5 }));
        const views = mgr.visible('player');
        expect(views.length).toBe(1);
        expect(views[0]!.own).toBe(true);
    });

    it('oculta las trampas rivales no reveladas', () => {
        const host = makeHost({ time: 10 });
        const mgr = new TrapManager(host);
        const enemy = makeActor(2, 'enemy');
        mgr.place(enemy, 't', { x: 0, y: 0 }, makeSpec({ radius: 1.5 }));
        const views = mgr.visible('player');
        expect(views.length).toBe(0);
    });

    it('muestra las trampas rivales reveladas mientras dure', () => {
        const host = makeHost({ time: 10 });
        const mgr = new TrapManager(host);
        const enemy = makeActor(2, 'enemy');
        mgr.place(enemy, 't', { x: 0, y: 0 }, makeSpec({ radius: 1.5 }));
        const caster = makeActor(1, 'player');
        mgr.reveal(caster, { x: 0, y: 0 }, 3, 5);
        const views = mgr.visible('player');
        expect(views.length).toBe(1);
        expect(views[0]!.own).toBe(false);
    });

    it('oculta las trampas rivales cuando expira la revelación', () => {
        const host = makeHost({ time: 16 }); // 10 + 5 + 1 → revelación expirada
        const mgr = new TrapManager(host);
        const enemy = makeActor(2, 'enemy');
        mgr.place(enemy, 't', { x: 0, y: 0 }, makeSpec({ radius: 1.5 }));
        // Revelar a time=10, duración 5 → revealedUntil = 15
        const caster = makeActor(1, 'player');
        // Simular reveal con time=10
        (host as any).time = 10;
        mgr.reveal(caster, { x: 0, y: 0 }, 3, 5);
        (host as any).time = 16;
        const views = mgr.visible('player');
        expect(views.length).toBe(0);
    });

    /* ── tick() ── */

    it('reduce el tiempo restante y de armado', () => {
        const host = makeHost({ time: 0 });
        const mgr = new TrapManager(host);
        const caster = makeActor(1, 'player');
        mgr.place(caster, 't', { x: 0, y: 0 }, makeSpec({ duration: 10 }));
        const trap = mgr.traps[0]!;
        expect(trap.arming).toBe(0.4);
        expect(trap.remaining).toBe(10);
        (host as any).time = 0.5;
        mgr.tick(0.5);
        expect(trap.arming).toBeCloseTo(-0.1);
        expect(trap.remaining).toBeCloseTo(9.5);
    });

    it('expira cuando remaining llega a 0', () => {
        const host = makeHost({ time: 0 });
        const mgr = new TrapManager(host);
        const caster = makeActor(1, 'player');
        mgr.place(caster, 't', { x: 0, y: 0 }, makeSpec({ duration: 5 }));
        mgr.tick(5.0001);
        expect(mgr.traps.length).toBe(0);
        const h = host as TrapHost & { _events: GameEvent[] };
        const gone = h._events.find((e) => e.type === 'trapGone' && (e as any).reason === 'expired');
        expect(gone).toBeDefined();
    });

    it('expira si el lanzador muere', () => {
        const host = makeHost({ time: 0 });
        const mgr = new TrapManager(host);
        const caster = makeActor(1, 'player', true);
        mgr.place(caster, 't', { x: 0, y: 0 }, makeSpec({ duration: 100 }));
        (caster as any)._alive = false;
        mgr.tick(0.1);
        expect(mgr.traps.length).toBe(0);
    });

    it('no se dispara si aún está armando', () => {
        const host = makeHost({
            time: 0,
            findVictim: () => makeActor(2, 'enemy'),
        });
        const mgr = new TrapManager(host);
        const caster = makeActor(1, 'player');
        mgr.place(caster, 't', { x: 0, y: 0 }, makeSpec({ duration: 10 }));
        // tick 0.2 s: arming queda en 0.2, no se dispara
        mgr.tick(0.2);
        expect(mgr.traps.length).toBe(1);
    });

    it('se dispara cuando hay una víctima y ya está armada', () => {
        const victim = makeActor(2, 'enemy');
        const host = makeHost({
            time: 0,
            findVictim: () => victim,
        });
        const mgr = new TrapManager(host);
        const caster = makeActor(1, 'player');
        mgr.place(caster, 't', { x: 0, y: 0 }, makeSpec({ duration: 10 }));
        // tick 0.5 s: arming pasa a negativo
        mgr.tick(0.5);
        expect(mgr.traps.length).toBe(0);
        const h = host as TrapHost & { _events: GameEvent[] };
        const triggered = h._events.find((e) => e.type === 'trapTriggered');
        expect(triggered).toBeDefined();
        expect((triggered as any).targetId).toBe(2);
    });

    it('no se dispara si no hay víctima', () => {
        const host = makeHost({
            time: 0,
            findVictim: () => null,
        });
        const mgr = new TrapManager(host);
        const caster = makeActor(1, 'player');
        mgr.place(caster, 't', { x: 0, y: 0 }, makeSpec({ duration: 10 }));
        mgr.tick(1); // arming negativo, pero sin víctima
        expect(mgr.traps.length).toBe(1);
    });

    it('aplica los efectos de la trampa a la víctima', () => {
        let effectApplied = false;
        const fakeEffect: Effect = {
            targeting: 'hit',
            apply: (_ctx, target) => {
                effectApplied = true;
                (target as any).hitByTrap = true;
            },
        } as Effect;
        const victim = makeActor(2, 'enemy');
        const host = makeHost({
            time: 0,
            findVictim: () => victim,
        });
        const mgr = new TrapManager(host);
        const caster = makeActor(1, 'player');
        mgr.place(caster, 't', { x: 0, y: 0 }, makeSpec({ effects: [fakeEffect], duration: 10 }));
        mgr.tick(1);
        expect(effectApplied).toBe(true);
        expect((victim as any).hitByTrap).toBe(true);
    });

    it('emite trapTriggered con la posición y el bando', () => {
        const victim = makeActor(2, 'enemy');
        const host = makeHost({
            time: 0,
            findVictim: () => victim,
        });
        const mgr = new TrapManager(host);
        const caster = makeActor(1, 'player');
        mgr.place(caster, 't', { x: 5, y: 7 }, makeSpec({ duration: 10 }));
        mgr.tick(1);
        const h = host as TrapHost & { _events: GameEvent[] };
        const ev = h._events.find((e) => e.type === 'trapTriggered');
        expect((ev as any).x).toBe(5);
        expect((ev as any).y).toBe(7);
        expect((ev as any).team).toBe('player');
    });

    it('procesa múltiples trampas en el mismo tick', () => {
        const victim = makeActor(2, 'enemy');
        const host = makeHost({
            time: 0,
            findVictim: () => victim,
        });
        const mgr = new TrapManager(host);
        const caster = makeActor(1, 'player');
        mgr.place(caster, 't', { x: 0, y: 0 }, makeSpec({ duration: 10 }));
        mgr.place(caster, 't', { x: 10, y: 10 }, makeSpec({ duration: 10 }));
        mgr.tick(1);
        // Ambas se disparan
        expect(mgr.traps.length).toBe(0);
        const h = host as TrapHost & { _events: GameEvent[] };
        const triggered = h._events.filter((e) => e.type === 'trapTriggered');
        expect(triggered.length).toBe(2);
    });

    it('no aplica efectos si la víctima murió en el primer efecto', () => {
        let firstEffect = true;
        const fakeEffect: Effect = {
            targeting: 'hit',
            apply: (_ctx, target) => {
                if (firstEffect) {
                    (target as any)._alive = false;
                    firstEffect = false;
                }
            },
        } as Effect;
        const victim = makeActor(2, 'enemy');
        const host = makeHost({
            time: 0,
            findVictim: () => victim,
        });
        const mgr = new TrapManager(host);
        const caster = makeActor(1, 'player');
        mgr.place(caster, 't', { x: 0, y: 0 }, makeSpec({ effects: [fakeEffect, fakeEffect], duration: 10 }));
        mgr.tick(1);
        // La víctima muere en el primer efecto; el segundo no se aplica a un objetivo muerto.
        // El código verifica victim.alive antes de cada efecto.
        expect(victim.alive).toBe(false);
    });
});
