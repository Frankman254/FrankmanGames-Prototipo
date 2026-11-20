// JL-16: Todo objeto, hechizo, zona y misión tiene nombre en data/i18n/en.*.json.
//
// Los que falten se listan en work/junie-jl16/FALTAN.md.
// Sigue el patrón de JL-14 (iconos de hechizos) y JL-15 (iconos de objetos).

import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'data');
const I18N = join(DATA, 'i18n');

function readJson(rel: string): any {
  const path = join(DATA, rel);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

/* ------------------------------------------------------------------ */
// Cargar todos los archivos en.*.json y construir un mapa unificado.
/* ------------------------------------------------------------------ */

function loadEnTranslations(): Map<string, string> {
  const map = new Map<string, string>();
  for (const file of ['en.content.json', 'en.json', 'en.ui.json']) {
    const fp = join(I18N, file);
    if (existsSync(fp)) {
      const obj = JSON.parse(readFileSync(fp, 'utf-8'));
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'string') map.set(k, v);
      }
    }
  }
  return map;
}

/* ------------------------------------------------------------------ */
// Recorrer los datos y extraer los textos con nombre (campo 'name' y
// otros campos de texto visible).
/* ------------------------------------------------------------------ */

type MissingEntry = { category: string; id: string; field: string; text: string };

function collectTexts(
  category: string,
  entries: Record<string, any>,
  fields: string[],
): MissingEntry[] {
  const en = loadEnTranslations();
  const missing: MissingEntry[] = [];

  for (const [id, entry] of Object.entries(entries)) {
    if (id.startsWith('_')) continue;
    for (const f of fields) {
      const val = entry[f];
      if (typeof val === 'string' && val.trim() && !en.has(val)) {
        missing.push({ category, id, field: f, text: val });
      }
      if (Array.isArray(val)) {
        for (const line of val) {
          if (typeof line === 'string' && line.trim() && !en.has(line)) {
            missing.push({ category, id, field: f, text: line });
          }
        }
      }
    }
  }
  return missing;
}

function collectArrayTexts(
  category: string,
  arr: any[],
  fields: string[],
): MissingEntry[] {
  const en = loadEnTranslations();
  const missing: MissingEntry[] = [];

  for (const entry of arr) {
    const id = entry.id ?? '<sin id>';
    for (const f of fields) {
      const val = entry[f];
      if (typeof val === 'string' && val.trim() && !en.has(val)) {
        missing.push({ category, id, field: f, text: val });
      }
      if (Array.isArray(val)) {
        for (const line of val) {
          if (typeof line === 'string' && line.trim() && !en.has(line)) {
            missing.push({ category, id, field: f, text: line });
          }
        }
      }
    }
  }
  return missing;
}

/* ------------------------------------------------------------------ */
// Pruebas por categoría.
/* ------------------------------------------------------------------ */

describe('JL-16: traducciones en inglés de datos', () => {
  it('cada objeto de items.json tiene nombre y descripción en inglés', () => {
    const items = readJson('rpg/items.json');
    const missing = collectTexts('item', items.items ?? {}, ['name', 'description']);
    expect(missing, `Objetos sin traducción:\n${missing.map((m) => `  ${m.id} (${m.field}): ${m.text}`).join('\n')}`).toHaveLength(0);
  });

  it('cada hechizo de spells.json tiene nombre y descripción en inglés', () => {
    const spells = readJson('rpg/spells.json');
    const missing = collectTexts('spell', spells.spells ?? {}, ['name', 'description', 'flavor']);
    expect(missing, `Hechizos sin traducción:\n${missing.map((m) => `  ${m.id} (${m.field}): ${m.text}`).join('\n')}`).toHaveLength(0);
  });

  it('cada zona de zones.json tiene nombre y descripción en inglés', () => {
    const zones = readJson('zones.json');
    const missing = collectArrayTexts('zone', zones.zones ?? [], ['name', 'description', 'lore']);
    expect(missing, `Zonas sin traducción:\n${missing.map((m) => `  ${m.id} (${m.field}): ${m.text}`).join('\n')}`).toHaveLength(0);
  });

  it('cada misión de quests.json tiene nombre y textos en inglés', () => {
    const quests = readJson('rpg/quests.json');
    const missing = collectTexts('quest', quests.quests ?? {}, [
      'name',
      'objective',
      'intro',
      'body',
      'completeText',
      'offerText',
      'progressText',
    ]);
    expect(missing, `Misiones sin traducción:\n${missing.map((m) => `  ${m.id} (${m.field}): ${m.text}`).join('\n')}`).toHaveLength(0);
  });

  it('escribe FALTAN.md si hay traducciones ausentes', () => {
    // Esta prueba siempre pasa: su propósito es generar el archivo de
    // seguimiento cuando existen faltantes. Con 0 faltantes, no escribe nada.
    const allMissing: MissingEntry[] = [];

    const items = readJson('rpg/items.json');
    allMissing.push(...collectTexts('item', items.items ?? {}, ['name', 'description']));

    const spells = readJson('rpg/spells.json');
    allMissing.push(...collectTexts('spell', spells.spells ?? {}, ['name', 'description', 'flavor']));

    const zones = readJson('zones.json');
    allMissing.push(...collectArrayTexts('zone', zones.zones ?? [], ['name', 'description', 'lore']));

    const quests = readJson('rpg/quests.json');
    allMissing.push(...collectTexts('quest', quests.quests ?? {}, [
      'name',
      'objective',
      'intro',
      'body',
      'completeText',
      'offerText',
      'progressText',
    ]));

    if (allMissing.length > 0) {
      const workDir = join(ROOT, 'work', 'junie-jl16');
      if (!existsSync(workDir)) {
        mkdirSync(workDir, { recursive: true });
      }
      const lines = [
        '# Traducciones faltantes en inglés (JL-16)',
        '',
        `Total faltantes: ${allMissing.length}`,
        '',
        '## Por categoría',
        '',
      ];
      const byCat = new Map<string, MissingEntry[]>();
      for (const m of allMissing) {
        byCat.set(m.category, [...(byCat.get(m.category) ?? []), m]);
      }
      for (const [cat, entries] of byCat) {
        lines.push(`### ${cat} (${entries.length})`);
        lines.push('');
        for (const e of entries) {
          lines.push(`- \`${e.id}\` (${e.field}): ${e.text.slice(0, 80)}`);
        }
        lines.push('');
      }
      writeFileSync(join(workDir, 'FALTAN.md'), lines.join('\n') + '\n', 'utf-8');
    }

    // Si llegamos aquí sin escribir, está todo traducido.
    expect(true).toBe(true);
  });
});
