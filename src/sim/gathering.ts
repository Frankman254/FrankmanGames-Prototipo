// Recursos del mapa: árboles, vetas y plantas. Se colocan con una semilla fija
// para que el bosque sea el mismo en cada partida; al recogerlos se agotan y
// vuelven pasado un rato. Puro: sin DOM ni render. Usa su propio generador para
// no alterar la secuencia del resto de la simulación.
import { Rng } from './rng';
import type { Vec2 } from './vec2';

export interface GatherNodeRules {
  itemId: string;
  min: number;
  max: number;
  respawnSeconds: number;
}

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
