// Contenido de ejemplo para construir la interfaz sin la lógica real.
// NO es el contenido del juego: la rama `slice03-sistemas` carga el suyo desde
// `data/rpg/*.json`. Nombres sacados de docs/ALCANCE_SLICE_03.md; cifras
// inventadas para que las pantallas se vean creíbles (PROPUESTA de nada).
import type {
  ClassDef,
  ContentDb,
  EffectDef,
  Element,
  ItemDef,
  ItemSetDef,
  PetDef,
  SpellDef,
  StatModifier,
  StatusDef,
} from '../../../rpg/contracts';

type Mod = Omit<StatModifier, 'source'>;
const flat = (stat: Mod['stat'], value: number): Mod => ({ stat, op: 'flat', value });
const pct = (stat: Mod['stat'], value: number): Mod => ({ stat, op: 'percent', value });

// ─── Clases ─────────────────────────────────────────────────────────────────

const classes: ClassDef[] = [
  {
    id: 'ember_vanguard',
    name: 'Vanguardia de Brasa',
    description:
      'Lucha en primera línea con acero y fuego. Aguanta golpes, rompe filas y quema lo que deja en pie.',
    role: 'Cuerpo a cuerpo',
    icon: 'class_ember',
    resource: { id: 'vigor', name: 'Vigor', color: '#e0742b', max: 100, regenPerSecond: 14 },
    baseStats: {
      strength: 14, agility: 8, intellect: 4, vitality: 14, spirit: 6,
      maxHealth: 160, healthRegen: 1.5, armor: 6, critChance: 0.05, critBonus: 0.5,
      moveSpeed: 5, pickupRadius: 2, 'resist.fire': 10,
    },
    statsPerLevel: { strength: 2, vitality: 2, agility: 1, maxHealth: 14, armor: 1 },
    affinity: ['fire', 'physical'],
    affinityBonus: 10,
    startingSpells: ['ignite_slash', 'charge', 'ember_whirl', 'iron_shout'],
    startingItems: [
      { itemId: 'short_sword', quantity: 1 },
      { itemId: 'explorer_tunic', quantity: 1 },
      { itemId: 'minor_health_potion', quantity: 5 },
      { itemId: 'resource_tonic', quantity: 2 },
    ],
    startingHotbar: ['ignite_slash', 'charge', 'ember_whirl', 'iron_shout', null, null],
  },
  {
    id: 'storm_weaver',
    name: 'Tejedora de Tormentas',
    description:
      'Teje rayos y escarcha a distancia. Frágil de cerca, pero controla el campo como nadie.',
    role: 'A distancia',
    icon: 'class_storm',
    resource: { id: 'mana', name: 'Maná', color: '#4a8fe7', max: 220, regenPerSecond: 7 },
    baseStats: {
      strength: 4, agility: 11, intellect: 15, vitality: 8, spirit: 10,
      maxHealth: 110, healthRegen: 1, armor: 2, critChance: 0.08, critBonus: 0.5,
      moveSpeed: 5.2, pickupRadius: 2, 'resist.frost': 10, 'resist.storm': 10,
    },
    statsPerLevel: { intellect: 2, agility: 2, spirit: 1, maxHealth: 9, maxResource: 8 },
    affinity: ['storm', 'frost'],
    affinityBonus: 10,
    startingSpells: ['spark', 'glacial_lance', 'frost_nova', 'lightning_step'],
    startingItems: [
      { itemId: 'copper_wand', quantity: 1 },
      { itemId: 'apprentice_robe', quantity: 1 },
      { itemId: 'minor_health_potion', quantity: 5 },
      { itemId: 'resource_tonic', quantity: 3 },
    ],
    startingHotbar: ['spark', 'glacial_lance', 'frost_nova', 'lightning_step', null, null],
  },
];

// ─── Hechizos ───────────────────────────────────────────────────────────────

const SPELL_DEFAULTS = {
  globalCooldown: 0.6,
  castTime: 0,
  projectileSpeed: null,
  maxRank: 5,
  perRank: { effectPercent: 12, costPercent: 4 },
  critChance: 0,
  critBonus: 0,
  tags: [] as string[],
};

