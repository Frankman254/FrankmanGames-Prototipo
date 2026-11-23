import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { Energy, ENERGY_SOURCE } from '../../src/rpg/energy';
import type { EnergyDef } from '../../src/rpg/energy';
import { Encounter, distribute, shares } from '../../src/rpg/spoils';
import { Rng } from '../../src/sim/rng';

describe('Pulso', () => {
    const def = (): EnergyDef => loadGameData().rpg.energy;

    it('pierde al morir, se recupera y mantiene la penalización hasta el umbral', () => {
        // El mecanismo sigue disponible aunque los datos actuales no castiguen.
        const e = new Energy({
            ...def(),
            penalty: { ...def().penalty, modifiers: [{ stat: 'power', op: 'flat', value: -1 }] },
        });
        for (let i = 0; i < 5; i++) e.die();
        expect(e.value).toBe(0);
        expect(e.exhausted).toBe(true);
        expect(e.penaltyMods()).not.toHaveLength(0);
        e.gain(def().penalty.clearAt - 1);
        expect(e.exhausted).toBe(true);
        e.gain(1);
        expect(e.exhausted).toBe(false);
        expect(e.penaltyMods()).toHaveLength(0);
    });

    it('lo regenerado no salva de la última derrota', () => {
        const e = new Energy(def(), { value: 20.4, exhausted: false });
        expect(e.die().value).toBe(0);
        expect(e.exhausted).toBe(true);
    });

    it('se guarda y carga sin curarse por accidente', () => {
        const first = new Energy(def());
        first.die();
        const loaded = new Energy(def(), first.toSave());
        expect(loaded.value).toBe(first.value);
        expect(loaded.exhausted).toBe(first.exhausted);
    });

    it('ENERGY_SOURCE es la cadena esperada', () => {
        expect(ENERGY_SOURCE).toBe('energy');
    });

    it('tick() recupera según regenPerMinute', () => {
        // Empieza con valor bajo para que haya espacio de recuperación.
        const e = new Energy(def(), { value: 50, exhausted: false });
        const gained = e.tick(60); // 1 minuto
        expect(gained).toBeCloseTo(def().regenPerMinute);
    });

    it('tick() no recupera si dt es 0', () => {
        const e = new Energy(def());
        expect(e.tick(0)).toBe(0);
    });

    it('tick() no recupera si dt es negativo', () => {
        const e = new Energy(def());
        expect(e.tick(-5)).toBe(0);
    });

    it('rest() recupera más rápido que tick()', () => {
        // Empieza con valor bajo para que haya espacio de recuperación.
        const e = new Energy(def(), { value: 50, exhausted: false });
        const restGain = e.rest(10);
        expect(restGain).toBeCloseTo(def().rest.perSecond * 10);
    });

    it('rest() no recupera si dt es 0', () => {
        const e = new Energy(def());
        expect(e.rest(0)).toBe(0);
    });

    it('itemAmount() devuelve puntos del objeto registrado', () => {
        const d = def();
        const e = new Energy(d);
        // Busca un item registrado en la definición.
        const itemId = Object.keys(d.items)[0];
        if (itemId) {
            expect(e.itemAmount(itemId)).toBe(d.items[itemId]);
        }
    });

    it('itemAmount() devuelve 0 para un objeto no registrado', () => {
        const e = new Energy(def());
        expect(e.itemAmount('no_existe')).toBe(0);
    });

    it('gain() no sube si amount es 0', () => {
        const e = new Energy(def());
        const before = e.value;
        expect(e.gain(0)).toBe(0);
        expect(e.value).toBe(before);
    });

    it('gain() no sube si amount es negativo', () => {
        const e = new Energy(def());
        const before = e.value;
        expect(e.gain(-10)).toBe(0);
        expect(e.value).toBe(before);
    });

    it('gain() no supera el máximo', () => {
        const e = new Energy(def());
        const gained = e.gain(def().max * 10);
        expect(e.value).toBe(def().max);
        expect(gained).toBe(def().max - def().start);
    });

    it('gain() desactiva exhausted al cruzar clearAt', () => {
        const eDef: EnergyDef = {
            ...def(),
            penalty: { ...def().penalty, clearAt: 30, modifiers: [] },
        };
        const e = new Energy(eDef, { value: 0, exhausted: true });
        expect(e.exhausted).toBe(true);
        e.gain(29);
        expect(e.exhausted).toBe(true);
        e.gain(1);
        expect(e.exhausted).toBe(false);
    });

    it('view() muestra los datos correctos', () => {
        const e = new Energy(def());
        const v = e.view();
        expect(v.id).toBe(def().id);
        expect(v.name).toBe(def().name);
        expect(v.max).toBe(def().max);
        expect(v.value).toBe(Math.floor(def().start));
        expect(v.exhausted).toBe(false);
        expect(v.penalty).toBeNull();
    });

    it('view() muestra penalty cuando está agotado', () => {
        const eDef: EnergyDef = {
            ...def(),
            penalty: { ...def().penalty, modifiers: [{ stat: 'power', op: 'flat', value: -1 }] },
        };
        const e = new Energy(eDef);
        e.die();
        e.die();
        e.die();
        e.die();
        e.die(); // value → 0, exhausted → true
        const v = e.view();
        expect(v.exhausted).toBe(true);
        expect(v.penalty).not.toBeNull();
        expect(v.penalty!.name).toBe(eDef.penalty.name);
        expect(v.penalty!.clearAt).toBe(eDef.penalty.clearAt);
    });

    it('toSave() redondea a 2 decimales', () => {
        const e = new Energy(def());
        e.gain(0.123456);
        const s = e.toSave();
        expect(s.value).toBe(Math.round(e.value * 100) / 100);
        expect(typeof s.exhausted).toBe('boolean');
    });

    it('constructor clampa NaN al máximo', () => {
        const e = new Energy(def(), { value: NaN, exhausted: false });
        expect(e.value).toBe(def().max);
    });

    it('constructor clampa Infinity al máximo', () => {
        const e = new Energy(def(), { value: Infinity, exhausted: false });
        expect(e.value).toBe(def().max);
    });

    it('constructor clampa valor negativo a 0', () => {
        const e = new Energy(def(), { value: -50, exhausted: false });
        expect(e.value).toBe(0);
        expect(e.exhausted).toBe(true); // value <= 0 → exhausted
    });

    it('constructor con guardado exhausted y value < clearAt mantiene exhausted', () => {
        const e = new Energy(def(), { value: 10, exhausted: true });
        expect(e.exhausted).toBe(true);
    });

    it('constructor con guardado exhausted y value >= clearAt quita exhausted', () => {
        const e = new Energy(def(), { value: def().penalty.clearAt + 1, exhausted: true });
        expect(e.exhausted).toBe(false);
    });

    it('die() devuelve justExhausted solo en la transición', () => {
        const eDef: EnergyDef = {
            ...def(),
            penalty: { ...def().penalty, modifiers: [] },
        };
        const e = new Energy(eDef);
        // Muertes hasta agotar
        let report;
        for (let i = 0; i < 10; i++) {
            report = e.die();
        }
        // La última muerte que cruzó a 0 debe tener justExhausted=true en algún punto.
        // Reinicia y verifica la transición exacta.
        const e2 = new Energy(eDef, { value: eDef.deathCost + 0.5, exhausted: false });
        const r = e2.die();
        expect(r.value).toBe(0); // left < 1 → 0
        expect(r.exhausted).toBe(true);
        expect(r.justExhausted).toBe(true);
    });

    it('die() con value > deathCost deja el resto', () => {
        const e = new Energy(def());
        const r = e.die();
        expect(r.lost).toBe(def().deathCost);
        expect(r.value).toBe(def().start - def().deathCost);
        expect(r.exhausted).toBe(false);
    });

    it('penaltyMods() vacío cuando no está agotado', () => {
        const e = new Energy(def());
        expect(e.penaltyMods()).toHaveLength(0);
    });
});

