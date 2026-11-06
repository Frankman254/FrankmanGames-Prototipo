// Personaje desde un glTF/GLB de assets/ con sus AnimationGroups. Mismo
// contrato que el procedural: estados → animaciones por nombre (data/assets.json),
// fundido por pesos y eventos por tiempo normalizado. Mientras carga no se ve
// nada; si falla, lo dice en consola y queda vacío.
import { Color3, TransformNode, Vector3, type AbstractMesh, type AnimationGroup, type Node, type Scene } from '@babylonjs/core';
import type { AssetEntry } from '../../data/worldSchema';
import { crossedEvents, type AnimEvent } from '../../world/anim';
import { modelPartsFor, type BodyType, type CharacterLook } from '../../world/look';
import type { AnimState } from '../../world/rigs';
import type { AssetCache } from '../assetCache';
import type { CharacterModel, PlayOptions } from './characterModel';
import { attachHeld, DESIGN_PARTS, HAND_JOINT, type HeldSlot } from './heldGear';

type GltfEntry = Extract<AssetEntry, { kind: 'gltf' }>;
type Palette = GltfEntry['palettes'][string];
type Tintable = { name: string; albedoColor?: Color3; emissiveColor?: Color3 };

const GHOST_GLOW = new Color3(0.25, 0.35, 0.55);
const BODY_WIDTH: Readonly<Record<BodyType, number>> = { slim: 0.9, average: 1, stout: 1.14 };

export class GltfCharacter implements CharacterModel {
  readonly root: TransformNode;
  readonly height: number;
  readonly meshes: AbstractMesh[] = [];
  /** Se cumple cuando el modelo ya está en la escena: entonces hay mallas que etiquetar. */
  readonly ready: Promise<void>;
  private readonly inner: TransformNode;
  private groups = new Map<AnimState, AnimationGroup>();
  private cur: { state: AnimState; group: AnimationGroup; last: number } | null = null;
  private fading: Array<{ group: AnimationGroup; w: number }> = [];
  private pending: { state: AnimState; opts: PlayOptions } | null = null;
  private disposed = false;
  /** Copia del modelo: esqueleto y clips no se van con el nodo y hay que soltarlos aparte. */
  private inst: { skeletons: Array<{ dispose(): void }>; animationGroups: Array<{ dispose(): void }> } | null = null;
  private readonly joints = new Map<string, Node>();
  private readonly tints: Array<{ mat: Tintable; base: Color3 }> = [];
  private shade = 1;

  constructor(
    scene: Scene,
    assetId: string,
    name: string,
    private readonly entry: GltfEntry,
    cache: AssetCache,
    private readonly blendSeconds: number,
    private readonly palette?: Palette,
    private readonly look?: CharacterLook,
  ) {
    this.height = entry.height * entry.scale;
    this.height = entry.height * entry.scale;
    this.root = new TransformNode(name, scene);
    this.inner = new TransformNode(`${name}:inner`, scene);
    this.inner.parent = this.root;
    this.inner.rotation.y = (entry.yawDeg * Math.PI) / 180;
    this.inner.scaling.setAll(entry.scale);
    if (look && entry.parts) {
      const k = BODY_WIDTH[look.bodyType];
      this.inner.scaling.x *= k;
      this.inner.scaling.z *= k;
    }
    this.ready = cache
      .instantiate(assetId, name)
      .then((inst) => {
        if (this.disposed) {
          inst.dispose();
          return;
        }
        this.inst = inst;
        for (const n of inst.rootNodes) n.parent = this.inner;
        const wanted = look && entry.parts ? modelPartsFor(look) : null;
        const unused: AbstractMesh[] = [];
        for (const n of inst.rootNodes) {
          for (const d of n.getDescendants(false)) this.joints.set(d.name.slice(d.name.indexOf(':') + 1), d);
          for (const m of n.getChildMeshes(false)) {
            const part = m.name.slice(m.name.indexOf(':') + 1).replace(/_primitive\d+$/, '');
            if (!wanted || wanted.has(part)) this.meshes.push(m);
            else unused.push(m);
          }
        }
        // Un aspecto no cambia en una copia (otro aspecto es otra copia): lo que no usa se borra.
        const kept = new Set(this.meshes.map((m) => m.material));
        for (const m of unused) {
          if (m.material && !kept.has(m.material)) {
            kept.add(m.material);
            m.material.dispose();
          }
          m.dispose(false, false);
        }
        this.applyPalette();
        void this.holdGear(scene, name);
        for (const [state, clip] of Object.entries(entry.clips)) {
          const g = inst.animationGroups.find((a) => a.name.endsWith(clip));
          if (g) this.groups.set(state as AnimState, g);
          else console.warn(`[gltf] ${name}: no hay animación «${clip}» para ${state}`);
        }
        for (const g of inst.animationGroups) g.stop();
        const p = this.pending ?? { state: 'idle' as AnimState, opts: {} };
        this.pending = null;
        this.play(p.state, p.opts);
      })
      .catch((err: unknown) => console.error(`[gltf] ${name}: no se pudo cargar`, err));
  }

