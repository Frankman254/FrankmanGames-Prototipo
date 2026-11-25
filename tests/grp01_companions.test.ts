// GRP-01 (creador, 2026-11-24): compañeros simulados en el mismo `World`, con las reglas del
// jugador. Semillas fijas; ninguna cifra de balance cambia.
import { describe, it, expect } from 'vitest';
import { loadGameData, type GameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { Rng } from '../src/sim/rng';
import { World, type Aim } from '../src/sim/world';
import type { GameEvent } from '../src/sim/events';
import { dist } from '../src/sim/vec2';
import { openField, FIELD_CENTER } from '../scripts/balance/data';
import { makeGroupLab } from '../scripts/balance/grupo';
import { PlayerBot } from '../scripts/balance/bot';
import { makeSessionAt, DT } from '../scripts/balance/scenarios';

const base = loadGameData();
const field = (): GameData => openField(base);
const aim = (x: number, y: number, targetId: number | null = null): Aim => ({ point: { x, y }, targetId });

function labWorld(n: number, classId = 'storm_weaver'): { w: World; ids: number[] } {
    const data = field();
    const mk = (k: number) => Character.create(data.rpg, classId, `P${k}`, new Rng(100 + k));
    const w = new World(data, { encounter: false, character: mk(0), seed: 7, lab: { companions: true } });
    w.player.pos = { ...FIELD_CENTER };
    w.player.prevPos = { ...FIELD_CENTER };
    const ids = [w.player.id];
    for (let k = 1; k < n; k++) ids.push(w.addCompanion(mk(k), { x: FIELD_CENTER.x + 2 * k, y: FIELD_CENTER.y }));
    return { w, ids };
}

const run = (w: World, seconds: number): GameEvent[] => {
    const out: GameEvent[] = [];
    for (let i = 0; i < Math.round(seconds / DT); i++) {
        w.tick(DT);
        out.push(...w.drainEvents());
    }
    return out;
};

describe('GRP-01: compañeros simulados', () => {
    it('1. sin compañeros, el mundo de laboratorio juega igual que el de siempre', () => {
        const play = (lab: boolean): string => {
            const data = field();
            const s = makeSessionAt(data, 'ember_vanguard', 4, 99);
            const w = new World(data, {
                encounter: false,
                character: s.character,
                seed: 3,
                ...(lab ? { lab: { companions: true } } : {}),
            });
            s.attach(w);
            w.player.pos = { ...FIELD_CENTER };
            w.spawnEnemy('melee', { x: FIELD_CENTER.x + 8, y: FIELD_CENTER.y });
            w.spawnEnemy('ranged', { x: FIELD_CENTER.x - 6, y: FIELD_CENTER.y + 5 });
            const bot = new PlayerBot(w, s, { dodge: 0.5, seed: 11 });
            const log: string[] = [];
            for (let i = 0; i < 60 * 20 && w.outcome === 'playing'; i++) {
                bot.think();
                w.tick(DT);
                for (const e of w.drainEvents()) log.push(JSON.stringify(e));
            }
            return `${log.join('\n')}|${w.player.pos.x.toFixed(6)},${w.player.pos.y.toFixed(6)}|${s.character.health}`;
        };
        const a = play(false);
        expect(a.length).toBeGreaterThan(1000);
        expect(play(true)).toBe(a);
    });

    it('1b. fuera del laboratorio no se pueden meter compañeros', () => {
        const data = field();
        const w = new World(data, { encounter: false });
        const other = Character.create(data.rpg, 'storm_weaver', 'X', new Rng(1));
        expect(() => w.addCompanion(other, FIELD_CENTER)).toThrow(/laboratorio/);
        expect(w.participantIds()).toEqual([w.player.id]);
    });

    it('2. dos aliados contra un enemigo: los dos pelean y el enemigo cae', () => {
        const lab = makeGroupLab(
            base,
            [
                { classId: 'ember_vanguard', level: 4 },
                { classId: 'mangrove_hunter', level: 4 },
            ],
            { seed: 5, enemies: [{ archetype: 'melee', count: 1 }] },
        );
        for (let i = 0; i < 60 * 60 && lab.world.enemies.aliveCount() > 0; i++) lab.step();
        expect(lab.world.enemies.aliveCount()).toBe(0);
        const rows = lab.ledger.report();
        expect(rows.map((r) => r.id)).toEqual(lab.ids);
        for (const r of rows) expect(r.damageDealt).toBeGreaterThan(0);
        expect(rows.reduce((n, r) => n + r.kills, 0)).toBe(1);
    });

    it('3 y 12. cuatro aliados contra varios enemigos: métricas separadas por personaje', () => {
        const lab = makeGroupLab(
            base,
            [
                { classId: 'ember_vanguard', level: 6 },
                { classId: 'storm_weaver', level: 6 },
                { classId: 'mangrove_hunter', level: 6 },
                { classId: 'storm_weaver', level: 6 },
            ],
            {
                seed: 9,
                enemies: [
                    { archetype: 'melee', count: 3 },
                    { archetype: 'ranged', count: 2 },
                ],
            },
        );
        const events: GameEvent[] = [];
        const w = lab.world;
        for (let i = 0; i < 60 * 120 && w.enemies.aliveCount() > 0 && w.outcome === 'playing'; i++) {
            lab.bots.forEach((b, k) => w.as(lab.ids[k]!, () => b.think()));
            w.tick(DT);
            const ev = w.drainEvents();
            events.push(...ev);
            lab.ledger.step(ev, DT);
        }
        expect(w.enemies.aliveCount()).toBe(0);
        const rows = lab.ledger.report();
        expect(rows).toHaveLength(4);
        // Cada uno con su daño, y la suma es exactamente lo que hicieron los cuatro.
        const ids = new Set(lab.ids);
        const fromGroup = events
            .filter((e): e is Extract<GameEvent, { type: 'damage' }> => e.type === 'damage' && !ids.has(e.targetId))
            .filter((e) => ids.has(e.sourceId) || w.pets.some((p) => p.id === e.sourceId))
            .reduce((n, e) => n + e.amount, 0);
        expect(rows.reduce((n, r) => n + r.damageDealt, 0)).toBe(fromGroup);
        expect(new Set(rows.map((r) => r.damageDealt)).size).toBeGreaterThan(1);
        // Los enemigos atacaron a más de un participante.
        expect(rows.filter((r) => r.damageTaken > 0).length).toBeGreaterThanOrEqual(2);
        const sum = rows.reduce((n, r) => n + r.participation, 0);
        expect(sum).toBeCloseTo(1, 6);
        expect(rows.reduce((n, r) => n + r.kills, 0)).toBe(5);
    });

    it('4. si su objetivo muere, el enemigo pasa a otro participante válido', () => {
        const { w, ids } = labWorld(2);
        const ally = w.participant(ids[1]!)!;
        // El compañero queda más cerca: es el primero al que ve.
        w.player.pos = { x: FIELD_CENTER.x - 6, y: FIELD_CENTER.y };
        ally.player.pos = { x: FIELD_CENTER.x + 4, y: FIELD_CENTER.y };
        const e = w.spawnEnemy('melee', { x: FIELD_CENTER.x + 8, y: FIELD_CENTER.y });
        e.health = 1e6;
        run(w, 1.5);
        expect(e.targetId).toBe(ids[1]);
        // No cambia de objetivo cada tick mientras el suyo siga vivo.
        const seen = new Set<number | null | undefined>();
        for (let i = 0; i < 60; i++) {
            w.tick(DT);
            seen.add(e.targetId);
        }
        expect([...seen]).toEqual([ids[1]]);
        ally.character.health = 0;
        run(w, 0.5);
        expect(ally.player.alive).toBe(false);
        expect(w.outcome).toBe('playing');
        expect(e.targetId).toBe(ids[0]);
        expect(e.state).not.toBe('idle');
    });

    it('5 y 6. un área enemiga alcanza a todos los que pilla; a quien no, no le toca', () => {
        const { w, ids } = labWorld(3);
        const [a, b, c] = ids.map((id) => w.participant(id)!);
        const e = w.spawnEnemy('melee', { x: FIELD_CENTER.x, y: FIELD_CENTER.y });
        // Dos participantes delante del enemigo, dentro del cono; el tercero, detrás.
        a!.player.pos = { x: FIELD_CENTER.x + 1.2, y: FIELD_CENTER.y + 0.3 };
        b!.player.pos = { x: FIELD_CENTER.x + 1.2, y: FIELD_CENTER.y - 0.3 };
        c!.player.pos = { x: FIELD_CENTER.x - 6, y: FIELD_CENTER.y };
        const hp = [a, b, c].map((x) => x!.character.health);
        e.facing = 0;
        e.current = e.def.attack;
        e.telegraph = { def: e.def.attack.shape, origin: { ...e.pos }, dir: 0 };
        e.state = 'telegraph';
        e.stateTime = 99;
        const ev = w.drainEvents();
        void ev;
        w.tick(DT);
        const hits = w.drainEvents().filter((x) => x.type === 'damage' || x.type === 'avoided' || x.type === 'immune');
        const hitIds = new Set(
            hits.filter((x): x is Extract<GameEvent, { type: 'damage' }> => x.type === 'damage').map((x) => x.targetId),
        );
        expect(hitIds.has(ids[0]!)).toBe(true);
        expect(hitIds.has(ids[1]!)).toBe(true);
        expect(hitIds.has(ids[2]!)).toBe(false);
        expect(a!.character.health).toBeLessThan(hp[0]!);
        expect(b!.character.health).toBeLessThan(hp[1]!);
        expect(c!.character.health).toBe(hp[2]);
    });

    it('5b. un teledirigido enemigo sigue a su objetivo aunque se mueva', () => {
        const { w, ids } = labWorld(2);
        const ally = w.participant(ids[1]!)!;
        w.player.pos = { x: FIELD_CENTER.x - 20, y: FIELD_CENTER.y };
        ally.player.pos = { x: FIELD_CENTER.x + 3, y: FIELD_CENTER.y };
        const homing = Object.values(w.data.enemies.archetypes).find((d) => d.attack.homing);
        expect(homing).toBeDefined();
        const e = w.spawnEnemy(homing!.id, { x: FIELD_CENTER.x + 12, y: FIELD_CENTER.y });
        e.targetId = ids[1]!;
        e.current = e.def.attack;
        e.telegraph = { def: e.def.attack.shape, origin: { ...e.pos }, dir: Math.PI };
        e.state = 'telegraph';
        e.stateTime = 99;
        const hp0 = w.player.health;
        w.tick(DT);
        expect(w.missiles.length).toBeGreaterThan(0);
        // El objetivo se aparta: el proyectil le sigue.
        ally.player.pos = { x: FIELD_CENTER.x + 3, y: FIELD_CENTER.y + 4 };
        const ev = run(w, 3);
        const toAlly = ev.filter(
            (x) =>
                (x.type === 'damage' && x.targetId === ids[1]) ||
                x.type === 'avoided' ||
                (x.type === 'immune' && x.targetId === ids[1]),
        );
        expect(toAlly.length).toBeGreaterThan(0);
        expect(ev.some((x) => x.type === 'damage' && x.targetId === ids[0])).toBe(false);
        expect(w.player.health).toBe(hp0);
    });

    it('7. cada aliado tiene sus enfriamientos y su recurso', () => {
        const { w, ids } = labWorld(2);
        const e = w.spawnEnemy('melee', { x: FIELD_CENTER.x + 5, y: FIELD_CENTER.y });
        e.health = 1e6;
        const ally = w.participant(ids[1]!)!;
        const r0 = w.player.resource;
        expect(w.as(ids[1]!, () => w.commandCast('frost_nova', aim(e.pos.x, e.pos.y, e.id)))).toBeNull();
        expect(ally.player.gcd).toBeGreaterThan(0);
        expect(ally.player.cooldowns['frost_nova'] ?? 0).toBeGreaterThan(0);
        expect(w.player.gcd).toBe(0);
        expect(w.player.cooldowns['frost_nova'] ?? 0).toBe(0);
        expect(w.player.resource).toBe(r0);
        // El jugador lanza lo mismo sin esperar al compañero.
        expect(w.commandCast('frost_nova', aim(e.pos.x, e.pos.y, e.id))).toBeNull();
        expect(w.as(ids[1]!, () => w.commandCast('frost_nova', aim(e.pos.x, e.pos.y, e.id)))).toBe('cooldown');
    });

    it('8. la navegación no deja atravesar paredes', () => {
        const data = base; // la zona real, con obstáculos
        const mk = (k: number) => Character.create(data.rpg, 'ember_vanguard', `P${k}`, new Rng(k));
        const w = new World(data, { encounter: false, character: mk(0), seed: 1, lab: { companions: true } });
        const start = w.player.pos;
        const ids = [w.player.id];
        for (let k = 1; k < 4; k++) ids.push(w.addCompanion(mk(k), { x: start.x + k, y: start.y }));
        // Destinos lejanos y caminables, uno por participante.
        const rng = new Rng(4);
        const goals = ids.map(() => w.randomSpawnPoint(25 + rng.range(0, 10)));
        ids.forEach((id, k) => w.as(id, () => w.commandMove(goals[k]!)));
        let blocked = 0;
        for (let i = 0; i < 60 * 30; i++) {
            w.tick(DT);
            for (const id of ids) if (!w.grid.walkable(w.participant(id)!.player.pos)) blocked++;
        }
        expect(blocked).toBe(0);
        const arrived = ids.filter((id, k) => dist(w.participant(id)!.player.pos, goals[k]!) < 1.5).length;
        expect(arrived).toBeGreaterThanOrEqual(3);
    });

    it('9. los aliados no se quedan unos encima de otros', () => {
        const { w, ids } = labWorld(4);
        for (const id of ids) w.participant(id)!.player.pos = { ...FIELD_CENTER };
        run(w, 1);
        const bodies = ids.map((id) => w.participant(id)!.player);
        for (let i = 0; i < bodies.length; i++)
            for (let j = i + 1; j < bodies.length; j++)
                expect(dist(bodies[i]!.pos, bodies[j]!.pos)).toBeGreaterThanOrEqual(
                    bodies[i]!.radius + bodies[j]!.radius - 0.05,
                );
    });

    it('10. una cura propia cae en el compañero que la lanza, no en el jugador', () => {
        const { w, ids } = labWorld(2);
        const ally = w.participant(ids[1]!)!;
        ally.character.spellbook.level = 99;
        expect(ally.character.learnSpell('light_bandage').ok).toBe(true);
        ally.character.health = Math.round(ally.character.maxHealth / 2);
        w.player.health = Math.round(w.character.maxHealth / 2);
        const before = [w.player.health, ally.character.health];
        expect(w.as(ids[1]!, () => w.commandCast('light_bandage', aim(0, 0)))).toBeNull();
        const ev = run(w, 1.2);
        expect(ally.character.health).toBeGreaterThan(before[1]!);
        const heals = ev.filter(
            (x): x is Extract<GameEvent, { type: 'heal' }> => x.type === 'heal' && x.source === 'light_bandage',
        );
        expect(heals.map((h) => h.targetId)).toEqual([ids[1]]);
        expect(w.player.health).toBeLessThanOrEqual(before[0]! + 2); // como mucho, su regeneración
    });

    it('10b. hoy ninguna cura alcanza a otro: la cura de área cura al lanzador (regla vigente, pendiente del creador)', () => {
        // `HealEffect`, `ShieldEffect` y los estados de mejora van al lanzador (targeting 'self') también
        // jugando solo. Que una cura de área llegue a los compañeros es una regla nueva: no se cambia aquí.
        const { w, ids } = labWorld(2);
        const near = w.participant(ids[1]!)!;
        near.player.pos = { x: FIELD_CENTER.x + 5, y: FIELD_CENTER.y };
        near.character.health = Math.round(near.character.maxHealth / 2);
        w.character.health = Math.round(w.character.maxHealth / 2);
        w.character.spellbook.level = 99;
        expect(w.character.learnSpell('rain_stitch').ok).toBe(true);
        w.player.resource = w.player.maxResource;
        expect(w.commandCast('rain_stitch', aim(near.player.pos.x, near.player.pos.y, ids[1]!))).toBeNull();
        const heals = run(w, 0.3).filter(
            (x): x is Extract<GameEvent, { type: 'heal' }> => x.type === 'heal' && x.source === 'rain_stitch',
        );
        expect(heals.map((h) => h.targetId)).toEqual([ids[0]]);
    });

    it('11. sin fuego amigo un área del compañero no daña al jugador; con él, sí le alcanza', () => {
        const { w, ids } = labWorld(2);
        const ally = w.participant(ids[1]!)!;
        ally.player.pos = { x: FIELD_CENTER.x + 1, y: FIELD_CENTER.y };
        const e = w.spawnEnemy('melee', { x: FIELD_CENTER.x + 2.5, y: FIELD_CENTER.y });
        e.health = 1e6;
        const hp0 = w.player.health;
        w.as(ids[1]!, () => w.commandCast('frost_nova', aim(e.pos.x, e.pos.y, e.id)));
        const ev = run(w, 0.2);
        expect(ev.some((x) => x.type === 'damage' && x.targetId === e.id)).toBe(true);
        expect(ev.some((x) => (x.type === 'damage' || x.type === 'status') && x.targetId === ids[0])).toBe(false);
        expect(w.player.health).toBe(hp0);
        // Ráfaga (gust) tiene fuego amigo en sus datos: alcanza al jugador que está en el cono.
        ally.character.spellbook.level = 99;
        ally.character.learnSpell('gust');
        ally.player.gcd = 0;
        const before = { ...w.player.pos };
        w.as(ids[1]!, () => w.commandCast('gust', aim(FIELD_CENTER.x - 3, FIELD_CENTER.y)));
        const ev2 = run(w, 0.5);
        const touched =
            ev2.some((x) => (x.type === 'damage' || x.type === 'status') && x.targetId === ids[0]) ||
            dist(before, w.player.pos) > 0.1;
        expect(touched).toBe(true);
        // Nunca al lanzador.
        expect(ev2.some((x) => x.type === 'damage' && x.targetId === ids[1] && x.sourceId === ids[1])).toBe(false);
    });

    it('las mascotas no cuentan como participantes y su daño va a su dueño', () => {
        const lab = makeGroupLab(
            base,
            [
                { classId: 'storm_weaver', level: 4 },
                { classId: 'storm_weaver', level: 4 },
            ],
            { seed: 2, enemies: [{ archetype: 'melee', count: 2 }] },
        );
        const w = lab.world;
        // Los compañeros no llevan invocaciones en la barra (sus mascotas serían del jugador).
        const book = lab.sessions[1]!.character.spellbook;
        expect(book.hotbar.some((id) => id && w.data.rpg.spells[id]?.effects.some((e) => e.type === 'summon'))).toBe(
            false,
        );
        const petIds = new Set<number>();
        for (let i = 0; i < 60 * 40 && w.enemies.aliveCount() > 0; i++) {
            lab.step();
            for (const pet of w.pets) petIds.add(pet.id);
        }
        // Hubo mascota (la del amuleto del jugador) y nunca contó como participante.
        expect(petIds.size).toBeGreaterThan(0);
        for (const id of petIds) {
            expect(w.participantIds()).not.toContain(id);
            expect(w.participant(id)).toBeUndefined();
        }
        expect(lab.ledger.report().map((r) => r.id)).toEqual(lab.ids);
    });
});
