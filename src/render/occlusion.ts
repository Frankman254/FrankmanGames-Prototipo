// Recorte de oclusión estilo ARPG: los árboles, rocas grandes y casas que quedan
// entre la cámara y el jugador (o un enemigo cercano) se recortan en un círculo
// alrededor del personaje en pantalla, con borde difuminado por tramado.
// Es un plugin de material que trabaja en espacio de pantalla, así sirve igual
// para mallas sueltas y para thin instances (no se toca ninguna instancia).
// Sólo se recorta lo que está MÁS CERCA de la cámara que el personaje.
import { Matrix, MaterialPluginBase, Vector4, type Camera, type Engine, type Material, type MaterialDefines, type UniformBuffer } from '@babylonjs/core';

export const MAX_OCCLUSION_CIRCLES = 4;

/** Círculos activos (compartidos por todos los materiales): x, y en píxeles (origen abajo), radio en píxeles, profundidad 0–1. */
const circles: Vector4[] = Array.from({ length: MAX_OCCLUSION_CIRCLES }, () => new Vector4(0, 0, 0, 0));

export class OcclusionPlugin extends MaterialPluginBase {
  private static readonly all: OcclusionPlugin[] = [];
  private on = true;

  /** Activa o quita el recorte en todos los materiales (medición A/B). */
  static setEnabled(on: boolean): void {
    for (const p of OcclusionPlugin.all) {
      p.on = on;
      p.markAllDefinesAsDirty();
    }
  }

  constructor(material: Material) {
    super(material, 'Occlusion', 300, { OCCLUSION_CUT: false });
    this._enable(true);
    OcclusionPlugin.all.push(this);
  }

  override getClassName(): string {
    return 'OcclusionPlugin';
  }

  override prepareDefines(defines: MaterialDefines): void {
    defines['OCCLUSION_CUT'] = this.on;
  }

  override getUniforms(): { ubo: Array<{ name: string; size: number; type: string }>; fragment: string } {
    const names = circles.map((_, i) => `occCircle${i}`);
    return {
      ubo: names.map((name) => ({ name, size: 4, type: 'vec4' })),
      fragment: `#ifdef OCCLUSION_CUT\n${names.map((n) => `uniform vec4 ${n};`).join('\n')}\n#endif\n`,
    };
  }

  override bindForSubMesh(ubo: UniformBuffer): void {
    circles.forEach((c, i) => ubo.updateVector4(`occCircle${i}`, c));
  }

  override getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType !== 'fragment') return null;
    const checks = circles.map((_, i) => `occ = max(occ, occlusionCut(occCircle${i}));`).join('\n    ');
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `
#ifdef OCCLUSION_CUT
  // Tramado ordenado 4×4 (umbral 0–1) para un borde suave sin transparencia real.
  float occBayer(vec2 p) {
    vec2 q = mod(floor(p), 4.0);
    float i = q.x + q.y * 4.0;
    float b = 0.0;
    b += step(0.5, mod(i, 2.0)) * 8.0;
    b += step(0.5, mod(floor(i / 2.0), 2.0)) * 4.0;
    b += step(0.5, mod(floor(i / 4.0), 2.0)) * 2.0;
    b += step(0.5, mod(floor(i / 8.0), 2.0)) * 1.0;
    return (b + 0.5) / 16.0;
  }
  // 1 = recortar del todo; 0 = no tocar. c.z = radio en píxeles, c.w = profundidad del personaje.
  float occlusionCut(vec4 c) {
    if (c.z <= 0.0 || gl_FragCoord.z >= c.w) return 0.0;
    float d = length(gl_FragCoord.xy - c.xy) / c.z;
    return 1.0 - smoothstep(0.65, 1.0, d);
  }
#endif
`,
      CUSTOM_FRAGMENT_MAIN_BEGIN: `
#ifdef OCCLUSION_CUT
  {
    float occ = 0.0;
    ${checks}
    if (occ > occBayer(gl_FragCoord.xy)) discard;
  }
#endif
`,
    };
  }
}

/** Personaje que debe verse: posición en el mundo (a media altura) y radio en metros. */
export interface OcclusionTarget {
  x: number;
  y: number;
  z: number;
  radius: number;
}

const clip = new Vector4();
const viewProj = new Matrix();

/**
 * Proyecta los personajes a pantalla y actualiza los círculos. `strength` (0–1)
 * por círculo suaviza la aparición: el radio crece y decrece en `fadeSeconds`.
 */
export class OcclusionController {
  private readonly strength = new Float32Array(MAX_OCCLUSION_CIRCLES);

  constructor(
    private readonly engine: Engine,
    private readonly fadeSeconds: number,
  ) {}

  update(camera: Camera, targets: readonly OcclusionTarget[], dt: number): void {
    const w = this.engine.getRenderWidth();
    const h = this.engine.getRenderHeight();
    camera.getViewMatrix().multiplyToRef(camera.getProjectionMatrix(), viewProj);
    const step = this.fadeSeconds > 0 ? dt / this.fadeSeconds : 1;
    for (let i = 0; i < MAX_OCCLUSION_CIRCLES; i++) {
      const t = targets[i];
      const c = circles[i]!;
      this.strength[i] = Math.min(1, Math.max(0, this.strength[i]! + (t ? step : -step)));
      if (!t) {
        if (this.strength[i]! <= 0) c.z = 0;
        else c.z *= 0.9;
        continue;
      }
      Vector4.TransformCoordinatesFromFloatsToRef(t.x, t.y, t.z, viewProj, clip);
      if (clip.w <= 0) {
        c.z = 0;
        continue;
      }
      const nx = clip.x / clip.w;
      const ny = clip.y / clip.w;
      const nz = clip.z / clip.w;
      // Radio en píxeles: la distancia en pantalla de un punto a `radius` metros por encima.
      Vector4.TransformCoordinatesFromFloatsToRef(t.x, t.y + t.radius, t.z, viewProj, clip);
      const ry = clip.w > 0 ? Math.abs(clip.y / clip.w - ny) * 0.5 * h : 0;
      c.x = (nx * 0.5 + 0.5) * w;
      c.y = (ny * 0.5 + 0.5) * h;
      c.z = ry * this.strength[i]!;
      // Profundidad del personaje (rango 0–1 de WebGL) con un margen hacia la cámara.
      c.w = nz * 0.5 + 0.5 - 1e-4;
    }
  }
}
