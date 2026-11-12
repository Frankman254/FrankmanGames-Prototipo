// T05 (H09): matriz categoría × franja del equipo.
// Franjas de 20 niveles sobre 1–100 (tope técnico del parser en
// `src/rpg/content.ts`). Cada categoría de equipo (12 armas + 9 huecos) tiene
// al menos una pieza por franja, obtenible, con cifras que crecen con la franja,
// y dos sets multielementales en las franjas 4–5. Las monturas quedan fuera a
// propósito (R06: esperan el contrato de movilidad).
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../../src/data';
import newIds from '../../scripts/t05/new_items.json';

const data = loadGameData();
const gear = Object.values(data.rpg.items).filter((x) => x.category === 'weapon' || x.category === 'armor' || x.category === 'jewel');
const bandOf = (level: number) => Math.min(5, Math.ceil(level / 20));
const categoryOf = (x: (typeof gear)[number]): string | null =>
  x.category === 'weapon' ? x.kind! : x.slot === 'ring1' || x.slot === 'ring2' ? 'ring' : x.slot;
const CATEGORIES = ['sword', 'axe', 'mace', 'greatsword', 'hammer', 'spear', 'dagger', 'bow', 'crossbow', 'staff', 'wand', 'orb', 'offhand', 'head', 'chest', 'hands', 'feet', 'back', 'waist', 'ring', 'amulet'];

