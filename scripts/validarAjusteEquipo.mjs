// OMP-POL-08: validador del ajuste del equipo a medida sobre el cuerpo (La Diablica Espeja
// puesto en los seis héroes).
//
//   node scripts/validarAjusteEquipo.mjs [salida.json]
//   AJUSTE=otraTabla.json MUESTRAS=8 node scripts/validarAjusteEquipo.mjs
//
// Mide con los datos reales del juego: carga `<héroe>.glb` + `equipo.glb` en la misma
// escena con Babylon (NullEngine) y replica la colocación de `attachFitted`
// (src/render/characters/heldGear.ts) con la tabla `data/art/ajusteEquipo.json`. Posea el
// esqueleto cuadro a cuadro de Reposo / Correr / Atacar con los AnimationGroups del GLB
// (goToFrame + skeleton.prepare, lo mismo que hace el motor al dibujar) y aplica el skin
// en CPU con las matrices del esqueleto.
//
// Fallo = la piel del héroe ASOMA por delante de la superficie de la pieza (la coraza se
// clava en el cuerpo y la corta): un punto de cuerpo a más de 5 mm por delante de la
// normal del punto de pieza más cercano, dentro de un cono de 55° (descarta el roce en
// bordes y sisas) y a menos de 6 cm de la pieza, con la pared de la pieza de por medio ya
// descartada (prueba de placa, de plantilla de 4 cm y de 7/12 rayos que escapan). La ropa
// puesta POR DENTRO del cuerpo no es un fallo visible: una chaqueta envuelve el torso; no
// se cuenta.
//
// Aprobación (medida POL-08, 2026-11-23): antes del arreglo 25 072 puntos; después
// 11 341 (−55 %) con la escala recortada al 1,6 que exige `tests/eq10_diablicaEspeja.test.ts`
// (en los hombrones el guante largo pediría 1,79). Listón con margen: total ≤ 12 000,
// guantes ≤ 8 300, blusa en el pecho ≤ 2 200.
//
// Cuerpo medido = lo que el juego deja visible con el set entero puesto (gltfCharacter:
// caen Ropa, Ropa2, Traje y las caras alternas; el sombrero se quita el pelo entero).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = process.argv[2] ?? path.join(ROOT, 'work/omp-pol08/fallos.json');
const AJUSTE = JSON.parse(fs.readFileSync(process.env.AJUSTE ?? path.join(ROOT, 'data/art/ajusteEquipo.json'), 'utf8'));

const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine.js');
const { Scene } = await import('@babylonjs/core/scene.js');
const { SceneLoader } = await import('@babylonjs/core/Loading/sceneLoader.js');
const { Vector3, Quaternion, Matrix } = await import('@babylonjs/core/Maths/math.js');
await import('@babylonjs/core/Meshes/mesh.js');
await import('@babylonjs/loaders/glTF/index.js');

const HEROES = process.env.HEROES ? process.env.HEROES.split(',') : [
    'centinela_anime', 'centinela_f_anime', 'oraculo_anime', 'oraculo_f_anime', 'cazador_anime', 'cazador_f_anime',
];
const SET = process.env.SET ?? 'diablica_espeja';
const MUESTRAS = Number(process.env.MUESTRAS ?? 8);
const MIN = 0.005;    // 5 mm asomando: por debajo, tangente
const MAXD = 0.06;    // más lejos de 6 cm, la pieza no es "su" ropa
const CELDA = 0.06;
const COS = Math.cos((55 * Math.PI) / 180);
const TAPA = 0.002;    // 2 mm de pieza por delante de un punto de piel ya lo tapa
// Lo del héroe que puede asomar a través del equipo: la piel y lo que el set no retira.
const PIEL = /^(Piel|Cara_0)([._]|$)/;  // sólo piel: el pelo bajo el sombrero y el zapato bajo la bota son doble capa querida

const engine = new NullEngine();
const MD = path.join(ROOT, 'assets/models') + '/';
const leer = (p) => fs.readFileSync(p);

