// Perfiles visuales por spell ID: cada hechizo con perfil tiene sus propias
// fases de anticipación, impacto y disipación. Los sin perfil usan el
// flujo genérico de SpellFx. No modifica daño, alcance ni balance.
import {
  Color3,
  Color4,
  MeshBuilder,
  StandardMaterial,
  TransformNode,
  Vector3,
  type LinesMesh,
  type Mesh,
  type ParticleSystem,
  type Scene,
} from '@babylonjs/core';
import type { Element } from '../../rpg/contracts';
import type { FxDef } from '../../data/fxSchema';
import type { Rgb } from '../../world/dayNight';
import { BurstPool, glowMaterial, retire, trail, type BurstOptions } from './particles';

/** Opciones de un anillo que crece y se desvanece. */
interface RingDef {
  type: 'ring';
  diameter: number;
  thickness: number;
  color: Rgb;
  alpha: number;
  growTo: number;
  duration: number;
  rotateSpeed?: number;
}

/** Opciones de un decal en el suelo. */
interface DecalDef {
  type: 'disc' | 'cone_decal' | 'line_decal';
  radius?: number;
  width?: number;
  color: Rgb;
  alpha: number;
  fadeSeconds: number;
}

/** Opciones de un cono mesh. */
interface ConeMeshDef {
  type: 'cone_mesh';
  height: number;
  diameter: number;
  color: Rgb;
  alpha: number;
  fadeSeconds: number;
}

/** Opciones de líneas de slash. */
interface SlashLinesDef {
  count: number;
  type: 'lines';
  length: number;
  color: Rgb;
  alpha: number;
  fadeSeconds: number;
}

/** Proyectil personalizado. */
interface ProjectileDef {
  type: 'sphere' | 'cylinder';
  diameter?: number;
  height?: number;
  diameterTop?: number;
  diameterBottom?: number;
  color: Rgb;
  core: Rgb;
}

/** Fase de anticipación. */
interface AnticipationPhase {
  handBurst: BurstOptions;
  groundRing: RingDef;
}

/** Fase de lanzamiento. */
interface CastPhase {
  projectile?: ProjectileDef;
  trail?: BurstOptions & { rate: number };
  ring?: RingDef;
  waveRing?: RingDef;
  cone?: ConeMeshDef;
  upwardParticles?: BurstOptions;
  frostParticles?: BurstOptions;
  swirlParticles?: BurstOptions;
  emberParticles?: BurstOptions;
  crystalParticles?: BurstOptions;
  windParticles?: BurstOptions;
  waterParticles?: BurstOptions;
  decal?: DecalDef;
}

/** Fase de impacto. */
interface ImpactPhase {
  burst: BurstOptions;
  ring?: RingDef;
  decal?: DecalDef;
  splash?: BurstOptions;
  crystals?: BurstOptions;
  iceShards?: BurstOptions;
  glow?: BurstOptions;
  slashLines?: SlashLinesDef;
  frostLine?: { type: 'line_decal'; width: number; color: Rgb; alpha: number; fadeSeconds: number };
}

/** Fase de disipación. */
interface DissipationPhase {
  embers?: BurstOptions;
  frostMist?: BurstOptions;
  windMist?: BurstOptions;
  mist?: BurstOptions;
  fadeParticles?: BurstOptions;
}

/** Perfil visual completo de un hechizo. */
export interface SpellFxProfile {
  element: Element;
  anticipation: AnticipationPhase;
  cast: CastPhase;
  impact: ImpactPhase;
  dissipation: DissipationPhase;
}

/** Registro de perfiles por spell ID. */
export interface SpellProfileRegistry {
  get(spellId: string): SpellFxProfile | null;
  has(spellId: string): boolean;
}

/** Efecto activo con tiempo de vida. */
interface ActiveFx {
  node?: TransformNode;
  mesh?: Mesh;
  mat?: StandardMaterial;
  trail?: ParticleSystem;
  ttl: number;
  total: number;
  grow?: number;
  alpha?: number;
  rotateSpeed?: number;
}

