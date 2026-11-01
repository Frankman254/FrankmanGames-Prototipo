export interface BossPhaseDef {
  id: string;
  enterAtHealth: number;
  immuneWhileSummons?: boolean;
  mechanics: Array<'arena-shift' | 'summons' | 'pillar-ray' | 'enrage'>;
}

export interface BossDef {
  id: string;
  enrageSeconds: number;
  phases: BossPhaseDef[];
  firstKillReward: string;
}

export interface BossState {
  phaseIndex: number;
  elapsed: number;
  enraged: boolean;
  summonsAlive: number;
  firstKill: boolean;
}

export type BossEvent =
  | { type: 'phase'; phase: string; requestCameraPauseMs: number }
  | { type: 'enrage' }
  | { type: 'immunity'; active: boolean }
  | { type: 'first-kill-reward'; itemId: string };

export function validateBossDef(def: BossDef): void {
  if (def.phases.length !== 3) throw new Error('el jefe necesita exactamente tres fases');
  if (def.phases[0]?.enterAtHealth !== 1) throw new Error('la primera fase debe empezar con 100% de vida');
  for (let i = 1; i < def.phases.length; i++) if (def.phases[i]!.enterAtHealth >= def.phases[i - 1]!.enterAtHealth) throw new Error('los umbrales de fase deben descender');
  if (def.enrageSeconds <= 0) throw new Error('enrageSeconds debe ser positivo');
}

export function createBossState(firstKill: boolean): BossState {
  return { phaseIndex: 0, elapsed: 0, enraged: false, summonsAlive: 0, firstKill };
}

export function bossIsImmune(def: BossDef, state: BossState): boolean {
  return !!def.phases[state.phaseIndex]?.immuneWhileSummons && state.summonsAlive > 0;
}

export function updateBoss(
  def: BossDef,
  state: BossState,
  dt: number,
  healthFraction: number,
  summonsAlive = state.summonsAlive,
): { state: BossState; events: BossEvent[] } {
  const events: BossEvent[] = [];
  const wasImmune = bossIsImmune(def, state);
  const next = { ...state, elapsed: state.elapsed + Math.max(0, dt), summonsAlive: Math.max(0, Math.floor(summonsAlive)) };
  let phase = next.phaseIndex;
  while (phase + 1 < def.phases.length && healthFraction <= def.phases[phase + 1]!.enterAtHealth) phase++;
  if (phase !== next.phaseIndex) {
    next.phaseIndex = phase;
    events.push({ type: 'phase', phase: def.phases[phase]!.id, requestCameraPauseMs: 850 });
  }
  if (!next.enraged && next.elapsed >= def.enrageSeconds) {
    next.enraged = true;
    events.push({ type: 'enrage' });
  }
  const immune = bossIsImmune(def, next);
  if (immune !== wasImmune) events.push({ type: 'immunity', active: immune });
  return { state: next, events };
}

export function completeBoss(def: BossDef, state: BossState): BossEvent[] {
  return state.firstKill ? [{ type: 'first-kill-reward', itemId: def.firstKillReward }] : [];
}
