// O9-RT3: el remolino de humo y chispa de las antorchas no puede cruzar el
// plano de la pared. El ancla toca ese plano (O9-RT, 8515602); si el remolino
// girase alrededor del ancla, la trayectoria barre el muro a mitad de ciclo.
// Punto 3 del REPORTE de O9: el centro del remolino se adelanta 0,30 m en la
// dirección de la normal, y con la deriva máxima (±0,09 m de la chispa) la
// distancia firmada al plano queda ≥ 5 cm en todo el ciclo.
//
// Prueba doble: sobre las funciones puras exportadas (muestreo exacto de u y v
// en un ciclo completo) y sobre las matrices reales que escribe TorchRig.write()
// con NullEngine (que el centro usado sea realmente `ancla + normal·0,30`).
import { Mesh, NullEngine, Scene } from '@babylonjs/core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { registerStaticGlb } from '../src/render/staticModels';
import {
    TorchRig,
    SWIRL_CENTER_OFFSET,
    smokeSwirl,
    sparkSwirl,
    swirlCenter,
} from '../src/render/torchFlame';
import type { DungeonTorch } from '../src/world/dungeon';

beforeAll(() => {
    const raw = readFileSync(join(__dirname, '..', 'assets', 'models', 'mazmorra.glb'));
    registerStaticGlb(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer);
});

// Las cuatro normales cardinales, con la antorcha lejos del origen para que el
// plano de pared (que pasa por el ancla) no coincida con un eje del mundo.
const NORMALS: ReadonlyArray<readonly [number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
];
const MARGIN = 0.05; // 5 cm exigidos por el validador de montaje de O9.

/** Distancia firmada de (x, z) al plano de pared que pasa por (ax, az) con normal (nx, ny). */
function wallDistance(x: number, z: number, t: DungeonTorch): number {
    return (x - t.x) * t.nx + (z - t.y) * t.ny;
}

function torch(nx: number, ny: number): DungeonTorch {
    return { x: 12.5, y: 7.5, nx, ny };
}

describe('O9-RT3: remolino de humo y chispa fuera del muro', () => {
    // 1. El centro del remolino está adelantado 0,30 m en la normal.
    it('swirlCenter adelanta el ancla SWIRL_CENTER_OFFSET en la normal', () => {
        expect(SWIRL_CENTER_OFFSET).toBe(0.3);
        for (const [nx, ny] of NORMALS) {
            const t = torch(nx, ny);
            const [cx, cz] = swirlCenter(t.x, t.y, nx, ny);
            expect(wallDistance(cx, cz, t)).toBeCloseTo(SWIRL_CENTER_OFFSET, 10);
            // Sin deriva lateral: sobre la normal, no desplazado a lo largo del muro.
            expect(cx).toBeCloseTo(t.x + nx * 0.3, 10);
            expect(cz).toBeCloseTo(t.y + ny * 0.3, 10);
        }
    });

    // 2. Ciclo completo muestreado en u y v para las cuatro normales:
    //    la distancia firmada al plano es siempre ≥ 5 cm.
    it('un ciclo completo de humo y chispa queda ≥ 5 cm delante del plano (±X/±Z)', () => {
        const STEPS = 720; // un paso cada medio grado de la vuelta del remolino
        for (const [nx, ny] of NORMALS) {
            const t = torch(nx, ny);
            const [cx, cz] = swirlCenter(t.x, t.y, nx, ny);
            // Varias fases: la fase solo rota el círculo, pero lo fijamos igual.
            for (const ph of [0, 0.7, 2.9, 5.5]) {
                let minSmoke = Infinity;
                let minSpark = Infinity;
                for (let k = 0; k < STEPS; k++) {
                    const s = k / STEPS; // instante de ciclo 0..1 (u y v barren la vuelta)
                    const [hx, hz] = smokeSwirl(s, ph, cx, cz);
                    const [kx, kz] = sparkSwirl(s, ph, cx, cz);
                    minSmoke = Math.min(minSmoke, wallDistance(hx, hz, t));
                    minSpark = Math.min(minSpark, wallDistance(kx, kz, t));
                }
                expect(minSmoke, `humo normal (${nx},${ny}) fase ${ph}`).toBeGreaterThanOrEqual(MARGIN);
                expect(minSpark, `chispa normal (${nx},${ny}) fase ${ph}`).toBeGreaterThanOrEqual(MARGIN);
            }
        }
    });

    // 3. Las matrices que escribe TorchRig.write(): humo y chispa reales,
    //    muestreando el reloj a lo largo de más de un ciclo de cada capa.
    it('TorchRig.write mantiene humo y chispa ≥ 5 cm del plano durante el ciclo', () => {
        const engine = new NullEngine();
        const scene = new Scene(engine);
        const torches = NORMALS.map(([nx, ny]) => torch(nx, ny));
        // flameOffset 0 como en dungeonView (O9-RT): el ancla está en el plano.
        const rig = new TorchRig(scene, torches, 2.36, [1, 0.6, 0.2], 0);
        const mats = (name: string): Float32Array => {
            const mesh = scene.getMeshByName(name) as Mesh;
            return (mesh as Mesh & { _thinInstanceDataStorage: { matrixData: Float32Array } })
                ._thinInstanceDataStorage.matrixData;
        };
        // Ciclo del humo: u avanza 0,42/s → 2,381 s. Ciclo de la chispa: v
        // avanza 0,9/s → 1,111 s. 5 s en pasos de 1/60 barren ambos más de una vez.
        const dt = 1 / 60;
        for (let step = 0; step < 300; step++) {
            rig.update(dt);
            for (const [name, layer] of [
                ['dSmoke', 'humo'],
                ['dSparks', 'chispa'],
            ] as const) {
                const data = mats(name);
                for (let i = 0; i < torches.length; i++) {
                    const x = data[i * 16 + 12]!;
                    const z = data[i * 16 + 14]!;
                    const d = wallDistance(x, z, torches[i]!);
                    expect(d, `${layer} antorcha ${i} t=${(step * dt).toFixed(2)}s`).toBeGreaterThanOrEqual(
                        MARGIN - 1e-9,
                    );
                }
            }
        }
        rig.dispose();
        scene.dispose();
        engine.dispose();
    });
});
