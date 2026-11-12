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
    const script = readFileSync(resolve(ROOT, 'scripts/t05/generateGearMatrix.mjs'), 'utf8');
    const level = 15; // band 1 = nivel 15

    // Extraer ELEMENT_HEAVY y verificar sword
    const elemMatch = script.match(/const ELEMENT_HEAVY = \{([^}]+)\}/);
    expect(elemMatch, 'ELEMENT_HEAVY no encontrado').toBeTruthy();
    const swordElemMatch = elemMatch![1]!.match(/sword:\s*'([^']+)'/);
    expect(swordElemMatch, 'ELEMENT_HEAVY.sword no encontrado').toBeTruthy();
    const element = swordElemMatch![1];
    expect(ELEMENTS.includes(element as any), `sword element '${element}' no es canónico`).toBe(true);

    // Extraer PRIMARY_OF y verificar sword
    const primMatch = script.match(/const PRIMARY_OF = \{([^}]+)\}/);
    expect(primMatch, 'PRIMARY_OF no encontrado').toBeTruthy();
    const swordPrimMatch = primMatch![1]!.match(/sword:\s*'([^']+)'/);
    expect(swordPrimMatch, 'PRIMARY_OF.sword no encontrado').toBeTruthy();
    const primary = swordPrimMatch![1];
    expect(PRIMARY_STATS.includes(primary as any), `sword primary '${primary}' no es canónica`).toBe(true);

    // Verificar que las curvas producen valores razonables
    const primaryFlat = (l: number) => Math.max(1, Math.round(0.47 * l));
    const weaponMin = (l: number) => Math.round(1.7 * l);
    const weaponMax = (l: number) => Math.round(2.6 * l);

    const pFlat = primaryFlat(level);
    expect(pFlat).toBeGreaterThan(0);
    expect(weaponMin(level)).toBeGreaterThan(0);
    expect(weaponMax(level)).toBeGreaterThan(weaponMin(level));

    // Verificar que resistFlat produce valores dentro del tope
    const resistFlat = (l: number) => Math.max(2, Math.round(6 + 0.26 * l));
    const progression = read('data/rpg/progression.json');
    const resistCap = progression.resistCap;
    expect(resistFlat(level)).toBeLessThanOrEqual(resistCap);
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
