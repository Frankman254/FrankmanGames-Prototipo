// La sesión de juego que usa la interfaz (`GameSessionApi`) y su fábrica.
// Envuelve al `Character`; si hay un mundo enlazado, los consumibles usan su
// contexto de efectos y lo que se tira cae al suelo.
import { Rng } from '../sim/rng';
import type { CharacterSex } from './contracts';
import { Actor } from './actor';
import { Character, fail, OK } from './character';
import type {
  SavePlace,
  CommandResult,
  DialogueView,
  EquipmentView,
  HotbarSlotState,
  EquipSlot,
  InventorySortKey,
  GameSessionApi,
  GameSessionFactory,
  InventoryView,
  ItemInstance,
  MerchantView,
  NpcMarker,
  PetDef,
  PetView,
  PlayerView,
  PrimaryStat,
  QuestView,
  QuickUseKind,
  SaveData,
  SessionEvent,
  SpellbookView,
  SpoilsView,
  StatDelta,
  StatusDef,
} from './contracts';
import type { RpgContent } from './content';
import { createEffect, type Effect, type EffectContext, type TrapSpec, type ZoneSpec } from './effects';
import { Energy, ENERGY_SOURCE, type EnergyDeathReport } from './energy';
import { rollQuality } from './items';
import { Conversation, QuestLog } from './quests';
import { Shop } from './shop';
import { applyCraftQuality, type ProfessionView } from './professions';
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
  /** ¿Hay un taller de estos al alcance del jugador? */
  nearStation?(stationId: string): boolean;
  /** Tecla 1–6 con el apuntado actual; null si se lanzó. */
  castSlot(index: number): CastBlock | null;
  /** Enfriamiento y coste de cada hueco de la barra. */
  hotbarState(): HotbarSlotState[];
  /** Slice 06: pone enemigos de una misión alrededor de un punto. */
  spawnQuestEnemies?(archetype: string, count: number, at: Vec2, radius: number): void;
}

/** Cada cuánto (s) se mira la posición del jugador para los objetivos de «llegar a». */
const REACH_CHECK_SECONDS = 0.25;

export class GameSession implements GameSessionApi {
  private bankAccess = false;

  /** Sólo la interacción local con el empleado/cofre habilita transferencias. */
  setBankAccess(active: boolean): void { this.bankAccess = active; }

  bank(): ItemInstance[] { return this.character.bank.view(); }

  professions(): ProfessionView[] {
    return this.character.professions.view();
  }

  nearStation(stationId: string): boolean {
    return this.world?.nearStation?.(stationId) ?? false;
  }

  /** Receta + materiales + taller + nivel. Nada se gasta hasta que todo se cumple. */
  craft(recipeId: string, quality = 0): CommandResult {
    const c = this.character;
    const def = this.content.professions;
    const r = def.recipes[recipeId];
    if (!r) return fail('Receta desconocida');
    if (!c.alive || c.spectral.active) return fail('No puedes fabricar ahora');
    const job = def.professions[r.profession]!;
    if (c.professions.level(r.profession) < r.level) return fail(`Necesitas ${job.name} ${r.level}`);
    if (!this.nearStation(r.station)) return fail(`Ve a: ${def.stations[r.station]!.name}`);
    for (const i of r.inputs) {
      if (c.inventory.count(i.itemId) < i.quantity) return fail(`Te falta ${this.content.items[i.itemId]!.name}`);
    }
    for (const i of r.inputs) c.inventory.consume(i.itemId, i.quantity);
    const inst = c.items.create(r.output);
    applyCraftQuality(this.content.items[r.output]!, inst, quality, def.rules.minigame.maxRollShift);
    const left = c.pickUp(inst);
    if (left > 0) this.world?.dropToGround(inst);
    c.gainProfessionXp(r.profession, r.xp);
    return this.done(OK);
  }

