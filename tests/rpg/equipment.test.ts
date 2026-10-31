// `equipo-objetos`: mano izquierda con arma (dos armas), armas de dos manos,
// tipos de objeto, migración de guardados y contenido nuevo (objetos, sets,
// botín y mercaderes).
import { describe, expect, it } from 'vitest';
import { loadGameData, rpgRawFiles } from '../../src/data';
import { Character } from '../../src/rpg/character';
import { parseRpgContent } from '../../src/rpg/content';
import { EQUIP_SLOTS, ITEM_KINDS, TWO_HANDED_KINDS, type ItemDef, type SaveData } from '../../src/rpg/contracts';
import { displacedBy, fitsEquipSlot, handsOf, inferKind, isDualWielding, ITEM_KIND_GROUP, kindFitsSlot, migrateInstance, slotForKind, slotsFor } from '../../src/rpg/items';
import { GameSession, RpgSessionFactory } from '../../src/rpg/session';
import { Rng } from '../../src/sim/rng';
import { World } from '../../src/sim/world';
import { content, hero } from './helpers';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const archetypes = () => Object.keys(loadGameData().enemies.archetypes);

/** Héroe de nivel alto (el equipo nuevo llega a 100) con estos objetos en la mochila. */
function geared(...ids: string[]): Character {
  const c = hero();
  c.level = 100;
  for (const id of ids) c.give(id);
  return c;
}
const uidOf = (c: Character, itemId: string): string => c.inventory.slots.find((x) => x?.itemId === itemId)!.uid;

