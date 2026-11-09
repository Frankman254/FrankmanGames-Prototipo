// Piezas WAV terminadas para contextos que no son regiones: portada, cripta y
// piso con guardián. La música local de desarrollo conserva prioridad y la
// partitura generativa queda como respaldo mientras el WAV carga o si falla.
import type { MenuScreen } from '../ui/menus';
import type { AudioEngine } from './engine';

export type MusicContext = 'title' | 'crypt' | 'guardian';

const TRACK_URL: Record<MusicContext, string> = {
  // No incrustar estos WAV largos en el JS: Vite los copia con hash y Electron
  // los carga como los GLB. Los efectos cortos sí siguen inline (vite.config).
  title: new URL('../../assets/audio/music/titulo/titulo_mix.wav?no-inline', import.meta.url).href,
  crypt: new URL('../../assets/audio/music/cripta/cripta_mix.wav?no-inline', import.meta.url).href,
  guardian: new URL('../../assets/audio/music/guardian/guardian_mix.wav?no-inline', import.meta.url).href,
};

/** Contexto empaquetado; null conserva el perfil generativo regional. */
export function musicContext(screen: MenuScreen, floor: number | null, guardian: boolean): MusicContext | null {
  if (screen !== 'game') return 'title';
  if (floor === null) return null;
  return guardian ? 'guardian' : 'crypt';
}

interface Playing {
  id: MusicContext;
  source: AudioBufferSourceNode;
  gain: GainNode;
}

export class ContextMusicPlayer {
  private readonly buffers = new Map<MusicContext, Promise<AudioBuffer | null>>();
  private current: Playing | null = null;
  private wanted: MusicContext | null = null;
  private overridden = false;

  constructor(private readonly engine: AudioEngine, private readonly fetchFn: typeof fetch = fetch.bind(globalThis)) {}

  /** Contexto cuyo WAV ya está decodificado y en reproducción (para QA). */
  get active(): MusicContext | null {
    return this.current?.id ?? null;
  }

  /** Cambia de contexto con fundido; `overridden` deja el bus a la música local. */
  update(id: MusicContext | null, overridden: boolean): void {
    this.overridden = overridden;
    if (id !== this.wanted) {
      this.wanted = id;
      void this.switchTo(id);
    }
    const packaged = this.current?.id === id && !overridden;
    const now = this.engine.ctx.currentTime;
    this.engine.musicIn.gain.setTargetAtTime(packaged || overridden ? 0 : 1, now, 0.4);
    this.current?.gain.gain.setTargetAtTime(packaged ? 1 : 0, now, 0.4);
  }

  private buffer(id: MusicContext): Promise<AudioBuffer | null> {
    let pending = this.buffers.get(id);
    if (!pending) {
      pending = this.fetchFn(TRACK_URL[id])
        .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(`HTTP ${response.status}`))))
        .then((bytes) => this.engine.ctx.decodeAudioData(bytes))
        .catch((error: unknown) => {
          console.warn(`[música] no se pudo cargar ${id}`, error);
          return null;
        });
      this.buffers.set(id, pending);
    }
    return pending;
  }

  private async switchTo(id: MusicContext | null): Promise<void> {
    const buffer = id ? await this.buffer(id) : null;
    if (this.wanted !== id) return;
    const ctx = this.engine.ctx;
    const old = this.current;
    if (old) {
      old.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      old.source.stop(ctx.currentTime + 2.4);
      this.current = null;
    }
    if (!buffer || !id) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(this.engine.buses.music);
    source.start();
    this.current = { id, source, gain };
    // Aplica enseguida el estado actual sin esperar al próximo fotograma.
    const audible = !this.overridden;
    this.engine.musicIn.gain.setTargetAtTime(audible || this.overridden ? 0 : 1, ctx.currentTime, 0.4);
    gain.gain.setTargetAtTime(audible ? 1 : 0, ctx.currentTime, 0.4);
  }
}
