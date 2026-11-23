// CLA-CASA2 (creador, 2026-11-23): «no veo planificacion vial que pedi [...] no tiene calle, los
// arboles invaden la propiedad». Calle con cordón, grama y acera, y lotes despejados con las casas
// del creador (data/urbanizacion.json). Puro: lo usan la vegetación, el dibujo de la calle y las pruebas.
import urbanizacionJson from '../../data/urbanizacion.json';
import { PLANTA, casaCreadorDoor } from './casaCreador';

export interface Calle {
    id: string;
    x0: number;
    x1: number;
    y: number;
    calzada: number;
    cordon: number;
    grama: number;
    acera: number;
}

export interface Lote {
    id: string;
    x0: number;
    y0: number;
    ancho: number;
    fondo: number;
    retiro: number;
    modelo: string;
}

export interface Urbanizacion {
    calles: Calle[];
    lotes: Lote[];
}

export const URBANIZACION: Urbanizacion = urbanizacionJson as Urbanizacion;

/** Ancho total de una calle, de acera a acera. */
export function calleAncho(c: Calle): number {
    return c.calzada + 2 * (c.cordon + c.grama + c.acera);
}

/** ¿Cae el punto dentro de un lote? Ahí no nace vegetación. */
export function insideLot(x: number, y: number, u: Urbanizacion = URBANIZACION, margin = 0): boolean {
    return u.lotes.some(
        (l) => x >= l.x0 - margin && x <= l.x0 + l.ancho + margin && y >= l.y0 - margin && y <= l.y0 + l.fondo + margin,
    );
}

/** ¿Cae el punto en una calle (con sus aceras)? */
export function insideStreet(x: number, y: number, u: Urbanizacion = URBANIZACION, margin = 0): boolean {
    return u.calles.some(
        (c) => x >= c.x0 - margin && x <= c.x1 + margin && Math.abs(y - c.y) <= calleAncho(c) / 2 + margin,
    );
}

/** Centro de la casa del lote (rotDeg 0: fachada hacia la calle, en −y). */
export function loteCasa(l: Lote): { model: string; x: number; y: number; rotDeg: number; w: number; d: number } {
    return {
        model: l.modelo,
        x: l.x0 + l.ancho / 2,
        y: l.y0 + l.retiro + PLANTA.fondo / 2,
        rotDeg: 0,
        w: PLANTA.ancho,
        d: PLANTA.fondo,
    };
}

export type Pieza = 'asfalto' | 'raya' | 'cordon' | 'grama' | 'acera' | 'concreto';

/** Losa a ras del suelo: rectángulo en el mundo y cuánto sobresale. */
export interface Losa {
    pieza: Pieza;
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    alto: number;
}

/** Calzada con raya discontinua, cordones, grama y acera a los dos lados; andenes y entradas de los lotes. */
export function losas(u: Urbanizacion = URBANIZACION): Losa[] {
    const out: Losa[] = [];
    for (const c of u.calles) {
        const h = c.calzada / 2;
        out.push({ pieza: 'asfalto', x0: c.x0, x1: c.x1, y0: c.y - h, y1: c.y + h, alto: 0.04 });
        for (let x = c.x0 + 1; x + 2 <= c.x1 - 1; x += 4)
            out.push({ pieza: 'raya', x0: x, x1: x + 2, y0: c.y - 0.06, y1: c.y + 0.06, alto: 0.05 });
        for (const s of [-1, 1]) {
            const band = (a: number, b: number, pieza: Pieza, alto: number): void => {
                const ya = c.y + s * a;
                const yb = c.y + s * b;
                out.push({ pieza, x0: c.x0, x1: c.x1, y0: Math.min(ya, yb), y1: Math.max(ya, yb), alto });
            };
            band(h, h + c.cordon, 'cordon', 0.14);
            band(h + c.cordon, h + c.cordon + c.grama, 'grama', 0.06);
            band(h + c.cordon + c.grama, h + c.cordon + c.grama + c.acera, 'acera', 0.1);
        }
    }
    for (const l of u.lotes) {
        const casa = loteCasa(l);
        const espejo = l.modelo === 'casa_creador_espejo';
        const door = casaCreadorDoor(casa).door;
        const frente = casa.y - PLANTA.fondo / 2;
        // Andén de la acera al portal, frente a la puerta de reja.
        out.push({ pieza: 'concreto', x0: door.x - 0.6, x1: door.x + 0.6, y0: l.y0, y1: frente - 0.3, alto: 0.06 });
        // Entrada de auto de dos huellas, frente a la recámara de la fachada.
        for (const [a, b] of [
            [0.5, 1.1],
            [1.9, 2.5],
        ] as const) {
            const xa = espejo ? PLANTA.ancho - b : a;
            const xb = espejo ? PLANTA.ancho - a : b;
            out.push({
                pieza: 'concreto',
                x0: casa.x - PLANTA.ancho / 2 + xa,
                x1: casa.x - PLANTA.ancho / 2 + xb,
                y0: l.y0 - (calleAncho(u.calles[0]!) / 2 - u.calles[0]!.calzada / 2) + 0.15,
                y1: frente - 0.3,
                // Sobre la acera: la huella cruza la acera hasta el cordón.
                alto: 0.11,
            });
        }
    }
    return out;
}
