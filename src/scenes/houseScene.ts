// Interiores modelados en Blender (scripts/blender/interiores.py): dos tipos de casa y el
// salón del castillo. Cada edificio del mapa lleva una puerta que se usa al llegar.
import { MeshBuilder, TransformNode, type Mesh, type StandardMaterial } from '@babylonjs/core';
import type { GameData } from '../data';
import { goldOutline } from '../render/interactOutline';
import { solidMaterial } from '../render/materials';
import { modelFile } from '../render/modelFiles';
import { OcclusionPlugin } from '../render/occlusion';
import { staticMesh, staticTexture } from '../render/staticModels';
import { BarriadaView } from '../render/barriadaView';
import { NavGrid } from '../sim/navGrid';
import { World } from '../sim/world';
import type { Vec2 } from '../sim/vec2';
import {
    CASA_CELL,
    CASA_NAV_RADIUS,
    casaCreadorDoor,
    casaRoomExit,
    casaRoomSize,
    casaRoomSolids,
    casaRoomStart,
} from '../world/casaCreador';
import { BARRIADA, barriadaInicio, barriadaPiedra, barriadaSolids } from '../world/barriada';
import { surfaceHeight, type Platform } from '../world/steps';
import type { SwitchableHeightField } from '../world/switchableGround';
import type { BankHost } from './bankScene';

export type HouseHost = Omit<BankHost, 'onBank' | 'ground' | 'switchInside'> & {
    ground?: SwitchableHeightField;
    /** `outdoor`: zona al aire libre (CLA-BARR1), con cielo y sol en vez de la luz de interior. */
    switchInside(inside: boolean, outdoor?: boolean): void;
};

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

type RoomId = 'hogar' | 'taller' | 'salon' | 'casa' | 'casaEspejo' | 'barriada';

/** Casa del creador en el mapa (landmark `casa_creador` o `casa_creador_espejo`). */
export interface CreatorHouseProp extends HouseProp {
    model?: string;
}

interface Room {
    name: string;
    width: number;
    depth: number;
    zoom: number;
    /** Lo que bloquea el paso. */
    solids: readonly { x: number; z: number; w: number; d: number }[];
    /** Suelos elevados a los que se sube andando: no son obstáculos. */
    platforms?: readonly Platform[];
    /** Sala hecha de un GLB entero de assets/models/ (CLA-CASA2), en vez de piezas de interiores.glb. */
    model?: string;
    start?: Vec2;
    exit?: { mesh: Vec2; pos: Vec2 };
    /** Rejilla más fina que la del mundo, para puertas de 0,70 m. */
    cellSize?: number;
    navRadius?: number;
    /** CLA-BARR1: esquina de la zona en el mundo, lejos del mapa; la rejilla va ahí. */
    origin?: Vec2;
    outdoor?: boolean;
}

function casaRoom(espejo: boolean): Room {
    const { width, depth } = casaRoomSize();
    return {
        name: 'Casa del creador',
        width,
        depth,
        zoom: 11,
        solids: casaRoomSolids(espejo).map((o) => ({ x: o.x, z: o.y, w: o.w, d: o.d })),
        model: espejo ? 'casa_creador_espejo_interior' : 'casa_creador_interior',
        start: casaRoomStart(espejo),
        exit: casaRoomExit(espejo),
        cellSize: CASA_CELL,
        navRadius: CASA_NAV_RADIUS,
    };
}

