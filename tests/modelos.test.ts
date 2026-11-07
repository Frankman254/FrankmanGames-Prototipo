import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_LOOK, modelPartsFor } from '../src/world/look';

vi.mock('@babylonjs/loaders/glTF', () => ({}));
const { housePlacement } = await import('../src/render/landmarkView');

const DIR = join(__dirname, '..', 'assets', 'models');

function gltf(file: string): { nodes: Array<{ name: string }>; meshes?: Array<{ primitives: unknown[] }>; animations?: Array<{ name: string }> } {
  const glb = readFileSync(join(DIR, file));
  expect(glb.toString('latin1', 0, 4), file).toBe('glTF');
  return JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12)));
}

const clips = (file: string): string[] => (gltf(file).animations ?? []).map((a) => a.name).sort();

describe('assets/models', () => {
  it('cada modelo trae su animación propia', () => {
    // Juegos de piezas fijas que se repiten: muros y baldosas no se mueven, y a la flora la mueve el viento del juego.
    // Piezas fijas y catálogos estáticos para instanciar desde datos.
    const FIXED = ['mazmorra.glb', 'vegetacion.glb', 'vegetacion_lod.glb', 'interiores.glb', 'objetos.glb', 'equipo.glb', 'utileria.glb', 'simbolos_istmo.glb', 'naturaleza_modular.glb', 'escenografia_regional.glb'];
    const missing = readdirSync(DIR).filter((f) => f.endsWith('.glb') && !FIXED.includes(f) && clips(f).length === 0);
    expect(missing).toEqual([]);
  });

  it('cada plantilla de data/assets.json encuentra sus clips en su archivo', () => {
    const data = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'assets.json'), 'utf8')) as { templates: Record<string, { file: string; clips: Record<string, string> }> };
    for (const t of Object.values(data.templates)) expect(clips(t.file.replace('assets/models/', '')), t.file).toEqual(expect.arrayContaining(Object.values(t.clips)));
  });

  it('la montura trae sus clips con el nombre exacto, sin sufijos de Blender', () => {
    expect(clips('montura.glb')).toEqual(['Reposo', 'Trotar']);
    expect(clips('montura_arpia.glb')).toEqual(['Planear', 'Reposo', 'Trotar', 'Volar']);
    for (const f of readdirSync(DIR).filter((n) => n.endsWith('.glb'))) {
      for (const c of clips(f)) expect(c, f).not.toMatch(/\.\d+$/);
    }
  });

  it('el Centinela conserva cuatro piezas y cuatro primitivas tras crear sus atlas', () => {
    const model = gltf('centinela.glb');
    expect(model.meshes?.length).toBe(4);
    expect(model.meshes?.reduce((sum, mesh) => sum + mesh.primitives.length, 0)).toBe(4);
    for (const part of ['Cuerpo', 'Pelo', 'Lanza', 'Escudo']) expect(model.nodes.some((node) => node.name === part), part).toBe(true);
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

describe('piezas estáticas', () => {
  it('la mazmorra trae todas sus piezas, con triángulos válidos', async () => {
    const { parseStaticGlb } = await import('../src/render/staticModels');
    const raw = readFileSync(join(DIR, 'mazmorra.glb'));
    const pieces = parseStaticGlb(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer);
    for (const name of ['d_baldosa', 'd_muro', 'd_remate', 'd_antorcha', 'd_llama', 'd_subida', 'd_bajada', 'd_boca', 'd_anillo', 'd_entrada', 'd_entrada_boca', 'd_entrada_monticulo', 'd_entrada_runa']) {
      const g = pieces.get(name);
      expect(g, name).toBeDefined();
      const vertices = g!.positions.length / 3;
      expect(g!.indices.length % 3, name).toBe(0);
      expect(Math.max(...g!.indices), name).toBeLessThan(vertices);
    }
    // El muro nace en el suelo y mide lo que dice el script; la Z ya está reflejada.
    const y = pieces.get('d_muro')!.positions.filter((_, i) => i % 3 === 1);
    expect(Math.max(...y)).toBeCloseTo(3.2);
    expect(pieces.get('d_baldosa')!.uvs).not.toBeNull();
  });
});

describe('interiores', () => {
  it('cada sala queda en sus coordenadas del juego, con la salida en z = 0', async () => {
    const { parseStaticGlb } = await import('../src/render/staticModels');
    const raw = readFileSync(join(DIR, 'interiores.glb'));
    const pieces = parseStaticGlb(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer);
    const zs = (name: string): number[] => [...pieces.get(name)!.positions].filter((_, i) => i % 3 === 2);
    for (const [name, depth] of [['casa_suelo', 12], ['salon_suelo', 22], ['banco_suelo', 16]] as const) {
      expect(Math.min(...zs(name)), name).toBeCloseTo(0);
      expect(Math.max(...zs(name)), name).toBeCloseTo(depth);
    }
    // La fachada del banco mira a -Z, hacia su puerta.
    expect(Math.min(...zs('banco_laton'))).toBeLessThan(-3);
  });
});
