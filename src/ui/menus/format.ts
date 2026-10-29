// Textos y modelos de tooltip. Puro: devuelve datos que `tooltip.ts` pinta.
import type {
  ContentDb,
  Element,
  EquipSlot,
  EquipmentView,
  ItemCategory,
  ItemInstance,
  Rarity,
  SpellDef,
  StatDelta,
  StatId,
  StatModifier,
} from '../../rpg/contracts';

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Común',
  uncommon: 'Poco común',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Legendario',
};

export const ELEMENT_LABEL: Record<Element, string> = {
  physical: 'físico',
  fire: 'fuego',
  frost: 'hielo',
  storm: 'tormenta',
  earth: 'tierra',
};

export const SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: 'Arma',
  offhand: 'Mano izquierda',
  head: 'Cabeza',
  chest: 'Torso',
  hands: 'Manos',
  feet: 'Pies',
  ring1: 'Anillo',
  ring2: 'Anillo',
  amulet: 'Amuleto',
};

export const CATEGORY_LABEL: Record<ItemCategory, string> = {
  weapon: 'Arma',
  armor: 'Armadura',
  jewel: 'Joya',
  consumable: 'Consumible',
  scroll: 'Pergamino',
  petCharm: 'Amuleto de mascota',
  material: 'Material',
  quest: 'Misión',
};

const BASE_LABEL: Record<string, string> = {
  strength: 'Fuerza',
  agility: 'Agilidad',
  intellect: 'Intelecto',
  vitality: 'Vitalidad',
  spirit: 'Espíritu',
  maxHealth: 'Vida máxima',
  maxResource: 'Recurso máximo',
  healthRegen: 'Regeneración de vida',
  resourceRegen: 'Regeneración de recurso',
  power: 'Potencia',
  critChance: 'Probabilidad de crítico',
  critBonus: 'Daño crítico',
  armor: 'Armadura',
  moveSpeed: 'Velocidad',
  cooldownReduction: 'Reducción de enfriamiento',
  pickupRadius: 'Radio de recogida',
};

export function statLabel(stat: StatId): string {
  const [head, el] = stat.split('.') as [string, Element | undefined];
  if (el && head === 'damage') return `Daño de ${ELEMENT_LABEL[el]}`;
  if (el && head === 'resist') return `Resistencia a ${ELEMENT_LABEL[el]}`;
  return BASE_LABEL[stat] ?? stat;
}

/** Estadísticas que se guardan como fracción 0..1 y se muestran en %. */
const FRACTION_STATS = new Set<StatId>(['critChance', 'critBonus', 'cooldownReduction']);
/** Estadísticas cuyo valor ya es un porcentaje. */
const PERCENT_STATS = new Set<string>(['power']);

const trim = (n: number, digits: number): string => {
  const s = n.toFixed(digits);
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
};

/** Valor total de una estadística como se lee en la hoja ("12", "8 %", "5,2 m/s"). */
export function formatStatValue(stat: StatId, value: number): string {
  if (FRACTION_STATS.has(stat)) return `${trim(value * 100, 1)} %`.replace('.', ',');
  if (PERCENT_STATS.has(stat) || stat.startsWith('resist.')) return `${trim(value, 1)} %`.replace('.', ',');
  if (stat === 'moveSpeed') return `${trim(value, 2)} m/s`.replace('.', ',');
  if (stat === 'pickupRadius') return `${trim(value, 1)} m`.replace('.', ',');
  if (stat === 'healthRegen' || stat === 'resourceRegen') return `${trim(value, 1)}/s`.replace('.', ',');
  return trim(Math.round(value * 10) / 10, 1).replace('.', ',');
}

/** "+3 Fuerza", "+5 % Velocidad", "+2 % Probabilidad de crítico". */
export function formatModifier(m: Pick<StatModifier, 'stat' | 'op' | 'value'>): string {
  const sign = m.value >= 0 ? '+' : '−';
  const abs = Math.abs(m.value);
  if (m.op === 'percent') return `${sign}${trim(abs, 1).replace('.', ',')} % ${statLabel(m.stat)}`;
  const v = FRACTION_STATS.has(m.stat)
    ? `${trim(abs * 100, 1)} %`
    : PERCENT_STATS.has(m.stat) || m.stat.startsWith('resist.')
      ? `${trim(abs, 1)} %`
      : trim(abs, 2);
  return `${sign}${v.replace('.', ',')} ${statLabel(m.stat)}`;
}

/** Nombre legible de la fuente de un modificador ("item:it4" → nombre del objeto). */
export function sourceLabel(source: string, content: ContentDb, findItem: (uid: string) => ItemInstance | null): string {
  const [kind, id = ''] = source.split(':');
  switch (kind) {
    case 'class':
      return 'Clase';
    case 'level':
      return 'Nivel';
    case 'points':
      return 'Puntos repartidos';
    case 'item': {
      const it = findItem(id);
      return it ? (content.items[it.itemId]?.name ?? 'Objeto') : 'Objeto';
    }
    case 'set':
      return content.sets[id]?.name ?? 'Conjunto';
    case 'pet':
      return `Mascota: ${content.pets[id]?.name ?? id}`;
    case 'status':
      return `Estado: ${content.statuses[id]?.name ?? id}`;
    case 'derived':
      return `De ${statLabel(id as StatId).toLowerCase()}`;
    default:
      return source;
  }
}

