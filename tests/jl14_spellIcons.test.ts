// JL-14: Cada hechizo de data/rpg/spells.json tiene icono en assets/icons/spells/.
//
// Los que falten se listan en work/junie-jl-14/FALTAN.md (los dibuja otro agente).
// La prueba puede quedar como it.todo con la lista si faltan.

import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'data');
const ICONS = join(ROOT, 'assets', 'icons', 'spells');

function readJson(rel: string): any {
  const path = join(DATA, rel);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

describe('JL-14: iconos de hechizos', () => {
  it('cada hechizo tiene un icono PNG en assets/icons/spells/', () => {
    const spells = readJson('rpg/spells.json');
    const spellIds = Object.keys(spells.spells ?? {}).filter(
      (k: string) => !k.startsWith('_'),
    );

    const missing: string[] = [];
    for (const id of spellIds) {
      const iconPath = join(ICONS, id + '.png');
      if (!existsSync(iconPath)) {
        missing.push(id);
      }
    }

    if (missing.length > 0) {
      // Escribir FALTAN.md para que otro agente los dibuje
      const workDir = join(ROOT, 'work', 'junie-jl-14');
      if (!existsSync(workDir)) {
        mkdirSync(workDir, { recursive: true });
      }
      const lines = [
        '# Hechizos sin icono (JL-14)',
        '',
        `Total hechizos: ${spellIds.length}`,
        `Sin icono: ${missing.length}`,
        '',
        'Los dibuja otro agente. La prueba queda en it.todo hasta que existan.',
        '',
        '## Lista',
        '',
      ];
      for (const id of missing) {
        lines.push(`- \`${id}\` → \`assets/icons/spells/${id}.png\``);
      }
      writeFileSync(join(workDir, 'FALTAN.md'), lines.join('\n') + '\n', 'utf-8');
    }

    expect(missing, `Hechizos sin icono:\n${missing.join('\n')}`).toHaveLength(0);
  });

  it('no hay iconos huérfanos (opcional, informativo)', () => {
    const spells = readJson('rpg/spells.json');
    const spellIds = new Set(
      Object.keys(spells.spells ?? {}).filter((k: string) => !k.startsWith('_')),
    );

    const iconFiles = readdirSync(ICONS).map((f: string) => f.replace(/\.png$/i, ''));
    const orphans = iconFiles.filter((id: string) => !spellIds.has(id));

    // Informativo: no falla, solo documenta
    if (orphans.length > 0) {
      console.log(`Iconos sin hechizo asociado: ${orphans.join(', ')}`);
    }
    // No usamos expect aquí: es informativo, no un fallo
  });
});
