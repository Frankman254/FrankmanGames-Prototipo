// Pesca (Slice 05): máquina de estados del sedal, extraída de `World`.
// El módulo es puro (sin DOM ni Babylon): recibe un `FishingHost` estrecho y
// guarda todo el estado de pesca. `World` sigue siendo quien orquesta (comandos,
// sueltas, bonificación) a través del puerto; el contrato externo no cambia.
import type { Rng } from './rng';
import type { Vec2 } from './vec2';
import { distSq } from './vec2';
import type { GameEvent } from './events';
import type { Player } from './world';
import type { Character } from '../rpg/character';
import type { ItemInstance } from '../rpg/contracts';
import type { FishingSpotDef, RpgContent } from '../rpg/content';
import { rollLoot } from '../rpg/progression';
import type { ShoalField } from './shoals';

/** Pesca en curso (Slice 05). */
export interface FishingState {
  spotId: string;
  /** Banco de peces en el que cayó el corcho (null si los datos no definen bancos). */
  shoalId: number | null;
  /** Dónde flota el corcho. */
  bobber: Vec2;
  state: 'waiting' | 'bite';
  biteAt: number;
  /** Amago: el corcho tiembla sin que pique (sacar ahí asusta al pez). */
  nibbleAt: number | null;
  /** Fin de la ventana para sacar el pez (sólo con `state === 'bite'`). */
  windowEnd: number;
}

/** Lo mínimo que `FishingManager` necesita de `World`. */
export interface FishingHost {
  readonly time: number;
  readonly night: boolean;
  readonly interior: boolean;
  readonly rng: Rng;
  readonly player: Player;
  readonly character: Character;
  readonly grid: { walkable(p: Vec2): boolean };
  readonly content: RpgContent;
  readonly shoals: ShoalField | null;
  walkTo(target: Vec2): void;
  pushEvent(e: GameEvent): void;
  dropLoot(pos: Vec2, inst: ItemInstance): void;
  stopGathering(): void;
  stopTalk(): void;
}

/**
 * Estado y transiciones de la pesca. El `World` construye un adaptador
 * (`makeFishingHost`) que reenvía al jugador, la rejilla, el RNG y el personaje;
 * así la lógica vive aquí y `World` sólo delega los cuatro puntos de entrada.
 */
export class FishingManager {
  fishing: FishingState | null = null;
  private pending: { spotId: string; point: Vec2; approaches: Vec2[] } | null = null;

  constructor(private readonly host: FishingHost) {}

  /** Estanque que contiene ese punto (agua), o null. */
  spotAt(point: Vec2): FishingSpotDef | null {
    if (this.host.interior) return null;
    for (const s of Object.values(this.host.content.fishing.spots)) {
      if (Math.hypot(point.x - s.x, point.y - s.y) <= s.radius) return s;
    }
    return null;
  }

  /** Distancia del jugador a la orilla de un estanque (0 o menos = dentro). */
  private shoreDistance(s: FishingSpotDef): number {
    const p = this.host.player.pos;
    return Math.hypot(p.x - s.x, p.y - s.y) - s.radius;
  }

