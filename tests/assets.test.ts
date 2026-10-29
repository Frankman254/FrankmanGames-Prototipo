import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadWorldData } from '../src/data/worldData';
import { parseAssets } from '../src/data/worldSchema';

const ROOT = join(__dirname, '..');

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? listFiles(p) : [relative(ROOT, p).split(sep).join('/')];
  });
}

describe('assets', () => {
  const procedencia = readFileSync(join(ROOT, 'PROCEDENCIA.md'), 'utf8');

  it('todo archivo de assets/ figura en PROCEDENCIA.md', () => {
    const missing = listFiles(join(ROOT, 'assets')).filter((f) => !procedencia.includes(f));
    expect(missing).toEqual([]);
  });

  it('cada entrada del manifiesto existe en disco', () => {
    const { assets } = loadWorldData();
    const missing = Object.entries(assets).filter(([, a]) => !existsSync(join(ROOT, a.file))).map(([id]) => id);
    expect(missing).toEqual([]);
  });

  it('rechaza rutas fuera de assets/', () => {
    expect(() => parseAssets({ assets: { x: { file: '../FATE/a.glb' } } })).toThrow(/assets\.x\.file/);
    expect(() => parseAssets({ assets: { x: { file: 'assets/../a.glb' } } })).toThrow(/assets\.x\.file/);
  });
});
