// Atajos de teclado: carga y valida `data/ui/keybindings.json`, aplica los
// cambios del jugador (guardados aparte) y traduce `KeyboardEvent.code` →
// acción. Lógica pura (sin DOM) para poder testearla.

/** Huecos de la barra de hechizos: dos filas de 10 (estilo DOFUS: QWERTYUIOP / ASDFGHJKLÑ). */
export const HOTBAR_SLOTS = 20;
export const HOTBAR_ROW = 10;

const HOTBAR_ACTIONS = [
  'hotbar1', 'hotbar2', 'hotbar3', 'hotbar4', 'hotbar5', 'hotbar6', 'hotbar7', 'hotbar8', 'hotbar9', 'hotbar10',
  'hotbar11', 'hotbar12', 'hotbar13', 'hotbar14', 'hotbar15', 'hotbar16', 'hotbar17', 'hotbar18', 'hotbar19', 'hotbar20',
] as const;

export const ACTIONS = [
  ...HOTBAR_ACTIONS,
  'potionHealth', 'potionResource', 'fish',
  'inventory', 'character', 'spellbook', 'journal', 'map', 'pause', 'editHud',
  'cameraOrbit', 'cameraLeft', 'cameraRight', 'fullscreen', 'togglePath', 'toggleGrid',
  'telemetry', 'loadTest20', 'loadTest200', 'loadTestClear', 'loadTestMode', 'restartArena', 'editor',
] as const;
export type Action = (typeof ACTIONS)[number];

/** Acciones que resuelve la propia interfaz; el resto se reenvía a `main.ts`. */
export const UI_ACTIONS: ReadonlySet<Action> = new Set<Action>(['inventory', 'character', 'spellbook', 'journal', 'map', 'editHud', 'pause', 'fullscreen', 'togglePath', 'toggleGrid']);
/** Acciones que se mantienen pulsadas: `main.ts` mira si su tecla sigue abajo. */
export const HOLD_ACTIONS: ReadonlySet<Action> = new Set<Action>(['cameraOrbit', 'cameraLeft', 'cameraRight']);

/** Nombre de cada acción en la pantalla de atajos, agrupado. */
export const ACTION_GROUPS: { title: string; actions: { action: Action; label: string }[] }[] = [
  { title: 'Hechizos · fila 1', actions: HOTBAR_ACTIONS.slice(0, HOTBAR_ROW).map((a, i) => ({ action: a, label: `Hueco ${i + 1}` })) },
  { title: 'Hechizos · fila 2', actions: HOTBAR_ACTIONS.slice(HOTBAR_ROW).map((a, i) => ({ action: a, label: `Hueco ${HOTBAR_ROW + i + 1}` })) },
  {
    title: 'Acciones',
    actions: [
      { action: 'potionHealth', label: 'Poción de vida' },
      { action: 'potionResource', label: 'Tónico de recurso' },
      { action: 'fish', label: 'Pescar / sacar el sedal' },
    ],
  },
  {
    title: 'Paneles',
    actions: [
      { action: 'inventory', label: 'Mochila' },
      { action: 'character', label: 'Personaje' },
      { action: 'spellbook', label: 'Libro de hechizos' },
      { action: 'journal', label: 'Diario de misiones' },
      { action: 'map', label: 'Mapa' },
      { action: 'editHud', label: 'Editar interfaz (mover el HUD)' },
      { action: 'pause', label: 'Menú / pausa' },
    ],
  },
  {
    title: 'Cámara y pantalla',
    actions: [
      { action: 'cameraOrbit', label: 'Girar cámara (mantener y mover el cursor)' },
      { action: 'cameraLeft', label: 'Girar cámara a la izquierda' },
      { action: 'cameraRight', label: 'Girar cámara a la derecha' },
      { action: 'fullscreen', label: 'Pantalla completa' },
      { action: 'togglePath', label: 'Mostrar / ocultar trayectoria' },
      { action: 'toggleGrid', label: 'Mostrar / ocultar cuadrícula' },
    ],
  },
  {
    title: 'Depuración',
    actions: [
      { action: 'telemetry', label: 'Guardar telemetría' },
      { action: 'loadTest20', label: 'Prueba de carga 20' },
      { action: 'loadTest200', label: 'Prueba de carga 200' },
      { action: 'loadTestClear', label: 'Quitar prueba de carga' },
      { action: 'loadTestMode', label: 'Modo de render de la prueba' },
      { action: 'restartArena', label: 'Reiniciar arena' },
      { action: 'editor', label: 'Modo edición (mundo, navegación y zonas)' },
    ],
  },
];

export type Keybindings = Record<Action, string[]>;

export function hotbarIndex(action: Action): number | null {
  const m = /^hotbar(\d+)$/.exec(action);
  return m ? Number(m[1]) - 1 : null;
}

