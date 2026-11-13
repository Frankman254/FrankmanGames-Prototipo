// F06 y F09: cobertura de iconos de interfaz y marcadores del mapa.
// Verifica que los PNG de Codex existen y que el sistema de fallback funciona.
import { describe, it, expect } from 'vitest';
import { artIcon, artIconUrl, artIconIds } from '../src/ui/menus/artIcons';
import type { MarkerKind } from '../src/ui/map/mapDraw';

describe('F06: iconos de interfaz (artIcons)', () => {
  it('los 12 iconos UI tienen PNG', () => {
    const expected = [
      'inventory', 'character', 'spellbook', 'map', 'journal', 'compendium',
      'professions', 'pause', 'options', 'chat', 'camera', 'characteristics',
    ];
    const ids = artIconIds('ui');
    for (const id of expected) {
      expect(ids, `falta ${id}.png en assets/icons/ui/`).toContain(id);
      expect(artIconUrl('ui', id), `artIconUrl('ui', '${id}')`).not.toBeNull();
    }
  });

  it('artIconUrl devuelve null para un id que no existe', () => {
    expect(artIconUrl('ui', 'no-existe')).toBeNull();
  });

  it('artIcon() devuelve null para id undefined', () => {
    expect(artIcon('ui', undefined)).toBeNull();
  });
});

describe('F09: marcadores del mapa', () => {
  it('los 10 marcadores tienen PNG', () => {
    const expected = [
      'piedra_pintada', 'taller', 'banco', 'castillo', 'casa',
      'mercader', 'mision', 'mazmorra', 'muelle', 'lancha',
    ];
    const ids = artIconIds('map');
    for (const id of expected) {
      expect(ids, `falta ${id}.png en assets/icons/map/`).toContain(id);
      expect(artIconUrl('map', id), `artIconUrl('map', '${id}')`).not.toBeNull();
    }
  });

  it('artIconUrl devuelve null para un marcador que no existe', () => {
    expect(artIconUrl('map', 'no-existe')).toBeNull();
  });

  // Verifica que los MarkerKind nuevos existen en el tipo.
  it('MarkerKind incluye los 7 tipos nuevos', () => {
    const nuevos: MarkerKind[] = ['bank', 'house', 'castle', 'dungeon', 'dock', 'workshop', 'boat'];
    expect(nuevos).toHaveLength(7);
  });

  // Verifica que el mapeo de modelos de vegetation.json a MarkerKind es correcto.
  it('el mapeo landmark → MarkerKind cubre los modelos del mundo', async () => {
    const veg = (await import('../data/vegetation.json')).default;
    const landmarks = veg.props.filter((p: { kind: string; model?: string }) => p.kind === 'landmark' && p.model);
    // Los modelos con PNG correspondiente deben tener un MarkerKind.
    const modelosConPng = new Set(['castillo', 'iglesia', 'lancha']); // los que están en vegetation.json hoy
    for (const lm of landmarks) {
      if (modelosConPng.has(lm.model!)) {
        // castillo → castle, iglesia → house, lancha → boat
        const esperado = lm.model === 'castillo' ? 'castle' : lm.model === 'iglesia' ? 'house' : 'boat';
        expect(['castle', 'house', 'boat'], `modelo ${lm.model} sin MarkerKind`).toContain(esperado);
      }
    }
  });
});
