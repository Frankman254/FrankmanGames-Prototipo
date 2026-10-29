// La sesión de juego que usa la interfaz (`GameSessionApi`) y su fábrica.
// Envuelve al `Character`; si hay un mundo enlazado, los consumibles usan su
// contexto de efectos y lo que se tira cae al suelo.
import { Rng } from '../sim/rng';
import { Actor } from './actor';
import { Character, fail, OK } from './character';
import type {
  CommandResult,
  EquipmentView,
  HotbarSlotState,
  EquipSlot,
  GameSessionApi,
  GameSessionFactory,
  InventoryView,
  ItemInstance,
  PetDef,
  PetView,
  PlayerView,
  PrimaryStat,
  QuickUseKind,
  SaveData,
  SessionEvent,
  SpellbookView,
  StatDelta,
  StatusDef,
} from './contracts';
import type { RpgContent } from './content';
import { createEffect, type Effect, type EffectContext, type ZoneSpec } from './effects';
import { rollQuality } from './items';
import { CAST_BLOCK_TEXT, type CastBlock } from '../sim/combat';
import type { HitSpec } from '../sim/damage';
import type { Vec2 } from '../sim/vec2';

/** Lo que la sesión pide al mundo cuando hay uno en marcha. */
export interface SessionWorld {
  /** Contexto de efectos con el personaje como lanzador (consumibles). */
  effectContext(tag: string): EffectContext;
  /** Deja un objeto en el suelo junto al jugador. */
  dropToGround(inst: ItemInstance): void;
  /** Vida actual de la mascota activa, si está en el mundo. */
  petHealth(): { health: number; maxHealth: number } | null;
  /** Tecla 1–6 con el apuntado actual; null si se lanzó. */
  castSlot(index: number): CastBlock | null;
  /** Enfriamiento y coste de cada hueco de la barra. */
  hotbarState(): HotbarSlotState[];
}

export class GameSession implements GameSessionApi {
  private world: SessionWorld | null = null;
  private readonly useEffects = new Map<string, Effect[]>();

  constructor(readonly content: RpgContent, readonly character: Character, readonly rng: Rng) {}

  /** Enlaza (o desenlaza con null) el mundo en marcha. */
  attach(world: SessionWorld | null): void {
    this.world = world;
  }

  private done(r: CommandResult): CommandResult {
    if (r.ok) this.character.emit({ type: 'changed' });
    return r;
  }

  // ─── Vistas ──────────────────────────────────────────────────────────────

  player(): PlayerView {
    return this.character.view();
  }

  inventory(): InventoryView {
    const inv = this.character.inventory;
    return { size: inv.size, slots: inv.slots.map((s) => (s ? { ...s, rolled: s.rolled.map((m) => ({ ...m })) } : null)) };
  }

  equipment(): EquipmentView {
    return this.character.equipment.all();
  }

  spellbook(): SpellbookView {
    return this.character.spellbook.view();
  }

  pet(): PetView | null {
    const c = this.character;
    const petId = c.activePetId();
    if (!petId || !c.activePetItemUid) return null;
    const live = this.world?.petHealth();
    const max = this.content.pets[petId]!.maxHealth ?? 50;
    return { petId, itemUid: c.activePetItemUid, health: live?.health ?? max, maxHealth: live?.maxHealth ?? max };
  }

  // ─── Órdenes ─────────────────────────────────────────────────────────────

  equip(uid: string, slot?: EquipSlot): CommandResult {
    return this.done(this.character.equip(uid, slot));
  }

  unequip(slot: EquipSlot): CommandResult {
    return this.done(this.character.unequip(slot));
  }

  useItem(uid: string): CommandResult {
    const c = this.character;
    const inst = c.inventory.find(uid);
    if (!inst) return fail('No está en el inventario');
    const def = this.content.items[inst.itemId]!;
    const use = def.use;
    if (!use) return def.slot ? this.equip(uid) : fail('No se puede usar');
    if (!c.alive) return fail('Sin vida');
    switch (use.kind) {
      case 'effects': {
        if ((c.itemCooldowns[def.id] ?? 0) > 0) return fail('En enfriamiento');
        let effects = this.useEffects.get(def.id);
        if (!effects) {
          effects = use.effects.map((e) => createEffect(e, this.content));
          this.useEffects.set(def.id, effects);
        }
        const ctx = this.world?.effectContext(`item:${def.id}`) ?? new OfflineContext(this.content, c, this.rng, `item:${def.id}`);
        for (const e of effects) e.apply(ctx, c, 1);
        c.inventory.remove(uid, 1);
        if (use.cooldown > 0) c.itemCooldowns[def.id] = use.cooldown;
        return this.done(OK);
      }
      case 'learnSpell': {
        const r = c.learnSpell(use.spellId);
        if (r.ok) c.inventory.remove(uid, 1);
        return this.done(r);
      }
      case 'summonPet':
        c.setActivePet(c.activePetItemUid === uid ? null : uid);
        return this.done(OK);
    }
  }

