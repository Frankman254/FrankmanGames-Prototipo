import { describe, expect, it } from 'vitest';
import { FakeSession } from '../../src/ui/menus/fake/fakeSession';
import { DEFAULT_OPTIONS, MemoryStore, SaveStore, loadOptions, normalizeOptions, saveOptions } from '../../src/ui/menus/saveStore';

describe('ranuras de guardado', () => {
  it('guarda, lista, carga y borra; la sesión cargada es igual', () => {
    const store = new SaveStore(new MemoryStore());
    expect(store.list()).toEqual([null, null, null]);
    expect(store.firstEmpty()).toBe(0);
    const s = FakeSession.create('ember_vanguard', 'Aldara', 1, { demo: true });
    const data = s.save();
    store.write(1, data);
    expect(store.list()[1]).toMatchObject({ slot: 1, name: 'Aldara', classId: 'ember_vanguard', level: 4 });
    expect(store.firstEmpty()).toBe(0);
    const back = store.read(1)!;
    const loaded = new FakeSession(back, 2);
    expect(loaded.inventory()).toEqual(s.inventory());
    expect(loaded.equipment()).toEqual(s.equipment());
    expect(loaded.spellbook()).toEqual(s.spellbook());
    const strip = (d: ReturnType<typeof s.save>) => ({ ...d, savedAt: '' });
    expect(strip(loaded.save())).toEqual(strip(s.save()));
    expect(loaded.player().level).toBe(4);
    store.remove(1);
    expect(store.read(1)).toBeNull();
  });

  it('«Continuar» elige la más reciente', () => {
    const store = new SaveStore(new MemoryStore());
    const s = FakeSession.create('storm_weaver', 'Ivo', 1);
    store.write(0, { ...s.save(), savedAt: '2026-10-01T10:00:00Z' });
    store.write(2, { ...s.save(), savedAt: '2026-10-29T10:00:00Z' });
    expect(store.latest()).toBe(2);
  });

  it('ignora guardados rotos o de otra versión y ranuras fuera de rango', () => {
    const mem = new MemoryStore();
    const store = new SaveStore(mem);
    mem.setItem('frankmangames.save.0', '{no es json');
    mem.setItem('frankmangames.save.1', JSON.stringify({ version: 2, name: 'x' }));
    expect(store.read(0)).toBeNull();
    expect(store.read(1)).toBeNull();
    expect(store.list()).toEqual([null, null, null]);
    expect(() => store.read(3)).toThrow();
  });
});

describe('opciones', () => {
  it('por defecto si no hay nada o está roto', () => {
    const mem = new MemoryStore();
    expect(loadOptions(mem)).toEqual(DEFAULT_OPTIONS);
    mem.setItem('frankmangames.options', '???');
    expect(loadOptions(mem)).toEqual(DEFAULT_OPTIONS);
  });

  it('recorta a los límites y conserva lo válido', () => {
    expect(normalizeOptions({ cameraSensitivity: 99, volume: -1, invertCameraY: true, showFps: 'sí' })).toEqual({
      ...DEFAULT_OPTIONS, cameraSensitivity: 3, volume: 0, invertCameraY: true,
    });
    // Temas, letras y límites de FPS sólo de las listas; la escala de la interfaz, acotada.
    expect(normalizeOptions({ theme: 'rosa', font: 'comic', fpsCap: 45, uiScale: 9 })).toMatchObject({
      theme: DEFAULT_OPTIONS.theme, font: DEFAULT_OPTIONS.font, fpsCap: 0, uiScale: 1.5,
    });
    expect(normalizeOptions({ theme: 'tierra', font: 'legible', fpsCap: 60, showGrid: true })).toMatchObject({ theme: 'tierra', font: 'legible', fpsCap: 60, showGrid: true });
    const mem = new MemoryStore();
    saveOptions(mem, { ...DEFAULT_OPTIONS, cameraSensitivity: 1.7, showFps: false });
    expect(loadOptions(mem)).toMatchObject({ cameraSensitivity: 1.7, showFps: false });
  });
});
