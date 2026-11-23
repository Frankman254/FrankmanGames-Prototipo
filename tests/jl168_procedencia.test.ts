import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('JL-168: PROCEDENCIA.md cubre todos los GLB de assets/models/', () => {
  const root = path.resolve(__dirname, '..');
  const modelsDir = path.join(root, 'assets', 'models');
  const procedenciaPath = path.join(root, 'PROCEDENCIA.md');

  const diskFiles = fs.readdirSync(modelsDir)
    .filter((f: string) => f.endsWith('.glb'))
    .sort();

  const procedencia = fs.readFileSync(procedenciaPath, 'utf8');

  const glbRegex = /(?:`assets\/models\/|assets\/models\/)([^'`"\s,)]+\.glb)/g;
  const mentioned = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = glbRegex.exec(procedencia)) !== null) {
    const name = m[1];
    if (name) mentioned.add(name);
  }

  it(`todos los ${diskFiles.length} GLB en disco tienen mención en PROCEDENCIA.md`, () => {
    const orphans = diskFiles.filter((f: string) => !mentioned.has(f));
    expect(orphans, 'GLB sin fila en PROCEDENCIA.md').toEqual([]);
  });

  it(`los ${mentioned.size} GLB mencionados en PROCEDENCIA.md existen en disco`, () => {
    const diskSet = new Set(diskFiles);
    const missing = [...mentioned].filter((f: string) => !diskSet.has(f));
    expect(missing, 'Mencionados en PROCEDENCIA pero ausentes en disco').toEqual([]);
  });

  it('no hay duplicados en los nombres de GLB en disco', () => {
    const seen = new Set<string>();
    const dups: string[] = [];
    for (const f of diskFiles) {
      if (seen.has(f)) dups.push(f);
      seen.add(f);
    }
    expect(dups, 'Nombres duplicados en assets/models/').toEqual([]);
  });
});
