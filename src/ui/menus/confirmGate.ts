// Confirmaciones de compra y venta (`muerte-botin`). Lógica pura, sin DOM: qué
// diálogo toca para cada operación y la casilla «no volver a preguntar en esta
// sesión». La sesión de interfaz crea una puerta por partida.
import { RARITIES, type Rarity } from '../../rpg/contracts';

export type TradeKind = 'buy' | 'sell';

/**
 * - `direct`: se hace sin preguntar.
 * - `confirm`: sí/no (con casilla de no volver a preguntar si `skippable`).
 * - `quantity`: pide cantidad y confirma a la vez.
 */
export interface TradePrompt {
  mode: 'direct' | 'confirm' | 'quantity';
  /** Se enseña la casilla «no volver a preguntar en esta sesión». */
  skippable: boolean;
}

export interface TradeCase {
  kind: TradeKind;
  /** Hay que elegir cantidad (comprar algo apilable, vender una pila). */
  stack: boolean;
  rarity: Rarity;
  /** Opción `confirmRareSell`: las ventas raras o mejores preguntan siempre. */
  confirmRareSell: boolean;
}

export class ConfirmGate {
  private readonly skipped = new Set<TradeKind>();

  /** El jugador marcó «no volver a preguntar» para ese tipo de operación. */
  skip(kind: TradeKind): void {
    this.skipped.add(kind);
  }

  asks(kind: TradeKind): boolean {
    return !this.skipped.has(kind);
  }

  /**
   * Qué diálogo enseñar. Comprar algo apilable siempre pide cantidad (es la
   * única forma de elegirla). Vender una pila con la casilla marcada vende la
   * pila entera. Una venta rara con `confirmRareSell` pregunta siempre, sin casilla.
   */
  prompt(c: TradeCase): TradePrompt {
    const rare = c.kind === 'sell' && c.confirmRareSell && RARITIES.indexOf(c.rarity) >= RARITIES.indexOf('rare');
    if (c.kind === 'buy' && c.stack) return { mode: 'quantity', skippable: false };
    if (rare) return { mode: c.stack ? 'quantity' : 'confirm', skippable: false };
    if (!this.asks(c.kind)) return { mode: 'direct', skippable: false };
    return { mode: c.stack ? 'quantity' : 'confirm', skippable: true };
  }
}
