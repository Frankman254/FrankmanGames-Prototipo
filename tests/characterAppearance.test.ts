// F35: cara, peinado y colores elegidos al crear el personaje; se guardan y se validan al cargar.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { RpgSessionFactory } from '../src/rpg/session';
import {
    APPEARANCE_FACES,
    bodyScale,
    BODY_RANGE,
    BROW_STYLES,
    CLOTH_COLORS,
    defaultAppearance,
    EYE_COLORS,
    HAIR_COLORS,
    HAIR_CUTS,
    hexRgb,
    normalizeAppearance,
    SKIN_TONES,
} from '../src/rpg/appearance';
import { pieceChooser } from '../src/render/characters/gltfCharacter';
import type { CharacterLook } from '../src/world/look';

const data = loadGameData();

describe('aspecto del personaje', () => {
    it('cada clase y sexo tiene un aspecto inicial válido', () => {
        for (const id of [...Object.keys(data.rpg.classes), 'desconocida']) {
            for (const sex of ['masculino', 'femenino'] as const) {
                const a = defaultAppearance(id, sex);
                expect(normalizeAppearance(a, defaultAppearance('default', sex))).toEqual(a);
                expect(a.face).toBeLessThan(APPEARANCE_FACES.length);
                expect(HAIR_CUTS).toContain(a.hair);
                expect(SKIN_TONES).toContain(a.skin);
                expect(HAIR_COLORS).toContain(a.hairColor);
                expect(CLOTH_COLORS).toContain(a.cloth);
                expect(CLOTH_COLORS).toContain(a.trim);
                expect(BROW_STYLES).toContain(a.brows);
                expect(EYE_COLORS).toContain(a.eyes);
                expect(a.height).toBe(0);
                expect(a.build).toBe(0);
            }
        }
    });

    it('se guarda y se carga; sin dato, el de la clase', () => {
        const f = new RpgSessionFactory(data.rpg);
        const look = {
            face: 2,
            hair: 'bun' as const,
            skin: '5f3a25',
            hairColor: 'd9d4cc',
            cloth: '9c2f2f',
            trim: '1f2226',
            brows: 'arched' as const,
            eyes: '3c6e8f',
            height: 0.4,
            build: -0.25,
        };
        const s = f.newGame('storm_weaver', 'Ana', 3, 'femenino', look);
        const save = s.save();
        expect(save.appearance).toEqual(look);
        expect(f.load(save, 3).character.appearance).toEqual(look);
        const { appearance: _drop, ...old } = save;
        expect(f.load(old, 3).character.appearance).toBeNull();
    });

    it('un guardado anterior a cejas, ojos y proporciones carga con los valores de base', () => {
        const f = new RpgSessionFactory(data.rpg);
        const old = { face: 1, hair: 'long' as const, skin: 'f2d4ba', hairColor: 'a8743a', cloth: '2f6f8f', trim: '33416e' };
        const save = f.newGame('mangrove_hunter', 'Lía', 5, 'femenino').save();
        const loaded = f.load({ ...save, appearance: old as never }, 5).character.appearance;
        expect(loaded).toEqual({ ...old, brows: 'natural', eyes: EYE_COLORS[0], height: 0, build: 0 });
    });

    it('altura y complexión: fuera de rango se recortan y dan la escala de data/', () => {
        const fb = defaultAppearance('storm_weaver', 'femenino');
        const a = normalizeAppearance({ ...fb, height: 7, build: -3, brows: 'cejijunta', eyes: 'nope' }, fb);
        expect(a).toEqual({ ...fb, height: 1, build: -1 });
        expect(bodyScale(a)).toEqual([BODY_RANGE.height.max, BODY_RANGE.build.min]);
        expect(bodyScale({ height: 0, build: 0 })).toEqual([1, 1]);
        expect(bodyScale({ height: -1, build: 1 })).toEqual([BODY_RANGE.height.min, BODY_RANGE.build.max]);
        expect(normalizeAppearance({ ...fb, height: 0.123 }, fb).height).toBe(0.12);
    });

    it('lo inválido de un guardado se cambia por el valor de la clase', () => {
        const fb = defaultAppearance('ember_vanguard', 'masculino');
        const a = normalizeAppearance({ face: 9, hair: 'cresta', skin: '#ABCDEF', hairColor: 'zz', cloth: 3 }, fb);
        expect(a).toEqual({ ...fb, skin: 'abcdef' });
        expect(normalizeAppearance(null, fb)).toEqual(fb);
        expect(hexRgb('ff8000')).toEqual([1, 128 / 255, 0]);
    });

    it('el modelo sólo deja la cara y el peinado elegidos', () => {
        const parts = ['Piel', 'Ropa', 'Cara_0', 'Cara_1', 'Cara_2', 'Pelo_short', 'Pelo_long', 'Pelo_bun', 'Calzado'];
        const keep = (look?: Partial<CharacterLook>): string[] => {
            const pick = pieceChooser(look as CharacterLook | undefined);
            return parts.filter(pick);
        };
        expect(keep({ face: 1, hairCut: 'long' })).toEqual(['Piel', 'Ropa', 'Cara_1', 'Pelo_long', 'Calzado']);
        expect(keep({ face: 2, hairCut: 'bald' })).toEqual(['Piel', 'Ropa', 'Cara_2', 'Calzado']);
        expect(keep()).toEqual(['Piel', 'Ropa', 'Cara_0', 'Pelo_short', 'Calzado']);
    });
});
