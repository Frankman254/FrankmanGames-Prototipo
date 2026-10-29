// Pila de estadísticas: suma modificadores por fuente (clase, nivel, puntos,
// objetos, set, estados, mascota) y da el desglose para la hoja de personaje.
// valor = (Σ flat) · (1 + Σ percent / 100). Las reglas derivadas (p. ej.
// vitalidad → vida máxima) se calculan a partir de las primarias, sin ciclos.
import { ELEMENTS, PRIMARY_STATS, type PrimaryStat, type StatBlock, type StatId, type StatLine, type StatModifier } from './contracts';

export type Mod = Omit<StatModifier, 'source'>;

/** Regla derivada: cada punto de `from` da `per` de `to` (PROPUESTA, en datos). */
export interface DerivedRule {
  from: PrimaryStat;
  to: StatId;
  op: 'flat' | 'percent';
  per: number;
}

/** Orden de la hoja de personaje; los `damage.*` y `resist.*` se añaden si no son 0. */
export const SHEET_ORDER: StatId[] = [
  ...PRIMARY_STATS,
  'maxHealth',
  'maxResource',
  'healthRegen',
  'resourceRegen',
  'power',
  'critChance',
  'critBonus',
  'armor',
  'moveSpeed',
  'cooldownReduction',
  'pickupRadius',
];

export const ELEMENT_STATS: StatId[] = [...ELEMENTS.map((e) => `damage.${e}` as StatId), ...ELEMENTS.map((e) => `resist.${e}` as StatId)];

const isPrimary = (s: StatId): s is PrimaryStat => (PRIMARY_STATS as readonly string[]).includes(s);

export function blockToMods(b: StatBlock): Mod[] {
  const out: Mod[] = [];
  for (const [stat, value] of Object.entries(b)) if (value !== undefined && value !== 0) out.push({ stat: stat as StatId, op: 'flat', value });
  return out;
}

export class StatSheet {
  private readonly sources = new Map<string, Mod[]>();
  private cache = new Map<StatId, number>();
  /** Sube con cada cambio: quien cachee algo derivado puede comparar. */
  version = 0;

  constructor(readonly rules: readonly DerivedRule[] = []) {}

  /** Sustituye todos los modificadores de una fuente (lista vacía = quitarla). */
  set(source: string, mods: readonly Mod[]): void {
    if (mods.length === 0) {
      if (!this.sources.delete(source)) return;
    } else {
      this.sources.set(source, mods.map((m) => ({ stat: m.stat, op: m.op, value: m.value })));
    }
    this.touch();
  }

  remove(source: string): void {
    this.set(source, []);
  }

  /** Quita todas las fuentes que empiezan por `prefix` (p. ej. "item:"). */
  removePrefix(prefix: string): void {
    let changed = false;
    for (const k of [...this.sources.keys()]) {
      if (k.startsWith(prefix)) {
        this.sources.delete(k);
        changed = true;
      }
    }
    if (changed) this.touch();
  }

  has(source: string): boolean {
    return this.sources.has(source);
  }

  sourceIds(): string[] {
    return [...this.sources.keys()];
  }

  private touch(): void {
    this.cache.clear();
    this.version++;
  }

  get(stat: StatId): number {
    const c = this.cache.get(stat);
    if (c !== undefined) return c;
    let flat = 0;
    let pct = 0;
    for (const e of this.entries(stat)) {
      if (e.op === 'flat') flat += e.value;
      else pct += e.value;
    }
    const v = flat * (1 + pct / 100);
    this.cache.set(stat, v);
    return v;
  }

  /** Modificadores que tocan `stat`, con su fuente (las derivadas como "derived:<primaria>"). */
  private entries(stat: StatId): { source: string; op: 'flat' | 'percent'; value: number }[] {
    const out: { source: string; op: 'flat' | 'percent'; value: number }[] = [];
    for (const [source, mods] of this.sources) for (const m of mods) if (m.stat === stat) out.push({ source, op: m.op, value: m.value });
    if (!isPrimary(stat)) {
      for (const r of this.rules) {
        if (r.to !== stat) continue;
        const v = this.get(r.from) * r.per;
        if (v !== 0) out.push({ source: `derived:${r.from}`, op: r.op, value: v });
      }
    }
    return out;
  }

  line(stat: StatId): StatLine {
    return { stat, value: this.get(stat), breakdown: this.entries(stat) };
  }

  /** Hoja completa para la interfaz. */
  lines(): StatLine[] {
    const out = SHEET_ORDER.map((s) => this.line(s));
    for (const s of ELEMENT_STATS) if (this.get(s) !== 0) out.push(this.line(s));
    return out;
  }

  clone(): StatSheet {
    const c = new StatSheet(this.rules);
    for (const [k, v] of this.sources) c.sources.set(k, v.map((m) => ({ ...m })));
    return c;
  }
}
