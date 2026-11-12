// Recursos del mapa y talleres en pantalla, modelados en Blender (scripts/blender/objetos.py). Un recurso
// agotado se queda en su sitio encogido y gris hasta que vuelve, para que el mapa
// no quede pelado y se vea que ahí volverá a haber algo.
import {
  Color3,
  MeshBuilder,
  StandardMaterial,
  TransformNode,
  type AbstractMesh,
  type Mesh,
  type Scene,
} from '@babylonjs/core';
import { goldOutline } from './interactOutline';
import { staticMesh } from './staticModels';
import type { GatherNodeDef, ProfessionsDef, StationDef } from '../rpg/professions';
import type { World } from '../sim/world';
import type { HeightField } from '../world/terrain';

export type GatherPick = { kind: 'node'; id: number } | { kind: 'station'; id: string };

interface NodeEls {
  root: TransformNode;
  meshes: Mesh[];
  /** Aro en el suelo que distingue el recurso de los árboles y rocas de decorado. */
  ring: Mesh;
  depleted: boolean | null;
}

const GATHER_COLORS = { trunk: new Color3(0.36, 0.25, 0.15), iron: new Color3(0.27, 0.28, 0.31), wood: new Color3(0.45, 0.31, 0.18) };

function pickOf(mesh: { metadata?: unknown } | null | undefined): GatherPick | null {
  const md = mesh?.metadata as { gather?: GatherPick } | undefined;
  return md?.gather ?? null;
}

export class GatherView {
  private readonly nodes = new Map<number, NodeEls>();
  private readonly stations = new Map<string, TransformNode>();
  private readonly mats = new Map<string, StandardMaterial>();
  private readonly spent: StandardMaterial;

  constructor(
    private readonly scene: Scene,
    private readonly ground: HeightField,
    private def: ProfessionsDef,
    private readonly shadows: { addCasters(meshes: readonly AbstractMesh[]): void },
  ) {
    this.spent = this.material('spent', new Color3(0.32, 0.3, 0.27));
    this.rebuildStations();
  }

  /** Modo edición: talleres nuevos o movidos (y recursos recalculados fuera). */
  setDefs(def: ProfessionsDef): void {
    this.def = def;
    this.rebuildStations();
  }

  private rebuildStations(): void {
    for (const root of this.stations.values()) root.dispose(false, true);
    this.stations.clear();
    for (const s of Object.values(this.def.stations)) this.stations.set(s.id, this.buildStation(s));
  }

  /** Tira los nodos de recurso: el próximo `sync` los vuelve a crear desde el campo nuevo. */
  resetNodes(): void {
    for (const els of this.nodes.values()) {
      for (const m of els.meshes) m.dispose(false, false);
      els.ring.dispose(false, false);
      els.root.dispose(false, false);
    }
    this.nodes.clear();
  }

  private material(id: string, color: Color3): StandardMaterial {
    let m = this.mats.get(id);
    if (!m) {
      m = new StandardMaterial(`gather_${id}`, this.scene);
      m.diffuseColor = color;
      m.specularColor = Color3.Black();
      this.mats.set(id, m);
    }
    return m;
  }

  /** Recurso o taller bajo el cursor. Los agotados no se pueden elegir. */
  pick(screenX: number, screenY: number): GatherPick | null {
    const hit = this.scene.pick(screenX, screenY, (m) => m.isPickable && m.isEnabled() && pickOf(m) !== null);
    return hit?.hit ? pickOf(hit.pickedMesh) : null;
  }

  sync(world: World): void {
    const field = world.gatherField;
    for (const root of this.stations.values()) root.setEnabled(field !== null);
    if (!field) {
      for (const n of this.nodes.values()) n.root.setEnabled(false);
      return;
    }
    for (const n of field.nodes) {
      let els = this.nodes.get(n.id);
      if (!els) {
        const kind = this.def.nodes[n.kind];
        if (!kind) continue;
        els = this.buildNode(n.id, kind, n.x, n.y);
        this.nodes.set(n.id, els);
      }
      els.root.setEnabled(true);
      const depleted = n.respawn > 0;
      if (els.depleted === depleted) continue;
      els.depleted = depleted;
      const kind = this.def.nodes[n.kind]!;
      els.ring.setEnabled(!depleted);
      els.root.scaling.setAll(depleted ? (kind.shape === 'rock' ? 0.55 : 0.35) : 1);
      els.meshes.forEach((m, i) => {
        m.isPickable = !depleted;
        m.material = depleted ? this.spent : this.nodeMaterial(kind, i);
      });
    }
  }

