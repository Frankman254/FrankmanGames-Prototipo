// Fuego de antorchas estilizado (Prompt 2, 2026-11-12). Cuatro mallas
// thin-instanced por piso — núcleo, halo, humo y chispa — para TODAS las
// antorchas: cuatro draw calls fijos por piso, ninguno por antorcha, cero
// sistemas de partículas. La variación asincrónica sale de una fase por
// posición (dos senos de frecuencia conmutada), el mismo truco del parpadeo
// de luces en atmosphere.ts: determinista y sin azar por fotograma.
//
// Presupuesto de shader (Babylon default, verificado en el código del shader):
// - el buffer `color` por thin instancia multiplica `baseColor.rgb`, que a su
//   vez multiplica `clamp(emissive + luz)`: el brillo y el tinte por antorcha
//   se animan pintando colores, sin tocar materiales;
// - `vColor.a` escala el alpha solo si el material mezcla: lo hace el humo
//   (alpha < 1). El halo y la chispa suman (ALPHA_ADD, ONE,ONE ignora el
//   alpha del fragmento): su fade va en el rgb.
// Dos materiales: nucleo (opaco emitivo), halo+chispa (aditivo sin profundidad).
import {
    Color3,
    Constants,
    Matrix,
    Mesh,
    Quaternion,
    StandardMaterial,
    Vector3,
    type Scene,
    type TransformNode,
} from '@babylonjs/core';
import { staticMesh } from './staticModels';
import type { DungeonTorch } from '../world/dungeon';
import type { Rgb } from '../data/dungeonSchema';

/**
 * Distancia del centro del remolino de humo y chispa al ancla, en metros,
 * medida a lo largo de la normal de la pared (O9-RT3, punto 3 del REPORTE de
 * O9: `work/omp-cripta-antorchas-montaje/REPORTE.md`). El remolino barre un
 * círculo de radio `SPARK_DRIFT` (0,09 m) alrededor de este centro; con 0,30 m
 * la trayectoria queda siempre ≥ 5 cm delante del plano de la pared.
 */
export const SWIRL_CENTER_OFFSET = 0.3;
/** Deriva lateral (m) del humo respecto a su centro de remolino. */
const SMOKE_DRIFT = 0.06;
/** Deriva lateral (m) de la chispa, la capa que más se aparta del centro. */
const SPARK_DRIFT = 0.09;

/**
 * Centro del remolino de humo y chispa para una antorcha en `(x, z)` con normal
 * de pared `(nx, ny)`: el ancla adelantada `SWIRL_CENTER_OFFSET` en la dirección
 * de la normal, hacia la sala. Pura y exportada para poder muestrear un ciclo
 * completo en las pruebas (O9-RT3).
 */
export function swirlCenter(x: number, z: number, nx: number, ny: number): readonly [number, number] {
    return [x + nx * SWIRL_CENTER_OFFSET, z + ny * SWIRL_CENTER_OFFSET] as const;
}

/** Posición horizontal del humo en el instante de ciclo `u` (0..1), fase `ph`. */
export function smokeSwirl(u: number, ph: number, cx: number, cz: number): readonly [number, number] {
    return [cx + Math.sin(u * 5 + ph) * SMOKE_DRIFT, cz + Math.cos(u * 5 + ph) * SMOKE_DRIFT] as const;
}

/** Posición horizontal de la chispa en el instante de ciclo `v` (0..1), fase `ph`. */
export function sparkSwirl(v: number, ph: number, cx: number, cz: number): readonly [number, number] {
    return [cx + Math.sin(v * 6 + ph) * SPARK_DRIFT, cz + Math.cos(v * 6 + ph) * SPARK_DRIFT] as const;
}

/** Dos senos de frecuencia conmutada por fase propia: 0..1 suave, sin sincronía. */
function wiggle(t: number, ph: number): number {
    const a = Math.sin(t * 9.1 + ph);
    const b = Math.sin(t * 13.7 + ph * 1.3);
    return Math.abs(a) > Math.abs(b) ? 0.5 + 0.5 * a : 0.5 + 0.5 * b;
}

/**
 * Las cuatro capas del fuego sobre las instancias de `d_antorcha` del piso.
 * Piezas necesarias en `mazmorra.glb`: `d_llama` (conserva el nombre público),
 * `d_llama_halo`, `d_llama_humo`, `d_llama_chispa`. `dispose()` libera las
 * cuatro mallas y los tres materiales (núcleo y chispa comparten uno).
 */
