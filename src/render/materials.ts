import { Color3, StandardMaterial, type Scene } from '@babylonjs/core';

export function solidMaterial(scene: Scene, name: string, rgb: [number, number, number]): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = new Color3(...rgb);
  m.specularColor = new Color3(0.05, 0.05, 0.05);
  return m;
}
