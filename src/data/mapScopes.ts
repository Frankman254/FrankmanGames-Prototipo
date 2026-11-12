// Contrato común para cargar un único ámbito de mapa. Las provincias conservan
// metadatos ligeros mientras migran sus JSON compartidos; las mazmorras delegan
// en dungeonFloorMap, cuya fuente canónica es data/dungeons/<id>/floors/NNN.json.
import provincesJson from '../../data/maps/provinces/manifest.json';
import { loadDungeonFloorMap, type DungeonFloorMapDef } from './dungeonFloorMap';

export const PROVINCE_DATA_KINDS = ['terrain', 'vegetation', 'ambient', 'zones', 'navPaint'] as const;
export type ProvinceDataKind = (typeof PROVINCE_DATA_KINDS)[number];
export type ProvinceDataFiles = Record<ProvinceDataKind, string>;

export interface ProvinceManifestEntry {
  id: string;
  name: string;
  dataRoot: string;
  /** Fuentes compartidas temporales, hasta que cada archivo se mueva a dataRoot. */
  legacyFiles: ProvinceDataFiles;
}

export interface ProvinceManifest {
  provinces: ProvinceManifestEntry[];
}

export type ProvinceScopeId = `province:${string}`;
export type DungeonFloorScopeId = `dungeon:${string}:floor:${number}`;

export interface ProvinceMapScope {
  kind: 'province';
  id: ProvinceScopeId;
  provinceId: string;
  name: string;
  dataRoot: string;
  files: ProvinceDataFiles;
}

export interface DungeonFloorMapScope {
  kind: 'dungeon-floor';
  id: DungeonFloorScopeId;
  dungeonId: string;
  floorIndex: number;
  seed: number;
  cellSize: number;
  generationKind: 'seed' | 'hand';
}

export type MapScope = ProvinceMapScope | DungeonFloorMapScope;
export type MapBundle =
  | { scope: ProvinceMapScope; data: { kind: 'province'; metadata: ProvinceManifestEntry } }
  | { scope: DungeonFloorMapScope; data: { kind: 'dungeon-floor'; floor: DungeonFloorMapDef } };

type JsonObject = Record<string, unknown>;

function object(value: unknown, at: string): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${at}: se esperaba un objeto`);
  return value as JsonObject;
}

function text(value: unknown, at: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${at}: se esperaba texto no vacío`);
  return value;
}

function list(value: unknown, at: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${at}: se esperaba una lista`);
  return value;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function parseProvinceManifest(raw: unknown): ProvinceManifest {
  const root = object(raw, 'mapas/provincias');
  const provinces = list(root['provinces'], 'mapas/provincias.provinces').map((value, index): ProvinceManifestEntry => {
    const at = `mapas/provincias.provinces[${index}]`;
    const entry = object(value, at);
    const rawFiles = object(entry['legacyFiles'], `${at}.legacyFiles`);
    const legacyFiles = Object.fromEntries(PROVINCE_DATA_KINDS.map((kind) => [kind, text(rawFiles[kind], `${at}.legacyFiles.${kind}`)])) as ProvinceDataFiles;
    return {
      id: text(entry['id'], `${at}.id`),
      name: text(entry['name'], `${at}.name`),
      dataRoot: text(entry['dataRoot'], `${at}.dataRoot`),
      legacyFiles,
    };
  });
  const ids = new Set<string>();
  for (const province of provinces) {
    if (ids.has(province.id)) throw new Error(`mapas/provincias: id duplicado ${province.id}`);
    ids.add(province.id);
  }
  return { provinces };
}

const PROVINCES = parseProvinceManifest(provincesJson);

export function provinceScopeId(provinceId: string): ProvinceScopeId {
  return `province:${provinceId}`;
}

export function dungeonFloorScopeId(dungeonId: string, floorIndex: number): DungeonFloorScopeId {
  return `dungeon:${dungeonId}:floor:${floorIndex}`;
}

/** Metadatos de provincia; no cargan vegetación, navegación ni una mazmorra. */
export function listProvinceMapScopes(): ProvinceMapScope[] {
  return PROVINCES.provinces.map((province) => ({
    kind: 'province',
    id: provinceScopeId(province.id),
    provinceId: province.id,
    name: province.name,
    dataRoot: province.dataRoot,
    files: clone(province.legacyFiles),
  }));
}

export function provinceMapScope(id: ProvinceScopeId | string): ProvinceMapScope {
  const provinceId = id.startsWith('province:') ? id.slice('province:'.length) : id;
  const scope = listProvinceMapScopes().find((candidate) => candidate.provinceId === provinceId);
  if (!scope) throw new Error(`Ámbito de mapa desconocido: ${id}`);
  return scope;
}

export function dungeonFloorMapScope(input: Omit<DungeonFloorMapScope, 'kind' | 'id'>): DungeonFloorMapScope {
  if (!Number.isInteger(input.floorIndex) || input.floorIndex < 0) throw new Error('El índice del piso debe ser un entero no negativo');
  if (!Number.isFinite(input.seed) || !Number.isFinite(input.cellSize) || input.cellSize <= 0) throw new Error('Semilla o tamaño de celda inválido');
  return { kind: 'dungeon-floor', id: dungeonFloorScopeId(input.dungeonId, input.floorIndex), ...input };
}

/**
 * Carga exactamente el ámbito pedido. La unión discriminada impide que un piso
 * reciba datos provinciales o que el exterior herede navegación de mazmorra.
 */
export function loadMapBundle(scope: MapScope): MapBundle {
  if (scope.kind === 'province') {
    const canonical = provinceMapScope(scope.provinceId);
    const metadata = PROVINCES.provinces.find((province) => province.id === canonical.provinceId)!;
    return { scope: clone(canonical), data: { kind: 'province', metadata: clone(metadata) } };
  }
  const floor = loadDungeonFloorMap(scope.dungeonId, scope.floorIndex, scope.seed, scope.cellSize, scope.generationKind);
  return { scope: clone(scope), data: { kind: 'dungeon-floor', floor: clone(floor) } };
}
