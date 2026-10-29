// Botín en el suelo, hecho con geometría generada por código: bolsa atada con
// cinta del color de su rareza, cofre pequeño para lo raro o superior (con haz de
// luz vertical) y montoncito de monedas que gira. Todo brilla con el color de su
// rareza y se apoya en el terreno. Una caja invisible recibe el clic.
import { Color3, Mesh, MeshBuilder, StandardMaterial, TransformNode, Vector3, type Scene } from '@babylonjs/core';
import type { FxDef } from '../data/fxSchema';
import { RARITIES, type Rarity } from '../rpg/contracts';
import type { World } from '../sim/world';
import type { HeightField } from '../world/terrain';
import { BurstPool, glowMaterial } from './fx/particles';

interface LootVisual {
  root: TransformNode;
  spin: TransformNode;
  hit: Mesh;
  glow: StandardMaterial;
  beam: StandardMaterial | null;
  sparkleTimer: number;
  rarity: Rarity;
}

export interface LootLabel {
  text: string;
  color: string;
}

export class LootView {
  private readonly items = new Map<number, LootVisual>();
  private readonly rarityColor: Record<Rarity, Color3>;
  private readonly rarityHex: Record<Rarity, string>;
  private readonly cloth: StandardMaterial;
  private readonly wood: StandardMaterial;
  private readonly gold: StandardMaterial;
  private readonly trims = new Map<Rarity, StandardMaterial>();
  private readonly hitMat: StandardMaterial;
  private readonly sparkles: BurstPool;
  private time = 0;

