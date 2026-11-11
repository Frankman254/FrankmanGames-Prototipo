// Textos y modelos de tooltip. Puro: devuelve datos que `tooltip.ts` pinta.
import { TWO_HANDED_KINDS } from '../../rpg/contracts';
import { scaleAreaDef } from '../../rpg/spells';
import { CRIT_COLOR, ELEMENT_COLOR, itemIcon, spellIcon } from './icons';
import type {
  ContentDb,
  Element,
  EquipSlot,
  EquipmentView,
  ItemCategory,
  ItemInstance,
  ItemKind,
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
  earth: 'tierra',
  fire: 'fuego',
  air: 'aire',
  water: 'agua',
  frost: 'hielo',
  lightning: 'rayo',
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
  mount: 'Montura',
  amulet: 'Amuleto',
  back: 'Espalda',
  waist: 'Cintura',
};

/** `equipo-objetos`: nombre de cada tipo de objeto (tooltips y filtros). */
export const KIND_LABEL: Record<ItemKind, string> = {
  sword: 'Espada',
  dagger: 'Daga',
  axe: 'Hacha',
  mace: 'Maza',
  wand: 'Varita',
  orb: 'Orbe',
  greatsword: 'Mandoble',
  hammer: 'Martillo',
  spear: 'Lanza',
  bow: 'Arco',
  crossbow: 'Ballesta',
  staff: 'Bastón',
  shield: 'Escudo',
  buckler: 'Rodela',
  helmet: 'Yelmo',
  hat: 'Sombrero',
  hood: 'Capucha',
  armor: 'Armadura',
  robe: 'Túnica',
  cape: 'Capa',
  belt: 'Cinturón',
  gloves: 'Guantes',
  bracers: 'Brazales',
  boots: 'Botas',
  sandals: 'Sandalias',
  ring: 'Anillo',
  amulet: 'Amuleto',
  potion: 'Poción',
  elixir: 'Elixir',
  food: 'Comida',
  fish: 'Pescado',
  scroll: 'Pergamino',
  charm: 'Amuleto de mascota',
  mount: 'Montura',
  material: 'Material',
  ore: 'Mineral',
  hide: 'Piel',
  fang: 'Colmillo',
  essence: 'Esencia',
  gem: 'Gema',
  key: 'Llave',
  junk: 'Trasto',
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
  calm: 'Calma',
  flow: 'Caudal',
  will: 'Voluntad',
  vitality: 'Vitalidad',
  spirit: 'Espíritu',
  maxHealth: 'Vida máxima',
  maxResource: 'Recurso máximo',
  healthRegen: 'Regeneración de vida',
  resourceRegen: 'Regeneración de recurso',
  power: 'Potencia',
  critChance: 'Probabilidad de crítico (global)',
  critBonus: 'Daño crítico',
  moveSpeed: 'Velocidad',
  cooldownReduction: 'Reducción de enfriamiento',
  pickupRadius: 'Radio de recogida',
  slowResist: 'Resistencia a los controles',
  carryCapacity: 'Bono de capacidad (Briznas)',
  tackle: 'Placaje',
  escape: 'Huida',
  healingPower: 'Poder de curación',
  discovery: 'Hallazgo',
  castStability: 'Concentración',
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
const PERCENT_STATS = new Set<string>(['power', 'slowResist', 'healingPower', 'castStability']);

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

/** Sólo el valor con signo: "+3", "+5 %", "+2 %" (crítico). */
export function formatModValue(m: Pick<StatModifier, 'stat' | 'op' | 'value'>): string {
  const sign = m.value >= 0 ? '+' : '−';
  const abs = Math.abs(m.value);
  const v =
    m.op === 'percent'
      ? `${trim(abs, 1)} %`
      : FRACTION_STATS.has(m.stat)
        ? `${trim(abs * 100, 1)} %`
        : PERCENT_STATS.has(m.stat) || m.stat.startsWith('resist.')
          ? `${trim(abs, 1)} %`
          : trim(abs, 2);
  return `${sign}${v.replace('.', ',')}`;
}

/** "+3 Fuerza", "+5 % Velocidad", "+2 % Probabilidad de crítico". */
export function formatModifier(m: Pick<StatModifier, 'stat' | 'op' | 'value'>): string {
  return `${formatModValue(m)} ${statLabel(m.stat)}`;
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
  /** `icon`: SVG del objeto o hechizo; con él la cabecera lleva el icono a la izquierda. */
  | { kind: 'title'; text: string; rarity: Rarity; icon?: string }
  | { kind: 'sub'; text: string }
  | { kind: 'stat'; text: string; tone: 'implicit' | 'rolled'; color?: string }
  | { kind: 'text'; text: string; color?: string }
  | { kind: 'set'; text: string; active: boolean }
  | { kind: 'compare'; text: string; tone: 'up' | 'down' }
  | { kind: 'hint'; text: string }
  /** Requisito (nivel): en rojo si no se cumple. */
  | { kind: 'req'; text: string; met: boolean }
  /** Dato con su etiqueta en una línea: «Coste  4». */
  | { kind: 'fact'; label: string; value: string; color?: string }
  /** Encabezado de un bloque: «EFECTO». */
  | { kind: 'section'; text: string; color?: string }
  | { kind: 'sep' };

/** Pulso (energía) siempre en enteros, p. ej. «Pulso: 70 / 100». */
export function pulseText(name: string, value: number, max: number): string {
  return `${name}: ${Math.round(value)} / ${Math.round(max)}`;
}

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
  /** Sustituye la línea de valor de venta (p. ej. el precio en una tienda). */
  priceLine?: string;
  /** En la tienda: sin comparación ni consejos de la mochila. */
  inShop?: boolean;
  /** `equipo-objetos`: comparación si va en la mano izquierda (armas de una mano). */
  compareOffhand?: StatDelta[];
}

export function itemTooltip(it: ItemInstance, ctx: ItemTipContext): TipLine[] {
  const def = ctx.content.items[it.itemId];
  if (!def) return [{ kind: 'title', text: it.itemId, rarity: 'common' }];
  const lines: TipLine[] = [{ kind: 'title', text: def.name, rarity: def.rarity, icon: itemIcon(def) }];
  const weight = def.weight ?? ctx.content.progression.defaultItemWeight ?? 1;
  const where = def.slot ? (def.slot === 'ring' ? 'Anillo' : SLOT_LABEL[def.slot]) : CATEGORY_LABEL[def.category];
  const kind = def.kind ? KIND_LABEL[def.kind] : null;
  const what = kind && kind !== where ? `${kind} · ${where}` : where;
  lines.push({ kind: 'sub', text: `${RARITY_LABEL[def.rarity]} · ${what}${def.level > 1 ? ` · nivel ${def.level}` : ''}` });
  lines.push({ kind: 'sep' }, { kind: 'fact', label: 'Peso', value: `${trim(weight, 2)} ${ctx.content.progression.weightUnit ?? 'briznas'} · ${trim(weight * it.quantity, 2)} en esta pila` });
  if (def.level > ctx.playerLevel) lines.push({ kind: 'hint', text: `Requiere nivel ${def.level}` });
  if (def.weapon) {
    const w = def.weapon;
    lines.push({ kind: 'text', text: `Daño ${w.min}–${w.max} de ${ELEMENT_LABEL[w.element]} · ${trim(w.speed, 2).replace('.', ',')} golpes/s · alcance ${trim(w.range, 1).replace('.', ',')} m` });
    lines.push({ kind: 'hint', text: handsText(def) });
  }
  if (def.implicit.length || it.rolled.length || it.bonus?.length) lines.push({ kind: 'sep' });
  for (const m of def.implicit) lines.push({ kind: 'stat', text: formatModifier(m), tone: 'implicit' });
  it.rolled.forEach((m, i) => {
    const r = def.rolls[i];
    const range = r ? ` (${formatRollRange(r)})` : '';
    lines.push({ kind: 'stat', text: formatModifier(m) + range, tone: 'rolled' });
  });
  for (const m of it.bonus ?? []) lines.push({ kind: 'stat', text: `${formatModifier(m)} (mejora)`, tone: 'rolled' });
  if (def.use) {
    lines.push({ kind: 'sep' });
    lines.push({ kind: 'text', text: useText(def.use, ctx.content) });
    const taught = def.use.kind === 'learnSpell' ? ctx.content.spells[def.use.spellId] : undefined;
    const need = taught?.unlockLevel ?? 1;
    if (need > 1) lines.push({ kind: 'req', text: `Se aprende a cualquier nivel; va a la barra desde el nivel ${need}`, met: ctx.playerLevel >= need });
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
  if (def.slot && !ctx.equipped && !ctx.inShop) {
    if (ctx.compare.length) {
      lines.push({ kind: 'sep' });
      lines.push({ kind: 'sub', text: ctx.compareOffhand ? 'Si lo equipas en la mano derecha:' : 'Si lo equipas:' });
      for (const d of ctx.compare) lines.push(compareLine(d));
    } else {
      lines.push({ kind: 'hint', text: 'Sin cambios respecto a lo equipado' });
    }
    if (ctx.compareOffhand?.length) {
      lines.push({ kind: 'sub', text: 'En la mano izquierda (dos armas):' });
      for (const d of ctx.compareOffhand) lines.push(compareLine(d));
    }
  }
  const qty = it.quantity > 1 ? ` (×${it.quantity})` : '';
  lines.push({ kind: 'hint', text: ctx.priceLine ?? `Valor de venta: ${ctx.sellValue} monedas${qty}` });
  if (!ctx.inShop) lines.push({ kind: 'hint', text: hintFor(def.category, ctx.equipped) });
  return lines;
}

/** Regla de manos de un arma (`equipo-objetos`). */
export function handsText(def: Pick<ContentDb['items'][string], 'hands' | 'kind' | 'weapon'>): string {
  const two = (def.hands ?? (def.kind && TWO_HANDED_KINDS.includes(def.kind) ? 2 : 1)) === 2;
  return two ? 'Dos manos: ocupa también la mano izquierda' : 'Una mano: también va en la mano izquierda (dos armas)';
}

function formatRollRange(r: { stat: StatId; op: 'flat' | 'percent'; min: number; max: number }): string {
  const one = (v: number): string => formatModValue({ stat: r.stat, op: r.op, value: v }).replace(/^\+/, '');
  return `${one(r.min)}–${one(r.max)}`;
}

function hintFor(cat: ItemCategory, equipped: boolean): string {
  if (equipped) return 'Clic derecho: quitar';
  if (cat === 'weapon') return 'Clic derecho: equipar · Mayús + clic derecho: mano izquierda';
  if (cat === 'armor' || cat === 'jewel') return 'Clic derecho: equipar · arrastra fuera para tirar';
  if (cat === 'consumable') return 'Clic derecho: usar';
  if (cat === 'scroll') return 'Clic derecho: aprender';
  if (cat === 'petCharm') return 'Clic derecho: invocar o retirar';
  return 'Arrastra fuera para tirar';
}

function useText(use: NonNullable<ContentDb['items'][string]['use']>, content: ContentDb): string {
  if (use.kind === 'learnSpell') return `Enseña «${content.spells[use.spellId]?.name ?? use.spellId}» (o sube su rango)`;
  if (use.kind === 'summonPet') return `Invoca: ${content.pets[use.petId]?.name ?? use.petId}`;
  if (use.kind === 'recall') return `Al usar: vuelves a tu última Piedra Pintada · espera ${trim(use.cooldown, 1)} s`;
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
    case 'summon': {
      const who = content.pets[e.archetype]?.name ?? `aliado${e.count > 1 ? 's' : ''}`;
      return `invoca ${e.count > 1 ? `${e.count} × ` : ''}${who} durante ${trim(e.duration, 1)} s`;
    }
    case 'zone':
      return `zona de ${trim(e.radius, 1)} m durante ${trim(e.duration, 1)} s; cada ${trim(e.every, 1)} s: ${e.effects.map((x) => effectText(x, content, scale)).join(', ')}`;
    case 'blink':
      return `aparece en el punto elegido (hasta ${trim(e.maxDistance, 1)} m)`;
    case 'swap':
      return 'cambia el sitio con el objetivo';
    case 'pull':
      return `atrae ${trim(e.distance, 1)} m`;
    case 'recoil':
      return `salta ${trim(e.distance, 1)} m hacia atrás`;
    case 'trap':
      return `trampa invisible (${trim(e.radius, 1)} m, ${trim(e.duration, 0)} s); al pisarla: ${e.effects.map((x) => effectText(x, content, scale)).join(', ')}`;
    case 'reveal':
      return `revela las trampas a ${trim(e.radius, 1)} m durante ${trim(e.duration, 1)} s`;
  }
}

/** Sub-líneas detalladas de un status: duración, cada modifier por separado, y descripción narrativa. */
export function statusDetailLines(e: Extract<SpellDef['effects'][number], { type: 'status' }>, content: ContentDb, scale: number, critMult = 1): TipLine[] {
  const s = content.statuses[e.statusId];
  if (!s) return [];
  const lines: TipLine[] = [];
  const dur = (e.duration ?? s.duration ?? 0) * critMult;
  const isBuff = s.kind === 'buff';
  const color = critMult > 1 ? CRIT_COLOR : isBuff ? '#9fe0a0' : '#f08a3c';
  if (dur > 0) lines.push({ kind: 'stat', text: `  Duración: ${trim(dur, 1)} s`, tone: 'implicit', color });
  for (const m of s.modifiers ?? []) {
    const scaled = { ...m, value: Math.round(m.value * scale * critMult * 10) / 10 };
    lines.push({ kind: 'stat', text: `  ${formatModifier(scaled)}`, tone: 'implicit', color });
  }
  return lines;
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
    case 'cross':
      return `Cruz de ${trim(a.arm * 2, 1)} m en el objetivo`;
    case 'square':
      return `Cuadrado de ${trim(a.size, 1)} m${a.atTarget ? ' en el objetivo' : ' a tu alrededor'}`;
    case 'star':
      return `Estrella de ${trim(a.arm * 2, 1)} m${a.atTarget ? ' en el objetivo' : ' a tu alrededor'}`;
  }
}

