// Montura del jugador: `assets/models/montura.glb` (scripts/blender/objetos.py) o el modelo propio del
// objeto (`mount.model`). Se construye al equiparla y se quita al soltarla. Devuelve la altura de la
// silla para subir al jinete: la del anclaje `rider_root` si el modelo lo trae (sigue la animación).
//
// Clips que entiende (cualquiera puede faltar):
//   suelo  idle_ground | Reposo · walk · run | Trotar
//   aire   fly_idle | Planear · fly_forward | Volar
//   paso   takeoff (al despegar) · land (al aterrizar), una sola vez
// Variante de color (`mount.variant`, o la elegida en el inventario): tiñe los materiales
// `montura_<region>` con la paleta `data/art/<modelo>_variantes.json`. La geometría no cambia.
import {
  Color3,
  TransformNode,
  type AbstractMesh,
  type AnimationGroup,
  type InstantiatedEntries,
  type Material,
  type Scene,
} from '@babylonjs/core';
import type { MountLook } from '../rpg/contracts';
import { hasModelFile, modelFile } from './modelFiles';

interface Clips {
  idle: AnimationGroup | null;
  walk: AnimationGroup | null;
  run: AnimationGroup | null;
  flyIdle: AnimationGroup | null;
  flyForward: AnimationGroup | null;
  takeoff: AnimationGroup | null;
  land: AnimationGroup | null;
}

interface Built {
  id: string;
  root: TransformNode;
  inst: InstantiatedEntries | null;
  clips: Clips;
  rider: TransformNode | null;
  current: AnimationGroup | null;
  /** Despegue o aterrizaje en curso: manda hasta que termina. */
  oneShot: AnimationGroup | null;
  flying: boolean | null;
  disposed: boolean;
}

const NO_CLIPS: Clips = { idle: null, walk: null, run: null, flyIdle: null, flyForward: null, takeoff: null, land: null };
/** Por debajo de esta velocidad (m/s) la montura camina en vez de correr. */
const WALK_BELOW = 4.5;
/** Velocidad a la que el clip de correr va a ritmo 1 (la base del jugador más una montura media). */
const RUN_REFERENCE = 8;

interface PaletteFile {
  base: string;
  variantes: Record<string, Record<string, unknown>>;
}
/** Paletas por modelo: `data/art/<modelo>_variantes.json`. */
const PALETTES: Record<string, PaletteFile> = Object.fromEntries(
  Object.entries(import.meta.glob<PaletteFile>('../../data/art/*_variantes.json', { eager: true, import: 'default' }))
    .map(([path, file]) => [/([^/]+)_variantes\.json$/.exec(path)![1]!, file]),
);

/** Color de una región en una variante de un modelo, o null si no existe. */
export function mountVariantColor(model: string, variant: string, region: string): string | null {
  const c = PALETTES[model]?.variantes[variant]?.[region];
  return typeof c === 'string' && c.startsWith('#') ? c : null;
}

