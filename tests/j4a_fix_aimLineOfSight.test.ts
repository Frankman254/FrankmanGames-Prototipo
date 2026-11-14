import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { World } from '../src/sim/world';

const DT = 1 / 60;

function arena() {
  return new World(loadGameData(), { encounter: false });
}

function run(w: World, seconds: number) {
  for (let i = 0; i < Math.round(seconds / DT); i++) w.tick(DT);
}

describe('J4a-fix: vista previa de apuntado considera línea de visión', () => {
  it('previewSpell.inRange es false cuando no hay línea de visión aunque esté en alcance', () => {
    const w = arena();
    w.player.pos = { x: 18, y: 20 };
    w.player.prevPos = { x: 18, y: 20 };
    // Enemigo detrás del muro (x=19..21), mismo Y.
    const e = w.spawnEnemy('melee', { x: 22, y: 20 });
    // El muro bloquea la línea de visión.
    expect(w.grid.lineOfSight(w.player.pos, e.pos)).toBe(false);

    // Usamos un hechizo con rango suficiente para alcanzar al enemigo.
    const basic = w.basicAttack();
    const spell = { ...basic, range: 9 };

    // inRange solo (distancia) debe ser true.
    expect(w.inRange(spell, e.id)).toBe(true);
    // hasLineOfSight debe ser false.
    expect(w.hasLineOfSight(spell, e.id)).toBe(false);

    // checkCast verifica inRange + hasLineOfSight y devuelve el bloqueo.
    const block = w.checkCast(spell, e.id);
    expect(block).toBe('noLineOfSight');
  });

  it('previewSpell.inRange es true cuando hay alcance y línea de visión', () => {
    const w = arena();
    w.player.pos = { x: 10, y: 10 };
    w.player.prevPos = { x: 10, y: 10 };
    // Enemigo sin obstáculos entre ellos.
    const e = w.spawnEnemy('melee', { x: 14, y: 10 });
    expect(w.grid.lineOfSight(w.player.pos, e.pos)).toBe(true);

    const basic = w.basicAttack();
    const spell = { ...basic, range: 9 };
    expect(w.inRange(spell, e.id)).toBe(true);
    expect(w.hasLineOfSight(spell, e.id)).toBe(true);

    const block = w.checkCast(spell, e.id);
    expect(block).toBeNull(); // nada bloquea
  });

  it('hasLineOfSight con hechizo de área apuntada (circle atTarget) verifica el punto de aim', () => {
    const w = arena();
    w.player.pos = { x: 18, y: 20 };
    w.player.prevPos = { x: 18, y: 20 };

    // Spell fabricado: área circle atTarget, rango suficiente.
    const basic = w.basicAttack();
    const spell = {
      ...basic,
      range: 9,
      area: { type: 'circle' as const, atTarget: true, radius: 1.5 }
    };

    // Apuntar a un punto detrás del muro.
    const aimBehind = { x: 22, y: 20 };
    expect(w.grid.lineOfSight(w.player.pos, aimBehind)).toBe(false);
    expect(w.hasLineOfSight(spell, null, aimBehind)).toBe(false);

    // Apuntar a un punto sin obstáculos.
    w.player.pos = { x: 10, y: 10 };
    w.player.prevPos = { x: 10, y: 10 };
    const aimClear = { x: 14, y: 10 };
    expect(w.grid.lineOfSight(w.player.pos, aimClear)).toBe(true);
    expect(w.hasLineOfSight(spell, null, aimClear)).toBe(true);
  });

  it('checkCast prioriza "range" sobre "noLineOfSight" cuando está lejos y tapado', () => {
    const w = arena();
    w.player.pos = { x: 18, y: 20 };
    w.player.prevPos = { x: 18, y: 20 };
    // Enemigo lejos y detrás del muro.
    const e = w.spawnEnemy('melee', { x: 22, y: 20 });
    const basic = w.basicAttack();
    // Con el rango real del basic attack (~1.1 m), está fuera de alcance.
    // checkCast debe devolver "range" (distancia primero).
    const block = w.checkCast(basic, e.id);
    expect(block).toBe('range');
  });

  it('checkCast devuelve "noLineOfSight" con spell de área apuntada detrás del muro', () => {
    const w = arena();
    w.player.pos = { x: 18, y: 20 };
    w.player.prevPos = { x: 18, y: 20 };

    // Spell fabricado: área circle atTarget, rango suficiente.
    const basic = w.basicAttack();
    const spell = {
      ...basic,
      range: 9,
      area: { type: 'circle' as const, atTarget: true, radius: 1.5 }
    };

    // Apuntar detrás del muro.
    const aim = { x: 22, y: 20 };
    const block = w.checkCast(spell, null, aim);
    expect(block).toBe('noLineOfSight');
  });

  it('checkCast devuelve null con spell de área apuntada sin obstáculos', () => {
    const w = arena();
    w.player.pos = { x: 10, y: 10 };
    w.player.prevPos = { x: 10, y: 10 };

    const basic = w.basicAttack();
    const spell = {
      ...basic,
      range: 9,
      area: { type: 'circle' as const, atTarget: true, radius: 1.5 }
    };

    const aim = { x: 14, y: 10 };
    const block = w.checkCast(spell, null, aim);
    expect(block).toBeNull();
  });

  it('enemigo detrás del muro: inRange true, hasLineOfSight false, checkCast noLineOfSight', () => {
    const w = arena();
    w.player.pos = { x: 18, y: 20 };
    w.player.prevPos = { x: 18, y: 20 };
    const e = w.spawnEnemy('melee', { x: 22, y: 20 });

    const basic = w.basicAttack();
    const spell = { ...basic, range: 9 };

    // Las tres condiciones que la vista previa de spellFx.ts ahora verifica.
    expect(w.inRange(spell, e.id)).toBe(true);
    expect(w.hasLineOfSight(spell, e.id)).toBe(false);
    // La combinación (lo que spellFx.ts usa ahora) es false.
    const combined = w.inRange(spell, e.id) && w.hasLineOfSight(spell, e.id);
    expect(combined).toBe(false);
    // checkCast confirma el bloqueo.
    expect(w.checkCast(spell, e.id)).toBe('noLineOfSight');
  });

  it('enemigo sin obstáculos: inRange true, hasLineOfSight true, checkCast null', () => {
    const w = arena();
    w.player.pos = { x: 10, y: 10 };
    w.player.prevPos = { x: 10, y: 10 };
    const e = w.spawnEnemy('melee', { x: 14, y: 10 });

    const basic = w.basicAttack();
    const spell = { ...basic, range: 9 };

    expect(w.inRange(spell, e.id)).toBe(true);
    expect(w.hasLineOfSight(spell, e.id)).toBe(true);
    const combined = w.inRange(spell, e.id) && w.hasLineOfSight(spell, e.id);
    expect(combined).toBe(true);
    expect(w.checkCast(spell, e.id)).toBeNull();
  });
});
