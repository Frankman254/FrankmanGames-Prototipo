// Coloca a mano las piezas de data/ambient.json (`placed`): cada «deseo» de abajo se
// ajusta al punto válido más cercano (suelo seco y sin baches, fuera de caminos, agua,
// estructuras, PNJ y vegetación que bloquea) y se escribe en el JSON.
// Uso: npx vite-node scripts/art/placeAmbient.ts [--dry]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadGameData } from '../../src/data';
import { loadWorldData, worldStructures } from '../../src/data/worldData';
import { pathEdgeDistance } from '../../src/sim/paths';
import { placedGround, solidFootprint, type AmbientDef, type AmbientPlacedDef } from '../../src/world/ambient';
import { ambientSite, buildOverworld } from '../../src/world/overworld';
import stonesJson from '../../data/stones.json';

const FILE = join(__dirname, '..', '..', 'data', 'ambient.json');
const wd = loadWorldData();
const ambient: AmbientDef = { ...wd.ambient, placed: [] };
// Sin piezas puestas: la rejilla dice qué estaba libre antes de colocar nada.
const ow = buildOverworld({ ...wd, ambient });
const site = ambientSite(ow);
const data = loadGameData();
const structures = worldStructures(wd.terrain, wd.vegetation);
/** Metros que deja libres una plataforma de estructura (margen + caída, data/terrain.json). */
const STRUCTURE_CLEAR = 6.5;
const people = [
  ...Object.values({ ...data.rpg.merchants, ...data.rpg.npcs }).map((n) => (n as { position?: { x: number; y: number } }).position).filter((p): p is { x: number; y: number } => !!p),
  ...stonesJson.boats.flatMap((b) => [{ x: b.x, y: b.y }, b.to]),
  wd.terrain.playerStart,
];

interface Wish extends AmbientPlacedDef {
  /** Radio de búsqueda alrededor del punto pedido. */
  reach: number;
  /** Franja de altura sobre el mar exigida (piezas de costa). */
  shore?: [number, number];
  note: string;
}

const accepted: AmbientPlacedDef[] = [];

function load(x: number, z: number): void {
  ow.stream.ensure(x - 24, z - 24, x + 24, z + 24);
}

function valid(w: Wish, x: number, y: number): boolean {
  const s: AmbientPlacedDef = { piece: w.piece, x, y, rotDeg: w.rotDeg, scale: w.scale };
  const piece = ambient.pieces[w.piece]!;
  const half = (Math.hypot(piece.w, piece.d) * w.scale) / 2;
  if (!site.playable(x, y)) return false;
  const g = placedGround(ambient, s, site.height);
  if (g.min < site.seaLevel + 1) return false;
  if (w.shore && (g.min - site.seaLevel < w.shore[0] || g.y - site.seaLevel > w.shore[1])) return false;
  // Con holgura sobre el presupuesto: otro agente puede retocar el relieve cercano.
  if (g.gap > ambient.budget.maxPlacedGap * 0.7 || Math.hypot(g.slopeX, g.slopeZ) > ambient.budget.maxPlacedSlope * 0.85) return false;
  if (structures.some((t) => Math.abs(x - t.x) < t.w / 2 + STRUCTURE_CLEAR + half && Math.abs(y - t.y) < t.d / 2 + STRUCTURE_CLEAR + half)) return false;
  if (people.some((p) => Math.hypot(x - p.x, y - p.y) < 3.5 + half)) return false;
  if (site.ponds.some((p) => Math.hypot(x - p.x, y - p.y) < p.radius + 0.8 + half)) return false;
  if (accepted.some((a) => Math.hypot(x - a.x, y - a.y) < half + (Math.hypot(ambient.pieces[a.piece]!.w, ambient.pieces[a.piece]!.d) * a.scale) / 2 + 0.3 && !(w.note.startsWith('cerca') && ambient.pieces[a.piece]!.model === 'caminos_rurales'))) return false;
  const circles = piece.solid ? solidFootprint(ambient, s) : [{ x, y, w: Math.min(piece.w, piece.d) * w.scale, d: 0 }];
  for (const c of circles) {
    const r = c.w / 2;
    if (piece.solid && pathEdgeDistance(site.paths, c.x, c.y) < ambient.budget.solidPathClearance + r + 0.4) return false;
    for (const [dx, dz] of [[0, 0], [r + 0.6, 0], [-r - 0.6, 0], [0, r + 0.6], [0, -r - 0.6]] as const) {
      if (!ow.grid.walkable({ x: c.x + dx, y: c.y + dz })) return false;
    }
  }
  return true;
}