  constructor(
    private readonly scene: Scene,
    rarityColor: Record<Rarity, string>,
    private readonly ground: HeightField,
    private readonly fx: FxDef,
  ) {
    this.rarityHex = rarityColor;
    this.rarityColor = Object.fromEntries(Object.entries(rarityColor).map(([r, hex]) => [r, Color3.FromHexString(hex)])) as Record<Rarity, Color3>;
    const mat = (name: string, rgb: [number, number, number], emissive = 0): StandardMaterial => {
      const m = new StandardMaterial(name, scene);
      m.diffuseColor = new Color3(...rgb);
      m.specularColor = new Color3(0.1, 0.1, 0.1);
      m.emissiveColor = new Color3(...rgb).scale(emissive);
      return m;
    };
    this.cloth = mat('lootCloth', [0.55, 0.4, 0.24]);
    this.wood = mat('lootWood', [0.42, 0.27, 0.15]);
    this.gold = mat('lootGold', [1, 0.8, 0.25], 0.35);
    this.gold.specularColor = new Color3(0.9, 0.8, 0.4);
    this.hitMat = mat('lootHit', [1, 1, 1]);
    this.sparkles = new BurstPool(scene, 6, 40);
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

  /** Texto y color de la etiqueta de un botín (nombre del objeto o monedas). */
  label(world: World, lootId: number): LootLabel | null {
    const l = world.lootView().find((x) => x.id === lootId);
    if (!l) return null;
    if (!l.item) return { text: `${l.gold} monedas`, color: '#ffd45a' };
    const name = world.content.items[l.item.itemId]?.name ?? l.item.itemId;
    return { text: name, color: this.rarityHex[l.rarity] };
  }

  private trim(r: Rarity): StandardMaterial {
    let m = this.trims.get(r);
    if (!m) {
      m = new StandardMaterial(`lootTrim-${r}`, this.scene);
      m.diffuseColor = this.rarityColor[r].clone();
      m.emissiveColor = this.rarityColor[r].scale(0.6);
      this.trims.set(r, m);
    }
    return m;
  }

  private beamFrom(r: Rarity): boolean {
    return RARITIES.indexOf(r) >= RARITIES.indexOf(this.fx.loot.beamFromRarity);
  }

  private build(id: number, item: boolean, rarity: Rarity): LootVisual {
    const s = this.scene;
    const root = new TransformNode(`loot${id}`, s);
    const spin = new TransformNode(`lootSpin${id}`, s);
    spin.parent = root;
    const add = (m: Mesh, mat: StandardMaterial, parent: TransformNode = spin): Mesh => {
      m.parent = parent;
      m.material = mat;
      m.isPickable = false;
      return m;
    };
    const col = this.rarityColor[rarity];
    if (!item) {
      // Monedas: tres discos apilados un poco desalineados.
      for (let i = 0; i < 3; i++) {
        const c = add(MeshBuilder.CreateCylinder(`coin${id}:${i}`, { diameter: 0.22, height: 0.04, tessellation: 16 }, s), this.gold);
        c.position.set((i - 1) * 0.04, 0.03 + i * 0.045, (i % 2) * 0.03);
      }
    } else if (this.beamFrom(rarity)) {
      // Cofre: caja de madera, tapa redondeada y herrajes del color de la rareza.
      add(MeshBuilder.CreateBox(`chest${id}`, { width: 0.42, height: 0.24, depth: 0.28 }, s), this.wood).position.y = 0.12;
      const lid = add(MeshBuilder.CreateCylinder(`chestLid${id}`, { diameter: 0.28, height: 0.42, tessellation: 12, arc: 0.5 }, s), this.wood);
      lid.rotation.set(0, 0, Math.PI / 2);
      lid.rotation.x = -Math.PI / 2;
      lid.position.y = 0.24;
      for (const x of [-0.14, 0.14]) add(MeshBuilder.CreateBox(`chestBand${id}${x}`, { width: 0.04, height: 0.27, depth: 0.3 }, s), this.trim(rarity)).position.set(x, 0.135, 0);
      add(MeshBuilder.CreateBox(`chestLock${id}`, { width: 0.06, height: 0.08, depth: 0.03 }, s), this.trim(rarity)).position.set(0, 0.2, -0.15);
    } else {
      // Bolsa: saco redondeado, cuello y cinta de la rareza.
      const bag = add(MeshBuilder.CreateSphere(`bag${id}`, { diameter: 0.34, segments: 10 }, s), this.cloth);
      bag.scaling.y = 0.85;
      bag.position.y = 0.15;
      add(MeshBuilder.CreateCylinder(`bagNeck${id}`, { diameterTop: 0.14, diameterBottom: 0.08, height: 0.1, tessellation: 10 }, s), this.cloth).position.y = 0.32;
      add(MeshBuilder.CreateTorus(`bagTie${id}`, { diameter: 0.1, thickness: 0.025, tessellation: 16 }, s), this.trim(rarity)).position.y = 0.3;
    }
    // Brillo en el suelo y, para lo raro o superior, un haz de luz.
    const glow = glowMaterial(s, `lootGlow${id}`, [col.r, col.g, col.b], this.fx.loot.glow);
    const disc = add(MeshBuilder.CreateDisc(`lootDisc${id}`, { radius: 0.45, tessellation: 24 }, s), glow, root);
    disc.rotation.x = Math.PI / 2;
    disc.position.y = 0.03;
    let beam: StandardMaterial | null = null;
    if (item && this.beamFrom(rarity)) {
      beam = glowMaterial(s, `lootBeam${id}`, [col.r, col.g, col.b], 0.35);
      const h = this.fx.loot.beamHeight;
      add(MeshBuilder.CreateCylinder(`lootBeamMesh${id}`, { diameterTop: 0.08, diameterBottom: 0.38, height: h, tessellation: 16, cap: Mesh.NO_CAP }, s), beam, root).position.y = h / 2;
    }
    const hit = MeshBuilder.CreateBox(`lootHit${id}`, { width: 0.6, height: 0.6, depth: 0.6 }, s);
    hit.parent = root;
    hit.position.y = 0.3;
    hit.material = this.hitMat;
    hit.isVisible = false;
    hit.isPickable = true;
    hit.metadata = { lootId: id };
    return { root, spin, hit, glow, beam, sparkleTimer: Math.random(), rarity };
  }

  sync(world: World, _alpha: number, frameSeconds: number): void {
    this.time += frameSeconds;
    const seen = new Set<number>();
    const at = new Vector3();
    for (const l of world.lootView()) {
      seen.add(l.id);
      let v = this.items.get(l.id);
      if (!v) {
        v = this.build(l.id, l.item !== null, l.rarity);
        this.items.set(l.id, v);
      }
      const phase = l.id * 1.7;
      v.root.position.set(l.x, this.ground.sample(l.x, l.y), l.y);
      v.spin.position.y = 0.05 + Math.sin(this.time * 3 + phase) * 0.05;
      v.spin.rotation.y = l.item ? Math.sin(this.time * 0.8 + phase) * 0.5 : this.time * 2.5 + phase;
      v.glow.alpha = this.fx.loot.glow * (0.6 + 0.4 * Math.sin(this.time * 4 + phase));
      if (v.beam) v.beam.alpha = 0.25 + 0.12 * Math.sin(this.time * 2 + phase);
      // Destellos de vez en cuando (más a menudo cuanto más rara).
      v.sparkleTimer -= frameSeconds * (1 + RARITIES.indexOf(v.rarity));
      if (v.sparkleTimer <= 0) {
        v.sparkleTimer = 1.2;
        const c = l.item ? this.rarityColor[v.rarity] : new Color3(1, 0.85, 0.3);
        this.sparkles.burst(at.set(l.x, v.root.position.y + 0.35, l.y), { count: 4, color: [c.r, c.g, c.b], core: [1, 1, 1], radius: 0.2, speed: [0.2, 0.6], size: [0.04, 0.09], life: [0.3, 0.6], gravity: 0.5 });
      }
    }
    for (const [id, v] of this.items) {
      if (seen.has(id)) continue;
      this.remove(v);
      this.items.delete(id);
    }
  }

  private remove(v: LootVisual): void {
    v.glow.dispose();
    v.beam?.dispose();
    v.root.dispose(false, false);
  }

  /** Quita todo (reinicio de arena). */
  reset(): void {
    for (const v of this.items.values()) this.remove(v);
    this.items.clear();
  }
}
