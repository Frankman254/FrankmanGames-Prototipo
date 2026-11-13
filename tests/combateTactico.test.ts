// Combate táctico (respuestas del creador, 2026-10-31): trampas invisibles que
// se disparan al pisarlas, revelar, controles en tiempo real con rendimientos
// decrecientes y resistencia (agotamiento, embotamiento, desorientación) y los
// dos modos experimentales de placaje (bloqueo de cuerpo y libre).
import { describe, expect, it } from 'vitest';
import { loadGameData, type GameData } from '../src/data';
import { Character } from '../src/rpg/character';
import type { StatusDef } from '../src/rpg/contracts';
import { GameSession } from '../src/rpg/session';
import type { Enemy } from '../src/sim/enemies';
import type { GameEvent } from '../src/sim/events';
import { Rng } from '../src/sim/rng';
import { dist } from '../src/sim/vec2';
import { World } from '../src/sim/world';
import { normalizeOptions } from '../src/ui/menus/saveStore';
import { prepareSpells } from './levels';

const DT = 1 / 60;
const data: GameData = loadGameData();

function arena(classId = 'storm_weaver'): World {
  const rng = new Rng(1);
  const s = new GameSession(data.rpg, Character.create(data.rpg, classId, 'Prueba', rng), rng);
  const w = new World(data, { encounter: false, character: s.character, seed: 1 });
  s.attach(w);
  w.player.pos = { x: 10, y: 10 };
  w.player.prevPos = { x: 10, y: 10 };
  return w;
}

function run(w: World, seconds: number): GameEvent[] {
  const out: GameEvent[] = [];
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    w.tick(DT);
    out.push(...w.drainEvents());
  }
  return out;
}

const aim = (x: number, y: number, targetId: number | null = null) => ({ point: { x, y }, targetId });
/** Enemigo quieto: no piensa (aturdido por un golpe muy largo). */
const still = (e: Enemy): Enemy => {
  e.state = 'stagger';
  e.stateTime = -1e9;
  return e;
};
const ready = (w: World): void => {
  w.player.cooldowns = {};
  w.player.gcd = 0;
  w.player.resource = w.player.maxResource;
};
const status = (id: string): StatusDef => data.rpg.statuses[id]!;
const of = <T extends GameEvent['type']>(ev: GameEvent[], type: T) => ev.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);

