import { describe, expect, it } from 'vitest';
import dungeonJson from '../data/dungeon.json';
import enemiesJson from '../data/enemies.json';
import weatherJson from '../data/weather.json';
import zonesJson from '../data/zones.json';
import { loadGameData, type GameData } from '../src/data';
import { loadDungeon, parseDungeon } from '../src/data/dungeonSchema';
import { parseEnemies } from '../src/data/schema';
import { parseWeather } from '../src/data/weatherSchema';
import { loadWorldData } from '../src/data/worldData';
import { parseZones } from '../src/data/zonesSchema';
import { Character } from '../src/rpg/character';
import type { GameEvent } from '../src/sim/events';
import { Rng } from '../src/sim/rng';
import { isNight, WeatherSystem } from '../src/sim/weather';
import { World } from '../src/sim/world';
import { buildOverworld, withOverworldZone } from '../src/world/overworld';
import { useDungeonKey } from '../src/world/dungeon';

const DT = 1 / 60;
const data = loadGameData();
const big = withOverworldZone(data, buildOverworld(loadWorldData()));
const NIGHT = 0.9;
const DAY = 0.5;

type Raw = { zones: Array<Record<string, unknown>> };
const rawZones = (): Raw => structuredClone(zonesJson) as unknown as Raw;

describe('mundo: franjas y familias', () => {
  const banded = data.zones.zones.filter((z) => !z.safe);

  it('diez franjas de 10 en 10 hasta el nivel 100, cada una con su clima', () => {
    expect(banded.map((z) => [z.levelMin, z.levelMax])).toEqual([
      [1, 10],
      [40, 50],
      [10, 20],
      [20, 30],
      [30, 40],
      [50, 60],
      [60, 70],
      [70, 80],
      [80, 90],
      [90, 100],
    ]);
    for (const z of data.zones.zones) expect(['hot', 'temperate', 'cold']).toContain(z.climate);
    expect(new Set(banded.map((z) => z.climate))).toEqual(new Set(['hot', 'temperate', 'cold']));
  });

  it('cada franja tiene su propia familia: arquetipos que no se repiten entre franjas, con ficha RPG y asset procedural', () => {
    const assets = loadWorldData().assets;
    const owner = new Map<string, string>();
    for (const z of banded) {
      expect(z.spawns.length, z.id).toBeGreaterThanOrEqual(4);
      for (const s of z.spawns) {
        expect(owner.get(s.archetype) ?? z.id, `${s.archetype} en ${z.id} y ${owner.get(s.archetype)}`).toBe(z.id);
        owner.set(s.archetype, z.id);
        expect(data.rpg.enemies[s.archetype], s.archetype).toBeDefined();
        expect(assets[`enemy.${s.archetype}`]?.kind, s.archetype).toBe('procedural');
      }
      // Con variantes: al menos un arquetipo de la familia hereda de otro (`base`).
      const raw = enemiesJson.archetypes as Record<string, { base?: string }>;
      expect(z.spawns.some((s) => raw[s.archetype]?.base !== undefined), z.id).toBe(true);
    }
  });

  it('los niveles base de cada familia caen dentro (o junto a) su franja', () => {
    for (const z of banded.filter((x) => x.levelMin >= 10)) {
      for (const s of z.spawns) {
        const lv = data.rpg.enemies[s.archetype]!.level;
        expect(lv, s.archetype).toBeGreaterThanOrEqual(z.levelMin);
        expect(lv, s.archetype).toBeLessThanOrEqual(z.levelMax + 5);
      }
    }
  });

  it('las zonas que no caben en el mundo quedan preparadas: sin áreas, con `planned` y sin poblarse', () => {
    const planned = data.zones.zones.filter((z) => z.planned !== null);
    expect(planned.length).toBeGreaterThanOrEqual(4);
    for (const z of planned) expect(z.areas).toEqual([]);
    const w = new World(big, { zones: true, seed: 2 });
    const populated = new Set(w.population!.zones.map((z) => z.def.id));
    for (const z of planned) expect(populated.has(z.id), z.id).toBe(false);
  });

  it('los grupos tardan más en volver cuanto más alta es la franja', () => {
    const sorted = [...banded].sort((a, b) => a.levelMin - b.levelMin);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i]!.respawnSeconds, sorted[i]!.id).toBeGreaterThan(sorted[i - 1]!.respawnSeconds);
  });

  it('damageScale multiplica el daño heredado del básico y de los hechizos', () => {
    const a = data.enemies.archetypes['chame_crab']!;
    const melee = data.enemies.archetypes['melee']!;
    const k = (enemiesJson.archetypes as Record<string, { damageScale?: number }>)['chame_crab']!.damageScale!;
    expect(a.attack.damageMin).toBeCloseTo(melee.attack.damageMin * k);
    expect(a.spells.map((s) => s.name)).toEqual(melee.spells.map((s) => s.name));
    expect(a.spells[0]!.damageMax).toBeCloseTo(melee.spells[0]!.damageMax * k);
  });
});

