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
  float k = clamp(0.58 + (1.0 - exp(-d / 1500.0)) * 0.4, 0.0, 0.97);
  gl_FragColor = vec4(mix(vColor * light, haze, k), 1.0);
}`;

export class FarWorldView {
  private readonly material: ShaderMaterial;
  private readonly haze = new Color3();

  constructor(scene: Scene, atlas: AtlasDef, world: { width: number; depth: number }, parent: TransformNode) {
    const e = atlasExtent(atlas);
    const cols = Math.floor((e.x1 - e.x0) / STEP) + 1;
    const rows = Math.floor((e.z1 - e.z0) / STEP) + 1;
    const heights = new Float32Array(cols * rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) heights[r * cols + c] = farHeight(atlas, e.x0 + c * STEP, e.z0 + r * STEP);
    }
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const top = Math.max(...atlas.ranges.map((g) => g.height));
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
        const near = h <= atlas.seaLevel ? h : atlas.landHeight + (h - atlas.landHeight) * plotFade(world, x, z);
        h = near - BELOW_NEAR;
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
