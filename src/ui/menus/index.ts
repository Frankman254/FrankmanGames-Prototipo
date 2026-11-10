// Punto de montaje de toda la interfaz de menús (DOM/CSS sobre el lienzo).
// `main.ts` sólo llama a `mountMenus(factory)`: cambiar la `FakeSession` por la
// sesión real es cambiar la fábrica que se pasa, nada más.
import type { Appearance } from '../../rpg/appearance';
import zonesJson from '../../../data/zones.json';
import type { ChatPart } from '../chatLog';
import { artIcon } from './artIcons';
import type { CharacterSex } from '../../rpg/contracts';
import { patternCssUrl, zonePattern } from '../../art/patterns';
import '../styles/menus.css';
import '../styles/themes.css';
import '../styles/options.css';
import '../styles/map.css';
import '../styles/ventanas.css';
import '../styles/decor.css';
import keybindingsJson from '../../../data/ui/keybindings.json';
import { HudLayout } from '../map/hudLayout';
import { HudProfileBook, autoUiScale, uiViewportBounds } from '../map/hudProfiles';
import { MAP_DEF } from '../map/mapData';
import { MapState, type MapFrame, type MapWorld } from '../map/mapState';
import { Minimap } from '../map/minimap';
import { WorldMap } from '../map/worldMap';
import { RARITIES, type GameSessionApi, type GameSessionFactory, type SaveData, type SessionEvent } from '../../rpg/contracts';
import { CharacterPanel } from './character';
import { ConfirmGate } from './confirmGate';
import { DialogueWindow } from './dialogue';
import type { ToastTone, UiContext } from './context';
import { button, clear, h, retranslate } from './dom';
import { DragController } from './drag';
import { applyDrop, resolveDrop, type DragSource, type DropTarget } from './dragModel';
import { pulseText } from './format';
import { GameHud } from './hud';
import { RARITY_COLOR } from './icons';
import { InventoryPanel } from './inventory';
import { BankPanel } from './bankPanel';
import { JournalPanel } from './journal';
import { CompendiumPanel } from './compendium';
import { ProfessionsPanel, type ProfessionsPanelData } from './professions';
import { ChatBox } from './chat';
import { setLanguage } from '../../i18n';
import chatJson from '../../../data/ui/chat.json';
import { parseChatDef } from '../chatLog';
import type { Compendium } from '../../rpg/compendium';
import { KeyMap, UI_ACTIONS, applyOverrides, diffBindings, hotbarIndex, itemBarIndex, parseKeybindings, setKeyboardLayout, type Action } from './keybindings';
import { modalPolicy, type ModalMode } from './modalPolicy';
import type { Panel } from './panel';
import { QuestTracker } from './questTracker';
import { SLOT_COUNT, SaveStore, devProgressionGains, loadOptions, saveOptions, MemoryStore, type GameOptions, type KeyValueStore, type WindowSizeId } from './saveStore';
import { creationScreen } from './screens/creation';
import { confirmModal, keybindsModal, modal, optionsModal, pauseModal, presetsModal, slotsModal, type PresetEntry } from './screens/modals';
import { titleScreen } from './screens/title';
import { UI_LAYER_Z, WindowLayout } from './windows';
import { BossBar, CombatBar, WorldInfo, type BossView, type Combatant, type WorldInfoView } from './worldHud';
import { ShopPanel } from './shop';
import { SpoilsPanel } from './spoils';
import { SpellbookPanel } from './spellbook';
import { Tooltip } from './tooltip';
import { onUiSound as subscribeUiSound, type UiSoundEvent } from './uiSound';

export type { Action } from './keybindings';
export type { GameOptions } from './saveStore';
export type { MapFrame, MapWorld } from '../map/mapState';

/** Rareza en palabras, para la confirmación de venta. */
const RARITY_NAME: Record<(typeof RARITIES)[number], string> = { common: 'común', uncommon: 'poco común', rare: 'raro', epic: 'épico', legendary: 'legendario' };

