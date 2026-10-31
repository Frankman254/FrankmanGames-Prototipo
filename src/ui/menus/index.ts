// Punto de montaje de toda la interfaz de menús (DOM/CSS sobre el lienzo).
// `main.ts` sólo llama a `mountMenus(factory)`: cambiar la `FakeSession` por la
// sesión real es cambiar la fábrica que se pasa, nada más.
import '../styles/menus.css';
import '../styles/themes.css';
import '../styles/options.css';
import '../styles/map.css';
import keybindingsJson from '../../../data/ui/keybindings.json';
import { HudLayout } from '../map/hudLayout';
import { HudProfileBook, autoUiScale, uiViewportBounds } from '../map/hudProfiles';
import { MAP_DEF } from '../map/mapData';
import { MapState, type MapFrame, type MapWorld } from '../map/mapState';
import { Minimap } from '../map/minimap';
import { WorldMap } from '../map/worldMap';
import { RARITIES, type GameSessionApi, type GameSessionFactory, type SessionEvent } from '../../rpg/contracts';
import { CharacterPanel } from './character';
import { ConfirmGate } from './confirmGate';
import { DialogueWindow } from './dialogue';
import type { ToastTone, UiContext } from './context';
import { button, clear, h } from './dom';
import { DragController } from './drag';
import { applyDrop, resolveDrop, type DragSource, type DropTarget } from './dragModel';
import { GameHud } from './hud';
import { RARITY_COLOR } from './icons';
import { InventoryPanel } from './inventory';
import { JournalPanel } from './journal';
import { KeyMap, UI_ACTIONS, applyOverrides, diffBindings, hotbarIndex, parseKeybindings, setKeyboardLayout, type Action } from './keybindings';
import type { Panel } from './panel';
import { QuestTracker } from './questTracker';
import { SaveStore, loadOptions, saveOptions, MemoryStore, type GameOptions, type KeyValueStore } from './saveStore';
import { creationScreen } from './screens/creation';
import { confirmModal, keybindsModal, modal, optionsModal, pauseModal, slotsModal } from './screens/modals';
import { titleScreen } from './screens/title';
import { WindowLayout } from './windows';
import { CombatBar, WorldInfo, type Combatant, type WorldInfoView } from './worldHud';
import { ShopPanel } from './shop';
import { SpoilsPanel } from './spoils';
import { SpellbookPanel } from './spellbook';
import { Tooltip } from './tooltip';

export type { Action } from './keybindings';
export type { GameOptions } from './saveStore';
export type { MapFrame, MapWorld } from '../map/mapState';

/** Rareza en palabras, para la confirmación de venta. */
const RARITY_NAME: Record<(typeof RARITIES)[number], string> = { common: 'común', uncommon: 'poco común', rare: 'raro', epic: 'épico', legendary: 'legendario' };

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
  /** Cada fotograma: mapa y zona de arriba, y enemigos con agro para la barra de combate. */
  setWorld(info: WorldInfoView, combatants: readonly Combatant[]): void;
  /** Pantalla de muerte con un botón para reaparecer. */
  showDeath(where: string, onRespawn: () => void, energy?: { lost: number; value: number; max: number; exhausted: boolean }): void;
  /** Lista de Piedras Pintadas conocidas para viajar. */
  pickStone(list: readonly { id: string; name: string; current: boolean }[], onPick: (id: string) => void): void;
  /** Una vez al arrancar: el mundo para el minimapa y el mapa grande. */
  setMapWorld(w: MapWorld): void;
  /** Cada fotograma con partida: jugador, marcadores y objetivo de la misión. */
  setMap(f: MapFrame): void;
}

type Screen = 'title' | 'creation' | 'game';

const KEYS_STORE = 'frankmangames.keybindings';

