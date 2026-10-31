// `GameSessionApi` de mentira para construir y probar la interfaz mientras la
// rama `slice03-sistemas` hace la lógica real. Implementa el contrato con reglas
// simples y deterministas (semilla), sin tocar `src/sim/`. Se sustituye por la
// fábrica real en una sola línea de `src/main.ts`.
import {
  EQUIP_SLOTS,
  ELEMENTS,
  PRIMARY_STATS,
  type CommandResult,
  type ContentDb,
  type EffectDef,
  type EquipSlot,
  type EquipmentView,
  type GameSessionApi,
  type GameSessionFactory,
  type HotbarSlotState,
  type InventoryView,
  type ItemDef,
  type ItemInstance,
  type PetView,
  type PlayerView,
  type PrimaryStat,
  type QuickUseKind,
  type SaveData,
  type SessionEvent,
  type SpellbookView,
  type StatDelta,
  type StatId,
  type StatLine,
  type StatModifier,
} from '../../../rpg/contracts';
import { FAKE_CONTENT } from './content';

/** Orden en que la hoja de personaje lista las estadísticas. */
export const STAT_ORDER: StatId[] = [
  ...PRIMARY_STATS,
  'maxHealth', 'maxResource', 'healthRegen', 'resourceRegen',
  'power', 'critChance', 'critBonus', 'moveSpeed', 'cooldownReduction', 'pickupRadius', 'slowResist',
  ...ELEMENTS.map((e) => `damage.${e}` as const),
  ...ELEMENTS.map((e) => `resist.${e}` as const),
];

const CATEGORY_ORDER = ['weapon', 'armor', 'jewel', 'consumable', 'scroll', 'petCharm', 'material', 'quest'];
const RARITY_ORDER = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

const ok: CommandResult = { ok: true };
const fail = (reason: string): CommandResult => ({ ok: false, reason });

/** mulberry32: suficiente para tiradas de ejemplo reproducibles. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Cooldown {
  remaining: number;
  total: number;
}

export interface FakeOptions {
  /** Partida avanzada con mochila llena, para enseñar todas las pantallas. */
  demo?: boolean;
}

export class FakeSession implements GameSessionApi {
  readonly content: ContentDb = FAKE_CONTENT;

  private name: string;
  private classId: string;
  private level: number;
  private xp: number;
  private gold: number;
  private allocated: Partial<Record<PrimaryStat, number>>;
  private unspent: number;
  private inv: (ItemInstance | null)[];
  private equipped: Partial<Record<EquipSlot, ItemInstance>>;
  private known: { spellId: string; rank: number }[];
  private hotbar: (string | null)[];
  private activePetUid: string | null;

  private health = 0;
  private resource = 0;
  private petHealth = 60;
  private statuses: { statusId: string; remaining: number; stacks: number }[] = [];
  private readonly spellCd = new Map<string, Cooldown>();
  private gcd: Cooldown = { remaining: 0, total: 0 };
  private readonly itemCd = new Map<string, number>();
  private readonly listeners = new Set<(e: SessionEvent) => void>();
  private readonly random: () => number;
  private nextUid = 1;

  constructor(save: SaveData, seed: number) {
    this.random = rng(seed);
    this.name = save.name;
    this.classId = save.classId;
    this.level = save.level;
    this.xp = save.xp;
    this.gold = save.gold;
    this.allocated = { ...save.allocated };
    this.unspent = save.unspentStatPoints;
    const size = this.content.progression.inventorySize;
    this.inv = Array.from({ length: size }, (_, i) => (save.inventory[i] ? { ...save.inventory[i]! } : null));
    this.equipped = { ...save.equipment };
    this.known = save.known.map((k) => ({ ...k }));
    this.hotbar = Array.from({ length: this.content.progression.hotbarSize }, (_, i) => save.hotbar[i] ?? null);
    this.activePetUid = save.activePetItemUid;
    for (const it of [...this.inv, ...Object.values(this.equipped)]) {
      const n = it ? Number(it.uid.replace(/\D/g, '')) : 0;
      if (n >= this.nextUid) this.nextUid = n + 1;
    }
    this.health = this.stat('maxHealth');
    this.resource = this.stat('maxResource');
  }

