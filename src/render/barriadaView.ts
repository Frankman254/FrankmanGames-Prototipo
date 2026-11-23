// CLA-BARR1: la barriada de Praderas del Norte a escala 1:1 (src/world/barriada.ts). Suelo de grama,
// calles con las losas de la urbanización y cientos de casas del creador «copiadas y pegadas»: cada
// pieza del GLB es una malla con una instancia fina por casa (un dibujo por pieza y variante de modelo),
// y el color de pared, zócalo y reja va por instancia.
import {
    Color3,
    Matrix,
    MeshBuilder,
    Quaternion,
    StandardMaterial,
    TransformNode,
    Vector3,
    type AbstractMesh,
    type Mesh,
    type Scene,
} from '@babylonjs/core';
import {
    barriadaBounds,
    barriadaCasas,
    barriadaLosas,
    barriadaPiedra,
    type BarriadaCasa,
} from '../world/barriada';
import { modelFile } from './modelFiles';
import { OcclusionPlugin } from './occlusion';
import { staticMesh } from './staticModels';
import { StreetView } from './streetView';

const FLAT = { sample: (): number => 0 };

/** Material del GLB → qué color de la variante lo tiñe. */
const TINT: Record<string, keyof Pick<BarriadaCasa, 'pared' | 'zocalo' | 'reja'>> = {
    Repello: 'pared',
    RepelloBajo: 'zocalo',
    Reja: 'reja',
};

export class BarriadaView {
    readonly root: TransformNode;
    /** Piedra de vuelta: clic = salir de la barriada. */
    readonly stone: Mesh;
    private crystal: Mesh;
    private time = 0;

    constructor(
        private readonly scene: Scene,
        private readonly shadows?: { addShadowCaster(m: AbstractMesh, includeDescendants?: boolean): void },
    ) {
        this.root = new TransformNode('barriada', scene);
        const b = barriadaBounds();
        // Grama de toda la zona, un poco más grande para que no se vea el borde.
        const pad = 60;
        const ground = MeshBuilder.CreateGround(
            'barriada:suelo',
            { width: b.x1 - b.x0 + 2 * pad, height: b.y1 - b.y0 + 2 * pad },
            scene,
        );
        ground.position.set((b.x0 + b.x1) / 2, -0.01, (b.y0 + b.y1) / 2);
        const grass = new StandardMaterial('barriada-grama', scene);
        grass.diffuseColor = new Color3(0.36, 0.55, 0.24);
        grass.specularColor = new Color3(0.03, 0.03, 0.03);
        grass.freeze();
        ground.material = grass;
        ground.isPickable = true;
        ground.receiveShadows = true;
        ground.parent = this.root;

        const streets = new StreetView(scene, FLAT, barriadaLosas(), 'barriada');
        streets.root.parent = this.root;

        // Piedra de vuelta en la plaza: las mismas piezas que las Piedras Pintadas.
        const p = barriadaPiedra();
        const stoneRoot = new TransformNode('barriada:piedra', scene);
        stoneRoot.position.set(p.x, 0.08, p.y);
        stoneRoot.parent = this.root;
        const rock = new StandardMaterial('barriada-piedra', scene);
        rock.diffuseColor = new Color3(0.55, 0.53, 0.5);
        rock.specularColor = new Color3(0.05, 0.05, 0.05);
        const lit = new StandardMaterial('barriada-cristal', scene);
        lit.diffuseColor = new Color3(0.3, 0.8, 0.9);
        lit.emissiveColor = new Color3(0.25, 0.75, 0.85);
        this.stone = staticMesh(scene, 'p_base', 'barriada:piedra-base');
        this.stone.material = rock;
        const ring = staticMesh(scene, 'p_aro', 'barriada:piedra-aro');
        ring.material = lit;
        this.crystal = staticMesh(scene, 'p_cristal', 'barriada:piedra-cristal');
        this.crystal.material = lit;
        this.crystal.position.y = 1.6;
        for (const m of [this.stone, ring, this.crystal]) {
            m.parent = stoneRoot;
            m.isPickable = m === this.stone;
        }
        this.root.setEnabled(false);
        void this.houses();
    }

