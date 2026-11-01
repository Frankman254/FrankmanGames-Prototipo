import type { Vec2 } from './vec2';

export interface LabRules {
  cadence: { enabled: boolean; maximum: number; regeneration: number; basicCost: number; strongCost: number };
  impetus: { enabled: boolean; maximum: number; regeneration: number; dashCost: number; teleportCost: number; swapCost: number };
  positioning: { enabled: boolean; flankBonus: number; alignmentBonus: number; separationBonus: number; alignmentTolerance: number; separationDistance: number };
}

export interface LabEconomy { cadence: number; impetus: number }
export type MobilityKind = 'walk' | 'dash' | 'teleport' | 'swap';

export const createLabEconomy = (rules: LabRules): LabEconomy => ({ cadence: rules.cadence.maximum, impetus: rules.impetus.maximum });

export function tickLabEconomy(state: LabEconomy, rules: LabRules, dt: number): void {
  state.cadence = Math.min(rules.cadence.maximum, state.cadence + Math.max(0, dt) * rules.cadence.regeneration);
  state.impetus = Math.min(rules.impetus.maximum, state.impetus + Math.max(0, dt) * rules.impetus.regeneration);
}

export function spendCadence(state: LabEconomy, rules: LabRules, strong: boolean): boolean {
  if (!rules.cadence.enabled) return true;
  const cost = strong ? rules.cadence.strongCost : rules.cadence.basicCost;
  if (state.cadence + 1e-9 < cost) return false;
  state.cadence -= cost;
  return true;
}

export function spendImpetus(state: LabEconomy, rules: LabRules, kind: MobilityKind): boolean {
  if (!rules.impetus.enabled || kind === 'walk') return true;
  const cost = kind === 'dash' ? rules.impetus.dashCost : kind === 'teleport' ? rules.impetus.teleportCost : rules.impetus.swapCost;
  if (state.impetus + 1e-9 < cost) return false;
  state.impetus -= cost;
  return true;
}

const normalized = (from: Vec2, to: Vec2): Vec2 => {
  const x = to.x - from.x;
  const y = to.y - from.y;
  const d = Math.hypot(x, y) || 1;
  return { x: x / d, y: y / d };
};

/** Multiplicador acumulable y legible: flanco, alineación y separación. */
export function positioningMultiplier(attacker: Vec2, target: Vec2, targetFacing: Vec2, ally: Vec2 | null, rules: LabRules): number {
  if (!rules.positioning.enabled) return 1;
  const attackDir = normalized(target, attacker);
  const facingLength = Math.hypot(targetFacing.x, targetFacing.y) || 1;
  const facing = { x: targetFacing.x / facingLength, y: targetFacing.y / facingLength };
  let bonus = 0;
  if (attackDir.x * facing.x + attackDir.y * facing.y < -0.5) bonus += rules.positioning.flankBonus;
  if (ally) {
    const allyDir = normalized(target, ally);
    if (Math.abs(attackDir.x * allyDir.y - attackDir.y * allyDir.x) <= rules.positioning.alignmentTolerance) bonus += rules.positioning.alignmentBonus;
    if (Math.hypot(attacker.x - ally.x, attacker.y - ally.y) >= rules.positioning.separationDistance) bonus += rules.positioning.separationBonus;
  }
  return 1 + bonus;
}

export const DEFAULT_LAB_RULES: LabRules = {
  cadence: { enabled: true, maximum: 100, regeneration: 18, basicCost: 12, strongCost: 35 },
  impetus: { enabled: true, maximum: 60, regeneration: 9, dashCost: 18, teleportCost: 28, swapCost: 24 },
  positioning: { enabled: true, flankBonus: 0.15, alignmentBonus: 0.1, separationBonus: 0.12, alignmentTolerance: 0.12, separationDistance: 8 },
};

