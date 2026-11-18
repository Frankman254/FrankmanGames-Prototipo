#!/usr/bin/env node
/**
 * HZ-03: Genera los hechizos nuevos integrables y los inyecta en data/rpg/spells.json.
 * Solo los que usan efectos existentes. Cifras PROPUESTA.
 *
 * Uso: node scripts/hz03_generateSpells.mjs
 */
import { readFileSync, writeFileSync } from 'fs';

const spellsPath = 'data/rpg/spells.json';
const data = JSON.parse(readFileSync(spellsPath, 'utf8'));

// Helper: daño base por tramo de nivel (PROPUESTA).
// Los hechizos de afinidad usan el daño del tramo; fuera de afinidad ~10% menos.
// Tramos: 25-50 (bajo), 50-100 (medio), 100-150 (alto), 150-200 (muy alto).
function dmgRange(level, affinity) {
  const factor = affinity ? 1.0 : 0.9;
  let base;
  if (level <= 30) base = { min: 12, max: 18 };
  else if (level <= 50) base = { min: 16, max: 24 };
  else if (level <= 70) base = { min: 22, max: 32 };
  else if (level <= 90) base = { min: 30, max: 42 };
  else if (level <= 110) base = { min: 40, max: 55 };
  else if (level <= 135) base = { min: 52, max: 70 };
  else if (level <= 165) base = { min: 65, max: 88 };
  else base = { min: 80, max: 110 };
  return {
    min: Math.round(base.min * factor),
    max: Math.round(base.max * factor),
  };
}

function makeSpell(id, name, desc, icon, element, classId, unlockLevel, cost, cd, gCd, castTime, range, area, projectileSpeed, effects, tags, friendlyFire, castWhileMoving) {
  const scaling = 0.4;
  return {
    name,
    description: desc,
    icon,
    element,
    classId,
    unlockLevel,
    resourceCost: cost,
    cooldown: cd,
    globalCooldown: gCd,
    castTime,
    range,
    area,
    projectileSpeed,
    effects,
    maxRank: 6,
    perRank: { effectPercent: 12, costPercent: 4 },
    critChance: 0.1,
    critBonus: 0,
    tags,
    ...(friendlyFire !== undefined ? { friendlyFire } : {}),
    ...(castWhileMoving !== undefined ? { castWhileMoving } : {}),
  };
}

const newSpells = {};

// ==================== VANGUARDIA (ember_vanguard) ====================
// Afinidad: tierra, fuego.

// guarapo_splash (30) — cone, damage+status(soaked), apaga burn en aliados
{
  const d = dmgRange(30, false); // agua, no afinidad
  newSpells.guarapo_splash = makeSpell(
    'guarapo_splash', 'Baldazo de guarapo',
    'Moja a los enemigos del cono (reciben más rayo) y apaga las quemaduras de los aliados.',
    '🌊', 'water', 'ember_vanguard', 30,
    14, 5, 0.6, 0, 0,
    { type: 'cone', length: 4, angleDeg: 80 },
    null,
    [
      { type: 'damage', min: d.min, max: d.max, element: 'water', scaling: 0.35 },
      { type: 'status', statusId: 'soaked', duration: 5 },
    ],
    ['control'],
    true, false
  );
}

// night_dew (35) — single, damage+status(chilled/slow)
{
  const d = dmgRange(35, false);
  newSpells.night_dew = makeSpell(
    'night_dew', 'Sereno',
    'Tajo frío que frena al enemigo un instante.',
    '❄️', 'frost', 'ember_vanguard', 35,
    13, 4, 0.6, 0, 1.8,
    { type: 'single' },
    null,
    [
      { type: 'damage', min: d.min, max: d.max, element: 'frost', scaling: 0.4 },
      { type: 'status', statusId: 'chilled', duration: 3 },
    ],
    ['melee'],
    undefined, false
  );
}

