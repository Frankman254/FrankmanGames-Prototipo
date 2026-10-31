// El personaje del jugador: clase, nivel, puntos, inventario, equipo, libro de
// hechizos y mascota activa. Fuentes de su `StatSheet`:
//   class · level · points · item:<uid> · set:<id> · pet:<id> · status:<id> · derived:<primaria>
import type { Rng } from '../sim/rng';
import { Actor } from './actor';
import {
  EQUIP_SLOTS,
  PRIMARY_STATS,
  type ClassDef,
  type CommandResult,
  type EquipSlot,
  type ItemDef,
  type ItemInstance,
  type PlayerView,
  type PrimaryStat,
  type SaveData,
  type SessionEvent,
  type StatDelta,
  type StatId,
} from './contracts';
import type { RpgContent } from './content';
import { Equipment, equipmentSources, Inventory, ItemFactory, slotsFor, type EquipMap } from './items';
import { addXp, xpToNext } from './progression';
import { Spellbook } from './spells';
import { blockToMods, SHEET_ORDER, type Mod, type StatSheet } from './stats';
import type { Vec2 } from '../sim/vec2';

export const OK: CommandResult = { ok: true };
export const fail = (reason: string): CommandResult => ({ ok: false, reason });

/** Lo que el mundo le presta al personaje mientras juega (posición). */
export interface Body {
  pos: Vec2;
}

export class Character extends Actor {
  readonly team = 'player';
  readonly classDef: ClassDef;
  level = 1;
  xp = 0;
  gold = 0;
  unspentStatPoints = 0;
  readonly allocated: Partial<Record<PrimaryStat, number>> = {};
  readonly items: ItemFactory;
  readonly inventory: Inventory;
  readonly equipment: Equipment;
  readonly spellbook: Spellbook;
  /** Amuleto (uid en el inventario) de la mascota invocada. */
  activePetItemUid: string | null = null;
  /** Enfriamiento de uso por id de objeto (consumibles). */
  readonly itemCooldowns: Record<string, number> = {};
  private _health = 1;
  resource = 0;
  body: Body | null = null;
  private listeners: ((e: SessionEvent) => void)[] = [];

  constructor(readonly content: RpgContent, classId: string, public name: string, rng: Rng) {
    super(content.rules.derived);
    const cls = content.classes[classId];
    if (!cls) throw new Error(`clase desconocida: ${classId}`);
    this.classDef = cls;
    this.mainStat = cls.mainStat ?? highestPrimary(cls);
    this.affinity = cls.affinity;
    this.affinityBonus = cls.affinityBonus;
    this.items = new ItemFactory(content, rng);
    this.inventory = new Inventory(content, content.progression.inventorySize, this.items);
    this.equipment = new Equipment(content);
    this.spellbook = new Spellbook(content, content.progression.hotbarSize);
    this.stats.set('class', [
      { stat: 'maxResource', op: 'flat', value: cls.resource.max },
      { stat: 'resourceRegen', op: 'flat', value: cls.resource.regenPerSecond },
      ...blockToMods(cls.baseStats),
    ]);
    this.refreshLevel();
    this.restore();
  }

  get pos(): Vec2 {
    return this.body?.pos ?? { x: 0, y: 0 };
  }

  get health(): number {
    return this._health;
  }

  set health(v: number) {
    this._health = v;
  }

  get maxResource(): number {
    return Math.max(0, Math.round(this.stats.get('maxResource')));
  }

  /** Vida y recurso al máximo (partida nueva, subida de nivel, reinicio de arena). */
  restore(): void {
    this._health = this.maxHealth;
    this.resource = this.maxResource;
  }

  /** Recorta vida y recurso si el máximo bajó (al desequipar, por ejemplo). */
  clampPools(): void {
    this._health = Math.min(this._health, this.maxHealth);
    this.resource = Math.min(this.resource, this.maxResource);
  }

  // ─── Sucesos ──────────────────────────────────────────────────────────────

