import { describe, expect, it } from 'vitest';
import { centeredWindow, clampWindow, parseLayout, UI_LAYER_Z } from '../../src/ui/menus/windows';
import json from '../../data/ui/keybindings.json';
import { HOLD_ACTIONS, KeyMap, UI_ACTIONS, parseKeybindings } from '../../src/ui/menus/keybindings';

describe('ventanas arrastrables', () => {
  it('centra una ventana sin dejarla fuera del área visible', () => {
    expect(centeredWindow(400, 300, 1200, 800)).toEqual({ x: 400, y: 250 });
    expect(centeredWindow(1400, 900, 1200, 800)).toEqual({ x: 0, y: 0 });
  });

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

  it('la política raíz mantiene HUD, ventanas, modales y auxiliares en orden', () => {
    expect(UI_LAYER_Z.screen).toBeLessThan(UI_LAYER_Z.game);
    expect(UI_LAYER_Z.game).toBeLessThan(UI_LAYER_Z.hudEdit);
    expect(UI_LAYER_Z.hudEdit).toBeLessThan(UI_LAYER_Z.modal);
    expect(UI_LAYER_Z.modal).toBeLessThan(UI_LAYER_Z.toast);
    expect(UI_LAYER_Z.toast).toBeLessThan(UI_LAYER_Z.auxiliary);
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

describe('posiciones en proporción de la ventana (F03)', () => {
  it('lo centrado sigue centrado y lo pegado a un borde sigue pegado al cambiar de tamaño', async () => {
    const { fromFraction, toFraction } = await import('../../src/ui/menus/windows');
    const centred = toFraction({ x: (1920 - 300) / 2, y: (1080 - 200) / 2 }, 300, 200, 1920, 1080);
    expect(fromFraction(centred, 300, 200, 1280, 720)).toEqual({ x: 490, y: 260 });
    const right = toFraction({ x: 1920 - 300, y: 0 }, 300, 200, 1920, 1080);
    expect(fromFraction(right, 300, 200, 1280, 720)).toEqual({ x: 980, y: 0 });
    // Una posición antigua (solo píxeles) sigue valiendo tal cual.
    expect(fromFraction({ x: 40, y: 50 }, 300, 200, 1280, 720)).toEqual({ x: 40, y: 50 });
  });

  it('las proporciones se guardan y las rotas se descartan', async () => {
    expect(parseLayout({ a: { x: 1, y: 2, fx: 0.5, fy: 1 }, b: { x: 1, y: 2, fx: 7, fy: 0 } })).toEqual({ a: { x: 1, y: 2, fx: 0.5, fy: 1 }, b: { x: 1, y: 2 } });
  });

  it('conserva coordenadas subpíxel sin redondearlas', async () => {
    const { fromFraction, toFraction } = await import('../../src/ui/menus/windows');
    const p = toFraction({ x: 123.456, y: 78.125 }, 311.25, 205.5, 1366, 768);
    expect(p.x).toBe(123.456);
    expect(p.y).toBe(78.125);
    const restored = fromFraction(p, 311.25, 205.5, 1366, 768);
    expect(restored.x).toBeCloseTo(123.456, 10);
    expect(restored.y).toBeCloseTo(78.125, 10);
  });
});

describe('HUD movible y con tamaño (F02)', () => {
  it('chat y mascota se pueden mover, y cada elemento guarda su tamaño dentro del rango', async () => {
    const { HUD_KEYS, normalizeProfiles, clampHudScale, HUD_SCALE_MAX, HUD_SCALE_MIN } = await import('../../src/ui/map/hudProfiles');
    expect(HUD_KEYS).toContain('chat');
    expect(HUD_KEYS).toContain('hud-pet');
    expect(clampHudScale(9)).toBe(HUD_SCALE_MAX);
    expect(clampHudScale(0)).toBe(HUD_SCALE_MIN);
    const st = normalizeProfiles({ active: 'p1', profiles: [{ id: 'p1', name: 'A', positions: {}, scales: { chat: 1.4, roto: 'x', grande: 50 } }] });
    expect(st.profiles[0]!.scales).toEqual({ chat: 1.4, grande: HUD_SCALE_MAX });
  });
});
