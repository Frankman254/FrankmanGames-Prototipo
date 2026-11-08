import { describe, expect, it } from 'vitest';
import { MoveClickHold } from '../src/ui/input';

describe('movimiento mantenido según el botón configurado', () => {
  it('el izquierdo sigue activo al desplazar el cursor y termina al soltarlo', () => {
    const hold = new MoveClickHold(0);
    expect(hold.active(true, false)).toBe(true);
    expect(hold.active(false, true)).toBe(false);
  });

  it('el derecho configurado para movimiento se comporta igual que el izquierdo', () => {
    const hold = new MoveClickHold(2);
    expect(hold.active(false, true)).toBe(true);
    expect(hold.active(false, false)).toBe(false);
  });

  it('no usa el estado del otro botón para mantener movimiento', () => {
    expect(new MoveClickHold(0).active(false, true)).toBe(false);
    expect(new MoveClickHold(2).active(true, false)).toBe(false);
  });
});
