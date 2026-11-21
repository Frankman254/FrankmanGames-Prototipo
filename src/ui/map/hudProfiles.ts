// Perfiles de la disposición del HUD: dónde va cada elemento (barra de abajo,
// coordenadas, barra de combate, seguimiento de misión, minimapa y registro de
// combate) y el tamaño del minimapa (ancho y alto). Se crean, renombran, borran y cambian;
// todo se guarda en este equipo. Lógica pura: el DOM lo pone `hudLayout.ts`.
import type { KeyValueStore } from '../menus/saveStore';
import { parseLayout, type WindowPos } from '../menus/windows';
import type { AutoScaleDef, MinimapSize } from './mapLogic';

/** Elementos del HUD que se pueden mover (clave de `WindowLayout`). */
export const HUD_ELEMENTS = [
    { key: 'hud-bar', label: 'Barra de abajo' },
    { key: 'hud-sec-character', label: 'Personaje' },
    { key: 'hud-sec-items', label: 'Objetos' },
    { key: 'hud-sec-spells', label: 'Hechizos' },
    // BAR-01 (creador, 2026-11-18): las filas 2 y 3 se colocan por separado al separar la barra.
    { key: 'hud-sec-spells-2', label: 'Hechizos, fila 2' },
    { key: 'hud-sec-spells-3', label: 'Hechizos, fila 3' },
    { key: 'hud-sec-xp', label: 'Experiencia' },
    { key: 'hud-sec-menu', label: 'Accesos' },
    { key: 'world-info', label: 'Coordenadas y zona' },
    { key: 'combat-bar', label: 'Barra de combate' },
    { key: 'quest-tracker', label: 'Seguimiento de misión' },
    { key: 'minimap', label: 'Minimapa' },
    { key: 'combat-log', label: 'Registro de combate' },
    { key: 'chat', label: 'Chat' },
    { key: 'hud-pet', label: 'Mascota' },
] as const;

/** Tamaño de un elemento del HUD: multiplica su tamaño de siempre (letras incluidas). */
export const HUD_SCALE_MIN = 0.6;
export const HUD_SCALE_MAX = 1.8;
export const clampHudScale = (v: number): number =>
    Math.round(Math.max(HUD_SCALE_MIN, Math.min(HUD_SCALE_MAX, v)) * 100) / 100;

/** Escala por eje de un elemento del HUD. */
export interface HudScale {
    x: number;
    y: number;
}

/** Clampear una escala por eje. */
export function clampHudScaleAxis(s: HudScale): HudScale {
    return { x: clampHudScale(s.x), y: clampHudScale(s.y) };
}

/** Migrar una escala antigua (número único) a {x, y}. */
export function migrateScale(v: number): HudScale {
    const clamped = clampHudScale(v);
    return { x: clamped, y: clamped };
}
export type HudElementKey = (typeof HUD_ELEMENTS)[number]['key'];
export const HUD_KEYS: readonly string[] = HUD_ELEMENTS.map((e) => e.key);

export interface HudProfile {
    id: string;
    name: string;
    /** Posición de cada elemento movido; el que falta va a su sitio de la hoja de estilos. */
    positions: Record<string, WindowPos>;
    /** Ancho y alto del minimapa en píxeles CSS (null = el cuadrado de los datos). */
    minimapSize: MinimapSize | null;
    /** Tamaño de cada elemento por eje ({x, y} = el de siempre); el minimapa usa `minimapSize`. */
    scales?: Record<string, HudScale>;
    /** La barra de abajo separada en secciones sueltas. */
    barSplit?: boolean;
    /** false = suelta: sus asas se ven y se puede arrastrar. Por defecto, fijada. */
    barPinned?: boolean;
}

export interface HudProfileState {
    active: string;
    profiles: HudProfile[];
}

export const PROFILE_NAME_MAX = 24;
const STORE_KEY = 'frankmangames.hudProfiles';

const cleanName = (name: unknown, fallback: string): string => {
    const s = typeof name === 'string' ? name.replace(/\s+/g, ' ').trim().slice(0, PROFILE_NAME_MAX) : '';
    return s || fallback;
};

function defaultState(): HudProfileState {
    return { active: 'p1', profiles: [{ id: 'p1', name: 'Principal', positions: {}, minimapSize: null }] };
}