export interface MenusOptions {
  /** Datos del compendio; sin ellos, no hay ventana. */
  compendium?: Compendium;
  /** Datos de oficios; sin ellos, no hay ventana. */
  professions?: ProfessionsPanelData;
  /** Contenedor; por defecto `#menus` o uno nuevo en `body`. */
  root?: HTMLElement;
  /** Almacén de guardados y opciones; por defecto `localStorage`. */
  storage?: KeyValueStore;
  /** Semilla de las partidas nuevas/cargadas. */
  seed?: () => number;
  /** Cerrar la aplicación (Electron: `window.close()`). */
  quit?: () => void;
  /** Sólo desarrollo (o con la marca): «Partidas de prueba» en el título y la pausa. */
  devPresets?: DevPresets;
}

/** Partidas de prueba para el menú (las hace `src/dev/presets.ts`). */
export interface DevPresets {
  groups: { name: string; entries: PresetEntry[] }[];
  /** El guardado de la partida de prueba, o null si ya no se puede hacer. */
  build(id: string, progression: NonNullable<SaveData['progressionGains']>): SaveData | null;
}

export interface MenusController {
  /** Teclas que `main.ts` se queda (vuelo): si devuelve true, la tecla no dispara ninguna acción. */
  keyFilter: ((code: string) => boolean) | null;
  /** Sesión en curso (null en el título o la creación). */
  readonly session: GameSessionApi | null;
  /** Pantalla completa actual; el audio usa título/creación como contexto de portada. */
  readonly screen: MenuScreen;
  /** Compatibilidad: true si la simulación o el puntero del mundo están bloqueados. */
  readonly blocksGame: boolean;
  /** El reloj fijo y los sistemas de sesión deben detenerse. */
  readonly simulationPaused: boolean;
  /** Una pantalla o modal captura las teclas de juego. */
  readonly keyboardCaptured: boolean;
  /** Una pantalla o modal impide órdenes de puntero al mundo. */
  readonly pointerCaptured: boolean;
  readonly options: GameOptions;
  readonly keys: KeyMap;
  /** Llamar una vez por fotograma con el tiempo real transcurrido. */
  frame(dt: number): void;
  /** Acciones que la interfaz no resuelve (evasión, depuración, prueba de carga…) y las de la barra. */
  onAction(fn: (a: Action) => void): void;
  onOptions(fn: (o: GameOptions) => void): void;
  /** Sonidos que declara la interfaz (clics y paneles); el audio se suscribe aquí. */
  onUiSound(fn: (e: UiSoundEvent) => void): () => void;
  /** Al empezar o cargar una partida (para enlazar la sesión con el mundo). */
  onSession(fn: (s: GameSessionApi) => void): void;
  /** Mercader con la tienda abierta (Slice 05), o null. */
  readonly merchantOpen: string | null;
  /** Cierra la tienda (p. ej. al alejarse del mercader). */
  closeMerchant(): void;
  /** Banco abierto por una interacción validada por la sesión. */
  showBank(): void;
  closeBank(): void;
  /** Ejecuta la acción asignada a un código que no es de teclado (clic de rueda). */
  pressBinding(code: string): void;
  /** Abre la ventana de oficios por uno concreto (al llegar a un taller). */
  showProfessions(professionId: string): void;
  /** Coloca la burbuja de chat sobre la cabeza del personaje (coordenadas de pantalla). */
  anchorChatBubble(x: number, y: number): void;
  /** PNJ con la conversación abierta (Slice 06), o null. */
  readonly dialogueOpen: string | null;
  /** Cierra la conversación (p. ej. al alejarse del PNJ). */
  closeDialogue(): void;
  /** Aviso breve en pantalla. */
  toast(text: string, tone?: ToastTone): void;
  /** U01: línea del mundo (combate, zonas…) al chat, en trozos de color. */
  chatFeed(channel: string, parts: ChatPart[]): void;
  /** Cada fotograma: mapa y zona de arriba, y enemigos con agro para la barra de combate. */
  setWorld(info: WorldInfoView, combatants: readonly Combatant[], boss?: BossView | null): void;
  /** Pantalla de muerte con un botón para reaparecer. */
  showDeath(where: string, onRespawn: () => void, energy?: { lost: number; value: number; max: number; exhausted: boolean }): void;
  /** Lista de Piedras Pintadas conocidas para viajar. */
  pickStone(list: readonly { id: string; name: string; current: boolean }[], onPick: (id: string) => void): void;
  /** Una vez al arrancar: el mundo para el minimapa y el mapa grande. */
  setMapWorld(w: MapWorld): void;
  /** Cada fotograma con partida: jugador, marcadores y objetivo de la misión. */
  setMap(f: MapFrame): void;
}

