// Vegetación y props hechos con geometría y texturas generadas por código.
// Cada tipo se dibuja con thin instances repartidas en trozos de `chunkMeters`
// para que la cámara descarte los que no ve. Hojas, flores y hierba son tarjetas
// con recorte alfa; el viento las mueve en el shader (WindPlugin).
import {
  Color3,
  DynamicTexture,
  Material,
  Matrix,
  Mesh,
  MeshBuilder,
  Quaternion,
  StandardMaterial,
  Vector3,
  VertexBuffer,
  type AbstractMesh,
  type Scene,
} from '@babylonjs/core';
import { Rng } from '../sim/rng';
import type { Vec2 } from '../sim/vec2';
import { valueNoise } from '../world/noise';
import type { Overworld } from '../world/overworld';
import type { PropDef, ScatterInstance, ScatterShape } from '../world/scatter';
import type { HeightField } from '../world/terrain';
import { OcclusionPlugin } from './occlusion';
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
  update(frameSeconds: number): void;
  /** Fracción (0–1) de la vegetación decorativa (hierba, flores, arbustos) que se dibuja. */
  setDensity(fraction: number): void;
}

type Draw = (ctx: CanvasRenderingContext2D, size: number, rng: Rng) => void;

function canvasTexture(scene: Scene, name: string, size: number, seed: number, draw: Draw): DynamicTexture {
  const tex = new DynamicTexture(name, { width: size, height: size }, scene, true);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, size, size);
  draw(ctx, size, new Rng(seed));
  tex.update(false);
  tex.hasAlpha = true;
  return tex;
}

