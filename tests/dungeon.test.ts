import { describe, expect, it } from 'vitest';
import dungeonJson from '../data/dungeon.json';
import enemiesJson from '../data/enemies.json';
import { loadGameData } from '../src/data';
import { loadDungeon, parseDungeon, type DungeonDef } from '../src/data/dungeonSchema';
import { DataError } from '../src/data/validate';
import { World } from '../src/sim/world';
import { applyDoors, breakableLootTable, chestLootTable, doorApproach, entranceExit, floodDistances, floorGameData, floorTitle, generateFloor, inRoom, type DungeonFloor } from '../src/world/dungeon';
import type { Vec2 } from '../src/sim/vec2';

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

  // F25: los pisos hondos son tan grandes que un A* de punta a punta pasa del tope de nodos
  // (en juego se pincha cerca); la rejilla se recorre entera por anchura y el A* se prueba en los
  // pisos hechos a mano.
  it('desde la llegada, con estanques y puertas abiertas, se llega a cada sala, escalera, cofre, jarra y monstruo', () => {
    for (let i = 0; i < def.floors.length; i++) {
      const f = generateFloor(def, i);
      const w = floorWorld(f);
      expect(w.grid.walkable(w.player.pos)).toBe(true);
      const ts = f.tileSize;
      const roomPoint = (rm: (typeof f.rooms)[number]): Vec2 => {
        const c = { x: (rm.x0 + rm.w / 2) * ts, y: (rm.y0 + rm.h / 2) * ts };
        // Con estanque, el centro es agua: se mira la orilla.
        return f.pools.some((p) => Math.hypot(p.x - c.x, p.y - c.y) < p.radius + 1) ? { x: (rm.x0 + 1) * ts, y: c.y } : c;
      };
      const targets = [
        ...f.rooms.map(roomPoint),
        f.upStairs,
        ...(f.downStairs ? [f.downStairs] : []),
        f.arrivalFromBelow,
        ...f.chests.map((c) => c.pos),
        ...f.breakables.map((b) => b.pos),
        ...f.spawns.map((s) => s.pos),
        ...f.ambushes.flatMap((a) => a.spawns.map((s) => s.pos)),
      ];
      const reached = gridFlood(w);
      for (const t of targets) {
        expect(w.grid.walkable(t), `piso ${i + 1}: (${t.x}, ${t.y}) caminable`).toBe(true);
        const { cx, cy } = w.grid.cellOf(t);
        expect(reached[w.grid.index(cx, cy)], `piso ${i + 1}: se llega a (${t.x}, ${t.y})`).toBe(1);
      }
      if (i < 5) {
        for (const t of targets) {
          const path = w.pathfinder.findPath(w.player.pos, t);
          const end = path[path.length - 1] ?? w.player.pos;
          expect(Math.hypot(end.x - t.x, end.y - t.y), `piso ${i + 1}: camino a (${t.x}, ${t.y})`).toBeLessThan(0.5);
        }
      }
    }
  });
});

/** Celdas de la rejilla a las que se llega desde el jugador (8 direcciones, sin cortar esquinas). */
function gridFlood(w: World): Uint8Array {
  const g = w.grid;
  const seen = new Uint8Array(g.cols * g.rows);
  const { cx, cy } = g.cellOf(w.player.pos);
  const queue = [g.index(cx, cy)];
  seen[queue[0]!] = 1;
  while (queue.length) {
    const i = queue.pop()!;
    const x = i % g.cols;
    const y = (i - x) / g.cols;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || !g.walkableCell(x + dx, y + dy) || seen[g.index(x + dx, y + dy)]) continue;
        if (dx && dy && (!g.walkableCell(x + dx, y) || !g.walkableCell(x, y + dy))) continue;
        seen[g.index(x + dx, y + dy)] = 1;
        queue.push(g.index(x + dx, y + dy));
      }
    }
  }
  return seen;
}