/** Vértices poseados de una malla con skin: Σ w·M_bone·v, normal con el hueso dominante. */
function skin(mesh, matrices, paso = 1) {
    const p = mesh.getVerticesData('position');
    const nrm = mesh.getVerticesData('normal');
    const mi = mesh.getVerticesData('matricesIndices');
    const mw = mesh.getVerticesData('matricesWeights');
    const W = mesh.computeWorldMatrix(true);
    const pts = [];
    const nor = [];
    const m = new Matrix();
    for (let i = 0, vi = 0; i < p.length; i += 3 * paso, vi += paso) {
        const v = new Vector3(p[i], p[i + 1], p[i + 2]);
        let o = new Vector3(0, 0, 0);
        let dom = 0, domW = -1;
        for (let k = 0; k < 4; k++) {
            const b = mi ? mi[vi * 4 + k] : 0;
            const ww = mw ? mw[vi * 4 + k] : 1;
            if (!ww || b < 0 || b === undefined) continue;
            Matrix.FromArrayToRef(matrices, b * 16, m);
            o.addInPlace(Vector3.TransformCoordinates(v, m).scale(ww));
            if (ww > domW) { domW = ww; dom = b; }
        }
        pts.push(Vector3.TransformCoordinates(o, W));
        Matrix.FromArrayToRef(matrices, dom * 16, m);
        const nn = nrm ? Vector3.TransformNormal(new Vector3(nrm[i], nrm[i + 1], nrm[i + 2]), m) : new Vector3(0, -1, 0);
        nor.push(Vector3.TransformNormal(nn, W).normalize());
    }
    return { pts, nor };
}

/** Como el `copy` de attachFitted: heredero del hueso animado con su TRS local. */
class TransformLike {
    constructor(parent, local) { this.parent = parent; this.local = local; }
    // vectores fila de Babylon: mundo = local · mundo del padre
    world() { return this.local.multiply(this.parent.computeWorldMatrix(true)); }
}

async function hero(heroe, fit) {
    const scene = new Scene(engine);
    await SceneLoader.AppendAsync('', leer(`${MD}${heroe}.glb`), scene, undefined, '.glb');
    await SceneLoader.AppendAsync('', leer(`${MD}equipo.glb`), scene, undefined, '.glb');
    const sk = scene.skeletons[0];
    // joints como el juego: descendientes de la raíz del héroe por nombre de hueso
    const joints = new Map();
    for (const t of scene.transformNodes) {
        const n = t.name.includes(':') ? t.name.slice(t.name.indexOf(':') + 1) : t.name;
        if (fit[n] && !joints.has(n)) joints.set(n, t);
    }
    let root = joints.get('hips');
    while (root && root.parent) root = root.parent;
    const rootInv = root.computeWorldMatrix(true).clone().invert();
    const g = [];
    const cuerpo = [];
    for (const mesh of scene.meshes) {
        const m = new RegExp(`^obj_(${SET}_\\w+)@([A-Za-z]+)(?:_primitive\\d+)?$`).exec(mesh.name);
        if (m) {
            const [, itemId, bone] = m;
            const f = fit[bone];
            const joint = joints.get(bone);
            mesh.setEnabled(false);
            if (!f || !joint) continue;
            // attachFitted, calcado: rel del hueso en reposo; local = C(at,rot,scale) · rel⁻¹
            const rel = joint.computeWorldMatrix(true).multiply(rootInv);
            const local = Matrix.Compose(
                new Vector3(...f.scale),
                new Quaternion(...f.rot),
                new Vector3(...f.at),
            ).multiply(rel.invert());
            g.push({ itemId, bone, node: new TransformLike(joint, local), source: mesh });
            continue;
        }
        const base = mesh.name.includes(':') ? mesh.name.slice(mesh.name.indexOf(':') + 1) : mesh.name;
        if (mesh.skeleton === sk && PIEL.test(base)) cuerpo.push(mesh);
        else mesh.setEnabled(false);
    }
    return { scene, sk, joints, g, cuerpo };
}

const DUMP = process.env.DUMP ? [] : null;

function rejilla(superficie) {
    const cells = new Map();
    for (const s of superficie) {
        for (let i = 0; i < s.pts.length; i++) {
            const p = s.pts[i];
            const k = `${Math.floor(p.x / CELDA)},${Math.floor(p.y / CELDA)},${Math.floor(p.z / CELDA)}`;
            let arr = cells.get(k);
            if (!arr) cells.set(k, (arr = []));
            arr.push([p, s.nor[i], s.id]);
        }
    }
    // triángulos por celda de su centroide (para disparar rayos desde la piel)
    const tgrid = new Map();
    for (const s of superficie) {
        const tri = s.tri;
        for (let t = 0; t < tri.length; t += 9) {
            const mx = (tri[t] + tri[t + 3] + tri[t + 6]) / 3;
            const my = (tri[t + 1] + tri[t + 4] + tri[t + 7]) / 3;
            const mz = (tri[t + 2] + tri[t + 5] + tri[t + 8]) / 3;
            const k = `${Math.floor(mx / CELDA)},${Math.floor(my / CELDA)},${Math.floor(mz / CELDA)}`;
            let arr = tgrid.get(k);
            if (!arr) tgrid.set(k, (arr = []));
            arr.push(tri.subarray(t, t + 9));
        }
    }
    return { cells, tgrid };
}

