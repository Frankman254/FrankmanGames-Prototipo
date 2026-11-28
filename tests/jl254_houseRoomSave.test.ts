// JL-254: guardar dentro de una casa y cargar restaura la escena interior.
import { describe, it, expect } from 'vitest';
import type { SavePlace } from '../src/rpg/contracts';
import { resolveInteriorPlace, resolvePlace, type PlaceWorld } from '../src/world/placement';
import { normalizePlace } from '../src/ui/menus/saveStore';
import { Character } from '../src/rpg/character';
import { RpgSessionFactory } from '../src/rpg/session';
import { loadGameData } from '../src/data';

const data = loadGameData();
const factory = new RpgSessionFactory(data.rpg);

const mundoBase: PlaceWorld = {
    width: 2000,
    depth: 2000,
    dungeons: {},
    stones: [
        { id: 'raspadura', x: 1000, y: 1000 },
        { id: 'praderas_norte', x: 6000, y: 6000 },
    ],
    known: ['raspadura', 'praderas_norte'],
    home: 'raspadura',
    walkable: () => true,
};

describe('JL-254: houseRoom en SavePlace', () => {
    it('SavePlace con houseRoom no rompe resolvePlace', () => {
        const place: SavePlace = {
            scene: 'overworld',
            dungeon: null,
            floor: null,
            x: 100,
            y: 100,
            stone: 'raspadura',
            timeOfDay: 0.5,
            houseRoom: 'hogar',
        };
        // resolvePlace no conoce houseRoom; debe devolver overworld con la posición.
        const r = resolvePlace(place, mundoBase);
        expect(r.kind).toBe('overworld');
        if (r.kind === 'overworld') expect(r.pos).toEqual({ x: 100, y: 100 });
    });

    it('SavePlace con houseRoom="taller" se serializa y deserializa', () => {
        const place: SavePlace = {
            scene: 'overworld',
            dungeon: null,
            floor: null,
            x: 200,
            y: 300,
            stone: 'raspadura',
            timeOfDay: 0.3,
            houseRoom: 'taller',
        };
        const raw = JSON.stringify(place);
        const loaded = JSON.parse(raw) as SavePlace;
        expect(loaded.houseRoom).toBe('taller');
        expect(loaded.x).toBe(200);
        expect(loaded.y).toBe(300);
    });

    it('Guardado sin houseRoom (viejo) no entra en sala', () => {
        // Un guardado antiguo no tiene houseRoom; al cargar no debe entrar en sala.
        const place: SavePlace = {
            scene: 'overworld',
            dungeon: null,
            floor: null,
            x: 150,
            y: 150,
            stone: 'raspadura',
            timeOfDay: 0.5,
        };
        expect(place.houseRoom).toBeUndefined();
        const r = resolvePlace(place, mundoBase);
        expect(r.kind).toBe('overworld');
    });

    it('houseRoom con cada tipo de sala se conserva en round-trip', () => {
        const salas = ['hogar', 'taller', 'salon', 'casa', 'casaEspejo'];
        for (const sala of salas) {
            const place: SavePlace = {
                scene: 'overworld',
                dungeon: null,
                floor: null,
                x: 100,
                y: 100,
                stone: 'raspadura',
                timeOfDay: 0.5,
                houseRoom: sala,
            };
            const raw = JSON.stringify(place);
            const loaded = JSON.parse(raw) as SavePlace;
            expect(loaded.houseRoom, `sala ${sala} no se conserva`).toBe(sala);
        }
    });

    it('normalizePlace conserva los marcadores válidos de interiores y descarta IDs desconocidos', () => {
        const base = {
            scene: 'overworld',
            dungeon: null,
            floor: null,
            x: 100,
            y: 100,
            stone: 'raspadura',
            timeOfDay: 0.5,
        };
        expect(normalizePlace({ ...base, houseRoom: 'casa' })?.houseRoom).toBe('casa');
        expect(normalizePlace({ ...base, barriada: true })?.barriada).toBe(true);
        expect(normalizePlace({ ...base, navidad: true })?.navidad).toBe(true);
        expect(normalizePlace({ ...base, houseRoom: 'sala_desconocida' })?.houseRoom).toBeUndefined();
    });

    it('barriada=true sin houseRoom → no entra en sala al cargar', () => {
        // La barriada usa barriada=true, no houseRoom.
        const place: SavePlace = {
            scene: 'overworld',
            dungeon: null,
            floor: null,
            x: 6000,
            y: 6000,
            stone: 'praderas_norte',
            timeOfDay: 0.5,
            barriada: true,
        };
        expect(place.houseRoom).toBeUndefined();
        const r = resolvePlace(place, mundoBase);
        // Fuera del mundo base (2000×2000); resolvePlace cae a fallback (piedra conocida).
        // Lo importante: houseRoom no está, así que enterPlace no entra en sala.
        expect(r.kind).not.toBe('overworld'); // posición fuera del mundo
    });

    it('mantiene el destino interior cuando el punto exterior requiere fallback', () => {
        const mundoBloqueado: PlaceWorld = { ...mundoBase, walkable: () => false };
        const casa: SavePlace = {
            scene: 'overworld',
            dungeon: null,
            floor: null,
            x: 100,
            y: 100,
            stone: 'raspadura',
            timeOfDay: 0.5,
            houseRoom: 'casa',
        };
        expect(resolveInteriorPlace(casa, mundoBloqueado)).toEqual({
            interior: { kind: 'house', room: 'casa' },
            exterior: { kind: 'stone', stone: 'raspadura', reason: 'bloqueado' },
        });

        const barriada: SavePlace = {
            scene: 'overworld',
            dungeon: null,
            floor: null,
            x: 6000,
            y: 6000,
            stone: 'praderas_norte',
            timeOfDay: 0.5,
            barriada: true,
        };
        expect(resolveInteriorPlace(barriada, mundoBase)).toEqual({
            interior: { kind: 'barriada' },
            exterior: { kind: 'stone', stone: 'praderas_norte', reason: 'fuera' },
        });
    });

    it('no restaura salas con un ID no reconocido', () => {
        const corrupto: SavePlace = {
            scene: 'overworld',
            dungeon: null,
            floor: null,
            x: 100,
            y: 100,
            stone: 'raspadura',
            timeOfDay: 0.5,
            houseRoom: 'sala_desconocida',
        };
        expect(resolveInteriorPlace(corrupto, mundoBase)).toBeNull();
    });

    it('houseRoom y barriada no coexisten en el mismo guardado', () => {
        // currentPlace() guarda houseRoom solo si !inBarriada.
        // Si inBarriada es true, guarda barriada: true sin houseRoom.
        const placeConBarriada: SavePlace = {
            scene: 'overworld',
            dungeon: null,
            floor: null,
            x: 6000,
            y: 6000,
            stone: 'praderas_norte',
            timeOfDay: 0.5,
            barriada: true,
        };
        expect(placeConBarriada.houseRoom).toBeUndefined();

        const placeConCasa: SavePlace = {
            scene: 'overworld',
            dungeon: null,
            floor: null,
            x: 100,
            y: 100,
            stone: 'raspadura',
            timeOfDay: 0.5,
            houseRoom: 'hogar',
        };
        expect(placeConCasa.barriada).toBeUndefined();
    });

    it('RpgSessionFactory.load() conserva houseRoom en startPlace', () => {
        const session = factory.newGame('storm_weaver', 'Test', 42);
        const save = session.save();
        // Simular que el guardado tiene houseRoom (main.ts lo pone en placeProvider).
        const saveConSala = {
            ...save,
            place: {
                scene: 'overworld' as const,
                dungeon: null,
                floor: null,
                x: 100,
                y: 100,
                stone: 'raspadura',
                timeOfDay: 0.5,
                houseRoom: 'hogar',
            },
        };
        const loaded = factory.load(saveConSala, 42);
        expect(loaded.startPlace?.houseRoom).toBe('hogar');
        // Al guardar de nuevo, conserva el lugar cargado.
        const reSave = loaded.save();
        expect(reSave.place?.houseRoom).toBe('hogar');
    });
});
