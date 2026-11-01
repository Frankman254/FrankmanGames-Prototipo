export interface SpectralDef {
  speedMultiplier: number;
  resurrectRadius: number;
  pulseAtZero: 'longRevive' | 'weakened' | 'blockedCombat';
  resurrectors: { id: string; name: string; region: string; x: number; y: number }[];
}
export interface SpectralSaveData { active: boolean; deaths: number }

export function parseSpectralDef(raw: unknown): SpectralDef {
  const r = new Reader('death.json');
  const o = r.obj(raw);
  const mode = r.str(o, 'pulseAtZero', ['longRevive', 'weakened', 'blockedCombat']) as SpectralDef['pulseAtZero'];
  const resurrectors = r.arr(o, 'resurrectors').map((value, index) => {
    const q = r.child('resurrectors').child(index);
    const v = q.obj(value);
    return {
      id: q.str(v, 'id'), name: q.str(v, 'name'), region: q.str(v, 'region'),
      x: q.num(v, 'x'), y: q.num(v, 'y'),
    };
  });
  if (new Set(resurrectors.map((x) => x.id)).size !== resurrectors.length) r.fail('resurrectors', 'los id deben ser únicos');
  return {
    speedMultiplier: r.num(o, 'speedMultiplier', { min: 0.1, max: 1 }),
    resurrectRadius: r.num(o, 'resurrectRadius', { min: 0.5, max: 20 }),
    pulseAtZero: mode,
    resurrectors,
  };
}

export class SpectralState {
  active: boolean;
  deaths: number;
  constructor(readonly def: SpectralDef, saved?: Partial<SpectralSaveData>) {
    this.active = saved?.active === true;
    this.deaths = Number.isInteger(saved?.deaths) && saved!.deaths! >= 0 ? saved!.deaths! : 0;
  }
  die(): void { this.active = true; this.deaths++; }
  canFight(): boolean { return !this.active; }
  canLoot(): boolean { return !this.active; }
  ignoredByEnemies(): boolean { return this.active; }
  speed(base: number): number { return this.active ? base * this.def.speedMultiplier : base; }
  resurrectAt(id: string, pos: { x: number; y: number }): boolean {
    const r = this.def.resurrectors.find((x) => x.id === id);
    if (!this.active || !r || Math.hypot(r.x - pos.x, r.y - pos.y) > this.def.resurrectRadius) return false;
    this.active = false;
    return true;
  }
  resurrectByAlly(): boolean {
    if (!this.active) return false;
    this.active = false;
    return true;
  }
  toSave(): SpectralSaveData { return { active: this.active, deaths: this.deaths }; }
}
import { Reader } from '../data/validate';