  private ringMaterial(): StandardMaterial {
    const m = this.material('ring', new Color3(0.95, 0.85, 0.5));
    m.emissiveColor = new Color3(0.75, 0.62, 0.25);
    m.alpha = 0.75;
    return m;
  }

  private nodeMaterial(kind: GatherNodeDef, part: number): StandardMaterial {
    const base = Color3.FromHexString(kind.color);
    if (kind.shape === 'tree' && part === 0) return this.material('trunk', GATHER_COLORS.trunk);
    if (kind.shape === 'rock' && part === 0) return this.material('rockBody', new Color3(0.42, 0.41, 0.4));
    return this.material(kind.id, base);
  }

  private buildNode(id: number, kind: GatherNodeDef, x: number, z: number): NodeEls {
    const s = this.scene;
    const root = new TransformNode(`gather${id}`, s);
    root.position.set(x, this.ground.sample(x, z), z);
    root.rotation.y = id * 1.7;
    const meshes: Mesh[] = [];
    const add = (m: Mesh): Mesh => {
      m.parent = root;
      m.metadata = { gather: { kind: 'node', id } satisfies GatherPick };
      meshes.push(m);
      return m;
    };
    const size = 0.9 + ((id * 37) % 10) / 25;
    const pieces = kind.shape === 'tree' ? ['r_arbol_tronco', 'r_arbol_copa'] : kind.shape === 'rock' ? ['r_roca', 'r_veta'] : ['r_planta'];
    for (const piece of pieces) add(staticMesh(s, piece, `g${piece}${id}`)).scaling.setAll(size);
    meshes.forEach((m, i) => (m.material = this.nodeMaterial(kind, i)));
    this.shadows.addCasters(meshes);
    // Envoltura invisible con la forma del recurso: las vetas son pequeñas y entre sus
    // piezas el clic se colaba al suelo. Solo se usa para elegir (`pick`), no se dibuja;
    // `isVisible = false` la saca del fotograma (con `visibility = 0` se seguía pintando
    // con alfa nulo). El predicado de `pick` no exige visibilidad, sólo `isPickable`.
    const hull = (m: Mesh, y: number): void => {
      m.position.y = y;
      m.isVisible = false;
      add(m);
    };
    if (kind.shape === 'tree') {
      hull(MeshBuilder.CreateCylinder(`gHitTrunk${id}`, { height: 2.6 * size, diameter: 0.95, tessellation: 8 }, s), 1.3 * size);
      hull(MeshBuilder.CreateSphere(`gHitCrown${id}`, { diameter: 3.3 * size, segments: 6 }, s), 3.2 * size);
    } else if (kind.shape === 'rock') {
      hull(MeshBuilder.CreateSphere(`gHitRock${id}`, { diameter: 1.85 * size, segments: 6 }, s), 0.5 * size);
    } else {
      hull(MeshBuilder.CreateSphere(`gHitPlant${id}`, { diameter: 1.5 * size, segments: 6 }, s), 0.45 * size);
    }
    const ring = staticMesh(s, 'r_aro', `gRing${id}`);
    ring.scaling.setAll(kind.shape === 'plant' ? 1.3 : 1.9);
    ring.parent = root;
    ring.position.y = 0.08;
    ring.isPickable = false;
    ring.material = this.ringMaterial();
    return { root, meshes, ring, depleted: null };
  }

  private buildStation(st: StationDef): TransformNode {
    const s = this.scene;
    const root = new TransformNode(`station_${st.id}`, s);
    root.position.set(st.x, this.ground.sample(st.x, st.y), st.y);
    const meshes: Mesh[] = [];
    const piece = (name: string, mat: StandardMaterial): void => {
      const m = staticMesh(s, name, `st_${st.id}_${name}`);
      m.parent = root;
      m.material = mat;
      m.metadata = { gather: { kind: 'station', id: st.id } satisfies GatherPick };
      goldOutline(m, 0.015);
      meshes.push(m);
    };
    const wood = this.material('stationWood', GATHER_COLORS.wood);
    const iron = this.material('stationIron', GATHER_COLORS.iron);
    if (st.shape === 'anvil') {
      piece('t_yunque_madera', wood);
      piece('t_yunque_hierro', iron);
    } else if (st.shape === 'still') {
      piece('t_alambique_madera', wood);
      piece('t_alambique_cobre', this.material('stationCopper', new Color3(0.72, 0.4, 0.2)));
    } else {
      piece('t_telar_madera', wood);
      piece('t_telar_tela', this.material('stationCloth', new Color3(0.72, 0.28, 0.24)));
    }
    this.shadows.addCasters(meshes);
    return root;
  }
}