function spell(
  s: Pick<SpellDef, 'id' | 'name' | 'description' | 'element' | 'classId' | 'resourceCost' | 'cooldown' | 'range' | 'area' | 'effects'> &
    Partial<SpellDef>,
): SpellDef {
  return { ...SPELL_DEFAULTS, icon: `spell_${s.element}`, ...s };
}

const dmg = (min: number, max: number, element: Element, scaling = 0.5): EffectDef =>
  ({ type: 'damage', min, max, element, scaling });
const st = (statusId: string, duration?: number, chance?: number): EffectDef => ({
  type: 'status', statusId, ...(duration !== undefined ? { duration } : {}), ...(chance !== undefined ? { chance } : {}),
});

const spells: SpellDef[] = [
  // Vanguardia de Brasa
  spell({ id: 'ignite_slash', name: 'Tajo ígneo', description: 'Un golpe único y pesado que deja el filo al rojo.',
    element: 'fire', classId: 'ember_vanguard', resourceCost: 25, cooldown: 4, range: 2.5, area: { type: 'single' },
    effects: [dmg(22, 30, 'fire', 0.9)], critChance: 0.05, critBonus: 0.25, tags: ['golpe'] }),
  spell({ id: 'charge', name: 'Embestida', description: 'Carga hacia delante, golpea lo que encuentra y lo aparta.',
    element: 'physical', classId: 'ember_vanguard', resourceCost: 20, cooldown: 8, range: 7, area: { type: 'line', length: 7, width: 1.6 },
    effects: [{ type: 'dash', distance: 7 }, dmg(10, 16, 'physical', 0.5), { type: 'knockback', distance: 2.5 }], tags: ['movilidad'] }),
  spell({ id: 'ember_whirl', name: 'Remolino de brasas', description: 'Gira con el arma encendida y quema a todos los que te rodean.',
    element: 'fire', classId: 'ember_vanguard', resourceCost: 35, cooldown: 10, range: 0, area: { type: 'circle', radius: 3.5, atTarget: false },
    effects: [dmg(14, 20, 'fire', 0.6), st('burn', 4, 0.6)], tags: ['área'] }),
  spell({ id: 'iron_shout', name: 'Grito de hierro', description: 'Un grito que endurece la piel y aviva el golpe durante unos segundos.',
    element: 'physical', classId: 'ember_vanguard', resourceCost: 15, cooldown: 20, range: 0, area: { type: 'self' },
    effects: [st('iron_shout', 8)], globalCooldown: 0.4, tags: ['mejora'] }),
  spell({ id: 'searing_brand', name: 'Marca ardiente', description: 'Graba una marca de fuego que consume al objetivo poco a poco.',
    element: 'fire', classId: 'ember_vanguard', resourceCost: 20, cooldown: 6, range: 3, area: { type: 'single' },
    effects: [dmg(6, 8, 'fire', 0.3), st('burn', 6)], tags: ['daño en el tiempo'] }),
  spell({ id: 'bulwark', name: 'Baluarte', description: 'Levanta un escudo de calor que absorbe el siguiente castigo.',
    element: 'fire', classId: 'ember_vanguard', resourceCost: 30, cooldown: 18, range: 0, area: { type: 'self' },
    effects: [{ type: 'shield', amount: 60, duration: 6 }, st('shielded', 6)], tags: ['defensa'] }),
  // Tejedora de Tormentas
  spell({ id: 'spark', name: 'Chispa', description: 'Proyectil eléctrico rápido y barato.',
    element: 'storm', classId: 'storm_weaver', resourceCost: 8, cooldown: 0, range: 14, area: { type: 'single' },
    effects: [dmg(9, 13, 'storm', 0.6)], projectileSpeed: 22, globalCooldown: 0.5, tags: ['proyectil'] }),
  spell({ id: 'glacial_lance', name: 'Lanza glacial', description: 'Una lanza de hielo que atraviesa la fila entera y la frena.',
    element: 'frost', classId: 'storm_weaver', resourceCost: 30, cooldown: 6, range: 12, area: { type: 'line', length: 12, width: 1.2 },
    effects: [dmg(18, 26, 'frost', 0.8), st('slow', 3)], projectileSpeed: 18, tags: ['línea', 'control'] }),
  spell({ id: 'frost_nova', name: 'Nova de escarcha', description: 'Una onda helada a tu alrededor que clava los pies al suelo.',
    element: 'frost', classId: 'storm_weaver', resourceCost: 40, cooldown: 14, range: 0, area: { type: 'circle', radius: 4, atTarget: false },
    effects: [dmg(10, 14, 'frost', 0.4), st('rooted', 2)], tags: ['área', 'control'] }),
  spell({ id: 'lightning_step', name: 'Paso del relámpago', description: 'Te deshaces en chispas y reapareces unos metros más allá.',
    element: 'storm', classId: 'storm_weaver', resourceCost: 25, cooldown: 9, range: 8, area: { type: 'self' },
    effects: [{ type: 'teleport', maxDistance: 8 }], globalCooldown: 0, tags: ['movilidad'] }),
  spell({ id: 'static_field', name: 'Campo estático', description: 'Electrifica una zona del suelo durante unos segundos.',
    element: 'storm', classId: 'storm_weaver', resourceCost: 45, cooldown: 12, range: 12, area: { type: 'circle', radius: 3, atTarget: true },
    effects: [dmg(5, 7, 'storm', 0.25), st('slow', 2, 0.5)], castTime: 0.4, tags: ['área', 'zona'] }),
  spell({ id: 'voltaic_arc', name: 'Arco voltaico', description: 'Un abanico de rayos frente a ti.',
    element: 'storm', classId: 'storm_weaver', resourceCost: 35, cooldown: 7, range: 0, area: { type: 'cone', length: 7, angleDeg: 70 },
    effects: [dmg(16, 24, 'storm', 0.7)], tags: ['cono'] }),
  // Universales (pergaminos)
  spell({ id: 'light_bandage', name: 'Vendaje de luz', description: 'Cierra heridas con una venda de luz.',
    element: 'earth', classId: null, resourceCost: 25, cooldown: 15, range: 0, area: { type: 'self' },
    effects: [{ type: 'heal', min: 30, max: 40, scaling: 0.5 }, st('regeneration', 5)], icon: 'spell_heal', tags: ['cura'] }),
  spell({ id: 'stoneskin', name: 'Piel de piedra', description: 'La piel se vuelve roca: más armadura, menos prisa.',
    element: 'earth', classId: null, resourceCost: 20, cooldown: 25, range: 0, area: { type: 'self' },
    effects: [st('stoneskin', 10)], tags: ['defensa'] }),
  spell({ id: 'wolf_spirit', name: 'Espíritu lobuno', description: 'Llama a un lobo espectral que pelea a tu lado un rato.',
    element: 'physical', classId: null, resourceCost: 40, cooldown: 40, range: 4, area: { type: 'self' },
    effects: [{ type: 'summon', archetype: 'spirit_wolf', count: 1, duration: 15 }], tags: ['invocación'] }),
  spell({ id: 'gust', name: 'Ráfaga', description: 'Un golpe de viento que aparta a todo lo que tienes delante.',
    element: 'storm', classId: null, resourceCost: 20, cooldown: 10, range: 0, area: { type: 'cone', length: 5, angleDeg: 80 },
    effects: [dmg(4, 6, 'storm', 0.2), { type: 'knockback', distance: 4 }], tags: ['cono', 'empuje'] }),
];

