// Panamá lejano: una sola malla baja de todo el atlas, azul por la distancia, con el mar y
// las cordilleras donde están. Se ve al subir la vista y reemplaza a lo que aún no se ha
// construido. Un solo dibujado, sin sombras ni niebla: la distancia la pone este material.
import { Color3, Effect, Mesh, ShaderMaterial, VertexData, type Scene, type TransformNode } from '@babylonjs/core';
import { atlasExtent, farHeight, regionAt, type AtlasDef } from '../world/atlas';
import { plotFade } from '../world/shape';

const STEP = 24;
/** Metros por debajo del terreno de cerca: donde hay página, se ve esa. */
const BELOW_NEAR = 14;
const SEA: readonly [number, number, number] = [0.13, 0.33, 0.52];
const LOW: readonly [number, number, number] = [0.16, 0.3, 0.22];
const HIGH: readonly [number, number, number] = [0.11, 0.2, 0.3];
/** Metros que la malla lejana queda bajo el terreno de páginas (cubre caminos allanados y redondeo). */
const NEAR_CLEARANCE = 2;

/** Terreno de cerca: dónde puede haber páginas y a qué altura queda su suelo. */
export interface NearGround {
  bounds: { x0: number; z0: number; x1: number; z1: number };
  height(x: number, z: number): number;
}

/**
 * Altura mínima del terreno de cerca alrededor de cada vértice de la malla lejana (en `±STEP`,
 * todo lo que tocan sus triángulos), o null fuera de donde hay páginas. Así la malla lejana,
 * interpolada entre vértices, no asoma sobre el suelo de cerca.
 */
export function nearFloor(near: NearGround, x0: number, z0: number): (c: number, r: number) => number | null {
  const half = STEP / 2;
  const b = near.bounds;
  const gc = Math.floor((b.x1 - b.x0) / half) + 1;
  const gr = Math.floor((b.z1 - b.z0) / half) + 1;
  const g = new Float32Array(gc * gr);
  for (let r = 0; r < gr; r++) for (let c = 0; c < gc; c++) g[r * gc + c] = near.height(b.x0 + c * half, b.z0 + r * half);
  return (c, r) => {
    const x = x0 + c * STEP;
    const z = z0 + r * STEP;
    // Un vértice cuyos triángulos no tocan las páginas no tiene suelo de cerca que tapar.
    if (x + STEP < b.x0 || x - STEP > b.x1 || z + STEP < b.z0 || z - STEP > b.z1) return null;
    const ci = Math.round((x - b.x0) / half);
    const ri = Math.round((z - b.z0) / half);
    let low = Infinity;
    for (let dr = -2; dr <= 2; dr++) {
      const rr = ri + dr;
      if (rr < 0 || rr >= gr) continue;
      for (let dc = -2; dc <= 2; dc++) {
        const cc = ci + dc;
        if (cc < 0 || cc >= gc) continue;
        low = Math.min(low, g[rr * gc + cc]!);
      }
    }
    return low === Infinity ? null : low;
  };
}

Effect.ShadersStore['farWorldVertexShader'] = `
precision highp float;
attribute vec3 position;
attribute vec4 color;
uniform mat4 worldViewProjection;
varying vec3 vWorld;
varying vec3 vColor;
void main() {
  vWorld = position;
  vColor = color.rgb;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}`;

Effect.ShadersStore['farWorldFragmentShader'] = `
precision highp float;
varying vec3 vWorld;
varying vec3 vColor;
uniform vec3 eye;
uniform vec3 haze;
uniform float light;
void main() {
  float d = length(vWorld - eye);
  // Nunca del todo limpio: lo más cercano de esta malla ya está a cientos de metros.
  float k = clamp(0.4 + (1.0 - exp(-d / 2200.0)) * 0.5, 0.0, 0.95);
  gl_FragColor = vec4(mix(vColor * light, haze, k), 1.0);
}`;

export class FarWorldView {
  private readonly material: ShaderMaterial;
  private readonly haze = new Color3();

