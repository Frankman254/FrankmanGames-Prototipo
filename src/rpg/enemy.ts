// Enemigo como actor RPG: envuelve el cuerpo de la simulación
// (`src/sim/enemies.ts`, máquina de estados y avisos) y le añade nombre,
// nivel, XP, botín, estadísticas y estados. Con zonas el nivel es el del
// monstruo (no el base de la ficha) y trae sus estadísticas y su recompensa.
import { Actor } from './actor';
import type { EnemyInfoDef, StatBlock } from './contracts';
import type { RpgContent } from './content';
import { blockToMods } from './stats';
import type { Vec2 } from '../sim/vec2';

/** Lo que el actor necesita del enemigo de la simulación. */
export interface EnemyBody {
  id: number;
  pos: Vec2;
  health: number;
  /** Nivel del monstruo (el de la ficha si no hay zonas). */
  level?: number;
  def: { id: string; maxHealth: number; speed: number };
}

/** Lo que cambia por estar a otro nivel que el base (ver `src/sim/zones.ts`). */
export interface EnemyLevelScale {
  stats: StatBlock;
  xp: number;
  gold: number;
  extraRolls: number;
}

export class EnemyActor extends Actor {
  readonly team = 'enemy';
  readonly info: EnemyInfoDef;
  /** XP y botín ya entregados (una sola vez por muerte). */
  rewarded = false;
  readonly level: number;
  /** XP al morir, ya escalada por nivel. */
  readonly xp: number;
  /** Multiplicador de las monedas y tiradas de objeto de más. */
  readonly goldScale: number;
  readonly extraLootRolls: number;

  /**
   * `onDamage` aplica el daño en la simulación (aturdimiento por golpe fuerte,
   * muerte y suceso `enemyDeath`).
   */
  constructor(content: RpgContent, readonly body: EnemyBody, private readonly onDamage: (amount: number) => void, scale: EnemyLevelScale | null = null) {
    super();
    const info = content.enemies[body.def.id];
    if (!info) throw new Error(`enemigo sin ficha RPG: ${body.def.id}`);
    this.info = info;
    this.id = body.id;
    this.level = body.level ?? info.level;
    this.xp = Math.round(info.xp * (scale?.xp ?? 1));
    this.goldScale = scale?.gold ?? 1;
    this.extraLootRolls = scale?.extraRolls ?? 0;
    if (scale) this.stats.set('level', blockToMods(scale.stats));
    this.stats.set('base', [
      { stat: 'maxHealth', op: 'flat', value: body.def.maxHealth },
      { stat: 'moveSpeed', op: 'flat', value: body.def.speed },
      ...blockToMods(info.stats),
    ]);
  }

  get name(): string {
    return this.info.name;
  }

  get pos(): Vec2 {
    return this.body.pos;
  }

  get health(): number {
    return this.body.health;
  }

  set health(v: number) {
    this.body.health = v;
  }

  protected override loseHealth(amount: number): void {
    this.onDamage(amount);
  }
}
