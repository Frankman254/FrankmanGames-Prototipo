// Registro de combate en DOM: hasta seis líneas con lo que pasa en el mundo
// (daño, avisos, muertes, zonas, XP). Es texto ya escrito con `tr`, así que al
// cambiar de idioma cambian también las líneas antiguas (F07).
import { tr } from '../i18n';
import type { GameEvent } from '../sim/events';
import type { World } from '../sim/world';
import { bandLabel } from '../sim/zones';

export class CombatLog {
  private readonly log: HTMLElement;
  private readonly lines: string[] = [];
  private world: World | null = null;

  constructor(root: HTMLElement) {
    this.log = document.createElement('div');
    this.log.className = 'hud-log';
    this.log.style.display = 'none';
    root.appendChild(this.log);
  }

  /** Consume los sucesos del fotograma y repinta. */
  handle(world: World, events: readonly GameEvent[]): void {
    this.world = world;
    for (const e of events) {
      const line = this.describe(e);
      if (line) this.lines.push(line);
    }
    if (this.lines.length > 6) this.lines.splice(0, this.lines.length - 6);
    this.log.textContent = this.lines.map((l) => tr(l)).join('\n');
    this.log.style.display = this.lines.length > 0 ? 'block' : 'none';
  }

  clear(): void {
    this.lines.length = 0;
  }

  /** Nombre y nivel: "Lobo de pradera (niv. 7)". */
  private enemyName(id: number): string | null {
    const en = this.world?.enemies.get(id);
    const name = en ? this.world?.content.enemies[en.def.id]?.name : undefined;
    return en && name ? `${name} (niv. ${en.level})` : null;
  }

  /** Nombre del hechizo enemigo a partir de la etiqueta `enemy:<arquetipo>:<hueco>`. */
  private enemySpell(tag: string | null): string | null {
    const m = tag ? /^enemy:([^:]+):(\d+)$/.exec(tag) : null;
    return m ? (this.world?.data.enemies.archetypes[m[1]!]?.spells[Number(m[2])]?.name ?? null) : null;
  }

  private describe(e: GameEvent): string | null {
    switch (e.type) {
      case 'damage': {
        const crit = e.crit ? ' (crítico)' : '';
        if (e.toPlayer) {
          const who = this.enemyName(e.sourceId);
          const what = this.enemySpell(e.ability);
          return `${who ? `${who}${what ? ` · ${what}` : ''}: ` : 'Recibes '}${e.amount}${crit}`;
        }
        return `${e.ability ? this.world?.labelOf(e.ability) ?? e.ability : 'Golpe'} → ${e.amount}${crit}`;
      }
      case 'avoided':
        return 'Golpe evitado';
      case 'telegraph': {
        // Sólo los hechizos con nombre: el ataque básico ya se ve en el aviso del suelo.
        const en = this.world?.enemies.get(e.enemyId);
        if (!en || !en.current.name) return null;
        return `${this.enemyName(e.enemyId) ?? 'Enemigo'} prepara ${en.current.name}`;
      }
      case 'enemyDeath':
        return `Derrotado: ${this.enemyName(e.enemyId) ?? this.world?.content.enemies[e.archetype]?.name ?? e.archetype}`;
      case 'zoneEnter': {
        const z = e.zoneId ? this.world?.zoneMap.get(e.zoneId) : undefined;
        return z ? `Entras en: ${z.name} · ${bandLabel(z)}` : null;
      }
      case 'xp':
        return `+${e.amount} XP`;
      case 'levelUp':
        return `¡Nivel ${e.level}!`;
      case 'lootPickup':
        return e.byPet ? 'La mascota recoge botín' : null;
      case 'summon':
        return `Invoca ${e.count}`;
      case 'stagger':
        return 'Aturdido';
      default:
        return null;
    }
  }
}