  dropItem(uid: string, quantity: number): CommandResult {
    const c = this.character;
    if (!c.inventory.find(uid)) return fail('No está en el inventario');
    if (!(quantity >= 1)) return fail('Cantidad no válida');
    const removed = c.inventory.remove(uid, Math.floor(quantity));
    if (!removed) return fail('Cantidad no válida');
    c.checkPetCharm();
    this.world?.dropToGround(removed);
    return this.done(OK);
  }

  moveItem(fromIndex: number, toIndex: number): CommandResult {
    return this.done(this.character.inventory.move(fromIndex, toIndex) ? OK : fail('Movimiento no válido'));
  }

  sortInventory(): CommandResult {
    this.character.inventory.sort();
    return this.done(OK);
  }

  assignHotbar(index: number, spellId: string | null): CommandResult {
    const err = this.character.spellbook.assign(index, spellId);
    return this.done(err ? fail(err) : OK);
  }

  spendStatPoint(stat: PrimaryStat): CommandResult {
    return this.done(this.character.spendStatPoint(stat));
  }

  compareEquip(uid: string): StatDelta[] {
    return this.character.compareEquip(uid);
  }

  /** valor × multiplicador de rareza × fracción de venta × (0,75 + 0,5 · calidad de tiradas) × cantidad. */
  sellValue(uid: string): number {
    const c = this.character;
    const inst = c.inventory.find(uid) ?? Object.values(c.equipment.slots).find((i) => i?.uid === uid) ?? null;
    if (!inst) return 0;
    const def = this.content.items[inst.itemId]!;
    const r = this.content.rules;
    const each = Math.floor(def.value * r.rarityValue[def.rarity] * r.sellRatio * (0.75 + 0.5 * rollQuality(def, inst)));
    return each * inst.quantity;
  }

  // ─── Barra y pociones rápidas (contrato ampliado por la rama B) ────────────

  castHotbar(index: number): CommandResult {
    if (!this.world) return fail('No hay partida en marcha');
    const block = this.world.castSlot(index);
    return block === null ? OK : fail(CAST_BLOCK_TEXT[block]);
  }

  hotbarState(): HotbarSlotState[] {
    if (this.world) return this.world.hotbarState();
    return this.character.spellbook.hotbar.map((spellId) => ({ spellId, cooldownRemaining: 0, cooldownTotal: 0, affordable: true }));
  }

  /**
   * Q/E: usa el consumible que más restaura de ese tipo (vida o recurso) y que
   * no esté en enfriamiento.
   */
  quickUse(kind: QuickUseKind): CommandResult {
    const c = this.character;
    const wanted = kind === 'health' ? 'heal' : 'restoreResource';
    let best: { uid: string; amount: number } | null = null;
    for (const inst of c.inventory.slots) {
      if (!inst) continue;
      const use = this.content.items[inst.itemId]?.use;
      if (use?.kind !== 'effects' || (c.itemCooldowns[inst.itemId] ?? 0) > 0) continue;
      let amount = 0;
      for (const e of use.effects) {
        if (e.type !== wanted) continue;
        amount += e.type === 'heal' ? (e.min + e.max) / 2 : e.type === 'restoreResource' ? e.amount : 0;
      }
      if (amount > 0 && (!best || amount > best.amount)) best = { uid: inst.uid, amount };
    }
    if (!best) return fail(kind === 'health' ? 'Sin pociones de vida' : 'Sin tónicos de recurso');
    return this.useItem(best.uid);
  }

  save(): SaveData {
    return this.character.toSave(new Date());
  }

  on(listener: (e: SessionEvent) => void): () => void {
    return this.character.on(listener);
  }
}

/** Contexto fuera de combate: sólo efectos sobre el propio personaje. */
class OfflineContext implements EffectContext {
  readonly origin: Vec2;
  readonly aim: Vec2;
  readonly dir = 0;
  readonly critChance = 0;
  readonly critBonus = 0;

  constructor(readonly content: RpgContent, readonly caster: Character, readonly rng: Rng, readonly tag: string) {
    this.origin = { ...caster.pos };
    this.aim = { ...caster.pos };
  }

  damage(_t: Actor, _h: HitSpec): void {}
  heal(target: Actor, amount: number): void {
    target.heal(amount);
  }
  restoreResource(target: Actor, amount: number): void {
    if (target instanceof Character) target.resource = Math.min(target.maxResource, target.resource + amount);
  }
  applyStatus(target: Actor, def: StatusDef, duration: number, shield?: number): void {
    target.statuses.apply(def, { duration, source: this.caster, shield: shield ?? 0 });
  }
  knockback(): void {}
  dash(): void {}
  teleport(): void {}
  summon(_p: PetDef): void {}
  zone(_z: ZoneSpec): void {}
}

/** La fábrica que usa el menú de inicio. */
export class RpgSessionFactory implements GameSessionFactory {
  constructor(readonly content: RpgContent) {}

  newGame(classId: string, name: string, seed: number): GameSession {
    const rng = new Rng(seed);
    return new GameSession(this.content, Character.create(this.content, classId, name, rng), rng);
  }

  load(save: SaveData, seed: number): GameSession {
    const rng = new Rng(seed);
    return new GameSession(this.content, Character.fromSave(this.content, save, rng), rng);
  }
}