export class TorchRig {
    private readonly core: Mesh;
    private readonly halo: Mesh;
    private readonly smoke: Mesh;
    private readonly sparks: Mesh;
    private readonly coreMat: StandardMaterial;
    private readonly haloMat: StandardMaterial;
    private readonly smokeMat: StandardMaterial;
    private readonly tmats: Record<'core' | 'halo' | 'smoke' | 'sparks', Float32Array>;
    private readonly tcols: Record<'core' | 'halo' | 'smoke' | 'sparks', Float32Array>;
    private readonly anchor: Float32Array; // x, z por antorcha (juego)
    private readonly normal: Float32Array; // nx, ny por antorcha: centro del remolino (O9-RT3)
    private readonly phases: Float32Array;
    private readonly color: Rgb;
    private readonly baseY: number;
    private time = 0;

    constructor(scene: Scene, torches: readonly DungeonTorch[], baseY: number, color: Rgb, flameOffset = 0.16) {
        this.baseY = baseY;
        this.color = color;
        const n = torches.length;
        this.anchor = new Float32Array(n * 2);
        this.normal = new Float32Array(n * 2);
        this.phases = new Float32Array(n);
        torches.forEach((t, i) => {
            const ax = t.x + t.nx * flameOffset;
            const az = t.y + t.ny * flameOffset;
            this.anchor[i * 2] = ax;
            this.anchor[i * 2 + 1] = az;
            this.normal[i * 2] = t.nx;
            this.normal[i * 2 + 1] = t.ny;
            this.phases[i] = ax * 1.7 + az * 2.3 + i;
        });
        this.coreMat = new StandardMaterial('dFlameMat', scene);
        this.coreMat.diffuseColor = Color3.Black();
        this.coreMat.specularColor = Color3.Black();
        this.coreMat.emissiveColor = new Color3(1, 1, 1); // el tinte y el parpadeo los trae la instancia
        this.coreMat.disableLighting = true;
        this.haloMat = new StandardMaterial('dHaloMat', scene);
        this.haloMat.diffuseColor = Color3.Black();
        this.haloMat.specularColor = Color3.Black();
        this.haloMat.emissiveColor = new Color3(1, 1, 1);
        this.haloMat.disableLighting = true;
        this.haloMat.alphaMode = Constants.ALPHA_ADD;
        this.haloMat.disableDepthWrite = true;
        this.smokeMat = new StandardMaterial('dSmokeMat', scene);
        this.smokeMat.diffuseColor = new Color3(0.16, 0.155, 0.15);
        this.smokeMat.specularColor = Color3.Black();
        this.smokeMat.emissiveColor = Color3.Black();
        // alpha < 1 activa el blending, condición para que vColor.a por instancia
        // desvanezca; sin escribir profundidad para no tapar el muro de atrás.
        this.smokeMat.alpha = 0.99;
        this.smokeMat.disableDepthWrite = true;
        this.smokeMat.backFaceCulling = false;
        const mk = (piece: string, name: string, material: StandardMaterial): Mesh => {
            const m = staticMesh(scene, piece, name);
            m.material = material;
            m.isPickable = false;
            // Interior cerrado y malla pequeña: evitar el costoso refresh de bounding
            // por frame marcándola siempre activa (4 draw calls, no más).
            m.alwaysSelectAsActiveMesh = true;
            return m;
        };
        this.core = mk('d_llama', 'dFlame', this.coreMat);
        this.halo = mk('d_llama_halo', 'dHalo', this.haloMat);
        this.smoke = mk('d_llama_humo', 'dSmoke', this.smokeMat);
        this.sparks = mk('d_llama_chispa', 'dSparks', this.haloMat);
        const sz = (k: number): Float32Array => new Float32Array(k);
        this.tmats = { core: sz(n * 16), halo: sz(n * 16), smoke: sz(n * 16), sparks: sz(n * 16) };
        this.tcols = { core: sz(n * 4), halo: sz(n * 4), smoke: sz(n * 4), sparks: sz(n * 4) };
        for (const [mesh, mats, cols] of [
            [this.core, this.tmats.core, this.tcols.core],
            [this.halo, this.tmats.halo, this.tcols.halo],
            [this.smoke, this.tmats.smoke, this.tcols.smoke],
            [this.sparks, this.tmats.sparks, this.tcols.sparks],
        ] as const) {
            mesh.thinInstanceSetBuffer('matrix', mats, 16, false);
            mesh.thinInstanceSetBuffer('color', cols, 4, false);
        }
        this.write();
    }

    attachTo(node: TransformNode): void {
        for (const mesh of [this.core, this.halo, this.smoke, this.sparks]) mesh.parent = node;
    }

    /** Avanza el reloj y reescribe matrices y colores de las cuatro capas. */
    update(dt: number): void {
        this.time += dt;
        this.write();
    }

