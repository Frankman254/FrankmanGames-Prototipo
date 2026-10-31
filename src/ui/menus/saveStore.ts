// Guardado en 12 ranuras y opciones, sobre `localStorage` (o cualquier objeto
// con la misma forma, para los tests). Nada sale del equipo.
import { PLACE_SCENES, type SaveData, type SavePlace } from '../../rpg/contracts';
import { CAST_MODES, type CastMode } from '../../sim/castModes';

/** Lo mínimo de `Storage` que se usa. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Ranuras de guardado (las 3 de antes son las 3 primeras: mismas claves). */
export const SLOT_COUNT = 12;
/** Largo máximo del nombre de una ranura. */
export const LABEL_MAX = 40;
const SAVE_PREFIX = 'frankmangames.save.';
const OPTIONS_KEY = 'frankmangames.options';
/** Piedras Pintadas guardadas aparte por personaje (antes de que el guardado llevara el lugar). */
const STONES_PREFIX = 'frankmangames.piedras.';

export interface SlotSummary {
  slot: number;
  /** Nombre de la ranura: el que puso el jugador o, si no, el del personaje. */
  label: string;
  name: string;
  classId: string;
  level: number;
  savedAt: string;
  /** Sitio: zona o piso de la mazmorra (null si el guardado no lo sabe). */
  place: string | null;
  /** Mundo abierto o mazmorra. */
  scene: SavePlace['scene'];
  /** Segundos jugados (0 si no consta). */
  playSeconds: number;
}

/** Comprobación de forma: protege de guardados rotos o de otra versión. */
export function isSaveData(x: unknown): x is SaveData {
  if (!x || typeof x !== 'object') return false;
  const s = x as Record<string, unknown>;
  return (
    s['version'] === 1 &&
    typeof s['name'] === 'string' &&
    typeof s['classId'] === 'string' &&
    typeof s['level'] === 'number' &&
    typeof s['xp'] === 'number' &&
    typeof s['gold'] === 'number' &&
    Array.isArray(s['inventory']) &&
    typeof s['equipment'] === 'object' && s['equipment'] !== null &&
    Array.isArray(s['known']) &&
    Array.isArray(s['hotbar'])
  );
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

/** Recorta y limpia el nombre de una ranura (vacío = sin nombre propio). */
export function cleanLabel(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const t = raw.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, LABEL_MAX);
  return t === '' ? undefined : t;
}

/**
 * Lugar guardado con forma válida, o null. No sabe qué pisos o piedras existen:
 * eso se decide al cargar (`src/world/placement.ts`).
 */
export function normalizePlace(raw: unknown): SavePlace | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const scene = PLACE_SCENES.includes(o['scene'] as SavePlace['scene']) ? (o['scene'] as SavePlace['scene']) : null;
  if (!scene) return null;
  const hasPos = finite(o['x']) && finite(o['y']);
  const floor = scene === 'dungeon' && finite(o['floor']) ? Math.floor(o['floor']) : null;
  const place: SavePlace = {
    scene,
    dungeon: scene === 'dungeon' ? (strOrNull(o['dungeon']) ?? 'crypt') : null,
    floor: scene === 'dungeon' ? (floor ?? 0) : null,
    x: hasPos ? (o['x'] as number) : null,
    y: hasPos ? (o['y'] as number) : null,
    stone: strOrNull(o['stone']),
    timeOfDay: finite(o['timeOfDay']) ? o['timeOfDay'] - Math.floor(o['timeOfDay']) : null,
  };
  if (Array.isArray(o['knownStones'])) place.knownStones = [...new Set(o['knownStones'].filter((k): k is string => typeof k === 'string'))];
  if (finite(o['playSeconds']) && o['playSeconds'] > 0) place.playSeconds = o['playSeconds'];
  const name = strOrNull(o['name']);
  if (name) place.name = name.slice(0, 80);
  return place;
}

/**
 * Lleva un guardado de cualquier versión anterior a la forma actual:
 * - sin `place` (antes de `guardado-presets`): en su Piedra Pintada de
 *   reaparición, leída de lo que se guardaba aparte por personaje;
 * - `place` o `label` rotos se descartan sin perder la partida.
 * Devuelve null si no es un guardado.
 */
