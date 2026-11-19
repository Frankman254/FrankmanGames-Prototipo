// Lo que pasa en el mundo, al chat (creador, 2026-11-08, U01): el combate va a su canal
// «Combate» y lo demás (entrar en una zona) a «Sistema». Cada línea va en trozos con su tipo,
// para que el chat pinte cada cosa con su color: lugares, enemigos (con nivel), objetos, otros
// personajes, y el daño del color de su elemento. Antes era un recuadro aparte de seis líneas.
import { trf } from '../i18n';
import type { Element } from '../rpg/contracts';
import type { GameEvent } from '../sim/events';
import type { World } from '../sim/world';
import { bandLabel } from '../sim/zones';
import type { ChatPart } from './chatLog';

export type CombatSink = (channel: 'combat' | 'system', parts: ChatPart[]) => void;

export class CombatLog {
    private world: World | null = null;
    /** DW-01: mano del último ataque básico (para etiquetar el daño resultante). */
    private lastBasicHand: 'weapon' | 'offhand' | null = null;

    constructor(private readonly sink: CombatSink) {}

    /** Consume los sucesos del fotograma y los manda al chat. */
    handle(world: World, events: readonly GameEvent[]): void {
        this.world = world;
        for (const e of events) {
            // DW-01: recordar la mano del último ataque básico para etiquetar el daño.
            if (e.type === 'cast' && e.ability === 'basic' && e.hand) {
                this.lastBasicHand = e.hand;
            }
            const line = this.describe(e);
            if (line) this.sink(line.channel, line.parts);
        }
    }

    /** Sin estado propio: las líneas viven en el chat. */
    clear(): void {}

    private enemyParts(id: number): ChatPart[] | null {
        const en = this.world?.enemies.get(id);
        const name = en ? this.world?.content.enemies[en.def.id]?.name : undefined;
        return en && name
            ? [
                  { text: name, kind: 'enemy' },
                  { text: trf('(niv. {level})', { level: en.level }), kind: 'level' },
              ]
            : null;
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
                    return combat([
                        ...(who ?? [{ text: 'Enemigo', kind: 'enemy' }]),
                        ...(what ? [{ text: ` · ${what.name}`, kind: 'spell' as const }] : []),
                        { text: trf(' te hace ', {}) },
                        amount,
                    ]);
                }
                const ability = e.ability ? (this.world?.labelOf(e.ability) ?? e.ability) : 'Golpe';
                const target = this.enemyParts(e.targetId);
                // DW-01: si el último ataque básico fue con la mano izquierda, añadir la etiqueta.
                let handTag: { text: string } | undefined;
                if (e.ability === 'basic' && this.lastBasicHand === 'offhand') {
                    handTag = { text: trf(' (mano izquierda · 75 %)', {}) };
                    this.lastBasicHand = null; // consumido
                } else if (e.ability === 'basic') {
                    this.lastBasicHand = null; // consumido
                }
                return combat([
                    { text: ability, kind: 'spell' },
                    ...(handTag ? [handTag] : []),
                    { text: ' → ' },
                    ...(target ? [...target, { text: ': ' }] : []),
                    amount,
                ]);
            }
            case 'heal': {
                const rounded = Math.round(e.amount);
                // No mostrar curas fraccionarias que redondean a 0 (evita inundar el chat).
                // Cubre regen nativa y statuses con tick de curación.
                if (rounded < 1) return null;
                let label: string | undefined;
                if (e.source) {
                    if (e.source === 'regen') {
                        label = 'Regeneración';
                    } else {
                        label = this.world?.labelOf(e.source) ?? e.source;
                    }
                }
                return combat([
                    ...(label ? [{ text: label, kind: 'spell' as const }, { text: ' → ' }] : []),
                    { text: trf('Curas ', {}) },
                    { text: `+${rounded}`, kind: 'heal' as const },
                ]);
            }
            case 'avoided':
                return combat([{ text: 'Golpe evitado', kind: 'system' }]);
            case 'telegraph': {
                // Solo los hechizos con nombre: el ataque básico ya se ve en el aviso del suelo.
                const en = this.world?.enemies.get(e.enemyId);
                if (!en || !en.current.name) return null;
                return combat([
                    ...(this.enemyParts(e.enemyId) ?? [{ text: 'Enemigo', kind: 'enemy' }]),
                    { text: ' prepara ' },
                    { text: en.current.name, kind: 'spell' },
                ]);
            }
            case 'enemyDeath': {
                const who = this.enemyParts(e.enemyId) ?? [
                    { text: this.world?.content.enemies[e.archetype]?.name ?? e.archetype, kind: 'enemy' },
                ];
                return combat([{ text: trf('Derrotado: ', {}) }, ...who]);
            }
            case 'zoneEnter': {
                const z = e.zoneId ? this.world?.zoneMap.get(e.zoneId) : undefined;
                return z
                    ? {
                          channel: 'system',
                          parts: [
                              { text: trf('Entras en: ', {}) },
                              { text: z.name, kind: 'place' },
                              { text: trf(' · {band}', { band: bandLabel(z) }), kind: 'level' },
                          ],
                      }
                    : null;
            }
            case 'xp':
                return combat([{ text: trf('+{amount} XP', { amount: e.amount }), kind: 'xp' }]);
            case 'levelUp':
                return { channel: 'system', parts: [{ text: trf('¡Nivel {level}!', { level: e.level }), kind: 'xp' }] };
            case 'lootPickup':
                return e.byPet ? combat([{ text: 'La mascota recoge botín', kind: 'item' }]) : null;
            case 'summon':
                return combat([...(this.enemyParts(e.enemyId) ?? []), { text: trf(' invoca {count}', { count: e.count }) }]);
            case 'stagger':
                return combat([...(this.enemyParts(e.enemyId) ?? []), { text: trf(' queda aturdido', {}) }]);
            default:
                return null;
        }
    }
}