  /** Partida nueva con el kit de la clase (y, en modo demo, una mochila llena). */
  static create(classId: string, name: string, seed: number, opts: FakeOptions = {}): FakeSession {
    const cls = FAKE_CONTENT.classes[classId];
    if (!cls) throw new Error(`Clase desconocida: ${classId}`);
    const s = new FakeSession(
      {
        version: 1, savedAt: '', name, classId, level: 1, xp: 0, gold: 15, allocated: {}, unspentStatPoints: 0,
        inventory: [], equipment: {}, known: cls.startingSpells.map((spellId) => ({ spellId, rank: 1 })),
        hotbar: cls.startingHotbar, activePetItemUid: null,
      },
      seed,
    );
    for (const it of cls.startingItems) s.addItem(it.itemId, it.quantity);
    // El kit inicial sale equipado.
    for (const it of [...s.inv]) if (it && s.def(it).slot) s.equip(it.uid);
    if (opts.demo) s.fillDemo();
    s.health = s.stat('maxHealth');
    s.resource = s.stat('maxResource');
    return s;
  }

  private fillDemo(): void {
    this.level = 4;
    this.xp = 310;
    this.gold = 137;
    this.allocated = this.classId === 'ember_vanguard' ? { strength: 4, vitality: 2 } : { intellect: 4, spirit: 2 };
    this.unspent = 3;
    for (const id of [
      'woodcutter_axe', 'smith_mace', 'oak_staff', 'storm_orb', 'explorer_hood', 'explorer_gloves', 'explorer_boots',
      'apprentice_cap', 'apprentice_sandals', 'dented_helm', 'ring_mail', 'pine_buckler', 'copper_ring', 'thrush_ring',
      'amber_amulet', 'frost_pendant', 'scroll_light_bandage', 'scroll_stoneskin', 'scroll_wolf_spirit', 'scroll_gust',
      'charm_ash_fox', 'charm_archive_owl', 'charm_moss_tortoise',
    ]) this.addItem(id, 1);
    this.addItem('health_potion', 3);
    this.addItem('haste_elixir', 2);
    this.addItem('wolf_fang', 7);
    this.addItem('leather_scrap', 4);
    this.addItem('copper_ore', 12);
    this.addItem('faint_essence', 2);
    for (const id of ['explorer_boots', 'copper_ring', 'amber_amulet', 'explorer_hood']) {
      const it = this.inv.find((x) => x?.itemId === id);
      if (it) this.equip(it.uid);
    }
    const extra = this.classId === 'ember_vanguard' ? 'searing_brand' : 'static_field';
    this.known.push({ spellId: extra, rank: 1 }, { spellId: 'light_bandage', rank: 2 });
    this.hotbar[4] = extra;
    this.hotbar[5] = 'light_bandage';
    this.known[0]!.rank = 3;
    const fox = this.inv.find((x) => x?.itemId === 'charm_ash_fox');
    if (fox) this.activePetUid = fox.uid;
    this.statuses.push({ statusId: 'haste', remaining: 45, stacks: 1 }, { statusId: 'burn', remaining: 3.5, stacks: 2 });
  }

  // ─── Vistas ───────────────────────────────────────────────────────────────

  player(): PlayerView {
    const stats = this.statLines();
    const get = (id: StatId): number => stats.find((s) => s.stat === id)?.value ?? 0;
    return {
      name: this.name,
      classId: this.classId,
      level: this.level,
      xp: this.xp,
      xpToNext: this.xpToNext(this.level),
      health: Math.round(this.health),
      maxHealth: Math.round(get('maxHealth')),
      resource: Math.round(this.resource),
      maxResource: Math.round(get('maxResource')),
      gold: this.gold,
      unspentStatPoints: this.unspent,
      stats,
      statuses: this.statuses.map((s) => ({ ...s })),
    };
  }

  inventory(): InventoryView {
    return { size: this.inv.length, slots: this.inv.map((x) => (x ? { ...x } : null)) };
  }

  equipment(): EquipmentView {
    const out = {} as EquipmentView;
    for (const s of EQUIP_SLOTS) out[s] = this.equipped[s] ? { ...this.equipped[s]! } : null;
    return out;
  }

  spellbook(): SpellbookView {
    return { known: this.known.map((k) => ({ ...k })), hotbar: [...this.hotbar] };
  }

