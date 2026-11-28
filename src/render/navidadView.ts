// NAV-03: el mapa de Navidad (src/world/navidad.ts). Suelo nevado, paseo, piedra de vuelta y las piezas
// de assets/models/navidad.glb con una instancia fina por sitio (un dibujo por pieza y material).
// Las luces de colores parpadean; faroles y ventanas siguen al encendido de las farolas.
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
    NAVIDAD,
    guirnaldaEscala,
    navidadBounds,
    navidadFaroles,
    navidadGuirnaldas,
    navidadPiedra,
    navidadPiezas,
} from '../world/navidad';
import { modelFile } from './modelFiles';
import { OcclusionPlugin } from './occlusion';
import { staticMesh } from './staticModels';
import type { LampPost } from './vegetationView';

interface Sitio {
    x: number;
    y: number;
    yawDeg: number;
    /** Escala a lo largo del eje de la pieza (guirnaldas). */
    largo?: number;
}

/** Brillo que parpadea: material emisivo, su color de base y un desfase propio. */
interface Brillo {
    mat: { emissiveColor: Color3 };
    base: Color3;
    fase: number;
    /** true: luz de colores, parpadea siempre; false: farol o ventana, sigue a las farolas. */
    parpadea: boolean;
}

export class NavidadView {
    readonly root: TransformNode;
    /** Piedra de vuelta: clic = salir del mapa. */
    readonly stone: Mesh;
    private crystal: Mesh;
    private time = 0;
    /** Farolitos de papel: la atmósfera enciende los más cercanos de noche. */
    readonly lamps: LampPost[] = navidadFaroles().map((f) => ({ x: f.x, y: 2.4, z: f.y }));
    private readonly brillos: Brillo[] = [];
    /** Materiales ya preparados (niebla, oclusión): varias piezas comparten los `nav_*`. */
    private readonly listos = new Set<unknown>();

    constructor(
        private readonly scene: Scene,
        private readonly shadows?: { addShadowCaster(m: AbstractMesh, includeDescendants?: boolean): void },
    ) {
        this.root = new TransformNode('navidad', scene);
        const b = navidadBounds();
        const pad = 60;
        const ground = MeshBuilder.CreateGround(
            'navidad:suelo',
            { width: b.x1 - b.x0 + 2 * pad, height: b.y1 - b.y0 + 2 * pad },
            scene,
        );
        ground.position.set((b.x0 + b.x1) / 2, -0.01, (b.y0 + b.y1) / 2);
        const snow = new StandardMaterial('navidad-nieve', scene);
        snow.diffuseColor = new Color3(0.86, 0.9, 0.96);
        snow.specularColor = new Color3(0.08, 0.08, 0.1);
        snow.fogEnabled = false;
        snow.freeze();
        ground.material = snow;
        ground.isPickable = true;
        ground.receiveShadows = true;
        ground.parent = this.root;

        // Paseo pisado de la plaza a la piedra y la plaza misma, un poco más oscuros.
        const trodden = new StandardMaterial('navidad-pisado', scene);
        trodden.diffuseColor = new Color3(0.72, 0.74, 0.8);
        trodden.specularColor = new Color3(0.04, 0.04, 0.05);
        trodden.fogEnabled = false;
        trodden.freeze();
        const o = NAVIDAD.origen;
        const pz = NAVIDAD.paseo;
        const path = MeshBuilder.CreateGround('navidad:paseo', { width: pz.ancho, height: pz.y1 - pz.y0 + 2 }, scene);
        path.position.set(o.x + pz.x, 0, o.y + (pz.y0 + pz.y1) / 2);
        const plaza = MeshBuilder.CreateDisc('navidad:plaza', { radius: NAVIDAD.plaza.radio, tessellation: 48 }, scene);
        plaza.rotation.x = Math.PI / 2;
        plaza.position.set(o.x + NAVIDAD.plaza.x, 0.005, o.y + NAVIDAD.plaza.y);
        for (const m of [path, plaza]) {
            m.material = trodden;
            m.isPickable = true;
            m.receiveShadows = true;
            m.parent = this.root;
        }

        // Piedra de vuelta: las mismas piezas que las Piedras Pintadas.
        const p = navidadPiedra();
        const stoneRoot = new TransformNode('navidad:piedra', scene);
        stoneRoot.position.set(p.x, 0.08, p.y);
        stoneRoot.parent = this.root;
        const rock = new StandardMaterial('navidad-piedra', scene);
        rock.diffuseColor = new Color3(0.55, 0.53, 0.5);
        rock.specularColor = new Color3(0.05, 0.05, 0.05);
        const lit = new StandardMaterial('navidad-cristal', scene);
        lit.diffuseColor = new Color3(0.3, 0.8, 0.9);
        lit.emissiveColor = new Color3(0.25, 0.75, 0.85);
        this.stone = staticMesh(scene, 'p_base', 'navidad:piedra-base');
        this.stone.material = rock;
        const ring = staticMesh(scene, 'p_aro', 'navidad:piedra-aro');
        ring.material = lit;
        this.crystal = staticMesh(scene, 'p_cristal', 'navidad:piedra-cristal');
        this.crystal.material = lit;
        this.crystal.position.y = 1.6;
        for (const m of [this.stone, ring, this.crystal]) {
            m.parent = stoneRoot;
            m.isPickable = m === this.stone;
        }
        this.root.setEnabled(false);
        void this.pieces();
    }

    setVisible(on: boolean): void {
        this.root.setEnabled(on);
    }