// ─── Modelo de tooltip ─────────────────────────────────────────────────────

export type TipLine =
  | { kind: 'title'; text: string; rarity: Rarity }
  | { kind: 'sub'; text: string }
  | { kind: 'stat'; text: string; tone: 'implicit' | 'rolled' }
  | { kind: 'text'; text: string }
  | { kind: 'set'; text: string; active: boolean }
  | { kind: 'compare'; text: string; tone: 'up' | 'down' }
  | { kind: 'hint'; text: string }
  | { kind: 'sep' };

/** ¿Más es peor? Ninguna estadística actual lo es; se deja el gancho por si acaso. */
const LOWER_IS_BETTER = new Set<StatId>();

export function compareLine(d: StatDelta): TipLine {
  const diff = d.after - d.before;
  const better = LOWER_IS_BETTER.has(d.stat) ? diff < 0 : diff > 0;
  const text = `${diff >= 0 ? '▲' : '▼'} ${statLabel(d.stat)}: ${formatStatValue(d.stat, d.before)} → ${formatStatValue(d.stat, d.after)}`;
  return { kind: 'compare', text, tone: better ? 'up' : 'down' };
}

export interface ItemTipContext {
  content: ContentDb;
  equipment: EquipmentView;
  /** Dónde está: en el equipo no se compara consigo mismo. */
  equipped: boolean;
  compare: StatDelta[];
  sellValue: number;
  playerLevel: number;
}

export function itemTooltip(it: ItemInstance, ctx: ItemTipContext): TipLine[] {
  const def = ctx.content.items[it.itemId];
  if (!def) return [{ kind: 'title', text: it.itemId, rarity: 'common' }];
  const lines: TipLine[] = [{ kind: 'title', text: def.name, rarity: def.rarity }];
  const where = def.slot ? (def.slot === 'ring' ? 'Anillo' : SLOT_LABEL[def.slot]) : CATEGORY_LABEL[def.category];
  lines.push({ kind: 'sub', text: `${RARITY_LABEL[def.rarity]} · ${where}${def.level > 1 ? ` · nivel ${def.level}` : ''}` });
  if (def.level > ctx.playerLevel) lines.push({ kind: 'hint', text: `Requiere nivel ${def.level}` });
  if (def.weapon) {
    const w = def.weapon;
    lines.push({ kind: 'text', text: `Daño ${w.min}–${w.max} de ${ELEMENT_LABEL[w.element]} · ${trim(w.speed, 2).replace('.', ',')} golpes/s · alcance ${trim(w.range, 1).replace('.', ',')} m` });
  }
  if (def.implicit.length || it.rolled.length) lines.push({ kind: 'sep' });
  for (const m of def.implicit) lines.push({ kind: 'stat', text: formatModifier(m), tone: 'implicit' });
  it.rolled.forEach((m, i) => {
    const r = def.rolls[i];
    const range = r ? ` (${formatRollRange(r)})` : '';
    lines.push({ kind: 'stat', text: formatModifier(m) + range, tone: 'rolled' });
  });
  if (def.use) {
    lines.push({ kind: 'sep' });
    lines.push({ kind: 'text', text: useText(def.use, ctx.content) });
  }
  if (def.setId) {
    const set = ctx.content.sets[def.setId];
    if (set) {
      const worn = Object.values(ctx.equipment).filter((e) => e && ctx.content.items[e.itemId]?.setId === def.setId).length;
      const total = Object.values(ctx.content.items).filter((d) => d.setId === def.setId).length;
      lines.push({ kind: 'sep' });
      lines.push({ kind: 'set', text: `${set.name} (${worn}/${total})`, active: worn > 0 });
      for (const b of set.bonuses) {
        lines.push({ kind: 'set', text: `(${b.pieces}) ${b.modifiers.map(formatModifier).join(', ')}`, active: worn >= b.pieces });
      }
    }
  }
  lines.push({ kind: 'sep' });
  lines.push({ kind: 'text', text: def.description });
  if (def.slot && !ctx.equipped) {
    if (ctx.compare.length) {
      lines.push({ kind: 'sep' });
      lines.push({ kind: 'sub', text: 'Si lo equipas:' });
      for (const d of ctx.compare) lines.push(compareLine(d));
    } else {
      lines.push({ kind: 'hint', text: 'Sin cambios respecto a lo equipado' });
    }
  }
  const qty = it.quantity > 1 ? ` (×${it.quantity})` : '';
  lines.push({ kind: 'hint', text: `Valor de venta: ${ctx.sellValue} monedas${qty}` });
  lines.push({ kind: 'hint', text: hintFor(def.category, ctx.equipped) });
  return lines;
}

