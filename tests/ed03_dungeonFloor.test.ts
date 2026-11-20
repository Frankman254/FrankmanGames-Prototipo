// ED-03: Editor de mazmorras — pisos guardables y jugables.
// Verifica que un piso editado se serializa, se parsea y se valida correctamente.
import { describe, it, expect } from 'vitest';
import {
    parseDungeonFloorMap,
    defaultDungeonFloorMap,
    type DungeonFloorMapDef,
    type ManualObjectKind,
} from '../src/data/dungeonFloorMap';
import { DungeonEditorDoc } from '../src/editor/dungeonDoc';
import { loadGameData } from '../src/data';
import { loadDungeon } from '../src/data/dungeonSchema';
import { generateFloor } from '../src/world/dungeon';

/** Construye un mapa de piso válido para pruebas. */
function makeValidMap(): DungeonFloorMapDef {
    return {
        version: 2,
        dungeon: 'cripta-tulivieja',
        floor: 7,
        generation: { kind: 'seed', seed: 51931 },
        navPaint: { cellSize: 0.5, blocked: [], cleared: [] },
        doors: {
            '6:door:0': { activation: 'proximity', radius: 2.2 },
        },
        overrides: {},
        manualObjects: [],
    };
}

/** Construye un mapa con objetos manuales y overrides. */
function makeFullMap(): DungeonFloorMapDef {
    return {
        version: 2,
        dungeon: 'cripta-tulivieja',
        floor: 3,
        generation: { kind: 'hand', seed: 42 },
        navPaint: {
            cellSize: 0.5,
            blocked: [[0, 10, 5]],
            cleared: [[0, 20, 3]],
        },
        doors: {
            '0:door:0': { activation: 'click' },
            '1:door:0': { activation: 'proximity', radius: 3.0 },
        },
        overrides: {
            'chest:0': { position: { x: 5.5, y: 3.2 }, rotation: 45, scale: 1.2 },
            'breakable:0': { visible: false },
        },
        manualObjects: [
            {
                id: 'manual:cofre_jefe',
                kind: 'chest' as ManualObjectKind,
                name: 'Cofre del guardián',
                position: { x: 10, y: 10 },
                rotation: 90,
                scale: 1.5,
                collision: true,
                properties: { lootTable: 'boss_chest' },
            },
            {
                id: 'manual:spawn_extra',
                kind: 'spawn' as ManualObjectKind,
                position: { x: 15, y: 8 },
                collision: false,
                properties: { archetype: 'raton_tulivieja', count: 3 },
            },
            {
                id: 'manual:antorcha_1',
                kind: 'torch' as ManualObjectKind,
                position: { x: 3, y: 3 },
            },
            {
                id: 'manual:puerta_puzzle',
                kind: 'door' as ManualObjectKind,
                position: { x: 20, y: 20 },
                rotation: 180,
                properties: { activation: 'puzzle' },
            },
        ],
    };
}