/**
 * Crea un anillo que crece y se desvanece.
 */
export function ringBurst(
  scene: Scene,
  at: Vector3,
  def: RingDef,
  bursts: BurstPool
): ActiveFx {
  const ring = MeshBuilder.CreateTorus('fxProfileRing', {
    diameter: def.diameter,
    thickness: def.thickness,
    tessellation: 32,
  }, scene);
  ring.position.copyFrom(at);
  const mat = glowMaterial(scene, `fxRing:${def.color.join(',')}`, def.color, def.alpha, true);
  ring.material = mat;
  ring.isPickable = false;

  const node = new TransformNode('fxRingNode', scene);
  ring.parent = node;
  node.position.copyFrom(at);

  return {
    node,
    mesh: ring,
    mat,
    ttl: def.duration,
    total: def.duration,
    grow: def.growTo - def.diameter,
    alpha: def.alpha,
    rotateSpeed: def.rotateSpeed,
  };
}

/**
 * Crea un decal en el suelo que se desvanece.
 */
export function decalDisc(
  scene: Scene,
  at: Vector3,
  def: DecalDef
): ActiveFx {
  const radius = def.radius ?? 1;
  const disc = MeshBuilder.CreateDisc('fxDecal', { radius, tessellation: 32 }, scene);
  disc.rotation.x = Math.PI / 2;
  disc.position.set(at.x, at.y + 0.04, at.z);
  const mat = glowMaterial(scene, `fxDecal:${def.color.join(',')}`, def.color, def.alpha, false);
  disc.material = mat;
  disc.isPickable = false;

  return {
    mesh: disc,
    mat,
    ttl: def.fadeSeconds,
    total: def.fadeSeconds,
    alpha: def.alpha,
  };
}

/**
 * Crea un cono mesh que se desvanece.
 */
export function coneMesh(
  scene: Scene,
  at: Vector3,
  def: ConeMeshDef,
  direction: number
): ActiveFx {
  const cone = MeshBuilder.CreateCylinder('fxCone', {
    height: def.height,
    diameterTop: 0,
    diameterBottom: def.diameter,
    tessellation: 24,
  }, scene);
  // El cono nace a lo largo de Y: se tumba hacia la dirección
  cone.position.set(at.x, at.y + def.height / 2, at.z);
  cone.rotation.set(Math.PI / 2, -direction, 0);
  const mat = glowMaterial(scene, `fxCone:${def.color.join(',')}`, def.color, def.alpha, true);
  cone.material = mat;
  cone.isPickable = false;

  return {
    mesh: cone,
    mat,
    ttl: def.fadeSeconds,
    total: def.fadeSeconds,
    alpha: def.alpha,
  };
}

/**
 * Crea líneas de slash que se desvanecen.
 */
export function slashLinesFx(
  scene: Scene,
  at: Vector3,
  def: SlashLinesDef
): ActiveFx[] {
  const fxs: ActiveFx[] = [];
  for (let i = 0; i < def.count; i++) {
    const angle = (i / def.count) * Math.PI * 2 + Math.random() * 0.3;
    const points = [
      new Vector3(at.x, at.y, at.z),
      new Vector3(
        at.x + Math.cos(angle) * def.length,
        at.y + (Math.random() - 0.5) * 0.2,
        at.z + Math.sin(angle) * def.length
      ),
    ];
    const lines = MeshBuilder.CreateLines(`fxSlash${i}`, { points }, scene);
    lines.color = new Color3(...def.color);
    lines.alpha = def.alpha;
    lines.isPickable = false;
    fxs.push({
      mesh: lines as unknown as Mesh,
      ttl: def.fadeSeconds,
      total: def.fadeSeconds,
      alpha: def.alpha,
    });
  }
  return fxs;
}