  bankDeposit(uids: readonly string[]): CommandResult {
    const c = this.character;
    if (!this.bankAccess || !c.alive || c.spectral.active) return fail('Habla con el empleado del banco');
    const moved = c.bank.deposit(c.inventory, uids);
    c.checkPetCharm();
    c.emit({ type: 'changed' });
    return moved > 0 ? OK : fail('No hay objetos de la mochila seleccionados');
  }

  bankWithdraw(uids: readonly string[]): CommandResult {
    const c = this.character;
    if (!this.bankAccess || !c.alive || c.spectral.active) return fail('Habla con el empleado del banco');
    const result = c.bank.withdraw(c.inventory, uids);
    c.emit({ type: 'changed' });
    return result.blocked ? fail('Retirado lo posible; el resto supera el peso máximo') : result.moved > 0 ? OK : fail('No hay objetos seleccionados');
  }
  private world: SessionWorld | null = null;
  private readonly useEffects = new Map<string, Effect[]>();
  /** Mercaderes de esta partida (existencias y recompra), creados al primer uso. */
  private readonly shops = new Map<string, Shop>();
  /** Slice 06: misiones de esta partida. */
  readonly questLog: QuestLog;
  private conversation: Conversation | null = null;
  private reachTimer = 0;
  /** `muerte-botin`: energía («Pulso») de esta partida. */
  energy: Energy;
  /** Botín de fin de combate sin recoger. */
  private pendingSpoils: SpoilsView | null = null;
  private spoilsSerial = 0;
  private wasSpectral = false;
  /** `guardado-presets`: lugar del guardado cargado (null en partida nueva); `main` pone ahí al jugador. */
  startPlace: SavePlace | null = null;
  /** `guardado-presets`: lugar actual del jugador para `save()` (lo da `main`, que conoce el mundo y la mazmorra). */
  placeProvider: (() => SavePlace | null) | null = null;

  constructor(readonly content: RpgContent, readonly character: Character, readonly rng: Rng) {
    this.energy = new Energy(content.energy);
    this.questLog = new QuestLog(content, character, {
      spawn: (archetype, count, at, radius) => this.world?.spawnQuestEnemies?.(archetype, count, at, radius),
      drop: (inst) => this.world?.dropToGround(inst),
    });
    // Se suscribe antes que la interfaz: cuando ésta abre el diálogo de un
    // PNJ, el objetivo de «hablar con» ya está contado.
    character.on((e) => this.onCharacterEvent(e));
  }

  /** Enlaza (o desenlaza con null) el mundo en marcha. */
  attach(world: SessionWorld | null): void {
    this.bankAccess = false;
    this.world = world;
    this.conversation = null;
    // Mundo nuevo: vuelven a aparecer los enemigos que piden las misiones en curso.
    if (world) this.questLog.respawnTargets();
  }

  private onCharacterEvent(e: SessionEvent): void {
    switch (e.type) {
      case 'enemyKilled':
        this.questLog.signal({ type: 'kill', archetype: e.archetype });
        break;
      case 'fished':
        this.questLog.signal({ type: 'fish', itemId: e.itemId });
        break;
      case 'talkNpc':
        this.questLog.signal({ type: 'talk', npcId: e.npcId });
        break;
      case 'changed':
      case 'loot':
        this.questLog.refresh();
        break;
      case 'spoils':
        this.addSpoils(e.spoils);
        break;
      default:
        break;
    }
  }

  /** Lo llama la interfaz cada fotograma sin ventanas modales: objetivos de «llegar a». */
  tick(dt: number): void {
    if (!this.world) return;
    // 0 es estar muerto: al revivir, el Pulso vuelve a `reviveAt` y sigue subiendo con el tiempo.
    const spectral = this.character.spectral.active;
    if (this.wasSpectral && !spectral) this.energyChanged(this.energy.gain(this.energy.def.reviveAt));
    this.wasSpectral = spectral;
    if (this.character.alive && !this.character.spectral.active) this.energyChanged(this.energy.tick(dt));
    if (this.character.spectral.active) return;
    this.reachTimer -= dt;
    if (this.reachTimer > 0) return;
    this.reachTimer = REACH_CHECK_SECONDS;
    const p = this.character.pos;
    this.questLog.signal({ type: 'position', x: p.x, y: p.y });
  }