  pet(): PetView | null {
    const uid = this.activePetUid;
    if (!uid) return null;
    const it = this.findItem(uid);
    const use = it ? this.def(it).use : undefined;
    if (!it || use?.kind !== 'summonPet') return null;
    return { petId: use.petId, itemUid: uid, health: this.petHealth, maxHealth: 60 };
  }

  hotbarState(): HotbarSlotState[] {
    return this.hotbar.map((spellId) => {
      if (!spellId) return { spellId, cooldownRemaining: 0, cooldownTotal: 0, affordable: true };
      const cd = this.spellCd.get(spellId) ?? { remaining: 0, total: 0 };
      const run = cd.remaining >= this.gcd.remaining ? cd : this.gcd;
      return {
        spellId,
        cooldownRemaining: run.remaining,
        cooldownTotal: run.total,
        affordable: this.resource >= this.spellCost(spellId),
      };
    });
  }

  // ─── Órdenes ──────────────────────────────────────────────────────────────

  equip(uid: string, slot?: EquipSlot): CommandResult {
    const index = this.inv.findIndex((x) => x?.uid === uid);
    if (index < 0) return fail('No está en la mochila');
    const it = this.inv[index]!;
    const def = this.def(it);
    const target = slot ?? this.defaultSlot(def);
    if (!target || !this.fits(def, target)) return fail('No va en ese hueco');
    if (def.level > this.level) return fail(`Requiere nivel ${def.level}`);
    const old = this.equipped[target] ?? null;
    this.equipped[target] = it;
    this.inv[index] = old;
    this.afterStatsChange();
    return this.changed();
  }

  unequip(slot: EquipSlot): CommandResult {
    const it = this.equipped[slot];
    if (!it) return fail('Hueco vacío');
    const free = this.inv.indexOf(null);
    if (free < 0) return fail('Mochila llena');
    this.inv[free] = it;
    delete this.equipped[slot];
    this.afterStatsChange();
    return this.changed();
  }

  useItem(uid: string): CommandResult {
    const index = this.inv.findIndex((x) => x?.uid === uid);
    if (index < 0) return fail('No está en la mochila');
    const it = this.inv[index]!;
    const def = this.def(it);
    if (def.slot) return this.equip(uid);
    const use = def.use;
    if (!use) return fail('No se puede usar');
    if (use.kind === 'summonPet') {
      this.activePetUid = this.activePetUid === uid ? null : uid;
      this.petHealth = 60;
      this.afterStatsChange();
      if (this.activePetUid) this.emit({ type: 'message', text: `${this.content.pets[use.petId]!.name} acude a tu lado` });
      return this.changed();
    }
    if (use.kind === 'learnSpell') {
      const known = this.known.find((k) => k.spellId === use.spellId);
      const sp = this.content.spells[use.spellId]!;
      if (known && known.rank >= sp.maxRank) return fail('Rango máximo');
      if (known) known.rank++;
      else this.known.push({ spellId: use.spellId, rank: 1 });
      this.consume(index);
      this.emit({ type: 'learned', spellId: use.spellId });
      return this.changed();
    }
    const cd = this.itemCd.get(def.id) ?? 0;
    if (cd > 0) return fail(`Espera ${cd.toFixed(1)} s`);
    for (const e of use.effects) this.applySelf(e, 1);
    this.itemCd.set(def.id, use.cooldown);
    this.consume(index);
    return this.changed();
  }

  dropItem(uid: string, quantity: number): CommandResult {
    const index = this.inv.findIndex((x) => x?.uid === uid);
    if (index < 0) return fail('No está en la mochila');
    const it = this.inv[index]!;
    if (it.uid === this.activePetUid) this.activePetUid = null;
    const q = Math.max(1, Math.min(quantity, it.quantity));
    if (q >= it.quantity) this.inv[index] = null;
    else this.inv[index] = { ...it, quantity: it.quantity - q };
    this.afterStatsChange();
    return this.changed();
  }

