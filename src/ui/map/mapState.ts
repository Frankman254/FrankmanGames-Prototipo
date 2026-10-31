// Lo que comparten el minimapa y el mapa grande: el mundo (estático, una vez),
// el último fotograma que manda `main.ts`, y lo de cada personaje (niebla y
// banderas), guardado en este equipo como los zaaps de `main.ts`.
import type { KeyValueStore } from '../menus/saveStore';
import { FlagBook, loadFog, saveFog, type FogOfWar, type MapDef, type QuestTarget, type Vec } from './mapLogic';
import type { MapImage } from './mapImage';

/** Una zona con su franja de niveles (para la capa de zonas del mapa grande). */
export interface MapZone {
  id: string;
  name: string;
  /** "niv. 5–12" o "zona segura". */
  band: string;
  safe: boolean;
  areas: readonly ({ type: 'circle'; x: number; y: number; radius: number } | { type: 'rect'; x0: number; y0: number; x1: number; y1: number })[];
}

/** El mundo para los mapas: se monta una vez al arrancar. */
export interface MapWorld {
  width: number;
  depth: number;
  /** Imagen base (se genera la primera vez que se pide). */
  image: () => MapImage;
  zones: readonly MapZone[];
  /** Coordenadas de mapa que se enseñan (el esquema puede cambiar: siempre por esta función). */
  coords: (x: number, y: number) => [number, number];
  /** Agua para pescar (para las misiones de pesca). */
  waters: readonly Vec[];
}

export interface MapNpc extends Vec {
  id: string;
  name: string;
  merchant: boolean;
  /** «!» misión disponible, «?» misión por entregar. */
  marker: 'available' | 'ready' | null;
}

export interface MapStone extends Vec {
  id: string;
  name: string;
  known: boolean;
}

/** Lo que cambia cada fotograma. */
export interface MapFrame {
  player: Vec;
  /** Giro de la cámara en radianes (avance = (sin, cos)). */
  cameraYaw: number;
  /** Dentro de una mazmorra: nombre del lugar (el mapa del exterior no vale). */
  inside: string | null;
  enemies: readonly (Vec & { color: string })[];
  npcs: readonly MapNpc[];
  loot: readonly Vec[];
  stones: readonly MapStone[];
  quest: QuestTarget | null;
}

const FOG_PREFIX = 'frankmangames.mapFog.';
const FLAGS_PREFIX = 'frankmangames.mapFlags.';

export class MapState {
  world: MapWorld | null = null;
  frame: MapFrame | null = null;
  fog: FogOfWar | null = null;
  flags: FlagBook | null = null;
  /** Sube cuando cambian la niebla o las banderas (para repintar). */
  version = 0;
  private character = '';
  private fogDirty = false;
  private saveTimer = 0;

  constructor(
    readonly def: MapDef,
    private readonly store: KeyValueStore,
  ) {}

  /** Personaje en curso: carga su niebla y sus banderas. */
  setCharacter(name: string): void {
    this.character = name;
    this.load();
  }

  setWorld(w: MapWorld): void {
    this.world = w;
    this.load();
  }

  private read(key: string): unknown {
    try {
      return JSON.parse(this.store.getItem(key + this.character) ?? 'null');
    } catch {
      return null;
    }
  }

  private write(key: string, v: unknown): void {
    try {
      this.store.setItem(key + this.character, JSON.stringify(v));
    } catch {
      /* sin almacenamiento: dura la sesión */
    }
  }

  private load(): void {
    const w = this.world;
    if (!w || !this.character) return;
    this.fog = loadFog(this.read(FOG_PREFIX), w.width, w.depth, this.def.fogCellMeters);
    this.flags = new FlagBook(w.width, w.depth, this.def.maxFlags, this.read(FLAGS_PREFIX));
    this.version++;
  }

  /** Cada fotograma: guarda lo último y descubre alrededor del jugador (se guarda cada pocos segundos). */
  update(f: MapFrame, dt: number): void {
    this.frame = f;
    if (this.fog && !f.inside && this.fog.reveal(f.player.x, f.player.y, this.def.revealRadius)) {
      this.fogDirty = true;
      this.version++;
    }
    this.saveTimer -= dt;
    if (this.fogDirty && this.saveTimer <= 0) this.flush();
  }

  flush(): void {
    if (!this.fog) return;
    this.fogDirty = false;
    this.saveTimer = 3;
    this.write(FOG_PREFIX, saveFog(this.fog));
  }

  saveFlags(): void {
    if (!this.flags) return;
    this.write(FLAGS_PREFIX, this.flags.toJSON());
    this.version++;
  }
}