  constructor(scene: Scene, atlas: AtlasDef, world: { width: number; depth: number }, parent: TransformNode, near?: NearGround) {
    const e = atlasExtent(atlas);
    const cols = Math.floor((e.x1 - e.x0) / STEP) + 1;
    const rows = Math.floor((e.z1 - e.z0) / STEP) + 1;
    const floor = near ? nearFloor(near, e.x0, e.z0) : null;
    const heights = new Float32Array(cols * rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) heights[r * cols + c] = farHeight(atlas, e.x0 + c * STEP, e.z0 + r * STEP);
    }
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    // Color por altura: con relieve real la escala es la del pico más alto (Barú), no la de las
    // sierras a mano; si no, casi todo el país quedaba gris roca.
    let peak = 0;
    for (const v of heights) peak = Math.max(peak, v - atlas.landHeight);
    const top = atlas.relief ? Math.max(1, peak) : Math.max(...atlas.ranges.map((g) => g.height));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = e.x0 + c * STEP;
        const z = e.z0 + r * STEP;
        let h = heights[r * cols + c]!;
        const sea = !regionAt(atlas, x, z);
        // Luz horneada: la ladera que mira al sol se aclara y el relieve se lee de lejos.
        const dx = heights[r * cols + Math.min(cols - 1, c + 1)]! - heights[r * cols + Math.max(0, c - 1)]!;
        const dz = heights[Math.min(rows - 1, r + 1) * cols + c]! - heights[Math.max(0, r - 1) * cols + c]!;
        const shade = sea ? 1 : Math.min(1.25, Math.max(0.55, 0.9 + (dx * 0.5 - dz * 0.4) / (2 * STEP)));
        const t = Math.min(1, h / (top * 0.6));
        const base = sea ? SEA : [LOW[0] + (HIGH[0] - LOW[0]) * t, LOW[1] + (HIGH[1] - LOW[1]) * t, LOW[2] + (HIGH[2] - LOW[2]) * t];
        // Por debajo del terreno de cerca, y con la parcela sin montañas, igual que él.
        const k = plotFade(world, x, z);
        const near = h <= atlas.seaLevel ? h : atlas.landHeight + (h - atlas.landHeight) * k;
        // Hundida sólo bajo la parcela; fuera, la tierra baja real (costas, llanos) queda sobre el
        // mar y no ahogada bajo él.
        h = near - (BELOW_NEAR + (1 - BELOW_NEAR) * k);
        if (!sea) h = Math.max(h, atlas.seaLevel + 1);
        // Donde hay páginas manda su suelo: fuera de la parcela (Iguanera) el relieve del atlas
        // lleva `landHeight` y el de cerca no, y la malla lejana tapaba la isla como una bruma.
        const low = floor?.(c, r);
        if (low != null) h = Math.min(h, low - NEAR_CLEARANCE);
        positions.push(x, h, z);
        colors.push(base[0]! * shade, base[1]! * shade, base[2]! * shade, 1);
        if (r + 1 < rows && c + 1 < cols) {
          const a = r * cols + c;
          indices.push(a, a + 1, a + cols + 1, a, a + cols + 1, a + cols);
        }
      }
    }
    const mesh = new Mesh('farWorld', scene);
    const data = new VertexData();
    data.positions = positions;
    data.colors = colors;
    data.indices = indices;
    data.applyToMesh(mesh);
    mesh.parent = parent;
    mesh.isPickable = false;
    mesh.freezeWorldMatrix();
    mesh.alwaysSelectAsActiveMesh = true;
    this.material = new ShaderMaterial('farWorldMat', scene, { vertex: 'farWorld', fragment: 'farWorld' }, {
      attributes: ['position', 'color'],
      uniforms: ['worldViewProjection', 'eye', 'haze', 'light'],
    });
    this.material.fogEnabled = false;
    mesh.material = this.material;
  }

  update(eye: { x: number; y: number; z: number }, haze: readonly [number, number, number], light: number): void {
    this.material.setVector3('eye', eye as never);
    this.material.setColor3('haze', this.haze.set(haze[0], haze[1], haze[2]));
    this.material.setFloat('light', light);
  }
}
