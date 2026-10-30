import { describe, expect, it } from 'vitest';
import json from '../../data/ui/keybindings.json';
import {
  ACTIONS,
  ACTION_GROUPS,
  HOTBAR_SLOTS,
  KeyMap,
  applyOverrides,
  diffBindings,
  hotbarIndex,
  keyLabel,
  parseKeybindings,
  setKeyboardLayout,
} from '../../src/ui/menus/keybindings';

describe('atajos de teclado', () => {
  const kb = parseKeybindings(json);
  const map = new KeyMap(parseKeybindings(json));

  it('el JSON del repo es válido y cubre todas las acciones', () => {
    for (const a of ACTIONS) expect(kb[a].length).toBeGreaterThan(0);
    // La pantalla de atajos enseña todas las acciones.
    expect(ACTION_GROUPS.flatMap((g) => g.actions.map((x) => x.action)).sort()).toEqual([...ACTIONS].sort());
  });

  it('la barra son dos filas: QWERTYUIOP y ASDFGHJKLÑ', () => {
    const row1 = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP'];
    const row2 = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon'];
    [...row1, ...row2].forEach((code, i) => expect(map.action(code)).toBe(`hotbar${i + 1}`));
    expect(HOTBAR_SLOTS).toBe(20);
    expect(map.action('Digit1')).toBe('potionHealth');
    expect(map.action('Digit2')).toBe('potionResource');
    expect(map.action('F9')).toBe('restartArena');
  });

  it('rechaza una tecla en dos acciones, acciones desconocidas o que falten', () => {
    const dup = { actions: { ...json.actions, inventory: ['KeyQ'] } };
    expect(() => parseKeybindings(dup)).toThrow(/KeyQ/);
    expect(() => parseKeybindings({ actions: { ...json.actions, fly: ['KeyX'] } })).toThrow(/desconocida/);
    const { pause: _p, ...missing } = json.actions;
    expect(() => parseKeybindings({ actions: missing })).toThrow(/pause/);
    expect(() => parseKeybindings({})).toThrow();
  });

  it('etiquetas cortas, Ñ y huecos de la barra', () => {
    setKeyboardLayout(null);
    expect(keyLabel('Digit3')).toBe('3');
    expect(keyLabel('KeyQ')).toBe('Q');
    expect(keyLabel('Escape')).toBe('Esc');
    expect(keyLabel('Semicolon')).toBe('Ñ');
    expect(keyLabel('F9')).toBe('F9');
    expect(map.label('pause')).toBe('Esc');
    expect(hotbarIndex('hotbar1')).toBe(0);
    expect(hotbarIndex('hotbar20')).toBe(19);
    expect(hotbarIndex('pause')).toBeNull();
    // Con el mapa de distribución del sistema manda el nombre real (p. ej. teclado inglés).
    setKeyboardLayout(new Map([['Semicolon', ';']]));
    expect(keyLabel('Semicolon')).toBe(';');
    setKeyboardLayout(null);
  });

  it('reasignar intercambia con la acción que tenía la tecla', () => {
    const m = new KeyMap(parseKeybindings(json));
    expect(m.rebind('fish', 'KeyQ')).toBe('hotbar1');
    expect(m.action('KeyQ')).toBe('fish');
    expect(m.action('KeyZ')).toBe('hotbar1');
    expect(m.rebind('fish', 'KeyQ')).toBeNull();
    // Tecla libre: no hay intercambio.
    expect(m.rebind('inventory', 'KeyN')).toBeNull();
    expect(m.action('KeyN')).toBe('inventory');
    expect(m.action('KeyB')).toBeNull();
  });

  it('los cambios se guardan como diferencias y se vuelven a aplicar', () => {
    const m = new KeyMap(parseKeybindings(json));
    m.rebind('fish', 'KeyQ');
    const diff = diffBindings(kb, m.bindings);
    expect(Object.keys(diff).sort()).toEqual(['fish', 'hotbar1']);
    const again = new KeyMap(applyOverrides(kb, JSON.parse(JSON.stringify(diff))));
    expect(again.action('KeyQ')).toBe('fish');
    expect(again.action('KeyZ')).toBe('hotbar1');
    // Basura guardada: se ignora sin romper nada.
    const safe = applyOverrides(kb, { noExiste: ['KeyQ'], fish: 'x', pause: [3] });
    expect(new KeyMap(safe).action('KeyQ')).toBe('hotbar1');
    m.reset(kb);
    expect(m.action('KeyQ')).toBe('hotbar1');
  });
});
