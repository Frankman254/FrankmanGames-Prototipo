import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { Character } from '../../src/rpg/character';
import { GameSession } from '../../src/rpg/session';
import type { GameEvent } from '../../src/sim/events';
import { Rng } from '../../src/sim/rng';
import { dist } from '../../src/sim/vec2';
import { World } from '../../src/sim/world';

const DT = 1 / 60;

function arena(classId = 'ember_vanguard', seed = 1): { w: World; s: GameSession } {
  const data = loadGameData();
  const rng = new Rng(seed);
  const s = new GameSession(data.rpg, Character.create(data.rpg, classId, 'Prueba', rng), rng);
  const w = new World(data, { encounter: false, character: s.character, seed });
  s.attach(w);
  w.player.pos = { x: 10, y: 10 };
  w.player.prevPos = { x: 10, y: 10 };
  return { w, s };
}

function run(w: World, seconds: number, each?: () => void): GameEvent[] {
  const out: GameEvent[] = [];
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    each?.();
    w.tick(DT);
    out.push(...w.drainEvents());
  }
  return out;
}

const aim = (x: number, y: number, targetId: number | null = null) => ({ point: { x, y }, targetId });
const damageTo = (ev: GameEvent[], id: number) => ev.filter((e): e is Extract<GameEvent, { type: 'damage' }> => e.type === 'damage' && e.targetId === id);
/** Enemigo quieto (aturdido de la simulación) para las pruebas. */
const still = (e: { state: string; stateTime: number }) => {
  e.state = 'stagger';
  e.stateTime = -1e9;
};

describe('integración: personaje y barra', () => {
  it('vida, recurso y velocidad del jugador son los del personaje de la clase', () => {
    const { w } = arena('storm_weaver');
    expect(w.player.maxHealth).toBe(w.character.maxHealth);
    expect(w.player.maxResource).toBe(w.character.maxResource);
    w.player.health = 5;
    expect(w.character.health).toBe(5);
    expect(w.player.speed).toBe(w.character.stats.get('moveSpeed'));
  });

  it('los huecos 1–6 lanzan el hechizo de la barra; hueco vacío y hechizo no aprendido se bloquean', () => {
    const { w, s } = arena();
    const e = w.spawnEnemy('melee', { x: 11.6, y: 10 });
    still(e);
    expect(w.commandCastSlot(0, aim(11.6, 10, e.id))).toBeNull(); // Tajo ígneo
    expect(damageTo(w.drainEvents(), e.id)).toHaveLength(1);
    s.assignHotbar(5, null);
    expect(w.commandCastSlot(5, aim(0, 0))).toBe('empty');
    expect(w.commandCast('spark', aim(0, 0))).toBe('unknown');
  });

  it('el ataque básico usa el arma equipada: alcance, cadencia y elemento', () => {
    const { w, s } = arena();
    const sword = w.basicAttack();
    expect(sword.range).toBe(1.3);
    w.character.give('copper_wand');
    s.equip(w.character.inventory.slots.find((x) => x?.itemId === 'copper_wand')!.uid);
    const wand = w.basicAttack();
    expect(wand.range).toBe(7);
    expect(wand.projectileSpeed).not.toBeNull();
    expect(wand.cooldown).toBeCloseTo(1 / 1.5);
    s.unequip('weapon');
    expect(w.basicAttack().range).toBe(loadGameData().rpg.rules.unarmed.range);
  });

  it('el proyectil llega cuando recorre la distancia', () => {
    const { w } = arena('storm_weaver');
    const e = w.spawnEnemy('melee', { x: 18, y: 10 });
    still(e);
    w.commandCast('spark', aim(18, 10, e.id));
    expect(damageTo(w.drainEvents(), e.id)).toHaveLength(0);
    expect(damageTo(run(w, 0.5), e.id)).toHaveLength(1);
  });

  it('la armadura y la resistencia del enemigo (ficha RPG) reducen el daño', () => {
    const { w } = arena();
    const a = w.spawnEnemy('melee', { x: 11.6, y: 10 });
    still(a);
    const actor = w.enemyActor(a);
    expect(actor.stats.get('armor')).toBe(1);
    actor.stats.set('test', [{ stat: 'armor', op: 'flat', value: 1000 }]);
    w.commandAttack(a.id);
    const hits = damageTo(run(w, 0.2), a.id);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.amount).toBe(1); // nunca falla: mínimo 1
  });
});

