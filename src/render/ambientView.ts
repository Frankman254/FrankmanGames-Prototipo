// Capa ambiental (data/ambient.json): detalle de suelo, costa, caminos rurales y rocas de
// los catálogos de Blender. Cada trozo de `chunkMeters` se hornea en una malla de detalle
// y otra de piezas grandes, con un solo material y el color por vértice: una llamada de
// dibujo por malla. Las mallas se crean al acercarse el jugador y se sueltan al alejarse.
import { Mesh, StandardMaterial, Color3, VertexData, type AbstractMesh, type Scene } from '@babylonjs/core';
import { placedGround, placedInChunk, scatterAmbient, type AmbientDef, type AmbientInstance, type AmbientRing, type AmbientSite } from '../world/ambient';
import { ringFraction } from '../world/detail';
import { ambientSite, type Overworld } from '../world/overworld';
import { pageKey, type PageData } from '../world/pages';
import { mergeCatalogInstances, parseCatalogGlb, type CatalogGeometry, type CatalogInstance, type MergedGeometry } from './catalogGeometry';

const MODELS: Record<string, string> = import.meta.glob('/assets/models/{detalle_suelo,costa_modular,caminos_rurales,naturaleza_suelo}.glb', { query: '?url', import: 'default', eager: true });

/** Metros de margen para crear una malla antes de que haga falta y soltarla después. */
const BUILD_MARGIN = 10;
const DROP_MARGIN = 30;
/** Mallas que se hornean por fotograma, como mucho. */
const BUILDS_PER_FRAME = 1;

interface ShadowHost {
  addCasters(meshes: readonly AbstractMesh[]): void;
  removeCasters(meshes: readonly AbstractMesh[]): void;
}

interface Built {
  mesh: Mesh;
  indexEnd: Uint32Array;
  /** Las primeras copias son las puestas a mano: no se aclaran con la densidad. */
  fixed: number;
  shown: number;
}

interface Chunk {
  x0: number;
  z0: number;
  page: string;
  /** Por anillo: la malla, `null` si el trozo no tiene nada de ese anillo, o sin crear. */
  built: Partial<Record<AmbientRing, Built | null>>;
}

