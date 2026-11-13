// Estilo «pintura anime» (creador, 2026-11-07: «más estilo pintura anime, que lo realista cuesta
// mucha GPU»). Un solo pase a pantalla completa sobre la imagen ya dibujada, igual para todo
// (personajes, terreno, plantas, efectos), sin rehacer materiales:
//  - contorno de tinta donde salta la profundidad (silueta de cada cosa), que se apaga a lo lejos;
//  - luz en pocas bandas (cel), con el tono intacto: solo se agrupa la luminosidad;
//  - color algo más saturado y cálido.
// Añade profundidad y un pase de pantalla. Su coste debe medirse en cada GPU.
import { Effect, PostProcess, type Camera, type DepthRenderer, type Scene } from '@babylonjs/core';
import { bindWindDepthMaterials, type WindDepthSync } from './windDepthMaterials';
import { bindOcclusionUniforms, OCCLUSION_CUT_GLSL, OCCLUSION_FRAGMENT_UNIFORMS, OCCLUSION_UNIFORM_NAMES } from './occlusion';

/** Cifras del estilo (PROPUESTA de arte; se afinan jugando). */
export interface PaintStyleDef {
  /** Escalones de luz (3–6). */
  bands: number;
  /** Cuánto se agrupa la luz en bandas (0 = nada, 1 = bandas duras). */
  cel: number;
  /** Saturación (1 = la de siempre). */
  saturation: number;
  /** Fuerza del contorno (0–1). */
  outline: number;
  /** Fracción del plano lejano a partir de la que el contorno se desvanece. */
  outlineFade: number;
}

export const PAINT_STYLE: PaintStyleDef = { bands: 4, cel: 0.6, saturation: 1.22, outline: 0.85, outlineFade: 0.12 };

const NAME = 'paintStyle';

const OCCLUSION_CHECKS = OCCLUSION_UNIFORM_NAMES.map((name) => `occ = max(occ, occlusionCutAt(${name}, d));`).join('\n  ');

export const PAINT_STYLE_FRAGMENT_SHADER = `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform sampler2D depthSampler;
uniform vec2 texel;
uniform float bands;
uniform float cel;
uniform float saturation;
uniform float outline;
uniform float outlineFade;
${OCCLUSION_FRAGMENT_UNIFORMS}
${OCCLUSION_CUT_GLSL}

float depthAt(vec2 uv) { return texture2D(depthSampler, uv).r; }

void main(void) {
  vec4 src = texture2D(textureSampler, vUV);
  vec3 c = src.rgb;
  // Saturación y un toque cálido.
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, saturation) * vec3(1.03, 1.0, 0.97);
  // Bandas de luz: se agrupa la luminosidad y se conserva el tono.
  float lum = max(dot(c, vec3(0.299, 0.587, 0.114)), 1e-4);
  float stepped = (floor(lum * bands) + 0.5) / bands;
  // El negro permanece negro: las bandas no iluminan artificialmente la noche.
  stepped = min(stepped, lum * 1.4);
  float soft = mix(lum, stepped, cel);
  c *= soft / lum;
  // Contorno: salto relativo de profundidad con las cuatro vecinas.
  float d = depthAt(vUV);
  float dl = depthAt(vUV - vec2(texel.x, 0.0));
  float dr = depthAt(vUV + vec2(texel.x, 0.0));
  float du = depthAt(vUV - vec2(0.0, texel.y));
  float dd = depthAt(vUV + vec2(0.0, texel.y));
  float jump = (abs(dl - dr) + abs(du - dd)) / max(d, 0.002);
  float edge = smoothstep(0.06, 0.16, jump);
  // Un borde que solo existe en el depth map pertenece a geometría que el
  // pase visible descartó (por ejemplo una copa recortada alrededor del
  // personaje). Exigir también una discontinuidad en la imagen impide que
  // esa geometría invisible reaparezca como tinta, incluso si un material de
  // profundidad nuevo o tardío no recibió todavía la máscara de oclusión.
  vec3 cl = texture2D(textureSampler, vUV - vec2(texel.x, 0.0)).rgb;
  vec3 cr = texture2D(textureSampler, vUV + vec2(texel.x, 0.0)).rgb;
  vec3 cu = texture2D(textureSampler, vUV - vec2(0.0, texel.y)).rgb;
  vec3 cd = texture2D(textureSampler, vUV + vec2(0.0, texel.y)).rgb;
  float colorJump = max(length(cl - cr), length(cu - cd));
  float visibleEdge = smoothstep(0.035, 0.12, colorJump);
  edge *= visibleEdge;
  // El pase de color ya recortó los árboles que tapan al personaje. Su
  // profundidad sigue existiendo: se anula aquí para no dibujar un fantasma.
  float occ = 0.0;
  ${OCCLUSION_CHECKS}
  edge *= 1.0 - occ;
  float near = 1.0 - smoothstep(outlineFade, outlineFade * 3.0, d);
  c = mix(c, c * 0.22 + vec3(0.03, 0.02, 0.03), edge * near * outline);
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), src.a);
}
`;
Effect.ShadersStore[`${NAME}FragmentShader`] = PAINT_STYLE_FRAGMENT_SHADER;

/** Pase de pintura sobre una cámara. Se crea y se quita en caliente desde las opciones. */
export class PaintStyle {
  private readonly pass: PostProcess;
  private readonly depth: DepthRenderer;
  private readonly windDepth: WindDepthSync;

  constructor(private readonly scene: Scene, private readonly camera: Camera, def: PaintStyleDef = PAINT_STYLE) {
    this.depth = scene.enableDepthRenderer(camera, false)!;
    // Las plantas se balancean en color; sin esto, el contorno de profundidad
    // se queda quieto y el borde baila.
    this.windDepth = bindWindDepthMaterials(this.depth, scene);
    this.pass = new PostProcess(NAME, NAME, ['texel', 'bands', 'cel', 'saturation', 'outline', 'outlineFade', ...OCCLUSION_UNIFORM_NAMES], ['depthSampler'], 1, camera);
    this.pass.onApply = (effect) => {
      effect.setTexture('depthSampler', this.depth.getDepthMap());
      effect.setFloat2('texel', 1 / Math.max(1, this.pass.width), 1 / Math.max(1, this.pass.height));
      effect.setFloat('bands', def.bands);
      effect.setFloat('cel', def.cel);
      effect.setFloat('saturation', def.saturation);
      effect.setFloat('outline', def.outline);
      effect.setFloat('outlineFade', def.outlineFade);
      bindOcclusionUniforms(effect);
    };
  }

  dispose(): void {
    this.windDepth.dispose();
    this.pass.dispose(this.camera);
    this.scene.disableDepthRenderer(this.camera);
  }
}
