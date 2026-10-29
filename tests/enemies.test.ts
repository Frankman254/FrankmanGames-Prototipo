import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { parseEnemies } from '../src/data/schema';
import enemiesJson from '../data/enemies.json';
import { resolveHit } from '../src/sim/damage';
import type { EnemyState } from '../src/sim/enemies';
import { Rng } from '../src/sim/rng';
import { shapeHitsCircle } from '../src/sim/shapes';
import { World } from '../src/sim/world';
import { dist } from '../src/sim/vec2';

const DT = 1 / 60;

/** Mundo sin encuentro, con el jugador en (10, 10) en campo abierto. */
function arena(): World {
  const w = new World(loadGameData(), { encounter: false });
  w.player.pos = { x: 10, y: 10 };
  w.player.prevPos = { x: 10, y: 10 };
  return w;
}

function run(w: World, seconds: number, each?: () => void): void {
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    w.tick(DT);
    each?.();
  }
}

describe('formas de área', () => {
  it('cono: dentro del ángulo y del radio, ensanchado por el radio del actor', () => {
    const cone = { def: { type: 'cone' as const, length: 3, angleDeg: 90 }, origin: { x: 0, y: 0 }, dir: 0 };
    expect(shapeHitsCircle(cone, { x: 2, y: 0 }, 0.1)).toBe(true);
    expect(shapeHitsCircle(cone, { x: 2, y: 1.9 }, 0.1)).toBe(true); // 43,5°
    expect(shapeHitsCircle(cone, { x: 1, y: 2 }, 0.1)).toBe(false); // 63°
    expect(shapeHitsCircle(cone, { x: -1, y: 0 }, 0.1)).toBe(false); // detrás
    expect(shapeHitsCircle(cone, { x: 3.3, y: 0 }, 0.4)).toBe(true); // borde por el radio
    expect(shapeHitsCircle(cone, { x: 3.5, y: 0 }, 0.4)).toBe(false);
  });

  it('línea: rectángulo desde el origen en la dirección dada', () => {
    const line = { def: { type: 'line' as const, length: 10, width: 1 }, origin: { x: 0, y: 0 }, dir: Math.PI / 2 };
    expect(shapeHitsCircle(line, { x: 0, y: 9 }, 0.3)).toBe(true);
    expect(shapeHitsCircle(line, { x: 0.7, y: 5 }, 0.3)).toBe(true);
    expect(shapeHitsCircle(line, { x: 0.9, y: 5 }, 0.3)).toBe(false);
    expect(shapeHitsCircle(line, { x: 0, y: -1 }, 0.3)).toBe(false);
  });

  it('círculo', () => {
    const c = { def: { type: 'circle' as const, radius: 1 }, origin: { x: 5, y: 5 }, dir: 0 };
    expect(shapeHitsCircle(c, { x: 6.2, y: 5 }, 0.3)).toBe(true);
    expect(shapeHitsCircle(c, { x: 6.4, y: 5 }, 0.3)).toBe(false);
  });
});

describe('daño', () => {
  it('siempre está en [mín, máx·(1+bonus)] y nunca es un fallo', () => {
    const rng = new Rng(3);
    const d = { min: 6, max: 10, element: 'physical' as const, scaling: 0, critChance: 0.25, critBonus: 0.5 };
    const rules = { elementStat: loadGameData().rpg.rules.elementStat, resistCap: 60 };
    let crits = 0;
    for (let i = 0; i < 20000; i++) {
      const r = resolveHit(rng, d, null, null, rules);
      expect(r.amount).toBeGreaterThanOrEqual(6);
      expect(r.amount).toBeLessThanOrEqual(r.crit ? 15 : 10);
      if (r.crit) {
        crits++;
        expect(r.amount).toBeGreaterThanOrEqual(9);
      }
    }
    expect(crits / 20000).toBeGreaterThan(0.23);
    expect(crits / 20000).toBeLessThan(0.27);
  });
});

