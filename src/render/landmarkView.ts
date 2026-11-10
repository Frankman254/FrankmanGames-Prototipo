// Construcciones y piezas del mapa modeladas fuera del motor (scripts/blender/) y colocadas
// con los props de data/vegetation.json. Se cargan aparte para no frenar el arranque.
// Cada una trae sus clips: "Reposo" suena en bucle; "Abrir" y "Cerrar" son las puertas.
import '@babylonjs/loaders/glTF';
import { LoadAssetContainerAsync, TransformNode, type AbstractMesh, type AnimationGroup, type AssetContainer, type Scene } from '@babylonjs/core';
import { goldOutline } from './interactOutline';
import { OcclusionPlugin } from './occlusion';
import { inDetailRange, modelRange, type DetailDef, type DetailRange } from '../world/detail';
import { houseDoor } from '../world/structures';

const MODELS: Record<string, string> = import.meta.glob('/assets/models/*.glb', { query: '?url', import: 'default', eager: true });

/** Medidas de `scripts/blender/casa.py`: ancho del lado de la puerta y fondo. */
const HOUSE_WIDTH = 7;
const HOUSE_DEPTH = 6;
const DOOR_OPENS_AT = 3.5;
const DOOR_CLOSES_AT = 4.5;

export interface LandmarkPlacement {
  model: string;
  /** Conserva sólo este nodo del GLB; útil para catálogos estáticos. */
  node?: string;
  x: number;
  y: number;
  rotDeg: number;
  /** Adapta el modelo a la huella del prop. */
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  /** Punto cuyo suelo fija la altura (la puerta, en las casas); sin él, el centro. */
  groundAt?: { x: number; y: number };
  /** Flota en el mar: metros de casco bajo la superficie. Sin suelo que la sostenga. */
  afloat?: number;
}

const NATURE_SIZE: Record<string, readonly [number, number, number]> = {
  roca_redonda_grande: [2, 1.44, 1.43],
  roca_musgosa: [1.34, 1.04, 0.99],
  grupo_rocas_bajo: [1.56, 0.77, 0.86],
  tronco_recto: [1.94, 0.62, 0.7],
  tronco_curvo: [2.06, 0.69, 0.57],
  tronco_musgoso: [1.62, 0.53, 0.5],
};

/** Adapta una pieza del catálogo de suelo a la huella de un prop existente. */
export function naturePlacement(p: { kind: 'log' | 'boulder'; node?: string; x: number; y: number; w: number; d: number; rotDeg: number }): LandmarkPlacement {
  const node = p.node ?? (p.kind === 'log' ? 'tronco_recto' : 'roca_redonda_grande');
  const size = NATURE_SIZE[node];
  if (!size) throw new Error(`[naturaleza] nodo sin medidas: ${node}`);
  // La huella vive en ejes del mundo. Para giros de 90/270°, ancho y fondo
  // deben convertirse de vuelta a los ejes locales antes de escalar el nodo.
  const quarterTurn = Math.abs(Math.round(p.rotDeg / 90)) % 2 === 1;
  const sx = (quarterTurn ? p.d : p.w) / size[0];
  const sz = (quarterTurn ? p.w : p.d) / size[2];
  return { model: 'naturaleza_suelo', node, x: p.x, y: p.y, rotDeg: p.rotDeg, scaleX: sx, scaleY: Math.sqrt(sx * sz), scaleZ: sz };
}

/** Casa del mapa: su puerta mira al lado que indica `rotDeg` (0 = −Z, 90 = −X, 180 = +Z, 270 = +X). */
export function housePlacement(p: { x: number; y: number; w: number; d: number; rotDeg: number; style?: string }): LandmarkPlacement {
  const sideways = Math.abs(Math.sin((p.rotDeg * Math.PI) / 180)) > 0.5;
  return {
    model: p.style === 'golden' ? 'casa_dorada' : 'casa',
    x: p.x,
    y: p.y,
    // El modelo mira hacia +Z; el juego cuenta los giros desde −Z.
    rotDeg: p.rotDeg + 180,
    scaleX: (sideways ? p.d : p.w) / HOUSE_WIDTH,
    scaleZ: (sideways ? p.w : p.d) / HOUSE_DEPTH,
    groundAt: houseDoor(p),
  };
}

/** Una pieza colocada: se apaga y pausa su clip cuando queda lejos. */
interface Placed {
  root: TransformNode;
  x: number;
  y: number;
  range: DetailRange;
  idle: AnimationGroup | undefined;
  near: boolean;
}

interface Door {
  x: number;
  y: number;
  open: AnimationGroup;
  close: AnimationGroup;
  isOpen: boolean;
}

export class LandmarkView {
  private readonly placed: Placed[] = [];
  /** Lo que flota: sube y baja con el mar. */
  private readonly floating: Array<{ root: TransformNode; draft: number }> = [];
  private visible = true;
  private readonly doors: Door[] = [];
  private readonly containers = new Map<string, Promise<AssetContainer>>();

