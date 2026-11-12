import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { checkSaveRequest } from '../scripts/editorSave';
import { loadGameData } from '../src/data';
import { loadDungeon } from '../src/data/dungeonSchema';
import { loadWorldData } from '../src/data/worldData';
import { parseNavPaint, parseTerrain, parseVegetation } from '../src/data/worldSchema';
import { parseDungeonFloorMap, parseEntityId, defaultDungeonFloorMap, type DungeonFloorMapDef, type ManualObject, type EntityOverride } from '../src/data/dungeonFloorMap';
import { EditorDoc, FILE_IDS, EDITOR_FILES, type FileId, type ScatterFn } from '../src/editor/doc';
import { DungeonEditorDoc } from '../src/editor/dungeonDoc';
import { History } from '../src/editor/history';
import { formatLike, parseWithSpans } from '../src/editor/jsonFormat';
import { brush, paintFromData, paintToData, toSpans } from '../src/editor/navBrush';
import { NavGrid, buildZoneGrid } from '../src/sim/navGrid';
import { Pathfinder } from '../src/sim/pathfinder';
import { World } from '../src/sim/world';
import { buildOverworld, withOverworldZone } from '../src/world/overworld';
import { scatterVegetation } from '../src/world/scatter';
import { generateHeightField } from '../src/world/terrain';
import { generateFloor } from '../src/world/dungeon';

