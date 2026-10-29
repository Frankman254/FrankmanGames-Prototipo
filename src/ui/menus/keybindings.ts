// Atajos de teclado: carga y valida `data/ui/keybindings.json` y traduce
// `KeyboardEvent.code` → acción. Lógica pura (sin DOM) para poder testearla.

export const ACTIONS = [
  'hotbar1', 'hotbar2', 'hotbar3', 'hotbar4', 'hotbar5', 'hotbar6',
  'potionHealth', 'potionResource', 'evade', 'fish',
  'inventory', 'character', 'spellbook', 'journal', 'pause',
  'togglePath', 'telemetry', 'loadTest20', 'loadTest200', 'loadTestClear', 'loadTestMode', 'restartArena',
] as const;
export type Action = (typeof ACTIONS)[number];

/** Acciones que resuelve la propia interfaz; el resto se reenvía a `main.ts`. */
export const UI_ACTIONS: ReadonlySet<Action> = new Set<Action>(['inventory', 'character', 'spellbook', 'journal', 'pause']);

export type Keybindings = Record<Action, string[]>;

export function hotbarIndex(action: Action): number | null {
  const m = /^hotbar(\d)$/.exec(action);
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

export class KeyMap {
  private readonly byCode = new Map<string, Action>();

  constructor(readonly bindings: Keybindings) {
    for (const a of ACTIONS) for (const c of bindings[a]) this.byCode.set(c, a);
  }

  action(code: string): Action | null {
    return this.byCode.get(code) ?? null;
  }

  /** Etiqueta corta de la primera tecla de la acción, para el HUD ("1", "Q", "Esc"…). */
  label(action: Action): string {
    const code = this.bindings[action][0];
    return code ? keyLabel(code) : '';
  }
}

export function keyLabel(code: string): string {
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Numpad\d$/.test(code)) return `N${code.slice(6)}`;
  const names: Record<string, string> = { Escape: 'Esc', Space: 'Esp', Enter: 'Intro', Tab: 'Tab', Backquote: 'º' };
  return names[code] ?? code;
}
