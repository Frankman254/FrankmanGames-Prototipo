// Idiomas de la interfaz. El español es el texto de origen y la clave: cada idioma
// es una tabla «español → traducción» en `data/i18n/`, y lo que no esté en la tabla
// se muestra en español. Añadir un idioma es añadir su archivo y su nombre aquí.
// `h()` traduce al crear cada elemento, así que basta con que el texto sea fijo; el
// que lleva datos dentro (`nivel ${n}`) y el contenido de `data/rpg` aún no pasan.
import en from '../../data/i18n/en.json';

export const LANGUAGES = ['es', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];
export const LANGUAGE_NAMES: Record<Language, string> = { es: 'Español', en: 'English' };

const TABLES: Record<Language, Readonly<Record<string, string>>> = { es: {}, en };

let current: Language = 'es';

/** Devuelve true si cambió. */
export function setLanguage(language: Language): boolean {
  if (language === current) return false;
  current = language;
  return true;
}

export function language(): Language {
  return current;
}

/** Texto en el idioma actual; si no hay traducción, tal cual. */
export function tr(text: string): string {
  return TABLES[current][text] ?? text;
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
