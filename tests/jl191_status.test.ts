// JL-191: Pruebas de src/rpg/status.ts — aplicar, acumular, renovar, expirar y quitar estados.
import { describe, it, expect } from 'vitest';
import { StatusSet } from '../src/rpg/status';
import type { StatusDef } from '../src/rpg/contracts';
import { StatSheet } from '../src/rpg/stats';

function makeDef(overrides: Partial<StatusDef> = {}): StatusDef {
    return {
        id: 'burn',
        name: 'Quemadura',
        description: 'Quema al objetivo.',
        icon: '🔥',
        kind: 'debuff',
        duration: 5,
        maxStacks: 3,
        modifiers: [{ stat: 'damage.fire', op: 'flat', value: 10 }],
        ...overrides,
    };
}

function sheet(): StatSheet {
    return new StatSheet([]);
}

describe('StatusSet', () => {
    describe('apply', () => {
        it('aplica un estado nuevo con 1 stack y duración por defecto', () => {
            const ss = new StatusSet(sheet());
            const def = makeDef();
            const s = ss.apply(def);
            expect(s.def.id).toBe('burn');
            expect(s.stacks).toBe(1);
            expect(s.remaining).toBe(5);
            expect(s.duration).toBe(5);
            expect(ss.list.length).toBe(1);
        });

        it('usa la duración de opts si se pasa', () => {
            const ss = new StatusSet(sheet());
            const def = makeDef();
            const s = ss.apply(def, { duration: 8 });
            expect(s.remaining).toBe(8);
            expect(s.duration).toBe(8);
        });

        it('registra el modificador en la StatSheet', () => {
            const s = sheet();
            const ss = new StatusSet(s);
            const def = makeDef();
            ss.apply(def);
            expect(s.has('status:burn')).toBe(true);
            expect(s.get('damage.fire')).toBe(10);
        });

        it('aplica con source y shield personalizados', () => {
            const ss = new StatusSet(sheet());
            const def = makeDef({ id: 'shield', modifiers: [] });
            const src = { id: 'caster' };
            const s = ss.apply(def, { source: src, shield: 500 });
            expect(s.source).toBe(src);
            expect(s.shield).toBe(500);
        });
    });

    describe('acumular', () => {
        it('aplicar de nuevo suma un stack hasta maxStacks', () => {
            const s = sheet();
            const ss = new StatusSet(s);
            const def = makeDef();
            ss.apply(def);
            ss.apply(def);
            const a = ss.get('burn')!;
            expect(a.stacks).toBe(2);
            expect(s.get('damage.fire')).toBe(20); // 10 * 2 stacks
        });

        it('no pasa de maxStacks', () => {
            const s = sheet();
            const ss = new StatusSet(s);
            const def = makeDef({ maxStacks: 2 });
            ss.apply(def);
            ss.apply(def);
            ss.apply(def);
            const a = ss.get('burn')!;
            expect(a.stacks).toBe(2);
            expect(s.get('damage.fire')).toBe(20);
        });
    });

    describe('renovar', () => {
        it('renueva la duración al mayor de los dos valores', () => {
            const ss = new StatusSet(sheet());
            const def = makeDef({ duration: 5 });
            ss.apply(def);
            // tick 3s → quedan 2s
            ss.tick(3, () => {});
            // reaplicar: duración 5 vs remaining 2 → remaining = 5
            ss.apply(def);
            const s = ss.get('burn')!;
            expect(s.remaining).toBe(5);
        });

        it('si el remaining es mayor, no baja', () => {
            const ss = new StatusSet(sheet());
            const def = makeDef({ duration: 5 });
            ss.apply(def, { duration: 10 });
            // remaining = 10
            ss.apply(def); // duration de def = 5, pero remaining = 10 > 5
            const s = ss.get('burn')!;
            expect(s.remaining).toBe(10);
        });

        it('actualiza el source si se pasa uno nuevo', () => {
            const ss = new StatusSet(sheet());
            const def = makeDef();
            const src1 = { id: 'a' };
            const src2 = { id: 'b' };
            ss.apply(def, { source: src1 });
            ss.apply(def, { source: src2 });
            expect(ss.get('burn')!.source).toBe(src2);
        });
    });

    describe('tick y expirar', () => {
        it('avanza el tiempo y expira cuando remaining llega a 0', () => {
            const ss = new StatusSet(sheet());
            const def = makeDef({ duration: 4 });
            ss.apply(def);
            ss.tick(4, () => {});
            const s = ss;
            expect(s.has('burn')).toBe(false);
            const st = sheet();
            const ss2 = new StatusSet(st);
            const def2 = makeDef({ duration: 4 });
            ss2.apply(def2);
            ss2.tick(4, () => {});
            expect(ss2.has('burn')).toBe(false);
            expect(st.has('status:burn')).toBe(false);
        });

        it('dispara onTick cada tick.every segundos', () => {
            const ss = new StatusSet(sheet());
            const ticks: number[] = [];
            const def = makeDef({
                duration: 6,
                tick: { every: 2, effect: { type: 'damage', element: 'fire', min: 5, max: 5 } },
            });
            ss.apply(def);
            ss.tick(5.9, (s) => {
                ticks.push(s.stacks);
            });
            // ticks en t=2, t=4 → 2 ticks
            expect(ticks).toEqual([1, 1]);
        });

        it('onTick se llama una vez por stack', () => {
            const ss = new StatusSet(sheet());
            const ticks: number[] = [];
            const def = makeDef({
                duration: 4,
                maxStacks: 3,
                tick: { every: 2, effect: { type: 'damage', element: 'fire', min: 5, max: 5 } },
            });
            ss.apply(def);
            ss.apply(def); // 2 stacks
            ss.tick(2, (s) => {
                ticks.push(s.stacks);
            });
            // 1 tick × 2 stacks = 2 llamadas
            expect(ticks).toEqual([2, 2]);
        });

        it('el último tick coincide con el final (remaining = 0)', () => {
            const ss = new StatusSet(sheet());
            const ticks: number[] = [];
            const def = makeDef({
                duration: 4,
                tick: { every: 2, effect: { type: 'damage', element: 'fire', min: 5, max: 5 } },
            });
            ss.apply(def);
            ss.tick(4, () => ticks.push(1));
            expect(ticks.length).toBe(2); // t=2, t=4
            expect(ss.has('burn')).toBe(false);
        });

        it('no expira si dt es menor que remaining', () => {
            const ss = new StatusSet(sheet());
            const def = makeDef({ duration: 5 });
            ss.apply(def);
            ss.tick(3, () => {});
            expect(ss.has('burn')).toBe(true);
            expect(ss.get('burn')!.remaining).toBeCloseTo(2);
        });
    });

    describe('remove', () => {
        it('quita el estado y sus modificadores', () => {
            const s = sheet();
            const ss = new StatusSet(s);
            const def = makeDef();
            ss.apply(def);
            expect(ss.has('burn')).toBe(true);
            ss.remove('burn');
            expect(ss.has('burn')).toBe(false);
            expect(s.has('status:burn')).toBe(false);
            expect(s.get('damage.fire')).toBe(0);
        });

        it('no hace nada si el estado no existe', () => {
            const ss = new StatusSet(sheet());
            expect(() => ss.remove('nope')).not.toThrow();
            expect(ss.list.length).toBe(0);
        });
    });

    describe('clear', () => {
        it('quita todos los estados', () => {
            const s = sheet();
            const ss = new StatusSet(s);
            const def1 = makeDef({ id: 'burn', modifiers: [{ stat: 'damage.fire', op: 'flat', value: 10 }] });
            const def2 = makeDef({ id: 'frost', modifiers: [{ stat: 'damage.frost', op: 'flat', value: 5 }] });
            ss.apply(def1);
            ss.apply(def2);
            ss.clear();
            expect(ss.list.length).toBe(0);
            expect(s.has('status:burn')).toBe(false);
            expect(s.has('status:frost')).toBe(false);
        });
    });

    describe('absorb y escudos', () => {
        it('absorbe daño con el escudo y reduce el shield restante', () => {
            const ss = new StatusSet(sheet());
            const def = makeDef({ id: 'shield', modifiers: [] });
            ss.apply(def, { shield: 100 });
            const absorbed = ss.absorb(40);
            expect(absorbed).toBe(40);
            expect(ss.get('shield')!.shield).toBe(60);
        });

        it('cuando el escudo se agota, se quita el estado', () => {
            const ss = new StatusSet(sheet());
            const def = makeDef({ id: 'shield', modifiers: [] });
            ss.apply(def, { shield: 50 });
            ss.absorb(50);
            expect(ss.has('shield')).toBe(false);
        });

        it('si el daño supera el escudo, el excedente no se absorbe', () => {
            const ss = new StatusSet(sheet());
            const def = makeDef({ id: 'shield', modifiers: [] });
            ss.apply(def, { shield: 30 });
            const absorbed = ss.absorb(80);
            expect(absorbed).toBe(30);
            expect(ss.has('shield')).toBe(false);
        });

        it('shieldTotal suma los escudos activos', () => {
            const ss = new StatusSet(sheet());
            const def1 = makeDef({ id: 'shield1', modifiers: [] });
            const def2 = makeDef({ id: 'shield2', modifiers: [] });
            ss.apply(def1, { shield: 100 });
            ss.apply(def2, { shield: 200 });
            expect(ss.shieldTotal()).toBe(300);
        });

        it('absorb con múltiples escudos los consume en orden', () => {
            const ss = new StatusSet(sheet());
            const def1 = makeDef({ id: 'shield1', modifiers: [] });
            const def2 = makeDef({ id: 'shield2', modifiers: [] });
            ss.apply(def1, { shield: 40 });
            ss.apply(def2, { shield: 60 });
            const absorbed = ss.absorb(80);
            expect(absorbed).toBe(80);
            expect(ss.has('shield1')).toBe(false);
            expect(ss.get('shield2')!.shield).toBe(20);
        });
    });

    describe('control', () => {
        it('devuelve null sin controles', () => {
            const ss = new StatusSet(sheet());
            const def = makeDef();
            ss.apply(def);
            expect(ss.control()).toBeNull();
        });

        it('devuelve el control más fuerte (stun > root > silence)', () => {
            const ss = new StatusSet(sheet());
            const silence = makeDef({ id: 'silence', control: 'silence', modifiers: [] });
            const root = makeDef({ id: 'root', control: 'root', modifiers: [] });
            const stun = makeDef({ id: 'stun', control: 'stun', modifiers: [] });
            ss.apply(silence);
            expect(ss.control()).toBe('silence');
            ss.apply(root);
            expect(ss.control()).toBe('root');
            ss.apply(stun);
            expect(ss.control()).toBe('stun');
        });

        it('al quitar el más fuerte, baja al siguiente', () => {
            const ss = new StatusSet(sheet());
            const root = makeDef({ id: 'root', control: 'root', modifiers: [] });
            const silence = makeDef({ id: 'silence', control: 'silence', modifiers: [] });
            ss.apply(root);
            ss.apply(silence);
            expect(ss.control()).toBe('root');
            ss.remove('root');
            expect(ss.control()).toBe('silence');
        });
    });

    describe('view', () => {
        it('devuelve la lista de estados con remaining y stacks', () => {
            const ss = new StatusSet(sheet());
            const def = makeDef();
            ss.apply(def);
            ss.apply(def); // 2 stacks
            ss.tick(2, () => {});
            const v = ss.view();
            expect(v.length).toBe(1);
            const entry = v[0]!;
            expect(entry.statusId).toBe('burn');
            expect(entry.stacks).toBe(2);
            expect(entry.remaining).toBeCloseTo(3);
        });

        it('remaining nunca es negativo', () => {
            const ss = new StatusSet(sheet());
            const def = makeDef({ duration: 3 });
            ss.apply(def);
            ss.tick(2, () => {});
            const v = ss.view();
            expect(v[0]!.remaining).toBe(1);
        });
    });

    describe('has y get', () => {
        it('has devuelve true si el estado está activo', () => {
            const ss = new StatusSet(sheet());
            const def = makeDef();
            expect(ss.has('burn')).toBe(false);
            ss.apply(def);
            expect(ss.has('burn')).toBe(true);
        });

        it('get devuelve el estado activo o undefined', () => {
            const ss = new StatusSet(sheet());
            const def = makeDef();
            expect(ss.get('burn')).toBeUndefined();
            ss.apply(def);
            expect(ss.get('burn')).toBeDefined();
            expect(ss.get('nope')).toBeUndefined();
        });
    });

    describe('shareDamage (HZ-04b-defensa)', () => {
        it('guarda shareTarget y sharePercent al aplicar', () => {
            const ss = new StatusSet(sheet());
            const def = makeDef({ id: 'share', modifiers: [] });
            const target = { id: 'ally' };
            ss.apply(def, { shareTarget: target, sharePercent: 30 });
            const s = ss.get('share')!;
            expect(s.shareTarget).toBe(target);
            expect(s.sharePercent).toBe(30);
        });

        it('actualiza shareTarget y sharePercent al reaplicar', () => {
            const ss = new StatusSet(sheet());
            const def = makeDef({ id: 'share', modifiers: [] });
            ss.apply(def, { shareTarget: { id: 'a' }, sharePercent: 20 });
            ss.apply(def, { shareTarget: { id: 'b' }, sharePercent: 40 });
            const s = ss.get('share')!;
            expect(s.shareTarget).toEqual({ id: 'b' });
            expect(s.sharePercent).toBe(40);
        });
    });

    describe('edge cases', () => {
        it('tick con dt = 0 no avanza', () => {
            const ss = new StatusSet(sheet());
            const def = makeDef({ duration: 5 });
            ss.apply(def);
            ss.tick(0, () => {});
            expect(ss.get('burn')!.remaining).toBe(5);
        });

        it('tick con dt mayor que remaining expira y no queda negativo', () => {
            const ss = new StatusSet(sheet());
            const def = makeDef({ duration: 3 });
            ss.apply(def);
            ss.tick(10, () => {});
            expect(ss.has('burn')).toBe(false);
        });

        it('apply con shield actualiza al mayor', () => {
            const ss = new StatusSet(sheet());
            const def = makeDef({ id: 'shield', modifiers: [] });
            ss.apply(def, { shield: 100 });
            ss.apply(def, { shield: 50 }); // menor, no baja
            expect(ss.get('shield')!.shield).toBe(100);
            ss.apply(def, { shield: 200 }); // mayor, sube
            expect(ss.get('shield')!.shield).toBe(200);
        });

        it('múltiples estados distintos coexisten', () => {
            const s = sheet();
            const ss = new StatusSet(s);
            const burn = makeDef({ id: 'burn', modifiers: [{ stat: 'damage.fire', op: 'flat', value: 10 }] });
            const frost = makeDef({ id: 'frost', modifiers: [{ stat: 'damage.frost', op: 'flat', value: 5 }] });
            ss.apply(burn);
            ss.apply(frost);
            expect(ss.list.length).toBe(2);
            expect(s.get('damage.fire')).toBe(10);
            expect(s.get('damage.frost')).toBe(5);
        });
    });
});
