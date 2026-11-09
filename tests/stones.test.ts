import { describe, expect, it } from 'vitest';
import stonesJson from '../data/stones.json';
import { ARRIVE_METERS, StoneBook, arrivalSpot, faceYawDeg, mapCoords, parseStones } from '../src/world/stones';
import { diffClass, groupCombatants } from '../src/ui/menus/worldHud';

const def = parseStones(stonesJson);
const at = (z: { x: number; y: number }) => ({ x: z.x, y: z.y });

describe('Piedras Pintadas', () => {
  it('un personaje nuevo conoce solo la Piedra donde empieza, que es su reaparición', () => {
    const b = new StoneBook(def);
    expect(b.progress).toEqual({ known: [def.start], respawn: def.start });
  });

  it('tocar uno lo activa una vez y pasa a ser la reaparición', () => {
    const b = new StoneBook(def);
    const z = def.stones.find((x) => x.id !== def.home)!;
    expect(b.touch({ x: z.x + 1, y: z.y }, at)?.id).toBe(z.id);
    expect(b.touch({ x: z.x, y: z.y }, at)).toBeNull(); // ya conocido
    expect(b.respawn.id).toBe(z.id);
    expect(b.touch({ x: 0, y: 0 }, at)).toBeNull();
  });

  it('lo guardado roto o con piedras que no existen se limpia', () => {
    const b = new StoneBook(def, { known: ['nope', 7, def.stones[1]!.id], respawn: 'nope' });
    expect(b.progress.known).toEqual([def.home, def.stones[1]!.id]);
    expect(b.progress.respawn).toBe(def.home);
  });

  it('rechaza ids repetidos y una piedra de casa que no existe', () => {
    expect(() => parseStones({ ...stonesJson, home: 'x' })).toThrow(/home/);
    expect(() => parseStones({ ...stonesJson, stones: [stonesJson.stones[0], stonesJson.stones[0]] })).toThrow(/repetido/);
  });

  it('coordenadas de mapa con el centro en [0, 0]', () => {
    expect(mapCoords(128, 128, 256, 256, 16)).toEqual([0, 0]);
    expect(mapCoords(127, 0, 256, 256, 16)).toEqual([-1, -8]);
    expect(mapCoords(255, 255, 256, 256, 16)).toEqual([7, 7]);
  });
});

describe('barra de combate', () => {
  const c = (archetype: string, level: number, health: number) => ({ archetype, name: archetype, level, health, maxHealth: 100, diff: level - 3, casting: null });
  it('agrupa los idénticos (tipo y nivel) sumando la vida', () => {
    const g = groupCombatants([c('melee', 3, 50), c('ranged', 3, 100), c('melee', 3, 100), c('melee', 5, 10)]);
    expect(g.map((x) => [x.key, x.count, x.health, x.maxHealth])).toEqual([
      ['melee:3', 2, 150, 200],
      ['ranged:3', 1, 100, 100],
      ['melee:5', 1, 10, 100],
    ]);
  });
  it('color por diferencia de nivel', () => {
    expect([diffClass(-6), diffClass(0), diffClass(3), diffClass(8)]).toEqual(['trivial', 'even', 'hard', 'deadly']);
  });

  // QA Q03: se aparecía dentro de la malla de la Piedra y mirando a ningún sitio.
  it('se aparece al lado de la Piedra, del lado que mira, y la cámara apunta hacia allí', () => {
    const igu = def.stones.find((z) => z.id === 'iguanera')!;
    expect(igu.face).toEqual({ x: 618, y: 232 });
    const p = arrivalSpot(igu, { x: igu.x, y: igu.y });
    expect(Math.hypot(p.x - igu.x, p.y - igu.y)).toBeCloseTo(ARRIVE_METERS, 5);
    // Más cerca del guardaparque que la Piedra.
    expect(Math.hypot(p.x - 618, p.y - 232)).toBeLessThan(Math.hypot(igu.x - 618, igu.y - 232));
    // Cerca para que la Piedra se active al pasar.
    expect(ARRIVE_METERS).toBeLessThan(def.activateRadius);
    // Rumbo de cámara: hacia el suroeste (x y z del render = x e y de la simulación).
    const yaw = faceYawDeg(igu, p)!;
    expect(Math.sin((yaw * Math.PI) / 180)).toBeLessThan(0);
    expect(Math.cos((yaw * Math.PI) / 180)).toBeLessThan(0);
  });

  it('sin hacia dónde mirar: al sur de la Piedra y sin girar la cámara', () => {
    const z = { id: 'x', name: 'X', x: 10, y: 10 };
    expect(arrivalSpot(z, { x: 10, y: 10 })).toEqual({ x: 10, y: 10 - ARRIVE_METERS });
    expect(faceYawDeg(z, { x: 10, y: 10 })).toBeNull();
  });
});
