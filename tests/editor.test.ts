import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { checkSaveRequest } from '../scripts/editorSave';
import { loadGameData } from '../src/data';
import { loadWorldData } from '../src/data/worldData';
import { parseNavPaint, parseTerrain, parseVegetation } from '../src/data/worldSchema';
import { EditorDoc, FILE_IDS, EDITOR_FILES, type FileId, type ScatterFn } from '../src/editor/doc';
import { History } from '../src/editor/history';
import { formatLike, parseWithSpans } from '../src/editor/jsonFormat';
import { brush, paintFromData, paintToData, toSpans } from '../src/editor/navBrush';
import { NavGrid, buildZoneGrid } from '../src/sim/navGrid';
import { Pathfinder } from '../src/sim/pathfinder';
import { World } from '../src/sim/world';
import { buildOverworld, withOverworldZone } from '../src/world/overworld';
import { scatterVegetation } from '../src/world/scatter';
import { generateHeightField } from '../src/world/terrain';

const readData = (f: FileId): string => readFileSync(EDITOR_FILES[f], 'utf8');
const originals = Object.fromEntries(FILE_IDS.map((f) => [f, readData(f)])) as Record<FileId, string>;

describe('formatLike: guardar con el mismo formato', () => {
  it('sin cambios devuelve el texto idéntico (todos los archivos del editor)', () => {
    for (const f of FILE_IDS) expect(formatLike(originals[f], JSON.parse(originals[f]))).toBe(originals[f]);
  });

  it('un cambio pequeño sólo toca su línea', () => {
    const v = JSON.parse(originals.vegetation);
    v.props[2].x = 143.5;
    const out = formatLike(originals.vegetation, v);
    const a = originals.vegetation.split('\n');
    const b = out.split('\n');
    expect(b.length).toBe(a.length);
    const diff = a.map((l, i) => (l === b[i] ? null : i)).filter((i) => i !== null);
    expect(diff.length).toBe(1);
    expect(b[diff[0]!]).toContain('"x": 143.5');
    // Las líneas alineadas a mano de `kinds` siguen igual.
    expect(out).toContain('"pine":   { "shape": "pine"');
    expect(JSON.parse(out)).toEqual(v);
  });

  it('un elemento nuevo copia el estilo de sus hermanos', () => {
    const v = JSON.parse(originals.vegetation);
    v.props.push({ kind: 'lamp', x: 1, y: 2, w: 0.4, d: 0.4, rotDeg: 0 });
    const out = formatLike(originals.vegetation, v);
    expect(out).toContain('    { "kind": "lamp", "x": 1, "y": 2, "w": 0.4, "d": 0.4, "rotDeg": 0 }\n  ]');
  });

  it('claves nuevas largas van en varias líneas y las cortas en una', () => {
    const src = '{\n  "a": 1\n}\n';
    const out = formatLike(src, { a: 1, b: [], c: { x: 1, y: 2 }, d: [{ kind: 'pine', x: 123.45, y: 67.89, scale: 1.1, rotDeg: 0 }, { kind: 'oak', x: 1, y: 2, scale: 1, rotDeg: 15 }] });
    expect(out).toBe('{\n  "a": 1,\n  "b": [],\n  "c": { "x": 1, "y": 2 },\n  "d": [\n    { "kind": "pine", "x": 123.45, "y": 67.89, "scale": 1.1, "rotDeg": 0 },\n    { "kind": "oak", "x": 1, "y": 2, "scale": 1, "rotDeg": 15 }\n  ]\n}\n');
  });

  it('respeta CRLF y rechaza JSON roto', () => {
    const src = '{\r\n  "a": [1, 2]\r\n}\r\n';
    expect(formatLike(src, { a: [1, 3] })).toBe('{\r\n  "a": [1, 3]\r\n}\r\n');
    expect(() => parseWithSpans('{ "a": }')).toThrow();
  });
});