/** Valida el JSON: todas las acciones presentes, códigos no vacíos y sin una tecla en dos acciones. */
export function parseKeybindings(json: unknown): Keybindings {
  const actions = (json as { actions?: unknown } | null)?.actions;
  if (!actions || typeof actions !== 'object') throw new Error('keybindings: falta "actions"');
  const out = {} as Keybindings;
  const owner = new Map<string, Action>();
  for (const key of Object.keys(actions)) {
    if (!(ACTIONS as readonly string[]).includes(key)) throw new Error(`keybindings: acción desconocida "${key}"`);
  }
  for (const a of ACTIONS) {
    const codes = (actions as Record<string, unknown>)[a];
    if (!Array.isArray(codes) || codes.some((c) => typeof c !== 'string' || c.length === 0)) {
      throw new Error(`keybindings: "${a}" debe ser una lista de códigos`);
    }
    for (const c of codes as string[]) {
      const prev = owner.get(c);
      if (prev) throw new Error(`keybindings: ${c} está en "${prev}" y en "${a}"`);
      owner.set(c, a);
    }
    out[a] = [...(codes as string[])];
  }
  return out;
}

/**
 * Aplica los atajos que cambió el jugador (`{ acción: [códigos] }`) sobre los de
 * datos. Ignora acciones desconocidas; si una tecla quedara repetida, gana la
 * acción cambiada y la otra pierde esa tecla.
 */
export function applyOverrides(base: Keybindings, overrides: unknown): Keybindings {
  const out = Object.fromEntries(ACTIONS.map((a) => [a, [...base[a]]])) as Keybindings;
  if (!overrides || typeof overrides !== 'object') return out;
  for (const [a, codes] of Object.entries(overrides as Record<string, unknown>)) {
    if (!(ACTIONS as readonly string[]).includes(a) || !Array.isArray(codes)) continue;
    const valid = codes.filter((c): c is string => typeof c === 'string' && c.length > 0);
    for (const other of ACTIONS) if (other !== a) out[other] = out[other].filter((c) => !valid.includes(c));
    out[a as Action] = valid;
  }
  return out;
}

/** Diferencias entre unos atajos y los de datos (lo que se guarda). */
export function diffBindings(base: Keybindings, cur: Keybindings): Partial<Keybindings> {
  const out: Partial<Keybindings> = {};
  for (const a of ACTIONS) if (base[a].join('|') !== cur[a].join('|')) out[a] = [...cur[a]];
  return out;
}

/** Nombres de las teclas según la distribución real del teclado (`navigator.keyboard.getLayoutMap`). */
let layoutNames: ReadonlyMap<string, string> | null = null;

export function setKeyboardLayout(map: ReadonlyMap<string, string> | null): void {
  layoutNames = map;
}

export class KeyMap {
  private readonly byCode = new Map<string, Action>();

  constructor(readonly bindings: Keybindings) {
    this.index();
  }

  private index(): void {
    this.byCode.clear();
    for (const a of ACTIONS) for (const c of this.bindings[a]) this.byCode.set(c, a);
  }

  action(code: string): Action | null {
    return this.byCode.get(code) ?? null;
  }

  /** Etiqueta corta de la primera tecla de la acción, para el HUD ("1", "Q", "Esc"…). */
  label(action: Action): string {
    const code = this.bindings[action][0];
    return code ? keyLabel(code) : '';
  }

  /**
   * Pone `code` como tecla principal de `action`. Si otra acción la usaba, se
   * intercambian (recibe la tecla anterior de `action`). Devuelve esa acción.
   */
  rebind(action: Action, code: string): Action | null {
    const prevOwner = this.byCode.get(code) ?? null;
    if (prevOwner === action) return null;
    const old = this.bindings[action][0] ?? null;
    if (prevOwner) {
      const list = this.bindings[prevOwner].filter((c) => c !== code);
      this.bindings[prevOwner] = old ? [old, ...list] : list;
    }
    this.bindings[action] = [code, ...this.bindings[action].slice(1).filter((c) => c !== code)];
    if (prevOwner && old) this.bindings[action] = this.bindings[action].filter((c, i) => i === 0 || c !== old);
    this.index();
    return prevOwner;
  }

  /** Vuelve a unos atajos completos (p. ej. los de datos). */
  reset(to: Keybindings): void {
    for (const a of ACTIONS) this.bindings[a] = [...to[a]];
    this.index();
  }
}

export function keyLabel(code: string): string {
  const fromLayout = layoutNames?.get(code);
  if (fromLayout && fromLayout.trim().length === 1) return fromLayout.toUpperCase();
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Numpad\d$/.test(code)) return `N${code.slice(6)}`;
  // Sin mapa de distribución se asume el teclado español (Ñ junto a la L).
  const names: Record<string, string> = {
    Escape: 'Esc', Space: 'Esp', Enter: 'Intro', Tab: 'Tab', Backquote: 'º', Semicolon: 'Ñ', Quote: '´', Comma: ',', Period: '.',
    Minus: "'", Equal: '¡', BracketLeft: '`', BracketRight: '+', Backslash: 'Ç', Home: 'Inicio', IntlBackslash: '<', Slash: '-',
    ShiftLeft: 'Mayús', ShiftRight: 'Mayús D', ControlLeft: 'Ctrl', ControlRight: 'Ctrl D', AltLeft: 'Alt', AltRight: 'Alt Gr',
  };
  return names[code] ?? code;
}
