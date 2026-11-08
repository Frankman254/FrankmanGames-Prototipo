import { describe, expect, it } from 'vitest';
import { MoveClickHold } from '../src/ui/input';

describe('movimiento mantenido según el botón configurado', () => {
  it('el izquierdo sigue activo al desplazar el cursor y termina al soltarlo', () => {
    const hold = new MoveClickHold(0, 100, 100);
    for (const [x, y] of [[110, 100], [200, 50], [50, 250]]) {
      hold.move(x!, y!);
      expect(hold.active(true, false)).toBe(true);
    }
    expect(hold.active(false, true)).toBe(false);
  });

  it('el derecho mantiene el destino quieto, pero arrastrar cede el gesto a la cámara', () => {
    const hold = new MoveClickHold(2, 100, 100);
    hold.move(108, 100);
    expect(hold.active(false, true)).toBe(true);
    hold.move(109, 100);
    expect(hold.active(false, true)).toBe(false);
    hold.move(100, 100);
    expect(hold.active(false, true)).toBe(false);
    expect(new MoveClickHold(2, 100, 100).active(false, true)).toBe(true);
  });

  it('no usa el estado del otro botón para mantener movimiento', () => {
    expect(new MoveClickHold(0, 0, 0).active(false, true)).toBe(false);
    expect(new MoveClickHold(2, 0, 0).active(true, false)).toBe(false);
  });
});
