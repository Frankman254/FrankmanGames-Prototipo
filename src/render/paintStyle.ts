// Estilo «pintura anime» (creador, 2026-11-07: «más estilo pintura anime, que lo realista cuesta
// mucha GPU»). Un solo pase a pantalla completa sobre la imagen ya dibujada, igual para todo
// (personajes, terreno, plantas, efectos), sin rehacer materiales:
//  - contorno de tinta donde salta la profundidad (silueta de cada cosa), que se apaga a lo lejos;
//  - luz en pocas bandas (cel), con el tono intacto: solo se agrupa la luminosidad;
//  - color algo más saturado y cálido.
// Añade profundidad y un pase de pantalla. Su coste debe medirse en cada GPU.
import { Effect, PostProcess, type Camera, type DepthRenderer, type Scene } from '@babylonjs/core';
import { bindWindDepthMaterials, type WindDepthSync } from './windDepthMaterials';

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

Effect.ShadersStore[`${NAME}FragmentShader`] = `
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
  float near = 1.0 - smoothstep(outlineFade, outlineFade * 3.0, d);
  c = mix(c, c * 0.22 + vec3(0.03, 0.02, 0.03), edge * near * outline);
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), src.a);
}
`;

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
    this.pass = new PostProcess(NAME, NAME, ['texel', 'bands', 'cel', 'saturation', 'outline', 'outlineFade'], ['depthSampler'], 1, camera);
    this.pass.onApply = (effect) => {
      effect.setTexture('depthSampler', this.depth.getDepthMap());
      effect.setFloat2('texel', 1 / Math.max(1, this.pass.width), 1 / Math.max(1, this.pass.height));
      effect.setFloat('bands', def.bands);
      effect.setFloat('cel', def.cel);
      effect.setFloat('saturation', def.saturation);
      effect.setFloat('outline', def.outline);
      effect.setFloat('outlineFade', def.outlineFade);
    };
  }

  dispose(): void {
    this.windDepth.dispose();
    this.pass.dispose(this.camera);
    this.scene.disableDepthRenderer(this.camera);
  }
}
