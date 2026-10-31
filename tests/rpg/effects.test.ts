import { describe, expect, it } from 'vitest';
import type { EffectDef } from '../../src/rpg/contracts';
import {
  createEffect,
  DamageEffect,
  DashEffect,
  EFFECT_TYPES,
  HealEffect,
  KnockbackEffect,
  RestoreResourceEffect,
  ShieldEffect,
  StatusEffect,
  SummonEffect,
  TeleportEffect,
  ZoneEffect,
  BlinkEffect,
  SwapEffect,
  PullEffect,
  RecoilEffect,
  TrapEffect,
  RevealEffect,
} from '../../src/rpg/effects';
import { StatSheet } from '../../src/rpg/stats';
import { StatusSet } from '../../src/rpg/status';
import { content, fixedRng, hero, RecordingContext } from './helpers';

describe('registro de efectos', () => {
  const samples: [EffectDef, unknown][] = [
    [{ type: 'damage', min: 1, max: 2, element: 'fire' }, DamageEffect],
    [{ type: 'heal', min: 1, max: 2 }, HealEffect],
    [{ type: 'status', statusId: 'burn' }, StatusEffect],
    [{ type: 'shield', amount: 10, duration: 3 }, ShieldEffect],
    [{ type: 'knockback', distance: 2 }, KnockbackEffect],
    [{ type: 'dash', distance: 2 }, DashEffect],
    [{ type: 'teleport', maxDistance: 5 }, TeleportEffect],
    [{ type: 'restoreResource', amount: 5 }, RestoreResourceEffect],
    [{ type: 'summon', archetype: 'spirit_wolf', count: 1, duration: 5 }, SummonEffect],
    [{ type: 'zone', radius: 2, duration: 3, every: 1, effects: [{ type: 'damage', min: 1, max: 1, element: 'storm' }] }, ZoneEffect],
    [{ type: 'blink', maxDistance: 6 }, BlinkEffect],
    [{ type: 'swap' }, SwapEffect],
    [{ type: 'pull', distance: 4 }, PullEffect],
    [{ type: 'recoil', distance: 3 }, RecoilEffect],
    [{ type: 'trap', radius: 1, duration: 10, effects: [{ type: 'damage', min: 1, max: 1, element: 'earth' }] }, TrapEffect],
    [{ type: 'reveal', radius: 8, duration: 4 }, RevealEffect],
  ];

  it('cada tipo de EffectDef crea su subclase', () => {
    expect(Object.keys(EFFECT_TYPES).sort()).toEqual(samples.map(([d]) => d.type).sort());
    for (const [def, cls] of samples) expect(createEffect(def, content())).toBeInstanceOf(cls as never);
  });

  it('referencias rotas fallan al crear', () => {
    expect(() => createEffect({ type: 'status', statusId: 'nope' }, content())).toThrow(/nope/);
  });
});

