import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { parseEnemies } from '../src/data/schema';
import enemiesJson from '../data/enemies.json';
import { World } from '../src/sim/world';

const DT = 1 / 60;

function arena(): World {
  const w = new World(loadGameData(), { encounter: false });
  w.player.pos = { x: 10, y: 10 };
  w.player.prevPos = { x: 10, y: 10 };
  return w;
}

describe('hechizos de enemigos', () => {
  it('todos los arquetipos tienen hechizos propios con nombre y estados que existen', () => {
    const data = loadGameData();
    for (const a of Object.values(data.enemies.archetypes)) {
      expect(a.spells.length, a.id).toBeGreaterThan(0);
      for (const sp of a.spells) {
        expect(sp.name.length).toBeGreaterThan(0);
        expect(sp.telegraphSeconds).toBeGreaterThanOrEqual(0.5);
        if (sp.status) expect(data.rpg.statuses[sp.status.id], `${a.id}: ${sp.status.id}`).toBeDefined();
      }
    }
  });

  it('rechaza un área "target" que no sea círculo', () => {
    const bad = structuredClone(enemiesJson) as { archetypes: Record<string, { spells?: unknown[] }> };
    bad.archetypes['melee']!.spells = [{ name: 'x', effect: 'damage', placement: 'target', shape: { type: 'cone', length: 2, angleDeg: 60 }, range: 2, cooldown: 1, telegraphSeconds: 0.5, attackSeconds: 0, recoverSeconds: 0, damageMin: 1, damageMax: 2 }];
    expect(() => parseEnemies(bad)).toThrow(/target/);
  });

  it('el hostigador lanza su lluvia de flechas a los pies del jugador y moverse la esquiva', () => {
    const w = arena();
    const e = w.spawnEnemy('ranged', { x: 18, y: 10 });
    e.spellCooldowns = e.spellCooldowns.map(() => 0);
    let seen = false;
    for (let i = 0; i < 600 && !seen; i++) {
      w.tick(DT);
      if (e.state === 'telegraph' && e.current.name === 'Lluvia de flechas') seen = true;
    }
    expect(seen).toBe(true);
    expect(e.telegraph!.origin.x).toBeCloseTo(w.player.pos.x, 0);
    // Saltar fuera del círculo antes de que caiga.
    const hp = w.player.health;
    w.player.pos = { x: w.player.pos.x, y: w.player.pos.y + 6 };
    w.player.prevPos = { ...w.player.pos };
    while (e.state === 'telegraph') w.tick(DT);
    expect(w.player.health).toBe(hp);
    expect(e.spellCooldowns[0]).toBeGreaterThan(0);
  });

  it('un golpe enemigo hace daño de verdad aunque el jugador lleve armadura y puede dejar un estado', () => {
    const w = arena();
    w.character.stats.set('test', [{ stat: 'armor', op: 'flat', value: 12 }]);
    const e = w.spawnEnemy('melee', { x: 11.2, y: 10 });
    // Sólo el mordisco listo: enfría la embestida.
    e.spellCooldowns = [99, 0];
    const hp = w.player.health;
    for (let i = 0; i < 240 && w.player.health === hp; i++) w.tick(DT);
    expect(e.current.name).toBe('Mordisco a la pata');
    expect(hp - w.player.health).toBeGreaterThanOrEqual(3);
    expect(w.character.statuses.has('chilled')).toBe(true);
  });
});