describe('trampas invisibles', () => {
  it('Lazo de zarzas: queda en el suelo, sólo la ve su bando y se dispara al pisarla un enemigo', () => {
    const w = arena();
    prepareSpells(w.character, 'bramble_snare');
    expect(w.commandCast('bramble_snare', aim(15, 10))).toBeNull();
    expect(w.traps).toHaveLength(1);
    const t = w.traps[0]!;
    expect(t.pos).toEqual({ x: 15, y: 10 });
    // El jugador la ve (tenue, propia); los enemigos no.
    expect(w.visibleTraps('player')).toEqual([expect.objectContaining({ id: t.id, own: true })]);
    expect(w.visibleTraps('enemy')).toEqual([]);
    // El propio jugador la pisa sin que salte.
    w.player.pos = { x: 15, y: 10 };
    run(w, 1);
    expect(w.traps).toHaveLength(1);
    // Un enemigo la pisa: daño, enredado y la trampa desaparece.
    w.player.pos = { x: 10, y: 10 };
    const e = still(w.spawnEnemy('melee', { x: 15.5, y: 10 }));
    const ev = run(w, 0.1);
    expect(of(ev, 'trapTriggered')).toEqual([expect.objectContaining({ trapId: t.id, targetId: e.id })]);
    expect(of(ev, 'damage').some((d) => d.targetId === e.id && d.ability === 'bramble_snare')).toBe(true);
    expect(w.enemyActor(e).statuses.has('rooted')).toBe(true);
    expect(w.traps).toHaveLength(0);
  });

  it('no salta hasta armarse y caduca al acabarse su duración', () => {
    const w = arena();
    prepareSpells(w.character, 'bramble_snare');
    const e = still(w.spawnEnemy('melee', { x: 15, y: 10 }));
    w.commandCast('bramble_snare', aim(15, 10));
    // Recién puesta debajo del enemigo: espera armSeconds.
    run(w, data.rpg.tactics.traps.armSeconds * 0.5);
    expect(w.traps).toHaveLength(1);
    run(w, data.rpg.tactics.traps.armSeconds);
    expect(w.traps).toHaveLength(0);
    expect(w.enemyActor(e).statuses.has('rooted')).toBe(true);
    // Otra sin nadie encima: se va sola tras su duración.
    ready(w);
    w.commandCast('bramble_snare', aim(12, 14));
    const ev = run(w, 31);
    expect(of(ev, 'trapGone').map((g) => g.reason)).toContain('expired');
    expect(w.traps).toHaveLength(0);
  });

  it('límite por lanzador (la más vieja desaparece) y distancia mínima entre trampas', () => {
    const w = arena();
    prepareSpells(w.character, 'bramble_snare');
    const max = data.rpg.tactics.traps.maxActive;
    const spots = [{ x: 14, y: 10 }, { x: 14, y: 13 }, { x: 11, y: 14 }, { x: 8, y: 13 }];
    const ids: number[] = [];
    for (const p of spots.slice(0, max + 1)) {
      ready(w);
      expect(w.commandCast('bramble_snare', aim(p.x, p.y))).toBeNull();
      ids.push(w.traps[w.traps.length - 1]!.id);
    }
    expect(w.traps).toHaveLength(max);
    expect(w.traps.map((t) => t.id)).not.toContain(ids[0]);
    // Demasiado cerca de otra trampa propia: no se lanza (ni gasta).
    ready(w);
    const before = w.player.resource;
    expect(w.commandCast('bramble_snare', aim(14.5, 13.5))).toBe('trapSpacing');
    expect(w.player.resource).toBe(before);
  });

  it('Brasa enterrada aparta al enemigo de la trampa y lo deja agotado', () => {
    const w = arena('ember_vanguard');
    prepareSpells(w.character, 'ember_mine');
    w.commandCast('ember_mine', aim(14, 10));
    run(w, 0.5);
    const e = still(w.spawnEnemy('melee', { x: 14.6, y: 10 }));
    run(w, 0.1);
    expect(e.pos.x).toBeGreaterThan(16);
    expect(w.enemyActor(e).statuses.has('weariness')).toBe(true);
  });

  it('el trampero pone trampas a sus pies que el jugador no ve; pisarla le hace daño y lo enreda', () => {
    const w = arena();
    const e = w.spawnEnemy('trapper', { x: 14, y: 10 });
    e.state = 'pursue';
    e.spellCooldowns = e.def.spells.map((sp) => (sp.effect === 'trap' ? 0 : 99));
    e.attackCooldown = 99;
    const ev = run(w, 1.5);
    const placed = of(ev, 'trapPlaced');
    expect(placed).toHaveLength(1);
    expect(placed[0]!.team).toBe('enemy');
    const t = w.traps[0]!;
    expect(w.visibleTraps('player')).toEqual([]);
    expect(w.visibleTraps('enemy')).toHaveLength(1);
    still(e);
    w.player.pos = { ...t.pos };
    const hit = run(w, 0.1);
    expect(of(hit, 'trapTriggered')[0]).toMatchObject({ trapId: t.id, targetId: w.player.id });
    expect(of(hit, 'damage').some((d) => d.toPlayer && d.amount > 0)).toBe(true);
    expect(w.character.statuses.has('rooted')).toBe(true);
  });

  it('las trampas de un enemigo desaparecen si muere', () => {
    const w = arena();
    const e = w.spawnEnemy('trapper', { x: 20, y: 10 });
    w.placeTrap(w.enemyActor(e), 'test', { x: 20, y: 12 }, { radius: 1, duration: 30, maxActive: null, minSpacing: null, effects: [], power: 1 });
    expect(w.traps).toHaveLength(1);
    w.enemyActor(e).takeDamage(1e9);
    run(w, 0.1);
    expect(w.traps).toHaveLength(0);
  });
});

