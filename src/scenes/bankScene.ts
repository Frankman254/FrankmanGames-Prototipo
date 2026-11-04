// Banco original de geometría procedural. El anfitrión decide qué vistas del
// exterior ocultar y cambia el suelo compartido cuando switchInside se invoca.
import { MeshBuilder, TransformNode, type Mesh, type StandardMaterial } from '@babylonjs/core';
import type { GameData } from '../data';
import type { ArenaView } from '../render/arenaView';
import { goldOutline } from '../render/interactOutline';
import { solidMaterial } from '../render/materials';
import { World } from '../sim/world';
import type { Vec2 } from '../sim/vec2';

/** Claro del Cruce, separado de las casas y de la calzada horizontal. */
export const BANK_LOCATION = {
  building: { x: 116, y: 132, w: 8, d: 6 },
  entrance: { x: 116, y: 127.5 },
  returnPoint: { x: 116, y: 126 },
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

  constructor(private readonly host: BankHost) {
    const scene = host.view.scene;
    this.exterior = new TransformNode('bank-exterior', scene);
    this.interior = new TransformNode('bank-interior', scene);
    const stone = this.material('bank-stone', [0.68, 0.62, 0.49]);
    const wood = this.material('bank-wood', [0.29, 0.17, 0.09]);
    const brass = this.material('bank-brass', [0.76, 0.57, 0.18]);
    const roof = this.material('bank-roof', [0.24, 0.37, 0.35]);
    const skin = this.material('bank-clerk-skin', [0.63, 0.4, 0.25]);
    const uniform = this.material('bank-clerk-uniform', [0.12, 0.26, 0.36]);
    const b = BANK_LOCATION.building;
    const h = host.ground?.sample(b.x, b.y) ?? 0;
    this.box('foundation', this.exterior, b.x, h + 0.15, b.y, b.w + 0.5, 0.3, b.d + 0.5, stone);
    this.box('building', this.exterior, b.x, h + 2, b.y, b.w, 4, b.d, stone);
    this.box('roof', this.exterior, b.x, h + 4.2, b.y, b.w + 0.8, 0.5, b.d + 0.8, roof);
    const entrance = this.box('door', this.exterior, b.x, h + 1.3, b.y - b.d / 2 - 0.08, 2.1, 2.6, 0.18, wood);
    this.targets.set(entrance, { action: 'enter', pos: BANK_LOCATION.entrance });
    goldOutline(entrance);
    // Tres barras y un disco dorado dan una señal de tesorería sin texturas.
    this.box('sign', this.exterior, b.x, h + 3.3, b.y - 3.2, 3, 0.65, 0.18, brass);
    for (const x of [b.x - 3, b.x + 3]) this.box('pillar', this.exterior, x, h + 1.9, b.y - 3.3, 0.45, 3.8, 0.5, brass);

    this.box('floor', this.interior, 10, -0.15, 8, 20, 0.3, 16, stone);
    this.box('rear-wall', this.interior, 10, 2.5, 15.8, 20, 5, 0.4, stone);
    this.box('left-wall', this.interior, 0.2, 2.5, 8, 0.4, 5, 16, stone);
    this.box('right-wall', this.interior, 19.8, 2.5, 8, 0.4, 5, 16, stone);
    // Muro bajo delantero: marca el límite sin tapar al personaje.
    this.decor('front-wall-l', 4.3, 0.35, 0.2, 8.6, 0.7, 0.4, stone);
    this.decor('front-wall-r', 15.7, 0.35, 0.2, 8.6, 0.7, 0.4, stone);
    this.furnish(wood, brass, stone);
    this.box('counter', this.interior, 10, 0.7, 11, 10, 1.4, 1, wood);
    const clerk = this.box('clerk-body', this.interior, 10, 1.1, 12, 0.7, 1.4, 0.5, uniform);
    const head = MeshBuilder.CreateSphere('bank-clerk-head', { diameter: 0.55, segments: 8 }, scene);
    head.position.set(10, 2.05, 12); head.material = skin; head.parent = this.interior;
    const bankTarget: Target = { action: 'bank', pos: { x: 10, y: 9.4 } };
    this.targets.set(clerk, bankTarget); this.targets.set(head, bankTarget);
    goldOutline(clerk); goldOutline(head);
    const chest = this.box('chest', this.interior, 16, 0.6, 9, 1.8, 1.2, 1.2, wood);
    const clasp = this.box('chest-clasp', this.interior, 16, 0.8, 8.36, 0.3, 0.5, 0.1, brass);
    const chestTarget: Target = { action: 'bank', pos: { x: 16, y: 7 } };
    this.targets.set(chest, chestTarget); this.targets.set(clasp, chestTarget);
    goldOutline(chest);
    const exit = this.box('exit', this.interior, 10, 1.3, 0.3, 2.5, 2.6, 0.3, wood);
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

  update(_dt: number): void {
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
    else this.host.onBank();
  }

  enter(): boolean {
    if (this.active || this.host.world().character.spectral.active || !this.host.world().player.alive) return false;
    const d = this.host.data;
    const interiorData: GameData = { ...d, zone: { ...d.zone, width: 20, depth: 16,
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
    const w = this.makeWorld({ ...d, zone: { ...d.zone, playerStart: { ...BANK_LOCATION.returnPoint } } }, false);
    this.reset(); this.host.install(w);
  }

  /** Usado por nueva partida/carga: restaura vistas sin construir otro mundo. */
  reset(): void {
    this.pending = null;
    if (!this.active) return;
    this.active = false;
    this.interior.setEnabled(false); this.exterior.setEnabled(true);
    this.host.switchInside(false); this.host.view.rig.jumpTo(this.outdoorZoom);
  }

  dispose(): void {
    this.reset(); this.targets.clear();
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

  /** Mobiliario: geometría y materiales ya existentes del banco, sin interacción. */
  private furnish(wood: StandardMaterial, brass: StandardMaterial, stone: StandardMaterial): void {
    const rug = this.material('bank-rug', [0.46, 0.13, 0.12]);
    const trim = this.material('bank-rug-trim', [0.72, 0.56, 0.22]);
    const lamp = this.material('bank-lamp', [1, 0.8, 0.45]);
    lamp.emissiveColor.set(1, 0.72, 0.35);
    this.decor('rug', 10, 0.02, 5.8, 3.4, 0.04, 8.8, rug);
    this.decor('rug-trim', 10, 0.01, 5.8, 3.9, 0.03, 9.3, trim);
    for (const f of BANK_FURNITURE) {
      if (f.kind === 'pillar') {
        this.decor('pillar', f.x, 2.5, f.z, f.w, 5, f.d, stone);
        this.decor('pillar-base', f.x, 0.15, f.z, f.w + 0.3, 0.3, f.d + 0.3, brass);
        this.decor('pillar-cap', f.x, 4.85, f.z, f.w + 0.3, 0.3, f.d + 0.3, brass);
      } else {
        this.decor('shelf', f.x, 1.1, f.z, f.w, 2.2, f.d, wood);
        const along = f.d > f.w;
        for (const y of [0.6, 1.3, 2]) for (const k of [-1.5, 0, 1.5]) {
          this.decor('strongbox', along ? f.x : f.x + k, y, along ? f.z + k : f.z, along ? f.w + 0.06 : 0.8, 0.4, along ? 0.8 : f.d + 0.06, brass);
        }
      }
    }
    // Reja de ventanilla sobre el mostrador.
    for (let x = 5.5; x <= 14.5; x += 1) if (Math.abs(x - 10) > 1) this.decor('grille', x, 2.05, 10.8, 0.07, 1.3, 0.07, brass);
    this.decor('grille-rail', 10, 2.72, 10.8, 10, 0.1, 0.1, brass);
    for (const [x, z] of [[1, 14.9], [19, 14.9], [7, 15.5], [13, 15.5]] as const) {
      this.decor('lamp-arm', x, 3.2, z, 0.1, 0.5, 0.1, brass);
      const bulb = MeshBuilder.CreateSphere('bank-lamp', { diameter: 0.4, segments: 8 }, this.host.view.scene);
      bulb.position.set(x, 3.55, z); bulb.material = lamp; bulb.parent = this.interior; bulb.isPickable = false;
    }
  }

  private decor(name: string, x: number, y: number, z: number, w: number, h: number, d: number, material: StandardMaterial): void {
    this.box(name, this.interior, x, y, z, w, h, d, material).isPickable = false;
  }

  private material(name: string, rgb: [number, number, number]): StandardMaterial {
    const m = solidMaterial(this.host.view.scene, name, rgb); this.materials.push(m); return m;
  }

  private box(name: string, parent: TransformNode, x: number, y: number, z: number,
    width: number, height: number, depth: number, material: StandardMaterial): Mesh {
    const mesh = MeshBuilder.CreateBox(`bank-${name}`, { width, height, depth }, this.host.view.scene);
    mesh.position.set(x, y, z); mesh.parent = parent; mesh.material = material;
    mesh.isPickable = true; return mesh;
  }
}
