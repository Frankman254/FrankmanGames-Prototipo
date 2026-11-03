import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { buildCompendium, dropChance, matchesSearch } from '../../src/rpg/compendium';

const data = loadGameData();
const comp = buildCompendium({ content: data.rpg, archetypes: data.enemies.archetypes, zones: data.zones.zones });

describe('compendio', () => {
  it('lista todas las criaturas, objetos y zonas de los datos', () => {
    expect(comp.creatures).toHaveLength(Object.keys(data.rpg.enemies).length);
    expect(comp.items).toHaveLength(Object.keys(data.rpg.items).length);
    expect(comp.zones).toHaveLength(data.zones.zones.length);
  });

  it('las criaturas llevan su vida base, sus zonas y su botín reales', () => {
    const melee = comp.creatures.find((c) => c.id === 'melee')!;
    expect(melee.maxHealth).toBe(data.enemies.archetypes['melee']!.maxHealth);
    expect(melee.zones).toContain('Llanos de Azuero');
    const table = data.rpg.lootTables[data.rpg.enemies['melee']!.lootTable!]!;
    expect(melee.drops.length).toBeGreaterThan(0);
    for (const d of melee.drops) {
      expect(table.entries.some((e) => e.itemId === d.itemId)).toBe(true);
      expect(d.chance).toBeGreaterThan(0);
      expect(d.chance).toBeLessThanOrEqual(1);
    }
  });

  it('los enlaces entre fichas cierran: quien suelta un objeto lo tiene en su botín', () => {
    const item = comp.items.find((i) => i.droppedBy.length > 0)!;
    const by = comp.creatures.find((c) => c.name === item.droppedBy[0])!;
    expect(by.drops.some((d) => d.itemId === item.id)).toBe(true);
    for (const z of comp.zones) for (const name of z.creatures) expect(comp.creatures.some((c) => c.name === name), `${z.name}: ${name}`).toBe(true);
  });

  it('calcula la probabilidad de una tabla', () => {
    const table = { id: 't', gold: { min: 0, max: 0, chance: 0 }, rolls: 2, chance: 0.5, entries: [{ itemId: 'a', weight: 1 }, { itemId: 'b', weight: 1 }] };
    expect(dropChance(table, 'a')).toBeCloseTo(1 - 0.75 * 0.75);
    expect(dropChance(table, 'zzz')).toBe(0);
  });

  it('busca sin distinguir mayúsculas ni acentos', () => {
    expect(matchesSearch('Sato Cimarrón', 'cimarron')).toBe(true);
    expect(matchesSearch('Sato Cimarrón', '  SATO ')).toBe(true);
    expect(matchesSearch('Sato Cimarrón', 'lobo')).toBe(false);
  });
});
