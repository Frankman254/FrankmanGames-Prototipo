// Interiores de geometría procedural: dos tipos de casa y el salón del castillo.
// Cada edificio del mapa lleva una puerta que se usa al llegar.
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

/** Distancia del centro del castillo a la cara exterior de su portón (`scripts/blender/castillo.py`). */
const CASTLE_GATE_REACH = 11.6;

/** Portón del castillo: va en la muralla, más adentro que el borde del obstáculo. */
export function castleGate(p: HouseProp): HouseDoor {
  const base = houseDoor(p);
  const a = (p.rotDeg * Math.PI) / 180;
  return { ...base, door: { x: p.x - Math.sin(a) * CASTLE_GATE_REACH, y: p.y - Math.cos(a) * CASTLE_GATE_REACH } };
}

const REACH = 1.6;

type RoomId = 'hogar' | 'taller' | 'salon';

interface Room {
  name: string;
  width: number;
  depth: number;
  zoom: number;
  /** Lo que bloquea el paso. */
  solids: readonly { x: number; z: number; w: number; d: number }[];
}

const ROOMS: Record<RoomId, Room> = {
  hogar: {
    name: 'Casa del pueblo', width: 14, depth: 12, zoom: 10,
    solids: [{ x: 2.2, z: 9.6, w: 2.6, d: 3 }, { x: 11.5, z: 10.8, w: 3.4, d: 0.9 }, { x: 7, z: 6.6, w: 2.4, d: 1.4 }],
  },
  taller: {
    name: 'Taller del pueblo', width: 14, depth: 12, zoom: 10,
    solids: [{ x: 7, z: 10.9, w: 7, d: 1.1 }, { x: 2, z: 10, w: 2.4, d: 2.4 }, { x: 11.8, z: 5.5, w: 2.4, d: 3.4 }, { x: 4.5, z: 5.8, w: 1.2, d: 1.2 }],
  },
  salon: {
    name: 'Gran salón del castillo', width: 24, depth: 22, zoom: 18,
    solids: [
      ...[6, 18].flatMap((x) => [6, 11, 16].map((z) => ({ x, z, w: 1.4, d: 1.4 }))),
      { x: 12, z: 19.6, w: 6, d: 3 },
    ],
  },
};

type Target = { action: 'enter'; pos: Vec2; door: HouseDoor; room: RoomId } | { action: 'leave'; pos: Vec2 };

type Part = (n: string, x: number, y: number, z: number, w: number, h: number, d: number, mat: StandardMaterial) => Mesh;

export class HouseScene {
  readonly exterior: TransformNode;
  private readonly rooms = new Map<RoomId, TransformNode>();
  private room: RoomId | null = null;
  private pending: Target | null = null;
  private outside: Vec2 | null = null;
  private outdoorZoom = 0;
  private readonly targets = new Map<Mesh, Target>();
  private readonly materials = new Map<string, StandardMaterial>();

  constructor(private readonly host: HouseHost, houses: readonly HouseProp[], castles: readonly HouseProp[] = []) {
    const scene = host.view.scene;
    this.exterior = new TransformNode('house-exterior', scene);
    const wood = this.material('door', [0.3, 0.18, 0.1]);
    const door = (name: string, d: HouseDoor, w: number, h: number, room: RoomId): void => {
      const m = MeshBuilder.CreateBox(name, { width: w, height: h, depth: 0.14 }, scene);
      m.position.set(d.door.x, (host.ground?.sample(d.door.x, d.door.y) ?? 0) + h / 2, d.door.y);
      m.rotation.y = (d.rotDeg * Math.PI) / 180;
      m.parent = this.exterior;
      m.material = wood;
      // En las casas se ve la puerta del modelo, con su contorno; aquí solo se recibe el clic.
      if (name === 'house-door') m.visibility = 0;
      else goldOutline(m);
      this.targets.set(m, { action: 'enter', pos: d.outside, door: d, room });
    };
    // Las casas se turnan entre los dos tipos de habitación.
    houses.forEach((p, i) => door('house-door', houseDoor(p), 1.2, 2.1, i % 2 === 0 ? 'hogar' : 'taller'));
    for (const p of castles) door('castle-gate', castleGate(p), 4.4, 4.6, 'salon');
    for (const id of Object.keys(ROOMS) as RoomId[]) this.buildRoom(id);
  }