    /** `lampsOn` 0–1: faroles y ventanas brillan de noche; las luces de colores parpadean siempre. */
    update(dt: number, lampsOn = 0): void {
        if (!this.root.isEnabled()) return;
        this.time += dt;
        this.crystal.position.y = 1.6 + Math.sin(this.time * 1.6) * 0.12;
        this.crystal.rotation.y = this.time * 0.8;
        for (const b of this.brillos) {
            const k = b.parpadea ? luzNavidad(this.time, b.fase) : 0.35 + 0.65 * lampsOn;
            b.base.scaleToRef(k, b.mat.emissiveColor);
        }
    }

    /** Cada modelo de navidad.glb, instanciado en todos sus sitios. */
    private async pieces(): Promise<void> {
        let container: Awaited<ReturnType<typeof modelFile>>;
        try {
            container = await modelFile(this.scene, 'navidad');
        } catch (e) {
            console.warn('[navidad] no se pudo cargar navidad.glb', e);
            return;
        }
        const sitios = new Map<string, Sitio[]>();
        // Como la barriada: la fachada está en −Y de Blender y rotDeg cuenta desde −Z.
        for (const p of navidadPiezas())
            sitios.set(p.modelo, [...(sitios.get(p.modelo) ?? []), { x: p.x, y: p.y, yawDeg: p.rotDeg + 180 }]);
        // La guirnalda va de 0 a 6 m por la X de Blender, que llega como −x: se gira hacia el farol siguiente.
        sitios.set(
            'guirnalda',
            navidadGuirnaldas().map((g) => ({
                x: g.desde.x,
                y: g.desde.y,
                yawDeg: (Math.atan2(g.hasta.y - g.desde.y, -(g.hasta.x - g.desde.x)) * 180) / Math.PI,
                largo: guirnaldaEscala(g),
            })),
        );
        const entries = container.instantiateModelsToScene((n) => `navidad:${n}`, true, { doNotInstantiate: true });
        for (const g of entries.animationGroups) g.stop();
        const porNodo = new Map<string, Mesh[]>();
        for (const node of entries.rootNodes)
            for (const m of [node, ...node.getChildMeshes(false)]) {
                const mesh = m as Mesh;
                if (typeof mesh.getTotalVertices !== 'function' || mesh.getTotalVertices() === 0) continue;
                // Los primitivos de un nodo con varios materiales llegan como hijos «nodo_primitive0…».
                const nodo = mesh.name.replace(/^navidad:/, '').replace(/_primitive\d+$/, '');
                porNodo.set(nodo, [...(porNodo.get(nodo) ?? []), mesh]);
            }
        let fase = 0;
        const vistos = new Set<unknown>();
        for (const [nodo, meshes] of porNodo) {
            const list = sitios.get(nodo);
            if (!list?.length) continue;
            for (const m of meshes) this.instance(m, list);
            for (const m of meshes) {
                const mat = m.material;
                if (!mat || vistos.has(mat) || !('emissiveColor' in mat)) continue;
                vistos.add(mat);
                const name = mat.name.split(':').pop()!.replace(/^Clone of /, '');
                const e = (mat as unknown as { emissiveColor: Color3 }).emissiveColor;
                if (e.r + e.g + e.b < 0.05) continue;
                const parpadea = name.startsWith('nav_luz_');
                if (!parpadea && !/^nav_(ventana|papel_)/.test(name)) continue;
                this.brillos.push({ mat: mat as unknown as { emissiveColor: Color3 }, base: e.clone(), fase: fase++ * 1.7, parpadea });
            }
        }
        for (const node of entries.rootNodes) node.dispose(true, false);
    }

    /** La malla horneada en coordenadas de la pieza, con una instancia fina por sitio. */
    private instance(m: Mesh, list: readonly Sitio[]): void {
        const world = m.computeWorldMatrix(true).clone();
        m.setParent(null);
        m.position.setAll(0);
        m.rotationQuaternion = null;
        m.rotation.setAll(0);
        m.scaling.setAll(1);
        m.makeGeometryUnique();
        // Ver BarriadaView.instance: la escala −1 del glTF ya da vuelta las caras al hornear.
        m.bakeTransformIntoVertices(world);
        const mats = new Float32Array(list.length * 16);
        const m4 = new Matrix();
        const q = new Quaternion();
        const sc = new Vector3();
        const t = new Vector3();
        list.forEach((s, i) => {
            Quaternion.RotationYawPitchRollToRef((s.yawDeg * Math.PI) / 180, 0, 0, q);
            sc.set(s.largo ?? 1, 1, 1);
            t.set(s.x, 0, s.y);
            Matrix.ComposeToRef(sc, q, t, m4);
            m4.copyToArray(mats, i * 16);
        });
        m.parent = this.root;
        m.isPickable = false;
        m.thinInstanceSetBuffer('matrix', mats, 16, true);
        m.thinInstanceRefreshBoundingInfo(false);
        if (m.material && !this.listos.has(m.material)) {
            this.listos.add(m.material);
            m.material.fogEnabled = false;
            new OcclusionPlugin(m.material);
            // Los banderines son láminas finas: se ven por los dos lados.
            if (m.material.name.includes('pollera')) m.material.backFaceCulling = false;
        }
        m.receiveShadows = true;
        this.shadows?.addShadowCaster(m, false);
        m.freezeWorldMatrix();
    }
}

/** Parpadeo de las luces de colores: dos ondas lentas desfasadas, nunca del todo apagadas (0,25–1). */
export function luzNavidad(t: number, fase: number): number {
    const a = 0.5 + 0.5 * Math.sin(t * 2.1 + fase);
    const b = 0.5 + 0.5 * Math.sin(t * 0.7 + fase * 2.3);
    return 0.25 + 0.75 * Math.max(a, b * b);
}
