// Oficios: nivel propio de cada uno, recetas y calidad de lo fabricado. Puro:
// sin DOM. El minijuego sólo puede mejorar las tiradas; fallarlo da el resultado
// normal y nunca destruye materiales. Las cifras son PROPUESTA (professions.json).
import type { ItemDef, ItemInstance } from './contracts';

export interface ProfessionDef {
  id: string;
  name: string;
  icon: string;
  verb: string;
  description: string;
}

export interface GatherNodeDef {
  id: string;
  name: string;
  profession: string;
  level: number;
  xp: number;
  itemId: string;
  min: number;
  max: number;
  gatherSeconds: number;
  respawnSeconds: number;
  shape: 'tree' | 'rock' | 'plant';
  color: string;
}

export interface StationDef {
  id: string;
  name: string;
  profession: string;
  x: number;
  y: number;
  shape: 'anvil' | 'loom' | 'still';
}

export interface RecipeDef {
  id: string;
  profession: string;
  level: number;
  station: string;
  xp: number;
  output: string;
  inputs: { itemId: string; quantity: number }[];
}

export interface ProfessionRules {
  maxLevel: number;
  xp: { base: number; exponent: number };
  gatherRange: number;
  stationRange: number;
  fishingXp: number;
  minigame: { rounds: number; needleSpeed: number; bandHalfWidth: number; maxRollShift: number };
}

export interface ProfessionsDef {
  rules: ProfessionRules;
  professions: Record<string, ProfessionDef>;
  nodes: Record<string, GatherNodeDef>;
  groves: { node: string; x: number; y: number; radius: number; count: number }[];
  stations: Record<string, StationDef>;
  recipes: Record<string, RecipeDef>;
}

export type ProfessionSave = Record<string, { level: number; xp: number }>;

export interface ProfessionView {
  id: string;
  name: string;
  icon: string;
  description: string;
  level: number;
  xp: number;
  /** Experiencia para el siguiente nivel; 0 en el nivel máximo. */
  xpToNext: number;
}

export function professionXpToNext(rules: ProfessionRules, level: number): number {
  if (level >= rules.maxLevel) return 0;
  return Math.round(rules.xp.base * Math.pow(level, rules.xp.exponent));
}

export class ProfessionLog {
  private readonly state = new Map<string, { level: number; xp: number }>();

  /** Modo edición: `professions.json` cambia en caliente; el registro conserva la referencia. */
  def: ProfessionsDef;

  constructor(def: ProfessionsDef, save?: ProfessionSave) {
    this.def = def;
    for (const id of Object.keys(def.professions)) {
      const s = save?.[id];
      const level = Math.max(1, Math.min(def.rules.maxLevel, Math.floor(s?.level ?? 1)));
      this.state.set(id, { level, xp: level >= def.rules.maxLevel ? 0 : Math.max(0, s?.xp ?? 0) });
    }
  }

  level(id: string): number {
    return this.state.get(id)?.level ?? 1;
  }

  /** Suma experiencia; devuelve los niveles ganados. */
  gain(id: string, xp: number): number {
    const s = this.state.get(id);
    if (!s || xp <= 0 || s.level >= this.def.rules.maxLevel) return 0;
    s.xp += xp;
    let gained = 0;
    for (let need = professionXpToNext(this.def.rules, s.level); need > 0 && s.xp >= need; need = professionXpToNext(this.def.rules, s.level)) {
      s.xp -= need;
      s.level++;
      gained++;
    }
    if (s.level >= this.def.rules.maxLevel) s.xp = 0;
    return gained;
  }

  view(): ProfessionView[] {
    return Object.values(this.def.professions).map((p) => {
      const s = this.state.get(p.id)!;
      return { id: p.id, name: p.name, icon: p.icon, description: p.description, level: s.level, xp: s.xp, xpToNext: professionXpToNext(this.def.rules, s.level) };
    });
  }

  toSave(): ProfessionSave {
    return Object.fromEntries([...this.state].map(([id, s]) => [id, { ...s }]));
  }
}

/** Precisión de un golpe (0–1): 1 en el centro de la banda, 0 fuera de ella. */
export function strikeScore(needle: number, center: number, halfWidth: number): number {
  return Math.max(0, 1 - Math.abs(needle - center) / halfWidth);
}

/** Aguja que va y viene por la barra (0–1) con el tiempo. */
export function needleAt(seconds: number, speed: number): number {
  const t = (seconds * speed) % 2;
  return t <= 1 ? t : 2 - t;
}

/** Acerca las tiradas a su máximo según la calidad (0–1). Con 0 no cambia nada. */
export function applyCraftQuality(def: ItemDef, inst: ItemInstance, quality: number, maxShift: number): void {
  const k = Math.max(0, Math.min(1, quality)) * maxShift;
  inst.rolled.forEach((m, i) => {
    const roll = def.rolls[i];
    if (!roll || k <= 0) return;
    const v = m.value + (roll.max - m.value) * k;
    m.value = Number.isInteger(roll.min) && Number.isInteger(roll.max) ? Math.round(v) : Math.round(v * 100) / 100;
  });
}
