// Misiones y diálogos (Slice 06). Como el resto de `src/rpg/`: la *definición*
// sale de `data/rpg/quests.json` y `npcs.json`, y aquí vive la *instancia*
// (progreso de cada misión, conversación abierta).
//
// - Cada tipo de objetivo es una subclase de `QuestObjective` registrada en
//   `OBJECTIVE_TYPES`; un tipo nuevo no toca el diario ni la interfaz.
// - El diario (`QuestLog`) recibe señales del mundo (enemigo abatido, captura,
//   PNJ con el que se habla, posición) y avisa con `SessionEvent`.
// - La conversación (`Conversation`) recorre el árbol de `npcs.json` y añade
//   sola las opciones de las misiones que el PNJ da o recibe, y «Comerciar».
// Nada de DOM ni de render.
import type { Character } from './character';
import { fail, OK } from './character';
import type { RpgContent } from './content';
import type {
  CommandResult,
  DialogueAction,
  DialogueCondition,
  DialogueOptionKind,
  DialogueView,
  ItemInstance,
  NpcDef,
  NpcMarker,
  QuestDef,
  QuestObjectiveDef,
  QuestSaveData,
  QuestState,
  QuestView,
} from './contracts';

// ─── Objetivos ──────────────────────────────────────────────────────────────

/** Lo que el mundo y la sesión cuentan al diario. */
export type QuestSignal =
  | { type: 'kill'; archetype: string }
  | { type: 'fish'; itemId: string | null }
  | { type: 'talk'; npcId: string }
  | { type: 'position'; x: number; y: number };

export abstract class QuestObjective<D extends QuestObjectiveDef = QuestObjectiveDef> {
  constructor(readonly def: D) {}

  get text(): string {
    return this.def.text;
  }

  abstract get required(): number;

  /**
   * Cuánto avanza con esta señal (0 = no le afecta). `othersDone` dice si el
   * resto de objetivos de la misión ya está cumplido.
   */
  progressFrom(_s: QuestSignal, _othersDone: boolean): number {
    return 0;
  }

  /** Progreso actual. Por defecto el guardado; los de recoger miran la mochila. */
  current(stored: number, _c: Character): number {
    return Math.min(stored, this.required);
  }

  /** Se cuenta en la mochila (no se guarda y puede retroceder). */
  get live(): boolean {
    return false;
  }
}

type Def<T extends QuestObjectiveDef['type']> = Extract<QuestObjectiveDef, { type: T }>;

export class KillObjective extends QuestObjective<Def<'kill'>> {
  get required(): number {
    return this.def.count;
  }
  override progressFrom(s: QuestSignal): number {
    return s.type === 'kill' && this.def.archetypes.includes(s.archetype) ? 1 : 0;
  }
}

export class CollectObjective extends QuestObjective<Def<'collect'>> {
  get required(): number {
    return this.def.count;
  }
  override current(_stored: number, c: Character): number {
    return Math.min(c.inventory.count(this.def.itemId), this.def.count);
  }
  override get live(): boolean {
    return true;
  }
}

export class FishObjective extends QuestObjective<Def<'fish'>> {
  get required(): number {
    return this.def.count;
  }
  override progressFrom(s: QuestSignal): number {
    if (s.type !== 'fish' || s.itemId === null) return 0;
    return this.def.itemIds.length === 0 || this.def.itemIds.includes(s.itemId) ? 1 : 0;
  }
}

/** Hablar con un PNJ. Cuenta cuando el resto ya está hecho ("ve y cuéntaselo"). */
export class TalkObjective extends QuestObjective<Def<'talk'>> {
  get required(): number {
    return 1;
  }
  override progressFrom(s: QuestSignal, othersDone: boolean): number {
    return s.type === 'talk' && s.npcId === this.def.npcId && othersDone ? 1 : 0;
  }
}

export class ReachObjective extends QuestObjective<Def<'reach'>> {
  get required(): number {
    return 1;
  }
  override progressFrom(s: QuestSignal): number {
    if (s.type !== 'position') return 0;
    const dx = s.x - this.def.x;
    const dy = s.y - this.def.y;
    return dx * dx + dy * dy <= this.def.radius * this.def.radius ? 1 : 0;
  }
}

/** Registro: un tipo de objetivo nuevo = una subclase más y su entrada aquí. */
const OBJECTIVE_TYPES: { [K in QuestObjectiveDef['type']]: (d: Def<K>) => QuestObjective } = {
  kill: (d) => new KillObjective(d),
  collect: (d) => new CollectObjective(d),
  fish: (d) => new FishObjective(d),
  talk: (d) => new TalkObjective(d),
  reach: (d) => new ReachObjective(d),
};

