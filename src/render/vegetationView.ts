// Vegetación con las piezas de Blender (scripts/blender/vegetacion.py). Cada tipo se dibuja
// con thin instances repartidas en trozos de `chunkMeters`. Según la distancia al jugador
// un trozo se dibuja entero, aclarado o nada (data/detail.json). El viento las mueve en el
// shader (WindPlugin).
import {
  Color3,
  Material,
  Matrix,
  Mesh,
  MeshBuilder,
  Quaternion,
  StandardMaterial,
  Vector3,
  type AbstractMesh,
  type Scene,
} from '@babylonjs/core';
import type { Vec2 } from '../sim/vec2';
import { ringFraction, type DetailDef, type VegetationRing } from '../world/detail';
import type { Overworld } from '../world/overworld';
import type { PropDef, ScatterInstance, ScatterKindDef } from '../world/scatter';
import type { HeightField } from '../world/terrain';
import { OcclusionPlugin } from './occlusion';
import { staticMesh } from './staticModels';
import { WindPlugin } from './windPlugin';

export interface LampPost {
  x: number;
  y: number;
  z: number;
}

export interface VegetationView {
  /** Mallas que proyectan sombra del sol. */
  casters: AbstractMesh[];
  /** Posición de la luz de cada farola (para el paso de luz y atmósfera). */
  lamps: LampPost[];
  /** Cajas sólidas de los props (casas, rocas grandes) para la cámara. */
  solids: Array<{ x: number; z: number; hw: number; hd: number; top: number }>;
  /** Material del farol: la luz del día/noche ajusta su emisión. */
  lanternMaterial: StandardMaterial;
  /** Todas las mallas (trozos de thin instances y props): se ocultan en interiores. */
  meshes: AbstractMesh[];
  /** Mallas dibujables (trozos de thin instances y props) para estadísticas. */
  meshCount: number;
  instanceCount: number;
  update(frameSeconds: number, playerX: number, playerZ: number): void;
  /** Escala las distancias de detalle (opción de visión). */
  setRange(scale: number): void;
  /** Ejemplares que se dibujan ahora mismo. */
  readonly drawnInstances: number;
  /** Visibilidad de escena; la densidad no puede reactivar el exterior dentro de una mazmorra. */
  setVisible(visible: boolean): void;
  /** Fracción (0–1) de la vegetación decorativa (hierba, flores, arbustos) que se dibuja. */
  setDensity(fraction: number): void;
}

/** Estado puro de un trozo decorativo según densidad y visibilidad de escena. */
export function vegetationChunkState(total: number, fraction: number, outdoorVisible: boolean): { count: number; enabled: boolean } {
  const f = Math.min(1, Math.max(0, fraction));
  const count = Math.round(total * f);
  return { count, enabled: outdoorVisible && count > 0 };
}

function material(scene: Scene, name: string, rgb: [number, number, number], wind: number): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = new Color3(...rgb);
  m.specularColor = new Color3(0.03, 0.03, 0.03);
  m.maxSimultaneousLights = 6;
  if (wind > 0) new WindPlugin(m, wind);
  return m;
}

/** Material que se recorta alrededor de los personajes cuando los tapa (árboles, rocas, casas). */
function occluding(m: StandardMaterial): StandardMaterial {
  new OcclusionPlugin(m);
  return m;
}

/** Hornea la transformación actual en los vértices y devuelve la malla. */
function baked(m: Mesh): Mesh {
  m.bakeCurrentTransformIntoVertices();
  return m;
}

function merge(name: string, parts: Mesh[]): Mesh {
  const m = Mesh.MergeMeshes(parts, true, true)!;
  m.name = name;
  return m;
}

interface ShapeParts {
  parts: Array<{ mesh: Mesh; castShadow: boolean }>;
}

function buildShape(scene: Scene, id: string, kind: ScatterKindDef): ShapeParts {
  const solid = kind.shape === 'tree' || kind.shape === 'rock';
  return {
    parts: kind.pieces.map((p) => {
      const mesh = staticMesh(scene, p.piece, `${id}:${p.piece}`);
      const m = material(scene, `${id}:${p.piece}:mat`, p.color, p.wind ?? kind.wind);
      // Hojas y briznas son láminas: se ven y se iluminan por las dos caras. Las copas,
      // cerradas, no: así la cámara ve a través de una que le quede encima.
      m.backFaceCulling = !p.thin;
      m.twoSidedLighting = !!p.thin;
      mesh.material = solid ? occluding(m) : m;
      return { mesh, castShadow: p.shadow };
    }),
  };
}

/**
 * Reparte las instancias en trozos y crea una copia de `base` por trozo. La
 * geometría se duplica: Babylon guarda los búferes de thin instances en la
 * geometría, así que dos mallas que la comparten se pisan las matrices.
 */
