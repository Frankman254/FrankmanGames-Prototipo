// Vegetación con las piezas de Blender (scripts/blender/vegetacion.py). Cada tipo se dibuja
// con thin instances repartidas en trozos de `chunkMeters`. Según la distancia al jugador
// un trozo se dibuja entero, aclarado o nada (data/detail.json). El viento las mueve en el
// shader (WindPlugin).
import {
  Color3,
  Matrix,
  Mesh,
  Quaternion,
  StandardMaterial,
  Vector3,
  type AbstractMesh,
  type Scene,
} from '@babylonjs/core';
import type { Vec2 } from '../sim/vec2';
import { ringFraction, type DetailDef, type VegetationRing } from '../world/detail';
import type { Overworld } from '../world/overworld';
import { INSTANCE_STRIDE, pageKey, type PageData } from '../world/pages';
import type { PropDef, ScatterInstance, ScatterKindDef } from '../world/scatter';
import { atlasToShape } from '../world/pageContext';
import { terrainHeight } from '../world/terrain';
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
  readonly meshCount: number;
  readonly instanceCount: number;
  /** Mallas por crear de las páginas recién llegadas. */
  readonly pendingBuilds: number;
  /** Quien recibe las mallas que proyectan sombra, que ahora van y vienen. */
  bindShadows(host: ShadowHost): void;
  update(frameSeconds: number, playerX: number, playerZ: number): void;
  /** Escala las distancias de detalle (opción de visión). */
  setRange(scale: number): void;
  /** Ejemplares que se dibujan ahora mismo. */
  readonly drawnInstances: number;
  /** Visibilidad de escena; la densidad no puede reactivar el exterior dentro de una mazmorra. */
  setVisible(visible: boolean): void;
  /** Fracción (0–1) de la vegetación decorativa (hierba, flores, arbustos) que se dibuja. */
  setDensity(fraction: number): void;
  /** Modo edición: rehace las cajas sólidas y las luces de los props puestos a mano. */
  refreshProps(): void;
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

/** Reparte las instancias en trozos de `chunk` metros. */
function groupByChunk(items: readonly ScatterInstance[], chunk: number): ScatterInstance[][] {
  const groups = new Map<string, ScatterInstance[]>();
  for (const it of items) {
    const key = `${Math.floor(it.x / chunk)}_${Math.floor(it.z / chunk)}`;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = []));
    g.push(it);
  }
  return [...groups.values()];
}

function unpack(data: Float32Array): ScatterInstance[] {
  const out: ScatterInstance[] = [];
  for (let i = 0; i < data.length; i += INSTANCE_STRIDE) {
    out.push({ x: data[i]!, y: data[i + 1]!, z: data[i + 2]!, scale: data[i + 3]!, rotY: data[i + 4]!, tint: data[i + 5]!, tone: [data[i + 6]!, data[i + 7]!, data[i + 8]!] });
  }
  return out;
}

function filterInPlace<T>(list: T[], keep: (item: T) => boolean): void {
  let n = 0;
  for (const item of list) if (keep(item)) list[n++] = item;
  list.length = n;
}

/**
 * Una copia de `base` con las instancias de un trozo. Cada una tiene su geometría:
 * dos mallas que la comparten se pisan las matrices.
 */
function instanceChunk(base: Mesh, group: readonly ScatterInstance[]): Mesh {
  const m = new Matrix();
  const q = new Quaternion();
  const s = new Vector3();
  const t = new Vector3();
  // Orden mezclado (fijo por posición): las primeras N instancias de un trozo
  // quedan repartidas por todo él, así bajar la densidad no deja franjas.
  const list = [...group].sort((a, b) => spread(a) - spread(b));
  const first = list[0]!;
  const mesh = base.clone(`${base.name}#${Math.floor(first.x)}_${Math.floor(first.z)}`, null, true, false);
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
  return mesh;
}