export function mountMenus(factory: GameSessionFactory, opts: MenusOptions = {}): MenusController {
  const root = opts.root ?? document.getElementById('menus') ?? document.body.appendChild(h('div', { id: 'menus' }));
  root.classList.add('menus-root');
  document.body.classList.add('menus-on');
  const storage = opts.storage ?? safeLocalStorage();
  const saves = new SaveStore(storage);
  let options = loadOptions(storage);
  const windows = new WindowLayout(storage);
  // Minimapa, mapa grande (niebla y banderas por personaje) y perfiles del HUD.
  const mapState = new MapState(MAP_DEF, storage);
  let lastDt = 1 / 60;
  // Atajos de datos + los que cambió el jugador (guardados en este equipo).
  const defaultKeys = parseKeybindings(keybindingsJson);
  let savedKeys: unknown = null;
  try {
    savedKeys = JSON.parse(storage.getItem(KEYS_STORE) ?? 'null');
  } catch {
    savedKeys = null;
  }
  const keys = new KeyMap(applyOverrides(defaultKeys, savedKeys));
  // Nombres de las teclas según la distribución real (Ñ en español, ; en inglés…).
  const kb = (navigator as Navigator & { keyboard?: { getLayoutMap?: () => Promise<ReadonlyMap<string, string>> } }).keyboard;
  void kb?.getLayoutMap?.().then((m) => {
    setKeyboardLayout(m);
    rebuildHud();
  }).catch(() => undefined);
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
  const hudEditLayer = h('div.layer.layer-hudedit');
  const banner = h('div.levelup-banner');
  toastLayer.appendChild(banner);
  root.append(screenLayer, gameLayer, hudEditLayer, modalLayer, toastLayer);

  const tooltip = new Tooltip(root);
  // Antes de `applyLook`, que le avisa del bloqueo de ventanas. Sólo usa avisos y confirmaciones.
  const hudLayout = new HudLayout({ toast: (t, tone) => toast(t, tone), confirm: (c) => ctx.confirm(c) }, windows, new HudProfileBook(storage));
  hudEditLayer.appendChild(hudLayout.toolbar);
  applyLook(options);
  // Con el tamaño automático, la escala sigue a la ventana.
  window.addEventListener('resize', () => {
    if (options.uiScaleAuto) applyLook(options);
  });
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
    windows,
    toast,
    merchant: () => shop?.merchantId ?? null,
    sell: (uid) => sellFlow(uid),
    trade: new ConfirmGate(),
    confirm: ({ title, text, yes, input, skip, onYes }) => {
      const m = confirmModal(title, text, yes, input, (n, skipped) => {
        popModal();
        onYes(n, skipped);
      }, popModal, skip ? 'No volver a preguntar en esta sesión' : undefined);
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
  let worldInfo: WorldInfo | null = null;
  let combatBar: CombatBar | null = null;
  let spoils: SpoilsPanel | null = null;
  let minimap: Minimap | null = null;
  let worldMap: WorldMap | null = null;
  let trackerShown = false;
  const panels = (): Panel[] => [inventory, character, spellbook, shop, journal, worldMap].filter((p): p is Panel => p !== null);

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
    const stack = it.quantity > 1;
    const unit = Math.floor(s.sellValue(uid) / it.quantity);
    const p = ctx.trade.prompt({ kind: 'sell', stack, rarity: def.rarity, confirmRareSell: options.confirmRareSell });
    if (p.mode === 'direct') return sellAll(it.quantity);
    const rare = RARITIES.indexOf(def.rarity) >= RARITIES.indexOf('rare') ? ` Es un objeto ${RARITY_NAME[def.rarity]}.` : '';
    ctx.confirm({
      title: `Vender ${def.name}`,
      text: stack ? `${unit} monedas cada uno.${rare} ¿Cuántos?` : `¿Venderlo por ${s.sellValue(uid)} monedas?${rare}`,
      yes: 'Vender',
      input: p.mode === 'quantity' ? { min: 1, max: it.quantity, value: it.quantity } : undefined,
      skip: p.skippable,
      onYes: (n, skip) => {
        if (skip) ctx.trade.skip('sell');
        sellAll(n);
      },
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

  /** Zona muy por encima de tu nivel: la pantalla late en rojo y sale un aviso que se desvanece. */
  function dangerFlash(zone: string, diff: number): void {
    const el = h('div.danger-flash', null, h('div.df-title', { text: 'Zona de alto riesgo' }), h('div.df-sub', { text: `${zone} · ${diff} niveles por encima del tuyo` }));
    toastLayer.appendChild(el);
    setTimeout(() => el.remove(), 4200);
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
    // Las ventanas modales también se arrastran por la cabecera.
    const box = el.querySelector<HTMLElement>('.panel.modal');
    const head = box?.querySelector<HTMLElement>('.panel-head');
    if (box && head) {
      const key = [...box.classList].find((c) => c.endsWith('-modal')) ?? 'modal';
      windows.attach(box, head, key);
      windows.restore(box);
    }
    tooltip.hide();
  }

  function popModal(): void {
    const gone = modals.pop();
    const box = gone?.querySelector<HTMLElement>('.panel.modal');
    if (box) windows.detach(box);
    gone?.remove();
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
    ctx.trade = new ConfirmGate();
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
    worldInfo = new WorldInfo();
    combatBar = new CombatBar(ctx);
    spoils = new SpoilsPanel(ctx);
    const bar = combatBar;
    bar.ctxRestore = () => windows.restore(bar.el);
    minimap = new Minimap(mapState, storage, () => togglePanel('map', true), keys.label('map'));
    worldMap = new WorldMap(ctx, mapState, storage, () => togglePanel('map', false));
    trackerShown = false;
    gameLayer.append(hud.el, worldInfo.el, combatBar.el, tracker.el, minimap.el, character.el, spellbook.el, journal.el, shop.el, inventory.el, worldMap.el, dialogue.el, spoils.el);
    mapState.setCharacter(s.player().name);
    showScreen('game');
    attachHud();
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
    worldInfo = null;
    combatBar = null;
    spoils = null;
    hudLayout.setEditing(false);
    mapState.flush();
    minimap = null;
    worldMap = null;
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
      case 'zoneEnter': {
        // "Pradera de los lobos · niv. 5–12"; si la franja queda muy por encima, también un aviso.
        showBanner(e.name, e.safe ? 'zona segura' : `niv. ${e.levelMin}–${e.levelMax}`);
        if (!e.safe && e.levelMin >= s.player().level + 5) dangerFlash(e.name, e.levelMin - s.player().level);
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
      case 'spoils':
        spoils?.show();
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
      optionsModal(options, setOptions, {
        back: popModal,
        keybinds: () =>
          pushModal(
            keybindsModal(
              keys,
              defaultKeys,
              () => {
                storage.setItem(KEYS_STORE, JSON.stringify(diffBindings(defaultKeys, keys.bindings)));
                rebuildHud();
              },
              popModal,
            ),
          ),
        resetWindows: () => {
          windows.reset();
          hudLayout.profiles.resetActive();
          hudLayout.apply();
          toast('Ventanas en su sitio de siempre');
        },
        keyLabel: (a) => keys.label(a),
        editHud: () => {
          if (screen !== 'game') {
            toast('El HUD se edita durante la partida', 'warn');
            return;
          }
          closeModals();
          hudLayout.setEditing(true);
        },
      }),
    );
  }

  /** Cambia las opciones: se guardan, se aplican a la interfaz y se avisan a `main.ts` y al audio. */
  function setOptions(o: GameOptions): void {
    options = o;
    saveOptions(storage, o);
    applyLook(o);
    for (const fn of optionFns) fn(o);
  }

  /** Tema, letra, escalas, opacidad, animaciones, tooltips, ventanas bloqueadas y pantalla completa. */
  function applyLook(o: GameOptions): void {
    const html = document.documentElement;
    const uiScale = uiScaleOf(o);
    const bounds = uiViewportBounds(window.innerWidth, window.innerHeight, uiScale);
    html.dataset['theme'] = o.theme;
    html.dataset['font'] = o.font;
    html.style.setProperty('--ui-scale', String(uiScale));
    // Los overlays ocupan el viewport sin escalar; sus contenidos sí escalan,
    // pero nunca pueden medir más que el área visible equivalente.
    html.style.setProperty('--ui-max-width', `${bounds.width}px`);
    html.style.setProperty('--ui-max-height', `${bounds.height}px`);
    html.style.setProperty('--hotbar-icon-scale', String(o.hotbarIconScale));
    html.style.setProperty('--bag-icon-scale', String(o.bagIconScale));
    html.style.setProperty('--window-opacity', String(o.windowOpacity));
    html.style.setProperty('--combat-log-size', `${o.combatLogSize}px`);
    html.classList.toggle('no-ui-anim', !o.uiAnimations);
    tooltip.delay = o.tooltipDelay;
    windows.locked = o.lockWindows;
    hudLayout.lockChanged(o.lockWindows);
    windows.refresh();
    document.body.classList.toggle('windows-locked', o.lockWindows);
    applyFullscreen(o.fullscreen);
  }

  /** Escala en uso: la automática sale del tamaño real de la pantalla. */
  function uiScaleOf(o: GameOptions): number {
    return o.uiScaleAuto ? autoUiScale(window.innerWidth, window.innerHeight, window.devicePixelRatio, mapState.def.autoScale) : o.uiScale;
  }

  /** Los elementos del HUD que se mueven en «Editar interfaz», en su sitio del perfil activo. */
  function attachHud(): void {
    const bar = hud?.el.querySelector<HTMLElement>('.hud-actionbar');
    if (bar) hudLayout.attach(bar, 'hud-bar');
    if (worldInfo) hudLayout.attach(worldInfo.el, 'world-info');
    if (combatBar) hudLayout.attach(combatBar.el, 'combat-bar');
    if (tracker) hudLayout.attach(tracker.el, 'quest-tracker');
    if (minimap) {
      hudLayout.attach(minimap.el, 'minimap');
      // El minimapa también se arrastra por su cabecera fuera del modo edición.
      windows.attach(minimap.el, minimap.dragHandle, 'minimap');
      hudLayout.setMinimap(minimap);
    }
    // El registro de combate es del HUD de `main.ts` (#hud), fuera de los menús, y
    // reescribe su texto: se mueve una envoltura que lo contiene.
    const log = document.querySelector<HTMLElement>('#hud .hud-log');
    if (log) {
      let wrap = log.parentElement;
      if (!wrap?.classList.contains('hud-log-wrap')) {
        wrap = h('div.hud-log-wrap');
        log.replaceWith(wrap);
        wrap.appendChild(log);
      }
      hudLayout.attach(wrap, 'combat-log');
    }
  }

  function applyFullscreen(on: boolean): void {
    const isOn = Boolean(document.fullscreenElement);
    if (on && !isOn) void document.documentElement.requestFullscreen?.().catch(() => undefined);
    else if (!on && isOn) void document.exitFullscreen?.().catch(() => undefined);
  }

  /** Rehace el HUD (etiquetas de teclas) y repinta los paneles. */
  function rebuildHud(): void {
    if (!hud || !session) return;
    const old = hud.el;
    hud = new GameHud(ctx, (a) => handleAction(a));
    old.replaceWith(hud.el);
    const bar = hud.el.querySelector<HTMLElement>('.hud-actionbar');
    if (bar) hudLayout.attach(bar, 'hud-bar');
    for (const p of panels()) p.invalidate();
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

  function togglePanel(which: 'inventory' | 'character' | 'spellbook' | 'journal' | 'map', force?: boolean): void {
    const p = { inventory, character, spellbook, journal, map: worldMap }[which];
    if (!p) return;
    const open = force ?? !p.isOpen;
    if (open) {
      // Personaje, libro, diario y tienda comparten la columna izquierda.
      if (which !== 'inventory' && which !== 'map') {
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
    // Pantalla completa, trayectoria y cuadrícula valen en cualquier pantalla.
    if (a === 'fullscreen') return setOptions({ ...options, fullscreen: !options.fullscreen });
    if (a === 'togglePath' || a === 'toggleGrid') {
      const key = a === 'togglePath' ? 'showPath' : 'showGrid';
      setOptions({ ...options, [key]: !options[key] });
      toast(`${a === 'togglePath' ? 'Trayectoria' : 'Cuadrícula'}: ${options[key] ? 'visible' : 'oculta'}`);
      return;
    }
    if (modals.length) {
      if (a === 'pause') popModal();
      return;
    }
    if (screen === 'creation') {
      if (a === 'pause') showScreen('title');
      return;
    }
    if (screen !== 'game' || !session) return;
    if (a === 'editHud') return hudLayout.toggle();
    if (a === 'pause' && hudLayout.editing) return hudLayout.setEditing(false);
    if (a === 'map') return togglePanel('map');
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

  // Salir de pantalla completa con Esc (o desde el sistema) actualiza la opción.
  document.addEventListener('fullscreenchange', () => {
    const on = Boolean(document.fullscreenElement);
    if (on !== options.fullscreen) setOptions({ ...options, fullscreen: on });
  });
  // Sin un gesto del jugador no se puede entrar en pantalla completa al arrancar:
  // se reintenta con el primer clic o tecla.
  const retryFullscreen = (): void => {
    window.removeEventListener('pointerdown', retryFullscreen, true);
    window.removeEventListener('keydown', retryFullscreen, true);
    applyFullscreen(options.fullscreen);
  };
  window.addEventListener('pointerdown', retryFullscreen, true);
  window.addEventListener('keydown', retryFullscreen, true);

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
      spoils?.update(dt, modals.length === 0);
      lastDt = dt;
      minimap?.update(dt);
      worldMap?.update(dt);
      if (tracker) {
        tracker.update();
        // Al aparecer, a su sitio del perfil.
        if (!tracker.el.hidden && !trackerShown) windows.restore(tracker.el);
        trackerShown = !tracker.el.hidden;
        // La mochila ocupa la columna derecha: el seguimiento se aparta.
        tracker.el.classList.toggle('behind', inventory?.isOpen ?? false);
      }
      for (const p of panels()) p.flush();
      spoils?.flush();
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
    setWorld(info, list) {
      worldInfo?.update(info);
      combatBar?.update(list);
    },
    setMapWorld(w) {
      mapState.setWorld(w);
    },
    setMap(f) {
      mapState.update(f, lastDt);
    },
    showDeath(where, onRespawn, energy) {
      closeModals();
      const pulse = session?.player().energy;
      pushModal(
        modal('Has caído', 'death-modal',
          h('p.death-text', { text: 'Los monstruos de esta tierra no perdonan. Puedes volver a la última Piedra Pintada que tocaste.' }),
          energy
            ? h('div.energy-death', null,
              h('b', { text: `${pulse?.name ?? 'Energía'}: ${energy.value} / ${energy.max}` }),
              h('p', { text: `Esta caída te costó ${energy.lost} puntos.${pulse?.penalty ? ` ${pulse.penalty.name}: ${pulse.penalty.description} (se quita al llegar a ${pulse.penalty.clearAt}).` : ''}` }),
            )
            : null,
          h('div.row-end', null, button(`Reaparecer en ${where}`, () => {
            popModal();
            onRespawn();
          }, 'primary'))),
      );
    },
    pickStone(list, onPick) {
      const rows = list.map((z) => button(z.current ? `${z.name} (aquí)` : z.name, () => {
        popModal();
        onPick(z.id);
      }, z.current ? 'small' : 'small primary'));
      for (const [i, z] of list.entries()) if (z.current) rows[i]!.disabled = true;
      pushModal(modal('Piedra Pintada', 'stone-modal', h('p.hint', { text: '¡Sube, sube, que hay puesto! Viaja a una Piedra Pintada que ya hayas tocado.' }), h('nav.modal-menu', null, ...rows), h('div.row-end', null, button('Cerrar', popModal))));
    },
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
