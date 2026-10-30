// Cifras clave de una medición: las que usan las conclusiones del informe y
// la comparación «actual frente a ajustes». Todo se deriva de `Measurement`.
import type { GameData } from '../../src/data';
import { addXp } from '../../src/rpg/progression';
import type { Agg, AblationRow, Measurement } from './battery';
import { mean } from './metrics';
import { SKILL_IDS, type SkillId } from './scenarios';

export interface ClassKey {
  classId: string;
  /** Muertes medias en los escenarios de grupo y jefe (nivel 1, kit inicial). */
  deathRate: Record<SkillId, number>;
  /** Vida perdida media por partida, tras escudos (todos los escenarios, nivel 1). */
  lost: Record<SkillId, number>;
  /** Fracción de avisos que acaban en golpe. */
  hitRate: Record<SkillId, number>;
  /** Mayor grupo de lobos / goblins con ≥ 50 % de victorias, por habilidad (inicial) y preparado+malo. */
  ladderWolves: Record<SkillId, number>;
  ladderGoblins: Record<SkillId, number>;
  ladderWolvesPrepared: Record<SkillId, number>;
  /** Tiempo medio para matar (habilidad media, inicial) en grupos y jefes. */
  ttk: number;
  dps: number;
  petShare: number;
  resource: number;
  resourceFull: number;
  /** Fracción de decisiones con un hechizo listo que no se podía pagar. */
  starved: number;
  potions: number;
  /** Arena: victorias y segundos (medio). */
  arenaWin: Record<SkillId, number>;
  arenaTtk: number;
  /** Granja (habilidad media): minuto del nivel 5 y 10, nivel a los 30 y 60 min, muertes por hora. */
  farmLevel5: number;
  farmLevel10: number;
  farmLevelAt30: number;
  farmLevelAtEnd: number;
  farmDeathsPerHour: number;
  /** Oro por minuto de granja: monedas, ventas y neto (menos pociones compradas). */
  coinsPerMin: number;
  salesPerMin: number;
  netGoldPerMin: number;
  /** Botín por minuto de granja, por rareza. */
  dropsPerMin: Record<string, number>;
}

export interface SpellKey {
  classId: string;
  spellId: string;
  /** % de lanzamientos y de daño (habilidad media, inicial, todos los escenarios). */
  castShare: number;
  damageShare: number;
  castsPerMin: number;
  /** Ablación: cambio relativo de tiempo para matar y de vida perdida al quitarlo de la barra (y la vida perdida en puntos). */
  dTtk: number;
  dLost: number;
  dLostAbs: number;
  dWin: number;
  verdict: 'obligatorio' | 'importante' | 'prescindible' | 'normal';
}

export interface KeyMetrics {
  classes: ClassKey[];
  spells: SpellKey[];
  /** Universal en lugar del hechizo menos útil: cambio de daño recibido y de tiempo. */
  universals: { classId: string; spellId: string; replaces: string; dTtk: number; dLost: number; dLostAbs: number }[];
  /** XP del encuentro de la arena y niveles que da al primer paso desde nivel 1. */
  arenaXp: number;
  arenaLevelsFromOne: number;
  /** Pesca: oro por minuto según la reacción. */
  fishGoldPerMin: Record<string, number>;
  fishCatchPerMin: Record<string, number>;
  /** Precio más alto de la tienda y minutos de granja (media de clases) que cuesta. */
  maxPrice: number;
  maxPriceItem: string;
  maxPriceMinutes: number;
  /** Mediana de minutos de granja para comprar un objeto de la tienda. */
  medianPriceMinutes: number;
}

const group = (a: Agg): boolean => a.scenario !== 'arena';

function bySkill(f: (s: SkillId) => number): Record<SkillId, number> {
  return Object.fromEntries(SKILL_IDS.map((s) => [s, f(s)])) as Record<SkillId, number>;
}

function rel(a: number, b: number): number {
  return b > 0 ? a / b - 1 : 0;
}

/** Vida perdida (puntos por combate) por debajo de la cual un cambio relativo no cuenta. */
export const LOST_NOISE = 5;

