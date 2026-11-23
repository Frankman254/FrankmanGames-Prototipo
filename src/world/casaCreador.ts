// CLA-CASA2 (creador, 2026-11-23): «no me deja entrar en la casa a ver los interiores, la casa tiene
// 3 cuartos y 2 baños [...] debes hacer otra version aplicandole mirror».
// La casa del creador sale de una sola planta (data/casa_creador_planta.json): el modelo de Blender
// (scripts/blender/casa_creador.py) y lo que aquí se calcula para caminarla por dentro.
// Planta: x de 0 a `ancho` mirando la fachada; d de 0 (fondo) a `fondo` (fachada). El espejo cambia
// x por ancho − x. Sala interior: x = x' + margen, z = fondo − d + margen (la fachada queda en z baja,
// del lado de la salida, como en las otras casas).
import plantaJson from '../../data/casa_creador_planta.json';
import type { RectObstacle } from '../sim/navGrid';
import type { Vec2 } from '../sim/vec2';

interface Hueco {
    tipo: string;
    desde: number;
    hasta: number;
}
interface Muro {
    id: string;
    x0: number;
    x1: number;
    d0: number;
    d1: number;
    huecos: Hueco[];
}
interface Ambiente {
    id: string;
    nombre: string;
    x0: number;
    x1: number;
    d0: number;
    d1: number;
}
interface Mueble {
    id: string;
    x: number;
    d: number;
    w: number;
    p: number;
    tipo: string;
    pisable?: boolean;
}
export interface PlantaCasa {
    ancho: number;
    fondo: number;
    huecos: Record<string, { alfeizar: number; alto: number; puerta?: boolean }>;
    muros: Muro[];
    ambientes: Ambiente[];
    columna: { x: number; d: number; r: number };
    tanqueGas: { x: number; d: number };
    muebles: Mueble[];
}

export const PLANTA: PlantaCasa = plantaJson as PlantaCasa;

/** Césped alrededor de la casa en la sala interior (igual que MARGEN en el script de Blender). */
export const CASA_MARGIN = 1.6;
/** Rejilla fina para pasar por puertas de 0,70 m (la del mundo es de 0,5 m con 0,5 de holgura). */
export const CASA_CELL = 0.25;
export const CASA_NAV_RADIUS = 0.2;

export const CASA_MODELS = ['casa_creador', 'casa_creador_espejo'] as const;
export type CasaModel = (typeof CASA_MODELS)[number];

export function isCasaCreador(model: string | undefined): model is CasaModel {
    return model === 'casa_creador' || model === 'casa_creador_espejo';
}

export function casaRoomSize(planta: PlantaCasa = PLANTA): { width: number; depth: number } {
    return { width: planta.ancho + 2 * CASA_MARGIN, depth: planta.fondo + 2 * CASA_MARGIN };
}

/** De la planta a la sala interior (x, z). */
export function casaToRoom(px: number, d: number, espejo: boolean, planta: PlantaCasa = PLANTA): Vec2 {
    const x = espejo ? planta.ancho - px : px;
    return { x: x + CASA_MARGIN, y: planta.fondo - d + CASA_MARGIN };
}

function rect(x0: number, x1: number, d0: number, d1: number, espejo: boolean, planta: PlantaCasa): RectObstacle {
    const a = casaToRoom(x0, d0, espejo, planta);
    const b = casaToRoom(x1, d1, espejo, planta);
    return {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        w: Math.abs(b.x - a.x),
        d: Math.abs(b.y - a.y),
    };
}

/** Puerta principal (P1): el hueco de la fachada de la sala. */
export function puertaPrincipal(planta: PlantaCasa = PLANTA): { muro: Muro; hueco: Hueco } {
    for (const muro of planta.muros)
        for (const hueco of muro.huecos) if (hueco.tipo === 'P1') return { muro, hueco };
    throw new Error('casa_creador_planta.json: falta la puerta P1');
}

/**
 * Lo que bloquea el paso dentro: los muros (las ventanas también; las puertas no) y los muebles que
 * no se pisan. La mesa del comedor se ensancha con sus sillas.
 */
