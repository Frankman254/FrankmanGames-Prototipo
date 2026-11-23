import { describe, it, expect } from 'vitest';
import { hinderDuration, cooldownSlow, dazeOf, isDisoriented } from '../src/rpg/hinder';
import type { HinderFamily, StatusDef } from '../src/rpg/contracts';
import type { TacticsRules } from '../src/rpg/content';
import { StatusSet } from '../src/rpg/status';
import { StatSheet } from '../src/rpg/stats';

const hinderRules: TacticsRules['hinder'] = {
    window: 10,
    factors: [1, 0.5, 0.25, 0],
    slowResistCap: 60,
    cooldownSlowCap: 0.6,
};

function makeStatusDef(overrides: Partial<StatusDef>): StatusDef {
    return {
        id: 'test_status',
        name: 'Estado de prueba',
        description: '',
        icon: '',
        kind: 'debuff',
        duration: 5,
        maxStacks: 3,
        modifiers: [],
        ...overrides,
    };
}

// ─── hinderDuration ────────────────────────────────────────────────────────

describe('hinderDuration', () => {
    it('primera aplicación usa el factor 1 (duración completa)', () => {
        const log = new Map();
        const dur = hinderDuration(6, 'exhaust', 0, log, 0, hinderRules);
        expect(dur).toBe(6);
        expect(log.get('exhaust')).toEqual({ count: 1, last: 0 });
    });

    it('segunda aplicación dentro de la ventana dura la mitad', () => {
        const log = new Map();
        hinderDuration(6, 'exhaust', 0, log, 0, hinderRules);
        const dur = hinderDuration(6, 'exhaust', 3, log, 0, hinderRules);
        expect(dur).toBe(3); // 6 × 0.5
        expect(log.get('exhaust')!.count).toBe(2);
    });

    it('tercera aplicación dentro de la ventana dura 1/4', () => {
        const log = new Map();
        hinderDuration(6, 'exhaust', 0, log, 0, hinderRules);
        hinderDuration(6, 'exhaust', 3, log, 0, hinderRules);
        const dur = hinderDuration(6, 'exhaust', 7, log, 0, hinderRules);
        expect(dur).toBe(1.5); // 6 × 0.25
    });

    it('cuarta aplicación dentro de la ventana da 0 (inmunidad)', () => {
        const log = new Map();
        hinderDuration(6, 'exhaust', 0, log, 0, hinderRules);
        hinderDuration(6, 'exhaust', 3, log, 0, hinderRules);
        hinderDuration(6, 'exhaust', 7, log, 0, hinderRules);
        const dur = hinderDuration(6, 'exhaust', 9, log, 0, hinderRules);
        expect(dur).toBe(0);
    });

    it('quinta aplicación sigue dando 0 (último factor se repite)', () => {
        const log = new Map();
        hinderDuration(6, 'exhaust', 0, log, 0, hinderRules);
        hinderDuration(6, 'exhaust', 2, log, 0, hinderRules);
        hinderDuration(6, 'exhaust', 4, log, 0, hinderRules);
        hinderDuration(6, 'exhaust', 6, log, 0, hinderRules);
        const dur = hinderDuration(6, 'exhaust', 8, log, 0, hinderRules);
        expect(dur).toBe(0);
    });

    it('fuera de la ventana se reinicia al factor 1', () => {
        const log = new Map();
        hinderDuration(6, 'exhaust', 0, log, 0, hinderRules);
        // 12 s después: fuera de la ventana de 10 s
        const dur = hinderDuration(6, 'exhaust', 12, log, 0, hinderRules);
        expect(dur).toBe(6);
        expect(log.get('exhaust')!.count).toBe(1);
    });

    it('cada familia tiene su propio contador', () => {
        const log = new Map();
        hinderDuration(6, 'exhaust', 0, log, 0, hinderRules);
        const dazeDur = hinderDuration(4, 'daze', 3, log, 0, hinderRules);
        expect(dazeDur).toBe(4); // primera de daze, factor 1
        expect(log.get('exhaust')!.count).toBe(1);
        expect(log.get('daze')!.count).toBe(1);
    });

    it('slowResist acorta la duración', () => {
        const log = new Map();
        const dur = hinderDuration(6, 'exhaust', 0, log, 50, hinderRules);
        // 6 × 1 × (1 - 0.5) = 3
        expect(dur).toBe(3);
    });

    it('slowResist topa en slowResistCap (60 %)', () => {
        const log = new Map();
        const dur = hinderDuration(6, 'exhaust', 0, log, 80, hinderRules);
        // 6 × 1 × (1 - 0.6) = 2.4
        expect(dur).toBeCloseTo(2.4, 9);
    });

    it('slowResist negativo se trata como 0', () => {
        const log = new Map();
        const dur = hinderDuration(6, 'exhaust', 0, log, -10, hinderRules);
        expect(dur).toBe(6);
    });

    it('slowResist se combina con rendimientos decrecientes', () => {
        const log = new Map();
        hinderDuration(8, 'exhaust', 0, log, 50, hinderRules);
        // segunda aplicación: 8 × 0.5 × (1 - 0.5) = 2
        const dur = hinderDuration(8, 'exhaust', 5, log, 50, hinderRules);
        expect(dur).toBe(2);
    });

    it('la ventana se mide desde el último intento, no desde el último con duración > 0', () => {
        const log = new Map();
        // 4 aplicaciones dentro de la ventana → count 4, factor 0
        hinderDuration(6, 'exhaust', 0, log, 0, hinderRules);
        hinderDuration(6, 'exhaust', 2, log, 0, hinderRules);
        hinderDuration(6, 'exhaust', 4, log, 0, hinderRules);
        hinderDuration(6, 'exhaust', 6, log, 0, hinderRules);
        // last = 6, count = 4. A los 11 s (dentro de 6+10=16), count sigue
        const dur = hinderDuration(6, 'exhaust', 11, log, 0, hinderRules);
        expect(dur).toBe(0); // count 5 → factor[3] = 0, last ahora = 11
        // A los 22 s (fuera de 11+10=21), se reinicia
        const dur2 = hinderDuration(6, 'exhaust', 22, log, 0, hinderRules);
        expect(dur2).toBe(6);
    });

    it('el log se actualiza aunque la duración sea 0', () => {
        const log = new Map();
        hinderDuration(6, 'daze', 0, log, 0, hinderRules);
        hinderDuration(6, 'daze', 2, log, 0, hinderRules);
        hinderDuration(6, 'daze', 4, log, 0, hinderRules);
        hinderDuration(6, 'daze', 6, log, 0, hinderRules);
        expect(log.get('daze')!.count).toBe(4);
        expect(log.get('daze')!.last).toBe(6);
    });
});

