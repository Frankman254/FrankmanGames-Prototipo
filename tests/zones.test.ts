import { describe, expect, it } from 'vitest';
import zonesJson from '../data/zones.json';
import terrainJson from '../data/terrain.json';
import { loadGameData } from '../src/data';
import { loadWorldData } from '../src/data/worldData';
import { parseZones } from '../src/data/zonesSchema';
import type { SessionEvent } from '../src/rpg/contracts';
import { World } from '../src/sim/world';
import { levelCurve, levelDiffMultiplier, levelStatBlock, rewardScale, scaleArchetype, ZoneMap } from '../src/sim/zones';
import { buildOverworld, withOverworldZone } from '../src/world/overworld';

const DT = 1 / 60;
const data = loadGameData();

function arena(): World {
  const w = new World(data, { encounter: false });
  w.player.pos = { x: 10, y: 30 };
  w.player.prevPos = { x: 10, y: 30 };
  return w;
}

type Raw = { zones: Array<Record<string, unknown>>; scaling: { flatPerLevel: Record<string, number> } };
const raw = (): Raw => structuredClone(zonesJson) as unknown as Raw;

describe('zonas: datos', () => {
  it('se cargan con su franja, tabla de monstruos y una zona segura para el pueblo', () => {
    const z = data.zones;
    expect(z.zones.length).toBeGreaterThanOrEqual(5);
    const banded = z.zones.filter((x) => !x.safe);
    expect(banded.length).toBeGreaterThanOrEqual(4);
    for (const x of banded) {
      expect(x.levelMin).toBeLessThanOrEqual(x.levelMax);
      expect(x.spawns.length).toBeGreaterThan(0);
      for (const s of x.spawns) expect(data.enemies.archetypes[s.archetype], s.archetype).toBeDefined();
    }
    // Una franja élite de nivel 20 o más.
    expect(Math.max(...banded.map((x) => x.levelMin))).toBeGreaterThanOrEqual(20);
  });

  it('rechaza arquetipos desconocidos, franjas al revés, zonas seguras con monstruos y estadísticas raras', () => {
    const arch = data.enemies.archetypes;
    let bad = raw();
    (bad.zones[1]!['spawns'] as Array<Record<string, unknown>>)[0]!['archetype'] = 'dragon';
    expect(() => parseZones(bad, arch)).toThrow(/dragon/);
    bad = raw();
    bad.zones[1]!['levelMin'] = 9;
    bad.zones[1]!['levelMax'] = 3;
    expect(() => parseZones(bad, arch)).toThrow(/levelMax/);
    bad = raw();
    bad.zones[0]!['spawns'] = [{ archetype: 'melee', weight: 1 }];
    expect(() => parseZones(bad, arch)).toThrow(/segura/);
    bad = raw();
    bad.scaling.flatPerLevel['luck'] = 1;
    expect(() => parseZones(bad, arch)).toThrow(/luck/);
    bad = raw();
    bad.zones[2]!['id'] = bad.zones[1]!['id'];
    expect(() => parseZones(bad, arch)).toThrow(/repetido/);
  });

  it('el mapa encaja con el mundo: pueblo seguro, inicio y misiones en la primera franja, todo cubierto', () => {
    const map = new ZoneMap(data.zones);
    const W = terrainJson.width;
    const D = terrainJson.depth;
    for (const z of data.zones.zones) {
      for (const a of z.areas) {
        if (a.type === 'rect') expect(a.x0 >= 0 && a.y0 >= 0 && a.x1 <= W && a.y1 <= D, z.id).toBe(true);
        else expect(a.x - a.radius >= -W && a.x <= W && a.y <= D, z.id).toBe(true);
      }
    }
    for (const n of [...Object.values(data.rpg.npcs), ...Object.values(data.rpg.merchants)]) {
      expect(map.zoneAt(n.position)?.safe, n.id).toBe(true);
    }
    const first = map.zoneAt(terrainJson.playerStart)!;
    expect(first.levelMin).toBe(1);
    // El encuentro de la arena (con su desplazamiento) cae en la primera franja.
    for (const s of data.encounter.spawns) {
      expect(map.zoneAt({ x: s.x + terrainJson.encounterOffset.x, y: s.y + terrainJson.encounterOffset.y })?.id).toBe(first.id);
    }
    for (const q of Object.values(data.rpg.quests ?? {})) {
      for (const o of q.objectives) if (o.type === 'kill' && o.spawn) expect(map.zoneAt(o.spawn)?.id, q.id).toBe(first.id);
    }
    for (let x = 1; x < W; x += 8) for (let y = 1; y < D; y += 8) expect(map.zoneAt({ x, y }), `${x},${y}`).not.toBeNull();
  });
});