export type MenuScreen = 'title' | 'creation' | 'game';

const KEYS_STORE = 'frankmangames.keybindings';

/** Cada cuánto se guarda solo la partida en su ranura (si se cierra o se cuelga, se pierde como mucho esto). */
export const AUTOSAVE_SECONDS = 120;

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
  const hooks: { keyFilter: ((code: string) => boolean) | null } = { keyFilter: null };
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
  /** Autoguardado (creador, 2026-11-07): segundos de juego desde el último guardado en la ranura en curso. */
  let sinceAutosave = 0;
  let screen: MenuScreen = 'title';
  const modals: Array<{ el: HTMLElement; mode: ModalMode; dismissible: boolean }> = [];

  // Capas: pantallas completas < HUD y paneles < modales < toasts < tooltip/fantasma.
  const screenLayer = h('div.layer.layer-screen');
  const gameLayer = h('div.layer.layer-game');
  const modalLayer = h('div.layer.layer-modal');
  const toastLayer = h('div.layer.layer-toast');
  const hudEditLayer = h('div.layer.layer-hudedit');
  screenLayer.style.zIndex = String(UI_LAYER_Z.screen);
  gameLayer.style.zIndex = String(UI_LAYER_Z.game);
  hudEditLayer.style.zIndex = String(UI_LAYER_Z.hudEdit);
  modalLayer.style.zIndex = String(UI_LAYER_Z.modal);
  toastLayer.style.zIndex = String(UI_LAYER_Z.toast);
  const banner = h('div.levelup-banner');
  toastLayer.appendChild(banner);
  root.append(screenLayer, gameLayer, hudEditLayer, modalLayer, toastLayer);

  const tooltip = new Tooltip(root);
  // Antes de `applyLook`, que le avisa del bloqueo de ventanas. Sólo usa avisos y confirmaciones.
  const hudLayout = new HudLayout({ toast: (t, tone) => toast(t, tone), confirm: (c) => ctx.confirm(c) }, windows, new HudProfileBook(storage));

  // U03: menú fijo arriba a la derecha (no se mueve) con lo imprescindible del sistema.
  const sysButton = (art: string | null, glyph: string, label: string, fn: () => void): HTMLButtonElement => {
    const b = h('button.sys-btn', { type: 'button', title: label, 'aria-label': label });
    b.innerHTML = (art ? artIcon('ui', art) : null) ?? `<span class="sys-glyph">${glyph}</span>`;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      fn();
    });
    return b;
  };
  const sysMenu = h('nav.sys-menu', { 'aria-label': 'Menú del sistema' },
    sysButton('options', '⚙', 'Opciones', () => openOptions()),
    sysButton(null, '💾', 'Guardar partida', () => openSlots('save')),
    sysButton(null, '✎', 'Editar interfaz', () => hudLayout.toggle()),
    sysButton('pause', '☰', 'Menú', () => openPause()),
    sysButton(null, '⏻', 'Salir al título', () => ctx.confirm({ title: 'Salir al título', text: 'Lo que no hayas guardado se perderá.', yes: 'Salir', onYes: quitToTitle })),
  );
  sysMenu.addEventListener('pointerdown', (e) => e.stopPropagation());
  gameLayer.appendChild(sysMenu);
  hudEditLayer.appendChild(hudLayout.toolbar);
  setLanguage(options.language);
  document.documentElement.lang = options.language;
  let appliedWindowSize: WindowSizeId | null = null;
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
  let tradeInventory: InventoryPanel | null = null;
  let bank: BankPanel | null = null;
  let character: CharacterPanel | null = null;
  let spellbook: SpellbookPanel | null = null;
  let shop: ShopPanel | null = null;
  let journal: JournalPanel | null = null;
  let compendium: CompendiumPanel | null = null;
  let professions: ProfessionsPanel | null = null;
  let chat: ChatBox | null = null;
  const chatDef = parseChatDef(chatJson);
  let dialogue: DialogueWindow | null = null;
  let tracker: QuestTracker | null = null;
  let worldInfo: WorldInfo | null = null;
  let combatBar: CombatBar | null = null;
  let bossBar: BossBar | null = null;
  let spoils: SpoilsPanel | null = null;
  let wasSpectral = false;
  let minimap: Minimap | null = null;
  let worldMap: WorldMap | null = null;
  let trackerShown = false;
  const panels = (): Panel[] => ([inventory, tradeInventory, bank, character, spellbook, shop, journal, compendium, professions, worldMap] as (Panel | null)[]).filter((p): p is Panel => p !== null);

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

  function showBanner(text: string, sub: string, zoneId?: string): void {
    clear(banner);
    banner.append(h('div.big', { text }), h('div.sub', { text: sub }));
    // Cada zona firma con su lenguaje geométrico.
    const pattern = zoneId ? zonePattern(zoneId) : null;
    if (pattern) {
      const band = h('div.zone-band');
      band.style.backgroundImage = patternCssUrl(pattern.family, pattern.palette);
      banner.append(band);
    }
    banner.classList.remove('on');
    void banner.offsetWidth;
    banner.classList.add('on');
  }

  // ─── Modales ──────────────────────────────────────────────────────────────

  function pushModal(el: HTMLElement, mode: ModalMode = 'blocking', dismissible = true): void {
    for (const m of modals) m.el.hidden = true;
    modals.push({ el, mode, dismissible });
    el.classList.toggle('world-overlay', mode === 'overlay');
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
    const gone = modals.pop()?.el;
    const box = gone?.querySelector<HTMLElement>('.panel.modal');
    if (box) windows.detach(box);
    gone?.remove();
    const top = modals[modals.length - 1]?.el;
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

  function showScreen(s: MenuScreen): void {
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
          ...(opts.devPresets ? { presets: openPresets } : {}),
        }),
      );
    } else if (s === 'creation') {
      screenLayer.appendChild(creationScreen(content, tooltip, startNew, () => showScreen('title')));
    }
  }

  function startNew(classId: string, name: string, sex: CharacterSex = 'masculino', appearance?: Appearance): void {
    setSession(factory.newGame(classId, name, seed(), sex, appearance));
    currentSlot = saves.firstEmpty();
    if (currentSlot !== null) saveTo(currentSlot, true);
    toast(currentSlot !== null ? `Partida nueva en la ranura ${currentSlot + 1}` : `Las ${SLOT_COUNT} ranuras están ocupadas: guarda desde la pausa`, 'info');
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
    sinceAutosave = 0;
    // Volver a guardar en la misma ranura conserva el nombre que le puso el jugador.
    const label = slot === currentSlot ? saves.read(slot)?.label : undefined;
    const { label: _drop, ...data } = session.save();
    saves.write(slot, label ? { ...data, label } : data);
    currentSlot = slot;
    if (!quiet) toast(`Guardado en la ranura ${slot + 1}`, 'info');
  }

  function setSession(s: GameSessionApi): void {
    for (const panel of panels()) panel.close();
    unsubscribe?.();
    session = s;
    wasSpectral = s.player().spectral?.active === true;
    unsubscribe = s.on(onSessionEvent);
    ctx.trade = new ConfirmGate();
    clear(gameLayer);
    hud = new GameHud(ctx, (a) => handleAction(a));
    inventory = new InventoryPanel(ctx, () => togglePanel('inventory', false), false, () => togglePanel('character'));
    tradeInventory = new InventoryPanel(ctx, () => tradeInventory?.close(), true);
    bank = new BankPanel(ctx, () => bank?.close());
    character = new CharacterPanel(ctx, () => togglePanel('character', false));
    spellbook = new SpellbookPanel(ctx, () => togglePanel('spellbook', false));
    shop = new ShopPanel(ctx, () => {
      shop?.close();
      tradeInventory?.close();
      inventory?.invalidate();
    });
    journal = new JournalPanel(ctx, () => togglePanel('journal', false));
    compendium = opts.compendium ? new CompendiumPanel(ctx, () => togglePanel('compendium', false), opts.compendium) : null;
    professions = opts.professions ? new ProfessionsPanel(ctx, () => togglePanel('professions', false), opts.professions) : null;
    dialogue = new DialogueWindow(ctx);
    tracker = new QuestTracker(ctx, () => togglePanel('journal', true));
    worldInfo = new WorldInfo();
    combatBar = new CombatBar(ctx);
    bossBar = new BossBar();
    spoils = new SpoilsPanel(ctx);
    const bar = combatBar;
    bar.ctxRestore = () => windows.restore(bar.el);
    minimap = new Minimap(mapState, storage, () => togglePanel('map', true), keys.label('map'));
    worldMap = new WorldMap(ctx, mapState, storage, () => togglePanel('map', false));
    trackerShown = false;
    chat = new ChatBox(chatDef, () => session?.player().name ?? '', gameLayer);
    gameLayer.append(chat.el, hud.el, worldInfo.el, bossBar.el, combatBar.el, tracker.el, minimap.el, character.el, spellbook.el, journal.el, ...(compendium ? [compendium.el] : []), ...(professions ? [professions.el] : []), shop.el, inventory.el, tradeInventory.el, bank.el, worldMap.el, dialogue.el, spoils.el);
    mapState.setCharacter(s.player().name);
    showScreen('game');
    attachHud();
    if (s.spoils?.()) spoils.show();
    for (const fn of sessionFns) fn(s);
  }

  function quitToTitle(): void {
    for (const panel of panels()) panel.close();
    closeModals();
    unsubscribe?.();
    unsubscribe = null;
    session = null;
    hud = inventory = character = spellbook = shop = journal = compendium = professions = chat = null;
    tradeInventory = null;
    bank = null;
    dialogue = null;
    tracker = null;
    worldInfo = null;
    combatBar = null;
    bossBar = null;
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
        showBanner(
          `¡Nivel ${e.level}!`,
          `+${s.content.progression.statPointsPerLevel} puntos · +${s.content.progression.healthPerLevel} vida · +${s.content.progression.inventoryWeightPerLevel} Briznas (${keys.label('character')})`,
        );
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
        chat?.system(e.text);
        break;
      case 'openMerchant':
        // La tienda ocupa la columna izquierda; la mochila se abre al lado para vender.
        dialogue?.close();
        character?.close();
        spellbook?.close();
        journal?.close();
        bank?.close();
        inventory?.close();
        shop?.openFor(e.merchantId);
        tradeInventory?.open();
        break;
      case 'talkNpc': {
        const v = s.talk?.(e.npcId) ?? null;
        if (v) dialogue?.open(v);
        break;
      }
      case 'zoneEnter': {
        // "Pradera de los lobos · niv. 5–12"; si la franja queda muy por encima, también un aviso.
        showBanner(e.name, e.safe ? 'zona segura' : `niv. ${e.levelMin}–${e.levelMax}`, e.zoneId);
        if (!e.safe && e.levelMin >= s.player().level + zonesJson.dangerLevelGap) dangerFlash(e.name, e.levelMin - s.player().level);
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
          ...(opts.devPresets ? { presets: openPresets } : {}),
          quitToTitle: () =>
            ctx.confirm({ title: 'Salir al título', text: 'Lo que no hayas guardado se perderá.', yes: 'Salir', onYes: quitToTitle }),
        },
        info,
      ),
      'overlay',
    );
  }

  /** Lo que se ve ahora se vuelve a pintar; las ventanas de la partida, al cargarla. */
  function languageChanged(): void {
    document.documentElement.lang = options.language;
    // F07: lo ya construido (paneles, títulos, avisos) cambia de idioma en su sitio.
    retranslate(document.body);
    if (screen === 'title') showScreen('title');
    if (screen === 'game') rebuildHud();
    if (modals[modals.length - 1]?.el.querySelector('[data-opt="language"]')) {
      popModal();
      openOptions();
    }
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
            'overlay',
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
        development: Boolean(opts.devPresets),
      }),
      'overlay',
    );
  }

  /** Cambia las opciones: se guardan, se aplican a la interfaz y se avisan a `main.ts` y al audio. */
  function setOptions(o: GameOptions): void {
    options = o;
    saveOptions(storage, o);
    applyLook(o);
    for (const fn of optionFns) fn(o);
    if (setLanguage(o.language)) languageChanged();
  }

  /** Tema, letra, escalas, opacidad, animaciones, tooltips, ventanas bloqueadas y pantalla completa. */
  function applyLook(o: GameOptions): void {
    const html = document.documentElement;
    const uiScale = uiScaleOf(o);
    const bounds = uiViewportBounds(window.innerWidth, window.innerHeight, uiScale);
    html.dataset['theme'] = o.theme;
    html.dataset['decor'] = o.decor;
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
    applyWindowSize(o.windowSize);
  }

  /** Tamaño de la ventana de escritorio; en el navegador no hay puente y no hace nada. */
  function applyWindowSize(id: WindowSizeId): void {
    if (id === appliedWindowSize) return;
    appliedWindowSize = id;
    const [w, h] = id.split('x').map(Number) as [number, number];
    (window as unknown as { frankmanDesktop?: { setWindowSize(w: number, h: number): void } }).frankmanDesktop?.setWindowSize(w, h);
  }

  /** Escala en uso: la automática sale del tamaño real de la pantalla. */
  function uiScaleOf(o: GameOptions): number {
    return o.uiScaleAuto ? autoUiScale(window.innerWidth, window.innerHeight, window.devicePixelRatio, mapState.def.autoScale) : o.uiScale;
  }

  /** Los elementos del HUD que se mueven en «Editar interfaz», en su sitio del perfil activo. */
  function attachHud(): void {
    const bar = hud?.el.querySelector<HTMLElement>('.hud-actionbar');
    if (bar) hudLayout.attach(bar, 'hud-bar');
    if (hud) hudLayout.bindBar(hud.el);
    if (worldInfo) hudLayout.attach(worldInfo.el, 'world-info');
    if (combatBar) hudLayout.attach(combatBar.el, 'combat-bar');
    if (tracker) hudLayout.attach(tracker.el, 'quest-tracker');
    if (chat) hudLayout.attach(chat.el, 'chat');
    const pet = hud?.el.querySelector<HTMLElement>('.hud-pet');
    if (pet) hudLayout.attach(pet, 'hud-pet');
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
    const desktop = (window as unknown as { frankmanDesktop?: { setFullScreen(on: boolean): void } }).frankmanDesktop;
    if (desktop) {
      desktop.setFullScreen(on);
      return;
    }
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
    hudLayout.bindBar(hud.el);
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
        rename: (slot, label) => {
          saves.rename(slot, label);
          rebuild();
          if (!session) showScreen('title');
        },
        back: popModal,
      }),
    );
  }

  /** Partidas de prueba: un clic carga (no ocupa ranura hasta que se guarde a mano). */
  function openPresets(): void {
    const dev = opts.devPresets;
    if (!dev) return;
    pushModal(
      presetsModal(dev.groups, className, {
        pick: (id) => {
          const go = (): void => {
            const p = content.progression;
            const data = dev.build(id, devProgressionGains(options, {
              statPointsPerLevel: p.statPointsPerLevel,
              healthPerLevel: p.healthPerLevel,
              inventoryWeightPerLevel: p.inventoryWeightPerLevel,
            }));
            if (!data) {
              toast('Esa partida de prueba no se puede montar con el contenido actual', 'warn');
              return;
            }
            closeModals();
            setSession(factory.load(data, seed()));
            currentSlot = null;
            toast(`${data.label ?? data.name}: guárdala desde la pausa si quieres conservarla`, 'info');
          };
          if (session) ctx.confirm({ title: 'Partida de prueba', text: 'Lo que no hayas guardado de la partida actual se perderá.', yes: 'Cargar', onYes: go });
          else go();
        },
        back: popModal,
      }),
    );
  }

  function togglePanel(which: 'inventory' | 'character' | 'spellbook' | 'journal' | 'compendium' | 'professions' | 'map', force?: boolean): void {
    const activeInventory = shop?.isOpen ? tradeInventory : inventory;
    const p = { inventory: activeInventory, character, spellbook, journal, compendium, professions, map: worldMap }[which];
    if (!p) return;
    const open = force ?? !p.isOpen;
    if (open) {
      // Cualquier ventana se abre con las demás abiertas, también con el banco o una tienda (F04).
      // Solo la mochila tiene dos formas: la de la tienda (vender) y la normal.
      if (which === 'inventory') {
        if (shop?.isOpen) inventory?.close();
        else tradeInventory?.close();
      }
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
      // Esc cierra el diálogo de delante; la tecla del menú también cierra el menú si es lo de delante.
      const top = modals[modals.length - 1]!;
      if ((a === 'closeWindow' || (a === 'pause' && top.el.classList.contains('pause-modal'))) && top.dismissible) popModal();
      return;
    }
    if (screen === 'creation') {
      if (a === 'pause' || a === 'closeWindow') showScreen('title');
      return;
    }
    if (screen !== 'game' || !session) return;
    if (a === 'editHud') return hudLayout.toggle();
    if (a === 'closeWindow' && hudLayout.editing) return hudLayout.setEditing(false);
    if (a === 'map') return togglePanel('map');
    // U06: Esc cierra solo la ventana de delante (la conversación primero); U05: el menú va aparte.
    if (a === 'closeWindow') {
      if (dialogue?.npcId) return dialogue.close();
      const open = panels().filter((p) => p.isOpen);
      const front = open.sort((x, y) => (Number(getComputedStyle(y.el).zIndex) || 0) - (Number(getComputedStyle(x.el).zIndex) || 0))[0];
      front?.close();
      return;
    }
    if (a === 'pause') return openPause();
    if (a === 'inventory' || a === 'character' || a === 'spellbook' || a === 'journal' || a === 'compendium' || a === 'professions') return togglePanel(a);
    if (a === 'chat') return chat?.focus();
    const hot = hotbarIndex(a);
    // Con una conversación abierta, 1–6 eligen opción en vez de lanzar.
    if (hot !== null && dialogue?.npcId) return dialogue.choose(hot);
    if (hot !== null) hud?.cast(hot);
    const item = itemBarIndex(a);
    if (item !== null) hud?.useItemSlot(item);
    if (a === 'potionHealth') hud?.quickUse('health');
    if (a === 'potionResource') hud?.quickUse('resource');
    if (!UI_ACTIONS.has(a)) for (const fn of actionFns) fn(a);
  }

  window.addEventListener('pagehide', () => {
    if (session && screen === 'game' && currentSlot !== null) saveTo(currentSlot, true);
  });

  window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && (t as HTMLInputElement).type !== 'range' && (t as HTMLInputElement).type !== 'checkbox') return;
    // Vuelo: WASD, Espacio y los hechizos los toma `main.ts` (no lanzan nada).
    if (hooks.keyFilter?.(e.code)) {
      e.preventDefault();
      return;
    }
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
    get keyFilter() {
      return hooks.keyFilter;
    },
    set keyFilter(fn) {
      hooks.keyFilter = fn;
    },
    get session() {
      return session;
    },
    get screen() {
      return screen;
    },
    get blocksGame() {
      const p = modalPolicy(screen, modals.map((m) => m.mode));
      return p.simulationPaused || p.pointerCaptured;
    },
    get simulationPaused() {
      return modalPolicy(screen, modals.map((m) => m.mode)).simulationPaused;
    },
    get keyboardCaptured() {
      return modalPolicy(screen, modals.map((m) => m.mode)).keyboardCaptured;
    },
    get pointerCaptured() {
      return modalPolicy(screen, modals.map((m) => m.mode)).pointerCaptured;
    },
    get options() {
      return options;
    },
    keys,
    frame(dt: number) {
      if (!session || screen !== 'game') return;
      sinceAutosave += dt;
      if (sinceAutosave >= AUTOSAVE_SECONDS) {
        sinceAutosave = 0;
        if (currentSlot !== null) {
          saveTo(currentSlot, true);
          toast('Autoguardado', 'info');
        }
      }
      chat?.frame(dt);
      const spectral = session.player().spectral?.active === true;
      if (wasSpectral && !spectral && session.spoils?.()) spoils?.show();
      wasSpectral = spectral;
      const paused = modalPolicy(screen, modals.map((m) => m.mode)).simulationPaused;
      if (!paused) (session as Partial<{ tick(dt: number): void }>).tick?.(dt);
      hud?.update(dt);
      spoils?.update(dt, !paused);
      lastDt = dt;
      minimap?.update(dt);
      worldMap?.update(dt);
      if (tracker) {
        tracker.update();
        // Al aparecer, a su sitio del perfil.
        if (!tracker.el.hidden && !trackerShown) windows.restore(tracker.el);
        trackerShown = !tracker.el.hidden;
        // La mochila ocupa la columna derecha: el seguimiento se aparta.
        tracker.el.classList.toggle('behind', (inventory?.isOpen ?? false) || (tradeInventory?.isOpen ?? false));
      }
      for (const p of panels()) p.flush();
      spoils?.flush();
    },
    onAction: (fn) => void actionFns.push(fn),
    onOptions: (fn) => {
      optionFns.push(fn);
      fn(options);
    },
    onUiSound: (fn) => subscribeUiSound(fn),
    onSession: (fn) => void sessionFns.push(fn),
    get merchantOpen() {
      return shop?.merchantId ?? null;
    },
    toast: (text, tone) => toast(text, tone),
    chatFeed: (channel, parts) => chat?.feed(channel, parts),
    setWorld(info, list, boss) {
      worldInfo?.update(info);
      combatBar?.update(list);
      bossBar?.update(boss ?? null);
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
      const spectral = session?.player().spectral?.active === true;
      pushModal(
        modal(spectral ? 'Has muerto' : 'Has caído', 'death-modal',
          h('p.death-text', { text: spectral ? 'Tu Pulso llegó a 0. Continuarás como fantasma junto a tu Piedra Pintada. Hasta llegar a un Alzador no puedes combatir, hablar con nadie ni usar casi nada.' : 'Los monstruos de esta tierra no perdonan. Vuelves a la última Piedra Pintada que tocaste; si tu Pulso llega a 0, morirás.' }),
          energy
            ? h('div.energy-death', null,
              h('b', { text: pulseText(pulse?.name ?? 'Energía', energy.value, energy.max) }),
              h('p', { text: `Esta caída te costó ${Math.round(energy.lost)} puntos.` }),
            )
            : null,
          h('div.row-end', null, button(spectral ? 'Continuar como espectro' : `Reaparecer en ${where}`, () => {
            popModal();
            onRespawn();
          }, 'primary'))),
        'blocking', false,
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
        tradeInventory?.close();
        inventory?.invalidate();
      }
    },
    showBank() {
      if (!session || !bank) return;
      // El banco lleva su propia mochila; las demás ventanas pueden seguir abiertas (F04).
      shop?.close();
      tradeInventory?.close();
      dialogue?.close();
      bank.open();
    },
    pressBinding(code) {
      const a = keys.action(code);
      if (a) handleAction(a);
    },
    closeBank() {
      // main.ts lo pide en cada fotograma fuera del banco: sin esta guarda sonaba ui_close sin parar.
      if (bank?.isOpen) bank.close();
    },
    anchorChatBubble(x, y) {
      chat?.anchorBubble(x, y);
    },
    showProfessions(professionId) {
      compendium?.close();
      journal?.close();
      professions?.show(professionId);
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
