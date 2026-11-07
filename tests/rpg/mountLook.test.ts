// Diostedé: «Cambiar apariencia» elige una de las variantes de color sin tocar el objeto ni el modelo.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { Character } from '../../src/rpg/character';
import { DEV_DIOSTEDE_ID } from '../../src/rpg/devMount';
import { GameSession } from '../../src/rpg/session';
import { Rng } from '../../src/sim/rng';

const data = loadGameData();
const palette = JSON.parse(readFileSync('data/art/diostede_variantes.json', 'utf8')) as { regiones: string[]; variantes: Record<string, Record<string, unknown>> };

function setup(): { s: GameSession; c: Character; uid: string } {
  const rng = new Rng(3);
  const c = Character.create(data.rpg, 'storm_weaver', 'Prueba', rng);
  const s = new GameSession(data.rpg, c, rng);
  c.give(DEV_DIOSTEDE_ID, 1);
  const uid = c.inventory.slots.find((i) => i?.itemId === DEV_DIOSTEDE_ID)!.uid;
  return { s, c, uid };
}

describe('Diostedé: apariencias', () => {
  it('ofrece las diez variantes de la paleta, todas con sus siete regiones de color', () => {
    const m = data.rpg.items[DEV_DIOSTEDE_ID]!.mount!;
    expect(m.model).toBe('diostede');
    expect(m.variants).toEqual(Object.keys(palette.variantes));
    expect(m.variants).toHaveLength(10);
    expect(m.variants).toContain(m.variant);
    for (const id of m.variants!) for (const r of palette.regiones) expect(String(palette.variantes[id]![r]), `${id}.${r}`).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('cambia la apariencia en la mochila y puesta, y rechaza las que no tiene', () => {
    const { s, c, uid } = setup();
    expect(s.setItemLook(uid, 'negro_ebano').ok).toBe(true);
    expect(c.inventory.find(uid)!.look).toBe('negro_ebano');
    expect(s.setItemLook(uid, 'arcoiris').ok).toBe(false);
    expect(s.equip(uid, 'mount').ok).toBe(true);
    expect(s.setItemLook(uid, 'blanco_perla').ok).toBe(true);
    expect(c.equipment.slots.mount!.look).toBe('blanco_perla');
    // Volver a la de por defecto no deja marca.
    expect(s.setItemLook(uid, 'turquesa_clasica').ok).toBe(true);
    expect(c.equipment.slots.mount!.look).toBeUndefined();
  });

  it('la elección se guarda y se recupera', () => {
    const { s, uid } = setup();
    s.setItemLook(uid, 'rosa_sakura');
    const save = s.save();
    const back = Character.fromSave(data.rpg, save, new Rng(4));
    expect(back.inventory.find(uid)!.look).toBe('rosa_sakura');
  });

  it('un objeto sin variantes no cambia de apariencia', () => {
    const { s, c } = setup();
    c.give('mount_horse', 1);
    const horse = c.inventory.slots.find((i) => i?.itemId === 'mount_horse')!.uid;
    expect(s.setItemLook(horse, 'negro_ebano').ok).toBe(false);
  });
});
