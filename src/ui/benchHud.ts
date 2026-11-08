// Capa de medición (`?bench`): barras de vida/recurso, seis huecos con barrido
// de enfriamiento, aviso de bloqueo y cartel de fin de partida. Solo se monta
// sin la interfaz del Slice 03; en el juego normal eso es cosa de `GameHud`.
import type { GameData } from '../data';
import { CAST_BLOCK_TEXT, slotView, type SlotView } from '../sim/combat';
import type { GameEvent } from '../sim/events';
import type { RunRecord } from '../sim/telemetry';
import type { World } from '../sim/world';

interface SlotEls {
  binding: { id: string; key: string };
  root: HTMLElement;
  label: HTMLElement;
  cost: HTMLElement;
  sweep: HTMLElement;
  time: HTMLElement;
}

export class BenchHud {
  private readonly hpFill: HTMLElement;
  private readonly hpText: HTMLElement;
  private readonly resFill: HTMLElement;
  private readonly resText: HTMLElement;
  private readonly slots: SlotEls[] = [];
  private readonly msg: HTMLElement;
  private readonly outcome: HTMLElement;
  private msgTimer = 0;

  constructor(root: HTMLElement, private readonly data: GameData, bindings: SlotEls['binding'][]) {
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
      const label = el('div', 'slot-label', s);
      const sweep = el('div', 'slot-sweep', s);
      const time = el('div', 'slot-time', s);
      el('div', 'slot-key', s).textContent = b.key;
      const cost = el('div', 'slot-cost', s);
      this.slots.push({ binding: b, root: s, label, cost, sweep, time });
    }
    this.msg = el('div', 'hud-msg', root);
    this.outcome = el('div', 'hud-outcome', root);
    this.outcome.style.display = 'none';
  }

  /** Cartel de fin de partida con el resumen de la telemetría. */
  showOutcome(r: RunRecord, label: (id: string) => string): void {
    const title = r.outcome === 'victory' ? 'Arena limpia' : 'Has caído';
    const uses = Object.entries(r.abilityUses).map(([k, n]) => `${k === 'evade' ? 'Evasión' : label(k)} ×${n}`).join(' · ') || '—';
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

  update(world: World, events: readonly GameEvent[], frameSeconds: number): void {
    const p = world.player;
    this.hpFill.style.width = `${(100 * p.health) / p.maxHealth}%`;
    this.hpText.textContent = `${Math.ceil(p.health)} / ${p.maxHealth}`;
    this.resFill.style.width = `${(100 * p.resource) / p.maxResource}%`;
    this.resText.textContent = `${Math.floor(p.resource)} / ${p.maxResource}`;
    for (const s of this.slots) {
      const id = this.resolve(world, s.binding.id);
      const label = id === null ? '—' : world.labelOf(id);
      if (s.label.textContent !== label) s.label.textContent = label;
      const cost = id === null ? 0 : world.ability(id).resourceCost;
      // El básico enseña sus cargas en lugar del coste.
      const costText = id === 'basic' ? `${p.basicCharges}/${this.data.player.basicAttack.charges}` : cost > 0 ? String(cost) : '';
      if (s.cost.textContent !== costText) s.cost.textContent = costText;
      s.cost.style.display = costText ? '' : 'none';
      if (id === null) {
        s.sweep.style.background = 'none';
        s.time.textContent = '';
        s.root.classList.remove('poor', 'ready');
        continue;
      }
      const v = this.view(world, id);
      const deg = (v.sweep * 360).toFixed(1);
      s.sweep.style.background = v.sweep > 0 ? `conic-gradient(rgba(0,0,0,.68) 0deg ${deg}deg, transparent ${deg}deg 360deg)` : 'none';
      s.time.textContent = v.remaining > 0.05 && v.sweep > 0 ? v.remaining.toFixed(1) : '';
      s.root.classList.toggle('poor', v.lacksResource);
      s.root.classList.toggle('ready', v.ready && p.alive);
    }

    for (const e of events) {
      if (e.type === 'castBlocked') this.flash(CAST_BLOCK_TEXT[e.reason]);
    }
    this.msgTimer -= frameSeconds;
    this.msg.style.opacity = this.msgTimer > 0 ? '1' : '0';
  }

  flash(text: string): void {
    this.msg.textContent = text;
    this.msgTimer = 0.9;
  }

  /** Id de hechizo de un hueco ('slotN' → lo que haya en la barra), o null si está vacío. */
  private resolve(world: World, id: string): string | null {
    const m = /^slot(\d+)$/.exec(id);
    return m ? (world.character.spellbook.hotbar[Number(m[1]) - 1] ?? null) : id;
  }

  private view(world: World, id: string): SlotView {
    const p = world.player;
    const v = slotView(p, world.ability(id));
    if (id !== 'basic' || p.basicCharges > 0) return v;
    // Combate v2: sin cargas, el barrido muestra lo que falta para la siguiente.
    const total = this.data.player.basicAttack.rechargeSeconds;
    return { ...v, sweep: Math.min(1, p.basicRecharge / total), remaining: p.basicRecharge, ready: false };
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
