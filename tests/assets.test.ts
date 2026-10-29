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
    const missing = Object.entries(assets).filter(([, a]) => a.kind === 'gltf' && !existsSync(join(ROOT, a.file))).map(([id]) => id);
    expect(missing).toEqual([]);
  });

  it('rechaza rutas fuera de assets/', () => {
    const gltf = { kind: 'gltf', runSpeed: 4, clips: { idle: 'Idle' } };
    expect(() => parseAssets({ assets: { x: { ...gltf, file: '../FATE/a.glb' } } })).toThrow(/assets\.x\.file/);
    expect(() => parseAssets({ assets: { x: { ...gltf, file: 'assets/../a.glb' } } })).toThrow(/assets\.x\.file/);
  });

  it('valida modelos procedurales y glTF', () => {
    expect(() => parseAssets({ assets: { p: { kind: 'procedural', model: 'dragon', palettes: { default: { skin: [1, 1, 1], cloth: [1, 1, 1], trim: [1, 1, 1], hair: [1, 1, 1], gear: [1, 1, 1] } } } } })).toThrow(/assets\.p\.model/);
    expect(() => parseAssets({ assets: { g: { kind: 'gltf', file: 'assets/a/b.glb', runSpeed: 4, clips: { idle: 'Idle', fly: 'Fly' } } } })).toThrow(/clips\.fly/);
    expect(parseAssets({ assets: { g: { kind: 'gltf', file: 'assets/a/b.glb', runSpeed: 4, clips: { idle: 'Idle' } } } })['g']!.kind).toBe('gltf');
  });
});
