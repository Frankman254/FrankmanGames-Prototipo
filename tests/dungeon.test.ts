import { describe, expect, it } from 'vitest';
import dungeonJson from '../data/dungeon.json';
import enemiesJson from '../data/enemies.json';
import { loadGameData } from '../src/data';
import { loadDungeon, parseDungeon, type DungeonDef } from '../src/data/dungeonSchema';
import { DataError } from '../src/data/validate';
import { World } from '../src/sim/world';
import { chestLootTable, entranceExit, floodDistances, floorGameData, floorTitle, generateFloor, type DungeonFloor } from '../src/world/dungeon';

const data = loadGameData();
const def = loadDungeon(data);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const parse = (raw: unknown): DungeonDef => parseDungeon(raw, Object.keys(data.enemies.archetypes), Object.keys(data.rpg.lootTables));

/** Mundo del piso con el jugador en la llegada desde arriba. */
function floorWorld(f: DungeonFloor): World {
  return new World(floorGameData(data, f, f.arrivalFromAbove), { seed: 7, encounter: false, interior: true });
}

describe('mazmorra: datos', () => {
  it('carga data/dungeon.json: 100 pisos de nivel creciente (tope 100) y guardián en el último', () => {
    // F25: los 5 hechos a mano suben siempre; los profundos nunca bajan y llegan al 100.
    expect(def.floors).toHaveLength(100);
    for (let i = 1; i < def.floors.length; i++) {
      const [a, b] = [def.floors[i - 1]!, def.floors[i]!];
      if (i < 5) expect(b.levelMin).toBeGreaterThan(a.levelMin);
      expect(b.levelMin).toBeGreaterThanOrEqual(a.levelMin);
      expect(b.levelMax).toBeGreaterThanOrEqual(a.levelMax);
    }
    expect(def.floors[99]!.levelMax).toBe(100);
    const last = def.floors[def.floors.length - 1]!;
    expect(last.guardian).not.toBeNull();
    expect(last.guardian!.level).toBeGreaterThanOrEqual(last.levelMax);
  });

  it('F25: un guardián cada 10 pisos, cada tramo con su familia y pisos más grandes al bajar', () => {
    def.floors.forEach((f, i) => {
      const n = i + 1;
      if (n > 5) expect(f.guardian !== null, `piso ${n}`).toBe(n % 10 === 0 || n === 100);
    });
    expect(def.floors[4]!.guardian?.archetype).toBe('crypt_warden');
    expect(def.floors[99]!.cols).toBeGreaterThan(def.floors[5]!.cols * 1.8);
    expect(def.floors[99]!.cols).toBeLessThanOrEqual(128);
    expect(def.floors[10]!.spawns.map((s) => s.archetype)).toContain('chame_crab');
    expect(def.floors[95]!.spawns.map((s) => s.archetype)).toContain('ancon_bus');
  });

  it('el guardián es una variante con `base` de data/enemies.json y tiene ficha RPG', () => {
    const id = def.floors[def.floors.length - 1]!.guardian!.archetype;
    const raw = (enemiesJson as unknown as { archetypes: Record<string, { base?: string }> }).archetypes[id]!;
    expect(raw.base).toBeDefined();
    const g = data.enemies.archetypes[id]!;
    const base = data.enemies.archetypes[raw.base!]!;
    expect(g.maxHealth).toBeGreaterThan(base.maxHealth);
    expect(data.rpg.enemies[id]).toBeDefined();
  });

  it('rechaza arquetipos, tablas o temas desconocidos y guardianes fuera del último piso', () => {
    const bad = (f: (raw: any) => void): (() => DungeonDef) => {
      const raw = clone(dungeonJson);
      f(raw);
      return () => parse(raw);
    };
    expect(bad((r) => (r.floors[0].spawns[0].archetype = 'dragon'))).toThrow(DataError);
    expect(bad((r) => (r.floors[0].chestTable = 'no_existe'))).toThrow(/chestTable/);
    expect(bad((r) => (r.floors[0].theme = 'lava'))).toThrow(/theme/);
    expect(bad((r) => (r.deep.tiers[1].fromLevel = 1))).toThrow(/tramos/);
    expect(bad((r) => (r.deep.tiers[0].guardian = 'dragon'))).toThrow(DataError);
    expect(bad((r) => (r.floors[1].levelMax = 1))).toThrow(/levelMax/);
  });
});

