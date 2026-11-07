// Catálogo de pruebas (creador, 2026-11-07: «mete todos los ítems del juego en el inventario
// para analizarlos»). Solo en `npm run dev`: una unidad de cada objeto que el personaje aún no
// tenga; lo que no cabe en la mochila va al banco. Se hace una vez por personaje.
import type { Character } from './character';

export interface CatalogResult {
  bag: number;
  bank: number;
}

/** Ids de todos los objetos del juego que el personaje no lleva en mochila, equipo ni banco. */
export function missingItems(c: Character): string[] {
  const owned = new Set<string>();
  for (const s of c.inventory.slots) if (s) owned.add(s.itemId);
  for (const s of Object.values(c.equipment.slots)) if (s) owned.add(s.itemId);
  for (const s of c.bank.view()) owned.add(s.itemId);
  return Object.keys(c.content.items).filter((id) => !owned.has(id)).sort();
}

/** Da una unidad de cada objeto que falte: primero a la mochila y el resto al banco. */
export function grantAllItems(c: Character): CatalogResult {
  const out: CatalogResult = { bag: 0, bank: 0 };
  const overflow = [];
  for (const id of missingItems(c)) {
    if (c.give(id, 1) === 0) out.bag++;
    else overflow.push(c.items.create(id, 1));
  }
  if (overflow.length) {
    c.bank.restore([...c.bank.toSave(), ...overflow]);
    out.bank = overflow.length;
  }
  return out;
}