describe('manos: dos armas y armas de dos manos', () => {
  it('un arma de una mano vale para las dos manos; una de dos manos, sólo para la derecha', () => {
    const c = content();
    expect(slotsFor(c.items['short_sword']!)).toEqual(['weapon', 'offhand']);
    expect(slotsFor(c.items['peeling_knife']!)).toEqual(['weapon', 'offhand']);
    for (const id of ['machetero_blade', 'darien_bow', 'tulivieja_staff', 'titan_maul', 'quetzal_spear', 'cane_crossbow', 'oak_staff']) {
      expect(handsOf(c.items[id]!), id).toBe(2);
      expect(slotsFor(c.items[id]!), id).toEqual(['weapon']);
      expect(fitsEquipSlot(c.items[id]!, 'offhand'), id).toBe(false);
    }
    expect(slotsFor(c.items['locks_shield']!)).toEqual(['offhand']);
    expect(slotsFor(c.items['gourd_buckler']!)).toEqual(['offhand']);
    expect(fitsEquipSlot(c.items['diablo_knife']!, 'offhand')).toBe(true);
    expect(fitsEquipSlot(c.items['straw_cape']!, 'back')).toBe(true);
    expect(fitsEquipSlot(c.items['cabuya_belt']!, 'waist')).toBe(true);
  });

  it('equipa un arma en la mano izquierda (dos armas) y el clic normal sustituye la de la derecha', () => {
    const c = geared('peeling_knife', 'rozador_machete');
    const sword = c.equipment.get('weapon')!;
    expect(c.equip(uidOf(c, 'peeling_knife'), 'offhand').ok).toBe(true);
    expect(c.equipment.get('weapon')).toBe(sword);
    expect(c.offhandWeapon()?.id).toBe('peeling_knife');
    expect(c.dualWielding()).toBe(true);
    // Sin hueco: va a la derecha, no se apila en la izquierda.
    expect(c.equip(uidOf(c, 'rozador_machete')).ok).toBe(true);
    expect(c.weapon()?.id).toBe('rozador_machete');
    expect(c.offhandWeapon()?.id).toBe('peeling_knife');
  });

  it('un arma de dos manos guarda lo de la mano izquierda, y al revés', () => {
    const c = geared('gourd_buckler', 'machetero_blade');
    const sword = c.weapon()!.id;
    c.equip(uidOf(c, 'gourd_buckler'));
    expect(c.equipment.get('offhand')?.itemId).toBe('gourd_buckler');
    // La comparación ya cuenta con perder la rodela.
    const delta = c.compareEquip(uidOf(c, 'machetero_blade'));
    expect(delta.find((d) => d.stat === 'resist.physical')!.after).toBeLessThan(delta.find((d) => d.stat === 'resist.physical')!.before);
    expect(c.equip(uidOf(c, 'machetero_blade')).ok).toBe(true);
    expect(c.weapon()?.id).toBe('machetero_blade');
    expect(c.equipment.get('offhand')).toBeNull();
    expect(c.inventory.count('gourd_buckler')).toBe(1);
    expect(c.inventory.count(sword)).toBe(1);
    // Poner la rodela otra vez guarda el arma de dos manos.
    expect(c.equip(uidOf(c, 'gourd_buckler')).ok).toBe(true);
    expect(c.weapon()).toBeNull();
    expect(c.inventory.count('machetero_blade')).toBe(1);
  });

  it('sin sitio en la mochila no se puede desplazar lo de la otra mano', () => {
    const c = geared('gourd_buckler', 'machetero_blade');
    c.equip(uidOf(c, 'gourd_buckler'));
    c.unequip('weapon');
    c.give('fang', 50 * 40); // llena la mochila
    expect(c.inventory.freeSlots()).toBe(0);
    // Equipar la de dos manos libera su hueco, que se lleva la rodela: cabe.
    expect(c.equip(uidOf(c, 'machetero_blade')).ok).toBe(true);
    expect(c.equipment.get('offhand')).toBeNull();
    // Con la derecha ocupada y la mochila llena, la rodela no puede echar al mandoble.
    const c2 = geared('machetero_blade', 'gourd_buckler');
    c2.equip(uidOf(c2, 'machetero_blade'));
    c2.give('fang', 50 * 40);
    const r = c2.equip(uidOf(c2, 'gourd_buckler'));
    expect(r.ok).toBe(true); // la rodela deja su hueco libre al mandoble
    expect(c2.inventory.count('machetero_blade')).toBe(1);
    expect(displacedBy(c2.content, {}, c2.content.items['machetero_blade']!, 'weapon')).toEqual([]);
  });

  it('el básico alterna de mano con dos armas; la izquierda pega menos y ambas más rápido (datos)', () => {
    const data = loadGameData();
    const rng = new Rng(3);
    const s = new GameSession(data.rpg, Character.create(data.rpg, 'ember_vanguard', 'Prueba', rng), rng);
    const c = s.character;
    c.level = 100;
    c.give('diablo_knife');
    const w = new World(data, { encounter: false, character: c, seed: 3 });
    s.attach(w);
    const single = w.basicAttack();
    expect(single.name).toContain('Espada corta');
    expect(single.cooldown).toBeCloseTo(1 / 1.4);
    expect(s.equip(uidOf(c, 'diablo_knife'), 'offhand').ok).toBe(true);
    expect(isDualWielding(c.content, c.equipment.slots)).toBe(true);
    const dw = data.rpg.rules.dualWield;
    const right = w.basicAttack();
    expect(right.name).toContain('Espada corta');
    expect(right.cooldown).toBeCloseTo(1 / (1.4 * dw.attackSpeed));
    // Golpe real: el siguiente sale con la izquierda.
    w.player.pos = { x: 10, y: 10 };
    const e = w.spawnEnemy('melee', { x: 11.4, y: 10 });
    e.state = 'stagger';
    e.stateTime = -1e9;
    e.health = 1e6;
    const hands: string[] = [];
    for (let i = 0; i < 4; i++) {
      hands.push(c.basicSwing().hand);
      w.player.basicCharges = 5;
      w.player.cooldowns = {};
      w.commandAttack(e.id);
      for (let t = 0; t < 3; t++) w.tick(1 / 60);
    }
    expect(hands).toEqual(['weapon', 'offhand', 'weapon', 'offhand']);
    const left = c.basicSwing();
    expect(left.hand).toBe('weapon');
    c.nextHand = 'offhand';
    const off = w.basicAttack();
    const knife = data.rpg.items['diablo_knife']!.weapon!;
    const eff = off.effects[0] as unknown as { def: { min: number; max: number } };
    expect(off.name).toContain('Cuchillo del Diablo');
    expect(eff.def.min).toBeCloseTo(knife.min * dw.offhandDamage);
    expect(eff.def.max).toBeCloseTo(knife.max * dw.offhandDamage);
    // Sin la segunda arma vuelve a la derecha y a la cadencia normal.
    s.unequip('offhand');
    expect(c.basicSwing()).toMatchObject({ hand: 'weapon', damage: 1, speed: 1 });
  });

  it('con un arma sólo en la izquierda pega con ella a daño completo', () => {
    const c = geared('peeling_knife');
    c.unequip('weapon');
    c.equip(uidOf(c, 'peeling_knife'), 'offhand');
    expect(c.basicSwing()).toMatchObject({ hand: 'offhand', damage: 1, speed: 1 });
    expect(c.basicSwing().def?.id).toBe('peeling_knife');
  });
});

