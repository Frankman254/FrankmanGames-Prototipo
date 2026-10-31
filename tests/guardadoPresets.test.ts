// Guardado con lugar, migración, 12 ranuras, partidas de prueba, medidor de
// daño y música local (rama `guardado-presets`).
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadDungeon } from '../src/data/dungeonSchema';
import { loadWorldData } from '../src/data/worldData';
import { PRESET_GROUPS, buildPresetSave, parsePresets, presetPlace, presetProblems, loadPresets, type PresetWorld } from '../src/dev/presets';
import { parseLocalMusic, pickTrack, placeKeys } from '../src/audio/localMusic';
import { Character } from '../src/rpg/character';
import type { SaveData, SavePlace } from '../src/rpg/contracts';
import { RpgSessionFactory } from '../src/rpg/session';
import { DamageMeter } from '../src/sim/damageMeter';
import type { GameEvent } from '../src/sim/events';
import { Rng } from '../src/sim/rng';
import { World } from '../src/sim/world';
import { ZoneMap } from '../src/sim/zones';
import { MemoryStore, SLOT_COUNT, SaveStore, isSaveData, migrateSave, normalizePlace } from '../src/ui/menus/saveStore';
import { floorTitle, generateFloor } from '../src/world/dungeon';
import { buildOverworld, withOverworldZone } from '../src/world/overworld';
import { nearestStone, pointInZone, resolvePlace, type PlaceWorld } from '../src/world/placement';
import { parseStones } from '../src/world/stones';
import stonesJson from '../data/stones.json';
import presetsJson from '../data/dev/presets.json';

const data = withOverworldZone(loadGameData(), buildOverworld(loadWorldData()));
const content = data.rpg;
const dungeon = loadDungeon(data);
const stonesDef = parseStones(stonesJson);
const factory = new RpgSessionFactory(content);
// Rejilla real del mundo abierto (lo que usa `main` para decidir).
const outdoor = new World(data, { seed: 1, encounter: false, zones: false });
const stonePos = (id: string): { x: number; y: number } => {
  const z = stonesDef.stones.find((s) => s.id === id)!;
  return outdoor.grid.center(outdoor.grid.nearestWalkable(z));
};

function placeWorld(known: string[] = stonesDef.stones.map((s) => s.id)): PlaceWorld {
  return {
    width: data.zone.width,
    depth: data.zone.depth,
    walkable: (p) => outdoor.grid.walkable(p),
    dungeons: { crypt: { floors: dungeon.floors.length, entrance: { x: dungeon.entrance.x, y: dungeon.entrance.y } } },
    stones: stonesDef.stones.map((s) => ({ id: s.id, ...stonePos(s.id) })),
    known,
    home: stonesDef.home,
  };
}

function presetWorld(): PresetWorld {
  return {
    zones: new ZoneMap(data.zones),
    width: data.zone.width,
    depth: data.zone.depth,
    dungeons: { crypt: { floors: dungeon.floors.length, title: (f) => floorTitle(dungeon, f) } },
    stones: stonesDef.stones.map((s) => s.id),
    home: stonesDef.home,
    walkable: (p) => outdoor.grid.walkable(p),
  };
}

const place = (p: Partial<SavePlace>): SavePlace => ({ scene: 'overworld', dungeon: null, floor: null, x: null, y: null, stone: null, timeOfDay: null, ...p });

function newSave(name = 'Aldara', classId = 'ember_vanguard'): SaveData {
  return factory.newGame(classId, name, 1).save();
}

