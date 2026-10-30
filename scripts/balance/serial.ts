// JSON que conserva NaN e Infinity (medianas sin victorias, minutos sin llegar a un nivel).
export function encode(v: unknown): string {
  return JSON.stringify(v, (_k, x) => (typeof x === 'number' && !Number.isFinite(x) ? { $num: String(x) } : x));
}

export function decode<T>(s: string): T {
  return JSON.parse(s, (_k, x) => (x && typeof x === 'object' && typeof x.$num === 'string' && Object.keys(x).length === 1 ? Number(x.$num) : x)) as T;
}