    private write(): void {
        const t = this.time;
        const m = new Matrix();
        const q = new Quaternion();
        const s = new Vector3();
        const p = new Vector3();
        const n = this.phases.length;
        for (let i = 0; i < n; i++) {
            const x = this.anchor[i * 2]!;
            const z = this.anchor[i * 2 + 1]!;
            // O9-RT3: el remolino de humo y chispa no gira sobre el ancla (que
            // toca el plano de la pared) sino adelantado hacia la sala; si no,
            // la trayectoria cruza el muro a mitad de ciclo.
            const [sx, sz] = swirlCenter(x, z, this.normal[i * 2]!, this.normal[i * 2 + 1]!);
            const ph = this.phases[i]!;
            const w = wiggle(t, ph);
            const y = this.baseY;
            // Nucleo: estiramiento vertical y balance en el eje de la pared.
            s.set(0.94 + 0.12 * w, 0.92 + 0.24 * w, 0.94 + 0.12 * w);
            Quaternion.RotationYawPitchRollToRef(
                Math.sin(t * 2.3 + ph) * 0.28,
                0,
                Math.sin(t * 1.9 + ph * 0.7) * 0.22,
                q,
            );
            p.set(x, y, z);
            Matrix.ComposeToRef(s, q, p, m);
            m.copyToArray(this.tmats.core, i * 16);
            // Halo: respira en contra del nucleo, ciclo mas lento.
            s.setAll(1.02 + 0.14 * wiggle(t * 0.7, ph + 3));
            Quaternion.RotationYawPitchRollToRef(0, 0, Math.sin(t * 1.6 + ph) * 0.18, q);
            Matrix.ComposeToRef(s, q, p, m);
            m.copyToArray(this.tmats.halo, i * 16);
            // Humo: bucle de subida de ~2.4 s, agrandandose y derivando con el aire.
            const u = (t * 0.42 + ph * 0.11 + i * 0.37) % 1;
            s.setAll(0.2 + 0.75 * u);
            Quaternion.RotationYawPitchRollToRef(u * 1.4 + ph, 0, Math.sin(u * 3 + ph) * 0.2, q);
            const [hx, hz] = smokeSwirl(u, ph, sx, sz);
            p.set(hx, y + 0.3 + 0.9 * u, hz);
            Matrix.ComposeToRef(s, q, p, m);
            m.copyToArray(this.tmats.smoke, i * 16);
            // Chispa: ciclo corto que sube mas rapido y se encoge al apagarse.
            const v = (t * 0.9 + ph + i * 0.53) % 1;
            s.setAll(0.5 + 0.5 * (1 - v));
            Quaternion.RotationYawPitchRollToRef(v * 5 + ph, 0, v * 2, q);
            const [kx, kz] = sparkSwirl(v, ph, sx, sz);
            p.set(kx, y + 0.42 + 0.9 * v, kz);
            Matrix.ComposeToRef(s, q, p, m);
            m.copyToArray(this.tmats.sparks, i * 16);
            // Brillo 0.72..1.08: oscila suave, sin el parpadeo a tope del original.
            const flick = 0.72 + 0.36 * w;
            const [cr, cg, cb] = this.color;
            const put = (arr: Float32Array, r: number, g: number, b: number, a: number): void => {
                arr[i * 4] = r;
                arr[i * 4 + 1] = g;
                arr[i * 4 + 2] = b;
                arr[i * 4 + 3] = a;
            };
            put(this.tcols.core, cr * flick + 0.14, cg * flick, cb * flick, 1);
            // Aditivo: el peso del halo/chispa va en el rgb (ONE,ONE ignora alpha).
            const haloK = 0.3 + 0.2 * w;
            put(this.tcols.halo, cr * haloK, cg * haloK * 0.85, cb * haloK * 0.7, 1);
            put(
                this.tcols.smoke,
                0.7 + 0.3 * u,
                0.7 + 0.3 * u,
                0.7 + 0.3 * u,
                Math.sin(Math.PI * Math.min(1, u * 1.2)) * 0.2,
            );
            const sparkK = (1 - v) * 0.9;
            put(this.tcols.sparks, Math.min(1, cr + 0.5) * sparkK, Math.min(1, cg + 0.3) * sparkK, cb * sparkK, 1);
        }
        for (const mesh of [this.core, this.halo, this.smoke, this.sparks]) {
            mesh.thinInstanceBufferUpdated('matrix');
            mesh.thinInstanceBufferUpdated('color');
        }
    }

    dispose(): void {
        for (const mesh of [this.core, this.halo, this.smoke, this.sparks]) mesh.dispose();
        for (const material of [this.coreMat, this.haloMat, this.smokeMat]) material.dispose();
    }
}
