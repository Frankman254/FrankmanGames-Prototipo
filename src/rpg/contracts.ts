// Contratos del Slice 03 (contenido RPG). Fijan la frontera entre la lógica
// (`src/rpg/`, rama `slice03-sistemas`) y la interfaz (`src/ui/menus/`, rama
// `slice03-interfaz`) para que ambas se construyan a la vez.
//
// Regla: este archivo sólo crece. Renombrar o quitar algo exige anotarlo en el
// handoff. Todo número de juego vive en `data/rpg/*.json` (PROPUESTA).
//
// Modelo: *definiciones* (inmutables, cargadas de datos, compartidas) frente a
// *instancias* (estado de partida). Una clase de personaje, un hechizo o un
// objeto nuevo es una entrada de datos más, no código nuevo; el código nuevo
// sólo hace falta para un *tipo* de efecto o una *conducta* de mascota nueva.

// ─── Estadísticas ───────────────────────────────────────────────────────────

export const ELEMENTS = ['physical', 'fire', 'frost', 'storm', 'earth'] as const;
export type Element = (typeof ELEMENTS)[number];

export const PRIMARY_STATS = ['strength', 'agility', 'intellect', 'vitality', 'spirit'] as const;
export type PrimaryStat = (typeof PRIMARY_STATS)[number];

/** Todas las estadísticas que un modificador puede tocar. */
export type StatId =
  | PrimaryStat
  | 'maxHealth'
  | 'maxResource'
  | 'healthRegen'
  | 'resourceRegen'
  | 'power' // % de daño de todo
  | 'critChance' // 0..1
  | 'critBonus' // +x al multiplicador de crítico
  | 'armor' // reducción plana de daño físico
  | 'moveSpeed' // m/s
  | 'cooldownReduction' // 0..0.5
  | 'pickupRadius'
  | `damage.${Element}` // daño plano añadido de ese elemento
  | `resist.${Element}`; // % de reducción de ese elemento (tope en datos)

/** flat se suma; percent multiplica el total por (1 + Σ%/100). */
export interface StatModifier {
  stat: StatId;
  op: 'flat' | 'percent';
  value: number;
  /** Quién lo aporta, para tooltips y para retirarlo: "item:<uid>", "status:<id>", "pet:<id>", "level", "set:<id>". */
  source: string;
}

export type StatBlock = Partial<Record<StatId, number>>;

// ─── Definiciones (datos) ───────────────────────────────────────────────────

export interface ResourceDef {
  id: string; // "vigor", "mana"…
  name: string;
  color: string; // CSS
  max: number;
  regenPerSecond: number;
}

export interface ClassDef {
  id: string;
  name: string;
  description: string;
  role: string; // texto libre: "cuerpo a cuerpo", "a distancia"…
  icon: string; // id de icono o emoji provisional
  resource: ResourceDef;
  baseStats: StatBlock;
  statsPerLevel: StatBlock;
  /** Elementos con bonificación de clase (+affinityBonus % de daño). */
  affinity: Element[];
  affinityBonus: number;
  startingSpells: string[];
  startingItems: { itemId: string; quantity: number }[];
  /** Hotbar inicial (huecos 1..6). */
  startingHotbar: (string | null)[];
  /** Añadido (rama A): estadística que multiplica `scaling` en daño y curación. Por defecto, la primaria más alta de `baseStats`. */
  mainStat?: PrimaryStat;
}

export type AreaDef =
  | { type: 'self' }
  | { type: 'single' } // objetivo bajo el cursor
  | { type: 'circle'; radius: number; atTarget: boolean }
  | { type: 'cone'; length: number; angleDeg: number }
  | { type: 'line'; length: number; width: number };

/** Tipos de efecto. Añadir uno = nueva subclase de `Effect` + entrada en el registro. */
export type EffectDef =
  | { type: 'damage'; min: number; max: number; element: Element; scaling?: number }
  | { type: 'heal'; min: number; max: number; scaling?: number }
  | { type: 'status'; statusId: string; duration?: number; chance?: number }
  | { type: 'shield'; amount: number; duration: number }
  | { type: 'knockback'; distance: number }
  | { type: 'dash'; distance: number }
  | { type: 'teleport'; maxDistance: number }
  | { type: 'restoreResource'; amount: number }
  | { type: 'summon'; archetype: string; count: number; duration: number }
  /** Añadido (rama A): zona persistente que aplica `effects` a los enemigos dentro cada `every` s. En `summon`, `archetype` = id de `PetDef`. */
  | { type: 'zone'; radius: number; duration: number; every: number; effects: EffectDef[] };

export interface SpellDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  element: Element;
  /** Clase de origen; null = universal (pergaminos). Cualquier clase puede equiparlo (PROPUESTA). */
  classId: string | null;
  resourceCost: number;
  cooldown: number;
  globalCooldown: number;
  castTime: number;
  range: number;
  area: AreaDef;
  /** Proyectil visible (null = instantáneo). */
  projectileSpeed: number | null;
  effects: EffectDef[];
  maxRank: number;
  /** Por rango por encima de 1: % extra de efectos numéricos y −coste. */
  perRank: { effectPercent: number; costPercent: number };
  critChance: number;
  critBonus: number;
  tags: string[];
}

