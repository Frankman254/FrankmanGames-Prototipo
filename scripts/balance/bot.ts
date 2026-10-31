// Bot jugador para medir el equilibrio. Juega con las mismas órdenes que el
// ratón y el teclado (`World.command*`, `GameSession.quickUse`), una decisión
// por tick antes de `world.tick`:
//   1. Avisos: al empezar un aviso enemigo decide UNA vez, con probabilidad
//      `dodge`, si lo va a esquivar; tras `reactionSeconds` sale del área
//      andando si le da tiempo o con la evasión (Espacio) si no.
//   2. Pociones con poca vida y tónicos con poco recurso (Q/E).
//   3. Rotación: de los 6 huecos de la barra, el que más valga ahora mismo
//      (daño esperado × objetivos, defensas cuando hacen falta…). Si no hay
//      ninguno listo, ataque básico al objetivo.
//   4. Clase a distancia: cuando un cuerpo a cuerpo se le echa encima decide,
//      con la misma probabilidad `dodge`, si se aparta (kiting) o se queda.
// La rotación se deduce de las definiciones de los hechizos, no de sus ids:
// sirve para cualquier hechizo que se ponga en la barra (ablaciones, universales).
import type { Character } from '../../src/rpg/character';
import type { EffectDef, SpellDef } from '../../src/rpg/contracts';
import type { GameSession } from '../../src/rpg/session';
import type { Enemy } from '../../src/sim/enemies';
import { Rng } from '../../src/sim/rng';
import { shapeHitsCircle, type PlacedShape } from '../../src/sim/shapes';
import type { CompiledSpell } from '../../src/rpg/spells';
import { clamp, dist, type Vec2 } from '../../src/sim/vec2';
import type { Aim, World } from '../../src/sim/world';
import { isMelee } from './gear';

export interface BotOptions {
  /** Probabilidad de intentar esquivar cada aviso (0 malo, 0,5 medio, 0,9 bueno). */
  dodge: number;
  /** Tiempo de reacción ante un aviso (s). */
  reactionSeconds?: number;
  /** Fracción de vida por debajo de la cual bebe. */
  potionAt?: number;
  /** Fracción de recurso por debajo de la cual toma un tónico (en combate). */
  tonicAt?: number;
  /** Segundos entre órdenes que no son esquivar (cadencia de una persona; 0 = cada tick). */
  actionSeconds?: number;
  /** Semilla de las decisiones del bot (aparte del RNG del mundo). */
  seed: number;
}

export interface BotCounters {
  /** Pociones de vida y tónicos bebidos. */
  potions: number;
  tonics: number;
  /** Avisos de daño cuya área cubría al jugador al empezar. */
  threats: number;
  /** De esos, cuántos decidió esquivar. */
  dodgeTries: number;
  /** Evasiones usadas (Espacio). */
  evades: number;
  /** Decisiones en combate fuera del GCD, y en cuántas había un hechizo listo salvo por el recurso. */
  decisions: number;
  starved: number;
}

interface Threat {
  enemyId: number;
  shape: PlacedShape;
  /** Segundos que dura el aviso entero. */
  endsAt: number;
  dodge: boolean;
  reactAt: number;
}

/** Margen extra (m) que el bot deja con el borde de un área. */
const SAFE_MARGIN = 0.35;
/** Distancia (entre bordes) a la que la clase a distancia empieza a apartarse. */
const KITE_TRIGGER = 2.5;
const DIRS = 16;

export class PlayerBot {
  readonly counters: BotCounters = { potions: 0, tonics: 0, threats: 0, dodgeTries: 0, evades: 0, decisions: 0, starved: 0 };
  readonly melee: boolean;
  private readonly rng: Rng;
  private readonly threats = new Map<number, Threat>();
  private readonly reaction: number;
  private readonly potionAt: number;
  private readonly tonicAt: number;
  /** El bot está saliendo de un área: no da otras órdenes de movimiento. */
  private escaping = false;
  private kiting = false;
  /** Decisión de apartarse tomada para la amenaza cuerpo a cuerpo en curso (null = sin amenaza). */
  private kiteChoice: boolean | null = null;
  private nextAction = 0;
  target: number | null = null;

