// HUD de combate en DOM: vida, recurso, huecos de habilidad con barrido
// circular de enfriamiento (gris si falta recurso), aviso de bloqueo y registro.
import type { GameData } from '../data';
import { slotView, type CastBlock, type SlotView } from '../sim/combat';
import type { GameEvent } from '../sim/events';
import type { RunRecord } from '../sim/telemetry';
import type { World } from '../sim/world';

export interface SlotBinding {
  /** Id de habilidad en data/abilities.json, o 'evade'. */
  id: string;
  key: string;
}

const BLOCK_TEXT: Record<CastBlock, string> = {
  dead: 'Sin vida',
  busy: 'Ocupado',
  target: 'Sin objetivo',
  resource: 'Falta recurso',
  cooldown: 'En enfriamiento',
  gcd: 'Enfriamiento global',
  range: 'Fuera de alcance',
};

interface SlotEls {
  binding: SlotBinding;
  root: HTMLElement;
  sweep: HTMLElement;
  time: HTMLElement;
}

export class Hud {
  private readonly hpFill: HTMLElement;
  private readonly hpText: HTMLElement;
  private readonly resFill: HTMLElement;
  private readonly resText: HTMLElement;
  private readonly slots: SlotEls[] = [];
  private readonly msg: HTMLElement;
  private readonly log: HTMLElement;
  private readonly lines: string[] = [];
  private readonly outcome: HTMLElement;
  private msgTimer = 0;

  constructor(root: HTMLElement, private readonly data: GameData, bindings: SlotBinding[]) {
    const bottom = el('div', 'hud-bottom', root);
    const [hpFill, hpText] = bar(bottom, 'hp');
    const [resFill, resText] = bar(bottom, 'res');
    this.hpFill = hpFill;
    this.hpText = hpText;
    this.resFill = resFill;
    this.resText = resText;
    const row = el('div', 'hud-slots', bottom);
    for (const b of bindings) {
      const s = el('div', 'slot', row);
      el('div', 'slot-label', s).textContent = this.label(b.id);
      const sweep = el('div', 'slot-sweep', s);
      const time = el('div', 'slot-time', s);
      el('div', 'slot-key', s).textContent = b.key;
      const cost = b.id === 'evade' ? data.player.evade.resourceCost : data.abilities.abilities[b.id]!.resourceCost;
      if (cost > 0) el('div', 'slot-cost', s).textContent = String(cost);
      this.slots.push({ binding: b, root: s, sweep, time });
    }
    this.msg = el('div', 'hud-msg', root);
    this.log = el('div', 'hud-log', root);
    this.outcome = el('div', 'hud-outcome', root);
    this.outcome.style.display = 'none';
  }

  /** Cartel de fin de partida con el resumen de la telemetría. */
  showOutcome(r: RunRecord): void {
    const title = r.outcome === 'victory' ? 'Arena limpia' : 'Has caído';
    const uses = Object.entries(r.abilityUses).map(([k, n]) => `${k === 'evade' ? 'Evasión' : this.label(k)} ×${n}`).join(' · ') || '—';
    this.outcome.innerHTML = '';
    el('div', 'hud-outcome-title', this.outcome).textContent = title;
    el('div', 'hud-outcome-body', this.outcome).textContent =
      `Tiempo ${r.seconds.toFixed(1)} s · daño hecho ${r.damageDealt} · daño recibido ${r.damageTaken}\n` +
      `Habilidades: ${uses}\n` +
      `[F9] reiniciar   [T] guardar telemetría (JSON)`;
    this.outcome.style.display = 'block';
  }

  hideOutcome(): void {
    this.outcome.style.display = 'none';
  }

  private label(id: string): string {
    return id === 'evade' ? 'Evasión' : this.data.abilities.abilities[id]!.label;
  }

  private view(world: World, id: string): SlotView {
    const p = world.player;
    if (id !== 'evade') return slotView(p, world.ability(id));
    const ev = this.data.player.evade;
    const lacksResource = p.resource < ev.resourceCost;
    return {
      sweep: ev.cooldown > 0 ? Math.min(1, p.evadeCooldown / ev.cooldown) : 0,
      remaining: p.evadeCooldown,
      lacksResource,
      ready: !lacksResource && p.evadeCooldown <= 0,
    };
  }

  update(world: World, events: readonly GameEvent[], frameSeconds: number): void {
    const p = world.player;
    this.hpFill.style.width = `${(100 * p.health) / p.maxHealth}%`;
    this.hpText.textContent = `${Math.ceil(p.health)} / ${p.maxHealth}`;
    this.resFill.style.width = `${(100 * p.resource) / p.maxResource}%`;
    this.resText.textContent = `${Math.floor(p.resource)} / ${p.maxResource}`;
    for (const s of this.slots) {
      const v = this.view(world, s.binding.id);
      const deg = (v.sweep * 360).toFixed(1);
      s.sweep.style.background = v.sweep > 0 ? `conic-gradient(rgba(0,0,0,.68) 0deg ${deg}deg, transparent ${deg}deg 360deg)` : 'none';
      s.time.textContent = v.remaining > 0.05 && v.sweep > 0 ? v.remaining.toFixed(1) : '';
      s.root.classList.toggle('poor', v.lacksResource);
      s.root.classList.toggle('ready', v.ready && p.alive);
    }

    for (const e of events) {
      if (e.type === 'castBlocked') this.flash(BLOCK_TEXT[e.reason]);
      const line = this.describe(e);
      if (line) this.lines.push(line);
    }
    if (this.lines.length > 6) this.lines.splice(0, this.lines.length - 6);
    this.log.textContent = this.lines.join('\n');
    this.log.style.display = this.lines.length > 0 ? 'block' : 'none';
    this.msgTimer -= frameSeconds;
    this.msg.style.opacity = this.msgTimer > 0 ? '1' : '0';
  }

  flash(text: string): void {
    this.msg.textContent = text;
    this.msgTimer = 0.9;
  }

  clearLog(): void {
    this.lines.length = 0;
  }

  private describe(e: GameEvent): string | null {
    switch (e.type) {
      case 'damage': {
        const crit = e.crit ? ' (crítico)' : '';
        if (e.toPlayer) return `Recibes ${e.amount}${crit}`;
        return `${e.ability ? this.label(e.ability) : 'Golpe'} → ${e.amount}${crit}`;
      }
      case 'avoided':
        return 'Golpe evitado';
      case 'enemyDeath':
        return `Derrotado: ${e.archetype}`;
      case 'summon':
        return `Invoca ${e.count}`;
      case 'stagger':
        return 'Aturdido';
      default:
        return null;
    }
  }
}

function el(tag: string, cls: string, parent: HTMLElement): HTMLElement {
  const n = document.createElement(tag);
  n.className = cls;
  parent.appendChild(n);
  return n;
}

function bar(parent: HTMLElement, kind: string): [HTMLElement, HTMLElement] {
  const b = el('div', `hud-bar ${kind}`, parent);
  const fill = el('div', 'hud-bar-fill', b);
  const text = el('div', 'hud-bar-text', b);
  return [fill, text];
}
