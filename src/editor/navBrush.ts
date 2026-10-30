// Pincel de navegación del editor: marca celdas como bloqueadas, libres (aunque
// un obstáculo las bloquee) o las devuelve a lo automático. Trabaja sobre
// conjuntos de celdas y se guarda en tramos por fila (data/navpaint.json).
// Lógica pura.
import type { NavPaint } from '../sim/navGrid';

export type BrushMode = 'block' | 'clear' | 'erase';

export interface PaintState {
  cellSize: number;
  /** Índice de celda `cy * cols + cx`. */
  blocked: Set<number>;
  cleared: Set<number>;
}

export function paintFromData(p: NavPaint, cols: number): PaintState {
  const read = (spans: NavPaint['blocked']): Set<number> => {
    const out = new Set<number>();
    for (const [cy, a, b] of spans) for (let cx = a; cx <= b; cx++) if (cx < cols) out.add(cy * cols + cx);
    return out;
  };
  return { cellSize: p.cellSize, blocked: read(p.blocked), cleared: read(p.cleared) };
}

/** Celdas en tramos `[fila, colInicio, colFin]`, ordenados por fila y columna. */
export function toSpans(cells: ReadonlySet<number>, cols: number): Array<[number, number, number]> {
  const sorted = [...cells].sort((a, b) => a - b);
  const out: Array<[number, number, number]> = [];
  for (const i of sorted) {
    const cy = Math.floor(i / cols);
    const cx = i - cy * cols;
    const last = out[out.length - 1];
    if (last && last[0] === cy && last[2] === cx - 1) last[2] = cx;
    else out.push([cy, cx, cx]);
  }
  return out;
}

export function paintToData(s: PaintState, cols: number): NavPaint {
  return { cellSize: s.cellSize, blocked: toSpans(s.blocked, cols), cleared: toSpans(s.cleared, cols) };
}

/**
 * Pincelada circular de `radius` metros centrada en (x, y). Devuelve cuántas
 * celdas cambiaron. Con radio menor que una celda pinta sólo la de debajo.
 */
export function brush(s: PaintState, cols: number, rows: number, x: number, y: number, radius: number, mode: BrushMode): number {
  const cs = s.cellSize;
  const ccx = Math.floor(x / cs);
  const ccy = Math.floor(y / cs);
  const r = Math.max(0, Math.ceil(radius / cs));
  let changed = 0;
  for (let cy = ccy - r; cy <= ccy + r; cy++) {
    for (let cx = ccx - r; cx <= ccx + r; cx++) {
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue;
      const inside = (cx === ccx && cy === ccy) || Math.hypot((cx + 0.5) * cs - x, (cy + 0.5) * cs - y) <= radius;
      if (!inside) continue;
      const i = cy * cols + cx;
      const wasB = s.blocked.has(i);
      const wasC = s.cleared.has(i);
      if (mode === 'block') {
        s.cleared.delete(i);
        s.blocked.add(i);
        if (!wasB) changed++;
      } else if (mode === 'clear') {
        s.blocked.delete(i);
        s.cleared.add(i);
        if (!wasC) changed++;
      } else {
        s.blocked.delete(i);
        s.cleared.delete(i);
        if (wasB || wasC) changed++;
      }
    }
  }
  return changed;
}
