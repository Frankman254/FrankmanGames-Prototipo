// Auditoría cuantitativa de densidad (SOLO lectura; nada integrado; ninguna
// posición cambiada). Mide el mundo exacto que pisa la simulación:
// buildOverworld + ensure de todas las páginas, más agua de pesca y pintado de
// navpaint, como hace `buildZoneGrid` al crear el `World`. Umbrales = PROPUESTA.
//
// Ejecución: npm run audit:density. Escribe sólo en work/auditoria-densidad/.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { loadGameData } from '../../src/data';
import { loadWorldData } from '../../src/data/worldData';
import { combatSpaceOpen } from '../../src/sim/zones';
import { ZoneMap } from '../../src/sim/zones';
import { pathEdgeDistance } from '../../src/sim/paths';
import { buildOverworld } from '../../src/world/overworld';
import encounterJson from '../../data/encounter.json';
import fishingJson from '../../data/rpg/fishing.json';
import stonesJson from '../../data/stones.json';
import terrainJson from '../../data/terrain.json';
import zonesJson from '../../data/zones.json';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT_DIR = path.join(ROOT, 'work', 'auditoria-densidad');

// --- Umbrales: PROPUESTA de la auditoría, no balance aprobado ------------------
// Calibrados el 2026-11-09 contra la distribución REAL de las 46 páginas con
// ≥25 % de tierra: caminable mediana 93,1 %; sólidos/ha mediana 137, p90 282;
// ratio (discos-6 sobre muestras caminables) mediana 85,2 %, p10 71,9 %.
// Los valores previos (obst/ha 6) se inventaron sin ver el mundo: los datos
// los descartan. Estos marcan la cola alta — lista de vigilancia, no veto.
export const PROPUESTA = {
  walkableMinPct: 45, // % mínimo de tierra caminable por página (red de seguridad; la mediana es 93)
  obstaculosPorHaMax: 300, // sólidos por hectárea de tierra (p90 real = 282)
  combateMinPct: 50, // % de muestras caminables que admiten disco-6; p10 real = 72
  anchoCaminableMin: 3, // m de ancho caminable de un camino
  muestrasCuelloMin: 5, // muestras (1 cada paso de muestreo) bajo el ancho
  grupoObstaculos: 10, // sólidos a ≤12 m de un sólido = grupo
  grupoRadio: 12,
  nucleosPorPagina: 10, // núcleos de grupo ≥ este número → bandera (p90 real = 13)
  claroRadio: 6, // disco de combate que exige un claro por página
  claroTierraMinPct: 25, // sólo páginas con esta % de tierra se exigen claro
  pasoMuestra: 2, // sampleStep de data/zones.json
  radiosDisco: [4, 5, 6] as number[],
};

// --- El mundo jugable completo -------------------------------------------------
const wd = loadWorldData();
const ow = buildOverworld(wd);
const bounds = wd.terrain.world!;
const CELL = bounds.cellSize;
const PAGE = bounds.pageMeters;
const grid = ow.grid;
ow.stream.ensure(bounds.x0, bounds.z0, bounds.x1, bounds.z1);
// Agua de pesca y pintado, como buildZoneGrid(z, spots) en World:
const spots = Object.values(fishingJson.spots as Record<string, { x: number; y: number; radius: number }>);
for (const s of spots) grid.blockCircle(s.x, s.y, s.radius + bounds.navRadius * 0.5);
grid.applyPaint(ow.navPaint);

const cols = grid.cols;
const rows = grid.rows;
const gx0 = grid.originX;
const gz0 = grid.originY;
const blocked = grid.blocked; // 0 pisa · 1 obstáculo · 2 fuera del mundo

const cellIndex = (x: number, z: number): number => {
  const cx = Math.floor((x - gx0) / CELL);
  const cz = Math.floor((z - gz0) / CELL);
  if (cx < 0 || cz < 0 || cx >= cols || cz >= rows) return -1;
  return cz * cols + cx;
};
const walkableAt = (x: number, z: number): boolean => {
  const i = cellIndex(x, z);
  return i >= 0 && blocked[i] === 0;
};

const data = loadGameData();
const zoneMap = new ZoneMap(data.zones);