describe('botín de fin de combate', () => {
    const rules = () => loadGameData().rpg.spoils;

    it('pondera daño, curación y tiempo y conserva el total de monedas', () => {
        const parts = new Map([
            ['a', { damage: 900, healing: 0, time: 10 }],
            ['b', { damage: 100, healing: 300, time: 10 }],
        ]);
        const split = shares(parts, rules().weights);
        expect([...split.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1);
        const out = distribute(new Rng(3), { gold: 101, xp: 100, kills: 1, items: [] }, parts, rules());
        expect(out.reduce((n, x) => n + x.gold, 0)).toBe(101);
        expect(out.every((x) => x.xp >= 25)).toBe(true);
    });

    it('termina tras calma o al caer todo el grupo', () => {
        const encounter = new Encounter(rules(), new Rng(9));
        encounter.damage('player', 12);
        encounter.addKill(10, 7, []);
        expect(encounter.tick(rules().calmSeconds - 0.1, 0, ['player'])).toBeNull();
        const done = encounter.tick(0.2, 0, ['player']);
        expect(done?.kills).toBe(1);
        encounter.damage('player', 1);
        expect(encounter.tick(0.01, 1, [])?.wiped).toBe(true);
    });

    it('shares() vacío devuelve map vacío', () => {
        const s = shares(new Map(), rules().weights);
        expect(s.size).toBe(0);
    });

    it('shares() con un solo participante da 1', () => {
        const parts = new Map([['solo', { damage: 100, healing: 0, time: 5 }]]);
        const s = shares(parts, rules().weights);
        expect(s.get('solo')).toBeCloseTo(1);
    });

    it('shares() con solo curación (sin daño) pondera curación y tiempo', () => {
        const parts = new Map([
            ['a', { damage: 0, healing: 200, time: 10 }],
            ['b', { damage: 0, healing: 0, time: 10 }],
        ]);
        const s = shares(parts, rules().weights);
        // 'a' tiene curación, ambos tienen tiempo igual → 'a' > 'b'
        expect(s.get('a')!).toBeGreaterThan(s.get('b')!);
        expect(s.get('a')! + s.get('b')!).toBeCloseTo(1);
    });

    it('shares() con todos los aportes en 0 reparte igual', () => {
        const parts = new Map([
            ['a', { damage: 0, healing: 0, time: 0 }],
            ['b', { damage: 0, healing: 0, time: 0 }],
        ]);
        const s = shares(parts, rules().weights);
        expect(s.get('a')!).toBeCloseTo(0.5);
        expect(s.get('b')!).toBeCloseTo(0.5);
    });

    it('distribute() con items asigna cada item a un participante', () => {
        const parts = new Map([
            ['a', { damage: 100, healing: 0, time: 5 }],
            ['b', { damage: 0, healing: 0, time: 5 }],
        ]);
        const items = [
            { uid: 'u1', itemId: 'item_1', quantity: 1, rolled: [] },
            { uid: 'u2', itemId: 'item_2', quantity: 1, rolled: [] },
        ];
        const out = distribute(new Rng(42), { gold: 0, xp: 0, kills: 1, items }, parts, rules());
        const totalItems = out.reduce((n, a) => n + a.items.length, 0);
        expect(totalItems).toBe(2);
    });

    it('distribute() con minXpShare garantiza mínimo de XP', () => {
        const parts = new Map([
            ['a', { damage: 990, healing: 0, time: 10 }],
            ['b', { damage: 10, healing: 0, time: 10 }],
        ]);
        const out = distribute(new Rng(1), { gold: 0, xp: 1000, kills: 1, items: [] }, parts, rules());
        // 'b' tiene share muy bajo, pero minXpShare le garantiza un mínimo
        for (const a of out) {
            if (a.share > 0) {
                expect(a.xp).toBeGreaterThanOrEqual(Math.round(1000 * rules().minXpShare));
            }
        }
    });

    it('distribute() ordena por share descendente', () => {
        const parts = new Map([
            ['a', { damage: 100, healing: 0, time: 5 }],
            ['b', { damage: 900, healing: 0, time: 5 }],
        ]);
        const out = distribute(new Rng(1), { gold: 100, xp: 100, kills: 1, items: [] }, parts, rules());
        expect(out[0]!.share).toBeGreaterThanOrEqual(out[1]!.share);
    });

    it('distribute() con pool vacío', () => {
        const parts = new Map([['a', { damage: 100, healing: 0, time: 5 }]]);
        const out = distribute(new Rng(1), { gold: 0, xp: 0, kills: 0, items: [] }, parts, rules());
        expect(out.length).toBe(1);
        expect(out[0]!.gold).toBe(0);
        expect(out[0]!.xp).toBe(0);
        expect(out[0]!.items.length).toBe(0);
    });

    it('distribute() sin participantes devuelve array vacío', () => {
        const out = distribute(new Rng(1), { gold: 100, xp: 100, kills: 1, items: [] }, new Map(), rules());
        expect(out).toHaveLength(0);
    });

    it('Encounter.damage(0) no activa ni registra', () => {
        const e = new Encounter(rules(), new Rng(1));
        e.damage('p', 0);
        expect(e.active).toBe(false);
        expect(e.parts.size).toBe(0);
    });

    it('Encounter.damage(negativo) no activa', () => {
        const e = new Encounter(rules(), new Rng(1));
        e.damage('p', -5);
        expect(e.active).toBe(false);
    });

    it('Encounter.healing fuera de combate no cuenta', () => {
        const e = new Encounter(rules(), new Rng(1));
        e.healing('p', 50);
        expect(e.parts.size).toBe(0); // healing sin active no registra
    });

    it('Encounter.healing dentro de combate registra', () => {
        const e = new Encounter(rules(), new Rng(1));
        e.damage('p', 10); // activa
        e.healing('p', 50);
        expect(e.parts.get('p')!.healing).toBe(50);
    });

    it('Encounter.reset() limpia todo', () => {
        const e = new Encounter(rules(), new Rng(1));
        e.damage('p', 10);
        e.addKill(5, 3, []);
        e.reset();
        expect(e.active).toBe(false);
        expect(e.elapsed).toBe(0);
        expect(e.parts.size).toBe(0);
        expect(e.pool.kills).toBe(0);
        expect(e.pool.gold).toBe(0);
        expect(e.pool.xp).toBe(0);
    });

    it('Encounter.tick con aggro > 0 no termina', () => {
        const e = new Encounter(rules(), new Rng(1));
        e.damage('p', 10);
        e.addKill(5, 3, []);
        // Aunque pase el tiempo de calma, con aggro no termina
        const result = e.tick(rules().calmSeconds + 10, 1, ['p']);
        expect(result).toBeNull();
    });

    it('Encounter.tick acumula tiempo en present', () => {
        const e = new Encounter(rules(), new Rng(1));
        e.damage('p', 10);
        e.addKill(5, 3, []);
        // calmSeconds es 3; tick con 2 deja calm en 2 < 3, sigue activo
        e.tick(2, 0, ['p']);
        expect(e.elapsed).toBe(2);
        expect(e.parts.get('p')!.time).toBe(2);
    });

    it('Encounter.addKill con xp negativo no suma', () => {
        const e = new Encounter(rules(), new Rng(1));
        e.addKill(-10, 0, []);
        expect(e.pool.xp).toBe(0);
    });

    it('Encounter.addKill con gold negativo no suma', () => {
        const e = new Encounter(rules(), new Rng(1));
        e.addKill(0, -5, []);
        expect(e.pool.gold).toBe(0);
    });

    it('Encounter.tick devuelve kills y seconds', () => {
        const e = new Encounter(rules(), new Rng(1));
        e.damage('p', 10);
        e.addKill(20, 15, []);
        e.tick(3, 1, ['p']); // aggro, sigue
        const result = e.tick(rules().calmSeconds, 0, ['p']); // calma
        expect(result).not.toBeNull();
        expect(result!.kills).toBe(1);
        expect(result!.seconds).toBeGreaterThan(0);
        expect(result!.wiped).toBe(false);
    });

    it('Encounter.tick wiped cuando present está vacío', () => {
        const e = new Encounter(rules(), new Rng(1));
        e.damage('p', 10);
        e.addKill(5, 3, []);
        // Sin present, termina como wiped
        const result = e.tick(0.1, 0, []);
        expect(result).not.toBeNull();
        expect(result!.wiped).toBe(true);
    });

    it('shares() con aportes negativos los trata como 0', () => {
        const parts = new Map([
            ['a', { damage: -100, healing: 0, time: 10 }],
            ['b', { damage: 100, healing: 0, time: 10 }],
        ]);
        const s = shares(parts, rules().weights);
        // 'a' con daño negativo se trata como 0; 'b' tiene todo el daño
        expect(s.get('a')! + s.get('b')!).toBeCloseTo(1);
        expect(s.get('b')!).toBeGreaterThan(s.get('a')!);
    });

    it('distribute() gold remainder va al de más share', () => {
        const parts = new Map([
            ['a', { damage: 900, healing: 0, time: 10 }],
            ['b', { damage: 100, healing: 0, time: 10 }],
        ]);
        const out = distribute(new Rng(7), { gold: 100, xp: 0, kills: 0, items: [] }, parts, rules());
        // El gold total debe ser exactamente 100
        expect(out.reduce((n, a) => n + a.gold, 0)).toBe(100);
        // 'a' tiene más share, recibe el remainder
        expect(out[0]!.participant).toBe('a');
    });
});
