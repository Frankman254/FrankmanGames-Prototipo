// Corro de humanoides para la medición (`?bench`): N personajes procedurales
// del jugador y de los PNJ, cada uno con su paleta y su aspecto, que alternan
// correr, reposo, ataque, hechizo, evasión e impacto. Sólo render: no existen
// en la simulación.
import type { AbstractMesh, Observer, Scene } from '@babylonjs/core';
import type { AnimationDataDef, AssetManifest } from '../../data/worldSchema';
import type { AnimState } from '../../world/rigs';
import type { HeightField } from '../../world/terrain';
import type { AssetCache } from '../assetCache';
import { createCharacter, type CharacterModel } from './characterModel';

const CYCLE: AnimState[] = ['run', 'idle', 'attack', 'run', 'cast', 'evade', 'run', 'hit'];

export class CharacterCrowd {
  private readonly models: CharacterModel[] = [];
  private readonly obs: Observer<Scene>;
  private time = 0;

  constructor(
    private readonly scene: Scene,
    chars: { assets: AssetManifest; animation: AnimationDataDef },
    cache: AssetCache,
    ground: HeightField,
    center: { x: number; z: number },
    n: number,
    private readonly shadows: { addCasters(m: readonly AbstractMesh[]): void; removeCasters(m: readonly AbstractMesh[]): void },
  ) {
    const variants: Array<[string, string]> = [];
    for (const id of ['player', 'npc']) {
      const e = chars.assets[id];
      if (e?.kind === 'procedural') for (const p of Object.keys(e.palettes)) variants.push([id, p]);
    }
    for (let i = 0; i < n; i++) {
      const [id, palette] = variants[i % variants.length]!;
      const m = createCharacter(scene, id, `crowd${i}`, chars.assets[id]!, chars.animation, cache, palette);
      const a = (i / Math.max(1, n)) * Math.PI * 2;
      const r = 4 + (i % 3) * 1.5;
      const x = center.x + Math.cos(a) * r;
      const z = center.z + Math.sin(a) * r;
      m.root.position.set(x, ground.sample(x, z), z);
      m.root.rotation.y = -a - Math.PI / 2;
      shadows.addCasters(m.meshes);
      this.models.push(m);
    }
    this.obs = scene.onBeforeRenderObservable.add(() => this.update(scene.getEngine().getDeltaTime() / 1000));
  }

  private update(dt: number): void {
    this.time += dt;
    this.models.forEach((m, i) => {
      const s = CYCLE[(Math.floor(this.time / 1.5) + i) % CYCLE.length]!;
      if (m.state !== s || (m.finished && s !== 'run' && s !== 'idle')) m.play(s, { restart: m.state === s });
      m.update(dt, s === 'run' ? 3.2 : 0);
    });
  }

  dispose(): void {
    this.scene.onBeforeRenderObservable.remove(this.obs);
    for (const m of this.models) {
      this.shadows.removeCasters(m.meshes);
      m.dispose();
    }
  }
}
