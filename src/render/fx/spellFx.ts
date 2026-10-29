// Efectos de hechizos por elemento: destello en la mano al lanzar, proyectiles
// con estela que vuelan a la velocidad de la simulación, impactos, áreas con la
// forma real del hechizo (círculo en el punto apuntado si toca, cono, línea) y
// zonas persistentes. Sólo lee sucesos y estado de la simulación.
import { MeshBuilder, Vector3, type Mesh, type ParticleSystem, type Scene, type StandardMaterial, type TransformNode } from '@babylonjs/core';
import { TransformNode as Node } from '@babylonjs/core';
import type { ShapeDef } from '../../data/schema';
import type { FxDef } from '../../data/fxSchema';
import type { Element } from '../../rpg/contracts';
import type { GameEvent } from '../../sim/events';
import type { Vec2 } from '../../sim/vec2';
import type { World } from '../../sim/world';
import type { HeightField } from '../../world/terrain';
import { shapeMesh } from '../enemyView';
import { BurstPool, glowMaterial, retire, trail } from './particles';

interface Flash {
  node: TransformNode;
  mesh: Mesh;
  mat: StandardMaterial;
  ttl: number;
  total: number;
  grow: number;
  alpha: number;
}

interface Projectile {
  mesh: Mesh;
  trail: ParticleSystem;
  targetId: number;
  speed: number;
  element: Element;
  jitter: number;
  /** Línea: va de `from` a `to` en `total` segundos sin buscar objetivo. */
  line?: { from: Vector3; to: Vector3; t: number; total: number };
}

interface ZoneFx {
  disc: Mesh;
  ring: Mesh;
  mat: StandardMaterial;
  sparks: ParticleSystem;
  emitter: Vector3;
}

/** Elemento de un suceso de daño o de un lanzamiento, a partir de su etiqueta. */
export function elementOf(world: World, tag: string | null): Element {
  if (!tag) return 'physical';
  const c = world.content;
  if (tag === 'basic') return world.character.weapon()?.weapon?.element ?? 'physical';
  const spell = c.spells[tag];
  if (spell) return spell.element;
  const [kind, id] = tag.split(':');
  if (kind === 'status' && id) {
    const t = c.statuses[id]?.tick?.effect;
    return t && t.type === 'damage' ? t.element : 'physical';
  }
  if (kind === 'pet' && id) return c.pets[id]?.attack?.element ?? 'physical';
  return 'physical';
}

export class SpellFx {
  private readonly bursts: BurstPool;
  private flashes: Flash[] = [];
  private projectiles: Projectile[] = [];
  private readonly zones = new Map<number, ZoneFx>();
  private readonly mats = new Map<string, StandardMaterial>();
  private readonly tmp = new Vector3();
  /** Punto apuntado del último lanzamiento con tiempo de carga (la sim lo guarda en `casting`). */
  private castingAim: Vec2 | null = null;
  private time = 0;

  constructor(
    private readonly scene: Scene,
    private readonly fx: FxDef,
    private readonly ground: HeightField,
    /** Punto del suelo bajo el cursor ahora (para lanzamientos instantáneos). */
    private readonly cursor: () => Vec2 | null,
    /** Posición de la mano del jugador en el mundo. */
    private readonly hand: (out: Vector3) => Vector3,
  ) {
    this.bursts = new BurstPool(scene, 24, 160);
  }

  private mat(key: string, rgb: [number, number, number], alpha: number): StandardMaterial {
    let m = this.mats.get(key);
    if (!m) {
      // Lo que se pinta sobre el suelo (áreas, zonas, anillos) va con mezcla normal.
      const ground = key.startsWith('area:') || key.startsWith('zone:') || key.startsWith('ring:');
      m = glowMaterial(this.scene, `fx:${key}`, rgb, alpha, !ground);
      this.mats.set(key, m);
    }
    return m;
  }

  /** Posición (con altura del suelo) de una entidad por id, o null. */
  private entityPos(world: World, id: number, out: Vector3, lift: number): Vector3 | null {
    const p = world.player;
    let pos: Vec2 | undefined;
    if (id === p.id) pos = p.pos;
    else pos = world.enemies.get(id)?.pos ?? world.pets.find((x) => x.id === id)?.pos;
    if (!pos) return null;
    return out.set(pos.x, this.ground.sample(pos.x, pos.y) + lift, pos.y);
  }