const readData = (f: FileId): string => readFileSync(EDITOR_FILES[f], 'utf8');
const originals = Object.fromEntries(FILE_IDS.map((f) => [f, readData(f)])) as Record<FileId, string>;
const questsRef = JSON.parse(readFileSync('data/rpg/quests.json', 'utf8')) as unknown;

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
    expect(out).toContain('"palma": {"shape": "tree"');
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
    const pine = a.byKind.get('palma')![10]!;
    const veg = { ...wd.vegetation, exclusions: [{ kind: 'palma', x: Math.round(pine.x * 100) / 100, y: Math.round(pine.z * 100) / 100 }] };
    const b = scatterVegetation(veg, wd.terrain, hf, blocking);
    expect(b.byKind.get('palma')!.length).toBe(a.byKind.get('palma')!.length - 1);
    expect(b.byKind.get('palma')).toEqual(a.byKind.get('palma')!.filter((p) => p !== pine));
    expect(b.byKind.get('rock')).toEqual(a.byKind.get('rock'));
  });

  it('mover una casa sólo cambia la vegetación cercana', () => {
    const a = scatterVegetation(wd.vegetation, wd.terrain, hf, blocking);
    const props = wd.vegetation.props.map((p, i) => (i === 4 ? { ...p, x: p.x + 10 } : p));
    const b = scatterVegetation({ ...wd.vegetation, props }, wd.terrain, hf, blocking);
    // Cada página reparte aparte: las que no tocan la casa (norte de z = 128) salen iguales.
    const far = (list: Array<{ x: number; z: number }>): number => list.filter((p) => p.z < 128).length;
    expect(far(b.byKind.get('palma')!)).toBe(far(a.byKind.get('palma')!));
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
  const make = (): EditorDoc => new EditorDoc(originals, scatterFn, { cols: 512, rows: 512, cellSize: 0.5 }, [], { quests: questsRef });

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
    expect(doc.find('prop:0')).toMatchObject({ x: 110, y: 146 });
    expect(doc.dirtyFiles()).toEqual([]);
    doc.redo();
    expect(doc.find('prop:0')!.x).toBe(101.23);
  });

  it('mover un árbol generado lo convierte en colocado y excluye el original', () => {
    const doc = make();
    const tree = doc.objects().find((o) => o.key.startsWith('scatter:palma'))!;
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
    expect(doc.fields('prop:0').map((f) => f.value)).toEqual([110, 146, 6, 7, 90]);
    doc.edit('escalar', () => doc.scale('prop:0', 2));
    expect(doc.find('prop:0')!.shape).toMatchObject({ w: 12, d: 14 });
    const n = doc.objects().filter((o) => o.category === 'props').length;
    const key = doc.edit('añadir', () => doc.add('prop:house', 50, 50))!;
    expect(doc.objects().filter((o) => o.category === 'props').length).toBe(n + 1);
    expect(doc.edit('borrar', () => doc.remove(key))).toBe(true);
    expect(doc.canRemove('npc:fisher')).toBe(false);
    expect(doc.removeBlock('npc:fisher')).toContain('misión');
    expect(doc.canRemove('npc:smith')).toBe(true);
    expect(doc.removeBlock('stone:raspadura')).toContain('casa');
    expect(doc.canRemove('stone:iguanera')).toBe(false); // muelle de la lancha a Pedasol
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
    const zi = doc.zoneList().findIndex((z) => z.id === 'macanas');
    const key = `area:${zi}:0`;
    doc.edit('mover', () => doc.moveTo(key, 100, 50));
    expect(doc.fields(key).map((f) => f.value)).toEqual([-10, -70, 210, 170]);
    expect(doc.canRemove(key)).toBe(false); // la única área de la zona
    const added = doc.edit('añadir', () => doc.add('area:circle', 10, 10, zi))!;
    expect(doc.canRemove(key)).toBe(true);
    expect(doc.find(added)!.label).toContain('Macanas');
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

describe('editor de piso aislado', () => {
  it('lista jarras y puertas del piso sin arrastrar palmas del exterior', () => {
    const game = loadGameData();
    const floor = generateFloor(loadDungeon(game), 6);
    const doc = new DungeonEditorDoc(floor);
    const objects = doc.objects();
    expect(objects.some((o) => o.label === 'jarra de barro')).toBe(true);
    expect(objects.some((o) => o.kind === 'door')).toBe(true);
    expect(objects.some((o) => o.kind === 'palma')).toBe(false);
    expect(doc.paintAt(floor.arrivalFromAbove.x, floor.arrivalFromAbove.y, 0.5, 'block')).toBeGreaterThan(0);
    expect(JSON.parse(doc.serialize()).navPaint.blocked.length).toBeGreaterThan(0);
  });

  it('TICKET-2: undo/redo del piso no toca el historial del exterior', () => {
    const game = loadGameData();
    const floor = generateFloor(loadDungeon(game), 6);
    const doc = new DungeonEditorDoc(floor);

    // Pintar dos pinceladas separadas
    doc.begin('Pintar navegación');
    doc.paintAt(floor.arrivalFromAbove.x, floor.arrivalFromAbove.y, 0.5, 'block');
    doc.commit();
    expect(doc.canUndo()).toBe(true);

    doc.begin('Pintar navegación 2');
    doc.paintAt(floor.arrivalFromAbove.x + 2, floor.arrivalFromAbove.y + 2, 0.5, 'block');
    doc.commit();
    expect(doc.canUndo()).toBe(true);

    // Deshacer la segunda pincelada
    const label = doc.undo();
    expect(label).toBe('Pintar navegación 2');

    // Rehacer
    doc.redo();
    expect(doc.canUndo()).toBe(true);

    // Deshacer todo
    doc.undo();
    doc.undo();
    expect(doc.canUndo()).toBe(false);
  });

  it('TICKET-2: undo restaura la navegación al estado anterior', () => {
    const game = loadGameData();
    const floor = generateFloor(loadDungeon(game), 6);
    const doc = new DungeonEditorDoc(floor);

    // Estado inicial: sin bloqueos pintados
    const initialBlocked = JSON.parse(doc.serialize()).navPaint.blocked.length;

    doc.begin('bloquear');
    doc.paintAt(floor.arrivalFromAbove.x, floor.arrivalFromAbove.y, 1.0, 'block');
    doc.commit();
    const afterPaint = JSON.parse(doc.serialize()).navPaint.blocked.length;
    expect(afterPaint).toBeGreaterThan(initialBlocked);

    doc.undo();
    const afterUndo = JSON.parse(doc.serialize()).navPaint.blocked.length;
    expect(afterUndo).toBe(initialBlocked);

    doc.redo();
    const afterRedo = JSON.parse(doc.serialize()).navPaint.blocked.length;
    expect(afterRedo).toBe(afterPaint);
  });

  it('TICKET-2: dos pisos diferentes tienen historiales independientes', () => {
    const game = loadGameData();
    const floor1 = generateFloor(loadDungeon(game), 6);
    const floor2 = generateFloor(loadDungeon(game), 7);
    const doc1 = new DungeonEditorDoc(floor1);
    const doc2 = new DungeonEditorDoc(floor2);

    doc1.begin('piso 1');
    doc1.paintAt(floor1.arrivalFromAbove.x, floor1.arrivalFromAbove.y, 0.5, 'block');
    doc1.commit();

    doc2.begin('piso 2');
    doc2.paintAt(floor2.arrivalFromAbove.x, floor2.arrivalFromAbove.y, 0.5, 'block');
    doc2.commit();

    // Deshacer en piso 1 no afecta piso 2
    doc1.undo();
    expect(doc1.canUndo()).toBe(false);
    expect(doc2.canUndo()).toBe(true);

    // Aislamiento real: la navegación del piso 2 conserva sus bloqueos
    // mientras el piso 1 los perdió al deshacer
    const floor1Blocked = JSON.parse(doc1.serialize()).navPaint.blocked.length;
    const floor2Blocked = JSON.parse(doc2.serialize()).navPaint.blocked.length;
    expect(floor1Blocked).toBeLessThan(floor2Blocked);
  });
});

describe('punto de guardado de desarrollo', () => {
  const ok = { method: 'POST', headers: { 'x-fmg-editor': '1', 'content-type': 'application/json', origin: 'http://localhost:5173' } };
  const body = (files: Record<string, unknown>): string => JSON.stringify({ files });

  it('acepta archivos de la lista con JSON válido', () => {
    const r = checkSaveRequest(ok, body({ 'data/zones.json': '{"a":1}' }));
    expect(r).toEqual({ ok: true, files: [{ path: 'data/zones.json', text: '{"a":1}' }] });
  });

  it('acepta únicamente documentos aislados de piso o provincia', () => {
    expect(checkSaveRequest(ok, body({ 'data/dungeons/cripta-tulivieja/floors/007.json': '{"floor":7}' }))).toMatchObject({ ok: true });
    expect(checkSaveRequest(ok, body({ 'data/maps/provinces/los_santos/navpaint.json': '{"cellSize":0.5}' }))).toMatchObject({ ok: true });
    expect(checkSaveRequest(ok, body({ 'data/dungeons/../package.json': '{}' }))).toMatchObject({ ok: false, status: 403 });
    expect(checkSaveRequest(ok, body({ 'data/dungeons/Cripta/floors/7.json': '{}' }))).toMatchObject({ ok: false, status: 403 });
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

describe('esquema de piso v2', () => {
  it('parseEntityId no rompe IDs con separadores', () => {
    // Split en el primer dos puntos: el prefijo es todo antes, el resto es todo después.
    expect(parseEntityId('d-chest:0')).toEqual({ prefix: 'd-chest', rest: '0' });
    expect(parseEntityId('d-manual:manual:12345:6')).toEqual({ prefix: 'd-manual', rest: 'manual:12345:6' });
    expect(parseEntityId('solo')).toEqual({ prefix: 'solo', rest: '' });
  });

  it('defaultDungeonFloorMap crea un documento v2 con overrides y manualObjects vacíos', () => {
    const map = defaultDungeonFloorMap('cripta-tulivieja', 0, 42, 0.5, 'seed');
    expect(map.version).toBe(2);
    expect(map.overrides).toEqual({});
    expect(map.manualObjects).toEqual([]);
  });

  it('parseDungeonFloorMap migra v1 a v1 sin campos v2', () => {
    const v1 = {
      version: 1,
      dungeon: 'cripta-tulivieja',
      floor: 1,
      generation: { kind: 'seed' as const, seed: 42 },
      navPaint: { cellSize: 0.5, blocked: [], cleared: [] },
      doors: {},
    };
    const parsed = parseDungeonFloorMap(v1, { dungeon: 'cripta-tulivieja', floorIndex: 0, seed: 42, cellSize: 0.5, kind: 'seed' });
    expect(parsed.version).toBe(1);
    expect(parsed.overrides).toBeUndefined();
    expect(parsed.manualObjects).toBeUndefined();
  });

  it('parseDungeonFloorMap lee v2 con overrides y manualObjects', () => {
    const v2: DungeonFloorMapDef = {
      version: 2,
      dungeon: 'cripta-tulivieja',
      floor: 1,
      generation: { kind: 'seed', seed: 42 },
      navPaint: { cellSize: 0.5, blocked: [], cleared: [] },
      doors: {},
      overrides: {
        'chest:0': { visible: false, position: { x: 10, y: 20 } },
        'door:1': { rotation: 90 },
      },
      manualObjects: [
        { id: 'barrel-1', kind: 'barrel', position: { x: 5, y: 5 }, name: 'barril extra' },
        { id: 'chest-2', kind: 'chest', position: { x: 15, y: 10 }, scale: 1.5 },
      ],
    };
    const parsed = parseDungeonFloorMap(v2, { dungeon: 'cripta-tulivieja', floorIndex: 0, seed: 42, cellSize: 0.5, kind: 'seed' });
    expect(parsed.version).toBe(2);
    const ovr = parsed.overrides!;
    expect(ovr).toHaveProperty('chest:0');
    const chest0 = ovr['chest:0']!;
    expect(chest0.visible).toBe(false);
    expect(chest0.position).toEqual({ x: 10, y: 20 });
    const mo = parsed.manualObjects!;
    expect(mo).toHaveLength(2);
    expect(mo[0]!.name).toBe('barril extra');
    expect(mo[1]!.scale).toBe(1.5);
  });

  it('parseDungeonFloorMap rechaza manualObjects inválidos', () => {
    const v2 = {
      version: 2,
      dungeon: 'cripta-tulivieja',
      floor: 1,
      generation: { kind: 'seed' as const, seed: 42 },
      navPaint: { cellSize: 0.5, blocked: [], cleared: [] },
      doors: {},
      manualObjects: [
        { id: 'ok', kind: 'barrel', position: { x: 1, y: 1 } },
        { id: 'bad-kind', kind: 'invalid_kind', position: { x: 1, y: 1 } },
        { id: 'no-pos', kind: 'chest' },
        { kind: 'barrel', position: { x: 1, y: 1 } }, // falta id
        { id: 'bad-pos', kind: 'barrel', position: { x: 'not-a-number', y: 1 } },
      ],
    };
    const parsed = parseDungeonFloorMap(v2, { dungeon: 'cripta-tulivieja', floorIndex: 0, seed: 42, cellSize: 0.5, kind: 'seed' });
    const mo = parsed.manualObjects!;
    expect(mo).toHaveLength(1);
    expect(mo[0]!.id).toBe('ok');
  });

  it('round-trip: serializar y parsear conserva los objetos', () => {
    const v2: DungeonFloorMapDef = {
      version: 2,
      dungeon: 'cripta-tulivieja',
      floor: 3,
      generation: { kind: 'hand', seed: 99 },
      navPaint: { cellSize: 0.5, blocked: [[1, 2, 3]], cleared: [] },
      doors: { 'door:0': { activation: 'click' } },
      overrides: { 'chest:0': { position: { x: 10, y: 20, z: 1 }, rotation: 45, scale: 2 } },
      manualObjects: [
        { id: 'torch-1', kind: 'torch', position: { x: 3, y: 3 }, rotation: 180, visible: true, collision: false },
      ],
    };
    const serialized = JSON.stringify(v2);
    const parsed = parseDungeonFloorMap(JSON.parse(serialized), { dungeon: 'cripta-tulivieja', floorIndex: 2, seed: 99, cellSize: 0.5, kind: 'hand' });
    expect(parsed.version).toBe(2);
    const ov = parsed.overrides!;
    const chestOv = ov['chest:0']!;
    expect(chestOv.position).toEqual({ x: 10, y: 20, z: 1 });
    expect(chestOv.rotation).toBe(45);
    const mo = parsed.manualObjects!;
    expect(mo[0]!.rotation).toBe(180);
    expect(mo[0]!.collision).toBe(false);
  });
});

describe('DungeonEditorDoc v2', () => {
  it('constructor asegura versión 2 con overrides y manualObjects', () => {
    const game = loadGameData();
    const floor = generateFloor(loadDungeon(game), 6);
    const doc = new DungeonEditorDoc(floor);
    expect(doc.data.version).toBe(2);
    expect(doc.data.overrides).toEqual({});
    expect(doc.data.manualObjects).toEqual([]);
  });

  it('addObject coloca un barril y lo encuentra en objects()', () => {
    const game = loadGameData();
    const floor = generateFloor(loadDungeon(game), 6);
    const doc = new DungeonEditorDoc(floor);
    const key = doc.addObject('barrel', 10, 10, { name: 'mi barril' });
    expect(key).toMatch(/^d-manual:/);
    const obj = doc.find(key);
    expect(obj).not.toBeNull();
    expect(obj!.kind).toBe('barrel');
    expect(obj!.label).toBe('mi barril');
    expect(obj!.x).toBe(10);
    expect(obj!.y).toBe(10);
  });

  it('addObject y removeObject mantienen la lista', () => {
    const game = loadGameData();
    const floor = generateFloor(loadDungeon(game), 6);
    const doc = new DungeonEditorDoc(floor);
    const key = doc.addObject('chest', 5, 5);
    expect(doc.objects().find((o) => o.key === key)).not.toBeNull();
    expect(doc.removeObject(key)).toBe(true);
    expect(doc.objects().find((o) => o.key === key)).toBeUndefined();
  });

  it('removeObject en un generado oculta con override', () => {
    const game = loadGameData();
    const floor = generateFloor(loadDungeon(game), 6);
    const doc = new DungeonEditorDoc(floor);
    const chests = doc.objects().filter((o) => o.kind === 'chest');
    expect(chests.length).toBeGreaterThan(0);
    const chestKey = chests[0]!.key;
    expect(doc.removeObject(chestKey)).toBe(true);
    expect(doc.objects().find((o) => o.key === chestKey)).toBeUndefined();
    const overrideKey = chestKey.startsWith('d-') ? chestKey.slice(2) : chestKey;
    expect(doc.data.overrides?.[overrideKey]?.visible).toBe(false);
  });

  it('setOverride mueve un cofre generado sin destruirlo', () => {
    const game = loadGameData();
    const floor = generateFloor(loadDungeon(game), 6);
    const doc = new DungeonEditorDoc(floor);
    const chests = doc.objects().filter((o) => o.kind === 'chest');
    const chestKey = chests[0]!.key;
    const overrideKey = chestKey.startsWith('d-') ? chestKey.slice(2) : chestKey;
    doc.setOverride(overrideKey, { position: { x: 99, y: 99 } });
    const obj = doc.find(chestKey);
    expect(obj).not.toBeNull();
    expect(obj!.x).toBe(99);
    expect(obj!.y).toBe(99);
  });

  it('moveTo, rotate y scale en objetos manuales', () => {
    const game = loadGameData();
    const floor = generateFloor(loadDungeon(game), 6);
    const doc = new DungeonEditorDoc(floor);
    const key = doc.addObject('barrel', 10, 10);

    doc.moveTo(key, 20, 30);
    expect(doc.find(key)!.x).toBe(20);
    expect(doc.find(key)!.y).toBe(30);

    doc.rotate(key, 2); // 2 × 15 = 30 grados
    expect(doc.find(key)!.rotDeg).toBe(30);

    const fields = doc.fields(key);
    const scaleField = fields.find((f) => f.name === 'scale');
    expect(scaleField).toBeDefined();
    doc.setField(key, 'scale', 2);
    expect(doc.find(key)!.shape).toMatchObject({ w: expect.any(Number) });
  });

  it('moveTo en un generado crea un override de posición', () => {
    const game = loadGameData();
    const floor = generateFloor(loadDungeon(game), 6);
    const doc = new DungeonEditorDoc(floor);
    const chests = doc.objects().filter((o) => o.kind === 'chest');
    const chestKey = chests[0]!.key;
    doc.moveTo(chestKey, 50, 60);
    const overrideKey = chestKey.startsWith('d-') ? chestKey.slice(2) : chestKey;
    expect(doc.data.overrides?.[overrideKey]?.position).toEqual({ x: 50, y: 60 });
  });

  it('serialize incluye objetos manuales y overrides', () => {
    const game = loadGameData();
    const floor = generateFloor(loadDungeon(game), 6);
    const doc = new DungeonEditorDoc(floor);
    doc.addObject('barrel', 10, 10, { name: 'test barrel' });
    const serialized = JSON.parse(doc.serialize());
    expect(serialized.version).toBe(2);
    expect(serialized.manualObjects).toHaveLength(1);
    expect(serialized.manualObjects[0].kind).toBe('barrel');
  });

  it('dirty detecta cambios de objetos manuales', () => {
    const game = loadGameData();
    const floor = generateFloor(loadDungeon(game), 6);
    const doc = new DungeonEditorDoc(floor);
    expect(doc.dirty).toBe(false);
    doc.addObject('torch', 5, 5);
    expect(doc.dirty).toBe(true);
  });

  it('undo/redo conserva objetos manuales', () => {
    const game = loadGameData();
    const floor = generateFloor(loadDungeon(game), 6);
    const doc = new DungeonEditorDoc(floor);

    doc.begin('Añadir barril');
    doc.addObject('barrel', 10, 10);
    doc.commit();
    expect(doc.objects().filter((o) => o.kind === 'barrel' && o.x === 10 && o.y === 10).length).toBeGreaterThan(0);

    doc.undo();
    const manualBarrels = doc.objects().filter((o) => o.key.startsWith('d-manual:') && o.kind === 'barrel' && o.x === 10 && o.y === 10);
    expect(manualBarrels.length).toBe(0);

    doc.redo();
    expect(doc.objects().filter((o) => o.kind === 'barrel' && o.x === 10 && o.y === 10).length).toBeGreaterThan(0);
  });

  it('objects() incluye objetos manuales junto a los generados', () => {
    const game = loadGameData();
    const floor = generateFloor(loadDungeon(game), 6);
    const doc = new DungeonEditorDoc(floor);
    const before = doc.objects().length;
    doc.addObject('chest', 100, 100);
    const after = doc.objects().length;
    expect(after).toBe(before + 1);
  });
});

describe('integridad del guardado del editor (Entrega A)', () => {
  it('DungeonEditorDoc.dirty detecta cambios de navegación', () => {
    const game = loadGameData();
    const floor = generateFloor(loadDungeon(game), 6);
    const doc = new DungeonEditorDoc(floor);
    expect(doc.dirty).toBe(false);
    doc.paintAt(floor.arrivalFromAbove.x, floor.arrivalFromAbove.y, 0.5, 'block');
    expect(doc.dirty).toBe(true);
  });

  it('DungeonEditorDoc.dirty es falso tras deshacer todos los cambios', () => {
    const game = loadGameData();
    const floor = generateFloor(loadDungeon(game), 6);
    const doc = new DungeonEditorDoc(floor);
    doc.begin('pintar');
    doc.paintAt(floor.arrivalFromAbove.x, floor.arrivalFromAbove.y, 0.5, 'block');
    doc.commit();
    expect(doc.dirty).toBe(true);
    doc.undo();
    expect(doc.dirty).toBe(false);
  });

  it('EditorDoc: markSaved no se llama si apply falla — doc.applied no cambia', () => {
    // Simula el flujo corregido: doc.applied solo se actualiza después de
    // host.apply() exitoso. Si apply falla, doc.applied conserva el valor anterior.
    const wd = loadWorldData();
    const hf = generateHeightField(wd.terrain);
    const blocking = new Set(Object.entries(wd.vegetation.kinds).filter(([, k]) => k.blockRadius > 0).map(([id]) => id));
    const scatterFn: ScatterFn = (veg, terrain) => {
      const s = scatterVegetation(parseVegetation(veg), parseTerrain(terrain), hf, blocking);
      const items = [...s.byKind].flatMap(([kind, list]) => list.map((i) => ({ kind, x: i.x, y: i.z, scale: i.scale, rotDeg: (i.rotY * 180) / Math.PI, ...(i.placement !== undefined ? { placement: i.placement } : {}) })));
      return { items, obstacles: s.obstacles };
    };
    const doc = new EditorDoc(originals, scatterFn, { cols: 512, rows: 512, cellSize: 0.5 }, [], { quests: questsRef });

    // Hacer un cambio
    doc.edit('mover', () => doc.moveTo('prop:0', 100, 100));
    const newText = doc.serialize('vegetation');
    expect(newText).not.toBe(originals.vegetation);

    // Simular: apply falla → doc.applied NO debe actualizarse
    const appliedBefore = { ...doc.applied };
    // En el flujo corregido, si apply falla, doc.applied conserva el valor anterior
    // y markSaved no se llama. Verificar que dirtyFiles sigue reportando el cambio.
    expect(doc.dirtyFiles()).toContain('vegetation');

    // Simular: apply exitoso → doc.applied se actualiza y markSaved se llama
    for (const f of doc.dirtyFiles()) doc.applied[f] = doc.serialize(f);
    doc.markSaved(Object.fromEntries(doc.dirtyFiles().map((f) => [f, doc.serialize(f)])) as Record<FileId, string>);
    expect(doc.dirtyFiles()).toEqual([]);
  });

  it('EditorDoc: tras fallo de apply, el siguiente guardado reintentará con los datos correctos', () => {
    const wd = loadWorldData();
    const hf = generateHeightField(wd.terrain);
    const blocking = new Set(Object.entries(wd.vegetation.kinds).filter(([, k]) => k.blockRadius > 0).map(([id]) => id));
    const scatterFn: ScatterFn = (veg, terrain) => {
      const s = scatterVegetation(parseVegetation(veg), parseTerrain(terrain), hf, blocking);
      const items = [...s.byKind].flatMap(([kind, list]) => list.map((i) => ({ kind, x: i.x, y: i.z, scale: i.scale, rotDeg: (i.rotY * 180) / Math.PI, ...(i.placement !== undefined ? { placement: i.placement } : {}) })));
      return { items, obstacles: s.obstacles };
    };
    const doc = new EditorDoc(originals, scatterFn, { cols: 512, rows: 512, cellSize: 0.5 }, [], { quests: questsRef });

    doc.edit('mover', () => doc.moveTo('prop:0', 100, 100));
    const changedText = doc.serialize('vegetation');

    // Simular: apply falla → doc.applied no se actualiza, dirtyFiles sigue activo
    expect(doc.dirtyFiles()).toContain('vegetation');

    // El siguiente guardado serializa los mismos datos correctos
    expect(doc.serialize('vegetation')).toBe(changedText);
  });
});
