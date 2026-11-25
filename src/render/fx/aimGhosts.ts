// Fantasmas del apuntado: una copia translúcida de cada cuerpo en el sitio donde
// acabaría si se lanza el hechizo, con una línea desde donde está. También aros
// bajo los enemigos alcanzados. Nada de esto interviene en el picking.
import {
    Color3,
    Material,
    MeshBuilder,
    StandardMaterial,
    TransformNode,
    type AbstractMesh,
    type LinesMesh,
    type Mesh,
    type Scene,
    Vector3,
} from '@babylonjs/core';
import { getAimSkin } from './aimSkins';
import type { AimSkinDef } from './aimSkins';
import { aimGhostPlacement } from './aimGhostPlacement';
import type { HeightField } from '../../world/terrain';

export interface AimGhost {
    key: string;
    /** Modelo que se copia. */
    source: TransformNode | null;
    facing: number;
    from: { x: number; y: number };
    to: { x: number; y: number };
    mine: boolean;
}

interface Live {
    root: TransformNode | null;
    source: TransformNode | null;
    line: LinesMesh | null;
    lineKey: string;
    ring: Mesh;
}

export class AimGhosts {
    private readonly live = new Map<string, Live>();
    private readonly rings: Mesh[] = [];
    private readonly mine: StandardMaterial;
    private readonly other: StandardMaterial;
    private readonly hitMat: StandardMaterial;
    private _skin: AimSkinDef;

    constructor(
        private readonly scene: Scene,
        private readonly ground: HeightField,
        skinId: string = 'simple',
    ) {
        this._skin = getAimSkin(skinId);
        const mat = (name: string, c: Color3, alpha: number): StandardMaterial => {
            const m = new StandardMaterial(name, scene);
            m.diffuseColor = c;
            m.emissiveColor = c.scale(0.75);
            m.specularColor = Color3.Black();
            m.alpha = alpha;
            m.transparencyMode = Material.MATERIAL_ALPHABLEND;
            return m;
        };
        this.mine = mat('aimGhostMine', new Color3(0.25, 0.85, 0.8), 0.48);
        this.other = mat('aimGhostOther', new Color3(0.95, 0.5, 0.2), 0.42);
        this.hitMat = mat('aimHitRing', new Color3(0.95, 0.28, 0.14), 0.9);
    }

    /** Cambia la skin activa (se aplica al próximo sync). */
    setSkin(skinId: string): void {
        this._skin = getAimSkin(skinId);
    }

    /** Aros bajo los alcanzados: posiciones y radio. */
    syncHits(list: readonly { x: number; y: number; radius: number }[]): void {
        while (this.rings.length < list.length) {
            const r = MeshBuilder.CreateTorus('aimHit', { diameter: 1, thickness: 0.05, tessellation: 32 }, this.scene);
            r.isPickable = false;
            r.material = this.hitMat;
            this.rings.push(r);
        }
        this.rings.forEach((r, i) => {
            const h = list[i];
            r.setEnabled(!!h);
            if (!h) return;
            r.position.set(h.x, this.ground.sample(h.x, h.y) + 0.09, h.y);
            r.scaling.setAll(h.radius * 2 + 0.35);
        });
    }

    sync(list: readonly AimGhost[]): void {
        const keep = new Set(list.map((g) => g.key));
        for (const [k, v] of this.live) {
            if (!keep.has(k)) {
                this.drop(v);
                this.live.delete(k);
            }
        }
        for (const g of list) {
            let v = this.live.get(g.key);
            if (!v) {
                v = {
                    root: null,
                    source: null,
                    line: null,
                    lineKey: '',
                    ring: this._skin.makeLandingRing(this.scene, g.mine),
                };
                v.ring.isPickable = false;
                this.live.set(g.key, v);
            }
            if (!v.root && g.source) {
                v.root = this.copyOf(g.source, g.mine);
                v.source = g.source;
            }
            const landing = aimGhostPlacement(g.to, this.ground.sample(g.to.x, g.to.y));
            if (v.root) {
                v.root.position.set(landing.x, landing.groundY, landing.z);
                v.root.rotation.copyFrom(g.source?.rotation ?? v.root.rotation);
                v.root.rotationQuaternion = null;
                v.root.rotation.y = -g.facing;
            }
            v.ring.position.set(landing.x, landing.ringY, landing.z);
            const lineKey = `${g.from.x.toFixed(2)},${g.from.y.toFixed(2)},${g.to.x.toFixed(2)},${g.to.y.toFixed(2)}`;
            if (lineKey === v.lineKey) continue;
            v.lineKey = lineKey;
            const from = new Vector3(g.from.x, this.ground.sample(g.from.x, g.from.y) + 0.12, g.from.y);
            const to = new Vector3(landing.x, landing.lineY, landing.z);
            v.line?.dispose();
            v.line = this._skin.makeTrajectoryLine(this.scene, from, to, g.mine);
            v.line.isPickable = false;
        }
    }

    clear(): void {
        this.sync([]);
        this.syncHits([]);
    }

    /** Copia del modelo con el material translúcido; comparte esqueleto, así que respira con el original. */
    private copyOf(source: TransformNode, mine: boolean): TransformNode | null {
        const root = source.clone('aimGhost', null, false);
        if (!root) return null;
        const mat = mine ? this.mine : this.other;
        for (const m of root.getChildMeshes(false) as AbstractMesh[]) {
            m.material = mat;
            m.isPickable = false;
            m.metadata = null;
            m.receiveShadows = false;
        }
        return root;
    }

    private drop(v: Live): void {
        v.root?.dispose(false, false);
        v.line?.dispose();
        v.ring.dispose();
    }
}
