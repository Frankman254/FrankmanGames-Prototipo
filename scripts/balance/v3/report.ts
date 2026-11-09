import presetsJson from '../../../data/dev/presets.json';
import type { GameData } from '../../../src/data';
import { previewHit } from '../../../src/sim/damage';
import { Rng } from '../../../src/sim/rng';
import { rollLoot } from '../../../src/rpg/progression';
import { buildAcquisitionIndex, acquisitionSummary, obtainableSources } from './acquisition';
import {
  ACTION_VARIANTS,
  BRIZNAS_VARIANTS,
  MOBILITY_VARIANTS,
  PROGRESSION_VARIANTS,
  actionBudget,
  briznasCapacity,
  compareDoubleScaling,
  controlledDuration,
  cumulativeTierCost,
  mobilitySpeed,
  offensiveModel,
  progressionAt,
  xpToLevel,
} from './experiments';
import { buildProfile, generateProfiles, profileCoverage, type EquipmentTier } from './profiles';
import { runZoneWithSession, type ZoneRun } from '../zones';

export interface BaselineCombatRow extends ZoneRun {
  equipmentTier: EquipmentTier;
  maxHealth: number;
  maxResource: number;
  resourceRegen: number;
  moveSpeed: number;
  equipment: string[];
}

export interface V3Evidence {
  generatedAt: string;
  acquisition: ReturnType<typeof acquisitionSummary>;
  profiles: ReturnType<typeof profileCoverage>;
  visualPresets: { total: number; verified: number; experimental: number; issues: { id: string; issue: string }[] };
  combat: BaselineCombatRow[];
  loot: { rolls: number; itemRate: number; goldMean: number; byRarity: Record<string, number> };
}

const pct = (v: number): string => `${(v * 100).toFixed(0)} %`;
const n = (v: number, digits = 1): string => Number.isFinite(v) ? v.toFixed(digits) : '—';

function representativeZones(data: GameData) {
  const ids = ['azuero', 'chame', 'boquete', 'cerro_punta', 'baru', 'darien', 'bocas', 'perlas', 'fortuna', 'ancon'];
  return ids.map((id) => data.zones.zones.find((z) => z.id === id)).filter((z): z is NonNullable<typeof z> => !!z);
}

function auditVisualPresets(data: GameData, index: ReturnType<typeof buildAcquisitionIndex>): V3Evidence['visualPresets'] {
  const issues: { id: string; issue: string }[] = [];
  let verified = 0;
  let experimental = 0;
  for (const p of (presetsJson as any).presets as any[]) {
    const own: string[] = [];
    for (const e of Object.values(p.equipment ?? {}) as any[]) {
      const itemId = typeof e === 'string' ? e : e.itemId;
      const item = data.rpg.items[itemId];
      if (!item || obtainableSources(index, item, p.classId, p.level).length === 0) own.push(`${itemId}: sin ruta obtenible al nivel`);
      if (typeof e !== 'string' && (e.bonus?.length ?? 0) > 0) own.push(`${itemId}: bonificación artificial de pruebas`);
    }
    if (own.length) {
      experimental++;
      issues.push({ id: p.id, issue: own.join('; ') });
    } else verified++;
  }
  return { total: (presetsJson as any).presets.length, verified, experimental, issues };
}

