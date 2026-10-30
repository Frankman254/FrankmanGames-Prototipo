// Energía del personaje («Pulso», `data/rpg/energy.json`). Cada muerte resta
// una parte; a 0 el personaje queda agotado y sufre la penalización hasta
// recuperar `penalty.clearAt`. Lógica pura: la sesión la avanza y aplica la
// penalización a la hoja de estadísticas.
import type { EnergySaveData, EnergyView } from './contracts';
import type { Mod } from './stats';

export interface EnergyDef {
  id: string;
  name: string;
  description: string;
  color: string;
  max: number;
  start: number;
  deathCost: number;
  regenPerMinute: number;
  rest: { radius: number; perSecond: number };
  /** Consumibles que la devuelven: id de objeto → puntos. */
  items: Record<string, number>;
  penalty: { mode: 'weakened'; name: string; description: string; clearAt: number; modifiers: Mod[] };
}

/** Lo que pasó al caer (pantalla de muerte). */
export interface EnergyDeathReport {
  lost: number;
  value: number;
  max: number;
  /** Agotado tras esta muerte. */
  exhausted: boolean;
  /** Esta muerte lo dejó agotado (antes no lo estaba). */
  justExhausted: boolean;
}

/** Fuente de la penalización en la hoja de estadísticas. */
export const ENERGY_SOURCE = 'energy';

export class Energy {
  value: number;
  exhausted: boolean;

  constructor(readonly def: EnergyDef, save?: EnergySaveData) {
    this.value = clamp(save?.value ?? def.start, 0, def.max);
    // Un guardado a 0 está agotado aunque no lo diga; uno por encima de clearAt ya no.
    this.exhausted = this.value <= 0 || ((save?.exhausted ?? false) && this.value < def.penalty.clearAt);
  }

  /** Resta el coste de una muerte. */
  die(): EnergyDeathReport {
    const before = this.value;
    const was = this.exhausted;
    this.value = Math.max(0, this.value - this.def.deathCost);
    if (this.value <= 0) this.exhausted = true;
    return { lost: before - this.value, value: this.value, max: this.def.max, exhausted: this.exhausted, justExhausted: this.exhausted && !was };
  }

  /** Suma puntos (tiempo, descanso, consumibles). Devuelve lo que subió de verdad. */
  gain(amount: number): number {
    if (!(amount > 0)) return 0;
    const before = this.value;
    this.value = Math.min(this.def.max, this.value + amount);
    if (this.exhausted && this.value >= this.def.penalty.clearAt) this.exhausted = false;
    return this.value - before;
  }

  /** Recuperación con el paso del tiempo (sólo con vida; lo decide quien llama). */
  tick(dt: number): number {
    return this.gain((this.def.regenPerMinute / 60) * dt);
  }

  /** Descanso junto a una piedra de viaje. */
  rest(dt: number): number {
    return this.gain(this.def.rest.perSecond * dt);
  }

  /** Puntos que devuelve un objeto, o 0 si no es un consumible de energía. */
  itemAmount(itemId: string): number {
    return this.def.items[itemId] ?? 0;
  }

  /** Modificadores de la penalización vigente (vacío si no está agotado). */
  penaltyMods(): Mod[] {
    return this.exhausted ? this.def.penalty.modifiers : [];
  }

  view(): EnergyView {
    const d = this.def;
    return {
      id: d.id,
      name: d.name,
      description: d.description,
      color: d.color,
      value: Math.floor(this.value),
      max: d.max,
      exhausted: this.exhausted,
      penalty: this.exhausted ? { name: d.penalty.name, description: d.penalty.description, clearAt: d.penalty.clearAt } : null,
    };
  }

  toSave(): EnergySaveData {
    return { value: Math.round(this.value * 100) / 100, exhausted: this.exhausted };
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : hi;
}