  /**
   * `ground` es el terreno calculado (ArenaView.groundExact), no el campo de alturas
   * cargado: las piezas se colocan una vez, al arrancar, y las páginas lejanas llegan después.
   */
  constructor(
    private readonly scene: Scene,
    private readonly ground: { sample(x: number, z: number): number },
    private readonly shadows: { addCasters(meshes: readonly AbstractMesh[]): void },
    private readonly detail: DetailDef,
    /** Nivel del mar en reposo, hasta que `update` traiga el del oleaje. */
    private seaLevel = 0,
  ) {}

  /** Cada archivo se analiza una vez; los materiales se comparten entre las copias. */
  private container(model: string, url: string): Promise<AssetContainer> {
    let p = this.containers.get(model);
    if (!p) {
      p = LoadAssetContainerAsync(url, this.scene, { pluginExtension: '.glb' }).then((c) => {
        // Lo que tape al personaje se recorta, igual que árboles y rocas.
        for (const m of c.materials) new OcclusionPlugin(m);
        return c;
      });
      this.containers.set(model, p);
    }
    return p;
  }

  async add(list: readonly LandmarkPlacement[]): Promise<void> {
    await Promise.all(list.map(async (p) => {
      const url = MODELS[`/assets/models/${p.model}.glb`];
      if (!url) {
        console.warn(`[modelos] falta assets/models/${p.model}.glb`);
        return;
      }
      const container = await this.container(p.model, url);
      const inst = container.instantiateModelsToScene((n) => `${p.model}:${n}`, false, { doNotInstantiate: true });
      const root = new TransformNode(`landmark:${p.model}`, this.scene);
      for (const n of inst.rootNodes) n.parent = root;
      const at = p.groundAt ?? p;
      root.position.set(p.x, p.afloat === undefined ? this.ground.sample(at.x, at.y) : this.seaLevel - p.afloat, p.y);
      if (p.afloat !== undefined) this.floating.push({ root, draft: p.afloat });
      root.rotation.y = (p.rotDeg * Math.PI) / 180;
      root.scaling.set(p.scaleX ?? 1, p.scaleY ?? 1, p.scaleZ ?? 1);
      if (p.node) {
        const all = root.getChildMeshes(false);
        const wanted = all.filter((m) => m.name === p.node || m.name.endsWith(`:${p.node}`));
        if (wanted.length === 0) {
          console.warn(`[modelos] falta el nodo ${p.node} en ${p.model}.glb`);
          root.dispose(false, true);
          return;
        }
        for (const m of all) if (!wanted.includes(m)) m.dispose(false, false);
      }
      const meshes = root.getChildMeshes(false);
      for (const m of meshes) m.isPickable = false;
      this.shadows.addCasters(meshes.filter((m) => m.getTotalVertices() > 0));

      for (const g of inst.animationGroups) g.stop();
      const clip = (name: string): AnimationGroup | undefined => inst.animationGroups.find((g) => g.name.endsWith(name));
      const idle = clip('Reposo');
      // Cada copia empieza en un punto distinto, para que no se muevan a la vez.
      if (idle) idle.start(true, 1, idle.from, idle.to).goToFrame(idle.from + Math.random() * (idle.to - idle.from));
      this.placed.push({ root, x: p.x, y: p.y, range: modelRange(this.detail, p.model), idle, near: true });
      // La carga del GLB puede terminar después de entrar a un interior.
      root.setEnabled(this.visible);
      if (!this.visible) idle?.pause();
      const open = clip('Abrir');
      const close = clip('Cerrar');
      if (open && close && p.groundAt) {
        // Abierta del todo en el último fotograma de Cerrar: se deja cerrada al empezar.
        open.start(false, 1, open.from, open.from);
        for (const m of meshes) if (m.name.includes('Puerta')) goldOutline(m, 0.02);
        this.doors.push({ x: p.groundAt.x, y: p.groundAt.y, open, close, isOpen: false });
      }
    }));
  }

  /** Las puertas se abren al acercarse el jugador y se cierran al alejarse. */
  update(playerX: number, playerY: number, seaY = this.seaLevel): void {
    this.seaLevel = seaY;
    for (const f of this.floating) f.root.position.y = seaY - f.draft;
    for (const p of this.placed) {
      const near = inDetailRange(p.near, Math.hypot(playerX - p.x, playerY - p.y), p.range);
      if (near === p.near) continue;
      p.near = near;
      p.root.setEnabled(near && this.visible);
      if (near) p.idle?.restart();
      else p.idle?.pause();
    }
    for (const d of this.doors) {
      const dist = Math.hypot(playerX - d.x, playerY - d.y);
      if (!d.isOpen && dist < DOOR_OPENS_AT) {
        d.isOpen = true;
        d.close.stop();
        d.open.start(false, 1, d.open.from, d.open.to);
      } else if (d.isOpen && dist > DOOR_CLOSES_AT) {
        d.isOpen = false;
        d.open.stop();
        d.close.start(false, 1, d.close.from, d.close.to);
      }
    }
  }

  setVisible(on: boolean): void {
    this.visible = on;
    for (const p of this.placed) {
      p.root.setEnabled(on && p.near);
      if (on && p.near) p.idle?.restart();
      else p.idle?.pause();
    }
  }
}
