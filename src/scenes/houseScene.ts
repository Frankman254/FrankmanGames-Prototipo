// Interior de las casas del pueblo: la misma habitación amueblada para todas, de
// geometría procedural. Cada casa del mapa lleva una puerta que se usa al llegar.
import { MeshBuilder, TransformNode, type Mesh, type StandardMaterial } from '@babylonjs/core';
import type { GameData } from '../data';
import { goldOutline } from '../render/interactOutline';
import { solidMaterial } from '../render/materials';
import { World } from '../sim/world';
import type { Vec2 } from '../sim/vec2';
import type { BankHost } from './bankScene';

export type HouseHost = Omit<BankHost, 'onBank'>;

export interface HouseProp {
  x: number;
  y: number;
  w: number;
  d: number;
  rotDeg: number;
}

export interface HouseDoor {
  /** Centro de la puerta, sobre la pared. */
  door: Vec2;
  /** Donde se planta el personaje para usarla y donde reaparece al salir. */
  outside: Vec2;
  rotDeg: number;
}

/** Puerta de una casa, en el mismo lado en que la dibuja la vegetación (0 = −Z, 90 = −X…). */
export function houseDoor(p: HouseProp): HouseDoor {
  const a = (p.rotDeg * Math.PI) / 180;
  const dx = -Math.sin(a);
  const dz = -Math.cos(a);
  const half = Math.abs(dx) > 0.5 ? p.w / 2 : p.d / 2;
  return {
    door: { x: p.x + dx * (half + 0.06), y: p.y + dz * (half + 0.06) },
    outside: { x: p.x + dx * (half + 1.6), y: p.y + dz * (half + 1.6) },
    rotDeg: p.rotDeg,
  };
}

const REACH = 1.6;
const ROOM = { width: 14, depth: 12 };
const FURNITURE = [
  { x: 2.2, z: 9.6, w: 2.6, d: 3 }, // cama
  { x: 11.5, z: 10.8, w: 3.4, d: 0.9 }, // estantería
  { x: 7, z: 6.6, w: 2.4, d: 1.4 }, // mesa
];

type Target = { action: 'enter'; pos: Vec2; door: HouseDoor } | { action: 'leave'; pos: Vec2 };

export class HouseScene {
  readonly exterior: TransformNode;
  readonly interior: TransformNode;
  private active = false;
  private pending: Target | null = null;
  private outside: Vec2 | null = null;
  private outdoorZoom = 0;
  private readonly targets = new Map<Mesh, Target>();
  private readonly materials: StandardMaterial[] = [];

  constructor(private readonly host: HouseHost, houses: readonly HouseProp[]) {
    const scene = host.view.scene;
    this.exterior = new TransformNode('house-exterior', scene);
    this.interior = new TransformNode('house-interior', scene);
    const wood = this.material('house-door', [0.3, 0.18, 0.1]);
    for (const p of houses) {
      const d = houseDoor(p);
      const m = MeshBuilder.CreateBox('house-door', { width: 1.2, height: 2.1, depth: 0.14 }, scene);
      m.position.set(d.door.x, (host.ground?.sample(d.door.x, d.door.y) ?? 0) + 1.05, d.door.y);
      m.rotation.y = (p.rotDeg * Math.PI) / 180;
      m.parent = this.exterior;
      m.material = wood;
      goldOutline(m);
      this.targets.set(m, { action: 'enter', pos: d.outside, door: d });
    }
    this.buildRoom();
    this.interior.setEnabled(false);
  }

  get inside(): boolean {
    return this.active;
  }

  get place(): { name: string; levelMin: number; levelMax: number } | null {
    return this.active ? { name: 'Casa del pueblo', levelMin: 1, levelMax: 1 } : null;
  }

  /** Dónde vuelve a aparecer al salir o al cargar la partida guardada dentro. */
  get returnPoint(): Vec2 | null {
    return this.outside;
  }

  click(x: number, y: number): boolean {
    this.pending = null;
    if (this.host.world().character.spectral.active) return false;
    const hit = this.host.view.scene.pick(x, y, (mesh) => this.targets.has(mesh as Mesh) && mesh.isEnabled());
    const target = hit?.pickedMesh ? this.targets.get(hit.pickedMesh as Mesh) : undefined;
    if (!target) return false;
    this.pending = target;
    this.host.world().commandMove(target.pos);
    return true;
  }

  update(): void {
    const target = this.pending;
    if (!target) return;
    const w = this.host.world();
    if (!w.player.alive || w.character.spectral.active) {
      this.pending = null;
      return;
    }
    if (Math.hypot(w.player.pos.x - target.pos.x, w.player.pos.y - target.pos.y) > REACH) {
      if (w.player.path.length === 0) this.pending = null;
      return;
    }
    this.pending = null;
    w.player.path = [];
    if (target.action === 'enter') this.enter(target.door);
    else this.leave();
  }