    setVisible(on: boolean): void {
        this.root.setEnabled(on);
    }

    update(dt: number): void {
        if (!this.root.isEnabled()) return;
        this.time += dt;
        this.crystal.position.y = 1.6 + Math.sin(this.time * 1.6) * 0.12;
        this.crystal.rotation.y = this.time * 0.8;
    }

    /** Una copia de cada pieza de los dos modelos, con todas sus casas como instancias finas. */
    private async houses(): Promise<void> {
        const casas = barriadaCasas();
        for (const model of ['casa_creador', 'casa_creador_espejo'] as const) {
            const list = casas.filter((c) => c.model === model);
            if (list.length === 0) continue;
            try {
                const container = await modelFile(this.scene, model);
                this.instance(container, model, list);
            } catch (e) {
                console.warn(`[barriada] no se pudo cargar ${model}`, e);
            }
        }
    }

    private instance(
        container: Awaited<ReturnType<typeof modelFile>>,
        model: string,
        list: readonly BarriadaCasa[],
    ): void {
        const entries = container.instantiateModelsToScene((n) => `barriada:${model}:${n}`, true, {
            doNotInstantiate: true,
        });
        for (const g of entries.animationGroups) g.stop();
        const meshes: Mesh[] = [];
        for (const node of entries.rootNodes) {
            // Puerta cerrada: la pose de reposo del GLB la deja abierta (ver Abrir/Cerrar).
            for (const n of (node as TransformNode).getChildTransformNodes(false))
                if (n.name.includes('Puerta')) n.rotationQuaternion = Quaternion.Identity();
            for (const m of node.getChildMeshes(false)) if (m.getTotalVertices() > 0) meshes.push(m as Mesh);
        }
        // Cada pieza queda en coordenadas de la casa, sin padres: la matriz de la instancia es la de la casa.
        const baked = meshes.map((m) => {
            const world = m.computeWorldMatrix(true).clone();
            m.setParent(null);
            m.position.setAll(0);
            m.rotationQuaternion = null;
            m.rotation.setAll(0);
            m.scaling.setAll(1);
            m.makeGeometryUnique();
            m.bakeTransformIntoVertices(world);
            // El GLB llega con una escala −1 (mano derecha → izquierda): al hornearla se dan vuelta las caras.
            if (world.determinant() < 0) m.flipFaces(true);
            return m;
        });
        for (const node of entries.rootNodes) node.dispose(true, false);

        const mats = new Float32Array(list.length * 16);
        const m4 = new Matrix();
        const q = new Quaternion();
        const one = new Vector3(1, 1, 1);
        const t = new Vector3();
        list.forEach((c, i) => {
            // Como LandmarkView: la fachada está en −Y de Blender y rotDeg cuenta desde −Z.
            Quaternion.RotationYawPitchRollToRef(((c.rotDeg + 180) * Math.PI) / 180, 0, 0, q);
            t.set(c.x, 0, c.y);
            Matrix.ComposeToRef(one, q, t, m4);
            m4.copyToArray(mats, i * 16);
        });
        const plugged = new Set<unknown>();
        for (const m of baked) {
            m.parent = this.root;
            m.isPickable = false;
            m.thinInstanceSetBuffer('matrix', mats, 16, true);
            // Los materiales clonados llevan el nombre del archivo delante («barriada:casa_creador:Repello»).
            const key = m.material ? TINT[m.material.name.split(':').pop()!.replace(/^Clone of /, '')] : undefined;
            if (key) {
                const cols = new Float32Array(list.length * 4);
                list.forEach((c, i) => {
                    const rgb = c[key];
                    cols.set([rgb[0], rgb[1], rgb[2], 1], i * 4);
                });
                m.thinInstanceSetBuffer('color', cols, 4, true);
            }
            m.thinInstanceRefreshBoundingInfo(false);
            if (m.material && !plugged.has(m.material)) {
                plugged.add(m.material);
                new OcclusionPlugin(m.material);
            }
            m.receiveShadows = true;
            this.shadows?.addShadowCaster(m, false);
            m.freezeWorldMatrix();
        }
    }
}