// ─── Estados ────────────────────────────────────────────────────────────────

const statuses: StatusDef[] = [
  { id: 'burn', name: 'Quemadura', description: 'Pierde vida cada segundo.', icon: 'status_burn', kind: 'debuff', duration: 4, maxStacks: 3,
    modifiers: [], tick: { every: 1, effect: { type: 'damage', min: 3, max: 4, element: 'fire' } } },
  { id: 'slow', name: 'Ralentización', description: 'Se mueve más despacio.', icon: 'status_slow', kind: 'debuff', duration: 3, maxStacks: 1,
    modifiers: [pct('moveSpeed', -35)] },
  { id: 'rooted', name: 'Inmovilizado', description: 'No puede moverse, pero sí atacar.', icon: 'status_root', kind: 'debuff', duration: 2, maxStacks: 1,
    modifiers: [], control: 'root' },
  { id: 'stunned', name: 'Aturdido', description: 'No puede moverse ni actuar.', icon: 'status_stun', kind: 'debuff', duration: 1.2, maxStacks: 1,
    modifiers: [], control: 'stun' },
  { id: 'shielded', name: 'Escudo', description: 'Un escudo absorbe el daño recibido.', icon: 'status_shield', kind: 'buff', duration: 6, maxStacks: 1,
    modifiers: [] },
  { id: 'iron_shout', name: 'Grito de hierro', description: 'Más daño y más armadura.', icon: 'status_shout', kind: 'buff', duration: 8, maxStacks: 1,
    modifiers: [flat('power', 15), flat('armor', 8)] },
  { id: 'stoneskin', name: 'Piel de piedra', description: 'Mucha armadura, algo más lento.', icon: 'status_stone', kind: 'buff', duration: 10, maxStacks: 1,
    modifiers: [flat('armor', 20), pct('moveSpeed', -10)] },
  { id: 'regeneration', name: 'Regeneración', description: 'Recupera vida cada segundo.', icon: 'status_regen', kind: 'buff', duration: 5, maxStacks: 1,
    modifiers: [], tick: { every: 1, effect: { type: 'heal', min: 4, max: 4 } } },
  { id: 'haste', name: 'Prisa', description: 'Se mueve y se recupera más rápido.', icon: 'status_haste', kind: 'buff', duration: 20, maxStacks: 1,
    modifiers: [pct('moveSpeed', 20), flat('cooldownReduction', 0.1)] },
];

