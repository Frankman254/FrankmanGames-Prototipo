// Todas las mediciones que alimentan el informe, agregadas en tablas de números.
// `measure(data)` corre la batería entera sobre unos datos (los de `data/` o
// una copia con ajustes) y devuelve un `Measurement` que `report.ts` convierte en texto.
import type { GameData } from '../../src/data';
import { xpToNext } from '../../src/rpg/progression';
import { farmRun, fishRun, priceList, type FarmResult, type FishResult, type PriceRow } from './economy';
import { emptyRarities, mean, median, type RarityCount } from './metrics';
import { runScenario, SCENARIOS, SKILL_IDS, type PrepId, type RunResult, type ScenarioDef, type SkillId } from './scenarios';

export interface BatteryOptions {
  /** Semillas por combinación de la batería principal. */
  seeds: number;
  /** Semillas de las ablaciones y escaleras. */
  sideSeeds: number;
  /** Minutos de cada granja y semillas por clase y habilidad. */
  farmMinutes: number;
  farmSeeds: number;
  fishMinutes: number;
  /** Partes que se pueden saltar (ajustes propuestos rápidos). */
  skip?: { ablation?: boolean; ladder?: boolean };
}

export const FULL: BatteryOptions = { seeds: 12, sideSeeds: 8, farmMinutes: 60, farmSeeds: 2, fishMinutes: 30 };
/** Batería reducida para comparar cada ajuste por separado. */
export const QUICK: BatteryOptions = { seeds: 4, sideSeeds: 3, farmMinutes: 30, farmSeeds: 1, fishMinutes: 10, skip: { ablation: true } };

export interface Agg {
  scenario: string;
  classId: string;
  skill: SkillId;
  prep: PrepId;
  n: number;
  winRate: number;
  deathRate: number;
  /** Mediana de segundos de las victorias. */
  ttk: number;
  dps: number;
  petDps: number;
  taken: number;
  /** Vida perdida de verdad (tras escudos) por partida. */
  lost: number;
  /** Fracción de decisiones con un hechizo listo que no se podía pagar. */
  starved: number;
  /** Golpes recibidos / avisos que le apuntaban. */
  hitRate: number;
  potions: number;
  tonics: number;
  /** Recurso medio en combate (fracción) y % del combate con el recurso lleno. */
  resource: number;
  resourceFull: number;
  xpPerMin: number;
  goldPerMin: number;
  casts: Record<string, number>;
  damageBy: Record<string, number>;
  drops: RarityCount;
  minutes: number;
}

export function aggregate(rs: RunResult[]): Agg {
  const r0 = rs[0]!;
  const wins = rs.filter((r) => r.win);
  const secs = rs.reduce((a, r) => a + r.seconds, 0);
  const sum = (f: (r: RunResult) => number): number => rs.reduce((a, r) => a + f(r), 0);
  const casts: Record<string, number> = {};
  const damageBy: Record<string, number> = {};
  const drops = emptyRarities();
  for (const r of rs) {
    for (const [k, v] of Object.entries(r.tally.casts)) casts[k] = (casts[k] ?? 0) + v;
    for (const [k, v] of Object.entries(r.tally.damageBy)) damageBy[k] = (damageBy[k] ?? 0) + v;
    for (const k of Object.keys(drops) as (keyof RarityCount)[]) drops[k] += r.tally.drops[k];
  }
  const combat = sum((r) => r.tally.combatSeconds);
  const threats = sum((r) => r.threats);
  return {
    scenario: r0.scenario,
    classId: r0.classId,
    skill: r0.skill,
    prep: r0.prep,
    n: rs.length,
    winRate: wins.length / rs.length,
    deathRate: rs.filter((r) => r.died).length / rs.length,
    ttk: median(wins.map((r) => r.seconds)),
    dps: sum((r) => r.tally.dealt) / Math.max(1e-9, secs),
    petDps: sum((r) => r.tally.petDealt) / Math.max(1e-9, secs),
    taken: mean(rs.map((r) => r.tally.taken)),
    lost: mean(rs.map((r) => r.tally.healthLost)),
    starved: mean(rs.map((r) => r.starved)),
    hitRate: threats > 0 ? sum((r) => r.tally.hitsTaken) / threats : 0,
    potions: mean(rs.map((r) => r.potions)),
    tonics: mean(rs.map((r) => r.tonics)),
    resource: combat > 0 ? sum((r) => r.tally.resourceSum) / combat : 1,
    resourceFull: combat > 0 ? sum((r) => r.tally.resourceFullSeconds) / combat : 0,
    xpPerMin: (sum((r) => r.tally.xp) / Math.max(1e-9, secs)) * 60,
    goldPerMin: (sum((r) => r.gold) / Math.max(1e-9, secs)) * 60,
    casts,
    damageBy,
    drops,
    minutes: secs / 60,
  };
}