describe('zonas: escalado por nivel', () => {
  const s = data.zones.scaling;
  const melee = data.enemies.archetypes['melee']!;

  it('a su nivel base un monstruo queda igual; por encima, más vida, más daño, más estadísticas y recompensa', () => {
    expect(scaleArchetype(melee, 1, 1, s)).toBe(melee);
    expect(levelStatBlock(1, 1, s)).toEqual({});
    const hi = scaleArchetype(melee, 12, 1, s);
    expect(hi.maxHealth).toBe(Math.round(melee.maxHealth * levelCurve(s.maxHealth, 12)));
    expect(hi.attack.damageMin).toBeCloseTo(melee.attack.damageMin * levelCurve(s.damage, 12));
    expect(hi.spells[0]!.damageMax).toBeCloseTo(melee.spells[0]!.damageMax * levelCurve(s.damage, 12));
    expect(hi.spells.map((x) => x.name)).toEqual(melee.spells.map((x) => x.name));
    expect(hi.staggerDamage).toBeGreaterThan(melee.staggerDamage);
    const st = levelStatBlock(12, 1, s);
    expect(st.power).toBeCloseTo(11 * s.flatPerLevel['power']!);
    expect((st as Record<string, number>)['armor']).toBeUndefined(); // combate v2: la clave antigua se ignora
    expect(st['resist.fire']).toBeCloseTo(11 * s.flatPerLevel['resist.*']!);
    const r = rewardScale(12, 1, s);
    expect(r.xp).toBeGreaterThan(3);
    expect(r.gold).toBeGreaterThan(1);
    expect(r.extraRolls).toBe(Math.floor(11 / s.extraLootRollEvery));
    // Por debajo del base, más débil (el lobo alfa a nivel 2).
    const alpha = data.enemies.archetypes['alpha_wolf']!;
    expect(scaleArchetype(alpha, 2, 4, s).maxHealth).toBeLessThan(alpha.maxHealth);
  });

  it('la diferencia de nivel sube o baja el daño con topes', () => {
    const d = data.zones.levelDifference;
    expect(levelDiffMultiplier(5, 5, d)).toBe(1);
    expect(levelDiffMultiplier(7, 5, d)).toBeCloseTo(1 + 2 * d.perLevel);
    expect(levelDiffMultiplier(99, 1, d)).toBeCloseTo(1 + d.maxBonus);
    expect(levelDiffMultiplier(1, 99, d)).toBeCloseTo(1 - d.maxPenalty);
  });

  it('el enemigo del mundo lleva el nivel: vida escalada, estadísticas y XP al morir', () => {
    const w = arena();
    const e = w.spawnEnemy('melee', { x: 70, y: 70 }, 10);
    const a = w.enemyActor(e);
    expect(e.level).toBe(10);
    expect(a.level).toBe(10);
    expect(e.health).toBe(e.def.maxHealth);
    expect(a.maxHealth).toBe(e.def.maxHealth);
    expect(e.def.maxHealth).toBeGreaterThan(melee.maxHealth * 2);
    expect(a.stats.get('power')).toBeCloseTo(9 * s.flatPerLevel['power']!);
    const xpBase = data.rpg.enemies['melee']!.xp;
    a.takeDamage(1e6);
    w.tick(DT);
    const xp = w.drainEvents().find((ev) => ev.type === 'xp');
    expect(xp).toEqual({ type: 'xp', amount: Math.round(xpBase * rewardScale(10, 1, s).xp) });
  });

  it('el esbirro conserva la diferencia de nivel con su invocador', () => {
    const w = arena();
    const sh = w.spawnEnemy('summoner', { x: 16, y: 30 }, 13);
    for (let i = 0; i < 1200 && w.enemies.list.length === 1; i++) w.tick(DT);
    const imp = w.enemies.list.find((e) => e.def.id === 'minion');
    expect(imp).toBeDefined();
    expect(imp!.level).toBe(data.rpg.enemies['minion']!.level + sh.level - data.rpg.enemies['summoner']!.level);
  });
});

