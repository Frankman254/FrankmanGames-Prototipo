import { Mesh, NullEngine, Scene } from '@babylonjs/core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerStaticGlb } from '../src/render/staticModels';
import { TorchRig } from '../src/render/torchFlame';
import type { DungeonTorch } from '../src/world/dungeon';

beforeAll(() => {
  const raw = readFileSync(join(__dirname, '..', 'assets', 'models', 'mazmorra.glb'));
  registerStaticGlb(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer);
});

const torches: DungeonTorch[] = [
  { x: 2.5, y: 0.5, nx: 0, ny: 1 },
  { x: 28.5, y: 5.5, nx: 1, ny: 0 },
  { x: 15.5, y: 12.5, nx: 0, ny: -1 },
];

const mesh = (scene: Scene, name: string): Mesh => scene.getMeshByName(name) as Mesh;

function setup() {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const rig = new TorchRig(scene, torches, 2.36, [1, 0.6, 0.2]);
  return { engine, scene, rig };
}

describe('fuego de antorchas (TorchRig)', () => {
  it('una instancia por antorcha en cada una de las cuatro capas', () => {
    const { engine, scene, rig } = setup();
    for (const n of ['dFlame', 'dHalo', 'dSmoke', 'dSparks']) {
      expect(mesh(scene, n).thinInstanceCount, n).toBe(torches.length);
    }
    rig.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('el nucleo se apoya en la boca del cuenco y en el eje de la pared', () => {
    const { engine, scene, rig } = setup();
    const mats = mesh(scene, 'dFlame').thinInstanceGetWorldMatrices();
    torches.forEach((t, i) => {
      const m = mats[i]!;
      expect(m.m[12], `x ${i}`).toBeCloseTo(t.x + t.nx * 0.16);
      expect(m.m[13], `y ${i}`).toBeCloseTo(2.36);
      expect(m.m[14], `z ${i}`).toBeCloseTo(t.y + t.ny * 0.16);
    });
    rig.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('las llamas bailan asincronicas: cada antorcha evoluciona a su ritmo', () => {
    const { engine, scene, rig } = setup();
    const core = mesh(scene, 'dFlame');
    // Leemos el storage privado de thin instances (estable en toda la API de
    // Babylon): getWorldMatrices cachea y el cache no se invalida al actualizar
    // el buffer subyacente.
    const coreData = core as Mesh & { _thinInstanceDataStorage: { matrixData: Float32Array } };
    const data = (): number[] => Array.from(coreData._thinInstanceDataStorage.matrixData);
    const at0 = data();
    rig.update(0.37);
    const at1 = data();
    const delta = at1.map((v, k) => Math.abs(v - at0[k]!));
    // Cada instancia cambia (hay vida) y la evolucion de ninguna es igual a la de otra (hay fase).
    const block = (i: number): string => delta.slice(i * 16, i * 16 + 16).map((v) => v.toFixed(4)).join(',');
    for (let i = 0; i < torches.length; i++) expect(block(i).includes('0.0000,0.0000,0.0000,0.0000,0.0000,0.0000'), `instancia ${i} quieta`).toBe(false);
    expect(block(0), 'fases hermanas').not.toBe(block(1));
    expect(block(0), 'fases hermanas').not.toBe(block(2));
    // La posicion base no se desliza: translation (m[12..14] en fila 3) queda intacta.
    for (let i = 0; i < torches.length; i++) {
      expect(delta[i * 16 + 12]!, `deriva x ${i}`).toBeLessThan(1e-6);
      expect(delta[i * 16 + 13]!, `deriva y ${i}`).toBeLessThan(1e-6);
      expect(delta[i * 16 + 14]!, `deriva z ${i}`).toBeLessThan(1e-6);
    }
    rig.dispose();
    scene.dispose();
    engine.dispose();
  });

  it('dispose libera las cuatro mallas y sus tres materiales', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const m0 = scene.meshes.length;
    const k0 = scene.materials.length;
    const rig = new TorchRig(scene, torches, 2.36, [1, 0.6, 0.2]);
    expect(scene.meshes.length).toBe(m0 + 4);
    expect(scene.materials.length).toBe(k0 + 3);
    rig.dispose();
    expect(scene.meshes.length).toBe(m0);
    expect(scene.materials.length).toBe(k0);
    scene.dispose();
    engine.dispose();
  });
});
