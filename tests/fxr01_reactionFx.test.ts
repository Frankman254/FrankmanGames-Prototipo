// FX-R01 (creador, 2026-11-19): «cada reacción se ve: su nombre y su efecto».
// Pruebas puras de la ficha visual que consume `src/render/fx/reactionFx.ts`:
// las 15 reacciones de `data/rpg/reactions.json` tienen nombre, color y efecto propios
// en `data/fx.json`; un id desconocido no rompe. Y un humo con NullEngine de que las 15
// se dibujan (con su nombre flotante) sin dejar mallas huérfanas ni petar.
import { NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { describe, expect, it } from 'vitest';
import reactionsJson from '../data/rpg/reactions.json';
import fxJson from '../data/fx.json';
import { loadFx } from '../src/data/fxSchema';
import { BurstPool } from '../src/render/fx/particles';
import { FloatingText } from '../src/render/fx/floatingText';
import { REACTION_KINDS, ReactionFx, reactionVisual, reactionVisuals } from '../src/render/fx/reactionFx';

// Polyfill OffscreenCanvas para Babylon.js en Node (DynamicTexture lo necesita).
if (typeof (globalThis as Record<string, unknown>).OffscreenCanvas === 'undefined') {
    (globalThis as Record<string, unknown>).OffscreenCanvas = class {
        constructor(
            public readonly width: number,
            public readonly height: number,
        ) {}
        getContext() {
            const stop = () => ({ addColorStop: () => {} });
            const ctx = {
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
                getImageData: (x: number, y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
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
            return ctx;
        }
    };
}

const REACTION_IDS = (reactionsJson as { reactions: { id: string }[] }).reactions.map((r) => r.id);

describe('FX-R01: ficha visual de las reacciones', () => {
    it('las 15 reacciones tienen nombre, color y efecto en data/fx.json', () => {
        expect(REACTION_IDS).toHaveLength(15);
        for (const id of REACTION_IDS) {
            const v = reactionVisual(id);
            expect(v, id).not.toBeNull();
            expect(v!.label, id).toBeTruthy();
            expect(v!.color, id).toHaveLength(3);
            for (const c of v!.color) {
                expect(c, id).toBeGreaterThanOrEqual(0);
                expect(c, id).toBeLessThanOrEqual(4);
            }
            expect(REACTION_KINDS, id).toContain(v!.kind);
        }
    });

    it('cada reacción usa un kind válido declarado', () => {
        for (const v of reactionVisuals()) expect(REACTION_KINDS).toContain(v.kind);
    });

    it('cada color es distinto por reacción (Barrial y Lava comparten «pool», se distinguen por color)', () => {
        expect(reactionVisual('mud')!.kind).toBe(reactionVisual('lava')!.kind);
        const colors = reactionVisuals().map((v) => v.color.join(','));
        expect(new Set(colors).size).toBe(15);
    });

    it('el nombre flota: la ficha lleva el label de reactions.json', () => {
        const vapor = reactionVisual('vapor');
        expect(vapor!.label).toBe('Vaho');
        const thermal = reactionVisual('thermal_shock');
        expect(thermal!.label).toBe('Choque térmico');
    });

    it('las zonas duran lo que dice la sim (duration y radius)', () => {
        expect(reactionVisual('vapor')!.radius).toBe(3);
        expect(reactionVisual('blizzard')!.radius).toBe(4);
        for (const id of REACTION_IDS) {
            const sim = (reactionsJson as { reactions: Record<string, unknown>[] }).reactions.find(
                (r) => r['id'] === id,
            ) as { duration?: number } | undefined;
            const dur = sim?.duration;
            if (dur) expect(reactionVisual(id)!.duration, id).toBe(dur);
        }
    });

    it('un id desconocido no rompe: devuelve null', () => {
        expect(reactionVisual('no_existe')).toBeNull();
        expect(reactionVisual('')).toBeNull();
    });

    it('la sección reactions de fx.json no introduce ids extraños', () => {
        const extra = Object.keys((fxJson as { reactions: Record<string, unknown> }).reactions).filter(
            (k) => !k.startsWith('_') && !REACTION_IDS.includes(k),
        );
        expect(extra).toEqual([]);
    });
});

/** Un pool de ráfagas suelto para alimentar a `FloatingText` en la prueba. */
function fxHarness(): { scene: Scene; fx: ReactionFx; engine: NullEngine } {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const floating = new FloatingText(scene, loadFx(), new BurstPool(scene, 4, 32));
    const fx = new ReactionFx(scene, floating);
    return { scene, fx, engine };
}

describe('FX-R01: las 15 reacciones se dibujan y se limpian', () => {
    it('cada reacción crea efecto propio, avanza y no deja mallas huérfanas', () => {
        for (const v of reactionVisuals()) {
            const { scene, fx, engine } = fxHarness();
            const before = scene.meshes.length + scene.particleSystems.length;
            fx.play(v.id, new Vector3(40, 2, 40));
            // Al reproducir debe aparecer el efecto (geometría o partículas) y el nombre.
            expect(scene.meshes.length + scene.particleSystems.length, `${v.id}: crea efecto`).toBeGreaterThan(before);
            const labelShown = scene.meshes.some((m) => m.name.startsWith('float') && m.isEnabled());
            expect(labelShown, `${v.id}: muestra el nombre`).toBe(true);
            // Avanzar más de lo que dura la zona: todo debe apagarse y liberarse.
            for (let i = 0; i < 60 * 12; i++) fx.update(1 / 60);
            const orphans = scene.meshes.filter((m) => m.name.includes(`fxReac:${v.id}`) || m.name.includes(`fx${v.kind}:`));
            expect(orphans.map((m) => m.name), `${v.id}: sin mallas huérfanas tras su duración`).toHaveLength(0);
            fx.reset();
            scene.dispose();
            engine.dispose();
        }
    });

    it('un id desconocido no lanza ni dibuja nada', () => {
        const { scene, fx, engine } = fxHarness();
        const before = scene.meshes.length;
        expect(() => fx.play('reaccion_fantasma', new Vector3(40, 2, 40))).not.toThrow();
        expect(scene.meshes.length).toBe(before);
        expect(() => fx.update(1 / 60)).not.toThrow();
        scene.dispose();
        engine.dispose();
    });

    it('reset() quita los efectos vivos', () => {
        const { scene, fx, engine } = fxHarness();
        fx.play('blizzard', new Vector3(40, 2, 40));
        fx.play('vapor', new Vector3(42, 2, 40));
        expect(scene.meshes.some((m) => m.name.includes('fxReac') || m.name.includes('fxSwirl'))).toBe(true);
        fx.reset();
        // Tras el reset, avanzar no revive nada y no quedan mallas de reacción activas.
        for (let i = 0; i < 60 * 12; i++) fx.update(1 / 60);
        const left = scene.meshes.filter((m) => m.name.includes('fxReac') || m.name.includes('fxSwirl'));
        expect(left.map((m) => m.name)).toHaveLength(0);
        scene.dispose();
        engine.dispose();
    });
});