/**
 * obligatorio: quitarlo baja las victorias ≥ 10 puntos o alarga el combate ≥ 15 %.
 * importante: alarga ≥ 5 % o sube la vida perdida ≥ 25 % (y ≥ LOST_NOISE puntos).
 * prescindible: < 6 % de los lanzamientos y quitarlo no cambia nada que se note.
 */
export function verdictOf(dTtk: number, dLost: number, dLostAbs: number, dWin: number, castShare: number): SpellKey['verdict'] {
  const lostMatters = dLostAbs >= LOST_NOISE;
  if (dWin <= -0.1 || dTtk >= 0.15) return 'obligatorio';
  if (dTtk >= 0.05 || (lostMatters && dLost >= 0.25)) return 'importante';
  if (dTtk <= 0.03 && (!lostMatters || dLost <= 0.12) && dWin >= -0.02 && castShare < 0.06) return 'prescindible';
  return 'normal';
}

export function keyMetrics(data: GameData, m: Measurement): KeyMetrics {
  const classes: ClassKey[] = [];
  const spells: SpellKey[] = [];
  const universals: KeyMetrics['universals'] = [];
  for (const classId of Object.keys(data.rpg.classes)) {
    const rows = m.battery.filter((a) => a.classId === classId && a.prep === 'inicial');
    const of = (s: SkillId) => rows.filter((a) => a.skill === s);
    const medio = of('medio');
    const medioGroup = medio.filter(group);
    const lad = (ladder: string, prep: string, s: SkillId) => m.ladder.find((l) => l.ladder === ladder && l.classId === classId && l.prep === prep && l.skill === s)?.maxSize ?? NaN;
    const farms = m.farms.filter((f) => f.classId === classId && f.skill === 'medio');
    const farmMin = farms.reduce((a, f) => a + f.minutes, 0);
    const checkpoint = (min: number) => mean(farms.map((f) => f.checkpoints.find((c) => c.minute === min)?.level ?? NaN));
    const dropsPerMin: Record<string, number> = {};
    for (const f of farms) for (const [r, n] of Object.entries(f.drops)) dropsPerMin[r] = (dropsPerMin[r] ?? 0) + n / Math.max(1, farmMin);
    const dealt = medioGroup.reduce((a, x) => a + x.dps * x.minutes, 0);
    const pet = medioGroup.reduce((a, x) => a + x.petDps * x.minutes, 0);
    const arena = (s: SkillId) => rows.find((a) => a.scenario === 'arena' && a.skill === s);
    classes.push({
      classId,
      deathRate: bySkill((s) => mean(of(s).filter(group).map((a) => a.deathRate))),
      lost: bySkill((s) => mean(of(s).map((a) => a.lost))),
      hitRate: bySkill((s) => mean(of(s).map((a) => a.hitRate))),
      ladderWolves: bySkill((s) => lad('lobos', 'inicial', s)),
      ladderGoblins: bySkill((s) => lad('goblins', 'inicial', s)),
      ladderWolvesPrepared: bySkill((s) => lad('lobos', 'preparado', s)),
      ttk: mean(medioGroup.map((a) => a.ttk).filter((x) => !Number.isNaN(x))),
      dps: mean(medioGroup.map((a) => a.dps)),
      petShare: dealt + pet > 0 ? pet / (dealt + pet) : 0,
      resource: mean(medio.map((a) => a.resource)),
      resourceFull: mean(medio.map((a) => a.resourceFull)),
      starved: mean(medio.map((a) => a.starved)),
      potions: mean(medio.map((a) => a.potions)),
      arenaWin: bySkill((s) => arena(s)?.winRate ?? NaN),
      arenaTtk: arena('medio')?.ttk ?? NaN,
      farmLevel5: mean(farms.map((f) => f.levelAt[5] ?? NaN)),
      farmLevel10: mean(farms.map((f) => f.levelAt[10] ?? NaN)),
      farmLevelAt30: checkpoint(30),
      farmLevelAtEnd: mean(farms.map((f) => f.finalLevel)),
      farmDeathsPerHour: (farms.reduce((a, f) => a + f.deaths, 0) / Math.max(1, farmMin)) * 60,
      coinsPerMin: farms.reduce((a, f) => a + f.coins, 0) / Math.max(1, farmMin),
      salesPerMin: farms.reduce((a, f) => a + f.sales, 0) / Math.max(1, farmMin),
      netGoldPerMin: farms.reduce((a, f) => a + f.coins + f.sales - f.potionSpend, 0) / Math.max(1, farmMin),
      dropsPerMin,
    });

    // Hechizos: uso y ablación.
    const casts: Record<string, number> = {};
    const dmg: Record<string, number> = {};
    let minutes = 0;
    for (const a of medio) {
      minutes += a.minutes;
      for (const [k, v] of Object.entries(a.casts)) casts[k] = (casts[k] ?? 0) + v;
      for (const [k, v] of Object.entries(a.damageBy)) dmg[k] = (dmg[k] ?? 0) + v;
    }
    const totalCasts = Object.values(casts).reduce((a, b) => a + b, 0);
    const totalDmg = Object.values(dmg).reduce((a, b) => a + b, 0);
    const abl = m.ablation.filter((r) => r.classId === classId);
    const base = abl.find((r) => r.variant === 'base');
    const bar = data.rpg.classes[classId]!.startingHotbar.filter((x): x is string => !!x);
    for (const spellId of ['basic', ...bar]) {
      const row: AblationRow | undefined = abl.find((r) => r.removed === spellId && r.added === null);
      const castShare = (casts[spellId] ?? 0) / Math.max(1, totalCasts);
      // El daño de los estados (quemadura) se reparte a quien los pone: aquí sólo el directo.
      const damageShare = (dmg[spellId] ?? 0) / Math.max(1, totalDmg);
      const dTtk = row && base ? rel(row.ttk, base.ttk) : NaN;
      const dLost = row && base ? rel(row.lost, base.lost) : NaN;
      const dLostAbs = row && base ? row.lost - base.lost : NaN;
      const dWin = row && base ? row.winRate - base.winRate : NaN;
      spells.push({
        classId,
        spellId,
        castShare,
        damageShare,
        castsPerMin: (casts[spellId] ?? 0) / Math.max(1e-9, minutes),
        dTtk,
        dLost,
        dLostAbs,
        dWin,
        verdict: row ? verdictOf(dTtk, dLost, dLostAbs, dWin, castShare) : 'normal',
      });
    }
    for (const r of abl.filter((x) => x.added)) {
      if (!base) continue;
      universals.push({ classId, spellId: r.added!, replaces: r.removed!, dTtk: rel(r.ttk, base.ttk), dLost: rel(r.lost, base.lost), dLostAbs: r.lost - base.lost });
    }
  }

  const arenaXp = data.encounter.spawns.reduce((a, s) => a + (data.rpg.enemies[s.archetype]?.xp ?? 0), 0);
  const arenaLevelsFromOne = addXp(data.rpg.progression, 1, 0, arenaXp).levelsGained;
  const fishGoldPerMin: Record<string, number> = {};
  const fishCatchPerMin: Record<string, number> = {};
  for (const react of [...new Set(m.fish.map((f) => f.react))]) {
    const fs = m.fish.filter((f) => f.react === react);
    const min = fs.reduce((a, f) => a + f.minutes, 0);
    fishGoldPerMin[String(react)] = fs.reduce((a, f) => a + f.gold, 0) / min;
    fishCatchPerMin[String(react)] = fs.reduce((a, f) => a + f.catches, 0) / min;
  }
  const income = mean(classes.map((c) => c.netGoldPerMin));
  const sorted = [...m.prices].sort((a, b) => b.price - a.price);
  const top = sorted[0];
  const minutesEach = m.prices.map((p) => p.price / Math.max(1e-9, income)).sort((a, b) => a - b);
  return {
    classes,
    spells,
    universals,
    arenaXp,
    arenaLevelsFromOne,
    fishGoldPerMin,
    fishCatchPerMin,
    maxPrice: top?.price ?? 0,
    maxPriceItem: top?.name ?? '-',
    maxPriceMinutes: (top?.price ?? 0) / Math.max(1e-9, income),
    medianPriceMinutes: minutesEach[minutesEach.length >> 1] ?? 0,
  };
}
