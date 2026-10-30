// Escribir un JSON editado con el mismo formato que el original. Los archivos
// de `data/` están formateados a mano (objetos cortos en una línea, columnas
// alineadas…), y `JSON.stringify(v, null, 2)` lo destrozaría: cada guardado del
// editor sería un diff enorme. Aquí se reutiliza el texto original de todo lo
// que no cambió y lo nuevo copia el estilo (una línea o varias) de lo que había
// en ese sitio o de sus hermanos. Lógica pura, sin DOM.

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

interface SpanNode {
  kind: 'object' | 'array' | 'value';
  start: number;
  end: number;
  /** El texto original del valor ocupa varias líneas. */
  multiline: boolean;
  value: Json;
  entries: Array<{ key: string; node: SpanNode }>;
  items: SpanNode[];
}

/** JSON → árbol con la posición de cada valor en el texto. */
export function parseWithSpans(text: string): SpanNode {
  let i = 0;
  const ws = (): void => {
    while (i < text.length && ' \t\r\n'.includes(text[i]!)) i++;
  };
  const fail = (msg: string): never => {
    throw new Error(`JSON inválido en ${i}: ${msg}`);
  };
  const str = (): string => {
    const s = i;
    if (text[i] !== '"') fail('se esperaba "');
    i++;
    while (i < text.length && text[i] !== '"') i += text[i] === '\\' ? 2 : 1;
    if (i >= text.length) fail('cadena sin cerrar');
    i++;
    return JSON.parse(text.slice(s, i)) as string;
  };
  const node = (kind: SpanNode['kind'], start: number, value: Json, entries: SpanNode['entries'] = [], items: SpanNode[] = []): SpanNode => ({
    kind,
    start,
    end: i,
    multiline: text.slice(start, i).includes('\n'),
    value,
    entries,
    items,
  });
  const value = (): SpanNode => {
    ws();
    const start = i;
    const c = text[i];
    if (c === '{') {
      i++;
      const entries: SpanNode['entries'] = [];
      const obj: { [k: string]: Json } = {};
      ws();
      if (text[i] === '}') {
        i++;
        return node('object', start, obj);
      }
      for (;;) {
        ws();
        const key = str();
        ws();
        if (text[i] !== ':') fail('se esperaba :');
        i++;
        const child = value();
        entries.push({ key, node: child });
        obj[key] = child.value;
        ws();
        if (text[i] === ',') {
          i++;
          continue;
        }
        if (text[i] === '}') {
          i++;
          return node('object', start, obj, entries);
        }
        fail('se esperaba , o }');
      }
    }
    if (c === '[') {
      i++;
      const items: SpanNode[] = [];
      ws();
      if (text[i] === ']') {
        i++;
        return node('array', start, []);
      }
      for (;;) {
        items.push(value());
        ws();
        if (text[i] === ',') {
          i++;
          continue;
        }
        if (text[i] === ']') {
          i++;
          return node('array', start, items.map((n) => n.value), [], items);
        }
        fail('se esperaba , o ]');
      }
    }
    if (c === '"') {
      const s = str();
      return node('value', start, s);
    }
    const m = /^(-?\d+(\.\d+)?([eE][+-]?\d+)?|true|false|null)/.exec(text.slice(i, i + 64));
    if (!m) fail('valor desconocido');
    i += m![0].length;
    return node('value', start, JSON.parse(m![0]) as Json);
  };
  const root = value();
  ws();
  if (i !== text.length) fail('sobra texto al final');
  return root;
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const bb = b as unknown[];
    return a.length === bb.length && a.every((v, i) => deepEqual(v, bb[i]));
  }
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k, i) => k === kb[i] && deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

/** Contenedores más largos que esto van en varias líneas si no hay un modelo que copiar. */
const INLINE_MAX = 110;

function inline(v: Json): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(inline).join(', ')}]`;
  const keys = Object.keys(v);
  return keys.length === 0 ? '{}' : `{ ${keys.map((k) => `${JSON.stringify(k)}: ${inline(v[k]!)}`).join(', ')} }`;
}

/** Sangría del archivo: la de la primera línea sangrada (2 espacios si no hay). */
function detectIndent(text: string): string {
  const m = /\n([ \t]+)\S/.exec(text);
  return m ? m[1]! : '  ';
}

/**
 * Serializa `value` copiando el formato de `original`. Si nada cambió devuelve
 * `original` tal cual. Sólo entiende JSON estándar (sin comentarios).
 */
export function formatLike(original: string, value: unknown): string {
  const root = parseWithSpans(original);
  const unit = detectIndent(original);
  const v = value as Json;
  if (deepEqual(v, root.value)) return original;

  /** Estilo de los hermanos para un hijo nuevo: el del último contenedor que había. */
  const siblingStyle = (nodes: SpanNode[]): boolean | undefined => {
    for (let k = nodes.length - 1; k >= 0; k--) if (nodes[k]!.kind !== 'value') return nodes[k]!.multiline;
    return undefined;
  };

  const emit = (val: Json, node: SpanNode | null, indent: string, hint: boolean | undefined, forceInline: boolean): string => {
    if (node && deepEqual(val, node.value) && !(forceInline && node.multiline)) return original.slice(node.start, node.end);
    if (val === null || typeof val !== 'object') return JSON.stringify(val);
    const isArr = Array.isArray(val);
    const same = node !== null && node.kind === (isArr ? 'array' : 'object') ? node : null;
    let multi: boolean;
    if (forceInline) multi = false;
    else if (same) multi = same.multiline;
    else if (hint !== undefined) multi = hint;
    else multi = inline(val).length + indent.length > INLINE_MAX;
    const inner = indent + unit;
    let parts: string[];
    if (isArr) {
      const items = val as Json[];
      const style = same ? siblingStyle(same.items) : undefined;
      parts = items.map((x, k) => emit(x, same?.items[k] ?? null, inner, style, !multi));
    } else {
      const obj = val as { [k: string]: Json };
      const byKey = new Map((same?.entries ?? []).map((e) => [e.key, e.node]));
      parts = Object.keys(obj).map((k) => `${JSON.stringify(k)}: ${emit(obj[k]!, byKey.get(k) ?? null, inner, undefined, !multi)}`);
    }
    const [open, close] = isArr ? ['[', ']'] : ['{', '}'];
    if (parts.length === 0) return open + close;
    if (!multi) return isArr ? `[${parts.join(', ')}]` : `{ ${parts.join(', ')} }`;
    return `${open}\n${parts.map((p) => inner + p).join(',\n')}\n${indent}${close}`;
  };

  let out = emit(v, root, '', undefined, false);
  if (/\n$/.test(original)) out += '\n';
  // Mismo fin de línea que el original (los trozos reutilizados ya lo traen).
  return original.includes('\r\n') ? out.replace(/\r?\n/g, '\r\n') : out;
}
