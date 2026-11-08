// F07: en inglés cambia todo, también lo inventado de data/ (lugares, monstruos, objetos,
// misiones, diálogos). Cada texto para el jugador de los datos tiene su inglés.
import { readdirSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { hasTranslation, setLanguage, tr } from '../src/i18n';
import { collectDataTexts } from '../src/i18nTexts';

const FILES = [
  ...readdirSync('data/rpg').filter((f) => f.endsWith('.json')).map((f) => `data/rpg/${f}`),
  'data/zones.json',
  'data/dungeon.json',
  'data/panama.json',
  'data/stones.json',
  'data/weather.json',
  'data/dungeons/cripta-tulivieja.json',
];
const texts = collectDataTexts(Object.fromEntries(FILES.map((f) => [f, JSON.parse(readFileSync(f, 'utf8')) as unknown])));

afterEach(() => void setLanguage('es'));

describe('F07: inglés completo de los datos', () => {
  it('encuentra los textos de los datos (nombres, misiones, diálogos)', () => {
    expect(texts.size).toBeGreaterThan(500);
    expect(texts.has('Matón de la Tulivieja')).toBe(true);
  });

  it('el 100 % tiene inglés', () => {
    const missing = [...texts].filter(([t]) => !hasTranslation('en', t)).map(([t, f]) => `${f}: ${t}`);
    expect(missing, `faltan en data/i18n/en.content.json:\n${missing.join('\n')}`).toEqual([]);
  });

  it('las traducciones no se quedan en español por descuido', () => {
    // Topónimos y nombres de persona se repiten a propósito; el resto debe cambiar.
    const same = [...texts.keys()].filter((t) => /\s/.test(t) && t.length > 30 && tr(t) === t);
    setLanguage('en');
    expect([...texts.keys()].filter((t) => /\s/.test(t) && t.length > 30 && tr(t) === t)).toEqual([]);
    expect(same.length).toBeGreaterThan(0);
  });

  it('traduce los textos compuestos parte a parte', () => {
    setLanguage('en');
    expect(tr('Cripta de la Tulivieja · piso 5')).toBe('Tulivieja Crypt · floor 5');
    expect(tr('Matón de la Tulivieja · niv. 4')).toBe('Tulivieja Thug · lv. 4');
    expect(tr('Llanos de Azuero · niv. 1–10')).toBe('Azuero Plains · lv. 1–10');
    expect(tr('Sato Cimarrón (niv. 3)')).toBe('Feral Mutt (lv. 3)');
    expect(tr('0 / 50 XP para el nivel 2')).toBe('0 / 50 XP to level 2');
    expect(tr('del Explorador (1/4)')).toBe("Explorer's Set (1/4)");
    expect(tr('(4) +5 Agilidad, +3 % Probabilidad de crítico')).toBe('(4) +5 Agility, +3 % Critical chance');
    expect(tr('da Leño de cedro · nv. 1')).toBe('gives Cedar log · lv. 1');
    expect(tr('🪓 Leñador')).toBe('🪓 Woodcutter');
    // Una frase con coma que está en la tabla se traduce entera, no a trozos.
    expect(tr('Terca, pero conoce todas las veredas.')).toBe('Stubborn, but it knows every trail.');
    setLanguage('es');
    expect(tr('Cripta de la Tulivieja · piso 5')).toBe('Cripta de la Tulivieja · piso 5');
  });
});