/** Rayo o→d (normalizada), t∈(0,maxT): triángulo más cercano de la lista; devuelve [t, nx, ny, nz]. */
function rayTri(ox, oy, oz, dx, dy, dz, maxT, tris) {
    let best = null;
    for (const tri of tris) {
        const e1x = tri[3] - tri[0], e1y = tri[4] - tri[1], e1z = tri[5] - tri[2];
        const e2x = tri[6] - tri[0], e2y = tri[7] - tri[1], e2z = tri[8] - tri[2];
        const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
        const det = e1x * px + e1y * py + e1z * pz;
        if (det > -1e-12 && det < 1e-12) continue;
        const inv = 1 / det;
        const tx = ox - tri[0], ty = oy - tri[1], tz = oz - tri[2];
        const u = (tx * px + ty * py + tz * pz) * inv;
        if (u < -1e-6 || u > 1 + 1e-6) continue;
        const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
        const w = (dx * qx + dy * qy + dz * qz) * inv;
        if (w < -1e-6 || u + w > 1 + 1e-6) continue;
        const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
        if (t <= 1e-4 || t >= maxT) continue;
        if (!best || t < best[0]) {
            best = [t, e1y * e2z - e1z * e2y, e1z * e2x - e1x * e2z, e1x * e2y - e1y * e2x];
        }
    }
    return best;
}

const COS_RAYO = Math.cos((50 * Math.PI) / 180);
const ESC = 0.45; // rayo de piel que no cruza pieza en 45 cm se ve

/**
 * Asoma real = la piel está delante de la pieza, hay pared paralela detrás y nada la tapa:
 *  1) candidato: vértice de piel p a 5–60 mm por delante de la normal del punto de pieza
 *     más cercano (cono 55°);
 *  2) placa: el rayo p → −nq cruza un triángulo de frente (≤50°) a prof ± 25 mm;
 *  3) plantilla: p movido ±7 mm en las tangentes dispara igual ≥ 3 de 4 veces (la tela
 *     sigue siendo pared detrás del parche; en un borde de puño o cuello el lateral sale al aire);
 *  4) visibilidad: ≥7 de 12 rayos por el hemisferio de la normal de la piel escapan sin
 *     cruzar ninguna pieza (si otra tela la tapa, el fallo no se ve).
 */
