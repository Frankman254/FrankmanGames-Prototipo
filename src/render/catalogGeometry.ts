// Lectura de un catálogo GLB de piezas estáticas con varios materiales planos por pieza
// (detalle de suelo, costa, caminos rurales). Cada nodo sale como una sola geometría con
// el color de cada material horneado por vértice: así cientos de piezas distintas caben
// en una malla y un material. Puro: no usa el motor, se prueba con Vitest.

export interface CatalogGeometry {
  positions: Float32Array;
  normals: Float32Array;
  /** RGB por vértice, ya en el espacio de color en que pinta el material del juego. */
  colors: Float32Array;
  indices: Uint32Array;
  triangles: number;
  /** Caja de la pieza: mínimo y máximo en X, Y, Z. */
  min: [number, number, number];
  max: [number, number, number];
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

/** glTF guarda el color lineal; el material estándar del juego lo pinta tal cual. */
const toDisplay = (linear: number): number => Math.pow(Math.min(1, Math.max(0, linear)), 1 / 2.2);

/** Piezas de un GLB por nombre de nodo. Pasa de glTF (mano derecha) a Babylon (mano izquierda). */
export function parseCatalogGlb(data: ArrayBuffer): Map<string, CatalogGeometry> {
  const view = new DataView(data);
  if (view.getUint32(0, true) !== GLB_MAGIC) throw new Error('[catálogo] no es un GLB');
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(data, 20, jsonLength))) as {
    nodes: Array<{ name: string; mesh?: number; translation?: number[]; rotation?: number[]; scale?: number[] }>;
    meshes: Array<{ primitives: Array<{ attributes: Record<string, number>; indices: number; material?: number }> }>;
    materials?: Array<{ pbrMetallicRoughness?: { baseColorFactor?: number[] } }>;
    accessors: Accessor[];
    bufferViews: Array<{ byteOffset?: number; byteLength: number; byteStride?: number }>;
  };
  const binStart = 20 + jsonLength + 8;
  const read = (index: number): Float32Array | Uint32Array => {
    const a = json.accessors[index]!;
    const bv = json.bufferViews[a.bufferView]!;
    if (bv.byteStride) throw new Error('[catálogo] no se admiten búferes intercalados');
    const start = binStart + (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const n = a.count * COMPONENTS[a.type]!;
    if (a.componentType === 5126) return new Float32Array(data.slice(start, start + n * 4));
    if (a.componentType === 5125) return new Uint32Array(data.slice(start, start + n * 4));
    if (a.componentType === 5123) return Uint32Array.from(new Uint16Array(data.slice(start, start + n * 2)));
    throw new Error(`[catálogo] tipo de dato no admitido: ${a.componentType}`);
  };
  const out = new Map<string, CatalogGeometry>();
  for (const node of json.nodes) {
    if (node.mesh === undefined) continue;
    if (node.translation || node.rotation || node.scale) throw new Error(`[catálogo] ${node.name}: la pieza debe tener su transformación aplicada`);
    const parts = json.meshes[node.mesh]!.primitives.map((p) => {
      const positions = read(p.attributes['POSITION']!) as Float32Array;
      const normals = read(p.attributes['NORMAL']!) as Float32Array;
      const base = json.materials?.[p.material ?? -1]?.pbrMetallicRoughness?.baseColorFactor ?? [1, 1, 1, 1];
      return { positions, normals, indices: read(p.indices) as Uint32Array, color: [toDisplay(base[0]!), toDisplay(base[1]!), toDisplay(base[2]!)] as const };
    });
    const vertices = parts.reduce((n, p) => n + p.positions.length / 3, 0);
    const positions = new Float32Array(vertices * 3);
    const normals = new Float32Array(vertices * 3);
    const colors = new Float32Array(vertices * 3);
    const indices = new Uint32Array(parts.reduce((n, p) => n + p.indices.length, 0));
    const min: [number, number, number] = [Infinity, Infinity, Infinity];
    const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    let v = 0;
    let i = 0;
    for (const p of parts) {
      for (let k = 0; k < p.positions.length; k += 3) {
        const o = (v + k / 3) * 3;
        // Reflejar Z cambia de mano; el orden de los triángulos ya queda como lo espera Babylon.
        const at = [p.positions[k]!, p.positions[k + 1]!, -p.positions[k + 2]!] as const;
        positions.set(at, o);
        normals.set([p.normals[k]!, p.normals[k + 1]!, -p.normals[k + 2]!], o);
        colors.set(p.color, o);
        for (let a = 0; a < 3; a++) {
          min[a] = Math.min(min[a]!, at[a]!);
          max[a] = Math.max(max[a]!, at[a]!);
        }
      }
      for (let k = 0; k < p.indices.length; k++) indices[i + k] = p.indices[k]! + v;
      v += p.positions.length / 3;
      i += p.indices.length;
    }
    out.set(node.name, { positions, normals, colors, indices, triangles: indices.length / 3, min, max });
  }
  return out;
}

