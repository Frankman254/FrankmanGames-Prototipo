// Regla dura de AGENTS.md convertida en prueba: `src/sim/` es lógica portáble
// sin interfaz. No puede importar de las capas con DOM/render (`world` es
// terreno puro, pero vive con el mundo visible; `ui` y `render` no lo son) ni
// tocar Babylon. Si algo cruza esta línea, el cambio de stack deja de ser
// cambiar el adaptador y pasa a tocar la simulación.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SIM_DIR = join(__dirname, '..', 'src', 'sim');
// Las dependencias que sí puede tener el núcleo: datos y el modelo de contenido.
const ALLOWED = ['../data', '../rpg', './', 'vitest', 'node:'];

function importSpecifiers(source: string): string[] {
  const out: string[] = [];
  const re = /(?:from|import)\s*'([^']+)'/g;
  for (let m = re.exec(source); m; m = re.exec(source)) out.push(m[1]!);
  return out;
}

describe('pureza de src/sim', () => {
  const files = readdirSync(SIM_DIR).filter((f) => f.endsWith('.ts'));
  it('hay archivos que probar', () => expect(files.length).toBeGreaterThan(10));

  for (const file of files) {
    it(`${file} sólo importa lógica portáble`, () => {
      const bad = importSpecifiers(readFileSync(join(SIM_DIR, file), 'utf8')).filter(
        (s) => s.startsWith('../') && !ALLOWED.some((a) => s.startsWith(a)),
      );
      expect(bad, `${file} cruza el seam hacia la capa visible: ${bad.join(', ')}`).toEqual([]);
    });
  }
});
