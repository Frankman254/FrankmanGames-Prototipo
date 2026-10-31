import { describe, expect, it } from 'vitest';
import { loadGameData, rpgRawFiles } from '../../src/data';
import { parseRpgContent } from '../../src/rpg/content';
import { DataError } from '../../src/data/validate';
import { content } from './helpers';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const archetypes = () => Object.keys(loadGameData().enemies.archetypes);

describe('contenido RPG', () => {
  it('cumple el mínimo del alcance', () => {
    const c = content();
    const classes = Object.values(c.classes);
    expect(classes).toHaveLength(2);
    for (const cl of classes) expect(Object.values(c.spells).filter((s) => s.classId === cl.id).length).toBeGreaterThanOrEqual(6);
    expect(Object.values(c.spells).filter((s) => s.classId === null).length).toBeGreaterThanOrEqual(4);
    expect(Object.values(c.items).filter((i) => i.category === 'scroll').length).toBeGreaterThanOrEqual(4);
    expect(Object.keys(c.statuses).length).toBeGreaterThanOrEqual(8);
    expect(Object.keys(c.items).length).toBeGreaterThanOrEqual(30);
    expect(Object.keys(c.sets).length).toBeGreaterThanOrEqual(8); // 2 del Slice 03 + 6 de `equipo-objetos`
    expect(Object.values(c.pets).filter((p) => Object.values(c.items).some((i) => i.use?.kind === 'summonPet' && i.use.petId === p.id))).toHaveLength(3);
    expect(Object.keys(c.enemies).length).toBeGreaterThanOrEqual(6);
    for (const e of Object.values(c.enemies)) expect(e.lootTable).not.toBeNull();
  });

  it('combate v2: cada clase trae desplazamientos propios y hay defensas (clase o pergamino universal)', () => {
    const c = content();
    const MOVES = ['blink', 'swap', 'pull', 'recoil', 'knockback', 'dash', 'teleport'];
    const statusOf = (id: string) => c.spells[id]!.effects.flatMap((e) => (e.type === 'status' ? [c.statuses[e.statusId]!] : []));
    for (const cl of Object.values(c.classes)) {
      const kit = Object.values(c.spells).filter((spell) => spell.classId === cl.id);
      const moves = new Set(kit.flatMap((s) => s.effects.map((e) => e.type)).filter((t) => MOVES.includes(t)));
      expect(moves.size, cl.id).toBeGreaterThanOrEqual(2);
      const def = kit.flatMap((spell) => statusOf(spell.id)).filter((st) => st.immune || st.reflect || st.counter || st.rewind);
      expect(def.length, cl.id).toBeGreaterThanOrEqual(1);
      expect(cl.startingSpells).toHaveLength(cl.id === 'ember_vanguard' ? 3 : cl.startingSpells.length);
      expect(cl.startingSpells.every((id) => (c.spells[id]!.unlockLevel ?? 1) === 1)).toBe(true);
    }
    const scrolls = Object.values(c.items).filter((i) => i.use?.kind === 'learnSpell').map((i) => (i.use as { spellId: string }).spellId);
    const universal = scrolls.flatMap(statusOf);
    expect(universal.some((st) => st.rewind)).toBe(true);
    expect(universal.some((st) => st.immune)).toBe(true);
  });

  it('combate v2: ninguna estadística de datos es armadura', () => {
    const c = content();
    const all = [
      ...Object.values(c.items).flatMap((i) => [...i.implicit, ...i.rolls]),
      ...Object.values(c.statuses).flatMap((s) => s.modifiers),
      ...Object.values(c.pets).flatMap((p) => p.ownerBonus),
    ].map((m) => m.stat as string);
    expect(all).not.toContain('armor');
    for (const cl of Object.values(c.classes)) expect(Object.keys(cl.baseStats)).not.toContain('armor');
  });

  it('las variantes de enemigos heredan del arquetipo base', () => {
    const e = loadGameData().enemies.archetypes;
    expect(e['alpha_wolf']!.attack.range).toBe(e['melee']!.attack.range);
    expect(e['alpha_wolf']!.look.mesh).toBe('box');
    expect(e['alpha_wolf']!.maxHealth).toBeGreaterThan(e['melee']!.maxHealth);
  });

  it('rechaza referencias rotas con la ruta del campo', () => {
    const raw = clone(rpgRawFiles()) as Record<string, any>;
    raw['spells'].spells.spark.effects.push({ type: 'status', statusId: 'nope' });
    expect(() => parseRpgContent(raw as never, archetypes())).toThrow(/spells\.spark\.effects\[1\]\.statusId/);

    const raw2 = clone(rpgRawFiles()) as Record<string, any>;
    raw2['loot'].tables.bone_imp.entries.push({ itemId: 'nada', weight: 1 });
    expect(() => parseRpgContent(raw2 as never, archetypes())).toThrow(DataError);

    expect(() => parseRpgContent(rpgRawFiles(), [...archetypes(), 'fantasma'])).toThrow(/fantasma/);
  });

  it('rechaza números y valores fuera de rango', () => {
    const raw = clone(rpgRawFiles()) as Record<string, any>;
    raw['items'].items.fang.maxStack = 0;
    expect(() => parseRpgContent(raw as never, archetypes())).toThrow(/items\.fang\.maxStack/);
    const raw2 = clone(rpgRawFiles()) as Record<string, any>;
    raw2['items'].items.short_sword.rolls[0].stat = 'suerte';
    expect(() => parseRpgContent(raw2 as never, archetypes())).toThrow(/stat/);
    const raw3 = clone(rpgRawFiles()) as Record<string, any>;
    raw3['items'].items.woodcutter_axe.maxStack = 5;
    expect(() => parseRpgContent(raw3 as never, archetypes())).toThrow(/tiradas no se apila/);
  });
});
