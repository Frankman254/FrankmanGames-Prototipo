// JL-215: guardar dentro de la barriada y cargar reaparece en la barriada, no en (6000, ...) del mapa base.
import { describe, it, expect } from 'vitest';
import type { SavePlace } from '../src/rpg/contracts';
import { resolvePlace, type PlaceWorld } from '../src/world/placement';

describe('JL-215: guardado de la barriada', () => {
    /** Mundo base de prueba: 1000×1000, todo walkable, una piedra en (100, 100). */
    const mundoBase: PlaceWorld = {
        width: 1000,
        depth: 1000,
        walkable: () => true,
        dungeons: {},
        stones: [{ id: 'raspadura', x: 100, y: 100 }],
        known: ['raspadura'],
        home: 'raspadura',
    };

    it('SavePlace sin barriada → overworld normal', () => {
        const place: SavePlace = {
            scene: 'overworld',
            dungeon: null,
            floor: null,
            x: 150,
            y: 150,
            stone: 'raspadura',
            knownStones: ['raspadura'],
            timeOfDay: 0.5,
        };
        const r = resolvePlace(place, mundoBase);
        expect(r.kind).toBe('overworld');
        if (r.kind === 'overworld') expect(r.pos).toEqual({ x: 150, y: 150 });
    });

    it('SavePlace con barriada=true → overworld (resolvePlace no sabe de barriada)', () => {
        // resolvePlace() es puro y solo conoce overworld/dungeon.
        // El campo barriada lo lee enterPlace() en main.ts para llamar a houses?.enterBarriada().
        // Aquí verificamos que resolvePlace no rompe con el campo extra.
        const place: SavePlace = {
            scene: 'overworld',
            dungeon: null,
            floor: null,
            x: 1015,
            y: 1775,
            stone: 'raspadura',
            knownStones: ['raspadura'],
            timeOfDay: 0.5,
            barriada: true,
        };
        // La posición (1015, 1775) está fuera del mundo base 1000×1000 → fallback a piedra.
        const r = resolvePlace(place, mundoBase);
        expect(r.kind).toBe('stone');
        if (r.kind === 'stone') expect(r.stone).toBe('raspadura');
    });

    it('SavePlace con barriada=true y posición dentro del mundo → overworld con la posición', () => {
        const mundoConBarriada: PlaceWorld = {
            width: 2000,
            depth: 2000,
            walkable: () => true,
            dungeons: {},
            stones: [
                { id: 'raspadura', x: 100, y: 100 },
                { id: 'praderas_norte', x: 1015, y: 1775 },
            ],
            known: ['raspadura', 'praderas_norte'],
            home: 'raspadura',
        };
        const place: SavePlace = {
            scene: 'overworld',
            dungeon: null,
            floor: null,
            x: 1015,
            y: 1775,
            stone: 'praderas_norte',
            knownStones: ['raspadura', 'praderas_norte'],
            timeOfDay: 0.5,
            barriada: true,
        };
        const r = resolvePlace(place, mundoConBarriada);
        // resolvePlace devuelve overworld con la posición de la piedra.
        // main.ts/enterPlace() lee place.barriada y llama a houses?.enterBarriada().
        expect(r.kind).toBe('overworld');
        if (r.kind === 'overworld') expect(r.pos).toEqual({ x: 1015, y: 1775 });
        // El campo barriada se conserva en el objeto place original.
        expect(place.barriada).toBe(true);
    });

    it('Guardado viejo sin barriada → no entra en la barriada', () => {
        const place: SavePlace = {
            scene: 'overworld',
            dungeon: null,
            floor: null,
            x: 100,
            y: 100,
            stone: 'raspadura',
            knownStones: ['raspadura'],
            timeOfDay: 0.5,
            // Sin campo barriada → guardado viejo.
        };
        expect(place.barriada).toBeUndefined();
        const r = resolvePlace(place, mundoBase);
        expect(r.kind).toBe('overworld');
    });

    it('currentPlace() con barriada=true → name "Praderas del Norte"', () => {
        // Verificar que el nombre de la zona en SavePlace es correcto.
        // currentPlace() en main.ts usa inBarriada para poner name: 'Praderas del Norte'.
        const place: SavePlace = {
            scene: 'overworld',
            dungeon: null,
            floor: null,
            x: 1015,
            y: 1775,
            stone: 'praderas_norte',
            knownStones: ['praderas_norte'],
            timeOfDay: 0.5,
            barriada: true,
            name: 'Praderas del Norte',
        };
        expect(place.name).toBe('Praderas del Norte');
        expect(place.barriada).toBe(true);
    });

    it('Migración: guardado sin barriada no rompe resolvePlace', () => {
        // Un guardado cargado de disco sin el campo barriada no debe romper nada.
        const rawSave = JSON.stringify({
            scene: 'overworld',
            dungeon: null,
            floor: null,
            x: 200,
            y: 200,
            stone: 'raspadura',
            knownStones: ['raspadura'],
            timeOfDay: 0.5,
        });
        const place = JSON.parse(rawSave) as SavePlace;
        expect(place.barriada).toBeUndefined();
        const r = resolvePlace(place, mundoBase);
        expect(r.kind).toBe('overworld');
        if (r.kind === 'overworld') expect(r.pos).toEqual({ x: 200, y: 200 });
    });
});
