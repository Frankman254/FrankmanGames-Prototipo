import { describe, expect, it } from 'vitest';
import { ConfirmGate, type TradeCase } from '../../src/ui/menus/confirmGate';

const sell = (o: Partial<TradeCase> = {}): TradeCase => ({ kind: 'sell', stack: false, rarity: 'common', confirmRareSell: true, ...o });
const buy = (o: Partial<TradeCase> = {}): TradeCase => ({ kind: 'buy', stack: false, rarity: 'common', confirmRareSell: false, ...o });

describe('confirmaciones de tienda', () => {
  it('por defecto pregunta antes de comprar y de vender, con casilla', () => {
    const g = new ConfirmGate();
    expect(g.prompt(buy())).toEqual({ mode: 'confirm', skippable: true });
    expect(g.prompt(sell())).toEqual({ mode: 'confirm', skippable: true });
    expect(g.prompt(sell({ stack: true }))).toEqual({ mode: 'quantity', skippable: true });
  });

  it('«no volver a preguntar» vale para su tipo de operación y no para el otro', () => {
    const g = new ConfirmGate();
    g.skip('sell');
    expect(g.prompt(sell())).toEqual({ mode: 'direct', skippable: false });
    expect(g.prompt(sell({ stack: true }))).toEqual({ mode: 'direct', skippable: false });
    expect(g.prompt(buy())).toEqual({ mode: 'confirm', skippable: true });
    g.skip('buy');
    expect(g.prompt(buy())).toEqual({ mode: 'direct', skippable: false });
  });

  it('comprar algo apilable siempre pide cantidad, sin casilla', () => {
    const g = new ConfirmGate();
    expect(g.prompt(buy({ stack: true }))).toEqual({ mode: 'quantity', skippable: false });
    g.skip('buy');
    expect(g.prompt(buy({ stack: true }))).toEqual({ mode: 'quantity', skippable: false });
  });

  it('una venta rara con confirmRareSell pregunta siempre, aunque se haya marcado la casilla', () => {
    const g = new ConfirmGate();
    g.skip('sell');
    expect(g.prompt(sell({ rarity: 'rare' }))).toEqual({ mode: 'confirm', skippable: false });
    expect(g.prompt(sell({ rarity: 'epic', stack: true }))).toEqual({ mode: 'quantity', skippable: false });
    expect(g.prompt(sell({ rarity: 'rare', confirmRareSell: false }))).toEqual({ mode: 'direct', skippable: false });
  });

  it('una puerta nueva (partida nueva) vuelve a preguntar', () => {
    const g = new ConfirmGate();
    g.skip('buy');
    expect(new ConfirmGate().asks('buy')).toBe(true);
  });
});
