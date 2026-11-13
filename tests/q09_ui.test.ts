// Q09: correcciones de UI — combatLog heal con fuente, diálogos con teclas numéricas,
// y doble clic en mochila para equipar.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { Character } from '../src/rpg/character';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';
import { CombatLog } from '../src/ui/combatLog';
import { hotbarIndex, itemBarIndex } from '../src/ui/menus/keybindings';

const DT = 1 / 60;

function arena() {
  const character = Character.create(loadGameData().rpg, 'storm_weaver', 'Prueba', new Rng(1));
  const w = new World(loadGameData(), { encounter: false, character });
  w.player.pos = { x: 10, y: 10 };
  w.player.prevPos = { x: 10, y: 10 };
  return w;
}

function run(w: World, seconds: number) {
  for (let i = 0; i < Math.round(seconds / DT); i++) w.tick(DT);
}

describe('Q09: combatLog — Curas muestra la fuente', () => {
  it('el mensaje de curación incluye el nombre del hechizo cuando hay source', () => {
    const w = arena();
    const lines: Array<{ channel: string; parts: Array<{ text: string; kind?: string }> }> = [];
    const log = new CombatLog((channel, parts) => lines.push({ channel, parts }));

    // Simular un evento heal con source = spellId (como lo genera World al lanzar un hechizo).
    const healEvent = { type: 'heal' as const, targetId: w.player.id, amount: 50, source: 'spark' };
    log.handle(w, [healEvent]);
    const healLine = lines.find((l) => l.parts.some((p) => p.kind === 'heal'));
    expect(healLine).toBeDefined();
    const fullText = healLine!.parts.map((p) => p.text).join('');
    expect(fullText).toContain('Curas');
    expect(fullText).toContain('+50');
    // El nombre del hechizo debe aparecer antes de "Curas".
    const sparkName = w.content.spells['spark']?.name ?? 'spark';
    expect(fullText).toContain(sparkName);
  });

  it('el mensaje de curación sin fuente sigue funcionando', () => {
    const w = arena();
    const lines: Array<{ channel: string; parts: Array<{ text: string; kind?: string }> }> = [];
    const log = new CombatLog((channel, parts) => lines.push({ channel, parts }));

    // Simular un evento heal sin source (caso antiguo)
    const fakeHeal = { type: 'heal' as const, targetId: w.player.id, amount: 25, source: '' };
    log.handle(w, [fakeHeal]);
    const healLine = lines.find((l) => l.parts.some((p) => p.kind === 'heal'));
    expect(healLine).toBeDefined();
    const fullText = healLine!.parts.map((p) => p.text).join('');
    expect(fullText).toContain('Curas');
    expect(fullText).toContain('+25');
  });
});

describe('Q09: hotbarIndex y itemBarIndex', () => {
  it('hotbarIndex resuelve hotbar1..hotbar20', () => {
    expect(hotbarIndex('hotbar1')).toBe(0);
    expect(hotbarIndex('hotbar6')).toBe(5);
    expect(hotbarIndex('hotbar10')).toBe(9);
    expect(hotbarIndex('hotbar20')).toBe(19);
  });

  it('itemBarIndex resuelve itembar1..itembar10', () => {
    expect(itemBarIndex('itembar1')).toBe(0);
    expect(itemBarIndex('itembar5')).toBe(4);
    expect(itemBarIndex('itembar10')).toBe(9);
  });

  it('ambas devuelven null para acciones ajenas', () => {
    expect(hotbarIndex('inventory')).toBeNull();
    expect(hotbarIndex('itembar1')).toBeNull();
    expect(itemBarIndex('hotbar1')).toBeNull();
    expect(itemBarIndex('pause')).toBeNull();
  });
});

describe('Q09: World.labelOf resuelve nombres de hechizos', () => {
  it('labelOf devuelve el nombre del hechizo conocido', () => {
    const w = arena();
    const name = w.labelOf('spark');
    expect(name).not.toBe('spark');
    expect(name.length).toBeGreaterThan(0);
  });

  it('labelOf devuelve el id si no lo conoce', () => {
    const w = arena();
    expect(w.labelOf('spell_no_existente')).toBe('spell_no_existente');
  });
});