function measureCombat(data: GameData, index: ReturnType<typeof buildAcquisitionIndex>): BaselineCombatRow[] {
  const rows: BaselineCombatRow[] = [];
  representativeZones(data).forEach((zone, zoneIndex) => {
    const level = Math.floor((zone.levelMin + zone.levelMax) / 2);
    Object.keys(data.rpg.classes).forEach((classId, classIndex) => {
      // Misma semilla de personaje, tiradas y enemigos para los tres estratos.
      const comparisonSeed = 10_000 + zoneIndex * 100 + classIndex;
      for (const equipmentTier of ['none', 'average-obtainable', 'optimized-obtainable'] as const) {
        const id = `${zone.id}:${classId}:balanced:${equipmentTier}`;
        const profile = generateProfiles(data).find((p) => p.id === id) ?? {
          id,
          seed: 1,
          classId,
          level,
          build: 'balanced' as const,
          equipmentTier,
          band: { id: zone.id, label: zone.name, level, zone, territory: zone.areas.length ? 'playable' as const : 'hypothetical' as const },
        };
        const comparable = { ...profile, seed: comparisonSeed };
        const built = buildProfile(data, comparable, index);
        const ch = built.session.character;
        const run = runZoneWithSession(data, zone, built.session, 'medio', comparisonSeed, { seeds: 1, group: 2, limit: 60 });
        rows.push({
          ...run,
          equipmentTier,
          maxHealth: ch.maxHealth,
          maxResource: ch.maxResource,
          resourceRegen: ch.stats.get('resourceRegen'),
          moveSpeed: ch.stats.get('moveSpeed'),
          equipment: built.equipment.map((e) => `${e.slot}:${e.itemId} [${e.source.kind}:${e.source.id}]`),
        });
      }
    });
  });
  return rows;
}

function measureLoot(data: GameData): V3Evidence['loot'] {
  const rng = new Rng(0x00c0ffee);
  const byRarity: Record<string, number> = {};
  let rolls = 0;
  let items = 0;
  let gold = 0;
  for (const table of Object.values(data.rpg.lootTables)) {
    if (table.id.startsWith('fishing')) continue;
    for (let i = 0; i < 200; i++) {
      const drop = rollLoot(rng, data.rpg, table);
      rolls++;
      gold += drop.gold;
      for (const it of drop.items) {
        items += it.quantity;
        const rarity = data.rpg.items[it.itemId]?.rarity ?? 'unknown';
        byRarity[rarity] = (byRarity[rarity] ?? 0) + it.quantity;
      }
    }
  }
  return { rolls, itemRate: items / Math.max(1, rolls), goldMean: gold / Math.max(1, rolls), byRarity };
}

export function collectV3Evidence(data: GameData, generatedAt = new Date().toISOString()): V3Evidence {
  const index = buildAcquisitionIndex(data);
  const profiles = generateProfiles(data);
  return {
    generatedAt,
    acquisition: acquisitionSummary(data, index),
    profiles: profileCoverage(data, profiles),
    visualPresets: auditVisualPresets(data, index),
    combat: measureCombat(data, index),
    loot: measureLoot(data),
  };
}

function combatTable(rows: BaselineCombatRow[]): string {
  const lines = ['| Zona | Nivel | Clase | Equipo | Victoria | TTK s | XP/min | Vida | Recurso / regen | Velocidad |', '|---|---:|---|---|---:|---:|---:|---:|---:|---:|'];
  for (const r of rows) {
    const xpMin = r.seconds > 0 ? (r.xp / r.seconds) * 60 : 0;
    lines.push(`| ${r.zone}${r.zone === 'azuero' ? '' : ' (hip.)'} | ${r.playerLevel} | ${r.classId} | ${r.equipmentTier} | ${r.win ? 'sí' : 'no'} | ${n(r.seconds)} | ${n(xpMin)} | ${n(r.maxHealth, 0)} | ${n(r.maxResource, 0)} / ${n(r.resourceRegen)} | ${n(r.moveSpeed, 2)} |`);
  }
  return lines.join('\n');
}

