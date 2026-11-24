// CLA-BARR1 (creador, 2026-11-23): «modelar las calles y copiar y pegar las casas en sus calles aunque
// hay distintos modelos y variantes para que todas no sean iguales [...] Praderas del norte».
// Zona aparte a escala 1:1 (data/barriada.json): calles paralelas con dos filas de lotes, una
// transversal y una plaza con la piedra de vuelta. Puro: lo usan la escena, el dibujo y las pruebas.
// Todo lo que devuelve está en metros del mundo (zona + `origen`).
import barriadaJson from '../../data/barriada.json';
import type { RectObstacle } from '../sim/navGrid';
import type { Vec2 } from '../sim/vec2';
import { PLANTA, casaCreadorDoor, type CasaModel } from './casaCreador';
import type { Losa, Pieza } from './urbanizacion';

type RGB = [number, number, number];

export interface BarriadaDef {
    origen: Vec2;
    ancho: number;
    fondo: number;
    calle: { calzada: number; cordon: number; grama: number; acera: number };
    lote: { ancho: number; fondo: number; retiro: number };
    calles: Array<{ id: string; y: number; tramos: Array<[number, number]> }>;
    transversales: Array<{ id: string; x: number; y0: number; y1: number }>;
    plaza: { x: number; y: number; piedra: Vec2; inicio: Vec2 };
    variantes: { pared: RGB[]; zocalo: RGB[]; reja: RGB[] };
}

export const BARRIADA: BarriadaDef = barriadaJson as unknown as BarriadaDef;

/** Lote con su casa. `lado` +1: el lote queda en +y de la calle (fachada a −y); −1 al revés. */
export interface BarriadaLote {
    id: string;
    x0: number;
    y0: number;
    ancho: number;
    fondo: number;
    lado: 1 | -1;
    calle: string;
}

export interface BarriadaCasa {
    lote: string;
    model: CasaModel;
    x: number;
    y: number;
    /** 0 = fachada a −Z (−y), 180 = a +Z. */
    rotDeg: number;
    pared: RGB;
    zocalo: RGB;
    reja: RGB;
}

/** De acera a acera. */
export function barriadaCalleAncho(def: BarriadaDef = BARRIADA): number {
    const c = def.calle;
    return c.calzada + 2 * (c.cordon + c.grama + c.acera);
}

/** Rectángulo de la zona en el mundo. */
export function barriadaBounds(def: BarriadaDef = BARRIADA): { x0: number; y0: number; x1: number; y1: number } {
    return { x0: def.origen.x, y0: def.origen.y, x1: def.origen.x + def.ancho, y1: def.origen.y + def.fondo };
}

/** Lotes a los dos lados de cada tramo, centrados en el tramo. */
export function barriadaLotes(def: BarriadaDef = BARRIADA): BarriadaLote[] {
    const half = barriadaCalleAncho(def) / 2;
    const { ancho, fondo } = def.lote;
    const out: BarriadaLote[] = [];
    for (const c of def.calles)
        c.tramos.forEach(([a, b], t) => {
            const n = Math.floor((b - a) / ancho);
            const start = a + (b - a - n * ancho) / 2;
            for (let i = 0; i < n; i++)
                for (const lado of [1, -1] as const) {
                    const x0 = def.origen.x + start + i * ancho;
                    const y0 = def.origen.y + (lado === 1 ? c.y + half : c.y - half - fondo);
                    out.push({
                        id: `${c.id}_${t}_${lado === 1 ? 'n' : 's'}${i + 1}`,
                        x0,
                        y0,
                        ancho,
                        fondo,
                        lado,
                        calle: c.id,
                    });
                }
        });
    return out;
}

