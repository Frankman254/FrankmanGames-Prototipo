// BUG-01 (creador, 2026-11-18): en la cripta a veces se ve el fuego de una antorcha
// sin la pieza que lo sostiene. El modelo `d_antorcha` lleva el brazo y la copa en +X
// local (contrato O9, `scripts/blender/mazmorra.py`, ningún vértice en x<0); el soporte
// debe girar de forma que ese +X apunte a la normal (hacia la sala) en las CUATRO
// orientaciones de muro. `atan2(ny, nx)` invertía el eje Z y enterraba la copa dentro
// del muro en las paredes ±Z, dejando la llama suelta sin soporte visible.
import { Matrix, Vector3 } from '@babylonjs/core';
import { describe, expect, it } from 'vitest';
import { torchBracketMatrix } from '../src/render/dungeonView';
import type { DungeonTorch } from '../src/world/dungeon';

// Alcance de la copa en +X local (brazo hasta 0,16; copa hasta 0,21 + radio 0,075).
const CUP_REACH = 0.285;

const NORMALS: Array<[number, number]> = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
];

const frontAxis = (m: Matrix): Vector3 => new Vector3(m.m[0]!, m.m[1]!, m.m[2]!).normalizeToNew();

describe('BUG-01: el soporte de la antorcha mira a la sala en los cuatro muros', () => {
    it('el +X local (brazo y copa) cae sobre la normal, no dentro del muro', () => {
        for (const [nx, ny] of NORMALS) {
            const t: DungeonTorch = { x: 10, y: 20, nx, ny };
            const front = frontAxis(torchBracketMatrix(t, 2));
            const dot = front.x * nx + front.z * ny;
            expect(dot, `normal (${nx},${ny}) → copa mira (${front.x.toFixed(2)},${front.z.toFixed(2)})`).toBeCloseTo(1, 6);
        }
    });

    it('un punto de la copa queda por delante del plano del muro', () => {
        for (const [nx, ny] of NORMALS) {
            const t: DungeonTorch = { x: 10, y: 20, nx, ny };
            const m = torchBracketMatrix(t, 2);
            const cup = Vector3.TransformCoordinates(new Vector3(CUP_REACH, 0.15, 0), m);
            // Profundidad a favor de la normal respecto al anclaje (plano de pared).
            const depth = (cup.x - t.x) * nx + (cup.z - t.y) * ny;
            expect(depth, `normal (${nx},${ny}): copa a ${depth.toFixed(3)} m`).toBeGreaterThan(0.2);
        }
    });

    it('regresión: el yaw viejo (`atan2(ny, nx)`) enterraba la copa en los muros ±Z', () => {
        // La fórmula anterior fallaba justo en las paredes norte/sur (normal ±Z), que son
        // las que producían «llama sin soporte». Si alguien vuelve a ella, esta prueba lo pilla.
        for (const [nx, ny] of NORMALS) {
            const old = Matrix.RotationY(Math.atan2(ny, nx));
            const oldDot = Vector3.Dot(frontAxis(old), new Vector3(nx, 0, ny));
            if (nx === 0) expect(oldDot, `muro ±Z con el yaw viejo`).toBeCloseTo(-1, 6);
        }
    });
});
