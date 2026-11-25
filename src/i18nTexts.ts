// Textos de `data/` que se enseñan al jugador (F07): nombres, descripciones, diálogos y avisos.
// La prueba `tests/i18nContent.test.ts` exige que cada uno tenga su inglés en `data/i18n/`.
// Puro: sin DOM.

/** Campos de los datos que llevan texto para el jugador. */
export const TEXT_KEYS: ReadonlySet<string> = new Set([
    'name',
    'description',
    'text',
    'title',
    'greeting',
    'hint',
    'summary',
    'body',
    'label',
    'line',
    'lines',
    'message',
    'objective',
    'intro',
    'farewell',
    'prompt',
    'reply',
    'options',
    'dialogue',
    'goal',
    'completeText',
    'offerText',
    'progressText',
    'flavor',
    'lore',
    'action',
    'chain',
    'faces',
    'role',
    'appearanceOptionLabel',
]);

const TEXT_MAP_KEYS: ReadonlySet<string> = new Set(['hair', 'brows']);

/** Texto → archivo donde sale (el primero). Las claves con `_` son notas y no cuentan. */
export function collectDataTexts(files: Readonly<Record<string, unknown>>): Map<string, string> {
    const out = new Map<string, string>();
    const walk = (v: unknown, file: string, key: string): void => {
        if (typeof v === 'string') {
            const text = key === 'role' ? v.charAt(0).toUpperCase() + v.slice(1) : v;
            if (TEXT_KEYS.has(key) && /[a-záéíóúñ]/i.test(text) && !text.startsWith('#') && !out.has(text))
                out.set(text, file);
            return;
        }
        if (Array.isArray(v)) {
            for (const x of v) walk(x, file, key);
            return;
        }
        if (v && typeof v === 'object') {
            for (const [k, x] of Object.entries(v)) {
                if (k.startsWith('_')) continue;
                if (TEXT_MAP_KEYS.has(k) && x && typeof x === 'object' && !Array.isArray(x)) {
                    for (const text of Object.values(x)) walk(text, file, 'appearanceOptionLabel');
                } else walk(x, file, k);
            }
        }
    };
    for (const [file, v] of Object.entries(files)) walk(v, file, '');
    return out;
}
