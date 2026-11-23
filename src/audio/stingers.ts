// Avisos musicales cortos (creador, 2026-11-22: «portada y avisos»): victoria, derrota y peligro.
// Composiciones propias de work/claude-aud-regiones/avisos.py. Suenan en el bus de música, una sola vez, y
// mientras duran la canción de fondo baja (ContextMusicPlayer.duck).
import type { AudioEngine } from './engine';

export type Stinger = 'victory' | 'defeat' | 'danger';

const STINGER_URL: Record<Stinger, string> = {
    victory: new URL('../../assets/audio/music/avisos/victoria.ogg?no-inline', import.meta.url).href,
    defeat: new URL('../../assets/audio/music/avisos/derrota.ogg?no-inline', import.meta.url).href,
    danger: new URL('../../assets/audio/music/avisos/peligro.ogg?no-inline', import.meta.url).href,
};

/** Segundos mínimos entre dos avisos iguales: el de peligro no debe repetirse en cada golpe. */
export const STINGER_COOLDOWN: Readonly<Record<Stinger, number>> = { victory: 4, defeat: 4, danger: 45 };

/** Fracción de vida por debajo de la cual, en pelea, suena el aviso de peligro. */
export const DANGER_HEALTH = 0.3;

/** El aviso de peligro suena al cruzar el umbral hacia abajo, en pelea y con vida. */
export function dangerCrossed(previous: number, current: number, fighting: boolean, alive: boolean): boolean {
    return fighting && alive && current > 0 && previous >= DANGER_HEALTH && current < DANGER_HEALTH;
}

export class StingerPlayer {
    private readonly buffers = new Map<Stinger, Promise<AudioBuffer | null>>();
    private readonly lastAt = new Map<Stinger, number>();
    /** Último aviso que empezó a sonar (para QA). */
    last: Stinger | null = null;
    played = 0;

    constructor(
        private readonly engine: AudioEngine,
        private readonly duck: (seconds: number) => void = () => {},
        private readonly fetchFn: typeof fetch = fetch.bind(globalThis),
    ) {}

    /** Carga los tres avisos por adelantado para que suenen en el instante del suceso. */
    preload(): void {
        for (const id of Object.keys(STINGER_URL) as Stinger[]) void this.buffer(id);
    }

    private buffer(id: Stinger): Promise<AudioBuffer | null> {
        let pending = this.buffers.get(id);
        if (!pending) {
            pending = this.fetchFn(STINGER_URL[id])
                .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
                .then((bytes) => this.engine.ctx.decodeAudioData(bytes))
                .catch((error: unknown) => {
                    console.warn(`[música] no se pudo cargar el aviso ${id}`, error);
                    return null;
                });
            this.buffers.set(id, pending);
        }
        return pending;
    }

    /** Devuelve false si el aviso está en enfriamiento. */
    play(id: Stinger): boolean {
        const now = this.engine.ctx.currentTime;
        const prev = this.lastAt.get(id);
        if (prev !== undefined && now - prev < STINGER_COOLDOWN[id]) return false;
        this.lastAt.set(id, now);
        void this.buffer(id).then((buffer) => {
            if (!buffer) return;
            const ctx = this.engine.ctx;
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(this.engine.buses.music);
            source.start();
            this.duck(buffer.duration > 0 ? buffer.duration : 3);
            this.last = id;
            this.played++;
        });
        return true;
    }
}
