// Personaje desde un glTF/GLB de assets/ con sus AnimationGroups. Mismo
// contrato que el procedural: estados → animaciones por nombre (data/assets.json),
// fundido por pesos y eventos por tiempo normalizado. Mientras carga no se ve
// nada; si falla, lo dice en consola y queda vacío.
//
// PENDIENTE: no hay todavía ningún modelo CC0 aprobado, así que esta clase sólo
// se ha comprobado con tsc; se probará al añadir el primer glTF.
import { TransformNode, Vector3, type AbstractMesh, type AnimationGroup, type Scene } from '@babylonjs/core';
import type { AssetEntry } from '../../data/worldSchema';
import { crossedEvents, type AnimEvent } from '../../world/anim';
import type { AnimState } from '../../world/rigs';
import type { AssetCache } from '../assetCache';
import type { CharacterModel, PlayOptions } from './characterModel';

type GltfEntry = Extract<AssetEntry, { kind: 'gltf' }>;

export class GltfCharacter implements CharacterModel {
  readonly root: TransformNode;
  readonly height = 1.8;
  readonly meshes: AbstractMesh[] = [];
  private readonly inner: TransformNode;
  private groups = new Map<AnimState, AnimationGroup>();
  private cur: { state: AnimState; group: AnimationGroup; last: number } | null = null;
  private fading: Array<{ group: AnimationGroup; w: number }> = [];
  private pending: { state: AnimState; opts: PlayOptions } | null = null;
  private disposed = false;

  constructor(
    scene: Scene,
    assetId: string,
    name: string,
    private readonly entry: GltfEntry,
    cache: AssetCache,
    private readonly blendSeconds: number,
  ) {
    this.root = new TransformNode(name, scene);
    this.inner = new TransformNode(`${name}:inner`, scene);
    this.inner.parent = this.root;
    this.inner.rotation.y = (entry.yawDeg * Math.PI) / 180;
    this.inner.scaling.setAll(entry.scale);
    cache
      .instantiate(assetId, name)
      .then((inst) => {
        if (this.disposed) {
          inst.dispose();
          return;
        }
        for (const n of inst.rootNodes) n.parent = this.inner;
        for (const n of inst.rootNodes) this.meshes.push(...n.getChildMeshes(false));
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

  socket(_joint: string, out: Vector3): Vector3 {
    // Sin esqueleto conocido: a media altura del personaje.
    return out.copyFrom(this.root.getAbsolutePosition()).addInPlaceFromFloats(0, this.height * 0.6, 0);
  }

  lowestFoot(out: Vector3): Vector3 {
    // Sin esqueleto conocido: la posición del personaje en el suelo.
    return out.copyFrom(this.root.getAbsolutePosition());
  }

  setEmissive(r: number, g: number, b: number): void {
    for (const m of this.meshes) {
      const mat = m.material as { emissiveColor?: { set(r: number, g: number, b: number): void } } | null;
      mat?.emissiveColor?.set(r, g, b);
    }
  }

  setShade(_k: number): void {
    // Los materiales del archivo se dejan como vienen.
  }

  dispose(): void {
    this.disposed = true;
    for (const g of this.groups.values()) g.stop();
    this.root.dispose(false, false);
  }
}
