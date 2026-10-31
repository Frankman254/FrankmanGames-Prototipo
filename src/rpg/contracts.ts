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
  | { type: 'zone'; radius: number; duration: number; every: number; effects: EffectDef[] }
  // Combate v2: desplazamientos de los hechizos de clase (no hay evasión genérica).
  /** El lanzador aparece en el punto apuntado (a ≤ maxDistance), sin necesitar línea de visión. */
  | { type: 'blink'; maxDistance: number }
  /** Lanzador y objetivo intercambian sus posiciones. */
  | { type: 'swap' }
  /** El objetivo es atraído hacia el lanzador (como mucho `distance`; se para al tocarlo). */
  | { type: 'pull'; distance: number }
  /** El lanzador sale despedido `distance` en sentido contrario al punto apuntado. */
  | { type: 'recoil'; distance: number };

export interface SpellDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  element: Element;
  /** Clase de origen; null = universal (pergaminos). Cualquier clase puede equiparlo (PROPUESTA). */
  classId: string | null;
  /** Nivel en que la clase de origen lo aprende automáticamente; 1 si falta. */
  unlockLevel?: number;
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
  /** Combate v2: un área también alcanza a aliados y mascotas (no al lanzador). Por defecto no. */
  friendlyFire?: boolean;
  /** Combate v2: se lanza sin pararse (y, con `castTime`, se carga andando). Por defecto no. */
  castWhileMoving?: boolean;
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
  // Combate v2: mecánicas defensivas (sustituyen a la evasión genérica).
  /** Inmunidad: no recibe daño, perjuicios ni desplazamientos ajenos. */
  immune?: boolean;
  /** Reenvío: los hechizos de un objetivo (no el ataque básico) vuelven al lanzador. */
  reflect?: boolean;
  /** Contra: devuelve `percent` % de cada golpe cuerpo a cuerpo recibido a quien lo dio. */
  counter?: { percent: number };
  /** Retroceso: al acabarse el estado vuelve a la posición y la vida que tenía al recibirlo. */
  rewind?: boolean;
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
  /** Añadido en el Slice 06 (opcional para no romper contenidos falsos de la interfaz). */
  quests?: Record<string, QuestDef>;
  /** Añadido en el Slice 06. */
  npcs?: Record<string, NpcDef>;
  progression: {
    maxLevel: number;
    /** xpToNext(n) = round(base · n^exponent). */
    xp: { base: number; exponent: number };
    statPointsPerLevel: number;
    resistCap: number; // % máximo de resistencia (combate v2: única defensa; no hay armadura)
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
  /** Añadido en `muerte-botin`: energía («Pulso»). Falta en sesiones sin ella. */
  energy?: EnergyView;
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
  | { type: 'message'; text: string }
  /** Añadido en el Slice 05: el jugador llegó junto a un mercader y le habló. */
  | { type: 'openMerchant'; merchantId: string }
  // Añadidos en el Slice 06 (misiones y diálogos).
  /** El jugador llegó junto a un PNJ con diálogo y le habló (la interfaz abre el diálogo). */
  | { type: 'talkNpc'; npcId: string }
  /** El mundo avisa de un enemigo abatido por el jugador o sus aliados (objetivos de matar). */
  | { type: 'enemyKilled'; archetype: string }
  /** El mundo avisa de una captura en la pesca (itemId null = sólo monedas). */
  | { type: 'fished'; itemId: string | null }
  | { type: 'questAccepted'; questId: string }
  /** Un objetivo avanzó (también al retroceder un objetivo de recoger si se suelta el objeto). */
  | { type: 'questProgress'; questId: string; objective: number; text: string; current: number; required: number }
  /** Todos los objetivos cumplidos: falta entregarla. */
  | { type: 'questReady'; questId: string }
  | { type: 'questCompleted'; questId: string }
  | { type: 'questAbandoned'; questId: string }
  /** Zonas con franja de niveles: el jugador entró en otra zona (la interfaz enseña el aviso). */
  | { type: 'zoneEnter'; zoneId: string; name: string; levelMin: number; levelMax: number; safe: boolean }
  /** Añadido en `muerte-botin`: acabó un combate con botín (la interfaz abre la ventana de botín). */
  | { type: 'spoils'; spoils: SpoilsView };

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
  /** Devuelve todos los puntos principales asignados a la reserva libre. */
  resetStatPoints(): CommandResult;
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

  // Añadido en el Slice 05 (mercaderes). Opcionales.
  merchant?(merchantId: string): MerchantView | null;
  buy?(merchantId: string, index: number, quantity: number): CommandResult;
  sell?(merchantId: string, uid: string, quantity: number): CommandResult;
  buyBack?(merchantId: string, index: number): CommandResult;

  // Añadido en el Slice 06 (misiones y diálogos). Opcionales.
  /** Empieza (o retoma) la conversación con un PNJ. null si no tiene diálogo. */
  talk?(npcId: string): DialogueView | null;
  /** Elige una opción de la conversación abierta. Devuelve el siguiente nodo o null si se cerró. */
  chooseDialogue?(index: number): DialogueView | null;
  /** Conversación abierta, o null. */
  dialogue?(): DialogueView | null;
  endDialogue?(): void;
  /** Diario: misiones activas, por entregar y completadas (no las bloqueadas ni las sin aceptar). */
  quests?(): QuestView[];
  /** Misión seguida en el HUD (null = ninguna). */
  trackedQuest?(): QuestView | null;
  trackQuest?(questId: string | null): CommandResult;
  abandonQuest?(questId: string): CommandResult;
  /** «!» (misión disponible) o «?» (misión por entregar) sobre un PNJ. */
  npcMarker?(npcId: string): NpcMarker | null;

  // Añadido en `muerte-botin` (energía y botín de fin de combate). Opcionales.
  /** Botín de los combates terminados que aún no se recogió (null = nada pendiente). */
  spoils?(): SpoilsView | null;
  /** Recoge del botín pendiente: un objeto por uid, 'gold' (monedas) o 'all'. Lo que no cabe se queda. */
  takeSpoils?(which: string): CommandResult;
  /** Cierra el botín: recoge lo que quepa y lo demás cae a los pies del jugador. */
  closeSpoils?(): void;
  /** Registra una muerte y devuelve la pérdida de energía. */
  onDeath?(): { lost: number; value: number; max: number; exhausted: boolean; justExhausted: boolean };
  /** Recupera energía al descansar junto a una piedra de viaje. */
  restEnergy?(dt: number): void;
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
  /** Añadido en el Slice 06. Falta en guardados anteriores (= ninguna misión). */
  quests?: QuestSaveData;
  /** Añadido en `muerte-botin`. Falta en guardados anteriores (= energía inicial). */
  energy?: EnergySaveData;
  /** Añadido en `guardado-presets`: dónde estaba el jugador. Falta en guardados anteriores (= en su Piedra Pintada). */
  place?: SavePlace;
  /** Añadido en `guardado-presets`: nombre de la ranura que eligió el jugador (si falta, el del personaje). */
  label?: string;
}

