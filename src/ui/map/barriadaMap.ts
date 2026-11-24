// JL-217: Minimapa de la barriada Praderas del Norte.
// Dibuja calles y casas desde los datos puros de barriada.ts.
// Se importa desde minimap.ts cuando el jugador está en la barriada.
import {
    BARRIADA,
    barriadaCasas,
    barriadaLosas,
    barriadaPiedra,
    barriadaInicio,
} from '../../world/barriada';

/** Colores del minimapa de la barriada. */
const BAR_COLORS = {
    /** Fondo (grama). */
    grass: '#6b8a4e',
    /** Calzada asfaltada. */
    road: '#5a5a5a',
    /** Raya central. */
    line: '#c8c840',
    /** Cordón. */
    curb: '#8a8a7a',
    /** Acera. */
    sidewalk: '#9a9a8a',
    /** Grama entre acera y calzada. */
    strip: '#7a9a5e',
    /** Casa. */
    house: '#b09070',
    /** Tejado. */
    roof: '#8a4a3a',
    /** Plaza. */
    plaza: '#a09080',
    /** Andén. */
    apron: '#8a8a7a',
    /** Entrada de auto. */
    driveway: '#7a7a6a',
    /** Piedra de vuelta. */
    stone: '#f5b83d',
};

/**
 * Dibuja el minimapa de la barriada en el canvas dado.
 * @param ctx Contexto 2D del canvas
 * @param px Ancho del canvas en píxeles
 * @param py Alto del canvas en píxeles
 * @param playerPos Posición del jugador en metros del mundo (zona de la barriada)
 * @param ppm Píxeles del lienzo por metro (escala del minimapa)
 * @param yaw Giro de la cámara en radianes (0 = norte fijo)
 */
export function drawBarriadaMinimap(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    playerPos: { x: number; y: number },
    ppm: number,
    yaw: number,
): void {
    const def = BARRIADA;
    const ox = def.origen.x;
    const oy = def.origen.y;

    // Fondo: grama.
    ctx.fillStyle = BAR_COLORS.grass;
    ctx.fillRect(0, 0, px, py);

    ctx.save();
    ctx.translate(px / 2, py / 2);
    ctx.rotate(-yaw);
    ctx.scale(ppm, -ppm);
    ctx.translate(-playerPos.x, -playerPos.y);
    ctx.imageSmoothingEnabled = false;

    // Calzadas y áreas pavimentadas (las coordenadas ya incluyen el origen).
    const losas = barriadaLosas(def);
    for (const losa of losas) {
        ctx.fillStyle = piezaColor(losa.pieza);
        ctx.fillRect(losa.x0, losa.y0, losa.x1 - losa.x0, losa.y1 - losa.y0);
    }

    // Casas como rectángulos con tejado.
    const casas = barriadaCasas(def);
    for (const casa of casas) {
        const cx = casa.x + ox;
        const cy = casa.y + oy;
        const w = 6; // ancho aproximado de la planta
        const d = 5; // fondo aproximado
        ctx.fillStyle = BAR_COLORS.house;
        ctx.fillRect(cx - w / 2, cy - d / 2, w, d);
        // Tejado como borde más oscuro.
        ctx.strokeStyle = BAR_COLORS.roof;
        ctx.lineWidth = 0.3;
        ctx.strokeRect(cx - w / 2, cy - d / 2, w, d);
    }

    ctx.restore();
}

/** Color de una pieza de losa según su tipo. */
function piezaColor(pieza: string): string {
    switch (pieza) {
        case 'asfalto':
            return BAR_COLORS.road;
        case 'raya':
            return BAR_COLORS.line;
        case 'cordon':
            return BAR_COLORS.curb;
        case 'grama':
            return BAR_COLORS.strip;
        case 'acera':
            return BAR_COLORS.sidewalk;
        case 'concreto':
            return BAR_COLORS.plaza;
        default:
            return BAR_COLORS.road;
    }
}

/** Posición de la piedra de vuelta en metros del mundo (ya incluye el origen). */
export function barriadaStoneWorldPos(): { x: number; y: number } {
    return barriadaPiedra();
}

/** Posición de la entrada en metros del mundo (ya incluye el origen). */
export function barriadaStartWorldPos(): { x: number; y: number } {
    return barriadaInicio();
}

/** Extensión de la barriada en metros del mundo. */
export function barriadaWorldBounds() {
    const o = BARRIADA.origen;
    return { x0: o.x, y0: o.y, x1: o.x + BARRIADA.ancho, y1: o.y + BARRIADA.fondo };
}