function experimentsMarkdown(data: GameData): string {
  const levels = [1, 10, 25, 50, 100, 150, 200];
  const out: string[] = ['## Experimentos aislados A–F', '', 'Todos los valores de esta sección son experimentales; no cambian `data/rpg/*.json`.', '', '### A. Progresión', '', '| Variante | ' + levels.map((l) => `N${l}`).join(' | ') + ' |', '|---|' + levels.map(() => '---:').join('|') + '|'];
  for (const v of PROGRESSION_VARIANTS) out.push(`| ${v.id} · capital/vida/briznas | ${levels.map((l) => { const x = progressionAt(l, v); return `${x.capital}/${x.health}/${x.briznas}`; }).join(' | ')} |`);
  out.push('', `Paliers candidatos: 100 puntos cuestan ${cumulativeTierCost(100)} de capital; 101 cuestan ${cumulativeTierCost(101)}; 200 cuestan ${cumulativeTierCost(200)}; 201 cuestan ${cumulativeTierCost(201)}.`, '', '### B. Doble escalado', '', '| Stat principal/elemental | Actual | Sin duplicación | Diferencia |', '|---:|---:|---:|---:|');
  for (const stat of [0, 50, 100, 200, 300]) { const r = compareDoubleScaling(20, 0.6, stat, stat, 0, 10); out.push(`| ${stat} | ${r.current} | ${r.noDoubleScaling} | +${r.duplicateGain} |`); }
  out.push('', '### C. Acción y movilidad', '', '| Clase | Variante | +1: apertura / presupuesto 30 s / CD 6 s |', '|---|---|---|');
  for (const cls of Object.values(data.rpg.classes)) for (const v of ACTION_VARIANTS) { const r = actionBudget(cls.resource.max, cls.resource.regenPerSecond, 6, 1, 30, v); out.push(`| ${cls.name} | ${v.id} | ${n(r.openingBudget)} / ${n(r.sustainedBudget)} / ${n(r.cooldown, 2)} |`); }
  out.push('', '| Movilidad | 3 | 4 | 5 | 6 |', '|---|---:|---:|---:|---:|');
  for (const v of MOBILITY_VARIANTS) out.push(`| ${v.id} | ${[3, 4, 5, 6].map((u) => n(mobilitySpeed(6, u, v), 2)).join(' | ')} |`);
  out.push('', '### D. XP y controles', '', '| Base XP | XP hasta 10 | hasta 50 | hasta 100 | hasta 200 |', '|---:|---:|---:|---:|---:|');
  for (const base of [50, 80, 120]) out.push(`| ${base} | ${xpToLevel(10, base)} | ${xpToLevel(50, base)} | ${xpToLevel(100, base)} | ${xpToLevel(200, base)} |`);
  out.push('', `Control base 4 s: con 0/30/60 de resistencia dura ${[0, 30, 60].map((r) => n(controlledDuration(4, r, 1), 2)).join(' / ')} s; segunda aplicación (factor 0,5): ${n(controlledDuration(4, 30, 0.5), 2)} s.`, '', '### E. Capacidad de Briznas', '', '| Variante | N1/F10 | N50/F100 | N200/F300 |', '|---|---:|---:|---:|');
  for (const v of BRIZNAS_VARIANTS) out.push(`| ${v.id} | ${briznasCapacity(1, 10, v)} | ${briznasCapacity(50, 100, v)} | ${briznasCapacity(200, 300, v)} |`);
  out.push('', '### F. Daño fijo, Potencia y crítico', '', '| Modelo | Normal | Crítico | Esperado |', '|---|---:|---:|---:|');
  const models = [['base', offensiveModel(30, 100, 0, 0, 0.05, 0.5)], ['+10 Potencia', offensiveModel(30, 100, 10, 0, 0.05, 0.5)], ['+10 fijo', offensiveModel(30, 100, 0, 10, 0.05, 0.5)], ['+10 % crítico', offensiveModel(30, 100, 0, 0, 0.15, 0.5)]] as const;
  for (const [id, r] of models) out.push(`| ${id} | ${r.normal} | ${r.critical} | ${n(r.expected, 2)} |`);
  return out.join('\n');
}

