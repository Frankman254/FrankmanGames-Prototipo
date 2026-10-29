// El jugador en pantalla: elige la animación a partir del estado de la
// simulación y de sus sucesos, y comprueba cada `footstep` (el pie de apoyo
// tiene que estar en el suelo en ese instante) dejando una nube de polvo.
import { Color3, Mesh, MeshBuilder, StandardMaterial, Vector3, type Scene } from '@babylonjs/core';
import { FrameStats } from '../../sim/frameStats';
import type { GameEvent } from '../../sim/events';
import type { Player } from '../../sim/world';
import type { AnimEvent } from '../../world/anim';
import type { AnimState } from '../../world/rigs';
import type { HeightField } from '../../world/terrain';
import type { CharacterModel } from './characterModel';

/** Nubecillas de polvo en el suelo para ver dónde cae cada paso. */
class Puffs {
  private readonly pool: Array<{ mesh: Mesh; ttl: number }> = [];
  private next = 0;
  private readonly mat: StandardMaterial;

  constructor(scene: Scene, size = 8) {
    this.mat = new StandardMaterial('puffMat', scene);
    this.mat.diffuseColor = new Color3(0.75, 0.68, 0.55);
    this.mat.specularColor = Color3.Black();
    this.mat.alpha = 0.55;
    for (let i = 0; i < size; i++) {
      const mesh = MeshBuilder.CreateDisc(`puff${i}`, { radius: 0.18, tessellation: 12 }, scene);
      mesh.rotation.x = Math.PI / 2;
      mesh.material = this.mat;
      mesh.isPickable = false;
      mesh.setEnabled(false);
      this.pool.push({ mesh, ttl: 0 });
    }
  }

  spawn(p: Vector3): void {
    const s = this.pool[this.next]!;
    this.next = (this.next + 1) % this.pool.length;
    s.mesh.position.set(p.x, p.y + 0.03, p.z);
    s.mesh.scaling.setAll(1);
    s.ttl = 0.45;
    s.mesh.setEnabled(true);
  }

  update(dt: number): void {
    for (const s of this.pool) {
      if (s.ttl <= 0) continue;
      s.ttl -= dt;
      s.mesh.scaling.setAll(1 + (0.45 - s.ttl) * 2.5);
      if (s.ttl <= 0) s.mesh.setEnabled(false);
    }
  }
}

export class PlayerAvatar {
  /** Pasos vistos y distancia (cm) entre el pie de apoyo y el suelo en cada uno. */
  footsteps = 0;
  readonly footError = new FrameStats(64);
  /** Recuento de eventos de animación por tipo (los recoge `main`). */
  private oneShot: AnimState | null = null;
  private readonly puffs: Puffs;
  private readonly foot = new Vector3();

  constructor(scene: Scene, readonly model: CharacterModel, private readonly ground: HeightField) {
    this.puffs = new Puffs(scene);
  }

  /** Sucesos de la simulación que disparan animaciones de una vez. */
  onGameEvent(e: GameEvent): void {
    let s: AnimState | null = null;
    if (e.type === 'cast') s = e.ability === 'basic' ? 'attack' : 'cast';
    else if (e.type === 'evade') s = 'evade';
    else if (e.type === 'damage' && e.toPlayer && this.model.state !== 'evade') s = 'hit';
    if (s === null) return;
    this.oneShot = s;
    this.model.play(s, { restart: true });
  }

  /** Coloca, orienta y anima. Devuelve los eventos de animación del fotograma. */
  sync(p: Player, x: number, y: number, z: number, dt: number): AnimEvent[] {
    const m = this.model;
    m.root.position.set(x, y, z);
    m.root.rotation.y = -p.facing;

    const moving = p.path.length > 0;
    if (!p.alive) {
      if (m.state !== 'death') m.play('death');
      this.oneShot = null;
    } else if (this.oneShot && !m.finished && m.state === this.oneShot) {
      // Deja terminar el golpe, el hechizo, la evasión o el impacto.
    } else if (p.casting) {
      m.play('cast');
    } else {
      this.oneShot = null;
      m.play(moving ? 'run' : 'idle');
    }
    if (!p.alive) m.setEmissive(0, 0, 0);
    else if (p.invulnerable > 0) m.setEmissive(0.25, 0.35, 0.45);
    else m.setEmissive(0, 0, 0);

    const events = m.update(dt, moving ? p.speed : 0);
    for (const ev of events) {
      if (ev.type !== 'footstep') continue;
      m.lowestFoot(this.foot);
      this.footsteps++;
      this.footError.push(Math.abs(this.foot.y - this.ground.sample(this.foot.x, this.foot.z)) * 100);
      this.puffs.spawn(this.foot);
    }
    this.puffs.update(dt);
    return events;
  }

  /** Reinicio de partida: vuelve a reposo aunque estuviera muerto. */
  reset(): void {
    this.oneShot = null;
    this.model.play('idle', { restart: true });
  }
}

