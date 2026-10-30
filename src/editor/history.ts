// Deshacer y rehacer del editor (Ctrl+Z / Ctrl+Y). Cada paso guarda el texto
// de los archivos que cambió, antes y después: arrastrar una casa durante dos
// segundos es un solo paso. Lógica pura.

export type Snapshot = Record<string, string>;

export interface Change {
  label: string;
  before: Snapshot;
  after: Snapshot;
}

export class History {
  private readonly undoStack: Change[] = [];
  private readonly redoStack: Change[] = [];

  constructor(private readonly limit = 200) {}

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Nombre del paso que desharía Ctrl+Z. */
  get undoLabel(): string | null {
    return this.undoStack[this.undoStack.length - 1]?.label ?? null;
  }

  get redoLabel(): string | null {
    return this.redoStack[this.redoStack.length - 1]?.label ?? null;
  }

  /**
   * Apunta un paso comparando dos fotos completas; sólo se guardan los archivos
   * que cambiaron. Devuelve false si no cambió nada (no se apunta).
   */
  record(label: string, before: Snapshot, after: Snapshot): boolean {
    const b: Snapshot = {};
    const a: Snapshot = {};
    for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (before[k] === after[k]) continue;
      if (before[k] !== undefined) b[k] = before[k]!;
      if (after[k] !== undefined) a[k] = after[k]!;
    }
    if (Object.keys(a).length === 0 && Object.keys(b).length === 0) return false;
    this.undoStack.push({ label, before: b, after: a });
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack.length = 0;
    return true;
  }

  /** Paso a deshacer: hay que restaurar `before`. */
  undo(): Change | null {
    const c = this.undoStack.pop();
    if (!c) return null;
    this.redoStack.push(c);
    return c;
  }

  /** Paso a rehacer: hay que restaurar `after`. */
  redo(): Change | null {
    const c = this.redoStack.pop();
    if (!c) return null;
    this.undoStack.push(c);
    return c;
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
}
