import { describe, expect, it } from 'vitest';
import type { SessionEvent } from '../../src/rpg/contracts';
import { Character } from '../../src/rpg/character';
import { addXp, rollLoot, weightedPick, xpToNext } from '../../src/rpg/progression';
import { statCapitalForUnits, statPointCost } from '../../src/rpg/statCapital';
import { Rng } from '../../src/sim/rng';
import { content, hero } from './helpers';

describe('XP y niveles', () => {
  const p = () => content().progression;

  it('xpToNext = round(base · n^exponent) y 0 en el máximo', () => {
    expect(xpToNext(p(), 1)).toBe(Math.round(p().xp.base));
    expect(xpToNext(p(), 4)).toBe(Math.round(p().xp.base * Math.pow(4, p().xp.exponent)));
    expect(xpToNext(p(), p().maxLevel)).toBe(0);
  });

  it('una gran cantidad de XP sube varios niveles y se para en el máximo', () => {
    const r = addXp(p(), 1, 0, xpToNext(p(), 1) + xpToNext(p(), 2) + 5);
    expect(r).toEqual({ level: 3, xp: 5, levelsGained: 2 });
    expect(addXp(p(), 1, 0, 1e9)).toEqual({ level: p().maxLevel, xp: 0, levelsGained: p().maxLevel - 1 });
  });

  it('subir de nivel da estadísticas de clase, puntos libres, restaura y avisa', () => {
    const h = hero();
    const events: SessionEvent[] = [];
    h.on((e) => events.push(e));
    const str = h.stats.get('strength');
    h.health = 1;
    h.gainXp(xpToNext(p(), 1));
    expect(h.level).toBe(2);
    expect(h.unspentStatPoints).toBe(p().statPointsPerLevel);
    expect(h.stats.get('strength')).toBe(str + (h.classDef.statsPerLevel.strength ?? 0));
    expect(h.health).toBe(h.maxHealth);
    expect(events).toContainEqual({ type: 'levelUp', level: 2 });
  });

  it('repartir puntos sube la primaria y lo que deriva de ella', () => {
    const h = hero();
    h.gainXp(xpToNext(p(), 1));
    const hp = h.stats.get('maxHealth');
    expect(h.spendStatPoint('vitality').ok).toBe(true);
    expect(h.stats.get('maxHealth')).toBe(hp + 5);
    expect(h.stats.line('vitality').breakdown).toContainEqual({ source: 'points', op: 'flat', value: 1 });
    for (let i = 1; i < p().statPointsPerLevel; i++) expect(h.spendStatPoint('vitality').ok).toBe(true);
    expect(h.spendStatPoint('vitality')).toEqual({ ok: false, reason: 'Hacen falta 1 puntos' });
  });

  it('reiniciar características devuelve los puntos y deshace sus estadísticas', () => {
    const h = hero();
    h.gainXp(xpToNext(p(), 1));
    const hp = h.stats.get('maxHealth');
    h.spendStatPoint('vitality');
    h.spendStatPoint('strength');
    expect(h.stats.get('maxHealth')).toBe(hp + 5);
    expect(h.resetStatPoints()).toEqual({ ok: true });
    expect(h.unspentStatPoints).toBe(p().statPointsPerLevel);
    expect(h.stats.get('maxHealth')).toBe(hp);
    expect(h.resetStatPoints()).toEqual({ ok: false, reason: 'No hay puntos asignados para reiniciar' });
  });

  it('v2 cobra paliers y devuelve exactamente el capital invertido', () => {
    expect([99, 100, 199, 200].map(statPointCost)).toEqual([1, 2, 2, 3]);
    expect([100, 101, 200, 201].map(statCapitalForUnits)).toEqual([100, 102, 300, 303]);
    const h = hero();
    const save = h.toSave(new Date());
    save.allocated = { strength: 100 };
    save.unspentStatPoints = 2;
    const loaded = Character.fromSave(h.content, save, new Rng(2));
    expect(loaded.spendStatPoint('strength')).toEqual({ ok: true });
    expect(loaded.allocated.strength).toBe(101);
    expect(loaded.unspentStatPoints).toBe(0);
    expect(loaded.resetStatPoints()).toEqual({ ok: true });
    expect(loaded.unspentStatPoints).toBe(102);
  });

  it('cada nivel v2 añade vida y capacidad de Briznas', () => {
    const h = hero();
    const hp = h.maxHealth;
    const capacity = h.inventory.maxWeight;
    h.gainXp(h.xpToNext);
    expect(h.maxHealth - hp).toBe((h.classDef.statsPerLevel.maxHealth ?? 0) + p().healthPerLevel + (h.classDef.statsPerLevel.vitality ?? 0) * 5);
    expect(h.inventory.maxWeight - capacity).toBe(p().inventoryWeightPerLevel);
  });

  it('la Vanguardia empieza con tres hechizos y desbloquea los demás por nivel', () => {
    const h = hero();
    expect([...h.spellbook.known.keys()]).toEqual(['charge', 'ember_whirl', 'iron_shout']);
    h.gainXp(h.xpToNext);
    expect(h.level).toBe(2);
    expect(h.spellbook.rank('fiery_slash')).toBe(0);
    h.gainXp(h.xpToNext);
    expect(h.level).toBe(3);
    expect(h.spellbook.rank('fiery_slash')).toBe(1);
  });
});

describe('botín', () => {
  it('elección ponderada proporcional al peso', () => {
    const rng = new Rng(11);
    const n = { a: 0, b: 0 };
    for (let i = 0; i < 4000; i++) n[weightedPick(rng, ['a', 'b'] as const, (x) => (x === 'a' ? 3 : 1))!]++;
    expect(n.a / n.b).toBeGreaterThan(2.5);
    expect(n.a / n.b).toBeLessThan(3.5);
    expect(weightedPick(rng, ['x'], () => 0)).toBeNull();
  });

  it('las tablas sueltan monedas y objetos válidos, con cantidades dentro de rango', () => {
    const c = content();
    const rng = new Rng(4);
    const t = c.lootTables['alpha_wolf']!;
    let gold = 0;
    let items = 0;
    for (let i = 0; i < 300; i++) {
      const d = rollLoot(rng, c, t);
      gold += d.gold;
      if (d.gold > 0) expect(d.gold).toBeGreaterThanOrEqual(t.gold.min);
      expect(d.gold).toBeLessThanOrEqual(t.gold.max);
      expect(d.items.length).toBeLessThanOrEqual(t.rolls);
      for (const it of d.items) {
        expect(c.items[it.itemId]).toBeDefined();
        const e = t.entries.find((x) => x.itemId === it.itemId)!;
        expect(it.quantity).toBeGreaterThanOrEqual(e.min ?? 1);
        expect(it.quantity).toBeLessThanOrEqual(e.max ?? e.min ?? 1);
        items++;
      }
    }
    expect(gold).toBeGreaterThan(0);
    expect(items).toBeGreaterThan(300);
  });

  it('la rareza pesa: lo común sale más que lo épico', () => {
    const c = content();
    const rng = new Rng(8);
    const n: Record<string, number> = {};
    for (let i = 0; i < 2000; i++) for (const it of rollLoot(rng, c, c.lootTables['alpha_wolf']!).items) n[it.itemId] = (n[it.itemId] ?? 0) + 1;
    expect(n['fang']!).toBeGreaterThan(5 * (n['moonstone_amulet'] ?? 0));
  });
});
