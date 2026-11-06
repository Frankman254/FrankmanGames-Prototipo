// `npm run sendas`: une la puerta de cada casa, castillo, iglesia y banco con el camino más
// cercano con una senda (F11). Reescribe las sendas de data/terrain.json (las que llevan
// "senda": true) a partir de las puertas de data/vegetation.json; los caminos a mano no se tocan.
// Una senda que cruzaría otro edificio no se pone y se avisa: hay que mover ese edificio.
import fs from 'node:fs';

const TERRAIN = 'data/terrain.json';
const veg = JSON.parse(fs.readFileSync('data/vegetation.json', 'utf8'));
const raw = fs.readFileSync(TERRAIN, 'utf8');
const terrain = JSON.parse(raw);

/** Metros más allá de la pared donde se planta el personaje (igual que `houseDoor`). */
const DOOR_OUT = 1.6;
/** Por debajo de esto la puerta ya da al camino: no hace falta senda. */
export const DOOR_ROAD_MAX = 2;
const CASTLE_GATE_REACH = 11.6;
const BANK = { kind: 'bank', x: 116, y: 133.5, w: 8, d: 6, door: { x: 116, y: 129 } };

export function doorOf(p) {
  if (p.door) return { ...p.door, dx: 0, dz: -1 };
  const a = (p.rotDeg * Math.PI) / 180;
  const dx = -Math.sin(a);
  const dz = -Math.cos(a);
  const reach = p.model === 'castillo' ? CASTLE_GATE_REACH : Math.abs(dx) > 0.5 ? p.w / 2 : p.d / 2;
  return { x: p.x + dx * (reach + DOOR_OUT), y: p.y + dz * (reach + DOOR_OUT), dx, dz };
}

function nearestOnPaths(paths, q) {
  let best = null;
  for (const p of paths) {
    for (let i = 1; i < p.points.length; i++) {
      const a = p.points[i - 1];
      const b = p.points[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const l = dx * dx + dy * dy;
      const u = l ? Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / l)) : 0;
      const c = { x: a.x + u * dx, y: a.y + u * dy };
      const d = Math.hypot(q.x - c.x, q.y - c.y) - p.width / 2;
      if (!best || d < best.d) best = { d, c };
    }
  }
  return best;
}

const crosses = (a, b, box, margin = 0.6) => {
  for (let t = 0.05; t <= 0.95; t += 0.05) {
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    if (Math.abs(x - box.x) < box.w / 2 + margin && Math.abs(y - box.y) < box.d / 2 + margin) return true;
  }
  return false;
};

const roads = terrain.paths.filter((p) => !p.senda);
const buildings = [...veg.props.filter((p) => p.kind === 'house' || (p.kind === 'landmark' && ['castillo', 'iglesia'].includes(p.model))), BANK];
const sendas = [];
const problems = [];
for (const b of buildings) {
  const door = doorOf(b);
  const near = nearestOnPaths(roads, door);
  if (!near || near.d <= DOOR_ROAD_MAX) continue;
  // Su propio edificio, sin margen: la puerta ya está pegada a su pared.
  const blocker = buildings.find((o) => crosses(door, near.c, o, o === b ? 0 : 0.6));
  if (blocker) {
    problems.push(blocker === b ? `${b.model ?? b.kind} en ${b.x},${b.y}: su puerta mira lejos del camino (gírala)` : `${b.model ?? b.kind} en ${b.x},${b.y}: la senda cruzaría ${blocker.model ?? blocker.kind} en ${blocker.x},${blocker.y}`);
    continue;
  }
  const r = (v) => Math.round(v * 10) / 10;
  // Empieza metro y medio delante de la puerta: así no roza la pared (el portón del castillo va casi pegado).
  const start = { x: door.x + door.dx * 1.5, y: door.y + door.dz * 1.5 };
  sendas.push({ senda: true, width: 1.8, points: [{ x: r(start.x), y: r(start.y) }, { x: r(near.c.x), y: r(near.c.y) }] });
}
terrain.paths = [...roads, ...sendas];
// Mismo formato que a mano: un camino por línea.
const pathsText = '[\n' + terrain.paths.map((p) => '    ' + JSON.stringify(p)).join(',\n') + '\n  ]';
const start = raw.indexOf('"paths"');
const open = raw.indexOf('[', start);
let depth = 0;
let i = open;
for (; i < raw.length; i++) {
  if (raw[i] === '[') depth++;
  else if (raw[i] === ']' && --depth === 0) break;
}
fs.writeFileSync(TERRAIN, raw.slice(0, open) + pathsText + raw.slice(i + 1));
console.log(`${sendas.length} sendas`);
for (const p of problems) console.log(`  aviso: ${p}`);
if (problems.length) process.exitCode = 1;