  /**
   * Lo que el personaje lleva en las manos (F17): el modelo del objeto equipado, si existe,
   * sustituye a la pieza del diseño o genérica de ese hueco. Sin nada equipado en un hueco,
   * la pieza del diseño solo se queda si es del tipo que lleva (p. ej. la lanza para una lanza).
   */
  private async holdGear(scene: Scene, name: string): Promise<void> {
    const look = this.look;
    if (!look || look.weaponItem === undefined) return;
    for (const slot of ['weapon', 'offhand'] as HeldSlot[]) {
      const item = slot === 'weapon' ? look.weaponItem : look.offhandItem;
      const hand = this.joints.get(HAND_JOINT[slot]);
      const own = item && hand ? await attachHeld(scene, item, hand, name) : false;
      if (this.disposed) return;
      const keepDesign = !own && (slot === 'weapon' ? look.weapon !== 'none' : look.offhand !== 'none');
      if (keepDesign) continue;
      for (const m of [...this.meshes]) {
        const part = m.name.slice(m.name.indexOf(':') + 1).replace(/_primitive\d+$/, '');
        if (!DESIGN_PARTS[slot].includes(part)) continue;
        this.meshes.splice(this.meshes.indexOf(m), 1);
        m.dispose(false, false);
      }
    }
    if (this.joints.size) for (const slot of ['weapon', 'offhand'] as HeldSlot[]) {
      const hand = this.joints.get(HAND_JOINT[slot]);
      if (hand) for (const m of (hand as TransformNode).getChildMeshes(false)) if (!this.meshes.includes(m)) this.meshes.push(m);
    }
  }

  get state(): AnimState | null {
    return this.cur?.state ?? this.pending?.state ?? null;
  }

  get finished(): boolean {
    if (!this.cur) return false;
    return !this.isLoop(this.cur.state) && !this.cur.group.isPlaying;
  }

  private isLoop(state: AnimState): boolean {
    return state === 'idle' || state === 'run';
  }

  impactTime(state: AnimState): number {
    const ev = (this.entry.events[state] ?? []).find((e) => e.type === 'hit' || e.type === 'cast');
    return ev ? ev.t : 0.5;
  }

  clipSeconds(state: AnimState): number {
    const g = this.groups.get(state);
    if (!g) return 1;
    const fps = g.targetedAnimations[0]?.animation.framePerSecond ?? 60;
    return (g.to - g.from) / fps;
  }

  private normalized(g: AnimationGroup): number {
    const a = g.animatables[0];
    if (!a || g.to <= g.from) return 0;
    return Math.min(1, Math.max(0, (a.masterFrame - g.from) / (g.to - g.from)));
  }

  play(state: AnimState, opts: PlayOptions = {}): void {
    if (this.groups.size === 0) {
      this.pending = { state, opts };
      return;
    }
    const g = this.groups.get(state) ?? this.groups.get('idle')!;
    if (this.cur && this.cur.group === g && !opts.restart) {
      g.speedRatio = opts.speed ?? 1;
      this.cur.state = state;
      return;
    }
    // Si vuelve a un clip que aún se apagaba, deja de apagarse: al terminar lo pararía y quedaría congelado.
    this.fading = this.fading.filter((f) => f.group !== g);
    if (this.cur && this.cur.group !== g) this.fading.push({ group: this.cur.group, w: 1 });
    g.start(this.isLoop(state), opts.speed ?? 1, g.from, g.to, false);
    g.setWeightForAllAnimatables(this.fading.length > 0 ? 0 : 1);
    this.cur = { state, group: g, last: 0 };
  }

