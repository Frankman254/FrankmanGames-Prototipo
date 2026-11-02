import { describe, expect, it } from 'vitest';
import { selectBankItems } from '../../src/ui/menus/bankPanel';

const visible = ['a', 'b', 'c', 'd', 'e'];

describe('selección múltiple del banco', () => {
  it('un clic normal sustituye la selección sin mutar el conjunto anterior', () => {
    const previous = new Set(['a', 'c']);
    const next = selectBankItems(previous, visible, 'b', 'a', false, false);
    expect([...next.selected]).toEqual(['b']);
    expect(next.anchor).toBe('b');
    expect([...previous]).toEqual(['a', 'c']);
  });

  it('Ctrl añade o quita una pila', () => {
    const added = selectBankItems(new Set(['a']), visible, 'c', 'a', true, false);
    expect([...added.selected]).toEqual(['a', 'c']);
    const removed = selectBankItems(added.selected, visible, 'a', 'c', true, false);
    expect([...removed.selected]).toEqual(['c']);
  });

  it.each([['b', 'd'], ['d', 'b']])('Mayús selecciona el rango visible de %s a %s', (anchor, clicked) => {
    const next = selectBankItems(new Set(['e']), visible, clicked, anchor, false, true);
    expect([...next.selected]).toEqual(['b', 'c', 'd']);
    expect(next.anchor).toBe(anchor);
  });

  it('Ctrl + Mayús conserva lo anterior y añade el rango', () => {
    const next = selectBankItems(new Set(['a']), visible, 'e', 'c', true, true);
    expect([...next.selected]).toEqual(['a', 'c', 'd', 'e']);
  });

  it('un ancla desaparecida no arrastra objetos ocultos al seleccionar otro rango', () => {
    const next = selectBankItems(new Set(['a']), ['b', 'd'], 'd', 'c', false, true);
    expect([...next.selected]).toEqual(['d']);
    expect(next.anchor).toBe('d');
  });

  it('un uid ausente no se añade ni cambia el ancla', () => {
    const next = selectBankItems(new Set(['a']), visible, 'inexistente', 'a', false, false);
    expect([...next.selected]).toEqual(['a']);
    expect(next.anchor).toBe('a');
  });
});