/** Tamaño guardado del minimapa: `{ w, h }`, o un número (perfiles de cuando era cuadrado). */
/** Escalas guardadas: migra números únicos a {x, y}. */
export function parseScales(raw: unknown): Record<string, HudScale> {
    const out: Record<string, HudScale> = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const [key, v] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof v === 'number' && Number.isFinite(v)) {
            // Migración: número único → {x, y}
            out[key] = migrateScale(v);
        } else if (
            v &&
            typeof v === 'object' &&
            'x' in v &&
            'y' in v &&
            typeof (v as { x: unknown; y: unknown }).x === 'number' &&
            typeof (v as { x: unknown; y: unknown }).y === 'number'
        ) {
            const sv = v as { x: number; y: number };
            if (Number.isFinite(sv.x) && Number.isFinite(sv.y)) {
                out[key] = clampHudScaleAxis(sv);
            }
        }
    }
    return out;
}

export function parseMinimapSize(raw: unknown): MinimapSize | null {
    if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? { w: raw, h: raw } : null;
    const o = raw as Partial<MinimapSize> | null;
    if (!o || typeof o !== 'object') return null;
    const ok = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
    return ok(o.w) && ok(o.h) ? { w: o.w, h: o.h } : null;
}

/** Lee lo guardado: descarta lo que no tenga forma y garantiza un perfil activo. */
export function normalizeProfiles(raw: unknown): HudProfileState {
    const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof HudProfileState, unknown>>;
    const list: HudProfile[] = [];
    if (Array.isArray(o.profiles)) {
        for (const p of o.profiles as unknown[]) {
            const q = p as Partial<Record<keyof HudProfile, unknown>> | null;
            if (!q || typeof q.id !== 'string' || list.some((x) => x.id === q.id)) continue;
            const positions = parseLayout(q.positions);
            for (const k of Object.keys(positions)) if (!HUD_KEYS.includes(k)) delete positions[k];
            const size = parseMinimapSize(q.minimapSize);
            list.push({
                id: q.id,
                name: cleanName(q.name, `Perfil ${list.length + 1}`),
                positions,
                minimapSize: size,
                scales: parseScales((q as { scales?: unknown }).scales),
                ...(q.barSplit === true ? { barSplit: true } : {}),
                ...(q.barPinned === false ? { barPinned: false } : {}),
            });
        }
    }
    if (list.length === 0) return defaultState();
    const active = typeof o.active === 'string' && list.some((p) => p.id === o.active) ? o.active : list[0]!.id;
    return { active, profiles: list };
}

/** Perfiles guardados en un `KeyValueStore`. Cada cambio se guarda al momento. */
export class HudProfileBook {
    state: HudProfileState;

    constructor(private readonly store: KeyValueStore) {
        let raw: unknown = null;
        try {
            raw = JSON.parse(store.getItem(STORE_KEY) ?? 'null');
        } catch {
            raw = null;
        }
        this.state = normalizeProfiles(raw);
    }

    get active(): HudProfile {
        return this.state.profiles.find((p) => p.id === this.state.active)!;
    }

    get list(): readonly HudProfile[] {
        return this.state.profiles;
    }

    private newId(): string {
        let n = this.state.profiles.length + 1;
        while (this.state.profiles.some((p) => p.id === `p${n}`)) n++;
        return `p${n}`;
    }

    /** Perfil nuevo copiando el activo, y pasa a ser el activo. */
    create(name?: string): HudProfile {
        const from = this.active;
        const p: HudProfile = {
            id: this.newId(),
            name: cleanName(name, `Perfil ${this.state.profiles.length + 1}`),
            positions: structuredClone(from.positions),
            minimapSize: from.minimapSize ? { ...from.minimapSize } : null,
            ...(from.scales ? { scales: { ...from.scales } } : {}),
            ...(from.barSplit ? { barSplit: true } : {}),
            ...(from.barPinned === false ? { barPinned: false } : {}),
        };
        this.state.profiles.push(p);
        this.state.active = p.id;
        this.save();
        return p;
    }

    rename(id: string, name: string): boolean {
        const p = this.state.profiles.find((x) => x.id === id);
        if (!p) return false;
        p.name = cleanName(name, p.name);
        this.save();
        return true;
    }

    /** Borra un perfil (nunca el último). Si era el activo, pasa al primero que quede. */
    remove(id: string): boolean {
        if (this.state.profiles.length <= 1) return false;
        const i = this.state.profiles.findIndex((x) => x.id === id);
        if (i < 0) return false;
        this.state.profiles.splice(i, 1);
        if (this.state.active === id) this.state.active = this.state.profiles[0]!.id;
        this.save();
        return true;
    }

