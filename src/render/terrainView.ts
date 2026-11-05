// Terreno por trozos: cada trozo se dibuja con más o menos vértices según lo lejos que
// quede del jugador. Solo existe en memoria la malla que se está usando. Un faldón oculta
// las rendijas entre trozos de distinto detalle. Suelo de tres capas con texturas de Blender.
import { Color3, Mesh, RawTexture, Texture, TransformNode, VertexData, type Scene } from '@babylonjs/core';
import { TerrainMaterial } from '@babylonjs/materials/terrain/terrainMaterial';
import { terrainLevel, type TerrainDetailDef } from '../world/detail';
import { computeSplat, type HeightField, type TerrainDef } from '../world/terrain';
import { staticTexture } from './staticModels';

const SKIRT = 1.5;
/** Mallas que se pueden rehacer por fotograma, para que cambiar de detalle no dé tirones. */
const BUILDS_PER_FRAME = 2;

function tileTexture(scene: Scene, name: string, tileMeters: number, zoneSize: number): Texture {
  const tex = staticTexture(scene, name);
  tex.anisotropicFilteringLevel = 8;
  tex.uScale = zoneSize / tileMeters;
  tex.vScale = zoneSize / tileMeters;
  return tex;
}

interface Chunk {
  x0: number;
  z0: number;
  size: number;
  level: number;
  mesh: Mesh | null;
}

export type GroundTint = (x: number, z: number) => readonly [number, number, number];

/** Malla de un trozo: rejilla de `step` metros más el faldón de su borde. */
function chunkData(def: TerrainDef, hf: HeightField, tint: GroundTint, c: Chunk, step: number): VertexData {
  const n = Math.round(c.size / step);
  const line = n + 1;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const e = hf.step;
  const vertex = (x: number, z: number, drop: number): void => {
    positions.push(x, hf.sample(x, z) - drop, z);
    const nx = hf.sample(x - e, z) - hf.sample(x + e, z);
    const nz = hf.sample(x, z - e) - hf.sample(x, z + e);
    const l = Math.hypot(nx, 2 * e, nz);
    normals.push(nx / l, (2 * e) / l, nz / l);
    uvs.push(x / def.width, z / def.depth);
    const t = tint(x, z);
    colors.push(t[0], t[1], t[2], 1);
  };
  for (let r = 0; r <= n; r++) for (let q = 0; q <= n; q++) vertex(c.x0 + q * step, c.z0 + r * step, 0);
  const at = (q: number, r: number): number => r * line + q;
  for (let r = 0; r < n; r++) {
    for (let q = 0; q < n; q++) {
      indices.push(at(q, r), at(q + 1, r), at(q + 1, r + 1), at(q, r), at(q + 1, r + 1), at(q, r + 1));
    }
  }
  // Faldón: cada arista del borde baja un poco. Se ve por los dos lados.
  const edge = (points: Array<[number, number]>): void => {
    for (let i = 0; i + 1 < points.length; i++) {
      const [q0, r0] = points[i]!;
      const [q1, r1] = points[i + 1]!;
      const low = positions.length / 3;
      vertex(c.x0 + q0 * step, c.z0 + r0 * step, SKIRT);
      vertex(c.x0 + q1 * step, c.z0 + r1 * step, SKIRT);
      const a = at(q0, r0);
      const b = at(q1, r1);
      indices.push(a, b, low + 1, a, low + 1, low, a, low + 1, b, a, low, low + 1);
    }
  };
  const span = Array.from({ length: n + 1 }, (_, i) => i);
  edge(span.map((i) => [i, 0]));
  edge(span.map((i) => [i, n]));
  edge(span.map((i) => [0, i]));
  edge(span.map((i) => [n, i]));
  const data = new VertexData();
  data.positions = positions;
  data.normals = normals;
  data.uvs = uvs;
  data.colors = colors;
  data.indices = indices;
  return data;
}

export class TerrainView {
  readonly root: TransformNode;
  readonly material: TerrainMaterial;
  private readonly chunks: Chunk[] = [];
  private primed = false;

  constructor(
    private readonly scene: Scene,
    private readonly def: TerrainDef,
    private readonly hf: HeightField,
    private readonly detail: TerrainDetailDef,
    private readonly tint: GroundTint,
    start: { x: number; y: number },
  ) {
    this.root = new TransformNode('terrain', scene);
    // UV: u = x / ancho, v = z / fondo → fila 0 del splat = z mínima.
    const res = def.splatResolution;
    const mat = new TerrainMaterial('terrainMat', scene);
    mat.mixTexture = RawTexture.CreateRGBATexture(computeSplat(def, hf), res, res, scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
    mat.diffuseTexture1 = tileTexture(scene, 'suelo_pasto', def.layers.grass.tileMeters, def.width);
    mat.diffuseTexture2 = tileTexture(scene, 'suelo_tierra', def.layers.dirt.tileMeters, def.width);
    mat.diffuseTexture3 = tileTexture(scene, 'suelo_camino', def.layers.path.tileMeters, def.width);
    mat.specularColor = new Color3(0.02, 0.02, 0.02);
    mat.specularPower = 16;
    mat.maxSimultaneousLights = 6;
    this.material = mat;
    const size = detail.chunkMeters;
    for (let z0 = 0; z0 < def.depth; z0 += size) {
      for (let x0 = 0; x0 < def.width; x0 += size) this.chunks.push({ x0, z0, size, level: -1, mesh: null });
    }
    this.update(start.x, start.y);
  }

  /** Vértices dibujados ahora mismo (para la medición). */
  get vertexCount(): number {
    return this.chunks.reduce((sum, c) => sum + (c.mesh?.getTotalVertices() ?? 0), 0);
  }

  get levels(): number[] {
    return this.chunks.map((c) => c.level);
  }

  update(px: number, pz: number): void {
    let budget = this.primed ? BUILDS_PER_FRAME : Infinity;
    this.primed = true;
    for (const c of this.chunks) {
      const dx = Math.max(c.x0 - px, 0, px - (c.x0 + c.size));
      const dz = Math.max(c.z0 - pz, 0, pz - (c.z0 + c.size));
      const level = terrainLevel(this.detail, Math.hypot(dx, dz), c.level);
      if (level === c.level) continue;
      if (budget-- <= 0) continue;
      this.setLevel(c, level);
    }
  }

  private setLevel(c: Chunk, level: number): void {
    c.mesh?.dispose(false, false);
    const mesh = new Mesh(`terrain:${c.x0}:${c.z0}`, this.scene);
    chunkData(this.def, this.hf, this.tint, c, Math.max(this.hf.step, this.detail.levels[level]!.step)).applyToMesh(mesh);
    mesh.parent = this.root;
    mesh.material = this.material;
    mesh.isPickable = false; // el clic se resuelve contra el campo de alturas, no contra la malla
    mesh.receiveShadows = true;
    mesh.freezeWorldMatrix();
    c.mesh = mesh;
    c.level = level;
  }
}
