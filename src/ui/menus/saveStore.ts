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

export interface GameOptions {
  /** Multiplicador de la cámara (la usa el rig de cámara de la rama de mundo). */
  cameraSensitivity: number;
  invertCameraY: boolean;
  showFps: boolean;
  /** 0..1; todavía no hay sonido. */
  volume: number;
}

export const DEFAULT_OPTIONS: GameOptions = { cameraSensitivity: 1, invertCameraY: false, showFps: true, volume: 0.8 };
export const OPTION_LIMITS = { cameraSensitivity: { min: 0.2, max: 3, step: 0.1 }, volume: { min: 0, max: 1, step: 0.05 } };

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Mezcla lo guardado con los valores por defecto y recorta a los límites. */
export function normalizeOptions(raw: unknown): GameOptions {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof GameOptions, unknown>>;
  const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);
  const L = OPTION_LIMITS;
  return {
    cameraSensitivity: clamp(num(o.cameraSensitivity, DEFAULT_OPTIONS.cameraSensitivity), L.cameraSensitivity.min, L.cameraSensitivity.max),
    invertCameraY: bool(o.invertCameraY, DEFAULT_OPTIONS.invertCameraY),
    showFps: bool(o.showFps, DEFAULT_OPTIONS.showFps),
    volume: clamp(num(o.volume, DEFAULT_OPTIONS.volume), L.volume.min, L.volume.max),
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