export interface StatusDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  kind: 'buff' | 'debuff';
  duration: number;
  maxStacks: number;
  modifiers: Omit<StatModifier, 'source'>[];
  /** Efecto periódico (quemadura, regeneración…). */
  tick?: { every: number; effect: EffectDef };
  /** Control: impide moverse/lanzar. */
  control?: 'stun' | 'root' | 'silence';
}

export const ITEM_CATEGORIES = ['weapon', 'armor', 'jewel', 'consumable', 'scroll', 'petCharm', 'material', 'quest'] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const EQUIP_SLOTS = ['weapon', 'offhand', 'head', 'chest', 'hands', 'feet', 'ring1', 'ring2', 'amulet'] as const;
export type EquipSlot = (typeof EQUIP_SLOTS)[number];

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
export type Rarity = (typeof RARITIES)[number];

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: ItemCategory;
  /** Hueco que ocupa; los anillos valen para ring1 o ring2. */
  slot: EquipSlot | 'ring' | null;
  rarity: Rarity;
  level: number;
  value: number; // precio base en monedas
  maxStack: number; // 1 = no apilable
  /** Modificadores fijos del prototipo. */
  implicit: Omit<StatModifier, 'source'>[];
  /** Tiradas por instancia: cada una sale entre min y max al crear el objeto. */
  rolls: { stat: StatId; op: 'flat' | 'percent'; min: number; max: number }[];
  /** Arma: daño del ataque básico. */
  weapon?: { min: number; max: number; element: Element; speed: number; range: number };
  /** Al usar (consumibles, pergaminos, amuletos de mascota). */
  use?:
    | { kind: 'effects'; effects: EffectDef[]; cooldown: number }
    | { kind: 'learnSpell'; spellId: string }
    | { kind: 'summonPet'; petId: string };
  setId?: string;
  /** Peso relativo en el botín (idea: peso = base − rareza). */
  dropWeight: number;
}

export interface ItemSetDef {
  id: string;
  name: string;
  /** Bonos por número de piezas equipadas. */
  bonuses: { pieces: number; modifiers: Omit<StatModifier, 'source'>[] }[];
}

export interface PetDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  behavior: 'fighter' | 'collector' | 'guardian';
  speed: number;
  followDistance: number;
  /** fighter: su ataque; guardian: su efecto periódico sobre el dueño. */
  attack?: { min: number; max: number; element: Element; range: number; cooldown: number };
  aura?: { every: number; effect: EffectDef };
  /** Bono pasivo al dueño mientras está invocada. */
  ownerBonus: Omit<StatModifier, 'source'>[];
  /** Añadido (rama A): vida mostrada en `PetView` (las mascotas aún no reciben golpes). */
  maxHealth?: number;
  /** Añadido (rama A): radio de acción alrededor del dueño (fighter: busca enemigos; collector: busca botín). */
  reach?: number;
}

export interface LootTableDef {
  id: string;
  gold: { min: number; max: number; chance: number };
  /** Número de tiradas de objeto. */
  rolls: number;
  /** Probabilidad de que cada tirada dé algo. */
  chance: number;
  entries: { itemId: string; weight: number; min?: number; max?: number }[];
}

/** Base de contenido completa (lo que carga `src/rpg/content.ts`). */
export interface ContentDb {
  classes: Record<string, ClassDef>;
  spells: Record<string, SpellDef>;
  statuses: Record<string, StatusDef>;
  items: Record<string, ItemDef>;
  sets: Record<string, ItemSetDef>;
  pets: Record<string, PetDef>;
  lootTables: Record<string, LootTableDef>;
  progression: {
    maxLevel: number;
    /** xpToNext(n) = round(base · n^exponent). */
    xp: { base: number; exponent: number };
    statPointsPerLevel: number;
    resistCap: number; // % máximo de resistencia
    hotbarSize: number;
    inventorySize: number;
  };
}

// ─── Instancias (estado de partida) ─────────────────────────────────────────

export interface ItemInstance {
  uid: string;
  itemId: string;
  quantity: number;
  /** Resultado de las tiradas de `ItemDef.rolls`. */
  rolled: Omit<StatModifier, 'source'>[];
}

// ─── Vistas para la interfaz (sólo lectura) ─────────────────────────────────

export interface StatLine {
  stat: StatId;
  value: number;
  /** Desglose para el tooltip de la hoja de personaje. */
  breakdown: { source: string; op: 'flat' | 'percent'; value: number }[];
}

export interface PlayerView {
  name: string;
  classId: string;
  level: number;
  xp: number;
  xpToNext: number;
  health: number;
  maxHealth: number;
  resource: number;
  maxResource: number;
  gold: number;
  unspentStatPoints: number;
  stats: StatLine[];
  statuses: { statusId: string; remaining: number; stacks: number }[];
}

