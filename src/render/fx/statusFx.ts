// Estados visibles sobre jugador, enemigos y mascotas: llamas (quemadura),
// escarcha (ralentizado), cristales de hielo (inmovilizado), estrellas que giran
// (aturdido), burbuja (escudo), aura (mejoras) y chispas. Lee las listas de
// estados de los actores; no cambia nada de la simulación.
import { MeshBuilder, Vector3, type Mesh, type ParticleSystem, type Scene, type StandardMaterial } from '@babylonjs/core';
import { TransformNode } from '@babylonjs/core';
import type { FxDef, StatusVisual } from '../../data/fxSchema';
import type { StatusDef } from '../../rpg/contracts';
import type { World } from '../../sim/world';
import type { Rgb } from '../../world/dayNight';
import type { HeightField } from '../../world/terrain';
import { glowMaterial, retire, trail } from './particles';

interface Visual {
  node: TransformNode;
  emitter: Vector3;
  ps: ParticleSystem | null;
  spin: Mesh[];
  mats: StandardMaterial[];
  kind: StatusVisual;
  phase: number;
}

/** Actor con estados en el mundo: id, posición y altura de su modelo. */
interface Bearer {
  id: number;
  x: number;
  z: number;
  height: number;
  statuses: readonly { def: StatusDef; stacks: number }[];
}

export class StatusFx {
  private readonly visuals = new Map<string, Visual>();
  private time = 0;

  constructor(
    private readonly scene: Scene,
    private readonly fx: FxDef,
    private readonly ground: HeightField,
    /** Altura del modelo de cada entidad (para colocar estrellas y burbujas). */
    private readonly heightOf: (id: number) => number,
  ) {}

  private visualOf(def: StatusDef): { visual: StatusVisual; color: Rgb } | null {
    const v = this.fx.statuses[def.id];
    if (v) return v;
    return def.kind === 'buff' ? { visual: 'aura', color: [0.9, 0.9, 0.6] } : null;
  }

  private build(kind: StatusVisual, color: Rgb, h: number, key: string): Visual {
    const node = new TransformNode(`status:${key}`, this.scene);
    const emitter = new Vector3();
    const v: Visual = { node, emitter, ps: null, spin: [], mats: [], kind, phase: Math.random() * 6 };
    const core: Rgb = [Math.min(1, color[0] + 0.3), Math.min(1, color[1] + 0.3), Math.min(1, color[2] + 0.3)];
    const add = (m: Mesh, mat: StandardMaterial): void => {
      m.parent = node;
      m.material = mat;
      m.isPickable = false;
      v.mats.push(mat);
    };
    switch (kind) {
      case 'flames':
        v.ps = trail(this.scene, `burn:${key}`, emitter, { rate: 45, count: 0, color, core, radius: 0.3, upward: true, speed: [0.6, 1.8], size: [0.18, 0.42], life: [0.3, 0.6], gravity: 2.5 });
        break;
      case 'frost': {
        v.ps = trail(this.scene, `frost:${key}`, emitter, { rate: 16, count: 0, color, core: [1, 1, 1], radius: 0.45, speed: [0.05, 0.3], size: [0.05, 0.12], life: [0.6, 1.0], gravity: -0.6 });
        const d = MeshBuilder.CreateDisc(`frostDisc:${key}`, { radius: 0.7, tessellation: 24 }, this.scene);
        d.rotation.x = Math.PI / 2;
        d.position.y = 0.05;
        add(d, glowMaterial(this.scene, `frostMat:${key}`, color, 0.35, false));
        break;
      }
      case 'ice':
        for (let i = 0; i < 6; i++) {
          const c = MeshBuilder.CreateCylinder(`ice:${key}:${i}`, { height: 0.5 + (i % 3) * 0.15, diameterTop: 0, diameterBottom: 0.16, tessellation: 5 }, this.scene);
          const a = (i / 6) * Math.PI * 2;
          c.position.set(Math.cos(a) * 0.45, 0.2, Math.sin(a) * 0.45);
          c.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
          add(c, glowMaterial(this.scene, `iceMat:${key}:${i}`, color, 0.75, false));
        }
        break;
      case 'stars':
        for (let i = 0; i < 3; i++) {
          const s = MeshBuilder.CreatePolyhedron(`star:${key}:${i}`, { type: 1, size: 0.08 }, this.scene);
          add(s, glowMaterial(this.scene, `starMat:${key}:${i}`, color, 1));
          v.spin.push(s);
        }
        break;
      case 'bubble': {
        // Velo apenas teñido (mezcla normal, no blanquea) y dos aros brillantes que giran.
        const d = Math.max(1.2, h * 0.9) * 1.2;
        const b = MeshBuilder.CreateSphere(`bubble:${key}`, { diameter: d, segments: 16 }, this.scene);
        b.position.y = h * 0.5;
        add(b, glowMaterial(this.scene, `bubbleMat:${key}`, color, 0.14, false));
        for (let i = 0; i < 2; i++) {
          const ring = MeshBuilder.CreateTorus(`bubbleRing:${key}:${i}`, { diameter: d, thickness: 0.03, tessellation: 40 }, this.scene);
          ring.position.y = h * 0.5;
          ring.rotation.x = i === 0 ? 0.5 : -0.9;
          add(ring, glowMaterial(this.scene, `bubbleRingMat:${key}:${i}`, color, 0.9));
          v.spin.push(ring);
        }
        break;
      }
      case 'aura': {
        const r = MeshBuilder.CreateTorus(`aura:${key}`, { diameter: 1.3, thickness: 0.05, tessellation: 32 }, this.scene);
        r.position.y = 0.06;
        add(r, glowMaterial(this.scene, `auraMat:${key}`, color, 0.85));
        v.ps = trail(this.scene, `auraPs:${key}`, emitter, { rate: 14, count: 0, color, core, radius: 0.6, upward: true, speed: [0.3, 0.8], size: [0.06, 0.14], life: [0.6, 1.1], gravity: 1 });
        break;
      }
      case 'sparks':
        v.ps = trail(this.scene, `sparks:${key}`, emitter, { rate: 22, count: 0, color, core: [1, 1, 1], radius: 0.35, speed: [1, 2.5], size: [0.04, 0.1], life: [0.08, 0.2], gravity: 0 });
        break;
    }
    return v;
  }

