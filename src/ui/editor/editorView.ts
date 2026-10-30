// Lo que el modo edición dibuja sobre el mundo: cámara libre, cajas y
// cilindros translúcidos de los objetos editables (sólo los cercanos a la
// cámara), contornos de estanques y áreas de zona, cruces donde se quitó un
// árbol generado, el pincel de navegación y la cuadrícula de la rejilla tal
// como quedaría al guardar. Elegir con el ratón es geométrico (rayo contra
// cajas y punto del suelo), sin picking de mallas.
import {
  Color3,
  Color4,
  Matrix,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Vector3,
  type AbstractMesh,
  type InstancedMesh,
  type LinesMesh,
  type Scene,
  type TargetCamera,
} from '@babylonjs/core';
import { GridView } from '../../render/gridView';
import type { EditorObject } from '../../editor/doc';
import type { NavGrid } from '../../sim/navGrid';

const DEG = Math.PI / 180;
/** Metros alrededor del foco de la cámara en los que se dibujan los objetos pequeños. */
const NEAR = 70;
/** Cada cuánto (m) de movimiento del foco se rehacen los objetos cercanos. */
const REBUILD_STEP = 12;

type Heights = { sample(x: number, z: number): number };

/** Cámara libre del editor: foco en el suelo, giro, inclinación y distancia. */
export class FreeCamera {
  focus = { x: 128, y: 128 };
  yawDeg = 0;
  pitchDeg = 55;
  distance = 30;

  /** Adelante y derecha sobre el suelo según el giro. */
  axes(): { fx: number; fy: number; rx: number; ry: number } {
    const y = this.yawDeg * DEG;
    return { fx: Math.sin(y), fy: Math.cos(y), rx: Math.cos(y), ry: -Math.sin(y) };
  }

  orbit(dx: number, dy: number): void {
    this.yawDeg = (this.yawDeg + dx * 0.3) % 360;
    this.pitchDeg = Math.min(89, Math.max(8, this.pitchDeg + dy * 0.3));
  }

  /** Arrastre en píxeles: el suelo sigue al cursor más o menos. */
  pan(dx: number, dy: number): void {
    const k = this.distance * 0.0016;
    const a = this.axes();
    this.focus.x -= (a.rx * dx - a.fx * dy) * k;
    this.focus.y -= (a.ry * dx - a.fy * dy) * k;
  }

  move(forward: number, right: number, seconds: number): void {
    const a = this.axes();
    const v = Math.max(8, this.distance * 1.2) * seconds;
    this.focus.x += (a.fx * forward + a.rx * right) * v;
    this.focus.y += (a.fy * forward + a.ry * right) * v;
  }

  zoom(steps: number): void {
    this.distance = Math.min(220, Math.max(3, this.distance * Math.pow(1.12, steps)));
  }

  apply(camera: TargetCamera, ground: Heights, bounds: { width: number; depth: number }): void {
    this.focus.x = Math.min(bounds.width, Math.max(0, this.focus.x));
    this.focus.y = Math.min(bounds.depth, Math.max(0, this.focus.y));
    const gy = ground.sample(this.focus.x, this.focus.y);
    const p = this.pitchDeg * DEG;
    const y = this.yawDeg * DEG;
    const pos = new Vector3(
      this.focus.x - Math.sin(y) * Math.cos(p) * this.distance,
      gy + Math.sin(p) * this.distance,
      this.focus.y - Math.cos(y) * Math.cos(p) * this.distance,
    );
    pos.y = Math.max(pos.y, ground.sample(pos.x, pos.z) + 1);
    camera.position.copyFrom(pos);
    camera.setTarget(new Vector3(this.focus.x, gy, this.focus.y));
  }
}

function mat(scene: Scene, name: string, rgb: [number, number, number], alpha: number): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = new Color3(...rgb);
  m.emissiveColor = new Color3(rgb[0] * 0.5, rgb[1] * 0.5, rgb[2] * 0.5);
  m.specularColor = Color3.Black();
  m.alpha = alpha;
  m.backFaceCulling = false;
  return m;
}

/** Colores por categoría (RGB 0–1). */
const COLORS: Record<string, [number, number, number]> = {
  props: [0.95, 0.65, 0.25],
  trees: [0.35, 0.85, 0.35],
  npcs: [0.35, 0.65, 1],
  start: [1, 1, 1],
  water: [0.3, 0.75, 1],
  zones: [1, 0.85, 0.3],
  safe: [0.45, 1, 0.6],
};