/**
 * Requisito de nivel de un hechizo para la barra. `known` = ya aprendido;
 * `classId` = clase del jugador (los de su clase se aprenden solos).
 */
export function spellLevelLines(sp: SpellDef, player: { level: number; classId: string }, known: boolean): TipLine[] {
  const need = sp.unlockLevel ?? 1;
  if (need <= 1) return [];
  const met = player.level >= need;
  const lines: TipLine[] = [{ kind: 'req', text: `Requiere nivel ${need} para ponerlo en la barra`, met }];
  if (met) return lines;
  if (known) lines.push({ kind: 'hint', text: `Ya lo conoces: podrás equiparlo al llegar al nivel ${need}.` });
  else if (sp.classId === player.classId) lines.push({ kind: 'hint', text: `Lo aprenderás solo al alcanzar el nivel ${need}.` });
  else lines.push({ kind: 'hint', text: `Su pergamino se puede aprender antes; irá a la barra desde el nivel ${need}.` });
  return lines;
}

export function spellTooltip(sp: SpellDef, rank: number, content: ContentDb, resourceName: string, player?: { level: number; classId: string; known: boolean; critChance?: number }): TipLine[] {
  const extra = Math.max(0, rank - 1);
  const scale = 1 + (extra * sp.perRank.effectPercent) / 100;
  const areaScale = sp.perRank.areaPercent ? 1 + (extra * sp.perRank.areaPercent) / 100 : 1;
  const scaledArea = scaleAreaDef(sp.area, areaScale);
  const cost = Math.round(sp.resourceCost * (1 - (extra * sp.perRank.costPercent) / 100));
  const origin = sp.classId ? (content.classes[sp.classId]?.name ?? sp.classId) : 'Universal';
  const lines: TipLine[] = [
    { kind: 'title', text: sp.name, rarity: sp.classId ? 'rare' : 'uncommon', icon: spellIcon(sp) },
    { kind: 'sub', text: `Rango ${rank}/${sp.maxRank} · ${origin} · ${ELEMENT_LABEL[sp.element]}` },
    { kind: 'sep' },
    { kind: 'fact', label: 'Coste', value: `${cost} de ${resourceName.toLowerCase()}` },
    { kind: 'fact', label: 'Enfriamiento', value: sp.cooldown ? `${trim(sp.cooldown, 1)} s` : 'ninguno' },
  ];
  if (sp.range) lines.push({ kind: 'fact', label: 'Alcance', value: `${trim(sp.range, 1)} m` });
  if (sp.castTime) lines.push({ kind: 'fact', label: 'Lanzamiento', value: `${trim(sp.castTime, 2)} s` });
  lines.push({ kind: 'fact', label: 'Zona', value: areaText(scaledArea) });
  // --- Descripción narrativa (sin cifras) ---
  lines.push({ kind: 'sep' }, { kind: 'text', text: sp.description });
  // --- EFECTOS NORMALES ---
  lines.push({ kind: 'section', text: 'EFECTO' });
  for (const e of sp.effects) {
    const color = e.type === 'damage' ? ELEMENT_COLOR[e.element] : e.type === 'heal' ? '#9fe0a0' : undefined;
    lines.push({ kind: 'stat', text: capitalize(effectText(e, content, scale)), tone: 'implicit', color });
    // Sub-desglose limpio para estados: duración, cada mod, narrativa
    if (e.type === 'status') {
      lines.push(...statusDetailLines(e, content, scale));
    }
  }
  // --- GOLPE CRÍTICO ---
  if (sp.critChance > 0) {
    const baseChance = sp.critChance;
    const globalCrit = player?.critChance ?? 0;
    const totalChance = Math.min(1, Math.max(0, baseChance + globalCrit));
    const mult = 1 + (sp.critBonus > 0 ? sp.critBonus : 0.5);
    lines.push({
      kind: 'section',
      text: `GOLPE CRÍTICO (Base: ${trim(baseChance * 100, 0)} % · Actual: ${trim(totalChance * 100, 0)} %)`,
      color: CRIT_COLOR,
    });
    for (const e of sp.effects) {
      if (e.type === 'damage') {
        const cmin = Math.round(e.min * scale * mult);
        const cmax = Math.round(e.max * scale * mult);
        lines.push({
          kind: 'stat',
          text: `${cmin}–${cmax} de daño de ${ELEMENT_LABEL[e.element]}`,
          tone: 'rolled',
          color: CRIT_COLOR,
        });
      } else if (e.type === 'heal') {
        const cmin = Math.round(e.min * scale * mult);
        const cmax = Math.round(e.max * scale * mult);
        lines.push({
          kind: 'stat',
          text: `Cura ${cmin}–${cmax}`,
          tone: 'rolled',
          color: CRIT_COLOR,
        });
      } else if (e.type === 'status') {
        const s = content.statuses[e.statusId];
        const name = s?.name ?? e.statusId;
        const chance = e.chance !== undefined && e.chance < 1 ? ` (${Math.round(e.chance * 100)} %)` : '';
        const critDur = ((e.duration ?? s?.duration ?? 0) * 1.5);
        lines.push({
          kind: 'stat',
          text: `${name} ${trim(critDur, 1)} s${chance}`,
          tone: 'rolled',
          color: CRIT_COLOR,
        });
        // Sub-desglose crítico
        lines.push(...statusDetailLines(e, content, scale, 1.5));
      } else if (e.type === 'shield') {
        const amt = Math.round(e.amount * scale * 1.5);
        const dur = e.duration * 1.5;
        lines.push({
          kind: 'stat',
          text: `Escudo de ${amt} durante ${trim(dur, 1)} s`,
          tone: 'rolled',
          color: CRIT_COLOR,
        });
      }
    }
  }
  if (player) {
    const req = spellLevelLines(sp, player, player.known);
    if (req.length) lines.push({ kind: 'sep' }, ...req);
  }
  if (rank < sp.maxRank) {
    const nextParts = [`+${sp.perRank.effectPercent} % efectos`];
    if (sp.perRank.areaPercent) nextParts.push(`+${sp.perRank.areaPercent} % zona`);
    nextParts.push(`−${sp.perRank.costPercent} % coste`);
    lines.push({ kind: 'hint', text: `Siguiente rango: ${nextParts.join(', ')}` });
  }
  return lines;
}

export const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
