// El mar: un plano que acompaña al jugador. La costa la dibuja el terreno al hundirse.
// Las olas son textura de Blender (scripts/blender/mar.py) que se desplaza; la marea sube y
// baja el plano, y con ello la línea de agua se mueve sobre la playa.
import { Color3, MeshBuilder, StandardMaterial, type Mesh, type Scene, type Texture, type TransformNode } from '@babylonjs/core';
import { staticTexture } from './staticModels';

const SIDE = 1600;
/** Metros de una repetición de textura. */
const TILE = 32;
/** Metros que sube y baja el agua. */
const SWELL = 0.22;
const SWELL_PERIOD = 7;
/** Repeticiones por segundo de color y relieve: distintas, para que no se vea un dibujo fijo. */
const DRIFT = { color: 0.012, bumpU: -0.017, bumpV: 0.024 };

/** Altura del agua en un instante. */
export function seaLevelAt(level: number, time: number): number {
  return level + Math.sin((time / SWELL_PERIOD) * Math.PI * 2) * SWELL;
}

/** Desplazamiento de textura, siempre dentro de una repetición. */
export function driftOffset(rate: number, time: number): number {
  const v = rate * time;
  return v - Math.floor(v);
}

export class SeaView {
  private readonly mesh: Mesh;
  private readonly color: Texture;
  private readonly bump: Texture;
  private time = 0;

  constructor(scene: Scene, private readonly level: number, parent: TransformNode) {
    this.mesh = MeshBuilder.CreateGround('sea', { width: SIDE, height: SIDE, subdivisions: 1 }, scene);
    const m = new StandardMaterial('seaMat', scene);
    this.color = staticTexture(scene, 'mar');
    this.bump = staticTexture(scene, 'mar_relieve');
    for (const t of [this.color, this.bump]) t.uScale = t.vScale = SIDE / TILE;
    m.diffuseTexture = this.color;
    m.bumpTexture = this.bump;
    m.diffuseColor = new Color3(1, 1, 1);
    m.specularColor = new Color3(0.35, 0.4, 0.42);
    m.specularPower = 64;
    m.alpha = 0.93;
    this.mesh.material = m;
    this.mesh.position.y = level;
    this.mesh.parent = parent;
    this.mesh.isPickable = false;
  }

  update(x: number, z: number, dt: number): void {
    // Saltos de una repetición entera: el dibujo no se mueve con el jugador.
    this.mesh.position.x = Math.round(x / TILE) * TILE;
    this.mesh.position.z = Math.round(z / TILE) * TILE;
    this.time += dt;
    this.mesh.position.y = seaLevelAt(this.level, this.time);
    this.color.vOffset = driftOffset(DRIFT.color, this.time);
    this.bump.uOffset = driftOffset(DRIFT.bumpU, this.time);
    this.bump.vOffset = driftOffset(DRIFT.bumpV, this.time);
  }
}