export class EditorView {
  /** Categorías que se dibujan y se pueden elegir. */
  readonly layers = new Set<string>(['props', 'trees', 'npcs', 'water', 'zones', 'start']);
  showGrid = false;
  private readonly root: Mesh;
  private readonly sources = new Map<string, { box: Mesh; cyl: Mesh }>();
  private instances: InstancedMesh[] = [];
  private outlines: LinesMesh[] = [];
  private selection: LinesMesh | null = null;
  private readonly brushRing: Mesh;
  private readonly grid: GridView;
  private objects: EditorObject[] = [];
  private exclusions: Array<{ x: number; y: number }> = [];
  private builtAt = { x: Infinity, y: Infinity };
  private builtVersion = -1;

  constructor(
    private readonly scene: Scene,
    private readonly heights: Heights,
  ) {
    this.root = new Mesh('editorRoot', scene);
    for (const cat of ['props', 'trees', 'npcs', 'start']) {
      const m = mat(scene, `ed_${cat}`, COLORS[cat]!, cat === 'props' ? 0.55 : 0.4);
      const box = MeshBuilder.CreateBox(`ed_box_${cat}`, { size: 1 }, scene);
      const cyl = MeshBuilder.CreateCylinder(`ed_cyl_${cat}`, { diameter: 1, height: 1, tessellation: 12 }, scene);
      for (const s of [box, cyl]) {
        s.material = m;
        s.isPickable = false;
        s.isVisible = false;
        s.parent = this.root;
      }
      this.sources.set(cat, { box, cyl });
    }
    this.brushRing = MeshBuilder.CreateTorus('ed_brush', { diameter: 2, thickness: 0.08, tessellation: 40 }, scene);
    this.brushRing.material = mat(scene, 'ed_brushMat', [1, 0.3, 0.3], 0.9);
    this.brushRing.isPickable = false;
    this.brushRing.isVisible = false;
    this.grid = new GridView(scene, heights, 22);
    this.setEnabled(false);
  }

  setEnabled(on: boolean): void {
    this.root.setEnabled(on);
    for (const m of [...this.instances, ...this.outlines]) m.setEnabled(on);
    this.selection?.setEnabled(on);
    if (!on) {
      this.brushRing.isVisible = false;
      this.grid.visible = false;
      this.grid.sync(null as unknown as NavGrid, 0, 0);
    }
  }

  /** Nuevos datos (versión del documento) o la cámara se alejó: se rehace lo cercano. */
  update(objects: () => EditorObject[], exclusions: () => Array<{ x: number; y: number }>, version: number, focus: { x: number; y: number }, force = false): void {
    const moved = Math.hypot(focus.x - this.builtAt.x, focus.y - this.builtAt.y) > REBUILD_STEP;
    if (!force && !moved && version === this.builtVersion) return;
    this.builtVersion = version;
    this.builtAt = { ...focus };
    this.objects = objects();
    this.exclusions = exclusions();
    this.rebuild(focus);
  }

  /** Lo que se puede elegir ahora (capas visibles; los pequeños, sólo cerca). */
  visibleObjects(focus: { x: number; y: number }): EditorObject[] {
    return this.objects.filter((o) => this.layers.has(o.category) && (o.category === 'zones' || o.category === 'water' || o.category === 'props' || Math.hypot(o.x - focus.x, o.y - focus.y) < NEAR));
  }

  private rebuild(focus: { x: number; y: number }): void {
    for (const m of this.instances) m.dispose();
    for (const m of this.outlines) m.dispose();
    this.instances = [];
    this.outlines = [];
    for (const o of this.visibleObjects(focus)) {
      const src = this.sources.get(o.category);
      if (src && (o.shape.type === 'box' || o.shape.type === 'cyl')) {
        const g = this.heights.sample(o.x, o.y);
        const inst = (o.shape.type === 'box' ? src.box : src.cyl).createInstance(`ed_${o.key}`);
        inst.isPickable = false;
        if (o.shape.type === 'box') inst.scaling.set(o.shape.w, o.shape.h, o.shape.d);
        else inst.scaling.set(o.shape.r * 2, o.shape.h, o.shape.r * 2);
        inst.position.set(o.x, g + o.shape.h / 2 - (o.shape.type === 'box' ? 0.1 : 0), o.y);
        this.instances.push(inst);
      } else if (o.shape.type === 'circle' || o.shape.type === 'rect') {
        const color = o.category === 'water' ? COLORS['water']! : COLORS['zones']!;
        this.outlines.push(this.outline(o, color, 0.35));
      }
    }
    // Árboles generados que se quitaron: cruz roja en el suelo.
    if (this.layers.has('trees')) {
      const lines: Vector3[][] = [];
      for (const e of this.exclusions) {
        if (Math.hypot(e.x - focus.x, e.y - focus.y) > NEAR) continue;
        const y = this.heights.sample(e.x, e.y) + 0.15;
        lines.push([new Vector3(e.x - 0.5, y, e.y - 0.5), new Vector3(e.x + 0.5, y, e.y + 0.5)], [new Vector3(e.x - 0.5, y, e.y + 0.5), new Vector3(e.x + 0.5, y, e.y - 0.5)]);
      }
      if (lines.length) {
        const m = MeshBuilder.CreateLineSystem('ed_excl', { lines }, this.scene);
        m.color = new Color3(1, 0.25, 0.2);
        m.isPickable = false;
        this.outlines.push(m);
      }
    }
  }