function asoma(cuerpoPts, { cells, tgrid }) {
    const porPieza = {};
    let total = 0, fallos = 0;
    const trisCerca = (p) => {
        const cx = Math.floor(p.x / CELDA), cy = Math.floor(p.y / CELDA), cz = Math.floor(p.z / CELDA);
        const out = [];
        for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
            const arr = tgrid.get(`${cx + x},${cy + y},${cz + z}`);
            if (arr) for (const t of arr) out.push(t);
        }
        return out;
    };
    const placa = (p, nq, tris, prof) => {
        const h = rayTri(p.x, p.y, p.z, -nq.x, -nq.y, -nq.z, prof + 0.03, tris);
        if (!h) return false;
        const nl = Math.hypot(h[1], h[2], h[3]);
        if (Math.abs((h[1] * nq.x + h[2] * nq.y + h[3] * nq.z) / nl) < COS_RAYO) return false;
        return Math.abs(h[0] - prof) <= 0.025;
    };
    // triángulos de todas las celdas que cruza el rayo (la mano dentro de la pollera sólo
    // está tapada si la tela de la falda, lejos del punto, corta la vista)
    const trisEnRayo = (p, d) => {
        const seen = new Set();
        const out = [];
        const paso = CELDA * 0.7;
        for (let t = paso * 0.5; t < ESC; t += paso) {
            const k = `${Math.floor((p.x + d.x * t) / CELDA)},${Math.floor((p.y + d.y * t) / CELDA)},${Math.floor((p.z + d.z * t) / CELDA)}`;
            const arr = tgrid.get(k);
            if (!arr) continue;
            for (const tri of arr) {
                const key = tri[0] * 1e7 + tri[1] * 1e4 + tri[2] * 10;
                if (seen.has(key)) continue;
                seen.add(key);
                out.push(tri);
            }
        }
        return out;
    };
    const escapa = (p, n) => {
        const a = Math.abs(n.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
        const t1 = Vector3.Cross(n, a).normalize();
        const t2 = Vector3.Cross(n, t1).normalize();
        let e = 0;
        for (let i = 0; i < 12; i++) {
            const r = 0.85 * Math.sqrt((i + 0.5) / 12);
            const th = 2.399963 * i;
            const d = t1.scale(r * Math.cos(th)).add(t2.scale(r * Math.sin(th))).add(n.scale(Math.sqrt(1 - r * r))).normalize();
            if (!rayTri(p.x, p.y, p.z, d.x, d.y, d.z, ESC, trisEnRayo(p, d))) e++;
        }
        return e;
    };
    for (const c of cuerpoPts) {
        total += c.pts.length;
        for (let i = 0; i < c.pts.length; i++) {
            const p = c.pts[i];
            const cx = Math.floor(p.x / CELDA), cy = Math.floor(p.y / CELDA), cz = Math.floor(p.z / CELDA);
            let mejor = null;
            for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
                const arr = cells.get(`${cx + x},${cy + y},${cz + z}`);
                if (!arr) continue;
                for (const [q, nq, id] of arr) {
                    const d = p.subtract(q);
                    const dd = d.length();
                    if (dd > MAXD || dd < 1e-6) continue;
                    const prof = Vector3.Dot(d, nq);
                    if (prof > MIN && prof > dd * COS && (!mejor || prof > mejor.prof)) mejor = { prof, id, nq, q };
                }
            }
            if (!mejor) continue;
            const tris = trisCerca(p);
            if (!tris.length || !placa(p, mejor.nq, tris, mejor.prof)) continue;
            // plantilla tangencial
            const a = Math.abs(mejor.nq.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
            const t1 = Vector3.Cross(mejor.nq, a).normalize();
            const t2 = Vector3.Cross(mejor.nq, t1).normalize();
            let ok = 0;
            for (const sv of [t1, t1.scale(-1), t2, t2.scale(-1)]) {
                if (placa(p.add(sv.scale(0.007)), mejor.nq, tris, mejor.prof)) ok++;
            }
            if (ok < 3) continue;   // borde de prenda: la piel sale por la boca, no a través
            if (escapa(p, c.nor[i]) < 7) continue;   // otra tela la tapa: no se ve
            fallos++;
            const sp = (porPieza[mejor.id] ??= { pts: 0, mm: 0, porMalla: {} });
            sp.pts++;
            if (mejor.prof > sp.mm) sp.mm = Math.round(mejor.prof * 10000) / 10;
            const qq = (sp.porMalla[c.id] ??= { pts: 0, mm: 0 });
            qq.pts++;
            if (mejor.prof > qq.mm) qq.mm = Math.round(mejor.prof * 10000) / 10;
            if (DUMP) DUMP.push({ heroe: DUMP.h, pose: DUMP.pose, f: DUMP.f, malla: c.id, id: mejor.id, qw: mejor.q.asArray().map((v)=>Math.round(v*1000)/1000), q: mejor.nq.asArray().map((v)=>Math.round(v*1000)/1000),
                prof: Math.round(mejor.prof * 1000) / 1000,
                p: p.asArray().map((v) => Math.round(v * 1000) / 1000) });
        }
    }
    return { porPieza, total, fallos };
}

