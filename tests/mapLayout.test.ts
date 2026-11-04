import { describe, expect, it } from 'vitest';
import terrain from '../data/terrain.json';
import vegetation from '../data/vegetation.json';
import stones from '../data/stones.json';
import dungeon from '../data/dungeon.json';
import professions from '../data/rpg/professions.json';
import { BANK_LOCATION } from '../src/scenes/bankScene';

function segmentDistance(px: number, py: number, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const k = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - a.x - k * dx, py - a.y - k * dy);
}

/** Lo más cerca que queda el borde de un edificio del borde de un camino. */
function roadMargin(x: number, y: number, w: number, d: number): number {
  let best = Infinity;
  for (let ax = x - w / 2; ax <= x + w / 2; ax += 0.5) for (let ay = y - d / 2; ay <= y + d / 2; ay += 0.5) {
    for (const p of terrain.paths) for (let i = 1; i < p.points.length; i++) best = Math.min(best, segmentDistance(ax, ay, p.points[i - 1]!, p.points[i]!) - p.width / 2);
  }
  return best;
}

describe('trazado del mapa', () => {
  it('ninguna casa ni el castillo pisan un camino', () => {
    for (const p of vegetation.props) {
      if (p.kind !== 'house' && p.kind !== 'landmark') continue;
      const turned = p.rotDeg % 180 !== 0;
      expect(roadMargin(p.x, p.y, turned ? p.d : p.w, turned ? p.w : p.d), `${p.kind} en ${p.x},${p.y}`).toBeGreaterThan(0.5);
    }
  });

  it('el castillo no tapa Piedras Pintadas, entrada de la cripta ni talleres', () => {
    const inside = (a: { x: number; y: number }, b: { x: number; y: number; w: number; d: number }): boolean => Math.abs(a.x - b.x) < b.w / 2 + 2 && Math.abs(a.y - b.y) < b.d / 2 + 2;
    const castle = vegetation.props.find((p) => p.kind === 'landmark')!;
    for (const stone of stones.stones) expect(inside(stone, castle), stone.id).toBe(false);
    expect(inside(dungeon.entrance, castle)).toBe(false);
    for (const st of Object.values(professions.stations)) expect(inside(st, castle), st.name).toBe(false);
  });

  it('el banco tampoco', () => {
    const b = BANK_LOCATION.building;
    expect(roadMargin(b.x, b.y, b.w + 0.5, b.d + 0.5)).toBeGreaterThan(0.5);
  });
});