describe('mundo: validación de datos', () => {
  const arch = data.enemies.archetypes;
  const zi = (id: string, r: Raw) => r.zones.findIndex((z) => z['id'] === id);

  it('rechaza nieve fuera de clima frío, tiempos desconocidos, grupos al revés y zonas sin áreas ni `planned`', () => {
    let bad = rawZones();
    bad.zones[zi('azuero', bad)]!['weather'] = { snow: 2 };
    expect(() => parseZones(bad, arch)).toThrow(/cold/);
    bad = rawZones();
    bad.zones[zi('chame', bad)]!['weather'] = { granizo: 2 };
    expect(() => parseZones(bad, arch)).toThrow(/granizo/);
    bad = rawZones();
    bad.zones[zi('azuero', bad)]!['group'] = { min: 4, max: 2, radius: 3 };
    expect(() => parseZones(bad, arch)).toThrow(/group/);
    bad = rawZones();
    bad.zones[zi('azuero', bad)]!['areas'] = [];
    expect(() => parseZones(bad, arch)).toThrow(/planned/);
    bad = rawZones();
    bad.zones[zi('azuero', bad)]!['spawns'] = [{ archetype: 'melee', weight: 1, time: 'night' }];
    expect(() => parseZones(bad, arch)).toThrow(/de día/);
    bad = rawZones();
    bad.zones[zi('azuero', bad)]!['spawns'] = [{ archetype: 'melee', weight: 1, time: 'siesta' }];
    expect(() => parseZones(bad, arch)).toThrow(/siesta/);
  });

  it('weather.json: se carga y rechaza nieve en clima caliente y elementos raros', () => {
    expect(data.weather).toBeDefined();
    const w = structuredClone(weatherJson) as { climates: Record<string, Record<string, number>>; kinds: Record<string, { damage?: Record<string, number> }> };
    w.climates['hot']!['snow'] = 1;
    expect(() => parseWeather(w)).toThrow(/cold/);
    const w2 = structuredClone(weatherJson) as typeof w;
    w2.kinds['rain']!.damage = { lava: 0.5 };
    expect(() => parseWeather(w2)).toThrow(/lava/);
  });

  it('enemies.json: damageScale fuera de rango falla', () => {
    const bad = structuredClone(enemiesJson) as { archetypes: Record<string, Record<string, unknown>> };
    bad.archetypes['chame_crab']!['damageScale'] = -1;
    expect(() => parseEnemies(bad)).toThrow(/damageScale/);
  });

  it('la piedra de viaje, el pueblo, la cripta y los monstruos ya no usan nombres prestados ni genéricos', () => {
    const names = [...data.zones.zones.map((z) => z.name), loadDungeon(data).name, ...Object.values(data.rpg.enemies).map((e) => e.name)];
    for (const n of names) expect(n.toLowerCase(), n).not.toMatch(/zaap|goblin|bosque|pradera|cruce/);
  });
});

