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

  /** Copia nueva del modelo en la escena, con sus esqueletos y animaciones clonados. */
  async instantiate(id: string, prefix = id): Promise<InstantiatedEntries> {
    const c = await this.load(id);
    return c.instantiateModelsToScene((name) => `${prefix}:${name}`, false, { doNotInstantiate: true });
  }
}