// ─── Lugar del guardado (añadido en `guardado-presets`) ─────────────────────

export const PLACE_SCENES = ['overworld', 'dungeon'] as const;
export type PlaceScene = (typeof PLACE_SCENES)[number];

/**
 * Dónde estaba el jugador al guardar. Al cargar se le pone exactamente ahí; si
 * el sitio ya no existe (piso quitado, casilla bloqueada, fuera del mundo), en
 * la Piedra Pintada conocida más cercana. Lógica en `src/world/placement.ts`.
 */
export interface SavePlace {
  scene: PlaceScene;
  /** Mazmorra (hoy sólo `crypt`); null en el mundo abierto. */
  dungeon: string | null;
  /** Piso de la mazmorra (0 = el primero); null en el mundo abierto. */
  floor: number | null;
  /** Posición en el plano XZ de la escena; null = en la Piedra Pintada `stone` (o la llegada del piso). */
  x: number | null;
  y: number | null;
  /** Piedra Pintada activa (punto de reaparición). */
  stone: string | null;
  /** Piedras Pintadas conocidas (si falta, las guardadas aparte por personaje). */
  knownStones?: string[];
  /** Hora del día 0..1 (0,5 = mediodía); null = la que haya. */
  timeOfDay: number | null;
  /** Segundos jugados con este personaje. */
  playSeconds?: number;
  /** Rótulo del sitio para la lista de ranuras («Llanos de Azuero», «Cripta · piso 2»). */
  name?: string;
}