    switchTo(id: string): boolean {
        if (!this.state.profiles.some((p) => p.id === id)) return false;
        this.state.active = id;
        this.save();
        return true;
    }

    /** Un elemento se movió: se apunta en el perfil activo. */
    setPosition(key: string, pos: WindowPos | null): void {
        if (!HUD_KEYS.includes(key)) return;
        if (pos) this.active.positions[key] = { ...pos };
        else delete this.active.positions[key];
        this.save();
    }

    setBar(split: boolean, pinned: boolean): void {
        const p = this.active;
        if (split) p.barSplit = true;
        else delete p.barSplit;
        if (pinned) delete p.barPinned;
        else p.barPinned = false;
        this.save();
    }

    /**
     * Cambia la escala de un elemento.
     * @param key Clave del elemento.
     * @param sx Escala en X (null = no cambiar).
     * @param sy Escala en Y (null = no cambiar).
     */
    setScale(key: string, sx: number | null, sy?: number | null): void {
        const p = this.active;
        const next = { ...(p.scales ?? {}) };
        const current = next[key] ?? { x: 1, y: 1 };
        const newX = sx !== null ? clampHudScale(sx) : current.x;
        const newY = (sy ?? sx) !== null ? clampHudScale(sy ?? sx ?? 1) : current.y;
        if (Math.abs(newX - 1) < 0.01 && Math.abs(newY - 1) < 0.01) delete next[key];
        else next[key] = { x: newX, y: newY };
        p.scales = next;
        this.save();
    }

    setMinimapSize(size: MinimapSize | null): void {
        this.active.minimapSize = size === null ? null : { w: Math.round(size.w), h: Math.round(size.h) };
        this.save();
    }

    /** Todo el perfil activo a su sitio de siempre. */
    resetActive(): void {
        this.active.positions = {};
        this.active.minimapSize = null;
        delete this.active.scales;
        delete this.active.barSplit;
        delete this.active.barPinned;
        this.save();
    }

    private save(): void {
        try {
            this.store.setItem(STORE_KEY, JSON.stringify(this.state));
        } catch {
            /* sin almacenamiento: dura la sesión */
        }
    }
}

// ─── Tamaño automático de la interfaz ──────────────────────────────────────

/**
 * Escala de la interfaz según la pantalla real: el lado que más aprieta
 * respecto a la de referencia (1080p = 100 %, la interfaz ocupa la misma parte
 * de la pantalla en cualquier monitor), con un empujón y un extra opcionales
 * en pantallas de muchos píxeles físicos; ambos en data/ui/map.json.
 * `width`/`height` en píxeles CSS (`innerWidth`/`innerHeight`), `dpr` = `devicePixelRatio`.
 */
export function autoUiScale(width: number, height: number, dpr: number, d: AutoScaleDef): number {
    if (!(width > 0) || !(height > 0)) return 1;
    const ratio = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
    let s = Math.min(width / d.refWidth, height / d.refHeight) * d.boost;
    if (height * ratio >= d.bigScreenPx) s += d.bigScreenBonus;
    s = Math.min(d.max, Math.max(d.min, s));
    return Number((Math.round(s / d.step) * d.step).toFixed(4));
}

/** Área máxima de contenido antes de aplicar `zoom`, siempre dentro del viewport. */
export function uiViewportBounds(
    width: number,
    height: number,
    scale: number,
    padding = 24,
): { width: number; height: number } {
    const s = Number.isFinite(scale) && scale > 0 ? scale : 1;
    const w = Number.isFinite(width) && width > 0 ? width : 304;
    const h = Number.isFinite(height) && height > 0 ? height : 264;
    return {
        width: Math.max(1, (w - padding) / s),
        height: Math.max(1, (h - padding) / s),
    };
}

// ─── Posiciones por defecto según proporción de pantalla (JL-60) ───────────

/**
 * Clase de proporción de pantalla. Se elige comparando el aspect ratio con
 * umbrales: ≤1.7 → 16:9 (incluye 4:3 y similares); ≤1.85 → 16:10; ≤2.4 → 21:9;
 * >2.4 → 32:9.
 */
export type AspectClass = '16:9' | '16:10' | '21:9' | '32:9';

/**
 * Devuelve la clase de proporción para un viewport dado.
 */