export class MountView {
  private built: Built | null = null;
  private phase = 0;
  private speed = 0;
  private last: { x: number; z: number } | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly shadows: { addCasters(meshes: readonly AbstractMesh[]): void },
  ) {}

  /** Coloca la montura (o la quita si no hay). Devuelve lo que sube el jinete. */
  sync(id: string | null, look: MountLook | null, x: number, y: number, z: number, yaw: number, moving: boolean, dt: number, flying = false): number {
    if (this.built && this.built.id !== id) this.dispose();
    if (!id || !look) {
      this.last = null;
      return 0;
    }
    this.built ??= this.build(id, look);
    const b = this.built;
    b.root.position.set(x, y, z);
    b.root.rotation.y = yaw;
    // Velocidad en el suelo, suavizada: elige paso o carrera y el ritmo del clip.
    if (this.last && dt > 0) {
      const v = Math.hypot(x - this.last.x, z - this.last.z) / dt;
      this.speed += (Math.min(v, 40) - this.speed) * Math.min(1, dt * 8);
    }
    this.last = { x, z };
    this.setClip(b, moving, flying);
    if (b.rider) {
      b.rider.computeWorldMatrix(true);
      return b.rider.getAbsolutePosition().y - y;
    }
    this.phase += dt * (moving ? 13 : 0);
    return look.rideHeight + (moving ? Math.abs(Math.sin(this.phase)) * 0.03 : 0);
  }

  private setClip(b: Built, moving: boolean, flying: boolean): void {
    const c = b.clips;
    // Cambio suelo↔aire: una vez el despegue o el aterrizaje, si el modelo los trae.
    if (b.flying !== null && b.flying !== flying) {
      const step = flying ? c.takeoff : c.land;
      if (step) {
        b.current?.stop();
        b.current = step;
        b.oneShot = step;
        step.start(false, 1, step.from, step.to);
      }
    }
    b.flying = flying;
    if (b.oneShot) {
      if (b.oneShot.isPlaying) return;
      b.oneShot = null;
    }
    let g: AnimationGroup | null;
    if (flying) g = moving ? c.flyForward ?? c.run : c.flyIdle ?? c.flyForward ?? c.idle;
    else if (!moving) g = c.idle;
    else g = this.speed < WALK_BELOW ? c.walk ?? c.run : c.run ?? c.walk;
    if (g && !flying && moving) g.speedRatio = Math.min(1.6, Math.max(0.6, this.speed / (g === c.walk ? WALK_BELOW : RUN_REFERENCE)));
    else if (g) g.speedRatio = 1;
    if (!g || g === b.current) return;
    b.current?.stop();
    b.current = g;
    g.start(true, g.speedRatio, g.from, g.to);
  }

  private dispose(): void {
    const b = this.built;
    if (!b) return;
    b.disposed = true;
    if (b.inst) for (const g of b.inst.animationGroups) g.dispose();
    b.root.dispose(false, true);
    b.inst?.skeletons.forEach((s) => s.dispose());
    this.built = null;
    this.last = null;
  }

  private build(id: string, look: MountLook): Built {
    const root = new TransformNode('mountRoot', this.scene);
    const b: Built = { id, root, inst: null, clips: NO_CLIPS, rider: null, current: null, oneShot: null, flying: null, disposed: false };
    const file = look.model && hasModelFile(look.model) ? look.model : 'montura';
    void modelFile(this.scene, file)
      .then((model) => {
        if (b.disposed) return;
        const inner = new TransformNode('mountInner', this.scene);
        inner.parent = root;
        // El modelo mira a +Z; el juego orienta a sus personajes por +X.
        inner.rotation.y = Math.PI / 2;
        inner.scaling.setAll(look.scale);
        const inst = model.instantiateModelsToScene((n) => `mount:${n}`, true, { doNotInstantiate: true });
        for (const g of inst.animationGroups) g.stop();
        for (const n of inst.rootNodes) n.parent = inner;
        b.inst = inst;
        const meshes = inner.getChildMeshes(false);
        for (const m of meshes) {
          m.isPickable = false;
          // Los colores del objeto solo tiñen la montura genérica; un modelo propio trae los suyos.
          if (file === 'montura') this.tint(m.material, look);
          else if (look.variant) this.paint(m.material, file, look.variant);
        }
        this.shadows.addCasters(meshes);
        const clip = (...names: string[]): AnimationGroup | null =>
          inst.animationGroups.find((g) => names.some((n) => g.name === `mount:${n}` || g.name.endsWith(n))) ?? null;
        b.clips = {
          idle: clip('idle_ground', 'Reposo'),
          walk: clip('walk'),
          run: clip('run', 'Trotar'),
          flyIdle: clip('fly_idle', 'Planear'),
          flyForward: clip('fly_forward', 'Volar'),
          takeoff: clip('takeoff'),
          land: clip('land'),
        };
        b.rider = inner.getChildTransformNodes(false).find((n) => n.name.endsWith('rider_root')) ?? null;
      })
      .catch((err: unknown) => console.error(`[modelos] no se pudo cargar assets/models/${file}.glb`, err));
    return b;
  }

  private tint(material: Material | null, look: MountLook): void {
    const m = material as (Material & { albedoColor?: Color3 }) | null;
    if (!m?.albedoColor) return;
    if (m.name.endsWith('coat')) m.albedoColor = Color3.FromHexString(look.color).toLinearSpace();
    else if (m.name.endsWith('dark')) m.albedoColor = Color3.FromHexString(look.accent).toLinearSpace();
  }

  /** Variante: cada material `montura_<region>` toma su color; si lleva textura, el color la multiplica en proporción a la base. */
  private paint(material: Material | null, model: string, variant: string): void {
    const m = material as (Material & { albedoColor?: Color3; albedoTexture?: unknown }) | null;
    if (!m?.albedoColor) return;
    const region = /montura_([a-z_]+?)(?:\.\d+)?$/.exec(m.name.replace(/^mount:/, ''))?.[1];
    if (!region) return;
    const hex = mountVariantColor(model, variant, region);
    if (!hex) return;
    const want = Color3.FromHexString(hex).toLinearSpace();
    if (m.albedoTexture) {
      const base = Color3.FromHexString(mountVariantColor(model, PALETTES[model]!.base, region) ?? hex).toLinearSpace();
      m.albedoColor = new Color3(want.r / Math.max(base.r, 0.02), want.g / Math.max(base.g, 0.02), want.b / Math.max(base.b, 0.02));
    } else m.albedoColor = want;
    const rough = (PALETTES[model]!.variantes[variant] as { rugosidad?: Record<string, number> }).rugosidad?.[region];
    const pbr = m as Material & { roughness?: number };
    if (rough !== undefined && 'roughness' in pbr) pbr.roughness = rough;
  }
}