export function createObjective(def: QuestObjectiveDef): QuestObjective {
  return (OBJECTIVE_TYPES[def.type] as (d: QuestObjectiveDef) => QuestObjective)(def);
}

// ─── Diario ─────────────────────────────────────────────────────────────────

/** Lo que el diario pide al mundo cuando hay uno (opcional). */
export interface QuestHooks {
  /** Pone `count` enemigos de ese arquetipo alrededor de un punto (objetivos de matar con `spawn`). */
  spawn?(archetype: string, count: number, at: { x: number; y: number }, radius: number): void;
  /** Deja en el suelo lo que no cupo en la mochila. */
  drop?(inst: ItemInstance): void;
}

class ActiveQuest {
  readonly objectives: QuestObjective[];
  readonly progress: number[];
  /** Último progreso avisado de cada objetivo (para avisar sólo de cambios). */
  readonly seen: number[];
  wasReady = false;

  constructor(readonly def: QuestDef, progress: number[] = []) {
    this.objectives = def.objectives.map(createObjective);
    this.progress = this.objectives.map((o, i) => (o.live ? 0 : Math.max(0, Math.min(o.required, Math.floor(progress[i] ?? 0)))));
    this.seen = this.progress.slice();
  }

  current(i: number, c: Character): number {
    return this.objectives[i]!.current(this.progress[i]!, c);
  }

  done(i: number, c: Character): boolean {
    return this.current(i, c) >= this.objectives[i]!.required;
  }

  ready(c: Character): boolean {
    return this.objectives.every((_, i) => this.done(i, c));
  }
}

export class QuestLog {
  private readonly active = new Map<string, ActiveQuest>();
  private readonly completed = new Set<string>();
  private trackedId: string | null = null;
  private refreshing = false;

  constructor(
    private readonly content: RpgContent,
    private readonly character: Character,
    public hooks: QuestHooks = {},
  ) {}

  private def(id: string): QuestDef | null {
    return this.content.quests[id] ?? null;
  }

  state(questId: string): QuestState {
    if (this.completed.has(questId)) return 'completed';
    const a = this.active.get(questId);
    if (a) return a.ready(this.character) ? 'ready' : 'active';
    const d = this.def(questId);
    if (!d) return 'locked';
    if (this.character.level < d.minLevel) return 'locked';
    return d.requires.every((r) => this.completed.has(r)) ? 'available' : 'locked';
  }

  accept(questId: string): CommandResult {
    const d = this.def(questId);
    if (!d) return fail('Misión desconocida');
    const st = this.state(questId);
    if (st === 'active' || st === 'ready') return fail('Ya la tienes');
    if (st === 'completed') return fail('Ya la completaste');
    if (st === 'locked') return fail(this.character.level < d.minLevel ? `Necesitas nivel ${d.minLevel}` : 'Todavía no');
    const a = new ActiveQuest(d);
    this.active.set(questId, a);
    this.trackedId ??= questId;
    this.spawnFor(a);
    this.character.emit({ type: 'questAccepted', questId });
    // Lo que ya llevas en la mochila cuenta desde el principio.
    this.refresh();
    this.character.emit({ type: 'changed' });
    return OK;
  }

  abandon(questId: string): CommandResult {
    if (!this.active.delete(questId)) return fail('No tienes esa misión');
    if (this.trackedId === questId) this.trackedId = this.firstActive();
    this.character.emit({ type: 'questAbandoned', questId });
    this.character.emit({ type: 'changed' });
    return OK;
  }

  /** Entregar: consume lo que se entrega, da las recompensas y abre la siguiente de la cadena. */
  turnIn(questId: string, npcId?: string): CommandResult {
    const a = this.active.get(questId);
    if (!a) return fail('No tienes esa misión');
    const d = a.def;
    if (npcId !== undefined && npcId !== d.turnIn) return fail('No es a quien hay que entregarla');
    const c = this.character;
    if (!a.ready(c)) return fail('Aún no has terminado');
    if (!this.roomFor(d)) return fail('Haz sitio en la mochila para la recompensa');
    // Primero se cierra la misión, para que los avisos de la mochila no la vean.
    this.active.delete(questId);
    this.completed.add(questId);
    if (this.trackedId === questId) this.trackedId = this.firstActive();
    a.objectives.forEach((o) => {
      if (o.def.type === 'collect' && o.def.consume) this.removeItems(o.def.itemId, o.def.count);
    });
    const r = d.rewards;
    if (r.gold > 0) c.addGold(r.gold);
    for (const it of r.items) {
      const inst = c.items.create(it.itemId, it.quantity);
      const left = c.pickUp(inst);
      if (left > 0) this.hooks.drop?.(inst);
    }
    if (r.learnSpell) c.learnSpell(r.learnSpell);
    c.emit({ type: 'questCompleted', questId });
    // La XP al final: un nivel nuevo puede desbloquear la siguiente misión.
    if (r.xp > 0) c.gainXp(r.xp);
    c.emit({ type: 'changed' });
    return OK;
  }

