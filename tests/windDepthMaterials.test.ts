// El contorno de pintura lee la profundidad; si las plantas se balancean en
// color pero no en profundidad, el borde baila. Aquí se garantiza que toda
// malla con viento recibe el material de profundidad con viento y que al
// quitar el estilo todo vuelve al material por defecto del motor.
import {
  DepthRenderer,
  FreeCamera,
  MeshBuilder,
  NullEngine,
  Scene,
  ShaderMaterial,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { afterEach, describe, expect, it } from 'vitest';
import { WindPlugin } from '../src/render/windPlugin';
import { bindWindDepthMaterials, windDepthVertexSource } from '../src/render/windDepthMaterials';

let engines: NullEngine[] = [];

function setup() {
  const engine = new NullEngine();
  engines.push(engine);
  const scene = new Scene(engine);
  new FreeCamera('cam', new Vector3(0, 5, -10), scene);
  const depth = scene.enableDepthRenderer(undefined, false)!;
  return { scene, depth };
}

function windMesh(scene: Scene, name: string, amplitude: number) {
  const mesh = MeshBuilder.CreateBox(name, {}, scene);
  const mat = new StandardMaterial(`${name}:mat`, scene);
  if (amplitude > 0) new WindPlugin(mat, amplitude);
  mesh.material = mat;
  return mesh;
}

/** Material que el motor usará para la profundidad de esa malla (o nada). */
function depthOverride(scene: Scene, depth: DepthRenderer, name: string): unknown {
  const mesh = scene.getMeshByName(name)!;
  const passId = depth.getDepthMap().renderPassId;
  return mesh._internalAbstractMeshDataInfo?._materialForRenderPass?.[passId];
}

afterEach(() => {
  for (const e of engines) e.dispose();
  engines = [];
});

describe('inyección del balanceo en el shader de profundidad', () => {
  it('inserta el uniforme y el desplazamiento en los anclajes esperados', () => {
    const src = windDepthVertexSource();
    expect(src).toContain('uniform mat4 viewProjection;uniform vec2 depthValues;\nuniform vec4 windParams;');
    expect(src).toContain('vec4 worldPos=finalWorld*vec4(positionUpdated,1.0);\n');
    expect(src.indexOf('worldPos.xz +=')).toBeGreaterThan(src.indexOf('vec4 worldPos=finalWorld'));
    // El bloque del plugin, sin copiar la fórmula: misma fuente que el pase de color.
    expect(src).toContain('float phase = worldPos.x * 0.21');
  });

  it('falla rápido si el motor cambia su shader base', () => {
    expect(() => windDepthVertexSource('void main() {}')).toThrow(/ha cambiado/);
  });
});

describe('enganche de materiales de profundidad con viento', () => {
  it('da material de viento a las mallas con plugin y nada a las que no', () => {
    const { scene, depth } = setup();
    const grass = windMesh(scene, 'grass', 0.8);
    const rock = windMesh(scene, 'rock', 0);
    const sync = bindWindDepthMaterials(depth, scene);
    expect(depthOverride(scene, depth, grass.name)).toBeInstanceOf(ShaderMaterial);
    expect(depthOverride(scene, depth, rock.name)).toBeUndefined();
    sync.dispose();
  });

  it('cachea un material por amplitud (dos mallas iguales comparten)', () => {
    const { scene, depth } = setup();
    windMesh(scene, 'a', 1);
    windMesh(scene, 'b', 1);
    windMesh(scene, 'c', 0.4);
    const sync = bindWindDepthMaterials(depth, scene);
    const ma = depthOverride(scene, depth, 'a') as ShaderMaterial;
    const mb = depthOverride(scene, depth, 'b') as ShaderMaterial;
    const mc = depthOverride(scene, depth, 'c') as ShaderMaterial;
    expect(ma).toBe(mb);
    expect(mc).not.toBe(ma);
    expect(ma.name).toBe('windDepth1');
    expect(mc.name).toBe('windDepth0.4');
    sync.dispose();
  });

  it('engancha las mallas que llegan después (streaming)', async () => {
    const { scene, depth } = setup();
    const sync = bindWindDepthMaterials(depth, scene);
    const late = MeshBuilder.CreateBox('late', {}, scene);
    const mat = new StandardMaterial('late:mat', scene);
    new WindPlugin(mat, 0.6);
    late.material = mat;
    // El aviso del motor llega en un immediate; se espera el evento real,
    // nunca un reloj. (Ejecutor: el objetivo es ES2022, sin Promise.withResolvers.)
    await new Promise<void>((r) => scene.onNewMeshAddedObservable.add(() => r()));
    expect(depthOverride(scene, depth, 'late')).toBeInstanceOf(ShaderMaterial);
    // El camino público de repaso también engancha lo que llegó sin aviso.
    const late2 = MeshBuilder.CreateBox('late2', {}, scene);
    const mat2 = new StandardMaterial('late2:mat', scene);
    new WindPlugin(mat2, 0.6);
    late2.material = mat2;
    sync.sync();
    expect(depthOverride(scene, depth, 'late2')).toBeInstanceOf(ShaderMaterial);
    sync.dispose();
  });

  it('al disponer, todo vuelve al material por defecto del motor', () => {
    const { scene, depth } = setup();
    const grass = windMesh(scene, 'grass', 0.8);
    const sync = bindWindDepthMaterials(depth, scene);
    expect(depthOverride(scene, depth, 'grass')).toBeDefined();
    sync.dispose();
    expect(depthOverride(scene, depth, 'grass')).toBeUndefined();
  });
});
