import { describe, expect, it } from 'vitest';
import { nearFloor } from '../src/render/farWorldView';

// La malla lejana (cada 24 m) tapaba Iguanera como una bruma: quedaba por encima del suelo
// de las páginas. Su suelo de referencia es el mínimo del terreno de cerca bajo sus triángulos.
describe('nearFloor', () => {
  const bounds = { x0: 0, z0: 0, x1: 240, z1: 240 };

  it('toma el punto más bajo que tocan los triángulos del vértice', () => {
    // Un hoyo a 20 m del vértice (48, 48): entre vértices, no sobre ninguno.
    const height = (x: number, z: number): number => (x === 60 && z === 36 ? -5 : 1);
    const floor = nearFloor({ bounds, height }, 0, 0);
    expect(floor(2, 2)).toBe(-5);
    // A más de un paso del hoyo, no cuenta.
    expect(floor(5, 5)).toBe(1);
  });

  it('no hay suelo de cerca lejos de las páginas', () => {
    const floor = nearFloor({ bounds, height: () => 0 }, -480, -480);
    expect(floor(0, 0)).toBeNull();
    // Vértice a un paso del borde: sus triángulos llegan a las páginas.
    expect(floor(19, 19)).toBe(0);
  });
});
