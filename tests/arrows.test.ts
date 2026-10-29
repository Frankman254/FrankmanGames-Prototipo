import { NullEngine, Scene } from '@babylonjs/core';
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadFx } from '../src/data/fxSchema';
import { ArrowFx, shootsArrows } from '../src/render/fx/arrowFx';
import { World } from '../src/sim/world';
import { HeightField } from '../src/world/terrain';

/** Suelo plano para el test (la altura sólo afecta al dibujo). */
const flat = new HeightField(80, 80, 1, new Float32Array(81 * 81));

function setup(): { w: World; arrows: ArrowFx } {
  const data = loadGameData();
  const w = new World(data, { encounter: false });
  const scene = new Scene(new NullEngine());
  return { w, arrows: new ArrowFx(scene, loadFx(), flat, () => null) };
}

describe('flechas de los enemigos a distancia', () => {
  it('sólo disparan flechas los ataques en línea de largo alcance', () => {
    const { w } = setup();
    expect(shootsArrows(w.spawnEnemy('ranged', { x: 30, y: 30 }))).toBe(true);
    expect(shootsArrows(w.spawnEnemy('melee', { x: 34, y: 30 }))).toBe(false);
  });

  it('la flecha pasa por el jugador justo cuando la simulación resuelve el disparo', () => {
    const { w, arrows } = setup();
    const p = w.player.pos;
    const e = w.spawnEnemy('ranged', { x: p.x + 9, y: p.y });
    let checked = false;
    let prevState = e.state;
    for (let i = 0; i < 60 * 10 && !checked; i++) {
      w.tick(1 / 60);
      arrows.handleEvents(w, w.drainEvents());
      // La flecha se mueve con el reloj del render; aquí, el mismo paso que la sim.
      arrows.update(w, 1 / 60);
      if (prevState === 'telegraph' && e.state === 'attack') {
        const a = arrows.active.find((x) => x.enemyId === e.id);
        expect(a, 'hay flecha al resolver').toBeDefined();
        // A ≤ un paso de flecha (26 m/s / 60 Hz ≈ 0,45 m) del jugador en el plano.
        expect(Math.hypot(a!.position.x - w.player.pos.x, a!.position.z - w.player.pos.y)).toBeLessThan(0.6);
        checked = true;
      }
      prevState = e.state;
    }
    expect(checked).toBe(true);
  });

  it('si acierta, la flecha se queda en el jugador', () => {
    const { w, arrows } = setup();
    const p = w.player.pos;
    const e = w.spawnEnemy('ranged', { x: p.x + 8, y: p.y });
    let hit = false;
    for (let i = 0; i < 60 * 10 && !hit; i++) {
      w.tick(1 / 60);
      const ev = w.drainEvents();
      arrows.handleEvents(w, ev);
      arrows.update(w, 1 / 60);
      if (ev.some((x) => x.type === 'damage' && x.toPlayer && x.sourceId === e.id)) {
        const a = arrows.active.find((x) => x.enemyId === e.id)!;
        expect(a.stuck).toBe(true);
        expect(Math.hypot(a.position.x - w.player.pos.x, a.position.z - w.player.pos.y)).toBeLessThan(0.01);
        hit = true;
      }
    }
    expect(hit).toBe(true);
  });
});