export function migrateSave(raw: unknown, legacy?: KeyValueStore): SaveData | null {
  if (!isSaveData(raw)) return null;
  const out: SaveData = { ...raw };
  const label = cleanLabel(raw.label);
  if (label) out.label = label;
  else delete out.label;
  const place = normalizePlace(raw.place);
  if (place) {
    out.place = place;
    return out;
  }
  // Guardado antiguo: la piedra (y las conocidas) que hubiera para ese personaje.
  const stones = readLegacyStones(legacy, raw.name);
  out.place = { scene: 'overworld', dungeon: null, floor: null, x: null, y: null, stone: strOrNull(stones?.respawn), timeOfDay: null };
  if (Array.isArray(stones?.known)) out.place.knownStones = stones.known.filter((k): k is string => typeof k === 'string');
  return out;
}

function readLegacyStones(store: KeyValueStore | undefined, name: string): { known?: unknown; respawn?: unknown } | null {
  try {
    const v: unknown = JSON.parse(store?.getItem(STONES_PREFIX + name) ?? 'null');
    return v && typeof v === 'object' ? (v as { known?: unknown; respawn?: unknown }) : null;
  } catch {
    return null;
  }
}

export class SaveStore {
  constructor(private readonly store: KeyValueStore) {}

  private key(slot: number): string {
    if (!Number.isInteger(slot) || slot < 0 || slot >= SLOT_COUNT) throw new Error(`Ranura no válida: ${slot}`);
    return SAVE_PREFIX + slot;
  }

  /** El guardado de la ranura ya migrado a la forma actual, o null. */
  read(slot: number): SaveData | null {
    const raw = this.store.getItem(this.key(slot));
    if (!raw) return null;
    try {
      return migrateSave(JSON.parse(raw), this.store);
    } catch {
      return null;
    }
  }

  write(slot: number, data: SaveData): void {
    this.store.setItem(this.key(slot), JSON.stringify(data));
  }

  remove(slot: number): void {
    this.store.removeItem(this.key(slot));
  }

  /** Cambia el nombre de la ranura (vacío = vuelve al del personaje). false si está vacía. */
  rename(slot: number, label: string): boolean {
    const d = this.read(slot);
    if (!d) return false;
    const clean = cleanLabel(label);
    const next: SaveData = { ...d };
    if (clean) next.label = clean;
    else delete next.label;
    this.write(slot, next);
    return true;
  }

  /** Una entrada por ranura; null si está vacía o ilegible. */
  list(): (SlotSummary | null)[] {
    return Array.from({ length: SLOT_COUNT }, (_, slot) => {
      const d = this.read(slot);
      return d ? summarize(slot, d) : null;
    });
  }

  /** La ranura guardada más reciente (para «Continuar»). */
  latest(): number | null {
    let best: SlotSummary | null = null;
    for (const s of this.list()) if (s && (!best || s.savedAt > best.savedAt)) best = s;
    return best?.slot ?? null;
  }

  firstEmpty(): number | null {
    const i = this.list().findIndex((s) => s === null);
    return i < 0 ? null : i;
  }
}

/** Resumen de un guardado para la lista de ranuras. */
export function summarize(slot: number, d: SaveData): SlotSummary {
  const p = d.place;
  return {
    slot,
    label: d.label ?? d.name,
    name: d.name,
    classId: d.classId,
    level: d.level,
    savedAt: d.savedAt,
    place: p?.name ?? null,
    scene: p?.scene ?? 'overworld',
    playSeconds: p?.playSeconds ?? 0,
  };
}

// ─── Opciones ──────────────────────────────────────────────────────────────