  private flash(mesh: Mesh, mat: StandardMaterial, seconds: number, grow: number, alpha: number): void {
    const node = new Node('fxFlash', this.scene);
    mesh.parent = node;
    mesh.material = mat.clone(`${mat.name}:i`)!;
    mesh.isPickable = false;
    this.flashes.push({ node, mesh, mat: mesh.material as StandardMaterial, ttl: seconds, total: seconds, grow, alpha });
  }

  handleEvents(world: World, events: readonly GameEvent[]): void {
    for (const e of events) {
      if (e.type === 'cast') this.onCast(world, e.ability);
      else if (e.type === 'damage') this.onImpact(world, e.targetId, e.ability, e.crit, e.toPlayer);
      else if (e.type === 'heal') {
        if (this.entityPos(world, e.targetId, this.tmp, 0.2)) this.bursts.burst(this.tmp, { count: 14, color: [0.4, 1, 0.5], core: [0.9, 1, 0.9], radius: 0.5, upward: true, gravity: 2, speed: [0.5, 1.5], life: [0.5, 0.9] });
      }
    }
  }

  private onCast(world: World, ability: string): void {
    const s = world.spell(ability);
    const p = world.player;
    const el = elementOf(world, ability);
    const col = this.fx.elements[el];
    const hand = this.hand(new Vector3());
    // Destello en la mano (o el arma) del lanzador.
    this.bursts.burst(hand, { count: Math.round(col.particles * 0.7), color: col.color, core: col.core, radius: 0.08, speed: [0.5, 2.2], size: [0.06, 0.18], life: [0.15, 0.35], gravity: 0 });
    const orb = MeshBuilder.CreateSphere('fxCastOrb', { diameter: 0.25, segments: 8 }, this.scene);
    orb.position.copyFrom(hand);
    this.flash(orb, this.mat(`orb:${el}`, col.core, 0.9), this.fx.castFlashSeconds, 2.4, 0.9);

    const aim = (s.castTime > 0 ? this.castingAim : null) ?? this.cursor() ?? { x: p.pos.x + Math.cos(p.facing), y: p.pos.y + Math.sin(p.facing) };
    const a = s.area;
    if (a.type === 'single') {
      if (s.projectileSpeed) {
        const target = p.lastTarget ?? p.attackTarget;
        if (target !== null) this.launch(hand, target, s.projectileSpeed, el);
      }
      return;
    }
    if (a.type === 'self') {
      // Sobre el lanzador: anillo de partículas que sube.
      const at = this.tmp.set(p.pos.x, this.ground.sample(p.pos.x, p.pos.y) + 0.1, p.pos.y);
      this.bursts.burst(at, { count: col.particles, color: col.color, core: col.core, radius: 0.7, upward: true, speed: [0.6, 1.8], gravity: 1.5, life: [0.5, 0.9], size: [0.08, 0.2] });
      const ring = MeshBuilder.CreateTorus('fxSelfRing', { diameter: 1.4, thickness: 0.06, tessellation: 32 }, this.scene);
      ring.position.copyFrom(at);
      this.flash(ring, this.mat(`ring:${el}`, col.color, 0.8), this.fx.areaFlashSeconds, 0.6, 0.8);
      return;
    }
    // Áreas con su forma real y su origen real.
    const shape: ShapeDef = a.type === 'circle' ? { type: 'circle', radius: a.radius } : a.type === 'cone' ? { type: 'cone', length: a.length, angleDeg: a.angleDeg } : { type: 'line', length: a.length, width: a.width };
    const origin = a.type === 'circle' && a.atTarget ? aim : p.pos;
    const dir = p.facing;
    const m = shapeMesh(this.scene, 'fxArea', shape);
    const node = new Node('fxAreaNode', this.scene);
    node.position.set(origin.x, this.ground.sample(origin.x, origin.y) + 0.08, origin.y);
    node.rotation.y = shape.type === 'cone' ? -(dir - (shape.angleDeg * Math.PI) / 360) : -dir;
    m.parent = node;
    m.material = this.mat(`area:${el}`, col.color, 0.55).clone('fxArea:i')!;
    this.flashes.push({ node, mesh: m, mat: m.material as StandardMaterial, ttl: this.fx.areaFlashSeconds, total: this.fx.areaFlashSeconds, grow: 0.12, alpha: 0.55 });
    // Partículas repartidas por la forma.
    for (const pt of samplesOf(shape, origin, dir)) {
      this.bursts.burst(this.tmp.set(pt.x, this.ground.sample(pt.x, pt.y) + 0.15, pt.y), {
        count: Math.max(3, Math.round(col.particles / 4)), color: col.color, core: col.core, radius: 0.35, speed: [0.5, 2], gravity: el === 'fire' || el === 'storm' ? 1.5 : -1.5, life: [0.3, 0.6],
      });
    }
    if (a.type === 'line' && this.fx.lineProjectiles.includes(ability)) {
      const from = hand.clone();
      const to = new Vector3(p.pos.x + Math.cos(dir) * a.length, 0, p.pos.y + Math.sin(dir) * a.length);
      to.y = this.ground.sample(to.x, to.z) + 1;
      this.launchLine(from, to, el);
    }
  }

