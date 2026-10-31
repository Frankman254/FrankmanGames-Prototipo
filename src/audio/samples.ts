// Muestras WAV de efectos, generadas por código (scripts/generateSfx.mjs). Se
// incrustan en el build como data URL (vite.config.ts → assetsInlineLimit: no
// dependen de file:// ni de la red; en `vite serve` llegan como ruta del
// servidor de desarrollo) y se decodifican al
// arrancar el audio. Lo que falte o falle suena con la receta
// sintetizada del mismo id (data/audio/sfx.json).
import type { SfxDef } from './data';

const FILES = import.meta.glob('./sfx/generated_original/*.wav', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

/** Nombre de archivo → data URL (build) o ruta (servidor de desarrollo). */
export function bundledSamples(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, url] of Object.entries(FILES)) out[path.slice(path.lastIndexOf('/') + 1)] = url;
  return out;
}

/** Bytes de una data URL base64 (sin fetch). */
export function dataUrlBytes(url: string): ArrayBuffer {
  const comma = url.indexOf(',');
  const bin = atob(url.slice(comma + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function bytesOf(url: string): Promise<ArrayBuffer> {
  return url.startsWith('data:') ? dataUrlBytes(url) : (await fetch(url)).arrayBuffer();
}

/** Decodifica las muestras de `sfx.samples`; la promesa nunca falla (lo que falla se omite). */
export async function loadSamples(
  ctx: { decodeAudioData(data: ArrayBuffer): Promise<AudioBuffer> },
  sfx: SfxDef,
  files: Record<string, string> = bundledSamples(),
): Promise<Map<string, AudioBuffer>> {
  const decoded = new Map<string, Promise<AudioBuffer | null>>();
  const out = new Map<string, AudioBuffer>();
  await Promise.all(
    Object.entries(sfx.samples).map(async ([id, s]) => {
      const url = files[s.file];
      if (!url) return;
      if (!decoded.has(s.file)) decoded.set(s.file, bytesOf(url).then((b) => ctx.decodeAudioData(b)).catch(() => null));
      const buf = await decoded.get(s.file)!;
      if (buf) out.set(id, buf);
    }),
  );
  return out;
}