const todo = [];
for (const heroe of HEROES) {
    const fit = AJUSTE[heroe];
    if (!fit) { process.stdout.write(`XX sin tabla: ${heroe}\n`); continue; }
    const { scene, sk, joints, g, cuerpo } = await hero(heroe, fit);
    // el sombrero del set tapa el pelo entero (coversHair del yelmo/casco): el pelo bajo el
    // `head` no puede asomar sin que primero falle el `head`; se deja, el holgazán manda.
    for (const [pose, clip] of Object.entries({ reposo: 'Reposo', correr: 'Correr', atacar: 'Atacar' })) {
        const ag = scene.animationGroups.find((a) => a.name.endsWith(clip));
        ag.start(true, 1, ag.from, ag.to);
        const frames = Array.from({ length: MUESTRAS + 1 }, (_, i) => ag.from + ((ag.to - ag.from) * i) / MUESTRAS);
        for (const f of frames) {
            ag.goToFrame(f);
            sk.prepare(true);
            const mats = sk.getTransformMatrices(cuerpo[0]);
            const cuerpoPts = cuerpo.map((mm) => {
                const paso = Math.max(1, Math.floor(mm.getTotalVertices() / 2000));
                const r = skin(mm, mats, paso);
                r.id = mm.name.includes(':') ? mm.name.slice(mm.name.indexOf(':') + 1) : mm.name;
                return r;
            });
            const sup = g.map((pi) => {
                const pos = pi.source.getVerticesData('position');
                const nrm = pi.source.getVerticesData('normal');
                const W = pi.node.world();
                const paso = Math.max(1, Math.floor(pos.length / 3 / 900));
                const pts = [], nor = [];
                for (let i = 0; i < pos.length; i += 3 * paso) {
                    pts.push(Vector3.TransformCoordinates(new Vector3(pos[i], pos[i + 1], pos[i + 2]), W));
                    nor.push(Vector3.TransformNormal(new Vector3(nrm[i], nrm[i + 1], nrm[i + 2]), W).normalize());
                }
                // triángulos de la pieza en mundo (para saber si la pared tapa la piel)
                const idx = pi.source.getIndices();
                const tri = new Float32Array((idx ? idx.length : 0) * 3);
                if (idx) {
                    const v = new Vector3();
                    for (let t = 0; t < idx.length; t++) {
                        v.set(pos[idx[t] * 3], pos[idx[t] * 3 + 1], pos[idx[t] * 3 + 2]);
                        const w = Vector3.TransformCoordinates(v, W);
                        tri[t * 3] = w.x; tri[t * 3 + 1] = w.y; tri[t * 3 + 2] = w.z;
                    }
                }
                return { pts, nor, tri, id: `${pi.itemId.replace(`${SET}_`, '')}@${pi.bone}` };
            });
            if (DUMP) { DUMP.h = heroe; DUMP.pose = pose; DUMP.f = +f.toFixed(0);
                for (const pi of sup) {
                    let lo = [9, 9, 9], hi = [-9, -9, -9];
                    for (const q of pi.pts) for (let a = 0; a < 3; a++) { if (q.asArray()[a] < lo[a]) lo[a] = q.asArray()[a]; if (q.asArray()[a] > hi[a]) hi[a] = q.asArray()[a]; }
                    if (pi.id.includes('hand')) DUMP.cajas = DUMP.cajas || [];
                    if (pi.id.includes('hand')) DUMP.cajas.push({ pose, f: +f.toFixed(0), id: pi.id, lo: lo.map((v)=>Math.round(v*100)/100), hi: hi.map((v)=>Math.round(v*100)/100) });
                } }
            const r = asoma(cuerpoPts, rejilla(sup));
            const peores = Object.entries(r.porPieza)
                .sort((a, b) => b[1].pts - a[1].pts)
                .map(([k, v]) => `${k}:${Math.round((1000 * v.pts) / r.total) / 10}%(${v.mm}mm)`)
                .join(' ');
            todo.push({ heroe, pose, frame: +f.toFixed(2), pct: Math.round((1000 * r.fallos) / r.total) / 10, piezas: r.porPieza });
            process.stdout.write(`XX ${heroe.padStart(18)} ${pose.padEnd(7)} f${String(+f.toFixed(0)).padStart(3)} ${String(todo.at(-1).pct).padStart(5)}% ${peores}\n`);
        }
        ag.stop();
    }
    scene.dispose();
}
// hoja de fallos: por héroe y pose, lo peor agregado por pieza
const hoja = [];
for (const r of todo) {
    for (const [pieza, v] of Object.entries(r.piezas)) {
        hoja.push({ heroe: r.heroe, pose: r.pose, frame: r.frame, pieza, puntos: v.pts, mm: v.mm, porMalla: v.porMalla });
    }
}
hoja.sort((a, b) => b.puntos - a.puntos);
if (DUMP) fs.writeFileSync(SALIDA.replace(/\.json$/, '') + '.pokes.json', JSON.stringify(DUMP));
fs.writeFileSync(SALIDA, JSON.stringify({ cuadros: todo.map(({ piezas, ...r }) => r), hoja }, null, 1));
process.stdout.write(`XX escrito ${SALIDA} (${hoja.length} filas de fallos)\n`);

// veredicto
const porPieza = {};
for (const r of hoja) porPieza[r.pieza] = (porPieza[r.pieza] || 0) + r.puntos;
const total = Object.values(porPieza).reduce((a, b) => a + b, 0);
const tope = (n) => Object.entries(porPieza).filter(([k]) => k.includes(n)).reduce((a, [, b]) => a + b, 0);
const mal = [];
if (total > 12000) mal.push(`total ${total} > 12 000`);
if (tope('hands@hand') > 8300) mal.push(`guantes ${tope('hands@hand')} > 8 300`);
if (tope('chest@chest') > 2200) mal.push(`blusa en el pecho ${tope('chest@chest')} > 2 200`);
if (HEROES.some((h) => !AJUSTE[h])) mal.push('falta la tabla de algún héroe');
process.stdout.write(mal.length ? `FAIL ${mal.join('; ')}\n`
    : `OK ajuste de equipo: ${total} pts (guantes ${tope('hands@hand')}, blusa ${tope('chest@chest')})\n`);
engine.dispose();
process.exit(mal.length ? 1 : 0);