  /** Contorno de un círculo o rectángulo siguiendo el terreno. */
  private outline(o: EditorObject, rgb: [number, number, number], lift: number): LinesMesh {
    const pts: Vector3[] = [];
    const at = (x: number, z: number): Vector3 => new Vector3(x, this.heights.sample(x, z) + lift, z);
    if (o.shape.type === 'circle') {
      const n = Math.max(24, Math.min(160, Math.round(o.shape.r * 3)));
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        pts.push(at(o.x + Math.cos(a) * o.shape.r, o.y + Math.sin(a) * o.shape.r));
      }
    } else if (o.shape.type === 'rect') {
      const hw = o.shape.w / 2;
      const hd = o.shape.d / 2;
      const corners = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd], [-hw, -hd]] as const;
      for (let c = 0; c < 4; c++) {
        const [ax, az] = corners[c]!;
        const [bx, bz] = corners[c + 1]!;
        const steps = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 2));
        for (let s = 0; s < steps; s++) pts.push(at(o.x + ax + ((bx - ax) * s) / steps, o.y + az + ((bz - az) * s) / steps));
      }
      pts.push(at(o.x - hw, o.y - hd));
    }
    const m = MeshBuilder.CreateLines(`ed_line_${o.key}`, { points: pts, colors: pts.map(() => new Color4(rgb[0], rgb[1], rgb[2], 1)) }, this.scene);
    m.isPickable = false;
    return m;
  }

  /** Marco del objeto elegido (amarillo). Durante un arrastre se mueve sin rehacer todo. */
  select(o: EditorObject | null): void {
    this.selection?.dispose();
    this.selection = null;
    if (!o) return;
    if (o.shape.type === 'circle' || o.shape.type === 'rect') {
      this.selection = this.outline(o, [1, 1, 0.2], 0.6);
      return;
    }
    const g = this.heights.sample(o.x, o.y);
    const hw = o.shape.type === 'box' ? o.shape.w / 2 + 0.15 : o.shape.r + 0.15;
    const hd = o.shape.type === 'box' ? o.shape.d / 2 + 0.15 : o.shape.r + 0.15;
    const h = o.shape.h + 0.2;
    const c = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]] as const;
    const lines: Vector3[][] = [];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = c[i]!;
      const [bx, bz] = c[(i + 1) % 4]!;
      for (const y of [g, g + h]) lines.push([new Vector3(o.x + ax, y, o.y + az), new Vector3(o.x + bx, y, o.y + bz)]);
      lines.push([new Vector3(o.x + ax, g, o.y + az), new Vector3(o.x + ax, g + h, o.y + az)]);
    }
    // Flecha hacia la puerta de las casas (rotDeg: 0 = −Z, 90 = −X, 180 = +Z, 270 = +X).
    if (o.kind === 'house') {
      const a = o.rotDeg * DEG;
      const dx = -Math.sin(a);
      const dz = -Math.cos(a);
      const r = (Math.abs(dx) > 0.5 ? hw : hd) + 1.5;
      lines.push([new Vector3(o.x, g + 0.3, o.y), new Vector3(o.x + dx * r, g + 0.3, o.y + dz * r)]);
    }
    this.selection = MeshBuilder.CreateLineSystem('ed_sel', { lines }, this.scene);
    this.selection.color = new Color3(1, 1, 0.2);
    this.selection.isPickable = false;
  }

  /** Mueve una instancia ya dibujada (arrastre) sin rehacer la escena. */
  moveInstance(key: string, o: EditorObject): void {
    const inst = this.instances.find((m) => m.name === `ed_${key}`);
    if (inst && (o.shape.type === 'box' || o.shape.type === 'cyl')) {
      const g = this.heights.sample(o.x, o.y);
      inst.position.set(o.x, g + o.shape.h / 2 - (o.shape.type === 'box' ? 0.1 : 0), o.y);
      if (o.shape.type === 'box') inst.scaling.set(o.shape.w, o.shape.h, o.shape.d);
      inst.name = `ed_${o.key}`;
    }
  }

  brush(at: { x: number; y: number } | null, radius: number): void {
    this.brushRing.isVisible = at !== null;
    if (!at) return;
    const r = Math.max(0.25, radius);
    this.brushRing.scaling.set(r, 1, r);
    this.brushRing.position.set(at.x, this.heights.sample(at.x, at.y) + 0.12, at.y);
  }

  /** `force`: se ve aunque la capa esté apagada (al pintar la navegación). */
  syncGrid(grid: NavGrid | null, at: { x: number; y: number }, force = false): void {
    this.grid.visible = (this.showGrid || force) && grid !== null;
    // Sin rejilla `sync` sólo oculta la malla (no la lee porque visible = false).
    this.grid.sync(grid ?? (null as unknown as NavGrid), at.x, at.y);
  }

  /**
   * Objeto bajo el cursor: primero el sólido más cercano que corta el rayo
   * (cajas y cilindros como cajas), si no, estanque o área de zona que
   * contiene el punto del suelo (la más pequeña).
   */
  pick(camera: TargetCamera, sx: number, sy: number, ground: { x: number; y: number } | null, focus: { x: number; y: number }): EditorObject | null {
    const ray = this.scene.createPickingRay(sx, sy, Matrix.Identity(), camera);
    const o = ray.origin;
    const d = ray.direction;
    let best: EditorObject | null = null;
    let bestT = Infinity;
    const candidates = this.visibleObjects(focus);
    for (const ob of candidates) {
      if (ob.shape.type !== 'box' && ob.shape.type !== 'cyl') continue;
      const g = this.heights.sample(ob.x, ob.y);
      const hw = ob.shape.type === 'box' ? ob.shape.w / 2 : Math.max(0.4, ob.shape.r);
      const hd = ob.shape.type === 'box' ? ob.shape.d / 2 : Math.max(0.4, ob.shape.r);
      const t = rayBox(o, d, [ob.x - hw, g - 0.3, ob.y - hd], [ob.x + hw, g + Math.max(0.6, ob.shape.h), ob.y + hd]);
      if (t !== null && t < bestT) {
        bestT = t;
        best = ob;
      }
    }
    if (best || !ground) return best;
    let bestArea = Infinity;
    for (const ob of candidates) {
      let area = Infinity;
      if (ob.shape.type === 'circle' && Math.hypot(ground.x - ob.x, ground.y - ob.y) <= ob.shape.r) area = Math.PI * ob.shape.r ** 2;
      if (ob.shape.type === 'rect' && Math.abs(ground.x - ob.x) <= ob.shape.w / 2 && Math.abs(ground.y - ob.y) <= ob.shape.d / 2) area = ob.shape.w * ob.shape.d;
      // El agua gana a las zonas aunque sea más grande que un área pequeña.
      if (ob.category === 'water') area *= 1e-6;
      if (area < bestArea) {
        bestArea = area;
        best = ob;
      }
    }
    return best;
  }

  /** Mallas propias (para excluirlas de otras cosas si hiciera falta). */
  meshes(): AbstractMesh[] {
    return [...this.instances, ...this.outlines];
  }
}

/** Rayo contra caja alineada (método de las losas). Devuelve la distancia o null. */
function rayBox(o: Vector3, d: Vector3, min: [number, number, number], max: [number, number, number]): number | null {
  let t0 = 0;
  let t1 = Infinity;
  const os = [o.x, o.y, o.z];
  const ds = [d.x, d.y, d.z];
  for (let i = 0; i < 3; i++) {
    const oi = os[i]!;
    const di = ds[i]!;
    if (Math.abs(di) < 1e-9) {
      if (oi < min[i]! || oi > max[i]!) return null;
      continue;
    }
    let a = (min[i]! - oi) / di;
    let b = (max[i]! - oi) / di;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    if (t0 > t1) return null;
  }
  return t0;
}