describe('integración: estados y efectos', () => {
  it('Marca ardiente quema durante segundos (daño periódico del estado)', () => {
    const { w } = arena();
    const e = w.spawnEnemy('melee', { x: 15, y: 10 });
    still(e);
    e.health = 1e6;
    w.commandCast('searing_mark', aim(15, 10, e.id));
    const ev = run(w, 7);
    const ticks = damageTo(ev, e.id).filter((d) => d.ability === 'status:burn');
    expect(ticks.length).toBe(6);
    expect(w.enemyActor(e).statuses.has('burn')).toBe(false);
  });

  it('inmovilizado y aturdido paran al enemigo; la ralentización lo frena', () => {
    const { w } = arena('storm_weaver');
    w.player.invulnerable = 1e9;
    const e = w.spawnEnemy('melee', { x: 12, y: 10 });
    const a = w.enemyActor(e);
    const c = w.data.rpg.statuses;
    a.statuses.apply(c['chilled']!);
    w.tick(DT);
    expect(e.speed).toBeCloseTo(e.def.speed * 0.6);
    a.statuses.apply(c['rooted']!);
    w.tick(DT);
    expect(e.speed).toBe(0);
    a.statuses.apply(c['stunned']!, { duration: 0.5 });
    w.tick(DT);
    expect(e.frozen).toBe(true);
    const st = e.state;
    const t = e.stateTime;
    run(w, 0.3);
    expect(e.state).toBe(st);
    expect(e.stateTime).toBe(t);
    run(w, 3);
    expect(e.frozen).toBe(false);
    expect(e.speed).toBe(e.def.speed);
  });

  it('Baluarte absorbe golpes enemigos antes de la vida', () => {
    const { w } = arena();
    w.commandCast('bulwark', aim(10, 10));
    const shield = w.character.statuses.shieldTotal();
    expect(shield).toBe(40);
    w.spawnEnemy('melee', { x: 11.5, y: 10 });
    const ev = run(w, 2.5);
    expect(ev.some((x) => x.type === 'damage' && x.toPlayer)).toBe(true);
    expect(w.character.statuses.shieldTotal()).toBeLessThan(shield);
    expect(w.player.health).toBe(w.player.maxHealth);
  });

  it('Grito de hierro sube power y armadura un tiempo', () => {
    const { w } = arena();
    const armor = w.character.stats.get('armor');
    w.commandCast('iron_shout', aim(10, 10));
    expect(w.character.stats.get('armor')).toBe(armor + 5);
    run(w, 9);
    expect(w.character.stats.get('armor')).toBe(armor);
  });

  it('Embestida golpea en línea, empuja y desplaza al jugador', () => {
    const { w } = arena();
    const e = w.spawnEnemy('melee', { x: 13, y: 10 });
    still(e);
    e.health = 1e6;
    w.commandCast('charge', aim(20, 10));
    const ev = w.drainEvents();
    expect(damageTo(ev, e.id)).toHaveLength(1);
    expect(e.pos.x).toBeGreaterThan(13 + 2);
    expect(w.player.pos.x).toBeCloseTo(16, 1);
  });

  it('Paso del relámpago teletransporta hacia el cursor sin atravesar muros', () => {
    const { w } = arena('storm_weaver');
    w.commandCast('lightning_step', aim(14, 10));
    expect(w.player.pos.x).toBeCloseTo(14, 1);
    w.player.cooldowns = {};
    w.player.gcd = 0;
    w.player.pos = { x: 17, y: 20 };
    w.commandCast('lightning_step', aim(25, 20)); // muro en x = 19..21
    expect(w.player.pos.x).toBeLessThan(19);
    expect(w.grid.walkable(w.player.pos)).toBe(true);
  });

  it('Campo estático deja una zona que daña cada segundo a quien está dentro', () => {
    const { w } = arena('storm_weaver');
    const e = w.spawnEnemy('melee', { x: 15, y: 10 });
    still(e);
    e.health = 1e6;
    expect(w.commandCast('static_field', aim(30, 30))).toBe('range');
    expect(w.commandCast('static_field', aim(15, 10))).toBeNull();
    expect(w.zones).toHaveLength(1);
    const ev = run(w, 6);
    expect(damageTo(ev, e.id).filter((d) => d.ability === 'static_field')).toHaveLength(5);
    expect(w.zones).toHaveLength(0);
  });

  it('Nova de escarcha inmoviliza a los que rodean al jugador', () => {
    const { w } = arena('storm_weaver');
    const e = w.spawnEnemy('melee', { x: 12, y: 10 });
    e.health = 1e6;
    w.commandCast('frost_nova', aim(10, 10));
    expect(w.enemyActor(e).statuses.has('rooted')).toBe(true);
  });

  it('una poción usada desde la sesión cura dentro del mundo y lo avisa', () => {
    const { w, s } = arena();
    w.player.health = 20;
    const pot = s.character.inventory.slots.find((x) => x?.itemId === 'minor_health_potion')!;
    expect(s.useItem(pot.uid).ok).toBe(true);
    expect(w.player.health).toBeGreaterThan(20);
    expect(w.drainEvents().some((x) => x.type === 'heal')).toBe(true);
  });
});