  on(listener: (e: SessionEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  emit(e: SessionEvent): void {
    for (const l of [...this.listeners]) l(e);
  }

  // ─── Fuentes de estadísticas ──────────────────────────────────────────────

  private refreshLevel(): void {
    const n = this.level - 1;
    this.spellbook.level = this.level;
    this.stats.set('level', blockToMods(this.classDef.statsPerLevel).map((m) => ({ ...m, value: m.value * n })));
    this.stats.set('points', blockToMods(this.allocated as Record<StatId, number>));
  }

  private refreshEquipment(): void {
    applyEquipment(this.stats, this.content, this.equipment.slots);
    this.clampPools();
  }

  private refreshPet(): void {
    this.stats.removePrefix('pet:');
    const pet = this.activePetId();
    if (pet) this.stats.set(`pet:${pet}`, this.content.pets[pet]!.ownerBonus);
    this.clampPools();
  }

  // ─── Progresión ──────────────────────────────────────────────────────────

  get xpToNext(): number {
    return xpToNext(this.content.progression, this.level);
  }

  /** Suma XP; cada nivel ganado da puntos, restaura vida/recurso y avisa. */
  gainXp(amount: number): void {
    if (amount <= 0) return;
    const r = addXp(this.content.progression, this.level, this.xp, amount);
    this.xp = r.xp;
    for (let i = 0; i < r.levelsGained; i++) {
      this.level++;
      this.unspentStatPoints += this.content.progression.statPointsPerLevel;
      this.refreshLevel();
      this.restore();
      this.unlockClassSpellsForLevel(true);
      this.spellbook.slotNewlyUsable(this.level);
      this.emit({ type: 'levelUp', level: this.level });
    }
    this.emit({ type: 'changed' });
  }

  spendStatPoint(stat: PrimaryStat): CommandResult {
    if (!PRIMARY_STATS.includes(stat)) return fail('Estadística no válida');
    if (this.unspentStatPoints <= 0) return fail('No quedan puntos');
    this.unspentStatPoints--;
    this.allocated[stat] = (this.allocated[stat] ?? 0) + 1;
    this.refreshLevel();
    return OK;
  }

  resetStatPoints(): CommandResult {
    const refunded = PRIMARY_STATS.reduce((sum, stat) => sum + (this.allocated[stat] ?? 0), 0);
    if (refunded <= 0) return fail('No hay puntos asignados para reiniciar');
    for (const stat of PRIMARY_STATS) delete this.allocated[stat];
    this.unspentStatPoints += refunded;
    this.refreshLevel();
    this.clampPools();
    return OK;
  }

  /** Aprende los hechizos propios cuyo nivel ya se alcanzó y ocupa el primer hueco libre. */
  private unlockClassSpellsForLevel(announce: boolean): void {
    const spells = Object.values(this.content.spells)
      .filter((spell) => spell.classId === this.classDef.id && (spell.unlockLevel ?? 1) <= this.level)
      .sort((a, b) => (a.unlockLevel ?? 1) - (b.unlockLevel ?? 1));
    for (const spell of spells) {
      if (this.spellbook.rank(spell.id) > 0) continue;
      this.spellbook.learn(spell.id);
      if (announce) this.emit({ type: 'learned', spellId: spell.id });
    }
  }

  addGold(amount: number): void {
    if (amount <= 0) return;
    this.gold += amount;
    this.emit({ type: 'gold', amount });
    this.emit({ type: 'changed' });
  }

  /** Recoge una instancia. Devuelve lo que no cupo (0 = todo). */
  pickUp(inst: ItemInstance): number {
    const total = inst.quantity;
    const itemId = inst.itemId;
    const left = this.inventory.add(inst);
    if (left < total) {
      this.emit({ type: 'loot', itemId, quantity: total - left });
      this.emit({ type: 'changed' });
    }
    if (left > 0) this.emit({ type: 'message', text: 'Inventario lleno' });
    return left;
  }

  /** Da un objeto nuevo (kit inicial, tests). */
  give(itemId: string, quantity = 1): number {
    let left = quantity;
    const max = this.content.items[itemId]!.maxStack;
    while (left > 0) {
      const n = Math.min(left, max);
      const rest = this.inventory.add(this.items.create(itemId, n));
      left -= n - rest;
      if (rest > 0) break;
    }
    return left;
  }

  learnSpell(spellId: string): CommandResult {
    const def = this.content.spells[spellId];
    if (!def) return fail('Hechizo desconocido');
    const r = this.spellbook.learn(spellId);
    if (r.kind === 'maxed') return fail('Ya está al rango máximo');
    this.emit({ type: 'learned', spellId });
    this.emit({ type: 'message', text: r.kind === 'learned' ? `Aprendes ${def.name}` : `${def.name} sube a rango ${r.rank}` });
    return OK;
  }

  // ─── Equipo ───────────────────────────────────────────────────────────────

  canEquip(def: ItemDef, slot?: EquipSlot): CommandResult {
    const options = slotsFor(def);
    if (options.length === 0) return fail('No se puede equipar');
    if (slot && !options.includes(slot)) return fail('No va en ese hueco');
    if (def.level > this.level) return fail(`Requiere nivel ${def.level}`);
    return OK;
  }

  /** Del inventario al hueco; lo que hubiera vuelve al hueco del inventario que queda libre. */
  equip(uid: string, slot?: EquipSlot): CommandResult {
    const idx = this.inventory.indexOf(uid);
    if (idx < 0) return fail('No está en el inventario');
    const inst = this.inventory.slots[idx]!;
    const def = this.content.items[inst.itemId]!;
    const check = this.canEquip(def, slot);
    if (!check.ok) return check;
    const target = slot ?? this.equipment.defaultSlot(def)!;
    if (inst.uid === this.activePetItemUid) this.setActivePet(null);
    this.inventory.slots[idx] = null;
    const prev = this.equipment.put(target, inst);
    if (prev) this.inventory.slots[idx] = prev;
    this.refreshEquipment();
    return OK;
  }

  unequip(slot: EquipSlot): CommandResult {
    const inst = this.equipment.get(slot);
    if (!inst) return fail('Hueco vacío');
    if (this.inventory.freeSlots() === 0) return fail('Inventario lleno');
    this.equipment.take(slot);
    this.inventory.add(inst);
    this.refreshEquipment();
    return OK;
  }

  /** Diferencias de estadísticas si se equipara `uid` (en `slot` o en el de por defecto). */
  compareEquip(uid: string, slot?: EquipSlot): StatDelta[] {
    const inst = this.inventory.find(uid);
    if (!inst) return [];
    const def = this.content.items[inst.itemId]!;
    const target = slot ?? this.equipment.defaultSlot(def);
    if (!target || !slotsFor(def).includes(target)) return [];
    const after = this.stats.clone();
    applyEquipment(after, this.content, { ...this.equipment.slots, [target]: inst });
    const out: StatDelta[] = [];
    const stats = new Set<StatId>([...SHEET_ORDER, ...this.stats.lines().map((l) => l.stat), ...after.lines().map((l) => l.stat)]);
    for (const s of stats) {
      const before = this.stats.get(s);
      const now = after.get(s);
      if (Math.abs(before - now) > 1e-9) out.push({ stat: s, before, after: now });
    }
    return out;
  }

  /** Arma equipada (o null = sin arma). */
  weapon(): ItemDef | null {
    return this.equipment.weapon();
  }

  // ─── Mascota ──────────────────────────────────────────────────────────────

  activePetId(): string | null {
    if (!this.activePetItemUid) return null;
    const inst = this.inventory.find(this.activePetItemUid);
    const use = inst ? this.content.items[inst.itemId]?.use : undefined;
    return use?.kind === 'summonPet' ? use.petId : null;
  }

  /** Invoca la mascota de un amuleto (null = retirarla). Sólo una activa. */
  setActivePet(itemUid: string | null): void {
    this.activePetItemUid = itemUid;
    if (itemUid && !this.activePetId()) this.activePetItemUid = null;
    this.refreshPet();
  }

  /** Tras quitar objetos: si el amuleto activo ya no está, la mascota se va. */
  checkPetCharm(): void {
    if (this.activePetItemUid && !this.inventory.find(this.activePetItemUid)) this.setActivePet(null);
  }

  // ─── Tiempo ──────────────────────────────────────────────────────────────

  /** Regeneración y enfriamientos de objetos (los estados los avanza el mundo). */
  tickTimers(dt: number): void {
    for (const id in this.itemCooldowns) {
      this.itemCooldowns[id] = Math.max(0, this.itemCooldowns[id]! - dt);
      if (this.itemCooldowns[id] === 0) delete this.itemCooldowns[id];
    }
    if (!this.alive) return;
    this.resource = Math.min(this.maxResource, this.resource + this.stats.get('resourceRegen') * dt);
    this._health = Math.min(this.maxHealth, this._health + this.stats.get('healthRegen') * dt);
  }

  // ─── Vistas y guardado ───────────────────────────────────────────────────

  view(): PlayerView {
    return {
      name: this.name,
      classId: this.classDef.id,
      level: this.level,
      xp: this.xp,
      xpToNext: this.xpToNext,
      health: Math.ceil(this.health),
      maxHealth: this.maxHealth,
      resource: Math.floor(this.resource),
      maxResource: this.maxResource,
      gold: this.gold,
      unspentStatPoints: this.unspentStatPoints,
      stats: this.stats.lines(),
      statuses: this.statuses.view(),
    };
  }

  toSave(now: Date): SaveData {
    const clone = (i: ItemInstance): ItemInstance => ({ uid: i.uid, itemId: i.itemId, quantity: i.quantity, rolled: i.rolled.map((m) => ({ ...m })) });
    const equipment: SaveData['equipment'] = {};
    for (const s of EQUIP_SLOTS) {
      const it = this.equipment.get(s);
      if (it) equipment[s] = clone(it);
    }
    const sb = this.spellbook.view();
    return {
      version: 1,
      savedAt: now.toISOString(),
      name: this.name,
      classId: this.classDef.id,
      level: this.level,
      xp: this.xp,
      gold: this.gold,
      allocated: { ...this.allocated },
      unspentStatPoints: this.unspentStatPoints,
      inventory: this.inventory.slots.map((s) => (s ? clone(s) : null)),
      equipment,
      known: sb.known,
      hotbar: sb.hotbar,
      activePetItemUid: this.activePetItemUid,
    };
  }

  /** Personaje nuevo con el kit de su clase (equipa lo que pueda). */
  static create(content: RpgContent, classId: string, name: string, rng: Rng): Character {
    const c = new Character(content, classId, name, rng);
    for (const s of c.classDef.startingSpells) c.spellbook.known.set(s, 1);
    c.classDef.startingHotbar.forEach((s, i) => (c.spellbook.hotbar[i] = s));
    for (const si of c.classDef.startingItems) c.give(si.itemId, si.quantity);
    for (const inst of [...c.inventory.slots]) {
      if (!inst) continue;
      const def = content.items[inst.itemId]!;
      const slot = c.equipment.defaultSlot(def);
      if (slot && !c.equipment.get(slot) && c.canEquip(def).ok) c.equip(inst.uid, slot);
    }
    c.restore();
    return c;
  }

  /** Reconstruye desde un guardado. Los objetos o hechizos que ya no existan se descartan. */
  static fromSave(content: RpgContent, save: SaveData, rng: Rng): Character {
    if (save.version !== 1) throw new Error(`versión de guardado no soportada: ${String(save.version)}`);
    const c = new Character(content, save.classId, save.name, rng);
    const p = content.progression;
    c.level = Math.max(1, Math.min(p.maxLevel, Math.floor(save.level)));
    c.spellbook.level = c.level;
    c.xp = Math.max(0, save.xp);
    c.gold = Math.max(0, Math.floor(save.gold));
    c.unspentStatPoints = Math.max(0, Math.floor(save.unspentStatPoints));
    for (const s of PRIMARY_STATS) {
      const v = save.allocated[s];
      if (v && v > 0) c.allocated[s] = Math.floor(v);
    }
    const valid = (i: ItemInstance | null | undefined): i is ItemInstance => !!i && !!content.items[i.itemId] && i.quantity > 0;
    const copy = (i: ItemInstance): ItemInstance => {
      c.items.observe(i.uid);
      return { uid: i.uid, itemId: i.itemId, quantity: Math.min(i.quantity, content.items[i.itemId]!.maxStack), rolled: i.rolled.map((m) => ({ ...m })) };
    };
    save.inventory.slice(0, c.inventory.size).forEach((i, idx) => {
      if (valid(i)) c.inventory.slots[idx] = copy(i);
    });
    for (const s of EQUIP_SLOTS) {
      const i = save.equipment[s];
      if (valid(i) && slotsFor(content.items[i.itemId]!).includes(s)) c.equipment.put(s, copy(i));
    }
    for (const k of save.known) {
      const def = content.spells[k.spellId];
      const ownSpellAvailable = def?.classId !== c.classDef.id || (def.unlockLevel ?? 1) <= c.level;
      if (def && ownSpellAvailable) c.spellbook.known.set(k.spellId, Math.max(1, Math.min(def.maxRank, Math.floor(k.rank))));
    }
    save.hotbar.slice(0, c.spellbook.hotbar.length).forEach((s, i) => {
      c.spellbook.hotbar[i] = s !== null && c.spellbook.equipBlock(s) === null ? s : null;
    });
    c.unlockClassSpellsForLevel(false);
    c.refreshLevel();
    c.refreshEquipment();
    c.setActivePet(save.activePetItemUid);
    c.restore();
    return c;
  }
}

/** Sustituye en `sheet` las fuentes de equipo (objetos y sets) por las de `map`. */
function applyEquipment(sheet: StatSheet, content: RpgContent, map: EquipMap): void {
  sheet.removePrefix('item:');
  sheet.removePrefix('set:');
  for (const [src, mods] of equipmentSources(content, map)) sheet.set(src, mods as Mod[]);
}

function highestPrimary(cls: ClassDef): PrimaryStat {
  let best: PrimaryStat = 'strength';
  for (const s of PRIMARY_STATS) if ((cls.baseStats[s] ?? 0) > (cls.baseStats[best] ?? 0)) best = s;
  return best;
}