describe('revelar', () => {
  it('Polvo vidente: deja ver un rato las trampas rivales cercanas, no las lejanas', () => {
    const w = arena();
    prepareSpells(w.character, 'seer_dust');
    const e = still(w.spawnEnemy('trapper', { x: 30, y: 10 }));
    const foe = w.enemyActor(e);
    const spec = { radius: 0.9, duration: 60, maxActive: 5, minSpacing: 1, effects: [], power: 1 };
    const near = w.placeTrap(foe, 'test', { x: 14, y: 10 }, spec)!;
    const far = w.placeTrap(foe, 'test', { x: 26, y: 10 }, spec)!;
    expect(w.visibleTraps('player')).toEqual([]);
    expect(w.commandCast('seer_dust', aim(10, 10))).toBeNull();
    expect(w.visibleTraps('player').map((t) => t.id)).toEqual([near.id]);
    expect(w.visibleTraps('player')[0]!.own).toBe(false);
    run(w, 5.5);
    expect(w.visibleTraps('player').map((t) => t.id)).toEqual([near.id]);
    run(w, 1);
    expect(w.visibleTraps('player')).toEqual([]);
    expect(w.traps.map((t) => t.id)).toEqual([near.id, far.id]);
  });

  it('se aprende con pergamino y se compra en la botica', () => {
    expect(data.rpg.items['scroll_seer_dust']?.use).toEqual({ kind: 'learnSpell', spellId: 'seer_dust' });
    expect(Object.values(data.rpg.merchants).some((m) => m.stock.some((s) => s.itemId === 'scroll_seer_dust'))).toBe(true);
  });
});