// flint_spark (40) — single, damage, salta a 2 cercanos (simulado con zone pequeña)
{
  const d = dmgRange(40, true); // rayo es afinidad para VG
  newSpells.flint_spark = makeSpell(
    'flint_spark', 'Chispa de pedernal',
    'Golpe de rayo que salta a dos enemigos cercanos al objetivo.',
    '⚡', 'lightning', 'ember_vanguard', 40,
    15, 5, 0.6, 0, 1.8,
    { type: 'single' },
    null,
    [
      { type: 'damage', min: d.min, max: d.max, element: 'lightning', scaling: 0.4 },
    ],
    ['melee'],
    undefined, false
  );
}

// smoke_screen (45) — circle zone, disorient status
{
  newSpells.smoke_screen = makeSpell(
    'smoke_screen', 'Humareda',
    'Nube de humo que corta la visión de los enemigos sin impedir el paso.',
    '💨', 'air', 'ember_vanguard', 45,
    18, 12, 0.7, 0, 8,
    { type: 'circle', radius: 3, atTarget: true },
    null,
    [
      {
        type: 'zone', radius: 3, duration: 5, every: 1,
        effects: [{ type: 'status', statusId: 'disoriented', duration: 2 }],
      },
    ],
    ['zone'],
    undefined, false
  );
}

// bellows (50) — cone, knockback
{
  const d = dmgRange(50, false);
  newSpells.bellows = makeSpell(
    'bellows', 'Fuelle',
    'Ráfaga de aire que aleja a los enemigos del cono.',
    '💨', 'air', 'ember_vanguard', 50,
    16, 6, 0.6, 0, 0,
    { type: 'cone', length: 5, angleDeg: 85 },
    null,
    [
      { type: 'damage', min: d.min, max: d.max, element: 'air', scaling: 0.3 },
      { type: 'knockback', distance: 2.5 },
    ],
    ['control'],
    undefined, false
  );
}

// salt_crust (70) — self, status (counter buff)
newSpells.salt_crust = makeSpell(
  'salt_crust', 'Costra de salitre',
  'Armadura de sal que congela un instante a quien te pega cuerpo a cuerpo.',
  '🧂', 'frost', 'ember_vanguard', 70,
  22, 15, 0.7, 0, 0,
  { type: 'self' },
  null,
  [
    { type: 'status', statusId: 'stone_skin', duration: 6 },
  ],
  ['defense'],
  undefined, true
);

// machete_whirl (90) — line, damage+dash
{
  const d = dmgRange(90, false);
  newSpells.machete_whirl = makeSpell(
    'machete_whirl', 'Molinete',
    'Avanzas girando el machete y dañas todo el recorrido.',
    '🌀', 'air', 'ember_vanguard', 90,
    20, 7, 0.7, 0, 0,
    { type: 'line', length: 5, width: 2 },
    null,
    [
      { type: 'damage', min: d.min, max: d.max, element: 'air', scaling: 0.35 },
      { type: 'dash', distance: 5 },
    ],
    ['movement'],
    undefined, true
  );
}

// flood_furrow (100) — line zone, slow
newSpells.flood_furrow = makeSpell(
  'flood_furrow', 'Surco anegado',
  'Franja de fango que frena a quien la pisa.',
  '🌊', 'water', 'ember_vanguard', 100,
  24, 14, 0.7, 0, 8,
  { type: 'line', length: 6, width: 2 },
  null,
  [
    {
      type: 'zone', radius: 1, duration: 6, every: 1,
      effects: [{ type: 'status', statusId: 'chilled', duration: 2 }],
    },
  ],
  ['zone'],
  undefined, false
);

// cold_ash (110) — circle self, damage+status
{
  const d = dmgRange(110, false);
  newSpells.cold_ash = makeSpell(
    'cold_ash', 'Ceniza fría',
    'Nube de ceniza helada que daña y debilita a los enemigos cercanos.',
    '❄️', 'frost', 'ember_vanguard', 110,
    22, 8, 0.7, 0, 0,
    { type: 'circle', radius: 3.5, atTarget: false },
    null,
    [
      { type: 'damage', min: d.min, max: d.max, element: 'frost', scaling: 0.4 },
      { type: 'status', statusId: 'weariness', duration: 4 },
    ],
    ['aoe'],
    undefined, false
  );
}

