// Piezas terminadas para contextos que no son regiones. La cripta usa tres OGG
// externos sólo como EXPERIMENTO de desarrollo: una bolsa barajada reproduce
// las tres sin repetir antes de empezar otro ciclo. La música local conserva
// prioridad y la partitura generativa queda como respaldo si una carga falla.
import type { MenuScreen } from '../ui/menus';
import type { AudioEngine } from './engine';

export type MusicContext = 'title' | 'crypt' | 'guardian';
type TrackId = 'title' | 'guardian' | 'dungeon1' | 'dungeon2' | 'dungeon3';

const TRACK_URL: Record<TrackId, string> = {
  // No incrustar estos WAV largos en el JS: Vite los copia con hash y Electron
  // los carga como los GLB. Los efectos cortos sí siguen inline (vite.config).
  title: new URL('../../assets/audio/music/titulo/titulo_mix.wav?no-inline', import.meta.url).href,
  guardian: new URL('../../assets/audio/music/guardian/guardian_mix.wav?no-inline', import.meta.url).href,
  dungeon1: new URL('../../assets/dev_dungeon/dungeon1.ogg?no-inline', import.meta.url).href,
  dungeon2: new URL('../../assets/dev_dungeon/dungeon2.ogg?no-inline', import.meta.url).href,
  dungeon3: new URL('../../assets/dev_dungeon/dungeon3.ogg?no-inline', import.meta.url).href,
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
      if (this.previous !== null && this.bag[0] === this.previous) [this.bag[0], this.bag[1]] = [this.bag[1]!, this.bag[0]!];
    }
    const track = this.bag.shift()!;
    this.previous = track;
    return track;
  }
}

/** Contexto empaquetado; null conserva el perfil generativo regional. */
export function musicContext(screen: MenuScreen, floor: number | null, guardian: boolean): MusicContext | null {
  if (screen !== 'game') return 'title';
  if (floor === null) return null;
  return guardian ? 'guardian' : 'crypt';
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

  constructor(private readonly engine: AudioEngine, private readonly fetchFn: typeof fetch = fetch.bind(globalThis), random: () => number = Math.random) {
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
      pending = this.fetchFn(TRACK_URL[track])
        .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(`HTTP ${response.status}`))))
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
    const track = id === 'crypt' ? this.dungeon.next() : id;
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
    source.loop = id !== 'crypt';
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(this.engine.buses.music);
    source.start();
    this.current = { id, track, source, gain };
    if (id === 'crypt') source.onended = () => {
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