export function casaRoomSolids(espejo: boolean, planta: PlantaCasa = PLANTA): RectObstacle[] {
    const out: RectObstacle[] = [];
    for (const m of planta.muros) {
        const porD = m.d1 - m.d0 > m.x1 - m.x0;
        const u0 = porD ? m.d0 : m.x0;
        const u1 = porD ? m.d1 : m.x1;
        const puertas = m.huecos
            .filter((h) => planta.huecos[h.tipo]?.puerta)
            .map((h) => [h.desde, h.hasta] as const)
            .sort((a, b) => a[0] - b[0]);
        let cur = u0;
        for (const [a, b] of [...puertas, [u1, u1] as const]) {
            if (a > cur) out.push(porD ? rect(m.x0, m.x1, cur, a, espejo, planta) : rect(cur, a, m.d0, m.d1, espejo, planta));
            cur = Math.max(cur, b);
        }
    }
    for (const f of planta.muebles) {
        if (f.pisable) continue;
        const extra = f.tipo === 'mesa' ? 0.45 : 0;
        out.push(rect(f.x - f.w / 2, f.x + f.w / 2, f.d - f.p / 2 - extra, f.d + f.p / 2 + extra, espejo, planta));
    }
    const c = planta.columna;
    out.push(rect(c.x - c.r, c.x + c.r, c.d - c.r, c.d + c.r, espejo, planta));
    const g = planta.tanqueGas;
    out.push(rect(g.x - 0.2, g.x + 0.2, g.d - 0.2, g.d + 0.2, espejo, planta));
    return out;
}

/** Dónde aparece al entrar: en la sala, a un paso de la puerta principal. */
export function casaRoomStart(espejo: boolean, planta: PlantaCasa = PLANTA): Vec2 {
    const { muro, hueco } = puertaPrincipal(planta);
    return casaToRoom((hueco.desde + hueco.hasta) / 2, muro.d0 - 0.75, espejo, planta);
}

/** Salida: en la acera de enfrente del portal; `pos` es donde hay que llegar para salir. */
export function casaRoomExit(espejo: boolean, planta: PlantaCasa = PLANTA): { mesh: Vec2; pos: Vec2 } {
    const { hueco } = puertaPrincipal(planta);
    const cx = (hueco.desde + hueco.hasta) / 2;
    return {
        mesh: casaToRoom(cx, planta.fondo + CASA_MARGIN - 0.25, espejo, planta),
        pos: casaToRoom(cx, planta.fondo + 0.4, espejo, planta),
    };
}

export interface CasaProp {
    model?: string;
    x: number;
    y: number;
    rotDeg: number;
}

/**
 * Puerta principal en el mundo. El modelo tiene su centro en el centro de la planta y la fachada hacia
 * −Z cuando rotDeg = 0 (0 = −Z, 90 = −X, como las puertas de las casas).
 */
export function casaCreadorDoor(
    p: CasaProp,
    planta: PlantaCasa = PLANTA,
): { door: Vec2; outside: Vec2; rotDeg: number; espejo: boolean } {
    const espejo = p.model === 'casa_creador_espejo';
    const { muro, hueco } = puertaPrincipal(planta);
    const cx = (hueco.desde + hueco.hasta) / 2;
    const lateral = (espejo ? planta.ancho - cx : cx) - planta.ancho / 2;
    const a = (p.rotDeg * Math.PI) / 180;
    const f = { x: -Math.sin(a), y: -Math.cos(a) };
    // x de la planta crece hacia la derecha de quien mira la fachada desde la calle.
    const r = { x: Math.cos(a), y: -Math.sin(a) };
    const at = (fwd: number): Vec2 => ({ x: p.x + f.x * fwd + r.x * lateral, y: p.y + f.y * fwd + r.y * lateral });
    const half = planta.fondo / 2;
    return {
        door: at(muro.d1 - half),
        outside: at(half + 0.8),
        rotDeg: p.rotDeg,
        espejo,
    };
}

/** Ambiente que contiene un punto de la sala interior, o null. */
export function casaAmbienteAt(pos: Vec2, espejo: boolean, planta: PlantaCasa = PLANTA): string | null {
    for (const a of planta.ambientes) {
        const r = rect(a.x0, a.x1, a.d0, a.d1, espejo, planta);
        if (Math.abs(pos.x - r.x) <= r.w / 2 && Math.abs(pos.y - r.y) <= r.d / 2) return a.id;
    }
    return null;
}