describe('controles en tiempo real', () => {
  it('agotamiento: más lento y enfriamientos más lentos, acumulable con tope', () => {
    const w = arena();
    const ctx = w.context(w.character, 'test', { x: 10, y: 10 }, 0);
    const base = w.character.stats.get('moveSpeed');
    ctx.applyStatus(w.character, status('weariness'), 3);
    w.player.cooldowns = { spark: 10 };
    run(w, 1);
    expect(w.player.speed).toBeLessThan(base);
    // Una acumulación: el enfriamiento corre al (1 − cooldownSlow).
    expect(w.player.cooldowns['spark']).toBeCloseTo(10 - (1 - 0.15), 1);
    // Con más acumulaciones de las que admite, se queda en maxStacks; el frenado tiene tope.
    const heavy: StatusDef = { ...status('weariness'), id: 'heavy', maxStacks: 3, hinder: { family: 'exhaust', cooldownSlow: 0.5 } };
    const w2 = arena();
    for (let i = 0; i < 5; i++) w2.character.statuses.apply(heavy, { duration: 5 });
    expect(w2.character.statuses.get('heavy')!.stacks).toBe(3);
    w2.player.cooldowns = { spark: 10 };
    run(w2, 1);
    expect(w2.player.cooldowns['spark']).toBeCloseTo(10 - (1 - data.rpg.tactics.hinder.cooldownSlowCap), 1);
  });

  it('embotamiento: el próximo lanzamiento tarda más (y se consume)', () => {
    const w = arena();
    const slow: StatusDef = { ...status('dazed'), id: 'daze_slow', hinder: { family: 'daze', castDelay: 0.6, failChance: 0 } };
    w.context(w.character, 'test', { x: 10, y: 10 }, 0).applyStatus(w.character, slow, 2);
    expect(w.commandCast('storm_focus', aim(10, 10))).toBeNull();
    expect(w.player.casting?.remaining).toBeCloseTo(0.6, 5);
    expect(w.character.statuses.has('daze_slow')).toBe(false);
    const ev = run(w, 0.7);
    expect(of(ev, 'cast').map((c) => c.ability)).toContain('storm_focus');
  });

  it('embotamiento: o falla el lanzamiento (sin gastar recurso)', () => {
    const w = arena();
    const fail: StatusDef = { ...status('dazed'), id: 'daze_fail', hinder: { family: 'daze', failChance: 1 } };
    w.context(w.character, 'test', { x: 10, y: 10 }, 0).applyStatus(w.character, fail, 2);
    const res = w.player.resource;
    w.commandCast('storm_focus', aim(10, 10));
    const ev = w.drainEvents();
    expect(of(ev, 'castBlocked')).toEqual([expect.objectContaining({ ability: 'storm_focus', reason: 'dazed' })]);
    expect(of(ev, 'dazeFail')).toHaveLength(1);
    expect(w.player.resource).toBe(res);
    expect(w.character.statuses.has('storm_focus')).toBe(false);
    expect(w.player.gcd).toBeGreaterThan(0);
  });

  it('desorientación: sin hechizos de desplazamiento; los demás sí', () => {
    const w = arena('ember_vanguard');
    w.context(w.character, 'test', { x: 10, y: 10 }, 0).applyStatus(w.character, status('disoriented'), 2);
    expect(w.commandCast('charge', aim(15, 10))).toBe('disoriented');
    expect(w.player.pos).toEqual({ x: 10, y: 10 });
    expect(w.commandCast('iron_shout', aim(10, 10))).toBeNull();
    run(w, 2.6);
    ready(w);
    expect(w.commandCast('charge', aim(15, 10))).toBeNull();
  });

  it('rendimientos decrecientes por familia: cada repetición dura menos hasta inmune; pasada la ventana, vuelve entero', () => {
    const w = arena();
    const ctx = w.context(w.character, 'test', { x: 10, y: 10 }, 0);
    const factors = data.rpg.tactics.hinder.factors;
    const durations: number[] = [];
    for (let i = 0; i < factors.length; i++) {
      w.character.statuses.clear();
      ctx.applyStatus(w.character, status('disoriented'), 2);
      durations.push(w.character.statuses.get('disoriented')?.remaining ?? 0);
    }
    expect(durations).toEqual(factors.map((f) => 2 * f));
    const ev = w.drainEvents();
    expect(of(ev, 'hinderResisted')).toHaveLength(factors.filter((f) => f === 0).length);
    // Otra familia no comparte los rendimientos.
    ctx.applyStatus(w.character, status('dazed'), 2);
    expect(w.character.statuses.get('dazed')?.remaining).toBe(2);
    // Pasada la ventana sin repetir, entero otra vez.
    w.time += data.rpg.tactics.hinder.window + 0.1;
    w.character.statuses.clear();
    ctx.applyStatus(w.character, status('disoriented'), 2);
    expect(w.character.statuses.get('disoriented')?.remaining).toBe(2);
  });

  it('resistencia a los controles (slowResist) acorta la duración, con tope', () => {
    const w = arena();
    const ctx = w.context(w.character, 'test', { x: 10, y: 10 }, 0);
    w.character.stats.set('test', [{ stat: 'slowResist', op: 'flat', value: 30 }]);
    ctx.applyStatus(w.character, status('dazed'), 2);
    expect(w.character.statuses.get('dazed')?.remaining).toBeCloseTo(1.4, 5);
    w.character.stats.set('test', [{ stat: 'slowResist', op: 'flat', value: 500 }]);
    ctx.applyStatus(w.character, status('weariness'), 3);
    expect(w.character.statuses.get('weariness')?.remaining).toBeCloseTo(3 * (1 - data.rpg.tactics.hinder.slowResistCap / 100), 5);
    // Las Tobilleras de junco la dan.
    expect(data.rpg.items['reed_anklets']!.implicit).toContainEqual({ stat: 'slowResist', op: 'flat', value: 15 });
  });

  it('los enemigos también: agotado enfría más lento, desorientado no retrocede, embotado falla el aviso', () => {
    const w = arena();
    const e = w.spawnEnemy('ranged', { x: 12, y: 10 });
    const a = w.enemyActor(e);
    const ctx = w.context(w.character, 'test', { x: 10, y: 10 }, 0);
    ctx.applyStatus(a, status('weariness'), 3);
    ctx.applyStatus(a, status('disoriented'), 2);
    e.state = 'pursue';
    e.attackCooldown = 99;
    e.spellCooldowns = e.def.spells.map(() => 99);
    const x0 = e.pos.x;
    run(w, 0.5);
    expect(e.cooldownRate).toBeCloseTo(0.85, 5);
    expect(e.disoriented).toBe(true);
    // A distancia de retroceso (4 m) se queda: no se aleja del jugador.
    expect(e.pos.x).toBeLessThanOrEqual(x0 + 1e-6);
    // Embotado con fallo seguro: el aviso no llega a salir.
    const fail: StatusDef = { ...status('dazed'), id: 'daze_fail', hinder: { family: 'daze', failChance: 1 } };
    ctx.applyStatus(a, fail, 2);
    e.attackCooldown = 0;
    const ev = run(w, 0.2);
    expect(of(ev, 'dazeFail')).toEqual([expect.objectContaining({ targetId: e.id })]);
    expect(of(ev, 'telegraph')).toHaveLength(0);
  });

  it('hay al menos un hechizo de cada control para jugadores y para enemigos', () => {
    const families = (statusIds: string[]) => new Set(statusIds.map((id) => data.rpg.statuses[id]?.hinder?.family).filter(Boolean));
    const playerIds = Object.values(data.rpg.spells).flatMap((s) => s.effects.flatMap((e) => (e.type === 'status' ? [e.statusId] : e.type === 'trap' ? e.effects.flatMap((x) => (x.type === 'status' ? [x.statusId] : [])) : [])));
    const enemyIds = Object.values(data.enemies.archetypes).flatMap((a) => a.spells.flatMap((s) => (s.status ? [s.status.id] : [])));
    expect(families(playerIds)).toEqual(new Set(['exhaust', 'daze', 'disorient']));
    expect(families(enemyIds)).toEqual(new Set(['exhaust', 'daze', 'disorient']));
    expect(Object.values(data.enemies.archetypes).some((a) => a.spells.some((s) => s.effect === 'trap'))).toBe(true);
  });
});