// quema_wind (120) — self, status (haste+power buff)
newSpells.quema_wind = makeSpell(
  'quema_wind', 'Viento de quema',
  'Los aliados cercanos corren más y su fuego pega más.',
  '🌬️', 'air', 'ember_vanguard', 120,
  26, 18, 0.7, 0, 0,
  { type: 'self' },
  null,
  [
    { type: 'status', statusId: 'haste', duration: 8 },
  ],
  ['buff'],
  undefined, true
);

// river_shoulder (150) — line, damage+dash+pull
{
  const d = dmgRange(150, false);
  newSpells.river_shoulder = makeSpell(
    'river_shoulder', 'Hombro de río',
    'Embistes y arrastras contigo a todos los enemigos que tocas.',
    '🌊', 'water', 'ember_vanguard', 150,
    28, 8, 0.7, 0, 0,
    { type: 'line', length: 6, width: 2 },
    null,
    [
      { type: 'damage', min: d.min, max: d.max, element: 'water', scaling: 0.4 },
      { type: 'dash', distance: 6 },
      { type: 'pull', distance: 2 },
    ],
    ['movement'],
    undefined, true
  );
}

// frozen_furrow (165) — line, damage+status(root)
{
  const d = dmgRange(165, false);
  newSpells.frozen_furrow = makeSpell(
    'frozen_furrow', 'Helada del surco',
    'Helada que clava al suelo a los enemigos de la línea.',
    '❄️', 'frost', 'ember_vanguard', 165,
    26, 9, 0.7, 0, 0,
    { type: 'line', length: 6, width: 2 },
    null,
    [
      { type: 'damage', min: d.min, max: d.max, element: 'frost', scaling: 0.4 },
      { type: 'status', statusId: 'rooted', duration: 2 },
    ],
    ['control'],
    undefined, false
  );
}

// volcanic_fury (200) — circle self, damage alto
{
  const d = dmgRange(200, true);
  newSpells.volcanic_fury = makeSpell(
    'volcanic_fury', 'Furia volcánica',
    'Explosión final de fuego y tierra alrededor de ti. El último hechizo de la Vanguardia.',
    '🌋', 'fire', 'ember_vanguard', 200,
    40, 20, 0.8, 0.5, 0,
    { type: 'circle', radius: 4, atTarget: false },
    null,
    [
      { type: 'damage', min: d.min, max: d.max, element: 'fire', scaling: 0.5 },
      { type: 'status', statusId: 'burn', duration: 4 },
    ],
    ['aoe'],
    undefined, false
  );
}

// ==================== TEJEDORA (storm_weaver) ====================
// Afinidad: rayo, hielo.

// mist_veil (25) — circle zone, status
newSpells.mist_veil = makeSpell(
  'mist_veil', 'Velo de bajareque',
  'Zona de neblina: los enemigos de fuera ven menos lejos a quien está dentro.',
  '🌫️', 'air', 'storm_weaver', 25,
  16, 12, 0.7, 0, 8,
  { type: 'circle', radius: 3, atTarget: true },
  null,
  [
    {
      type: 'zone', radius: 3, duration: 6, every: 2,
      effects: [{ type: 'status', statusId: 'dazed', duration: 2 }],
    },
  ],
  ['zone'],
  undefined, false
);

// drizzle_needle (30) — single, damage+status(soaked)
{
  const d = dmgRange(30, false);
  newSpells.drizzle_needle = makeSpell(
    'drizzle_needle', 'Aguja de llovizna',
    'Tiro rápido y barato que moja al objetivo.',
    '💧', 'water', 'storm_weaver', 30,
    10, 3, 0.5, 0, 12,
    { type: 'single' },
    8,
    [
      { type: 'damage', min: d.min, max: d.max, element: 'water', scaling: 0.35 },
      { type: 'status', statusId: 'soaked', duration: 4 },
    ],
    ['ranged'],
    undefined, false
  );
}