  private done(r: CommandResult): CommandResult {
    if (r.ok) this.character.emit({ type: 'changed' });
    return r;
  }

  // ─── Vistas ──────────────────────────────────────────────────────────────

  player(): PlayerView {
    return { ...this.character.view(), energy: this.energy.view(), spectral: this.character.spectral.toSave() };
  }

  inventory(): InventoryView {
    const inv = this.character.inventory;
    return { size: inv.size, weight: inv.bagWeight, maxWeight: inv.maxWeight, weightUnit: this.content.progression.weightUnit ?? 'briznas', slots: inv.slots.map((s) => (s ? { ...s, rolled: s.rolled.map((m) => ({ ...m })) } : null)) };
  }

  equipment(): EquipmentView {
    return this.character.equipment.all();
  }

  spellbook(): SpellbookView {
    return this.character.spellbook.view();
  }

  pet(): PetView | null {
    if (this.character.spectral.active) return null;
    const c = this.character;
    const petId = c.activePetId();
    if (!petId || !c.activePetItemUid) return null;
    const live = this.world?.petHealth();
    const max = this.content.pets[petId]!.maxHealth ?? 50;
    return { petId, itemUid: c.activePetItemUid, health: live?.health ?? max, maxHealth: live?.maxHealth ?? max };
  }

  // ─── Órdenes ─────────────────────────────────────────────────────────────

  equip(uid: string, slot?: EquipSlot): CommandResult {
    if (this.character.spectral.active) return fail('Recupera tu forma viva para cambiar de equipo');
    return this.done(this.character.equip(uid, slot));
  }

  unequip(slot: EquipSlot): CommandResult {
    if (this.character.spectral.active) return fail('Recupera tu forma viva para cambiar de equipo');
    return this.done(this.character.unequip(slot));
  }

  setItemLook(uid: string, look: string): CommandResult {
    const c = this.character;
    const inst = c.inventory.find(uid) ?? Object.values(c.equipment.slots).find((i) => i?.uid === uid) ?? null;
    if (!inst) return fail('No tienes ese objeto');
    const mount = this.content.items[inst.itemId]?.mount;
    if (!mount?.variants?.includes(look)) return fail('Esa apariencia no está disponible');
    if ((inst.look ?? mount.variant) === look) return OK;
    if (look === mount.variant) delete inst.look;
    else inst.look = look;
    return this.done(OK);
  }