// ─── Objetos ────────────────────────────────────────────────────────────────

const ITEM_DEFAULTS = { implicit: [] as Mod[], rolls: [] as ItemDef['rolls'], maxStack: 1, dropWeight: 10 };

function item(i: Pick<ItemDef, 'id' | 'name' | 'description' | 'icon' | 'category' | 'slot' | 'rarity' | 'level' | 'value'> & Partial<ItemDef>): ItemDef {
  return { ...ITEM_DEFAULTS, ...i };
}

const items: ItemDef[] = [
  // Armas
  item({ id: 'short_sword', name: 'Espada corta', description: 'Hoja recta y fiable.', icon: 'sword', category: 'weapon', slot: 'weapon',
    rarity: 'common', level: 1, value: 12, weapon: { min: 6, max: 10, element: 'physical', speed: 1.4, range: 2 },
    rolls: [{ stat: 'strength', op: 'flat', min: 1, max: 3 }] }),
  item({ id: 'woodcutter_axe', name: 'Hacha de leñador', description: 'Pensada para troncos; sirve igual para otras cosas.', icon: 'axe',
    category: 'weapon', slot: 'weapon', rarity: 'uncommon', level: 3, value: 30, weapon: { min: 9, max: 16, element: 'physical', speed: 1.0, range: 2.2 },
    rolls: [{ stat: 'strength', op: 'flat', min: 2, max: 5 }, { stat: 'critBonus', op: 'flat', min: 0.05, max: 0.15 }] }),
  item({ id: 'smith_mace', name: 'Maza de herrero', description: 'Pesa como un yunque pequeño.', icon: 'mace', category: 'weapon', slot: 'weapon',
    rarity: 'rare', level: 5, value: 70, weapon: { min: 13, max: 19, element: 'fire', speed: 0.8, range: 2 },
    implicit: [flat('damage.fire', 3)], rolls: [{ stat: 'strength', op: 'flat', min: 3, max: 6 }, { stat: 'vitality', op: 'flat', min: 2, max: 5 }] }),
  item({ id: 'oak_staff', name: 'Bastón de roble', description: 'Una rama recta con nudos que guardan algo de savia mágica.', icon: 'staff',
    category: 'weapon', slot: 'weapon', rarity: 'uncommon', level: 3, value: 28, weapon: { min: 5, max: 9, element: 'earth', speed: 1.1, range: 9 },
    rolls: [{ stat: 'intellect', op: 'flat', min: 2, max: 4 }, { stat: 'maxResource', op: 'flat', min: 10, max: 25 }] }),
  item({ id: 'copper_wand', name: 'Varita de cobre', description: 'Hormiguea al tocarla.', icon: 'wand', category: 'weapon', slot: 'weapon',
    rarity: 'common', level: 1, value: 12, weapon: { min: 4, max: 7, element: 'storm', speed: 1.6, range: 11 },
    rolls: [{ stat: 'intellect', op: 'flat', min: 1, max: 3 }] }),
  item({ id: 'storm_orb', name: 'Orbe de tormenta', description: 'Dentro gira una nube diminuta que nunca se calma.', icon: 'orb',
    category: 'weapon', slot: 'weapon', rarity: 'epic', level: 7, value: 160, weapon: { min: 8, max: 14, element: 'storm', speed: 1.3, range: 12 },
    implicit: [flat('damage.storm', 4)], rolls: [{ stat: 'intellect', op: 'flat', min: 4, max: 8 }, { stat: 'critChance', op: 'flat', min: 0.02, max: 0.05 }, { stat: 'resourceRegen', op: 'flat', min: 0.5, max: 1.5 }] }),
  // Set del Explorador (4)
  item({ id: 'explorer_hood', name: 'Capucha del Explorador', description: 'Huele a lluvia y a hoguera.', icon: 'head', category: 'armor', slot: 'head',
    rarity: 'uncommon', level: 2, value: 18, setId: 'explorer', implicit: [flat('armor', 2)], rolls: [{ stat: 'agility', op: 'flat', min: 1, max: 3 }] }),
  item({ id: 'explorer_tunic', name: 'Jubón del Explorador', description: 'Cuero curtido con muchos bolsillos.', icon: 'chest', category: 'armor', slot: 'chest',
    rarity: 'uncommon', level: 1, value: 26, setId: 'explorer', implicit: [flat('armor', 4)], rolls: [{ stat: 'vitality', op: 'flat', min: 1, max: 4 }] }),
  item({ id: 'explorer_gloves', name: 'Guantes del Explorador', description: 'Gastados en los nudillos.', icon: 'hands', category: 'armor', slot: 'hands',
    rarity: 'uncommon', level: 2, value: 15, setId: 'explorer', implicit: [flat('armor', 1)], rolls: [{ stat: 'strength', op: 'flat', min: 1, max: 3 }] }),
  item({ id: 'explorer_boots', name: 'Botas del Explorador', description: 'Cómodas después de mil leguas.', icon: 'feet', category: 'armor', slot: 'feet',
    rarity: 'uncommon', level: 2, value: 15, setId: 'explorer', implicit: [flat('armor', 1), pct('moveSpeed', 3)], rolls: [{ stat: 'agility', op: 'flat', min: 1, max: 2 }] }),
  // Set del Aprendiz de Tormenta (3)
  item({ id: 'apprentice_cap', name: 'Capirote del Aprendiz de Tormenta', description: 'Puntiagudo; atrae chispas.', icon: 'head', category: 'armor', slot: 'head',
    rarity: 'uncommon', level: 2, value: 18, setId: 'storm_apprentice', implicit: [flat('armor', 1)], rolls: [{ stat: 'intellect', op: 'flat', min: 1, max: 3 }] }),
  item({ id: 'apprentice_robe', name: 'Túnica del Aprendiz de Tormenta', description: 'Bordada con rayos torcidos de aprendiz.', icon: 'chest', category: 'armor', slot: 'chest',
    rarity: 'uncommon', level: 1, value: 24, setId: 'storm_apprentice', implicit: [flat('armor', 2)], rolls: [{ stat: 'spirit', op: 'flat', min: 1, max: 4 }] }),
  item({ id: 'apprentice_sandals', name: 'Sandalias del Aprendiz de Tormenta', description: 'Suelas de corcho: nada de descargas.', icon: 'feet', category: 'armor', slot: 'feet',
    rarity: 'uncommon', level: 2, value: 14, setId: 'storm_apprentice', implicit: [flat('resist.storm', 5)], rolls: [{ stat: 'agility', op: 'flat', min: 1, max: 2 }] }),
  // Sueltas
  item({ id: 'dented_helm', name: 'Yelmo abollado', description: 'Alguien lo usó antes. Y le dieron.', icon: 'head', category: 'armor', slot: 'head',
    rarity: 'common', level: 1, value: 8, implicit: [flat('armor', 3)], rolls: [{ stat: 'vitality', op: 'flat', min: 0, max: 2 }] }),
  item({ id: 'ring_mail', name: 'Cota de anillas', description: 'Tintinea a cada paso.', icon: 'chest', category: 'armor', slot: 'chest',
    rarity: 'rare', level: 4, value: 55, implicit: [flat('armor', 9)], rolls: [{ stat: 'vitality', op: 'flat', min: 2, max: 5 }, { stat: 'resist.physical', op: 'flat', min: 2, max: 6 }] }),
  item({ id: 'leather_gauntlets', name: 'Manoplas de cuero', description: 'Gruesas y algo torpes.', icon: 'hands', category: 'armor', slot: 'hands',
    rarity: 'common', level: 1, value: 7, implicit: [flat('armor', 2)], rolls: [] }),
  item({ id: 'traveler_boots', name: 'Botas de viajero', description: 'Suela nueva, cordones viejos.', icon: 'feet', category: 'armor', slot: 'feet',
    rarity: 'common', level: 1, value: 7, implicit: [pct('moveSpeed', 5)], rolls: [] }),
  item({ id: 'pine_buckler', name: 'Broquel de pino', description: 'Pequeño, ligero y con olor a resina.', icon: 'shield', category: 'armor', slot: 'offhand',
    rarity: 'uncommon', level: 2, value: 20, implicit: [flat('armor', 4)], rolls: [{ stat: 'resist.fire', op: 'flat', min: 2, max: 6 }] }),
  // Joyas
  item({ id: 'copper_ring', name: 'Anillo de cobre', description: 'Deja el dedo verde.', icon: 'ring', category: 'jewel', slot: 'ring',
    rarity: 'common', level: 1, value: 10, rolls: [{ stat: 'maxHealth', op: 'flat', min: 5, max: 15 }] }),
  item({ id: 'thrush_ring', name: 'Anillo del zorzal', description: 'Grabado con un pájaro que canta al alba.', icon: 'ring', category: 'jewel', slot: 'ring',
    rarity: 'rare', level: 4, value: 60, rolls: [{ stat: 'agility', op: 'flat', min: 2, max: 5 }, { stat: 'critChance', op: 'flat', min: 0.01, max: 0.04 }] }),
  item({ id: 'amber_amulet', name: 'Amuleto de ámbar', description: 'Un insecto antiguo duerme dentro.', icon: 'amulet', category: 'jewel', slot: 'amulet',
    rarity: 'uncommon', level: 2, value: 32, rolls: [{ stat: 'vitality', op: 'flat', min: 2, max: 4 }, { stat: 'healthRegen', op: 'flat', min: 0.3, max: 1 }] }),
  item({ id: 'frost_pendant', name: 'Colgante de escarcha', description: 'Siempre frío, incluso junto al fuego.', icon: 'amulet', category: 'jewel', slot: 'amulet',
    rarity: 'legendary', level: 8, value: 320, implicit: [flat('damage.frost', 5)],
    rolls: [{ stat: 'intellect', op: 'flat', min: 5, max: 9 }, { stat: 'power', op: 'flat', min: 4, max: 8 }, { stat: 'resist.frost', op: 'flat', min: 8, max: 15 }] }),
  // Consumibles
  item({ id: 'minor_health_potion', name: 'Poción de vida menor', description: 'Sabe a hierbas y a hierro.', icon: 'potion_red', category: 'consumable', slot: null,
    rarity: 'common', level: 1, value: 4, maxStack: 20, use: { kind: 'effects', effects: [{ type: 'heal', min: 40, max: 50 }], cooldown: 8 } }),
  item({ id: 'health_potion', name: 'Poción de vida media', description: 'Espesa y roja.', icon: 'potion_red', category: 'consumable', slot: null,
    rarity: 'uncommon', level: 4, value: 12, maxStack: 20, use: { kind: 'effects', effects: [{ type: 'heal', min: 90, max: 110 }], cooldown: 8 } }),
  item({ id: 'resource_tonic', name: 'Tónico de recurso', description: 'Devuelve el aliento, sea vigor o maná.', icon: 'potion_blue', category: 'consumable', slot: null,
    rarity: 'common', level: 1, value: 6, maxStack: 20, use: { kind: 'effects', effects: [{ type: 'restoreResource', amount: 60 }], cooldown: 10 } }),
  item({ id: 'haste_elixir', name: 'Elixir de prisa', description: 'Burbujea en la lengua.', icon: 'potion_green', category: 'consumable', slot: null,
    rarity: 'rare', level: 3, value: 25, maxStack: 10, use: { kind: 'effects', effects: [st('haste', 20)], cooldown: 30 } }),
  // Pergaminos
  item({ id: 'scroll_light_bandage', name: 'Pergamino: Vendaje de luz', description: 'Enseña el hechizo; si ya lo conoces, lo mejora.', icon: 'scroll',
    category: 'scroll', slot: null, rarity: 'uncommon', level: 1, value: 20, maxStack: 5, use: { kind: 'learnSpell', spellId: 'light_bandage' } }),
  item({ id: 'scroll_stoneskin', name: 'Pergamino: Piel de piedra', description: 'Enseña el hechizo; si ya lo conoces, lo mejora.', icon: 'scroll',
    category: 'scroll', slot: null, rarity: 'uncommon', level: 2, value: 20, maxStack: 5, use: { kind: 'learnSpell', spellId: 'stoneskin' } }),
  item({ id: 'scroll_wolf_spirit', name: 'Pergamino: Espíritu lobuno', description: 'Enseña el hechizo; si ya lo conoces, lo mejora.', icon: 'scroll',
    category: 'scroll', slot: null, rarity: 'rare', level: 4, value: 45, maxStack: 5, use: { kind: 'learnSpell', spellId: 'wolf_spirit' } }),
  item({ id: 'scroll_gust', name: 'Pergamino: Ráfaga', description: 'Enseña el hechizo; si ya lo conoces, lo mejora.', icon: 'scroll',
    category: 'scroll', slot: null, rarity: 'uncommon', level: 2, value: 20, maxStack: 5, use: { kind: 'learnSpell', spellId: 'gust' } }),
  // Amuletos de mascota
  item({ id: 'charm_ash_fox', name: 'Silbato del zorro de ceniza', description: 'Invoca al zorro de ceniza. Sólo una mascota a la vez.', icon: 'charm_fox',
    category: 'petCharm', slot: null, rarity: 'rare', level: 1, value: 80, use: { kind: 'summonPet', petId: 'ash_fox' } }),
  item({ id: 'charm_archive_owl', name: 'Pluma del búho archivero', description: 'Invoca al búho archivero. Sólo una mascota a la vez.', icon: 'charm_owl',
    category: 'petCharm', slot: null, rarity: 'rare', level: 1, value: 80, use: { kind: 'summonPet', petId: 'archive_owl' } }),
  item({ id: 'charm_moss_tortoise', name: 'Concha de la tortuga de musgo', description: 'Invoca a la tortuga de musgo. Sólo una mascota a la vez.', icon: 'charm_tortoise',
    category: 'petCharm', slot: null, rarity: 'epic', level: 1, value: 120, use: { kind: 'summonPet', petId: 'moss_tortoise' } }),
  // Materiales
  item({ id: 'wolf_fang', name: 'Colmillo de lobo', description: 'Material. Algún día servirá para un oficio.', icon: 'fang', category: 'material', slot: null,
    rarity: 'common', level: 1, value: 2, maxStack: 50 }),
  item({ id: 'leather_scrap', name: 'Retal de cuero', description: 'Material. Algún día servirá para un oficio.', icon: 'hide', category: 'material', slot: null,
    rarity: 'common', level: 1, value: 2, maxStack: 50 }),
  item({ id: 'copper_ore', name: 'Mineral de cobre', description: 'Material. Algún día servirá para un oficio.', icon: 'ore', category: 'material', slot: null,
    rarity: 'common', level: 1, value: 3, maxStack: 50 }),
  item({ id: 'faint_essence', name: 'Esencia tenue', description: 'Material. Brilla un poco en la oscuridad.', icon: 'essence', category: 'material', slot: null,
    rarity: 'uncommon', level: 1, value: 8, maxStack: 50 }),
];