describe('placaje: dos modos experimentales', () => {
  it('modo cuerpo: el jugador no atraviesa a un enemigo; en modo libre sí', () => {
    for (const mode of ['body', 'free'] as const) {
      const w = arena();
      w.lockMode = mode;
      const e = still(w.spawnEnemy('melee', { x: 12, y: 10 }));
      w.commandMove({ x: 14, y: 10 });
      run(w, 1.5);
      if (mode === 'body') {
        expect(w.player.pos.x).toBeLessThan(12);
        expect(dist(w.player.pos, e.pos)).toBeGreaterThanOrEqual(w.player.radius + e.radius - 1e-6);
      } else {
        expect(w.player.pos.x).toBeCloseTo(14, 3);
      }
    }
  });

  it('modo cuerpo: separarse andando de un enemigo pegado cuesta (más lento un rato)', () => {
    const w = arena();
    w.lockMode = 'body';
    still(w.spawnEnemy('melee', { x: 11.2, y: 10 }));
    w.commandMove({ x: 4, y: 10 });
    const ev = run(w, 0.4);
    expect(of(ev, 'lock')).toEqual([expect.objectContaining({ mode: 'body', targetId: w.player.id })]);
    expect(w.character.statuses.has('body_lock')).toBe(true);
    expect(w.player.speed).toBeLessThan(w.character.stats.get('moveSpeed') / (1 - 0.35) - 1e-6);
  });

  it('modo libre: un pequeño placaje al empezar a alejarse, una vez por contacto', () => {
    const w = arena();
    w.lockMode = 'free';
    still(w.spawnEnemy('melee', { x: 11.2, y: 10 }));
    w.commandMove({ x: 9, y: 10 });
    const first = run(w, 0.1);
    expect(of(first, 'lock')).toEqual([expect.objectContaining({ mode: 'free' })]);
    expect(w.character.statuses.has('tackled')).toBe(true);
    // Sigue pegado y se mueve otra vez: no hay segundo placaje en el mismo contacto.
    const again = run(w, 0.5);
    expect(of(again, 'lock')).toHaveLength(0);
    // Tras separarse del todo y volver a pegarse, sí.
    w.commandMove({ x: 4, y: 10 });
    run(w, 2);
    w.player.pos = { x: 10, y: 10 };
    w.commandMove({ x: 8, y: 10 });
    expect(of(run(w, 0.1), 'lock')).toHaveLength(1);
  });

  it('el placaje también frena al enemigo que se separa andando del jugador', () => {
    const w = arena();
    w.lockMode = 'body';
    const e = w.spawnEnemy('ranged', { x: 11.1, y: 10 });
    e.state = 'pursue';
    e.attackCooldown = 99;
    e.spellCooldowns = e.def.spells.map(() => 99);
    const ev = run(w, 0.5);
    expect(of(ev, 'lock').some((l) => l.targetId === e.id)).toBe(true);
    expect(w.enemyActor(e).statuses.has('body_lock')).toBe(true);
  });

  it('la opción vive en GameOptions: libre por defecto, cuerpo si se elige', () => {
    expect(normalizeOptions({}).lockMode).toBe('free');
    expect(normalizeOptions({ lockMode: 'body' }).lockMode).toBe('body');
    expect(normalizeOptions({ lockMode: 'nada' }).lockMode).toBe('free');
  });
});