/**
 * Crea un proyectil personalizado.
 */
export function profileProjectile(
  scene: Scene,
  at: Vector3,
  def: ProjectileDef,
  fx: FxDef
): { mesh: Mesh; trail?: ParticleSystem } {
  let mesh: Mesh;
  const col = def.color;
  const core = def.core;

  if (def.type === 'sphere') {
    const d = def.diameter ?? 0.2;
    mesh = MeshBuilder.CreateSphere('fxProfileProj', { diameter: d, segments: 8 }, scene);
  } else {
    const h = def.height ?? 0.35;
    const dt = def.diameterTop ?? 0;
    const db = def.diameterBottom ?? 0.08;
    mesh = MeshBuilder.CreateCylinder('fxProfileProj', {
      height: h,
      diameterTop: dt,
      diameterBottom: db,
      tessellation: 6,
    }, scene);
  }
  mesh.position.copyFrom(at);
  const mat = glowMaterial(scene, `fxProj:${core.join(',')}`, core, 1, true);
  mesh.material = mat;
  mesh.isPickable = false;

  return { mesh };
}

/**
 * Registry simple que carga los perfiles desde un objeto JSON.
 */
export class StaticSpellProfileRegistry implements SpellProfileRegistry {
  private readonly profiles = new Map<string, SpellFxProfile>();

  constructor(raw: Record<string, SpellFxProfile>) {
    for (const [id, profile] of Object.entries(raw)) {
      this.profiles.set(id, profile);
    }
  }

  get(spellId: string): SpellFxProfile | null {
    return this.profiles.get(spellId) ?? null;
  }

  has(spellId: string): boolean {
    return this.profiles.has(spellId);
  }
}

/**
 * Gestor de efectos activos de perfil.
 */
export class ProfileFxManager {
  private _activeFx: ActiveFx[] = [];

  constructor(
    private readonly scene: Scene,
    private readonly bursts: BurstPool,
    private readonly ground: (x: number, y: number) => number,
  ) {}

  /** Ejecuta la fase de anticipación de un perfil. */
  playAnticipation(profile: SpellFxProfile, handPos: Vector3, playerPos: Vector3): void {
    const at = new Vector3(playerPos.x, this.ground(playerPos.x, playerPos.y) + 0.1, playerPos.y);

    // Destello en la mano
    this.bursts.burst(handPos, profile.anticipation.handBurst);

    // Anillo en el suelo
    const ring = ringBurst(this.scene, at, profile.anticipation.groundRing, this.bursts);
    this._activeFx.push(ring);
  }

  /** Ejecuta la fase de lanzamiento de un perfil. */
  playCast(profile: SpellFxProfile, at: Vector3, direction: number): { mesh?: Mesh; trail?: ParticleSystem } {
    const cast = profile.cast;
    const results: { mesh?: Mesh; trail?: ParticleSystem } = {};

    // Proyectil
    if (cast.projectile) {
      const proj = profileProjectile(this.scene, at, cast.projectile, {} as FxDef);
      results.mesh = proj.mesh;
      if (cast.trail) {
        results.trail = trail(this.scene, 'fxProfileTrail', proj.mesh, cast.trail);
      }
    }

    // Anillo (para áreas self)
    if (cast.ring) {
      const ring = ringBurst(this.scene, at, cast.ring, this.bursts);
      this._activeFx.push(ring);
    }

    // Onda expansiva
    if (cast.waveRing) {
      const ring = ringBurst(this.scene, at, cast.waveRing, this.bursts);
      this._activeFx.push(ring);
    }

    // Cono mesh
    if (cast.cone) {
      const cone = coneMesh(this.scene, at, cast.cone, direction);
      this._activeFx.push(cone);
    }

    // Partículas hacia arriba
    if (cast.upwardParticles) {
      this.bursts.burst(at, cast.upwardParticles);
    }

    // Partículas de escarcha
    if (cast.frostParticles) {
      this.bursts.burst(at, cast.frostParticles);
    }

    // Partículas de remolino
    if (cast.swirlParticles) {
      this.bursts.burst(at, cast.swirlParticles);
    }

    // Partículas de brasa
    if (cast.emberParticles) {
      this.bursts.burst(at, cast.emberParticles);
    }

    // Partículas de cristal
    if (cast.crystalParticles) {
      this.bursts.burst(at, cast.crystalParticles);
    }

    // Partículas de viento
    if (cast.windParticles) {
      this.bursts.burst(at, cast.windParticles);
    }

    // Partículas de agua
    if (cast.waterParticles) {
      this.bursts.burst(at, cast.waterParticles);
    }

    // Decal
    if (cast.decal) {
      const decal = decalDisc(this.scene, at, cast.decal);
      this._activeFx.push(decal);
    }

    return results;
  }