describe('integración: botín y progresión', () => {
  it('un enemigo muerto da XP una vez y suelta su botín al suelo (lootMode ground)', () => {
    const { w } = arena();
    w.content.spoils.lootMode = 'ground';
    const e = w.spawnEnemy('alpha_wolf', { x: 30, y: 30 });
    w.enemies.damage(e, 1e6, () => {});
    const ev = run(w, 0.1);
    const info = w.data.rpg.enemies['alpha_wolf']!;
    expect(w.character.xp > 0 || w.character.level > 1).toBe(true);
    expect(ev.filter((x) => x.type === 'xp')).toEqual([{ type: 'xp', amount: info.xp }]);
    expect(w.loot.length).toBeGreaterThan(0); // el lobo alfa siempre suelta monedas
    for (const l of w.loot) expect(dist(l.pos, e.pos)).toBeLessThanOrEqual(w.data.rpg.rules.lootScatter * Math.SQRT2 + 1e-6);
    run(w, 1);
    expect(ev.filter((x) => x.type === 'xp')).toHaveLength(1);
  });

  it('se recoge al pasar por encima (radio de recogida)', () => {
    const { w } = arena();
    const before = w.character.inventory.count('fang');
    w.dropLoot({ x: 10.5, y: 10 }, w.character.items.create('fang', 3));
    w.dropLoot({ x: 10.5, y: 10 }, null, 7);
    w.loot.forEach((l) => (l.pos = { x: 10.5, y: 10 }));
    const ev = run(w, 0.05);
    expect(w.loot).toHaveLength(0);
    expect(w.character.inventory.count('fang')).toBe(before + 3);
    expect(w.character.gold).toBe(7);
    expect(ev.filter((x) => x.type === 'lootPickup')).toHaveLength(2);
  });

  it('con clic va hasta el botín y lo recoge; lleno, se queda en el suelo', () => {
    const { w } = arena();
    const l = w.dropLoot({ x: 18, y: 10 }, w.character.items.create('short_sword'));
    l.pos = { x: 18, y: 10 };
    w.commandPickup(l.id);
    run(w, 3);
    expect(w.loot).toHaveLength(0);
    expect(w.character.inventory.count('short_sword')).toBe(1);

    while (w.character.inventory.freeSlots() > 0) w.character.give('oak_staff');
    const l2 = w.dropLoot({ x: 10, y: 14 }, w.character.items.create('short_sword'));
    l2.pos = { x: 10, y: 14 };
    w.commandPickup(l2.id);
    run(w, 3);
    expect(w.loot).toHaveLength(1);
  });

  it('el botín desaparece tras su tiempo de vida', () => {
    const { w } = arena();
    const l = w.dropLoot({ x: 40, y: 40 }, null, 3);
    l.pos = { x: 70, y: 70 };
    run(w, w.data.rpg.rules.lootLifetime + 1);
    expect(w.loot).toHaveLength(0);
  });

  it('tirar un objeto desde la sesión lo deja en el suelo junto al jugador', () => {
    const { w, s } = arena();
    const pot = s.character.inventory.slots.find((x) => x?.itemId === 'minor_health_potion')!;
    s.dropItem(pot.uid, 1);
    expect(w.loot).toHaveLength(1);
    expect(w.loot[0]!.item!.itemId).toBe('minor_health_potion');
  });

  it('matar enemigos con hechizos sube de nivel y lo avisa', () => {
    const { w } = arena();
    const need = w.character.xpToNext;
    let killed = 0;
    while (killed * 45 < need) {
      const e = w.spawnEnemy('alpha_wolf', { x: 11.6, y: 10 });
      still(e);
      e.health = 1;
      w.player.cooldowns = {};
      w.player.gcd = 0;
      w.commandCast('fiery_slash', aim(11.6, 10, e.id));
      killed++;
    }
    const ev = run(w, 0.1);
    expect(w.character.level).toBe(2);
    expect(ev).toContainEqual({ type: 'levelUp', level: 2 });
  });
});