  constructor(
    readonly world: World,
    readonly session: GameSession,
    readonly opts: BotOptions,
  ) {
    this.melee = isMelee(session.character);
    this.rng = new Rng(opts.seed);
    this.reaction = opts.reactionSeconds ?? 0.3;
    this.potionAt = opts.potionAt ?? 0.35;
    this.tonicAt = opts.tonicAt ?? 0.15;
  }

  private get ch(): Character {
    return this.session.character;
  }

  /** Una decisión. Llamar antes de cada `world.tick`. */
  think(): void {
    const w = this.world;
    const p = w.player;
    if (!p.alive) return;
    this.trackThreats();
    this.drink();
    if (p.casting) return;
    const danger = this.dodge();
    if (w.time < this.nextAction) return;
    this.nextAction = w.time + (this.opts.actionSeconds ?? 0.1);
    const t = this.pickTarget();
    if (t && this.inCombat()) this.countStarved();
    if (!t) {
      if (!danger) this.idle();
      return;
    }
    if (danger) {
      // A salvo pero esperando a que acabe el aviso: sólo lo que no le mueve.
      if (p.path.length > 0) return;
      if (this.castBest(t, false)) return;
      if (w.inRange(w.basicAttack(), t.id) && p.attackTarget !== t.id) w.commandAttack(t.id);
      return;
    }
    if (!this.melee) {
      const near = this.meleeThreat(KITE_TRIGGER);
      if (near) {
        this.kiteChoice ??= this.rng.chance(this.opts.dodge);
        if (this.kiteChoice) {
          if (this.castBest(t, true, true)) return;
          if (this.kite()) return;
        }
      } else {
        this.kiting = false;
        this.kiteChoice = null;
      }
    }
    if (this.castBest(t, true)) return;
    if (p.attackTarget !== t.id) w.commandAttack(t.id);
  }

  // ─── Avisos ────────────────────────────────────────────────────────────────

  private trackThreats(): void {
    const w = this.world;
    const p = w.player;
    for (const e of w.enemies.list) {
      const live = e.state === 'telegraph' && e.telegraph !== null && e.def.attack.effect === 'damage';
      if (!live) {
        this.threats.delete(e.id);
        continue;
      }
      if (this.threats.has(e.id)) continue;
      const shape = e.telegraph!;
      const aimed = shapeHitsCircle(shape, p.pos, p.radius);
      const dodge = aimed && this.rng.chance(this.opts.dodge);
      if (aimed) this.counters.threats++;
      if (dodge) this.counters.dodgeTries++;
      this.threats.set(e.id, {
        enemyId: e.id,
        shape,
        endsAt: w.time + e.def.attack.telegraphSeconds - e.stateTime,
        dodge,
        reactAt: w.time + this.reaction * this.rng.range(0.8, 1.2),
      });
    }
  }

  /** ¿Toca alguna área activa a un círculo en `q`? */
  private unsafe(q: Vec2, margin = SAFE_MARGIN): boolean {
    const r = this.world.player.radius + margin;
    for (const t of this.threats.values()) if (shapeHitsCircle(t.shape, q, r)) return true;
    return false;
  }

  /** Sale de las áreas que decidió esquivar. Devuelve true mientras siga habiendo un aviso esquivado en curso. */
  private dodge(): boolean {
    const w = this.world;
    const p = w.player;
    let active = false;
    let soonest = Infinity;
    for (const t of this.threats.values()) {
      if (!t.dodge || w.time < t.reactAt) continue;
      active = true;
      if (shapeHitsCircle(t.shape, p.pos, p.radius + SAFE_MARGIN * 0.5)) soonest = Math.min(soonest, t.endsAt - w.time);
    }
    if (!active) {
      this.escaping = false;
      return false;
    }
    if (soonest === Infinity) return true; // fuera de todas: esperar
    if (this.escaping && p.path.length > 0) return true; // ya va saliendo
    const ctl = this.ch.control;
    if (ctl === 'stun' || ctl === 'root') return true;
    const walk = this.escapePoint(false);
    const speed = Math.max(0.1, p.speed);
    if (walk && dist(p.pos, walk) / speed + 0.05 < soonest) {
      w.commandMove(walk);
      this.escaping = true;
      return true;
    }
    // Combate v2: no hay evasión genérica; si andando no da tiempo, se anda igual (los hechizos de desplazamiento los usa la barra).
    if (walk) {
      w.commandMove(walk);
      this.escaping = true;
    }
    return true;
  }

