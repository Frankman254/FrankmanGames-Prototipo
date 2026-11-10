// Asiento de las estructuras: ninguna casa, edificio, Piedra, taller o lancha puede quedar
// enterrada en el terreno ni flotando sobre él (incidencia del creador, 2026-11-10).
// El detalle por estructura lo da `npm run audit:structures`.
import { describe, expect, it } from 'vitest';
import deathJson from '../data/death.json';
import professionsJson from '../data/rpg/professions.json';
import stonesJson from '../data/stones.json';
import { loadWorldData, worldStructures } from '../src/data/worldData';
import { buildOverworld } from '../src/world/overworld';
import { atlasToShape } from '../src/world/pageContext';
import { fitStructure, houseDoor, listStructures, structureBaseY, structurePads, type StructureRules } from '../src/world/structures';
import { naturalHeight, terrainHeight, type TerrainDef } from '../src/world/terrain';

const wd = loadWorldData();
const def = wd.terrain;
const rules = def.structures;
const structures = worldStructures(def, wd.vegetation);
const ow = buildOverworld(wd);
const shape = atlasToShape(ow.stream.ctx);
const sea = wd.atlas.seaLevel;
/** El terreno calculado: con él se colocan las piezas al arrancar. */
const exact = (x: number, z: number): number => terrainHeight(def, x, z, shape);

describe('asiento de las estructuras en el terreno', () => {
  it('la lista recoge casas, edificios, Piedras, talleres, Alzadores, cripta, banco y lanchas', () => {
    const kinds = new Set(structures.map((s) => s.kind));
    for (const k of ['house', 'landmark', 'lamp', 'log', 'boulder', 'stone', 'station', 'resurrector', 'crypt', 'bank']) expect(kinds, k).toContain(k);
    // Cada prop, cada Piedra, cada taller y cada Alzador, más la cripta y el banco.
    expect(structures.length).toBe(wd.vegetation.props.length + stonesJson.stones.length + Object.keys(professionsJson.stations).length + deathJson.resurrectors.length + 2);
    expect(structures.filter((s) => s.seat === 'afloat').map((s) => s.model)).toEqual(['lancha', 'lancha']);
  });

  it('ninguna queda enterrada ni flotando más del umbral, en ningún pueblo', () => {
    const bad = structures
      .map((s) => fitStructure(s, structureBaseY(s, exact, sea), exact, sea, rules.tolerance))
      .filter((f) => f.problems.length > 0)
      .map((f) => `${f.structure.id}: ${f.problems.join('; ')}`);
    expect(bad).toEqual([]);
  });

  it('el suelo que se dibuja (páginas cargadas) coincide con el calculado bajo cada huella', () => {
    // Lo que se ve es el campo de alturas de las páginas; las piezas se asientan con el
    // terreno calculado porque se colocan antes de que esas páginas lleguen. Deben coincidir.
    for (const s of structures) {
      ow.stream.ensure(s.x - s.w / 2 - 1, s.y - s.d / 2 - 1, s.x + s.w / 2 + 1, s.y + s.d / 2 + 1);
      const loaded = (x: number, z: number): number => ow.heights.sample(x, z);
      const f = fitStructure(s, structureBaseY(s, exact, sea), loaded, sea, rules.tolerance);
      expect(f.problems, s.id).toEqual([]);
    }
  });

  it('las lanchas van en el agua: casco a su calado y fondo marino debajo', () => {
    for (const s of structures.filter((x) => x.seat === 'afloat')) {
      expect(structureBaseY(s, exact, sea), s.id).toBeCloseTo(sea - rules.afloat['lancha']!.draft, 6);
      // El modelo mide 6,6 m de eslora: se mira un cuadrado de ese lado, no solo la huella.
      for (const dx of [-3.3, 0, 3.3]) for (const dz of [-3.3, 0, 3.3]) expect(exact(s.x + dx, s.y + dz), `${s.id} ${dx},${dz}`).toBeLessThan(sea - 0.5);
    }
  });

  it('las casas tienen la puerta a ras del suelo y sobre el nivel del mar', () => {
    for (const p of wd.vegetation.props.filter((x) => x.kind === 'house')) {
      const door = houseDoor(p);
      const s = structures.find((x) => x.kind === 'house' && x.x === p.x && x.y === p.y)!;
      const base = structureBaseY(s, exact, sea);
      expect(Math.abs(exact(door.x, door.y) - base), `${s.id}`).toBeLessThan(0.05);
      expect(base, `${s.id} sobre el mar`).toBeGreaterThan(sea + 0.4);
    }
  });
});

describe('plataformas de terreno', () => {
  const flat: StructureRules = { padMargin: 1, padFalloff: 4, padMinSize: 1.5, footprints: { stone: 3, station: 2, resurrector: 2, crypt: 5 }, afloat: { lancha: { draft: 0.3 } } };
  const src = {
    props: [
      { kind: 'house' as const, x: 60, y: 60, w: 8, d: 6, rotDeg: 0 },
      { kind: 'lamp' as const, x: 20, y: 20, w: 0.4, d: 0.4, rotDeg: 0 },
      { kind: 'landmark' as const, model: 'lancha', x: 100, y: 100, w: 1.5, d: 4.6, rotDeg: 90 },
    ],
    stones: [], stations: [], resurrectors: [], bank: { x: 200, y: 200, w: 8, d: 6 }, crypt: { x: 150, y: 150 },
  };
  const list = listStructures(src, flat);
  const { pads: _own, ...plain } = def;
  // Sin caminos ni claros y con el relieve exagerado: ladera natural bajo la casa.
  const hill: TerrainDef = { ...plain, noise: { ...plain.noise, amplitude: 12 }, paths: [], flatAreas: [], ponds: [], pads: structurePads(list, flat) };

  it('sólo aplana bajo huellas de tamaño suficiente y que no flotan', () => {
    expect(list.map((s) => s.seat)).toEqual(['pad', 'point', 'afloat', 'pad', 'pad']);
    expect(hill.pads).toHaveLength(3);
  });

  it('bajo la huella y su margen el suelo queda a la altura natural de la puerta', () => {
    const level = naturalHeight(hill, 60, 57); // puerta: lado −Z
    let natural = 0;
    for (let x = 55; x <= 65; x += 0.5) {
      for (let z = 56; z <= 64; z += 0.5) {
        expect(terrainHeight(hill, x, z)).toBeCloseTo(level, 6);
        natural = Math.max(natural, Math.abs(naturalHeight(hill, x, z) - level));
      }
    }
    // La prueba vale algo: sin plataforma, esa ladera se sale del umbral.
    expect(natural).toBeGreaterThan(0.3);
  });

  it('fuera del margen vuelve al relieve natural sin escalón', () => {
    // A más de padFalloff del borde no cambia nada.
    for (const [x, z] of [[60, 47.9], [70.1, 60], [49.9, 60], [60, 72.1], [20, 20], [100, 100]] as const) expect(terrainHeight(hill, x, z)).toBe(naturalHeight(hill, x, z));
    // En la transición, pasos de 10 cm cambian la altura centímetros.
    let prev = terrainHeight(hill, 60, 64);
    for (let z = 64.1; z <= 69; z += 0.1) {
      const h = terrainHeight(hill, 60, z);
      expect(Math.abs(h - prev)).toBeLessThan(0.15);
      prev = h;
    }
  });
});