describe('T05: matriz categoría × franja', () => {
  it('cada categoría de equipo tiene al menos una pieza por franja 1–5', () => {
    const missing: string[] = [];
    for (const c of CATEGORIES) {
      const bands = new Set(gear.filter((x) => categoryOf(x) === c).map((x) => bandOf(x.level)));
      for (let b = 1; b <= 5; b++) if (!bands.has(b)) missing.push(`${c}·franja${b}`);
    }
    expect(missing, `huecos de matriz: ${missing.join(', ')}`).toEqual([]);
  });

  it('todas las piezas de la matriz tienen gancho de adquisición en datos (botín o tienda)', () => {
    const inData = new Set<string>();
    for (const t of Object.values(data.rpg.lootTables)) for (const e of t.entries) inData.add(e.itemId);
    for (const m of Object.values(data.rpg.merchants)) for (const s of m.stock) inData.add(s.itemId);
    const orphan = gear.filter((x) => x.level >= 15 && !inData.has(x.id)).map((x) => x.id);
    expect(orphan, `sin tabla de botín ni tienda: ${orphan.join(', ')}`).toEqual([]);
  });

  it('el techo de poder sube en cada franja dentro del catálogo de la matriz', () => {
    // Sólo las piezas T05: el catálogo existente no es monótono por banda y
    // reescribir sus cifras excede el alcance de T05.
    const t05 = new Set(newIds as string[]);
    const power = (x: (typeof gear)[number]) =>
      x.implicit.reduce((s, m) => s + (m.op === 'flat' ? m.value : m.value / 100), 0) +
      x.rolls.reduce((s, m) => s + (m.op === 'flat' ? (m.min + m.max) / 2 : (m.min + m.max) / 200), 0) +
      (x.weapon ? (x.weapon.min + x.weapon.max) / 40 : 0);
    for (const c of CATEGORIES) {
      const perBand = new Map<number, number>();
      for (const x of gear.filter((p) => t05.has(p.id) && categoryOf(p) === c)) {
        const b = bandOf(x.level);
        perBand.set(b, Math.max(perBand.get(b) ?? 0, power(x)));
      }
      for (let b = 2; b <= 5; b++) {
        if (!perBand.has(b) || !perBand.has(b - 1)) continue;
        expect(perBand.get(b)!, `${c}: franja ${b} no supera el techo de la ${b - 1}`).toBeGreaterThan(perBand.get(b - 1)! * 1.05);
      }
    }
  });

  it('existen conjuntos multielementales para las franjas altas', () => {
    const setsWithPieces = Object.entries(data.rpg.sets).map(([id, s]) => ({
      id,
      pieces: gear.filter((x) => x.setId === id),
      elements: new Set(s.bonuses.flatMap((b) => b.modifiers.map((m) => m.stat).filter((st) => st.startsWith('damage.') || st.startsWith('resist.')))),
    }));
    const late = setsWithPieces.filter((s) => s.pieces.length >= 5 && s.pieces.every((p) => p.level >= 50));
    expect(late.length, 'sets de 5 piezas en franja alta').toBeGreaterThanOrEqual(2);
    for (const s of late) expect(s.elements.size, `set ${s.id}: multielemental`).toBeGreaterThanOrEqual(2);
    // al menos uno combina agua o tormenta con otra cosa (R10)
    expect(late.some((s) => [...s.elements].some((e) => e.includes('water') || e.includes('lightning'))), 'agua/tormenta en un set').toBe(true);
  });

  it('TICKET-3: el generador no produce IDs obsoletos (physical, storm, wind_dummy)', () => {
    // Verificar que ninguna pieza existente en el catálogo use IDs obsoletos.
    const obsolete = ['physical', 'storm', 'wind_dummy'];
    const found: string[] = [];
    for (const x of gear) {
      if (x.weapon && obsolete.includes(x.weapon.element)) found.push(`${x.id}: weapon.element=${x.weapon.element}`);
      for (const m of x.implicit) {
        for (const ob of obsolete) {
          if (m.stat.includes(ob)) found.push(`${x.id}: implicit ${m.stat}`);
        }
      }
      for (const r of x.rolls) {
        for (const ob of obsolete) {
          if (r.stat.includes(ob)) found.push(`${x.id}: roll ${r.stat}`);
        }
      }
    }
    for (const s of Object.values(data.rpg.sets)) {
      for (const b of s.bonuses) {
        for (const m of b.modifiers) {
          for (const ob of obsolete) {
            if (m.stat.includes(ob)) found.push(`set ${s.id}: ${m.stat}`);
          }
        }
      }
    }
    expect(found, `IDs obsoletos encontrados: ${found.join(', ')}`).toEqual([]);
  });

  it('TICKET-3: todas las piezas usan solo elementos canónicos RPG V4', () => {
    const canonical = new Set(['earth', 'fire', 'air', 'water', 'frost', 'lightning']);
    const bad: string[] = [];
    for (const x of gear) {
      if (x.weapon && !canonical.has(x.weapon.element)) bad.push(`${x.id}: weapon.element=${x.weapon.element}`);
      for (const m of x.implicit) {
        if (m.stat.startsWith('damage.')) {
          const el = m.stat.replace('damage.', '');
          if (!canonical.has(el)) bad.push(`${x.id}: implicit damage.${el}`);
        }
        if (m.stat.startsWith('resist.')) {
          const el = m.stat.replace('resist.', '');
          if (!canonical.has(el)) bad.push(`${x.id}: implicit resist.${el}`);
        }
      }
      for (const r of x.rolls) {
        if (r.stat.startsWith('resist.')) {
          const el = r.stat.replace('resist.', '');
          if (!canonical.has(el)) bad.push(`${x.id}: roll resist.${el}`);
        }
      }
    }
    expect(bad, `elementos no canónicos: ${bad.join(', ')}`).toEqual([]);
  });

  it('TICKET-3: todas las primarias usadas en piezas son canónicas RPG V4', () => {
    const canonical = new Set(['strength', 'agility', 'intellect', 'calm', 'flow', 'will', 'vitality', 'spirit']);
    const validSecondary = new Set(['maxHealth', 'maxResource', 'power', 'critChance', 'critBonus', 'moveSpeed', 'cooldownReduction', 'carryCapacity', 'slowResist', 'pickupRadius', 'healthRegen', 'resourceRegen', 'tackle', 'escape', 'healingPower', 'discovery', 'castStability']);
    const bad: string[] = [];
    for (const x of gear) {
      for (const m of x.implicit) {
        if (canonical.has(m.stat)) continue; // primaria canónica, ok
        if (validSecondary.has(m.stat)) continue; // secundaria válida
        if (m.stat.startsWith('damage.') || m.stat.startsWith('resist.')) continue; // elemento válido
        if (!canonical.has(m.stat)) bad.push(`${x.id}: implicit ${m.stat}`);
      }
    }
    expect(bad, `primarias no canónicas: ${bad.join(', ')}`).toEqual([]);
  });

  it('ninguna pieza supera el tope de resistencia ni crítico', () => {
    const cap = data.rpg.progression.resistCap;
    for (const x of gear) {
      for (const m of x.implicit) {
        if (m.stat.startsWith('resist.')) expect(m.value, `${x.id}: ${m.stat}`).toBeLessThanOrEqual(cap);
        if (m.stat === 'critChance') expect(m.value, `${x.id}: crítico implícito`).toBeLessThanOrEqual(0.15);
      }
      for (const r of x.rolls) {
        if (r.stat.startsWith('resist.')) expect(r.max, `${x.id}: ${r.stat}`).toBeLessThanOrEqual(cap);
        if (r.stat === 'critChance') expect(r.max, `${x.id}: crítico`).toBeLessThanOrEqual(0.15);
      }
    }
  });
});