describe('mundo: grupos', () => {
  it('nacen en grupos de min..max miembros, juntos y en su zona', () => {
    const w = new World(big, { zones: true, seed: 5 });
    let multi = 0;
    for (const z of w.population!.zones) {
      for (const g of z.groups) {
        expect(g.members.length).toBeGreaterThanOrEqual(1);
        expect(g.members.length).toBeLessThanOrEqual(z.def.group.max);
        if (g.members.length > 1) multi++;
        for (const id of g.members) {
          const e = w.enemies.get(id)!;
          expect(Math.hypot(e.pos.x - g.anchor.x, e.pos.y - g.anchor.y)).toBeLessThanOrEqual(z.def.group.radius + 1e-6);
          expect(e.zoneId).toBe(z.def.id);
        }
      }
    }
    expect(multi).toBeGreaterThan(5);
  });

  it('cohesión: si un miembro entra en combate, el resto del grupo se suma', () => {
    const w = new World(big, { zones: true, seed: 5 });
    const g = w.population!.zones.flatMap((z) => z.groups).find((x) => x.members.length >= 2)!;
    const [first, ...rest] = g.members.map((id) => w.enemies.get(id)!);
    first!.state = 'pursue';
    w.player.invulnerable = 99;
    w.tick(DT);
    for (const e of rest) expect(e.state).not.toBe('idle');
  });

  it('un grupo entero que cae vuelve completo (1..max) tras respawnSeconds', () => {
    const w = new World(big, { zones: true, seed: 9 });
    const zs = w.population!.zones.find((z) => z.def.id === 'azuero')!;
    const before = zs.groups.length;
    const g = zs.groups[0]!;
    for (const id of g.members) w.enemyActor(w.enemies.get(id)!).takeDamage(1e9);
    w.tick(DT);
    expect(zs.groups.length).toBe(before - 1);
    expect(zs.respawnAt.length).toBe(1);
    for (let t = 0; t < zs.def.respawnSeconds + 1; t += DT) {
      w.player.invulnerable = 1;
      w.tick(DT);
    }
    expect(zs.groups.length).toBe(before);
  });
});

describe('mundo: noche', () => {
  const nightOnly = (w: World) =>
    w.enemies.list.filter((e) => {
      const z = w.zoneMap.get(e.zoneId ?? '');
      return z?.spawns.some((s) => s.archetype === e.def.id && s.time === 'night');
    });

  it('la hora de la noche sale de weather.json', () => {
    const wd = data.weather!;
    expect(isNight(wd, NIGHT)).toBe(true);
    expect(isNight(wd, 0.1)).toBe(true);
    expect(isNight(wd, DAY)).toBe(false);
  });

  it('de día no nace ningún nocturno; de noche sí', () => {
    const day = new World(big, { zones: true, seed: 4, timeOfDay: DAY });
    expect(nightOnly(day)).toEqual([]);
    const night = new World(big, { zones: true, seed: 4, timeOfDay: NIGHT });
    expect(nightOnly(night).length).toBeGreaterThan(0);
  });

  it('al amanecer los grupos nocturnos que no pelean se retiran; al anochecer parte del día deja sitio a la noche', () => {
    const w = new World(big, { zones: true, seed: 4, timeOfDay: NIGHT });
    w.tick(DT);
    expect(nightOnly(w).length).toBeGreaterThan(0);
    w.timeOfDay = DAY;
    w.player.invulnerable = 99;
    w.tick(DT);
    expect(nightOnly(w)).toEqual([]);
    const d = new World(big, { zones: true, seed: 6, timeOfDay: DAY });
    d.tick(DT);
    d.timeOfDay = NIGHT;
    d.player.invulnerable = 99;
    for (let i = 0; i < 3; i++) d.tick(DT);
    expect(nightOnly(d).length).toBeGreaterThan(0);
  });

  it('pesca: de noche se usa la tabla nocturna (peces que sólo pican de noche)', () => {
    const fish = (timeOfDay: number): Array<string | null> => {
      const d: GameData = loadGameData();
      const base = Object.values(d.rpg.fishing.spots)[0]!;
      expect(base.nightLootTable).not.toBeNull();
      const spot = { ...base, x: 40, y: 40, radius: 6, nightLootTable: 'only_snook' };
      const onlySnook = { id: 'only_snook', gold: { min: 0, max: 0, chance: 0 }, rolls: 1, chance: 1, entries: [{ itemId: 'fish_moon_snook', weight: 1, min: 1, max: 1 }] };
      d.rpg = { ...d.rpg, merchants: {}, lootTables: { ...d.rpg.lootTables, only_snook: onlySnook }, fishing: { ...d.rpg.fishing, spots: { [spot.id]: spot } } };
      const w = new World(d, { encounter: false, seed: 3, character: Character.create(d.rpg, 'storm_weaver', 'Pez', new Rng(3)) });
      w.timeOfDay = timeOfDay;
      w.player.pos = { x: 40, y: 50 };
      w.player.prevPos = { x: 40, y: 50 };
      const out: Array<string | null> = [];
      for (let k = 0; k < 6; k++) {
        w.commandFish({ x: 40, y: 42 });
        for (let i = 0; i < 20 / DT; i++) {
          w.tick(DT);
          const ev: GameEvent[] = w.drainEvents();
          if (ev.some((e) => e.type === 'fishBite')) break;
        }
        w.commandFish(null);
        for (const e of w.drainEvents()) if (e.type === 'fishCatch') out.push(e.itemId);
      }
      return out;
    };
    const night = fish(NIGHT);
    expect(night.length).toBeGreaterThan(0);
    expect(night.every((x) => x === 'fish_moon_snook')).toBe(true);
    expect(fish(DAY)).not.toContain('fish_moon_snook');
  });
});

