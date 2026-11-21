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