  update(dt: number, moveSpeed: number): AnimEvent[] {
    const out: AnimEvent[] = [];
    if (!this.cur) return out;
    const c = this.cur;
    if (c.state === 'run') c.group.speedRatio = Math.max(0.3, moveSpeed / this.entry.runSpeed);
    const step = this.blendSeconds > 0 ? dt / this.blendSeconds : 1;
    let curW = 1;
    this.fading = this.fading.filter((f) => {
      f.w -= step;
      if (f.w <= 0) {
        f.group.stop();
        return false;
      }
      f.group.setWeightForAllAnimatables(f.w);
      curW = Math.min(curW, 1 - f.w);
      return true;
    });
    c.group.setWeightForAllAnimatables(curW);
    const t = this.normalized(c.group);
    const wrapped = t < c.last;
    for (const e of crossedEvents(this.entry.events[c.state] ?? [], c.last, t, wrapped)) out.push({ type: e.type, clip: c.state });
    c.last = t;
    return out;
  }

  private applyPalette(): void {
    const seen = new Set<Tintable>();
    for (const m of this.meshes) {
      const mat = m.material as unknown as Tintable | null;
      if (!mat?.albedoColor || seen.has(mat)) continue;
      seen.add(mat);
      const slot = mat.name.slice(mat.name.indexOf(':') + 1);
      const glows = slot.startsWith('brillo_');
      const rgb = this.palette?.[(glows ? slot.slice(7) : slot) as keyof Palette];
      if (rgb) {
        mat.albedoColor = new Color3(rgb[0], rgb[1], rgb[2]).toLinearSpace();
        if (glows && mat.emissiveColor) mat.emissiveColor = mat.albedoColor.clone();
      }
      if (this.entry.ghost) {
        const t = mat as unknown as { alpha: number; disableDepthWrite: boolean };
        t.alpha = 0.55;
        t.disableDepthWrite = true;
        if (!slot.startsWith('brillo_')) mat.emissiveColor = GHOST_GLOW.clone();
      }
      this.tints.push({ mat, base: mat.albedoColor.clone() });
    }
    this.setShade(this.shade);
  }

  socket(joint: string, out: Vector3): Vector3 {
    const node = this.joints.get(joint) as TransformNode | undefined;
    if (node?.getAbsolutePosition) return out.copyFrom(node.getAbsolutePosition());
    // Sin ese hueso: a media altura del personaje.
    return out.copyFrom(this.root.getAbsolutePosition()).addInPlaceFromFloats(0, this.height * 0.6, 0);
  }

  lowestFoot(out: Vector3): Vector3 {
    const l = this.joints.get('footL') as TransformNode | undefined;
    const r = this.joints.get('footR') as TransformNode | undefined;
    if (!l || !r) return out.copyFrom(this.root.getAbsolutePosition());
    const a = l.getAbsolutePosition();
    const b = r.getAbsolutePosition();
    // El hueso está en el tobillo; la suela, un poco más abajo.
    out.copyFrom(a.y < b.y ? a : b);
    out.y -= 0.09 * this.entry.scale;
    return out;
  }

  setEmissive(r: number, g: number, b: number): void {
    for (const m of this.meshes) {
      const mat = m.material as { name: string; emissiveColor?: { set(r: number, g: number, b: number): void } } | null;
      if (mat?.name.includes('brillo_')) continue;
      if (this.entry.ghost) mat?.emissiveColor?.set(GHOST_GLOW.r + r, GHOST_GLOW.g + g, GHOST_GLOW.b + b);
      else mat?.emissiveColor?.set(r, g, b);
    }
  }

  setShade(k: number): void {
    this.shade = k;
    for (const { mat, base } of this.tints) mat.albedoColor = base.scale(k);
  }

  dispose(): void {
    this.disposed = true;
    for (const g of this.groups.values()) g.stop();
    this.root.dispose(false, true);
    for (const g of this.inst?.animationGroups ?? []) g.dispose();
    for (const s of this.inst?.skeletons ?? []) s.dispose();
    this.inst = null;
  }
}
