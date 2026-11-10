// Validación de data/ambient.json (capa ambiental de catálogos de Blender).
import { AMBIENT_RINGS, type AmbientDef, type AmbientLayerDef, type AmbientPieceDef, type AmbientRing, type AmbientPlacedDef } from '../world/ambient';
import type { VegetationRing } from '../world/detail';
import { Reader } from './validate';

type Obj = Record<string, unknown>;

function range(r: Reader, o: Obj, key: string, min: number): [number, number] {
  const v = r.arr(o, key);
  if (v.length !== 2 || typeof v[0] !== 'number' || typeof v[1] !== 'number' || v[0] < min || v[1] < v[0]) r.fail(key, `se esperaba [mín, máx] con mín ≥ ${min}`);
  return [v[0], v[1]];
}

export function parseAmbient(raw: unknown): AmbientDef {
  const r = new Reader('ambient.json');
  const o = r.obj(raw);

  const ringsR = r.child('rings');
  const ringsO = ringsR.obj(o['rings']);
  const rings = {} as Record<AmbientRing, VegetationRing>;
  for (const id of AMBIENT_RINGS) {
    const c = ringsR.child(id);
    const v = c.obj(ringsO[id]);
    const full = c.num(v, 'full', { min: 1 });
    rings[id] = { full, off: c.num(v, 'off', { min: full + 1 }) };
  }

  const budgetR = r.child('budget');
  const b = budgetR.obj(o['budget']);
  const budget = {
    maxScatterPerChunk: budgetR.num(b, 'maxScatterPerChunk', { min: 1, int: true }),
    maxTrianglesPerChunk: budgetR.num(b, 'maxTrianglesPerChunk', { min: 1, int: true }),
    maxPlaced: budgetR.num(b, 'maxPlaced', { min: 0, int: true }),
    maxPlacedGap: budgetR.num(b, 'maxPlacedGap', { min: 0 }),
    maxPlacedSlope: budgetR.num(b, 'maxPlacedSlope', { min: 0 }),
    solidPathClearance: budgetR.num(b, 'solidPathClearance', { min: 0 }),
  };

  const piecesR = r.child('pieces');
  const pieces: Record<string, AmbientPieceDef> = {};
  for (const [id, v] of Object.entries(piecesR.obj(o['pieces']))) {
    if (id.startsWith('_')) continue;
    const c = piecesR.child(id);
    const p = c.obj(v);
    pieces[id] = {
      model: c.str(p, 'model'),
      w: c.num(p, 'w', { min: 0.01, max: 20 }),
      d: c.num(p, 'd', { min: 0.01, max: 20 }),
      h: c.num(p, 'h', { min: 0.01, max: 20 }),
      solid: p['solid'] === true,
    };
  }

  const layers: AmbientLayerDef[] = r.arr(o, 'layers').map((v, i) => {
    const c = r.child(`layers[${i}]`);
    const l = c.obj(v);
    const names: string[] = c.arr(l, 'pieces').map((raw, j) => {
      const name = typeof raw === 'string' ? raw : c.fail(`pieces.${j}`, 'se esperaba un texto');
      const piece = pieces[name] ?? c.fail(`pieces.${j}`, `no existe la pieza ${name}`);
      if (piece.solid) c.fail(`pieces.${j}`, `${name} es sólida: va en placed, con huella`);
      return name;
    });
    const weights: Record<string, number> = {};
    if (l['weights'] !== undefined) {
      for (const [id, raw] of Object.entries(c.obj(l['weights'], 'weights'))) {
        const weight = typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? raw : c.fail(`weights.${id}`, 'peso no válido');
        weights[id] = weight;
      }
    }
    return {
      id: c.str(l, 'id'),
      pieces: names,
      density: c.num(l, 'density', { min: 0, max: 100 }),
      minSpacing: c.num(l, 'minSpacing', { min: 0.3, max: 50 }),
      scale: range(c, l, 'scale', 0.05),
      tint: range(c, l, 'tint', 0),
      pathClearance: c.num(l, 'pathClearance', { min: 0 }),
      ...(l['pathBand'] === undefined ? {} : { pathBand: range(c, l, 'pathBand', 0) }),
      ...(l['shore'] === undefined ? {} : { shore: range(c, l, 'shore', 0) }),
      forest: c.num(l, 'forest', { min: -1, max: 1, def: 0 }),
      inFlatAreas: l['inFlatAreas'] === true,
      maxSlope: c.num(l, 'maxSlope', { min: 0, def: 0.6 }),
      ring: c.str(l, 'ring', AMBIENT_RINGS) as AmbientRing,
      weights,
      defaultWeight: c.num(l, 'defaultWeight', { min: 0, def: 1 }),
    };
  });
  if (new Set(layers.map((l) => l.id)).size !== layers.length) r.fail('layers', 'hay ids de capa repetidos');

  const placed: AmbientPlacedDef[] = r.arr(o, 'placed').map((v, i) => {
    const c = r.child(`placed[${i}]`);
    const s = c.obj(v);
    const piece = c.str(s, 'piece');
    if (!pieces[piece]) c.fail('piece', `no existe la pieza ${piece}`);
    return { piece, x: c.num(s, 'x'), y: c.num(s, 'y'), rotDeg: c.num(s, 'rotDeg', { def: 0 }), scale: c.num(s, 'scale', { min: 0.2, max: 4, def: 1 }) };
  });
  if (placed.length > budget.maxPlaced) r.fail('placed', `hay ${placed.length} piezas y el presupuesto es ${budget.maxPlaced}`);

  return {
    seed: r.num(o, 'seed', { int: true }),
    chunkMeters: r.num(o, 'chunkMeters', { min: 8, int: true }),
    rings,
    budget,
    pieces,
    layers,
    placed,
  };
}