// ─── cooldownSlow ──────────────────────────────────────────────────────────

describe('cooldownSlow', () => {
    it('sin estados activos devuelve 0', () => {
        const st = new StatusSet(new StatSheet());
        expect(cooldownSlow(st, 0.6)).toBe(0);
    });

    it('suma cooldownSlow × stacks de cada estado con hinder', () => {
        const st = new StatusSet(new StatSheet());
        const def = makeStatusDef({
            id: 'exhausted',
            hinder: { family: 'exhaust', cooldownSlow: 0.2 },
        });
        st.apply(def);
        st.apply(def); // 2 stacks
        expect(cooldownSlow(st, 0.6)).toBe(0.4); // 0.2 × 2
    });

    it('topa en el cap', () => {
        const st = new StatusSet(new StatSheet());
        const def = makeStatusDef({
            id: 'exhausted',
            hinder: { family: 'exhaust', cooldownSlow: 0.3 },
        });
        st.apply(def);
        st.apply(def);
        st.apply(def); // 3 stacks → 0.9
        expect(cooldownSlow(st, 0.6)).toBe(0.6);
    });

    it('ignora los estados sin hinder', () => {
        const st = new StatusSet(new StatSheet());
        const def = makeStatusDef({ id: 'burn', hinder: undefined });
        st.apply(def);
        expect(cooldownSlow(st, 0.6)).toBe(0);
    });

    it('ignora los estados con hinder pero sin cooldownSlow', () => {
        const st = new StatusSet(new StatSheet());
        const def = makeStatusDef({
            id: 'dazed',
            hinder: { family: 'daze' },
        });
        st.apply(def);
        expect(cooldownSlow(st, 0.6)).toBe(0);
    });

    it('combina varios estados con hinder', () => {
        const st = new StatusSet(new StatSheet());
        const exhaustDef = makeStatusDef({
            id: 'exhausted',
            hinder: { family: 'exhaust', cooldownSlow: 0.2 },
        });
        const numbDef = makeStatusDef({
            id: 'numb',
            hinder: { family: 'daze', cooldownSlow: 0.15 },
        });
        st.apply(exhaustDef);
        st.apply(exhaustDef); // 2 stacks → 0.4
        st.apply(numbDef); // 1 stack → 0.15
        expect(cooldownSlow(st, 0.6)).toBe(0.55); // 0.4 + 0.15
    });
});

