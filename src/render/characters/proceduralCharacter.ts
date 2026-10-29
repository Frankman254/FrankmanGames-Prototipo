// Personaje hecho con primitivas de Babylon unidas en una malla con esqueleto
// (un hueso por articulación del rig) y animado con el `Animator` puro de
// src/world/anim.ts. Cada modelo tiene su silueta: humanoide con espada,
// goblin flaco con arco, chamán encorvado con báculo y halo, diablillo y lobo.
import {
  Bone,
  Color3,
  Matrix,
  Mesh,
  MeshBuilder,
  Quaternion,
  Skeleton,
  StandardMaterial,
  TransformNode,
  Vector3,
  VertexBuffer,
  type AbstractMesh,
  type Scene,
} from '@babylonjs/core';
import type { Palette } from '../../data/worldSchema';
import { Animator, pointInModel, type AnimEvent, type AnimEventDef } from '../../world/anim';
import { proceduralAnim, restFootY, type AnimState, type ModelAnim, type ProceduralModel } from '../../world/rigs';
import type { CharacterModel, PlayOptions } from './characterModel';

type Slot = keyof Palette;
type Shape =
  | { type: 'box'; size: [number, number, number] }
  | { type: 'capsule'; length: number; radius: number }
  | { type: 'sphere'; diameter: number; scaleY?: number }
  | { type: 'cone'; height: number; diameter: number }
  | { type: 'cylinder'; height: number; diameter: number }
  | { type: 'torus'; diameter: number; thickness: number }
  | { type: 'arc'; radius: number; angle: number; thickness: number };

interface Part {
  joint: string;
  shape: Shape;
  slot: Slot;
  /** Centro de la pieza en el espacio de la articulación. */
  at?: [number, number, number];
  /** Giro de la pieza (Euler, radianes). */
  rot?: [number, number, number];
  /** La pieza brilla sola (halos, orbes). */
  glow?: boolean;
}

/** Extremidad que cuelga de su articulación: cápsula centrada a media longitud. */
const limb = (joint: string, length: number, radius: number, slot: Slot): Part => ({ joint, slot, shape: { type: 'capsule', length, radius }, at: [0, -length / 2, 0] });

function bipedParts(h: number, w: number, thin: number): Part[] {
  const r = (v: number): number => v * thin;
  return [
    { joint: 'hips', slot: 'cloth', shape: { type: 'box', size: [0.24 * thin, 0.18 * h, 0.32 * w] } },
    { joint: 'spine', slot: 'cloth', shape: { type: 'box', size: [0.22 * thin, 0.24 * h, 0.3 * w] }, at: [0, 0.12 * h, 0] },
    { joint: 'chest', slot: 'cloth', shape: { type: 'box', size: [0.26 * thin, 0.3 * h, 0.42 * w] }, at: [0, 0.1 * h, 0] },
    { joint: 'spine', slot: 'trim', shape: { type: 'box', size: [0.24 * thin, 0.05, 0.32 * w] }, at: [0, 0.0, 0] },
    { joint: 'head', slot: 'skin', shape: { type: 'sphere', diameter: 0.27 }, at: [0, 0.12, 0] },
    { joint: 'head', slot: 'skin', shape: { type: 'box', size: [0.06, 0.05, 0.05] }, at: [0.135, 0.1, 0] },
    limb('armL', 0.29 * h, r(0.055), 'cloth'),
    limb('armR', 0.29 * h, r(0.055), 'cloth'),
    limb('foreL', 0.26 * h, r(0.045), 'skin'),
    limb('foreR', 0.26 * h, r(0.045), 'skin'),
    { joint: 'handL', slot: 'skin', shape: { type: 'sphere', diameter: 0.09 } },
    { joint: 'handR', slot: 'skin', shape: { type: 'sphere', diameter: 0.09 } },
    limb('legL', 0.43 * h, r(0.07), 'cloth'),
    limb('legR', 0.43 * h, r(0.07), 'cloth'),
    limb('shinL', 0.43 * h, r(0.06), 'trim'),
    limb('shinR', 0.43 * h, r(0.06), 'trim'),
    // Botas: la planta queda a la altura de la articulación del pie (el apoyo).
    { joint: 'footL', slot: 'trim', shape: { type: 'box', size: [0.22, 0.08, 0.11] }, at: [0.05, 0.04, 0] },
    { joint: 'footR', slot: 'trim', shape: { type: 'box', size: [0.22, 0.08, 0.11] }, at: [0.05, 0.04, 0] },
  ];
}