function instanceChunks(base: Mesh, items: readonly ScatterInstance[], chunk: number): Mesh[] {
  const groups = new Map<string, ScatterInstance[]>();
  for (const it of items) {
    const key = `${Math.floor(it.x / chunk)}_${Math.floor(it.z / chunk)}`;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = []));
    g.push(it);
  }
  const out: Mesh[] = [];
  const m = new Matrix();
  const q = new Quaternion();
  const s = new Vector3();
  const t = new Vector3();
  for (const [key, group] of groups) {
    // Orden mezclado (fijo por posición): las primeras N instancias de un trozo
    // quedan repartidas por todo él, así bajar la densidad no deja franjas.
    const list = [...group].sort((a, b) => spread(a) - spread(b));
    const mesh = base.clone(`${base.name}#${key}`, null, true, false);
    mesh.makeGeometryUnique();
    mesh.setEnabled(true);
    const mats = new Float32Array(list.length * 16);
    const cols = new Float32Array(list.length * 4);
    list.forEach((it, i) => {
      Quaternion.RotationYawPitchRollToRef(it.rotY, 0, 0, q);
      s.setAll(it.scale);
      t.set(it.x, it.y, it.z);
      Matrix.ComposeToRef(s, q, t, m);
      m.copyToArray(mats, i * 16);
      const tone = it.tone ?? WHITE;
      cols[i * 4] = it.tint * tone[0];
      cols[i * 4 + 1] = it.tint * tone[1];
      cols[i * 4 + 2] = it.tint * tone[2] * 0.96;
      cols[i * 4 + 3] = 1;
    });
    mesh.thinInstanceSetBuffer('matrix', mats, 16, true);
    mesh.thinInstanceSetBuffer('color', cols, 4, true);
    mesh.thinInstanceRefreshBoundingInfo(false);
    mesh.isPickable = false;
    mesh.freezeWorldMatrix();
    out.push(mesh);
  }
  base.setEnabled(false);
  return out;
}

