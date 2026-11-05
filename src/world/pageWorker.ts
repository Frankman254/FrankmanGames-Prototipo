// Hilo que calcula páginas del mundo para que caminar no dé tirones.
import type { WorldContext } from './pageContext';
import { generatePage, pageBuffers } from './pages';

let ctx: WorldContext | null = null;

self.onmessage = (e: MessageEvent<{ ctx?: WorldContext; px?: number; pz?: number }>): void => {
  if (e.data.ctx) ctx = e.data.ctx;
  if (e.data.px === undefined || e.data.pz === undefined || !ctx) return;
  const started = performance.now();
  const page = generatePage(ctx, e.data.px, e.data.pz);
  (self as unknown as { postMessage(m: unknown, t: Transferable[]): void }).postMessage({ page, ms: performance.now() - started }, pageBuffers(page));
};