function modelParts(model: ProceduralModel): Part[] {
  switch (model) {
    case 'humanoid':
      return [
        ...bipedParts(1, 1, 1),
        { joint: 'head', slot: 'hair', shape: { type: 'sphere', diameter: 0.29, scaleY: 0.6 }, at: [-0.02, 0.2, 0] },
        // Espada en la mano derecha, apuntando hacia delante.
        { joint: 'handR', slot: 'gear', shape: { type: 'box', size: [0.85, 0.05, 0.02] }, at: [0.45, -0.02, 0] },
        { joint: 'handR', slot: 'trim', shape: { type: 'box', size: [0.04, 0.03, 0.22] }, at: [0.04, -0.02, 0] },
      ];
    case 'archer':
      return [
        ...bipedParts(0.92, 0.75, 0.75),
        // Orejas puntiagudas y arco en la mano izquierda; carcaj a la espalda.
        { joint: 'head', slot: 'skin', shape: { type: 'cone', height: 0.2, diameter: 0.07 }, at: [-0.02, 0.15, 0.15], rot: [-1.2, 0, 0] },
        { joint: 'head', slot: 'skin', shape: { type: 'cone', height: 0.2, diameter: 0.07 }, at: [-0.02, 0.15, -0.15], rot: [1.2, 0, 0] },
        { joint: 'head', slot: 'hair', shape: { type: 'sphere', diameter: 0.25, scaleY: 0.5 }, at: [-0.03, 0.2, 0] },
        { joint: 'handL', slot: 'gear', shape: { type: 'arc', radius: 0.5, angle: 2.0, thickness: 0.025 }, rot: [0, 0, 0] },
        { joint: 'chest', slot: 'gear', shape: { type: 'cylinder', height: 0.5, diameter: 0.11 }, at: [-0.16, 0.15, -0.08], rot: [0.3, 0, 0.25] },
      ];
    case 'shaman':
      return [
        ...bipedParts(1, 1.1, 1.05),
        // Túnica larga, barba, báculo con orbe y un halo sobre la cabeza.
        { joint: 'hips', slot: 'cloth', shape: { type: 'cone', height: 0.85, diameter: 0.75 }, at: [0, -0.35, 0] },
        { joint: 'head', slot: 'hair', shape: { type: 'cone', height: 0.28, diameter: 0.16 }, at: [0.1, -0.03, 0], rot: [0, 0, Math.PI] },
        { joint: 'head', slot: 'cloth', shape: { type: 'cone', height: 0.3, diameter: 0.3 }, at: [-0.02, 0.33, 0] },
        { joint: 'head', slot: 'trim', shape: { type: 'torus', diameter: 0.42, thickness: 0.03 }, at: [0, 0.58, 0], glow: true },
        { joint: 'handR', slot: 'gear', shape: { type: 'cylinder', height: 1.7, diameter: 0.05 }, at: [0, 0.35, 0] },
        { joint: 'handR', slot: 'trim', shape: { type: 'sphere', diameter: 0.15 }, at: [0, 1.22, 0], glow: true },
      ];
    case 'imp':
      return [
        ...bipedParts(0.5, 0.8, 0.9),
        // Cabeza grande con cuernos, cola y garras.
        { joint: 'head', slot: 'skin', shape: { type: 'sphere', diameter: 0.3 }, at: [0, 0.1, 0] },
        { joint: 'head', slot: 'hair', shape: { type: 'cone', height: 0.18, diameter: 0.06 }, at: [0, 0.27, 0.08], rot: [-0.4, 0, 0.3] },
        { joint: 'head', slot: 'hair', shape: { type: 'cone', height: 0.18, diameter: 0.06 }, at: [0, 0.27, -0.08], rot: [0.4, 0, 0.3] },
        { joint: 'head', slot: 'gear', shape: { type: 'sphere', diameter: 0.05 }, at: [0.13, 0.13, 0.06], glow: true },
        { joint: 'head', slot: 'gear', shape: { type: 'sphere', diameter: 0.05 }, at: [0.13, 0.13, -0.06], glow: true },
        { joint: 'hips', slot: 'skin', shape: { type: 'cylinder', height: 0.45, diameter: 0.04 }, at: [-0.22, -0.02, 0], rot: [0, 0, 1.0] },
        { joint: 'hips', slot: 'hair', shape: { type: 'cone', height: 0.1, diameter: 0.09 }, at: [-0.41, 0.11, 0], rot: [0, 0, 1.0] },
        { joint: 'handL', slot: 'hair', shape: { type: 'cone', height: 0.1, diameter: 0.06 }, at: [0.03, -0.06, 0], rot: [0, 0, Math.PI * 0.85] },
        { joint: 'handR', slot: 'hair', shape: { type: 'cone', height: 0.1, diameter: 0.06 }, at: [0.03, -0.06, 0], rot: [0, 0, Math.PI * 0.85] },
      ];
    case 'wolf':
      return [
        { joint: 'body', slot: 'skin', shape: { type: 'capsule', length: 0.8, radius: 0.17 }, rot: [0, 0, Math.PI / 2] },
        { joint: 'chest', slot: 'cloth', shape: { type: 'sphere', diameter: 0.42, scaleY: 1.1 } },
        { joint: 'head', slot: 'skin', shape: { type: 'box', size: [0.24, 0.2, 0.2] } },
        { joint: 'head', slot: 'skin', shape: { type: 'box', size: [0.2, 0.09, 0.12] }, at: [0.18, -0.03, 0] },
        { joint: 'head', slot: 'hair', shape: { type: 'box', size: [0.04, 0.04, 0.05] }, at: [0.28, -0.0, 0] },
        { joint: 'head', slot: 'hair', shape: { type: 'cone', height: 0.12, diameter: 0.08 }, at: [-0.04, 0.14, 0.07] },
        { joint: 'head', slot: 'hair', shape: { type: 'cone', height: 0.12, diameter: 0.08 }, at: [-0.04, 0.14, -0.07] },
        { joint: 'head', slot: 'gear', shape: { type: 'sphere', diameter: 0.04 }, at: [0.1, 0.05, 0.08], glow: true },
        { joint: 'head', slot: 'gear', shape: { type: 'sphere', diameter: 0.04 }, at: [0.1, 0.05, -0.08], glow: true },
        { joint: 'jaw', slot: 'trim', shape: { type: 'box', size: [0.17, 0.04, 0.1] }, at: [0.06, 0, 0] },
        { joint: 'tail', slot: 'hair', shape: { type: 'capsule', length: 0.42, radius: 0.05 }, at: [-0.15, 0.08, 0], rot: [0, 0, -1.1] },
        limb('legFL', 0.24, 0.05, 'skin'),
        limb('legFR', 0.24, 0.05, 'skin'),
        limb('legBL', 0.24, 0.06, 'skin'),
        limb('legBR', 0.24, 0.06, 'skin'),
        limb('shinFL', 0.24, 0.04, 'hair'),
        limb('shinFR', 0.24, 0.04, 'hair'),
        limb('shinBL', 0.24, 0.04, 'hair'),
        limb('shinBR', 0.24, 0.04, 'hair'),
      ];
  }
}