describe('efectos', () => {
  const h = hero();
  const enemy = hero('storm_weaver', 2);

  it('daño: escala min/max por el rango y pasa el crítico del hechizo', () => {
    const ctx = new RecordingContext(h);
    ctx.critChance = 0.2;
    createEffect({ type: 'damage', min: 10, max: 20, element: 'fire', scaling: 0.5 }, content()).apply(ctx, enemy, 1.5);
    expect(ctx.calls).toEqual([['damage', enemy, { min: 15, max: 30, element: 'fire', scaling: 0.5, critChance: 0.2, critBonus: 0 }]]);
  });

  it('curación: tirada × rango + scaling · principal', () => {
    const ctx = new RecordingContext(h, fixedRng(0.5));
    const e = createEffect({ type: 'heal', min: 10, max: 20, scaling: 1 }, content());
    expect(e.targeting).toBe('self');
    e.apply(ctx, h, 2);
    expect(ctx.calls).toEqual([['heal', h, Math.floor(15 * 2 + h.stats.get('strength'))]]);
  });

  it('estado: las mejoras van al lanzador y los perjuicios al objetivo; respeta la probabilidad', () => {
    expect(createEffect({ type: 'status', statusId: 'iron_shout' }, content()).targeting).toBe('self');
    const burn = createEffect({ type: 'status', statusId: 'burn', chance: 0.5, duration: 9 }, content());
    expect(burn.targeting).toBe('hit');
    const yes = new RecordingContext(h, fixedRng(0.1));
    burn.apply(yes, enemy, 1);
    expect(yes.calls).toEqual([['applyStatus', enemy, 'burn', 9, undefined]]);
    const no = new RecordingContext(h, fixedRng(0.9));
    burn.apply(no, enemy, 1);
    expect(no.calls).toEqual([]);
  });

  it('escudo, empuje, carga, teletransporte, recurso, invocación y zona piden lo suyo', () => {
    const ctx = new RecordingContext(h);
    createEffect({ type: 'shield', amount: 40, duration: 8 }, content()).apply(ctx, h, 1.25);
    createEffect({ type: 'knockback', distance: 2.5 }, content()).apply(ctx, enemy, 1);
    createEffect({ type: 'dash', distance: 6 }, content()).apply(ctx, h, 1);
    createEffect({ type: 'teleport', maxDistance: 8 }, content()).apply(ctx, h, 1);
    createEffect({ type: 'restoreResource', amount: 40 }, content()).apply(ctx, h, 1);
    createEffect({ type: 'summon', archetype: 'spirit_wolf', count: 2, duration: 15 }, content()).apply(ctx, h, 1);
    createEffect({ type: 'zone', radius: 2.5, duration: 5, every: 1, effects: [{ type: 'damage', min: 1, max: 2, element: 'storm' }] }, content()).apply(ctx, h, 1.1);
    expect(ctx.calls.map((c) => c[0])).toEqual(['applyStatus', 'knockback', 'dash', 'teleport', 'restoreResource', 'summon', 'zone']);
    expect(ctx.calls[0]).toEqual(['applyStatus', h, 'shield', 8, 50]);
    expect(ctx.calls[1]).toEqual(['knockback', enemy, ctx.origin, 2.5]);
    expect(ctx.calls[5]).toEqual(['summon', 'spirit_wolf', 2, 15]);
    const zone = ctx.calls[6]![1] as { effects: unknown[]; power: number; radius: number };
    expect(zone.radius).toBe(2.5);
    expect(zone.power).toBe(1.1);
    expect(zone.effects[0]).toBeInstanceOf(DamageEffect);
  });
});

describe('estados activos', () => {
  const def = (id: string) => content().statuses[id]!;

  it('acumula hasta el tope, refresca la duración y aplica modificadores × acumulaciones', () => {
    const sheet = new StatSheet();
    const st = new StatusSet(sheet);
    st.apply(def('static_charge'));
    st.apply(def('static_charge'));
    st.apply(def('static_charge'));
    st.apply(def('static_charge'));
    expect(st.get('static_charge')!.stacks).toBe(3);
    expect(sheet.get('resist.storm')).toBe(-15);
    st.tick(10, () => {});
    expect(st.has('static_charge')).toBe(false);
    expect(sheet.get('resist.storm')).toBe(0);
  });

  it('el efecto periódico se dispara cada `every` y una vez por acumulación', () => {
    const st = new StatusSet(new StatSheet());
    st.apply(def('burn'), { duration: 3 });
    st.apply(def('burn'), { duration: 3 });
    let ticks = 0;
    for (let i = 0; i < 60 * 4; i++) st.tick(1 / 60, () => ticks++);
    expect(ticks).toBe(6); // 3 s × 2 acumulaciones
    expect(st.has('burn')).toBe(false);
  });

  it('el escudo absorbe y desaparece al agotarse', () => {
    const st = new StatusSet(new StatSheet());
    st.apply(def('shield'), { shield: 30 });
    expect(st.absorb(20)).toBe(20);
    expect(st.shieldTotal()).toBe(10);
    expect(st.absorb(25)).toBe(10);
    expect(st.has('shield')).toBe(false);
  });

  it('el control más fuerte gana', () => {
    const st = new StatusSet(new StatSheet());
    expect(st.control()).toBeNull();
    st.apply(def('rooted'));
    expect(st.control()).toBe('root');
    st.apply(def('stunned'));
    expect(st.control()).toBe('stun');
  });

  it('el escudo de un actor absorbe antes de la vida', () => {
    const h = hero();
    const max = h.health;
    h.statuses.apply(def('shield'), { shield: 15 });
    expect(h.takeDamage(20)).toBe(5);
    expect(h.health).toBe(max - 5);
  });
});