describe('tipos de objeto', () => {
  it('todos los objetos tienen tipo, y encaja con su hueco y su categoría', () => {
    const c = content();
    for (const it of Object.values(c.items)) {
      expect(it.kind, it.id).toBeDefined();
      expect(ITEM_KINDS, it.id).toContain(it.kind);
      expect(kindFitsSlot(it.kind!, it.category, it.slot), it.id).toBe(true);
      if (it.weapon) expect(handsOf(it), it.id).toBe(TWO_HANDED_KINDS.includes(it.kind!) ? 2 : 1);
    }
    for (const k of ITEM_KINDS) expect(ITEM_KIND_GROUP[k], k).toBeDefined();
  });

  it('deduce el tipo de datos sin `kind` y rechaza tipos que no encajan', () => {
    const raw = clone(rpgRawFiles()) as { items: { items: Record<string, Record<string, unknown>> } };
    delete raw.items.items['short_sword']!['kind'];
    delete raw.items.items['oak_buckler']!['kind'];
    delete raw.items.items['copper_ring']!['kind'];
    const c = parseRpgContent(raw as never, archetypes());
    expect(c.items['short_sword']!.kind).toBe('sword');
    expect(c.items['oak_buckler']!.kind).toBe('shield');
    expect(c.items['copper_ring']!.kind).toBe('ring');
    expect(inferKind({ id: 'x', icon: '?', category: 'weapon', slot: 'weapon', weapon: { range: 8 } })).toBe('wand');
    expect(inferKind({ id: 'fish_x', icon: '?', category: 'consumable', slot: null })).toBe('fish');
    expect(slotForKind('cape')).toBe('back');
    const bad = clone(rpgRawFiles()) as typeof raw;
    bad.items.items['short_sword']!['kind'] = 'shield';
    expect(() => parseRpgContent(bad as never, archetypes())).toThrow(/kind/);
    const bad2 = clone(rpgRawFiles()) as typeof raw;
    bad2.items.items['padded_vest']!['hands'] = 2;
    expect(() => parseRpgContent(bad2 as never, archetypes())).toThrow(/hands/);
    const bad3 = clone(rpgRawFiles()) as typeof raw;
    bad3.items.items['short_sword']!['kind'] = 'lightsaber';
    expect(() => parseRpgContent(bad3 as never, archetypes())).toThrow(/kind/);
  });

  it('`hands` en los datos manda sobre el tipo', () => {
    const raw = clone(rpgRawFiles()) as { items: { items: Record<string, Record<string, unknown>> } };
    raw.items.items['quetzal_spear']!['hands'] = 1;
    const c = parseRpgContent(raw as never, archetypes());
    expect(slotsFor(c.items['quetzal_spear']!)).toEqual(['weapon', 'offhand']);
  });

  it('ordena la mochila por tipo, rareza, nivel o nombre', () => {
    const c = geared('volcano_sword', 'corn_bollo', 'gourd_buckler', 'last_bus_blade', 'crab_eye_gem');
    const names = () => c.inventory.slots.filter((x) => x).map((x) => c.content.items[x!.itemId]!);
    c.inventory.sort('rarity');
    expect(names()[0]!.rarity).toBe('legendary');
    c.inventory.sort('level');
    const lv = names().map((d) => d.level);
    expect(lv).toEqual([...lv].sort((a, b) => b - a));
    c.inventory.sort('name');
    const nm = names().map((d) => d.name);
    expect(nm).toEqual([...nm].sort((a, b) => a.localeCompare(b)));
    c.inventory.sort('kind');
    const k = names().map((d) => ITEM_KINDS.indexOf(d.kind!));
    expect(k).toEqual([...k].sort((a, b) => a - b));
  });
});

