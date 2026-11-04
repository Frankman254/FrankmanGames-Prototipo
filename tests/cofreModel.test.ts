import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Parte JSON del GLB; el juego busca los clips por nombre. */
function gltf(file: string): { nodes: Array<{ name: string }>; animations: Array<{ name: string; channels: Array<{ target: { node: number; path: string } }> }> } {
  const glb = readFileSync(join(__dirname, '..', file));
  expect(glb.toString('latin1', 0, 4)).toBe('glTF');
  return JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12)));
}

describe('assets/models/cofre.glb', () => {
  const model = gltf('assets/models/cofre.glb');

  it('solo trae el cuerpo y la tapa', () => {
    expect(model.nodes.map((n) => n.name).sort()).toEqual(['FG_Cofre', 'FG_Cofre_Tapa']);
  });

  it('sus clips Abrir y Cerrar giran solo la tapa', () => {
    expect(model.animations.map((a) => a.name).sort()).toEqual(['Abrir', 'Cerrar']);
    for (const a of model.animations) {
      expect(a.channels.map((c) => [model.nodes[c.target.node]!.name, c.target.path])).toEqual([['FG_Cofre_Tapa', 'rotation']]);
    }
  });
});