export const ROOMS: Record<RoomId, Room> = {
    hogar: {
        name: 'Casa del pueblo',
        width: 14,
        depth: 12,
        zoom: 10,
        solids: [
            { x: 2.2, z: 9.6, w: 2.6, d: 3 },
            { x: 11.5, z: 10.8, w: 3.4, d: 0.9 },
            { x: 7, z: 6.6, w: 2.4, d: 1.4 },
        ],
    },
    taller: {
        name: 'Taller del pueblo',
        width: 14,
        depth: 12,
        zoom: 10,
        solids: [
            { x: 7, z: 10.9, w: 7, d: 1.1 },
            { x: 2, z: 10, w: 2.4, d: 2.4 },
            { x: 11.8, z: 5.5, w: 2.4, d: 3.4 },
            { x: 4.5, z: 5.8, w: 1.2, d: 1.2 },
        ],
    },
    salon: {
        name: 'Gran salón del castillo',
        width: 24,
        depth: 22,
        zoom: 18,
        solids: [
            ...[6, 18].flatMap((x) => [6, 11, 16].map((z) => ({ x, z, w: 1.4, d: 1.4 }))),
            // Solo el trono bloquea: al estrado se sube por sus gradas.
            { x: 12, z: 20.5, w: 1.5, d: 1 },
        ],
        platforms: [{ x: 12, z: 19.85, w: 6, d: 3.7, height: 0.72, run: 1.5, steps: 3 }],
    },
    casa: casaRoom(false),
    casaEspejo: casaRoom(true),
    // CLA-BARR1: la barriada de Praderas del Norte (src/world/barriada.ts), a la que se llega por su
    // Piedra Pintada. La salida es la piedra de la plaza.
    barriada: {
        name: 'Praderas del Norte',
        width: BARRIADA.ancho,
        depth: BARRIADA.fondo,
        zoom: 16,
        solids: barriadaSolids().map((o) => ({ x: o.x, z: o.y, w: o.w, d: o.d })),
        start: barriadaInicio(),
        exit: { mesh: barriadaPiedra(), pos: { x: barriadaPiedra().x, y: barriadaPiedra().y - 2.6 } },
        origin: { ...BARRIADA.origen },
        outdoor: true,
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
    hogar: [
        ['casa_suelo', 'boards'],
        ['casa_paredes', 'plaster'],
        ['casa_vigas', 'wood'],
        ['casa_ventanas', 'lamp'],
        ['hogar_madera', 'wood'],
        ['hogar_barro', 'clay'],
        ['hogar_alfombra', 'rugHome'],
        ['hogar_cenefa', 'rugHome'],
        ['hogar_manta', 'blanket'],
        ['hogar_almohada', 'sheet'],
        ['hogar_lampara', 'lamp'],
    ],
    taller: [
        ['casa_suelo', 'boards'],
        ['casa_paredes', 'plaster'],
        ['casa_vigas', 'wood'],
        ['casa_ventanas', 'lamp'],
        ['taller_alfombra', 'rugWorkshop'],
        ['taller_madera', 'wood'],
        ['taller_hierro', 'iron'],
        ['taller_toneles', 'wood'],
        ['taller_fragua', 'stone'],
        ['taller_brasas', 'lamp'],
    ],
    salon: [
        ['salon_suelo', 'flagstone'],
        ['salon_paredes', 'stone'],
        ['salon_piedra', 'stone'],
        ['salon_alfombra', 'carpet'],
        ['salon_cenefa', 'hallBand'],
        ['salon_estandartes', 'hallBanner'],
        ['salon_dorado', 'gilt'],
        ['salon_brasas', 'lamp'],
    ],
    casa: [],
    casaEspejo: [],
    barriada: [],
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
    /** CLA-BARR1: se construye la primera vez que se entra (cientos de casas y calles). */
    private barriada: BarriadaView | null = null;

    constructor(
        private readonly host: HouseHost,
        houses: readonly HouseProp[],
        castles: readonly HouseProp[] = [],
        creatorHouses: readonly CreatorHouseProp[] = [],
    ) {
        const scene = host.view.scene;
        this.exterior = new TransformNode('house-exterior', scene);
        const wood = this.material('wood');
        const door = (name: string, d: HouseDoor, w: number, h: number, room: RoomId): void => {
            const m = MeshBuilder.CreateBox(name, { width: w, height: h, depth: 0.14 }, scene);
            m.position.set(d.door.x, host.view.groundExact.sample(d.door.x, d.door.y) + h / 2, d.door.y);
            m.rotation.y = (d.rotDeg * Math.PI) / 180;
            m.parent = this.exterior;
            m.material = wood;
            // En las casas se ve la puerta del modelo, con su contorno; aquí solo se recibe el clic.
            if (name === 'house-door' || name === 'creator-house-door') m.visibility = 0;
            else goldOutline(m);
            this.targets.set(m, { action: 'enter', pos: d.outside, door: d, room });
        };
        // Las casas se turnan entre los dos tipos de habitación.
        houses.forEach((p, i) => door('house-door', houseDoor(p), 1.2, 2.1, i % 2 === 0 ? 'hogar' : 'taller'));
        for (const p of castles) door('castle-gate', castleGate(p), 4.4, 4.6, 'salon');
        for (const p of creatorHouses) this.creatorDoor(door, p);
        for (const id of Object.keys(ROOMS) as RoomId[]) this.buildRoom(id);
        this.door = door;
    }

    private readonly door?: (name: string, d: HouseDoor, w: number, h: number, room: RoomId) => void;

    /** CLA-CASA2: la puerta de reja (hueco P1 de la planta) lleva a la sala de la casa del creador. */
    private creatorDoor(door: (name: string, d: HouseDoor, w: number, h: number, room: RoomId) => void, p: CreatorHouseProp): void {
        const c = casaCreadorDoor({ model: p.model, x: p.x, y: p.y, rotDeg: p.rotDeg });
        door('creator-house-door', { door: c.door, outside: c.outside, rotDeg: c.rotDeg }, 1.0, 2.2, c.espejo ? 'casaEspejo' : 'casa');
    }

    /** Modo edición: las puertas siguen a casas y castillos movidos o nuevos. */
    setHouses(houses: readonly HouseProp[], castles: readonly HouseProp[], creatorHouses: readonly CreatorHouseProp[] = []): void {
        if (!this.door) return;
        for (const mesh of [...this.targets.keys()]) {
            if (mesh.parent === this.exterior) mesh.dispose();
            this.targets.delete(mesh);
        }
        houses.forEach((p, i) => this.door!('house-door', houseDoor(p), 1.2, 2.1, i % 2 === 0 ? 'hogar' : 'taller'));
        for (const p of castles) this.door!('castle-gate', castleGate(p), 4.4, 4.6, 'salon');
        for (const p of creatorHouses) this.creatorDoor(this.door, p);
    }

    get inside(): boolean {
        return this.room !== null;
    }

    /** CLA-BARR1: true si el jugador está dentro de la barriada de Praderas del Norte. */
    get inBarriada(): boolean {
        return this.room === 'barriada';
    }

    /** JL-254: ID de la sala actual (para guardar/cargar). */
    get currentRoom(): RoomId | null {
        return this.room;
    }

    get place(): { name: string; levelMin: number; levelMax: number } | null {
        return this.room ? { name: ROOMS[this.room].name, levelMin: 1, levelMax: 1 } : null;
    }

    /** Dónde vuelve a aparecer al salir o al cargar la partida guardada dentro. */
    get returnPoint(): Vec2 | null {
        return this.outside;
    }

    /** Pruebas (modo edición): posiciones de las puertas en el mundo. */
    get doorPositions(): Vec2[] {
        return [...this.targets.values()].filter((t) => t.action === 'enter').map((t) => ({ x: t.pos.x, y: t.pos.y }));
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
        // CLA-BARR2: dentro de la barriada se encienden sus farolas, no las del mapa.
        const atmosphere = this.host.view.atmosphere;
        const inBarriada = this.room === 'barriada' && this.barriada !== null;
        atmosphere.zoneLamps = inBarriada ? this.barriada!.lamps : null;
        if (inBarriada) this.barriada!.update(1 / 60, atmosphere.state.lampsOn);
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
        if (id === 'barriada') this.buildBarriada();
        const ox = room.origin?.x ?? 0;
        const oy = room.origin?.y ?? 0;
        const data: GameData = {
            ...d,
            zone: {
                ...d.zone,
                shared: room.origin ? this.originGrid(room, d.zone.cellSize) : undefined,
                originX: ox,
                originY: oy,
                width: room.width,
                depth: room.depth,
                ...(room.cellSize ? { cellSize: room.cellSize } : {}),
                ...(room.navRadius ? { navRadius: room.navRadius } : {}),
                playerStart: room.start ? { ...room.start } : { x: room.width / 2, y: 2.4 },
                navPaint: undefined,
                obstacles: room.solids.map((f) => ({ x: f.x, y: f.z, w: f.w, d: f.d })),
            },
        };
        const w = this.makeWorld(data, true);
        this.outside = door.outside;
        this.outdoorZoom = this.host.view.rig.zoom;
        this.room = id;
        this.rooms.get(id)!.setEnabled(true);
        this.host.switchInside(true, room.outdoor);
        this.setRelief(room.platforms);
        this.host.install(w);
        this.host.view.rig.jumpTo(room.zoom);
        return true;
    }

    /** CLA-BARR1: viaje de la Piedra Pintada de Praderas del Norte; al salir se vuelve a `back`. */
    enterBarriada(back: Vec2): boolean {
        return this.enter({ door: back, outside: { ...back }, rotDeg: 0 }, 'barriada');
    }

    /**
     * Rejilla de una sala lejos del origen (la de `fromObstacles` empieza en 0, 0): densa, con el borde
     * cerrado. Las casas se estampan con la holgura de la zona al montar el mundo (`buildZoneGrid`).
     */
    private originGrid(room: Room, cellSize: number): { grid: NavGrid; isActive: () => boolean } {
        const cell = room.cellSize ?? cellSize;
        const ox = room.origin!.x;
        const oy = room.origin!.y;
        const grid = new NavGrid(room.width, room.depth, cell, ox, oy);
        const W = room.width;
        const D = room.depth;
        for (const o of [
            { x: ox + W / 2, y: oy + 0.5, w: W, d: 1 },
            { x: ox + W / 2, y: oy + D - 0.5, w: W, d: 1 },
            { x: ox + 0.5, y: oy + D / 2, w: 1, d: D },
            { x: ox + W - 0.5, y: oy + D / 2, w: 1, d: D },
        ])
            grid.stamp(o, 0);
        return { grid, isActive: () => true };
    }

    private buildBarriada(): void {
        if (this.barriada) return;
        const view = this.host.view;
        this.barriada = new BarriadaView(view.scene, view.atmosphere.shadows);
        const root = this.rooms.get('barriada')!;
        this.barriada.root.parent = root;
        this.barriada.setVisible(true);
        this.targets.set(this.barriada.stone, { action: 'leave', pos: { ...ROOMS.barriada.exit!.pos } });
        goldOutline(this.barriada.stone);
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
        const w = new World(data, {
            seed: this.host.nextSeed?.() ?? data.loadTest.seed,
            encounter: false,
            interior,
            zones: !interior,
            character: ch,
            timeOfDay: previous.timeOfDay,
        });
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
        const room = ROOMS[id];
        if (room.model) this.loadRoomModel(root, room.model);
        const W = room.width;
        // La barriada sale por su piedra (buildBarriada).
        if (room.outdoor) {
            root.setEnabled(false);
            return;
        }
        const exit = staticMesh(scene, 'salida', 'house-exit');
        exit.position.set(room.exit?.mesh.x ?? W / 2, 0, room.exit?.mesh.y ?? 0.2);
        exit.parent = root;
        exit.material = this.material('wood');
        exit.isPickable = true;
        goldOutline(exit);
        this.targets.set(exit, { action: 'leave', pos: room.exit ? { ...room.exit.pos } : { x: W / 2, y: 1.6 } });
        root.setEnabled(false);
    }

    /**
     * El GLB va en coordenadas de la sala: Blender (X, Y) → (x, z) con el giro de 180° (el cargador de
     * glTF deja la X y la Y de Blender en −x y −z). Los muros que tapen al personaje se recortan.
     */
    private loadRoomModel(root: TransformNode, model: string): void {
        const scene = this.host.view.scene;
        const turn = new TransformNode(`${root.name}-model`, scene);
        turn.parent = root;
        turn.rotation.y = Math.PI;
        void modelFile(scene, model)
            .then((c) => {
                const entries = c.instantiateModelsToScene((n) => `${root.name}-${n}`, false, { doNotInstantiate: true });
                for (const node of entries.rootNodes) node.parent = turn;
                const mats = new Set<NonNullable<Mesh['material']>>();
                for (const node of entries.rootNodes)
                    for (const m of node.getChildMeshes(false)) {
                        m.isPickable = false;
                        if (m.material) mats.add(m.material);
                    }
                for (const m of mats) new OcclusionPlugin(m);
            })
            .catch((e: unknown) => console.warn(`[casa] no se pudo cargar ${model}`, e));
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