function seeds(n: number, offset = 0): number[] {
  return Array.from({ length: n }, (_, i) => 1 + offset + i);
}

// ─── Ablaciones de la barra ────────────────────────────────────────────────

/** Escenarios que se repiten en las ablaciones: uno de cada tipo y dificultad media-alta. */
export const ABLATION_SCENARIOS = ['arena', 'lobos8', 'goblins6', 'chaman3', 'alfa6', 'dobleAlfa'];

export interface AblationRow {
  classId: string;
  /** "base", "-<id>" (hueco vacío) o "<universal> por <id>". */
  variant: string;
  removed: string | null;
  added: string | null;
  winRate: number;
  ttk: number;
  /** Vida perdida media por partida. */
  lost: number;
  potions: number;
}

function universalSpells(data: GameData): string[] {
  return Object.values(data.rpg.spells)
    .filter((s) => s.classId === null)
    .map((s) => s.id);
}

function ablationRun(data: GameData, classId: string, bar: (string | null)[], n: number): Omit<AblationRow, 'classId' | 'variant' | 'removed' | 'added'> {
  const rs: RunResult[] = [];
  const ttkRatios: number[] = [];
  for (const id of ABLATION_SCENARIOS) {
    const scenario = SCENARIOS.find((s) => s.id === id)!;
    for (const seed of seeds(n, 100)) rs.push(runScenario(data, { scenario, classId, skill: 'medio', prep: 'inicial', seed, hotbar: bar }));
  }
  for (const r of rs) ttkRatios.push(r.win ? r.seconds : r.seconds * 2);
  return { winRate: rs.filter((r) => r.win).length / rs.length, ttk: mean(ttkRatios), lost: mean(rs.map((r) => r.tally.healthLost)), potions: mean(rs.map((r) => r.potions)) };
}

export function ablations(data: GameData, n: number): AblationRow[] {
  const out: AblationRow[] = [];
  for (const cls of Object.values(data.rpg.classes)) {
    const bar = [...cls.startingHotbar];
    out.push({ classId: cls.id, variant: 'base', removed: null, added: null, ...ablationRun(data, cls.id, bar, n) });
    bar.forEach((id, i) => {
      if (!id) return;
      const b = [...bar];
      b[i] = null;
      out.push({ classId: cls.id, variant: `-${id}`, removed: id, added: null, ...ablationRun(data, cls.id, b, n) });
    });
    // Cada universal en el hueco del hechizo que menos se nota al quitarlo.
    const rows = out.filter((r) => r.classId === cls.id && r.removed);
    const weakest = rows.reduce((a, r) => (r.ttk < a.ttk ? r : a), rows[0]!).removed!;
    for (const u of universalSpells(data)) {
      const b = bar.map((x) => (x === weakest ? u : x));
      out.push({ classId: cls.id, variant: `${u} por ${weakest}`, removed: weakest, added: u, ...ablationRun(data, cls.id, b, n) });
    }
  }
  return out;
}

// ─── Escaleras de dificultad ───────────────────────────────────────────────

