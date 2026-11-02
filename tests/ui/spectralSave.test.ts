import { describe, expect, it } from 'vitest';
import { MemoryStore, migrateSave, SaveStore } from '../../src/ui/menus/saveStore';
import { session } from '../rpg/helpers';

function baseSave() {
  const { spectral: _spectral, ...legacy } = session().save();
  return {
    ...legacy,
    place: { scene: 'overworld' as const, dungeon: null, floor: null, x: 136, y: 120, stone: null, timeOfDay: 0.5 },
  };
}

describe('almacenamiento opcional del estado espectral', () => {
  it('conserva guardados antiguos sin inventar un campo espectral', () => {
    const base = baseSave();
    expect(migrateSave(base)).toEqual(base);
    expect(migrateSave(base)).not.toHaveProperty('spectral');
  });

  it.each([true, false])('conserva el estado active=%s con place válido y sin alias', (active) => {
    const base = baseSave();
    const raw = { ...base, spectral: { active, deaths: 7, extra: 'no copiar' } };
    const migrated = migrateSave(raw)!;
    expect(migrated).toEqual({ ...base, spectral: { active, deaths: 7 } });
    expect(migrated.spectral).not.toBe(raw.spectral);
    raw.spectral.deaths = 99;
    expect(migrated.spectral!.deaths).toBe(7);
  });

  it.each([
    null, [], 'espectro', 0,
    { active: 'true', deaths: 0 }, { active: 1, deaths: 0 },
    { active: true, deaths: -1 }, { active: true, deaths: 1.5 },
    { active: true, deaths: Number.MAX_SAFE_INTEGER + 1 },
    { active: true, deaths: NaN }, { active: true, deaths: Infinity },
    { active: true }, { deaths: 0 },
  ])('descarta un campo inválido sin perder la partida: %j', (spectral) => {
    const base = baseSave();
    expect(migrateSave({ ...base, spectral })).toEqual(base);
  });

  it('normaliza también guardados anteriores sin place', () => {
    const raw = session().save();
    const migrated = migrateSave({ ...raw, spectral: { active: true, deaths: 0 } })!;
    expect(migrated.spectral).toEqual({ active: true, deaths: 0 });
    expect(migrated.place?.scene).toBe('overworld');
    expect(migrated.energy).toEqual(raw.energy);
  });

  it.each([true, false])('ida/vuelta JSON de ranura conserva active=%s y contenido', (active) => {
    const store = new SaveStore(new MemoryStore());
    const saved = { ...baseSave(), spectral: { active, deaths: Number.MAX_SAFE_INTEGER } };
    store.write(0, saved);
    const read = store.read(0)!;
    expect(read).toEqual(saved);
    expect(read.spectral).not.toBe(saved.spectral);
    store.rename(0, 'Prueba espectral');
    expect(store.read(0)?.spectral).toEqual(saved.spectral);
    expect(store.read(0)?.version).toBe(1);
  });
});
