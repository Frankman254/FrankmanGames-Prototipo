// Validación mínima de los JSON de `data/`. Los campos que empiezan por `_`
// son comentarios (estado PROPUESTA, notas) y se ignoran.

export class DataError extends Error {
  constructor(file: string, path: string, msg: string) {
    super(`[data/${file}] ${path}: ${msg}`);
    this.name = 'DataError';
  }
}

type Obj = Record<string, unknown>;

export class Reader {
  constructor(readonly file: string, readonly path = '') {}

  private at(key: string | number): string {
    return this.path ? `${this.path}.${key}` : String(key);
  }

  fail(key: string | number, msg: string): never {
    throw new DataError(this.file, this.at(key), msg);
  }

  obj(v: unknown, key: string | number = ''): Obj {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) this.fail(key, 'se esperaba un objeto');
    return v as Obj;
  }

  child(key: string | number): Reader {
    return new Reader(this.file, this.at(key));
  }

  num(o: Obj, key: string, opts: { min?: number; max?: number; int?: boolean; def?: number } = {}): number {
    let v = o[key];
    if (v === undefined && opts.def !== undefined) v = opts.def;
    if (typeof v !== 'number' || !Number.isFinite(v)) this.fail(key, `se esperaba un número (llegó ${JSON.stringify(v)})`);
    if (opts.int && !Number.isInteger(v)) this.fail(key, `se esperaba un entero (llegó ${v})`);
    if (opts.min !== undefined && v < opts.min) this.fail(key, `debe ser ≥ ${opts.min} (llegó ${v})`);
    if (opts.max !== undefined && v > opts.max) this.fail(key, `debe ser ≤ ${opts.max} (llegó ${v})`);
    return v;
  }

  str(o: Obj, key: string, allowed?: readonly string[]): string {
    const v = o[key];
    if (typeof v !== 'string' || v.length === 0) this.fail(key, 'se esperaba un texto no vacío');
    if (allowed && !allowed.includes(v)) this.fail(key, `debe ser uno de ${allowed.join(', ')} (llegó "${v}")`);
    return v;
  }

  arr(o: Obj, key: string): unknown[] {
    const v = o[key];
    if (!Array.isArray(v)) this.fail(key, 'se esperaba una lista');
    return v;
  }

  vec(o: Obj, key: string): { x: number; y: number } {
    const r = this.child(key);
    const v = r.obj(o[key]);
    return { x: r.num(v, 'x'), y: r.num(v, 'y') };
  }
}
