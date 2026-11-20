import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

interface SpellEntry {
  classId: string;
  maxRank: number;
  unlockLevel: number;
  resourceCost: number;
  tags: string[];
  effects: Array<{ type: string; [key: string]: any }>;
  allyTargetable?: boolean;
  element: string;
  [key: string]: any;
}

const spells = JSON.parse(
  readFileSync('data/rpg/spells.json', 'utf8')
);
const i18n = JSON.parse(
  readFileSync('data/i18n/en.content.json', 'utf8')
);

describe('HZ-04c-cazador: 32 hechizos del Cazador del Manglar', () => {
  const hunter = Object.entries(spells.spells)
    .filter(([, v]: [string, any]) => v.classId === 'mangrove_hunter')
    .map(([k, v]: [string, any]) => [k, v] as [string, SpellEntry]);

  // Creador 2026-11-20: la Flecha de tuna se suma a los 32 de HZ-04c (un daño más).
  it('tiene 33 hechizos', () => {
    expect(hunter.length).toBe(33);
  });

  it('reparto 19/4/6/4 (daño/potenc/control/defensa)', () => {
    const papeles = { Daño: 0, Potenc: 0, Control: 0, Defensa: 0 };
    hunter.forEach(([, s]) => {
      if (s.tags.includes('buff')) papeles.Potenc++;
      else if (s.tags.includes('control')) papeles.Control++;
      else if (s.tags.includes('defense')) papeles.Defensa++;
      else papeles.Daño++;
    });
    expect(papeles.Daño).toBe(19);
    expect(papeles.Potenc).toBe(4);
    expect(papeles.Control).toBe(6);
    expect(papeles.Defensa).toBe(4);
  });

  it('todos los ids son únicos', () => {
    const ids = hunter.map(([k]) => k);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('los 9 nuevos existen', () => {
    const nuevos = [
      'steady_aim', 'mud_cloak', 'mangrove_spike', 'cleansing_arrow',
      'macabre_shot', 'kiln_burst', 'tether_feather', 'thunder_flock', 'hunt_drum'
    ];
    nuevos.forEach(id => {
      expect(spells.spells[id], `${id} existe`).toBeDefined();
      expect((spells.spells[id] as SpellEntry).classId).toBe('mangrove_hunter');
    });
  });

  it('frozen_estuary en nivel 165, final_quiver en nivel 200', () => {
    expect((spells.spells.frozen_estuary as SpellEntry).unlockLevel).toBe(165);
    expect((spells.spells.final_quiver as SpellEntry).unlockLevel).toBe(200);
  });

  it('arrow_downpour coste 24 (bajado de 50)', () => {
    expect((spells.spells.arrow_downpour as SpellEntry).resourceCost).toBe(24);
  });

  it('hunter_arrow tiene selfStack (Carga)', () => {
    const s = spells.spells.hunter_arrow as SpellEntry;
    const ss = s.effects.find((e: { type: string }) => e.type === 'selfStack');
    expect(ss).toBeDefined();
    expect(ss!.percent).toBe(25);
    expect(ss!.max).toBe(2);
    expect(ss!.duration).toBe(6);
  });

  it('eel_arrow tiene chain con onlyStatus soaked', () => {
    const s = spells.spells.eel_arrow as SpellEntry;
    const chain = s.effects.find((e: { type: string }) => e.type === 'chain');
    expect(chain).toBeDefined();
    expect(chain!.onlyStatus).toBe('soaked');
  });

  it('thunder_flock tiene chain 4 saltos con falloff', () => {
    const s = spells.spells.thunder_flock as SpellEntry;
    const chain = s.effects.find((e: { type: string }) => e.type === 'chain');
    expect(chain).toBeDefined();
    expect(chain!.jumps).toBe(4);
    expect(chain!.falloffPercent).toBe(20);
  });

  it('kiln_burst tiene bonusVsStatus burn', () => {
    const s = spells.spells.kiln_burst as SpellEntry;
    const bvs = s.effects.find((e: { type: string }) => e.type === 'bonusVsStatus');
    expect(bvs).toBeDefined();
    expect(bvs!.statusId).toBe('burn');
  });

  it('cleansing_arrow tiene dispel kind buff', () => {
    const s = spells.spells.cleansing_arrow as SpellEntry;
    const dispel = s.effects.find((e: { type: string }) => e.type === 'dispel');
    expect(dispel).toBeDefined();
    expect(dispel!.kind).toBe('buff');
  });

  it('tether_feather tiene shareDamage', () => {
    const s = spells.spells.tether_feather as SpellEntry;
    const sd = s.effects.find((e: { type: string }) => e.type === 'shareDamage');
    expect(sd).toBeDefined();
    expect(sd!.percent).toBe(0.3);
  });

  it('mud_cloak tiene ward_melee', () => {
    const s = spells.spells.mud_cloak as SpellEntry;
    const status = s.effects.find((e: any) => e.type === 'status' && e.statusId === 'ward_melee');
    expect(status).toBeDefined();
  });

  it('steady_aim tiene critChance, critDamage y fixedDamage', () => {
    const s = spells.spells.steady_aim as SpellEntry;
    expect(s.effects.find((e: { type: string }) => e.type === 'critChance')).toBeDefined();
    expect(s.effects.find((e: { type: string }) => e.type === 'critDamage')).toBeDefined();
    expect(s.effects.find((e: { type: string }) => e.type === 'fixedDamage')).toBeDefined();
  });

  it('macabre_shot tiene fixedDamage y critChance', () => {
    const s = spells.spells.macabre_shot as SpellEntry;
    expect(s.effects.find((e: { type: string }) => e.type === 'fixedDamage')).toBeDefined();
    expect(s.effects.find((e: { type: string }) => e.type === 'critChance')).toBeDefined();
  });

  it('hunt_drum tiene power y haste, allyTargetable', () => {
    const s = spells.spells.hunt_drum as SpellEntry;
    expect(s.effects.find((e: { type: string }) => e.type === 'power')).toBeDefined();
    expect(s.effects.find((e: any) => e.type === 'status' && e.statusId === 'haste')).toBeDefined();
    expect(s.allyTargetable).toBe(true);
  });

  it('tether_feather es allyTargetable', () => {
    expect((spells.spells.tether_feather as SpellEntry).allyTargetable).toBe(true);
  });

  it('todos los hechizos tienen maxRank 6', () => {
    hunter.forEach(([id, s]) => {
      expect(s.maxRank, `${id} maxRank`).toBe(6);
    });
  });

  it('todos los hechizos con damage tienen perLevel', () => {
    hunter.forEach(([id, s]) => {
      const dmg = s.effects.find((e: { type: string }) => e.type === 'damage');
      if (dmg) {
        expect(dmg.perLevel, `${id} perLevel`).toBeDefined();
        expect(dmg.perLevel, `${id} perLevel > 0`).toBeGreaterThan(0);
      }
    });
  });

  it('alternan elemento (sin dos consecutivos iguales)', () => {
    const sorted = [...hunter].sort((a, b) => a[1].unlockLevel - b[1].unlockLevel);
    for (let i = 1; i < sorted.length; i++) {
      const cur = sorted[i]!;
      const prev = sorted[i - 1]!;
      expect(cur[1].element, `${cur[0]}: mismo elemento que anterior`).not.toBe(
        prev[1].element
      );
    }
  });

  it('i18n: todos los nombres en inglés', () => {
    hunter.forEach(([id]) => {
      const key = `spell.${id}.name`;
      expect(i18n[key], `${key} existe`).toBeDefined();
      expect((i18n[key] as string).length, `${key} no vacío`).toBeGreaterThan(0);
    });
  });

  it('i18n: todas las descripciones en inglés', () => {
    hunter.forEach(([id]) => {
      const key = `spell.${id}.description`;
      expect(i18n[key], `${key} existe`).toBeDefined();
      expect((i18n[key] as string).length, `${key} no vacío`).toBeGreaterThan(0);
    });
  });

  it('ningún hechizo tiene unlockLevel > 200', () => {
    hunter.forEach(([id, s]) => {
      expect(s.unlockLevel, `${id} unlockLevel`).toBeLessThanOrEqual(200);
    });
  });

  it('efectos válidos: todos los tipos existen en el motor', () => {
    const validTypes = new Set([
      'damage', 'heal', 'status', 'shield', 'knockback', 'dash', 'teleport',
      'restoreResource', 'summon', 'zone', 'blink', 'swap', 'pull', 'recoil',
      'trap', 'reveal', 'selfStack', 'chain', 'bonusVsStatus', 'power',
      'critChance', 'critDamage', 'fixedDamage', 'pushDamage', 'dispel',
      'shareDamage'
    ]);
    hunter.forEach(([id, s]) => {
      s.effects.forEach((e: { type: string }, i: number) => {
        expect(validTypes.has(e.type), `${id}.effects[${i}].type: ${e.type}`).toBe(true);
      });
    });
  });
});