/** Temas de la interfaz (colores en `src/ui/styles/themes.css`): neutro, los cinco elementales, claro y alto contraste. */
export const THEMES = ['pergamino', 'fuego', 'agua', 'viento', 'tierra', 'naturaleza', 'claro', 'contraste'] as const;
export type ThemeId = (typeof THEMES)[number];
/** Temas que ya no existen → su sucesor (guardados de versiones anteriores). */
const OLD_THEMES: Record<string, ThemeId> = { noche: 'agua', bosque: 'naturaleza' };
/** Juegos de letra del sistema (sin descargas). */
export const FONTS = ['clasica', 'libro', 'moderna', 'legible'] as const;
export type FontId = (typeof FONTS)[number];
/** Límite de fotogramas por segundo; 0 = sin límite. */
export const FPS_CAPS = [0, 30, 60, 120] as const;
/** Calidad de las sombras del sol: sin sombras, mapa pequeño sin filtrar o mapa completo filtrado. */
export const SHADOW_LEVELS = ['no', 'bajas', 'altas'] as const;
export type ShadowLevel = (typeof SHADOW_LEVELS)[number];
/** Suavizado de bordes: FXAA se cambia al momento; MSAA es del contexto WebGL y se aplica al reiniciar. */
export const ANTIALIAS_MODES = ['no', 'fxaa', 'msaa'] as const;
export type AntialiasMode = (typeof ANTIALIAS_MODES)[number];
/** Cuándo se ve la barra de vida sobre un enemigo. */
export const ENEMY_BAR_MODES = ['siempre', 'heridos', 'objetivo', 'nunca'] as const;
export type EnemyBarMode = (typeof ENEMY_BAR_MODES)[number];

/**
 * Opciones del jugador. Consenso de las dos referencias: de FATE (config.dat)
 * pantalla completa, FPS visibles, volúmenes y detalle de sombras y
 * partículas; de DOFUS 3 temas de interfaz, escala de la interfaz, bloquear
 * las ventanas, cuadrícula, calidad gráfica por niveles y qué se muestra sobre
 * los enemigos. Lo demás es propio (ver docs/OPCIONES_E_INTERFAZ.md).
 */
export interface GameOptions {
  // Cámara
  /** Multiplicador del giro de cámara (ratón y teclas). */
  cameraSensitivity: number;
  invertCameraX: boolean;
  invertCameraY: boolean;
  /** Grados por segundo al girar con las teclas de cámara. */
  cameraKeySpeed: number;
  // Pantalla
  fullscreen: boolean;
  showFps: boolean;
  fpsCap: number;
  // Gráficos
  shadows: ShadowLevel;
  /** Fracción de la hierba y las flores que se dibuja (0–1). */
  vegetationDensity: number;
  /** Distancia de visión en metros (plano lejano de la cámara; la niebla la acompaña). */
  viewDistance: number;
  /** Multiplicador de las partículas de los efectos (0 = ninguna). */
  particles: number;
  /** Resolución interna respecto a la de la pantalla (0,5 = la mitad de píxeles por lado). */
  renderScale: number;
  antialias: AntialiasMode;
  /** Recortar árboles y casas que tapan al personaje. */
  occlusionCut: boolean;
  // Interfaz
  theme: ThemeId;
  font: FontId;
  /** Escala de toda la interfaz (paneles, HUD y ventanas). */
  uiScale: number;
  /** Escala calculada del tamaño real de la pantalla (si no, la de `uiScale`). */
  uiScaleAuto: boolean;
  /** Tamaño de los iconos de la barra de hechizos (sobre la escala general). */
  hotbarIconScale: number;
  /** Tamaño de las casillas de la mochila (sobre la escala general). */
  bagIconScale: number;
  /** Opacidad del fondo de las ventanas (1 = opaco). */
  windowOpacity: number;
  /** Transiciones y animaciones de la interfaz. */
  uiAnimations: boolean;
  /** Tamaño de letra del registro de combate, en píxeles. */
  combatLogSize: number;
  /** Retardo antes de mostrar un tooltip, en milisegundos. */
  tooltipDelay: number;
  /** Ventanas fijas: no se pueden arrastrar. */
  lockWindows: boolean;
  // Juego
  enemyBars: EnemyBarMode;
  /** Números de daño y curación flotantes. */
  damageNumbers: boolean;
  /** Cartel con nombre y nivel sobre los enemigos. */
  enemyLabels: boolean;
  /** Pedir confirmación antes de vender un objeto raro o mejor. */
  confirmRareSell: boolean;
  /** Anillo del alcance del hechizo mientras se carga o se apunta. */
  showSpellRange: boolean;
  /** Combate v2: cómo se lanzan los hechizos (ver `src/sim/castModes.ts`). */
  castMode: CastMode;
  // Ayudas de juego
  /** Línea del camino que va a seguir el personaje. */
  showPath: boolean;
  /** Cuadrícula de la malla de navegación (celdas libres y bloqueadas). */
  showGrid: boolean;
  // Sonido (0..1)
  volume: number;
  musicVolume: number;
  sfxVolume: number;
}