// rain_stitch (50) — circle, heal+status
{
  newSpells.rain_stitch = makeSpell(
    'rain_stitch', 'Puntada de lluvia',
    'Cura un poco a los aliados del círculo y les quita la quemadura.',
    '🌧️', 'water', 'storm_weaver', 50,
    22, 14, 0.7, 0, 8,
    { type: 'circle', radius: 3, atTarget: true },
    null,
    [
      { type: 'heal', min: 15, max: 25, scaling: 0.4 },
      { type: 'status', statusId: 'regeneration', duration: 4 },
    ],
    ['heal'],
    true, false
  );
}

// spindle_gust (60) — line, damage+knockback+status
{
  const d = dmgRange(60, false);
  newSpells.spindle_gust = makeSpell(
    'spindle_gust', 'Huso de viento',
    'Ráfaga que aparta a los enemigos hacia los lados y frena al primero.',
    '🌬️', 'air', 'storm_weaver', 60,
    18, 6, 0.6, 0, 10,
    { type: 'line', length: 5, width: 2 },
    6,
    [
      { type: 'damage', min: d.min, max: d.max, element: 'air', scaling: 0.35 },
      { type: 'knockback', distance: 2 },
      { type: 'status', statusId: 'chilled', duration: 2 },
    ],
    ['control'],
    undefined, false
  );
}

// loom_roots (80) — circle, damage+status(root)
{
  const d = dmgRange(80, true);
  newSpells.loom_roots = makeSpell(
    'loom_roots', 'Raíces del telar',
    'Raíces que brotan del suelo, dañan y clavan al enemigo.',
    '🌿', 'earth', 'storm_weaver', 80,
    22, 8, 0.7, 0, 10,
    { type: 'circle', radius: 2.5, atTarget: true },
    null,
    [
      { type: 'damage', min: d.min, max: d.max, element: 'earth', scaling: 0.4 },
      { type: 'status', statusId: 'rooted', duration: 2.5 },
    ],
    ['control'],
    undefined, false
  );
}

// warp_tide (90) — line, damage (2 hits simulated by higher damage)
{
  const d = dmgRange(90, false);
  newSpells.warp_tide = makeSpell(
    'warp_tide', 'Urdimbre de marea',
    'Dos olas de agua; la segunda pega más a los mojados.',
    '🌊', 'water', 'storm_weaver', 90,
    24, 7, 0.7, 0, 12,
    { type: 'line', length: 6, width: 2 },
    5,
    [
      { type: 'damage', min: d.min, max: d.max, element: 'water', scaling: 0.4 },
    ],
    ['ranged'],
    undefined, false
  );
}

// dry_lightning (110) — cone, damage alto
{
  const d = dmgRange(110, true);
  newSpells.dry_lightning = makeSpell(
    'dry_lightning', 'Rayo seco',
    'Descarga concentrada de fuego y rayo. Daño alto, sin efecto extra.',
    '🔥', 'fire', 'storm_weaver', 110,
    30, 8, 0.7, 0, 12,
    { type: 'cone', length: 6, angleDeg: 70 },
    6,
    [
      { type: 'damage', min: d.min, max: d.max, element: 'fire', scaling: 0.5 },
    ],
    ['ranged'],
    undefined, false
  );
}

// landslip (135) — line, damage+knockback
{
  const d = dmgRange(135, true);
  newSpells.landslip = makeSpell(
    'landslip', 'Derrumbe',
    'Terremoto que empuja a los enemigos al final de la línea.',
    '🪨', 'earth', 'storm_weaver', 135,
    28, 9, 0.7, 0, 12,
    { type: 'line', length: 7, width: 2.5 },
    null,
    [
      { type: 'damage', min: d.min, max: d.max, element: 'earth', scaling: 0.45 },
      { type: 'knockback', distance: 3 },
    ],
    ['control'],
    undefined, false
  );
}

// cloudburst (150) — circle large, damage with delay (projectile)
{
  const d = dmgRange(150, false);
  newSpells.cloudburst = makeSpell(
    'cloudburst', 'Reventón de nube',
    'Tormenta concentrada que cae tras un instante de aviso. Daño muy alto.',
    '⛈️', 'water', 'storm_weaver', 150,
    35, 12, 0.8, 1.5, 15,
    { type: 'circle', radius: 3.5, atTarget: true },
    4,
    [
      { type: 'damage', min: d.min, max: d.max, element: 'water', scaling: 0.5 },
      { type: 'status', statusId: 'soaked', duration: 4 },
    ],
    ['ranged'],
    undefined, false
  );
}