describe('datos de enemigos', () => {
  it('hay tres arquetipos distintos (cuerpo a cuerpo, a distancia, invocador) y el encuentro es caminable', () => {
    const data = loadGameData();
    const a = data.enemies.archetypes;
    expect(a['melee']!.attack.effect).toBe('damage');
    expect(a['ranged']!.preferredRange).toBeGreaterThan(a['melee']!.attack.range);
    expect(a['summoner']!.attack.summon).not.toBeNull();
    const w = new World(data);
    expect(w.enemies.list.length).toBe(data.encounter.spawns.length);
    for (const s of data.encounter.spawns) expect(w.grid.walkable(s)).toBe(true);
  });

  it('rechaza un ataque sin aviso y un esbirro de arquetipo desconocido', () => {
    const raw = structuredClone(enemiesJson) as Record<string, any>;
    raw.archetypes.melee.attack.telegraphSeconds = 0;
    expect(() => parseEnemies(raw)).toThrow(/telegraphSeconds/);
    const raw2 = structuredClone(enemiesJson) as Record<string, any>;
    raw2.archetypes.summoner.attack.summon.archetype = 'nadie';
    expect(() => parseEnemies(raw2)).toThrow(/nadie/);
  });
});

describe('máquina de estados', () => {
  it('cuerpo a cuerpo: Idle → Acquire → Pursue → Telegraph → Attack → Recover → Pursue', () => {
    const w = arena();
    const e = w.spawnEnemy('melee', { x: 15, y: 10 });
    const seen: EnemyState[] = [e.state];
    run(w, 4, () => {
      if (seen[seen.length - 1] !== e.state) seen.push(e.state);
    });
    expect(seen.slice(0, 7)).toEqual(['idle', 'acquire', 'pursue', 'telegraph', 'attack', 'recover', 'pursue']);
  });

  it('no ve al jugador fuera de su alcance de vista ni tras una pared', () => {
    const w = arena();
    w.player.pos = { x: 17, y: 20 };
    const far = w.spawnEnemy('melee', { x: 3, y: 2 }); // a 22,8 m
    expect(dist(far.pos, w.player.pos)).toBeGreaterThan(far.def.sightRange);
    const hidden = w.spawnEnemy('melee', { x: 23, y: 20 }); // muro en x = 19..21
    run(w, 1);
    expect(far.state).toBe('idle');
    expect(hidden.state).toBe('idle');
  });

  it('el golpe sólo llega al terminar el aviso y quedarse dentro del área', () => {
    const w = arena();
    const e = w.spawnEnemy('melee', { x: 11.5, y: 10 });
    const tele = e.def.attack.telegraphSeconds;
    let hp = w.player.health;
    run(w, 3, () => {
      // Durante el aviso no baja (puede subir por la regeneración de la clase).
      if (e.state === 'telegraph') expect(w.player.health).toBeGreaterThanOrEqual(hp);
      hp = w.player.health;
    });
    expect(w.player.health).toBeLessThan(w.player.maxHealth);
    expect(tele).toBeGreaterThan(0);
  });

  it('salir del área durante el aviso esquiva el ataque', () => {
    const w = arena();
    const e = w.spawnEnemy('melee', { x: 11.5, y: 10 });
    let dodged = false;
    run(w, 3, () => {
      if (e.state === 'telegraph' && !dodged) {
        // Teletransportar fuera del cono fijado (detrás del enemigo, lejos).
        w.player.pos = { x: 10, y: 16 };
        dodged = true;
      }
      if (e.state === 'recover') w.player.pos = { x: 3, y: 25 };
    });
    expect(dodged).toBe(true);
    expect(w.player.health).toBe(w.player.maxHealth);
    const ev = w.drainEvents();
    expect(ev.some((x) => x.type === 'telegraph')).toBe(true);
    expect(ev.some((x) => x.type === 'damage')).toBe(false);
  });

  it('daño suficiente aturde (Stagger) y cancela el aviso; a 0 de vida, Dead', () => {
    const w2 = arena();
    const e2 = w2.spawnEnemy('melee', { x: 11.5, y: 10 });
    run(w2, 1.0);
    expect(e2.state).toBe('telegraph');
    w2.enemies.damage(e2, e2.def.staggerDamage, () => {});
    expect(e2.state).toBe('stagger');
    expect(e2.telegraph).toBeNull();
    run(w2, e2.def.staggerSeconds + 0.05);
    expect(e2.state).not.toBe('stagger');
    const events: string[] = [];
    w2.enemies.damage(e2, 1e6, (ev) => events.push(ev.type));
    expect(e2.state).toBe('dead');
    expect(events).toEqual(['enemyDeath']);
    run(w2, 2);
    expect(e2.state).toBe('dead');
  });

  it('un golpe despierta a un enemigo en Idle', () => {
    const w = arena();
    const e = w.spawnEnemy('melee', { x: 10, y: 30 });
    run(w, 0.2);
    expect(e.state).toBe('idle');
    w.enemies.damage(e, 1, () => {});
    expect(e.state).toBe('acquire');
  });

  it('suelta la correa y vuelve a casa', () => {
    const w = arena();
    w.player.invulnerable = 1e9;
    const e = w.spawnEnemy('melee', { x: 15, y: 10 });
    run(w, 1.5);
    expect(e.state).not.toBe('idle');
    // El jugador huye más rápido de lo que el enemigo puede seguir: lo llevamos lejos.
    w.player.pos = { x: 10, y: 10 + e.def.leashRange + 12 };
    run(w, 15);
    expect(e.state).toBe('idle');
    expect(dist(e.pos, e.home)).toBeLessThan(1.5);
  });

  it('los tres se distinguen por conducta: distancia a la que se quedan', () => {
    const w = arena();
    w.player.invulnerable = 1e9;
    const melee = w.spawnEnemy('melee', { x: 16, y: 6 });
    const ranged = w.spawnEnemy('ranged', { x: 12, y: 14 });
    const summoner = w.spawnEnemy('summoner', { x: 13, y: 20 });
    const edge = (e: typeof melee): number => dist(e.pos, w.player.pos) - e.radius - w.player.radius;
    run(w, 8);
    expect(edge(melee)).toBeLessThan(melee.def.attack.range + 0.2);
    expect(edge(ranged)).toBeGreaterThan(ranged.def.retreatRange - 0.5);
    expect(edge(summoner)).toBeGreaterThan(summoner.def.retreatRange - 0.5);
    expect(w.enemies.minionsOf(summoner.id)).toBeGreaterThan(0);
  });

  it('el invocador nunca supera su tope de esbirros', () => {
    const w = arena();
    w.player.invulnerable = 1e9;
    const s = w.spawnEnemy('summoner', { x: 10, y: 22 });
    const cap = s.def.attack.summon!.maxAlive;
    let max = 0;
    run(w, 40, () => (max = Math.max(max, w.enemies.minionsOf(s.id))));
    expect(max).toBe(cap);
    // Matar esbirros le deja volver a invocar.
    for (const m of w.enemies.list) if (m.summonerId === s.id) w.enemies.damage(m, 1e6, () => {});
    run(w, s.def.attack.cooldown + s.def.attack.telegraphSeconds + 2);
    expect(w.enemies.minionsOf(s.id)).toBeGreaterThan(0);
  });

  it('a distancia: retrocede si el jugador se acerca mientras recarga', () => {
    const w = arena();
    w.player.invulnerable = 1e9;
    const r = w.spawnEnemy('ranged', { x: 13, y: 10 });
    r.attackCooldown = 1e9; // recargando: no puede avisar
    run(w, 0.6); // Idle → Acquire → Pursue
    expect(r.state).toBe('pursue');
    const before = dist(r.pos, w.player.pos);
    run(w, 1);
    expect(dist(r.pos, w.player.pos)).toBeGreaterThan(before + 1);
    for (const e of w.enemies.list) expect(w.grid.walkable(e.pos)).toBe(true);
  });
});