export function getAspectClass(w: number, h: number): AspectClass {
    if (h <= 0 || w <= 0) return '16:9';
    const ratio = w / h;
    if (ratio <= 1.78) return '16:9';      // 16:9 = 1.777…
    if (ratio <= 1.85) return '16:10';    // 16:10 = 1.6 — pero 2000/1191 = 1.679 → 16:9
    if (ratio <= 2.4) return '21:9';      // 21:9 = 2.333…
    return '32:9';                        // 32:9 = 3.555…
}

/**
 * Rectángulo de zona segura: en pantallas ultrawide (21:9 y 32:9) el HUD
 * se mantiene dentro de una zona centrada de proporción 16:9 para que los
 * elementos no se vayan a los extremos del monitor.
 *
 * Devuelve { left, top, right, bottom } en píxeles CSS dentro del viewport.
 */
export function safeZone(w: number, h: number, aspect: AspectClass): { left: number; top: number; right: number; bottom: number } {
    if (aspect === '21:9' || aspect === '32:9') {
        // Zona segura centrada de proporción 16:9.
        const safeH = h; // ocupa todo el alto
        const safeW = Math.min(w, safeH * (16 / 9));
        const left = Math.round((w - safeW) / 2);
        return { left, top: 0, right: w - left, bottom: h };
    }
    return { left: 0, top: 0, right: w, bottom: h };
}

/**
 * Posición por defecto de un elemento del HUD, expresada como fracción del
 * viewport (mismo formato que WindowPos). Cada clase de proporción tiene su
 * tabla; los valores son fracciones del hueco libre (0 = borde, 1 = borde opuesto).
 *
 * Fórmula: f = v / (view - size) donde v es la coordenada de la esquina superior
 * izquierda y size es el ancho/alto del elemento.
 *
 * Para simplificar, las tablas declaran la esquina superior izquierda en píxeles
 * relativos a una resolución de referencia por clase, y `getDefaultPositions()`
 * las convierte a fracciones para el viewport real.
 */

/** Posición en píxeles CSS relativos al viewport (esquina superior izquierda). */
interface PosPx {
    x?: number;
    y?: number;
    top?: number;
    right?: number;
    bottom?: number;
}

/** Tabla de posiciones por defecto para una clase de proporción. */
interface AspectDefaults {
    /** Resolución de referencia para calcular fracciones. */
    refW: number;
    refH: number;
    /** Posición de cada elemento en píxeles CSS sobre la referencia. */
    positions: Record<string, PosPx>;
}

/**
 * Tablas de posiciones por defecto por clase de proporción.
 *
 * Las posiciones se expresan sobre una resolución de referencia y se escalan
 * proporcionalmente al viewport real. Los elementos que no aparecen en la tabla
 * usan su posición CSS (hoja de estilos).
 *
 * Diseño de referencia 16:9 (1920×1080):
 * - minimap: arriba-derecha, 14 px del borde
 * - quest-tracker: debajo del minimapa, 8 px del borde derecho
 * - world-info: centrado arriba, 6 px del tope
 * - combat-bar: centrado arriba, 34 px del tope
 * - chat: abajo-izquierda, 6 px del borde, 136 px del fondo
 * - hud-bar: centrado abajo, 8 px del fondo
 * - hud-pet: junto a la barra
 *
 * En 21:9 y 32:9 todo se coloca dentro de la zona segura centrada (16:9).
 */
