// F18-INT: Cascos, capuchas, sombreros y capas de equipo.glb en el personaje.
// Verifica que los items de cabeza y espalda con nodo en equipo.glb resuelven
// pieza y hueso correctamente.
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadWorldData } from '../src/data/worldData';
import { gearNodeName } from '../src/render/characters/heldGear';
import { coversHair, withGear } from '../src/world/look';

const game = loadGameData();
const wd = loadWorldData();
const items = game.rpg.items;

/** Items de cabeza cuyo nodo obj_<id> existe en equipo.glb (verificado con el GLB). */
const HEAD_WITH_MODEL = [
    'apprentice_cowl',
    'basalt_helm',
    'cotton_bandana',
    'darien_hood',
    'diablo_mask',
    'explorer_hood',
    'fortuna_hood',
    'iron_helm',
    'leather_cap',
    'locks_helm',
    'machetero_hat',
    'palm_cap',
    'reed_hat',
    'tulivieja_veil',
] as const;

/** Items de espalda cuyo nodo obj_<id> existe en equipo.glb. */
const BACK_WITH_MODEL = ['baru_cloud_cape', 'darien_cape', 'palm_cape', 'straw_cape'] as const;

describe('F18-INT: cascos, capuchas, sombreros y capas', () => {
    describe('items con nodo en equipo.glb', () => {
        it('cada item de cabeza con modelo existe en items.json con slot head', () => {
            for (const id of HEAD_WITH_MODEL) {
                const item = items[id];
                expect(item, `${id} existe en items.json`).toBeDefined();
                expect(item?.slot, `${id} slot`).toBe('head');
            }
        });

        it('cada item de espalda con modelo existe en items.json con slot back', () => {
            for (const id of BACK_WITH_MODEL) {
                const item = items[id];
                expect(item, `${id} existe en items.json`).toBeDefined();
                expect(item?.slot, `${id} slot`).toBe('back');
            }
        });

        it('gearNodeName produce el nombre del nodo del GLB', () => {
            for (const id of [...HEAD_WITH_MODEL, ...BACK_WITH_MODEL]) {
                expect(gearNodeName(id)).toBe(`obj_${id}`);
            }
        });
    });

    describe('wear del jugador', () => {
        it('el asset player (gltf) tiene wear.head y wear.back con hueso', () => {
            const player = wd.assets['player'];
            expect(player, 'player asset').toBeDefined();
            if (player?.kind !== 'gltf') throw new Error('player no es gltf');
            expect(player.wear?.head?.joint).toBe('head');
            expect(player.wear?.back?.joint).toBe('chest');
        });

        it('los classModels del player tienen wear.head y wear.back', () => {
            const player = wd.assets['player'];
            if (player?.kind !== 'gltf') throw new Error('player no es gltf');
            for (const target of Object.values(player.classModels)) {
                const m = wd.assets[target];
                expect(m?.kind, `${target} kind`).toBe('gltf');
                if (m?.kind === 'gltf') {
                    expect(m.wear.head?.joint, `${target} wear.head.joint`).toBeDefined();
                    expect(m.wear.back?.joint, `${target} wear.back.joint`).toBeDefined();
                }
            }
        });

        it('wear.head.kinds incluye hat para ajustar la altura de sombreros', () => {
            const player = wd.assets['player'];
            if (player?.kind !== 'gltf') throw new Error('player no es gltf');
            expect(player.wear?.head?.kinds?.hat).toBeDefined();
            // El sombrero va un poco más alto que el ajuste base.
            expect(player.wear?.head?.kinds?.hat?.at).toBeDefined();
        });
    });

    describe('withGear con worn', () => {
        const kindOf = (id: string) => items[id]?.kind;

        it('headItem y backItem entran en el aspecto', () => {
            const base = { bodyType: 'average' as const, hairStyle: 'short' as const, outfit: 'tunic' as const, headgear: 'none' as const, cape: false, beard: false, weapon: 'sword' as const, offhand: 'none' as const };
            const worn = withGear(base, {}, null, null, kindOf, { head: 'palm_cap', back: 'palm_cape' });
            expect(worn.headItem).toBe('palm_cap');
            expect(worn.headKind).toBe('hat');
            expect(worn.backItem).toBe('palm_cape');
        });

        it('hood y helmet tapan el pelo; hat no', () => {
            const base = { bodyType: 'average' as const, hairStyle: 'short' as const, outfit: 'tunic' as const, headgear: 'none' as const, cape: false, beard: false, weapon: 'sword' as const, offhand: 'none' as const };
            // explorer_hood → kind=hood → tapa pelo
            const hood = withGear(base, {}, null, null, kindOf, { head: 'explorer_hood', back: null });
            expect(coversHair(hood.headKind)).toBe(true);
            // iron_helm → kind=helmet → tapa pelo
            const helm = withGear(base, {}, null, null, kindOf, { head: 'iron_helm', back: null });
            expect(coversHair(helm.headKind)).toBe(true);
            // palm_cap → kind=hat → no tapa pelo
            const hat = withGear(base, {}, null, null, kindOf, { head: 'palm_cap', back: null });
            expect(coversHair(hat.headKind)).toBe(false);
        });

        it('sin item en un slot, el valor es null', () => {
            const base = { bodyType: 'average' as const, hairStyle: 'short' as const, outfit: 'tunic' as const, headgear: 'none' as const, cape: false, beard: false, weapon: 'sword' as const, offhand: 'none' as const };
            const worn = withGear(base, {}, null, null, kindOf, { head: null, back: null });
            expect(worn.headItem).toBeNull();
            expect(worn.backItem).toBeNull();
        });
    });

    describe('cobertura completa', () => {
        it('todos los items con modelo tienen kind válido para headKind', () => {
            const validKinds = new Set(['hood', 'helmet', 'hat', 'cape']);
            for (const id of [...HEAD_WITH_MODEL, ...BACK_WITH_MODEL]) {
                const kind = items[id]?.kind;
                expect(kind, `${id} kind`).toBeDefined();
                expect(validKinds.has(kind!), `${id} kind válido`).toBe(true);
            }
        });
    });
});