/** Clave pseudoaleatoria y estable de una instancia (para mezclar el orden). */
function spread(it: ScatterInstance): number {
  const h = Math.sin(it.x * 12.9898 + it.z * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

/** Altura mínima del terreno bajo una huella (para que nada flote en pendiente). */
function groundUnder(hf: HeightField, p: Vec2, w: number, d: number): number {
  let lo = Infinity;
  for (const fx of [-0.5, 0, 0.5]) for (const fz of [-0.5, 0, 0.5]) lo = Math.min(lo, hf.sample(p.x + fx * w, p.y + fz * d));
  return lo;
}

function buildProps(
  scene: Scene,
  props: readonly PropDef[],
  hf: HeightField,
): { meshes: Mesh[]; lamps: LampPost[]; lanternMaterial: StandardMaterial; solids: VegetationView['solids'] } {
  const solids: VegetationView['solids'] = [];
  const logs: Mesh[] = [];
  const boulders: Mesh[] = [];
  const lamps: LampPost[] = [];
  props.forEach((p, i) => {
    if (p.kind === 'landmark') return; // lo dibuja LandmarkView
    const g = groundUnder(hf, p, p.w, p.d);
    if (p.kind === 'house') {
      // El modelo lo pone LandmarkView; aquí queda la caja sólida para la cámara.
      const wallH = 2.8 + (hf.sample(p.x, p.y) - g);
      solids.push({ x: p.x, z: p.y, hw: p.w / 2 + 0.3, hd: p.d / 2 + 0.3, top: g + wallH + 1.9 });
    } else if (p.kind === 'log') {
      const along = p.w >= p.d;
      const dia = Math.min(p.w, p.d) * 0.9;
      const l = MeshBuilder.CreateCylinder(`log${i}`, { height: Math.max(p.w, p.d), diameter: dia, tessellation: 9 }, scene);
      if (along) l.rotation.z = Math.PI / 2;
      else l.rotation.x = Math.PI / 2;
      l.position.set(p.x, hf.sample(p.x, p.y) + dia * 0.4, p.y);
      logs.push(baked(l));
    } else if (p.kind === 'boulder') {
      const b = staticMesh(scene, 'v_roca', `boulder${i}`);
      b.scaling.set(p.w / 1.4, Math.min(p.w, p.d) / 1.2, p.d / 1.4);
      b.rotation.y = i * 1.7;
      b.position.set(p.x, g - 0.1, p.y);
      solids.push({ x: p.x, z: p.y, hw: p.w / 2, hd: p.d / 2, top: g + Math.min(p.w, p.d) * 0.6 });
      boulders.push(baked(b));
    } else {
      const y0 = hf.sample(p.x, p.y);
      lamps.push({ x: p.x, y: y0 + 2.9, z: p.y });
    }
  });
  const meshes: Mesh[] = [];
  const add = (name: string, parts: Mesh[], mat: Material): void => {
    if (parts.length === 0) return;
    const m = merge(name, parts);
    m.material = mat;
    m.isPickable = false;
    m.receiveShadows = true;
    m.freezeWorldMatrix();
    meshes.push(m);
  };
  add('logs', logs, material(scene, 'logMat', [0.4, 0.29, 0.2], 0));
  add('boulders', boulders, occluding(material(scene, 'boulderMat', [0.47, 0.46, 0.44], 0)));
  const lanternMaterial = material(scene, 'lanternMat', [0.9, 0.8, 0.5], 0);
  return { meshes, lamps, lanternMaterial, solids };
}

interface Chunk {
  mesh: Mesh;
  total: number;
  ring: VegetationRing;
  decorative: boolean;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  shown: number;
}

const WHITE = [1, 1, 1] as const;

export function buildVegetation(scene: Scene, ow: Overworld, detail: DetailDef): VegetationView {
  const veg = ow.vegetation;
  WindPlugin.speed = veg.wind.speed;
  WindPlugin.strength = veg.wind.strength;

  const casters: AbstractMesh[] = [];
  const chunksOut: Chunk[] = [];
  const meshes: AbstractMesh[] = [];
  let meshCount = 0;
  let instanceCount = 0;
  for (const [id, items] of ow.scatter.byKind) {
    const kind = veg.kinds[id]!;
    const ring = detail.vegetation[kind.shape]!;
    const shape = buildShape(scene, id, kind);
    const decorative = kind.blockRadius === 0;
    for (const { mesh, castShadow } of shape.parts) {
      mesh.isPickable = false;
      const chunks = instanceChunks(mesh, items, veg.chunkMeters);
      for (const c of chunks) {
        const b = c.getBoundingInfo().boundingBox;
        chunksOut.push({ mesh: c, total: c.thinInstanceCount, ring, decorative, x0: b.minimumWorld.x, z0: b.minimumWorld.z, x1: b.maximumWorld.x, z1: b.maximumWorld.z, shown: -1 });
      }
      meshCount += chunks.length;
      meshes.push(...chunks);
      instanceCount += items.length;
      if (castShadow) casters.push(...chunks);
    }
  }
  const props = buildProps(scene, veg.props, ow.heights);
  casters.push(...props.meshes);
  meshes.push(...props.meshes);
  meshCount += props.meshes.length;
  let density = 1;
  let outdoorVisible = true;

  let rangeScale = 1;
  let px = ow.def.playerStart.x;
  let pz = ow.def.playerStart.y;
  let recheck = 0;
  const plain = new Set<AbstractMesh>(chunksOut.map((c) => c.mesh));

  const applyVisibility = (): void => {
    for (const c of chunksOut) {
      const d = Math.hypot(Math.max(c.x0 - px, 0, px - c.x1), Math.max(c.z0 - pz, 0, pz - c.z1));
      const f = ringFraction(c.ring, d, rangeScale) * (c.decorative ? density : 1);
      const state = vegetationChunkState(c.total, f, outdoorVisible);
      if (state.count === c.shown && c.mesh.isEnabled(false) === state.enabled) continue;
      c.shown = state.count;
      c.mesh.thinInstanceCount = state.count;
      c.mesh.setEnabled(state.enabled);
    }
    for (const mesh of meshes) if (!plain.has(mesh)) mesh.setEnabled(outdoorVisible);
  };

  return {
    casters,
    meshes,
    lamps: props.lamps,
    solids: props.solids,
    lanternMaterial: props.lanternMaterial,
    meshCount,
    instanceCount,
    update(frameSeconds: number, playerX: number, playerZ: number): void {
      WindPlugin.time += frameSeconds;
      px = playerX;
      pz = playerZ;
      // No hace falta cada fotograma: al paso del jugador apenas cambia nada.
      recheck -= frameSeconds;
      if (recheck > 0) return;
      recheck = 0.25;
      applyVisibility();
    },
    setRange(scale: number): void {
      rangeScale = scale;
      applyVisibility();
    },
    get drawnInstances(): number {
      return chunksOut.reduce((sum, c) => sum + (c.mesh.isEnabled(false) ? c.mesh.thinInstanceCount : 0), 0);
    },
    setVisible(visible: boolean): void {
      outdoorVisible = visible;
      applyVisibility();
    },
    setDensity(fraction: number): void {
      density = Math.min(1, Math.max(0, fraction));
      applyVisibility();
    },
  };
}
