import type { Vec2 } from './vec2';

export type LabShape =
  | { type: 'ring'; innerRadius: number; outerRadius: number }
  | { type: 'wave'; radius: number; thickness: number }
  | { type: 'delayed'; radius: number; delay: number }
  | { type: 'zigzag'; length: number; width: number; amplitude: number; segments: number }
  | { type: 'spiral'; radius: number; width: number; turns: number }
  | { type: 'tether'; width: number }
  | { type: 'growing'; startRadius: number; endRadius: number; duration: number }
  | { type: 'rotatingSectors'; length: number; angleDeg: number; sectors: number; radiansPerSecond: number };

export interface PlacedLabShape {
  def: LabShape;
  origin: Vec2;
  dir: number;
  end?: Vec2;
  elapsed?: number;
}

const segmentDistance = (p: Vec2, a: Vec2, b: Vec2): number => {
  const x = b.x - a.x;
  const y = b.y - a.y;
  const l2 = x * x + y * y;
  const t = l2 <= 1e-12 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * x + (p.y - a.y) * y) / l2));
  return Math.hypot(p.x - a.x - x * t, p.y - a.y - y * t);
};

const local = (s: PlacedLabShape, along: number, across: number): Vec2 => ({
  x: s.origin.x + along * Math.cos(s.dir) - across * Math.sin(s.dir),
  y: s.origin.y + along * Math.sin(s.dir) + across * Math.cos(s.dir),
});

const polylineHits = (points: readonly Vec2[], p: Vec2, reach: number): boolean =>
  points.slice(1).some((point, i) => segmentDistance(p, points[i]!, point) <= reach);

function coneHits(s: PlacedLabShape, p: Vec2, radius: number, dir: number, length: number, angleDeg: number): boolean {
  const dx = p.x - s.origin.x;
  const dy = p.y - s.origin.y;
  const distance = Math.hypot(dx, dy);
  if (distance - radius > length) return false;
  if (distance <= radius) return true;
  const offset = Math.abs(Math.atan2(-dx * Math.sin(dir) + dy * Math.cos(dir), dx * Math.cos(dir) + dy * Math.sin(dir)));
  return offset <= (angleDeg * Math.PI) / 360 + Math.asin(Math.min(1, radius / distance));
}

export function labShapeHitsCircle(s: PlacedLabShape, p: Vec2, actorRadius = 0): boolean {
  const d = Math.hypot(p.x - s.origin.x, p.y - s.origin.y);
  const def = s.def;
  if (def.type === 'ring' || def.type === 'wave') {
    const inner = def.type === 'ring' ? def.innerRadius : Math.max(0, def.radius - def.thickness / 2);
    const outer = def.type === 'ring' ? def.outerRadius : def.radius + def.thickness / 2;
    return d + actorRadius >= inner && d - actorRadius <= outer;
  }
  if (def.type === 'delayed') return (s.elapsed ?? 0) >= def.delay && d <= def.radius + actorRadius;
  if (def.type === 'growing') {
    const k = def.duration <= 0 ? 1 : Math.max(0, Math.min(1, (s.elapsed ?? 0) / def.duration));
    return d <= def.startRadius + (def.endRadius - def.startRadius) * k + actorRadius;
  }
  if (def.type === 'tether') return !!s.end && segmentDistance(p, s.origin, s.end) <= def.width / 2 + actorRadius;
  if (def.type === 'zigzag') {
    const count = Math.max(1, Math.floor(def.segments));
    const points = [s.origin];
    for (let i = 1; i <= count; i++) points.push(local(s, (def.length * i) / count, i === count ? 0 : (i % 2 ? 1 : -1) * def.amplitude));
    return polylineHits(points, p, def.width / 2 + actorRadius);
  }
  if (def.type === 'spiral') {
    const count = Math.max(16, Math.ceil(def.turns * 24));
    const points: Vec2[] = [];
    for (let i = 0; i <= count; i++) {
      const k = i / count;
      const angle = def.turns * Math.PI * 2 * k;
      points.push(local(s, Math.cos(angle) * def.radius * k, Math.sin(angle) * def.radius * k));
    }
    return polylineHits(points, p, def.width / 2 + actorRadius);
  }
  const start = s.dir + (s.elapsed ?? 0) * def.radiansPerSecond;
  for (let i = 0; i < Math.max(1, Math.floor(def.sectors)); i++) {
    if (coneHits(s, p, actorRadius, start + (i * Math.PI * 2) / def.sectors, def.length, def.angleDeg)) return true;
  }
  return false;
}

export interface ChainTarget { id: number; pos: Vec2 }

export function selectChain(start: Vec2, candidates: readonly ChainTarget[], count: number, range: number): ChainTarget[] {
  const left = [...candidates];
  const out: ChainTarget[] = [];
  let at = start;
  while (out.length < count) {
    const next = left.filter((x) => Math.hypot(x.pos.x - at.x, x.pos.y - at.y) <= range)
      .sort((a, b) => Math.hypot(a.pos.x - at.x, a.pos.y - at.y) - Math.hypot(b.pos.x - at.x, b.pos.y - at.y) || a.id - b.id)[0];
    if (!next) break;
    out.push(next);
    left.splice(left.indexOf(next), 1);
    at = next.pos;
  }
  return out;
}
