// Recursos del mapa: árboles, vetas y plantas. Se colocan con una semilla fija
// para que el bosque sea el mismo en cada partida; al recogerlos se agotan y
// vuelven pasado un rato. Puro: sin DOM ni render. Usa su propio generador para
// no alterar la secuencia del resto de la simulación.
// La máquina de órdenes (clic en el recurso -> andar -> recoger) está abajo,
// en `GatherManager`, con el mismo patrón de puerto que la pesca y las trampas.
import type { Character } from '../rpg/character';
import type { RpgContent } from '../rpg/content';
import type { ItemInstance } from '../rpg/contracts';
import { rewardXp } from '../rpg/progression';
import type { GameEvent } from './events';
import { Rng } from './rng';
import type { Player } from './world';
import { dist, type Vec2 } from './vec2';

export interface GatherNodeRules {
  itemId: string;
  min: number;
  max: number;
  respawnSeconds: number;
}

/** Metros entre un recurso de oficio y el borde de un camino (F12). */
export const GATHER_PATH_CLEARANCE = 1.5;

export interface GatherGrove {
  node: string;
  x: number;
  y: number;
  radius: number;
  count: number;
}

export interface GatherNode {
  id: number;
  kind: string;
  x: number;
  y: number;
  /** Segundos que faltan para que vuelva; 0 = disponible. */
  respawn: number;
}

const PLACEMENT_SEED = 0x6a7e;

export class GatherField {
  readonly nodes: GatherNode[] = [];
  private readonly rng: Rng;

  constructor(
    groves: readonly GatherGrove[],
    private readonly rules: Readonly<Record<string, GatherNodeRules>>,
    walkable: (p: Vec2) => boolean,
    seed: number,
  ) {
    this.rng = new Rng(seed ^ 0x9a7);
    const place = new Rng(PLACEMENT_SEED);
    for (const g of groves) {
      for (let i = 0; i < g.count; i++) {
        for (let tries = 0; tries < 24; tries++) {
          const a = place.next() * Math.PI * 2;
          const r = Math.sqrt(place.next()) * g.radius;
          const p = { x: g.x + Math.cos(a) * r, y: g.y + Math.sin(a) * r };
          if (!walkable(p) || this.nodes.some((n) => Math.hypot(n.x - p.x, n.y - p.y) < 2.5)) continue;
          this.nodes.push({ id: this.nodes.length + 1, kind: g.node, x: p.x, y: p.y, respawn: 0 });
          break;
        }
      }
    }
  }

  tick(dt: number): void {
    for (const n of this.nodes) if (n.respawn > 0) n.respawn = Math.max(0, n.respawn - dt);
  }

  byId(id: number): GatherNode | null {
    return this.nodes.find((n) => n.id === id) ?? null;
  }

  /** Recoge un recurso disponible: lo agota y dice qué da. */
  harvest(id: number): { itemId: string; quantity: number } | null {
    const n = this.byId(id);
    const r = n ? this.rules[n.kind] : undefined;
    if (!n || !r || n.respawn > 0) return null;
    n.respawn = r.respawnSeconds;
    return { itemId: r.itemId, quantity: this.rng.int(r.min, r.max) };
  }
}

/** Recogida en curso (ida al recurso y cronómetro del golpe de hacha). */
export interface GatheringState {
  nodeId: number;
  elapsed: number;
  duration: number;
}

/** Lo mínimo que `GatherManager` necesita de `World`. */
export interface GatherHost {
  readonly interior: boolean;
  readonly player: Player;
  readonly character: Character;
  readonly content: RpgContent;
  /** Árboles, vetas y plantas (null en interiores). */
  field(): GatherField | null;
  walkTo(target: Vec2): void;
  pushEvent(e: GameEvent): void;
  dropLoot(pos: Vec2, inst: ItemInstance): void;
  stopFishing(): void;
  stopTalk(): void;
}

/**
 * Órdenes de recogida: `World` construye el campo, el personaje y el botín;
 * aquí vive el viaje al nodo, el temporizador y el agotamiento. `World` sólo
 * delega `commandGather`, `stopGathering`, `nearStation` y el tick.
 */
export class GatherManager {
  gathering: GatheringState | null = null;
  private target: number | null = null;

  constructor(private readonly host: GatherHost) {}

  /** Ir a un recurso del mapa y recogerlo. false si no se puede recoger ahora. */
  command(nodeId: number): boolean {
    const h = this.host;
    const p = h.player;
    const node = h.field()?.byId(nodeId);
    const kind = node ? h.content.professions.nodes[node.kind] : undefined;
    if (!node || !kind || node.respawn > 0 || !p.alive || h.character.spectral.active) return false;
    h.stopFishing();
    if (h.character.professions.level(kind.profession) < kind.level) {
      h.character.emit({ type: 'message', text: `Necesitas ${h.content.professions.professions[kind.profession]!.name} ${kind.level}` });
      return true;
    }
    p.attackTarget = null;
    p.pickupTarget = null;
    p.casting = null;
    h.stopTalk();
    this.target = nodeId;
    if (dist(p.pos, node) > h.content.professions.rules.gatherRange) h.walkTo(node);
    return true;
  }

  /** ¿Estación de oficio al alcance (forja/alambique)? */
  nearStation(stationId: string): boolean {
    const h = this.host;
    const s = h.content.professions.stations[stationId];
    return !!s && !h.interior && dist(h.player.pos, s) <= h.content.professions.rules.stationRange;
  }

  stop(): void {
    this.target = null;
    if (!this.gathering) return;
    this.gathering = null;
    this.host.pushEvent({ type: 'gatherStop' });
  }

  tick(dt: number): void {
    const h = this.host;
    const field = h.field();
    if (!field) return;
    field.tick(dt);
    const p = h.player;
    const jobs = h.content.professions;
    if (this.target !== null) {
      const node = field.byId(this.target);
      if (!node || node.respawn > 0 || !p.alive) this.target = null;
      else if (dist(p.pos, node) <= jobs.rules.gatherRange) {
        this.target = null;
        p.path = [];
        p.moveTarget = null;
        p.facing = Math.atan2(node.y - p.pos.y, node.x - p.pos.x);
        this.gathering = { nodeId: node.id, elapsed: 0, duration: jobs.nodes[node.kind]!.gatherSeconds };
        h.pushEvent({ type: 'gatherStart', nodeId: node.id });
      } else if (p.path.length === 0) this.target = null; // no se puede llegar
    }
    const g = this.gathering;
    if (!g) return;
    g.elapsed += dt;
    if (g.elapsed < g.duration) return;
    this.gathering = null;
    const node = field.byId(g.nodeId)!;
    const got = field.harvest(g.nodeId);
    if (!got) return;
    const inst = h.character.items.create(got.itemId, got.quantity);
    const left = h.character.pickUp(inst);
    if (left > 0) h.dropLoot(p.pos, inst);
    const nodeDef = jobs.nodes[node.kind]!;
    const professionLevel = h.character.professions.level(nodeDef.profession);
    h.character.gainProfessionXp(nodeDef.profession, rewardXp(nodeDef.xp, professionLevel, nodeDef.level, h.content.progression.rewardProximity));
    h.pushEvent({ type: 'gatherDone', nodeId: g.nodeId, itemId: got.itemId, quantity: got.quantity });
  }
}
