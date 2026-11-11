// Qué ve el modo edición al aplicar en caliente: entre dos textos JSON debe
// decir qué archivos cambiaron y qué rectángulo del mundo hace falta rehacer.
// Si se equivoca, queda suelo o agua vieja en pantalla (o se regenera el mapa
// entero cada vez). Sin Babylon: pura comparación de datos.
import { describe, expect, it } from 'vitest';
import { boundsOf, diffApplied, unionRect } from '../../src/editor/hotDiff';

const j = (o: unknown): string => JSON.stringify(o);

describe('diffApplied: qué hay que rehacer al guardar', () => {
  it('no regenera nada si el texto es idéntico', () => {
    const d = diffApplied({ vegetation: j({ props: [{ kind: 'house', x: 10, y: 10, w: 6, d: 7 }] }) }, { vegetation: j({ props: [{ kind: 'house', x: 10, y: 10, w: 6, d: 7 }] }) });
    expect(d).toEqual({ files: [], rect: null });
  });

  it('mover un estanque pide rehacer su caja vieja y la nueva (con holgura)', () => {
    const before = { terrain: j({ ponds: [{ x: 84, y: 184, radius: 9, shore: 4 }] }) };
    const after = { terrain: j({ ponds: [{ x: 120, y: 184, radius: 9, shore: 4 }] }) };
    const { rect } = diffApplied(before, after);
    expect(rect).not.toBeNull();
    // El estanque cubre x 71..97 y x 107..133 (radio+ribera=13); holgura 12.
    expect(rect!.x0).toBeLessThanOrEqual(71 - 12);
    expect(rect!.x1).toBeGreaterThanOrEqual(133 + 12);
    expect(rect!.z0).toBeLessThanOrEqual(171 - 12);
  });

  it('cambiar el radio de una plataforma aplanada sí regenera; un campo suelto, no', () => {
    const flat = (radius: number, dirt = 0.5): string => j({ flatAreas: [{ x: 128, y: 128, radius, falloff: 10, dirt }] });
    expect(diffApplied({ terrain: flat(24) }, { terrain: flat(30) }).rect).not.toBeNull();
    // `dirt` cambia el color del suelo: se regenera (no es geometría, pero es visible).
    expect(diffApplied({ terrain: flat(24, 0.5) }, { terrain: flat(24, 0.2) }).rect).not.toBeNull();
    // Un campo que el mundo no dibuja (una nota) no toca nada.
    expect(diffApplied({ terrain: j({ flatAreas: [{ x: 1, y: 1, radius: 2, falloff: 1 }], _nota: 'a' }) }, { terrain: j({ flatAreas: [{ x: 1, y: 1, radius: 2, falloff: 1 }], _nota: 'b' }) }).rect).toBeNull();
  });

  it('prop que cambia de modelo sin moverse regenera (casa → castillo)', () => {
    const veg = (model: string): string => j({ props: [{ kind: 'landmark', model, x: 50, y: 50, w: 10, d: 10 }] });
    const { rect } = diffApplied({ vegetation: veg('iglesia') }, { vegetation: veg('castillo') });
    expect(rect).not.toBeNull();
  });

  it('dar de alta y de baja piedras cambia el rectángulo; reordenar, no', () => {
    const stones = (...ids: string[]): string => j({ stones: ids.map((id) => ({ id, x: 10, y: 20 })) });
    expect(diffApplied({ stones: stones('a') }, { stones: stones('a', 'b') }).rect).not.toBeNull();
    expect(diffApplied({ stones: stones('a', 'b') }, { stones: stones('b', 'a') }).rect).toBeNull();
  });

  it('borrar un sitio de pesca marca su zona para reestampar la rejilla', () => {
    const spots = (n: number): string => j({ spots: { s1: { x: 84, y: 184, radius: 9 }, s2: { x: n, y: 200, radius: 6 } } });
    const { rect } = diffApplied({ fishing: spots(184) }, { fishing: j({ spots: { s1: { x: 84, y: 184, radius: 9 } } }) });
    expect(rect).not.toBeNull();
  });

  it('el primer texto de un archivo (aún no aplicado) no fuerza regeneración', () => {
    // `before` ausente: no sabemos qué había; el arranque ya lo cargó entero.
    expect(diffApplied({}, { vegetation: j({ props: [{ kind: 'tree', x: 1, y: 1 }] }) }).rect).toBeNull();
  });

  it('JSON ilegible en el lado viejo: se rehace todo el mundo (a seguro)', () => {
    const { rect } = diffApplied({ vegetation: '{ roto' }, { vegetation: j({ props: [] }) });
    expect(rect).toEqual({ x0: -1e9, z0: -1e9, x1: 1e9, z1: 1e9 });
  });

  it('lista los archivos tocados tanto si cambia geometría como si no', () => {
    const d = diffApplied({ npcs: j({ npcs: { a: {} } }) }, { npcs: j({ npcs: { a: { position: { x: 1, y: 2 } } } }), zones: j({ zones: [] }) });
    expect(d.files.sort()).toEqual(['npcs', 'zones']);
    expect(d.rect).toBeNull(); // npcs y zones no llevan geometría de parcela
  });
});

describe('boundsOf y unionRect', () => {
  it('abarca w/d y radius con la holgura; null sin puntos', () => {
    expect(boundsOf([{ x: 10, y: 10, w: 4, d: 6 }], 2)).toEqual({ x0: 6, z0: 5, x1: 14, z1: 15 });
    expect(boundsOf([{ x: 10, y: 10, radius: 5 }], 0)).toEqual({ x0: 5, z0: 5, x1: 15, z1: 15 });
    expect(boundsOf([])).toBeNull();
  });

  it('une vacíos sin perder el otro', () => {
    const r = { x0: 0, z0: 0, x1: 1, z1: 1 };
    expect(unionRect(null, r)).toEqual(r);
    expect(unionRect(r, null)).toEqual(r);
    expect(unionRect(null, null)).toBeNull();
    expect(unionRect(r, { x0: 5, z0: -3, x1: 6, z1: 2 })).toEqual({ x0: 0, z0: -3, x1: 6, z1: 2 });
  });
});