describe('zonas: hechizos que se desbloquean por nivel', () => {
  /** Lobo con sólo `Desgarro` (nivel 8) listo, junto al jugador: ¿qué avisa primero? */
  function firstTelegraph(level: number): string {
    const w = arena();
    const e = w.spawnEnemy('melee', { x: 11.2, y: 30 }, level);
    const k = e.def.spells.findIndex((sp) => sp.name === 'Desgarro');
    expect(k).toBeGreaterThanOrEqual(0);
    expect(e.def.spells[k]!.minLevel).toBe(8);
    e.spellCooldowns = e.spellCooldowns.map((_, i) => (i === k ? 0 : 99));
    for (let i = 0; i < 600; i++) {
      w.tick(DT);
      if (e.state === 'telegraph') return e.current.name || 'básico';
    }
    return 'nada';
  }

  it('por debajo de minLevel no lo usa; a partir de él sí', () => {
    expect(firstTelegraph(1)).toBe('básico');
    expect(firstTelegraph(7)).toBe('básico');
    expect(firstTelegraph(8)).toBe('Desgarro');
  });

  it('un monstruo de nivel alto tiene más habilidades disponibles', () => {
    for (const a of Object.values(data.enemies.archetypes)) {
      const at = (lv: number): number => a.spells.filter((sp) => sp.minLevel <= lv).length;
      expect(at(30), a.id).toBeGreaterThanOrEqual(at(1));
    }
    const melee = data.enemies.archetypes['melee']!;
    expect(melee.spells.filter((sp) => sp.minLevel <= 20).length).toBeGreaterThan(melee.spells.filter((sp) => sp.minLevel <= 1).length);
  });
});

describe('zonas: diferencia de nivel', () => {
  /** Jugador de nivel 1 quieto junto a un lobo de ceniza de nivel 26 (franja élite). */
  function elite(): { w: World; hp: number } {
    const w = arena();
    const e = w.spawnEnemy('ash_alpha', { x: 11.4, y: 30 }, 26);
    // Sólo el ataque básico: el golpe más flojo que tiene.
    e.spellCooldowns = e.spellCooldowns.map(() => 999);
    return { w, hp: w.player.health };
  }

  it('un monstruo de nivel alto mata de un golpe a un jugador de nivel 1 que no esquiva', () => {
    for (let seed = 0; seed < 5; seed++) {
      const { w, hp } = elite();
      expect(w.character.level).toBe(1);
      let hits = 0;
      for (let i = 0; i < 600 && w.player.alive; i++) {
        w.tick(DT);
        for (const ev of w.drainEvents()) {
          if (ev.type !== 'damage' || !ev.toPlayer) continue;
          hits++;
          expect(ev.amount).toBeGreaterThanOrEqual(hp);
        }
      }
      expect(hits).toBe(1);
      expect(w.player.alive).toBe(false);
      void seed;
    }
  });

  it('el aviso se mantiene: salir del área a tiempo lo esquiva', () => {
    const { w, hp } = elite();
    const e = w.enemies.list[0]!;
    for (let i = 0; i < 600 && e.state !== 'telegraph'; i++) w.tick(DT);
    expect(e.state).toBe('telegraph');
    expect(e.current.telegraphSeconds).toBeGreaterThanOrEqual(0.5);
    // Salir del aviso nada más verlo (como haría un hechizo de desplazamiento; ya no hay evasión genérica).
    w.player.pos = { x: 2, y: 30 };
    w.player.prevPos = { x: 2, y: 30 };
    for (let i = 0; i < 600 && e.state === 'telegraph'; i++) w.tick(DT);
    expect(w.player.alive).toBe(true);
    expect(w.player.health).toBe(hp);
  });

  it('el jugador de nivel bajo hace menos daño a un monstruo muy por encima', () => {
    const hitOn = (level: number): number => {
      const w = arena();
      const e = w.spawnEnemy('melee', { x: 11.3, y: 30 }, level);
      const a = w.enemyActor(e);
      // Sin armadura ni resistencias por nivel, para medir sólo la diferencia de nivel.
      a.stats.set('level', []);
      e.state = 'idle';
      let total = 0;
      for (let k = 0; k < 40; k++) {
        a.health = e.def.maxHealth;
        w.commandAttack(e.id);
        for (let i = 0; i < 90; i++) {
          w.tick(DT);
          for (const ev of w.drainEvents()) if (ev.type === 'damage' && !ev.toPlayer) total += ev.amount;
        }
      }
      return total;
    };
    expect(hitOn(20)).toBeLessThan(hitOn(1) * 0.8);
  });
});

