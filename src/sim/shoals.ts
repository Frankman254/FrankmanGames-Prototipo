// Bancos de peces: zonas circulares dentro de cada estanque donde se puede
// pescar. Cada banco aguanta unas cuantas capturas; al agotarse desaparece y,
// pasado un rato, sale otro en otro sitio del agua. Puro: sin DOM ni render.
// Usa su propio generador para no alterar la secuencia del resto de la simulación.
import { Rng } from './rng';
import type { Vec2 } from './vec2';

export interface ShoalRules {
  /** Bancos activos por estanque. */
  perSpot: number;
  /** Radio del círculo en metros. */
  radius: number;
  /** Capturas que aguanta antes de agotarse. */
  charges: number;
  /** Segundos hasta que reaparece en otro punto. */
  respawnSeconds: number;
}

export interface ShoalSpot {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface Shoal {
  id: number;
  spotId: string;
  x: number;
  y: number;
  radius: number;
  charges: number;
  /** Segundos que faltan para reaparecer; 0 = activo. */
  respawn: number;
}

export class ShoalField {
  readonly list: Shoal[] = [];
  private readonly rng: Rng;

  constructor(private readonly spots: readonly ShoalSpot[], private readonly rules: ShoalRules, seed: number) {
    this.rng = new Rng(seed ^ 0x51f15);
    let id = 1;
    for (const spot of spots) {
      for (let i = 0; i < rules.perSpot; i++) {
        const shoal: Shoal = { id: id++, spotId: spot.id, x: spot.x, y: spot.y, radius: rules.radius, charges: rules.charges, respawn: 0 };
        this.place(shoal, spot);
        this.list.push(shoal);
      }
    }
  }

  /** Busca sitio dentro del agua, alejado de los demás bancos si puede. */
  private place(shoal: Shoal, spot: ShoalSpot): void {
    const reach = Math.max(0, spot.radius * 0.8 - shoal.radius);
    let best: Vec2 = { x: spot.x, y: spot.y };
    let bestGap = -Infinity;
    for (let tries = 0; tries < 12; tries++) {
      const a = this.rng.next() * Math.PI * 2;
      const r = Math.sqrt(this.rng.next()) * reach;
      const p = { x: spot.x + Math.cos(a) * r, y: spot.y + Math.sin(a) * r };
      let gap = Infinity;
      for (const o of this.list) if (o !== shoal && o.spotId === spot.id && o.respawn <= 0) gap = Math.min(gap, Math.hypot(o.x - p.x, o.y - p.y));
      if (gap > bestGap) {
        bestGap = gap;
        best = p;
      }
      if (gap >= shoal.radius * 2.2) break;
    }
    shoal.x = best.x;
    shoal.y = best.y;
  }

  tick(dt: number): void {
    for (const s of this.list) {
      if (s.respawn <= 0) continue;
      s.respawn -= dt;
      if (s.respawn > 0) continue;
      s.respawn = 0;
      s.charges = this.rules.charges;
      const spot = this.spots.find((p) => p.id === s.spotId);
      if (spot) this.place(s, spot);
    }
  }

  /** Banco activo que contiene el punto. */
  at(point: Vec2): Shoal | null {
    for (const s of this.list) if (s.respawn <= 0 && Math.hypot(point.x - s.x, point.y - s.y) <= s.radius) return s;
    return null;
  }

  /** Banco activo de un estanque más cercano al punto. */
  nearest(spotId: string, point: Vec2): Shoal | null {
    let best: Shoal | null = null;
    let bestD = Infinity;
    for (const s of this.list) {
      if (s.spotId !== spotId || s.respawn > 0) continue;
      const d = Math.hypot(point.x - s.x, point.y - s.y);
      if (d < bestD) {
        best = s;
        bestD = d;
      }
    }
    return best;
  }

  /** Una captura: resta una carga y, si se acaba, el banco se va. */
  consume(id: number): void {
    const s = this.list.find((x) => x.id === id);
    if (!s || s.respawn > 0) return;
    s.charges--;
    if (s.charges <= 0) s.respawn = this.rules.respawnSeconds;
  }
}