// --- Causa del bloqueo (prioridad): 1 prop · 2 poza · 3 mar/región · 4 veg · 6 otro
const CAUSA = new Uint8Array(blocked.length);
const stampCause = (x: number, z: number, w: number, d: number, round: boolean, causa: number): void => {
  // mismo inflado que NavGrid.stamp
  const infl = bounds.navRadius;
  const h = CELL / 2;
  const cx0 = Math.max(0, Math.floor((x - w / 2 - infl - gx0) / CELL));
  const cx1 = Math.min(cols - 1, Math.floor((x + w / 2 + infl - gx0) / CELL));
  const cz0 = Math.max(0, Math.floor((z - d / 2 - infl - gz0) / CELL));
  const cz1 = Math.min(rows - 1, Math.floor((z + d / 2 + infl - gz0) / CELL));
  for (let cz = cz0; cz <= cz1; cz++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const i = cz * cols + cx;
      if (blocked[i] !== 1 || CAUSA[i] !== 0) continue;
      const px = gx0 + (cx + 0.5) * CELL;
      const pz = gz0 + (cz + 0.5) * CELL;
      let dd: number;
      if (round) {
        const qx = Math.min(Math.max(x, px - h), px + h);
        const qy = Math.min(Math.max(z, pz - h), pz + h);
        dd = Math.hypot(qx - x, qy - z) - w / 2;
      } else {
        const dx = Math.max(Math.abs(px - x) - w / 2 - h, 0);
        const dy = Math.max(Math.abs(pz - z) - d / 2 - h, 0);
        dd = Math.hypot(dx, dy);
      }
      if (dd < infl || dd <= 0) CAUSA[i] = causa;
    }
  }
};
for (const p of wd.vegetation.props) stampCause(p.x, p.y, p.w, p.d, false, 1);
for (const s of spots) {
  // blockCircle bloquea la celda cuyo centro cae dentro del radio:
  const rr = s.radius + bounds.navRadius * 0.5;
  const cx0 = Math.max(0, Math.floor((s.x - rr - gx0) / CELL));
  const cx1 = Math.min(cols - 1, Math.floor((s.x + rr - gx0) / CELL));
  const cz0 = Math.max(0, Math.floor((s.y - rr - gz0) / CELL));
  const cz1 = Math.min(rows - 1, Math.floor((s.y + rr - gz0) / CELL));
  for (let cz = cz0; cz <= cz1; cz++)
    for (let cx = cx0; cx <= cx1; cx++) {
      const i = cz * cols + cx;
      if (blocked[i] === 1 && CAUSA[i] === 0 && Math.hypot(gx0 + (cx + 0.5) * CELL - s.x, gz0 + (cz + 0.5) * CELL - s.y) <= rr) CAUSA[i] = 2;
    }
}
for (const pg of ow.stream.activePages) {
  const c0 = Math.round((pg.x0 - gx0) / CELL);
  const r0 = Math.round((pg.z0 - gz0) / CELL);
  for (let r = 0; r < pg.cells; r++)
    for (let c = 0; c < pg.cells; c++) {
      if (pg.mask[r * pg.cells + c] !== 1) continue;
      const i = (r0 + r) * cols + (c0 + c);
      if (blocked[i] === 1 && CAUSA[i] === 0) CAUSA[i] = 3;
    }
}
// Vegetación: igual que arriba, leída de las páginas activas (no de ow.scatter,
// que sólo abarca la parcela). `placements` viene incluido en los buffers.
for (const pg of ow.stream.activePages)
  for (const [id, buf] of Object.entries(pg.kinds)) {
    const k = wd.vegetation.kinds[id];
    if (!k || k.blockRadius <= 0) continue;
    for (let i = 0; i < buf.length; i += 9) {
      const r = k.blockRadius * buf[i + 3]!;
      stampCause(buf[i]!, buf[i + 2]!, 2 * r, 2 * r, true, 4);
    }
  }
for (let i = 0; i < blocked.length; i++) if (blocked[i] === 1 && CAUSA[i] === 0) CAUSA[i] = 6;

// --- Identidad de páginas (128 m) ----------------------------------------------
const NPX = Math.round((bounds.x1 - bounds.x0) / PAGE);
const NPZ = Math.round((bounds.z1 - bounds.z0) / PAGE);
const pageOf = (x: number, z: number): number => {
  const ix = Math.floor((x - bounds.x0) / PAGE);
  const iz = Math.floor((z - bounds.z0) / PAGE);
  if (ix < 0 || iz < 0 || ix >= NPX || iz >= NPZ) return -1;
  return iz * NPX + ix;
};

// --- Distancia a camino: máscara de 1 m + chamfer --------------------------------
const MW = Math.round(bounds.x1 - bounds.x0);
const MH = Math.round(bounds.z1 - bounds.z0);
const mx = (x: number): number => Math.floor(x - bounds.x0);
const mz = (z: number): number => Math.floor(z - bounds.z0);
const paths = wd.terrain.paths;
// `senda` sólo vive en el JSON (el parser lo descarta); tipado estructural.
const rawPaths: ReadonlyArray<{ width: number; senda?: boolean; points: ReadonlyArray<{ x: number; y: number }> }> = terrainJson.paths;
const onPath = new Uint8Array(MW * MH);
for (let j = 0; j < MH; j++) {
  const z = bounds.z0 + j + 0.5;
  for (let i = 0; i < MW; i++) if (pathEdgeDistance(paths, bounds.x0 + i + 0.5, z) < 0) onPath[j * MW + i] = 1;
}
const S2 = Math.SQRT2;
const DIST = new Float32Array(MW * MH).fill(1e9);
for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) if (onPath[j * MW + i]) DIST[j * MW + i] = 0;
for (let j = 0; j < MH; j++)
  for (let i = 0; i < MW; i++) {
    const k = j * MW + i;
    let v = DIST[k]!;
    if (i > 0) v = Math.min(v, DIST[k - 1]! + 1);
    if (j > 0) v = Math.min(v, DIST[k - MW]! + 1);
    if (i > 0 && j > 0) v = Math.min(v, DIST[k - MW - 1]! + S2);
    if (i + 1 < MW && j > 0) v = Math.min(v, DIST[k - MW + 1]! + S2);
    DIST[k] = v;
  }
