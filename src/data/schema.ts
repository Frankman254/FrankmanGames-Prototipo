// Tipos de datos ajustables y su parseo con validación. Todo número aquí es
// PROPUESTA: vive en `data/*.json`, no en el código.
import { Reader } from './validate';

export interface CameraDef {
  pitchDeg: number;
  yawDeg: number;
  distance: number;
  fovDeg: number;
  followLerpPerSecond: number;
  minDistance: number;
  maxDistance: number;
}

export function parseCamera(raw: unknown): CameraDef {
  const r = new Reader('camera.json');
  const o = r.obj(raw);
  const minDistance = r.num(o, 'minDistance', { min: 1 });
  const maxDistance = r.num(o, 'maxDistance', { min: minDistance });
  return {
    pitchDeg: r.num(o, 'pitchDeg', { min: 10, max: 89 }),
    yawDeg: r.num(o, 'yawDeg', { min: -360, max: 360 }),
    distance: r.num(o, 'distance', { min: minDistance, max: maxDistance }),
    fovDeg: r.num(o, 'fovDeg', { min: 10, max: 120 }),
    followLerpPerSecond: r.num(o, 'followLerpPerSecond', { min: 0.1 }),
    minDistance,
    maxDistance,
  };
}

export interface ZoneDef {
  width: number;
  depth: number;
  playerStart: { x: number; y: number };
  playerSpeed: number;
  playerRadius: number;
}

export function parseZone(raw: unknown): ZoneDef {
  const r = new Reader('zone.json');
  const o = r.obj(raw);
  const width = r.num(o, 'width', { min: 10, max: 1000 });
  const depth = r.num(o, 'depth', { min: 10, max: 1000 });
  const playerStart = r.vec(o, 'playerStart');
  if (playerStart.x < 0 || playerStart.x > width || playerStart.y < 0 || playerStart.y > depth) {
    r.fail('playerStart', 'fuera de la zona');
  }
  return {
    width,
    depth,
    playerStart,
    playerSpeed: r.num(o, 'playerSpeed', { min: 0.1, max: 50 }),
    playerRadius: r.num(o, 'playerRadius', { min: 0.05, max: 3 }),
  };
}
