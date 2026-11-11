// Lo que pasa en el mundo, al chat (creador, 2026-11-08, U01): el combate va a su canal
// «Combate» y lo demás (entrar en una zona) a «Sistema». Cada línea va en trozos con su tipo,
// para que el chat pinte cada cosa con su color: lugares, enemigos (con nivel), objetos, otros
// personajes, y el daño del color de su elemento. Antes era un recuadro aparte de seis líneas.
import type { Element } from '../rpg/contracts';
import type { GameEvent } from '../sim/events';
import type { World } from '../sim/world';
import { bandLabel } from '../sim/zones';
import type { ChatPart } from './chatLog';

export type CombatSink = (channel: 'combat' | 'system', parts: ChatPart[]) => void;

export class CombatLog {
  private world: World | null = null;

  constructor(private readonly sink: CombatSink) {}

  /** Consume los sucesos del fotograma y los manda al chat. */
  handle(world: World, events: readonly GameEvent[]): void {
    this.world = world;
    for (const e of events) {
      const line = this.describe(e);
      if (line) this.sink(line.channel, line.parts);
    }
  }

  /** Sin estado propio: las líneas viven en el chat. */
  clear(): void {}

  private enemyParts(id: number): ChatPart[] | null {
    const en = this.world?.enemies.get(id);
    const name = en ? this.world?.content.enemies[en.def.id]?.name : undefined;
    return en && name ? [{ text: name, kind: 'enemy' }, { text: ` (niv. ${en.level})`, kind: 'level' }] : null;
  }

  /** Hechizo enemigo de la etiqueta `enemy:<arquetipo>:<hueco>` (nombre y elemento). */
  private enemySpell(tag: string | null): { name: string; element: Element | null } | null {
    const m = tag ? /^enemy:([^:]+):(\d+)$/.exec(tag) : null;
    const sp = m ? this.world?.data.enemies.archetypes[m[1]!]?.spells[Number(m[2])] : undefined;
    return sp ? { name: sp.name, element: (sp.element as Element | undefined) ?? null } : null;
  }

  /** Elemento de un golpe: el del hechizo, el del arma o el del enemigo. */
  private elementOf(e: Extract<GameEvent, { type: 'damage' }>): Element {
    const w = this.world;
    if (!w) return 'earth';
    if (e.toPlayer) {
      const sp = this.enemySpell(e.ability);
      if (sp?.element) return sp.element;
      const en = w.enemies.get(e.sourceId);
      return (en ? w.content.enemies[en.def.id]?.element : undefined) ?? 'earth';
    }
    const spell = e.ability ? w.content.spells[e.ability] : undefined;
    if (spell) return spell.element;
    return w.character.weapon()?.weapon?.element ?? 'earth';
  }

  private describe(e: GameEvent): { channel: 'combat' | 'system'; parts: ChatPart[] } | null {
    const combat = (parts: ChatPart[]): { channel: 'combat'; parts: ChatPart[] } => ({ channel: 'combat', parts });
    switch (e.type) {
      case 'damage': {
        const el = this.elementOf(e);
        const amount: ChatPart = { text: `${e.amount}${e.crit ? ' (crítico)' : ''}`, kind: `dmg-${el}` };
        if (e.toPlayer) {
          const who = this.enemyParts(e.sourceId);
          const what = this.enemySpell(e.ability);
          return combat([...(who ?? [{ text: 'Enemigo', kind: 'enemy' }]), ...(what ? [{ text: ` · ${what.name}`, kind: 'spell' as const }] : []), { text: ' te hace ' }, amount]);
        }
        const ability = e.ability ? (this.world?.labelOf(e.ability) ?? e.ability) : 'Golpe';
        const target = this.enemyParts(e.targetId);
        return combat([{ text: ability, kind: 'spell' }, { text: ' → ' }, ...(target ? [...target, { text: ': ' }] : []), amount]);
      }
      case 'heal':
        return combat([{ text: 'Curas ' }, { text: `+${Math.round(e.amount)}`, kind: 'heal' }]);
      case 'avoided':
        return combat([{ text: 'Golpe evitado', kind: 'system' }]);
      case 'telegraph': {
        // Solo los hechizos con nombre: el ataque básico ya se ve en el aviso del suelo.
        const en = this.world?.enemies.get(e.enemyId);
        if (!en || !en.current.name) return null;
        return combat([...(this.enemyParts(e.enemyId) ?? [{ text: 'Enemigo', kind: 'enemy' }]), { text: ' prepara ' }, { text: en.current.name, kind: 'spell' }]);
      }
      case 'enemyDeath': {
        const who = this.enemyParts(e.enemyId) ?? [{ text: this.world?.content.enemies[e.archetype]?.name ?? e.archetype, kind: 'enemy' }];
        return combat([{ text: 'Derrotado: ' }, ...who]);
      }
      case 'zoneEnter': {
        const z = e.zoneId ? this.world?.zoneMap.get(e.zoneId) : undefined;
        return z ? { channel: 'system', parts: [{ text: 'Entras en: ' }, { text: z.name, kind: 'place' }, { text: ` · ${bandLabel(z)}`, kind: 'level' }] } : null;
      }
      case 'xp':
        return combat([{ text: `+${e.amount} XP`, kind: 'xp' }]);
      case 'levelUp':
        return { channel: 'system', parts: [{ text: `¡Nivel ${e.level}!`, kind: 'xp' }] };
      case 'lootPickup':
        return e.byPet ? combat([{ text: 'La mascota recoge botín', kind: 'item' }]) : null;
      case 'summon':
        return combat([...(this.enemyParts(e.enemyId) ?? []), { text: ` invoca ${e.count}` }]);
      case 'stagger':
        return combat([...(this.enemyParts(e.enemyId) ?? []), { text: ' queda aturdido' }]);
      default:
        return null;
    }
  }
}