function buildShape(scene: Scene, name: string, s: Shape): Mesh {
  switch (s.type) {
    case 'box':
      return MeshBuilder.CreateBox(name, { width: s.size[0], height: s.size[1], depth: s.size[2] }, scene);
    case 'capsule':
      return MeshBuilder.CreateCapsule(name, { height: s.length + s.radius * 2, radius: s.radius, tessellation: 8, subdivisions: 1 }, scene);
    case 'sphere': {
      const m = MeshBuilder.CreateSphere(name, { diameter: s.diameter, segments: 8 }, scene);
      if (s.scaleY) m.scaling.y = s.scaleY;
      return m;
    }
    case 'cone':
      return MeshBuilder.CreateCylinder(name, { height: s.height, diameterTop: 0, diameterBottom: s.diameter, tessellation: 8 }, scene);
    case 'cylinder':
      return MeshBuilder.CreateCylinder(name, { height: s.height, diameter: s.diameter, tessellation: 8 }, scene);
    case 'torus':
      return MeshBuilder.CreateTorus(name, { diameter: s.diameter, thickness: s.thickness, tessellation: 20 }, scene);
    case 'arc': {
      // Arco del arquero: tubo en el plano XY, abierto hacia −X (la cuerda).
      const pts: Vector3[] = [];
      for (let i = 0; i <= 12; i++) {
        const a = -s.angle / 2 + (s.angle * i) / 12;
        pts.push(new Vector3(Math.cos(a) * s.radius - s.radius * 0.85, Math.sin(a) * s.radius, 0));
      }
      return MeshBuilder.CreateTube(name, { path: pts, radius: s.thickness, tessellation: 6 }, scene);
    }
  }
}