describe('12 ranuras', () => {
  it('hay al menos 12; se llenan todas, se listan y se lee cada una', () => {
    expect(SLOT_COUNT).toBeGreaterThanOrEqual(12);
    const store = new SaveStore(new MemoryStore());
    for (let i = 0; i < SLOT_COUNT; i++) store.write(i, { ...newSave(`P${i}`), savedAt: `2026-10-${String(10 + i).padStart(2, '0')}T10:00:00Z` });
    const list = store.list();
    expect(list).toHaveLength(SLOT_COUNT);
    list.forEach((s, i) => expect(s).toMatchObject({ slot: i, name: `P${i}`, label: `P${i}`, classId: 'ember_vanguard', level: 1 }));
    expect(store.firstEmpty()).toBeNull();
    expect(store.latest()).toBe(SLOT_COUNT - 1);
    expect(() => store.read(SLOT_COUNT)).toThrow();
    expect(() => store.read(-1)).toThrow();
  });

  it('el nombre de la ranura se cambia, se limpia y vuelve al del personaje si se deja vacío', () => {
    const store = new SaveStore(new MemoryStore());
    store.write(4, newSave('Ivo'));
    expect(store.rename(4, '  Prueba jefe\n de la cripta  ')).toBe(true);
    expect(store.list()[4]!.label).toBe('Prueba jefe  de la cripta');
    expect(store.read(4)!.name).toBe('Ivo');
    expect(store.rename(4, 'x'.repeat(200))).toBe(true);
    expect(store.list()[4]!.label).toHaveLength(40);
    expect(store.rename(4, '   ')).toBe(true);
    expect(store.list()[4]!.label).toBe('Ivo');
    expect(store.rename(5, 'vacía')).toBe(false);
  });

  it('la lista enseña el sitio, si es mazmorra y el tiempo jugado', () => {
    const store = new SaveStore(new MemoryStore());
    store.write(0, { ...newSave(), place: place({ scene: 'dungeon', dungeon: 'crypt', floor: 1, x: 10, y: 12, name: 'Cripta de la Tulivieja · piso 2', playSeconds: 3725 }) });
    expect(store.list()[0]).toMatchObject({ place: 'Cripta de la Tulivieja · piso 2', scene: 'dungeon', playSeconds: 3725 });
  });
});

describe('guardar y cargar con el lugar', () => {
  it('el guardado lleva el lugar que da `main` y al cargar vuelve igual', () => {
    const s = factory.newGame('storm_weaver', 'Ivo', 7);
    const here = place({ x: 141.5, y: 120.25, stone: 'garza', knownStones: ['raspadura', 'garza'], timeOfDay: 0.8125, playSeconds: 600, name: 'Llanos de Azuero' });
    s.placeProvider = () => here;
    const store = new SaveStore(new MemoryStore());
    store.write(2, s.save());
    const back = store.read(2)!;
    expect(back.place).toEqual(here);
    const loaded = factory.load(back, 9);
    expect(loaded.startPlace).toEqual(here);
    // Sin mundo enlazado todavía, guardar de nuevo conserva el lugar cargado.
    expect(loaded.save().place).toEqual(here);
  });

  it('un sitio caminable del mundo abierto se respeta exactamente', () => {
    const p = stonePos('garza');
    const r = resolvePlace(place({ x: p.x + 0.3, y: p.y - 0.2, stone: 'garza' }), placeWorld());
    expect(r).toEqual({ kind: 'overworld', pos: { x: p.x + 0.3, y: p.y - 0.2 } });
  });

  it('un piso de la cripta que existe pone dentro, con su posición (o la llegada)', () => {
    const f = generateFloor(dungeon, 1);
    expect(resolvePlace(place({ scene: 'dungeon', dungeon: 'crypt', floor: 1, x: f.arrivalFromAbove.x, y: f.arrivalFromAbove.y }), placeWorld())).toEqual({ kind: 'dungeon', dungeon: 'crypt', floor: 1, pos: f.arrivalFromAbove });
    expect(resolvePlace(place({ scene: 'dungeon', dungeon: 'crypt', floor: 2 }), placeWorld())).toEqual({ kind: 'dungeon', dungeon: 'crypt', floor: 2, pos: null });
  });

  it('si el sitio ya no existe, a la Piedra Pintada conocida más cercana', () => {
    const w = placeWorld();
    // Piso que ya no existe: la piedra más cercana a la boca de la cripta.
    const gone = resolvePlace(place({ scene: 'dungeon', dungeon: 'crypt', floor: 99 }), w);
    expect(gone).toEqual({ kind: 'stone', stone: nearestStone(w, dungeon.entrance), reason: 'sin-piso' });
    expect(resolvePlace(place({ scene: 'dungeon', dungeon: 'otra', floor: 0, stone: 'garza' }), w)).toMatchObject({ kind: 'stone', stone: 'garza', reason: 'sin-piso' });
    // Fuera del mundo, cerca de la esquina del Bajareque.
    expect(resolvePlace(place({ x: 400, y: 20 }), w)).toEqual({ kind: 'stone', stone: 'bajareque', reason: 'fuera' });
    // Casilla bloqueada: la piedra conocida más cercana (y sólo entre las conocidas).
    const blocked = { x: 0, y: 0 };
    for (let y = 1; y < data.zone.depth && blocked.x === 0; y += 0.5) for (let x = 1; x < data.zone.width; x += 0.5) if (!outdoor.grid.walkable({ x, y })) { blocked.x = x; blocked.y = y; break; }
    expect(outdoor.grid.walkable(blocked)).toBe(false);
    expect(resolvePlace(place(blocked), placeWorld(['raspadura']))).toEqual({ kind: 'stone', stone: 'raspadura', reason: 'bloqueado' });
  });

  it('sin posición: su piedra de reaparición si la conoce; si no, la de partida', () => {
    expect(resolvePlace(place({ stone: 'cerro_punta' }), placeWorld())).toEqual({ kind: 'stone', stone: 'cerro_punta', reason: 'sin-posicion' });
    expect(resolvePlace(place({ stone: 'cerro_punta' }), placeWorld(['raspadura']))).toEqual({ kind: 'stone', stone: 'raspadura', reason: 'sin-posicion' });
    expect(resolvePlace(undefined, placeWorld())).toEqual({ kind: 'stone', stone: 'raspadura', reason: 'sin-posicion' });
  });
});