function place(w: Wish): boolean {
  load(w.x, w.y);
  for (let ring = 0; ring <= w.reach; ring += 0.5) {
    const n = ring === 0 ? 1 : Math.ceil((2 * Math.PI * ring) / 0.5);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = Math.round((w.x + Math.cos(a) * ring) * 10) / 10;
      const y = Math.round((w.y + Math.sin(a) * ring) * 10) / 10;
      if (!valid(w, x, y)) continue;
      accepted.push({ piece: w.piece, x, y, rotDeg: w.rotDeg, scale: w.scale });
      return true;
    }
  }
  console.warn(`  sin sitio: ${w.piece} (${w.note}) cerca de ${w.x.toFixed(0)}, ${w.y.toFixed(0)}`);
  return false;
}

const one = (piece: string, x: number, y: number, rotDeg: number, note: string, opts: { scale?: number; reach?: number; shore?: [number, number] } = {}): boolean =>
  place({ piece, x, y, rotDeg, scale: opts.scale ?? 1, reach: opts.reach ?? 8, note, ...(opts.shore ? { shore: opts.shore } : {}) });

/** Tramo de cerca: piezas una tras otra desde (x, y) hacia (tx, ty). */
function fence(x: number, y: number, tx: number, ty: number, pieces: readonly string[], note: string): void {
  const len = Math.hypot(tx - x, ty - y);
  const dx = (tx - x) / len;
  const dz = (ty - y) / len;
  // El eje X local apunta a (cos r, −sen r): ver rotateLocal.
  const rotDeg = Math.round((Math.atan2(-dz, dx) * 180) / Math.PI);
  let at = 0;
  for (const p of pieces) {
    const l = ambient.pieces[p]!.w;
    const c = at + l / 2;
    place({ piece: p, x: x + dx * c, y: y + dz * c, rotDeg, scale: 1, reach: 0.5, note: `cerca ${note}` });
    at += l + 0.05;
  }
}

/** Punto junto a un camino: fracción `t` del tramo `seg` del camino `path`, a `off` m de su borde (el signo elige lado). */
function beside(path: number, seg: number, t: number, off: number): { x: number; y: number; tx: number; ty: number } {
  const p = site.paths[path]!;
  const a = p.points[seg]!;
  const b = p.points[seg + 1]!;
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const dx = (b.x - a.x) / len;
  const dz = (b.y - a.y) / len;
  const o = Math.sign(off) * (Math.abs(off) + p.width / 2);
  const x = a.x + (b.x - a.x) * t - dz * o;
  const y = a.y + (b.y - a.y) * t + dx * o;
  return { x, y, tx: x + dx * 100, ty: y + dz * 100 };
}

/** Puntos de playa cerca de un ancla, separados entre sí. */
function shorePoints(ax: number, ay: number, radius: number, band: [number, number], gap: number, max: number): Array<{ x: number; y: number }> {
  ow.stream.ensure(ax - radius, ay - radius, ax + radius, ay + radius);
  const found: Array<{ x: number; y: number; d: number }> = [];
  for (let y = ay - radius; y <= ay + radius; y += 1.5) {
    for (let x = ax - radius; x <= ax + radius; x += 1.5) {
      const d = Math.hypot(x - ax, y - ay);
      if (d > radius) continue;
      const h = site.height(x, y) - site.seaLevel;
      if (h < band[0] || h > band[1] || !ow.grid.walkable({ x, y })) continue;
      found.push({ x, y, d });
    }
  }
  found.sort((a, b) => a.d - b.d);
  const out: Array<{ x: number; y: number }> = [];
  for (const f of found) {
    if (out.length >= max) break;
    if (out.every((o) => Math.hypot(o.x - f.x, o.y - f.y) >= gap)) out.push(f);
  }
  return out;
}

const COAST_ROCKS = ['costa_roca_baja_grande', 'costa_roca_erosionada', 'costa_madera_arrasta', 'costa_roca_baja_mediana', 'costa_raices_bajas', 'costa_roca_con_hendidura', 'costa_madera_arrastre_curva', 'costa_grupo_rocoso', 'costa_monticulo_arena', 'costa_roca_baja_pequena', 'costa_madera_arrastre_raices', 'costa_raices_entrelazadas', 'costa_borde_poza'];

function coast(ax: number, ay: number, radius: number, note: string, pieces: readonly string[] = COAST_ROCKS): void {
  const spots = shorePoints(ax, ay, radius, [1.6, 4.4], 7, pieces.length);
  if (spots.length < pieces.length) console.warn(`  costa ${note}: sólo ${spots.length} puntos de playa para ${pieces.length} piezas`);
  spots.forEach((s, i) => one(pieces[i]!, s.x, s.y, (i * 67) % 360, `costa ${note}`, { reach: 3, shore: [1.1, 5.2], scale: 1.15 }));
}

