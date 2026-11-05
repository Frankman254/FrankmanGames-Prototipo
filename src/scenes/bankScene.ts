// Banco modelado en Blender (scripts/blender/interiores.py). El anfitrión decide qué vistas del
// exterior ocultar y cambia el suelo compartido cuando switchInside se invoca.
import { MeshBuilder, TransformNode, type AnimationGroup, type Mesh, type StandardMaterial } from '@babylonjs/core';
import type { GameData } from '../data';
import type { ArenaView } from '../render/arenaView';
import { createCharacter, type CharacterModel } from '../render/characters/characterModel';
import { chestModel } from '../render/dungeonView';
import { goldOutline } from '../render/interactOutline';
import { solidMaterial } from '../render/materials';
import { staticMesh, staticTexture } from '../render/staticModels';
import { loadWorldData } from '../data/worldData';
import { World } from '../sim/world';
import type { Vec2 } from '../sim/vec2';

/** Claro del Cruce, separado de las casas y de la calzada horizontal. */
export const BANK_LOCATION = {
  building: { x: 116, y: 133.5, w: 8, d: 6 },
  entrance: { x: 116, y: 129 },
  returnPoint: { x: 116, y: 127.5 },
};

export interface BankHost {
  data: GameData;
  view: ArenaView;
  ground?: { sample(x: number, y: number): number };
  world(): World;
  install(world: World): void;
  /** Oculta/restaura terreno, vegetación, agua y PNJ; cambia flatHeight. */
  switchInside(inside: boolean): void;
  onBank(): void;
  nextSeed?(): number;
}

/** El cofre de `cofre.glb` mide 1,24 m; aquí ocupa el hueco que bloquea el paso. */
const CHEST_SCALE = 1.45;
const CHEST_POS = { x: 16, z: 9 };
const CHEST_CLOSES_AT = 3.5;

/** Columnas y estanterías del interior: se dibujan y bloquean el paso. */
const BANK_FURNITURE = [
  { kind: 'pillar', x: 4, z: 3.5, w: 0.8, d: 0.8 },
  { kind: 'pillar', x: 16, z: 3.5, w: 0.8, d: 0.8 },
  { kind: 'pillar', x: 3, z: 9, w: 0.8, d: 0.8 },
  { kind: 'shelf', x: 0.9, z: 13, w: 0.9, d: 4.4 },
  { kind: 'shelf', x: 19.1, z: 13, w: 0.9, d: 4.4 },
] as const;

type Action = 'enter' | 'leave' | 'bank';
interface Target { action: Action; pos: Vec2 }

export class BankScene {
  readonly exterior: TransformNode;
  readonly interior: TransformNode;
  private active = false;
  private pending: Target | null = null;
  private readonly targets = new Map<Mesh, Target>();
  private readonly materials: StandardMaterial[] = [];
  private outdoorZoom = 0;
  private chestTarget: Target | null = null;
  private clerkModel: CharacterModel | null = null;
  private chestClips: { open: AnimationGroup; close: AnimationGroup } | null = null;
  private chestOpen = false;

