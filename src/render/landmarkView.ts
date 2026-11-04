// Construcciones y piezas del mapa modeladas fuera del motor (scripts/blender/) y colocadas
// con los props de data/vegetation.json. Se cargan aparte para no frenar el arranque.
// Cada una trae sus clips: "Reposo" suena en bucle; "Abrir" y "Cerrar" son las puertas.
import '@babylonjs/loaders/glTF';
import { LoadAssetContainerAsync, TransformNode, type AbstractMesh, type AnimationGroup, type AssetContainer, type Scene } from '@babylonjs/core';
import { goldOutline } from './interactOutline';
import { OcclusionPlugin } from './occlusion';

const MODELS: Record<string, string> = import.meta.glob('/assets/models/*.glb', { query: '?url', import: 'default', eager: true });

/** Medidas de `scripts/blender/casa.py`: ancho del lado de la puerta y fondo. */
const HOUSE_WIDTH = 7;
const HOUSE_DEPTH = 6;
const DOOR_OPENS_AT = 3.5;
const DOOR_CLOSES_AT = 4.5;

export interface LandmarkPlacement {
  model: string;
  x: number;
  y: number;
  rotDeg: number;
  /** Adapta el modelo a la huella del prop. */
  scaleX?: number;
  scaleZ?: number;
  /** Punto cuyo suelo fija la altura (la puerta, en las casas); sin él, el centro. */
  groundAt?: { x: number; y: number };
}

/** Casa del mapa: su puerta mira al lado que indica `rotDeg` (0 = −Z, 90 = −X, 180 = +Z, 270 = +X). */
export function housePlacement(p: { x: number; y: number; w: number; d: number; rotDeg: number; style?: string }): LandmarkPlacement {
  const a = (p.rotDeg * Math.PI) / 180;
  const dx = -Math.sin(a);
  const dz = -Math.cos(a);
  const sideways = Math.abs(dx) > 0.5;
  const half = sideways ? p.w / 2 : p.d / 2;
  return {
    model: p.style === 'golden' ? 'casa_dorada' : 'casa',
    x: p.x,
    y: p.y,
    // El modelo mira hacia +Z; el juego cuenta los giros desde −Z.
    rotDeg: p.rotDeg + 180,
    scaleX: (sideways ? p.d : p.w) / HOUSE_WIDTH,
    scaleZ: (sideways ? p.w : p.d) / HOUSE_DEPTH,
    groundAt: { x: p.x + dx * half, y: p.y + dz * half },
  };
}

interface Door {
  x: number;
  y: number;
  open: AnimationGroup;
  close: AnimationGroup;
  isOpen: boolean;
}

export class LandmarkView {
  private readonly roots: TransformNode[] = [];
  private readonly doors: Door[] = [];
  private readonly containers = new Map<string, Promise<AssetContainer>>();

  constructor(
    private readonly scene: Scene,
    private readonly ground: { sample(x: number, z: number): number },
    private readonly shadows: { addCasters(meshes: readonly AbstractMesh[]): void },
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
      root.position.set(p.x, this.ground.sample(at.x, at.y), p.y);
      root.rotation.y = (p.rotDeg * Math.PI) / 180;
      root.scaling.set(p.scaleX ?? 1, 1, p.scaleZ ?? 1);
      const meshes = root.getChildMeshes(false);
      for (const m of meshes) m.isPickable = false;
      this.shadows.addCasters(meshes.filter((m) => m.getTotalVertices() > 0));
      this.roots.push(root);

      for (const g of inst.animationGroups) g.stop();
      const clip = (name: string): AnimationGroup | undefined => inst.animationGroups.find((g) => g.name.endsWith(name));
      const idle = clip('Reposo');
      // Cada copia empieza en un punto distinto, para que no se muevan a la vez.
      if (idle) idle.start(true, 1, idle.from, idle.to).goToFrame(idle.from + Math.random() * (idle.to - idle.from));
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
  update(playerX: number, playerY: number): void {
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
    for (const r of this.roots) r.setEnabled(on);
  }
}