describe('integración: mascotas', () => {
  function summon(w: World, s: GameSession, itemId: string): void {
    if (!s.character.inventory.slots.some((x) => x?.itemId === itemId)) s.character.give(itemId);
    s.useItem(s.character.inventory.slots.find((x) => x?.itemId === itemId)!.uid);
    w.tick(DT);
  }

  it('la mascota activa aparece, sigue al jugador y se va al retirarla', () => {
    const { w, s } = arena();
    summon(w, s, 'charm_ash_fox');
    expect(w.pets).toHaveLength(1);
    expect(s.pet()!.petId).toBe('ash_fox');
    w.commandMove({ x: 30, y: 6 });
    run(w, 5);
    expect(dist(w.pets[0]!.pos, w.player.pos)).toBeLessThan(3);
    summon(w, s, 'charm_ash_fox');
    expect(w.pets).toHaveLength(0);
  });

  it('el zorro (luchador) ataca al enemigo cercano', () => {
    const { w, s } = arena();
    w.player.invulnerable = 1e9;
    summon(w, s, 'charm_ash_fox');
    const e = w.spawnEnemy('melee', { x: 14, y: 10 });
    e.health = 1e6;
    const ev = run(w, 4);
    const fox = w.pets[0]!;
    expect(damageTo(ev, e.id).filter((d) => d.sourceId === fox.id).length).toBeGreaterThan(1);
  });

  it('el búho (recolector) trae el botín cercano', () => {
    const { w, s } = arena('storm_weaver');
    summon(w, s, 'charm_archivist_owl');
    const before = w.character.inventory.count('hide');
    const l = w.dropLoot({ x: 15, y: 13 }, w.character.items.create('hide', 2));
    l.pos = { x: 15, y: 13 };
    const ev = run(w, 4);
    expect(w.character.inventory.count('hide')).toBe(before + 2);
    expect(ev).toContainEqual({ type: 'lootPickup', lootId: l.id, byPet: true });
  });

  it('la tortuga (guardiana) aplica regeneración al dueño y le da armadura', () => {
    const { w, s } = arena();
    const armor = w.character.stats.get('armor');
    summon(w, s, 'charm_moss_turtle');
    expect(w.character.stats.get('armor')).toBe(armor + 4);
    w.player.health = 30;
    run(w, 4.2);
    expect(w.character.statuses.has('regeneration')).toBe(true);
    expect(w.player.health).toBeGreaterThan(30 + 4 * w.character.stats.get('healthRegen'));
  });

  it('Espíritu lobuno invoca un aliado temporal que lucha y desaparece', () => {
    const { w } = arena();
    w.player.invulnerable = 1e9;
    w.character.learnSpell('wolf_spirit');
    expect(w.commandCast('wolf_spirit', aim(10, 10))).toBeNull();
    run(w, 0.7); // castTime
    const wolf = w.pets.find((p) => p.def.id === 'spirit_wolf')!;
    expect(wolf).toBeDefined();
    const e = w.spawnEnemy('melee', { x: 14, y: 10 });
    e.health = 1e6;
    const ev = run(w, 3);
    expect(damageTo(ev, e.id).some((d) => d.sourceId === wolf.id)).toBe(true);
    run(w, 15);
    expect(w.pets.some((p) => p.def.id === 'spirit_wolf')).toBe(false);
  });
});