  /** Ejecuta la fase de impacto de un perfil. */
  playImpact(profile: SpellFxProfile, at: Vector3): void {
    const impact = profile.impact;

    // Explosión principal
    this.bursts.burst(at, impact.burst);

    // Anillo de impacto
    if (impact.ring) {
      const ring = ringBurst(this.scene, at, impact.ring, this.bursts);
      this._activeFx.push(ring);
    }

    // Decal de impacto
    if (impact.decal) {
      const decal = decalDisc(this.scene, at, impact.decal);
      this._activeFx.push(decal);
    }

    // Splash (agua)
    if (impact.splash) {
      this.bursts.burst(at, impact.splash);
    }

    // Cristales (hielo)
    if (impact.crystals) {
      this.bursts.burst(at, impact.crystals);
    }

    // Fragmentos de hielo
    if (impact.iceShards) {
      this.bursts.burst(at, impact.iceShards);
    }

    // Brillo (curación)
    if (impact.glow) {
      this.bursts.burst(at, impact.glow);
    }

    // Líneas de slash (aire)
    if (impact.slashLines) {
      const slashes = slashLinesFx(this.scene, at, impact.slashLines);
      this._activeFx.push(...slashes);
    }
  }

  /** Ejecuta la fase de disipación de un perfil. */
  playDissipation(profile: SpellFxProfile, at: Vector3): void {
    const diss = profile.dissipation;

    if (diss.embers) this.bursts.burst(at, diss.embers);
    if (diss.frostMist) this.bursts.burst(at, diss.frostMist);
    if (diss.windMist) this.bursts.burst(at, diss.windMist);
    if (diss.mist) this.bursts.burst(at, diss.mist);
    if (diss.fadeParticles) this.bursts.burst(at, diss.fadeParticles);
  }

  /** Actualiza los efectos activos. */
  sync(frameSeconds: number): void {
    this._activeFx = this._activeFx.filter((fx) => {
      fx.ttl -= frameSeconds;
      const k = 1 - Math.max(0, fx.ttl) / fx.total;

      if (fx.mesh && fx.mat) {
        if (fx.grow !== undefined && fx.node) {
          fx.node.scaling.setAll(1 + fx.grow * k);
        }
        if (fx.rotateSpeed) {
          if (fx.node) fx.node.rotation.y += fx.rotateSpeed * frameSeconds;
        }
        if (fx.alpha !== undefined) {
          fx.mat.alpha = fx.alpha * (1 - k);
        }
      }

      if (fx.ttl > 0) return true;

      // Limpiar
      if (fx.trail) retire(fx.trail);
      fx.mat?.dispose();
      fx.node?.dispose(false, false);
      return false;
    });
  }

  /** Limpia todos los efectos activos. */
  reset(): void {
    for (const fx of this._activeFx) {
      if (fx.trail) retire(fx.trail);
      fx.mat?.dispose();
      fx.node?.dispose(false, false);
    }
    this._activeFx = [];
  }
}
