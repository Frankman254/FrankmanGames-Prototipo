// Render mínimo del Slice 03 con primitivas: botín en el suelo (cubo del color
// de su rareza; monedas = disco dorado), mascotas y aliados invocados (esferas)
// y zonas de hechizo (disco translúcido). El botín es pickable para el clic.
import { Color3, Mesh, MeshBuilder, StandardMaterial, type Scene } from '@babylonjs/core';
import type { Rarity } from '../rpg/contracts';
import type { World } from '../sim/world';

const ITEM_SIZE = 0.35;
const BOB_HEIGHT = 0.08;
const PET_COLORS: Record<string, [number, number, number]> = {
  fighter: [0.95, 0.5, 0.2],
  collector: [0.8, 0.75, 0.55],
  guardian: [0.35, 0.65, 0.3],
};

export class LootView {
  private readonly items = new Map<number, Mesh>();
  private readonly pets = new Map<number, Mesh>();
  private readonly zones = new Map<number, Mesh>();
  private readonly rarityMats = new Map<Rarity, StandardMaterial>();
  private readonly goldMat: StandardMaterial;
  private readonly zoneMat: StandardMaterial;
  private readonly petMats = new Map<string, StandardMaterial>();
  private time = 0;

  constructor(private readonly scene: Scene, rarityColor: Record<Rarity, string>) {
    for (const [r, hex] of Object.entries(rarityColor) as [Rarity, string][]) {
      const m = new StandardMaterial(`loot-${r}`, scene);
      m.diffuseColor = Color3.FromHexString(hex);
      m.emissiveColor = Color3.FromHexString(hex).scale(0.35);
      this.rarityMats.set(r, m);
    }
    this.goldMat = new StandardMaterial('loot-gold', scene);
    this.goldMat.diffuseColor = new Color3(1, 0.82, 0.25);
    this.goldMat.emissiveColor = new Color3(0.4, 0.3, 0.05);
    this.zoneMat = new StandardMaterial('zone', scene);
    this.zoneMat.diffuseColor = new Color3(0.4, 0.7, 1);
    this.zoneMat.emissiveColor = new Color3(0.2, 0.35, 0.6);
    this.zoneMat.alpha = 0.3;
  }

  /** Malla pickable → id de botín. */
  static lootIdOf(mesh: { metadata?: unknown } | null | undefined): number | null {
    const md = mesh?.metadata as { lootId?: number } | undefined;
    return typeof md?.lootId === 'number' ? md.lootId : null;
  }

  /** Botín bajo el cursor, o null. */
  pick(scene: Scene, screenX: number, screenY: number): number | null {
    const hit = scene.pick(screenX, screenY, (m) => m.isPickable && m.isEnabled() && LootView.lootIdOf(m) !== null, false, scene.activeCamera);
    return hit?.hit ? LootView.lootIdOf(hit.pickedMesh) : null;
  }

  sync(world: World, alpha: number, frameSeconds: number): void {
    this.time += frameSeconds;
    this.syncLoot(world);
    this.syncPets(world, alpha);
  }

  private syncLoot(world: World): void {
    const seen = new Set<number>();
    for (const l of world.lootView()) {
      seen.add(l.id);
      let m = this.items.get(l.id);
      if (!m) {
        if (l.item) {
          m = MeshBuilder.CreateBox(`loot${l.id}`, { size: ITEM_SIZE }, this.scene);
          m.material = this.rarityMats.get(l.rarity)!;
        } else {
          m = MeshBuilder.CreateCylinder(`loot${l.id}`, { diameter: ITEM_SIZE * 1.1, height: ITEM_SIZE * 0.25, tessellation: 12 }, this.scene);
          m.material = this.goldMat;
        }
        m.metadata = { lootId: l.id };
        m.isPickable = true;
        this.items.set(l.id, m);
      }
      const phase = l.id * 1.7;
      m.position.set(l.x, ITEM_SIZE / 2 + 0.05 + Math.sin(this.time * 3 + phase) * BOB_HEIGHT, l.y);
      m.rotation.y = this.time * 1.5 + phase;
    }
    for (const [id, m] of this.items) {
      if (seen.has(id)) continue;
      m.dispose();
      this.items.delete(id);
    }
  }

  private syncPets(world: World, alpha: number): void {
    const seen = new Set<number>();
    for (const p of world.pets) {
      seen.add(p.id);
      let m = this.pets.get(p.id);
      if (!m) {
        m = MeshBuilder.CreateSphere(`pet${p.id}`, { diameter: p.radius * 2, segments: 8 }, this.scene);
        m.material = this.petMaterial(p.def.behavior, p.itemUid === null);
        m.isPickable = false;
        this.pets.set(p.id, m);
      }
      const x = p.prevPos.x + (p.pos.x - p.prevPos.x) * alpha;
      const z = p.prevPos.y + (p.pos.y - p.prevPos.y) * alpha;
      m.position.set(x, p.radius + 0.05, z);
    }
    for (const [id, m] of this.pets) {
      if (seen.has(id)) continue;
      m.dispose();
      this.pets.delete(id);
    }
  }

  private petMaterial(behavior: string, summoned: boolean): StandardMaterial {
    const key = `${behavior}${summoned ? '-s' : ''}`;
    let m = this.petMats.get(key);
    if (!m) {
      m = new StandardMaterial(`pet-${key}`, this.scene);
      m.diffuseColor = new Color3(...(PET_COLORS[behavior] ?? [0.8, 0.8, 0.8]));
      if (summoned) {
        m.alpha = 0.6;
        m.emissiveColor = new Color3(0.3, 0.3, 0.45);
      }
      this.petMats.set(key, m);
    }
    return m;
  }

  private syncZones(world: World): void {
    const seen = new Set<number>();
    for (const z of world.zones) {
      seen.add(z.id);
      let m = this.zones.get(z.id);
      if (!m) {
        m = MeshBuilder.CreateDisc(`zone${z.id}`, { radius: z.radius, tessellation: 32 }, this.scene);
        m.rotation.x = Math.PI / 2;
        m.material = this.zoneMat;
        m.isPickable = false;
        this.zones.set(z.id, m);
      }
      m.position.set(z.pos.x, 0.04, z.pos.y);
    }
    for (const [id, m] of this.zones) {
      if (seen.has(id)) continue;
      m.dispose();
      this.zones.delete(id);
    }
  }

  /** Quita todo (reinicio de arena). */
  reset(): void {
    for (const m of [...this.items.values(), ...this.pets.values(), ...this.zones.values()]) m.dispose();
    this.items.clear();
    this.pets.clear();
    this.zones.clear();
  }
}