/** Rocas, tocones y troncos: `list` alrededor de un ancla, en anillo. */
function wild(ax: number, ay: number, radius: number, list: readonly string[], note: string): void {
  list.forEach((p, i) => {
    const a = (i / list.length) * Math.PI * 2 + 0.6;
    one(p, ax + Math.cos(a) * radius, ay + Math.sin(a) * radius * 0.8, (i * 53 + 20) % 360, `natural ${note}`, { reach: 9 });
  });
}

const ROCKS = ['roca_puntiaguda_grande', 'tocon_raices', 'roca_redonda_mediana', 'tronco_hueco', 'roca_puntiaguda_mediana', 'roca_partida', 'tocon_bajo', 'roca_redonda_pequena', 'roca_puntiaguda_pequena', 'roca_plana_grande'];

// ── Los Santos: finca al este de Villa Raspadura, sobre el camino a Pedasol ──────────
{
  const a = beside(1, 9, 0.12, -2.2);
  fence(a.x, a.y, a.tx, a.ty, ['camino_cerca_esquina', 'camino_cerca_4m', 'camino_cerca_4m', 'camino_porton_abierto', 'camino_cerca_4m', 'camino_cerca_2m', 'camino_cerca_rota', 'camino_cerca_4m', 'camino_poste_simple'], 'finca de Azuero');
  const b = beside(1, 9, 0.3, -7);
  one('camino_abrevadero', b.x, b.y, 20, 'finca de Azuero');
  one('camino_carretilla', b.x + 5, b.y - 2, 140, 'finca de Azuero');
  one('camino_pila_madera', b.x + 10, b.y - 1, 60, 'finca de Azuero');
  const c = beside(1, 9, 0.62, 2.4);
  fence(c.x, c.y, c.tx, c.ty, ['camino_cerca_2m', 'camino_porton_cerrado', 'camino_cerca_2m', 'camino_cerca_4m', 'camino_barrera_caida'], 'potrero sur');
  const j = beside(1, 8, 0.1, 1.6);
  one('camino_letrero_doble', j.x, j.y, 200, 'cruce de Guararé', { reach: 5 });
  const m = beside(0, 7, 0.5, 1.5);
  one('camino_mojon_piedra', m.x, m.y, 0, 'camino del sur', { reach: 4 });
  const k = beside(0, 8, 0.4, -1.8);
  one('camino_alcantarilla_piedra', k.x, k.y, 75, 'camino del sur', { reach: 5 });
  const e = beside(2, 0, 0.55, 1.8);
  one('camino_escalones_tierra', e.x, e.y, 30, 'subida a Guararé', { reach: 5 });
  one('camino_banco_rustico', 98, 178, 20, 'Charco de la Garza', { reach: 6 });
  one('camino_puente_tablas_4m', 84, 199, 0, 'orilla del Charco de la Garza', { reach: 6 });
  one('camino_puente_tablas_2m', 97, 186, 60, 'tablas del Charco de la Garza', { reach: 5 });
  const n = beside(0, 3, 0.5, 1.6);
  one('camino_poste_simple', n.x, n.y, 0, 'camino del norte', { reach: 4 });
  wild(176, 150, 12, ROCKS, 'llanos de Azuero');
  // Pedasol: playa junto al embarcadero.
  coast(512, 20, 46, 'Pedasol');
  const p = beside(1, 13, 0.5, 1.6);
  one('camino_letrero_doble', p.x, p.y, 90, 'entrada de Pedasol', { reach: 5 });
  one('camino_banco_rustico', p.x + 6, p.y + 3, 100, 'entrada de Pedasol', { reach: 6 });
}

