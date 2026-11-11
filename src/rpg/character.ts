// El personaje del jugador: clase, nivel, puntos, inventario, equipo, libro de
// hechizos y mascota activa. Fuentes de su `StatSheet`:
//   class · level · points · item:<uid> · set:<id> · pet:<id> · status:<id> · derived:<primaria>
import { defaultAppearance, normalizeAppearance, type Appearance } from './appearance';
import type { Rng } from '../sim/rng';
import type { CharacterSex } from './contracts';
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
import { displacedBy, Equipment, equipmentSources, Inventory, isDualWielding, isTwoHanded, ItemFactory, migrateInstance, sameItemProperties, slotsFor, type EquipMap } from './items';
import { BankStorage } from './bank';
import { addXp, xpToNext } from './progression';
import { allocatedStatCapital, statPointCost, type PointCost, type PointCosts } from './statCapital';
import { Spellbook, hotbarFillOrder } from './spells';
import { blockToMods, SHEET_ORDER, type Mod, type StatSheet } from './stats';
import type { Vec2 } from '../sim/vec2';
import { SpectralState } from './spectral';
import { ProfessionLog } from './professions';
import { progressionGainsOf } from './progressionConfig';

export type Hand = 'weapon' | 'offhand';

/** Arma del próximo ataque básico (`equipo-objetos`). */
export interface BasicSwing {
  /** null = sin arma (puños). */
  def: ItemDef | null;
  hand: Hand;
  /** Multiplicador del daño del arma (la izquierda pega menos; datos). */
  damage: number;
  /** Multiplicador de golpes por segundo (con dos armas se golpea más rápido; datos). */
  speed: number;
}

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
  /** Reparaciones de UID hechas al cargar el guardado (vacío si estaba sano). */
  readonly loadRepairs: string[] = [];
  readonly inventory: Inventory;
  readonly bank: BankStorage;
  readonly equipment: Equipment;
  readonly spellbook: Spellbook;
  /** Amuleto (uid en el inventario) de la mascota invocada. */
  activePetItemUid: string | null = null;
  /** Enfriamiento de uso por id de objeto (consumibles). */
  readonly itemCooldowns: Record<string, number> = {};
  /** Con dos armas, mano del próximo ataque básico (alterna). */
  nextHand: Hand = 'weapon';
  spectral: SpectralState;
  professions: ProfessionLog;
  /** Objetos del guardado que no cupieron al migrarlo (la sesión los pone en el botín). */
  readonly displaced: ItemInstance[] = [];
  private _health = 1;
  resource = 0;
  body: Body | null = null;
  private listeners: ((e: SessionEvent) => void)[] = [];

  /** P09: elegido al crear el personaje; decide su modelo o su figura. */
  sex: CharacterSex = 'masculino';
  /** Cara, peinado y colores elegidos al crearlo; sin ellos, los de su clase. */
  appearance: Appearance | null = null;

  constructor(readonly content: RpgContent, classId: string, public name: string, rng: Rng) {
    super(content.rules.derived);
    this.spectral = new SpectralState(content.spectral);
    this.professions = new ProfessionLog(content.professions);
    const cls = content.classes[classId];
    if (!cls) throw new Error(`clase desconocida: ${classId}`);
    this.classDef = cls;
    this.mainStat = cls.mainStat ?? highestPrimary(cls);
    this.affinity = cls.affinity;
    this.affinityBonus = cls.affinityBonus;
    this.items = new ItemFactory(content, rng);
    this.inventory = new Inventory(content, content.progression.inventorySize, this.items);
    this.bank = new BankStorage(content, this.items);
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

  /**
   * Modo edición: los datos de `data/rpg/*.json` se reemplazaron en sitio.
   * El personaje conserva nivel, equipo y mochila; sólo vuelve a leer la
   * semántica que dependía de los datos (estadísticas, oficios, espectro).
   */
  applyContent(): void {
    this.spectral.def = this.content.spectral;
    this.professions.def = this.content.professions;
    this.refreshLevel();
    this.refreshEquipment();
    this.refreshPet();
  }

  // ─── Fuentes de estadísticas ──────────────────────────────────────────────

  private refreshLevel(): void {
    const n = this.level - 1;
    this.spellbook.level = this.level;
    const levelMods = blockToMods(this.classDef.statsPerLevel).map((m) => ({ ...m, value: m.value * n }));
    if (this.content.progression.healthPerLevel > 0) levelMods.push({ stat: 'maxHealth', op: 'flat', value: this.content.progression.healthPerLevel * n });
    this.stats.set('level', levelMods);
    this.stats.set('points', blockToMods(this.allocated as Record<StatId, number>));
    this.refreshCarryCapacity();
  }

  private refreshCarryCapacity(): void {
    this.inventory.setMaxWeight((this.content.progression.inventoryMaxWeight ?? this.content.progression.inventorySize)
      + this.content.progression.inventoryWeightPerLevel * (this.level - 1)
      + this.stats.get('carryCapacity'));
  }

  private refreshEquipment(): void {
    applyEquipment(this.stats, this.content, this.equipment.slots);
    this.refreshCarryCapacity();
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

  /** Reglas de coste del catálogo maestro (characteristics.json). */
  private get pointCosts(): PointCosts {
    const out: Record<PrimaryStat, PointCost> = {} as Record<PrimaryStat, PointCost>;
    for (const s of PRIMARY_STATS) out[s] = this.content.characteristics[s].pointCost;
    return out;
  }

  /** Coste del siguiente punto de `stat` según la regla vigente. */
  costOfNextStatPoint(stat: PrimaryStat): number {
    return statPointCost(stat, this.allocated[stat] ?? 0, this.pointCosts);
  }

  spendStatPoint(stat: PrimaryStat): CommandResult {
    if (!PRIMARY_STATS.includes(stat)) return fail('Estadística no válida');
    const cost = this.costOfNextStatPoint(stat);
    if (this.unspentStatPoints < cost) return fail(`Hacen falta ${cost} puntos`);
    this.unspentStatPoints -= cost;
    this.allocated[stat] = (this.allocated[stat] ?? 0) + 1;
    this.refreshLevel();
    return OK;
  }

  /**
   * Gasta hasta `budget` puntos libres en una característica (Infinity = todos),
   * subiendo de uno en uno mientras alcance para el coste del siguiente.
   */
  spendStatPoints(stat: PrimaryStat, budget: number): CommandResult {
    if (!PRIMARY_STATS.includes(stat)) return fail('Estadística no válida');
    let left = Math.min(this.unspentStatPoints, Math.max(0, Math.floor(budget)));
    let raised = 0;
    for (;;) {
      const cost = this.costOfNextStatPoint(stat);
      if (cost > left) break;
      left -= cost;
      this.unspentStatPoints -= cost;
      this.allocated[stat] = (this.allocated[stat] ?? 0) + 1;
      raised++;
    }
    if (!raised) return fail(`Hacen falta ${this.costOfNextStatPoint(stat)} puntos`);
    this.refreshLevel();
    return OK;
  }

  /** Capital que devolvería un reinicio ahora: la nueva regla sobre las unidades guardadas. */
  get allocatedCapital(): number {
    return allocatedStatCapital(this.allocated, this.pointCosts);
  }

  resetStatPoints(): CommandResult {
    const refunded = this.allocatedCapital;
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
  /** Suma experiencia de oficio y avisa si sube de nivel. */
  gainProfessionXp(id: string, xp: number): void {
    const gained = this.professions.gain(id, xp);
    if (gained > 0) this.emit({ type: 'message', text: `${this.content.professions.professions[id]?.name ?? id} sube a nivel ${this.professions.level(id)}` });
    this.emit({ type: 'changed' });
  }

  pickUp(inst: ItemInstance, mandatory = false): number {
    const total = inst.quantity;
    const itemId = inst.itemId;
    const left = mandatory ? this.inventory.addTransferred(inst) : this.inventory.add(inst);
    if (left < total) {
      this.emit({ type: 'loot', itemId, quantity: total - left });
      this.emit({ type: 'changed' });
    }
    if (left > 0) this.emit({ type: 'message', text: 'Límite de peso de la mochila' });
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

  /**
   * Del inventario al hueco; lo que hubiera vuelve al hueco del inventario que
   * queda libre. Un arma de dos manos guarda lo de la mano izquierda, y poner
   * algo en la izquierda guarda el arma de dos manos (hace falta sitio).
   */
  equip(uid: string, slot?: EquipSlot): CommandResult {
    const idx = this.inventory.indexOf(uid);
    if (idx < 0) return fail('No está en el inventario');
    const inst = this.inventory.slots[idx]!;
    const def = this.content.items[inst.itemId]!;
    const check = this.canEquip(def, slot);
    if (!check.ok) return check;
    const target = slot ?? this.equipment.defaultSlot(def)!;
    const out = displacedBy(this.content, this.equipment.slots, def, target);
    if (inst.uid === this.activePetItemUid) this.setActivePet(null);
    this.inventory.slots[idx] = null;
    const prev = this.equipment.put(target, inst);
    if (prev) this.inventory.slots[idx] = prev;
    for (const s of out) {
      const taken = this.equipment.take(s);
      if (taken) this.inventory.addTransferred(taken);
    }
    if (target === 'weapon' || target === 'offhand' || out.length > 0) this.nextHand = 'weapon';
    this.refreshEquipment();
    return OK;
  }

  unequip(slot: EquipSlot): CommandResult {
    const inst = this.equipment.get(slot);
    if (!inst) return fail('Hueco vacío');
    this.equipment.take(slot);
    this.inventory.addTransferred(inst);
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
    const map: EquipMap = { ...this.equipment.slots, [target]: inst };
    for (const s of displacedBy(this.content, this.equipment.slots, def, target)) delete map[s];
    applyEquipment(after, this.content, map);
    const out: StatDelta[] = [];
    const stats = new Set<StatId>([...SHEET_ORDER, ...this.stats.lines().map((l) => l.stat), ...after.lines().map((l) => l.stat)]);
    for (const s of stats) {
      const before = this.stats.get(s);
      const now = after.get(s);
      if (Math.abs(before - now) > 1e-9) out.push({ stat: s, before, after: now });
    }
    return out;
  }

  /** Arma de la mano derecha (o null = sin arma). */
  weapon(): ItemDef | null {
    return this.equipment.weapon();
  }

  /** Arma de la mano izquierda (null si va vacía o con escudo). */
  offhandWeapon(): ItemDef | null {
    return this.equipment.offhandWeapon();
  }

  dualWielding(): boolean {
    return isDualWielding(this.content, this.equipment.slots);
  }

  /**
   * Arma del próximo ataque básico. Con dos armas alterna derecha e izquierda
   * (la izquierda con `rules.dualWield.offhandDamage`, y las dos con
   * `attackSpeed`); con una sola arma en la izquierda, pega con ella sin más.
   */
  basicSwing(): BasicSwing {
    const main = this.weapon();
    const off = this.offhandWeapon();
    const dw = this.content.rules.dualWield;
    if (main && off) {
      return this.nextHand === 'offhand'
        ? { def: off, hand: 'offhand', damage: dw.offhandDamage, speed: dw.attackSpeed }
        : { def: main, hand: 'weapon', damage: 1, speed: dw.attackSpeed };
    }
    if (main) return { def: main, hand: 'weapon', damage: 1, speed: 1 };
    if (off) return { def: off, hand: 'offhand', damage: 1, speed: 1 };
    return { def: null, hand: 'weapon', damage: 1, speed: 1 };
  }

  /** Tras un ataque básico: con dos armas, la otra mano va después. */
  swung(): void {
    this.nextHand = this.dualWielding() && this.nextHand === 'weapon' ? 'offhand' : 'weapon';
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
    const clone = (i: ItemInstance): ItemInstance => ({
      uid: i.uid,
      itemId: i.itemId,
      quantity: i.quantity,
      rolled: i.rolled.map((m) => ({ ...m })),
      ...(i.bonus?.length ? { bonus: i.bonus.map((m) => ({ ...m })) } : {}),
      ...(i.look ? { look: i.look } : {}),
    });
    const equipment: SaveData['equipment'] = {};
    for (const s of EQUIP_SLOTS) {
      const it = this.equipment.get(s);
      if (it) equipment[s] = clone(it);
    }
    const sb = this.spellbook.view();
    return {
      version: 3,
      savedAt: now.toISOString(),
      name: this.name,
      classId: this.classDef.id,
      sex: this.sex,
      ...(this.appearance ? { appearance: { ...this.appearance } } : {}),
      level: this.level,
      xp: this.xp,
      gold: this.gold,
      allocated: { ...this.allocated },
      unspentStatPoints: this.unspentStatPoints,
      progressionGains: progressionGainsOf(this.content),
      inventory: this.inventory.slots.map((s) => (s ? clone(s) : null)),
      bank: this.bank.toSave(),
      equipment,
      known: sb.known,
      hotbar: sb.hotbar,
      activePetItemUid: this.activePetItemUid,
      spectral: this.spectral.toSave(),
      professions: this.professions.toSave(),
    };
  }

  /** Personaje nuevo: conoce su kit, pero llega al mundo sin nada equipado. */
  static create(content: RpgContent, classId: string, name: string, rng: Rng): Character {
    const c = new Character(content, classId, name, rng);
    for (const s of c.classDef.startingSpells) c.spellbook.known.set(s, 1);
    c.classDef.startingHotbar.forEach((s, i) => (c.spellbook.hotbar[hotbarFillOrder(c.spellbook.hotbar.length)[i]!] = s));
    for (const si of c.classDef.startingItems) c.give(si.itemId, si.quantity);
    c.restore();
    return c;
  }

  /** Reconstruye desde un guardado. Los objetos o hechizos que ya no existan se descartan. */
  /** ¿Hay ya un objeto con este UID en la mochila, el equipo o el banco? */
  ownsUid(uid: string): boolean {
    return this.inventory.find(uid) !== null || EQUIP_SLOTS.some((s) => this.equipment.get(s)?.uid === uid) || this.bank.view().some((i) => i.uid === uid);
  }

  static fromSave(content: RpgContent, save: SaveData, rng: Rng): Character {
    if (save.version !== 3) throw new Error(`versión de guardado no soportada: ${String(save.version)}`);
    const c = new Character(content, save.classId, save.name, rng);
    c.sex = save.sex === 'femenino' ? 'femenino' : 'masculino';
    c.appearance = save.appearance ? normalizeAppearance(save.appearance, defaultAppearance(save.classId, c.sex)) : null;
    c.spectral = new SpectralState(content.spectral, save.spectral);
    c.professions = new ProfessionLog(content.professions, save.professions);
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
    // Migración (`equipo-objetos`): cada copia se ajusta a su definición actual.
    const copy = (i: ItemInstance): ItemInstance => {
      c.items.observe(i.uid);
      const inst: ItemInstance = { uid: i.uid, itemId: i.itemId, quantity: i.quantity, rolled: (i.rolled ?? []).map((m) => ({ ...m })) };
      if (Array.isArray(i.bonus) && i.bonus.length) inst.bonus = i.bonus.map((m) => ({ ...m }));
      // Apariencia guardada: solo si sigue siendo una variante elegible del objeto.
      if (typeof i.look === 'string' && content.items[i.itemId]!.mount?.variants?.includes(i.look)) inst.look = i.look;
      migrateInstance(content.items[i.itemId]!, inst);
      return inst;
    };
    // Un UID identifica un solo objeto en todo el personaje (C01).
    const clean = reconcileSavedUids(save, valid, c.items, c.loadRepairs);
    clean.inventory.forEach((i, idx) => {
      if (i) c.inventory.restoreAt(idx, copy(i));
    });
    c.bank.restore(clean.bank);
    // Lo equipado que ya no encaja (otro hueco, o la izquierda con un arma de
    // dos manos) vuelve a la mochila; si no cabe, al botín pendiente.
    const loose: ItemInstance[] = [];
    for (const s of EQUIP_SLOTS) {
      const i = clean.equipment[s];
      if (!i) continue;
      if (slotsFor(content.items[i.itemId]!).includes(s)) c.equipment.put(s, copy(i));
      else loose.push(copy(i));
    }
    const offhand = c.equipment.get('offhand');
    if (offhand && isTwoHanded(c.weapon())) loose.push(c.equipment.take('offhand')!);
    for (const inst of loose) c.inventory.addTransferred(inst);
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

/**
 * Repara UID repetidos de un guardado antes de restaurarlo. Se recorre equipo,
 * mochila y banco, por ese orden (lo puesto manda). La misma pieza repetida
 * (mismo objeto y propiedades) se queda una sola vez: es una copia, y conservarla
 * duplicaría el objeto. Objetos diferentes que comparten UID se conservan todos
 * y el segundo recibe uno nuevo. Cada reparación queda anotada en `repairs`.
 */
function reconcileSavedUids(
  save: SaveData,
  valid: (i: ItemInstance | null | undefined) => i is ItemInstance,
  factory: ItemFactory,
  repairs: string[],
): { inventory: (ItemInstance | null)[]; equipment: Partial<Record<EquipSlot, ItemInstance>>; bank: ItemInstance[] } {
  const inventory = save.inventory.map((i) => (valid(i) ? i : null));
  const bank = (Array.isArray(save.bank) ? save.bank : []).filter(valid);
  const equipment: Partial<Record<EquipSlot, ItemInstance>> = {};
  for (const s of EQUIP_SLOTS) if (valid(save.equipment[s])) equipment[s] = save.equipment[s];
  const all = [...EQUIP_SLOTS.map((s) => equipment[s]), ...inventory, ...bank].filter((i): i is ItemInstance => !!i);
  // Primero se observan todos, para que un UID nuevo no choque con uno que aún no se ha visitado.
  for (const i of all) if (typeof i.uid === 'string') factory.observe(i.uid);
  const seen = new Map<string, ItemInstance>();
  const resolve = (i: ItemInstance, where: string): ItemInstance | null => {
    const hasUid = typeof i.uid === 'string' && i.uid !== '';
    const first = hasUid ? seen.get(i.uid) : undefined;
    if (hasUid && !first) {
      seen.set(i.uid, i);
      return i;
    }
    if (first && first.itemId === i.itemId && sameItemProperties(first, i)) {
      repairs.push(`${i.uid}: copia de ${i.itemId} en ${where} descartada`);
      return null;
    }
    const uid = factory.newUid();
    repairs.push(`${String(i.uid)}: ${i.itemId} en ${where} recibe el UID ${uid}`);
    const renamed = { ...i, uid };
    seen.set(uid, renamed);
    return renamed;
  };
  for (const s of EQUIP_SLOTS) {
    const i = equipment[s];
    if (!i) continue;
    const r = resolve(i, `equipo (${s})`);
    if (r) equipment[s] = r;
    else delete equipment[s];
  }
  const cleanInventory = inventory.map((i) => (i ? resolve(i, 'mochila') : null));
  const cleanBank = bank.map((i) => resolve(i, 'banco')).filter((i): i is ItemInstance => i !== null);
  if (repairs.length > 0) console.warn(`[guardado] ${save.name}: ${repairs.length} objetos reparados`, repairs);
  return { inventory: cleanInventory, equipment, bank: cleanBank };
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
