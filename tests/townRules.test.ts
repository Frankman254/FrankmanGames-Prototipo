// Reglas de construcción de los pueblos (F11): cualquiera que mueva o añada un edificio
// (persona o agente) debe cumplirlas; si mueve una casa, `npm run sendas` rehace su senda.
import { describe, expect, it } from 'vitest';
import { loadWorldData } from '../src/data/worldData';
import { BANK_LOCATION } from '../src/scenes/bankScene';
import { castleGate, houseDoor } from '../src/scenes/houseScene';
import { pathEdgeDistance } from '../src/world/terrain';

const wd = loadWorldData();
const paths = wd.terrain.paths;
const props = wd.vegetation.props;
const houses = props.filter((p) => p.kind === 'house');
const castles = props.filter((p) => p.kind === 'landmark' && p.model === 'castillo');
const solids = [...props.filter((p) => p.kind === 'house' || (p.kind === 'landmark' && p.w > 5)), { ...BANK_LOCATION.building }];
const inside = (q: { x: number; y: number }, b: { x: number; y: number; w: number; d: number }, m = 0): boolean => Math.abs(q.x - b.x) < b.w / 2 + m && Math.abs(q.y - b.y) < b.d / 2 + m;

describe('reglas de los pueblos (F11)', () => {
  it('cada puerta da a un camino o a una senda (como mucho a 2 m)', () => {
    for (const h of houses) {
      const out = houseDoor(h).outside;
      expect(pathEdgeDistance(paths, out.x, out.y), `casa en ${h.x},${h.y}: ejecuta npm run sendas`).toBeLessThanOrEqual(2);
    }
    for (const c of castles) {
      const g = castleGate(c).door;
      const a = (c.rotDeg * Math.PI) / 180;
      const out = { x: g.x - Math.sin(a) * 1.6, y: g.y - Math.cos(a) * 1.6 };
      expect(pathEdgeDistance(paths, out.x, out.y), 'portón del castillo').toBeLessThanOrEqual(2);
    }
  });

  it('ninguna puerta queda tapada por otro edificio', () => {
    for (const h of houses) {
      const out = houseDoor(h).outside;
      for (const b of solids) if (b !== h) expect(inside(out, b, 1), `puerta de la casa en ${h.x},${h.y}`).toBe(false);
    }
  });

  it('el portón del castillo de Villa Raspadura da al camino principal', () => {
    const c = castles[0]!;
    const g = castleGate(c).door;
    expect(pathEdgeDistance([paths[0]!], g.x + 1.6, g.y), JSON.stringify(g)).toBeLessThanOrEqual(6);
  });

  it('los edificios guardan distancia entre sí', () => {
    for (let i = 0; i < solids.length; i++) {
      for (let j = i + 1; j < solids.length; j++) {
        const a = solids[i]!;
        const b = solids[j]!;
        const gap = Math.max(Math.abs(a.x - b.x) - (a.w + b.w) / 2, Math.abs(a.y - b.y) - (a.d + b.d) / 2);
        expect(gap, `${a.x},${a.y} y ${b.x},${b.y}`).toBeGreaterThan(2.5);
      }
    }
  });
});