  /** Señal del mundo: avanza los objetivos a los que afecta. */
  signal(s: QuestSignal): void {
    const c = this.character;
    let any = false;
    for (const a of this.active.values()) {
      a.objectives.forEach((o, i) => {
        if (o.live || a.progress[i]! >= o.required) return;
        const othersDone = a.objectives.every((_, j) => j === i || a.done(j, c));
        const add = o.progressFrom(s, othersDone);
        if (add > 0) {
          a.progress[i] = Math.min(o.required, a.progress[i]! + add);
          any = true;
        }
      });
    }
    if (any) this.refresh();
  }

  /** Revisa el progreso (también el de la mochila) y avisa de lo que cambió. */
  refresh(): void {
    if (this.refreshing) return;
    this.refreshing = true;
    try {
      const c = this.character;
      for (const a of [...this.active.values()]) {
        a.objectives.forEach((o, i) => {
          const cur = a.current(i, c);
          if (cur === a.seen[i]) return;
          a.seen[i] = cur;
          c.emit({ type: 'questProgress', questId: a.def.id, objective: i, text: o.text, current: cur, required: o.required });
        });
        const ready = a.ready(c);
        if (ready && !a.wasReady) c.emit({ type: 'questReady', questId: a.def.id });
        a.wasReady = ready;
      }
    } finally {
      this.refreshing = false;
    }
  }

  /** «!» si el PNJ tiene una misión que ofrecer, «?» si hay una que entregarle (manda «?»). */
  markerFor(npcId: string): NpcMarker | null {
    let marker: NpcMarker | null = null;
    for (const d of Object.values(this.content.quests)) {
      const st = this.state(d.id);
      if (st === 'ready' && d.turnIn === npcId) return 'ready';
      if (st === 'available' && d.giver === npcId) marker = 'available';
    }
    return marker;
  }

  get tracked(): string | null {
    return this.trackedId;
  }

  track(questId: string | null): CommandResult {
    if (questId !== null && !this.active.has(questId)) return fail('Sólo se siguen misiones en curso');
    this.trackedId = questId;
    this.character.emit({ type: 'changed' });
    return OK;
  }

  view(questId: string): QuestView | null {
    const d = this.def(questId);
    if (!d) return null;
    const c = this.character;
    const a = this.active.get(questId);
    const st = this.state(questId);
    const objectives = (a?.objectives ?? d.objectives.map(createObjective)).map((o, i) => {
      const current = a ? a.current(i, c) : st === 'completed' ? o.required : 0;
      return { text: o.text, current, required: o.required, done: current >= o.required };
    });
    const npc = (id: string): { id: string; name: string } => ({ id, name: this.content.npcs[id]?.name ?? id });
    return {
      id: d.id,
      name: d.name,
      summary: d.summary,
      chain: d.chain,
      state: st,
      giver: npc(d.giver),
      turnIn: npc(d.turnIn),
      objectives,
      rewards: d.rewards,
      tracked: this.trackedId === questId,
    };
  }

  /** Diario: en curso y por entregar primero (en orden de aceptación), luego completadas. */
  views(): QuestView[] {
    const ids = [...this.active.keys(), ...[...this.completed].filter((id) => !this.active.has(id))];
    return ids.map((id) => this.view(id)).filter((v): v is QuestView => v !== null);
  }

  /** Misiones que este PNJ da (disponibles), recibe (por entregar) o de las que sabe (en curso). */
  questsFor(npcId: string): { questId: string; state: QuestState; role: 'giver' | 'turnIn' }[] {
    const out: { questId: string; state: QuestState; role: 'giver' | 'turnIn' }[] = [];
    for (const d of Object.values(this.content.quests)) {
      const st = this.state(d.id);
      if (d.turnIn === npcId && (st === 'ready' || st === 'active')) out.push({ questId: d.id, state: st, role: 'turnIn' });
      else if (d.giver === npcId && (st === 'available' || st === 'active' || st === 'ready')) out.push({ questId: d.id, state: st, role: 'giver' });
    }
    return out;
  }

