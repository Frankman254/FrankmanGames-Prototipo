// Geometría estática hecha en Blender (assets/models/), lista antes de crear la escena.
// Las piezas que se repiten con thin instances no necesitan el cargador completo: nos basta
// con sus búferes, así que se leen una vez y cada vista crea su malla al momento.
// Los materiales los pone el juego, porque se tiñen por tema y llevan recorte de oclusión.
import { Mesh, Texture, VertexData, type Scene } from '@babylonjs/core';

const TEXTURES: Record<string, string> = import.meta.glob('/assets/textures/*.png', { query: '?url', import: 'default', eager: true });
const STATIC_FILES: Record<string, string> = import.meta.glob('/assets/models/{mazmorra,vegetacion,interiores,objetos}.glb', { query: '?url', import: 'default', eager: true });

export interface StaticGeometry {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array | null;
  indices: Uint32Array;
}

interface Accessor {
  bufferView: number;
  componentType: number;
  count: number;
  type: string;
  byteOffset?: number;
}

const COMPONENTS: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3 };
const GLB_MAGIC = 0x46546c67;

/** Lee las mallas de un GLB. Pasa de glTF (mano derecha) a Babylon (mano izquierda). */
export function parseStaticGlb(data: ArrayBuffer): Map<string, StaticGeometry> {
  const view = new DataView(data);
  if (view.getUint32(0, true) !== GLB_MAGIC) throw new Error('[modelos] no es un GLB');
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(data, 20, jsonLength))) as {
    nodes: Array<{ name: string; mesh?: number; translation?: number[]; rotation?: number[]; scale?: number[] }>;
    meshes: Array<{ primitives: Array<{ attributes: Record<string, number>; indices: number }> }>;
    accessors: Accessor[];
    bufferViews: Array<{ byteOffset?: number; byteLength: number; byteStride?: number }>;
  };
  const binStart = 20 + jsonLength + 8;
  const read = (index: number): Float32Array | Uint32Array => {
    const a = json.accessors[index]!;
    const bv = json.bufferViews[a.bufferView]!;
    const start = binStart + (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const n = a.count * COMPONENTS[a.type]!;
    if (a.componentType === 5126) return new Float32Array(data.slice(start, start + n * 4));
    if (a.componentType === 5125) return new Uint32Array(data.slice(start, start + n * 4));
    if (a.componentType === 5123) return Uint32Array.from(new Uint16Array(data.slice(start, start + n * 2)));
    throw new Error(`[modelos] tipo de dato no admitido: ${a.componentType}`);
  };
  const out = new Map<string, StaticGeometry>();
  for (const node of json.nodes) {
    if (node.mesh === undefined) continue;
    if (node.translation || node.rotation || node.scale) throw new Error(`[modelos] ${node.name}: la pieza debe tener su transformación aplicada`);
    const prim = json.meshes[node.mesh]!.primitives;
    if (prim.length !== 1) throw new Error(`[modelos] ${node.name}: una pieza lleva un solo material`);
    const p = prim[0]!;
    const positions = read(p.attributes['POSITION']!) as Float32Array;
    const normals = read(p.attributes['NORMAL']!) as Float32Array;
    for (let i = 2; i < positions.length; i += 3) {
      positions[i] = -positions[i]!;
      normals[i] = -normals[i]!;
    }
    let uvs: Float32Array | null = null;
    if (p.attributes['TEXCOORD_0'] !== undefined) {
      uvs = read(p.attributes['TEXCOORD_0']) as Float32Array;
      for (let i = 1; i < uvs.length; i += 2) uvs[i] = 1 - uvs[i]!;
    }
    // Al reflejar Z, el orden de los triángulos ya queda como lo espera Babylon.
    const indices = read(p.indices) as Uint32Array;
    out.set(node.name, { positions, normals, uvs, indices });
  }
  return out;
}

const library = new Map<string, StaticGeometry>();

/** Añade las piezas de un GLB ya leído. */
export function registerStaticGlb(data: ArrayBuffer): void {
  for (const [name, g] of parseStaticGlb(data)) library.set(name, g);
}

/** Se llama una vez al arrancar, antes de crear la escena. */
export async function loadStaticModels(): Promise<void> {
  await Promise.all(Object.values(STATIC_FILES).map(async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`[modelos] no se pudo leer ${url}: ${res.status}`);
    registerStaticGlb(await res.arrayBuffer());
  }));
}

/** Malla nueva con la geometría de una pieza. */
export function staticMesh(scene: Scene, piece: string, name = piece): Mesh {
  const g = library.get(piece);
  if (!g) throw new Error(`[modelos] falta la pieza ${piece}`);
  const mesh = new Mesh(name, scene);
  const v = new VertexData();
  v.positions = g.positions;
  v.normals = g.normals;
  if (g.uvs) v.uvs = g.uvs;
  v.indices = g.indices;
  v.applyToMesh(mesh);
  return mesh;
}

/** Textura de assets/textures/ que se repite. */
export function staticTexture(scene: Scene, name: string): Texture {
  const url = TEXTURES[`/assets/textures/${name}.png`];
  if (!url) throw new Error(`[modelos] falta la textura ${name}`);
  return new Texture(url, scene);
}
