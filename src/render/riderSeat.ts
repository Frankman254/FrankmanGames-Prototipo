// CLA-MON1 (creador, 2026-11-22: los jinetes parecen flotar sobre la montura).
// Medido en Electron (work/claude-mon1/): con el anclaje `rider_root` de las aves y la fracción
// `seatDrop`, el jinete quedaba de 23 a 42 cm por encima del lomo; en mula, tapir y caballo se
// hundía de 5 a 8 cm. En vez de afinar cifras a mano por montura, se mide una vez con dos rayos
// (lomo bajo la cadera y parte de abajo del jinete) y se corrige la altura del jinete.
// Cuando OMP-PJ-03 traiga el anclaje `Asiento` con `pose_jinete`, la medida seguirá valiendo.

/** Cuánto se hunde el jinete en la silla o el plumaje para que no parezca posado encima (m). */
export const SEAT_SINK = 0.03;
/** Fotogramas de espera tras montar, para que la postura de jinete ya esté puesta. */
export const SEAT_SETTLE_FRAMES = 12;
/** Corrección máxima, por si un rayo da en un ala o en la cabeza de la montura. */
const MAX_UP = 0.3;
const MAX_DOWN = 0.8;

/** Lo que hay que subir (positivo) o bajar al jinete para que su parte de abajo quede en el lomo. */
export function seatCorrection(back: number, riderBottom: number, sink = SEAT_SINK): number {
    return Math.min(MAX_UP, Math.max(-MAX_DOWN, back - sink - riderBottom));
}

/** Corrección por montura y modelo de jinete, medida una sola vez y guardada. */
export class RiderSeat {
    private key = '';
    private frames = 0;
    private done = false;
    private dy = 0;

    /** `key` cambia al cambiar de montura o de modelo de jinete; `measure` mide con la corrección actual puesta. */
    update(key: string, measure: () => { back: number; riderBottom: number } | null): number {
        if (key !== this.key) {
            this.key = key;
            this.frames = 0;
            this.done = false;
            this.dy = 0;
        }
        if (!this.done && ++this.frames >= SEAT_SETTLE_FRAMES) {
            const m = measure();
            if (m) {
                this.dy = seatCorrection(m.back, m.riderBottom - this.dy);
                this.done = true;
            }
        }
        return this.dy;
    }

    get settled(): boolean {
        return this.done;
    }
}
