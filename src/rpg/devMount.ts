// Montura de desarrollador (F21): solo en `npm run dev` (o con la marca de pruebas). Va puesta
// desde el nivel 1 y corre mucho, para recorrer el mapa al probar. No se vende, no cae y
// ninguna misión la da: `tests/devMount.test.ts` lo vigila. Su modelo es de Codex
// (`assets/models/montura_arpia.glb`, un águila arpía); sin él usa la montura de siempre.
import type { Character } from './character';

export const DEV_MOUNT_ID = 'mount_dev_harpy';

/**
 * Le da la montura al personaje si no la tiene y se la pone si no lleva otra.
 * Devuelve true si cambió algo.
 */
export function grantDevMount(c: Character): boolean {
  if (!c.content.items[DEV_MOUNT_ID]) return false;
  if (c.equipment.slots.mount?.itemId === DEV_MOUNT_ID) return false;
  let changed = false;
  if (c.inventory.count(DEV_MOUNT_ID) === 0) {
    if (c.give(DEV_MOUNT_ID, 1) > 0) return false;
    changed = true;
  }
  if (!c.equipment.slots.mount) {
    const inst = c.inventory.slots.find((s) => s?.itemId === DEV_MOUNT_ID);
    if (inst && c.equip(inst.uid, 'mount').ok) changed = true;
  }
  return changed;
}
