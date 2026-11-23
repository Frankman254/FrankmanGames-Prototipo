// CLA-CASA2: la calle de la urbanización de las casas del creador (src/world/urbanizacion.ts).
// Cada losa es una placa que sigue el terreno, con faldones hasta debajo del suelo para que no se
// vea el canto en cuesta. Un solo dibujo por pieza.
import { Color3, Mesh, StandardMaterial, TransformNode, VertexData, type Scene } from '@babylonjs/core';
import { losas, type Losa, type Pieza } from '../world/urbanizacion';

const COLORS: Record<Pieza, [number, number, number]> = {
    asfalto: [0.2, 0.2, 0.22],
    raya: [0.95, 0.82, 0.25],
    cordon: [0.78, 0.77, 0.74],
    grama: [0.33, 0.52, 0.22],
    acera: [0.7, 0.68, 0.64],
    concreto: [0.74, 0.72, 0.68],
};

/** Paso de la rejilla que sigue el suelo (m). */
const STEP = 1;
const SKIRT = 0.35;

export class StreetView {
    readonly root: TransformNode;

    constructor(scene: Scene, ground: { sample(x: number, z: number): number }) {
        this.root = new TransformNode('urbanizacion', scene);
        const by = new Map<Pieza, VertexData[]>();
        for (const l of losas()) {
            const list = by.get(l.pieza) ?? [];
            list.push(slab(l, ground));
            by.set(l.pieza, list);
        }
        for (const [pieza, parts] of by) {
            const mesh = new Mesh(`calle:${pieza}`, scene);
            const all = new VertexData();
            all.positions = [];
            all.indices = [];
            all.normals = [];
            const merged = parts.reduce((acc, p) => {
                const base = acc.positions!.length / 3;
                (acc.positions as number[]).push(...(p.positions as number[]));
                (acc.indices as number[]).push(...(p.indices as number[]).map((i) => i + base));
                return acc;
            }, all);
            VertexData.ComputeNormals(merged.positions!, merged.indices!, merged.normals!);
            merged.applyToMesh(mesh);
            const m = new StandardMaterial(`calle-${pieza}`, scene);
            m.diffuseColor = new Color3(...COLORS[pieza]);
            m.specularColor = new Color3(0.04, 0.04, 0.04);
            // Los faldones se ven por cualquier lado.
            m.backFaceCulling = false;
            m.freeze();
            mesh.material = m;
            mesh.isPickable = false;
            mesh.receiveShadows = true;
            mesh.parent = this.root;
            mesh.freezeWorldMatrix();
        }
    }

    setVisible(on: boolean): void {
        this.root.setEnabled(on);
    }
}

/** Placa de la losa: rejilla superior a `alto` sobre el suelo y cuatro faldones. */
function slab(l: Losa, ground: { sample(x: number, z: number): number }): VertexData {
    const nx = Math.max(1, Math.ceil((l.x1 - l.x0) / STEP));
    const nz = Math.max(1, Math.ceil((l.y1 - l.y0) / STEP));
    const pos: number[] = [];
    const idx: number[] = [];
    const top = (x: number, z: number): number => ground.sample(x, z) + l.alto;
    for (let j = 0; j <= nz; j++)
        for (let i = 0; i <= nx; i++) {
            const x = l.x0 + ((l.x1 - l.x0) * i) / nx;
            const z = l.y0 + ((l.y1 - l.y0) * j) / nz;
            pos.push(x, top(x, z), z);
        }
    for (let j = 0; j < nz; j++)
        for (let i = 0; i < nx; i++) {
            const a = j * (nx + 1) + i;
            const b = a + 1;
            const c = a + nx + 1;
            const d = c + 1;
            idx.push(a, b, c, b, d, c);
        }
    // Faldones: del borde de arriba a SKIRT por debajo del suelo.
    const edge = (pts: Array<[number, number]>, flip: boolean): void => {
        const base = pos.length / 3;
        for (const [x, z] of pts) pos.push(x, top(x, z), z, x, ground.sample(x, z) - SKIRT, z);
        for (let k = 0; k < pts.length - 1; k++) {
            const a = base + 2 * k;
            const b = a + 2;
            if (flip) idx.push(a, b, a + 1, b, b + 1, a + 1);
            else idx.push(a, a + 1, b, b, a + 1, b + 1);
        }
    };
    const xs = Array.from({ length: nx + 1 }, (_, i) => l.x0 + ((l.x1 - l.x0) * i) / nx);
    const zs = Array.from({ length: nz + 1 }, (_, j) => l.y0 + ((l.y1 - l.y0) * j) / nz);
    edge(
        xs.map((x) => [x, l.y0]),
        true,
    );
    edge(
        xs.map((x) => [x, l.y1]),
        false,
    );
    edge(
        zs.map((z) => [l.x0, z]),
        false,
    );
    edge(
        zs.map((z) => [l.x1, z]),
        true,
    );
    const v = new VertexData();
    v.positions = pos;
    v.indices = idx;
    return v;
}