describe('migración de guardados antiguos', () => {
  it('sin lugar: en su Piedra Pintada (la que se guardaba aparte por personaje)', () => {
    const mem = new MemoryStore();
    const old = newSave('Viejo');
    delete old.place;
    expect(old.place).toBeUndefined();
    // Ranura 2 de las 3 de antes: misma clave.
    mem.setItem('frankmangames.save.2', JSON.stringify(old));
    mem.setItem('frankmangames.piedras.Viejo', JSON.stringify({ known: ['raspadura', 'garza'], respawn: 'garza' }));
    const store = new SaveStore(mem);
    const back = store.read(2)!;
    expect(back.place).toEqual(place({ stone: 'garza', knownStones: ['raspadura', 'garza'] }));
    expect(resolvePlace(back.place, placeWorld(back.place!.knownStones))).toEqual({ kind: 'stone', stone: 'garza', reason: 'sin-posicion' });
    // Y sin piedras guardadas, la de partida.
    mem.setItem('frankmangames.save.0', JSON.stringify(old));
    mem.removeItem('frankmangames.piedras.Viejo');
    expect(store.read(0)!.place).toEqual(place({}));
    expect(store.list()[0]).toMatchObject({ label: 'Viejo', place: null, scene: 'overworld', playSeconds: 0 });
  });

  it('lugar o nombre rotos se descartan sin perder la partida', () => {
    const raw = { ...newSave('Roto'), place: { scene: 'luna', x: 'a' }, label: 42 };
    const m = migrateSave(raw)!;
    expect(isSaveData(m)).toBe(true);
    expect(m.label).toBeUndefined();
    expect(m.place).toEqual(place({}));
    expect(normalizePlace({ scene: 'dungeon', x: 3, y: Number.NaN, floor: 1.7, timeOfDay: 1.25 })).toEqual(place({ scene: 'dungeon', dungeon: 'crypt', floor: 1, timeOfDay: 0.25 }));
    expect(migrateSave({ version: 2 })).toBeNull();
  });

  it('un guardado antiguo se carga con la lógica real', () => {
    const old = newSave('Viejo', 'storm_weaver');
    delete old.place;
    const s = factory.load(migrateSave(JSON.parse(JSON.stringify(old)))!, 3);
    expect(s.player()).toMatchObject({ name: 'Viejo', classId: 'storm_weaver', level: 1 });
    expect(s.startPlace).toMatchObject({ scene: 'overworld', x: null, y: null });
  });
});

