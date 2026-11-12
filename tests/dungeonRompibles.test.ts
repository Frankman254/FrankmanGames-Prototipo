// Rompibles de la cripta (2026-11-12): variantes por familia, rotura coherente
// y cascotes del material que era. NullEngine; las piezas salen del GLB publicado.
import { Mesh, NullEngine, Scene } from '@babylonjs/core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadDungeon } from '../src/data/dungeonSchema';
import { registerStaticGlb } from '../src/render/staticModels';
import { DungeonFloorView } from '../src/render/dungeonView';
import { generateFloor } from '../src/world/dungeon';

beforeAll(() => {
  const raw = readFileSync(join(__dirname, '..', 'assets', 'models', 'mazmorra.glb'));
  registerStaticGlb(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer);
});

const data = loadGameData();
const def = loadDungeon(data);
const floor = generateFloor(def, 50);
const JAR_MESHES = ['dJar0', 'dJar1', 'dJar2', 'dJar3'];
const BARREL_MESHES = ['dBarrel0', 'dBarrel1', 'dBarrel2'];

interface FeatureMeta {
  dungeonFeatures?: Array<{ kind: string; id: string }>;
}

function setup(broken: readonly string[] = []) {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const view = new DungeonFloorView(scene, def, floor, new Set(), new Set(), new Set(broken));
  return { engine, scene, view };
}

const instanceBlock = (mesh: Mesh, i: number): number[] =>
  Array.from((mesh as Mesh & { _thinInstanceDataStorage: { matrixData: Float32Array } })._thinInstanceDataStorage.matrixData.slice(i * 16, i * 16 + 16));

const featureHost = (meshes: Mesh[], id: string): { mesh: Mesh; index: number } => {
  for (const mesh of meshes) {
    const feats = (mesh.metadata as FeatureMeta | undefined)?.dungeonFeatures ?? [];
    const index = feats.findIndex((f) => f.kind === 'breakable' && f.id === id);
    if (index >= 0) return { mesh, index };
  }
  throw new Error(`rompiente ${id} no esta en ninguna variante`);
};

describe('rompibles de la cripta', () => {
  it('cada rompiente entero ocupa exactamente una instancia de su familia', () => {
    const { engine, scene, view } = setup();
    void view;
    const meshes = scene.meshes.filter((m) => [...JAR_MESHES, ...BARREL_MESHES].includes(m.name)) as Mesh[];
    const total = meshes.reduce((a, m) => a + m.thinInstanceCount, 0);
    expect(total).toBe(floor.breakables.length);
    // Ambas clases existen en el piso y las dos familias reparten sus variantes.
    const kinds = new Set(floor.breakables.map((b) => b.kind));
    expect(kinds).toEqual(new Set(['jar', 'barrel']));
    const withInstances = (names: string[]): number => names.filter((n) => (scene.getMeshByName(n) as Mesh).thinInstanceCount > 0).length;
    expect(withInstances(JAR_MESHES), 'variantes de jarra usadas').toBeGreaterThan(1);
    expect(withInstances(BARREL_MESHES), 'variantes de tonel usadas').toBeGreaterThan(1);
    scene.dispose();
    engine.dispose();
  });

  it('romper una jarra apaga su instancia y deja solo cascotes de barro', () => {
    const { engine, scene, view } = setup();
    const id = floor.breakables.find((b) => b.kind === 'jar')!.id;
    const { mesh, index } = featureHost(scene.meshes as Mesh[], id);
    const clay = scene.getMeshByName('dShards') as Mesh;
    const wood = scene.getMeshByName('dShardsWood') as Mesh;
    const clay0 = clay.thinInstanceCount;
    const wood0 = wood.thinInstanceCount;
    expect(index).toBeGreaterThanOrEqual(0);
    view.setBroken(id);
    expect(instanceBlock(mesh, index)[0], 'escala x apagada').toBe(0);
    expect(clay.thinInstanceCount).toBe(clay0 + 1);
    expect(wood.thinInstanceCount, 'el tonel no suelta duelas de barro ni al reves').toBe(wood0);
    // Romper otra vez el mismo id no duplica el monton.
    view.setBroken(id);
    expect(clay.thinInstanceCount).toBe(clay0 + 1);
    scene.dispose();
    engine.dispose();
  });

  it('romper un tonel suelta astillas de duela y no toca los aros', () => {
    const { engine, scene, view } = setup();
    const barrels = BARREL_MESHES.map((n) => scene.getMeshByName(n) as Mesh);
    const barrelId = floor.breakables.find((b) => b.kind === 'barrel')!.id;
    const host = featureHost(barrels, barrelId);
    const hoops = scene.getMeshByName('dHoops') as Mesh;
    const wood = scene.getMeshByName('dShardsWood') as Mesh;
    const clay = scene.getMeshByName('dShards') as Mesh;
    const wood0 = wood.thinInstanceCount;
    const clay0 = clay.thinInstanceCount;
    const hoops0 = hoops.thinInstanceCount;
    view.setBroken(barrelId);
    expect(instanceBlock(host.mesh, host.index)[0], 'barril apagado').toBe(0);
    expect(wood.thinInstanceCount, 'duelas nuevas').toBe(wood0 + 1);
    expect(clay.thinInstanceCount, 'el tonel no suelta tiestos de barro').toBe(clay0);
    expect(hoops.thinInstanceCount, 'los aros ni ganan ni pierden instancias').toBe(hoops0);
    scene.dispose();
    engine.dispose();
  });

  it('los rotos de la partida llegan sin mesh pero con su monton desde el principio', () => {
    const jar = floor.breakables.find((b) => b.kind === 'jar')!.id;
    const barrel = floor.breakables.find((b) => b.kind === 'barrel')!.id;
    const { engine, scene } = setup([jar, barrel]);
    const meshes = scene.meshes.filter((m) => [...JAR_MESHES, ...BARREL_MESHES].includes(m.name)) as Mesh[];
    expect(meshes.reduce((a, m) => a + m.thinInstanceCount, 0)).toBe(floor.breakables.length);
    for (const m of meshes) {
      const feats = (m.metadata as FeatureMeta | undefined)?.dungeonFeatures ?? [];
      feats.forEach((f, i) => {
        if (f.id === jar || f.id === barrel) expect(instanceBlock(m, i)[0], `instancia de ${f.id} apagada`).toBe(0);
      });
    }
    const clay = scene.getMeshByName('dShards') as Mesh;
    const wood = scene.getMeshByName('dShardsWood') as Mesh;
    expect(clay.thinInstanceCount).toBe(1);
    expect(wood.thinInstanceCount).toBe(1);
    scene.dispose();
    engine.dispose();
  });

  it('la variante no cambia al romperse un vecino (el id manda, no el orden)', () => {
    const a = floor.breakables.find((b) => b.kind === 'jar')!.id;
    const b = floor.breakables.filter((x) => x.kind === 'jar')[1]!.id;
    const { engine, scene, view } = setup();
    const first = featureHost(scene.meshes as Mesh[], b);
    const nameOf = first.mesh.name;
    view.setBroken(a);
    const again = featureHost(scene.meshes as Mesh[], b);
    expect(again.mesh.name).toBe(nameOf);
    scene.dispose();
    engine.dispose();
  });
});