/**
 * Une las piezas en una malla con esqueleto: cada vértice pertenece al 100 % al
 * hueso de su articulación y lleva el color de su ranura de paleta. Así cada
 * personaje cuesta una llamada de dibujo (dos si tiene piezas que brillan).
 */
function skinnedMesh(scene: Scene, name: string, parts: Part[], rig: ModelAnim['rig'], palette: Palette, glow: boolean): Mesh | null {
  const chosen = parts.filter((p) => (p.glow ?? false) === glow);
  if (chosen.length === 0) return null;
  // Pose de reposo con nodos temporales para hornear cada pieza en el espacio del modelo.
  const nodes = rig.joints.map((j) => {
    const n = new TransformNode(`${name}:tmp:${j.name}`, scene);
    n.position.set(...j.offset);
    return n;
  });
  rig.joints.forEach((j, i) => {
    if (j.parent !== null) nodes[i]!.parent = nodes[rig.index.get(j.parent)!]!;
  });
  const meshes = chosen.map((p, i) => {
    const m = buildShape(scene, `${name}:part${i}`, p.shape);
    const bone = rig.index.get(p.joint)!;
    m.parent = nodes[bone]!;
    if (p.at) m.position.set(...p.at);
    if (p.rot) m.rotation.set(...p.rot);
    const n = m.getTotalVertices();
    const c = palette[p.slot];
    const colors = new Float32Array(n * 4);
    const idx = new Float32Array(n * 4);
    const w = new Float32Array(n * 4);
    for (let v = 0; v < n; v++) {
      colors.set([c[0], c[1], c[2], 1], v * 4);
      idx[v * 4] = bone;
      w[v * 4] = 1;
    }
    m.setVerticesData(VertexBuffer.ColorKind, colors);
    m.setVerticesData(VertexBuffer.MatricesIndicesKind, idx);
    m.setVerticesData(VertexBuffer.MatricesWeightsKind, w);
    m.computeWorldMatrix(true);
    return m;
  });
  for (const n of nodes) n.computeWorldMatrix(true);
  for (const m of meshes) m.computeWorldMatrix(true);
  const merged = Mesh.MergeMeshes(meshes, true, true)!;
  merged.name = glow ? `${name}:glow` : name;
  for (const n of nodes) n.dispose();
  merged.isPickable = false;
  return merged;
}

export class ProceduralCharacter implements CharacterModel {
  readonly root: TransformNode;
  readonly height: number;
  readonly meshes: AbstractMesh[] = [];
  private readonly body: TransformNode;
  private readonly skeleton: Skeleton;
  private readonly bones: Bone[];
  private readonly animator: Animator;
  private readonly anim: ModelAnim;
  private readonly mat: StandardMaterial;
  private readonly glowMat: StandardMaterial | null = null;
  private stateName: AnimState | null = null;
  private readonly tmpM = new Matrix();
  private readonly tmpQ = new Quaternion();
  private readonly tmpP = new Vector3();
  private static readonly ONE = new Vector3(1, 1, 1);

