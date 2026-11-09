// Armas y escudos en la mano según lo equipado (F17). Los modelos son de Codex, en
// `assets/models/equipo.glb`: un nodo `obj_<itemId>` por objeto, con el origen en el punto de
// agarre (contrato en docs/REPARTO_CODEX.md). El archivo se carga una vez; cada personaje
// clona solo lo que lleva. Si un objeto aún no tiene modelo, el personaje usa la pieza
// genérica de su tipo que trae su propio GLB.
import '@babylonjs/loaders/glTF';
import { LoadAssetContainerAsync, Quaternion, type AssetContainer, type Matrix, type Node, type Scene, type TransformNode } from '@babylonjs/core';

const FILES: Record<string, string> = import.meta.glob('/assets/models/equipo.glb', { query: '?url', import: 'default', eager: true });
const GEAR_URL = FILES['/assets/models/equipo.glb'];

/** Mano de cada hueco, con los nombres de hueso del esqueleto común (`scripts/blender/fg_rig.py`). */
export const HAND_JOINT = { weapon: 'handR', offhand: 'handL' } as const;
export type HeldSlot = keyof typeof HAND_JOINT;

/** Hueso donde va cada hueco: el arco se sujeta con la izquierda y la derecha tensa la cuerda. */
export function heldJoint(slot: HeldSlot, weapon: string): string {
  return slot === 'weapon' && weapon === 'bow' ? HAND_JOINT.offhand : HAND_JOINT[slot];
}

/** Piezas que trae el GLB del personaje y que lo equipado sustituye (las del diseño o las genéricas). */
export const DESIGN_PARTS: Readonly<Record<HeldSlot, readonly string[]>> = {
  weapon: ['Lanza', 'Arma_espada', 'Arma_baston', 'Arma_arco'],
  offhand: ['Escudo'],
};

/** Piezas del diseño que tapa lo puesto en la cabeza o la espalda; el pelo, solo si lo tapa entero. */
export const WORN_PARTS = { head: ['Capucha', 'Yelmo', 'Banda'], back: ['Capa'] } as const;
export const HAIR_PARTS = ['Pelo', 'Pelo_corto', 'Pelo_largo'] as const;

/** Nombre del nodo del modelo de un objeto. */
export const gearNodeName = (itemId: string): string => `obj_${itemId}`;

let loading: Promise<AssetContainer | null> | null = null;

function gearFile(scene: Scene): Promise<AssetContainer | null> {
  if (!GEAR_URL) return Promise.resolve(null);
  loading ??= LoadAssetContainerAsync(GEAR_URL, scene, { pluginExtension: '.glb' }).catch((err: unknown) => {
    console.warn('[equipo] no se pudo cargar equipo.glb', err);
    return null;
  });
  return loading;
}

/** Busca el modelo de un objeto en el archivo cargado. */
function findGear(c: AssetContainer, itemId: string): TransformNode | null {
  const name = gearNodeName(itemId);
  return (c.transformNodes.find((n) => n.name === name) ?? c.meshes.find((m) => m.name === name) ?? null) as TransformNode | null;
}

/**
 * Pone en la mano el modelo del objeto. Devuelve true si lo encontró: entonces la pieza del
 * diseño o genérica de ese hueco sobra.
 */
export async function attachHeld(scene: Scene, itemId: string, hand: Node, prefix: string, local?: Matrix): Promise<boolean> {
  const c = await gearFile(scene);
  const src = c ? findGear(c, itemId) : null;
  if (!src) return false;
  const copy = src.clone(`${prefix}:${src.name}`, hand as TransformNode, false);
  if (!copy) return false;
  if (local) {
    copy.rotationQuaternion ??= new Quaternion();
    local.decompose(copy.scaling, copy.rotationQuaternion, copy.position);
  }
  copy.setEnabled(true);
  for (const m of copy.getChildMeshes(false)) m.isPickable = false;
  return true;
}
