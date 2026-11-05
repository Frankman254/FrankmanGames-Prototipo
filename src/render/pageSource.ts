// Conecta el mundo con su hilo generador. Va en un archivo aparte de la simulación: solo
// existe con ventana. Si el hilo falla, las páginas se generan aquí, con algún tirón.
import type { PageData } from '../world/pages';
import type { WorldStream } from '../world/stream';
import PageWorker from '../world/pageWorker?worker&inline';

export function connectPageWorker(stream: WorldStream): void {
  let worker: Worker;
  try {
    worker = new PageWorker();
  } catch (err) {
    console.warn('[mundo] sin hilo de páginas:', err);
    return;
  }
  worker.onmessage = (e: MessageEvent<{ page: PageData; ms: number }>): void => stream.deliver(e.data.page, e.data.ms);
  worker.onerror = (e): void => console.error('[mundo] fallo en el hilo de páginas:', e.message);
  worker.postMessage({ ctx: stream.ctx });
  stream.setSource({ request: (px, pz) => worker.postMessage({ px, pz }) });
}