  constructor(private readonly host: BankHost) {
    const scene = host.view.scene;
    this.exterior = new TransformNode('bank-exterior', scene);
    this.interior = new TransformNode('bank-interior', scene);
    const stone = this.material('bank-stone', [0.72, 0.66, 0.53], 'muro');
    const floor = this.material('bank-floor', [0.62, 0.57, 0.46], 'baldosa');
    const wood = this.material('bank-wood', [0.42, 0.26, 0.14], 'madera');
    const brass = this.material('bank-brass', [0.76, 0.57, 0.18]);
    const roof = this.material('bank-roof', [0.24, 0.37, 0.35]);
    const rug = this.material('bank-rug', [1, 1, 1], 'patron_rombos_tierra', true);
    const lamp = this.material('bank-lamp', [1, 0.8, 0.45]);
    lamp.emissiveColor.set(1, 0.72, 0.35);
    const b = BANK_LOCATION.building;
    const h = host.ground?.sample(b.x, b.y) ?? 0;
    for (const [piece, m] of [['banco_muros', stone], ['banco_techo', roof], ['banco_laton', brass]] as const) {
      const p = this.piece(piece, m, this.exterior);
      p.position.set(b.x, h, b.y);
    }
    const entrance = this.piece('banco_puerta', wood, this.exterior, 'bank-door');
    entrance.position.set(b.x, h, b.y - b.d / 2 - 0.08);
    this.targets.set(entrance, { action: 'enter', pos: BANK_LOCATION.entrance });
    goldOutline(entrance);

    for (const [piece, m] of [['banco_suelo', floor], ['banco_paredes', stone], ['banco_estantes', wood], ['banco_laton_int', brass], ['banco_alfombra', rug], ['banco_alfombra_borde', brass], ['banco_lamparas', lamp]] as const) {
      this.piece(piece, m, this.interior);
    }
    this.piece('banco_mostrador', wood, this.interior, 'bank-counter');

    // Empleado y cofre: cajas invisibles que reciben el clic; encima, sus modelos con animación.
    const hidden = (name: string, x: number, y: number, z: number, w: number, hh: number, d: number): Mesh => {
      const m = this.box(name, this.interior, x, y, z, w, hh, d, wood);
      m.visibility = 0;
      goldOutline(m);
      return m;
    };
    const clerk = hidden('clerk-body', 10, 1.1, 12, 0.8, 2.2, 0.6);
    const head = hidden('clerk-head', 10, 2.05, 12, 0.5, 0.5, 0.5);
    const bankTarget: Target = { action: 'bank', pos: { x: 10, y: 9.4 } };
    this.targets.set(clerk, bankTarget); this.targets.set(head, bankTarget);
    const chest = hidden('chest', CHEST_POS.x, 0.6, CHEST_POS.z, 1.8, 1.2, 1.2);
    const chestTarget: Target = { action: 'bank', pos: { x: 16, y: 7 } };
    this.chestTarget = chestTarget;
    this.targets.set(chest, chestTarget);
    if (host.view.assets) this.addModels();

    const exit = this.piece('banco_salida', wood, this.interior, 'bank-exit');
    exit.position.set(10, 0, 0.3);
    this.targets.set(exit, { action: 'leave', pos: { x: 10, y: 2 } });
    goldOutline(exit, 0.04);
    this.interior.setEnabled(false);
  }

  get inside(): boolean { return this.active; }
  get place(): { name: string; levelMin: number; levelMax: number } | null {
    return this.active ? { name: 'Banco del Cruce', levelMin: 1, levelMax: 1 } : null;
  }

  click(x: number, y: number): boolean {
    this.pending = null;
    if (this.host.world().character.spectral.active) return false;
    const hit = this.host.view.scene.pick(x, y, mesh => this.targets.has(mesh as Mesh) && mesh.isEnabled());
    const target = hit?.pickedMesh ? this.targets.get(hit.pickedMesh as Mesh) : undefined;
    if (!target) return false;
    this.pending = target;
    this.host.world().commandMove(target.pos);
    return true;
  }

  update(dt: number): void {
    if (this.active) {
      this.clerkModel?.update(dt, 0);
      this.closeChestWhenAway();
    }
    const target = this.pending;
    if (!target) return;
    const w = this.host.world();
    if (!w.player.alive || w.character.spectral.active) { this.pending = null; return; }
    if (Math.hypot(w.player.pos.x - target.pos.x, w.player.pos.y - target.pos.y) > 1.5) {
      if (w.player.path.length === 0) this.pending = null;
      return;
    }
    this.pending = null;
    w.player.path = [];
    if (target.action === 'enter') this.enter();
    else if (target.action === 'leave') this.leave();
    else {
      if (target === this.chestTarget) this.setChestOpen(true);
      this.host.onBank();
    }
  }

  enter(): boolean {
    if (this.active || this.host.world().character.spectral.active || !this.host.world().player.alive) return false;
    const d = this.host.data;
    const interiorData: GameData = { ...d, zone: { ...d.zone, shared: undefined, originX: 0, originY: 0, width: 20, depth: 16,
      playerStart: { x: 10, y: 3 }, navPaint: undefined, obstacles: [
        { x: 10, y: 11, w: 10, d: 1 }, { x: 16, y: 9, w: 1.8, d: 1.2 },
        { x: 0.2, y: 8, w: 0.4, d: 16 }, { x: 19.8, y: 8, w: 0.4, d: 16 },
        { x: 10, y: 15.8, w: 20, d: 0.4 },
        ...BANK_FURNITURE.map((f) => ({ x: f.x, y: f.z, w: f.w, d: f.d })),
      ] } };
    const w = this.makeWorld(interiorData, true);
    this.outdoorZoom = this.host.view.rig.zoom;
    this.active = true; this.pending = null;
    this.exterior.setEnabled(false); this.interior.setEnabled(true);
    this.host.switchInside(true); this.host.install(w);
    this.host.view.rig.jumpTo(12);
    w.character.emit({ type: 'zoneEnter', zoneId: 'bank-crossroads', name: 'Banco del Cruce', levelMin: 1, levelMax: 1, safe: true });
    return true;
  }

  leave(): void {
    if (!this.active) return;
    const d = this.host.data;
    const w = this.makeWorld({ ...d, zone: { ...d.zone, shared: undefined, originX: 0, originY: 0, playerStart: { ...BANK_LOCATION.returnPoint } } }, false);
    this.reset(); this.host.install(w);
  }