// ─── Mercaderes (añadido en el Slice 05) ────────────────────────────────────

/** Mercader del mundo: dónde está y qué vende. Datos en `data/rpg/merchants.json`. */
export interface MerchantDef {
  id: string;
  name: string;
  /** Oficio que se ve bajo el nombre ("Herrera", "Boticario"…). */
  title: string;
  greeting: string;
  /** Posición en el plano XZ de la zona continua. */
  position: { x: number; y: number };
  /** Paleta de `data/assets.json` → `npc` para su modelo. */
  look: string;
  /** Precio de compra = valor × multiplicador de rareza × buyMultiplier. */
  buyMultiplier: number;
  /** null = existencias ilimitadas. */
  stock: { itemId: string; quantity: number | null }[];
  /** Cuántos objetos vendidos guarda para recomprar. */
  buybackSize: number;
}

export interface MerchantOffer {
  index: number;
  item: ItemInstance;
  /** Precio por unidad. */
  price: number;
  /** null = ilimitado. */
  quantity: number | null;
}

export interface MerchantView {
  id: string;
  name: string;
  title: string;
  greeting: string;
  stock: MerchantOffer[];
  /** Lo que el jugador le vendió en esta visita (se recompra al mismo precio). */
  buyback: MerchantOffer[];
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

// ─── Misiones y diálogos (añadido en el Slice 06) ──────────────────────────
//
// Datos en `data/rpg/npcs.json` y `data/rpg/quests.json` (PROPUESTA). Lógica en
// `src/rpg/quests.ts`. Un tipo de objetivo nuevo = subclase de `QuestObjective`
// y entrada en su registro; un PNJ, una misión o un diálogo nuevos son datos.

/**
 * Estado de una misión para el jugador:
 * locked (faltan requisitos), available (se puede aceptar), active (en curso),
 * ready (objetivos cumplidos, falta entregarla), completed.
 */
export const QUEST_STATES = ['locked', 'available', 'active', 'ready', 'completed'] as const;
export type QuestState = (typeof QUEST_STATES)[number];

export type QuestObjectiveDef =
  /** Matar `count` enemigos de cualquiera de esos arquetipos. `spawn` los pone en el mundo al aceptar (y al cargar) para que existan. */
  | { type: 'kill'; archetypes: string[]; count: number; text: string; spawn?: { x: number; y: number; radius: number } }
  /** Tener `count` en la mochila. `consume` = se entregan al terminar (si no, sólo se enseñan). */
  | { type: 'collect'; itemId: string; count: number; consume: boolean; text: string }
  /** Sacar `count` capturas del agua; `itemIds` vacío = cualquier objeto pescado. */
  | { type: 'fish'; itemIds: string[]; count: number; text: string }
  /** Hablar con un PNJ. */
  | { type: 'talk'; npcId: string; text: string }
  /** Llegar a menos de `radius` m de un punto. */
  | { type: 'reach'; x: number; y: number; radius: number; text: string };

export interface QuestRewardDef {
  xp: number;
  gold: number;
  items: { itemId: string; quantity: number }[];
  /** Hechizo que se aprende (o sube de rango) al entregarla. */
  learnSpell: string | null;
}

export interface QuestDef {
  id: string;
  name: string;
  /** Resumen para el diario. */
  summary: string;
  /** Agrupa misiones en el diario ("Encargos del pueblo"…). */
  chain: string | null;
  /** PNJ que la ofrece y PNJ al que se entrega. */
  giver: string;
  turnIn: string;
  minLevel: number;
  /** Misiones que hay que haber completado antes (cadenas). */
  requires: string[];
  /** Lo que dice el PNJ al ofrecerla, mientras está en curso y al entregarla. */
  offerText: string;
  progressText: string;
  completeText: string;
  objectives: QuestObjectiveDef[];
  rewards: QuestRewardDef;
}

/** Condición de una entrada o una opción de diálogo. Todas las de una lista deben cumplirse. */
export type DialogueCondition =
  | { type: 'quest'; questId: string; states: QuestState[] }
  | { type: 'level'; min: number; max: number }
  | { type: 'hasItem'; itemId: string; quantity: number }
  | { type: 'not'; condition: DialogueCondition };

/** Lo que hace una opción además de saltar de nodo. */
export type DialogueAction =
  | { type: 'acceptQuest'; questId: string }
  | { type: 'completeQuest'; questId: string }
  /** Abre la tienda del mercader (sólo PNJ mercaderes). */
  | { type: 'openShop' };

export interface DialogueOptionDef {
  text: string;
  conditions: DialogueCondition[];
  actions: DialogueAction[];
  /** Nodo siguiente; null = termina la conversación. */
  next: string | null;
}

export interface DialogueNodeDef {
  text: string;
  options: DialogueOptionDef[];
}

export interface DialogueDef {
  /** Primer nodo cuyas condiciones se cumplen (permite saludos distintos según el estado). */
  entry: { node: string; conditions: DialogueCondition[] }[];
  nodes: Record<string, DialogueNodeDef>;
}

/** PNJ general. Si `merchantId` no es null, su nombre, sitio y aspecto salen del mercader. */
export interface NpcDef {
  id: string;
  name: string;
  title: string;
  position: { x: number; y: number };
  /** Paleta de `data/assets.json` → `npc`. */
  look: string;
  merchantId: string | null;
  dialogue: DialogueDef;
}

export type NpcMarker = 'available' | 'ready';

export interface QuestObjectiveView {
  text: string;
  current: number;
  required: number;
  done: boolean;
}

export interface QuestView {
  id: string;
  name: string;
  summary: string;
  chain: string | null;
  state: QuestState;
  giver: { id: string; name: string };
  turnIn: { id: string; name: string };
  objectives: QuestObjectiveView[];
  rewards: QuestRewardDef;
  tracked: boolean;
}

export type DialogueOptionKind = 'talk' | 'offer' | 'accept' | 'turnIn' | 'progress' | 'shop' | 'bye';

export interface DialogueView {
  npcId: string;
  name: string;
  title: string;
  text: string;
  /** Misión de la que se habla en este nodo (para mostrar objetivos y recompensas). */
  quest: QuestView | null;
  options: { index: number; text: string; kind: DialogueOptionKind }[];
}

export interface QuestSaveData {
  /** Misiones en curso con el progreso de cada objetivo (los de recoger se cuentan en la mochila). */
  active: { questId: string; progress: number[] }[];
  completed: string[];
  tracked: string | null;
}

// ─── Energía y botín de fin de combate (añadido en `muerte-botin`) ──────────
//
// Datos en `data/rpg/energy.json` y `data/rpg/spoils.json` (PROPUESTA). Lógica
// en `src/rpg/energy.ts` y `src/rpg/spoils.ts`.

export interface EnergySaveData {
  value: number;
  /** Agotado (llegó a 0 y aún no recuperó `penalty.clearAt`). */
  exhausted: boolean;
}

export interface EnergyView {
  id: string;
  name: string;
  description: string;
  color: string;
  value: number;
  max: number;
  exhausted: boolean;
  /** Penalización vigente (null si no está agotado). */
  penalty: { name: string; description: string; clearAt: number } | null;
}

/** Botín de fin de combate pendiente de recoger (puede juntar varios combates). */
export interface SpoilsView {
  /** Crece con cada combate que se añade. */
  id: number;
  gold: number;
  /** XP ganada (ya sumada al personaje al abatir a cada enemigo). */
  xp: number;
  kills: number;
  seconds: number;
  /** Parte del jugador en el último combate (0..1). */
  share: number;
  items: ItemInstance[];
  /** Segundos que la ventana tarda en cerrarse sola (`data/rpg/spoils.json`). */
  autoCloseSeconds?: number;
  /** Quiénes participaron en el último combate y su parte. */
  participants: { id: string; name: string; share: number }[];
}