describe('mazmorra: generación', () => {
  it('es determinista por semilla y cada piso es distinto', () => {
    for (let i = 0; i < def.floors.length; i++) {
      const a = generateFloor(def, i);
      const b = generateFloor(def, i);
      expect(Array.from(a.cells)).toEqual(Array.from(b.cells));
      expect(a.spawns).toEqual(b.spawns);
      expect(a.chests).toEqual(b.chests);
      expect(a.torches).toEqual(b.torches);
    }
    // Los pisos manuales son intencionales y no cambian con la semilla.
    expect(Array.from(generateFloor(def, 0).cells)).toEqual(Array.from(generateFloor({ ...def, seed: def.seed + 1 }, 0).cells));
  });

  it('respeta el tamaño de los datos y pone escaleras, cofres y antorchas', () => {
    def.floors.forEach((fd, i) => {
      const f = generateFloor(def, i);
      expect(f.rooms.length).toBeGreaterThanOrEqual(fd.rooms.min);
      expect(f.rooms.length).toBeLessThanOrEqual(fd.rooms.max);
      expect(f.chests).toHaveLength(fd.chests);
      expect(f.torches.length).toBeGreaterThan(f.rooms.length);
      expect(f.downStairs === null).toBe(i === def.floors.length - 1);
      expect(f.exitRoom).not.toBe(f.startRoom);
    });
    expect(floorTitle(def, 1)).toBe(`${def.name} · piso 2`);
  });

  // Muchas semillas: ninguna deja una sala aislada.
  it('todas las salas quedan unidas (relleno por baldosas) con 30 semillas', () => {
    for (let seed = 0; seed < 30; seed++) {
      const d = { ...def, seed };
      // F25: con 100 pisos, la primera semilla los mira todos y las demás uno de cada 10 (más los 6 primeros).
      const sample = d.floors.map((_, i) => i).filter((i) => seed === 0 || i < 6 || i % 10 === 9);
      for (const i of sample) {
        const f = generateFloor(d, i);
        const s = f.rooms[f.startRoom]!;
        const dist = floodDistances(f.cells, f.cols, f.rows, s.x0 + Math.floor(s.w / 2), s.y0 + Math.floor(s.h / 2));
        for (const rm of f.rooms) for (let r = rm.y0; r < rm.y0 + rm.h; r++) for (let c = rm.x0; c < rm.x0 + rm.w; c++) expect(dist[r * f.cols + c]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('A* llega desde la llegada a cada sala, a las escaleras, a los cofres y a cada monstruo', () => {
    for (let i = 0; i < def.floors.length; i++) {
      const f = generateFloor(def, i);
      const w = floorWorld(f);
      expect(w.grid.walkable(w.player.pos)).toBe(true);
      const targets = [
        ...f.rooms.map((rm) => ({ x: (rm.x0 + rm.w / 2) * f.tileSize, y: (rm.y0 + rm.h / 2) * f.tileSize })),
        f.upStairs,
        ...(f.downStairs ? [f.downStairs] : []),
        f.arrivalFromBelow,
        ...f.chests.map((c) => c.pos),
        ...f.spawns.map((s) => s.pos),
      ];
      for (const t of targets) {
        expect(w.grid.walkable(t), `piso ${i + 1}: (${t.x}, ${t.y}) caminable`).toBe(true);
        const path = w.pathfinder.findPath(w.player.pos, t);
        const end = path[path.length - 1] ?? w.player.pos;
        expect(Math.hypot(end.x - t.x, end.y - t.y), `piso ${i + 1}: camino a (${t.x}, ${t.y})`).toBeLessThan(0.5);
      }
    }
  });
});

describe('mazmorra: monstruos y botín', () => {
  it('cada monstruo nace dentro de la franja de su piso y la media sube al bajar', () => {
    const means: number[] = [];
    def.floors.forEach((fd, i) => {
      const f = generateFloor(def, i);
      const normal = f.spawns.filter((s) => !s.guardian && !s.rare);
      expect(normal.length).toBeGreaterThan(0);
      for (const s of normal) {
        const bonus = fd.spawns.find((x) => x.archetype === s.archetype)!.levelBonus;
        expect(s.level).toBeGreaterThanOrEqual(fd.levelMin + bonus);
        expect(s.level).toBeLessThanOrEqual(fd.levelMax + bonus);
      }
      means.push(normal.reduce((a, s) => a + s.level, 0) / normal.length);
      // El mundo del piso los crea con ese nivel.
      const w = floorWorld(f);
      for (const s of f.spawns) expect(w.spawnEnemy(s.archetype, s.pos, s.level).level).toBe(s.level);
    });
    // Sube piso a piso en los hechos a mano y, en los profundos, tramo a tramo.
    for (let i = 1; i < 5; i++) expect(means[i]!).toBeGreaterThan(means[i - 1]!);
    for (let i = 14; i < means.length; i += 10) expect(means[i]!).toBeGreaterThan(means[i - 10]!);
    const last = generateFloor(def, def.floors.length - 1);
    const g = last.spawns.filter((s) => s.guardian);
    expect(g).toHaveLength(1);
    const exit = last.rooms[last.exitRoom]!;
    expect(g[0]!.pos.x).toBeGreaterThanOrEqual(exit.x0 * last.tileSize);
    expect(g[0]!.pos.x).toBeLessThanOrEqual((exit.x0 + exit.w) * last.tileSize);
  });

  it('los cofres dan más monedas y tiradas cuanto más hondo', () => {
    const base = data.rpg.lootTables[def.floors[0]!.chestTable]!;
    const t0 = chestLootTable(base, 0, def.chest);
    const t2 = chestLootTable(base, 2, def.chest);
    expect(t0.rolls).toBe(base.rolls);
    expect(t2.rolls).toBe(base.rolls + 2 * def.chest.extraRollsPerFloor);
    expect(t2.gold.max).toBeGreaterThan(t0.gold.max);
    expect(t0.gold.chance).toBe(1);
  });

  it('el mundo interior no tiene PNJ ni pesca y no se gana al limpiar el piso', () => {
    const f = generateFloor(def, 0);
    const w = floorWorld(f);
    expect(w.npcs).toHaveLength(0);
    expect(w.fishingSpotAt(f.arrivalFromAbove)).toBeNull();
    const e = w.spawnEnemy('melee', f.spawns[0]!.pos, 1);
    w.enemies.damage(e, 1e6, () => {});
    for (let k = 0; k < 600; k++) w.tick(1 / 60);
    expect(w.outcome).toBe('playing');
    expect(w.enemies.list).toHaveLength(0);
  });

  it('al salir, el jugador aparece delante de la entrada', () => {
    const p = entranceExit(def);
    expect(Math.hypot(p.x - def.entrance.x, p.y - def.entrance.y)).toBeCloseTo(def.entrance.reach + 1, 5);
  });
});