describe('History (Ctrl+Z / Ctrl+Y)', () => {
  it('apunta sólo lo que cambió, deshace, rehace y un paso nuevo borra el rehacer', () => {
    const h = new History(3);
    expect(h.record('nada', { a: '1' }, { a: '1' })).toBe(false);
    h.record('mover', { a: '1', b: 'x' }, { a: '2', b: 'x' });
    expect(h.undoLabel).toBe('mover');
    const u = h.undo()!;
    expect(u.before).toEqual({ a: '1' });
    expect(h.canRedo).toBe(true);
    expect(h.redo()!.after).toEqual({ a: '2' });
    h.undo();
    h.record('otro', { a: '1' }, { a: '3' });
    expect(h.canRedo).toBe(false);
    for (let i = 0; i < 5; i++) h.record(`p${i}`, { a: String(i) }, { a: String(i + 10) });
    let n = 0;
    while (h.undo()) n++;
    expect(n).toBe(3); // límite
  });
});

describe('pincel de navegación', () => {
  it('bloquea, libera y borra; se guarda en tramos por fila', () => {
    const s = paintFromData({ cellSize: 0.5, blocked: [], cleared: [] }, 20);
    expect(brush(s, 20, 20, 5.1, 5.1, 0.6, 'block')).toBeGreaterThan(1);
    expect(s.blocked.has(10 * 20 + 10)).toBe(true);
    const n = s.blocked.size;
    expect(brush(s, 20, 20, 5.1, 5.1, 0.6, 'block')).toBe(0); // repetir no cambia nada
    brush(s, 20, 20, 5.1, 5.1, 0.1, 'clear');
    expect(s.blocked.size).toBe(n - 1);
    expect(s.cleared.has(10 * 20 + 10)).toBe(true);
    brush(s, 20, 20, 5.1, 5.1, 0.1, 'erase');
    expect(s.cleared.size).toBe(0);
    const data = paintToData(s, 20);
    expect(paintFromData(data, 20).blocked).toEqual(s.blocked);
    expect(toSpans(new Set([3, 4, 5, 7, 21]), 20)).toEqual([[0, 3, 5], [0, 7, 7], [1, 1, 1]]);
  });

  it('la rejilla aplica lo pintado: `cleared` abre un muro y `blocked` cierra campo abierto', () => {
    const paint = { cellSize: 0.5, blocked: [[4, 4, 6]] as Array<[number, number, number]>, cleared: [[10, 10, 10]] as Array<[number, number, number]> };
    const g = buildZoneGrid({ width: 10, depth: 10, cellSize: 0.5, navRadius: 0.4, obstacles: [{ x: 5.25, y: 5.25, w: 2, d: 2 }], navPaint: paint }, []);
    expect(g.walkableCell(10, 10)).toBe(true);
    expect(g.walkableCell(5, 4)).toBe(false);
    expect(g.walkableCell(5, 3)).toBe(true);
    // Otro tamaño de celda: se ignora.
    const g2 = buildZoneGrid({ width: 10, depth: 10, cellSize: 0.25, navRadius: 0.4, obstacles: [], navPaint: paint }, []);
    expect(g2.blocked.reduce((a, b) => a + b, 0)).toBe(NavGrid.fromObstacles(10, 10, 0.25, [], 0.4).blocked.reduce((a, b) => a + b, 0));
    expect(() => parseNavPaint({ cellSize: 0.5, blocked: [[1, 5, 2]], cleared: [] })).toThrow(/blocked\[0\]/);
  });
});

