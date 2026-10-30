import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OPTIONS, GRAPHICS_KEYS, GRAPHICS_PRESETS, GRAPHICS_PRESET_IDS, MemoryStore, OPTION_LIMITS, THEMES,
  applyGraphicsPreset, graphicsPresetOf, loadOptions, normalizeOptions,
} from '../../src/ui/menus/saveStore';

describe('opciones: temas', () => {
  it('los temas elementales, claro y alto contraste; pergamino por defecto', () => {
    expect(THEMES).toEqual(['pergamino', 'fuego', 'agua', 'viento', 'tierra', 'naturaleza', 'claro', 'contraste']);
    expect(DEFAULT_OPTIONS.theme).toBe('pergamino');
    for (const t of THEMES) expect(normalizeOptions({ theme: t }).theme).toBe(t);
  });

  it('los temas antiguos pasan a su sucesor; lo desconocido, al de por defecto', () => {
    expect(normalizeOptions({ theme: 'noche' }).theme).toBe('agua');
    expect(normalizeOptions({ theme: 'bosque' }).theme).toBe('naturaleza');
    expect(normalizeOptions({ theme: 'rosa' }).theme).toBe('pergamino');
    expect(normalizeOptions({ theme: 7 }).theme).toBe('pergamino');
    // También al cargar un guardado viejo (sin los campos nuevos).
    const mem = new MemoryStore();
    mem.setItem('frankmangames.options', JSON.stringify({ theme: 'bosque', uiScale: 1.2 }));
    expect(loadOptions(mem)).toEqual({ ...DEFAULT_OPTIONS, theme: 'naturaleza', uiScale: 1.2 });
  });
});

describe('opciones: campos nuevos', () => {
  it('un guardado sin ellos recibe los valores por defecto', () => {
    const o = normalizeOptions({ volume: 0.5 });
    expect(o).toMatchObject({
      shadows: 'altas', vegetationDensity: 1, viewDistance: 500, particles: 1, renderScale: 1, antialias: 'msaa', occlusionCut: true,
      hotbarIconScale: 1, bagIconScale: 1, windowOpacity: 1, uiAnimations: true, combatLogSize: 12, tooltipDelay: 0,
      enemyBars: 'heridos', damageNumbers: true, enemyLabels: true, confirmRareSell: true, showSpellRange: true,
    });
  });

  it('listas cerradas, booleanos y números acotados', () => {
    const o = normalizeOptions({
      shadows: 'ultra', antialias: 'taa', enemyBars: 'objetivo', damageNumbers: 'no', uiAnimations: false,
      vegetationDensity: 3, viewDistance: 10, particles: -1, renderScale: 0.1, hotbarIconScale: 9, bagIconScale: 1.4,
      windowOpacity: 0.2, combatLogSize: 40, tooltipDelay: Number.NaN,
    });
    expect(o).toMatchObject({
      shadows: 'altas', antialias: 'msaa', enemyBars: 'objetivo', damageNumbers: true, uiAnimations: false,
      vegetationDensity: 1, viewDistance: 100, particles: 0, renderScale: 0.5, hotbarIconScale: 1.6, bagIconScale: 1.4,
      windowOpacity: 0.5, combatLogSize: 20, tooltipDelay: 0,
    });
  });

  it('los valores por defecto ya están dentro de sus límites', () => {
    for (const [k, l] of Object.entries(OPTION_LIMITS)) {
      const v = DEFAULT_OPTIONS[k as keyof typeof OPTION_LIMITS];
      expect(v, k).toBeGreaterThanOrEqual(l.min);
      expect(v, k).toBeLessThanOrEqual(l.max);
    }
    expect(normalizeOptions(DEFAULT_OPTIONS)).toEqual(DEFAULT_OPTIONS);
  });
});