  /** Usado por nueva partida/carga: restaura vistas sin construir otro mundo. */
  reset(): void {
    this.pending = null;
    if (!this.active) return;
    this.active = false;
    this.setChestOpen(false);
    this.interior.setEnabled(false); this.exterior.setEnabled(true);
    this.host.switchInside(false); this.host.view.rig.jumpTo(this.outdoorZoom);
  }

  dispose(): void {
    this.reset(); this.targets.clear();
    this.clerkModel?.dispose();
    this.exterior.dispose(); this.interior.dispose();
    for (const m of this.materials) m.dispose();
  }

  private makeWorld(data: GameData, interior: boolean): World {
    const previous = this.host.world();
    const ch = previous.character;
    const health = ch.health; const resource = ch.resource;
    const w = new World(data, { seed: this.host.nextSeed?.() ?? data.loadTest.seed,
      encounter: false, interior, zones: !interior, character: ch, timeOfDay: previous.timeOfDay });
    ch.health = Math.min(health, ch.maxHealth); ch.resource = Math.min(resource, ch.maxResource);
    return w;
  }

  /** Empleado con el modelo de los PNJ y cofre con sus clips. */
  private addModels(): void {
    const { view } = this.host;
    const data = loadWorldData();
    const entry = data.assets['npc'];
    if (entry) {
      const m = createCharacter(view.scene, 'npc', 'bank-clerk-model', entry, data.animation, view.assets, 'elder');
      m.root.parent = this.interior;
      m.root.position.set(10, 0, 12);
      m.root.rotation.y = Math.PI / 2; // +X del modelo, hacia el mostrador.
      m.play('idle');
      void m.ready?.then(() => { for (const mesh of m.meshes) { mesh.isPickable = false; goldOutline(mesh, 0.012); } });
      this.clerkModel = m;
    }
    void chestModel(view.scene).then((model) => {
      const inst = model.instantiateModelsToScene((n) => `bank-cofre:${n}`, true, { doNotInstantiate: true });
      for (const g of inst.animationGroups) g.stop();
      const root = new TransformNode('bank-cofre', view.scene);
      root.parent = this.interior;
      root.position.set(CHEST_POS.x, 0, CHEST_POS.z);
      root.scaling.setAll(CHEST_SCALE);
      for (const n of inst.rootNodes) n.parent = root;
      for (const mesh of root.getChildMeshes(false)) { mesh.isPickable = false; goldOutline(mesh, 0.012); }
      const open = inst.animationGroups.find((g) => g.name.endsWith('Abrir'));
      const close = inst.animationGroups.find((g) => g.name.endsWith('Cerrar'));
      if (open && close) {
        open.start(false, 1, open.from, open.from);
        this.chestClips = { open, close };
      }
    }).catch((err: unknown) => console.error('[modelos] cofre del banco', err));
  }

  private setChestOpen(on: boolean): void {
    if (on === this.chestOpen || !this.chestClips) return;
    this.chestOpen = on;
    const { open, close } = this.chestClips;
    if (on) { close.stop(); open.start(false, 1, open.from, open.to); }
    else { open.stop(); close.start(false, 1, close.from, close.to); }
  }

  private closeChestWhenAway(): void {
    if (!this.chestOpen) return;
    const p = this.host.world().player.pos;
    if (Math.hypot(p.x - CHEST_POS.x, p.y - CHEST_POS.z) > CHEST_CLOSES_AT) this.setChestOpen(false);
  }

  private piece(piece: string, material: StandardMaterial, parent: TransformNode, name = `bank-${piece}`): Mesh {
    const m = staticMesh(this.host.view.scene, piece, name);
    m.parent = parent;
    m.material = material;
    m.isPickable = this.pickable(name);
    return m;
  }

  private pickable(name: string): boolean {
    return name === 'bank-door' || name === 'bank-exit';
  }

  private material(name: string, rgb: [number, number, number], texture?: string, crisp = false): StandardMaterial {
    const m = solidMaterial(this.host.view.scene, name, rgb);
    if (texture) m.diffuseTexture = staticTexture(this.host.view.scene, texture, crisp);
    this.materials.push(m);
    return m;
  }

  private box(name: string, parent: TransformNode, x: number, y: number, z: number,
    width: number, height: number, depth: number, material: StandardMaterial): Mesh {
    const mesh = MeshBuilder.CreateBox(`bank-${name}`, { width, height, depth }, this.host.view.scene);
    mesh.position.set(x, y, z); mesh.parent = parent; mesh.material = material;
    mesh.isPickable = true; return mesh;
  }
}