describe('mundo: tiempo por zona', () => {
  const wd = data.weather!;

  it('lluvia debilita el fuego, el solazo lo refuerza (sólo de día) y la intensidad gradúa el efecto', () => {
    const ws = new WeatherSystem(wd, data.zones.zones, new Rng(1));
    ws.force('azuero', 'rain');
    expect(ws.damageMultiplier('azuero', 'fire')).toBeCloseTo(wd.kinds.rain.damage.fire!);
    expect(ws.damageMultiplier('azuero', 'fire')).toBeLessThan(1);
    expect(ws.damageMultiplier('azuero', 'physical')).toBe(1);
    ws.force('azuero', 'rain', 0.5);
    expect(ws.damageMultiplier('azuero', 'fire')).toBeCloseTo(1 + (wd.kinds.rain.damage.fire! - 1) * 0.5);
    ws.force('azuero', 'sun');
    ws.tick(0, false);
    expect(ws.damageMultiplier('azuero', 'fire')).toBeGreaterThan(1);
    ws.tick(0, true);
    expect(ws.kindAt('azuero')).toBe('clear');
    expect(ws.damageMultiplier('azuero', 'fire')).toBe(1);
  });

  it('en el mundo: el mismo golpe de fuego hace menos con lluvia y más con solazo', () => {
    const fireHits = (kind: 'clear' | 'rain' | 'sun'): number => {
      const w = new World(big, { encounter: false, seed: 1, timeOfDay: DAY });
      w.player.pos = { x: 124, y: 104 };
      w.weather!.force(w.weatherZone()!, kind);
      const e = w.spawnEnemy('ash_alpha', { x: 125.6, y: 104 }, 5);
      const at = e.def.spells.find((s) => (s.element ?? data.rpg.enemies['ash_alpha']!.element) === 'fire' && s.effect === 'damage')!;
      let total = 0;
      for (let i = 0; i < 40; i++) {
        w.character.health = w.character.maxHealth;
        (w as unknown as { hitPlayer(src: unknown, at: unknown): void }).hitPlayer(e, at);
        for (const ev of w.drainEvents()) if (ev.type === 'damage' && ev.toPlayer) total += ev.amount;
      }
      return total;
    };
    const clear = fireHits('clear');
    expect(fireHits('rain')).toBeLessThan(clear * 0.85);
    expect(fireHits('sun')).toBeGreaterThan(clear * 1.1);
  });

  it('la nieve sólo cae en zonas frías, se acumula mientras nieva, frena al jugador y se derrite', () => {
    const ws = new WeatherSystem(wd, data.zones.zones, new Rng(7));
    for (let t = 0; t < 3000; t += 1) ws.tick(1, false);
    for (const z of data.zones.zones) if (z.climate !== 'cold' && z.areas.length) expect(ws.at(z.id)!.snow, z.id).toBe(0);
    const cold = new WeatherSystem({ ...wd, changeSeconds: { min: 1e6, max: 1e6 } }, data.zones.zones, new Rng(1));
    cold.force('baru', 'snow');
    expect(cold.moveMultiplier('baru')).toBe(1);
    for (let t = 0; t < 10; t++) cold.tick(1, false);
    const half = cold.moveMultiplier('baru');
    for (let t = 0; t < 200; t++) cold.tick(1, false);
    expect(half).toBeLessThan(1);
    expect(cold.moveMultiplier('baru')).toBeLessThan(half);
    expect(cold.moveMultiplier('baru')).toBeCloseTo(1 - wd.snow.maxSlow);
    cold.force('baru', 'clear');
    for (let t = 0; t < 30; t++) cold.tick(1, false);
    expect(cold.moveMultiplier('baru')).toBeGreaterThan(1 - wd.snow.maxSlow);
  });

  it('en el mundo: con nieve acumulada el jugador anda más despacio', () => {
    const speed = (snow: number): number => {
      const w = new World(big, { encounter: false, seed: 1 });
      w.player.pos = { x: 230, y: 230 };
      const z = w.weatherZone()!;
      expect(z).toBe('baru');
      w.weather!.at(z)!.snow = snow;
      w.tick(DT);
      return w.player.speed;
    };
    expect(speed(1)).toBeCloseTo(speed(0) * (1 - wd.snow.maxSlow));
  });

  it('dentro de la cripta no hay tiempo', () => {
    const w = new World(data, { encounter: false, interior: true });
    expect(w.weather).toBeNull();
  });
});