  enter(door: HouseDoor): boolean {
    const previous = this.host.world();
    if (this.active || previous.character.spectral.active || !previous.player.alive) return false;
    const d = this.host.data;
    const data: GameData = { ...d, zone: { ...d.zone, width: ROOM.width, depth: ROOM.depth, playerStart: { x: 7, y: 2.4 }, navPaint: undefined, obstacles: FURNITURE.map((f) => ({ x: f.x, y: f.z, w: f.w, d: f.d })) } };
    const w = this.makeWorld(data, true);
    this.outside = door.outside;
    this.outdoorZoom = this.host.view.rig.zoom;
    this.active = true;
    this.interior.setEnabled(true);
    this.host.switchInside(true);
    this.host.install(w);
    this.host.view.rig.jumpTo(10);
    return true;
  }

  leave(): void {
    if (!this.active) return;
    const d = this.host.data;
    const w = this.makeWorld({ ...d, zone: { ...d.zone, playerStart: { ...this.outside! } } }, false);
    this.reset();
    this.host.install(w);
  }

  /** Nueva partida, carga o poción de recuerdo: restaura las vistas sin construir otro mundo. */
  reset(): void {
    this.pending = null;
    if (!this.active) return;
    this.active = false;
    this.interior.setEnabled(false);
    this.host.switchInside(false);
    this.host.view.rig.jumpTo(this.outdoorZoom);
  }

  private makeWorld(data: GameData, interior: boolean): World {
    const previous = this.host.world();
    const ch = previous.character;
    const health = ch.health;
    const resource = ch.resource;
    const w = new World(data, { seed: this.host.nextSeed?.() ?? data.loadTest.seed, encounter: false, interior, zones: !interior, character: ch, timeOfDay: previous.timeOfDay });
    ch.health = Math.min(health, ch.maxHealth);
    ch.resource = Math.min(resource, ch.maxResource);
    return w;
  }

  private buildRoom(): void {
    const { width: W, depth: D } = ROOM;
    const plaster = this.material('house-plaster', [0.78, 0.71, 0.6]);
    const boards = this.material('house-boards', [0.42, 0.28, 0.16]);
    const wood = this.material('house-wood', [0.29, 0.17, 0.09]);
    const cloth = this.material('house-cloth', [0.46, 0.17, 0.14]);
    const blanket = this.material('house-blanket', [0.2, 0.34, 0.4]);
    const clay = this.material('house-clay', [0.62, 0.34, 0.2]);
    const lamp = this.material('house-lamp', [1, 0.82, 0.5]);
    lamp.emissiveColor.set(1, 0.72, 0.35);
    const part = (n: string, x: number, y: number, z: number, w: number, h: number, d: number, mat: StandardMaterial): Mesh => {
      const m = MeshBuilder.CreateBox(`house-${n}`, { width: w, height: h, depth: d }, this.host.view.scene);
      m.position.set(x, y, z);
      m.parent = this.interior;
      m.material = mat;
      m.isPickable = false;
      return m;
    };
    part('floor', W / 2, -0.15, D / 2, W, 0.3, D, boards);
    part('wall-back', W / 2, 2, D - 0.15, W, 4, 0.3, plaster);
    part('wall-left', 0.15, 2, D / 2, 0.3, 4, D, plaster);
    part('wall-right', W - 0.15, 2, D / 2, 0.3, 4, D, plaster);
    part('wall-front-l', 3.1, 0.3, 0.15, 6.2, 0.6, 0.3, plaster);
    part('wall-front-r', W - 3.1, 0.3, 0.15, 6.2, 0.6, 0.3, plaster);
    for (const x of [3.5, 7, 10.5]) part('beam', x, 3.9, D / 2, 0.25, 0.25, D, wood);
    part('rug', 7, 0.02, 5.4, 4.6, 0.04, 3.8, cloth);
    // Cama, estantería con vasijas, mesa con dos taburetes y lámpara.
    part('bed', 2.2, 0.35, 9.6, 2.6, 0.7, 3, wood);
    part('bed-sheet', 2.2, 0.78, 9.3, 2.4, 0.16, 2.3, blanket);
    part('bed-pillow', 2.2, 0.82, 10.6, 1.8, 0.2, 0.6, plaster);
    part('shelf', 11.5, 1.2, 10.8, 3.4, 2.4, 0.9, wood);
    for (const x of [10.5, 11.5, 12.5]) for (const y of [0.9, 1.75]) part('pot', x, y, 10.3, 0.4, 0.5, 0.4, clay);
    part('table', 7, 0.75, 6.6, 2.4, 0.14, 1.4, wood);
    for (const [x, z] of [[6, 6.1], [8, 6.1], [6, 7.1], [8, 7.1]] as const) part('table-leg', x, 0.35, z, 0.14, 0.7, 0.14, wood);
    part('table-lamp', 7, 1, 6.6, 0.3, 0.36, 0.3, lamp);
    part('stool', 5, 0.3, 6.6, 0.6, 0.6, 0.6, wood);
    part('stool', 9, 0.3, 6.6, 0.6, 0.6, 0.6, wood);
    const exit = part('exit', 7, 1.2, 0.2, 1.8, 2.4, 0.26, wood);
    exit.isPickable = true;
    goldOutline(exit);
    this.targets.set(exit, { action: 'leave', pos: { x: 7, y: 1.6 } });
  }

  private material(name: string, rgb: [number, number, number]): StandardMaterial {
    const m = solidMaterial(this.host.view.scene, name, rgb);
    this.materials.push(m);
    return m;
  }
}