describe('migración de guardados', () => {
  function oldSave(): SaveData {
    const c = hero();
    return c.toSave(new Date(0));
  }

  it('un guardado de antes (sin capa ni cinturón, tiradas viejas) carga igual', () => {
    const save = oldSave();
    // Como lo escribía la versión anterior: sólo los 9 huecos de siempre.
    expect(Object.keys(save.equipment).every((s) => (EQUIP_SLOTS as readonly string[]).indexOf(s) < 9)).toBe(true);
    const s = new RpgSessionFactory(content()).load(clone(save), 1);
    expect(s.character.weapon()?.id).toBe('short_sword');
    expect(s.spoils()).toBeNull();
  });

  it('un bastón (ahora de dos manos) con rodela: la rodela vuelve a la mochila', () => {
    const save = oldSave();
    save.level = 20;
    const stick = { uid: 'it90', itemId: 'oak_staff', quantity: 1, rolled: [{ stat: 'spirit' as const, op: 'flat' as const, value: 2 }] };
    const buckler = { uid: 'it91', itemId: 'oak_buckler', quantity: 1, rolled: [{ stat: 'resist.physical' as const, op: 'flat' as const, value: 4 }] };
    save.equipment = { ...save.equipment, weapon: stick, offhand: buckler };
    const c = Character.fromSave(content(), save, new Rng(1));
    expect(c.weapon()?.id).toBe('oak_staff');
    expect(c.equipment.get('offhand')).toBeNull();
    expect(c.inventory.find('it91')?.itemId).toBe('oak_buckler');
    expect(c.displaced).toHaveLength(0);
  });

  it('lo que no cabe en la mochila espera en el botín pendiente (no se pierde)', () => {
    const save = oldSave();
    const full = Array.from({ length: content().progression.inventorySize }, (_, i) => ({ uid: `it${(200 + i).toString(36)}`, itemId: 'fang', quantity: 50, rolled: [] }));
    save.inventory = full;
    save.equipment = {
      weapon: { uid: 'it90', itemId: 'oak_staff', quantity: 1, rolled: [{ stat: 'spirit', op: 'flat', value: 1 }] },
      offhand: { uid: 'it91', itemId: 'oak_buckler', quantity: 1, rolled: [{ stat: 'resist.physical', op: 'flat', value: 3 }] },
      // Un objeto en un hueco que no es el suyo (datos que cambiaron).
      head: { uid: 'it92', itemId: 'copper_ring', quantity: 1, rolled: [] },
    };
    const s = new RpgSessionFactory(content()).load(clone(save), 1);
    const sp = s.spoils();
    expect(sp?.items.map((i) => i.uid).sort()).toEqual(['it91', 'it92']);
    expect(s.character.equipment.get('head')).toBeNull();
  });

  it('las tiradas se ajustan a la definición actual', () => {
    const def: ItemDef = clone(content().items['woodcutter_axe']!);
    // Guardado con las tiradas en otro orden, una fuera de rango y una que ya no existe.
    const inst = {
      uid: 'it1',
      itemId: def.id,
      quantity: 3,
      rolled: [
        { stat: 'damage.physical' as const, op: 'flat' as const, value: 99 },
        { stat: 'agility' as const, op: 'flat' as const, value: 5 },
      ],
    };
    expect(migrateInstance(def, inst)).toBe(true);
    expect(inst.rolled.map((m) => m.stat)).toEqual(['strength', 'damage.physical']);
    expect(inst.rolled[0]!.value).toBe(Math.round((def.rolls[0]!.min + def.rolls[0]!.max) / 2));
    expect(inst.rolled[1]!.value).toBe(def.rolls[1]!.max);
    expect(inst.quantity).toBe(1);
    // Ya migrada, no cambia nada.
    expect(migrateInstance(def, inst)).toBe(false);
  });

  it('guardar y cargar conserva capa, cinturón y la mano izquierda con arma', () => {
    const c = geared('straw_cape', 'cabuya_belt', 'peeling_knife');
    c.equip(uidOf(c, 'straw_cape'));
    c.equip(uidOf(c, 'cabuya_belt'));
    c.equip(uidOf(c, 'peeling_knife'), 'offhand');
    const save = clone(c.toSave(new Date(0)));
    save.level = 20;
    const back = Character.fromSave(content(), save, new Rng(2));
    // Nivel 20 (tope) basta para la capa (7), el cinturón (3) y el cuchillo (2).
    expect(back.equipment.get('back')?.itemId).toBe('straw_cape');
    expect(back.equipment.get('waist')?.itemId).toBe('cabuya_belt');
    expect(back.offhandWeapon()?.id).toBe('peeling_knife');
  });
});