for (let j = MH - 1; j >= 0; j--)
  for (let i = MW - 1; i >= 0; i--) {
    const k = j * MW + i;
    let v = DIST[k]!;
    if (i + 1 < MW) v = Math.min(v, DIST[k + 1]! + 1);
    if (j + 1 < MH) v = Math.min(v, DIST[k + MW]! + 1);
    if (i + 1 < MW && j + 1 < MH) v = Math.min(v, DIST[k + MW + 1]! + S2);
    if (i > 0 && j + 1 < MH) v = Math.min(v, DIST[k + MW - 1]! + S2);
    DIST[k] = v;
  }
// --- Réplica del disco de combate + verificación contra la función del juego ----
const ANG = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2;
  return { c: Math.cos(a), s: Math.sin(a) };
});
const disco = (x: number, z: number, r: number): boolean => {
  if (!walkableAt(x, z)) return false;
  let n = 0;
  for (const ring of [0.5, 1])
    for (let i = 0; i < 16; i++) {
      const px = x + ANG[i]!.c * r * ring;
      const pz = z + ANG[i]!.s * r * ring;
      if (!walkableAt(px, pz)) n++;
    }
  return n <= 4; // mismo tope que combatSpaceOpen
};
{
  let s = 12345;
  const rnd = (): number => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296);
  let probadas = 0;
  for (let k = 0; k < 3000; k++) {
    const x = bounds.x0 + rnd() * (bounds.x1 - bounds.x0);
    const z = bounds.z0 + rnd() * (bounds.z1 - bounds.z0);
    for (const r of PROPUESTA.radiosDisco)
      if (disco(x, z, r) !== combatSpaceOpen({ x, y: z }, r, (p) => walkableAt(p.x, p.y)))
        throw new Error(`réplica de combatSpaceOpen diverge en (${x.toFixed(2)},${z.toFixed(2)}) r=${r}`);
    probadas++;
  }
  console.log(`[auditoría] réplica combatSpaceOpen verificada en ${probadas} posiciones (3 radios)`);
}

// --- Acumuladores por página y por zona ----------------------------------------
interface Acc {
  muestra: number; // anclas de 2 m dentro de la página/zona (tierra incl.)
  walk: number; // de esas, caminables
  tierra: number; // muestras no «fuera del mundo»
  mar: number; poza: number; prop: number; veg: number; otro: number; // tierra bloqueada por causa
  d4: number; d5: number; d6: number; // discos válidos (caminables) para r 4/5/6
  obstaculos: number; nucleos: number;
  cuello: number; cuelloRacha: number; cuelloAncho: number; cuelloX: number; cuelloZ: number;
  sumaDist: number; nDist: number; minDist: number; maxDist: number;
  nucleosList: Array<[number, number, number]>;
}
const mk = (): Acc => ({
  muestra: 0, walk: 0, tierra: 0, mar: 0, poza: 0, prop: 0, veg: 0, otro: 0,
  d4: 0, d5: 0, d6: 0, obstaculos: 0, nucleos: 0,
  cuello: 0, cuelloRacha: 0, cuelloAncho: 99, cuelloX: 0, cuelloZ: 0,
  sumaDist: 0, nDist: 0, minDist: Infinity, maxDist: -Infinity, nucleosList: [],
});
const paginas: Acc[] = Array.from({ length: NPX * NPZ }, mk);
const zonas = new Map<string, Acc>();
// Cuadrícula interna de 16 m: 8×8 celdas por página. Por celda: muestras,
// caminables y discos-6 válidos (mismo muestreo de 2 m que lo llena).
const SUB = PAGE / 16; // 8
const sub = new Uint16Array(NPX * NPZ * SUB * SUB * 3);
const subAdd = (x: number, z: number, campo: 0 | 1 | 2, d: number): void => {
  const ix = Math.floor((x - bounds.x0) / PAGE);
  const iz = Math.floor((z - bounds.z0) / PAGE);
  if (ix < 0 || iz < 0 || ix >= NPX || iz >= NPZ) return;
  const sx = Math.floor(((x - bounds.x0) % PAGE) / 16);
  const sz = Math.floor(((z - bounds.z0) % PAGE) / 16);
  const index = ((iz * NPX + ix) * SUB + sz) * SUB * 3 + sx * 3 + campo;
  sub[index] = sub[index]! + d;
};

// --- Sólidos: props del JSON + colocados a mano + dispersión que bloquea ---------
interface Solido { x: number; z: number; tipo: string; etiqueta: string }
const solidos: Solido[] = [];
for (const p of wd.vegetation.props) solidos.push({ x: p.x, z: p.y, tipo: p.kind, etiqueta: p.model ?? p.node ?? p.kind });
// Dispersión que bloquea, LEÍDA DE LAS PÁGINAS ACTIVAS (ow.scatter sólo tenía
// las 4 de la parcela cuando se construyó el overworld; ahora están las 117).
// Incluye también los colocados a mano (`placements`): scatterRegion los mete
// en la lista del tipo, así que volver a contarlos desde el JSON duplicaría.
for (const pg of ow.stream.activePages) {
  for (const [id, buf] of Object.entries(pg.kinds)) {
    const k = wd.vegetation.kinds[id];
    if (!k || k.blockRadius <= 0) continue;
    for (let i = 0; i < buf.length; i += 9) solidos.push({ x: buf[i]!, z: buf[i + 2]!, tipo: 'scatter', etiqueta: id });
  }
}

