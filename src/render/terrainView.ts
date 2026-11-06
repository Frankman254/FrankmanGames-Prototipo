// Terreno por páginas y trozos. Cada página trae su mezcla de suelo; cada trozo se dibuja con
// más o menos vértices según lo lejos que quede del jugador. Solo existe en memoria lo que se
// está usando: al alejarse la página, malla y textura se sueltan. Un faldón oculta las
// rendijas entre trozos de distinto detalle. Texturas de suelo de Blender.
import { Color3, Constants, Mesh, RawTexture, Texture, TransformNode, VertexData, type Scene } from '@babylonjs/core';
import { TerrainMaterial } from '@babylonjs/materials/terrain/terrainMaterial';
import { terrainLevel, type TerrainDetailDef } from '../world/detail';
import { pageKey, type PageData } from '../world/pages';
import type { WorldStream } from '../world/stream';
import type { HeightField, TerrainDef } from '../world/terrain';
import { staticTexture } from './staticModels';

const SKIRT = 1.5;
/** Mallas que se pueden rehacer por fotograma, para que cambiar de detalle no dé tirones. */
const BUILDS_PER_FRAME = 1;
/** Metros entre muestras del tinte de zona: cambia despacio y calcularlo cuesta. */
const TINT_CELL = 8;

function tileTexture(scene: Scene, name: string, tileMeters: number, pageMeters: number): Texture {
  const tex = staticTexture(scene, name);
  tex.wrapU = Constants.TEXTURE_WRAP_ADDRESSMODE;
  tex.wrapV = Constants.TEXTURE_WRAP_ADDRESSMODE;
  tex.anisotropicFilteringLevel = 8;
  tex.uScale = pageMeters / tileMeters;
  tex.vScale = pageMeters / tileMeters;
  return tex;
}

interface Chunk {
  x0: number;
  z0: number;
  size: number;
  level: number;
  mesh: Mesh | null;
}

interface Page {
  x0: number;
  z0: number;
  size: number;
  material: TerrainMaterial;
  chunks: Chunk[];
}

export type GroundTint = (x: number, z: number) => readonly [number, number, number];

export class TerrainView {
  readonly root: TransformNode;
  private readonly pages = new Map<string, Page>();
  private readonly tiles: { grass: Texture; dirt: Texture; path: Texture };
  private readonly tintCache = new Map<number, readonly [number, number, number]>();
  private primed = false;

  constructor(
    private readonly scene: Scene,
    def: TerrainDef & { playerStart: { x: number; y: number } },
    private readonly hf: HeightField,
    private readonly detail: TerrainDetailDef,
    private readonly tint: GroundTint,
    stream: WorldStream,
  ) {
    this.root = new TransformNode('terrain', scene);
    const size = stream.size;
    this.tiles = {
      grass: tileTexture(scene, 'suelo_pasto', def.layers.grass.tileMeters, size),
      dirt: tileTexture(scene, 'suelo_tierra', def.layers.dirt.tileMeters, size),
      path: tileTexture(scene, 'suelo_camino', def.layers.path.tileMeters, size),
    };
    stream.listen({ name: 'terreno', ready: (p) => this.addPage(p), released: (p) => this.removePage(p) });
    this.update(def.playerStart.x, def.playerStart.y);
  }

  /** Vértices dibujados ahora mismo (para la medición). */
  get vertexCount(): number {
    let n = 0;
    for (const p of this.pages.values()) for (const c of p.chunks) n += c.mesh?.getTotalVertices() ?? 0;
    return n;
  }

  get levels(): number[] {
    const out: number[] = [];
    for (const p of this.pages.values()) for (const c of p.chunks) out.push(c.level);
    return out;
  }

  get pageCount(): number {
    return this.pages.size;
  }

