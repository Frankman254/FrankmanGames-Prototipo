// F21: la montura de desarrollador va puesta desde el nivel 1 y no llega por el juego normal.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { DEV_MOUNT_ID, grantDevMount } from '../src/rpg/devMount';
import { Rng } from '../src/sim/rng';

const data = loadGameData();

describe('F21: montura de desarrollador', () => {
  it('existe, es de nivel 1, corre más que cualquier otra y lleva su modelo', () => {
    const it = data.rpg.items[DEV_MOUNT_ID]!;
    expect(it.slot).toBe('mount');
    expect(it.level).toBe(1);
    expect(it.mount?.model).toBe('montura_arpia');
    const speed = (id: string): number => data.rpg.items[id]!.implicit.filter((m) => m.stat === 'moveSpeed').reduce((a, m) => a + m.value, 0);
    for (const [id, d] of Object.entries(data.rpg.items)) if (d.slot === 'mount' && id !== DEV_MOUNT_ID) expect(speed(DEV_MOUNT_ID)).toBeGreaterThan(speed(id) * 3);
  });

  it('se da y se pone a un personaje nuevo de nivel 1, una sola vez', () => {
    const c = new Character(data.rpg, 'ember_vanguard', 'Prueba', new Rng(1));
    expect(c.level).toBe(1);
    expect(grantDevMount(c)).toBe(true);
    expect(c.equipment.slots.mount?.itemId).toBe(DEV_MOUNT_ID);
    expect(grantDevMount(c)).toBe(false);
    expect(c.inventory.count(DEV_MOUNT_ID)).toBe(0);
  });

  it('no quita otra montura puesta: la deja en la mochila', () => {
    const c = new Character(data.rpg, 'ember_vanguard', 'Prueba', new Rng(1));
    c.give('mount_mule');
    c.equip(c.inventory.slots.find((s) => s?.itemId === 'mount_mule')!.uid, 'mount');
    grantDevMount(c);
    expect(c.equipment.slots.mount?.itemId).toBe('mount_mule');
    expect(c.inventory.count(DEV_MOUNT_ID)).toBe(1);
  });

  it('ninguna tienda, tabla de botín ni misión la da, y solo main.ts la pone bajo DEV', () => {
    expect(data.rpg.items[DEV_MOUNT_ID]!.dropWeight).toBe(0);
    for (const f of ['merchants', 'loot', 'quests', 'spoils', 'npcs']) {
      expect(readFileSync(`data/rpg/${f}.json`, 'utf8'), f).not.toContain(DEV_MOUNT_ID);
    }
    const main = readFileSync('src/main.ts', 'utf8');
    expect(main).toMatch(/if \(import\.meta\.env\.DEV && grantDevMount\(/);
  });
});
