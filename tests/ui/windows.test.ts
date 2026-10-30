import { describe, expect, it } from 'vitest';
import { clampWindow, parseLayout } from '../../src/ui/menus/windows';
import json from '../../data/ui/keybindings.json';
import { HOLD_ACTIONS, KeyMap, UI_ACTIONS, parseKeybindings } from '../../src/ui/menus/keybindings';

describe('ventanas arrastrables', () => {
  it('la ventana cabe entera en la pantalla', () => {
    // Dentro: no cambia.
    expect(clampWindow({ x: 100, y: 50 }, 300, 200, 1280, 800)).toEqual({ x: 100, y: 50 });
    // Fuera por la izquierda y por arriba.
    expect(clampWindow({ x: -1000, y: -20 }, 300, 200, 1280, 800)).toEqual({ x: 0, y: 0 });
    // Fuera por la derecha y por abajo: se mete entera.
    expect(clampWindow({ x: 5000, y: 5000 }, 300, 200, 1280, 800)).toEqual({ x: 980, y: 600 });
    // Más grande que la pantalla: pegada arriba a la izquierda (la cabecera a la vista).
    expect(clampWindow({ x: 300, y: 300 }, 2000, 1000, 1280, 800)).toEqual({ x: 0, y: 0 });
  });

  it('las posiciones guardadas rotas se ignoran', () => {
    expect(parseLayout({ 'panel-inventory': { x: 10, y: 20 }, roto: { x: 'a' }, nulo: null })).toEqual({ 'panel-inventory': { x: 10, y: 20 } });
    expect(parseLayout('basura')).toEqual({});
  });
});

describe('cámara y pantalla en el teclado', () => {
  const keys = new KeyMap(parseKeybindings(json));
  it('X mantiene el giro de cámara, , y . giran, F11 pantalla completa, F4 trayectoria, F1 cuadrícula', () => {
    expect(keys.action('KeyX')).toBe('cameraOrbit');
    expect(keys.action('Comma')).toBe('cameraLeft');
    expect(keys.action('Period')).toBe('cameraRight');
    expect(keys.action('F11')).toBe('fullscreen');
    expect(keys.action('F4')).toBe('togglePath');
    expect(keys.action('F1')).toBe('toggleGrid');
    expect(HOLD_ACTIONS.has('cameraOrbit')).toBe(true);
    expect(UI_ACTIONS.has('toggleGrid')).toBe(true);
  });
});