  /** Punto seguro más cercano andando. Prefiere quedarse a distancia de combate del objetivo. */
  private escapePoint(evade: boolean): Vec2 | null {
    const w = this.world;
    const p = w.player;
    const z = w.data.zone;
    const t = this.target !== null ? w.enemies.get(this.target) : undefined;
    const want = this.melee ? 2 : 7;
    const lengths = evade ? [4.5] : [1, 1.75, 2.5, 3.25, 4];
    let best: Vec2 | null = null;
    let bestCost = Infinity;
    for (const len of lengths) {
      for (let i = 0; i < DIRS; i++) {
        const a = (i / DIRS) * Math.PI * 2;
        const q = { x: clamp(p.pos.x + Math.cos(a) * len, 1, z.width - 1), y: clamp(p.pos.y + Math.sin(a) * len, 1, z.depth - 1) };
        if (!w.grid.walkable(q) || !w.grid.lineOfSight(p.pos, q) || this.unsafe(q)) continue;
        let cost = len;
        if (t && t.state !== 'dead') cost += 0.4 * Math.abs(dist(q, t.pos) - want);
        if (cost < bestCost) {
          bestCost = cost;
          best = q;
        }
      }
      if (best && !evade) break; // la distancia más corta que sirve
    }
    return best;
  }

  // ─── Consumibles ───────────────────────────────────────────────────────────

  private drink(): void {
    const ch = this.ch;
    if (ch.health / ch.maxHealth < this.potionAt && this.session.quickUse('health').ok) this.counters.potions++;
    if (ch.maxResource > 0 && ch.resource / ch.maxResource < this.tonicAt && this.inCombat() && this.session.quickUse('resource').ok) this.counters.tonics++;
  }

  // ─── Objetivo y movimiento ─────────────────────────────────────────────────

  private alive(id: number | null): Enemy | undefined {
    const e = id === null ? undefined : this.world.enemies.get(id);
    return e && e.state !== 'dead' ? e : undefined;
  }

