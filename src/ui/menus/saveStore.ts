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

/** Temas de la interfaz (colores en `src/ui/styles/themes.css`). */
export const THEMES = ['pergamino', 'noche', 'bosque', 'claro', 'contraste'] as const;
export type ThemeId = (typeof THEMES)[number];
/** Juegos de letra del sistema (sin descargas). */
export const FONTS = ['clasica', 'libro', 'moderna', 'legible'] as const;
export type FontId = (typeof FONTS)[number];
/** Límite de fotogramas por segundo; 0 = sin límite. */
export const FPS_CAPS = [0, 30, 60, 120] as const;

/**
 * Opciones del jugador. Consenso de las dos referencias: de FATE (config.dat)
 * pantalla completa, FPS visibles y volúmenes general / música / efectos; de
 * DOFUS 3 temas de interfaz, escala de la interfaz, bloquear la posición de
 * las ventanas y mostrar la cuadrícula. Lo demás es propio.
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
  // Interfaz
  theme: ThemeId;
  font: FontId;
  /** Escala de toda la interfaz (paneles, HUD y ventanas). */
  uiScale: number;
  /** Ventanas fijas: no se pueden arrastrar. */
  lockWindows: boolean;
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

export const DEFAULT_OPTIONS: GameOptions = {
  cameraSensitivity: 1,
  invertCameraX: false,
  invertCameraY: false,
  cameraKeySpeed: 120,
  fullscreen: false,
  showFps: true,
  fpsCap: 0,
  theme: 'pergamino',
  font: 'clasica',
  uiScale: 1,
  lockWindows: false,
  showPath: true,
  showGrid: false,
  volume: 0.8,
  musicVolume: 0.8,
  sfxVolume: 1,
};
export const OPTION_LIMITS = {
  cameraSensitivity: { min: 0.2, max: 3, step: 0.1 },
  cameraKeySpeed: { min: 30, max: 360, step: 10 },
  uiScale: { min: 0.75, max: 1.5, step: 0.05 },
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
  const pick = <T extends string | number>(k: keyof GameOptions, list: readonly T[]): T => {
    const v = o[k];
    return list.includes(v as T) ? (v as T) : (D[k] as T);
  };
  return {
    cameraSensitivity: num('cameraSensitivity'),
    invertCameraX: bool('invertCameraX'),
    invertCameraY: bool('invertCameraY'),
    cameraKeySpeed: num('cameraKeySpeed'),
    fullscreen: bool('fullscreen'),
    showFps: bool('showFps'),
    fpsCap: pick('fpsCap', FPS_CAPS),
    theme: pick('theme', THEMES),
    font: pick('font', FONTS),
    uiScale: num('uiScale'),
    lockWindows: bool('lockWindows'),
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