  /** Vuelve a poner los enemigos que faltan (al enlazar un mundo nuevo o cargar). */
  respawnTargets(): void {
    for (const a of this.active.values()) this.spawnFor(a);
  }

  toSave(): QuestSaveData {
    return {
      active: [...this.active.values()].map((a) => ({ questId: a.def.id, progress: a.progress.slice() })),
      completed: [...this.completed],
      tracked: this.trackedId,
    };
  }

  /** Carga un guardado (los de antes del Slice 06 no traen `quests`). Ignora misiones que ya no existen. */
  restore(data: QuestSaveData | undefined): void {
    this.active.clear();
    this.completed.clear();
    this.trackedId = null;
    if (!data) return;
    for (const id of data.completed ?? []) if (this.def(id)) this.completed.add(id);
    for (const q of data.active ?? []) {
      const d = this.def(q.questId);
      if (!d || this.completed.has(d.id)) continue;
      const a = new ActiveQuest(d, Array.isArray(q.progress) ? q.progress : []);
      a.objectives.forEach((_, i) => (a.seen[i] = a.current(i, this.character)));
      a.wasReady = a.ready(this.character);
      this.active.set(d.id, a);
    }
    this.trackedId = data.tracked !== null && this.active.has(data.tracked) ? data.tracked : this.firstActive();
  }

  /** Avisa del motivo si una orden falló. Devuelve si salió bien. */
  report(r: CommandResult): boolean {
    if (!r.ok) this.character.emit({ type: 'message', text: r.reason });
    return r.ok;
  }

  /** ¿Se cumple una condición de diálogo? */
  holds(k: DialogueCondition): boolean {
    switch (k.type) {
      case 'quest':
        return k.states.includes(this.state(k.questId));
      case 'level':
        return this.character.level >= k.min && this.character.level <= k.max;
      case 'hasItem':
        return this.character.inventory.count(k.itemId) >= k.quantity;
      case 'not':
        return !this.holds(k.condition);
    }
  }

  holdsAll(list: readonly DialogueCondition[]): boolean {
    return list.every((k) => this.holds(k));
  }

  private firstActive(): string | null {
    return this.active.keys().next().value ?? null;
  }

  private spawnFor(a: ActiveQuest): void {
    const spawn = this.hooks.spawn;
    if (!spawn) return;
    a.objectives.forEach((o, i) => {
      if (o.def.type !== 'kill' || !o.def.spawn) return;
      const missing = o.required - a.progress[i]!;
      if (missing > 0) spawn(o.def.archetypes[0]!, missing, { x: o.def.spawn.x, y: o.def.spawn.y }, o.def.spawn.radius);
    });
  }

  /** Quita `count` unidades de un objeto, de las pilas que haga falta. */
  private removeItems(itemId: string, count: number): void {
    const inv = this.character.inventory;
    let left = count;
    for (const s of [...inv.slots]) {
      if (left <= 0) break;
      if (!s || s.itemId !== itemId) continue;
      const q = Math.min(left, s.quantity);
      inv.remove(s.uid, q);
      left -= q;
    }
    this.character.checkPetCharm();
  }

  /** Huecos que necesita la recompensa frente a los libres (contando lo que se entrega). */
  private roomFor(d: QuestDef): boolean {
    const inv = this.character.inventory;
    let freed = 0;
    for (const o of d.objectives) {
      // Si se entrega todo lo que hay de ese objeto, sus huecos quedan libres.
      if (o.type === 'collect' && o.consume && inv.count(o.itemId) === o.count) freed += inv.slots.filter((s) => s?.itemId === o.itemId).length;
    }
    let need = 0;
    for (const it of d.rewards.items) {
      const def = this.content.items[it.itemId]!;
      const room = def.maxStack > 1 ? inv.slots.reduce((n, s) => n + (s && s.itemId === it.itemId ? def.maxStack - s.quantity : 0), 0) : 0;
      need += Math.ceil(Math.max(0, it.quantity - room) / def.maxStack);
    }
    return need <= inv.freeSlots() + freed;
  }
}

// ─── Conversación ───────────────────────────────────────────────────────────

interface LiveOption {
  text: string;
  kind: DialogueOptionKind;
  /** Hace lo suyo y devuelve el nodo siguiente (null = cerrar). */
  run(): string | null;
}

/** Resultado de elegir una opción. */
export interface DialogueStep {
  view: DialogueView | null;
  /** La opción pedía abrir la tienda del mercader. */
  openShop: boolean;
}