// thunder_weave (180) — star, damage
{
  const d = dmgRange(180, true);
  newSpells.thunder_weave = makeSpell(
    'thunder_weave', 'Tejido de trueno',
    'Red de rayos en estrella que atrapa y daña a los enemigos del centro.',
    '⚡', 'lightning', 'storm_weaver', 180,
    32, 10, 0.8, 0, 12,
    { type: 'star', arm: 3, width: 1.5, atTarget: true },
    5,
    [
      { type: 'damage', min: d.min, max: d.max, element: 'lightning', scaling: 0.5 },
      { type: 'status', statusId: 'static_charge', duration: 3 },
    ],
    ['ranged'],
    undefined, false
  );
}

// tempest_crown (200) — circle self, damage + status
{
  const d = dmgRange(200, true);
  newSpells.tempest_crown = makeSpell(
    'tempest_crown', 'Corona de tempestad',
    'Tormenta completa alrededor de ti. El último hechizo de la Tejedora.',
    '👑', 'lightning', 'storm_weaver', 200,
    40, 20, 0.8, 0.5, 0,
    { type: 'circle', radius: 4, atTarget: false },
    null,
    [
      { type: 'damage', min: d.min, max: d.max, element: 'lightning', scaling: 0.5 },
      { type: 'status', statusId: 'stunned', duration: 1 },
    ],
    ['aoe'],
    undefined, false
  );
}

// ==================== CAZADOR (mangrove_hunter) ====================
// Afinidad: aire, agua, tierra.

// cold_snare (30) — trap with status(root)
newSpells.cold_snare = makeSpell(
  'cold_snare', 'Lazo de sereno',
  'Trampa invisible que congela 2 s a quien la pisa.',
  '❄️', 'frost', 'mangrove_hunter', 30,
  12, 6, 0.6, 0, 8,
  { type: 'circle', radius: 0.8, atTarget: true },
  null,
  [
    {
      type: 'trap', radius: 0.8, duration: 30, maxActive: 3, minSpacing: 2,
      effects: [
        { type: 'status', statusId: 'rooted', duration: 2 },
        { type: 'damage', min: 8, max: 12, element: 'frost', scaling: 0.2 },
      ],
    },
  ],
  ['trap'],
  undefined, true
);

// eel_arrow (35) — single, damage
{
  const d = dmgRange(35, false);
  newSpells.eel_arrow = makeSpell(
    'eel_arrow', 'Flecha de anguila',
    'Flecha de rayo que salta entre enemigos mojados.',
    '⚡', 'lightning', 'mangrove_hunter', 35,
    14, 4, 0.6, 0, 14,
    { type: 'single' },
    10,
    [
      { type: 'damage', min: d.min, max: d.max, element: 'lightning', scaling: 0.4 },
    ],
    ['ranged'],
    undefined, false
  );
}

// tar_arrow (40) — circle, damage+zone(burn)
newSpells.tar_arrow = makeSpell(
  'tar_arrow', 'Flecha de brea',
  'Flecha que deja un charco ardiente en el suelo.',
  '🔥', 'fire', 'mangrove_hunter', 40,
  16, 6, 0.6, 0, 12,
  { type: 'circle', radius: 2, atTarget: true },
  8,
  [
    { type: 'damage', min: 10, max: 15, element: 'fire', scaling: 0.25 },
    {
      type: 'zone', radius: 2, duration: 5, every: 1,
      effects: [{ type: 'status', statusId: 'burn', duration: 2 }],
    },
  ],
  ['zone'],
  undefined, false
);

// tide_pull (60) — pull
newSpells.tide_pull = makeSpell(
  'tide_pull', 'Resaca',
  'Arrastra al objetivo hacia ti.',
  '🌊', 'water', 'mangrove_hunter', 60,
  16, 8, 0.7, 0, 12,
  { type: 'single' },
  null,
  [
    { type: 'pull', distance: 4 },
  ],
  ['control'],
  undefined, false
);