/** Número fijo y bien repartido por lote (sin Math.random: la barriada es igual cada vez). */
function hash(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** La casa de cada lote: base y espejo alternos, como las pareadas, y colores fijos por lote. */
export function barriadaCasas(def: BarriadaDef = BARRIADA): BarriadaCasa[] {
    const v = def.variantes;
    return barriadaLotes(def).map((l, i) => {
        const h = hash(l.id);
        const frente = l.lado === 1 ? l.y0 : l.y0 + l.fondo;
        return {
            lote: l.id,
            // Mirando desde la calle, una casa sí y otra no lleva la planta espejada.
            model: (Math.floor(i / 2) + (l.lado === 1 ? 0 : 1)) % 2 === 0 ? 'casa_creador' : 'casa_creador_espejo',
            x: l.x0 + l.ancho / 2,
            y: frente + l.lado * (def.lote.retiro + PLANTA.fondo / 2),
            rotDeg: l.lado === 1 ? 0 : 180,
            pared: v.pared[h % v.pared.length]!,
            zocalo: v.zocalo[(h >>> 8) % v.zocalo.length]!,
            reja: v.reja[(h >>> 16) % v.reja.length]!,
        };
    });
}

/** Lo que no se pisa: cada casa entera (no se entra a las de la barriada), postes y troncos. */
export function barriadaSolids(def: BarriadaDef = BARRIADA): RectObstacle[] {
    return [
        ...barriadaCasas(def).map((c) => ({ x: c.x, y: c.y, w: PLANTA.ancho, d: PLANTA.fondo })),
        ...barriadaFarolas(def).map((f) => ({ x: f.x, y: f.y, w: 0.3, d: 0.3 })),
        ...barriadaArboles(def).map((a) => ({ x: a.x, y: a.y, w: 0.4 * a.escala, d: 0.4 * a.escala })),
    ];
}

/** Farola en la franja de grama. `haciaY`: hacia dónde cuelga el farol (el centro de la calle). */
export interface BarriadaFarola {
    x: number;
    y: number;
    haciaY: 1 | -1;
}

/** Árbol: `especie` es un tipo de `data/vegetation.json`. */
export interface BarriadaArbol {
    x: number;
    y: number;
    especie: string;
    escala: number;
    rotDeg: number;
}

/** Centro de la franja de grama de una calle, a un lado (+1: hacia +y). */
function franja(def: BarriadaDef, calleY: number, lado: 1 | -1): number {
    const c = def.calle;
    return def.origen.y + calleY + lado * (c.calzada / 2 + c.cordon + c.grama / 2);
}

/**
 * CLA-BARR2: una farola cada tres lotes, alternando la acera, en la linde entre dos lotes. Ahí no
 * hay andén ni entrada de auto: las dos caen dentro del ancho de la casa.
 */
export function barriadaFarolas(def: BarriadaDef = BARRIADA): BarriadaFarola[] {
    const out: BarriadaFarola[] = [];
    const { ancho } = def.lote;
    for (const c of def.calles)
        for (const [a, b] of c.tramos) {
            const n = Math.floor((b - a) / ancho);
            const start = a + (b - a - n * ancho) / 2;
            for (let i = 1, k = 0; i < n; i += 3, k++) {
                const lado: 1 | -1 = k % 2 === 0 ? 1 : -1;
                out.push({ x: def.origen.x + start + i * ancho, y: franja(def, c.y, lado), haciaY: lado === 1 ? -1 : 1 });
            }
        }
    return out;
}

/** Especies de calle y de parque: las de un barrio de Panamá. */
const ESPECIES_CALLE = ['roble', 'guayacan', 'indio_desnudo'] as const;
const ESPECIES_PARQUE = ['roble', 'guayacan', 'palma', 'indio_desnudo', 'arbol_panama', 'corotu'] as const;

/**
 * CLA-BARR2: árboles en la franja de grama (en lindes de lote sin farola, uno de cada tres) y en los
 * terrenos que no son lote, calle ni plaza (los extremos de cada calle y los bordes de la zona).
 */
export function barriadaArboles(def: BarriadaDef = BARRIADA): BarriadaArbol[] {
    const out: BarriadaArbol[] = [];
    const pick = <T>(list: readonly T[], h: number): T => list[h % list.length]!;
    const { ancho } = def.lote;
    for (const c of def.calles)
        c.tramos.forEach(([a, b], t) => {
            const n = Math.floor((b - a) / ancho);
            const start = a + (b - a - n * ancho) / 2;
            for (let i = 1; i < n; i++) {
                if ((i - 1) % 3 === 0) continue; // ahí va la farola
                for (const lado of [1, -1] as const) {
                    const h = hash(`${c.id}_${t}_${i}_${lado}`);
                    if (h % 3 !== 0) continue;
                    out.push({
                        x: def.origen.x + start + i * ancho,
                        y: franja(def, c.y, lado),
                        especie: pick(ESPECIES_CALLE, h >>> 4),
                        escala: 0.7 + ((h >>> 12) % 100) / 400,
                        rotDeg: (h >>> 20) % 360,
                    });
                }
            }
        });
    // Parques: rejilla de 9 m con un poco de desorden fijo, fuera de lotes, calles y plaza.
    const b = barriadaBounds(def);
    const lotes = barriadaLotes(def);
    const losas = barriadaLosas(def);
    const plaza = { x: def.origen.x + def.plaza.x, y: def.origen.y + def.plaza.y };
    const libre = (x: number, y: number): boolean =>
        x > b.x0 + 4 &&
        x < b.x1 - 4 &&
        y > b.y0 + 4 &&
        y < b.y1 - 4 &&
        !lotes.some((l) => x > l.x0 - 2 && x < l.x0 + l.ancho + 2 && y > l.y0 - 2 && y < l.y0 + l.fondo + 2) &&
        !losas.some((l) => x > l.x0 - 3 && x < l.x1 + 3 && y > l.y0 - 3 && y < l.y1 + 3) &&
        Math.abs(x - plaza.x) > 16 &&
        Math.abs(y - plaza.y) > 12;
    for (let gx = b.x0 + 6; gx < b.x1; gx += 9)
        for (let gy = b.y0 + 6; gy < b.y1; gy += 9) {
            const h = hash(`parque_${gx}_${gy}`);
            if (h % 5 === 0) continue; // claros
            const x = gx + ((h >>> 3) % 50) / 10 - 2.5;
            const y = gy + ((h >>> 9) % 50) / 10 - 2.5;
            if (!libre(x, y)) continue;
            out.push({
                x,
                y,
                especie: pick(ESPECIES_PARQUE, h >>> 15),
                escala: 0.8 + ((h >>> 21) % 100) / 200,
                rotDeg: (h >>> 7) % 360,
            });
        }
    return out;
}

/** Dónde aparece el personaje y dónde está la piedra de vuelta. */
export function barriadaInicio(def: BarriadaDef = BARRIADA): Vec2 {
    return { x: def.origen.x + def.plaza.inicio.x, y: def.origen.y + def.plaza.inicio.y };
}

export function barriadaPiedra(def: BarriadaDef = BARRIADA): Vec2 {
    return { x: def.origen.x + def.plaza.piedra.x, y: def.origen.y + def.plaza.piedra.y };
}

/** Calzadas con raya, cordón, grama y acera; transversal, plaza, andenes y entradas de auto. */
export function barriadaLosas(def: BarriadaDef = BARRIADA): Losa[] {
    const out: Losa[] = [];
    const ox = def.origen.x;
    const oy = def.origen.y;
    const c = def.calle;
    const h = c.calzada / 2;
    const half = barriadaCalleAncho(def) / 2;
    const bandas: Array<[number, number, Pieza, number]> = [
        [h, h + c.cordon, 'cordon', 0.14],
        [h + c.cordon, h + c.cordon + c.grama, 'grama', 0.06],
        [h + c.cordon + c.grama, half, 'acera', 0.1],
    ];
    /** Calle a lo largo de x (eje 'x') o de y (eje 'y'), de `a` a `b`, centrada en `m`. */
    const calle = (eje: 'x' | 'y', m: number, a: number, b: number, cortes: Array<[number, number]>): void => {
        const rect = (p: Pieza, u0: number, u1: number, v0: number, v1: number, alto: number): void => {
            if (u1 - u0 < 0.05) return;
            out.push(
                eje === 'x'
                    ? { pieza: p, x0: ox + u0, x1: ox + u1, y0: oy + m + v0, y1: oy + m + v1, alto }
                    : { pieza: p, x0: ox + m + v0, x1: ox + m + v1, y0: oy + u0, y1: oy + u1, alto },
            );
        };
        rect('asfalto', a, b, -h, h, 0.04);
        // Raya discontinua, sin pintar en los cruces.
        for (let u = a + 1; u + 2 <= b - 1; u += 4)
            if (!cortes.some(([k0, k1]) => u + 2 > k0 && u < k1)) rect('raya', u, u + 2, -0.06, 0.06, 0.05);
        // Cordón, grama y acera, partidos en los cruces.
        const libres: Array<[number, number]> = [];
        let u = a;
        for (const [k0, k1] of [...cortes].sort((p, q) => p[0] - q[0])) {
            if (k0 > u) libres.push([u, Math.min(k0, b)]);
            u = Math.max(u, k1);
        }
        if (u < b) libres.push([u, b]);
        for (const [u0, u1] of libres)
            for (const s of [-1, 1])
                for (const [v0, v1, p, alto] of bandas)
                    rect(p, u0, u1, Math.min(s * v0, s * v1), Math.max(s * v0, s * v1), alto);
    };
    const tv = def.transversales;
    for (const k of def.calles) {
        const a = Math.min(...k.tramos.map((t) => t[0]));
        const b = Math.max(...k.tramos.map((t) => t[1]));
        // El asfalto de la calle sigue hasta el borde de la transversal.
        calle(
            'x',
            k.y,
            a,
            b,
            tv.filter((t) => t.x > a && t.x < b).map((t) => [t.x - half, t.x + half]),
        );
    }
    for (const t of tv)
        calle(
            'y',
            t.x,
            t.y0,
            t.y1,
            def.calles.filter((k) => k.y > t.y0 && k.y < t.y1).map((k) => [k.y - half, k.y + half]),
        );
    // Plaza de concreto alrededor de la piedra, al final de la transversal.
    out.push({
        pieza: 'concreto',
        x0: ox + def.plaza.x - 12,
        x1: ox + def.plaza.x + 12,
        y0: oy + def.plaza.y - 8,
        y1: oy + def.plaza.y + 8,
        alto: 0.08,
    });
    // Andén de la acera al portal y entrada de auto de dos huellas, como en la urbanización.
    const lotes = barriadaLotes(def);
    barriadaCasas(def).forEach((casa, i) => {
        const l = lotes[i]!;
        const espejo = casa.model === 'casa_creador_espejo';
        const door = casaCreadorDoor(casa).door;
        const acera = l.lado === 1 ? l.y0 : l.y0 + l.fondo;
        const frente = casa.y - l.lado * (PLANTA.fondo / 2 + 0.3);
        const span = (y0: number, y1: number): [number, number] => [Math.min(y0, y1), Math.max(y0, y1)];
        const [a0, a1] = span(acera, frente);
        out.push({ pieza: 'concreto', x0: door.x - 0.6, x1: door.x + 0.6, y0: a0, y1: a1, alto: 0.06 });
        // Girada 180°, la derecha de quien mira la fachada es −x: el espejo cambia de lado.
        const izquierda = espejo !== (l.lado === -1);
        const cordon = acera - l.lado * (half - h - c.cordon);
        const [b0, b1] = span(cordon, frente);
        for (const [p, q] of [
            [0.5, 1.1],
            [1.9, 2.5],
        ] as const) {
            const xa = izquierda ? PLANTA.ancho - q : p;
            const xb = izquierda ? PLANTA.ancho - p : q;
            out.push({
                pieza: 'concreto',
                x0: casa.x - PLANTA.ancho / 2 + xa,
                x1: casa.x - PLANTA.ancho / 2 + xb,
                y0: b0,
                y1: b1,
                alto: 0.11,
            });
        }
    });
    return out;
}
