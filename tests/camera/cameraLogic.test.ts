import { describe, expect, it } from 'vitest';
import { damp, dampAngle, dampRadians, dampingAlpha, distanceBeforeBlocker, heldLongEnough, modeTarget, parseFramings } from '../../src/camera';
import { DEFAULT_CAMERA_TUNING } from '../../src/camera/types';

describe('cámara v2: lógica pura', () => {
  it('el damping converge igual al dividir el fotograma', () => {
    const once = damp(0, 10, 6, 1);
    const twice = damp(damp(0, 10, 6, 0.5), 10, 6, 0.5);
    expect(twice).toBeCloseTo(once, 10);
    expect(dampingAlpha(6, 0)).toBe(0);
  });

  it('suaviza giros en radianes por el arco corto', () => {
    const from = Math.PI - 0.1;
    const to = -Math.PI + 0.1;
    const next = dampRadians(from, to, 8, 1 / 60);
    expect(next).toBeGreaterThan(from);
    expect(Math.abs(next - from)).toBeLessThan(0.1);
  });

  it('interpola ángulos por el camino corto', () => {
    expect(dampAngle(350, 10, 100, 1)).toBeCloseTo(10, 4);
  });

  it('normaliza encuadres guardados y distingue toque de pulsación larga', () => {
    const f = parseFramings({ close: { yawDeg: 20, pitchDeg: 500, distance: -2 } });
    expect(f.close).toEqual({ yawDeg: 20, pitchDeg: 85, distance: 2 });
    expect(f.top.distance).toBeGreaterThan(10);
    expect(heldLongEnough(100, 749)).toBe(false);
    expect(heldLongEnough(100, 750)).toBe(true);
  });

  it('auto focus encuadra jugador y amenazas', () => {
    const result = modeTarget({
      mode: 'autoFocus', target: { x: 0, y: 2, z: 0 }, threats: [{ x: 12, z: 4 }],
      pose: { yawDeg: 0, pitchDeg: 42, distance: 8 }, dt: 1 / 60, manualPause: 0, tuning: DEFAULT_CAMERA_TUNING,
    });
    expect(result.focus.x).toBe(6);
    expect(result.pose.distance).toBeGreaterThan(8);
  });

  it('modo por zona fija el centro de una celda de 32 m, incluida la negativa', () => {
    const result = modeTarget({
      mode: 'zone', target: { x: -1, y: 3, z: 33 }, threats: [], pose: { yawDeg: 0, pitchDeg: 42, distance: 16 },
      dt: 0.1, manualPause: 0, tuning: DEFAULT_CAMERA_TUNING,
    });
    expect(result.focus).toEqual({ x: -16, y: 3, z: 48 });
  });

  it('el modo inteligente respeta la pausa manual y limita el giro', () => {
    const base = { mode: 'smart' as const, target: { x: 0, y: 0, z: 0 }, threats: [{ x: 10, z: 0 }], pose: { yawDeg: 0, pitchDeg: 40, distance: 12 }, dt: 1, tuning: DEFAULT_CAMERA_TUNING };
    expect(modeTarget({ ...base, manualPause: 1 }).pose.yawDeg).toBe(0);
    const turned = modeTarget({ ...base, manualPause: 0 }).pose.yawDeg;
    expect(Math.min(turned, 360 - turned)).toBe(DEFAULT_CAMERA_TUNING.smartTurnRateDeg);
  });

  it('la colisión analítica acerca la cámara justo antes de una pared', () => {
    const d = distanceBeforeBlocker({ x: 0, y: 1, z: 0, dx: 1, dy: 0, dz: 0 }, 20, [{ x: 10, z: 0, halfWidth: 1, halfDepth: 3, top: 4 }], 0.5);
    expect(d).toBeCloseTo(8.5);
  });
});
