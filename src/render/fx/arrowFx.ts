// Flechas de los enemigos a distancia (goblin y veterano). La simulación
// resuelve el disparo al acabar el aviso, de golpe, sobre la línea del aviso:
// la flecha sale del arco con antelación para cruzar el punto de esa línea más
// cercano al jugador justo en ese instante. Si acierta (llega el suceso de daño)
// se queda en el jugador; si no, sigue la línea hasta el final y se clava.
import { Color3, Mesh, MeshBuilder, StandardMaterial, TransformNode, Vector3, type Scene } from '@babylonjs/core';
import type { FxDef } from '../../data/fxSchema';
import type { Enemy } from '../../sim/enemies';
import type { GameEvent } from '../../sim/events';
import type { World } from '../../sim/world';
import type { HeightField } from '../../world/terrain';

interface Arrow {
  node: TransformNode;
  enemyId: number;
  from: Vector3;
  to: Vector3;
  t: number;
  total: number;
  /** Clavada (o en el jugador): se desvanece. */
  stuck: number;
}

const CHEST = 1.1;

/** ¿Es un ataque a distancia que se dibuja con flecha? */
export function shootsArrows(e: Enemy): boolean {
  const a = e.def.attack;
  return a.effect === 'damage' && a.shape.type === 'line' && a.range >= 5;
}

export class ArrowFx {
  private arrows: Arrow[] = [];
  /** Avisos que ya soltaron su flecha. */
  private readonly fired = new WeakSet<object>();
  private readonly shaft: StandardMaterial;
  private readonly tip: StandardMaterial;
  private readonly feather: StandardMaterial;

  constructor(
    private readonly scene: Scene,
    private readonly fx: FxDef,
    private readonly ground: HeightField,
    /** Posición del arco (mano izquierda) de un enemigo en el mundo, o null. */
    private readonly bowOf: (enemyId: number, out: Vector3) => Vector3 | null,
  ) {
    const mat = (name: string, rgb: [number, number, number]): StandardMaterial => {
      const m = new StandardMaterial(name, scene);
      m.diffuseColor = new Color3(...rgb);
      m.specularColor = new Color3(0.1, 0.1, 0.1);
      m.backFaceCulling = false;
      return m;
    };
    this.shaft = mat('arrowShaft', fx.arrow.color);
    this.tip = mat('arrowTip', [0.6, 0.62, 0.66]);
    this.feather = mat('arrowFeather', fx.arrow.fletching);
  }

  private build(): TransformNode {
    const L = this.fx.arrow.length;
    const node = new TransformNode('arrow', this.scene);
    // A lo largo de +Z (lookAt apunta +Z al objetivo).
    const shaft = MeshBuilder.CreateCylinder('arrowShaftMesh', { height: L, diameter: 0.025, tessellation: 5 }, this.scene);
    shaft.rotation.x = Math.PI / 2;
    shaft.material = this.shaft;
    const tip = MeshBuilder.CreateCylinder('arrowTipMesh', { height: 0.1, diameterTop: 0, diameterBottom: 0.06, tessellation: 5 }, this.scene);
    tip.rotation.x = Math.PI / 2;
    tip.position.z = L / 2 + 0.05;
    tip.material = this.tip;
    const parts: Mesh[] = [shaft, tip];
    for (let i = 0; i < 2; i++) {
      const f = MeshBuilder.CreatePlane('arrowFeatherMesh', { width: 0.07, height: 0.16 }, this.scene);
      f.rotation.set(Math.PI / 2, 0, (i * Math.PI) / 2);
      f.position.z = -L / 2 + 0.08;
      f.material = this.feather;
      parts.push(f);
    }
    for (const p of parts) {
      p.parent = node;
      p.isPickable = false;
    }
    return node;
  }

  /** Un acierto (daño al jugador de ese enemigo) detiene su flecha en el jugador. */
  handleEvents(world: World, events: readonly GameEvent[]): void {
    for (const ev of events) {
      if (ev.type !== 'damage' || !ev.toPlayer) continue;
      const a = this.arrows.find((x) => x.enemyId === ev.sourceId && x.stuck <= 0);
      if (!a) continue;
      const p = world.player.pos;
      a.node.position.set(p.x, this.ground.sample(p.x, p.y) + CHEST, p.y);
      a.stuck = 0.35;
    }
  }

  update(world: World, dt: number): void {
    const s = this.fx.arrow.speed;
    const pl = world.player;
    for (const e of world.enemies.list) {
      const t = e.telegraph;
      if (e.state !== 'telegraph' || !t || t.def.type !== 'line' || !shootsArrows(e) || this.fired.has(t)) continue;
      const len = t.def.length;
      const dx = Math.cos(t.dir);
      const dz = Math.sin(t.dir);
      // Punto de la línea más cercano al jugador: ahí debe estar la flecha al resolverse.
      const proj = Math.min(len, Math.max(0, (pl.pos.x - t.origin.x) * dx + (pl.pos.y - t.origin.y) * dz));
      const hx = t.origin.x + dx * proj;
      const hz = t.origin.y + dz * proj;
      const from = this.bowOf(e.id, new Vector3()) ?? new Vector3(e.pos.x, this.ground.sample(e.pos.x, e.pos.y) + CHEST, e.pos.y);
      const hit = new Vector3(hx, this.ground.sample(hx, hz) + CHEST, hz);
      const flight = Vector3.Distance(from, hit) / s;
      if (e.def.attack.telegraphSeconds - e.stateTime > flight) continue;
      this.fired.add(t);
      const ex = t.origin.x + dx * len;
      const ez = t.origin.y + dz * len;
      const to = new Vector3(ex, this.ground.sample(ex, ez) + 0.15, ez);
      const node = this.build();
      node.position.copyFrom(from);
      node.lookAt(to);
      this.arrows.push({ node, enemyId: e.id, from, to, t: 0, total: Vector3.Distance(from, to) / s, stuck: 0 });
    }

    this.arrows = this.arrows.filter((a) => {
      if (a.stuck > 0) {
        a.stuck -= dt;
        if (a.stuck > 0) return true;
        a.node.dispose(false, false);
        return false;
      }
      a.t += dt;
      const k = Math.min(1, a.t / a.total);
      Vector3.LerpToRef(a.from, a.to, k, a.node.position);
      if (k < 1) return true;
      a.stuck = 1.2; // clavada en el suelo al final de la línea
      return true;
    });
  }

  /** Flechas en vuelo o clavadas (para tests y depuración). */
  get active(): ReadonlyArray<{ enemyId: number; position: Vector3; stuck: boolean }> {
    return this.arrows.map((a) => ({ enemyId: a.enemyId, position: a.node.position, stuck: a.stuck > 0 }));
  }

  reset(): void {
    for (const a of this.arrows) a.node.dispose(false, false);
    this.arrows = [];
  }
}