// --- Grupos de ≥10 sólidos a ≤12 m (vecindad por cubos) -------------------------
const G = PROPUESTA.grupoRadio;
const cubos = new Map<number, number[]>();
const ck = (a: number, b: number): number => (a + 8192) * 65536 + (b + 8192);
solidos.forEach((o, i) => {
  const k = ck(Math.floor(o.x / G), Math.floor(o.z / G));
  let b = cubos.get(k);
  if (!b) cubos.set(k, (b = []));
  b.push(i);
});
const recuento = new Int32Array(solidos.length);
solidos.forEach((o, i) => {
  const bx = Math.floor(o.x / G);
  const bz = Math.floor(o.z / G);
  let n = 0;
  for (let dz = -1; dz <= 1; dz++)
    for (let dx = -1; dx <= 1; dx++) {
      const l = cubos.get(ck(bx + dx, bz + dz));
      if (!l) continue;
      for (const j of l) {
        const q = solidos[j]!;
        if (Math.hypot(q.x - o.x, q.z - o.z) <= G) n++;
      }
    }
  recuento[i] = n;
});
const esNucleo = new Uint8Array(solidos.length);
solidos.forEach((o, i) => {
  if (recuento[i]! < PROPUESTA.grupoObstaculos) return;
  const bx = Math.floor(o.x / G);
  const bz = Math.floor(o.z / G);
  for (let dz = -1; dz <= 1; dz++)
    for (let dx = -1; dx <= 1; dx++) {
      const l = cubos.get(ck(bx + dx, bz + dz));
      if (!l) continue;
      for (const j of l) {
        if (j === i) continue;
        const q = solidos[j]!;
        if (Math.hypot(q.x - o.x, q.z - o.z) > G) continue;
        // el máximo local gana; empate → índice menor (determinista)
        if (recuento[j]! > recuento[i]! || (recuento[j]! === recuento[i]! && j < i)) return;
      }
    }
  esNucleo[i] = 1;
  const p = pageOf(o.x, o.z);
  if (p >= 0) {
    const a = paginas[p]!;
    a.nucleos++;
    a.nucleosList.push([Math.round(o.x), Math.round(o.z), recuento[i]!]);
  }
  const zn = zoneMap.zoneAt({ x: o.x, y: o.z });
  if (zn) {
    const za = zonas.get(zn.id) ?? (zonas.set(zn.id, mk()), zonas.get(zn.id)!);
    za.nucleos++;
  }
});

// --- Recorrido de muestras (rejilla de anclas del juego: paso 2 m) --------------
const paso = PROPUESTA.pasoMuestra;
for (let z = Math.floor(bounds.z0 / paso) * paso + paso / 2; z < bounds.z1; z += paso) {
  for (let x = Math.floor(bounds.x0 / paso) * paso + paso / 2; x < bounds.x1; x += paso) {
    const gi = cellIndex(x, z);
    const b = gi >= 0 ? blocked[gi] : 2;
    const p = pageOf(x, z);
    if (p < 0) continue;
    const a = paginas[p]!;
    const zn = zoneMap.zoneAt({ x, y: z });
    let za: Acc | undefined;
    if (zn) {
      za = zonas.get(zn.id);
      if (!za) zonas.set(zn.id, (za = mk()));
      za.muestra++;
    }
    a.muestra++;
    if (b === 2) continue; // fuera del mundo
    const causa = b !== 0 ? CAUSA[gi]! : 0;
    if (causa === 3) {
      a.mar++;
      if (za) za.mar++;
      continue; // mar o región no pisable: no es tierra
    }
    a.tierra++;
    if (za) za.tierra++;
    subAdd(x, z, 0, 1);
    const dp = DIST[mz(z) * MW + mx(x)]!;
    const enCamino = onPath[mz(z) * MW + mx(x)] === 1;
    a.sumaDist += dp; a.nDist++;
    if (za) { za.sumaDist += dp; za.nDist++; }
    if (!enCamino) {
      if (dp < a.minDist) a.minDist = dp;
      if (dp > a.maxDist) a.maxDist = dp;
      if (za) {
        if (dp < za.minDist) za.minDist = dp;
        if (dp > za.maxDist) za.maxDist = dp;
      }
    }
    if (b !== 0) {
      if (causa === 2) { a.poza++; if (za) za.poza++; }
      else if (causa === 1) { a.prop++; if (za) za.prop++; }
      else if (causa === 4) { a.veg++; if (za) za.veg++; }
      else { a.otro++; if (za) za.otro++; }
      continue;
    }
    a.walk++;
    subAdd(x, z, 1, 1);
    if (za) za.walk++;
    if (disco(x, z, 4)) { a.d4++; if (za) za.d4++; }
    if (disco(x, z, 5)) { a.d5++; if (za) za.d5++; }
    if (disco(x, z, 6)) {
      a.d6++;
      subAdd(x, z, 2, 1);
      if (za) za.d6++;
    }
  }
}
// sólidos por página y zona (obstáculos que bloquean el paso)
for (const o of solidos) {
  const p = pageOf(o.x, o.z);
  if (p >= 0) paginas[p]!.obstaculos++;
  const zn = zoneMap.zoneAt({ x: o.x, y: o.z });
  if (zn) {
    let za = zonas.get(zn.id);
    if (!za) zonas.set(zn.id, (za = mk()));
    za.obstaculos++;
  }
}
// --- Cuellos de camino: perfil perpendicular cada 1 m de arco --------------------
// Ancho caminable = racha continua de puntos caminables a lo largo de la normal,
// centrada en el eje (si el eje está bloqueado, la racha que lo toca).
const cuelloPorPagina = new Map<number, { muestras: number; bajas: number; rachaMax: number; peorAncho: number; peor: [number, number] }>();
const cuelloPorZona = new Map<string, number>();
let totalMuestrasCamino = 0;
let totalCuellos = 0;
{
  const pasoC = 1; // 1 m de arco
  const half = 4; // ±4 m de perfil, suficiente para caminos ≤ 3.6 m de ancho
  const fine = 0.25;
  for (let pIdx = 0; pIdx < paths.length; pIdx++) {
    const p = paths[pIdx]!;
    const pts = p.points;
    let racha = 0;
    for (let s = 0; s + 1 < pts.length; s++) {
      const a = pts[s]!;
      const b = pts[s + 1]!;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const ux = (b.x - a.x) / len;
      const uz = (b.y - a.y) / len;
      const nx = -uz;
      const nz = ux;
      for (let t = (s === 0 ? 0 : fine); t <= len; t += pasoC) {
        const cx = a.x + ux * t;
        const cz = a.y + uz * t;
        // perfil: offsets de -half..half, racha que contiene el centro
        let ancho = 0;
        {
          // expandir desde el centro hacia ambos lados mientras pise
          let l = 0;
          while (l <= half && walkableAt(cx - nx * l, cz - nz * l)) l += fine;
          let r = 0;
          while (r <= half && walkableAt(cx + nx * r, cz + nz * r)) r += fine;
          ancho = l + r - fine; // centro contado dos veces
        }
        totalMuestrasCamino++;
        const pi = pageOf(cx, cz);
        if (pi >= 0) {
          let e = cuelloPorPagina.get(pi);
          if (!e) cuelloPorPagina.set(pi, (e = { muestras: 0, bajas: 0, rachaMax: 0, peorAncho: 99, peor: [Math.round(cx), Math.round(cz)] }));
          e.muestras++;
          if (ancho < PROPUESTA.anchoCaminableMin) {
            e.bajas++;
            racha++;
            if (racha > e.rachaMax) e.rachaMax = racha;
            if (ancho < e.peorAncho) { e.peorAncho = ancho; e.peor = [Math.round(cx), Math.round(cz)]; }
            totalCuellos++;
            const zn = zoneMap.zoneAt({ x: cx, y: cz });
            if (zn) cuelloPorZona.set(zn.id, (cuelloPorZona.get(zn.id) ?? 0) + 1);
          } else racha = 0;
        }
      }
    }
  }
}

