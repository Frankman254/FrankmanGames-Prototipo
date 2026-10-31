// Textos de la interfaz de la revisión de progresión: Pulso redondeado,
// requisito de nivel de hechizos y pergaminos, y tooltip por encima de todo.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import { itemTooltip, pulseText, spellLevelLines, spellTooltip, type TipLine } from '../../src/ui/menus/format';

const rpg = loadGameData().rpg;

describe('Pulso', () => {
  it('se muestra siempre en enteros', () => {
    expect(pulseText('Pulso', 69.6, 100)).toBe('Pulso: 70 / 100');
    expect(pulseText('Pulso', 33.333333, 100)).toBe('Pulso: 33 / 100');
    expect(pulseText('Pulso', 0.4, 99.7)).toBe('Pulso: 0 / 100');
  });

  it('las tres vistas (HUD, hoja y ventana de muerte) usan el mismo formato', () => {
    for (const f of ['src/ui/menus/hud.ts', 'src/ui/menus/character.ts', 'src/ui/menus/index.ts']) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).toContain('pulseText(');
      expect(src, f).not.toMatch(/energy\.value\} \/ \$\{/);
    }
  });
});

describe('requisito de nivel en tooltips', () => {
  const req = (lines: TipLine[]) => lines.filter((l): l is Extract<TipLine, { kind: 'req' }> => l.kind === 'req');

  it('hechizo de pergamino por encima del nivel: requisito en rojo y explicación', () => {
    const sp = rpg.spells['rime_shard']!;
    const lines = spellTooltip(sp, 1, rpg, 'Vigor', { level: 1, classId: 'ember_vanguard', known: true });
    expect(req(lines)).toEqual([{ kind: 'req', text: `Requiere nivel ${sp.unlockLevel} para ponerlo en la barra`, met: false }]);
    expect(lines.some((l) => l.kind === 'hint' && l.text.includes('Ya lo conoces'))).toBe(true);
  });

  it('hechizo de la clase aún no aprendido: dice cuándo se aprende solo', () => {
    const sp = rpg.spells['bulwark']!;
    const lines = spellLevelLines(sp, { level: 2, classId: 'ember_vanguard' }, false);
    expect(lines[0]).toMatchObject({ kind: 'req', met: false });
    expect(lines.some((l) => l.kind === 'hint' && l.text.includes(`nivel ${sp.unlockLevel}`))).toBe(true);
  });

  it('cumplido: sólo la línea atenuada; nivel 1: nada', () => {
    expect(spellLevelLines(rpg.spells['bulwark']!, { level: 20, classId: 'ember_vanguard' }, true)).toEqual([
      { kind: 'req', text: `Requiere nivel ${rpg.spells['bulwark']!.unlockLevel} para ponerlo en la barra`, met: true },
    ]);
    expect(spellLevelLines(rpg.spells['charge']!, { level: 1, classId: 'ember_vanguard' }, true)).toEqual([]);
  });

  it('el pergamino avisa de que se aprende ya pero va a la barra más tarde', () => {
    const lines = itemTooltip(
      { uid: 'x', itemId: 'scroll_rime_shard', quantity: 1, rolled: [] },
      { content: rpg, equipment: {} as never, equipped: false, compare: [], sellValue: 1, playerLevel: 1 },
    );
    expect(req(lines)).toHaveLength(1);
    expect(req(lines)[0]!.met).toBe(false);
    expect(req(lines)[0]!.text).toContain(`nivel ${rpg.spells['rime_shard']!.unlockLevel}`);
  });
});

describe('tooltip por encima de todo', () => {
  it('su z-index supera cualquier otro de las hojas de estilo y del código de la interfaz', () => {
    const css = ['menus', 'themes', 'options', 'map'].map((n) => readFileSync(`src/ui/styles/${n}.css`, 'utf8')).join('\n');
    const tip = /\.tooltip\s*\{[^}]*z-index:\s*(\d+)/.exec(css);
    expect(tip).not.toBeNull();
    const tz = Number(tip![1]);
    const all = [...css.matchAll(/z-index:\s*(\d+)/g)].map((m) => Number(m[1]));
    expect(all.filter((z) => z >= tz)).toEqual([tz]);
    // Las ventanas suben su z-index con cada clic; harían falta miles de millones.
    expect(tz).toBeGreaterThan(1e9);
  });
});
