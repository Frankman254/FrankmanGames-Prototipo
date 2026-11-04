// Recursos del mapa y talleres en pantalla, hechos con primitivas. Un recurso
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
    private readonly def: ProfessionsDef,
    private readonly shadows: { addCasters(meshes: readonly AbstractMesh[]): void },
  ) {
    this.spent = this.material('spent', new Color3(0.32, 0.3, 0.27));
    for (const s of Object.values(def.stations)) this.stations.set(s.id, this.buildStation(s));
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
    if (kind.shape === 'tree') {
      const trunk = add(MeshBuilder.CreateCylinder(`gTrunk${id}`, { height: 2.6 * size, diameterTop: 0.28, diameterBottom: 0.5, tessellation: 7 }, s));
      trunk.position.y = 1.3 * size;
      const crown = add(MeshBuilder.CreateIcoSphere(`gCrown${id}`, { radius: 1.3 * size, subdivisions: 1, flat: true }, s));
      crown.position.y = 3 * size;
      const top = add(MeshBuilder.CreateIcoSphere(`gTop${id}`, { radius: 0.85 * size, subdivisions: 1, flat: true }, s));
      top.position.set(0.3, 3.9 * size, -0.2);
    } else if (kind.shape === 'rock') {
      const rock = add(MeshBuilder.CreatePolyhedron(`gRock${id}`, { type: 2, size: 0.65 * size }, s));
      rock.position.y = 0.45 * size;
      rock.scaling.y = 0.8;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + id;
        const vein = add(MeshBuilder.CreatePolyhedron(`gVein${id}_${i}`, { type: 1, size: 0.17 * size }, s));
        vein.position.set(Math.cos(a) * 0.48 * size, (0.45 + (i % 2) * 0.28) * size, Math.sin(a) * 0.48 * size);
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const leaf = add(MeshBuilder.CreateCylinder(`gLeaf${id}_${i}`, { height: 0.95 * size, diameterTop: 0, diameterBottom: 0.2, tessellation: 4 }, s));
        leaf.position.set(Math.cos(a) * 0.26, 0.42 * size, Math.sin(a) * 0.26);
        leaf.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
      }
    }
    meshes.forEach((m, i) => (m.material = this.nodeMaterial(kind, i)));
    this.shadows.addCasters(meshes);
    // Envoltura invisible con la forma del recurso: las vetas son pequeñas y entre sus
    // piezas el clic se colaba al suelo. Solo se usa para elegir (`pick`), no se dibuja.
    const hull = (m: Mesh, y: number): void => {
      m.position.y = y;
      m.visibility = 0;
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
    const ring = MeshBuilder.CreateTorus(`gRing${id}`, { diameter: kind.shape === 'plant' ? 1.3 : 1.9, thickness: 0.05, tessellation: 28 }, s);
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
    const box = (name: string, w: number, h: number, d: number, x: number, y: number, z: number, mat: StandardMaterial): void => {
      const m = MeshBuilder.CreateBox(`st_${st.id}_${name}`, { width: w, height: h, depth: d }, s);
      m.parent = root;
      m.position.set(x, y, z);
      m.material = mat;
      m.metadata = { gather: { kind: 'station', id: st.id } satisfies GatherPick };
      goldOutline(m);
      meshes.push(m);
    };
    const wood = this.material('stationWood', GATHER_COLORS.wood);
    const iron = this.material('stationIron', GATHER_COLORS.iron);
    if (st.shape === 'anvil') {
      box('block', 0.7, 0.55, 0.7, 0, 0.28, 0, wood);
      box('waist', 0.32, 0.22, 0.36, 0, 0.66, 0, iron);
      box('face', 1.05, 0.2, 0.42, 0.06, 0.86, 0, iron);
      box('horn', 0.3, 0.12, 0.2, 0.7, 0.88, 0, iron);
    } else if (st.shape === 'still') {
      const copper = this.material('stationCopper', new Color3(0.72, 0.4, 0.2));
      box('stand', 1, 0.3, 1, 0, 0.15, 0, wood);
      box('pot', 0.72, 0.8, 0.72, 0, 0.7, 0, copper);
      box('neck', 0.24, 0.5, 0.24, 0, 1.3, 0, copper);
      box('pipe', 0.9, 0.12, 0.12, 0.45, 1.5, 0, copper);
      box('drop', 0.12, 0.6, 0.12, 0.85, 1.2, 0, copper);
    } else {
      const cloth = this.material('stationCloth', new Color3(0.72, 0.28, 0.24));
      box('postL', 0.14, 1.7, 0.14, -0.8, 0.85, 0, wood);
      box('postR', 0.14, 1.7, 0.14, 0.8, 0.85, 0, wood);
      box('beam', 1.8, 0.14, 0.14, 0, 1.65, 0, wood);
      box('bar', 1.8, 0.12, 0.12, 0, 0.45, 0, wood);
      box('cloth', 1.4, 1.1, 0.04, 0, 1.03, 0, cloth);
    }
    this.shadows.addCasters(meshes);
    return root;
  }
}
