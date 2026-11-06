// Conecta el mundo con sus hilos generadores. Va en un archivo aparte de la simulación: solo
// existe con ventana. Si no hay hilos, las páginas se generan aquí, con algún tirón.
// F13: con un solo hilo, cada página tardaba unos 350 ms y, al ir rápido (montura, viajes),
// el mundo pedía páginas más deprisa de lo que llegaban y acababa generándolas en el hilo
// principal (congelones). Ahora reparte las peticiones entre varios hilos.
import type { PageData } from '../world/pages';
import type { WorldStream } from '../world/stream';
import PageWorker from '../world/pageWorker?worker&inline';

/** Hilos generadores: deja al menos dos núcleos para el juego y el navegador. */
export function pageWorkerCount(cores: number): number {
  return Math.max(1, Math.min(3, Math.floor(cores) - 2));
}

export function connectPageWorker(stream: WorldStream): void {
  const workers: Worker[] = [];
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  for (let i = 0; i < pageWorkerCount(cores); i++) {
    try {
      const w = new PageWorker();
      w.onmessage = (e: MessageEvent<{ page: PageData; ms: number }>): void => stream.deliver(e.data.page, e.data.ms);
      w.onerror = (e): void => console.error('[mundo] fallo en un hilo de páginas:', e.message);
      w.postMessage({ ctx: stream.ctx });
      workers.push(w);
    } catch (err) {
      console.warn('[mundo] sin hilo de páginas:', err);
      break;
    }
  }
  if (workers.length === 0) return;
  let next = 0;
  stream.setSource({
    request: (px, pz) => {
      workers[next]!.postMessage({ px, pz });
      next = (next + 1) % workers.length;
    },
  });
}
