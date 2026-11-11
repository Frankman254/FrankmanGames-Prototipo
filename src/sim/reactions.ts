import type { Element } from '../rpg/contracts';

export interface ElementalReaction {
  id: string;
  label: string;
  pair: readonly [Element, Element];
  effect: 'burst' | 'slow' | 'pull' | 'field' | 'stagger' | 'spread' | 'shield';
  power: number;
}

export const LAB_REACTIONS: readonly ElementalReaction[] = [
  { id: 'temple_quebrado', label: 'Temple quebrado', pair: ['fire', 'frost'], effect: 'burst', power: 1.2 },
  { id: 'lodo_vivo', label: 'Lodo vivo', pair: ['earth', 'frost'], effect: 'slow', power: 0.35 },
  { id: 'fulgor_magnetico', label: 'Fulgor magnético', pair: ['earth', 'lightning'], effect: 'pull', power: 2 },
  { id: 'bruma_cargada', label: 'Bruma cargada', pair: ['frost', 'lightning'], effect: 'field', power: 3 },
  { id: 'fractura_termica', label: 'Fractura térmica', pair: ['earth', 'fire'], effect: 'stagger', power: 0.8 },
  { id: 'ascua_errante', label: 'Ascua errante', pair: ['fire', 'lightning'], effect: 'spread', power: 0.6 },
  { id: 'onda_de_choque', label: 'Onda de choque', pair: ['air', 'lightning'], effect: 'burst', power: 0.75 },
  { id: 'vaharada', label: 'Vaharada', pair: ['fire', 'water'], effect: 'field', power: 2.5 },
  { id: 'aguanieve', label: 'Aguanieve', pair: ['frost', 'water'], effect: 'slow', power: 0.45 },
  { id: 'corriente_viva', label: 'Corriente viva', pair: ['lightning', 'water'], effect: 'spread', power: 0.7 },
  { id: 'costra_prismatica', label: 'Costra prismática', pair: ['air', 'earth'], effect: 'shield', power: 0.5 },
] as const;

const key = (a: Element, b: Element): string => [a, b].sort().join(':');
const byPair = new Map(LAB_REACTIONS.map((reaction) => [key(...reaction.pair), reaction]));

export const findReaction = (a: Element, b: Element): ElementalReaction | null => a === b ? null : byPair.get(key(a, b)) ?? null;

export class ExposureTracker {
  private readonly exposed = new Map<string, Element>();

  apply(targetId: string, element: Element): ElementalReaction | null {
    const previous = this.exposed.get(targetId);
    this.exposed.set(targetId, element);
    if (!previous || previous === element) return null;
    const reaction = findReaction(previous, element);
    if (reaction) this.exposed.delete(targetId);
    return reaction;
  }

  clear(targetId: string): void { this.exposed.delete(targetId); }
}

