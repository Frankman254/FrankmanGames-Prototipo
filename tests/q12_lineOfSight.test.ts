import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { CAST_BLOCK_TEXT } from '../src/sim/combat';
import { nearestSpotWithLOS } from '../src/sim/navGrid';
import { World } from '../src/sim/world';
import { dist } from '../src/sim/vec2';

const DT = 1 / 60;

function arena(): World {
  const w = new World(loadGameData(), { encounter: false });
  w.player.pos = { x: 10, y: 10 };
  w.player.prevPos = { x: 10, y: 10 };
  return w;
}

function run(w: World, seconds: number): void {
  for (let i = 0; i < Math.round(seconds / DT); i++) w.tick(DT);
}

describe('Q12: línea de visión separada del alcance', () => {
  it('CAST_BLOCK_TEXT incluye "noLineOfSight"', () => {
    expect(CAST_BLOCK_TEXT['noLineOfSight']).toBeDefined();
    expect(CAST_BLOCK_TEXT['noLineOfSight']).not.toBe('');
  });

  it('checkCast devuelve "noLineOfSight" cuando el enemigo está a distancia pero tapado', () => {
    const w = arena();
    const basic = w.basicAttack();
    // El obstáculo del campo de prueba está en (20,20) w=2, d=14 → x=19..21, y=13..27.
    // Jugador en (18, 20) — antes del muro, mismo Y.
    // Enemigo en (22, 20) — después del muro, mismo Y.
    w.player.pos = { x: 18, y: 20 };
    w.player.prevPos = { x: 18, y: 20 };
    const e = w.spawnEnemy('melee', { x: 22, y: 20 });
    // Distancia entre centros: 4 m; entre bordes: ~2.55 m.
    // Con unarmed range = 1.1 m, está fuera de alcance → "range".
    // Para probar "noLineOfSight" usamos un spell con range = 9.
    expect(w.grid.lineOfSight(w.player.pos, e.pos)).toBe(false);
    const spell = { ...basic, range: 9 };
    const block = w.checkCast(spell, e.id);
    expect(block).toBe('noLineOfSight');
  });

  it('checkCast devuelve "range" cuando el enemigo está lejos (aunque haya visión)', () => {
    const w = arena();
    const basic = w.basicAttack();
    const range = basic.range;
    // Enemigo lejos, sin obstáculos entre ellos.
    const e = w.spawnEnemy('melee', { x: 10, y: 10 + range + 5 });
    const edgeDist = dist(w.player.pos, e.pos) - w.player.radius - e.radius;
    expect(edgeDist).toBeGreaterThan(range);
    const block = w.checkCast(basic, e.id);
    expect(block).toBe('range');
  });

  it('checkCast devuelve null cuando hay alcance y línea de visión', () => {
    const w = arena();
    const basic = w.basicAttack();
    const range = basic.range;
    // Enemigo cerca, sin obstáculos.
    const mid = range * 0.5 + w.player.radius + 0.5;
    const e = w.spawnEnemy('melee', { x: 10 + mid, y: 10 });
    const edgeDist = dist(w.player.pos, e.pos) - w.player.radius - e.radius;
    expect(edgeDist).toBeLessThanOrEqual(range);
    expect(w.grid.lineOfSight(w.player.pos, e.pos)).toBe(true);
    const block = w.checkCast(basic, e.id);
    expect(block).toBeNull();
  });
});

describe('Q12: nearestSpotWithLOS', () => {
  it('encuentra una celda con visión alrededor del obstáculo', () => {
    const w = arena();
    // Muro en x = 19..21. Jugador en (18, 10), enemigo en (22, 10).
    const from = { x: 18, y: 10 };
    const to = { x: 22, y: 10 };
    const maxDist = 10;
    const spot = nearestSpotWithLOS(w.grid, from, to, maxDist);
    expect(spot).not.toBeNull();
    expect(w.grid.lineOfSight(from, spot!)).toBe(true);
    expect(dist(spot!, to)).toBeLessThanOrEqual(maxDist + w.grid.cellSize);
  });

  it('la celda encontrada es caminable y tiene visión', () => {
    const w = arena();
    const from = { x: 18, y: 10 };
    const to = { x: 22, y: 10 };
    const spot = nearestSpotWithLOS(w.grid, from, to, 10);
    expect(spot).not.toBeNull();
    // La celda debe ser caminable.
    const cell = w.grid.cellOf(spot!);
    expect(w.grid.walkableCell(cell.cx, cell.cy)).toBe(true);
    // Y tener visión desde el origen.
    expect(w.grid.lineOfSight(from, spot!)).toBe(true);
  });
});

describe('Q12: approachAndAttack con obstáculo pegado', () => {
  it('el jugador busca una posición con visión en vez de ir al enemigo', () => {
    const w = arena();
    w.player.invulnerable = 1e9;
    const basic = w.basicAttack();
    // Jugador antes del muro, enemigo después, a distancia de ataque.
    w.player.pos = { x: 18, y: 10 };
    w.player.prevPos = { x: 18, y: 10 };
    const e = w.spawnEnemy('melee', { x: 22, y: 10 });
    w.player.attackTarget = e.id;
    const startPos = { ...w.player.pos };
    run(w, 3);
    const moved = dist(w.player.pos, startPos) > 0.1;
    expect(moved).toBe(true);
  });
});

describe('Q12: enemigo con obstáculo', () => {
  it('el enemigo sin visión busca una posición con visión dentro del alcance', () => {
    const w = arena();
    w.player.invulnerable = 1e9;
    // Enemigo antes del muro, jugador después.
    const e = w.spawnEnemy('melee', { x: 18, y: 10 });
    w.player.pos = { x: 22, y: 10 };
    w.player.prevPos = { x: 22, y: 10 };
    const startPos = { ...e.pos };
    run(w, 3);
    const moved = dist(e.pos, startPos) > 0.1;
    expect(moved).toBe(true);
  });
});