const drawLeaves: Draw = (ctx, size, rng) => {
  for (let i = 0; i < 170; i++) {
    const a = rng.next() * Math.PI * 2;
    const r = Math.sqrt(rng.next()) * size * 0.42;
    const x = size / 2 + Math.cos(a) * r;
    const y = size / 2 + Math.sin(a) * r;
    const l = 7 + rng.next() * 9;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rng.next() * Math.PI);
    ctx.fillStyle = `hsl(${90 + rng.next() * 30}, ${40 + rng.next() * 20}%, ${26 + rng.next() * 22}%)`;
    ctx.beginPath();
    ctx.ellipse(0, 0, l, l * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

const drawGrass: Draw = (ctx, size, rng) => {
  for (let i = 0; i < 26; i++) {
    const x = size * (0.1 + rng.next() * 0.8);
    const h = size * (0.45 + rng.next() * 0.5);
    const bend = (rng.next() - 0.5) * size * 0.25;
    const w = 2 + rng.next() * 3;
    ctx.fillStyle = `hsl(${85 + rng.next() * 25}, ${45 + rng.next() * 15}%, ${28 + rng.next() * 18}%)`;
    ctx.beginPath();
    ctx.moveTo(x - w, size);
    ctx.quadraticCurveTo(x + bend * 0.3, size - h * 0.5, x + bend, size - h);
    ctx.quadraticCurveTo(x + bend * 0.3 + w * 0.5, size - h * 0.5, x + w, size);
    ctx.fill();
  }
};

const drawFlowers: Draw = (ctx, size, rng) => {
  const petals = ['#f4f1e8', '#f2d24b', '#b78ad8', '#e0605a', '#f0a0c0'];
  for (let i = 0; i < 7; i++) {
    const x = size * (0.15 + rng.next() * 0.7);
    const h = size * (0.35 + rng.next() * 0.5);
    ctx.strokeStyle = '#4c7a2c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, size);
    ctx.lineTo(x + (rng.next() - 0.5) * 8, size - h);
    ctx.stroke();
    ctx.fillStyle = petals[Math.floor(rng.next() * petals.length)]!;
    ctx.beginPath();
    ctx.arc(x, size - h, 4 + rng.next() * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e9c23c';
    ctx.beginPath();
    ctx.arc(x, size - h, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
};

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

function cardMaterial(scene: Scene, name: string, tex: DynamicTexture, wind: number): StandardMaterial {
  const m = material(scene, name, [1, 1, 1], wind);
  m.diffuseTexture = tex;
  // Con color por instancia el recorte se evalúa al final y necesita el alfa de la textura.
  m.useAlphaFromDiffuseTexture = true;
  m.transparencyMode = Material.MATERIAL_ALPHATEST;
  m.alphaCutOff = 0.45;
  m.backFaceCulling = false;
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

/**
 * Tarjetas verticales cruzadas con la base en y = 0. Normales hacia arriba:
 * así la hierba se ilumina como el suelo en vez de oscurecerse de canto.
 */
function crossedCards(scene: Scene, name: string, w: number, h: number, count: number): Mesh {
  const parts: Mesh[] = [];
  for (let i = 0; i < count; i++) {
    const p = MeshBuilder.CreatePlane(`${name}${i}`, { width: w, height: h }, scene);
    p.position.y = h / 2;
    p.rotation.y = (i * Math.PI) / count;
    parts.push(baked(p));
  }
  const m = merge(name, parts);
  const n = new Float32Array(m.getTotalVertices() * 3);
  for (let i = 1; i < n.length; i += 3) n[i] = 1;
  m.setVerticesData(VertexBuffer.NormalKind, n);
  return m;
}

/**
 * Copa de hojas: tarjetas repartidas en una esfera, con normales «esféricas»
 * (apuntan hacia fuera desde el centro) para que la copa se ilumine como un volumen.
 */
function foliageCluster(scene: Scene, name: string, cards: number, radius: number, cardSize: number, center: Vector3, seed: number): Mesh {
  const rng = new Rng(seed);
  const parts: Mesh[] = [];
  for (let i = 0; i < cards; i++) {
    const p = MeshBuilder.CreatePlane(`${name}${i}`, { size: cardSize }, scene);
    const a = rng.next() * Math.PI * 2;
    const e = (rng.next() - 0.35) * Math.PI * 0.7;
    const r = radius * (0.35 + 0.65 * rng.next());
    p.position.set(center.x + Math.cos(a) * Math.cos(e) * r, center.y + Math.sin(e) * r * 0.8, center.z + Math.sin(a) * Math.cos(e) * r);
    p.rotation.set((rng.next() - 0.5) * 1.2, rng.next() * Math.PI * 2, (rng.next() - 0.5) * 0.6);
    parts.push(baked(p));
  }
  const m = merge(name, parts);
  const pos = m.getVerticesData(VertexBuffer.PositionKind)!;
  const nrm = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 3) {
    const v = new Vector3(pos[i]! - center.x, (pos[i + 1]! - center.y) * 1.3 + radius * 0.3, pos[i + 2]! - center.z).normalize();
    nrm[i] = v.x;
    nrm[i + 1] = v.y;
    nrm[i + 2] = v.z;
  }
  m.setVerticesData(VertexBuffer.NormalKind, nrm);
  return m;
}

function trunk(scene: Scene, name: string, height: number, base: number): Mesh {
  const t = MeshBuilder.CreateCylinder(name, { height, diameterBottom: base, diameterTop: base * 0.6, tessellation: 7 }, scene);
  t.position.y = height / 2 - 0.15;
  return baked(t);
}

function pineCrown(scene: Scene, name: string): Mesh {
  const parts: Mesh[] = [];
  const tiers: Array<[number, number, number]> = [[1.0, 2.6, 2.2], [2.1, 2.1, 1.9], [3.1, 1.5, 1.6]];
  tiers.forEach(([y, d, h], i) => {
    const c = MeshBuilder.CreateCylinder(`${name}${i}`, { height: h, diameterBottom: d, diameterTop: 0, tessellation: 8 }, scene);
    c.position.y = y + h / 2;
    parts.push(baked(c));
  });
  return merge(name, parts);
}

/** Roca de baja poligonización: icosaedro deformado con ruido y sombreado plano. */
function rockMesh(scene: Scene, name: string, seed: number): Mesh {
  const m = MeshBuilder.CreateIcoSphere(name, { radius: 0.8, subdivisions: 2, flat: false }, scene);
  const pos = m.getVerticesData(VertexBuffer.PositionKind)!;
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i]!;
    const y = pos[i + 1]!;
    const z = pos[i + 2]!;
    const k = 0.75 + 0.5 * valueNoise(x * 2.1 + z * 0.7 + 10, y * 2.3 + z * 1.9, seed);
    pos[i] = x * k;
    pos[i + 1] = y * k * 0.62 + 0.2;
    pos[i + 2] = z * k;
  }
  m.updateVerticesData(VertexBuffer.PositionKind, pos);
  m.convertToFlatShadedMesh();
  return m;
}

interface ShapeParts {
  parts: Array<{ mesh: Mesh; castShadow: boolean }>;
}

function buildShape(scene: Scene, id: string, shape: ScatterShape, wind: number, tex: { leaves: DynamicTexture; grass: DynamicTexture; flowers: DynamicTexture }): ShapeParts {
  const bark = (): StandardMaterial => occluding(material(scene, `${id}Bark`, [0.36, 0.26, 0.18], wind));
  switch (shape) {
    case 'pine': {
      const t = trunk(scene, `${id}Trunk`, 1.6, 0.42);
      t.material = bark();
      const c = pineCrown(scene, `${id}Crown`);
      c.material = occluding(material(scene, `${id}CrownMat`, [0.17, 0.33, 0.19], wind));
      return { parts: [{ mesh: t, castShadow: true }, { mesh: c, castShadow: true }] };
    }
    case 'broadleaf': {
      const t = trunk(scene, `${id}Trunk`, 2.8, 0.5);
      t.material = bark();
      const f = foliageCluster(scene, `${id}Leaves`, 22, 1.5, 1.9, new Vector3(0, 3.3, 0), 11);
      f.material = occluding(cardMaterial(scene, `${id}LeavesMat`, tex.leaves, wind));
      return { parts: [{ mesh: t, castShadow: true }, { mesh: f, castShadow: true }] };
    }
    case 'bush': {
      const f = foliageCluster(scene, `${id}Leaves`, 9, 0.6, 1.1, new Vector3(0, 0.55, 0), 23);
      f.material = cardMaterial(scene, `${id}LeavesMat`, tex.leaves, wind);
      return { parts: [{ mesh: f, castShadow: true }] };
    }
    case 'rock': {
      const r = rockMesh(scene, `${id}Rock`, 5);
      r.material = occluding(material(scene, `${id}Mat`, [0.46, 0.45, 0.43], 0));
      return { parts: [{ mesh: r, castShadow: true }] };
    }
    case 'flower': {
      const f = crossedCards(scene, `${id}Cards`, 0.55, 0.45, 2);
      f.material = cardMaterial(scene, `${id}Mat`, tex.flowers, wind);
      return { parts: [{ mesh: f, castShadow: false }] };
    }
    case 'grass': {
      const g = crossedCards(scene, `${id}Cards`, 0.7, 0.45, 3);
      g.material = cardMaterial(scene, `${id}Mat`, tex.grass, wind);
      return { parts: [{ mesh: g, castShadow: false }] };
    }
  }
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
      cols[i * 4] = it.tint;
      cols[i * 4 + 1] = it.tint;
      cols[i * 4 + 2] = it.tint * 0.96;
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
  const walls: Mesh[] = [];
  const roofs: Mesh[] = [];
  const trims: Mesh[] = [];
  const logs: Mesh[] = [];
  const boulders: Mesh[] = [];
  const posts: Mesh[] = [];
  const lanterns: Mesh[] = [];
  const lamps: LampPost[] = [];
  props.forEach((p, i) => {
    const g = groundUnder(hf, p, p.w, p.d);
    if (p.kind === 'house') {
      const wallH = 2.8 + (hf.sample(p.x, p.y) - g);
      const w = MeshBuilder.CreateBox(`house${i}`, { width: p.w, depth: p.d, height: wallH + 0.3 }, scene);
      w.position.set(p.x, g - 0.3 + (wallH + 0.3) / 2, p.y);
      walls.push(baked(w));
      // Tejado a dos aguas: prisma triangular con la cumbrera a lo largo del lado largo.
      const along = p.w >= p.d;
      const len = (along ? p.w : p.d) + 0.6;
      const span = (along ? p.d : p.w) + 0.7;
      const roofH = 1.6;
      solids.push({ x: p.x, z: p.y, hw: p.w / 2 + 0.3, hd: p.d / 2 + 0.3, top: g + wallH + roofH });
      const r = MeshBuilder.CreateCylinder(`roof${i}`, { height: 1, diameter: 1, tessellation: 3 }, scene);
      r.rotation.z = Math.PI / 2;
      r.bakeCurrentTransformIntoVertices();
      r.scaling.set(len, roofH / 0.75, span / 0.866);
      r.rotation.y = along ? 0 : Math.PI / 2;
      r.position.set(p.x, g + wallH + (0.25 * roofH) / 0.75, p.y);
      roofs.push(baked(r));
      // Puerta en el lado que indica rotDeg (0 = −Z, 90 = −X, 180 = +Z, 270 = +X).
      const a = (p.rotDeg * Math.PI) / 180;
      const dx = -Math.sin(a);
      const dz = -Math.cos(a);
      const half = Math.abs(dx) > 0.5 ? p.w / 2 : p.d / 2;
      const door = MeshBuilder.CreateBox(`door${i}`, { width: 1.1, height: 2.0, depth: 0.12 }, scene);
      door.rotation.y = a;
      door.position.set(p.x + dx * (half + 0.03), hf.sample(p.x + dx * half, p.y + dz * half) + 1.0, p.y + dz * (half + 0.03));
      trims.push(baked(door));
      for (const side of [-1, 1]) {
        const win = MeshBuilder.CreateBox(`win${i}${side}`, { width: 0.8, height: 0.7, depth: 0.12 }, scene);
        win.rotation.y = a;
        const off = Math.min(1.8, (Math.abs(dx) > 0.5 ? p.d : p.w) / 2 - 0.8) * side;
        win.position.set(p.x + dx * (half + 0.03) + dz * off, g + 1.7, p.y + dz * (half + 0.03) - dx * off);
        trims.push(baked(win));
      }
    } else if (p.kind === 'log') {
      const along = p.w >= p.d;
      const dia = Math.min(p.w, p.d) * 0.9;
      const l = MeshBuilder.CreateCylinder(`log${i}`, { height: Math.max(p.w, p.d), diameter: dia, tessellation: 9 }, scene);
      if (along) l.rotation.z = Math.PI / 2;
      else l.rotation.x = Math.PI / 2;
      l.position.set(p.x, hf.sample(p.x, p.y) + dia * 0.4, p.y);
      logs.push(baked(l));
    } else if (p.kind === 'boulder') {
      const b = rockMesh(scene, `boulder${i}`, 100 + i);
      b.scaling.set(p.w / 1.4, Math.min(p.w, p.d) / 1.2, p.d / 1.4);
      b.position.set(p.x, g - 0.1, p.y);
      solids.push({ x: p.x, z: p.y, hw: p.w / 2, hd: p.d / 2, top: g + Math.min(p.w, p.d) * 0.6 });
      boulders.push(baked(b));
    } else {
      const y0 = hf.sample(p.x, p.y);
      const post = MeshBuilder.CreateCylinder(`post${i}`, { height: 2.8, diameterBottom: 0.16, diameterTop: 0.1, tessellation: 6 }, scene);
      post.position.set(p.x, y0 + 1.4, p.y);
      posts.push(baked(post));
      const lantern = MeshBuilder.CreateBox(`lantern${i}`, { width: 0.32, height: 0.42, depth: 0.32 }, scene);
      lantern.position.set(p.x, y0 + 2.95, p.y);
      lanterns.push(baked(lantern));
      lamps.push({ x: p.x, y: y0 + 2.9, z: p.y });
    }
  });
  const meshes: Mesh[] = [];
  const add = (name: string, parts: Mesh[], mat: StandardMaterial): void => {
    if (parts.length === 0) return;
    const m = merge(name, parts);
    m.material = mat;
    m.isPickable = false;
    m.receiveShadows = true;
    m.freezeWorldMatrix();
    meshes.push(m);
  };
  add('houseWalls', walls, occluding(material(scene, 'wallMat', [0.78, 0.71, 0.6], 0)));
  add('houseRoofs', roofs, occluding(material(scene, 'roofMat', [0.52, 0.24, 0.18], 0)));
  add('houseTrims', trims, occluding(material(scene, 'trimMat', [0.25, 0.18, 0.13], 0)));
  add('logs', logs, material(scene, 'logMat', [0.4, 0.29, 0.2], 0));
  add('boulders', boulders, occluding(material(scene, 'boulderMat', [0.47, 0.46, 0.44], 0)));
  add('lampPosts', posts, material(scene, 'postMat', [0.18, 0.17, 0.16], 0));
  const lanternMaterial = material(scene, 'lanternMat', [0.9, 0.8, 0.5], 0);
  add('lanterns', lanterns, lanternMaterial);
  return { meshes, lamps, lanternMaterial, solids };
}

export function buildVegetation(scene: Scene, ow: Overworld): VegetationView {
  const veg = ow.vegetation;
  const tex = {
    leaves: canvasTexture(scene, 'leafTex', 256, veg.seed + 1, drawLeaves),
    grass: canvasTexture(scene, 'grassTex', 128, veg.seed + 2, drawGrass),
    flowers: canvasTexture(scene, 'flowerTex', 128, veg.seed + 3, drawFlowers),
  };
  WindPlugin.speed = veg.wind.speed;
  WindPlugin.strength = veg.wind.strength;

  const casters: AbstractMesh[] = [];
  /** Trozos que la opción de densidad aclara (lo que no bloquea el paso), con su total. */
  const thinnable: Array<{ mesh: Mesh; total: number }> = [];
  const meshes: AbstractMesh[] = [];
  let meshCount = 0;
  let instanceCount = 0;
  for (const [id, items] of ow.scatter.byKind) {
    const kind = veg.kinds[id]!;
    const shape = buildShape(scene, id, kind.shape, kind.wind, tex);
    for (const { mesh, castShadow } of shape.parts) {
      mesh.isPickable = false;
      const chunks = instanceChunks(mesh, items, veg.chunkMeters);
      if (kind.blockRadius === 0) for (const c of chunks) thinnable.push({ mesh: c, total: c.thinInstanceCount });
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

  return {
    casters,
    meshes,
    lamps: props.lamps,
    solids: props.solids,
    lanternMaterial: props.lanternMaterial,
    meshCount,
    instanceCount,
    update(frameSeconds: number): void {
      WindPlugin.time += frameSeconds;
    },
    setDensity(fraction: number): void {
      const f = Math.min(1, Math.max(0, fraction));
      for (const { mesh, total } of thinnable) {
        const n = Math.round(total * f);
        mesh.thinInstanceCount = n;
        mesh.setEnabled(n > 0);
      }
    },
  };
}