function formatRollRange(r: { stat: StatId; op: 'flat' | 'percent'; min: number; max: number }): string {
  const one = (v: number): string => formatModifier({ stat: r.stat, op: r.op, value: v }).split(' ')[0]!.replace(/^\+/, '');
  return `${one(r.min)}–${one(r.max)}`;
}

function hintFor(cat: ItemCategory, equipped: boolean): string {
  if (equipped) return 'Clic derecho: quitar';
  if (cat === 'weapon' || cat === 'armor' || cat === 'jewel') return 'Clic derecho: equipar · arrastra fuera para tirar';
  if (cat === 'consumable') return 'Clic derecho: usar';
  if (cat === 'scroll') return 'Clic derecho: aprender';
  if (cat === 'petCharm') return 'Clic derecho: invocar o retirar';
  return 'Arrastra fuera para tirar';
}

function useText(use: NonNullable<ContentDb['items'][string]['use']>, content: ContentDb): string {
  if (use.kind === 'learnSpell') return `Enseña «${content.spells[use.spellId]?.name ?? use.spellId}» (o sube su rango)`;
  if (use.kind === 'summonPet') return `Invoca: ${content.pets[use.petId]?.name ?? use.petId}`;
  return `Al usar: ${use.effects.map((e) => effectText(e, content, 1)).join('; ')} · espera ${trim(use.cooldown, 1)} s`;
}

export function effectText(e: SpellDef['effects'][number], content: ContentDb, scale: number): string {
  const n = (v: number): string => String(Math.round(v * scale));
  switch (e.type) {
    case 'damage':
      return `${n(e.min)}–${n(e.max)} de daño de ${ELEMENT_LABEL[e.element]}`;
    case 'heal':
      return `cura ${n(e.min)}–${n(e.max)}`;
    case 'status': {
      const s = content.statuses[e.statusId];
      const chance = e.chance !== undefined && e.chance < 1 ? ` (${Math.round(e.chance * 100)} %)` : '';
      const dur = e.duration ?? s?.duration;
      return `${s?.name ?? e.statusId}${dur ? ` ${trim(dur, 1)} s` : ''}${chance}`;
    }
    case 'shield':
      return `escudo de ${n(e.amount)} durante ${trim(e.duration, 1)} s`;
    case 'knockback':
      return `empuja ${trim(e.distance, 1)} m`;
    case 'dash':
      return `carga ${trim(e.distance, 1)} m`;
    case 'teleport':
      return `teletransporte hasta ${trim(e.maxDistance, 1)} m`;
    case 'restoreResource':
      return `recupera ${n(e.amount)} de recurso`;
    case 'summon':
      return `invoca ${e.count} aliado${e.count > 1 ? 's' : ''} durante ${trim(e.duration, 1)} s`;
  }
}

export function areaText(a: SpellDef['area']): string {
  switch (a.type) {
    case 'self':
      return 'Sobre ti';
    case 'single':
      return 'Un objetivo';
    case 'circle':
      return `Círculo de ${trim(a.radius, 1)} m${a.atTarget ? ' en el objetivo' : ' a tu alrededor'}`;
    case 'cone':
      return `Cono de ${trim(a.length, 1)} m (${a.angleDeg}°)`;
    case 'line':
      return `Línea de ${trim(a.length, 1)} m`;
  }
}

export function spellTooltip(sp: SpellDef, rank: number, content: ContentDb, resourceName: string): TipLine[] {
  const scale = 1 + ((rank - 1) * sp.perRank.effectPercent) / 100;
  const cost = Math.round(sp.resourceCost * (1 - ((rank - 1) * sp.perRank.costPercent) / 100));
  const origin = sp.classId ? (content.classes[sp.classId]?.name ?? sp.classId) : 'Universal';
  const lines: TipLine[] = [
    { kind: 'title', text: sp.name, rarity: sp.classId ? 'rare' : 'uncommon' },
    { kind: 'sub', text: `Rango ${rank}/${sp.maxRank} · ${origin} · ${ELEMENT_LABEL[sp.element]}` },
    { kind: 'sep' },
    { kind: 'text', text: `Coste ${cost} de ${resourceName.toLowerCase()} · enfriamiento ${sp.cooldown ? `${trim(sp.cooldown, 1)} s` : 'ninguno'}` },
    { kind: 'text', text: `${areaText(sp.area)}${sp.range ? ` · alcance ${trim(sp.range, 1)} m` : ''}${sp.castTime ? ` · lanzamiento ${trim(sp.castTime, 2)} s` : ''}` },
    { kind: 'sep' },
  ];
  for (const e of sp.effects) lines.push({ kind: 'stat', text: capitalize(effectText(e, content, scale)), tone: 'implicit' });
  lines.push({ kind: 'sep' }, { kind: 'text', text: sp.description });
  if (rank < sp.maxRank) {
    lines.push({ kind: 'hint', text: `Siguiente rango: +${sp.perRank.effectPercent} % efectos, −${sp.perRank.costPercent} % coste` });
  }
  return lines;
}

export const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
