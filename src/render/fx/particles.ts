// Partículas generadas por código: una textura de punto suave compartida,
// ráfagas desde un pool de sistemas reutilizables y emisores continuos (estelas,
// llamas, auras) que siguen a un nodo.
import {
  Color3,
  Color4,
  DynamicTexture,
  ParticleSystem,
  StandardMaterial,
  Vector3,
  type AbstractMesh,
  type Scene,
  type Texture,
  type TransformNode,
} from '@babylonjs/core';
import type { Rgb } from '../../world/dayNight';

let softTexture: Texture | null = null;

/** Punto blanco de borde suave (radial), compartido por todas las partículas. */
export function softDot(scene: Scene): Texture {
  if (softTexture && softTexture.getScene() === scene) return softTexture;
  const size = 64;
  const tex = new DynamicTexture('fxSoftDot', { width: size, height: size }, scene, true);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.75)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  tex.update(false);
  tex.hasAlpha = true;
  softTexture = tex;
  return tex;
}

/**
 * Material sin iluminación ni escritura de profundidad. Aditivo (brillos, haces,
 * orbes) o con mezcla normal (formas en el suelo, que sobre hierba clara se
 * blanquearían al sumar).
 */
export function glowMaterial(scene: Scene, name: string, rgb: Rgb, alpha = 1, additive = true): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = Color3.Black();
  m.specularColor = Color3.Black();
  m.emissiveColor = new Color3(...rgb);
  m.disableLighting = true;
  m.alpha = alpha;
  m.alphaMode = additive ? 1 : 2; // ALPHA_ADD : ALPHA_COMBINE
  m.disableDepthWrite = true;
  m.backFaceCulling = false;
  return m;
}

export interface BurstOptions {
  count: number;
  color: Rgb;
  core: Rgb;
  /** Radio de la esfera de salida. */
  radius?: number;
  speed?: [number, number];
  size?: [number, number];
  life?: [number, number];
  /** Gravedad vertical (negativa = caen; positiva = suben como chispas). */
  gravity?: number;
  /** Dirección dominante (cono hacia arriba si no se da). */
  upward?: boolean;
}

function configure(ps: ParticleSystem, o: BurstOptions): void {
  ps.color1 = new Color4(o.core[0], o.core[1], o.core[2], 1);
  ps.color2 = new Color4(o.color[0], o.color[1], o.color[2], 1);
  ps.colorDead = new Color4(o.color[0] * 0.3, o.color[1] * 0.3, o.color[2] * 0.3, 0);
  ps.minSize = o.size?.[0] ?? 0.08;
  ps.maxSize = o.size?.[1] ?? 0.22;
  ps.minLifeTime = o.life?.[0] ?? 0.2;
  ps.maxLifeTime = o.life?.[1] ?? 0.5;
  ps.minEmitPower = o.speed?.[0] ?? 1;
  ps.maxEmitPower = o.speed?.[1] ?? 3.5;
  ps.gravity.set(0, o.gravity ?? -2, 0);
  const r = o.radius ?? 0.15;
  if (o.upward) ps.createCylinderEmitter(r, 0.05, 0, 0.2);
  else ps.createSphereEmitter(r, 1);
}

/** Pool de sistemas para ráfagas puntuales (destellos e impactos). */
export class BurstPool {
  private readonly pool: ParticleSystem[] = [];
  private next = 0;
  private readonly emitters: Vector3[] = [];

  constructor(scene: Scene, size = 16, capacity = 120) {
    for (let i = 0; i < size; i++) {
      const ps = new ParticleSystem(`fxBurst${i}`, capacity, scene);
      ps.particleTexture = softDot(scene);
      ps.blendMode = ParticleSystem.BLENDMODE_ADD;
      const at = new Vector3();
      ps.emitter = at;
      ps.emitRate = 0;
      ps.updateSpeed = 1 / 60;
      ps.start();
      this.pool.push(ps);
      this.emitters.push(at);
    }
  }

  burst(at: Vector3, o: BurstOptions): void {
    if (o.count <= 0) return;
    const i = this.next;
    this.next = (this.next + 1) % this.pool.length;
    const ps = this.pool[i]!;
    configure(ps, o);
    this.emitters[i]!.copyFrom(at);
    ps.manualEmitCount = o.count;
  }

  dispose(): void {
    for (const ps of this.pool) ps.dispose();
  }
}

/** Emisor continuo pegado a un nodo o malla (estela de proyectil, llamas, chispas). */
export function trail(scene: Scene, name: string, emitter: AbstractMesh | TransformNode | Vector3, o: BurstOptions & { rate: number }): ParticleSystem {
  const ps = new ParticleSystem(name, Math.max(16, Math.ceil(o.rate * (o.life?.[1] ?? 0.5) * 1.5)), scene);
  ps.particleTexture = softDot(scene);
  ps.blendMode = ParticleSystem.BLENDMODE_ADD;
  ps.emitter = emitter as AbstractMesh;
  configure(ps, o);
  ps.emitRate = o.rate;
  ps.updateSpeed = 1 / 60;
  ps.start();
  return ps;
}

/** Para un emisor y lo libera cuando se apagan sus últimas partículas. */
export function retire(ps: ParticleSystem): void {
  ps.disposeOnStop = true;
  ps.stop();
}
