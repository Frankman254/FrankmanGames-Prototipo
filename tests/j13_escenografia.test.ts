import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import ambientJson from '../data/ambient.json';
import { parseAmbient } from '../src/data/ambientSchema';
import { parseCatalogGlb } from '../src/render/catalogGeometry';
import { solidFootprint } from '../src/world/ambient';

const parsed = parseAmbient(ambientJson);

describe('J13: integración de escenografia_regional.glb', () => {
  it('los 3 nodos de escenografía existen en el GLB', () => {
    const file = readFileSync('assets/models/escenografia_regional.glb');
    const data = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
    const library = parseCatalogGlb(data);
    for (const id of ['escena_amarradero', 'escena_baliza_costera', 'escena_poste_direcciones']) {
      expect(library.get(id), `${id} en escenografia_regional.glb`).toBeDefined();
    }
  });

  it('las dimensiones declaradas coinciden con el GLB (tolerancia 0.02 m)', () => {
    const file = readFileSync('assets/models/escenografia_regional.glb');
    const data = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
    const library = parseCatalogGlb(data);
    for (const [id, piece] of Object.entries(parsed.pieces)) {
      if (piece.model !== 'escenografia_regional') continue;
      const geometry = library.get(id);
      expect(geometry, id).toBeDefined();
      const size = geometry!.max.map((value, axis) => value - geometry!.min[axis]!) as [number, number, number];
      expect(Math.abs(size[0] - piece.w), `${id}: ancho`).toBeLessThanOrEqual(0.02);
      expect(Math.abs(size[1] - piece.h), `${id}: alto`).toBeLessThanOrEqual(0.02);
      expect(Math.abs(size[2] - piece.d), `${id}: fondo`).toBeLessThanOrEqual(0.02);
    }
  });

  it('el catálogo escenografia_regional está registrado en pieces', () => {
    const pieces = Object.entries(parsed.pieces).filter(([, p]) => p.model === 'escenografia_regional');
    expect(pieces.length).toBe(3);
    const ids = pieces.map(([id]) => id);
    expect(ids).toContain('escena_amarradero');
    expect(ids).toContain('escena_baliza_costera');
    expect(ids).toContain('escena_poste_direcciones');
  });

  it('escena_amarradero es atravesable (solid: false) y las demás son sólidas', () => {
    expect(parsed.pieces['escena_amarradero']!.solid).toBe(false);
    expect(parsed.pieces['escena_baliza_costera']!.solid).toBe(true);
    expect(parsed.pieces['escena_poste_direcciones']!.solid).toBe(true);
  });

  it('ninguna pieza invade el radio de 4m de los puntos de lancha', () => {
    // BOAT_CLICK_RADIUS = 4m (src/world/boats.ts)
    const boats = [
      { x: 592, y: 236, name: 'Iguanera' },
      { x: 478, y: 14, name: 'Pedasol' },
    ];
    const escenaPlaced = parsed.placed.filter(
      (p) => p.piece.startsWith('escena_'),
    );
    for (const boat of boats) {
      for (const p of escenaPlaced) {
        const pieceDef = parsed.pieces[p.piece];
        if (!pieceDef) continue;
        // Calcular la distancia del centro de la pieza al punto de lancha
        const d = Math.hypot(p.x - boat.x, p.y - boat.y);
        // La distancia mínima debe ser > 4m + la mitad de la dimensión mayor de la pieza
        const halfSize = Math.max(pieceDef.w, pieceDef.d) / 2 * p.scale;
        const minClearance = 4 + halfSize;
        expect(d, `${p.piece} en ${boat.name}: distancia ${d.toFixed(1)}m > ${minClearance.toFixed(1)}m`).toBeGreaterThan(minClearance);
      }
    }
  });

  it('las piezas sólidas no bloquean el corredor caminable de 3m entre lancha y tierra', () => {
    // Iguanera: la lancha está en (592,236); el corredor hacia tierra (este) pasa por ~596,236
    // Pedasol: la lancha está en (478,14); el corredor hacia tierra (este) pasa por ~482,14
    const corridors = [
      // Iguanera: corredor al este de la lancha
      { x0: 594, y0: 234, x1: 600, y1: 238, name: 'Iguanera' },
      // Pedasol: corredor al este de la lancha
      { x0: 480, y0: 12, x1: 486, y1: 16, name: 'Pedasol' },
    ];
    const solidEscena = parsed.placed.filter(
      (p) => parsed.pieces[p.piece]?.solid && p.piece.startsWith('escena_'),
    );
    for (const cor of corridors) {
      for (const p of solidEscena) {
        const footprint = solidFootprint(parsed, p);
        for (const pt of footprint) {
          // Verificar que el punto de la huella no cae dentro del corredor
          const inCorridor = pt.x >= cor.x0 && pt.x <= cor.x1 && pt.y >= cor.y0 && pt.y <= cor.y1;
          expect(inCorridor, `${p.piece} en ${cor.name}: huella (${pt.x.toFixed(1)},${pt.y.toFixed(1)}) no debe estar en corredor`).toBe(false);
        }
      }
    }
  });

  it('simetría: ambos muelles tienen el mismo número de piezas', () => {
    // Iguanera: piezas alrededor de (592,236)
    const iguPieces = parsed.placed.filter(
      (p) => p.piece.startsWith('escena_') && Math.hypot(p.x - 592, p.y - 236) < 20,
    );
    // Pedasol: piezas alrededor de (478,14)
    const pedPieces = parsed.placed.filter(
      (p) => p.piece.startsWith('escena_') && Math.hypot(p.x - 478, p.y - 14) < 20,
    );
    expect(iguPieces.length, 'Iguanera').toBeGreaterThan(0);
    expect(pedPieces.length, 'Pedasol').toBeGreaterThan(0);
    expect(iguPieces.length, 'simetría').toBe(pedPieces.length);
  });

  it('determinismo: las piezas puestas a mano son estables', () => {
    const parsed2 = parseAmbient(ambientJson);
    const escena1 = parsed.placed.filter((p) => p.piece.startsWith('escena_'));
    const escena2 = parsed2.placed.filter((p) => p.piece.startsWith('escena_'));
    expect(escena1.length).toBe(escena2.length);
    for (let i = 0; i < escena1.length; i++) {
      expect(escena1[i]!.piece).toBe(escena2[i]!.piece);
      expect(escena1[i]!.x).toBe(escena2[i]!.x);
      expect(escena1[i]!.y).toBe(escena2[i]!.y);
    }
  });

  it('no hay botes decorativos ni duplicación de la lancha funcional', () => {
    // Los nodos escena_bote_angosto, escena_bote_carga, escena_bote_pasajeros
    // NO deben estar registrados en pieces ni en placed.
    const botePieces = Object.entries(parsed.pieces).filter(
      ([, p]) => p.model === 'escenografia_regional' && p.w > 3,
    );
    // Ninguno de los botes debe estar registrado
    for (const [id] of botePieces) {
      expect(id.includes('bote'), `${id} no debe ser un bote decorativo`).toBe(false);
    }
    const botePlaced = parsed.placed.filter((p) => p.piece.includes('bote'));
    expect(botePlaced.length).toBe(0);
  });

  it('el presupuesto de placed no se excede con las nuevas piezas', () => {
    const maxPlaced = parsed.budget.maxPlaced;
    expect(parsed.placed.length, `placed total (${parsed.placed.length}) <= ${maxPlaced}`).toBeLessThanOrEqual(maxPlaced);
  });
});
