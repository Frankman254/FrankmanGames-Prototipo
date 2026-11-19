export interface SpectralDef {
    speedMultiplier: number;
    resurrectRadius: number;
    pulseAtZero: 'longRevive' | 'weakened' | 'blockedCombat';
    resurrectors: { id: string; name: string; region: string; x: number; y: number }[];
}
export interface SpectralSaveData {
    active: boolean;
    deaths: number;
    /** MUE-02: último piso de mazmorra donde murió el personaje (0-indexado). Falta en guardados viejos (= sin piso guardado). */
    lastDungeonFloor?: number;
}

export function parseSpectralDef(raw: unknown): SpectralDef {
    const r = new Reader('death.json');
    const o = r.obj(raw);
    const mode = r.str(o, 'pulseAtZero', ['longRevive', 'weakened', 'blockedCombat']) as SpectralDef['pulseAtZero'];
    const resurrectors = r.arr(o, 'resurrectors').map((value, index) => {
        const q = r.child('resurrectors').child(index);
        const v = q.obj(value);
        return {
            id: q.str(v, 'id'),
            name: q.str(v, 'name'),
            region: q.str(v, 'region'),
            x: q.num(v, 'x'),
            y: q.num(v, 'y'),
        };
    });
    if (new Set(resurrectors.map((x) => x.id)).size !== resurrectors.length)
        r.fail('resurrectors', 'los id deben ser únicos');
    if (resurrectors.length === 0) r.fail('resurrectors', 'se necesita al menos un Alzador');
    return {
        speedMultiplier: r.num(o, 'speedMultiplier', { min: 0.1, max: 1 }),
        resurrectRadius: r.num(o, 'resurrectRadius', { min: 0.5, max: 20 }),
        pulseAtZero: mode,
        resurrectors,
    };
}

export class SpectralState {
    active: boolean;
    deaths: number;
    /** MUE-02: último piso de mazmorra donde murió el personaje (0-indexado). null = no hay piso guardado. */
    lastDungeonFloor: number | null = null;
    /** Modo edición: `death.json` cambia en caliente; el estado conserva la referencia. */
    def: SpectralDef;
    constructor(def: SpectralDef, saved?: Partial<SpectralSaveData>) {
        this.def = def;
        this.active = saved?.active === true;
        this.deaths = Number.isSafeInteger(saved?.deaths) && saved!.deaths! >= 0 ? saved!.deaths! : 0;
        this.lastDungeonFloor =
            typeof saved?.lastDungeonFloor === 'number' && saved!.lastDungeonFloor! >= 0 ? saved!.lastDungeonFloor! : null;
    }
    /**
     * MUE-02: registra el piso donde murió el personaje. Solo se guarda si el
     * valor es válido (piso 0 o superior). Se llama desde la escena de la mazmorra
     * antes de `die()`.
     */
    rememberFloor(floor: number): void {
        if (floor >= 0) this.lastDungeonFloor = floor;
    }
    /** MUE-02: devuelve y borra el piso guardado. null = no hay piso pendiente. */
    takeFloor(): number | null {
        const f = this.lastDungeonFloor;
        this.lastDungeonFloor = null;
        return f;
    }
    die(): void {
        this.active = true;
        this.deaths++;
    }
    canFight(): boolean {
        return !this.active;
    }
    canLoot(): boolean {
        return !this.active;
    }
    ignoredByEnemies(): boolean {
        return this.active;
    }
    speed(base: number): number {
        return this.active ? base * this.def.speedMultiplier : base;
    }
    resurrectAt(id: string, pos: { x: number; y: number }): boolean {
        // NaN invalida las comparaciones de distancia y permitiría resucitar fuera del radio.
        if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return false;
        const r = this.def.resurrectors.find((x) => x.id === id);
        if (!this.active || !r || Math.hypot(r.x - pos.x, r.y - pos.y) > this.def.resurrectRadius) return false;
        this.active = false;
        return true;
    }
    resurrectByAlly(): boolean {
        if (!this.active) return false;
        this.active = false;
        return true;
    }
    toSave(): SpectralSaveData {
        const s: SpectralSaveData = { active: this.active, deaths: this.deaths };
        if (this.lastDungeonFloor !== null) s.lastDungeonFloor = this.lastDungeonFloor;
        return s;
    }
}
import { Reader } from '../data/validate';
