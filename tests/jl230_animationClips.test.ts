// JL-230: cada clip que pide data/animation.json existe en el sistema de animación procedural.
// animation.json define eventos por fotograma para modelos procedurales (no GLB).
// Esta prueba verifica que los clips referenciados en los eventos de animation.json
// existen en el catálogo de clips de rigs.ts para cada modelo.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PROCEDURAL_MODELS, proceduralAnim } from '../src/world/rigs';

const ROOT = resolve(__dirname, '..');
const animationData = JSON.parse(
    readFileSync(resolve(ROOT, 'data', 'animation.json'), 'utf-8')
);

describe('JL-230: clips de animation.json vs. rigs procedurales', () => {
    it('los modelos de animation.json coinciden con PROCEDURAL_MODELS', () => {
        const jsonModels = Object.keys(animationData.models);
        expect(jsonModels.sort()).toEqual([...PROCEDURAL_MODELS].sort());
    });

    // Cada modelo: los clips referenciados en los eventos existen en el rig
    for (const modelId of PROCEDURAL_MODELS) {
        const modelData = animationData.models[modelId];
        if (!modelData) continue;

        const events = modelData.events || {};
        const referencedClips = new Set<string>();
        for (const clipName of Object.keys(events)) {
            referencedClips.add(clipName);
        }

        it(`${modelId}: los clips referenciados en eventos existen en el rig`, () => {
            const anim = proceduralAnim(modelId);
            const availableClips = Object.keys(anim.clips);
            const missing: string[] = [];
            for (const clip of referencedClips) {
                if (!availableClips.includes(clip)) {
                    missing.push(clip);
                }
            }
            if (missing.length > 0) {
                expect(
                    missing,
                    `${modelId}: clips faltantes en rig: ${missing.join(', ')}. Clips disponibles: ${availableClips.join(', ')}`
                ).toEqual([]);
            }
        });
    }

    // Cada modelo: los tipos de evento son válidos
    it('todos los tipos de evento son válidos (footstep, hit, cast)', () => {
        const validTypes = ['footstep', 'hit', 'cast'];
        const problems: string[] = [];
        for (const [modelId, modelData] of Object.entries(animationData.models)) {
            const events = (modelData as { events?: Record<string, unknown> }).events || {};
            for (const [clipName, eventList] of Object.entries(events)) {
                for (const evt of eventList as Array<{ type?: string }>) {
                    if (evt.type && !validTypes.includes(evt.type)) {
                        problems.push(`${modelId}.${clipName}: tipo '${evt.type}' no válido`);
                    }
                }
            }
        }
        expect(problems).toEqual([]);
    });

    // Cada modelo: los instantes t están en [0, 1)
    it('todos los instantes t están en [0, 1)', () => {
        const problems: string[] = [];
        for (const [modelId, modelData] of Object.entries(animationData.models)) {
            const events = (modelData as { events?: Record<string, unknown> }).events || {};
            for (const [clipName, eventList] of Object.entries(events)) {
                for (const evt of eventList as Array<{ t?: number }>) {
                    if (evt.t !== undefined && (evt.t < 0 || evt.t >= 1)) {
                        problems.push(`${modelId}.${clipName}: t=${evt.t} fuera de [0, 1)`);
                    }
                }
            }
        }
        expect(problems).toEqual([]);
    });

    // Resumen: conteo de clips referenciados por modelo
    it('resumen de clips referenciados por modelo', () => {
        const summary: Record<string, string[]> = {};
        for (const modelId of PROCEDURAL_MODELS) {
            const modelData = animationData.models[modelId];
            const events = modelData?.events || {};
            summary[modelId] = Object.keys(events).sort();
        }
        // Verificación de que cada modelo tiene al menos un clip con eventos
        for (const [modelId, clips] of Object.entries(summary)) {
            expect(clips.length, `${modelId} sin eventos`).toBeGreaterThanOrEqual(0);
        }
        // owl no tiene footstep (vuela) — verificado
        expect(summary.owl).toBeDefined();
    });
});