/** Lo que fija un preajuste de calidad gráfica. */
export type GraphicsSettings = Pick<GameOptions, 'shadows' | 'vegetationDensity' | 'viewDistance' | 'particles' | 'renderScale' | 'antialias' | 'occlusionCut'>;
export const GRAPHICS_KEYS = ['shadows', 'vegetationDensity', 'viewDistance', 'particles', 'renderScale', 'antialias', 'occlusionCut'] as const satisfies readonly (keyof GraphicsSettings)[];
/** Preajustes Bajo / Medio / Alto / Ultra (PROPUESTA; «Alto» es lo que se veía antes de existir el menú). */
export const GRAPHICS_PRESETS = {
  bajo: { shadows: 'no', vegetationDensity: 0.35, viewDistance: 150, particles: 0.5, renderScale: 0.7, antialias: 'no', occlusionCut: true },
  medio: { shadows: 'bajas', vegetationDensity: 0.65, viewDistance: 300, particles: 0.75, renderScale: 0.85, antialias: 'fxaa', occlusionCut: true },
  alto: { shadows: 'altas', vegetationDensity: 1, viewDistance: 500, particles: 1, renderScale: 1, antialias: 'msaa', occlusionCut: true },
  ultra: { shadows: 'altas', vegetationDensity: 1, viewDistance: 650, particles: 1.5, renderScale: 1, antialias: 'msaa', occlusionCut: true },
} as const satisfies Record<string, GraphicsSettings>;
export type GraphicsPresetId = keyof typeof GRAPHICS_PRESETS;
export const GRAPHICS_PRESET_IDS = Object.keys(GRAPHICS_PRESETS) as GraphicsPresetId[];

/** El preajuste que coincide con las opciones gráficas actuales, o «personalizado». */
export function graphicsPresetOf(o: GraphicsSettings): GraphicsPresetId | 'personalizado' {
  return GRAPHICS_PRESET_IDS.find((id) => GRAPHICS_KEYS.every((k) => GRAPHICS_PRESETS[id][k] === o[k])) ?? 'personalizado';
}

/** Copia de `o` con los valores gráficos del preajuste. */
export function applyGraphicsPreset(o: GameOptions, id: GraphicsPresetId): GameOptions {
  return { ...o, ...GRAPHICS_PRESETS[id] };
}

