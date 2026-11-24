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
import vegetationJson from '../../data/vegetation.json';
import {
    barriadaArboles,
    barriadaBounds,
    barriadaCasas,
    barriadaFarolas,
    barriadaLosas,
    barriadaPiedra,
    type BarriadaArbol,
    type BarriadaCasa,
} from '../world/barriada';
import { modelFile } from './modelFiles';
import { OcclusionPlugin } from './occlusion';
import { staticMesh } from './staticModels';
import { StreetView } from './streetView';
import type { LampPost } from './vegetationView';

/** Piezas y color de cada especie de árbol (las del mapa). */
const KINDS = (vegetationJson as unknown as {
    kinds: Record<string, { pieces: Array<{ piece: string; color: [number, number, number]; thin?: boolean }> }>;
}).kinds;

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
    /** CLA-BARR2: dónde va la luz de cada farola; la atmósfera enciende las más cercanas de noche. */
    readonly lamps: LampPost[] = barriadaFarolas().map((f) => ({ x: f.x, y: 2.6, z: f.y + f.haciaY * 0.5 }));
    /** Material del farol (`Luz`): brilla sólo cuando las farolas están encendidas. */
    private glow: { mat: { emissiveColor: Color3 }; base: Color3 } | null = null;

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
        // Sin la niebla del mapa (ver `instance`): al fondo de la calle el asfalto se volvía azul.
        for (const m of streets.root.getChildMeshes(false)) if (m.material) m.material.fogEnabled = false;

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
        this.trees();
        this.root.setEnabled(false);
        void this.houses();
    }

    setVisible(on: boolean): void {
        this.root.setEnabled(on);
    }

    update(dt: number, lampsOn = 0): void {
        if (!this.root.isEnabled()) return;
        this.time += dt;
        if (this.glow) this.glow.base.scaleToRef(lampsOn, this.glow.mat.emissiveColor);
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
                // Como LandmarkView: la fachada está en −Y de Blender y rotDeg cuenta desde −Z.
                this.instance(container, model, list.map((c) => ({ x: c.x, y: c.y, yawDeg: c.rotDeg + 180 })), list);
            } catch (e) {
                console.warn(`[barriada] no se pudo cargar ${model}`, e);
            }
        }
        // CLA-BARR2: farolas, con el farol colgando hacia el centro de la calle.
        try {
            const container = await modelFile(this.scene, 'farola');
            const farolas = barriadaFarolas();
            this.instance(
                container,
                'farola',
                farolas.map((f) => ({ x: f.x, y: f.y, yawDeg: f.haciaY === 1 ? 90 : -90 })),
            );
        } catch (e) {
            console.warn('[barriada] no se pudo cargar farola', e);
        }
    }

    /** CLA-BARR2: árboles de calle y de parque, una malla por pieza y especie, con instancias finas. */
    private trees(): void {
        const byKind = new Map<string, BarriadaArbol[]>();
        for (const a of barriadaArboles()) byKind.set(a.especie, [...(byKind.get(a.especie) ?? []), a]);
        const m4 = new Matrix();
        const q = new Quaternion();
        const sc = new Vector3();
        const t = new Vector3();
        for (const [kind, list] of byKind) {
            const def = KINDS[kind];
            if (!def) continue;
            const mats = new Float32Array(list.length * 16);
            list.forEach((a, i) => {
                Quaternion.RotationYawPitchRollToRef((a.rotDeg * Math.PI) / 180, 0, 0, q);
                sc.setAll(a.escala);
                t.set(a.x, 0, a.y);
                Matrix.ComposeToRef(sc, q, t, m4);
                m4.copyToArray(mats, i * 16);
            });
            for (const p of def.pieces) {
                const mesh = staticMesh(this.scene, p.piece, `barriada:${kind}:${p.piece}`);
                const mat = new StandardMaterial(`barriada-${kind}-${p.piece}`, this.scene);
                mat.diffuseColor = new Color3(...p.color);
                mat.specularColor = new Color3(0.03, 0.03, 0.03);
                mat.backFaceCulling = !p.thin;
                mat.twoSidedLighting = !!p.thin;
                mat.fogEnabled = false;
                new OcclusionPlugin(mat);
                mesh.material = mat;
                mesh.parent = this.root;
                mesh.isPickable = false;
                mesh.thinInstanceSetBuffer('matrix', mats.slice(), 16, true);
                mesh.thinInstanceRefreshBoundingInfo(false);
                mesh.receiveShadows = true;
                this.shadows?.addShadowCaster(mesh, false);
                mesh.freezeWorldMatrix();
            }
        }
    }

    /** Una pieza por malla del GLB, con una instancia fina por sitio; `casas` da el color de cada una. */
    private instance(
        container: Awaited<ReturnType<typeof modelFile>>,
        model: string,
        sitios: ReadonlyArray<{ x: number; y: number; yawDeg: number }>,
        casas?: readonly BarriadaCasa[],
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
            // El GLB llega con una escala −1 (mano derecha → izquierda): al hornearla, Babylon ya da vuelta
            // el orden de las caras. No volver a hacerlo: con flipFaces(true) las normales quedaban al revés
            // y el sol no alumbraba las casas (sólo el azul del cielo: paredes lilas, techos magenta).
            m.bakeTransformIntoVertices(world);
            return m;
        });
        for (const node of entries.rootNodes) node.dispose(true, false);

        const mats = new Float32Array(sitios.length * 16);
        const m4 = new Matrix();
        const q = new Quaternion();
        const one = new Vector3(1, 1, 1);
        const t = new Vector3();
        sitios.forEach((c, i) => {
            Quaternion.RotationYawPitchRollToRef((c.yawDeg * Math.PI) / 180, 0, 0, q);
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
            const matName = m.material ? m.material.name.split(':').pop()!.replace(/^Clone of /, '') : '';
            const key = casas ? TINT[matName] : undefined;
            if (key && casas) {
                const cols = new Float32Array(casas.length * 4);
                casas.forEach((c, i) => {
                    const rgb = c[key];
                    cols.set([rgb[0], rgb[1], rgb[2], 1], i * 4);
                });
                m.thinInstanceSetBuffer('color', cols, 4, true);
            }
            m.thinInstanceRefreshBoundingInfo(false);
            if (m.material && !plugged.has(m.material)) {
                plugged.add(m.material);
                new OcclusionPlugin(m.material);
                // La niebla del mapa está pensada para kilómetros de terreno; en esta zona de 420 m teñía de
                // azul y lila las casas a partir de unos 30 m, mientras calle y grama seguían limpias.
                m.material.fogEnabled = false;
                // El farol: su brillo sigue al encendido de las farolas (update).
                if (matName === 'Luz' && 'emissiveColor' in m.material) {
                    const mat = m.material as unknown as { emissiveColor: Color3 };
                    this.glow = { mat, base: mat.emissiveColor.clone() };
                    mat.emissiveColor.setAll(0);
                }
            }
            m.receiveShadows = true;
            this.shadows?.addShadowCaster(m, false);
            m.freezeWorldMatrix();
        }
    }
}