describe('colisión junto a las paredes', () => {
  // Casa de 6 × 6 con las paredes en x = 7 y x = 13 (alineadas con la rejilla de 0,5).
  const house = { x: 10, y: 10, w: 6, d: 6 };
  const radius = 0.45;
  const g = NavGrid.fromObstacles(20, 20, 0.5, [house], radius);
  const pf = new Pathfinder(g);

  it('ningún punto de una celda libre queda a menos del radio de la pared', () => {
    for (let i = 0; i < g.blocked.length; i++) {
      if (g.blocked[i]) continue;
      const c = g.center(i);
      for (const [ox, oy] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) {
        const px = c.x + ox!;
        const py = c.y + oy!;
        const dx = Math.max(Math.abs(px - house.x) - house.w / 2, 0);
        const dy = Math.max(Math.abs(py - house.y) - house.d / 2, 0);
        expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(radius - 1e-9);
      }
    }
  });

  it('clic en la pared: el personaje llega a medio metro de ella (antes se quedaba en el centro de la celda, a 0,75)', () => {
    const path = pf.findPath({ x: 3, y: 10 }, { x: 7.2, y: 10 });
    const end = path[path.length - 1]!;
    expect(7 - end.x).toBeGreaterThan(radius - 1e-6);
    expect(7 - end.x).toBeLessThan(0.52);
    expect(g.walkable(end)).toBe(true);
  });

  it('los troncos redondos bloquean menos en diagonal que una caja', () => {
    const round = NavGrid.fromObstacles(10, 10, 0.5, [{ x: 5, y: 5, w: 1.2, d: 1.2, round: true }], 0.45);
    const box = NavGrid.fromObstacles(10, 10, 0.5, [{ x: 5, y: 5, w: 1.2, d: 1.2 }], 0.45);
    const count = (gg: NavGrid): number => gg.blocked.reduce((a, b) => a + b, 0);
    expect(count(round)).toBeLessThan(count(box));
  });

  it('en el mundo real el jugador sigue llegando de punta a punta y hay enemigos', () => {
    const ow = buildOverworld(loadWorldData());
    const w = new World(withOverworldZone(loadGameData(), ow), { seed: 7, zones: true });
    expect(w.enemies.list.length).toBeGreaterThan(5);
    w.commandMove({ x: 150, y: 60 });
    for (let i = 0; i < 60 * 30 && w.player.path.length > 0; i++) w.tick(1 / 60);
    expect(Math.hypot(w.player.pos.x - 150, w.player.pos.y - 60)).toBeLessThan(1);
  });
});

describe('vegetación editable', () => {
  const wd = loadWorldData();
  const hf = generateHeightField(wd.terrain);
  const blocking = new Set(Object.entries(wd.vegetation.kinds).filter(([, k]) => k.blockRadius > 0).map(([id]) => id));

  it('quitar un árbol no cambia ningún otro', () => {
    const a = scatterVegetation(wd.vegetation, wd.terrain, hf, blocking);
    const pine = a.byKind.get('pine')![10]!;
    const veg = { ...wd.vegetation, exclusions: [{ kind: 'pine', x: Math.round(pine.x * 100) / 100, y: Math.round(pine.z * 100) / 100 }] };
    const b = scatterVegetation(veg, wd.terrain, hf, blocking);
    expect(b.byKind.get('pine')!.length).toBe(a.byKind.get('pine')!.length - 1);
    expect(b.byKind.get('pine')).toEqual(a.byKind.get('pine')!.filter((p) => p !== pine));
    expect(b.byKind.get('rock')).toEqual(a.byKind.get('rock'));
  });

  it('mover una casa sólo cambia la vegetación cercana', () => {
    const a = scatterVegetation(wd.vegetation, wd.terrain, hf, blocking);
    const props = wd.vegetation.props.map((p, i) => (i === 4 ? { ...p, x: p.x + 10 } : p));
    const b = scatterVegetation({ ...wd.vegetation, props }, wd.terrain, hf, blocking);
    const far = (list: Array<{ x: number; z: number }>): number => list.filter((p) => Math.hypot(p.x - 215, p.z - 70) > 20).length;
    expect(far(b.byKind.get('pine')!)).toBe(far(a.byKind.get('pine')!));
  });

  it('sólo los tipos que bloquean salen igual que con todos', () => {
    const all = scatterVegetation(wd.vegetation, wd.terrain, hf);
    const some = scatterVegetation(wd.vegetation, wd.terrain, hf, blocking);
    for (const id of blocking) expect(some.byKind.get(id)).toEqual(all.byKind.get(id));
  });
});

