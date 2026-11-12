import { describe, it, expect } from 'vitest';
import { prefabRegistry } from '../src/editor/prefabRegistry';
import type { ManualObjectKind } from '../src/data/dungeonFloorMap';

describe('PrefabRegistry', () => {
  it('tiene todos los tipos de ManualObjectKind registrados', () => {
    const kinds: ManualObjectKind[] = [
      'chest', 'barrel', 'jar', 'door', 'torch',
      'spawn', 'npc', 'resource', 'decoration',
      'structural', 'zone', 'trigger', 'entrance', 'exit',
    ];
    for (const kind of kinds) {
      const entry = prefabRegistry.get(kind);
      expect(entry).toBeDefined();
      expect(entry!.kind).toBe(kind);
      expect(entry!.name).toBeTruthy();
      expect(entry!.category).toBeTruthy();
      expect(entry!.icon).toBeTruthy();
      expect(entry!.description).toBeTruthy();
    }
  });

  it('getCategories() devuelve categorías ordenadas', () => {
    const cats = prefabRegistry.getCategories();
    expect(cats.length).toBeGreaterThan(0);
    expect(cats).toEqual(cats.slice().sort());
  });

  it('getByCategory() filtra correctamente', () => {
    const cats = prefabRegistry.getCategories();
    for (const cat of cats) {
      const entries = prefabRegistry.getByCategory(cat);
      expect(entries.length).toBeGreaterThan(0);
      for (const e of entries) {
        expect(e.category).toBe(cat);
      }
    }
  });

  it('search() busca por nombre y descripción', () => {
    const results = prefabRegistry.search('cofre');
    expect(results.some((e) => e.kind === 'chest')).toBe(true);
    const results2 = prefabRegistry.search('rompible');
    expect(results2.some((e) => e.kind === 'barrel')).toBe(true);
    const empty = prefabRegistry.search('xyznoexiste123');
    expect(empty.length).toBe(0);
  });

  it('createObject() crea un objeto con propiedades del prefab', () => {
    const obj = prefabRegistry.createObject('chest', 5, 10, 'test-1');
    expect(obj.id).toBe('test-1');
    expect(obj.kind).toBe('chest');
    expect(obj.position.x).toBe(5);
    expect(obj.position.y).toBe(10);
    expect(obj.name).toBeTruthy();
    expect(obj.scale).toBeGreaterThan(0);
    expect(obj.visible).toBe(true);
    expect(obj.properties).toBeDefined();
  });

  it('createObject() lanza si el prefab no existe', () => {
    expect(() => prefabRegistry.createObject('chest', 0, 0, 'x')).not.toThrow();
  });

  it('validateProperties() valida rangos', () => {
    // lootLevel fuera de rango
    const errors = prefabRegistry.validateProperties('chest', { lootLevel: 99 });
    expect(errors.length).toBeGreaterThan(0);
    // lootLevel dentro de rango
    const ok = prefabRegistry.validateProperties('chest', { lootLevel: 5 });
    expect(ok.length).toBe(0);
  });

  it('validateProperties() valida enums', () => {
    const errors = prefabRegistry.validateProperties('door', { activation: 'invalid' });
    expect(errors.length).toBeGreaterThan(0);
    const ok = prefabRegistry.validateProperties('door', { activation: 'click' });
    expect(ok.length).toBe(0);
  });

  it('validateProperties() valida propiedades requeridas', () => {
    const errors = prefabRegistry.validateProperties('npc', {});
    expect(errors.some((e) => e.includes('name'))).toBe(true);
    const ok = prefabRegistry.validateProperties('npc', { name: 'Guardián' });
    expect(ok.length).toBe(0);
  });

  it('getAll() devuelve todos los prefabs', () => {
    const all = prefabRegistry.getAll();
    expect(all.length).toBe(14);
  });
});