// --- Props que invaden caminos ----------------------------------------------------
// Invasión = la huella toca el polígono del camino (distancia al eje ≤ ancho/2).
// Se comprueba el perímetro del rectángulo de huella (los props sólo giran 90°).
interface Invasion { etiqueta: string; x: number; y: number; w: number; d: number; solape: number; tipo: 'camino' | 'senda' }
const invasiones: Invasion[] = [];
{
  const segDist = (px: number, pz: number, a: { x: number; y: number }, b: { x: number; y: number }): number => {
    const dx = b.x - a.x;
    const dz = b.y - a.y;
    const l2 = dx * dx + dz * dz;
    const t = l2 > 0 ? Math.min(1, Math.max(0, ((px - a.x) * dx + (pz - a.y) * dz) / l2)) : 0;
    return Math.hypot(px - (a.x + dx * t), pz - (a.y + dz * t));
  };
  const tramos = rawPaths.flatMap((p) => p.points.slice(0, -1).map((a, i) => ({ a, b: p.points[i + 1]!, w: p.width, senda: !!p.senda })));
  for (const p of wd.vegetation.props) {
    const x0 = p.x - p.w / 2, x1 = p.x + p.w / 2, y0 = p.y - p.d / 2, y1 = p.y + p.d / 2;
    const esquinas = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
    let minEje = Infinity;
    let senda = false;
    for (let s = 0; s < 4; s++) {
      const a = esquinas[s]!;
      const b = esquinas[(s + 1) % 4]!;
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      for (let t = 0; t <= len; t += 0.25) {
        const x = a.x + ((b.x - a.x) * t) / len;
        const y = a.y + ((b.y - a.y) * t) / len;
        for (const tr of tramos) {
          const d = segDist(x, y, tr.a, tr.b) - tr.w / 2;
          if (d < minEje) { minEje = d; senda = tr.senda; }
        }
      }
    }
    if (minEje < 0) invasiones.push({ etiqueta: p.model ?? p.node ?? p.kind, x: p.x, y: p.y, w: p.w, d: p.d, solape: -minEje, tipo: senda ? 'senda' : 'camino' });
  }
}