// ── Herrera: camino real hacia Chitrí y potreros de Parrita ──────────────────────────
{
  const a = beside(0, 11, 0.35, 2.2);
  fence(a.x, a.y, a.tx, a.ty, ['camino_cerca_esquina', 'camino_cerca_4m', 'camino_cerca_4m', 'camino_cerca_2m', 'camino_porton_cerrado', 'camino_cerca_4m', 'camino_cerca_rota', 'camino_poste_simple'], 'potrero de Parrita');
  const b = beside(0, 11, 0.45, 7.5);
  one('camino_abrevadero', b.x, b.y, 300, 'potrero de Parrita');
  one('camino_pila_madera', b.x - 5, b.y + 4, 15, 'potrero de Parrita');
  one('camino_carretilla', b.x - 9, b.y + 9, 250, 'potrero de Parrita');
  const c = beside(0, 11, 0.7, -2.2);
  fence(c.x, c.y, c.tx, c.ty, ['camino_cerca_4m', 'camino_porton_abierto', 'camino_cerca_4m', 'camino_cerca_2m', 'camino_barrera_caida'], 'huerta de Parrita');
  const j = beside(0, 12, 0.35, 1.6);
  one('camino_letrero_doble', j.x, j.y, 320, 'entrada de Chitrí', { reach: 5 });
  one('camino_banco_rustico', j.x - 3, j.y + 5, 320, 'entrada de Chitrí', { reach: 6 });
  const m = beside(0, 10, 0.5, -1.5);
  one('camino_mojon_piedra', m.x, m.y, 0, 'camino real', { reach: 4 });
  const k = beside(4, 0, 0.6, 1.8);
  one('camino_alcantarilla_piedra', k.x, k.y, 115, 'camino a Pesé', { reach: 5 });
  const e = beside(5, 0, 0.6, -1.8);
  one('camino_escalones_tierra', e.x, e.y, 140, 'camino a Sarigua', { reach: 5 });
  const t = beside(4, 0, 0.3, -1.4);
  one('camino_puente_tablas_2m', t.x, t.y, 30, 'tablas del camino a Pesé', { reach: 5 });
  one('camino_puente_tablas_4m', k.x - 14, k.y - 4, 25, 'camino a Pesé', { reach: 8 });
  wild(86, 452, 13, ROCKS, 'campos de Parrita');
  coast(120, 520, 120, 'Herrera');
}

// ── Iguanera: campamento del muelle, playa y poza de marea ────────────────────────────
{
  coast(600, 244, 44, 'muelle de Iguanera');
  fence(628, 262, 660, 262, ['camino_cerca_esquina', 'camino_cerca_4m', 'camino_cerca_2m', 'camino_cerca_rota', 'camino_poste_simple'], 'campamento de Iguanera');
  one('camino_letrero_doble', 634, 250, 180, 'campamento de Iguanera', { reach: 6 });
  one('camino_banco_rustico', 620, 252, 10, 'campamento de Iguanera', { reach: 6 });
  one('camino_pila_madera', 640, 256, 40, 'campamento de Iguanera', { reach: 6 });
  one('camino_carretilla', 646, 252, 200, 'campamento de Iguanera', { reach: 6 });
  one('camino_abrevadero', 652, 246, 90, 'campamento de Iguanera', { reach: 6 });
  one('camino_mojon_piedra', 660, 238, 0, 'sendero de Iguanera', { reach: 6 });
  one('camino_porton_abierto', 668, 252, 90, 'sendero de Iguanera', { reach: 6 });
  one('camino_barrera_caida', 690, 230, 30, 'sendero de Iguanera', { reach: 8 });
  one('camino_escalones_tierra', 700, 250, 0, 'sendero de Iguanera', { reach: 8 });
  one('camino_alcantarilla_piedra', 720, 236, 60, 'sendero de Iguanera', { reach: 8 });
  one('camino_puente_tablas_4m', 788, 246, 0, 'poza de marea', { reach: 8 });
  one('camino_puente_tablas_2m', 790, 236, 120, 'poza de marea', { reach: 6 });
  one('costa_borde_poza', 811, 236, 0, 'poza de marea', { reach: 6 });
  one('costa_borde_poza', 806, 251, 140, 'poza de marea', { reach: 6 });
  one('costa_raices_entrelazadas', 794, 252, 40, 'poza de marea', { reach: 6 });
  wild(676, 222, 14, ROCKS, 'interior de Iguanera');
}

const byModel = new Map<string, Set<string>>();
for (const a of accepted) {
  const m = ambient.pieces[a.piece]!.model;
  if (!byModel.has(m)) byModel.set(m, new Set());
  byModel.get(m)!.add(a.piece);
}
console.log(`${accepted.length} piezas colocadas`);
for (const [m, set] of byModel) console.log(`  ${m}: ${set.size} nodos distintos`);
const never = Object.entries(ambient.pieces).filter(([id, p]) => p.solid && !accepted.some((a) => a.piece === id)).map(([id]) => id);
if (never.length > 0) console.warn(`  sólidas sin colocar: ${never.join(', ')}`);

if (!process.argv.includes('--dry')) {
  const text = readFileSync(FILE, 'utf8');
  const start = text.indexOf('"placed": [');
  if (start < 0) throw new Error('data/ambient.json no tiene "placed"');
  const rows = accepted.map((a) => `    { "piece": "${a.piece}", "x": ${a.x}, "y": ${a.y}, "rotDeg": ${a.rotDeg}, "scale": ${a.scale} }`);
  writeFileSync(FILE, `${text.slice(0, start)}"placed": [\n${rows.join(',\n')}\n  ]\n}\n`);
  console.log('data/ambient.json actualizado');
}