  /** Puntos pisables alrededor del agua desde los que se llega a lanzar, del más cercano al jugador al más lejano. */
  private approaches(spot: FishingSpotDef): Vec2[] {
    const range = this.host.content.fishing.rules.castRange;
    const out: Vec2[] = [];
    for (const off of [1, 2, Math.max(2.5, range - 1)]) {
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const q = { x: spot.x + Math.cos(a) * (spot.radius + off), y: spot.y + Math.sin(a) * (spot.radius + off) };
        if (this.host.grid.walkable(q)) out.push(q);
      }
    }
    const p = this.host.player.pos;
    return out.sort((a, b) => distSq(a, p) - distSq(b, p));
  }

  /** Camina al siguiente punto de la orilla que tenga camino; false si no queda ninguno. */
  private walkToNextApproach(): boolean {
    const f = this.pending;
    if (!f) return false;
    const p = this.host.player;
    while (f.approaches.length > 0) {
      const q = f.approaches.shift()!;
      this.host.walkTo(q);
      if (p.path.length > 0) return true;
    }
    return false;
  }

  /**
   * Clic en el agua o tecla F. Sin pesca en curso: lanza el sedal (acercándose
   * a la orilla si hace falta); con el sedal en el agua: lo saca (bien si ha
   * picado, mal si no). `point` null = el estanque más cercano a tiro.
   * Devuelve true si la orden era de pesca.
   */
  command(point: Vec2 | null): boolean {
    const h = this.host;
    const p = h.player;
    if (h.character.spectral.active) return false;
    if (!p.alive) return false;
    if (this.fishing) {
      this.reel();
      return true;
    }
    if (h.interior) return false;
    const range = h.content.fishing.rules.castRange;
    let spot = point ? this.spotAt(point) : null;
    if (!point) {
      for (const s of Object.values(h.content.fishing.spots)) if (this.shoreDistance(s) <= range) spot = s;
    }
    if (!spot) return false;
    // Sólo se pesca en un banco: con clic, el que hay bajo el cursor; con tecla, el más cercano.
    let target = point ?? { x: spot.x, y: spot.y };
    if (h.shoals) {
      const shoal = point ? h.shoals.at(point) : h.shoals.nearest(spot.id, p.pos);
      if (!shoal) {
        h.pushEvent({ type: 'fishNoShoal' });
        h.character.emit({ type: 'message', text: 'Aquí no hay peces: busca los círculos en el agua' });
        return true;
      }
      target = { x: shoal.x, y: shoal.y };
    }
    p.attackTarget = null;
    p.pickupTarget = null;
    p.casting = null;
    h.stopTalk();
    h.stopGathering();
    if (this.shoreDistance(spot) <= range) {
      this.start(spot, target);
    } else {
      // Camina hasta la orilla: el punto pisable más cercano desde el que llega el sedal. Si el
      // camino a uno se corta, prueba el siguiente (F15: antes se quedaba sin llegar).
      const spots = this.approaches(spot);
      this.pending = { spotId: spot.id, point: target, approaches: spots };
      this.walkToNextApproach();
    }
    return true;
  }

  private start(spot: FishingSpotDef, target: Vec2): void {
    const h = this.host;
    const p = h.player;
    const r = h.content.fishing.rules;
    // El corcho cae dentro del agua, aunque el clic fuera junto a la orilla.
    let bx = target.x - spot.x;
    let by = target.y - spot.y;
    const bd = Math.hypot(bx, by);
    const maxR = spot.radius * 0.8;
    if (bd > maxR) {
      bx = (bx / bd) * maxR;
      by = (by / bd) * maxR;
    }
    const bobber = { x: spot.x + bx, y: spot.y + by };
    p.path = [];
    p.moveTarget = null;
    p.facing = Math.atan2(bobber.y - p.pos.y, bobber.x - p.pos.x);
    const wait = h.rng.range(r.biteSeconds.min, r.biteSeconds.max);
    const nibble = wait > 1.6 && h.rng.chance(r.nibbleChance) ? h.time + h.rng.range(0.8, wait - 0.8) : null;
    this.pending = null;
    this.fishing = { spotId: spot.id, shoalId: h.shoals?.at(bobber)?.id ?? null, bobber, state: 'waiting', biteAt: h.time + wait, nibbleAt: nibble, windowEnd: 0 };
    h.pushEvent({ type: 'fishCast', spotId: spot.id, x: bobber.x, y: bobber.y });
  }

  /** Sacar el sedal: premio si ha picado; si no, el pez se asusta. */
  private reel(): void {
    const h = this.host;
    const f = this.fishing;
    if (!f) return;
    this.fishing = null;
    if (f.state !== 'bite') {
      h.pushEvent({ type: 'fishEscape', reason: 'early' });
      h.character.emit({ type: 'message', text: 'Tiraste demasiado pronto: el pez se asustó' });
      return;
    }
    const spot = h.content.fishing.spots[f.spotId];
    const table = spot ? h.content.lootTables[h.night && spot.nightLootTable ? spot.nightLootTable : spot.lootTable] : undefined;
    if (!table) return;
    const drop = rollLoot(h.rng, h.content, table);
    if (drop.gold > 0) h.character.addGold(drop.gold);
    let itemId: string | null = null;
    for (const it of drop.items) {
      itemId ??= it.itemId;
      const inst = h.character.items.create(it.itemId, it.quantity);
      const left = h.character.pickUp(inst);
      if (left > 0) h.dropLoot(h.player.pos, inst);
    }
    if (f.shoalId !== null) h.shoals?.consume(f.shoalId);
    h.character.gainProfessionXp('fisher', h.content.professions.rules.fishingXp);
    h.pushEvent({ type: 'fishCatch', itemId, gold: drop.gold });
    h.character.emit({ type: 'fished', itemId });
  }

  /** Recoge el sedal sin premio (moverse, atacar, lanzar, evadir, morir). */
  stop(): void {
    this.host.stopGathering();
    this.pending = null;
    if (!this.fishing) return;
    this.fishing = null;
    this.host.pushEvent({ type: 'fishStop' });
  }

  tick(dt: number): void {
    const h = this.host;
    h.shoals?.tick(dt);
    if (this.pending) {
      const spot = h.content.fishing.spots[this.pending.spotId];
      if (!spot || !h.player.alive) this.pending = null;
      else if (this.shoreDistance(spot) <= h.content.fishing.rules.castRange) this.start(spot, this.pending.point);
      else if (h.player.path.length === 0 && !this.walkToNextApproach()) this.pending = null; // ningún punto de la orilla alcanzable
    }
    const f = this.fishing;
    if (!f) return;
    if (f.state === 'waiting') {
      if (f.nibbleAt !== null && h.time >= f.nibbleAt) {
        f.nibbleAt = null;
        h.pushEvent({ type: 'fishNibble' });
      }
      if (h.time >= f.biteAt) {
        f.state = 'bite';
        f.windowEnd = h.time + h.content.fishing.rules.reactSeconds;
        h.pushEvent({ type: 'fishBite' });
        h.character.emit({ type: 'message', text: '¡Pica! Haz clic' });
      }
    } else if (h.time > f.windowEnd) {
      this.fishing = null;
      h.pushEvent({ type: 'fishEscape', reason: 'late' });
      h.character.emit({ type: 'message', text: 'Se escapó…' });
    }
  }
}
