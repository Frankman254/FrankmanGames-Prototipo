import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// ── Funciones puras copiadas de scripts/checkDocs.mjs para testearlas ──

/** Expande `data/rpg/{items,sets}.json` → [`data/rpg/items.json`, `data/rpg/sets.json`] */
function expandBraces(s: string): string[] {
  const m = s.match(/^(.*)\{([^}]+)\}(.*)$/);
  if (!m) return [s];
  const [_, pre, inner, post] = m;
  const results = [];
  for (const part of inner!.split(',')) {
    const expanded = pre + part + post;
    results.push(...expandBraces(expanded));
  }
  return results;
}

/** Normaliza `src/rpg/character.ts:213` → `src/rpg/character.ts`, `<id>` → `X`, `NNN.json` → `X.json` */
function normalizeRoute(r: string): string {
  r = r.replace(/:\d+$/, '');
  r = r.replace(/<[^>]+>/g, 'X');
  r = r.replace(/NNN\.json/g, 'X.json');
  return r;
}

/** Extrae las rutas citadas en un texto markdown. */
function extractRoutes(text: string): string[] {
  const prefixes = ['src/', 'data/', 'scripts/', 'tests/', 'electron/', 'assets/', 'docs/'];
  const backtickRe = /`((?:src|data|scripts|tests|electron|assets|docs)[^\s`]+)`/g;
  const barePathRe = /\b((?:src|data|scripts|tests|electron|assets|docs)[\/\\][\w\-./]+(?:\.(?:ts|json|mjs|py|css|md|glb|png|wav|ogg|js|html|sh)))\b/g;

  const found = new Set<string>();
  for (const m of text.matchAll(backtickRe)) {
    found.add(m[1]!);
  }
  for (const m of text.matchAll(barePathRe)) {
    found.add(m[1]!);
  }

  const rawRoutes: string[] = [...found].filter((r: string) => prefixes.some(p => r.startsWith(p)));

  const expanded = new Set<string>();
  for (const r of rawRoutes) {
    if (r.includes('{')) {
      for (const e of expandBraces(r)) {
        expanded.add(e);
      }
    } else {
      expanded.add(r);
    }
  }

  return [...expanded].map(normalizeRoute);
}

// ── Pruebas ──

describe('checkDocs.mjs — expandBraces', () => {
  it('expande un par de llaves', () => {
    expect(expandBraces('data/rpg/{items,sets}.json')).toEqual([
      'data/rpg/items.json',
      'data/rpg/sets.json',
    ]);
  });

  it('expande tres opciones', () => {
    expect(expandBraces('scripts/mac/omp_{programador,blender,audio}.sh')).toEqual([
      'scripts/mac/omp_programador.sh',
      'scripts/mac/omp_blender.sh',
      'scripts/mac/omp_audio.sh',
    ]);
  });

  it('expande llaves en tests', () => {
    expect(expandBraces('tests/rpg/{gearMatrix,equipmentRoutes}.test.ts')).toEqual([
      'tests/rpg/gearMatrix.test.ts',
      'tests/rpg/equipmentRoutes.test.ts',
    ]);
  });

  it('devuelve la ruta sin cambios si no tiene llaves', () => {
    expect(expandBraces('src/rpg/character.ts')).toEqual(['src/rpg/character.ts']);
  });
});

describe('checkDocs.mjs — normalizeRoute', () => {
  it('quita la referencia de línea', () => {
    expect(normalizeRoute('src/rpg/character.ts:213')).toBe('src/rpg/character.ts');
  });

  it('reemplaza <id> por X', () => {
    expect(normalizeRoute('data/dungeons/<id>/floors/001.json')).toBe('data/dungeons/X/floors/001.json');
  });

  it('reemplaza NNN.json por X.json', () => {
    expect(normalizeRoute('data/dungeons/X/floors/NNN.json')).toBe('data/dungeons/X/floors/X.json');
  });
});

describe('checkDocs.mjs — extractRoutes', () => {
  it('extrae rutas de backticks', () => {
    const routes = extractRoutes('`src/rpg/character.ts` y `data/rpg/spells.json`');
    expect(routes).toContain('src/rpg/character.ts');
    expect(routes).toContain('data/rpg/spells.json');
  });

  it('extrae rutas sin backticks con extensión', () => {
    const routes = extractRoutes('Ver src/rpg/contracts.ts para detalles.');
    expect(routes).toContain('src/rpg/contracts.ts');
  });

  it('expande llaves y normaliza en un paso', () => {
    const routes = extractRoutes('`data/rpg/{items,sets}.json` y `src/rpg/character.ts:213`');
    expect(routes).toContain('data/rpg/items.json');
    expect(routes).toContain('data/rpg/sets.json');
    expect(routes).toContain('src/rpg/character.ts');
    expect(routes).not.toContain('src/rpg/character.ts:213');
  });

  it('ignora rutas que no empiezan con los prefijos', () => {
    const routes = extractRoutes('`README.md` y `lib/otro.ts`');
    expect(routes).toHaveLength(0);
  });

  it('ignora texto que no es ruta', () => {
    const routes = extractRoutes('El personaje sube de nivel.');
    expect(routes).toHaveLength(0);
  });
});

describe('checkDocs.mjs — integración contra ESTADO_ACTUAL.md', () => {
  it('no encuentra rutas rotas en el documento real', () => {
    const docFile = path.join(process.cwd(), 'docs', 'ESTADO_ACTUAL.md');
    const content = fs.readFileSync(docFile, 'utf8');
    const routes = extractRoutes(content);

    // Verificar que cada ruta existe (o es un patrón válido)
    const problems = [];
    for (const route of routes) {
      const fullPath = path.join(process.cwd(), route);
      if (route.includes('/X/') || route.endsWith('/X.json')) {
        const dirPath = path.dirname(fullPath);
        let parent = dirPath;
        while (parent && !fs.existsSync(parent)) {
          parent = path.dirname(parent);
        }
        if (parent && fs.existsSync(parent)) {
          continue;
        }
      }
      if (!fs.existsSync(fullPath)) {
        problems.push(route);
      }
    }
    expect(problems, `Rutas rotas: ${problems.join(', ')}`).toHaveLength(0);
  });
});