  get inside(): boolean {
    return this.room !== null;
  }

  get place(): { name: string; levelMin: number; levelMax: number } | null {
    return this.room ? { name: ROOMS[this.room].name, levelMin: 1, levelMax: 1 } : null;
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
    if (target.action === 'enter') this.enter(target.door, target.room);
    else this.leave();
  }

  enter(door: HouseDoor, id: RoomId = 'hogar'): boolean {
    const previous = this.host.world();
    if (this.room || previous.character.spectral.active || !previous.player.alive) return false;
    const room = ROOMS[id];
    const d = this.host.data;
    const data: GameData = { ...d, zone: { ...d.zone, width: room.width, depth: room.depth, playerStart: { x: room.width / 2, y: 2.4 }, navPaint: undefined, obstacles: room.solids.map((f) => ({ x: f.x, y: f.z, w: f.w, d: f.d })) } };
    const w = this.makeWorld(data, true);
    this.outside = door.outside;
    this.outdoorZoom = this.host.view.rig.zoom;
    this.room = id;
    this.rooms.get(id)!.setEnabled(true);
    this.host.switchInside(true);
    this.host.install(w);
    this.host.view.rig.jumpTo(room.zoom);
    return true;
  }

  leave(): void {
    if (!this.room) return;
    const d = this.host.data;
    const w = this.makeWorld({ ...d, zone: { ...d.zone, playerStart: { ...this.outside! } } }, false);
    this.reset();
    this.host.install(w);
  }