/** Clave pseudoaleatoria y estable de una copia: mezcla el orden para aclarar sin franjas. */
function spread(it: AmbientInstance): number {
  const h = Math.sin(it.x * 12.9898 + it.z * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

/** Copias de un trozo y un anillo, en el orden en que se dibujan: primero las puestas a mano. */
export function ambientChunkInstances(
  def: AmbientDef,
  site: AmbientSite,
  library: ReadonlyMap<string, CatalogGeometry>,
  x0: number,
  z0: number,
  ring: AmbientRing,
): { items: CatalogInstance[]; fixed: number } {
  const items: CatalogInstance[] = [];
  let triangles = 0;
  const add = (item: CatalogInstance): void => {
    if (triangles + item.geometry.triangles > def.budget.maxTrianglesPerChunk) return;
    triangles += item.geometry.triangles;
    items.push(item);
  };
  if (ring === 'prop') {
    for (const p of placedInChunk(def, x0, z0, def.chunkMeters)) {
      const geometry = library.get(p.piece);
      if (!geometry) continue;
      const g = placedGround(def, p, site.height);
      add({ geometry, x: p.x, y: g.y, z: p.y, scale: p.scale, rotY: (p.rotDeg * Math.PI) / 180, tint: 1, slopeX: g.slopeX, slopeZ: g.slopeZ });
    }
  }
  const fixed = items.length;
  const layers = def.layers.filter((l) => l.ring === ring);
  if (layers.length > 0) {
    const scattered = scatterAmbient({ ...def, layers }, site, x0, z0, def.chunkMeters).sort((a, b) => spread(a) - spread(b));
    for (const it of scattered) {
      const geometry = library.get(it.piece);
      if (!geometry) continue;
      // Hundido un pelo: en suelo irregular no queda una rendija debajo.
      add({ geometry, x: it.x, y: it.y - 0.015 * it.scale, z: it.z, scale: it.scale, rotY: it.rotY, tint: it.tint, slopeX: it.slopeX, slopeZ: it.slopeZ });
    }
  }
  return { items, fixed };
}

export class AmbientView {
  private readonly def: AmbientDef;
  private readonly site: AmbientSite;
  private readonly material: StandardMaterial;
  private readonly library = new Map<string, CatalogGeometry>();
  private readonly chunks = new Map<string, Chunk>();
  private loaded = false;
  private visible = true;
  private rangeScale = 1;
  private density = 1;
  private recheck = 0;
  private px: number;
  private pz: number;

  constructor(
    private readonly scene: Scene,
    private readonly ow: Overworld,
    private readonly shadows: ShadowHost,
  ) {
    this.def = ow.ambient;
    this.site = ambientSite(ow);
    this.px = ow.def.playerStart.x;
    this.pz = ow.def.playerStart.y;
    this.material = new StandardMaterial('ambientMat', scene);
    this.material.diffuseColor = new Color3(1, 1, 1);
    this.material.specularColor = new Color3(0.03, 0.03, 0.03);
    this.material.maxSimultaneousLights = 6;
    // `buildOverworld` ya cargó la parcela inicial antes de que exista la vista.
    for (const page of ow.stream.activePages) this.addPage(page);
    ow.stream.listen({ name: 'ambiente', ready: (p) => this.addPage(p), released: (p) => this.removePage(p) });
    void this.load().catch((error: unknown) => {
      console.error('[ambiente] no se pudieron cargar los catálogos', error);
    });
  }

  private async load(): Promise<void> {
    const models = new Set(Object.values(this.def.pieces).map((p) => p.model));
    await Promise.all([...models].map(async (model) => {
      const url = MODELS[`/assets/models/${model}.glb`];
      if (!url) {
        console.warn(`[ambiente] falta assets/models/${model}.glb`);
        return;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`[ambiente] no se pudo leer ${url}: ${res.status}`);
      const pieces = parseCatalogGlb(await res.arrayBuffer());
      for (const [id, piece] of Object.entries(this.def.pieces)) {
        if (piece.model !== model) continue;
        const g = pieces.get(id);
        if (g) this.library.set(id, g);
        else console.warn(`[ambiente] falta el nodo ${id} en ${model}.glb`);
      }
    }));
    this.loaded = true;
  }

  private addPage(page: PageData): void {
    const size = this.def.chunkMeters;
    const key = pageKey(page.px, page.pz);
    for (let z0 = page.z0; z0 < page.z0 + page.size; z0 += size) {
      for (let x0 = page.x0; x0 < page.x0 + page.size; x0 += size) this.chunks.set(`${x0}:${z0}`, { x0, z0, page: key, built: {} });
    }
  }

  private removePage(page: PageData): void {
    const key = pageKey(page.px, page.pz);
    for (const [id, c] of this.chunks) {
      if (c.page !== key) continue;
      this.drop(c, 'detail');
      this.drop(c, 'prop');
      this.chunks.delete(id);
    }
  }

  private drop(c: Chunk, ring: AmbientRing): void {
    const b = c.built[ring];
    if (b) {
      if (ring === 'prop') this.shadows.removeCasters([b.mesh]);
      b.mesh.dispose(false, false);
    }
    delete c.built[ring];
  }

  private build(c: Chunk, ring: AmbientRing): void {
    const { items, fixed } = ambientChunkInstances(this.def, this.site, this.library, c.x0, c.z0, ring);
    if (items.length === 0) {
      c.built[ring] = null;
      return;
    }
    const merged: MergedGeometry = mergeCatalogInstances(items);
    const mesh = new Mesh(`ambiente:${ring}#${c.x0}_${c.z0}`, this.scene);
    const data = new VertexData();
    data.positions = merged.positions;
    data.normals = merged.normals;
    data.colors = merged.colors;
    data.indices = merged.indices;
    data.applyToMesh(mesh);
    mesh.material = this.material;
    mesh.isPickable = false;
    mesh.receiveShadows = true;
    mesh.freezeWorldMatrix();
    if (ring === 'prop') this.shadows.addCasters([mesh]);
    c.built[ring] = { mesh, indexEnd: merged.indexEnd, fixed, shown: -1 };
  }

  private apply(c: Chunk, ring: AmbientRing, distance: number): void {
    const b = c.built[ring];
    if (!b) return;
    const total = b.indexEnd.length;
    const f = ringFraction(this.def.rings[ring], distance, this.rangeScale);
    // El anillo aclara todo; la densidad sólo el detalle repartido, no lo puesto a mano.
    const count = this.visible ? Math.round(Math.min(total, b.fixed + (total - b.fixed) * this.density) * f) : 0;
    if (count === b.shown) return;
    b.shown = count;
    b.mesh.setEnabled(count > 0);
    if (count > 0) b.mesh.subMeshes[0]!.indexCount = b.indexEnd[count - 1]!;
  }

  private refresh(): void {
    let builds = this.loaded && this.visible ? BUILDS_PER_FRAME : 0;
    const size = this.def.chunkMeters;
    for (const c of this.chunks.values()) {
      const d = Math.hypot(Math.max(c.x0 - this.px, 0, this.px - (c.x0 + size)), Math.max(c.z0 - this.pz, 0, this.pz - (c.z0 + size)));
      for (const ring of ['detail', 'prop'] as const) {
        const off = this.def.rings[ring].off * this.rangeScale;
        if (c.built[ring] === undefined) {
          if (builds > 0 && d < off + BUILD_MARGIN) {
            this.build(c, ring);
            if (c.built[ring]) builds--;
          }
        } else if (d > off + DROP_MARGIN) {
          this.drop(c, ring);
          continue;
        }
        this.apply(c, ring, d);
      }
    }
  }

  update(frameSeconds: number, playerX: number, playerZ: number): void {
    this.px = playerX;
    this.pz = playerZ;
    this.recheck -= frameSeconds;
    // Mientras quede algo por hornear se mira cada fotograma; después, cuatro veces por segundo.
    if (this.recheck > 0 && !this.pendingNear()) return;
    this.recheck = 0.25;
    this.refresh();
  }

  private pendingNear(): boolean {
    if (!this.loaded || !this.visible) return false;
    const size = this.def.chunkMeters;
    for (const c of this.chunks.values()) {
      if (c.built.detail !== undefined && c.built.prop !== undefined) continue;
      const d = Math.hypot(Math.max(c.x0 - this.px, 0, this.px - (c.x0 + size)), Math.max(c.z0 - this.pz, 0, this.pz - (c.z0 + size)));
      for (const ring of ['detail', 'prop'] as const) {
        if (c.built[ring] === undefined && d < this.def.rings[ring].off * this.rangeScale + BUILD_MARGIN) return true;
      }
    }
    return false;
  }

  /** Escala las distancias de detalle (opción de visión). */
  setRange(scale: number): void {
    this.rangeScale = scale;
    this.recheck = 0;
  }

  /** Fracción (0–1) del detalle repartido que se dibuja; lo puesto a mano no cambia. */
  setDensity(fraction: number): void {
    this.density = Math.min(1, Math.max(0, fraction));
    this.recheck = 0;
  }

  /** En interiores el exterior no se dibuja. */
  setVisible(on: boolean): void {
    this.visible = on;
    this.recheck = 0;
    if (!on) for (const c of this.chunks.values()) for (const ring of ['detail', 'prop'] as const) this.apply(c, ring, 0);
  }

  /** Para estadísticas y pruebas en vivo. */
  get stats(): { meshes: number; drawn: number; triangles: number } {
    let meshes = 0;
    let drawn = 0;
    let triangles = 0;
    for (const c of this.chunks.values()) {
      for (const ring of ['detail', 'prop'] as const) {
        const b = c.built[ring];
        if (!b) continue;
        meshes++;
        if (b.shown > 0) {
          drawn += b.shown;
          triangles += b.indexEnd[b.shown - 1]! / 3;
        }
      }
    }
    return { meshes, drawn, triangles };
  }
}