describe('mazmorra: pisos hondos (F25)', () => {
  const deep = def.floors.map((_, i) => i).filter((i) => i >= 5);

  it('tienen estanques de pesca, puertas, jarras y barriles y alguna emboscada', () => {
    let ambushes = 0;
    for (const i of deep) {
      const f = generateFloor(def, i);
      expect(f.pools.length, `piso ${i + 1}: estanques`).toBe(f.def.pools);
      expect(f.doors.length, `piso ${i + 1}: puertas`).toBeGreaterThan(0);
      expect(f.breakables.length, `piso ${i + 1}: jarras y barriles`).toBeGreaterThan(f.rooms.length / 2);
      expect(new Set(f.breakables.map((b) => b.kind)).size).toBe(2);
      ambushes += f.ambushes.length;
      for (const p of f.pools) {
        // El estanque cabe en su sala con dos baldosas de orilla, y no hay nada dentro del agua.
        const rm = f.rooms.find((r) => inRoom(r, f.tileSize, p))!;
        expect(Math.min(rm.w, rm.h) * f.tileSize - 2 * p.radius).toBeGreaterThanOrEqual(4 * f.tileSize - 1e-9);
        for (const q of [...f.spawns.map((s) => s.pos), ...f.chests.map((c) => c.pos), ...f.breakables.map((b) => b.pos)]) expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeGreaterThan(p.radius);
      }
      for (const d of f.doors) {
        expect(d.cells.length).toBeLessThanOrEqual(3);
        for (const t of d.cells) expect(f.cells[t.r * f.cols + t.c]).toBe(1);
      }
    }
    expect(ambushes).toBeGreaterThan(deep.length / 2);
    // Los pisos hechos a mano no cambian.
    for (let i = 0; i < 5; i++) {
      const f = generateFloor(def, i);
      expect([f.pools.length, f.doors.length, f.breakables.length, f.ambushes.length]).toEqual([0, 0, 0, 0]);
    }
  });

  it('se pesca en el estanque del piso: el agua no se pisa y lanzar desde la orilla funciona', () => {
    const i = deep.find((k) => generateFloor(def, k).pools.length > 0)!;
    const f = generateFloor(def, i);
    const p = f.pools[0]!;
    const w = new World(floorGameData(data, f, { x: p.x - p.radius - 1.2, y: p.y }), { seed: 3, encounter: false, interior: true, pools: f.pools });
    expect(w.grid.walkable({ x: p.x, y: p.y })).toBe(false);
    expect(w.fishingSpotAt({ x: p.x, y: p.y })?.id).toBe(p.id);
    expect(w.commandFish({ x: p.x - p.radius + 0.5, y: p.y })).toBe(true);
    for (let k = 0; k < 120; k++) w.tick(1 / 60);
    expect(w.fishing?.spotId).toBe(p.id);
    // Sin estanques (los pisos hechos a mano) no hay pesca.
    expect(floorWorld(generateFloor(def, 0)).fishingSpotAt(generateFloor(def, 0).arrivalFromAbove)).toBeNull();
  });

  it('una puerta cerrada tapa su hueco y al abrirla se vuelve a pasar', () => {
    const f = generateFloor(def, 30);
    const w = floorWorld(f);
    const base = w.grid.blocked.slice();
    const open = new Set<string>();
    applyDoors(w.grid, base, f, open, data.zone.navRadius);
    for (const d of f.doors) expect(w.grid.walkable({ x: d.x, y: d.y }), d.id).toBe(false);
    const d = f.doors[0]!;
    open.add(d.id);
    applyDoors(w.grid, base, f, open, data.zone.navRadius);
    expect(w.grid.walkable({ x: d.x, y: d.y })).toBe(true);
    // La otra cara de la puerta está a una baldosa y se elige la del lado del jugador.
    const a = doorApproach(d, f.tileSize, { x: d.x - 50, y: d.y - 50 });
    expect(Math.hypot(a.x - d.x, a.y - d.y)).toBeCloseTo(f.tileSize, 6);
    expect(a.x + a.y).toBeLessThan(d.x + d.y);
    // Todas abiertas = la rejilla de antes.
    for (const x of f.doors) open.add(x.id);
    applyDoors(w.grid, base, f, open, data.zone.navRadius);
    expect(Array.from(w.grid.blocked)).toEqual(Array.from(base));
  });

  it('las emboscadas son de su piso, con más nivel, y no están en la sala de llegada ni en la de salida', () => {
    for (const i of deep) {
      const f = generateFloor(def, i);
      for (const a of f.ambushes) {
        expect(a.room).not.toBe(f.startRoom);
        expect(a.room).not.toBe(f.exitRoom);
        for (const s of a.spawns) {
          expect(f.def.spawns.map((x) => x.archetype)).toContain(s.archetype);
          expect(s.level).toBeGreaterThanOrEqual(Math.min(100, f.def.levelMax + 1));
          expect(inRoom(f.rooms[a.room]!, f.tileSize, s.pos)).toBe(true);
        }
      }
    }
  });

  it('jarras y barriles sueltan menos que un cofre y el piso 100 se genera rápido', () => {
    const base = data.rpg.lootTables[def.floors[50]!.chestTable]!;
    const chest = chestLootTable(base, 50, def.chest);
    const jar = breakableLootTable(base, 50, def);
    expect(jar.gold.max).toBeLessThan(chest.gold.max);
    expect(jar.gold.chance).toBe(def.breakable.goldChance);
    expect(jar.rolls).toBeLessThan(chest.rolls);
    const t = performance.now();
    const last = generateFloor(def, 99);
    expect(performance.now() - t).toBeLessThan(250);
    expect(last.width).toBeGreaterThan(180);
    expect(last.spawns.length).toBeGreaterThan(80);
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