export const LADDERS: { id: string; label: string; archetype: string; sizes: number[] }[] = [
  { id: 'lobos', label: 'lobos', archetype: 'melee', sizes: [8, 12, 16, 20, 25, 30, 40] },
  { id: 'goblins', label: 'goblins', archetype: 'ranged', sizes: [6, 9, 12, 16, 20, 25, 30] },
];

export interface LadderRow {
  ladder: string;
  classId: string;
  skill: SkillId;
  prep: PrepId;
  /** Victorias por tamaño de grupo. */
  winRate: Record<number, number>;
  /** Mayor tamaño con ≥ 50 % de victorias (0 = ninguno). */
  maxSize: number;
}

export function ladders(data: GameData, n: number): LadderRow[] {
  const out: LadderRow[] = [];
  for (const L of LADDERS) {
    for (const classId of Object.keys(data.rpg.classes)) {
      for (const prep of ['inicial', 'preparado'] as PrepId[]) {
        for (const skill of SKILL_IDS) {
          const winRate: Record<number, number> = {};
          let maxSize = 0;
          for (const size of L.sizes) {
            const scenario: ScenarioDef = { id: `${L.id}${size}`, label: `${size} ${L.label}`, kind: 'grupo', spawns: [{ archetype: L.archetype, count: size }], limit: 240 };
            const rs = seeds(n, 200).map((seed) => runScenario(data, { scenario, classId, skill, prep, seed }));
            winRate[size] = rs.filter((r) => r.win).length / rs.length;
            if (winRate[size]! >= 0.5) maxSize = size;
          }
          out.push({ ladder: L.id, classId, skill, prep, winRate, maxSize });
        }
      }
    }
  }
  return out;
}

// ─── Todo junto ────────────────────────────────────────────────────────────

export interface Measurement {
  options: BatteryOptions;
  battery: Agg[];
  ablation: AblationRow[];
  ladder: LadderRow[];
  farms: FarmResult[];
  fish: FishResult[];
  prices: PriceRow[];
  /** XP para pasar de cada nivel al siguiente (índice = nivel). */
  xpCurve: number[];
  runs: number;
  seconds: number;
}

export function measure(data: GameData, opts: BatteryOptions, log: (s: string) => void = () => {}): Measurement {
  const t0 = performance.now();
  let runs = 0;
  const battery: Agg[] = [];
  for (const scenario of SCENARIOS) {
    for (const classId of Object.keys(data.rpg.classes)) {
      for (const prep of ['inicial', 'preparado'] as PrepId[]) {
        for (const skill of SKILL_IDS) {
          const rs = seeds(opts.seeds).map((seed) => runScenario(data, { scenario, classId, skill, prep, seed }));
          runs += rs.length;
          battery.push(aggregate(rs));
        }
      }
    }
  }
  log(`  batería: ${runs} partidas`);
  const ablation = opts.skip?.ablation ? [] : ablations(data, opts.sideSeeds);
  log(`  ablaciones: ${ablation.length} variantes`);
  const ladder = opts.skip?.ladder ? [] : ladders(data, opts.sideSeeds);
  log(`  escaleras: ${ladder.length} filas`);
  const farms: FarmResult[] = [];
  for (const classId of Object.keys(data.rpg.classes)) {
    for (const skill of SKILL_IDS) for (const seed of seeds(opts.farmSeeds)) farms.push(farmRun(data, classId, skill, seed, opts.farmMinutes));
  }
  log(`  granjas: ${farms.length}`);
  const fish: FishResult[] = [];
  for (const react of [0.5, 0.8, 0.95]) for (const seed of seeds(3)) fish.push(fishRun(data, react, seed, opts.fishMinutes));
  const p = data.rpg.progression;
  const xpCurve = Array.from({ length: p.maxLevel + 1 }, (_, l) => (l === 0 ? 0 : xpToNext(p, l)));
  return { options: opts, battery, ablation, ladder, farms, fish, prices: priceList(data), xpCurve, runs, seconds: (performance.now() - t0) / 1000 };
}