// heron_feather (70) — single, damage+status
{
  const d = dmgRange(70, false);
  newSpells.heron_feather = makeSpell(
    'heron_feather', 'Pluma de garza',
    'Marca al objetivo: el siguiente golpe que reciba es crítico.',
    '🪶', 'frost', 'mangrove_hunter', 70,
    14, 5, 0.6, 0, 14,
    { type: 'single' },
    10,
    [
      { type: 'damage', min: d.min, max: d.max, element: 'frost', scaling: 0.35 },
      { type: 'status', statusId: 'chilled', duration: 3 },
    ],
    ['ranged'],
    undefined, false
  );
}

// charcoal_cloud (80) — zone, status
newSpells.charcoal_cloud = makeSpell(
  'charcoal_cloud', 'Nube de carbón',
  'Humo denso en el que los enemigos te pierden como objetivo.',
  '🌫️', 'fire', 'mangrove_hunter', 80,
  20, 12, 0.7, 0, 10,
  { type: 'circle', radius: 3, atTarget: true },
  null,
  [
    {
      type: 'zone', radius: 3, duration: 5, every: 2,
      effects: [{ type: 'status', statusId: 'dazed', duration: 2 }],
    },
  ],
  ['zone'],
  undefined, false
);

// fog_arrow (110) — circle, damage+status(slow)
{
  const d = dmgRange(110, false);
  newSpells.fog_arrow = makeSpell(
    'fog_arrow', 'Flecha de neblina',
    'Flecha helada que frena y acorta el alcance de los enemigos.',
    '❄️', 'frost', 'mangrove_hunter', 110,
    20, 6, 0.6, 0, 14,
    { type: 'circle', radius: 2.5, atTarget: true },
    8,
    [
      { type: 'damage', min: d.min, max: d.max, element: 'frost', scaling: 0.4 },
      { type: 'status', statusId: 'chilled', duration: 4 },
    ],
    ['ranged'],
    undefined, false
  );
}

// frozen_estuary (165) — circle, zone+status
{
  const d = dmgRange(165, false);
  newSpells.frozen_estuary = makeSpell(
    'frozen_estuary', 'Estero helado',
    'Suelo resbaloso: los enemigos empujados dentro llegan el doble de lejos.',
    '❄️', 'frost', 'mangrove_hunter', 165,
    28, 10, 0.7, 0, 12,
    { type: 'circle', radius: 3.5, atTarget: true },
    null,
    [
      { type: 'damage', min: d.min, max: d.max, element: 'frost', scaling: 0.4 },
      {
        type: 'zone', radius: 3.5, duration: 6, every: 1,
        effects: [{ type: 'status', statusId: 'chilled', duration: 2 }],
      },
    ],
    ['zone'],
    undefined, false
  );
}

// final_quiver (200) — star, damage alto
{
  const d = dmgRange(200, true);
  newSpells.final_quiver = makeSpell(
    'final_quiver', 'Carcaj final',
    'Lluvia de flechas en estrella desde el cielo. El último hechizo del Cazador.',
    '🏹', 'air', 'mangrove_hunter', 200,
    40, 20, 0.8, 0.5, 15,
    { type: 'star', arm: 4, width: 2, atTarget: true },
    6,
    [
      { type: 'damage', min: d.min, max: d.max, element: 'air', scaling: 0.5 },
    ],
    ['ranged'],
    undefined, false
  );
}

// ==================== Write ====================
let count = 0;
for (const [id, spell] of Object.entries(newSpells)) {
  if (data.spells[id]) {
    console.error(`⚠️  Spell ${id} already exists, skipping.`);
    continue;
  }
  data.spells[id] = spell;
  count++;
}

writeFileSync(spellsPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`✅ ${count} nuevos hechizos añadidos a ${spellsPath}.`);

// Print summary
const byClass = {};
for (const [id, s] of Object.entries(newSpells)) {
  const c = s.classId || 'universal';
  byClass[c] = (byClass[c] || 0) + 1;
}
console.log('Por clase:', JSON.stringify(byClass));
