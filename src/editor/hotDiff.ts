// Núcleo puro de la aplicación en caliente del modo edición (2026-11-11): qué
// cambió entre dos textos JSON, y qué rectángulo del mundo hay que regenerar.
// Sin Babylon ni DOM: se prueba en Node (tests/editor.test.ts). Las vistas y el
// mundo se enteran desde `hotApply.ts`.
import type { FileId } from './doc';

/** Archivos cuyo contenido tiene geometría: cambiarlos obliga a rehacer páginas. */
const GEOMETRY_FILES: readonly FileId[] = ['terrain', 'vegetation', 'stones', 'fishing', 'navpaint'];

export interface HotDiff {
  /** Archivos con cambios. */
  files: FileId[];
  /** Rectángulo a regenerar (unión de lo viejo y lo nuevo, con holgura); null si no hace falta. */
  rect: { x0: number; z0: number; x1: number; z1: number } | null;
}

/**
 * Rectángulo que abarca puntos con su holgura. `w`/`d` son las dimensiones del
 * prop; `radius`, el de un círculo (estanque, piedra, taller). `pad` se suma a
 * ambos semiejes.
 */
export function boundsOf(points: Iterable<{ x: number; y: number; w?: number; d?: number; radius?: number }>, pad = 0): { x0: number; z0: number; x1: number; z1: number } | null {
  let x0 = Infinity;
  let z0 = Infinity;
  let x1 = -Infinity;
  let z1 = -Infinity;
  let any = false;
  for (const p of points) {
    any = true;
    const hw = (p.w ?? 0) / 2 + (p.radius ?? 0) + pad;
    const hd = (p.d ?? 0) / 2 + (p.radius ?? 0) + pad;
    x0 = Math.min(x0, p.x - hw);
    z0 = Math.min(z0, p.y - hd);
    x1 = Math.max(x1, p.x + hw);
    z1 = Math.max(z1, p.y + hd);
  }
  return any ? { x0, z0, x1, z1 } : null;
}

export function unionRect(a: { x0: number; z0: number; x1: number; z1: number } | null, b: { x0: number; z0: number; x1: number; z1: number } | null): { x0: number; z0: number; x1: number; z1: number } | null {
  if (!a) return b;
  if (!b) return a;
  return { x0: Math.min(a.x0, b.x0), z0: Math.min(a.z0, b.z0), x1: Math.max(a.x1, b.x1), z1: Math.max(a.z1, b.z1) };
}

interface Dot { [k: string]: unknown }

const arr = (v: unknown): Dot[] => (Array.isArray(v) ? v as Dot[] : []);

/**
 * Puntos con geometría de un archivo: lo que bloquea paso o cambia el relieve.
 * Los grupos de props se aplanan (un prop en grupo tiene `x`/`y` relativos a su
 * padre en el JSON; el parser los sumará igual al aplicar — aquí sólo hace falta
 * la caja aproximada, y por eso se infla).
 */
function geometryOf(file: FileId, json: Dot): { x: number; y: number; w?: number; d?: number; radius?: number; k?: string }[] {
  switch (file) {
    case 'terrain':
      // Los estanques marcan agua y relief (su `depth` y ribera cambian la
      // malla); las plataformas aplanadas, su círculo y su tierra vista.
      return [...arr(json['ponds']).map((p) => ({ x: Number(p['x']), y: Number(p['y']), radius: Number(p['radius'] ?? 0) + Number(p['shore'] ?? 0), k: `p${p['depth'] ?? ''}~${p['shore'] ?? ''}` })),
        ...arr(json['flatAreas']).map((p) => ({ x: Number(p['x']), y: Number(p['y']), radius: Number(p['radius'] ?? 0) + Number(p['falloff'] ?? 0), k: `f${p['dirt'] ?? ''}` }))];
    case 'vegetation':
      return propsWithGroups(json);
    case 'stones':
      // Las piedras tienen halo de llegada; las lanchas, muelle en cada extremo.
      return [...arr(json['stones']).map((s) => ({ x: Number(s['x']), y: Number(s['y']), radius: 8 })),
        ...arr(json['boats']).flatMap((b) => [{ x: Number((b['x'] as number) ?? 0), y: Number((b['y'] as number) ?? 0), radius: 8 }, { x: Number((b['to'] as Dot)?.['x'] ?? 0), y: Number((b['to'] as Dot)?.['y'] ?? 0), radius: 8 }])];
    case 'fishing':
      return Object.values((json['spots'] ?? {}) as Record<string, Dot>).map((s) => ({ x: Number(s['x']), y: Number(s['y']), radius: Number(s['radius'] ?? 6) + 3 }));
    case 'navpaint': {
      // Celdas pintadas: su caja (fila y columna cuentan desde la esquina de la
      // parcela) inflada a rectángulo del mundo.
      const cell = Number(json['cellSize'] ?? 0);
      const spans = [...arr(json['blocked']), ...arr(json['cleared'])];
      if (!cell || spans.length === 0) return [];
      let x0 = Infinity;
      let z0 = Infinity;
      let x1 = -Infinity;
      let z1 = -Infinity;
      for (const s of spans) {
        const [cy, a, b] = s as unknown as [number, number, number];
        x0 = Math.min(x0, a * cell);
        x1 = Math.max(x1, (b + 1) * cell);
        z0 = Math.min(z0, cy * cell);
        z1 = Math.max(z1, (cy + 1) * cell);
      }
      return [{ x: (x0 + x1) / 2, y: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0 }];
    }
    default:
      return [];
  }
}