// ─── dazeOf ────────────────────────────────────────────────────────────────

describe('dazeOf', () => {
    it('devuelve undefined sin estados', () => {
        const st = new StatusSet(new StatSheet());
        expect(dazeOf(st)).toBeUndefined();
    });

    it('devuelve el estado con family daze', () => {
        const st = new StatusSet(new StatSheet());
        const def = makeStatusDef({
            id: 'dazed',
            hinder: { family: 'daze', castDelay: 0.5 },
        });
        st.apply(def);
        const found = dazeOf(st);
        expect(found).toBe(def);
    });

    it('ignora los estados con otras familias', () => {
        const st = new StatusSet(new StatSheet());
        const exhaustDef = makeStatusDef({
            id: 'exhausted',
            hinder: { family: 'exhaust', cooldownSlow: 0.2 },
        });
        st.apply(exhaustDef);
        expect(dazeOf(st)).toBeUndefined();
    });

    it('ignora los estados sin hinder', () => {
        const st = new StatusSet(new StatSheet());
        const def = makeStatusDef({ id: 'burn' });
        st.apply(def);
        expect(dazeOf(st)).toBeUndefined();
    });

    it('devuelve el primero de la lista si hay varios daze', () => {
        const st = new StatusSet(new StatSheet());
        const daze1 = makeStatusDef({
            id: 'dazed_1',
            hinder: { family: 'daze', castDelay: 0.3 },
        });
        const daze2 = makeStatusDef({
            id: 'dazed_2',
            hinder: { family: 'daze', castDelay: 0.8 },
        });
        st.apply(daze1);
        st.apply(daze2);
        expect(dazeOf(st)).toBe(daze1);
    });
});

// ─── isDisoriented ─────────────────────────────────────────────────────────

describe('isDisoriented', () => {
    it('devuelve false sin estados', () => {
        const st = new StatusSet(new StatSheet());
        expect(isDisoriented(st)).toBe(false);
    });

    it('devuelve true con un estado disorient', () => {
        const st = new StatusSet(new StatSheet());
        const def = makeStatusDef({
            id: 'disoriented',
            hinder: { family: 'disorient' },
        });
        st.apply(def);
        expect(isDisoriented(st)).toBe(true);
    });

    it('devuelve false con estados de otras familias', () => {
        const st = new StatusSet(new StatSheet());
        const exhaustDef = makeStatusDef({
            id: 'exhausted',
            hinder: { family: 'exhaust', cooldownSlow: 0.2 },
        });
        const dazeDef = makeStatusDef({
            id: 'dazed',
            hinder: { family: 'daze', castDelay: 0.5 },
        });
        st.apply(exhaustDef);
        st.apply(dazeDef);
        expect(isDisoriented(st)).toBe(false);
    });

    it('devuelve true aunque haya otros estados sin hinder', () => {
        const st = new StatusSet(new StatSheet());
        const burnDef = makeStatusDef({ id: 'burn' });
        const disDef = makeStatusDef({
            id: 'disoriented',
            hinder: { family: 'disorient' },
        });
        st.apply(burnDef);
        st.apply(disDef);
        expect(isDisoriented(st)).toBe(true);
    });
});
