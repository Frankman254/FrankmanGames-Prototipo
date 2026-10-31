// Música local para pruebas (sólo `npm run dev`). El creador puede dejar
// canciones en `src/audio/music/` (carpeta ignorada por git) y asignarlas a
// sitios con `src/audio/music/local.json`, p. ej.
//   { "dungeon": "mi cancion.mp3", "crypt-3": "jefe.mp3", "azuero": "llanos.ogg", "_volume": 0.7 }
// Claves, de más a menos concreta: `crypt-<piso>` (desde 1), `crypt`,
// `dungeon`; en el mundo abierto, el id de la zona (`data/zones.json`) y
// `overworld`. Sin el archivo, o sin clave para el sitio, suena la música
// generada de siempre. Este módulo sólo se importa tras `import.meta.env.DEV`,
// así que ni él ni las canciones llegan al build.
import type { AudioEngine } from './engine';

/** Carpeta servida por Vite en desarrollo. */
export const LOCAL_MUSIC_BASE = '/src/audio/music/';
const AUDIO_EXT = /\.(mp3|ogg|oga|wav|m4a|aac|flac|webm|opus)$/i;

/**
 * Valida el mapa sitio → archivo: sólo nombres de archivo de audio dentro de
 * la carpeta (sin rutas ni `..`). Lo demás se descarta con un aviso.
 */
export function parseLocalMusic(raw: unknown): { map: Record<string, string>; volume: number; warnings: string[] } {
  const map: Record<string, string> = {};
  const warnings: string[] = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { map, volume: 1, warnings: ['local.json debe ser un objeto { "sitio": "archivo" }'] };
  const o = raw as Record<string, unknown>;
  const vol = o['_volume'];
  const volume = typeof vol === 'number' && Number.isFinite(vol) ? Math.max(0, Math.min(2, vol)) : 1;
  for (const [k, v] of Object.entries(o)) {
    if (k.startsWith('_')) continue; // comentarios y `_volume`
    if (typeof v !== 'string' || v.trim() === '') warnings.push(`"${k}": hace falta el nombre del archivo`);
    else if (/[\\/]|\.\./.test(v)) warnings.push(`"${k}": sólo el nombre del archivo, sin carpetas`);
    else if (!AUDIO_EXT.test(v)) warnings.push(`"${k}": "${v}" no parece un archivo de audio`);
    else map[k] = v.trim();
  }
  return { map, volume, warnings };
}

/** La primera clave de `keys` (de más a menos concreta) que tiene canción. */
export function pickTrack(map: Readonly<Record<string, string>>, keys: readonly string[]): string | null {
  for (const k of keys) if (map[k]) return map[k];
  return null;
}

/** Claves del sitio actual, de más a menos concreta. */
export function placeKeys(dungeonFloor: number | null, zoneId: string | null): string[] {
  if (dungeonFloor !== null) return [`crypt-${dungeonFloor + 1}`, 'crypt', 'dungeon'];
  return zoneId ? [zoneId, 'overworld'] : ['overworld'];
}

/** Reproduce en bucle la canción del sitio por el bus de música y apaga la generada mientras suena. */
export class LocalMusicPlayer {
  private map: Record<string, string> = {};
  /** Ganancia de las canciones locales (`_volume`), sobre el volumen de música de las opciones. */
  private volume = 1;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private current: { file: string; src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private wanted: string | null = null;
  private ready = false;

  constructor(private readonly engine: AudioEngine, private readonly fetchFn: typeof fetch = fetch.bind(globalThis)) {}

  /** Lee `local.json`. Sin archivo no hace nada (y la música generada sigue). */
  async load(): Promise<void> {
    try {
      const res = await this.fetchFn(`${LOCAL_MUSIC_BASE}local.json`, { headers: { accept: 'application/json' }, cache: 'no-store' });
      if (!res.ok) return;
      const text = await res.text();
      if (text.trimStart().startsWith('<')) return; // el servidor devolvió la página: no hay archivo
      const { map, volume, warnings } = parseLocalMusic(JSON.parse(text));
      for (const w of warnings) console.warn(`[música local] ${w}`);
      this.map = map;
      this.volume = volume;
      this.ready = true;
      if (Object.keys(map).length) console.info('[música local]', map);
    } catch (e) {
      console.warn('[música local] no se pudo leer local.json', e);
    }
  }

  /** Cada fotograma: piso de la mazmorra (null fuera) y zona del jugador. */
  updatePlace(dungeonFloor: number | null, zoneId: string | null): void {
    this.update(placeKeys(dungeonFloor, zoneId));
  }

  /** Las claves del sitio actual, de más a menos concreta. */
  update(keys: readonly string[]): void {
    if (!this.ready) return;
    const file = pickTrack(this.map, keys);
    if (file === this.wanted) return;
    this.wanted = file;
    void this.switchTo(file);
  }

  private buffer(file: string): Promise<AudioBuffer | null> {
    let p = this.buffers.get(file);
    if (!p) {
      p = this.fetchFn(LOCAL_MUSIC_BASE + encodeURIComponent(file))
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((b) => this.engine.ctx.decodeAudioData(b))
        .catch((e: unknown) => {
          console.warn(`[música local] no se pudo cargar "${file}"`, e);
          return null;
        });
      this.buffers.set(file, p);
    }
    return p;
  }

  private async switchTo(file: string | null): Promise<void> {
    const ctx = this.engine.ctx;
    const fade = 1.2;
    const buf = file ? await this.buffer(file) : null;
    if (this.wanted !== file) return; // cambió de sitio mientras cargaba
    if (this.current && this.current.file === file) return;
    // Fuera la canción anterior.
    if (this.current) {
      const old = this.current;
      old.gain.gain.setTargetAtTime(0, ctx.currentTime, fade / 3);
      old.src.stop(ctx.currentTime + fade * 2);
      this.current = null;
    }
    // La generada vuelve si no hay canción (o no se pudo cargar), y se apaga si la hay.
    this.engine.musicIn.gain.setTargetAtTime(buf ? 0 : 1, ctx.currentTime, fade / 3);
    if (!buf || !file) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(this.volume, ctx.currentTime, fade / 3);
    src.connect(gain);
    gain.connect(this.engine.buses.music);
    src.start();
    this.current = { file, src, gain };
  }
}
