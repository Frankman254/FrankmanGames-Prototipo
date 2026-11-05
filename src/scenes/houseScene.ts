// Interiores modelados en Blender (scripts/blender/interiores.py): dos tipos de casa y el
// salón del castillo. Cada edificio del mapa lleva una puerta que se usa al llegar.
import { MeshBuilder, TransformNode, type Mesh, type StandardMaterial } from '@babylonjs/core';
import type { GameData } from '../data';
import { goldOutline } from '../render/interactOutline';
import { solidMaterial } from '../render/materials';
import { staticMesh, staticTexture } from '../render/staticModels';
import { World } from '../sim/world';
import type { Vec2 } from '../sim/vec2';
import { surfaceHeight, type Platform } from '../world/steps';
import type { SwitchableHeightField } from '../world/switchableGround';
import type { BankHost } from './bankScene';

export type HouseHost = Omit<BankHost, 'onBank' | 'ground'> & { ground?: SwitchableHeightField };

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
  /** Suelos elevados a los que se sube andando: no son obstáculos. */
  platforms?: readonly Platform[];
}

export const ROOMS: Record<RoomId, Room> = {
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
      // Solo el trono bloquea: al estrado se sube por sus gradas.
      { x: 12, z: 20.5, w: 1.5, d: 1 },
    ],
    platforms: [{ x: 12, z: 19.85, w: 6, d: 3.7, height: 0.72, run: 1.5, steps: 3 }],
  },
};

type Target = { action: 'enter'; pos: Vec2; door: HouseDoor; room: RoomId } | { action: 'leave'; pos: Vec2 };

/** Color (y textura de assets/textures/) de cada material de los interiores. */
const MATERIALS: Record<string, { rgb: [number, number, number]; texture?: string; crisp?: boolean }> = {
  boards: { rgb: [0.52, 0.36, 0.22], texture: 'tablas' },
  plaster: { rgb: [0.82, 0.75, 0.63], texture: 'yeso' },
  wood: { rgb: [0.42, 0.26, 0.14], texture: 'madera' },
  stone: { rgb: [0.62, 0.6, 0.56], texture: 'muro' },
  flagstone: { rgb: [0.5, 0.47, 0.44], texture: 'baldosa' },
  cloth: { rgb: [0.46, 0.17, 0.14] },
  blanket: { rgb: [0.2, 0.34, 0.4] },
  sheet: { rgb: [0.78, 0.71, 0.6] },
  clay: { rgb: [0.62, 0.34, 0.2] },
  iron: { rgb: [0.24, 0.25, 0.27] },
  gilt: { rgb: [0.78, 0.6, 0.22] },
  lamp: { rgb: [1, 0.82, 0.5] },
  rugHome: { rgb: [1, 1, 1], texture: 'patron_zigzag_tierra', crisp: true },
  rugWorkshop: { rgb: [1, 1, 1], texture: 'patron_escalones_tierra', crisp: true },
  carpet: { rgb: [1, 1, 1], texture: 'patron_rombos_dorado', crisp: true },
  hallBand: { rgb: [1, 1, 1], texture: 'patron_anidados_dorado', crisp: true },
  hallBanner: { rgb: [1, 1, 1], texture: 'patron_estrella_dorado', crisp: true },
};

/** Piezas de `interiores.glb` de cada sala, con su material. */
const ROOM_PIECES: Record<RoomId, ReadonlyArray<readonly [string, string]>> = {
  hogar: [['casa_suelo', 'boards'], ['casa_paredes', 'plaster'], ['casa_vigas', 'wood'], ['casa_ventanas', 'lamp'], ['hogar_madera', 'wood'], ['hogar_barro', 'clay'], ['hogar_alfombra', 'rugHome'], ['hogar_cenefa', 'rugHome'], ['hogar_manta', 'blanket'], ['hogar_almohada', 'sheet'], ['hogar_lampara', 'lamp']],
  taller: [['casa_suelo', 'boards'], ['casa_paredes', 'plaster'], ['casa_vigas', 'wood'], ['casa_ventanas', 'lamp'], ['taller_alfombra', 'rugWorkshop'], ['taller_madera', 'wood'], ['taller_hierro', 'iron'], ['taller_toneles', 'wood'], ['taller_fragua', 'stone'], ['taller_brasas', 'lamp']],
  salon: [['salon_suelo', 'flagstone'], ['salon_paredes', 'stone'], ['salon_piedra', 'stone'], ['salon_alfombra', 'carpet'], ['salon_cenefa', 'hallBand'], ['salon_estandartes', 'hallBanner'], ['salon_dorado', 'gilt'], ['salon_brasas', 'lamp']],
};

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
    const wood = this.material('wood');
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
    const data: GameData = { ...d, zone: { ...d.zone, shared: undefined, originX: 0, originY: 0, width: room.width, depth: room.depth, playerStart: { x: room.width / 2, y: 2.4 }, navPaint: undefined, obstacles: room.solids.map((f) => ({ x: f.x, y: f.z, w: f.w, d: f.d })) } };
    const w = this.makeWorld(data, true);
    this.outside = door.outside;
    this.outdoorZoom = this.host.view.rig.zoom;
    this.room = id;
    this.rooms.get(id)!.setEnabled(true);
    this.host.switchInside(true);
    this.setRelief(room.platforms);
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
    this.setRelief(undefined);
    this.host.switchInside(false);
    this.host.view.rig.jumpTo(this.outdoorZoom);
  }

  private setRelief(platforms: readonly Platform[] | undefined): void {
    const ground = this.host.ground;
    if (ground) ground.relief = platforms ? (x, z) => surfaceHeight(platforms, x, z) : null;
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

  /** Las piezas de la sala y su salida dorada. */
  private buildRoom(id: RoomId): void {
    const scene = this.host.view.scene;
    const root = new TransformNode(`house-room-${id}`, scene);
    this.rooms.set(id, root);
    for (const [piece, material] of ROOM_PIECES[id]) {
      const m = staticMesh(scene, piece, `house-${id}-${piece}`);
      m.parent = root;
      m.material = this.material(material);
      m.isPickable = false;
    }
    const W = ROOMS[id].width;
    const exit = staticMesh(scene, 'salida', 'house-exit');
    exit.position.set(W / 2, 0, 0.2);
    exit.parent = root;
    exit.material = this.material('wood');
    exit.isPickable = true;
    goldOutline(exit);
    this.targets.set(exit, { action: 'leave', pos: { x: W / 2, y: 1.6 } });
    root.setEnabled(false);
  }

  private material(name: string): StandardMaterial {
    let m = this.materials.get(name);
    if (!m) {
      const def = MATERIALS[name]!;
      m = solidMaterial(this.host.view.scene, `house-${name}`, def.rgb);
      if (def.texture) m.diffuseTexture = staticTexture(this.host.view.scene, def.texture, def.crisp);
      if (name === 'lamp') m.emissiveColor.set(1, 0.72, 0.35);
      this.materials.set(name, m);
    }
    return m;
  }
}
