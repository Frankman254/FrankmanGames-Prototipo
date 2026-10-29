// Libro de hechizos (conocidos con rango + barra) y hechizos «compilados»: la
// definición con el rango aplicado y sus efectos ya instanciados.
// Cualquier clase puede equipar cualquier hechizo que conozca (PROPUESTA).
import type { AreaDef, ContentDb, SpellDef } from './contracts';
import type { RpgContent } from './content';
import { createEffect, type Effect } from './effects';

export type LearnResult = { kind: 'learned' } | { kind: 'rankUp'; rank: number } | { kind: 'maxed' };

export class Spellbook {
  readonly known = new Map<string, number>();
  readonly hotbar: (string | null)[];

  constructor(private readonly content: ContentDb, hotbarSize: number) {
    this.hotbar = new Array<string | null>(hotbarSize).fill(null);
  }

  rank(spellId: string): number {
    return this.known.get(spellId) ?? 0;
  }

  /** Aprende (rango 1, y a la barra si hay hueco) o sube un rango. */
  learn(spellId: string): LearnResult {
    const def = this.content.spells[spellId];
    if (!def) throw new Error(`hechizo desconocido: ${spellId}`);
    const r = this.rank(spellId);
    if (r >= def.maxRank) return { kind: 'maxed' };
    if (r > 0) {
      this.known.set(spellId, r + 1);
      return { kind: 'rankUp', rank: r + 1 };
    }
    this.known.set(spellId, 1);
    const free = this.hotbar.indexOf(null);
    if (free >= 0 && !this.hotbar.includes(spellId)) this.hotbar[free] = spellId;
    return { kind: 'learned' };
  }

  /**
   * Pone un hechizo conocido en un hueco (null = vaciar). Si ya estaba en otro
   * hueco, intercambia los dos.
   */
  assign(index: number, spellId: string | null): string | null {
    if (index < 0 || index >= this.hotbar.length) return 'Hueco fuera de la barra';
    if (spellId !== null && !this.known.has(spellId)) return 'Hechizo no aprendido';
    const prev = this.hotbar[index] ?? null;
    if (spellId !== null) {
      const at = this.hotbar.indexOf(spellId);
      if (at >= 0 && at !== index) this.hotbar[at] = prev;
    }
    this.hotbar[index] = spellId;
    return null;
  }

  view(): { known: { spellId: string; rank: number }[]; hotbar: (string | null)[] } {
    return { known: [...this.known].map(([spellId, rank]) => ({ spellId, rank })), hotbar: [...this.hotbar] };
  }
}

/** Hechizo listo para lanzar con su rango. */
export interface CompiledSpell {
  id: string;
  name: string;
  /** null = ataque básico del arma. */
  def: SpellDef | null;
  rank: number;
  cost: number;
  cooldown: number;
  globalCooldown: number;
  castTime: number;
  range: number;
  area: AreaDef;
  projectileSpeed: number | null;
  critChance: number;
  critBonus: number;
  /** Multiplicador de los números de los efectos por el rango. */
  power: number;
  effects: Effect[];
}

/** Por rango sobre 1: +effectPercent % de efecto y −costPercent % de coste. */
export function compileSpell(content: RpgContent, def: SpellDef, rank: number): CompiledSpell {
  const extra = Math.max(0, rank - 1);
  return {
    id: def.id,
    name: def.name,
    def,
    rank,
    cost: Math.max(0, Math.round(def.resourceCost * (1 - (def.perRank.costPercent * extra) / 100))),
    cooldown: def.cooldown,
    globalCooldown: def.globalCooldown,
    castTime: def.castTime,
    range: def.range,
    area: def.area,
    projectileSpeed: def.projectileSpeed,
    critChance: def.critChance,
    critBonus: def.critBonus,
    power: 1 + (def.perRank.effectPercent * extra) / 100,
    effects: def.effects.map((e) => createEffect(e, content)),
  };
}