  moveItem(fromIndex: number, toIndex: number): CommandResult {
    const n = this.inv.length;
    if (fromIndex < 0 || fromIndex >= n || toIndex < 0 || toIndex >= n) return fail('Hueco no válido');
    if (fromIndex === toIndex) return ok;
    const a = this.inv[fromIndex];
    const b = this.inv[toIndex];
    if (!a) return fail('Hueco vacío');
    if (b && b.itemId === a.itemId && this.def(a).maxStack > 1) {
      const room = this.def(a).maxStack - b.quantity;
      if (room > 0) {
        const moved = Math.min(room, a.quantity);
        this.inv[toIndex] = { ...b, quantity: b.quantity + moved };
        this.inv[fromIndex] = a.quantity - moved > 0 ? { ...a, quantity: a.quantity - moved } : null;
        return this.changed();
      }
    }
    this.inv[toIndex] = a;
    this.inv[fromIndex] = b ?? null;
    return this.changed();
  }

  sortInventory(): CommandResult {
    const all = this.inv.filter((x): x is ItemInstance => x !== null);
    // Junta montones del mismo objeto antes de ordenar.
    const merged: ItemInstance[] = [];
    for (const it of all) {
      const max = this.def(it).maxStack;
      let left = it.quantity;
      for (const m of merged) {
        if (left === 0) break;
        if (m.itemId !== it.itemId || m.quantity >= max) continue;
        const moved = Math.min(left, max - m.quantity);
        m.quantity += moved;
        left -= moved;
      }
      if (left > 0) merged.push({ ...it, quantity: left });
    }
    merged.sort((x, y) => {
      const a = this.def(x);
      const b = this.def(y);
      return (
        CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
        RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) ||
        a.name.localeCompare(b.name, 'es')
      );
    });
    this.inv = Array.from({ length: this.inv.length }, (_, i) => merged[i] ?? null);
    return this.changed();
  }

  assignHotbar(index: number, spellId: string | null): CommandResult {
    if (index < 0 || index >= this.hotbar.length) return fail('Hueco no válido');
    if (spellId !== null && !this.known.some((k) => k.spellId === spellId)) return fail('No conoces ese hechizo');
    const prev = spellId === null ? -1 : this.hotbar.indexOf(spellId);
    // Si ya estaba en otro hueco, se intercambian.
    if (prev >= 0 && prev !== index) this.hotbar[prev] = this.hotbar[index] ?? null;
    this.hotbar[index] = spellId;
    return this.changed();
  }

  spendStatPoint(stat: PrimaryStat): CommandResult {
    if (this.unspent <= 0) return fail('No quedan puntos');
    this.unspent--;
    this.allocated[stat] = (this.allocated[stat] ?? 0) + 1;
    this.afterStatsChange();
    return this.changed();
  }

  resetStatPoints(): CommandResult {
    const refunded = PRIMARY_STATS.reduce((sum, stat) => sum + (this.allocated[stat] ?? 0), 0);
    if (refunded <= 0) return fail('No hay puntos asignados para reiniciar');
    for (const stat of PRIMARY_STATS) delete this.allocated[stat];
    this.unspent += refunded;
    this.afterStatsChange();
    return this.changed();
  }

  compareEquip(uid: string): StatDelta[] {
    const it = this.findItem(uid);
    if (!it) return [];
    const def = this.def(it);
    const slot = this.defaultSlot(def);
    if (!slot) return [];
    const before = this.statLines();
    const after = this.statLines({ ...this.equipped, [slot]: it });
    const out: StatDelta[] = [];
    for (const b of before) {
      const a = after.find((x) => x.stat === b.stat)!;
      if (Math.abs(a.value - b.value) > 1e-6) out.push({ stat: b.stat, before: b.value, after: a.value });
    }
    return out;
  }

  sellValue(uid: string): number {
    const it = this.findItem(uid);
    if (!it) return 0;
    return Math.max(1, Math.floor(this.def(it).value * 0.3)) * it.quantity;
  }

  castHotbar(index: number): CommandResult {
    const spellId = this.hotbar[index];
    if (!spellId) return fail('Hueco vacío');
    const sp = this.content.spells[spellId]!;
    const cd = this.spellCd.get(spellId);
    if (cd && cd.remaining > 0) return fail('En enfriamiento');
    if (this.gcd.remaining > 0) return fail('Enfriamiento global');
    const cost = this.spellCost(spellId);
    if (this.resource < cost) return fail(`Falta ${this.classDef().resource.name.toLowerCase()}`);
    this.resource -= cost;
    const cdr = Math.min(0.5, this.stat('cooldownReduction'));
    if (sp.cooldown > 0) this.spellCd.set(spellId, { remaining: sp.cooldown * (1 - cdr), total: sp.cooldown * (1 - cdr) });
    if (sp.globalCooldown > 0) this.gcd = { remaining: sp.globalCooldown, total: sp.globalCooldown };
    if (sp.area.type === 'self') {
      const rank = this.known.find((k) => k.spellId === spellId)?.rank ?? 1;
      for (const e of sp.effects) this.applySelf(e, 1 + ((rank - 1) * sp.perRank.effectPercent) / 100);
    }
    return ok;
  }

  quickUse(kind: QuickUseKind): CommandResult {
    const wanted = kind === 'health' ? 'heal' : 'restoreResource';
    const candidates = this.inv.filter((x): x is ItemInstance => {
      const use = x ? this.def(x).use : undefined;
      return use?.kind === 'effects' && use.effects.some((e) => e.type === wanted);
    });
    if (candidates.length === 0) return fail(kind === 'health' ? 'No te quedan pociones de vida' : 'No te quedan tónicos');
    // La más pequeña primero: no se gasta la buena si la menor basta.
    candidates.sort((a, b) => this.def(a).value - this.def(b).value);
    return this.useItem(candidates[0]!.uid);
  }

  save(): SaveData {
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      name: this.name,
      classId: this.classId,
      level: this.level,
      xp: this.xp,
      gold: this.gold,
      allocated: { ...this.allocated },
      unspentStatPoints: this.unspent,
      inventory: this.inv.map((x) => (x ? { ...x, rolled: x.rolled.map((r) => ({ ...r })) } : null)),
      equipment: Object.fromEntries(Object.entries(this.equipped).map(([k, v]) => [k, { ...v! }])),
      known: this.known.map((k) => ({ ...k })),
      hotbar: [...this.hotbar],
      activePetItemUid: this.activePetUid,
    };
  }

  on(listener: (e: SessionEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ─── Simulación de mentira (sólo para que el HUD se vea vivo) ─────────────

  /** Avanza regeneración, enfriamientos y estados. No emite `changed`: el HUD sondea. */
  tick(dt: number): void {
    const maxHp = this.stat('maxHealth');
    const maxRes = this.stat('maxResource');
    this.health = Math.min(maxHp, this.health + this.stat('healthRegen') * dt);
    this.resource = Math.min(maxRes, this.resource + this.stat('resourceRegen') * dt);
    for (const cd of this.spellCd.values()) cd.remaining = Math.max(0, cd.remaining - dt);
    this.gcd.remaining = Math.max(0, this.gcd.remaining - dt);
    for (const [k, v] of this.itemCd) this.itemCd.set(k, Math.max(0, v - dt));
    let expired = false;
    for (const s of this.statuses) {
      const def = this.content.statuses[s.statusId];
      const before = s.remaining;
      s.remaining -= dt;
      if (def?.tick && Math.floor(before / def.tick.every) !== Math.floor(Math.max(0, s.remaining) / def.tick.every)) {
        this.applySelf(def.tick.effect, s.stacks);
      }
      if (s.remaining <= 0) expired = true;
    }
    if (expired) {
      this.statuses = this.statuses.filter((s) => s.remaining > 0);
      this.afterStatsChange();
    }
  }

  /** Puente de demostración: una baja en la arena da XP y algo de botín. */
  grantKill(): void {
    const table = this.content.lootTables['meadow_wolf']!;
    if (this.random() < table.gold.chance) {
      const g = table.gold.min + Math.floor(this.random() * (table.gold.max - table.gold.min + 1));
      this.gold += g;
      this.emit({ type: 'gold', amount: g });
    }
    if (this.random() < table.chance) {
      const total = table.entries.reduce((a, e) => a + e.weight, 0);
      let r = this.random() * total;
      const entry = table.entries.find((e) => (r -= e.weight) < 0) ?? table.entries[0]!;
      const q = (entry.min ?? 1) + Math.floor(this.random() * ((entry.max ?? 1) - (entry.min ?? 1) + 1));
      if (this.addItem(entry.itemId, q) < q) this.emit({ type: 'loot', itemId: entry.itemId, quantity: q });
    }
    this.grantXp(45);
  }

  grantXp(amount: number): void {
    this.xp += amount;
    const max = this.content.progression.maxLevel;
    while (this.level < max && this.xp >= this.xpToNext(this.level)) {
      this.xp -= this.xpToNext(this.level);
      this.level++;
      this.unspent += this.content.progression.statPointsPerLevel;
      this.afterStatsChange();
      this.health = this.stat('maxHealth');
      this.resource = this.stat('maxResource');
      this.emit({ type: 'levelUp', level: this.level });
    }
    this.changed();
  }

  /** Mete un objeto (apilando primero). Devuelve cuántos no cupieron. */
  addItem(itemId: string, quantity: number): number {
    const def = this.content.items[itemId];
    if (!def) throw new Error(`Objeto desconocido: ${itemId}`);
    let left = quantity;
    if (def.maxStack > 1) {
      for (let i = 0; i < this.inv.length && left > 0; i++) {
        const it = this.inv[i];
        if (!it || it.itemId !== itemId || it.quantity >= def.maxStack) continue;
        const moved = Math.min(left, def.maxStack - it.quantity);
        this.inv[i] = { ...it, quantity: it.quantity + moved };
        left -= moved;
      }
    }
    while (left > 0) {
      const free = this.inv.indexOf(null);
      if (free < 0) break;
      const q = Math.min(left, def.maxStack);
      this.inv[free] = this.instance(def, q);
      left -= q;
    }
    return left;
  }

  // ─── Internos ─────────────────────────────────────────────────────────────

  private instance(def: ItemDef, quantity: number): ItemInstance {
    const rolled = def.rolls.map((r) => {
      const integral = Number.isInteger(r.min) && Number.isInteger(r.max);
      const v = r.min + this.random() * (r.max - r.min);
      return { stat: r.stat, op: r.op, value: integral ? Math.round(v) : Math.round(v * 100) / 100 };
    });
    return { uid: `it${this.nextUid++}`, itemId: def.id, quantity, rolled };
  }

  private def(it: ItemInstance): ItemDef {
    return this.content.items[it.itemId]!;
  }

  private classDef() {
    return this.content.classes[this.classId]!;
  }

  private findItem(uid: string): ItemInstance | null {
    return this.inv.find((x) => x?.uid === uid) ?? Object.values(this.equipped).find((x) => x?.uid === uid) ?? null;
  }

  private fits(def: ItemDef, slot: EquipSlot): boolean {
    if (def.slot === 'ring') return slot === 'ring1' || slot === 'ring2';
    return def.slot === slot;
  }

  private defaultSlot(def: ItemDef): EquipSlot | null {
    if (!def.slot) return null;
    if (def.slot !== 'ring') return def.slot;
    if (!this.equipped.ring1) return 'ring1';
    if (!this.equipped.ring2) return 'ring2';
    return 'ring1';
  }

  private consume(index: number): void {
    const it = this.inv[index]!;
    this.inv[index] = it.quantity > 1 ? { ...it, quantity: it.quantity - 1 } : null;
  }

  private spellCost(spellId: string): number {
    const sp = this.content.spells[spellId]!;
    const rank = this.known.find((k) => k.spellId === spellId)?.rank ?? 1;
    return Math.round(sp.resourceCost * (1 - ((rank - 1) * sp.perRank.costPercent) / 100));
  }

  private applySelf(e: EffectDef, scale: number): void {
    const roll = (min: number, max: number): number => (min + this.random() * (max - min)) * scale;
    switch (e.type) {
      case 'heal':
        this.health = Math.min(this.stat('maxHealth'), this.health + roll(e.min, e.max));
        break;
      case 'damage':
        this.health = Math.max(1, this.health - roll(e.min, e.max));
        break;
      case 'restoreResource':
        this.resource = Math.min(this.stat('maxResource'), this.resource + e.amount * scale);
        break;
      case 'status': {
        const def = this.content.statuses[e.statusId]!;
        const cur = this.statuses.find((s) => s.statusId === e.statusId);
        const duration = e.duration ?? def.duration;
        if (cur) {
          cur.remaining = duration;
          cur.stacks = Math.min(def.maxStacks, cur.stacks + 1);
        } else this.statuses.push({ statusId: e.statusId, remaining: duration, stacks: 1 });
        this.afterStatsChange();
        break;
      }
      default:
        break; // escudo, desplazamientos, invocaciones: sin efecto en la sesión falsa
    }
  }

  private afterStatsChange(): void {
    this.health = Math.min(this.health, this.stat('maxHealth'));
    this.resource = Math.min(this.resource, this.stat('maxResource'));
  }

  private changed(): CommandResult {
    this.emit({ type: 'changed' });
    return ok;
  }

  private emit(e: SessionEvent): void {
    for (const l of [...this.listeners]) l(e);
  }

  private xpToNext(level: number): number {
    const { base, exponent } = this.content.progression.xp;
    return Math.round(base * level ** exponent);
  }

  private stat(id: StatId): number {
    return this.statLines().find((s) => s.stat === id)?.value ?? 0;
  }

  /** Pila de modificadores por fuente → valor + desglose. */
  private statLines(equipped: Partial<Record<EquipSlot, ItemInstance>> = this.equipped): StatLine[] {
    const cls = this.classDef();
    const mods: StatModifier[] = [];
    const add = (stat: StatId, op: 'flat' | 'percent', value: number, source: string): void => {
      if (value !== 0) mods.push({ stat, op, value, source });
    };
    for (const [k, v] of Object.entries(cls.baseStats)) add(k as StatId, 'flat', v, 'class');
    add('maxResource', 'flat', cls.resource.max, 'class');
    add('resourceRegen', 'flat', cls.resource.regenPerSecond, 'class');
    for (const [k, v] of Object.entries(cls.statsPerLevel)) add(k as StatId, 'flat', v * (this.level - 1), 'level');
    for (const [k, v] of Object.entries(this.allocated)) add(k as StatId, 'flat', v, 'points');
    const setCounts = new Map<string, number>();
    for (const it of Object.values(equipped)) {
      if (!it) continue;
      const def = this.def(it);
      for (const m of [...def.implicit, ...it.rolled]) add(m.stat, m.op, m.value, `item:${it.uid}`);
      if (def.setId) setCounts.set(def.setId, (setCounts.get(def.setId) ?? 0) + 1);
    }
    for (const [setId, n] of setCounts) {
      for (const b of this.content.sets[setId]?.bonuses ?? []) {
        if (n >= b.pieces) for (const m of b.modifiers) add(m.stat, m.op, m.value, `set:${setId}`);
      }
    }
    const pet = this.activePetUid ? this.findItem(this.activePetUid) : null;
    const petUse = pet ? this.def(pet).use : undefined;
    if (petUse?.kind === 'summonPet') {
      for (const m of this.content.pets[petUse.petId]!.ownerBonus) add(m.stat, m.op, m.value, `pet:${petUse.petId}`);
    }
    for (const s of this.statuses) {
      for (const m of this.content.statuses[s.statusId]?.modifiers ?? []) add(m.stat, m.op, m.value * s.stacks, `status:${s.statusId}`);
    }

    const lines = new Map<StatId, StatLine>();
    const total = (stat: StatId): number => {
      const ms = mods.filter((m) => m.stat === stat);
      const f = ms.filter((m) => m.op === 'flat').reduce((a, m) => a + m.value, 0);
      const p = ms.filter((m) => m.op === 'percent').reduce((a, m) => a + m.value, 0);
      return f * (1 + p / 100);
    };
    // Derivadas de las principales (regla de mentira): vitalidad → vida, espíritu → recurso.
    add('maxHealth', 'flat', Math.floor(total('vitality')) * 4, 'derived:vitality');
    add('resourceRegen', 'percent', Math.floor(total('spirit')) * 1, 'derived:spirit');
    for (const stat of STAT_ORDER) {
      const ms = mods.filter((m) => m.stat === stat);
      lines.set(stat, {
        stat,
        value: Math.round(total(stat) * 1000) / 1000,
        breakdown: ms.map((m) => ({ source: m.source, op: m.op, value: m.value })),
      });
    }
    return STAT_ORDER.map((s) => lines.get(s)!);
  }
}

export interface FakeFactoryOptions extends FakeOptions {
  /** Se llama con cada sesión creada (para el puente de demostración de `main.ts`). */
  onSession?: (s: FakeSession) => void;
}

export function createFakeFactory(opts: FakeFactoryOptions = {}): GameSessionFactory {
  return {
    content: FAKE_CONTENT,
    newGame(classId, name, seed) {
      const s = FakeSession.create(classId, name, seed, opts);
      opts.onSession?.(s);
      return s;
    },
    load(save, seed) {
      const s = new FakeSession(save, seed);
      opts.onSession?.(s);
      return s;
    },
  };
}
