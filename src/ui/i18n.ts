// Idiomas de la interfaz. El español es el texto de origen y la clave: cada idioma
// es una tabla «español → traducción» en `data/i18n/`, y lo que no esté en la tabla
// se muestra en español. Añadir un idioma es añadir su archivo y su nombre aquí.
// `h()` traduce al crear cada elemento. F07: también el contenido de `data/`
// (`en.content.json`, que una prueba exige completo) y los textos compuestos con « · »
// («Cripta de la Tulivieja · piso 5», «Sato Cimarrón · niv. 4»), parte a parte.
import en from '../../data/i18n/en.json';
import enContent from '../../data/i18n/en.content.json';
import enUi from '../../data/i18n/en.ui.json';

export const LANGUAGES = ['es', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];
export const LANGUAGE_NAMES: Record<Language, string> = { es: 'Español', en: 'English' };

const withoutNotes = (t: Readonly<Record<string, string>>): Record<string, string> => Object.fromEntries(Object.entries(t).filter(([k]) => !k.startsWith('_')));

const TABLES: Record<Language, Readonly<Record<string, string>>> = { es: {}, en: { ...withoutNotes(enContent), ...withoutNotes(enUi), ...withoutNotes(en) } };

/** Trozos con número dentro: «niv. 4», «nivel 12», «piso 5», «ranura 2». */
const PATTERNS: Record<Language, readonly [RegExp, string][]> = {
  es: [],
  en: [
    [/^niv\. (.+)$/, 'lv. $1'],
    [/^nivel (\d+)$/, 'level $1'],
    [/^piso (\d+)$/, 'floor $1'],
    [/^ranura (\d+)$/, 'slot $1'],
    [/^(.+) \(niv\. (\d+)\)$/, '$1 (lv. $2)'],
    [/^nv\. (.+)$/, 'lv. $1'],
    [/^(.+) XP para el nivel (\d+)$/, '$1 XP to level $2'],
    [/^(.+) \((\d+\/\d+)\)$/, '$1 ($2)'],
    [/^\((\d+)\) (.+)$/, '($1) $2'],
    [/^([+−-][\d.,]+ ?%?) (.+)$/, '$1 $2'],
    [/^da (.+)$/, 'gives $1'],
    [/^([^\p{L}\p{N}\s]+) (.+)$/u, '$1 $2'],
    [/^Entras en: (.+)$/, 'Entering: $1'],
    [/^(\d+) monedas$/, '$1 coins'],
    [/^(\d+) pilas$/, '$1 stacks'],
    [/^(\d+) de (\d+) pilas$/, '$1 of $2 stacks'],
    [/^Peso: (\S+) \/ (\S+) (.+)$/, 'Weight: $1 / $2 $3'],
    [/^Peso: (\S+) \/ (\S+)$/, 'Weight: $1 / $2'],
    [/^Por (.+)$/, 'By $1'],
    [/^Derrotado: (.+)$/, 'Defeated: $1'],
    [/^(.+) prepara (.+)$/, '$1 readies $2'],
    [/^¡Nivel (\d+)!$/, 'Level $1!'],
    [/^Pulso: (.+)$/, 'Pulse: $1'],
  ],
};

let current: Language = 'es';
const composed = new Map<string, string>();

/** Devuelve true si cambió. */
export function setLanguage(language: Language): boolean {
  if (language === current) return false;
  current = language;
  composed.clear();
  return true;
}

export function language(): Language {
  return current;
}

/** Un trozo: la tabla, o uno de los patrones con número (con su nombre traducido). */
function piece(text: string): string {
  const direct = TABLES[current][text];
  if (direct !== undefined) return direct;
  for (const [re, out] of PATTERNS[current]) {
    const m = re.exec(text);
    if (m) return out.replace(/\$(\d)/g, (_, i: string) => piece(m[Number(i)]!));
  }
  // Listas («+5 Agilidad, +3 % Probabilidad de crítico»): elemento a elemento.
  if (text.includes(', ')) {
    const parts = text.split(', ');
    const done = parts.map(piece);
    if (done.some((p, i) => p !== parts[i])) return done.join(', ');
  }
  return text;
}

/** Texto en el idioma actual; si no hay traducción, tal cual. */
export function tr(text: string): string {
  if (current === 'es') return text;
  const direct = TABLES[current][text];
  if (direct !== undefined) return direct;
  let out = composed.get(text);
  if (out === undefined) {
    out = text.includes(' · ') ? text.split(' · ').map(piece).join(' · ') : piece(text);
    if (composed.size > 5000) composed.clear();
    composed.set(text, out);
  }
  return out;
}

/** Traduce y reemplaza marcadores {name} con valores de vars. */
export function trf(template: string, vars: Readonly<Record<string, string | number>> = {}): string {
  const translated = tr(template);
  return translated.replace(/\{([^\}]*)\}/g, (match, name) => {
    if (Object.prototype.hasOwnProperty.call(vars, name)) {
      return String(vars[name]);
    }
    return match;
  });
}

/** Para las pruebas: ¿tiene este texto su traducción directa en ese idioma? */
export function hasTranslation(language: Language, text: string): boolean {
  return language === 'es' || TABLES[language][text] !== undefined;
}