const ASPECT_TABLES: Record<AspectClass, AspectDefaults> = {
    '16:9': {
        refW: 1920,
        refH: 1080,
        positions: {
            minimap: { right: 14, top: 14 },
            'quest-tracker': { right: 8, top: 234 },
            'world-info': { x: 0, y: 6 },
            'combat-bar': { x: 0, y: 34 },
            chat: { x: 6, bottom: 136 },
            'hud-bar': { x: 0, bottom: 8 },
            'hud-pet': { right: 8, bottom: 8 },
        },
    },
    '16:10': {
        refW: 2000,
        refH: 1191,
        positions: {
            minimap: { right: 14, top: 14 },
            'quest-tracker': { right: 8, top: 234 },
            'world-info': { x: 0, y: 6 },
            'combat-bar': { x: 0, y: 34 },
            chat: { x: 6, bottom: 136 },
            'hud-bar': { x: 0, bottom: 8 },
            'hud-pet': { right: 8, bottom: 8 },
        },
    },
    '21:9': {
        refW: 2560,
        refH: 1080,
        positions: {
            // Dentro de zona segura centrada (16:9 dentro de 2560×1080 → 1920 px centrados).
            // Zona segura: left=320, right=2240 (ancho 1920).
            minimap: { right: 320 + 14, top: 14 },
            'quest-tracker': { right: 320 + 8, top: 240 },
            'world-info': { x: 320, y: 6 },
            'combat-bar': { x: 320, y: 34 },
            chat: { x: 320 + 6, bottom: 136 },
            'hud-bar': { x: 320, bottom: 8 },
            'hud-pet': { right: 320 + 8, bottom: 8 },
        },
    },
    '32:9': {
        refW: 5120,
        refH: 1440,
        positions: {
            // Zona segura centrada (16:9 dentro de 5120×1440 → 2880 px centrados).
            // Zona segura: left=1120, right=4000 (ancho 2880).
            minimap: { right: 1120 + 14, top: 14 },
            'quest-tracker': { right: 1120 + 8, top: 240 },
            'world-info': { x: 1120, y: 6 },
            'combat-bar': { x: 1120, y: 34 },
            chat: { x: 1120 + 6, bottom: 136 },
            'hud-bar': { x: 1120, bottom: 8 },
            'hud-pet': { right: 1120 + 8, bottom: 8 },
        },
    },
};

/**
 * Convierte una posición de referencia (píxeles sobre la resolución de la tabla)
 * a WindowPos (fracción del hueco libre) para un viewport real.
 *
 * `elW` y `elH` son el ancho y alto estimados del elemento en píxeles CSS
 * del viewport real. Si no se conocen, se usan los valores por defecto.
 */
function posToWindowPos(
    pos: PosPx,
    elW: number,
    elH: number,
    vw: number,
    vh: number,
): WindowPos {
    const f = (v: number, size: number, view: number): number =>
        view - size > 1 ? Math.max(0, Math.min(1, v / (view - size))) : 0;

    let x = 0;
    let y = 0;

    if (pos.right !== undefined) {
        x = vw - pos.right - elW;
    } else if (pos.x !== undefined) {
        x = pos.x;
    }

    if (pos.bottom !== undefined) {
        y = vh - pos.bottom - elH;
    } else if (pos.top !== undefined) {
        y = pos.top;
    } else if (pos.y !== undefined) {
        y = pos.y;
    }

    return {
        x: f(x, elW, vw),
        y: f(y, elH, vh),
    };
}

/**
 * Anchos y altos estimados de cada elemento del HUD en píxeles CSS a escala 1.
 * Se usan para convertir posiciones absolutas a fracciones cuando el elemento
 * aún no está en el DOM.
 */
const ESTIMATED_SIZE: Record<string, { w: number; h: number }> = {
    minimap: { w: 220, h: 220 },
    'quest-tracker': { w: 206, h: 120 },
    'world-info': { w: 200, h: 20 },
    'combat-bar': { w: 400, h: 28 },
    chat: { w: 340, h: 200 },
    'hud-bar': { w: 640, h: 128 },
    'hud-pet': { w: 160, h: 40 },
    'hud-sec-character': { w: 120, h: 100 },
    'hud-sec-items': { w: 200, h: 46 },
    'hud-sec-spells': { w: 400, h: 46 },
    'hud-sec-spells-2': { w: 400, h: 46 },
    'hud-sec-spells-3': { w: 400, h: 46 },
    'hud-sec-xp': { w: 100, h: 20 },
    'hud-sec-menu': { w: 80, h: 46 },
};

/**
 * Devuelve las posiciones por defecto para un viewport dado, como mapa
 * clave → WindowPos. Solo incluye los elementos que tienen posición en la
 * tabla de la proporción del viewport.
 *
 * Los elementos centrados (world-info, combat-bar, hud-bar) necesitan
 * calcular el centro; `posToWindowPos` recibe `x` como coordenada izquierda,
 * pero para centrado se pasa la coordenada ya centrada.
 */