/** Clave pseudoaleatoria y estable de una instancia (para mezclar el orden). */
function spread(it: ScatterInstance): number {
  const h = Math.sin(it.x * 12.9898 + it.z * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

type Ground = { sample(x: number, z: number): number };

/** Altura mínima del terreno bajo una huella (para que nada flote en pendiente). */
function groundUnder(hf: Ground, p: Vec2, w: number, d: number): number {
  let lo = Infinity;
  for (const fx of [-0.5, 0, 0.5]) for (const fz of [-0.5, 0, 0.5]) lo = Math.min(lo, hf.sample(p.x + fx * w, p.y + fz * d));
  return lo;
}

function buildProps(
  scene: Scene,
  props: readonly PropDef[],
  hf: Ground,
): { meshes: Mesh[]; lamps: LampPost[]; lanternMaterial: StandardMaterial; solids: VegetationView['solids'] } {
  const solids: VegetationView['solids'] = [];
  const lamps: LampPost[] = [];
  props.forEach((p) => {
    if (p.kind === 'landmark') return; // lo dibuja LandmarkView
    const g = groundUnder(hf, p, p.w, p.d);
    if (p.kind === 'house') {
      // El modelo lo pone LandmarkView; aquí queda la caja sólida para la cámara.
      const wallH = 2.8 + (hf.sample(p.x, p.y) - g);
      solids.push({ x: p.x, z: p.y, hw: p.w / 2 + 0.3, hd: p.d / 2 + 0.3, top: g + wallH + 1.9 });
    } else if (p.kind === 'log') {
      // El catálogo `naturaleza_suelo.glb` lo dibuja LandmarkView; aquí sólo
      // conservamos su volumen para cámara y navegación.
      solids.push({ x: p.x, z: p.y, hw: p.w / 2, hd: p.d / 2, top: g + Math.min(p.w, p.d) * 0.8 });
    } else if (p.kind === 'boulder') {
      solids.push({ x: p.x, z: p.y, hw: p.w / 2, hd: p.d / 2, top: g + Math.min(p.w, p.d) * 0.6 });
    } else {
      const y0 = hf.sample(p.x, p.y);
      lamps.push({ x: p.x, y: y0 + 2.9, z: p.y });
    }
  });
  const meshes: Mesh[] = [];
  const lanternMaterial = material(scene, 'lanternMat', [0.9, 0.8, 0.5], 0);
  return { meshes, lamps, lanternMaterial, solids };
}

interface Chunk {
  mesh: Mesh;
  total: number;
  ring: VegetationRing;
  decorative: boolean;
  castShadow: boolean;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  shown: number;
}

const WHITE = [1, 1, 1] as const;
/** Milisegundos por fotograma para crear las mallas de páginas nuevas. */
const BUILD_BUDGET_MS = 2;

export interface ShadowHost {
  addCasters(meshes: readonly AbstractMesh[]): void;
  removeCasters(meshes: readonly AbstractMesh[]): void;
}

export function buildVegetation(scene: Scene, ow: Overworld, detail: DetailDef): VegetationView {
  const veg = ow.vegetation;
  WindPlugin.speed = veg.wind.speed;
  WindPlugin.strength = veg.wind.strength;

  const casters: AbstractMesh[] = [];
  const chunksOut: Chunk[] = [];
  const meshes: AbstractMesh[] = [];
  let meshCount = 0;
  let instanceCount = 0;
  let shadows: ShadowHost | null = null;
  const shapes = new Map<string, ReturnType<typeof buildShape>>();
  for (const [id, kind] of Object.entries(veg.kinds)) {
    const shape = buildShape(scene, id, kind);
    for (const part of shape.parts) {
      part.mesh.isPickable = false;
      part.mesh.setEnabled(false);
    }
    shapes.set(id, shape);
  }
  /** Mallas de cada página, para soltarlas al alejarse. */
  const pageChunks = new Map<string, Chunk[]>();
  /** Trabajo pendiente: crear mallas se reparte entre fotogramas. */
  const queue: Array<() => void> = [];

  const addPage = (page: PageData): void => {
    const key = pageKey(page.px, page.pz);
    const own: Chunk[] = [];
    pageChunks.set(key, own);
    for (const [id, data] of Object.entries(page.kinds)) {
      const kind = veg.kinds[id]!;
      const ring = detail.vegetation[kind.shape]!;
      const decorative = kind.blockRadius === 0;
      const items = unpack(data);
      instanceCount += items.length;
      for (const { mesh, castShadow } of shapes.get(id)!.parts) {
        const groups = groupByChunk(items, veg.chunkMeters);
        for (const group of groups) {
          queue.push(() => {
            // La página pudo soltarse antes de que le tocara.
            if (pageChunks.get(key) !== own) return;
            const c = instanceChunk(mesh, group);
            const b = c.getBoundingInfo().boundingBox;
            const chunk: Chunk = { mesh: c, total: group.length, ring, decorative, castShadow, x0: b.minimumWorld.x, z0: b.minimumWorld.z, x1: b.maximumWorld.x, z1: b.maximumWorld.z, shown: -1 };
            own.push(chunk);
            chunksOut.push(chunk);
            meshes.push(c);
            meshCount++;
            if (castShadow) {
              casters.push(c);
              shadows?.addCasters([c]);
            }
            applyChunk(chunk);
          });
        }
      }
    }
  };

  const removePage = (page: PageData): void => {
    const key = pageKey(page.px, page.pz);
    const own = pageChunks.get(key);
    if (!own) return;
    pageChunks.delete(key);
    for (const data of Object.values(page.kinds)) instanceCount -= data.length / INSTANCE_STRIDE;
    if (own.length === 0) return;
    const gone = new Set<AbstractMesh>(own.map((c) => c.mesh));
    if (shadows) shadows.removeCasters(own.filter((c) => c.castShadow).map((c) => c.mesh));
    filterInPlace(casters, (m) => !gone.has(m));
    filterInPlace(meshes, (m) => !gone.has(m));
    filterInPlace(chunksOut, (c) => !gone.has(c.mesh));
    meshCount -= own.length;
    for (const c of own) c.mesh.dispose(false, false);
  };

  // Con el terreno calculado: los props lejanos se miden antes de que llegue su página.
  // `lamps` y `solids` son arreglos persistentes: Atmosphere y la cámara guardan su
  // referencia, así que el modo edición los rellena en sitio (`refreshProps`).
  const shape = atlasToShape(ow.stream.ctx);
  let props = buildProps(scene, ow.vegetation.props, { sample: (x, z) => terrainHeight(ow.def, x, z, shape) });
  const lamps = props.lamps;
  const solids = props.solids;
  casters.push(...props.meshes);
  meshes.push(...props.meshes);
  meshCount += props.meshes.length;
  let density = 1;
  let outdoorVisible = true;

  let rangeScale = 1;
  let px = ow.def.playerStart.x;
  let pz = ow.def.playerStart.y;
  let recheck = 0;
  const propMeshes = props.meshes;

  function applyChunk(c: Chunk): void {
    const d = Math.hypot(Math.max(c.x0 - px, 0, px - c.x1), Math.max(c.z0 - pz, 0, pz - c.z1));
    const f = ringFraction(c.ring, d, rangeScale) * (c.decorative ? density : 1);
    const state = vegetationChunkState(c.total, f, outdoorVisible);
    if (state.count === c.shown && c.mesh.isEnabled(false) === state.enabled) return;
    c.shown = state.count;
    c.mesh.thinInstanceCount = state.count;
    c.mesh.setEnabled(state.enabled);
  }

  const applyVisibility = (): void => {
    for (const c of chunksOut) applyChunk(c);
    for (const mesh of propMeshes) mesh.setEnabled(outdoorVisible);
  };

  ow.stream.listen({ name: 'vegetación', ready: addPage, released: removePage });
  // Lo que ya estaba cargado se dibuja de golpe: aún no hay partida en marcha.
  for (const job of queue.splice(0)) job();

  return {
    casters,
    meshes,
    lamps: props.lamps,
    solids: props.solids,
    lanternMaterial: props.lanternMaterial,
    get meshCount(): number {
      return meshCount;
    },
    get instanceCount(): number {
      return instanceCount;
    },
    update(frameSeconds: number, playerX: number, playerZ: number): void {
      WindPlugin.time += frameSeconds;
      px = playerX;
      pz = playerZ;
      // No hace falta cada fotograma: al paso del jugador apenas cambia nada.
      const budgetEnd = performance.now() + BUILD_BUDGET_MS;
      while (queue.length > 0 && performance.now() < budgetEnd) queue.shift()!();
      recheck -= frameSeconds;
      if (recheck > 0) return;
      recheck = 0.25;
      applyVisibility();
    },
    setRange(scale: number): void {
      rangeScale = scale;
      applyVisibility();
    },
    bindShadows(host: ShadowHost): void {
      shadows = host;
    },
    get pendingBuilds(): number {
      return queue.length;
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
    refreshProps(): void {
      // Modo edición: casas, rocas y farolas nuevas o movidas. Las cajas para la
      // cámara y las luces se rellenan en sitio (las comparten rig y Atmosphere).
      const current = buildProps(scene, ow.vegetation.props, { sample: (x, z) => terrainHeight(ow.def, x, z, atlasToShape(ow.stream.ctx)) });
      props = current;
      lamps.length = 0;
      lamps.push(...current.lamps);
      solids.length = 0;
      solids.push(...current.solids);
    },
  };
}