describe('partidas de prueba (data/dev/presets.json)', () => {
  const file = loadPresets();
  const pw = presetWorld();

  it('el archivo se lee y tiene una docena de partidas con ids únicos', () => {
    expect(parsePresets(presetsJson).presets.length).toBe(file.presets.length);
    expect(file.presets.length).toBeGreaterThanOrEqual(12);
    expect(new Set(file.presets.map((p) => p.id)).size).toBe(file.presets.length);
    expect(() => parsePresets({ presets: [{ ...presetsJson.presets[0], place: {} }] })).toThrow();
  });

  it.each(loadPresets().presets.map((p) => [p.id, p] as const))('«%s» referencia objetos, hechizos, zonas y pisos que existen', (_id, p) => {
    expect(presetProblems(content, p, pw)).toEqual([]);
  });

  it.each(loadPresets().presets.map((p) => [p.id, p] as const))('«%s» se monta, se guarda y se carga con lo pedido', (_id, p) => {
    const save = buildPresetSave(content, p, pw, file.allStones);
    expect(isSaveData(save)).toBe(true);
    // Pasa por el almacén como un guardado más.
    const store = new SaveStore(new MemoryStore());
    store.write(0, save);
    const back = store.read(0)!;
    expect(back.place).toEqual(save.place);
    const ch = Character.fromSave(content, back, new Rng(1));
    expect(ch.level).toBe(p.level);
    expect(ch.classDef.id).toBe(p.classId);
    for (const [stat, v] of Object.entries(p.stats)) expect(ch.allocated[stat as keyof typeof ch.allocated]).toBe(v);
    expect(ch.unspentStatPoints).toBe((p.level - 1) * content.progression.statPointsPerLevel - Object.values(p.stats).reduce((a, b) => a + (b ?? 0), 0));
    for (const [slot, e] of Object.entries(p.equipment)) {
      const inst = ch.equipment.get(slot as never);
      expect(inst?.itemId).toBe(e!.itemId);
      for (const b of e!.bonus) expect(inst!.rolled).toContainEqual(b);
    }
    // La barra queda tal cual (nada se cae por nivel o por no conocerlo).
    p.hotbar.forEach((id, i) => expect(ch.spellbook.hotbar[i]).toBe(id));
    for (const s of p.spells) expect(ch.spellbook.rank(s.spellId)).toBe(s.rank);
    if (p.pet) expect(ch.activePetId()).toBe(content.items[p.pet]!.use!.kind === 'summonPet' ? (content.items[p.pet]!.use as { petId: string }).petId : null);
    // El lugar existe y cae donde dice.
    const r = resolvePlace(back.place, placeWorld(back.place!.knownStones));
    if (p.place.kind === 'dungeon') expect(r).toEqual({ kind: 'dungeon', dungeon: p.place.dungeon, floor: p.place.floor, pos: null });
    else {
      // Si la casilla exacta está bloqueada, `main` cae en la piedra; las partidas de prueba no deben.
      expect(r.kind).toBe('overworld');
      if (r.kind === 'overworld') expect(pw.zones.zoneAt(r.pos)?.id).toBe(p.place.zone);
    }
  });

  it('cubren franjas baja/media/alta, ambas clases, elemento puro, mixto, tanque/daño/curación, mazmorra y nivel bajo en zona alta', () => {
    const ps = file.presets;
    for (const g of PRESET_GROUPS) expect(ps.some((p) => p.group === g)).toBe(true);
    for (const c of Object.keys(content.classes)) expect(ps.some((p) => p.classId === c)).toBe(true);
    const damageElements = (p: (typeof ps)[number]): Set<string> => {
      const out = new Set<string>();
      for (const id of p.hotbar) for (const e of id ? (content.spells[id]?.effects ?? []) : []) if (e.type === 'damage') out.add(e.element);
      return out;
    };
    expect(ps.some((p) => damageElements(p).size === 1)).toBe(true);
    expect(ps.some((p) => damageElements(p).size >= 3)).toBe(true);
    for (const role of ['tanque', 'daño', 'curación', 'mixto', 'puro']) expect(ps.some((p) => p.role.includes(role))).toBe(true);
    expect(ps.some((p) => p.place.kind === 'dungeon')).toBe(true);
    const zones = new ZoneMap(data.zones);
    expect(ps.some((p) => p.place.kind === 'zone' && (zones.get(p.place.zone)?.levelMin ?? 0) >= p.level + 20)).toBe(true);
    // Los rótulos de lugar salen bien para la lista.
    for (const p of ps) expect(presetPlace(p, pw, true).name).toBeTruthy();
  });

  it('un punto de zona es de esa zona aunque se solape con otra', () => {
    const zones = new ZoneMap(data.zones);
    // El centro de Azuero cae en el pueblo (que va antes en la lista): se busca uno de Azuero de verdad.
    const p = pointInZone(zones, 'azuero', data.zone.width, data.zone.depth)!;
    expect(zones.zoneAt(p)?.id).toBe('azuero');
    expect(pointInZone(zones, 'darien', data.zone.width, data.zone.depth)).toBeNull();
  });
});