// --- Claros alrededor de anclas (piedras, encuentro, inicio) ----------------------
interface Ancla { id: string; x: number; y: number; tipo: string; walkPct: number; obstaculos: number; disco6Cerca: number | null }
const anclas: Ancla[] = [];
{
  const puntos: Array<{ id: string; x: number; y: number; tipo: string }> = [];
  for (const st of stonesJson.stones) puntos.push({ id: st.id, x: st.x, y: st.y, tipo: 'piedra' });
  // las lanchas flotan: no se audan como anclas de suelo
  const off = wd.terrain.encounterOffset;
  for (const [i, sp] of (encounterJson.spawns as Array<{ x: number; y: number }>).slice(0, 3).entries())
    puntos.push({ id: `encuentro${i}`, x: sp.x + off.x, y: sp.y + off.y, tipo: 'encuentro' });
  puntos.push({ id: 'playerStart', x: wd.terrain.playerStart.x, y: wd.terrain.playerStart.y, tipo: 'inicio' });
  for (const pt of puntos) {
    const R = 10;
    let walk = 0; let tot = 0;
    for (let dz = -R; dz <= R; dz += 1)
      for (let dx = -R; dx <= R; dx += 1) {
        if (Math.hypot(dx, dz) > R) continue;
        tot++;
        if (walkableAt(pt.x + dx, pt.y + dz)) walk++;
      }
    const obst = solidos.filter((o) => Math.hypot(o.x - pt.x, o.z - pt.y) <= 8).length;
    // centro de disco-6 válido más cercano
    let mejor: number | null = null;
    for (let r = 0; r <= 12 && (mejor === null || r < mejor); r += 2)
      for (let ang = 0; ang < (r === 0 ? 1 : 16); ang++) {
        const a = (ang / 16) * Math.PI * 2;
        const x = pt.x + Math.cos(a) * r;
        const z = pt.y + Math.sin(a) * r;
        if (disco(x, z, PROPUESTA.claroRadio)) { mejor = r; break; }
      }
    anclas.push({ id: pt.id, x: pt.x, y: pt.y, tipo: pt.tipo, walkPct: Math.round((1000 * walk) / tot) / 10, obstaculos: obst, disco6Cerca: mejor });
  }
}
// --- Fila por página ------------------------------------------------------------
interface FilaPagina {
  ix: number; iz: number; nombre: string;
  tierraPct: number; caminablePct: number;
  bloqueoVegPct: number; bloqueoPropPct: number; bloqueoMarPct: number; bloqueoPozaPct: number;
  obstaculos: number; obstaculosPorHa: number;
  distMedia: number; distMin: number; distMax: number;
  disco4: number; disco5: number; disco6: number;
  cuelloMuestras: number; cuelloRachaMax: number; cuelloAnchoPeor: number; cuelloDonde: [number, number] | null;
  nucleos: number; nucleosTop: Array<[number, number, number]>;
  celdas16sinClaro: number; combatePct: number;
  banderas: string[]; puntuacion: number; riesgo: 'bajo' | 'medio' | 'alto';
}
const filas: FilaPagina[] = [];
for (let iz = 0; iz < NPZ; iz++) {
  for (let ix = 0; ix < NPX; ix++) {
    const a = paginas[iz * NPX + ix]!;
    const c = cuelloPorPagina.get(iz * NPX + ix);
    const tierra = a.tierra;
    const pct = (n: number): number => (tierra > 0 ? Math.round((1000 * n) / tierra) / 10 : 0);
    const ha = (tierra * paso * paso) / 10000;
    const obstHa = ha > 0 ? Math.round((10 * a.obstaculos) / ha) / 10 : 0;
    const cuelloMuestras = c?.bajas ?? 0;
    // subrejilla 16 m de esta página: celdas con tierra y sin ningún disco-6
    const celdasSinClaro: Array<{ cx: number; cz: number; tierra: number; walkPct: number }> = [];
    for (let sz = 0; sz < SUB; sz++)
      for (let sx = 0; sx < SUB; sx++) {
        const base = ((iz * NPX + ix) * SUB + sz) * SUB * 3;
        const t = sub[base + sx * 3]!;
        const w = sub[base + sx * 3 + 1]!;
        const d6 = sub[base + sx * 3 + 2]!;
        if (t >= 16 && d6 === 0) celdasSinClaro.push({ cx: sx, cz: sz, tierra: t, walkPct: t > 0 ? Math.round((100 * w) / t) : 0 });
      }
    const banderas: string[] = [];
    if (tierra >= 50 && pct(a.walk) < PROPUESTA.walkableMinPct) banderas.push('caminable_bajo');
    if (ha >= 0.5 && obstHa > PROPUESTA.obstaculosPorHaMax) banderas.push('obstaculos_altos');
    if ((c?.rachaMax ?? 0) >= PROPUESTA.muestrasCuelloMin) banderas.push('cuello_camino');
    if (a.nucleos >= PROPUESTA.nucleosPorPagina) banderas.push('grupos_densos');
    const combatePct = a.walk > 0 ? Math.round((1000 * a.d6) / a.walk) / 10 : 0;
    if (tierra >= 50 && (a.d6 === 0 || combatePct < PROPUESTA.combateMinPct)) banderas.push('combate_bajo');
    const riesgo: FilaPagina['riesgo'] = banderas.length === 0 ? 'bajo' : banderas.length <= 2 ? 'medio' : 'alto';
    const pctMuestra = (n: number): number => (a.muestra > 0 ? Math.round((1000 * n) / a.muestra) / 10 : 0);
    filas.push({
      ix, iz, nombre: `p${ix}_${iz}`,
      tierraPct: pctMuestra(tierra),
      caminablePct: pct(a.walk),
      bloqueoVegPct: pct(a.veg), bloqueoPropPct: pct(a.prop), bloqueoMarPct: pctMuestra(a.mar), bloqueoPozaPct: pct(a.poza),
      obstaculos: a.obstaculos, obstaculosPorHa: obstHa,
      distMedia: a.nDist > 0 ? Math.round((10 * a.sumaDist) / a.nDist) / 10 : 0,
      distMin: a.minDist === Infinity ? 0 : Math.round(a.minDist * 10) / 10,
      distMax: a.maxDist === -Infinity ? 0 : Math.round(a.maxDist * 10) / 10,
      disco4: a.d4, disco5: a.d5, disco6: a.d6,
      cuelloMuestras, cuelloRachaMax: c?.rachaMax ?? 0,
      cuelloAnchoPeor: c && c.peorAncho < 99 ? Math.round(c.peorAncho * 100) / 100 : 99,
      cuelloDonde: c && c.peorAncho < 99 ? c.peor : null,
      nucleos: a.nucleos, nucleosTop: a.nucleosList.sort((p, q) => q[2] - p[2] || p[0] - q[0] || p[1] - q[1]).slice(0, 3),
      celdas16sinClaro: celdasSinClaro.length, combatePct,
      banderas, puntuacion: banderas.length, riesgo,
    });
  }
}
// --- Fila por zona ----------------------------------------------------------------
interface FilaZona {
  id: string; nombre: string; safe: boolean; planeada: boolean;
  muestras: number; tierraPct: number; caminablePct: number;
  bloqueoVegPct: number; bloqueoPropPct: number; bloqueoMarPct: number;
  obstaculosPorHa: number; disco4: number; disco5: number; disco6: number;
  disco6PorCaminable: number; cuelloMuestras: number; nucleos: number;
  distMedia: number; distMax: number;
}
const filasZona: FilaZona[] = [];
for (const z of zonesJson.zones as Array<Record<string, unknown>>) {
  const id = String(z.id);
  const a = zonas.get(id);
  if (!a) { filasZona.push({ id, nombre: String(z.name), safe: !!z.safe, planeada: (z.areas as unknown[])?.length === 0, muestras: 0, tierraPct: 0, caminablePct: 0, bloqueoVegPct: 0, bloqueoPropPct: 0, bloqueoMarPct: 0, obstaculosPorHa: 0, disco4: 0, disco5: 0, disco6: 0, disco6PorCaminable: 0, cuelloMuestras: 0, nucleos: 0, distMedia: 0, distMax: 0 }); continue; }
  const pct = (n: number): number => (a.tierra > 0 ? Math.round((1000 * n) / a.tierra) / 10 : 0);
  const ha = (a.tierra * paso * paso) / 10000;
  const obsZ = a.obstaculos;
  filasZona.push({
    id, nombre: String(z.name), safe: !!z.safe, planeada: (z.areas as unknown[])?.length === 0,
    muestras: a.muestra, tierraPct: Math.round((1000 * a.tierra) / a.muestra) / 10, caminablePct: pct(a.walk),
    bloqueoVegPct: pct(a.veg), bloqueoPropPct: pct(a.prop), bloqueoMarPct: a.muestra > 0 ? Math.round((1000 * a.mar) / a.muestra) / 10 : 0,
    obstaculosPorHa: ha > 0 ? Math.round((10 * obsZ) / ha) / 10 : 0,
    disco4: a.d4, disco5: a.d5, disco6: a.d6,
    disco6PorCaminable: a.walk > 0 ? Math.round((1000 * a.d6) / a.walk) / 10 : 0,
    cuelloMuestras: cuelloPorZona.get(id) ?? 0,
    nucleos: a.nucleos,
    distMedia: a.nDist > 0 ? Math.round((10 * a.sumaDist) / a.nDist) / 10 : 0,
    distMax: a.maxDist === -Infinity ? 0 : Math.round(a.maxDist * 10) / 10,
  });
}