export const DEFAULT_OPTIONS: GameOptions = {
  cameraSensitivity: 1,
  invertCameraX: false,
  invertCameraY: false,
  cameraKeySpeed: 120,
  fullscreen: false,
  showFps: true,
  fpsCap: 0,
  ...GRAPHICS_PRESETS.alto,
  theme: 'pergamino',
  font: 'clasica',
  uiScale: 1,
  uiScaleAuto: true,
  hotbarIconScale: 1,
  bagIconScale: 1,
  windowOpacity: 1,
  uiAnimations: true,
  combatLogSize: 12,
  tooltipDelay: 0,
  lockWindows: false,
  enemyBars: 'heridos',
  damageNumbers: true,
  enemyLabels: true,
  confirmRareSell: true,
  showSpellRange: true,
  castMode: 'indicator',
  showPath: true,
  showGrid: false,
  volume: 0.8,
  musicVolume: 0.8,
  sfxVolume: 1,
};
export const OPTION_LIMITS = {
  cameraSensitivity: { min: 0.2, max: 3, step: 0.1 },
  cameraKeySpeed: { min: 30, max: 360, step: 10 },
  vegetationDensity: { min: 0, max: 1, step: 0.05 },
  viewDistance: { min: 100, max: 700, step: 25 },
  particles: { min: 0, max: 1.5, step: 0.05 },
  renderScale: { min: 0.5, max: 1, step: 0.05 },
  uiScale: { min: 0.75, max: 2, step: 0.05 },
  hotbarIconScale: { min: 0.8, max: 1.6, step: 0.05 },
  bagIconScale: { min: 0.8, max: 1.6, step: 0.05 },
  windowOpacity: { min: 0.5, max: 1, step: 0.05 },
  combatLogSize: { min: 10, max: 20, step: 1 },
  tooltipDelay: { min: 0, max: 1000, step: 50 },
  volume: { min: 0, max: 1, step: 0.05 },
  musicVolume: { min: 0, max: 1, step: 0.05 },
  sfxVolume: { min: 0, max: 1, step: 0.05 },
};

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Mezcla lo guardado con los valores por defecto y recorta a los límites. */
export function normalizeOptions(raw: unknown): GameOptions {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof GameOptions, unknown>>;
  const D = DEFAULT_OPTIONS;
  const L = OPTION_LIMITS;
  const num = (k: keyof typeof OPTION_LIMITS): number => {
    const v = o[k];
    return clamp(typeof v === 'number' && Number.isFinite(v) ? v : D[k], L[k].min, L[k].max);
  };
  const bool = (k: keyof GameOptions): boolean => {
    const v = o[k];
    return typeof v === 'boolean' ? v : (D[k] as boolean);
  };
  const pick = <T extends string | number>(k: keyof GameOptions, list: readonly T[], v: unknown = o[k]): T =>
    list.includes(v as T) ? (v as T) : (D[k] as T);
  const theme = typeof o.theme === 'string' ? (OLD_THEMES[o.theme] ?? o.theme) : o.theme;
  return {
    cameraSensitivity: num('cameraSensitivity'),
    invertCameraX: bool('invertCameraX'),
    invertCameraY: bool('invertCameraY'),
    cameraKeySpeed: num('cameraKeySpeed'),
    fullscreen: bool('fullscreen'),
    showFps: bool('showFps'),
    fpsCap: pick('fpsCap', FPS_CAPS),
    shadows: pick('shadows', SHADOW_LEVELS),
    vegetationDensity: num('vegetationDensity'),
    viewDistance: num('viewDistance'),
    particles: num('particles'),
    renderScale: num('renderScale'),
    antialias: pick('antialias', ANTIALIAS_MODES),
    occlusionCut: bool('occlusionCut'),
    theme: pick('theme', THEMES, theme),
    font: pick('font', FONTS),
    uiScale: num('uiScale'),
    uiScaleAuto: bool('uiScaleAuto'),
    hotbarIconScale: num('hotbarIconScale'),
    bagIconScale: num('bagIconScale'),
    windowOpacity: num('windowOpacity'),
    uiAnimations: bool('uiAnimations'),
    combatLogSize: num('combatLogSize'),
    tooltipDelay: num('tooltipDelay'),
    lockWindows: bool('lockWindows'),
    enemyBars: pick('enemyBars', ENEMY_BAR_MODES),
    damageNumbers: bool('damageNumbers'),
    enemyLabels: bool('enemyLabels'),
    confirmRareSell: bool('confirmRareSell'),
    showSpellRange: bool('showSpellRange'),
    castMode: pick('castMode', CAST_MODES),
    showPath: bool('showPath'),
    showGrid: bool('showGrid'),
    volume: num('volume'),
    musicVolume: num('musicVolume'),
    sfxVolume: num('sfxVolume'),
  };
}

export function loadOptions(store: KeyValueStore): GameOptions {
  try {
    return normalizeOptions(JSON.parse(store.getItem(OPTIONS_KEY) ?? 'null'));
  } catch {
    return { ...DEFAULT_OPTIONS };
  }
}

export function saveOptions(store: KeyValueStore, o: GameOptions): void {
  store.setItem(OPTIONS_KEY, JSON.stringify(normalizeOptions(o)));
}

/** Almacén en memoria (tests, o si `localStorage` no está disponible). */
export class MemoryStore implements KeyValueStore {
  private readonly m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
  removeItem(k: string): void {
    this.m.delete(k);
  }
}