  /** Nueva partida, carga o poción de recuerdo: restaura las vistas sin construir otro mundo. */
  reset(): void {
    this.pending = null;
    if (!this.room) return;
    this.rooms.get(this.room)!.setEnabled(false);
    this.room = null;
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

  /** Suelo, tres paredes altas, una baja delante para no tapar la cámara, y salida dorada. */
  private buildRoom(id: RoomId): void {
    const { width: W, depth: D } = ROOMS[id];
    const root = new TransformNode(`house-room-${id}`, this.host.view.scene);
    this.rooms.set(id, root);
    const part: Part = (n, x, y, z, w, h, d, mat) => {
      const m = MeshBuilder.CreateBox(`house-${n}`, { width: w, height: h, depth: d }, this.host.view.scene);
      m.position.set(x, y, z);
      m.parent = root;
      m.material = mat;
      m.isPickable = false;
      return m;
    };
    const hall = id === 'salon';
    const wall = hall ? this.material('stone', [0.45, 0.44, 0.42]) : this.material('plaster', [0.78, 0.71, 0.6]);
    const floor = hall ? this.material('flagstone', [0.33, 0.31, 0.29]) : this.material('boards', [0.42, 0.28, 0.16]);
    const height = hall ? 7 : 4;
    const gap = hall ? 2.4 : 0.8;
    part('floor', W / 2, -0.15, D / 2, W, 0.3, D, floor);
    part('wall-back', W / 2, height / 2, D - 0.15, W, height, 0.3, wall);
    part('wall-left', 0.15, height / 2, D / 2, 0.3, height, D, wall);
    part('wall-right', W - 0.15, height / 2, D / 2, 0.3, height, D, wall);
    const side = W / 2 - gap;
    part('wall-front-l', side / 2, 0.3, 0.15, side, 0.6, 0.3, wall);
    part('wall-front-r', W - side / 2, 0.3, 0.15, side, 0.6, 0.3, wall);
    if (id === 'hogar') this.furnishHome(part);
    else if (id === 'taller') this.furnishWorkshop(part);
    else this.furnishHall(part);
    const exit = part('exit', W / 2, 1.2, 0.2, 1.8, 2.4, 0.26, this.material('wood', [0.29, 0.17, 0.09]));
    exit.isPickable = true;
    goldOutline(exit);
    this.targets.set(exit, { action: 'leave', pos: { x: W / 2, y: 1.6 } });
    root.setEnabled(false);
  }

  private furnishHome(part: Part): void {
    const wood = this.material('wood', [0.29, 0.17, 0.09]);
    const clay = this.material('clay', [0.62, 0.34, 0.2]);
    part('rug', 7, 0.02, 5.4, 4.6, 0.04, 3.8, this.material('cloth', [0.46, 0.17, 0.14]));
    part('bed', 2.2, 0.35, 9.6, 2.6, 0.7, 3, wood);
    part('bed-sheet', 2.2, 0.78, 9.3, 2.4, 0.16, 2.3, this.material('blanket', [0.2, 0.34, 0.4]));
    part('bed-pillow', 2.2, 0.82, 10.6, 1.8, 0.2, 0.6, this.material('plaster', [0.78, 0.71, 0.6]));
    part('shelf', 11.5, 1.2, 10.8, 3.4, 2.4, 0.9, wood);
    for (const x of [10.5, 11.5, 12.5]) for (const y of [0.9, 1.75]) part('pot', x, y, 10.3, 0.4, 0.5, 0.4, clay);
    part('table', 7, 0.75, 6.6, 2.4, 0.14, 1.4, wood);
    for (const [x, z] of [[6, 6.1], [8, 6.1], [6, 7.1], [8, 7.1]] as const) part('table-leg', x, 0.35, z, 0.14, 0.7, 0.14, wood);
    part('table-lamp', 7, 1, 6.6, 0.3, 0.36, 0.3, this.lamp());
    part('stool', 5, 0.3, 6.6, 0.6, 0.6, 0.6, wood);
    part('stool', 9, 0.3, 6.6, 0.6, 0.6, 0.6, wood);
  }

  private furnishWorkshop(part: Part): void {
    const wood = this.material('wood', [0.29, 0.17, 0.09]);
    const iron = this.material('iron', [0.24, 0.25, 0.27]);
    part('bench', 7, 0.5, 10.9, 7, 1, 1.1, wood);
    for (const x of [4.5, 7, 9.5]) part('tool', x, 1.1, 10.9, 0.9, 0.2, 0.3, iron);
    part('forge', 2, 0.6, 10, 2.4, 1.2, 2.4, this.material('stone', [0.45, 0.44, 0.42]));
    part('forge-coals', 2, 1.24, 10, 1.6, 0.1, 1.6, this.lamp());
    for (const z of [4.5, 6.5]) part('barrel', 11.8, 0.65, z, 1.2, 1.3, 1.2, this.material('boards', [0.42, 0.28, 0.16]));
    part('anvil-base', 4.5, 0.35, 5.8, 0.7, 0.7, 0.7, wood);
    part('anvil', 4.5, 0.85, 5.8, 1.2, 0.3, 0.6, iron);
  }

  private furnishHall(part: Part): void {
    const stone = this.material('stone', [0.45, 0.44, 0.42]);
    const cloth = this.material('cloth', [0.46, 0.17, 0.14]);
    const gold = this.material('gilt', [0.78, 0.6, 0.22]);
    part('carpet', 12, 0.02, 10, 3.6, 0.04, 17, cloth);
    for (const x of [6, 18]) for (const z of [6, 11, 16]) {
      part('column', x, 3.5, z, 1.2, 7, 1.2, stone);
      part('column-base', x, 0.2, z, 1.4, 0.4, 1.4, stone);
    }
    for (const x of [3, 21]) for (const z of [6, 11, 16]) {
      part('brazier', x, 1.1, z, 0.5, 0.3, 0.5, this.lamp());
      part('brazier-post', x, 0.5, z, 0.2, 1, 0.2, stone);
    }
    for (const x of [7, 17]) part('banner', x, 4.2, 21.65, 1.8, 4, 0.08, cloth);
    part('dais', 12, 0.3, 19.6, 6, 0.6, 3, stone);
    part('throne', 12, 1.3, 20.2, 1.5, 1.4, 1, gold);
    part('throne-back', 12, 2.4, 20.6, 1.5, 2.2, 0.3, gold);
  }

  private lamp(): StandardMaterial {
    const known = this.materials.has('lamp');
    const m = this.material('lamp', [1, 0.82, 0.5]);
    if (!known) m.emissiveColor.set(1, 0.72, 0.35);
    return m;
  }

  private material(name: string, rgb: [number, number, number]): StandardMaterial {
    let m = this.materials.get(name);
    if (!m) {
      m = solidMaterial(this.host.view.scene, `house-${name}`, rgb);
      this.materials.set(name, m);
    }
    return m;
  }
}
