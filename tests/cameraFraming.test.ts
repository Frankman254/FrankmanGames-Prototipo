// Q14: al empezar y al reaparecer, la cámara debe encuadrar al personaje.
import { describe, expect, it } from 'vitest';
import { faceYawDeg, arrivalSpot, type StoneDef } from '../src/world/stones';

describe('Q14: encuadre de cámara al spawn y respawn', () => {
  const stoneWithFace: StoneDef = {
    id: 'piedra_test',
    name: 'Piedra de prueba',
    x: 100,
    y: 100,
    face: { x: 110, y: 105 },
  };

  const stoneWithoutFace: StoneDef = {
    id: 'piedra_sin_face',
    name: 'Piedra sin face',
    x: 200,
    y: 200,
  };

  describe('faceYawDeg', () => {
    it('devuelve null cuando la piedra no tiene face', () => {
      expect(faceYawDeg(stoneWithoutFace, { x: 102, y: 100 })).toBeNull();
    });

    it('calcula el yaw hacia el punto face desde la posición de llegada', () => {
      // Desde (102, 100) hacia (110, 105): dx=8, dy=5 → atan2(8,5) ≈ 57.99°
      const yaw = faceYawDeg(stoneWithFace, { x: 102, y: 100 });
      expect(yaw).not.toBeNull();
      expect(yaw!).toBeCloseTo(57.99, 1);
    });

    it('el yaw cambia según la posición de llegada', () => {
      // atan2(dx, dy): dx=face.x-from.x, dy=face.y-from.y
      // Desde (100, 95) hacia (110, 105): dx=10, dy=10 → atan2(10,10) = 45°
      const yawNorth = faceYawDeg(stoneWithFace, { x: 100, y: 95 });
      expect(yawNorth!).toBeCloseTo(45, 0);

      // Desde (100, 105) hacia (110, 105): dx=10, dy=0 → atan2(10,0) = 90°
      const yawSouth = faceYawDeg(stoneWithFace, { x: 100, y: 105 });
      expect(yawSouth!).toBeCloseTo(90, 0);

      // Desde (105, 100) hacia (110, 105): dx=5, dy=5 → atan2(5,5) = 45°
      const yawEast = faceYawDeg(stoneWithFace, { x: 105, y: 100 });
      expect(yawEast!).toBeCloseTo(45, 0);
    });

    it('el yaw es determinista para la misma posición', () => {
      const pos = { x: 102, y: 100 };
      const yaw1 = faceYawDeg(stoneWithFace, pos);
      const yaw2 = faceYawDeg(stoneWithFace, pos);
      expect(yaw1).toBe(yaw2);
    });
  });

  describe('arrivalSpot', () => {
    it('coloca al jugador al lado de la piedra hacia face', () => {
      const at = { x: 100, y: 100 };
      const spot = arrivalSpot(stoneWithFace, at);
      // Debe estar a ~2.5 m de la piedra, en dirección a face
      const dist = Math.hypot(spot.x - at.x, spot.y - at.y);
      expect(dist).toBeCloseTo(2.5, 1);
    });

    it('sin face, coloca al jugador al sur de la piedra', () => {
      const at = { x: 200, y: 200 };
      const spot = arrivalSpot(stoneWithoutFace, at);
      // Sin face, dy=-1 → al sur (y decrece)
      expect(spot.y).toBeLessThan(at.y);
      expect(spot.x).toBeCloseTo(at.x, 0);
    });
  });
});
