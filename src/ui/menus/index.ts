// Punto de montaje de toda la interfaz de menús (DOM/CSS sobre el lienzo).
// `main.ts` sólo llama a `mountMenus(factory)`: cambiar la `FakeSession` por la
// sesión real es cambiar la fábrica que se pasa, nada más.
import '../styles/menus.css';
import keybindingsJson from '../../../data/ui/keybindings.json';
import type { GameSessionApi, GameSessionFactory, SessionEvent } from '../../rpg/contracts';
import { CharacterPanel } from './character';
import { DialogueWindow } from './dialogue';
import type { ToastTone, UiContext } from './context';
import { clear, h } from './dom';
import { DragController } from './drag';
import { applyDrop, resolveDrop, type DragSource, type DropTarget } from './dragModel';
import { GameHud } from './hud';
import { RARITY_COLOR } from './icons';
import { InventoryPanel } from './inventory';
import { JournalPanel } from './journal';
import { KeyMap, UI_ACTIONS, hotbarIndex, parseKeybindings, type Action } from './keybindings';
import type { Panel } from './panel';
import { QuestTracker } from './questTracker';
import { SaveStore, loadOptions, saveOptions, MemoryStore, type GameOptions, type KeyValueStore } from './saveStore';
import { creationScreen } from './screens/creation';
import { confirmModal, optionsModal, pauseModal, slotsModal } from './screens/modals';
import { titleScreen } from './screens/title';
import { ShopPanel } from './shop';
import { SpellbookPanel } from './spellbook';
import { Tooltip } from './tooltip';

export type { Action } from './keybindings';
export type { GameOptions } from './saveStore';

export interface MenusOptions {
  /** Contenedor; por defecto `#menus` o uno nuevo en `body`. */
  root?: HTMLElement;
  /** Almacén de guardados y opciones; por defecto `localStorage`. */
  storage?: KeyValueStore;
  /** Semilla de las partidas nuevas/cargadas. */
  seed?: () => number;
  /** Cerrar la aplicación (Electron: `window.close()`). */
  quit?: () => void;
}

export interface MenusController {
  /** Sesión en curso (null en el título o la creación). */
  readonly session: GameSessionApi | null;
  /** La partida debe detenerse (título, creación, pausa u otra ventana modal). */
  readonly blocksGame: boolean;
  readonly options: GameOptions;
  readonly keys: KeyMap;
  /** Llamar una vez por fotograma con el tiempo real transcurrido. */
  frame(dt: number): void;
  /** Acciones que la interfaz no resuelve (evasión, depuración, prueba de carga…) y las de la barra. */
  onAction(fn: (a: Action) => void): void;
  onOptions(fn: (o: GameOptions) => void): void;
  /** Al empezar o cargar una partida (para enlazar la sesión con el mundo). */
  onSession(fn: (s: GameSessionApi) => void): void;
  /** Mercader con la tienda abierta (Slice 05), o null. */
  readonly merchantOpen: string | null;
  /** Cierra la tienda (p. ej. al alejarse del mercader). */
  closeMerchant(): void;
  /** PNJ con la conversación abierta (Slice 06), o null. */
  readonly dialogueOpen: string | null;
  /** Cierra la conversación (p. ej. al alejarse del PNJ). */
  closeDialogue(): void;
  /** Aviso breve en pantalla. */
  toast(text: string, tone?: ToastTone): void;
}

type Screen = 'title' | 'creation' | 'game';

