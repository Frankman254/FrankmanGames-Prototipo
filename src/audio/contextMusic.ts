// Piezas terminadas para contextos (creador, 2026-11-19: «según sea la zona: un
// pueblo, pelea en un pueblo, la mazmorra y pelea de jefe en mazmorra»). Cada una
// suena en bucle: portada, pueblo (zonas `safe`), pelea en pueblo, cripta y
// guardián. Las regiones sin pueblo siguen con su partitura generativa.
// Los tres OGG de `assets/dev_dungeon/` son de otro juego (PROCEDENCIA.md: no
// aptos para publicación). Su rotación solo existe con `npm run dev` y solo si se
// pide (`devDungeon`), y se piden por una ruta de texto que Vite no procesa, así
// que nunca entran en `dist/` (lo vigila `scripts/checkPublishable.mjs`).
import type { MenuScreen } from '../ui/menus';
import type { AudioEngine } from './engine';

export type MusicContext = 'title' | 'town' | 'town_fight' | 'crypt' | 'guardian';
type TrackId = MusicContext | 'dungeon1' | 'dungeon2' | 'dungeon3';

// Experimento de desarrollo: rutas del servidor de Vite, sin `new URL(...)` para
// que el build no copie los archivos, y tras `import.meta.env.DEV` para que el
// texto tampoco quede en el JS publicado.
const DEV_DUNGEON_URL: Partial<Record<TrackId, string>> = import.meta.env.DEV
    ? {
          dungeon1: '/assets/dev_dungeon/dungeon1.ogg',
          dungeon2: '/assets/dev_dungeon/dungeon2.ogg',
          dungeon3: '/assets/dev_dungeon/dungeon3.ogg',
      }
    : {};

const TRACK_URL: Partial<Record<TrackId, string>> = {
    // No incrustar estos archivos largos en el JS: Vite los copia con hash y Electron
    // los carga como los GLB. Los efectos cortos sí siguen inline (vite.config).
    // Las canciones de orquesta van en Ogg/Opus (work/claude-aud-juego-musica/exportar.py).
    title: new URL('../../assets/audio/music/titulo/titulo_mix.wav?no-inline', import.meta.url).href,
    town: new URL('../../assets/audio/music/pueblo/fiesta_en_el_atrio.ogg?no-inline', import.meta.url).href,
    town_fight: new URL('../../assets/audio/music/pueblo_pelea/choque_en_la_plaza.ogg?no-inline', import.meta.url)
        .href,
    crypt: new URL('../../assets/audio/music/cripta/mazmorra_hondo.ogg?no-inline', import.meta.url).href,
    guardian: new URL('../../assets/audio/music/guardian/musica1_propia.ogg?no-inline', import.meta.url).href,
    ...DEV_DUNGEON_URL,
};

const DUNGEON_TRACKS = ['dungeon1', 'dungeon2', 'dungeon3'] as const;

/** Bolsa aleatoria: cada pista sale una vez por ciclo y no se repite en el borde. */
export class DungeonPlaylist {
    private bag: TrackId[] = [];
    private previous: TrackId | null = null;

    constructor(private readonly random: () => number = Math.random) {}

    reset(): void {
        this.bag = [];
        this.previous = null;
    }

    next(): TrackId {
        if (this.bag.length === 0) {
            this.bag = [...DUNGEON_TRACKS];
            for (let i = this.bag.length - 1; i > 0; i--) {
                const j = Math.min(i, Math.floor(this.random() * (i + 1)));
                [this.bag[i], this.bag[j]] = [this.bag[j]!, this.bag[i]!];
            }
            if (this.previous !== null && this.bag[0] === this.previous)
                [this.bag[0], this.bag[1]] = [this.bag[1]!, this.bag[0]!];
        }
        const track = this.bag.shift()!;
        this.previous = track;
        return track;
    }
}

/**
 * Contexto empaquetado; null conserva el perfil generativo regional.
 * `town`: la zona actual es segura (pueblo). `guardian`: el piso tiene guardián. `fighting`: hay enemigos en combate
 * cerca o acaban de estarlo (la misma tensión que usa la partitura generativa).
 */
