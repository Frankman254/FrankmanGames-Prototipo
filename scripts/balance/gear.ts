// Reglas simples de «jugador medio» fuera del combate: qué equipar, dónde
// gastar los puntos, qué vender y qué reponer. No son óptimas a propósito:
// representan a alguien que mira la comparación del tooltip y poco más.
import type { Character } from '../../src/rpg/character';
import type { EquipSlot, ItemDef, ItemInstance, PrimaryStat, StatId } from '../../src/rpg/contracts';
import { slotsFor } from '../../src/rpg/items';
import type { GameSession } from '../../src/rpg/session';

/** Arma a más de esta distancia = arma a distancia (como `RANGED_WEAPON_REACH` del mundo). */
const RANGED_REACH = 3;

/** Peso de cada estadística para decidir si un objeto mejora al personaje. */
export function statWeights(ch: Character): Partial<Record<StatId, number>> {
  const main = ch.mainStat ?? 'strength';
  const melee = isMelee(ch);
  const w: Partial<Record<StatId, number>> = {
    strength: 0.2,
    agility: 0.4,
    intellect: 0.2,
    vitality: 0.7,
    spirit: 0.2,
    maxHealth: 0.14,
    healthRegen: 2,
    maxResource: 0.08,
    resourceRegen: 0.6,
    power: 0.8,
    critChance: 80,
    critBonus: 10,
    moveSpeed: 0.6,
    cooldownReduction: 60,
    pickupRadius: 0.05,
  };
  w[main] = 1;
  // Los elementos de la clase: % por su estadística (ver damage.ts) y daño plano.
  for (const el of ch.affinity) {
    const st = ch.content.rules.elementStat[el];
    w[st] = Math.max(w[st] ?? 0, st === main ? 1 : 0.5);
    w[`damage.${el}`] = 1.5;
  }
  if (!melee) w.spirit = 0.6;
  for (const el of ['physical', 'fire', 'frost', 'storm', 'earth'] as const) w[`resist.${el}`] = el === 'physical' ? (melee ? 0.4 : 0.3) : 0.15;
  return w;
}

/** Cuerpo a cuerpo = su clase empieza con un arma de corto alcance (o sin arma). */
export function isMelee(ch: Character): boolean {
  return startingWeaponRange(ch) <= RANGED_REACH;
}

function startingWeaponRange(ch: Character): number {
  for (const s of ch.classDef.startingItems) {
    const w = ch.content.items[s.itemId]?.weapon;
    if (w) return w.range;
  }
  return 0;
}

function weaponValue(def: ItemDef | null): number {
  if (!def?.weapon) return 0;
  return ((def.weapon.min + def.weapon.max) / 2) * def.weapon.speed;
}

/** Cuánto mejora (o empeora) equipar `inst` en `slot`. -Infinity = no se puede o no encaja con la clase. */
export function upgradeScore(ch: Character, inst: ItemInstance, slot: EquipSlot): number {
  const def = ch.content.items[inst.itemId]!;
  if (!ch.canEquip(def, slot).ok) return -Infinity;
  if (def.weapon && (def.weapon.range > RANGED_REACH) !== (startingWeaponRange(ch) > RANGED_REACH)) return -Infinity;
  const w = statWeights(ch);
  let score = 0;
  for (const d of ch.compareEquip(inst.uid, slot)) score += (w[d.stat] ?? 0) * (d.after - d.before);
  if (slot === 'weapon') score += 3 * (weaponValue(def) - weaponValue(ch.weapon()));
  return score;
}

/** Equipa todo lo de la mochila que mejore la puntuación. Devuelve cuántos cambios hizo. */
export function equipUpgrades(s: GameSession): number {
  const ch = s.character;
  let changes = 0;
  for (let pass = 0; pass < 4; pass++) {
    let best: { uid: string; slot: EquipSlot; score: number } | null = null;
    for (const inst of ch.inventory.slots) {
      if (!inst) continue;
      const def = ch.content.items[inst.itemId]!;
      for (const slot of slotsFor(def)) {
        const sc = upgradeScore(ch, inst, slot);
        if (sc > 0.05 && (!best || sc > best.score)) best = { uid: inst.uid, slot, score: sc };
      }
    }
    if (!best) break;
    if (!s.equip(best.uid, best.slot).ok) break;
    changes++;
  }
  return changes;
}

/** Regla de puntos: dos a la estadística principal y uno a vitalidad, en ese orden. */
export function spendPoints(s: GameSession): void {
  const ch = s.character;
  const main: PrimaryStat = ch.mainStat ?? 'strength';
  while (ch.unspentStatPoints > 0) {
    const m = ch.allocated[main] ?? 0;
    const v = ch.allocated.vitality ?? 0;
    s.spendStatPoint(m < 2 * (v + 1) ? main : 'vitality');
  }
}

/** Aprende los pergaminos de la mochila (los repetidos suben de rango). */
export function learnScrolls(s: GameSession): void {
  for (const inst of [...s.character.inventory.slots]) {
    if (inst && s.content.items[inst.itemId]?.use?.kind === 'learnSpell') s.useItem(inst.uid);
  }
}

/** Invoca la primera mascota luchadora que tenga (o la primera que haya). */
export function summonPet(s: GameSession): void {
  const ch = s.character;
  if (ch.activePetItemUid) return;
  let pick: string | null = null;
  for (const inst of ch.inventory.slots) {
    const use = inst ? s.content.items[inst.itemId]?.use : undefined;
    if (use?.kind !== 'summonPet') continue;
    if (s.content.pets[use.petId]?.behavior === 'fighter') {
      pick = inst!.uid;
      break;
    }
    pick ??= inst!.uid;
  }
  if (pick) s.useItem(pick);
}

export interface SaleSummary {
  gold: number;
  /** Oro por categoría de lo vendido. */
  byCategory: Record<string, number>;
}

/**
 * Vende lo que no le sirve: materiales, peces, equipo que no mejora y
 * amuletos repetidos. Se queda pociones, tónicos y elixires.
 */
export function sellJunk(s: GameSession, merchantId: string): SaleSummary {
  const ch = s.character;
  const out: SaleSummary = { gold: 0, byCategory: {} };
  const seenCharm = new Set<string>();
  for (const inst of [...ch.inventory.slots]) {
    if (!inst) continue;
    const def = s.content.items[inst.itemId]!;
    let sell = false;
    if (def.category === 'material') sell = true;
    else if (def.id.startsWith('fish_')) sell = true;
    else if (def.slot) sell = def.level <= ch.level; // lo que mejoraba ya está puesto; lo de nivel mayor se guarda
    else if (def.category === 'petCharm') {
      sell = seenCharm.has(def.id) && inst.uid !== ch.activePetItemUid;
      seenCharm.add(def.id);
    }
    if (!sell) continue;
    const before = ch.gold;
    if (s.sell(merchantId, inst.uid, inst.quantity).ok) {
      const g = ch.gold - before;
      out.gold += g;
      out.byCategory[def.category] = (out.byCategory[def.category] ?? 0) + g;
    }
  }
  return out;
}

/** Repone pociones menores hasta `keep` si le alcanza el oro. Devuelve lo gastado. */
export function restockPotions(s: GameSession, merchantId: string, itemId: string, keep: number): number {
  const ch = s.character;
  const view = s.merchant(merchantId);
  const offer = view?.stock.find((o) => o.item.itemId === itemId);
  if (!offer) return 0;
  let spent = 0;
  while (ch.inventory.count(itemId) < keep && ch.gold >= offer.price) {
    if (!s.buy(merchantId, offer.index, 1).ok) break;
    spent += offer.price;
  }
  return spent;
}