describe('mazmorra con llave', () => {
  const def = loadDungeon(data);
  const ring = (n: number) => {
    const slots: Array<{ uid: string; itemId: string; quantity: number } | null> = n > 0 ? [{ uid: 'k1', itemId: 'crypt_key', quantity: n }] : [null];
    return {
      slots,
      count: (id: string) => slots.reduce((a, s) => a + (s?.itemId === id ? s.quantity : 0), 0),
      remove: (uid: string, q: number) => {
        const s = slots.find((x) => x?.uid === uid);
        if (s) s.quantity -= q;
      },
    };
  };

  it('la cripta pide una llave que sueltan los monstruos de su franja (1–10) y no los de otras', () => {
    expect(def.key?.itemId).toBe('crypt_key');
    const azuero = data.zones.zones.find((z) => z.id === 'azuero')!;
    const tableHas = (arch: string) => data.rpg.lootTables[data.rpg.enemies[arch]!.lootTable ?? '']?.entries.some((e) => e.itemId === 'crypt_key') ?? false;
    expect(azuero.spawns.some((s) => tableHas(s.archetype))).toBe(true);
    for (const z of data.zones.zones.filter((x) => !x.safe && x.levelMin >= 10)) for (const s of z.spawns) expect(tableHas(s.archetype), s.archetype).toBe(false);
  });

  it('sin llave: no entra y el aviso dice qué falta y dónde se consigue', () => {
    const r = useDungeonKey(def, ring(0), 'Llave de la Tulivieja');
    expect(r.ok).toBe(false);
    expect(r.message).toContain('Llave de la Tulivieja');
    expect(r.message).toContain('1–10');
  });

  it('con llave: entra y se gasta una', () => {
    const inv = ring(2);
    expect(useDungeonKey(def, inv, 'Llave de la Tulivieja').ok).toBe(true);
    expect(inv.count('crypt_key')).toBe(1);
    expect(useDungeonKey({ ...def, key: { ...def.key!, consume: false } }, inv, 'Llave').ok).toBe(true);
    expect(inv.count('crypt_key')).toBe(1);
    expect(useDungeonKey({ ...def, key: null }, ring(0), '').ok).toBe(true);
  });

  it('con el inventario real del personaje', () => {
    const ch = Character.create(data.rpg, 'storm_weaver', 'Llavero', new Rng(1));
    expect(useDungeonKey(def, ch.inventory, 'x').ok).toBe(false);
    ch.pickUp(ch.items.create('crypt_key', 1));
    expect(useDungeonKey(def, ch.inventory, 'x').ok).toBe(true);
    expect(ch.inventory.count('crypt_key')).toBe(0);
  });

  it('una llave que no existe en items.json falla al cargar', () => {
    const bad = { ...structuredClone(dungeonJson), key: { itemId: 'llave_maestra' } };
    expect(() => parseDungeon(bad, Object.keys(data.enemies.archetypes), Object.keys(data.rpg.lootTables), Object.keys(data.rpg.items))).toThrow(/llave_maestra/);
  });
});
