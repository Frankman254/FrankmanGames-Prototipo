import { describe, expect, it } from 'vitest';
import json from '../../data/ui/keybindings.json';
import { ACTIONS, KeyMap, hotbarIndex, keyLabel, parseKeybindings } from '../../src/ui/menus/keybindings';

describe('atajos de teclado', () => {
  const kb = parseKeybindings(json);
  const map = new KeyMap(kb);

  it('el JSON del repo es válido y cubre todas las acciones', () => {
    for (const a of ACTIONS) expect(kb[a].length).toBeGreaterThan(0);
  });

  it('1–6, Q, E y R quedan libres de la prueba de carga y del reinicio', () => {
    for (let i = 1; i <= 6; i++) expect(map.action(`Digit${i}`)).toBe(`hotbar${i}`);
    expect(map.action('KeyQ')).toBe('potionHealth');
    expect(map.action('KeyE')).toBe('potionResource');
    expect(map.action('KeyR')).toBeNull();
    expect(map.action('F6')).toBe('loadTest20');
    expect(map.action('F7')).toBe('loadTest200');
    expect(map.action('F8')).toBe('loadTestClear');
    expect(map.action('F9')).toBe('restartArena');
  });

  it('rechaza una tecla en dos acciones, acciones desconocidas o que falten', () => {
    const dup = { actions: { ...json.actions, inventory: ['KeyQ'] } };
    expect(() => parseKeybindings(dup)).toThrow(/KeyQ/);
    expect(() => parseKeybindings({ actions: { ...json.actions, fly: ['KeyF'] } })).toThrow(/desconocida/);
    const { pause: _p, ...missing } = json.actions;
    expect(() => parseKeybindings({ actions: missing })).toThrow(/pause/);
    expect(() => parseKeybindings({})).toThrow();
  });

  it('etiquetas cortas y huecos de la barra', () => {
    expect(keyLabel('Digit3')).toBe('3');
    expect(keyLabel('KeyQ')).toBe('Q');
    expect(keyLabel('Escape')).toBe('Esc');
    expect(keyLabel('F9')).toBe('F9');
    expect(map.label('pause')).toBe('Esc');
    expect(hotbarIndex('hotbar1')).toBe(0);
    expect(hotbarIndex('hotbar6')).toBe(5);
    expect(hotbarIndex('pause')).toBeNull();
  });
});
