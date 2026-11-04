import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_LOOK, modelPartsFor } from '../src/world/look';

vi.mock('@babylonjs/loaders/glTF', () => ({}));
const { housePlacement } = await import('../src/render/landmarkView');

const DIR = join(__dirname, '..', 'assets', 'models');

function gltf(file: string): { nodes: Array<{ name: string }>; animations?: Array<{ name: string }> } {
  const glb = readFileSync(join(DIR, file));
  expect(glb.toString('latin1', 0, 4), file).toBe('glTF');
  return JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12)));
}

const clips = (file: string): string[] => (gltf(file).animations ?? []).map((a) => a.name).sort();

describe('assets/models', () => {
  it('cada modelo trae su animación propia', () => {
    // El castillo es anterior a la regla: su animación está pendiente.
    const missing = readdirSync(DIR).filter((f) => f.endsWith('.glb') && f !== 'castillo.glb' && clips(f).length === 0);
    expect(missing).toEqual([]);
  });

  it('cada plantilla de data/assets.json encuentra sus clips en su archivo', () => {
    const data = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'assets.json'), 'utf8')) as { templates: Record<string, { file: string; clips: Record<string, string> }> };
    for (const t of Object.values(data.templates)) expect(clips(t.file.replace('assets/models/', '')), t.file).toEqual(expect.arrayContaining(Object.values(t.clips)));
  });

  it('las piezas de cada aspecto existen en el modelo', () => {
    const names = new Set(gltf('personaje.glb').nodes.map((n) => n.name));
    const looks = [
      DEFAULT_LOOK,
      { ...DEFAULT_LOOK, hairStyle: 'long', headgear: 'band', outfit: 'robe', weapon: 'staff', cape: true, beard: true },
      { ...DEFAULT_LOOK, headgear: 'helm', outfit: 'plate', weapon: 'bow', offhand: 'shield' },
      { ...DEFAULT_LOOK, headgear: 'hood', outfit: 'apron', weapon: 'none' },
    ] as const;
    for (const look of looks) for (const part of modelPartsFor(look)) expect(names.has(part), part).toBe(true);
  });
});

describe('colocación de las casas', () => {
  it('el ancho del modelo sigue al lado de la puerta', () => {
    const front = housePlacement({ x: 0, y: 0, w: 14, d: 3, rotDeg: 0 });
    expect([front.scaleX, front.scaleZ]).toEqual([2, 0.5]);
    const side = housePlacement({ x: 0, y: 0, w: 3, d: 14, rotDeg: 90 });
    expect([side.scaleX, side.scaleZ]).toEqual([2, 0.5]);
  });

  it('la altura se toma en la puerta y gira hacia ella', () => {
    const h = housePlacement({ x: 10, y: 10, w: 7, d: 6, rotDeg: 0 });
    expect(h.groundAt!.y).toBeCloseTo(7);
    expect(h.rotDeg).toBe(180);
    expect(housePlacement({ x: 0, y: 0, w: 7, d: 6, rotDeg: 0, style: 'golden' }).model).toBe('casa_dorada');
  });
});