describe('EditorDoc', () => {
  const wd = loadWorldData();
  const hf = generateHeightField(wd.terrain);
  const blocking = new Set(Object.entries(wd.vegetation.kinds).filter(([, k]) => k.blockRadius > 0).map(([id]) => id));
  const scatterFn: ScatterFn = (veg, terrain) => {
    const s = scatterVegetation(parseVegetation(veg), parseTerrain(terrain), hf, blocking);
    const items = [...s.byKind].flatMap(([kind, list]) => list.map((i) => ({ kind, x: i.x, y: i.z, scale: i.scale, rotDeg: (i.rotY * 180) / Math.PI, ...(i.placement !== undefined ? { placement: i.placement } : {}) })));
    return { items, obstacles: s.obstacles };
  };
  const make = (): EditorDoc => new EditorDoc(originals, scatterFn, { cols: 512, rows: 512, cellSize: 0.5 });

  it('lista casas, árboles, PNJ, mercaderes, estanques, áreas de zona y el inicio', () => {
    const objs = make().objects();
    for (const c of ['props', 'trees', 'npcs', 'water', 'zones', 'start']) expect(objs.some((o) => o.category === c), c).toBe(true);
    expect(objs.some((o) => o.key.startsWith('merchant:'))).toBe(true);
  });

  it('mover una casa, deshacer y rehacer; sólo cambia vegetation.json', () => {
    const doc = make();
    doc.begin('mover casa');
    doc.dragging = true;
    doc.moveTo('prop:0', 100, 100);
    doc.moveTo('prop:0', 101.234, 99.5);
    doc.commit();
    expect(doc.dirtyFiles()).toEqual(['vegetation']);
    expect(doc.find('prop:0')).toMatchObject({ x: 101.23, y: 99.5 });
    expect(doc.undo()).toBe('mover casa');
    expect(doc.find('prop:0')).toMatchObject({ x: 112, y: 140 });
    expect(doc.dirtyFiles()).toEqual([]);
    doc.redo();
    expect(doc.find('prop:0')!.x).toBe(101.23);
  });

  it('mover un árbol generado lo convierte en colocado y excluye el original', () => {
    const doc = make();
    const tree = doc.objects().find((o) => o.key.startsWith('scatter:pine'))!;
    const key = doc.edit('mover', () => doc.moveTo(tree.key, tree.x + 3, tree.y));
    expect(key).toMatch(/^placement:\d+$/);
    const objs = doc.objects();
    expect(objs.find((o) => o.key === tree.key)).toBeUndefined();
    expect(objs.find((o) => o.key === key)!.x).toBeCloseTo(tree.x + 3, 1);
    const veg = parseVegetation(doc.copyOf('vegetation'));
    expect(veg.exclusions.length).toBe(1);
    expect(veg.placements.length).toBe(1);
  });

  it('girar una casa cambia la puerta y cambia ancho por fondo; escalar; borrar y añadir', () => {
    const doc = make();
    doc.edit('girar', () => doc.rotate('prop:0', 1));
    expect(doc.fields('prop:0').map((f) => f.value)).toEqual([112, 140, 6, 7, 90]);
    doc.edit('escalar', () => doc.scale('prop:0', 2));
    expect(doc.find('prop:0')!.shape).toMatchObject({ w: 12, d: 14 });
    const n = doc.objects().filter((o) => o.category === 'props').length;
    const key = doc.edit('añadir', () => doc.add('prop:house', 50, 50))!;
    expect(doc.objects().filter((o) => o.category === 'props').length).toBe(n + 1);
    expect(doc.edit('borrar', () => doc.remove(key))).toBe(true);
    expect(doc.canRemove('npc:fisher')).toBe(false);
    expect(doc.remove('start')).toBe(false);
  });

  it('mover un estanque mueve también su sitio de pesca', () => {
    const doc = make();
    doc.edit('mover', () => doc.moveTo('pond:0', 80, 190));
    doc.edit('radio', () => doc.setField('pond:0', 'radius', 7));
    const spot = (doc.copyOf('fishing') as { spots: Record<string, { x: number; y: number; radius: number }> }).spots['meadow_pond']!;
    expect(spot).toMatchObject({ x: 80, y: 190, radius: 7 });
    expect(doc.dirtyFiles().sort()).toEqual(['fishing', 'terrain']);
  });

  it('áreas de zona: mover un rectángulo conserva su tamaño, añadir y borrar', () => {
    const doc = make();
    const zi = doc.zoneList().findIndex((z) => z.id === 'barranco');
    const key = `area:${zi}:0`;
    doc.edit('mover', () => doc.moveTo(key, 100, 50));
    expect(doc.fields(key).map((f) => f.value)).toEqual([36, -14, 164, 114]);
    expect(doc.canRemove(key)).toBe(false); // la única área de la zona
    const added = doc.edit('añadir', () => doc.add('area:circle', 10, 10, zi))!;
    expect(doc.canRemove(key)).toBe(true);
    expect(doc.find(added)!.label).toContain('Barranco');
  });

  it('pintar navegación queda en navpaint.json, se deshace y el texto guardado es válido', () => {
    const doc = make();
    doc.begin('pintar');
    doc.paintAt(100, 100, 1, 'block');
    doc.paintAt(101, 100, 1, 'block');
    doc.commit();
    expect(doc.dirtyFiles()).toEqual(['navpaint']);
    const text = doc.serialize('navpaint');
    const np = parseNavPaint(JSON.parse(text));
    expect(np.blocked.length).toBeGreaterThan(0);
    expect(text).toContain('"_nota"');
    doc.undo();
    expect(doc.dirtyFiles()).toEqual([]);
  });

  it('lo guardado se vuelve a leer igual', () => {
    const doc = make();
    doc.edit('mover', () => doc.moveTo('npc:fisher', 116, 128));
    const text = doc.serialize('npcs');
    expect(JSON.parse(text).npcs.fisher.position).toEqual({ x: 116, y: 128 });
    expect(text.split('\n').length).toBe(originals.npcs.split('\n').length);
  });
});