/** Una copia de una pieza en el mundo. */
export interface CatalogInstance {
  geometry: CatalogGeometry;
  x: number;
  /** Altura a la que se apoya el origen de la pieza. */
  y: number;
  z: number;
  scale: number;
  rotY: number;
  /** Multiplicador de color. */
  tint: number;
  /** Pendiente del suelo (m/m): la pieza se recuesta sobre ella sin inclinar sus verticales. */
  slopeX: number;
  slopeZ: number;
}

export interface MergedGeometry {
  positions: Float32Array;
  normals: Float32Array;
  /** RGBA por vértice. */
  colors: Float32Array;
  indices: Uint32Array;
  /** Índices acumulados tras cada copia: dibujar las N primeras es cortar ahí. */
  indexEnd: Uint32Array;
}

/**
 * Hornea las copias en una sola geometría, en el orden dado. El giro es el de
 * `rotateLocal` (src/world/ambient.ts): con rotY = 0, X local es +X del mundo.
 */
export function mergeCatalogInstances(items: readonly CatalogInstance[]): MergedGeometry {
  let vertices = 0;
  let indexCount = 0;
  for (const it of items) {
    vertices += it.geometry.positions.length / 3;
    indexCount += it.geometry.indices.length;
  }
  const positions = new Float32Array(vertices * 3);
  const normals = new Float32Array(vertices * 3);
  const colors = new Float32Array(vertices * 4);
  const indices = new Uint32Array(indexCount);
  const indexEnd = new Uint32Array(items.length);
  let v = 0;
  let i = 0;
  items.forEach((it, n) => {
    const g = it.geometry;
    const c = Math.cos(it.rotY);
    const s = Math.sin(it.rotY);
    const count = g.positions.length / 3;
    for (let k = 0; k < count; k++) {
      const lx = g.positions[k * 3]! * it.scale;
      const ly = g.positions[k * 3 + 1]! * it.scale;
      const lz = g.positions[k * 3 + 2]! * it.scale;
      const ox = lx * c + lz * s;
      const oz = -lx * s + lz * c;
      const o = (v + k) * 3;
      positions[o] = it.x + ox;
      positions[o + 1] = it.y + ly + it.slopeX * ox + it.slopeZ * oz;
      positions[o + 2] = it.z + oz;
      const nx = g.normals[k * 3]!;
      const nz = g.normals[k * 3 + 2]!;
      normals[o] = nx * c + nz * s;
      normals[o + 1] = g.normals[k * 3 + 1]!;
      normals[o + 2] = -nx * s + nz * c;
      const q = (v + k) * 4;
      colors[q] = g.colors[k * 3]! * it.tint;
      colors[q + 1] = g.colors[k * 3 + 1]! * it.tint;
      colors[q + 2] = g.colors[k * 3 + 2]! * it.tint;
      colors[q + 3] = 1;
    }
    for (let k = 0; k < g.indices.length; k++) indices[i + k] = g.indices[k]! + v;
    v += count;
    i += g.indices.length;
    indexEnd[n] = i;
  });
  return { positions, normals, colors, indices, indexEnd };
}
