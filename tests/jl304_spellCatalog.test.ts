import { NullEngine, Scene } from '@babylonjs/core';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { loadFx } from '../src/data/fxSchema';
import { loadSpellFx } from '../src/data/spellFxSchema';
import { hasTranslation } from '../src/i18n';
import { spellIcon } from '../src/ui/menus/icons';
import { SpellFx } from '../src/render/fx/spellFx';
import { World } from '../src/sim/world';
import { HeightField } from '../src/world/terrain';

if (typeof (globalThis as Record<string, unknown>).OffscreenCanvas === 'undefined') {
    (globalThis as Record<string, unknown>).OffscreenCanvas = class {
        constructor(
            public readonly width: number,
            public readonly height: number,
        ) {}
        getContext() {
            const stop = () => ({ addColorStop: () => {} });
            return {
                fillStyle: '',
                strokeStyle: '',
                lineWidth: 0,
                lineJoin: '',
                textAlign: '',
                textBaseline: '',
                font: '',
                createRadialGradient: stop,
                createLinearGradient: stop,
                fillRect: () => {},
                clearRect: () => {},
                drawImage: () => {},
                getImageData: (_x: number, _y: number, width: number, height: number) => ({
                    data: new Uint8ClampedArray(width * height * 4),
                    width,
                    height,
                }),
                putImageData: () => {},
                fillText: () => {},
                strokeText: () => {},
                beginPath: () => {},
                moveTo: () => {},
                lineTo: () => {},
                closePath: () => {},
                stroke: () => {},
                fill: () => {},
                arc: () => {},
                rect: () => {},
                clip: () => {},
                save: () => {},
                restore: () => {},
                setTransform: () => {},
                transform: () => {},
                rotate: () => {},
                scale: () => {},
                translate: () => {},
                measureText: () => ({ width: 0 }),
            };
        }
    };
}

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ICONS_DIR = 'assets/icons/spells';
const data = loadGameData();
const spells = data.rpg.spells;
const spellIds = Object.keys(spells);
const profiles = loadSpellFx();
const flat = new HeightField(80, 80, 1, new Float32Array(81 * 81));

describe('JL-304: catálogo de hechizos', () => {
    it('cada hechizo tiene un PNG utilizable y su nombre y descripción en español e inglés', () => {
        const files = new Set(readdirSync(ICONS_DIR).filter((file) => file.endsWith('.png')));

        for (const id of spellIds) {
            const spell = spells[id]!;
            const path = `${ICONS_DIR}/${id}.png`;
            const icon = readFileSync(path);

            expect(files.has(`${id}.png`), `${id}: PNG presente`).toBe(true);
            expect(icon.subarray(0, PNG_SIGNATURE.length), `${id}: firma PNG`).toEqual(PNG_SIGNATURE);
            expect(spellIcon({ ...spell, id }), `${id}: icono visible de la interfaz`).toContain(`data-id="${id}"`);
            expect(spell.name.trim(), `${id}: nombre en español`).not.toBe('');
            expect(spell.description.trim(), `${id}: descripción en español`).not.toBe('');
            expect(hasTranslation('en', spell.name), `${id}: nombre en inglés`).toBe(true);
            expect(hasTranslation('en', spell.description), `${id}: descripción en inglés`).toBe(true);
        }
    });

    it('cada hechizo genera una malla de efecto al lanzarse, con perfil o fallback', () => {
        const world = new World(data, { encounter: false });
        const scene = new Scene(new NullEngine());
        const fx = new SpellFx(
            scene,
            loadFx(),
            flat,
            () => ({ x: world.player.pos.x + 5, y: world.player.pos.y }),
            (out) => out.set(world.player.pos.x, 1.5, world.player.pos.y),
            profiles,
        );

        try {
            for (const id of spellIds) {
                const before = new Set(scene.meshes);
                fx.handleEvents(world, [{ type: 'cast', ability: id, targetId: null }]);
                const newMeshes = scene.meshes.filter((mesh) => !before.has(mesh));

                expect(
                    newMeshes.some((mesh) =>
                        profiles[id] ? mesh.name === 'fxProfileRing' : mesh.name === 'fxCastOrb',
                    ),
                    `${id}: genera una malla de perfil o de fallback`,
                ).toBe(true);
                fx.reset();
            }
        } finally {
            fx.reset();
            scene.dispose();
            scene.getEngine().dispose();
        }
    });
});