describe('medidor de daño', () => {
  const host = { isPlayer: (id: number) => id === 1, isAlly: (id: number) => id === 1 || id === 2 };
  const hit = (sourceId: number, targetId: number, amount: number, ability: string | null, crit = false): GameEvent => ({ type: 'damage', sourceId, targetId, amount, crit, toPlayer: targetId === 1, ability });

  it('DPS hecho y recibido, golpe máximo, desglose y tiempo en matar', () => {
    const m = new DamageMeter();
    m.record([hit(1, 10, 20, 'spark')], 0, host);
    m.record([hit(1, 10, 50, 'spark', true), hit(2, 10, 10, null), hit(10, 1, 15, 'bite')], 2, host);
    m.record([{ type: 'heal', targetId: 1, amount: 8, source: 'light_bandage' }, hit(1, 10, 30, 'ember_whirl')], 4, host);
    m.record([{ type: 'enemyDeath', enemyId: 10, archetype: 'melee' }], 4, host);
    const r = m.report();
    expect(r.seconds).toBe(4);
    expect(r.dealt).toBe(110);
    expect(r.taken).toBe(15);
    expect(r.healed).toBe(8);
    expect(r.dps).toBeCloseTo(27.5);
    expect(r.dtps).toBeCloseTo(3.75);
    expect(r.biggestDealt).toEqual({ amount: 50, ability: 'spark', crit: true });
    expect(r.biggestTaken).toEqual({ amount: 15, ability: 'bite', crit: false });
    expect(r.abilities.map((l) => [l.ability, l.total, l.hits, l.crits, l.max])).toEqual([
      ['spark', 70, 2, 1, 50],
      ['ember_whirl', 30, 1, 0, 30],
      ['basic', 10, 1, 0, 10],
    ]);
    expect(r.kills).toBe(1);
    expect(r.ttk).toEqual({ last: 4, mean: 4, min: 4, max: 4 });
    expect(r.recentKills).toEqual([{ archetype: 'melee', seconds: 4 }]);
  });

  it('no cuenta lo que no es del jugador y se reinicia', () => {
    const m = new DamageMeter();
    m.record([hit(10, 11, 99, 'x'), { type: 'enemyDeath', enemyId: 11, archetype: 'melee' }], 1, host);
    expect(m.report()).toMatchObject({ dealt: 0, kills: 0, seconds: 0, dps: 0 });
    m.record([hit(1, 12, 5, null)], 2, host);
    m.newScene();
    m.record([{ type: 'enemyDeath', enemyId: 12, archetype: 'melee' }], 3, host);
    expect(m.report().kills).toBe(0);
    m.reset();
    expect(m.report()).toMatchObject({ dealt: 0, taken: 0, abilities: [], biggestDealt: null });
  });
});

describe('música local de pruebas', () => {
  it('lee el mapa sitio → archivo y descarta rutas o archivos que no son audio', () => {
    const r = parseLocalMusic({ dungeon: 'Fate Undiscovered Realms music Part 4.mp3', azuero: '../secreto.mp3', 'crypt-3': 'a/b.ogg', boquete: 'notas.txt', _nota: 'x', _volume: 0.6 });
    expect(r.map).toEqual({ dungeon: 'Fate Undiscovered Realms music Part 4.mp3' });
    expect(r.volume).toBe(0.6);
    expect(r.warnings).toHaveLength(3);
    expect(parseLocalMusic([]).map).toEqual({});
  });

  it('la mazmorra usa su canción; sin clave, la música generada (null)', () => {
    const map = { dungeon: 'cripta.mp3', 'crypt-3': 'jefe.mp3', azuero: 'llanos.ogg' };
    expect(pickTrack(map, placeKeys(0, null))).toBe('cripta.mp3');
    expect(pickTrack(map, placeKeys(2, null))).toBe('jefe.mp3');
    expect(pickTrack(map, placeKeys(null, 'azuero'))).toBe('llanos.ogg');
    expect(pickTrack(map, placeKeys(null, 'chame'))).toBeNull();
    expect(pickTrack({}, placeKeys(0, null))).toBeNull();
  });
});
