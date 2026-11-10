import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { compileSpell } from '../src/rpg/spells';
import { Rng } from '../src/sim/rng';

const data = loadGameData();

function hero(classId: string, spirit = 0): Character {
  const c = Character.create(data.rpg, classId, 'Recursos', new Rng(1));
  if (spirit > 0) c.stats.set('test:spirit', [{ stat: 'spirit', op: 'flat', value: spirit }]);
  return c;
}

function resourceUse(itemId: string): Extract<NonNullable<(typeof data.rpg.items)[string]['use']>, { kind: 'effects' }> {
  const use = data.rpg.items[itemId]?.use;
  if (use?.kind !== 'effects') throw new Error(`${itemId} no es un consumible de efectos`);
  return use;
}

describe('presupuesto de recursos', () => {
  it('Espíritu amplía la reserva sin multiplicar por cuatro la regeneración', () => {
    for (const id of ['ember_vanguard', 'storm_weaver', 'mangrove_hunter']) {
      const empty = hero(id);
      const invested = hero(id, 145);
      expect(invested.maxResource - empty.maxResource, id).toBe(290);
      expect(invested.stats.get('resourceRegen') / empty.stats.get('resourceRegen'), id).toBeCloseTo(1.3625);
      expect(invested.stats.get('resourceRegen'), id).toBeLessThan(4.1);
    }
  });

  it('los ataques sin enfriamiento consumen más de lo que regenera una inversión alta', () => {
    for (const [classId, spellId] of [['storm_weaver', 'spark'], ['mangrove_hunter', 'hunter_arrow']] as const) {
      const c = hero(classId, 145);
      const s = compileSpell(data.rpg, data.rpg.spells[spellId]!, 5);
      expect(s.cost / s.globalCooldown, spellId).toBeGreaterThan(c.stats.get('resourceRegen'));
    }
  });

  it('Aguacero no recupera todo su coste durante su enfriamiento ni a rango máximo', () => {
    const c = hero('mangrove_hunter', 145);
    const s = compileSpell(data.rpg, data.rpg.spells['arrow_downpour']!, 5);
    expect(s.cost).toBeGreaterThan(c.stats.get('resourceRegen') * s.cooldown);
    expect(s.def?.element).toBe('water');
    expect(s.def?.effects.find((e) => e.type === 'damage')?.element).toBe('water');
  });

  it('los recuperadores de recurso dejan una decisión entre usos', () => {
    const tonic = resourceUse('resource_tonic');
    const eel = resourceUse('fish_storm_eel');
    const cane = resourceUse('raspadura_block');
    expect([tonic.cooldown, eel.cooldown, cane.cooldown]).toEqual([20, 30, 25]);
    expect(tonic.effects.find((e) => e.type === 'restoreResource')?.amount).toBe(25);
  });
});
