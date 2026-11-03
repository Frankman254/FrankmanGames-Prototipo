// Cuántas casillas dibuja la mochila. Los huecos son sólo visuales: la capacidad
// real es el peso, así que la rejilla rellena el espacio de la ventana y siempre
// deja sitio libre después del último objeto. Puro: se prueba sin DOM.

export interface GridSpace {
  /** Columnas que caben en el ancho disponible (mínimo 1). */
  columns: number;
  /** Filas que caben en el alto disponible sin desplazarse. */
  rows: number;
}

/** Filas completas de relleno más una fila libre tras el último objeto (con scroll si hace falta). */
export function bagCellCount(lastUsedIndex: number, space: GridSpace): number {
  const columns = Math.max(1, Math.floor(space.columns));
  const rows = Math.max(1, Math.floor(space.rows));
  const usedRows = lastUsedIndex < 0 ? 0 : Math.floor(lastUsedIndex / columns) + 1;
  return columns * Math.max(rows, usedRows + 1);
}

/** Filas que caben en `availablePx` para casillas de `cellPx` separadas por `gapPx`. */
export function rowsThatFit(availablePx: number, cellPx: number, gapPx: number): number {
  if (cellPx <= 0) return 1;
  return Math.max(1, Math.floor((availablePx + gapPx) / (cellPx + gapPx)));
}