  private projectileMesh(el: Element, elongated: boolean): Mesh {
    const col = this.fx.elements[el];
    const size = this.fx.projectileSize;
    const m = elongated
      ? MeshBuilder.CreateCylinder('fxLance', { height: size * 7, diameterTop: 0, diameterBottom: size * 1.2, tessellation: 6 }, this.scene)
      : el === 'storm'
        ? MeshBuilder.CreateIcoSphere('fxBolt', { radius: size * 0.7, subdivisions: 1 }, this.scene)
        : MeshBuilder.CreateSphere('fxBolt', { diameter: size, segments: 8 }, this.scene);
    m.material = this.mat(`core:${el}`, col.core, 1);
    m.isPickable = false;
    return m;
  }

  private launch(from: Vector3, targetId: number, speed: number, el: Element): void {
    const col = this.fx.elements[el];
    const mesh = this.projectileMesh(el, false);
    mesh.position.copyFrom(from);
    const t = trail(this.scene, 'fxTrail', mesh, { rate: 90, count: 0, color: col.color, core: col.core, radius: 0.05, speed: [0.05, 0.3], size: [0.08, 0.2], life: [0.15, 0.35], gravity: 0 });
    this.projectiles.push({ mesh, trail: t, targetId, speed, element: el, jitter: el === 'storm' ? 0.12 : 0 });
  }

  private launchLine(from: Vector3, to: Vector3, el: Element): void {
    const col = this.fx.elements[el];
    const mesh = this.projectileMesh(el, true);
    mesh.position.copyFrom(from);
    // El cono nace a lo largo de Y: se tumba hacia la dirección de vuelo.
    const d = to.subtract(from);
    mesh.rotation.set(Math.PI / 2, Math.atan2(d.x, d.z), 0);
    const t = trail(this.scene, 'fxTrail', mesh, { rate: 140, count: 0, color: col.color, core: col.core, radius: 0.1, speed: [0.1, 0.6], size: [0.1, 0.25], life: [0.2, 0.5], gravity: -0.5 });
    this.projectiles.push({ mesh, trail: t, targetId: -1, speed: 0, element: el, jitter: 0, line: { from, to, t: 0, total: this.fx.lineSweepSeconds } });
  }

  private onImpact(world: World, targetId: number, ability: string | null, crit: boolean, toPlayer: boolean): void {
    if (!this.entityPos(world, targetId, this.tmp, 1)) return;
    const el = toPlayer && ability === null ? 'physical' : elementOf(world, ability);
    const col = this.fx.elements[el];
    const n = Math.round(col.particles * (crit ? 1.6 : 1) * (ability?.startsWith('status:') ? 0.35 : 1));
    this.bursts.burst(this.tmp, { count: n, color: toPlayer && ability === null ? [1, 0.3, 0.25] : col.color, core: col.core, radius: 0.2, speed: [1.5, crit ? 5 : 3.5], gravity: -4, life: [0.2, 0.45] });
  }