export function musicContext(
    screen: MenuScreen,
    floor: number | null,
    guardian: boolean,
    town = false,
    fighting = false,
): MusicContext | null {
    if (screen !== 'game') return 'title';
    // Creador (2026-11-19): la mazmorra suena a caverna y misterio. En un piso con guardián la
    // canción de jefe entra solo cuando hay pelea; el resto del piso sigue con la de la cripta.
    if (floor !== null) return guardian && fighting ? 'guardian' : 'crypt';
    if (town) return fighting ? 'town_fight' : 'town';
    return null;
}

interface Playing {
    id: MusicContext;
    track: TrackId;
    source: AudioBufferSourceNode;
    gain: GainNode;
}

export class ContextMusicPlayer {
    private readonly buffers = new Map<TrackId, Promise<AudioBuffer | null>>();
    private readonly dungeon: DungeonPlaylist;
    private current: Playing | null = null;
    private wanted: MusicContext | null = null;
    private overridden = false;

    /** `devDungeon`: rotación de los OGG de estudio en vez de la cripta propia (solo en `npm run dev`, apagada por defecto). */
    constructor(
        private readonly engine: AudioEngine,
        private readonly fetchFn: typeof fetch = fetch.bind(globalThis),
        random: () => number = Math.random,
        private readonly devDungeon: boolean = false,
    ) {
        this.dungeon = new DungeonPlaylist(random);
    }

    /** Contexto cuyo WAV ya está decodificado y en reproducción (para QA). */
    get active(): MusicContext | null {
        return this.current?.id ?? null;
    }

    /** Pista concreta que suena (para comprobar la rotación en desarrollo/QA). */
    get activeTrack(): TrackId | null {
        return this.current?.track ?? null;
    }

    /** Cambia de contexto con fundido; `overridden` deja el bus a la música local. */
    update(id: MusicContext | null, overridden: boolean): void {
        this.overridden = overridden;
        if (id !== this.wanted) {
            this.wanted = id;
            if (id === 'crypt') this.dungeon.reset();
            void this.switchTo(id);
        }
        const packaged = this.current?.id === id && !overridden;
        const now = this.engine.ctx.currentTime;
        this.engine.musicIn.gain.setTargetAtTime(packaged || overridden ? 0 : 1, now, 0.4);
        this.current?.gain.gain.setTargetAtTime(packaged ? 1 : 0, now, 0.4);
    }

    private buffer(track: TrackId): Promise<AudioBuffer | null> {
        let pending = this.buffers.get(track);
        if (!pending) {
            const url = TRACK_URL[track];
            pending = (url ? this.fetchFn(url) : Promise.reject(new Error('pista solo de desarrollo')))
                .then((response) =>
                    response.ok ? response.arrayBuffer() : Promise.reject(new Error(`HTTP ${response.status}`)),
                )
                .then((bytes) => this.engine.ctx.decodeAudioData(bytes))
                .catch((error: unknown) => {
                    console.warn(`[música] no se pudo cargar ${track}`, error);
                    return null;
                });
            this.buffers.set(track, pending);
        }
        return pending;
    }

    private async switchTo(id: MusicContext | null): Promise<void> {
        const rotating = id === 'crypt' && this.devDungeon;
        const track = rotating ? this.dungeon.next() : id;
        const buffer = track ? await this.buffer(track) : null;
        if (this.wanted !== id) return;
        const ctx = this.engine.ctx;
        const old = this.current;
        if (old) {
            old.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
            old.source.stop(ctx.currentTime + 2.4);
            this.current = null;
        }
        if (!buffer || !id || !track) return;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = !rotating;
        const gain = ctx.createGain();
        gain.gain.value = 0;
        source.connect(gain);
        gain.connect(this.engine.buses.music);
        source.start();
        this.current = { id, track, source, gain };
        if (rotating)
            source.onended = () => {
                if (this.wanted !== 'crypt' || this.current?.source !== source) return;
                this.current = null;
                void this.switchTo('crypt');
            };
        // Aplica enseguida el estado actual sin esperar al próximo fotograma.
        const audible = !this.overridden;
        this.engine.musicIn.gain.setTargetAtTime(audible || this.overridden ? 0 : 1, ctx.currentTime, 0.4);
        gain.gain.setTargetAtTime(audible ? 1 : 0, ctx.currentTime, 0.4);
    }
}
