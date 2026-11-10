// Carga de modelos glTF/GLB con caché: cada archivo se descarga y analiza una
// sola vez (AssetContainer) y después se instancia tantas veces como haga falta.
import '@babylonjs/loaders/glTF';
import { LoadAssetContainerAsync, type AssetContainer, type InstantiatedEntries, type Scene } from '@babylonjs/core';
import type { AssetManifest } from '../data/worldSchema';

// Vite copia (con hash) todo lo que hay en assets/ y nos da su URL final; así
// funciona igual con el servidor de desarrollo y con file:// empaquetado.
const BUNDLED: Record<string, string> = import.meta.glob('/assets/**/*.{glb,gltf,png,jpg,ktx2}', {
  query: '?url',
  import: 'default',
  eager: true,
});

export class AssetCache {
  private readonly containers = new Map<string, Promise<AssetContainer>>();

  constructor(
    private readonly scene: Scene,
    private readonly manifest: AssetManifest,
    private readonly urls: Record<string, string> = BUNDLED,
  ) {}

  url(id: string): string {
    const entry = this.manifest[id];
    if (!entry) throw new Error(`[assets] id desconocido: ${id}`);
    if (entry.kind !== 'gltf') throw new Error(`[assets] ${id} no es un archivo (kind ${entry.kind})`);
    const url = this.urls[`/${entry.file}`];
    if (!url) throw new Error(`[assets] ${id}: ${entry.file} no está en assets/`);
    return url;
  }

  /** Contenedor cargado (una sola descarga por id, aunque se pida a la vez). */
  load(id: string): Promise<AssetContainer> {
    let p = this.containers.get(id);
    if (!p) {
      const url = this.url(id);
      const ext = url.slice(url.lastIndexOf('.')).toLowerCase();
      p = LoadAssetContainerAsync(url, this.scene, { pluginExtension: ext === '.gltf' ? '.gltf' : '.glb' });
      p.catch(() => this.containers.delete(id)); // permite reintentar
      this.containers.set(id, p);
    }
    return p;
  }

  /** Copia nueva del modelo en la escena, con sus esqueletos, animaciones y materiales clonados. */
  async instantiate(id: string, prefix = id): Promise<InstantiatedEntries> {
    const c = await this.load(id);
    return quietInstantiate(this.scene, c, prefix);
  }
}

/**
 * `instantiateModelsToScene` con materiales clonados, sin el aviso de «material cambiado».
 * Cada propiedad que fija un material PBR nuevo (unas cien al clonarlo) recorría todas las
 * mallas de la escena buscando quién lo usa; con dos mil mallas, crear un enemigo en una
 * mazmorra costaba cientos de ms. Las copias aún no se han dibujado, así que no hay nada que
 * marcar: se apaga el aviso mientras se copian. Se toca el campo interno a propósito: el
 * setter público, al reactivarlo, marcaría todos los materiales de la escena.
 */
export function quietInstantiate(scene: Scene, container: AssetContainer, prefix: string): InstantiatedEntries {
  const s = scene as unknown as { _blockMaterialDirtyMechanism: boolean };
  if (s._blockMaterialDirtyMechanism) return container.instantiateModelsToScene((name) => `${prefix}:${name}`, true, { doNotInstantiate: true });
  s._blockMaterialDirtyMechanism = true;
  try {
    return container.instantiateModelsToScene((name) => `${prefix}:${name}`, true, { doNotInstantiate: true });
  } finally {
    s._blockMaterialDirtyMechanism = false;
  }
}