describe('zonas: mundo poblado', () => {
  const ow = buildOverworld(loadWorldData());
  const big = withOverworldZone(data, ow);

  it('puebla cada zona con su densidad y su franja, sin monstruos en el pueblo ni encima del jugador', () => {
    const w = new World(big, { zones: true, seed: 7 });
    const pop = w.population!;
    expect(pop).not.toBeNull();
    expect(w.enemies.list.length).toBe(pop.totalTarget);
    expect(pop.totalTarget).toBeGreaterThan(20);
    for (const e of w.enemies.list) {
      const z = w.zoneMap.get(e.zoneId!)!;
      expect(w.zoneMap.zoneAt(e.pos)).toBe(z);
      const bonus = Math.max(0, ...z.spawns.filter((s) => s.archetype === e.def.id).map((s) => s.levelBonus));
      expect(e.level).toBeGreaterThanOrEqual(z.levelMin);
      expect(e.level).toBeLessThanOrEqual(z.levelMax + bonus);
      expect(Math.hypot(e.pos.x - w.player.pos.x, e.pos.y - w.player.pos.y)).toBeGreaterThanOrEqual(big.zones.minSpawnDistance);
    }
  });

  it('repone las bajas tras respawnSeconds, quita los cadáveres y no da victoria', () => {
    const w = new World(big, { zones: true, seed: 11 });
    const target = w.population!.totalTarget;
    const victim = w.enemies.list[0]!;
    const zone = w.zoneMap.get(victim.zoneId!)!;
    w.enemyActor(victim).takeDamage(1e9);
    w.tick(DT);
    expect(w.enemies.aliveCount()).toBe(target - 1);
    for (let t = 0; t < victim.def.corpseSeconds + 1; t += DT) w.tick(DT);
    expect(w.enemies.get(victim.id)).toBeUndefined();
    // Que nadie lo ataque mientras: el jugador queda invulnerable.
    for (let t = 0; t < zone.respawnSeconds + 1; t += DT) {
      w.player.invulnerable = 1;
      w.tick(DT);
    }
    expect(w.enemies.aliveCount()).toBe(target);
    expect(w.outcome).toBe('playing');
  });

  it('avisa al entrar en una zona (suceso del mundo y aviso de la sesión con nombre y franja)', () => {
    const w = new World(big, { zones: true, seed: 3 });
    const seen: SessionEvent[] = [];
    w.character.on((e) => seen.push(e));
    w.tick(DT);
    expect(w.currentZone?.id).toBe('prados');
    // Al pueblo, a otra zona y con un instante de margen en el borde.
    w.player.pos = { x: 127, y: 131 };
    for (let i = 0; i < 30; i++) w.tick(DT);
    expect(w.currentZone?.id).toBe('prados');
    for (let i = 0; i < 30; i++) w.tick(DT);
    expect(w.currentZone?.id).toBe('aldea');
    w.player.pos = { x: 30, y: 60 };
    for (let i = 0; i < 60; i++) w.tick(DT);
    const z = seen.filter((e) => e.type === 'zoneEnter');
    expect(z.map((e) => (e.type === 'zoneEnter' ? e.zoneId : ''))).toEqual(['prados', 'aldea', 'pradera']);
    expect(z[2]).toMatchObject({ name: 'Pradera de los lobos', levelMin: 5, levelMax: 12, safe: false });
  });
});
