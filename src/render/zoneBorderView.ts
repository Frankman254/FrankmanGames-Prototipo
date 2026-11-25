// Borde en el suelo de la casilla de la cámara estática, pegado al relieve.
import { Color3, MeshBuilder, StandardMaterial, Vector3, type Mesh, type Scene } from '@babylonjs/core';
import type { ZoneCell } from '../camera';
import { zoneBorderPoints } from './zoneBorderLogic';

const WIDTH = 0.28;
const LIFT = 0.12;

export class ZoneBorderView {
    private mesh: Mesh | null = null;
    private shown = '';
    private readonly mat: StandardMaterial;

    constructor(
        private readonly scene: Scene,
        private readonly ground: { sample(x: number, z: number): number },
    ) {
        this.mat = new StandardMaterial('zoneBorder', scene);
        this.mat.diffuseColor = Color3.Black();
        this.mat.specularColor = Color3.Black();
        this.mat.emissiveColor = new Color3(0.95, 0.76, 0.3);
        this.mat.alpha = 0.7;
        this.mat.backFaceCulling = false;
    }

    sync(cell: ZoneCell | null): void {
        const key = cell ? `${cell.x}:${cell.z}:${cell.size}` : '';
        if (key === this.shown) return;
        this.shown = key;
        this.mesh?.dispose();
        this.mesh = null;
        if (!cell) return;
        const inner: Vector3[] = [],
            outer: Vector3[] = [];
        for (const point of zoneBorderPoints(cell)) {
            const y = this.ground.sample(point.x, point.z) + LIFT;
            inner.push(new Vector3(point.x, y, point.z));
            outer.push(
                new Vector3(point.x + point.offsetX * WIDTH, y, point.z + point.offsetZ * WIDTH),
            );
        }
        this.mesh = MeshBuilder.CreateRibbon('zoneBorder', { pathArray: [inner, outer] }, this.scene);
        this.mesh.material = this.mat;
        this.mesh.isPickable = false;
    }
}
