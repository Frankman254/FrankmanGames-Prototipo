// Mascotas y aliados invocados con su personaje animado (`pet.<id>` en
// data/assets.json): zorro de ceniza, búho archivero, tortuga de musgo y lobo
// espectral translúcido. Animación según se mueva o ataque (la simulación no
// emite un suceso de ataque de mascota: se detecta cuando rearma su enfriamiento).
import { Vector3, type AbstractMesh, type Scene } from '@babylonjs/core';
import type { AnimationDataDef, AssetEntry, AssetManifest } from '../data/worldSchema';
import type { Pet } from '../rpg/pets';
import type { World } from '../sim/world';
import type { HeightField } from '../world/terrain';
import type { AssetCache } from './assetCache';
import { createCharacter, type CharacterModel } from './characters/characterModel';
import type { BurstPool } from './fx/particles';

interface PetVisual {
  model: CharacterModel;
  lastCooldown: number;
}

export class PetView {
  private readonly visuals = new Map<number, PetVisual>();
  private readonly tmp = new Vector3();

  constructor(
    private readonly scene: Scene,
    private readonly chars: { assets: AssetManifest; animation: AnimationDataDef; cache: AssetCache },
    private readonly ground: HeightField,
    private readonly shadows: { addCasters(m: readonly AbstractMesh[]): void; removeCasters(m: readonly AbstractMesh[]): void },
    /** Ráfaga al aparecer (invocación). */
    private readonly bursts: BurstPool | null = null,
  ) {}

  heightOf(id: number): number | null {
    return this.visuals.get(id)?.model.height ?? null;
  }

  private entryFor(p: Pet): AssetEntry {
    const e = this.chars.assets[`pet.${p.def.id}`];
    if (e) return e;
    // Sin entrada: un zorro gris, para que se vea algo con forma de animal.
    const g: [number, number, number] = [0.6, 0.6, 0.6];
    return { kind: 'procedural', model: 'fox', scale: 1, ghost: p.itemUid === null, palettes: { default: { skin: g, cloth: g, trim: g, hair: g, gear: [1, 1, 1] } }, looks: {}, gear: {} };
  }

  sync(world: World, alpha: number, frameSeconds: number): void {
    const seen = new Set<number>();
    for (const p of world.pets) {
      seen.add(p.id);
      let v = this.visuals.get(p.id);
      if (!v) {
        const model = createCharacter(this.scene, `pet.${p.def.id}`, `pet${p.id}`, this.entryFor(p), this.chars.animation, this.chars.cache);
        this.shadows.addCasters(model.meshes);
        v = { model, lastCooldown: p.attackCooldown };
        this.visuals.set(p.id, v);
        if (this.bursts) {
          this.tmp.set(p.pos.x, this.ground.sample(p.pos.x, p.pos.y) + 0.3, p.pos.y);
          this.bursts.burst(this.tmp, { count: 30, color: [0.55, 0.7, 1], core: [0.95, 0.97, 1], radius: 0.5, upward: true, speed: [0.5, 2], gravity: 1, life: [0.4, 0.8] });
        }
      }
      const x = p.prevPos.x + (p.pos.x - p.prevPos.x) * alpha;
      const z = p.prevPos.y + (p.pos.y - p.prevPos.y) * alpha;
      const m = v.model;
      m.root.position.set(x, this.ground.sample(x, z), z);
      m.root.rotation.y = -p.facing;
      const moving = p.path.length > 0 || Math.hypot(p.pos.x - p.prevPos.x, p.pos.y - p.prevPos.y) > 1e-4;
      if (p.attackCooldown > v.lastCooldown + 1e-6) m.play('attack', { restart: true });
      v.lastCooldown = p.attackCooldown;
      if (m.state !== 'attack' || m.finished) m.play(moving ? 'run' : 'idle');
      m.update(frameSeconds, moving ? p.def.speed : 0);
    }
    for (const [id, v] of this.visuals) {
      if (seen.has(id)) continue;
      this.shadows.removeCasters(v.model.meshes);
      v.model.dispose();
      this.visuals.delete(id);
    }
  }

  reset(): void {
    for (const v of this.visuals.values()) {
      this.shadows.removeCasters(v.model.meshes);
      v.model.dispose();
    }
    this.visuals.clear();
  }
}