export function getDefaultPositions(vw: number, vh: number): Record<string, WindowPos> {
    const aspect = getAspectClass(vw, vh);
    const table = ASPECT_TABLES[aspect];
    const sz = safeZone(vw, vh, aspect);
    const out: Record<string, WindowPos> = {};
    // Escalar posiciones y tamaños de la referencia al viewport real.
    const scaleX = vw / table.refW;
    const scaleY = vh / table.refH;

    for (const [key, pos] of Object.entries(table.positions)) {
        const base = ESTIMATED_SIZE[key] ?? { w: 200, h: 100 };
        const est = { w: Math.round(base.w * scaleX), h: Math.round(base.h * scaleY) };

        const scaled: PosPx = {};
        if (pos.x !== undefined) scaled.x = Math.round(pos.x * scaleX);
        if (pos.y !== undefined) scaled.y = Math.round(pos.y * scaleY);
        if (pos.top !== undefined) scaled.top = Math.round(pos.top * scaleY);
        if (pos.right !== undefined) scaled.right = Math.round(pos.right * scaleX);
        if (pos.bottom !== undefined) scaled.bottom = Math.round(pos.bottom * scaleY);

        // Para elementos centrados horizontalmente (world-info, combat-bar, hud-bar),
        // calcular el centro dentro de la zona segura.
        if ((key === 'world-info' || key === 'combat-bar' || key === 'hud-bar') && scaled.x !== undefined) {
            const safeCenter = (sz.left + sz.right) / 2;
            scaled.x = Math.round(safeCenter - est.w / 2);
        }

        out[key] = posToWindowPos(scaled, est.w, est.h, vw, vh);
    }

    return out;
}

/**
 * Verifica que dos rectángulos no se solapan. Los rectángulos se expresan
 * como { x, y, w, h } en píxeles CSS del viewport.
 */
function rectsOverlap(
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number },
): boolean {
    return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

/**
 * Verifica que las posiciones por defecto de un viewport no producen
 * solapamientos entre elementos del HUD. Devuelve un array de pares
 * que se solapan (vacío = todo limpio).
 *
 * Los tamaños estimados se escalan según el factor del viewport respecto
 * a la resolución de referencia de la clase de proporción, para que la
 * prueba refleje el tamaño real de los elementos en esa pantalla.
 */
export function checkDefaultPositionsOverlap(vw: number, vh: number): [string, string][] {
    const defaults = getDefaultPositions(vw, vh);
    const aspect = getAspectClass(vw, vh);
    const table = ASPECT_TABLES[aspect];
    const scaleX = vw / table.refW;
    const scaleY = vh / table.refH;
    const overlaps: [string, string][] = [];

    const entries = Object.entries(defaults);
    for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
            const [ka, pa] = entries[i]!;
            const [kb, pb] = entries[j]!;
            const eaBase = ESTIMATED_SIZE[ka] ?? { w: 200, h: 100 };
            const ebBase = ESTIMATED_SIZE[kb] ?? { w: 200, h: 100 };
            // Escalar tamaños al viewport real.
            const ea = { w: Math.round(eaBase.w * scaleX), h: Math.round(eaBase.h * scaleY) };
            const eb = { w: Math.round(ebBase.w * scaleX), h: Math.round(ebBase.h * scaleY) };

            // Convertir WindowPos a píxeles.
            const fromF = (frac: number, size: number, view: number): number =>
                Math.round(frac * (view - size));

            const ra = {
                x: fromF(pa.x, ea.w, vw),
                y: fromF(pa.y, ea.h, vh),
                w: ea.w,
                h: ea.h,
            };
            const rb = {
                x: fromF(pb.x, eb.w, vw),
                y: fromF(pb.y, eb.h, vh),
                w: eb.w,
                h: eb.h,
            };

            if (rectsOverlap(ra, rb)) {
                overlaps.push([ka, kb]);
            }
        }
    }

    return overlaps;
}

/**
 * Verifica que todas las posiciones por defecto caben dentro del viewport.
 * Devuelve un array de claves que salen fuera (vacío = todo dentro).
 *
 * Los tamaños estimados se escalan al viewport real.
 */
export function checkDefaultPositionsFit(vw: number, vh: number): string[] {
    const defaults = getDefaultPositions(vw, vh);
    const aspect = getAspectClass(vw, vh);
    const table = ASPECT_TABLES[aspect];
    const sx = vw / table.refW;
    const sy = vh / table.refH;
    const outside: string[] = [];

    for (const [key, p] of Object.entries(defaults)) {
        const base = ESTIMATED_SIZE[key] ?? { w: 200, h: 100 };
        const est = { w: Math.round(base.w * sx), h: Math.round(base.h * sy) };
        const fromF = (frac: number, size: number, view: number): number =>
            Math.round(frac * (view - size));

        const x = fromF(p.x, est.w, vw);
        const y = fromF(p.y, est.h, vh);

        if (x < 0 || y < 0 || x + est.w > vw || y + est.h > vh) {
            outside.push(key);
        }
    }

    return outside;
}
