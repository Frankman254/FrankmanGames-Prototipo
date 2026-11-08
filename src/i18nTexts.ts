// Textos de `data/` que se enseñan al jugador (F07): nombres, descripciones, diálogos y avisos.
// La prueba `tests/i18nContent.test.ts` exige que cada uno tenga su inglés en `data/i18n/`.
// Puro: sin DOM.

/** Campos de los datos que llevan texto para el jugador. */
export const TEXT_KEYS: ReadonlySet<string> = new Set([
  'name', 'description', 'text', 'title', 'greeting', 'hint', 'summary', 'body', 'label', 'line', 'lines',
  'message', 'objective', 'intro', 'farewell', 'prompt', 'reply', 'options', 'dialogue', 'goal',
  'completeText', 'offerText', 'progressText', 'flavor', 'lore',
]);

/** Texto → archivo donde sale (el primero). Las claves con `_` son notas y no cuentan. */
export function collectDataTexts(files: Readonly<Record<string, unknown>>): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (v: unknown, file: string, key: string): void => {
    if (typeof v === 'string') {
      if (TEXT_KEYS.has(key) && /[a-záéíóúñ]/i.test(v) && !v.startsWith('#') && !out.has(v)) out.set(v, file);
      return;
    }
    if (Array.isArray(v)) {
      for (const x of v) walk(x, file, key);
      return;
    }
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!k.startsWith('_')) walk(x, file, k);
  };
  for (const [file, v] of Object.entries(files)) walk(v, file, '');
  return out;
}
