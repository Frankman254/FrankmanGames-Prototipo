// Guardado en 3 ranuras y opciones, sobre `localStorage` (o cualquier objeto
// con la misma forma, para los tests). Nada sale del equipo.
import type { SaveData } from '../../rpg/contracts';

/** Lo mínimo de `Storage` que se usa. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SLOT_COUNT = 3;
const SAVE_PREFIX = 'frankmangames.save.';
const OPTIONS_KEY = 'frankmangames.options';

export interface SlotSummary {
  slot: number;
  name: string;
  classId: string;
  level: number;
  savedAt: string;
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

export class SaveStore {
  constructor(private readonly store: KeyValueStore) {}

  private key(slot: number): string {
    if (!Number.isInteger(slot) || slot < 0 || slot >= SLOT_COUNT) throw new Error(`Ranura no válida: ${slot}`);
    return SAVE_PREFIX + slot;
  }

  read(slot: number): SaveData | null {
    const raw = this.store.getItem(this.key(slot));
    if (!raw) return null;
    try {
      const data: unknown = JSON.parse(raw);
      return isSaveData(data) ? data : null;
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

  /** Una entrada por ranura; null si está vacía o ilegible. */
  list(): (SlotSummary | null)[] {
    return Array.from({ length: SLOT_COUNT }, (_, slot) => {
      const d = this.read(slot);
      return d ? { slot, name: d.name, classId: d.classId, level: d.level, savedAt: d.savedAt } : null;
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
  /** Anillo del alcance del hechizo mientras se carga. */
  showSpellRange: boolean;
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
  uiScale: { min: 0.75, max: 1.5, step: 0.05 },
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