const OFFER = '@offer:';
const PROGRESS = '@progress:';
const DONE = '@done:';

/**
 * Una conversación con un PNJ. Los nodos que empiezan por `@` son los que
 * genera el sistema de misiones (ofrecer, en curso, entregada).
 */
export class Conversation {
  readonly entry: string;
  private node: string;
  private shop = false;

  constructor(
    private readonly content: RpgContent,
    readonly npc: NpcDef,
    private readonly log: QuestLog,
  ) {
    const d = npc.dialogue;
    this.entry = (d.entry.find((e) => log.holdsAll(e.conditions)) ?? d.entry[0]!).node;
    this.node = this.entry;
  }

  get nodeId(): string {
    return this.node;
  }

  view(): DialogueView {
    const n = this.npc;
    const opts = this.options();
    let text: string;
    let questId: string | null = null;
    if (this.node.startsWith('@')) {
      questId = this.node.slice(this.node.indexOf(':') + 1);
      const q = this.content.quests[questId]!;
      text = this.node.startsWith(OFFER) ? q.offerText : this.node.startsWith(PROGRESS) ? q.progressText : q.completeText;
    } else text = n.dialogue.nodes[this.node]!.text;
    return {
      npcId: n.id,
      name: n.name,
      title: n.title,
      text,
      quest: questId ? this.log.view(questId) : null,
      options: opts.map((o, index) => ({ index, text: o.text, kind: o.kind })),
    };
  }

  choose(index: number): DialogueStep {
    const o = this.options()[index];
    if (!o) return { view: this.view(), openShop: false };
    this.shop = false;
    const next = o.run();
    const openShop = this.shop;
    if (next === null) return { view: null, openShop };
    this.node = next;
    return { view: this.view(), openShop };
  }

  private options(): LiveOption[] {
    const out: LiveOption[] = [];
    const log = this.log;
    const node = this.node;
    const back: LiveOption = { text: 'Volver', kind: 'talk', run: () => this.entry };
    if (node.startsWith(OFFER)) {
      const id = node.slice(OFFER.length);
      if (log.state(id) === 'available') out.push({ text: 'Acepto', kind: 'accept', run: () => (log.report(log.accept(id)) ? this.entry : node) });
      out.push({ ...back, text: 'Ahora no' });
      return out;
    }
    if (node.startsWith(PROGRESS) || node.startsWith(DONE)) {
      out.push(back);
      out.push(this.bye());
      return out;
    }
    const def = this.npc.dialogue.nodes[node]!;
    for (const op of def.options) {
      if (!log.holdsAll(op.conditions)) continue;
      out.push({ text: op.text, kind: kindOf(op.actions), run: () => this.runActions(op.actions, op.next) });
    }
    if (node === this.entry) {
      for (const q of log.questsFor(this.npc.id)) {
        const d = this.content.quests[q.questId]!;
        if (q.state === 'ready' && q.role === 'turnIn') {
          out.push({ text: `Entregar: ${d.name}`, kind: 'turnIn', run: () => (log.report(log.turnIn(d.id, this.npc.id)) ? DONE + d.id : node) });
        } else if (q.state === 'available') {
          out.push({ text: d.name, kind: 'offer', run: () => OFFER + d.id });
        } else {
          out.push({ text: `Sobre «${d.name}»…`, kind: 'progress', run: () => PROGRESS + d.id });
        }
      }
      if (this.npc.merchantId !== null) out.push({ text: 'Comerciar', kind: 'shop', run: () => this.runActions([{ type: 'openShop' }], null) });
    }
    out.push(this.bye());
    return out;
  }

  private bye(): LiveOption {
    return { text: 'Adiós', kind: 'bye', run: () => null };
  }

  private runActions(actions: readonly DialogueAction[], next: string | null): string | null {
    for (const a of actions) {
      if (a.type === 'acceptQuest' && !this.log.report(this.log.accept(a.questId))) return this.node;
      if (a.type === 'completeQuest' && !this.log.report(this.log.turnIn(a.questId, this.npc.id))) return this.node;
      if (a.type === 'openShop') this.shop = true;
    }
    return next;
  }
}

function kindOf(actions: readonly DialogueAction[]): DialogueOptionKind {
  if (actions.some((a) => a.type === 'openShop')) return 'shop';
  if (actions.some((a) => a.type === 'completeQuest')) return 'turnIn';
  if (actions.some((a) => a.type === 'acceptQuest')) return 'accept';
  return 'talk';
}