describe('opciones: preajustes gráficos', () => {
  it('Bajo, Medio, Alto y Ultra; los valores de cada uno pasan la normalización', () => {
    expect(GRAPHICS_PRESET_IDS).toEqual(['bajo', 'medio', 'alto', 'ultra']);
    for (const id of GRAPHICS_PRESET_IDS) {
      const o = applyGraphicsPreset(DEFAULT_OPTIONS, id);
      expect(normalizeOptions(o)).toEqual(o);
      expect(graphicsPresetOf(o)).toBe(id);
    }
  });

  it('por defecto es «Alto»; tocar una opción suelta lo vuelve «Personalizado»', () => {
    expect(graphicsPresetOf(DEFAULT_OPTIONS)).toBe('alto');
    expect(graphicsPresetOf({ ...DEFAULT_OPTIONS, particles: 0.4 })).toBe('personalizado');
    expect(graphicsPresetOf({ ...DEFAULT_OPTIONS, occlusionCut: false })).toBe('personalizado');
  });

  it('un preajuste sólo cambia las opciones gráficas', () => {
    const before = { ...DEFAULT_OPTIONS, theme: 'fuego' as const, volume: 0.3 };
    const after = applyGraphicsPreset(before, 'bajo');
    for (const k of Object.keys(before) as (keyof typeof before)[]) {
      if ((GRAPHICS_KEYS as readonly string[]).includes(k)) expect(after[k]).toBe(GRAPHICS_PRESETS.bajo[k as (typeof GRAPHICS_KEYS)[number]]);
      else expect(after[k]).toBe(before[k]);
    }
    // De menos a más: cada nivel no baja de calidad respecto al anterior.
    const order = GRAPHICS_PRESET_IDS.map((id) => GRAPHICS_PRESETS[id]);
    for (let i = 1; i < order.length; i++) {
      expect(order[i]!.viewDistance).toBeGreaterThanOrEqual(order[i - 1]!.viewDistance);
      expect(order[i]!.vegetationDensity).toBeGreaterThanOrEqual(order[i - 1]!.vegetationDensity);
      expect(order[i]!.particles).toBeGreaterThanOrEqual(order[i - 1]!.particles);
      expect(order[i]!.renderScale).toBeGreaterThanOrEqual(order[i - 1]!.renderScale);
    }
  });
});

// ─── Contraste de los temas (WCAG) ────────────────────────────────────────

const ROOT = join(__dirname, '..', '..');
const css = (f: string): string => readFileSync(join(ROOT, 'src', 'ui', 'styles', f), 'utf8');
const hexVars = (block: string): Record<string, string> =>
  Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1]!, m[2]!]));

/** Variables de color de cada tema: las de `:root` (pergamino) más las que redefine el tema. */
function themeColors(): Record<string, Record<string, string>> {
  const menus = css('menus.css');
  const themes = css('themes.css');
  const base = { ...hexVars(/:root \{([^}]*)\}/.exec(menus)![1]!), ...hexVars(/:root \{([^}]*)\}/.exec(themes)![1]!) };
  const out: Record<string, Record<string, string>> = { pergamino: base };
  for (const m of themes.matchAll(/:root\[data-theme='(\w+)'\] \{([^}]*)\}/g)) out[m[1]!] = { ...base, ...hexVars(m[2]!) };
  return out;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe('opciones: contraste de los temas', () => {
  const all = themeColors();

  it('cada tema de la lista tiene su bloque de colores', () => {
    for (const t of THEMES) expect(all[t], t).toBeDefined();
  });

  // Mínimos: texto ≥ 7 (AAA), texto secundario y acento ≥ 4,5 (AA), pistas ≥ 3 (AA texto grande).
  const need: Record<string, number> = { ink: 7, 'ink-dim': 4.5, 'ink-faint': 3, gold: 4.5, 'gold-hi': 4.5, good: 3, bad: 3 };
  const backgrounds = ['paper-0', 'paper-1', 'paper-2', 'well', 'btn-0'];
  for (const t of THEMES) {
    it(`«${t}»: tinta y acento legibles sobre todos los fondos`, () => {
      const c = all[t]!;
      for (const [fg, min] of Object.entries(need)) {
        for (const bg of backgrounds) expect(contrast(c[fg]!, c[bg]!), `${fg} sobre ${bg}`).toBeGreaterThanOrEqual(min);
      }
    });
  }
});