const sets: ItemSetDef[] = [
  { id: 'explorer', name: 'Equipo del Explorador', bonuses: [
    { pieces: 2, modifiers: [flat('maxHealth', 20)] },
    { pieces: 4, modifiers: [pct('moveSpeed', 8), flat('pickupRadius', 1)] },
  ] },
  { id: 'storm_apprentice', name: 'Galas del Aprendiz de Tormenta', bonuses: [
    { pieces: 2, modifiers: [flat('maxResource', 25)] },
    { pieces: 3, modifiers: [flat('damage.storm', 3), flat('resourceRegen', 1)] },
  ] },
];

// ─── Mascotas ───────────────────────────────────────────────────────────────

const pets: PetDef[] = [
  { id: 'ash_fox', name: 'Zorro de ceniza', description: 'Muerde a tus enemigos y vuelve a tu lado.', icon: 'pet_fox',
    behavior: 'fighter', speed: 6, followDistance: 2, attack: { min: 4, max: 7, element: 'fire', range: 1.5, cooldown: 1.2 },
    ownerBonus: [flat('power', 3)] },
  { id: 'archive_owl', name: 'Búho archivero', description: 'Recoge el botín cercano y lo anota todo.', icon: 'pet_owl',
    behavior: 'collector', speed: 7, followDistance: 3, ownerBonus: [flat('pickupRadius', 3)] },
  { id: 'moss_tortoise', name: 'Tortuga de musgo', description: 'Lenta, tranquila y rodeada de un aura que cura.', icon: 'pet_tortoise',
    behavior: 'guardian', speed: 4, followDistance: 2, aura: { every: 3, effect: { type: 'heal', min: 3, max: 5 } },
    ownerBonus: [flat('armor', 4), flat('healthRegen', 0.5)] },
];

const byId = <T extends { id: string }>(list: T[]): Record<string, T> => Object.fromEntries(list.map((x) => [x.id, x]));

export const FAKE_CONTENT: ContentDb = {
  classes: byId(classes),
  spells: byId(spells),
  statuses: byId(statuses),
  items: byId(items),
  sets: byId(sets),
  pets: byId(pets),
  lootTables: {
    meadow_wolf: { id: 'meadow_wolf', gold: { min: 2, max: 6, chance: 0.8 }, rolls: 1, chance: 0.6,
      entries: [{ itemId: 'wolf_fang', weight: 6, min: 1, max: 2 }, { itemId: 'leather_scrap', weight: 5 }, { itemId: 'minor_health_potion', weight: 3 },
        { itemId: 'explorer_boots', weight: 1 }, { itemId: 'copper_ring', weight: 1 }] },
  },
  progression: {
    maxLevel: 20,
    xp: { base: 100, exponent: 1.5 },
    statPointsPerLevel: 3,
    resistCap: 60,
    hotbarSize: 6,
    inventorySize: 40,
  },
};