  /** Mantiene el objetivo mientras viva; si no, el enemigo vivo más cercano (los despiertos primero). */
  private pickTarget(): Enemy | undefined {
    const cur = this.alive(this.target);
    if (cur) return cur;
    const p = this.world.player;
    let best: Enemy | undefined;
    let bd = Infinity;
    for (const e of this.world.enemies.list) {
      if (e.state === 'dead') continue;
      const d = dist(p.pos, e.pos) + (e.state === 'idle' ? 1000 : 0);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    this.target = best?.id ?? null;
    return best;
  }

  inCombat(): boolean {
    for (const e of this.world.enemies.list) if (e.state !== 'dead' && e.state !== 'idle') return true;
    return false;
  }

  private enemiesWithin(at: Vec2, radius: number): number {
    let n = 0;
    for (const e of this.world.enemies.list) if (e.state !== 'dead' && dist(at, e.pos) <= radius + e.radius) n++;
    return n;
  }

  /** Enemigo cuerpo a cuerpo libre (ni inmovilizado ni aturdido) a menos de `edge` m entre bordes. */
  private meleeThreat(edge: number): Enemy | undefined {
    const w = this.world;
    const p = w.player;
    for (const e of w.enemies.list) {
      if (e.state === 'dead' || e.def.attack.effect !== 'damage' || e.def.attack.range > 3) continue;
      const c = w.enemyActor(e).control;
      if (c === 'root' || c === 'stun') continue;
      if (dist(p.pos, e.pos) - p.radius - e.radius < edge) return e;
    }
    return undefined;
  }

  /** Punto a `len` m que más se aleja de los enemigos (para apartarse o teletransportarse). */
  private awayPoint(len: number): Vec2 | null {
    const w = this.world;
    const p = w.player;
    const z = w.data.zone;
    let best: Vec2 | null = null;
    let bestScore = -Infinity;
    for (let i = 0; i < DIRS; i++) {
      const a = (i / DIRS) * Math.PI * 2;
      const q = { x: p.pos.x + Math.cos(a) * len, y: p.pos.y + Math.sin(a) * len };
      if (q.x < 2 || q.y < 2 || q.x > z.width - 2 || q.y > z.depth - 2) continue;
      if (!w.grid.walkable(q) || !w.grid.lineOfSight(p.pos, q)) continue;
      let score = Infinity;
      for (const e of w.enemies.list) {
        if (e.state === 'dead') continue;
        const d = dist(q, e.pos) * (e.def.attack.range > 3 ? 2 : 1); // los de distancia importan menos
        score = Math.min(score, d);
      }
      // Que no le arrincone contra el borde.
      score -= 0.3 * Math.max(0, 8 - Math.min(q.x, q.y, z.width - q.x, z.depth - q.y));
      if (score > bestScore) {
        bestScore = score;
        best = q;
      }
    }
    return best;
  }

  private kite(): boolean {
    const p = this.world.player;
    if (this.kiting && p.path.length > 0) return true;
    const q = this.awayPoint(5);
    if (!q) return false;
    this.world.commandMove(q);
    this.kiting = true;
    return true;
  }

  /** Sin enemigos: recoge el botín más cercano. */
  private idle(): void {
    const w = this.world;
    const p = w.player;
    if (p.pickupTarget !== null || w.loot.length === 0) return;
    let best = w.loot[0]!;
    for (const l of w.loot) if (dist(p.pos, l.pos) < dist(p.pos, best.pos)) best = l;
    w.commandPickup(best.id);
  }

  /** ¿Hay algún hueco sin enfriamiento ni GCD que no se pueda pagar? */
  private countStarved(): void {
    const w = this.world;
    const p = w.player;
    if (p.gcd > 0) return;
    this.counters.decisions++;
    for (const id of this.ch.spellbook.hotbar) {
      if (!id) continue;
      const s = w.spell(id);
      if ((p.cooldowns[s.id] ?? 0) <= 0 && s.cost > p.resource) {
        this.counters.starved++;
        return;
      }
    }
  }

  // ─── Rotación ──────────────────────────────────────────────────────────────

  /**
   * Lanza el hueco que más valga ahora. `canMove` = puede lanzar hechizos que
   * le desplazan; `emergency` = sólo los que le quitan de encima a un cuerpo a cuerpo.
   */
  private castBest(t: Enemy, canMove: boolean, emergency = false): boolean {
    const w = this.world;
    const bar = this.ch.spellbook.hotbar;
    let best: { slot: number; aim: Aim; value: number } | null = null;
    for (let i = 0; i < bar.length; i++) {
      const id = bar[i];
      if (!id) continue;
      const s = w.spell(id);
      if (!s.def) continue;
      const plan = this.plan(s, s.def, t, canMove, emergency);
      if (!plan || plan.value <= 0) continue;
      const targetId = s.area.type === 'single' ? plan.aim.targetId : null;
      if (w.checkCast(s, targetId, plan.aim.point) !== null) continue;
      if (!best || plan.value > best.value) best = { slot: i, aim: plan.aim, value: plan.value };
    }
    if (!best) return false;
    return w.commandCastSlot(best.slot, best.aim) === null;
  }

  /** Daño medio de un efecto de daño con el rango del hechizo y la estadística principal. */
  private avgDamage(e: EffectDef, power: number): number {
    if (e.type === 'damage') {
      const main = this.ch.mainStat ? this.ch.stats.get(this.ch.mainStat) : 0;
      return ((e.min + e.max) / 2) * power + (e.scaling ?? 0) * main;
    }
    if (e.type === 'zone') return e.effects.reduce((a, x) => a + this.avgDamage(x, power), 0) * (e.duration / e.every);
    if (e.type === 'status') {
      const st = this.session.content.statuses[e.statusId];
      if (st?.kind === 'debuff' && st.tick) return this.avgDamage(st.tick.effect, 1) * ((e.duration ?? st.duration) / st.tick.every) * (e.chance ?? 1);
    }
    return 0;
  }

  private plan(s: CompiledSpell, def: SpellDef, t: Enemy, canMove: boolean, emergency: boolean): { aim: Aim; value: number } | null {
    const w = this.world;
    const p = w.player;
    const ch = this.ch;
    const effects = def.effects;
    const has = (type: EffectDef['type']): boolean => effects.some((e) => e.type === type);
    const statusOf = (e: EffectDef) => (e.type === 'status' ? this.session.content.statuses[e.statusId] : undefined);
    const fighting = this.inCombat() || dist(p.pos, t.pos) < 8;
    const hp = ch.health / ch.maxHealth;
    const self: Aim = { point: { ...p.pos }, targetId: null };
    const atTarget: Aim = { point: { ...t.pos }, targetId: t.id };
    const threat = !this.melee && this.meleeThreat(KITE_TRIGGER) !== undefined;
    const roots = effects.some((e) => {
      const c = statusOf(e)?.control;
      return c === 'root' || c === 'stun';
    });

    if (emergency) {
      // Sólo lo que quita de encima: teletransporte, inmovilizar o empujar.
      if (has('teleport') && canMove) {
        const tp = effects.find((e) => e.type === 'teleport');
        const q = this.awayPoint(tp?.type === 'teleport' ? tp.maxDistance : 8);
        return q ? { aim: { point: q, targetId: null }, value: 130 } : null;
      }
      if (def.area.type === 'circle' && !def.area.atTarget && roots && this.enemiesWithin(p.pos, def.area.radius) > 0) return { aim: self, value: 125 };
      if (has('knockback') && !has('dash') && def.area.type === 'cone') return { aim: atTarget, value: 90 };
      return null;
    }

    let dmg = 0;
    for (const e of effects) dmg += this.avgDamage(e, s.power);

    switch (def.area.type) {
      case 'self': {
        if (!fighting) return null;
        if (has('heal')) return hp < 0.5 ? { aim: self, value: 150 } : null;
        if (has('shield')) return !ch.statuses.has('shield') && (hp < 0.8 || this.enemiesWithin(p.pos, 3) >= 2) ? { aim: self, value: 120 } : null;
        if (has('teleport')) return null; // sólo en emergencia
        if (has('summon')) return { aim: self, value: 110 };
        const buff = effects.map(statusOf).find((st) => st?.kind === 'buff');
        if (buff) return !ch.statuses.has(buff.id) && this.enemiesWithin(p.pos, this.melee ? 4 : 9) > 0 ? { aim: self, value: 100 } : null;
        return null;
      }
      case 'single': {
        let value = dmg;
        // Un perjuicio periódico sobre quien ya lo tiene vale poco.
        for (const e of effects) {
          const st = statusOf(e);
          if (st?.tick && w.enemyActor(t).statuses.has(st.id)) value -= this.avgDamage(e, s.power) * 0.7;
        }
        return { aim: atTarget, value };
      }
      case 'circle': {
        const a = def.area;
        const centre = a.atTarget ? t.pos : p.pos;
        const n = this.enemiesWithin(centre, a.radius);
        if (n === 0) return null;
        let value = dmg * n * (has('zone') ? 0.7 : 1);
        if (roots && this.meleeThreat(2) && !this.melee) value += 60;
        return { aim: a.atTarget ? atTarget : self, value };
      }
      case 'cone':
      case 'line': {
        const dir = Math.atan2(t.pos.y - p.pos.y, t.pos.x - p.pos.x);
        const shape: PlacedShape = { def: def.area, origin: { ...p.pos }, dir };
        let n = 0;
        for (const e of w.enemies.list) if (e.state !== 'dead' && shapeHitsCircle(shape, e.pos, e.radius)) n++;
        if (n === 0) return null;
        if (has('dash')) {
          // Embestida: sólo para acercarse (clase cuerpo a cuerpo).
          const edge = dist(p.pos, t.pos) - p.radius - t.radius;
          if (!this.melee || !canMove || edge < 2 || edge > def.area.length) return null;
          return { aim: atTarget, value: dmg * n + 15 };
        }
        let value = dmg * n;
        if (has('knockback')) value += threat ? 40 : this.melee ? -dmg * n * 0.5 : 0;
        return { aim: atTarget, value };
      }
    }
  }
}