  private addPage(p: PageData): void {
    const mat = new TerrainMaterial(`terrain:${p.px}:${p.pz}`, this.scene);
    // UV: u = x / lado, v = z / lado → fila 0 de la mezcla = z mínima.
    mat.mixTexture = RawTexture.CreateRGBATexture(p.splat, p.splatRes, p.splatRes, this.scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
    mat.diffuseTexture1 = this.tiles.grass;
    mat.diffuseTexture2 = this.tiles.dirt;
    mat.diffuseTexture3 = this.tiles.path;
    mat.specularColor = new Color3(0.02, 0.02, 0.02);
    mat.specularPower = 16;
    mat.maxSimultaneousLights = 6;
    const chunks: Chunk[] = [];
    const size = this.detail.chunkMeters;
    for (let z = 0; z < p.size; z += size) {
      for (let x = 0; x < p.size; x += size) chunks.push({ x0: p.x0 + x, z0: p.z0 + z, size, level: -1, mesh: null });
    }
    this.pages.set(pageKey(p.px, p.pz), { x0: p.x0, z0: p.z0, size: p.size, material: mat, chunks });
  }

  private removePage(p: PageData): void {
    const key = pageKey(p.px, p.pz);
    const page = this.pages.get(key);
    if (!page) return;
    this.pages.delete(key);
    for (const c of page.chunks) c.mesh?.dispose(false, false);
    page.material.mixTexture?.dispose();
    page.material.dispose(false);
  }

  update(px: number, pz: number): void {
    let budget = this.primed ? BUILDS_PER_FRAME : Infinity;
    this.primed = true;
    for (const page of this.pages.values()) {
      for (const c of page.chunks) {
        const dx = Math.max(c.x0 - px, 0, px - (c.x0 + c.size));
        const dz = Math.max(c.z0 - pz, 0, pz - (c.z0 + c.size));
        const level = terrainLevel(this.detail, Math.hypot(dx, dz), c.level);
        if (level === c.level) continue;
        // Lo que aún no tiene malla va antes que lo que solo cambia de detalle.
        if (budget <= 0 && (c.mesh || budget <= -2)) continue;
        budget--;
        this.setLevel(page, c, level);
      }
    }
  }

  private tintAt(x: number, z: number): readonly [number, number, number] {
    const gx = Math.floor(x / TINT_CELL);
    const gz = Math.floor(z / TINT_CELL);
    const fx = x / TINT_CELL - gx;
    const fz = z / TINT_CELL - gz;
    const a = this.tintCell(gx, gz);
    const b = this.tintCell(gx + 1, gz);
    const c = this.tintCell(gx, gz + 1);
    const d = this.tintCell(gx + 1, gz + 1);
    const mix = (i: 0 | 1 | 2): number => (a[i] * (1 - fx) + b[i] * fx) * (1 - fz) + (c[i] * (1 - fx) + d[i] * fx) * fz;
    return [mix(0), mix(1), mix(2)];
  }

  private tintCell(gx: number, gz: number): readonly [number, number, number] {
    const key = gx * 100003 + gz;
    let t = this.tintCache.get(key);
    if (!t) this.tintCache.set(key, (t = this.tint(gx * TINT_CELL, gz * TINT_CELL)));
    return t;
  }

  private setLevel(page: Page, c: Chunk, level: number): void {
    c.mesh?.dispose(false, false);
    const mesh = new Mesh(`terrain:${c.x0}:${c.z0}`, this.scene);
    this.chunkData(page, c, Math.max(this.hf.step, this.detail.levels[level]!.step)).applyToMesh(mesh);
    mesh.parent = this.root;
    mesh.material = page.material;
    mesh.isPickable = false; // el clic se resuelve contra el campo de alturas, no contra la malla
    mesh.receiveShadows = true;
    mesh.freezeWorldMatrix();
    c.mesh = mesh;
    c.level = level;
  }

  /** Malla de un trozo: rejilla de `step` metros más el faldón de su borde. */
  private chunkData(page: Page, c: Chunk, step: number): VertexData {
    const hf = this.hf;
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
      uvs.push((x - page.x0) / page.size, (z - page.z0) / page.size);
      const t = this.tintAt(x, z);
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
}