  private bearers(world: World): Bearer[] {
    const out: Bearer[] = [];
    const p = world.player;
    if (p.alive) out.push({ id: p.id, x: p.pos.x, z: p.pos.y, height: this.heightOf(p.id), statuses: world.character.statuses.list });
    for (const e of world.enemies.list) {
      if (e.state === 'dead') continue;
      const a = world.enemyActors.get(e.id);
      if (a && a.statuses.list.length > 0) out.push({ id: e.id, x: e.pos.x, z: e.pos.y, height: this.heightOf(e.id), statuses: a.statuses.list });
    }
    for (const pet of world.pets) {
      if (pet.statuses.list.length > 0) out.push({ id: pet.id, x: pet.pos.x, z: pet.pos.y, height: this.heightOf(pet.id), statuses: pet.statuses.list });
    }
    return out;
  }

  sync(world: World, frameSeconds: number): void {
    this.time += frameSeconds;
    const seen = new Set<string>();
    for (const b of this.bearers(world)) {
      const gy = this.ground.sample(b.x, b.z);
      for (const s of b.statuses) {
        const look = this.visualOf(s.def);
        if (!look) continue;
        const key = `${b.id}:${s.def.id}`;
        seen.add(key);
        let v = this.visuals.get(key);
        if (!v) {
          v = this.build(look.visual, look.color, b.height, key);
          this.visuals.set(key, v);
        }
        v.node.position.set(b.x, gy, b.z);
        v.emitter.set(b.x, gy + (v.kind === 'flames' || v.kind === 'sparks' ? b.height * 0.45 : 0.15), b.z);
        if (v.ps && v.kind === 'flames') v.ps.emitRate = 30 * s.stacks + 15;
        const t = this.time + v.phase;
        if (v.kind === 'stars') {
          v.spin.forEach((m, i) => {
            const a = t * 4 + (i / v!.spin.length) * Math.PI * 2;
            m.position.set(Math.cos(a) * 0.32, b.height + 0.15 + Math.sin(t * 6 + i) * 0.04, Math.sin(a) * 0.32);
            m.rotation.y = t * 5;
          });
        } else if (v.kind === 'bubble') {
          v.mats[0]!.alpha = 0.12 + 0.05 * Math.sin(t * 3);
          v.spin.forEach((m, i) => (m.rotation.y = t * (i === 0 ? 1.1 : -0.8)));
        } else if (v.kind === 'aura') {
          v.node.rotation.y = t;
          v.mats[0]!.alpha = 0.6 + 0.3 * Math.sin(t * 4);
        }
      }
    }
    for (const [key, v] of this.visuals) {
      if (seen.has(key)) continue;
      this.remove(v);
      this.visuals.delete(key);
    }
  }

  private remove(v: Visual): void {
    if (v.ps) retire(v.ps);
    for (const m of v.mats) m.dispose();
    v.node.dispose(false, false);
  }

  reset(): void {
    for (const v of this.visuals.values()) this.remove(v);
    this.visuals.clear();
  }
}
