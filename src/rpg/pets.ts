// Mascotas y aliados invocados. `Pet` es un actor que sigue a su dueño; lo
// que hace además lo decide su `PetBehavior` (registro por nombre en datos).
// Las mascotas todavía no reciben golpes: los enemigos sólo apuntan al jugador.
import type { Rng } from '../sim/rng';
import { copy, dist, type Vec2 } from '../sim/vec2';
import { Actor } from './actor';
import type { PetDef } from './contracts';
import type { RpgContent } from './content';
import { createEffect, type Effect } from './effects';
import { blockToMods } from './stats';

/** Lo que una conducta puede pedir al mundo. */
export interface PetWorld {
  readonly rng: Rng;
  readonly owner: Actor;
  /** Enemigo vivo más cercano a `from` dentro de `radius`. */
  nearestEnemy(from: Vec2, radius: number): Actor | null;
  /** Botín más cercano a `from` dentro de `radius`. */
  nearestLoot(from: Vec2, radius: number): { id: number; pos: Vec2 } | null;
  /** Recoge un botín del suelo para el dueño. */
  collectLoot(lootId: number): void;
  /** Golpe de la mascota (tirada de su ataque por la tubería de daño). */
  petAttack(pet: Pet, target: Actor): void;
  /** Aplica un efecto de la mascota sobre `target`. */
  petEffect(pet: Pet, effect: Effect, target: Actor): void;
  /** Mueve la mascota hacia `to` (con rodeo si hay paredes). */
  moveTowards(pet: Pet, to: Vec2, dt: number): void;
}

export abstract class PetBehavior {
  abstract tick(pet: Pet, world: PetWorld, dt: number): void;

  /** Seguir al dueño a `followDistance`; se aleja demasiado → aparece a su lado. */
  protected follow(pet: Pet, world: PetWorld, dt: number): void {
    const o = world.owner.pos;
    const d = dist(pet.pos, o);
    if (d > TELEPORT_DISTANCE) {
      pet.pos = { x: o.x + 0.8, y: o.y + 0.8 };
      pet.path = [];
      return;
    }
    if (d > pet.def.followDistance) world.moveTowards(pet, o, dt);
    else pet.path = [];
  }
}

const TELEPORT_DISTANCE = 25;

/** Lucha: ataca al enemigo más cercano al dueño dentro de su alcance. */
export class FighterBehavior extends PetBehavior {
  tick(pet: Pet, world: PetWorld, dt: number): void {
    const a = pet.def.attack!;
    const target = world.nearestEnemy(world.owner.pos, pet.def.reach ?? 8);
    if (!target) return this.follow(pet, world, dt);
    const edge = dist(pet.pos, target.pos) - pet.radius - 0.5;
    if (edge > a.range) {
      world.moveTowards(pet, target.pos, dt);
      return;
    }
    pet.path = [];
    pet.facing = Math.atan2(target.pos.y - pet.pos.y, target.pos.x - pet.pos.x);
    if (pet.attackCooldown <= 0) {
      world.petAttack(pet, target);
      pet.attackCooldown = a.cooldown;
    }
  }
}

/** Recoge: va a por el botín cercano al dueño y se lo da. */
export class CollectorBehavior extends PetBehavior {
  tick(pet: Pet, world: PetWorld, dt: number): void {
    const loot = world.nearestLoot(world.owner.pos, pet.def.reach ?? 8);
    if (!loot) return this.follow(pet, world, dt);
    if (dist(pet.pos, loot.pos) <= COLLECT_REACH) {
      world.collectLoot(loot.id);
      return;
    }
    world.moveTowards(pet, loot.pos, dt);
  }
}

const COLLECT_REACH = 0.8;

/** Protege: sigue al dueño y le aplica su aura cada `aura.every` s. */
export class GuardianBehavior extends PetBehavior {
  tick(pet: Pet, world: PetWorld, dt: number): void {
    this.follow(pet, world, dt);
    const aura = pet.def.aura!;
    pet.auraTimer += dt;
    if (pet.auraTimer >= aura.every) {
      pet.auraTimer -= aura.every;
      if (pet.auraEffect && world.owner.alive) world.petEffect(pet, pet.auraEffect, world.owner);
    }
  }
}

/** Registro conducta → clase (`PetDef.behavior`). */
export const PET_BEHAVIORS: Record<PetDef['behavior'], () => PetBehavior> = {
  fighter: () => new FighterBehavior(),
  collector: () => new CollectorBehavior(),
  guardian: () => new GuardianBehavior(),
};

export class Pet extends Actor {
  readonly team = 'player';
  readonly behavior: PetBehavior;
  readonly auraEffect: Effect | null;
  pos: Vec2;
  prevPos: Vec2;
  readonly radius = 0.35;
  facing = 0;
  path: Vec2[] = [];
  attackCooldown = 0;
  auraTimer = 0;
  private _health: number;

  /**
   * `itemUid`: amuleto que la invoca (mascota del jugador) o null (aliado de
   * un hechizo, que desaparece al acabarse `ttl`).
   */
  constructor(content: RpgContent, readonly def: PetDef, pos: Vec2, readonly itemUid: string | null, public ttl: number | null) {
    super();
    this.behavior = PET_BEHAVIORS[def.behavior]();
    this.auraEffect = def.aura ? createEffect(def.aura.effect, content) : null;
    this.pos = copy(pos);
    this.prevPos = copy(pos);
    this.stats.set('base', [...blockToMods({ maxHealth: def.maxHealth ?? 50, moveSpeed: def.speed })]);
    this._health = this.maxHealth;
  }

  get name(): string {
    return this.def.name;
  }

  get speed(): number {
    return this.stats.get('moveSpeed');
  }

  get health(): number {
    return this._health;
  }

  set health(v: number) {
    this._health = v;
  }

  tick(world: PetWorld, dt: number): void {
    this.prevPos = copy(this.pos);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    if (this.ttl !== null) this.ttl -= dt;
    this.behavior.tick(this, world, dt);
  }

  get expired(): boolean {
    return this.ttl !== null && this.ttl <= 0;
  }
}
