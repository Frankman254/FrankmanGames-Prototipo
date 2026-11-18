// Montura de desarrollador (F21): solo en `npm run dev` (o con la marca de pruebas). Va puesta
// desde el nivel 1 y corre mucho, para recorrer el mapa al probar. No se vende, no cae y
// ninguna misión la da: `tests/devMount.test.ts` lo vigila. Su modelo es el águila arpía esculpida
// de MOD-01 (`assets/models/aguila_arpia.glb`); sin él usa la montura de siempre. La arpía anterior
// (`montura_arpia.glb`) queda desactivada sin borrar.
// Además deja en la mochila las monturas de arte en revisión: Diostedé y Crestalba.
import type { Character } from './character';

export const DEV_MOUNT_ID = 'mount_dev_harpy';
/** Diostedé de pruebas: va a la mochila para probar el modelo, sus clips de vuelo y sus variantes. */
export const DEV_DIOSTEDE_ID = 'mount_dev_diostede';
/** Crestalba: ave original de cresta bifurcada, siete clips y diez apariencias. */
export const DEV_CRESTALBA_ID = 'mount_dev_crestalba';
/** Falcopama: ave de alas anchas, siete clips y diez apariencias (MOD-02b). */
export const DEV_FALCOPAMA_ID = 'mount_dev_falcopama';
/** Objetos que solo existen en desarrollo: no salen de botín, tiendas ni misiones. */
export const DEV_ONLY_ITEM_IDS: readonly string[] = [DEV_MOUNT_ID, DEV_DIOSTEDE_ID, DEV_CRESTALBA_ID, DEV_FALCOPAMA_ID];

/**
 * Le da la montura al personaje si no la tiene y se la pone si no lleva otra.
 * Devuelve true si cambió algo.
 */
export function grantDevMount(c: Character): boolean {
    if (!c.content.items[DEV_MOUNT_ID]) return false;
    let changed = false;
    // El Diostedé va a la mochila (sin ponerla), también en partidas que ya llevan la arpía.
    if (
        c.content.items[DEV_DIOSTEDE_ID] &&
        c.inventory.count(DEV_DIOSTEDE_ID) === 0 &&
        c.equipment.slots.mount?.itemId !== DEV_DIOSTEDE_ID &&
        c.give(DEV_DIOSTEDE_ID, 1) === 0
    )
        changed = true;
    if (
        c.content.items[DEV_CRESTALBA_ID] &&
        c.inventory.count(DEV_CRESTALBA_ID) === 0 &&
        c.equipment.slots.mount?.itemId !== DEV_CRESTALBA_ID &&
        c.give(DEV_CRESTALBA_ID, 1) === 0
    )
        changed = true;
    if (
        c.content.items[DEV_FALCOPAMA_ID] &&
        c.inventory.count(DEV_FALCOPAMA_ID) === 0 &&
        c.equipment.slots.mount?.itemId !== DEV_FALCOPAMA_ID &&
        c.give(DEV_FALCOPAMA_ID, 1) === 0
    )
        changed = true;
    if (c.equipment.slots.mount?.itemId === DEV_MOUNT_ID) return changed;
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