  useItem(uid: string): CommandResult {
    if (this.character.spectral.active) return fail('Busca un Alzador para recuperar tu forma viva');
    const c = this.character;
    const inst = c.inventory.find(uid);
    if (!inst) return fail('No está en el inventario');
    const def = this.content.items[inst.itemId]!;
    const use = def.use;
    const energy = this.energy.itemAmount(def.id);
    if (energy > 0) {
      if (this.energy.value >= this.energy.def.max) return fail(`Ya tienes el ${this.energy.def.name.toLowerCase()} lleno`);
      c.inventory.remove(uid, 1);
      this.energyChanged(this.energy.gain(energy));
      return this.done(OK);
    }
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
      case 'recall':
        if ((c.itemCooldowns[def.id] ?? 0) > 0) return fail('En enfriamiento');
        c.inventory.remove(uid, 1);
        if (use.cooldown > 0) c.itemCooldowns[def.id] = use.cooldown;
        c.emit({ type: 'recall' });
        return this.done(OK);
      case 'summonPet':
        c.setActivePet(c.activePetItemUid === uid ? null : uid);
        return this.done(OK);
    }
  }

  dropItem(uid: string, quantity: number): CommandResult {
    if (this.character.spectral.active) return fail('No puedes tirar objetos en forma espectral');
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

  sortInventory(by?: InventorySortKey): CommandResult {
    this.character.inventory.sort(by);
    return this.done(OK);
  }

  assignHotbar(index: number, spellId: string | null): CommandResult {
    const err = this.character.spellbook.assign(index, spellId);
    return this.done(err ? fail(err) : OK);
  }

  spendStatPoint(stat: PrimaryStat): CommandResult {
    return this.done(this.character.spendStatPoint(stat));
  }

  resetStatPoints(): CommandResult {
    return this.done(this.character.resetStatPoints());
  }

  compareEquip(uid: string, slot?: EquipSlot): StatDelta[] {
    return this.character.compareEquip(uid, slot);
  }

  /** valor × multiplicador de rareza × fracción de venta × (0,75 + 0,5 · calidad de tiradas) × cantidad (mín. 1 por unidad). */
  sellValue(uid: string): number {
    const c = this.character;
    const inst = c.inventory.find(uid) ?? Object.values(c.equipment.slots).find((i) => i?.uid === uid) ?? null;
    if (!inst) return 0;
    const def = this.content.items[inst.itemId]!;
    const r = this.content.rules;
    // Mínimo 1 moneda por unidad si el objeto vale algo (los materiales baratos redondeaban a 0).
    const each = Math.max(def.value > 0 ? 1 : 0, Math.floor(def.value * r.rarityValue[def.rarity] * r.sellRatio * (0.75 + 0.5 * rollQuality(def, inst))));
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

  // ─── Mercaderes (Slice 05) ───────────────────────────────────────────────

  private shop(merchantId: string): Shop | null {
    let shop = this.shops.get(merchantId);
    if (!shop) {
      const def = this.content.merchants[merchantId];
      if (!def) return null;
      shop = new Shop(this.content, def, this.character);
      this.shops.set(merchantId, shop);
    }
    return shop;
  }

  merchant(merchantId: string): MerchantView | null {
    return this.shop(merchantId)?.view() ?? null;
  }

  buy(merchantId: string, index: number, quantity: number): CommandResult {
    if (this.character.spectral.active) return fail('Recupera tu forma viva para comerciar');
    const shop = this.shop(merchantId);
    return shop ? this.done(shop.buy(index, quantity)) : fail('No hay mercader');
  }

  sell(merchantId: string, uid: string, quantity: number): CommandResult {
    if (this.character.spectral.active) return fail('Recupera tu forma viva para comerciar');
    const shop = this.shop(merchantId);
    const inst = this.character.inventory.find(uid);
    if (!shop || !inst) return fail(shop ? 'No está en la mochila' : 'No hay mercader');
    const unit = Math.floor(this.sellValue(uid) / inst.quantity);
    return this.done(shop.sell(uid, quantity, unit));
  }

  buyBack(merchantId: string, index: number): CommandResult {
    if (this.character.spectral.active) return fail('Recupera tu forma viva para comerciar');
    const shop = this.shop(merchantId);
    return shop ? this.done(shop.buyBack(index)) : fail('No hay mercader');
  }

  // ─── Misiones y diálogos (Slice 06) ──────────────────────────────────────

  talk(npcId: string): DialogueView | null {
    if (this.character.spectral.active) return null;
    const npc = this.content.npcs[npcId];
    if (!npc) return null;
    this.conversation = new Conversation(this.content, npc, this.questLog);
    return this.conversation.view();
  }

  dialogue(): DialogueView | null {
    return this.conversation?.view() ?? null;
  }

  chooseDialogue(index: number): DialogueView | null {
    if (this.character.spectral.active) return null;
    const conv = this.conversation;
    if (!conv) return null;
    const step = conv.choose(index);
    if (!step.view) this.conversation = null;
    if (step.openShop && conv.npc.merchantId !== null) this.character.emit({ type: 'openMerchant', merchantId: conv.npc.merchantId });
    this.character.emit({ type: 'changed' });
    return step.view;
  }

  endDialogue(): void {
    this.conversation = null;
  }

  quests(): QuestView[] {
    return this.questLog.views();
  }

  trackedQuest(): QuestView | null {
    const id = this.questLog.tracked;
    return id ? this.questLog.view(id) : null;
  }

  trackQuest(questId: string | null): CommandResult {
    return this.questLog.track(questId);
  }

  abandonQuest(questId: string): CommandResult {
    return this.questLog.abandon(questId);
  }

  npcMarker(npcId: string): NpcMarker | null {
    return this.questLog.markerFor(npcId);
  }

  // ─── Energía (muerte-botin) ──────────────────────────────────────────────

  /** Restaura la energía de un guardado (falta en los antiguos = la inicial). */
  loadEnergy(save: SaveData['energy']): void {
    this.energy = new Energy(this.content.energy, save);
    // 0 significa muerto: un guardado antiguo en forma espectral no conserva Pulso.
    if (this.character.spectral.active) {
      this.energy.value = 0;
      this.energy.exhausted = true;
    }
    this.applyEnergyPenalty();
  }

  /** Lo llama `main.ts` al caer el jugador: resta Pulso y solo a 0 pasa a forma de fantasma. */
  onDeath(): EnergyDeathReport {
    if (this.character.spectral.active) return { lost: 0, value: this.energy.value, max: this.energy.def.max, exhausted: this.energy.exhausted, justExhausted: false };
    const r = this.energy.die();
    if (r.value <= 0) this.character.spectral.die();
    this.applyEnergyPenalty();
    if (r.justExhausted) this.character.emit({ type: 'message', text: `${this.energy.def.penalty.name}: ${this.energy.def.penalty.description}` });
    this.character.emit({ type: 'changed' });
    return r;
  }

  /** Descanso junto a una piedra de viaje (lo llama `main.ts` cada fotograma que el jugador está cerca). */
  restEnergy(dt: number): void {
    if (this.character.alive && !this.character.spectral.active) this.energyChanged(this.energy.rest(dt));
  }

  /** Tras sumar energía: aplica o quita la penalización y avisa sólo si cambió el número entero. */
  private energyChanged(gained: number): void {
    if (gained <= 0) return;
    const wasPenalized = this.character.stats.has(ENERGY_SOURCE);
    this.applyEnergyPenalty();
    if (wasPenalized && !this.energy.exhausted) this.character.emit({ type: 'message', text: `Recuperas el ${this.energy.def.name.toLowerCase()}: se acabó «${this.energy.def.penalty.name}»` });
    if (Math.floor(this.energy.value) !== Math.floor(this.energy.value - gained) || wasPenalized !== this.character.stats.has(ENERGY_SOURCE)) {
      this.character.emit({ type: 'changed' });
    }
  }

  private applyEnergyPenalty(): void {
    const mods = this.energy.penaltyMods();
    if (mods.length) this.character.stats.set(ENERGY_SOURCE, mods);
    else this.character.stats.remove(ENERGY_SOURCE);
    this.character.clampPools();
  }

  // ─── Botín de fin de combate (muerte-botin) ──────────────────────────────

  /** Restaura recompensas pendientes sin volver a conceder la XP ya ganada. */
  loadSpoils(raw: SaveData['spoils']): void {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items)) return;
    const numeric = [raw.gold, raw.xp, raw.kills, raw.seconds, raw.share];
    if (!numeric.every((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0)) return;
    const items = raw.items.filter((it) => it && typeof it.uid === 'string' && Object.hasOwn(this.content.items, it.itemId) &&
      Number.isSafeInteger(it.quantity) && it.quantity > 0 && Array.isArray(it.rolled)).map((it) => {
      this.character.items.observe(it.uid);
      const copy = structuredClone(it);
      if (this.character.ownsUid(it.uid)) copy.uid = this.character.items.newUid();
      return copy;
    });
    const participants = Array.isArray(raw.participants) ? raw.participants.filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string' && Number.isFinite(p.share)).map((p) => ({ ...p })) : [];
    this.addSpoils({ ...raw, items, participants });
  }

  /**
   * `equipo-objetos`: lo que la migración del guardado sacó del equipo y no
   * cupo en la mochila espera en el botín pendiente, para no perderlo.
   */
  recoverDisplaced(): void {
    const items = this.character.displaced.splice(0);
    if (items.length === 0) return;
    this.addSpoils({ id: 0, gold: 0, xp: 0, kills: 0, seconds: 0, share: 1, items, participants: [] });
  }

  private addSpoils(spoils: SpoilsView): void {
    let v = spoils;
    const cur = this.pendingSpoils;
    const id = ++this.spoilsSerial;
    v = { ...v, autoCloseSeconds: this.content.spoils.autoCloseSeconds };
    const copy = (it: ItemInstance): ItemInstance => ({ ...it, rolled: it.rolled.map((m) => ({ ...m })) });
    this.pendingSpoils = cur
      ? { ...v, id, gold: cur.gold + v.gold, xp: cur.xp + v.xp, kills: cur.kills + v.kills, seconds: cur.seconds + v.seconds, items: [...cur.items, ...v.items.map(copy)] }
      : { ...v, id, items: v.items.map(copy), participants: v.participants.map((p) => ({ ...p })) };
  }

  spoils(): SpoilsView | null {
    const p = this.pendingSpoils;
    return p ? { ...p, items: p.items.map((it) => ({ ...it, rolled: it.rolled.map((m) => ({ ...m })) })), participants: p.participants.map((x) => ({ ...x })) } : null;
  }

  takeSpoils(which: string): CommandResult {
    if (this.character.spectral.active) return fail('No puedes recoger botín en forma espectral');
    const p = this.pendingSpoils;
    if (!p) return fail('No hay botín');
    const c = this.character;
    let full = false;
    if ((which === 'gold' || which === 'all') && p.gold > 0) {
      c.addGold(p.gold);
      p.gold = 0;
    }
    if (which !== 'gold') {
      for (const it of [...p.items]) {
        if (which !== 'all' && it.uid !== which) continue;
        const left = c.pickUp({ ...it, rolled: it.rolled.map((m) => ({ ...m })) }, true);
        if (left > 0) {
          it.quantity = left;
          full = true;
        } else p.items.splice(p.items.indexOf(it), 1);
      }
    }
    if (p.gold === 0 && p.items.length === 0) this.pendingSpoils = null;
    c.emit({ type: 'changed' });
    return full ? fail('Inventario lleno') : OK;
  }

  closeSpoils(): void {
    if (this.character.spectral.active) return;
    if (!this.pendingSpoils) return;
    this.takeSpoils('all');
    const left = this.pendingSpoils as SpoilsView | null;
    if (left) for (const it of left.items) this.world?.dropToGround(it);
    this.pendingSpoils = null;
    this.character.emit({ type: 'changed' });
  }

  save(): SaveData {
    const place = this.placeProvider?.() ?? this.startPlace;
    const spoils = this.spoils();
    return { ...this.character.toSave(new Date()), quests: this.questLog.toSave(), energy: this.energy.toSave(), ...(place ? { place } : {}), ...(spoils ? { spoils } : {}) };
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
  blink(): void {}
  swap(): void {}
  pull(): void {}
  recoil(): void {}
  summon(_p: PetDef): void {}
  zone(_z: ZoneSpec): void {}
  trap(_t: TrapSpec): void {}
  reveal(): void {}
}

/** La fábrica que usa el menú de inicio. */
export class RpgSessionFactory implements GameSessionFactory {
  constructor(readonly content: RpgContent) {}

  newGame(classId: string, name: string, seed: number, sex: CharacterSex = 'masculino'): GameSession {
    const rng = new Rng(seed);
    const c = Character.create(this.content, classId, name, rng);
    c.sex = sex;
    return new GameSession(this.content, c, rng);
  }

  load(save: SaveData, seed: number): GameSession {
    const rng = new Rng(seed);
    const s = new GameSession(this.content, Character.fromSave(this.content, save, rng), rng);
    s.questLog.restore(save.quests);
    s.loadEnergy(save.energy);
    s.loadSpoils(save.spoils);
    s.recoverDisplaced();
    s.startPlace = save.place ?? null;
    return s;
  }
}