// --- Salida ----------------------------------------------------------------------
const worst = [...filas].sort((p, q) => q.puntuacion - p.puntuacion || p.caminablePct - q.caminablePct || p.nombre.localeCompare(q.nombre));
// huella estable de las entradas en crudo (mismas rutas que usa el juego):
const ENTRADAS = ['data/terrain.json', 'data/vegetation.json', 'data/zones.json', 'data/panama.json', 'data/relieve.json', 'data/rpg/fishing.json', 'data/stones.json', 'data/encounter.json', 'data/navpaint.json'];
const hash = createHash('sha256');
for (const e of ENTRADAS) {
  hash.update(e);
  hash.update(readFileSync(path.join(ROOT, e)));
}
const resultado = {
  _nota: 'Auditoría de densidad. Umbrales PROPUESTA. NO integrada. Geometría: rejilla del juego (0.5 m) tras cargar las 117 páginas + agua de pesca + navpaint.',
  _fecha: '2026-11-09',
  _propuesta: PROPUESTA,
  _inputsSha256: hash.digest('hex'),
  totales: {
    mundo: bounds, paginas: NPX * NPZ, solidos: solidos.length,
    nucleosGrupo: esNucleo.reduce((n, v) => n + v, 0),
    muestrasCamino: totalMuestrasCamino, muestrasCuello: totalCuellos,
    invasiones: invasiones.length,
  },
  paginas: filas,
  zonas: filasZona,
  peores: worst.filter((f) => f.puntuacion > 0).slice(0, 12),
  caminos: {
    porPagina: [...cuelloPorPagina.entries()].map(([k, v]) => ({
      pagina: `p${k % NPX}_${Math.floor(k / NPX)}`, muestras: v.muestras, bajo3m: v.bajas,
      rachaMax: v.rachaMax, anchoPeor: Math.round(v.peorAncho * 100) / 100, donde: v.peor,
    })).filter((v) => v.bajo3m > 0 || v.rachaMax > 0).sort((a, b) => b.rachaMax - a.rachaMax),
    invasiones: invasiones.sort((a, b) => b.solape - a.solape),
  },
  anclas: anclas.sort((a, b) => a.walkPct - b.walkPct),
};
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(path.join(OUT_DIR, 'resultados.json'), JSON.stringify(resultado, null, 1) + '\n');

