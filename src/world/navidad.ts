// NAV-03 (creador, 2026-11-27: «me gustaria armar un mapa estilo navidad […]»; «el mapa de navidad
// recuerda ponerle una piedra de teletransporte»). Mapa aparte como la barriada (docs/COMO_CREAR.md §3.2):
// se llega por la Piedra Pintada `navidad` de Villa Raspadura y se sale por la piedra de su plaza.
// Puro: lo usan la escena, el dibujo y las pruebas. Todo lo que devuelve está en metros del mundo
// (zona + `origen`). Las piezas son nodos de assets/models/navidad.glb (NAV-02).
import navidadJson from '../../data/navidad.json';
import type { RectObstacle } from '../sim/navGrid';
import type { Vec2 } from '../sim/vec2';

/** Piedra Pintada del mapa del mundo que lleva al mapa de Navidad (data/stones.json). */
export const NAVIDAD_STONE = 'navidad';

interface Sitio {
    x: number;
    y: number;
    rotDeg?: number;
    modelo?: string;
}

export interface NavidadDef {
    nombre: string;
    origen: Vec2;
    ancho: number;
    fondo: number;
    nieve: { activa: boolean; densidad: number };
    plaza: { x: number; y: number; radio: number };
    arbol: Sitio & { modelo: string };
    regalos: Array<Sitio & { modelo: string }>;
    nacimiento: Sitio & { modelo: string };
    paseo: { x: number; y0: number; y1: number; ancho: number };
    piedra: Vec2;
    inicio: Vec2;
    casitas: Array<Sitio & { id: string; modelo: string; rotDeg: number }>;
    faroles: Vec2[];
    munecos: Array<Sitio & { modelo: string }>;
    bancas: Array<Sitio & { modelo: string }>;
}

export const NAVIDAD: NavidadDef = navidadJson as unknown as NavidadDef;

/** Una pieza colocada: `modelo` es un nodo de navidad.glb; rotDeg 0 = fachada a −y. */
export interface NavidadPieza {
    modelo: string;
    x: number;
    y: number;
    rotDeg: number;
}

/** Guirnalda tendida de un farol a otro (el nodo mide 6 m a lo largo de su eje). */
export interface NavidadGuirnalda {
    desde: Vec2;
    hasta: Vec2;
}

/** Huella en planta de cada nodo, para los obstáculos (ancho en x, fondo en y, sin girar). */
const HUELLA: Record<string, { w: number; d: number }> = {
    arbol_navidad: { w: 5.6, d: 5.6 },
    nacimiento: { w: 8.4, d: 5 },
    casita_nevada_a: { w: 7.2, d: 5.6 },
    casita_nevada_b: { w: 7.2, d: 5.6 },
    casita_nevada_c: { w: 7.2, d: 5.6 },
    farol_navidad: { w: 0.4, d: 0.4 },
    muneco_nieve: { w: 1.3, d: 1.3 },
    banca_nevada: { w: 1.8, d: 0.7 },
};

const LARGO_GUIRNALDA = 6;

/** Rectángulo de la zona en el mundo. */
export function navidadBounds(def: NavidadDef = NAVIDAD): { x0: number; y0: number; x1: number; y1: number } {
    return { x0: def.origen.x, y0: def.origen.y, x1: def.origen.x + def.ancho, y1: def.origen.y + def.fondo };
}

const mundo = (def: NavidadDef, p: Vec2): Vec2 => ({ x: def.origen.x + p.x, y: def.origen.y + p.y });

/** Piedra de la plaza: se vuelve por ella. */
export function navidadPiedra(def: NavidadDef = NAVIDAD): Vec2 {
    return mundo(def, def.piedra);
}

/** Donde aparece el jugador al llegar. */
export function navidadInicio(def: NavidadDef = NAVIDAD): Vec2 {
    return mundo(def, def.inicio);
}

/** Faroles del anillo de la plaza y del paseo, en el mundo. */
export function navidadFaroles(def: NavidadDef = NAVIDAD): Vec2[] {
    return def.faroles.map((f) => mundo(def, f));
}

/** Todas las piezas fijas del mapa, salvo guirnaldas. */
export function navidadPiezas(def: NavidadDef = NAVIDAD): NavidadPieza[] {
    const pieza = (s: Sitio, modelo: string): NavidadPieza => ({ modelo, ...mundo(def, s), rotDeg: s.rotDeg ?? 0 });
    return [
        pieza(def.arbol, def.arbol.modelo),
        ...def.regalos.map((r) => pieza(r, r.modelo)),
        pieza(def.nacimiento, def.nacimiento.modelo),
        ...def.casitas.map((c) => pieza(c, c.modelo)),
        ...def.faroles.map((f) => pieza(f, 'farol_navidad')),
        ...def.munecos.map((m) => pieza(m, m.modelo)),
        ...def.bancas.map((b) => pieza(b, b.modelo)),
    ];
}

/** Faroles del anillo: los que quedan dentro de la plaza (los del paseo caen fuera). */
function anillo(def: NavidadDef): Vec2[] {
    const { x, y, radio } = def.plaza;
    return def.faroles
        .filter((f) => Math.hypot(f.x - x, f.y - y) <= radio)
        .sort((a, b) => Math.atan2(a.y - y, a.x - x) - Math.atan2(b.y - y, b.x - x));
}

/** Guirnaldas entre faroles vecinos del anillo de la plaza («entre faroles vecinos del anillo»). */
export function navidadGuirnaldas(def: NavidadDef = NAVIDAD): NavidadGuirnalda[] {
    const ring = anillo(def);
    if (ring.length < 2) return [];
    return ring.map((f, i) => ({ desde: mundo(def, f), hasta: mundo(def, ring[(i + 1) % ring.length]!) }));
}

/** Escala a lo largo de la guirnalda para que llegue de un farol al otro. */
export function guirnaldaEscala(g: NavidadGuirnalda): number {
    return Math.hypot(g.hasta.x - g.desde.x, g.hasta.y - g.desde.y) / LARGO_GUIRNALDA;
}

/** Obstáculos: cada pieza con su huella, girada a 0/90° (rejilla alineada a ejes). Regalos y guirnaldas no. */
export function navidadSolids(def: NavidadDef = NAVIDAD): RectObstacle[] {
    const out: RectObstacle[] = [];
    for (const p of navidadPiezas(def)) {
        const h = HUELLA[p.modelo];
        if (!h) continue;
        // Se toma la caja que envuelve la huella girada: una casita a 55° ocupa su diagonal.
        const a = (p.rotDeg * Math.PI) / 180;
        const c = Math.abs(Math.cos(a));
        const s = Math.abs(Math.sin(a));
        const w = h.w * c + h.d * s;
        const d = h.w * s + h.d * c;
        // Las casitas giradas no llenan su caja: se recorta para no cerrar los pasos entre ellas.
        const k = p.modelo.startsWith('casita') && s > 0.2 && c > 0.2 ? 0.8 : 1;
        out.push({ x: p.x, y: p.y, w: w * k, d: d * k });
    }
    return out;
}
