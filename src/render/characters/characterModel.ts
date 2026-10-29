// Interfaz común de los personajes animados y fábrica que elige la
// implementación según `data/assets.json`: procedural (piezas por código) o glTF.
import type { AbstractMesh, Scene, TransformNode, Vector3 } from '@babylonjs/core';
import type { AnimationDataDef, AssetEntry } from '../../data/worldSchema';
import type { AnimEvent } from '../../world/anim';
import type { AnimState } from '../../world/rigs';
import type { AssetCache } from '../assetCache';
import { GltfCharacter } from './gltfCharacter';
import { ProceduralCharacter } from './proceduralCharacter';

export interface PlayOptions {
  /** Multiplicador de velocidad de reproducción. */
  speed?: number;
  /** Reinicia aunque ya esté sonando (golpes repetidos). */
  restart?: boolean;
}

export interface CharacterModel {
  /** Nodo que la vista coloca en el suelo y orienta (+X local = hacia delante). */
  readonly root: TransformNode;
  /** Altura aproximada (para barras de vida). */
  readonly height: number;
  /** Mallas visibles (sombras) y la que sirve para el picking. */
  readonly meshes: readonly AbstractMesh[];
  readonly state: AnimState | null;
  /** ¿Terminó la animación actual (si no es en bucle)? */
  readonly finished: boolean;
  /** Instante del primer evento `hit`/`cast` del clip, normalizado (para sincronizar avisos). */
  impactTime(state: AnimState): number;
  /** Duración en segundos de un clip a velocidad 1. */
  clipSeconds(state: AnimState): number;
  play(state: AnimState, opts?: PlayOptions): void;
  /** Avanza la animación; `moveSpeed` (m/s) ajusta la cadencia al correr. */
  update(dt: number, moveSpeed: number): AnimEvent[];
  /** Punto de apoyo más bajo, en coordenadas del mundo (para los pasos). */
  lowestFoot(out: Vector3): Vector3;
  /** Brillo añadido a todo el personaje (golpes, avisos). */
  setEmissive(r: number, g: number, b: number): void;
  /** Multiplicador del color base (muerto, inactivo). */
  setShade(k: number): void;
  dispose(): void;
}

export function createCharacter(
  scene: Scene,
  assetId: string,
  /** Nombre único de esta copia (nodos y materiales). */
  name: string,
  entry: AssetEntry,
  anim: AnimationDataDef,
  cache: AssetCache,
  paletteId = 'default',
): CharacterModel {
  if (entry.kind === 'procedural') {
    const palette = entry.palettes[paletteId] ?? entry.palettes['default']!;
    return new ProceduralCharacter(scene, name, entry.model, entry.scale, palette, anim.models[entry.model], anim.blendSeconds);
  }
  return new GltfCharacter(scene, assetId, name, entry, cache, anim.blendSeconds);
}
