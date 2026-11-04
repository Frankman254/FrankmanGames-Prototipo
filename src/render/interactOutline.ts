// Contorno dorado común de lo que se puede usar en el mundo: puertas, escaleras, cofres, talleres.
import { Color3, type AbstractMesh } from '@babylonjs/core';

const GOLD = new Color3(1, 0.78, 0.25);

export function goldOutline(mesh: AbstractMesh, width = 0.035): void {
  mesh.renderOutline = true;
  mesh.outlineColor = GOLD;
  mesh.outlineWidth = width;
}