  constructor(
    scene: Scene,
    name: string,
    model: ProceduralModel,
    scale: number,
    palette: Palette,
    private readonly data: { runSpeed: number; events: Record<string, AnimEventDef[]> },
    blendSeconds: number,
  ) {
    this.anim = proceduralAnim(model);
    const rig = this.anim.rig;
    this.animator = new Animator(rig, this.anim.clips, data.events, blendSeconds);
    this.root = new TransformNode(name, scene);
    // `body` baja el modelo para que el apoyo en reposo toque el suelo y aplica la escala.
    this.body = new TransformNode(`${name}:body`, scene);
    this.body.parent = this.root;
    this.body.scaling.setAll(scale);
    this.body.position.y = -restFootY(this.anim) * scale;

    this.skeleton = new Skeleton(`${name}:skeleton`, `${name}:skeleton`, scene);
    this.bones = [];
    rig.joints.forEach((j, i) => {
      const parent = j.parent === null ? null : this.bones[rig.index.get(j.parent)!]!;
      const rest = Matrix.Translation(...j.offset);
      this.bones[i] = new Bone(`${name}:${j.name}`, this.skeleton, parent, rest, rest.clone(), rest.clone());
    });

    this.mat = new StandardMaterial(`${name}:mat`, scene);
    this.mat.diffuseColor = new Color3(1, 1, 1);
    this.mat.specularColor = new Color3(0.06, 0.06, 0.06);
    const parts = modelParts(model);
    for (const glow of [false, true]) {
      const m = skinnedMesh(scene, name, parts, rig, palette, glow);
      if (!m) continue;
      m.parent = this.body;
      m.skeleton = this.skeleton;
      m.numBoneInfluencers = 1;
      m.useVertexColors = true;
      if (glow) {
        this.glowMat = new StandardMaterial(`${name}:glowMat`, scene);
        this.glowMat.diffuseColor = new Color3(1, 1, 1);
        this.glowMat.emissiveColor = new Color3(0.85, 0.85, 0.85);
        m.material = this.glowMat;
      } else {
        m.material = this.mat;
      }
      this.meshes.push(m);
    }

    const head = rig.index.get('head')!;
    let y = 0;
    for (let i = head; i >= 0; i = rig.parents[i]!) y += rig.joints[i]!.offset[1];
    this.height = (y + 0.3) * scale;
    this.play('idle');
    this.update(0, 0);
  }

  get state(): AnimState | null {
    return this.stateName;
  }

  get finished(): boolean {
    return this.animator.finished;
  }

  impactTime(state: AnimState): number {
    const ev = (this.data.events[state] ?? []).find((e) => e.type === 'hit' || e.type === 'cast');
    return ev ? ev.t : 0.5;
  }

  clipSeconds(state: AnimState): number {
    return this.anim.clips[this.clipFor(state)]!.duration;
  }

  /** Estado → clip (si el modelo no tiene uno, el más parecido). */
  private clipFor(state: AnimState): string {
    if (this.animator.has(state)) return state;
    if (state === 'cast' || state === 'evade') return this.animator.has('attack') ? 'attack' : 'idle';
    return 'idle';
  }

  play(state: AnimState, opts: PlayOptions = {}): void {
    this.stateName = state;
    this.animator.play(this.clipFor(state), opts.speed ?? 1, opts.restart ?? false);
  }

  update(dt: number, moveSpeed: number): AnimEvent[] {
    if (this.stateName === 'run') this.animator.setSpeed(Math.max(0.3, moveSpeed / this.data.runSpeed));
    const events = this.animator.update(dt);
    const pose = this.animator.pose;
    const joints = this.anim.rig.joints;
    for (let i = 0; i < joints.length; i++) {
      const o = i * 7;
      const off = joints[i]!.offset;
      this.tmpQ.set(pose[o]!, pose[o + 1]!, pose[o + 2]!, pose[o + 3]!);
      this.tmpP.set(off[0] + pose[o + 4]!, off[1] + pose[o + 5]!, off[2] + pose[o + 6]!);
      Matrix.ComposeToRef(ProceduralCharacter.ONE, this.tmpQ, this.tmpP, this.tmpM);
      const b = this.bones[i]!;
      b.getLocalMatrix().copyFrom(this.tmpM);
      b.markAsDirty();
    }
    return events;
  }

  lowestFoot(out: Vector3): Vector3 {
    // Cinemática directa sobre la pose actual y paso al mundo con el nodo `body`.
    const a = this.anim;
    let best: [number, number, number] | null = null;
    for (const f of a.feet) {
      const p = pointInModel(a.rig, this.animator.pose, f, a.sole);
      if (!best || p[1] < best[1]) best = p;
    }
    this.body.computeWorldMatrix(true);
    return Vector3.TransformCoordinatesFromFloatsToRef(best![0], best![1], best![2], this.body.getWorldMatrix(), out);
  }

  setEmissive(r: number, g: number, b: number): void {
    this.mat.emissiveColor.set(r, g, b);
  }

  setShade(k: number): void {
    this.mat.diffuseColor.set(k, k, k);
  }

  dispose(): void {
    for (const m of this.meshes) m.dispose();
    this.root.dispose(false, false);
    this.skeleton.dispose();
    this.mat.dispose();
    this.glowMat?.dispose();
  }
}