describe('contenido nuevo', () => {
  const ORIGINAL = 49;

  it('al menos 40 objetos nuevos repartidos en las 10 franjas, todos los huecos y varios elementos', () => {
    const c = content();
    const items = Object.values(c.items);
    expect(items.length - ORIGINAL).toBeGreaterThanOrEqual(40);
    const gear = items.filter((i) => i.slot !== null);
    const bands = new Set(gear.map((i) => Math.min(9, Math.floor(i.level / 10))));
    expect([...bands].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const slot of EQUIP_SLOTS) expect(gear.some((i) => slotsFor(i).includes(slot)), slot).toBe(true);
    const elements = new Set(gear.filter((i) => i.weapon).map((i) => i.weapon!.element));
    expect(elements.size).toBe(5);
    // Cada tipo de equipo tiene al menos un objeto.
    for (const k of ITEM_KINDS) {
      const g = ITEM_KIND_GROUP[k];
      if (g === 'weapon1h' || g === 'weapon2h' || g === 'offhand' || g === 'armor' || g === 'jewel') expect(items.some((i) => i.kind === k), k).toBe(true);
    }
  });

  it('seis sets nuevos con bonos crecientes y piezas suficientes', () => {
    const c = content();
    const fresh = ['machetero', 'diablo_danzante', 'pollera', 'darien_hunter', 'lock_guardian', 'tulivieja'];
    for (const id of fresh) {
      const set = c.sets[id]!;
      expect(set, id).toBeDefined();
      const pieces = Object.values(c.items).filter((i) => i.setId === id);
      expect(pieces.length, id).toBeGreaterThanOrEqual(4);
      expect(set.bonuses.length, id).toBeGreaterThanOrEqual(2);
      const steps = set.bonuses.map((b) => b.pieces);
      expect(steps, id).toEqual([...steps].sort((a, b) => a - b));
      // Todas las piezas de un set, de la misma franja de 10 niveles.
      expect(new Set(pieces.map((p) => Math.floor(p.level / 10))).size, id).toBe(1);
    }
  });

  it('todo objeto sale de algún sitio (botín, mercader, kit o misión) y el equipo, en la tabla de su franja', () => {
    const c = content();
    const sources = new Set<string>();
    for (const t of Object.values(c.lootTables)) for (const e of t.entries) sources.add(e.itemId);
    for (const m of Object.values(c.merchants)) for (const e of m.stock) sources.add(e.itemId);
    for (const cl of Object.values(c.classes)) for (const e of cl.startingItems) sources.add(e.itemId);
    for (const q of Object.values(c.quests)) for (const e of q.rewards.items) sources.add(e.itemId);
    for (const it of Object.values(c.items)) expect(sources.has(it.id), it.id).toBe(true);
    // Los monstruos de cada franja alta sueltan el equipo de su franja.
    const zones = loadGameData().zones;
    for (const z of zones.zones) {
      if (!z.levelMin || z.levelMin < 10) continue;
      const band = Math.floor(z.levelMin / 10);
      for (const sp of z.spawns) {
        const table = c.lootTables[c.enemies[sp.archetype]!.lootTable!]!;
        const levels = table.entries.map((e) => c.items[e.itemId]!).filter((d) => d.slot).map((d) => Math.floor(d.level / 10));
        if (levels.length) expect(levels.every((l) => l === band), `${z.id}:${sp.archetype}`).toBe(true);
      }
    }
  });

  it('las reglas de dos armas salen de los datos y se validan', () => {
    const c = content();
    expect(c.rules.dualWield.offhandDamage).toBeGreaterThan(0);
    expect(c.rules.dualWield.attackSpeed).toBeGreaterThanOrEqual(1);
    const raw = clone(rpgRawFiles()) as { progression: { rules: Record<string, unknown> } };
    raw.progression.rules['dualWield'] = { offhandDamage: -1, attackSpeed: 1 };
    expect(() => parseRpgContent(raw as never, archetypes())).toThrow(/offhandDamage/);
  });
});