export interface InventoryView {
  size: number;
  /** Longitud = size; null = hueco vacío. */
  slots: (ItemInstance | null)[];
}

export type EquipmentView = Record<EquipSlot, ItemInstance | null>;

export interface SpellbookView {
  known: { spellId: string; rank: number }[];
  hotbar: (string | null)[];
}

export interface PetView {
  petId: string;
  itemUid: string; // amuleto que la invoca
  health: number;
  maxHealth: number;
}

/** Diferencia de estadísticas si se equipara un objeto (tooltip comparativo). */
export interface StatDelta {
  stat: StatId;
  before: number;
  after: number;
}

export type CommandResult = { ok: true } | { ok: false; reason: string };

export type SessionEvent =
  | { type: 'changed' } // cualquier cambio de las vistas
  | { type: 'levelUp'; level: number }
  | { type: 'loot'; itemId: string; quantity: number }
  | { type: 'gold'; amount: number }
  | { type: 'learned'; spellId: string }
  | { type: 'message'; text: string };

/** Lo que la interfaz usa. La lógica lo implementa en `src/rpg/session.ts`. */
export interface GameSessionApi {
  readonly content: ContentDb;
  player(): PlayerView;
  inventory(): InventoryView;
  equipment(): EquipmentView;
  spellbook(): SpellbookView;
  pet(): PetView | null;

  equip(uid: string, slot?: EquipSlot): CommandResult;
  unequip(slot: EquipSlot): CommandResult;
  useItem(uid: string): CommandResult;
  dropItem(uid: string, quantity: number): CommandResult;
  moveItem(fromIndex: number, toIndex: number): CommandResult;
  sortInventory(): CommandResult;
  assignHotbar(index: number, spellId: string | null): CommandResult;
  spendStatPoint(stat: PrimaryStat): CommandResult;
  compareEquip(uid: string): StatDelta[];
  /** Valor de venta (sin tienda todavía; se muestra en el tooltip). */
  sellValue(uid: string): number;

  save(): SaveData;
  on(listener: (e: SessionEvent) => void): () => void;

  // Añadido por `slice03-interfaz` (B). Opcionales para no romper a la rama A;
  // ver docs/HANDOFF_SLICE_03_B.md. Sin ellos el HUD funciona sin barrido ni atajos.
  /** Enfriamiento restante y total por hechizo de la barra (barrido del HUD). */
  hotbarState?(): HotbarSlotState[];
  /** Tecla 1–6. La lógica decide objetivo/apuntado; la interfaz sólo pide el lanzamiento. */
  castHotbar?(index: number): CommandResult;
  /** Pociones rápidas (Q vida, E recurso): usa el mejor consumible del inventario. */
  quickUse?(kind: QuickUseKind): CommandResult;
}

/** Añadido por `slice03-interfaz` (B). */
export type QuickUseKind = 'health' | 'resource';

/** Añadido por `slice03-interfaz` (B). */
export interface HotbarSlotState {
  spellId: string | null;
  /** Segundos restantes del enfriamiento propio o del global, el mayor. */
  cooldownRemaining: number;
  /** Duración total del enfriamiento que corre (para el barrido). */
  cooldownTotal: number;
  /** Hay recurso suficiente para lanzarlo. */
  affordable: boolean;
}

export interface SaveData {
  version: 1;
  savedAt: string;
  name: string;
  classId: string;
  level: number;
  xp: number;
  gold: number;
  allocated: Partial<Record<PrimaryStat, number>>;
  unspentStatPoints: number;
  inventory: (ItemInstance | null)[];
  equipment: Partial<Record<EquipSlot, ItemInstance>>;
  known: { spellId: string; rank: number }[];
  hotbar: (string | null)[];
  activePetItemUid: string | null;
}

/** Fábrica que expone la lógica y usa el menú de inicio. */
export interface GameSessionFactory {
  /**
   * Añadido por `slice03-interfaz` (B): la creación de personaje necesita la
   * lista de clases antes de que exista una sesión. Opcional en el tipo para no
   * romper a la rama A; `mountMenus` lo exige al arrancar.
   */
  readonly content?: ContentDb;
  newGame(classId: string, name: string, seed: number): GameSessionApi;
  load(save: SaveData, seed: number): GameSessionApi;
}

// ─── Añadidos de la rama A (slice03-sistemas) ──────────────────────────────

/** Datos RPG de un arquetipo enemigo de `data/enemies.json` (nombre, nivel, XP, botín). */
export interface EnemyInfoDef {
  /** Id del arquetipo de la simulación. */
  id: string;
  name: string;
  level: number;
  xp: number;
  /** Id de `LootTableDef`, o null si no suelta nada. */
  lootTable: string | null;
  /** Elemento de su ataque (por defecto físico). */
  element: Element;
  /** Armadura, resistencias, etc. */
  stats: StatBlock;
}

/** Botín en el suelo, para quien lo dibuje o lo liste. */
export interface GroundLootView {
  id: number;
  x: number;
  y: number;
  /** Objeto, o null si son monedas. */
  item: ItemInstance | null;
  gold: number;
  rarity: Rarity;
}