  sync(world: World, frameSeconds: number): void {
    this.time += frameSeconds;
    if (world.player.casting) this.castingAim = world.player.casting.aim;

    this.flashes = this.flashes.filter((f) => {
      f.ttl -= frameSeconds;
      const k = 1 - Math.max(0, f.ttl) / f.total;
      f.node.scaling.setAll(1 + f.grow * k);
      f.mat.alpha = f.alpha * (1 - k);
      if (f.ttl > 0) return true;
      f.mat.dispose();
      f.node.dispose(false, false);
      return false;
    });

    this.projectiles = this.projectiles.filter((pr) => {
      let done = false;
      if (pr.line) {
        pr.line.t += frameSeconds;
        const k = Math.min(1, pr.line.t / pr.line.total);
        Vector3.LerpToRef(pr.line.from, pr.line.to, k, pr.mesh.position);
        done = k >= 1;
      } else if (!this.entityPos(world, pr.targetId, this.tmp, 1)) {
        done = true; // el objetivo ya no existe
      } else {
        const d = this.tmp.subtract(pr.mesh.position);
        const len = d.length();
        const step = pr.speed * frameSeconds;
        if (len <= step + 0.3) done = true;
        else pr.mesh.position.addInPlace(d.scaleInPlace(step / len));
        if (pr.jitter > 0) pr.mesh.position.addInPlaceFromFloats((Math.random() - 0.5) * pr.jitter, (Math.random() - 0.5) * pr.jitter, (Math.random() - 0.5) * pr.jitter);
        pr.mesh.rotation.y += frameSeconds * 12;
      }
      if (!done) return true;
      retire(pr.trail);
      pr.trail.emitter = pr.mesh.position.clone();
      pr.mesh.dispose();
      return false;
    });

    this.syncZones(world);
  }

  private syncZones(world: World): void {
    const seen = new Set<number>();
    for (const z of world.zones) {
      seen.add(z.id);
      let v = this.zones.get(z.id);
      const y = this.ground.sample(z.pos.x, z.pos.y);
      if (!v) {
        const el = elementOf(world, z.tag);
        const col = this.fx.elements[el];
        const disc = MeshBuilder.CreateDisc(`fxZone${z.id}`, { radius: z.radius, tessellation: 40 }, this.scene);
        disc.rotation.x = Math.PI / 2;
        const mat = this.mat(`zone:${el}`, col.color, 0.25).clone(`fxZone${z.id}:mat`)!;
        disc.material = mat;
        disc.isPickable = false;
        const ring = MeshBuilder.CreateTorus(`fxZoneRing${z.id}`, { diameter: z.radius * 2, thickness: 0.07, tessellation: 48 }, this.scene);
        ring.material = this.mat(`ring:${el}`, col.color, 0.8);
        ring.isPickable = false;
        const emitter = new Vector3(z.pos.x, y + 0.1, z.pos.y);
        const sparks = trail(this.scene, `fxZoneSparks${z.id}`, emitter, { rate: 40, count: 0, color: col.color, core: col.core, radius: z.radius * 0.9, upward: true, speed: [0.3, 1.5], size: [0.06, 0.16], life: [0.2, 0.5], gravity: 1 });
        v = { disc, ring, mat, sparks, emitter };
        this.zones.set(z.id, v);
      }
      v.disc.position.set(z.pos.x, y + 0.06, z.pos.y);
      v.ring.position.set(z.pos.x, y + 0.08, z.pos.y);
      v.mat.alpha = 0.18 + 0.1 * Math.sin(this.time * 9 + z.id);
    }
    for (const [id, v] of this.zones) {
      if (seen.has(id)) continue;
      retire(v.sparks);
      v.disc.dispose();
      v.ring.dispose();
      v.mat.dispose();
      this.zones.delete(id);
    }
  }

  reset(): void {
    for (const f of this.flashes) f.node.dispose(false, false);
    for (const p of this.projectiles) {
      p.trail.dispose();
      p.mesh.dispose();
    }
    this.flashes = [];
    this.projectiles = [];
    for (const v of this.zones.values()) {
      v.sparks.dispose();
      v.disc.dispose();
      v.ring.dispose();
    }
    this.zones.clear();
  }
}

/** Puntos de muestra dentro de una forma (para repartir partículas). */
function samplesOf(shape: ShapeDef, origin: Vec2, dir: number): Vec2[] {
  const out: Vec2[] = [];
  const c = Math.cos(dir);
  const s = Math.sin(dir);
  const at = (fwd: number, side: number): Vec2 => ({ x: origin.x + c * fwd - s * side, y: origin.y + s * fwd + c * side });
  if (shape.type === 'circle') {
    out.push(origin);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      out.push({ x: origin.x + Math.cos(a) * shape.radius * 0.65, y: origin.y + Math.sin(a) * shape.radius * 0.65 });
    }
  } else if (shape.type === 'cone') {
    const half = (shape.angleDeg * Math.PI) / 360;
    for (const f of [0.35, 0.7, 0.95]) for (const k of [-0.7, 0, 0.7]) out.push(at(shape.length * f * Math.cos(half * k), shape.length * f * Math.sin(half * k)));
  } else {
    for (const f of [0.15, 0.35, 0.55, 0.75, 0.95]) out.push(at(shape.length * f, 0));
  }
  return out;
}
