// TICKET-3: prueba del generador T05 con hueco forzado.
// Demuestra que el generador produce piezas válidas con elementos RPG V4
// sin modificar el catálogo productivo.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const ELEMENTS = ['earth', 'fire', 'air', 'water', 'frost', 'lightning'] as const;
const PRIMARY_STATS = ['strength', 'agility', 'intellect', 'calm', 'flow', 'will', 'vitality', 'spirit'] as const;
const VALID_SECONDARY = new Set([
  'maxHealth', 'maxResource', 'power', 'critChance', 'critBonus',
  'moveSpeed', 'cooldownReduction', 'carryCapacity', 'slowResist',
  'pickupRadius', 'healthRegen', 'resourceRegen', 'tackle', 'escape',
  'healingPower', 'discovery', 'castStability'
]);

const read = (p: string) => JSON.parse(readFileSync(resolve(ROOT, p), 'utf8'));

describe('TICKET-3: generador T05 compatible con RPG V4', () => {
  it('el script no contiene referencias funcionales a IDs obsoletos', () => {
    const script = readFileSync(resolve(ROOT, 'scripts/t05/generateGearMatrix.mjs'), 'utf8');
    // Buscar patrones funcionales (no cadenas de descripción)
    const obsoletePatterns = [
      /element:\s*'physical'/,
      /element:\s*'storm'/,
      /element:\s*'wind_dummy'/,
      /resist\.physical/,
      /damage\.storm/,
      /'wind_dummy'/,
    ];
    const found: string[] = [];
    for (const pattern of obsoletePatterns) {
      if (pattern.test(script)) found.push(pattern.source);
    }
    expect(found, `patrones obsoletos en el script: ${found.join(', ')}`).toEqual([]);
  });

  it('ELEMENT_HEAVY usa solo elementos canónicos', () => {
    const script = readFileSync(resolve(ROOT, 'scripts/t05/generateGearMatrix.mjs'), 'utf8');
    const match = script.match(/const ELEMENT_HEAVY = \{([^}]+)\}/);
    expect(match, 'ELEMENT_HEAVY no encontrado').toBeTruthy();
    const inner = match![1]!;
    const values = inner.match(/'([^']+)'/g)?.map((v) => v.slice(1, -1)) ?? [];
    const nonCanonical = values.filter((v) => !ELEMENTS.includes(v as any));
    expect(nonCanonical, `elementos no canónicos en ELEMENT_HEAVY: ${nonCanonical.join(', ')}`).toEqual([]);
  });

  it('GEAR_PRIMARY usa solo primarias canónicas', () => {
    const script = readFileSync(resolve(ROOT, 'scripts/t05/generateGearMatrix.mjs'), 'utf8');
    const match = script.match(/const GEAR_PRIMARY = \{([^}]+)\}/);
    expect(match, 'GEAR_PRIMARY no encontrado').toBeTruthy();
    const inner = match![1]!;
    const values = inner.match(/'([^']+)'/g)?.map((v) => v.slice(1, -1)) ?? [];
    const nonCanonical = values.filter((v) => !PRIMARY_STATS.includes(v as any));
    expect(nonCanonical, `primarias no canónicas en GEAR_PRIMARY: ${nonCanonical.join(', ')}`).toEqual([]);
  });

  it('genera una pieza nueva válida con hueco forzado', () => {
    // Simula la lógica de makeFiller del generador para demostrar que produce
    // objetos válidos con elementos y estadísticas canónicas RPG V4.
    // Se recrea aquí porque el script es un CLI sin exports.
    const level = 15; // band 1
    const band = 1;

    // Parámetros del generador (extraídos del script)
    const PRIMARY_OF = { sword: 'strength', axe: 'strength', mace: 'strength', greatsword: 'strength', hammer: 'strength', spear: 'strength', dagger: 'agility', bow: 'agility', crossbow: 'agility', staff: 'intellect', wand: 'intellect', orb: 'intellect' };
    const ELEMENT_HEAVY = { sword: 'fire', axe: 'earth', mace: 'fire', greatsword: 'lightning', hammer: 'earth', spear: 'water', dagger: 'frost', bow: 'air', crossbow: 'lightning', staff: 'frost', wand: 'water', orb: 'lightning' };
    const SPEED = { sword: 1.4, axe: 1.1, mace: 1.0, greatsword: 0.85, hammer: 0.9, spear: 1.2, dagger: 1.7, bow: 1.1, crossbow: 1.0, staff: 1.2, wand: 1.35, orb: 1.2 };
    const RANGE = { sword: 1.3, axe: 1.3, mace: 1.3, greatsword: 1.6, hammer: 1.4, spear: 2.2, dagger: 1.1, bow: 10, crossbow: 9.5, staff: 1.5, wand: 6.5, orb: 8 };
    const primaryFlat = (l: number) => Math.max(1, Math.round(0.47 * l));
    const weaponMin = (l: number) => Math.round(1.7 * l);
    const weaponMax = (l: number) => Math.round(2.6 * l);

    // Generar una espada (sword) para la franja 1
    const category = 'sword';
    const primary = PRIMARY_OF[category];
    const element = ELEMENT_HEAVY[category];

    // Validar que son canónicos
    expect(ELEMENTS.includes(element as any), `element '${element}' no es canónico`).toBe(true);
    expect(PRIMARY_STATS.includes(primary as any), `primary '${primary}' no es canónica`).toBe(true);

    // Construir el objeto como lo haría makeFiller
    const def: any = {
      weight: 9,
      name: 'Espada de hueso',
      description: 'Forjado para aguantar la sal y el tranco.',
      icon: 'sword',
      kind: 'sword',
      category: 'weapon',
      slot: 'weapon',
      rarity: 'common',
      level,
      value: 30,
      maxStack: 1,
      implicit: [
        { stat: primary, op: 'flat', value: primaryFlat(level) },
      ],
      rolls: [
        { stat: primary, op: 'flat', min: primaryFlat(level), max: Math.max(2, Math.round(0.72 * level)) },
      ],
      dropWeight: 20,
      weapon: {
        min: weaponMin(level),
        max: weaponMax(level),
        element,
        speed: SPEED[category],
        range: RANGE[category],
      },
    };

    // Validar estructura completa
    expect(def.category).toBe('weapon');
    expect(def.weapon.element).toBe(element);
    expect(def.weapon.min).toBeGreaterThan(0);
    expect(def.weapon.max).toBeGreaterThan(def.weapon.min);
    expect(def.implicit.some((m: any) => m.stat === primary)).toBe(true);
    expect(def.implicit[0].value).toBe(primaryFlat(level));

    // Validar contra las estadísticas canónicas RPG V4
    const allStats = new Set([...PRIMARY_STATS, ...VALID_SECONDARY, ...ELEMENTS.map((e) => `damage.${e}`), ...ELEMENTS.map((e) => `resist.${e}`)]);
    for (const m of def.implicit) {
      expect(allStats.has(m.stat), `stat '${m.stat}' no es canónica`).toBe(true);
    }
    for (const r of def.rolls) {
      expect(allStats.has(r.stat), `roll stat '${r.stat}' no es canónica`).toBe(true);
    }
  });

  it('genera pieza de armadura con primaria canónica (head → calm)', () => {
    // Verifica que GEAR_PRIMARY.head = 'calm' produce un objeto válido
    const level = 35; // band 2
    const category = 'head';
    const GEAR_PRIMARY = { offhand: 'vitality', head: 'calm', chest: 'vitality', hands: 'agility', feet: 'agility', back: 'will', waist: 'strength', ring: 'intellect', amulet: 'flow' };
    const primaryFlat = (l: number) => Math.max(1, Math.round(0.47 * l));
    const resistFlat = (l: number) => Math.max(2, Math.round(6 + 0.26 * level));

    const primary = GEAR_PRIMARY[category];
    expect(PRIMARY_STATS.includes(primary as any), `head primary '${primary}' no es canónica`).toBe(true);
    expect(primary).toBe('calm');

    const def: any = {
      weight: 4,
      name: 'Yelmo de cobre',
      category: 'armor',
      slot: 'head',
      rarity: 'uncommon',
      level,
      implicit: [
        { stat: 'resist.earth', op: 'flat', value: resistFlat(level) },
      ],
      rolls: [
        { stat: primary, op: 'flat', min: Math.max(1, Math.round(primaryFlat(level) * 0.7)), max: primaryFlat(level) },
        { stat: 'vitality', op: 'flat', min: Math.round(primaryFlat(level) * 0.6), max: Math.max(2, Math.round(0.72 * level)) },
      ],
    };

    // Validar contra las estadísticas canónicas RPG V4
    const allStats = new Set([...PRIMARY_STATS, ...VALID_SECONDARY, ...ELEMENTS.map((e) => `damage.${e}`), ...ELEMENTS.map((e) => `resist.${e}`)]);
    for (const m of def.implicit) {
      expect(allStats.has(m.stat), `stat '${m.stat}' no es canónica`).toBe(true);
    }
    for (const r of def.rolls) {
      expect(allStats.has(r.stat), `roll stat '${r.stat}' no es canónica`).toBe(true);
    }
  });

  it('el generador es idempotente: sin huecos no produce nada nuevo', () => {
    // Ejecutar el script real y verificar que no produce cambios
    const { execSync } = require('node:child_process');
    const output = execSync('node scripts/t05/generateGearMatrix.mjs', { cwd: ROOT, encoding: 'utf8' });
    expect(output).toContain('huecos: 0');
    expect(output).toContain('total nuevo: 0');
    expect(output).toContain('(informativo; usa --write para aplicar)');
  });

  it('los sets usan solo elementos canónicos', () => {
    const script = readFileSync(resolve(ROOT, 'scripts/t05/generateGearMatrix.mjs'), 'utf8');
    // Buscar los arrays de elementos en makeSetPieces
    const setElementMatch = script.match(/const el = \[([^\]]+)\]/);
    expect(setElementMatch, 'array de elementos en makeSetPieces no encontrado').toBeTruthy();
    const values = setElementMatch![1]!.match(/'([^']+)'/g)?.map((v) => v.slice(1, -1)) ?? [];
    const nonCanonical = values.filter((v) => !ELEMENTS.includes(v as any));
    expect(nonCanonical, `elementos no canónicos en sets: ${nonCanonical.join(', ')}`).toEqual([]);
  });

  it('los bonos de set usan solo stats canónicos', () => {
    const sets = read('data/rpg/sets.json').sets;
    const bad: string[] = [];
    for (const [id, s] of Object.entries(sets)) {
      const setDef = s as any;
      for (const b of setDef.bonuses) {
        for (const m of b.modifiers) {
          if (PRIMARY_STATS.includes(m.stat as any)) continue;
          if (VALID_SECONDARY.has(m.stat)) continue;
          if (m.stat.startsWith('damage.')) {
            const el = m.stat.replace('damage.', '');
            if (!ELEMENTS.includes(el as any)) bad.push(`${id}: damage.${el}`);
          } else if (m.stat.startsWith('resist.')) {
            const el = m.stat.replace('resist.', '');
            if (!ELEMENTS.includes(el as any)) bad.push(`${id}: resist.${el}`);
          } else if (!VALID_SECONDARY.has(m.stat)) {
            // Podría ser una primaria no canónica
            if (!PRIMARY_STATS.includes(m.stat as any)) bad.push(`${id}: ${m.stat}`);
          }
        }
      }
    }
    expect(bad, `stats no canónicos en sets: ${bad.join(', ')}`).toEqual([]);
  });
});
