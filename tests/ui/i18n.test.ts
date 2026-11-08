import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import en from '../../data/i18n/en.json';
import { language, LANGUAGE_NAMES, LANGUAGES, setLanguage, tr, trf } from '../../src/i18n';

afterEach(() => setLanguage('es'));

describe('textos con datos dentro', () => {
  it('rellena los marcadores, también con cero y repetidos', () => {
    expect(trf('Nivel {n}', { n: 3 })).toBe('Nivel 3');
    expect(trf('Nivel {n}', { n: 0 })).toBe('Nivel 0');
    expect(trf('{x}+{x}', { x: 'a' })).toBe('a+a');
  });

  it('lo que falta queda visible y los valores son texto literal', () => {
    expect(trf('Hola {nombre}')).toBe('Hola {nombre}');
    expect(trf('{toString}')).toBe('{toString}');
    expect(trf('Oro: {v}', { v: '$& $1' })).toBe('Oro: $& $1');
    expect(trf('{a} {b}', { a: '{b}', b: 'x' })).toBe('{b} x');
  });

  it('traduce la plantilla antes de rellenarla', () => {
    setLanguage('en');
    expect(trf('Nueva partida')).toBe('New game');
    expect(trf('Sin traducir {n}', { n: 1 })).toBe('Sin traducir 1');
  });
});

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === 'fake' ? [] : sources(p);
    return p.endsWith('.ts') ? [p] : [];
  });
}

/** Textos fijos que la interfaz pasa por `h()`. */
function fixedUiStrings(): string[] {
  const found = new Set<string>();
  const patterns = [/\btext: '([^'\n]+)'/g, /\bbutton\('([^'\n]+)'/g, /\bsuper\(ctx, '([^'\n]+)'/g, /\b(?:select|check|range)\('([^'\n]+)'/g];
  for (const file of sources('src/ui/menus')) {
    const src = readFileSync(file, 'utf8');
    for (const p of patterns) for (const m of src.matchAll(p)) if (/[a-zA-Záéíóúñ]{2}/.test(m[1]!)) found.add(m[1]!);
  }
  return [...found];
}

describe('idiomas', () => {
  it('en español el texto no cambia', () => {
    expect(tr('Nueva partida')).toBe('Nueva partida');
  });

  it('cambia de idioma y lo que no está en la tabla se ve en español', () => {
    expect(setLanguage('en')).toBe(true);
    expect(setLanguage('en')).toBe(false);
    expect(language()).toBe('en');
    expect(tr('Nueva partida')).toBe('New game');
    expect(tr('Algo sin traducir')).toBe('Algo sin traducir');
  });

  it('cada idioma tiene nombre', () => {
    for (const l of LANGUAGES) expect(LANGUAGE_NAMES[l]).toBeTruthy();
  });

  it('la tabla no tiene traducciones vacías', () => {
    for (const [k, v] of Object.entries(en)) expect(v.trim(), k).not.toBe('');
  });

  it('el inglés cubre casi toda la interfaz fija', () => {
    const table: Record<string, string> = en;
    const all = fixedUiStrings();
    const missing = all.filter((s) => !table[s] && s !== 'FrankmanGames');
    expect(all.length).toBeGreaterThan(100);
    expect(missing.length / all.length, `sin traducir: ${missing.join(' | ')}`).toBeLessThan(0.05);
  });
});