describe('punto de guardado de desarrollo', () => {
  const ok = { method: 'POST', headers: { 'x-fmg-editor': '1', 'content-type': 'application/json', origin: 'http://localhost:5173' } };
  const body = (files: Record<string, unknown>): string => JSON.stringify({ files });

  it('acepta archivos de la lista con JSON válido', () => {
    const r = checkSaveRequest(ok, body({ 'data/zones.json': '{"a":1}' }));
    expect(r).toEqual({ ok: true, files: [{ path: 'data/zones.json', text: '{"a":1}' }] });
  });

  it('rechaza rutas fuera de la lista, JSON roto, sin cabecera, otro origen u otro método', () => {
    expect(checkSaveRequest(ok, body({ 'src/main.ts': '{}' }))).toMatchObject({ ok: false, status: 403 });
    expect(checkSaveRequest(ok, body({ 'data/../package.json': '{}' }))).toMatchObject({ ok: false, status: 403 });
    expect(checkSaveRequest(ok, body({ 'data/zones.json': '{ roto' }))).toMatchObject({ ok: false, status: 400 });
    expect(checkSaveRequest({ ...ok, headers: { ...ok.headers, 'x-fmg-editor': undefined } }, body({ 'data/zones.json': '{}' }))).toMatchObject({ ok: false, status: 403 });
    expect(checkSaveRequest({ ...ok, headers: { ...ok.headers, origin: 'https://evil.example' } }, body({ 'data/zones.json': '{}' }))).toMatchObject({ ok: false, status: 403 });
    expect(checkSaveRequest({ ...ok, method: 'GET' }, '')).toMatchObject({ ok: false, status: 405 });
    expect(checkSaveRequest(ok, body({}))).toMatchObject({ ok: false, status: 400 });
  });
});