describe('ED-03: Pisos de mazmorra editables', () => {
    describe('ida y vuelta serialize → parse', () => {
        it('mapa mínimo v2 se recupera intacto', () => {
            const original = makeValidMap();
            const parsed = parseDungeonFloorMap(original, {
                dungeon: 'cripta-tulivieja',
                floorIndex: 6,
                seed: 51931,
                cellSize: 0.5,
                kind: 'seed',
            });

            expect(parsed.version).toBe(2);
            expect(parsed.dungeon).toBe('cripta-tulivieja');
            expect(parsed.floor).toBe(7);
            expect(parsed.generation.kind).toBe('seed');
            expect(parsed.generation.seed).toBe(51931);
            expect(parsed.navPaint.cellSize).toBe(0.5);
            expect(parsed.navPaint.blocked).toEqual([]);
            expect(parsed.navPaint.cleared).toEqual([]);
            expect(Object.keys(parsed.doors)).toHaveLength(1);
            expect(parsed.doors['6:door:0']?.activation).toBe('proximity');
            expect(parsed.doors['6:door:0']?.radius).toBe(2.2);
            expect(parsed.overrides).toEqual({});
            expect(parsed.manualObjects).toEqual([]);
        });

        it('mapa completo con overrides y manualObjects se recupera intacto', () => {
            const original = makeFullMap();
            const parsed = parseDungeonFloorMap(original, {
                dungeon: 'cripta-tulivieja',
                floorIndex: 2,
                seed: 42,
                cellSize: 0.5,
                kind: 'hand',
            });

            // NavPaint
            expect(parsed.navPaint.blocked).toEqual([[0, 10, 5]]);
            expect(parsed.navPaint.cleared).toEqual([[0, 20, 3]]);

            // Puertas
            expect(parsed.doors['0:door:0']?.activation).toBe('click');
            expect(parsed.doors['1:door:0']?.activation).toBe('proximity');
            expect(parsed.doors['1:door:0']?.radius).toBe(3.0);

            // Overrides
            expect(parsed.overrides?.['chest:0']?.position?.x).toBe(5.5);
            expect(parsed.overrides?.['chest:0']?.position?.y).toBe(3.2);
            expect(parsed.overrides?.['chest:0']?.rotation).toBe(45);
            expect(parsed.overrides?.['chest:0']?.scale).toBe(1.2);
            expect(parsed.overrides?.['breakable:0']?.visible).toBe(false);

            // ManualObjects
            expect(parsed.manualObjects).toHaveLength(4);
            const cofre = parsed.manualObjects!.find((m) => m.id === 'manual:cofre_jefe');
            expect(cofre).toBeDefined();
            expect(cofre?.kind).toBe('chest');
            expect(cofre?.name).toBe('Cofre del guardián');
            expect(cofre?.position.x).toBe(10);
            expect(cofre?.position.y).toBe(10);
            expect(cofre?.rotation).toBe(90);
            expect(cofre?.scale).toBe(1.5);
            expect(cofre?.collision).toBe(true);
            expect(cofre?.properties?.['lootTable']).toBe('boss_chest');

            const spawn = parsed.manualObjects!.find((m) => m.id === 'manual:spawn_extra');
            expect(spawn?.kind).toBe('spawn');
            expect(spawn?.collision).toBe(false);
            expect(spawn?.properties?.['archetype']).toBe('raton_tulivieja');

            const antorcha = parsed.manualObjects!.find((m) => m.id === 'manual:antorcha_1');
            expect(antorcha?.kind).toBe('torch');
            expect(antorcha?.position.x).toBe(3);

            const puerta = parsed.manualObjects!.find((m) => m.id === 'manual:puerta_puzzle');
            expect(puerta?.kind).toBe('door');
            expect(puerta?.rotation).toBe(180);
        });

        it('defaultDungeonFloorMap produce un mapa válido', () => {
            const def = defaultDungeonFloorMap('cripta-tulivieja', 0, 12345, 0.5, 'seed');
            expect(def.version).toBe(2);
            expect(def.dungeon).toBe('cripta-tulivieja');
            expect(def.floor).toBe(1);
            expect(def.generation.kind).toBe('seed');
            expect(def.generation.seed).toBe(12345);
            expect(def.navPaint.cellSize).toBe(0.5);
            expect(def.overrides).toEqual({});
            expect(def.manualObjects).toEqual([]);

            // Que parsea sin error
            const parsed = parseDungeonFloorMap(def, {
                dungeon: 'cripta-tulivieja',
                floorIndex: 0,
                seed: 12345,
                cellSize: 0.5,
                kind: 'seed',
            });
            expect(parsed.version).toBe(2);
            expect(parsed.dungeon).toBe('cripta-tulivieja');
        });

        it('v1 se parsea sin error (sin overrides ni manualObjects)', () => {
            const v1 = {
                version: 1,
                dungeon: 'cripta-tulivieja',
                floor: 1,
                generation: { kind: 'seed', seed: 99 },
                navPaint: { cellSize: 0.5, blocked: [], cleared: [] },
                doors: {},
            };
            const parsed = parseDungeonFloorMap(v1, {
                dungeon: 'cripta-tulivieja',
                floorIndex: 0,
                seed: 99,
                cellSize: 0.5,
                kind: 'seed',
            });
            // v1 no soporta overrides/manualObjects: parsea sin error.
            expect(parsed.dungeon).toBe('cripta-tulivieja');
            expect(parsed.floor).toBe(1);
        });

        it('DungeonEditorDoc convierte v1 a v2 en el constructor', () => {
            const game = loadGameData();
            const dungeon = loadDungeon(game);
            const floor = generateFloor(dungeon, 0);
            // Forzar version 1 para simular un piso viejo
            floor.map.version = 1;
            const doc = new DungeonEditorDoc(floor);
            // El constructor debe haberlo convertido a v2
            expect(doc.data.version).toBe(2);
            expect(doc.data.overrides).toBeDefined();
            expect(doc.data.manualObjects).toBeDefined();
        });

        it('null devuelve el mapa por defecto', () => {
            const parsed = parseDungeonFloorMap(null, {
                dungeon: 'cripta-tulivieja',
                floorIndex: 5,
                seed: 777,
                cellSize: 0.5,
                kind: 'seed',
            });
            expect(parsed.dungeon).toBe('cripta-tulivieja');
            expect(parsed.floor).toBe(6);
            expect(parsed.generation.seed).toBe(777);
        });
    });

    describe('validación de puertas', () => {
        it('activation click es válido', () => {
            const map = { ...makeValidMap(), doors: { '0:door:0': { activation: 'click' } } };
            const parsed = parseDungeonFloorMap(map, {
                dungeon: 'cripta-tulivieja',
                floorIndex: 6,
                seed: 51931,
                cellSize: 0.5,
                kind: 'seed',
            });
            expect(parsed.doors['0:door:0']?.activation).toBe('click');
        });

        it('activation proximity sin radius usa el valor por defecto', () => {
            const map = { ...makeValidMap(), doors: { '0:door:0': { activation: 'proximity' } } };
            const parsed = parseDungeonFloorMap(map, {
                dungeon: 'cripta-tulivieja',
                floorIndex: 6,
                seed: 51931,
                cellSize: 0.5,
                kind: 'seed',
            });
            expect(parsed.doors['0:door:0']?.activation).toBe('proximity');
            expect(parsed.doors['0:door:0']?.radius).toBeUndefined();
        });

        it('activation inválida lanza error', () => {
            const map = { ...makeValidMap(), doors: { '0:door:0': { activation: 'teleport' } } };
            expect(() =>
                parseDungeonFloorMap(map, {
                    dungeon: 'cripta-tulivieja',
                    floorIndex: 6,
                    seed: 51931,
                    cellSize: 0.5,
                    kind: 'seed',
                }),
            ).toThrow('activación de puerta inválida');
        });

        it('radius menor a 0.5 se sube a 0.5', () => {
            const map = {
                ...makeValidMap(),
                doors: { '0:door:0': { activation: 'proximity', radius: 0.1 } },
            };
            const parsed = parseDungeonFloorMap(map, {
                dungeon: 'cripta-tulivieja',
                floorIndex: 6,
                seed: 51931,
                cellSize: 0.5,
                kind: 'seed',
            });
            expect(parsed.doors['0:door:0']?.radius).toBe(0.5);
        });
    });

    describe('validación de objetos manuales', () => {
        it('todos los kinds válidos se aceptan', () => {
            const kinds: ManualObjectKind[] = [
                'chest', 'barrel', 'jar', 'door', 'torch',
                'spawn', 'npc', 'resource', 'decoration',
                'structural', 'zone', 'trigger', 'entrance', 'exit',
            ];
            for (const kind of kinds) {
                const map: DungeonFloorMapDef = {
                    ...makeValidMap(),
                    manualObjects: [
                        { id: `test-${kind}`, kind, position: { x: 0, y: 0 } },
                    ],
                };
                const parsed = parseDungeonFloorMap(map, {
                    dungeon: 'cripta-tulivieja',
                    floorIndex: 6,
                    seed: 51931,
                    cellSize: 0.5,
                    kind: 'seed',
                });
                expect(parsed.manualObjects).toHaveLength(1);
                expect(parsed.manualObjects![0]!.kind).toBe(kind);
            }
        });

        it('kind inválido se omite silenciosamente', () => {
            const map: DungeonFloorMapDef = {
                ...makeValidMap(),
                manualObjects: [
                    { id: 'bad', kind: 'inventario' as unknown as ManualObjectKind, position: { x: 0, y: 0 } },
                ],
            };
            const parsed = parseDungeonFloorMap(map, {
                dungeon: 'cripta-tulivieja',
                floorIndex: 6,
                seed: 51931,
                cellSize: 0.5,
                kind: 'seed',
            });
            expect(parsed.manualObjects).toHaveLength(0);
        });

        it('posición sin x o y se omite', () => {
            const map: DungeonFloorMapDef = {
                ...makeValidMap(),
                manualObjects: [
                    { id: 'sin-y', kind: 'chest', position: { x: 5 } as any },
                ],
            };
            const parsed = parseDungeonFloorMap(map, {
                dungeon: 'cripta-tulivieja',
                floorIndex: 6,
                seed: 51931,
                cellSize: 0.5,
                kind: 'seed',
            });
            expect(parsed.manualObjects).toHaveLength(0);
        });

        it('propiedades se conservan en la ida y vuelta', () => {
            const map: DungeonFloorMapDef = {
                ...makeValidMap(),
                manualObjects: [
                    {
                        id: 'con-props',
                        kind: 'chest',
                        position: { x: 1, y: 1 },
                        properties: {
                            lootTable: 'boss_chest',
                            goldMin: 50,
                            goldMax: 200,
                            locked: true,
                        },
                    },
                ],
            };
            const parsed = parseDungeonFloorMap(map, {
                dungeon: 'cripta-tulivieja',
                floorIndex: 6,
                seed: 51931,
                cellSize: 0.5,
                kind: 'seed',
            });
            expect(parsed.manualObjects![0]!.properties).toEqual({
                lootTable: 'boss_chest',
                goldMin: 50,
                goldMax: 200,
                locked: true,
            });
        });
    });

    describe('validación de overrides', () => {
        it('override con posición, rotación y escala se conserva', () => {
            const map: DungeonFloorMapDef = {
                ...makeValidMap(),
                overrides: {
                    'chest:0': {
                        position: { x: 10.5, y: 8.3, z: 0.1 },
                        rotation: 270,
                        scale: 2.0,
                    },
                },
            };
            const parsed = parseDungeonFloorMap(map, {
                dungeon: 'cripta-tulivieja',
                floorIndex: 6,
                seed: 51931,
                cellSize: 0.5,
                kind: 'seed',
            });
            expect(parsed.overrides?.['chest:0']?.position?.x).toBe(10.5);
            expect(parsed.overrides?.['chest:0']?.position?.y).toBe(8.3);
            expect(parsed.overrides?.['chest:0']?.position?.z).toBe(0.1);
            expect(parsed.overrides?.['chest:0']?.rotation).toBe(270);
            expect(parsed.overrides?.['chest:0']?.scale).toBe(2.0);
        });

        it('override con solo visible se conserva', () => {
            const map: DungeonFloorMapDef = {
                ...makeValidMap(),
                overrides: {
                    'door:0': { visible: false },
                },
            };
            const parsed = parseDungeonFloorMap(map, {
                dungeon: 'cripta-tulivieja',
                floorIndex: 6,
                seed: 51931,
                cellSize: 0.5,
                kind: 'seed',
            });
            expect(parsed.overrides?.['door:0']?.visible).toBe(false);
        });
    });

    describe('integridad del piso generado', () => {
        it('un piso generado tiene un mapa válido', () => {
            const game = loadGameData();
            const dungeon = loadDungeon(game);
            const floor = generateFloor(dungeon, 6); // piso 7

            expect(floor.map.version).toBeGreaterThanOrEqual(1);
            expect(floor.map.dungeon).toBe('cripta-tulivieja');
            expect(floor.map.floor).toBe(7);
            expect(floor.map.generation.kind).toBe('seed');
            expect(floor.map.navPaint.cellSize).toBeGreaterThan(0);
        });

        it('un piso manual (hand) tiene generation kind hand', () => {
            const game = loadGameData();
            const dungeon = loadDungeon(game);
            const floor = generateFloor(dungeon, 0); // piso 1, hand

            expect(floor.map.generation.kind).toBe('hand');
            expect(floor.map.dungeon).toBe('cripta-tulivieja');
        });
    });

    describe('DungeonEditorDoc serialize → parse round-trip', () => {
        it('serialize().parse() da el mismo JSON', () => {
            const game = loadGameData();
            const dungeon = loadDungeon(game);
            const floor = generateFloor(dungeon, 6);
            const doc = new DungeonEditorDoc(floor);

            // Añadir un objeto manual
            doc.addObject('chest' as ManualObjectKind, 5, 5, {
                name: 'Cofre editado',
                properties: { lootTable: 'common' },
            });

            // Serializar y parsear
            const serialized = doc.serialize();
            const parsed = JSON.parse(serialized) as DungeonFloorMapDef;

            expect(parsed.version).toBe(2);
            expect(parsed.dungeon).toBe('cripta-tulivieja');
            expect(parsed.floor).toBe(7);
            expect(parsed.manualObjects).toHaveLength(1);
            expect(parsed.manualObjects![0]!.kind).toBe('chest');
            expect(parsed.manualObjects![0]!.name).toBe('Cofre editado');
            expect(parsed.manualObjects![0]!.position.x).toBe(5);
            expect(parsed.manualObjects![0]!.position.y).toBe(5);
        });

        it('dirty es true tras añadir un objeto', () => {
            const game = loadGameData();
            const dungeon = loadDungeon(game);
            const floor = generateFloor(dungeon, 6);
            const doc = new DungeonEditorDoc(floor);

            expect(doc.dirty).toBe(false);
            doc.addObject('barrel' as ManualObjectKind, 3, 3);
            expect(doc.dirty).toBe(true);
        });
    });
});