export function renderV3Report(data: GameData, e: V3Evidence): string {
  const p = e.profiles;
  const acquisition = e.acquisition;
  const visual = e.visualPresets;
  const direct: string[] = [];
  for (const cls of Object.values(data.rpg.classes)) {
    const zone = data.zones.zones.find((z) => z.id === 'azuero')!;
    const profile = {
      id: `damage-l10:${cls.id}`,
      seed: 10,
      classId: cls.id,
      level: 10,
      equipmentTier: 'none' as const,
      build: 'offense' as const,
      band: { id: 'damage-l10', label: 'Daño nivel 10', level: 10, zone, territory: 'playable' as const },
    };
    const ch = buildProfile(data, profile).session.character;
    const spell = Object.values(data.rpg.spells).find((s) => s.classId === cls.id && s.effects.some((x) => x.type === 'damage'))!;
    const effect = spell.effects.find((x) => x.type === 'damage')!;
    const preview = previewHit(
      { min: effect.min, max: effect.max, element: effect.element, scaling: effect.scaling ?? 0, critChance: spell.critChance, critBonus: spell.critBonus },
      ch,
      null,
      { elementStat: data.rpg.rules.elementStat, resistCap: data.rpg.progression.resistCap },
    );
    direct.push(`| ${cls.name} | ${spell.name} | ${preview.min}–${preview.max} | ${preview.critMin}–${preview.critMax} | ${pct(preview.critChance)} |`);
  }
  return [
    '# Evidencia V3 — progresión y balance',
    '',
    `Generado: ${e.generatedAt}. Datos productivos sin modificar. Semillas deterministas.`,
    '',
    '## Procedencia y perfiles',
    '',
    `- Objetos: ${acquisition.verified}/${acquisition.total} con alguna ruta implementada; ${acquisition.plannedOnly} sólo en contenido planeado; ${acquisition.unverifiable.length} sin ruta implementada demostrable.`,
    `- Perfiles generados: ${p.total}; ${p.playable} en territorio existente y ${p.hypothetical} marcados como simulación territorial.`,
    `- Perfiles visuales existentes: ${visual.verified}/${visual.total} verificables sin bonificaciones artificiales; ${visual.experimental} permanecen como estrés visual/experimental.`,
    '',
    '| Clase | Perfiles |',
    '|---|---:|',
    ...Object.entries(p.byClass).map(([k, v]) => `| ${k} | ${v} |`),
    '',
    '### Incidencias de perfiles visuales',
    '',
    ...(visual.issues.length ? visual.issues.map((x) => `- \`${x.id}\`: ${x.issue}.`) : ['- Ninguna.']),
    '',
    '## Línea base de combate por franja',
    '',
    'Una semilla por combinación, bot medio, dos enemigos. Las zonas sin `areas` se marcan “hip.”: prueban datos de combate, no territorio jugable.',
    '',
    combatTable(e.combat),
    '',
    '### Daño normal y crítico, nivel 10 ofensivo sin equipo',
    '',
    '| Clase | Hechizo | Normal | Crítico | Probabilidad |',
    '|---|---|---:|---:|---:|',
    ...direct,
    '',
    '### Botín',
    '',
    `Muestra determinista de ${e.loot.rolls} tiradas de tabla: ${n(e.loot.itemRate, 3)} objetos/tirada y ${n(e.loot.goldMean, 2)} monedas/tirada. Conteo por rareza: ${Object.entries(e.loot.byRarity).map(([r, c]) => `${r}=${c}`).join(', ')}.`,
    '',
    experimentsMarkdown(data),
    '',
    '## Limitaciones',
    '',
    '- Una ruta de adquisición demuestra que el sistema puede producir el objeto; no estima todavía las horas necesarias para conseguir una tirada concreta.',
    '- Las zonas planeadas sólo validan monstruos, niveles y fórmulas en campo abierto.',
    '- Una semilla por combate es línea base reproducible, no intervalo estadístico. Para aprobar balance se requieren lotes mayores y partidas humanas.',
    '- Los experimentos A–F no son decisiones ni datos de producción.',
    '',
  ].join('\n');
}