// --- SVG de riesgo por página ----------------------------------------------------
const CW = 64;
const svg: string[] = [];
svg.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${NPX * CW + 190} ${NPZ * CW + 96}" font-family="sans-serif">`);
svg.push(`<rect width="100%" height="100%" fill="#ffffff"/>`);
svg.push(`<text x="10" y="24" font-size="16" fill="#222">Densidad por página de 128 m — % caminable (tierra) y banderas. X = este, Y = norte del mundo (x0=${bounds.x0}, z0=${bounds.z0}).</text>`);
const colorea = (f: FilaPagina): string => {
  if (f.tierraPct < 5) return '#d8d8d8';
  if (f.riesgo === 'alto') return '#e4572e';
  if (f.riesgo === 'medio') return '#f4b942';
  if (f.disco6 === 0 && f.tierraPct >= 25) return '#b23a48';
  return '#4c9f38';
};
for (const f of filas) {
  const x = f.ix * CW + 10;
  const y = (NPZ - 1 - f.iz) * CW + 48;
  svg.push(`<rect x="${x}" y="${y}" width="${CW - 2}" height="${CW - 2}" fill="${colorea(f)}" stroke="#ffffff"/>`);
  svg.push(`<text x="${x + 4}" y="${y + 16}" font-size="11" fill="#111">${f.caminablePct.toFixed(0)}%</text>`);
  svg.push(`<text x="${x + 4}" y="${y + 30}" font-size="9" fill="#111">${f.nombre}${f.banderas.length ? ' ⚑' + f.banderas.length : ''}</text>`);
  if (f.disco6 === 0 && f.tierraPct >= 25) svg.push(`<text x="${x + 4}" y="${y + 44}" font-size="10" fill="#7a0c1c">sin-6m</text>`);
}
let ly = NPZ * CW + 64;
svg.push(`<text x="10" y="${ly}" font-size="12" fill="#222">Verde: sin banderas · Amarillo: 1–2 · Naranja: ≥3 · Rojo oscuro: tierra ≥25 % sin ningún disco de 6 m · Gris: &lt;5 % tierra.</text>`);
ly += 18;
svg.push(`<text x="10" y="${ly}" font-size="12" fill="#222">Banderas (PROPUESTA, calibrada sobre las 46 páginas con tierra): caminable &lt;45 % · &gt;300 sólidos/ha · cuello de camino (racha ≥5 muestras &lt;3 m) · ≥10 núcleos de grupo (10 sólidos a 12 m) · combate bajo (&lt;50 % de lo caminable admite disco de 6 m).</text>`);
svg.push('</svg>');
writeFileSync(path.join(OUT_DIR, 'mapa_densidad.svg'), svg.join('\n'));

const resumen = worst.slice(0, 10).map((f) => `${f.nombre} ${f.riesgo} ${f.puntuacion}b cam=${f.caminablePct}% obst/ha=${f.obstaculosPorHa} d6=${f.disco6} nucleos=${f.nucleos} [${f.banderas.join(',')}]`);
console.log('[auditoría] páginas con bandera:', filas.filter((f) => f.banderas.length > 0).length, '/', filas.length);
console.log('[auditoría] top riesgo:\n  ' + resumen.join('\n  '));
console.log('[auditoría] cuellos página con racha:', [...cuelloPorPagina.values()].filter((v) => v.rachaMax >= 1).length, '· muestras de camino:', totalMuestrasCamino, '· bajo 3 m:', totalCuellos);
console.log('[auditoría] invasiones de camino:', invasiones.map((iv) => `${iv.etiqueta}@${iv.x},${iv.y} solape=${iv.solape.toFixed(2)}${iv.tipo === 'senda' ? ' (senda)' : ''}`).join(' | ') || 'ninguna');
console.log('[auditoría] anclas con <80% caminable en 10 m:', anclas.filter((an) => an.walkPct < 80).map((an) => `${an.id}:${an.walkPct}%`).join(' ') || 'ninguna');
console.log('[auditoría] sólidos totales:', solidos.length, '· núcleos de grupo:', esNucleo.reduce((n, v) => n + v, 0));
console.log('[auditoría] SHA-256 entradas:', resultado._inputsSha256.slice(0, 16), '…');
console.log('[auditoría] listos: resultados.json, mapa_densidad.svg');