/** Props con los de dentro de cada grupo en su caja global aproximada. */
function propsWithGroups(json: Dot): { x: number; y: number; w?: number; d?: number; k?: string }[] {
  const out: { x: number; y: number; w?: number; d?: number; k?: string }[] = [];
  const walk = (list: Dot[], ox: number, oy: number, scale: number): void => {
    for (const p of list) {
      const x = ox + Number(p['x'] ?? 0) * scale;
      const y = oy + Number(p['y'] ?? 0) * scale;
      const w = Number(p['w'] ?? 2) * scale;
      const d = Number(p['d'] ?? 2) * scale;
      // `k` no dibuja nada: distingue un prop que cambia de clase o de modelo
      // sin moverse (la caja queda igual y hay que regenerar igualmente).
      out.push({ x, y, w, d, k: `${String(p['kind'] ?? '')}|${String(p['model'] ?? '')}|${String(p['scale'] ?? 1)}` });
      if (Array.isArray(p['props'])) walk(p['props'] as Dot[], x, y, scale * Number(p['scale'] ?? 1));
    }
  };
  walk(arr(json['props']), 0, 0, 1);
  for (const pl of arr(json['placements'])) out.push({ x: Number(pl['x']), y: Number(pl['y']), w: 3, d: 3, k: `${String(pl['kind'] ?? '')}|${String(pl['scale'] ?? 1)}` });
  return out;
}

/**
 * Puntos cuya geometría cambió entre dos textos del mismo archivo (multiconjunto
 * de entradas serializadas: vale mover, alta, baja y cambio de clase/radio; no
 * reordenar ni tocar campos que no pintan). Vacío = no hay que regenerar nada.
 */
function changedGeometry(file: FileId, before: Dot, after: Dot): { x: number; y: number; w?: number; d?: number; radius?: number; k?: string }[] {
  const keyOf = (p: { x: number; y: number; w?: number; d?: number; radius?: number; k?: string }): string => JSON.stringify([p.x, p.y, p.w ?? 0, p.d ?? 0, p.radius ?? 0, p.k ?? '']);
  const count = (list: ReturnType<typeof geometryOf>): Map<string, number> => {
    const m = new Map<string, number>();
    for (const p of list) m.set(keyOf(p), (m.get(keyOf(p)) ?? 0) + 1);
    return m;
  };
  const oldCounts = count(geometryOf(file, before));
  const newCounts = count(geometryOf(file, after));
  const out: { x: number; y: number; w?: number; d?: number; radius?: number; k?: string }[] = [];
  for (const [k, n] of oldCounts) if ((newCounts.get(k) ?? 0) < n) out.push(...Array(n - (newCounts.get(k) ?? 0)).fill(k).map(decodeKey));
  for (const [k, n] of newCounts) if ((oldCounts.get(k) ?? 0) < n) out.push(...Array(n - (oldCounts.get(k) ?? 0)).fill(k).map(decodeKey));
  return out;
}

const decodeKey = (key: string): { x: number; y: number; w: number; d: number; radius: number; k: string } => {
  const [x, y, w, d, radius, k] = JSON.parse(key) as [number, number, number, number, number, string];
  return { x, y, w, d, radius, k };
};

/**
 * Diferencia los textos aplicados contra los nuevos. `files` son los sucios
 * (los que se acaban de escribir); el rectángulo sale de lo geométrico que
 * cambió de verdad (uniones de las cajas afectadas, con holgura).
 */
export function diffApplied(oldTexts: Partial<Record<FileId, string>>, newTexts: Partial<Record<FileId, string>>): HotDiff {
  const files: FileId[] = [];
  let rect: HotDiff['rect'] = null;
  for (const f of Object.keys(newTexts) as FileId[]) {
    const before = oldTexts[f];
    const after = newTexts[f];
    if (before === after || after === undefined) continue;
    files.push(f);
    if (!GEOMETRY_FILES.includes(f) || before === undefined) continue;
    let oldJson: Dot;
    let newJson: Dot;
    try {
      oldJson = JSON.parse(before) as Dot;
      newJson = JSON.parse(after) as Dot;
    } catch {
      return { files, rect: { x0: -1e9, z0: -1e9, x1: 1e9, z1: 1e9 } };
    }
    const changed = changedGeometry(f, oldJson, newJson);
    if (changed.length === 0) continue;
    // El margen cubre las páginas vecinas que estampan troncos en ésta y el
    // halo de las mallas nuevas que aún no estaban donde había que mirar.
    rect = unionRect(rect, boundsOf(changed, 12));
  }
  return { files, rect };
}
