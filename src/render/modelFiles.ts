// Modelos animados de assets/models/, cargados una sola vez por escena.
import '@babylonjs/loaders/glTF';
import { LoadAssetContainerAsync, type AssetContainer, type Scene } from '@babylonjs/core';

const URLS: Record<string, string> = import.meta.glob('/assets/models/*.glb', { query: '?url', import: 'default', eager: true });
const loaded = new WeakMap<Scene, Map<string, Promise<AssetContainer>>>();

/** ¿Existe `assets/models/<name>.glb`? */
export function hasModelFile(name: string): boolean {
  return URLS[`/assets/models/${name}.glb`] !== undefined;
}

/** Nombres de las mallas GLB del catálogo, para la paleta del modo edición. */
export function modelFileNames(): string[] {
  return Object.keys(URLS)
    .map((u) => u.replace('/assets/models/', '').replace(/\.glb$/, ''))
    .filter((n) => !n.includes('/'))
    .sort();
}

export function modelFile(scene: Scene, name: string): Promise<AssetContainer> {
  let files = loaded.get(scene);
  if (!files) loaded.set(scene, (files = new Map()));
  let p = files.get(name);
  if (!p) {
    const url = URLS[`/assets/models/${name}.glb`];
    if (!url) throw new Error(`[modelos] falta assets/models/${name}.glb`);
    p = LoadAssetContainerAsync(url, scene, { pluginExtension: '.glb' });
    files.set(name, p);
  }
  return p;
}