export function mountMenus(factory: GameSessionFactory, opts: MenusOptions = {}): MenusController {
  const root = opts.root ?? document.getElementById('menus') ?? document.body.appendChild(h('div', { id: 'menus' }));
  root.classList.add('menus-root');
  document.body.classList.add('menus-on');
  const storage = opts.storage ?? safeLocalStorage();
  const saves = new SaveStore(storage);
  let options = loadOptions(storage);
  const keys = new KeyMap(parseKeybindings(keybindingsJson));
  const seed = opts.seed ?? (() => (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0);

  const actionFns: ((a: Action) => void)[] = [];
  const optionFns: ((o: GameOptions) => void)[] = [];
  const sessionFns: ((s: GameSessionApi) => void)[] = [];

  let session: GameSessionApi | null = null;
  let unsubscribe: (() => void) | null = null;
  let currentSlot: number | null = null;
  let screen: Screen = 'title';
  const modals: HTMLElement[] = [];

  // Capas: pantallas completas < HUD y paneles < modales < toasts < tooltip/fantasma.
  const screenLayer = h('div.layer.layer-screen');
  const gameLayer = h('div.layer.layer-game');
  const modalLayer = h('div.layer.layer-modal');
  const toastLayer = h('div.layer.layer-toast');
  const banner = h('div.levelup-banner');
  toastLayer.appendChild(banner);
  root.append(screenLayer, gameLayer, modalLayer, toastLayer);

  const tooltip = new Tooltip(root);
  const drag = new DragController(root, tooltip, (src, dst) => handleDrop(src, dst));

  const ctx: UiContext = {
    root,
    session: () => {
      if (!session) throw new Error('Sin partida');
      return session;
    },
    tooltip,
    drag,
    keys,
    toast,
    merchant: () => shop?.merchantId ?? null,
    sell: (uid) => sellFlow(uid),
    confirm: ({ title, text, yes, input, onYes }) => {
      const m = confirmModal(title, text, yes, input, (n) => {
        popModal();
        onYes(n);
      }, popModal);
      pushModal(m);
    },
  };

  let hud: GameHud | null = null;
  let inventory: InventoryPanel | null = null;
  let character: CharacterPanel | null = null;
  let spellbook: SpellbookPanel | null = null;
  let shop: ShopPanel | null = null;
  let journal: JournalPanel | null = null;
  let dialogue: DialogueWindow | null = null;
  let tracker: QuestTracker | null = null;
  const panels = (): Panel[] => [inventory, character, spellbook, shop, journal].filter((p): p is Panel => p !== null);

  /** Vender a la tienda abierta: pide cantidad si es una pila. */
  function sellFlow(uid: string): void {
    const s = session;
    const merchantId = shop?.merchantId;
    if (!s || !merchantId || !s.sell) return;
    const it = s.inventory().slots.find((x) => x?.uid === uid);
    const def = it ? s.content.items[it.itemId] : undefined;
    if (!it || !def) return;
    const sellAll = (n: number): void => {
      report(s.sell!(merchantId, uid, n));
      for (const p of panels()) p.invalidate();
    };
    if (it.quantity <= 1) return sellAll(1);
    const unit = Math.floor(s.sellValue(uid) / it.quantity);
    ctx.confirm({
      title: `Vender ${def.name}`,
      text: `${unit} monedas cada uno. ¿Cuántos?`,
      yes: 'Vender',
      input: { min: 1, max: it.quantity, value: it.quantity },
      onYes: sellAll,
    });
  }

  // ─── Toasts y banner ──────────────────────────────────────────────────────

  function toast(text: string, tone: ToastTone = 'info', color?: string): void {
    const t = h(`div.toast.${tone}` as 'div', { text });
    if (color) t.style.color = color;
    toastLayer.appendChild(t);
    const all = toastLayer.querySelectorAll('.toast');
    if (all.length > 6) all[0]!.remove();
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3200);
  }

  function showBanner(text: string, sub: string): void {
    clear(banner);
    banner.append(h('div.big', { text }), h('div.sub', { text: sub }));
    banner.classList.remove('on');
    void banner.offsetWidth;
    banner.classList.add('on');
  }

  // ─── Modales ──────────────────────────────────────────────────────────────

  function pushModal(el: HTMLElement): void {
    for (const m of modals) m.hidden = true;
    modals.push(el);
    modalLayer.appendChild(el);
    tooltip.hide();
  }

  function popModal(): void {
    modals.pop()?.remove();
    const top = modals[modals.length - 1];
    if (top) top.hidden = false;
    tooltip.hide();
  }

  function closeModals(): void {
    while (modals.length) popModal();
  }

  // ─── Pantallas ────────────────────────────────────────────────────────────

  const maybeContent = factory.content;
  if (!maybeContent) throw new Error('mountMenus: la fábrica debe exponer `content` (lista de clases para la creación)');
  const content = maybeContent;
  const className = (id: string): string => content.classes[id]?.name ?? id;

  function showScreen(s: Screen): void {
    screen = s;
    clear(screenLayer);
    gameLayer.hidden = s !== 'game';
    document.body.classList.toggle('in-game', s === 'game');
    if (s === 'title') {
      const latest = saves.latest();
      screenLayer.appendChild(
        titleScreen(latest !== null ? saves.list()[latest]! : null, className, {
          newGame: () => showScreen('creation'),
          continueLatest: () => {
            const l = saves.latest();
            if (l !== null) loadSlot(l);
          },
          load: () => openSlots('load'),
          options: openOptions,
          quit: () => (opts.quit ?? (() => window.close()))(),
        }),
      );
    } else if (s === 'creation') {
      screenLayer.appendChild(creationScreen(content, tooltip, startNew, () => showScreen('title')));
    }
  }

  function startNew(classId: string, name: string): void {
    setSession(factory.newGame(classId, name, seed()));
    currentSlot = saves.firstEmpty();
    if (currentSlot !== null) saveTo(currentSlot, true);
    toast(currentSlot !== null ? `Partida nueva en la ranura ${currentSlot + 1}` : 'Las 3 ranuras están ocupadas: guarda desde la pausa', 'info');
  }

  function loadSlot(slot: number): void {
    const data = saves.read(slot);
    if (!data) {
      toast('Ese guardado no se puede leer', 'warn');
      return;
    }
    closeModals();
    setSession(factory.load(data, seed()));
    currentSlot = slot;
    toast(`Cargada la ranura ${slot + 1}`, 'info');
  }

  function saveTo(slot: number, quiet = false): void {
    if (!session) return;
    saves.write(slot, session.save());
    currentSlot = slot;
    if (!quiet) toast(`Guardado en la ranura ${slot + 1}`, 'info');
  }

  function setSession(s: GameSessionApi): void {
    unsubscribe?.();
    session = s;
    unsubscribe = s.on(onSessionEvent);
    clear(gameLayer);
    hud = new GameHud(ctx, (a) => handleAction(a));
    inventory = new InventoryPanel(ctx, () => togglePanel('inventory', false));
    character = new CharacterPanel(ctx, () => togglePanel('character', false));
    spellbook = new SpellbookPanel(ctx, () => togglePanel('spellbook', false));
    shop = new ShopPanel(ctx, () => {
      shop?.close();
      inventory?.invalidate();
    });
    journal = new JournalPanel(ctx, () => togglePanel('journal', false));
    dialogue = new DialogueWindow(ctx);
    tracker = new QuestTracker(ctx, () => togglePanel('journal', true));
    gameLayer.append(hud.el, tracker.el, character.el, spellbook.el, journal.el, shop.el, inventory.el, dialogue.el);
    showScreen('game');
    for (const fn of sessionFns) fn(s);
  }

  function quitToTitle(): void {
    closeModals();
    unsubscribe?.();
    unsubscribe = null;
    session = null;
    hud = inventory = character = spellbook = shop = journal = null;
    dialogue = null;
    tracker = null;
    clear(gameLayer);
    showScreen('title');
  }

  function onSessionEvent(e: SessionEvent): void {
    for (const p of panels()) p.invalidate();
    const s = session!;
    switch (e.type) {
      case 'levelUp':
        showBanner(`¡Nivel ${e.level}!`, `+${s.content.progression.statPointsPerLevel} puntos para repartir (${keys.label('character')})`);
        if (currentSlot !== null) {
          saveTo(currentSlot, true);
          toast('Autoguardado', 'info');
        }
        break;
      case 'loot': {
        const def = s.content.items[e.itemId];
        toast(`+ ${def?.name ?? e.itemId}${e.quantity > 1 ? ` ×${e.quantity}` : ''}`, 'loot', def ? RARITY_COLOR[def.rarity] : undefined);
        break;
      }
      case 'gold':
        toast(`+ ${e.amount} monedas`, 'gold');
        break;
      case 'learned':
        toast(`Hechizo aprendido: ${s.content.spells[e.spellId]?.name ?? e.spellId}`, 'level');
        break;
      case 'message':
        toast(e.text, 'info');
        break;
      case 'openMerchant':
        // La tienda ocupa la columna izquierda; la mochila se abre al lado para vender.
        dialogue?.close();
        character?.close();
        spellbook?.close();
        journal?.close();
        shop?.openFor(e.merchantId);
        togglePanel('inventory', true);
        inventory?.invalidate();
        break;
      case 'talkNpc': {
        const v = s.talk?.(e.npcId) ?? null;
        if (v) dialogue?.open(v);
        break;
      }
      case 'questAccepted':
        toast(`Nueva misión: ${s.content.quests?.[e.questId]?.name ?? e.questId}`, 'quest');
        break;
      case 'questProgress':
        toast(e.required > 1 ? `${e.text}: ${e.current}/${e.required}` : `${e.text}${e.current >= e.required ? ' ✓' : ''}`, 'quest');
        break;
      case 'questReady': {
        const q = s.content.quests?.[e.questId];
        const to = q ? s.content.npcs?.[q.turnIn]?.name : undefined;
        toast(`«${q?.name ?? e.questId}» lista${to ? `: vuelve con ${to}` : ''}`, 'level');
        break;
      }
      case 'questCompleted':
        showBanner('Misión completada', s.content.quests?.[e.questId]?.name ?? e.questId);
        break;
      case 'questAbandoned':
        toast(`Misión abandonada: ${s.content.quests?.[e.questId]?.name ?? e.questId}`, 'warn');
        break;
      default:
        break;
    }
    if (e.type === 'changed') dialogue?.refresh();
  }

  // ─── Ventanas ─────────────────────────────────────────────────────────────

  function openPause(): void {
    const p = session?.player();
    const info = p ? `${p.name} · ${className(p.classId)} · nivel ${p.level}${currentSlot !== null ? ` · ranura ${currentSlot + 1}` : ''}` : '';
    pushModal(
      pauseModal(
        {
          resume: popModal,
          save: () => openSlots('save'),
          load: () => openSlots('load'),
          options: openOptions,
          quitToTitle: () =>
            ctx.confirm({ title: 'Salir al título', text: 'Lo que no hayas guardado se perderá.', yes: 'Salir', onYes: quitToTitle }),
        },
        info,
      ),
    );
  }

  function openOptions(): void {
    pushModal(
      optionsModal(
        options,
        (o) => {
          options = o;
          saveOptions(storage, o);
          for (const fn of optionFns) fn(o);
        },
        popModal,
      ),
    );
  }

  function openSlots(mode: 'save' | 'load'): void {
    const rebuild = (): void => {
      popModal();
      openSlots(mode);
    };
    pushModal(
      slotsModal(mode, saves.list(), currentSlot, className, {
        pick: (slot) => {
          if (mode === 'load') {
            const go = (): void => loadSlot(slot);
            if (session) ctx.confirm({ title: 'Cargar partida', text: 'Lo que no hayas guardado de la partida actual se perderá.', yes: 'Cargar', onYes: go });
            else go();
            return;
          }
          const occupied = saves.read(slot) !== null;
          const go = (): void => {
            saveTo(slot);
            rebuild();
          };
          if (occupied && slot !== currentSlot) ctx.confirm({ title: 'Sobrescribir', text: `La ranura ${slot + 1} ya tiene una partida. ¿Sobrescribirla?`, yes: 'Sobrescribir', onYes: go });
          else go();
        },
        remove: (slot) =>
          ctx.confirm({
            title: 'Borrar guardado',
            text: `¿Borrar la ranura ${slot + 1}? No se puede deshacer.`,
            yes: 'Borrar',
            onYes: () => {
              saves.remove(slot);
              if (slot === currentSlot) currentSlot = null;
              rebuild();
              if (!session) showScreen('title');
            },
          }),
        back: popModal,
      }),
    );
  }

  function togglePanel(which: 'inventory' | 'character' | 'spellbook' | 'journal', force?: boolean): void {
    const p = { inventory, character, spellbook, journal }[which];
    if (!p) return;
    const open = force ?? !p.isOpen;
    if (open) {
      // Personaje, libro, diario y tienda comparten la columna izquierda.
      if (which !== 'inventory') {
        if (which !== 'character') character?.close();
        if (which !== 'spellbook') spellbook?.close();
        if (which !== 'journal') journal?.close();
      }
      if (which !== 'inventory') shop?.close();
      p.open();
    } else p.close();
  }

  // ─── Arrastrar y soltar ───────────────────────────────────────────────────

  function handleDrop(src: DragSource, dst: DropTarget): void {
    if (!session) return;
    const s = session;
    const cmd = resolveDrop(src, dst, (uid) => {
      const it = [...s.inventory().slots, ...Object.values(s.equipment())].find((x) => x?.uid === uid);
      return it ? (s.content.items[it.itemId] ?? null) : null;
    });
    if (cmd.op === 'sell') {
      sellFlow(cmd.uid);
      return;
    }
    if (cmd.op === 'drop') {
      const it = s.inventory().slots.find((x) => x?.uid === cmd.uid);
      const def = it ? s.content.items[it.itemId] : undefined;
      if (!it || !def) return;
      ctx.confirm({
        title: 'Tirar objeto',
        text: `¿Tirar ${def.name}${it.quantity > 1 ? ` (tienes ${it.quantity})` : ''}? Se pierde.`,
        yes: 'Tirar',
        input: it.quantity > 1 ? { min: 1, max: it.quantity, value: it.quantity } : undefined,
        onYes: (n) => report(s.dropItem(it.uid, n)),
      });
      return;
    }
    report(applyDrop(s, cmd));
    for (const p of panels()) p.invalidate();
  }

  function report(r: { ok: boolean; reason?: string }): void {
    if (!r.ok && r.reason) toast(r.reason, 'warn');
  }

  // ─── Teclado ──────────────────────────────────────────────────────────────

  function handleAction(a: Action): void {
    if (modals.length) {
      if (a === 'pause') popModal();
      return;
    }
    if (screen === 'creation') {
      if (a === 'pause') showScreen('title');
      return;
    }
    if (screen !== 'game' || !session) return;
    if (a === 'pause') {
      if (dialogue?.npcId) dialogue.close();
      else if (panels().some((p) => p.isOpen)) for (const p of panels()) p.close();
      else openPause();
      return;
    }
    if (a === 'inventory' || a === 'character' || a === 'spellbook' || a === 'journal') return togglePanel(a);
    const hot = hotbarIndex(a);
    // Con una conversación abierta, 1–6 eligen opción en vez de lanzar.
    if (hot !== null && dialogue?.npcId) return dialogue.choose(hot);
    if (hot !== null) hud?.cast(hot);
    if (a === 'potionHealth') hud?.quickUse('health');
    if (a === 'potionResource') hud?.quickUse('resource');
    if (!UI_ACTIONS.has(a)) for (const fn of actionFns) fn(a);
  }

  window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && (t as HTMLInputElement).type !== 'range' && (t as HTMLInputElement).type !== 'checkbox') return;
    const a = keys.action(e.code);
    if (!a) return;
    e.preventDefault();
    if (e.repeat) return;
    handleAction(a);
  });

  showScreen('title');

  return {
    get session() {
      return session;
    },
    get blocksGame() {
      return screen !== 'game' || modals.length > 0;
    },
    get options() {
      return options;
    },
    keys,
    frame(dt: number) {
      if (!session || screen !== 'game') return;
      if (modals.length === 0) (session as Partial<{ tick(dt: number): void }>).tick?.(dt);
      hud?.update(dt);
      if (tracker) {
        tracker.update();
        // La mochila ocupa la columna derecha: el seguimiento se aparta.
        tracker.el.classList.toggle('behind', inventory?.isOpen ?? false);
      }
      for (const p of panels()) p.flush();
    },
    onAction: (fn) => void actionFns.push(fn),
    onOptions: (fn) => {
      optionFns.push(fn);
      fn(options);
    },
    onSession: (fn) => void sessionFns.push(fn),
    get merchantOpen() {
      return shop?.merchantId ?? null;
    },
    toast: (text, tone) => toast(text, tone),
    closeMerchant() {
      if (shop?.isOpen) {
        shop.close();
        inventory?.invalidate();
      }
    },
    get dialogueOpen() {
      return dialogue?.npcId ?? null;
    },
    closeDialogue() {
      dialogue?.close();
    },
  };
}

function safeLocalStorage(): KeyValueStore {
  try {
    const ls = window.localStorage;
    const k = '__fmg_probe';
    ls.setItem(k, '1');
    ls.removeItem(k);
    return ls;
  } catch {
    return new MemoryStore();
  }
}
