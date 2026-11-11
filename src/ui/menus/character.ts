// Hoja de personaje: estadísticas con desglose por fuente al pasar el ratón,
// reparto de puntos en las principales y progreso de nivel.
import { ELEMENTS, PRIMARY_STATS, type PrimaryStat, type StatLine } from '../../rpg/contracts';
import { sourceName, type UiContext } from './context';
import { button, clear, h } from './dom';
import { ELEMENT_LABEL, formatModValue, formatModifier, formatStatValue, pulseText, statLabel, type TipLine } from './format';
import { ELEMENT_COLOR, namedIcon } from './icons';
import { Panel } from './panel';

const PRIMARY_HINT: Record<PrimaryStat, string> = {
  strength: 'Daño de tierra y capacidad de carga',
  agility: 'Daño de aire, placaje y huida',
  intellect: 'Daño de fuego y curaciones',
  calm: 'Daño de hielo y templanza',
  flow: 'Daño de agua y hallazgo',
  will: 'Daño de rayo y concentración',
  vitality: 'Vida máxima',
  spirit: 'Recurso máximo y regeneración',
};

const GROUPS: { title: string; stats: string[] }[] = [
  { title: 'Supervivencia', stats: ['maxHealth', 'healthRegen', 'maxResource', 'resourceRegen', 'healingPower'] },
  { title: 'Ataque', stats: ['power', 'critChance', 'critBonus', 'cooldownReduction', 'castStability'] },
  { title: 'Movimiento y Táctica', stats: ['moveSpeed', 'tackle', 'escape', 'slowResist', 'carryCapacity', 'discovery'] },
];

export class CharacterPanel extends Panel {
  private readonly head: HTMLElement;
  private readonly primary: HTMLElement;
  /** Puntos que gasta cada «+»; se conserva entre repintados. */
  private spendAmount = 1;
  private readonly secondary: HTMLElement;

  constructor(ctx: UiContext, onClose: () => void) {
    super(ctx, 'Personaje', 'panel-character', onClose);
    this.head = h('div.char-head');
    this.primary = h('div.char-primary');
    this.secondary = h('div.char-secondary');
    this.body.append(this.head, this.primary, this.secondary);
  }

  render(): void {
    const s = this.ctx.session();
    const p = s.player();
    const cls = s.content.classes[p.classId];

    clear(this.head);
    const face = h('div.char-face');
    face.innerHTML = namedIcon(cls?.icon ?? 'class_ember', cls?.resource.color ?? '#d9b26a');
    this.head.append(
      face,
      h('div', null,
        h('div.char-name', { text: p.name }),
        h('div.char-class', { text: `${cls?.name ?? p.classId} · nivel ${p.level}` }),
        h('div.char-xp', null, h('div.fill', { style: `width:${(100 * p.xp) / Math.max(1, p.xpToNext)}%` })),
        h('div.char-xptext', { text: `${p.xp} / ${p.xpToNext} XP para el nivel ${p.level + 1}` })),
    );
    if (p.energy) {
      const energy = p.energy;
      this.head.appendChild(h('div.energy-card', null,
        h('div', { text: pulseText(energy.name, energy.value, energy.max) }),
        h('div.char-xp', null, h('div.fill', { style: `width:${(100 * energy.value) / Math.max(1, energy.max)}%;background:${energy.color}` })),
        energy.penalty ? h('small', { text: `${energy.penalty.name}: ${energy.penalty.description}` }) : h('small', { text: energy.description }),
      ));
    }

    clear(this.primary);
    const pts = p.unspentStatPoints;
    // El reinicio devuelve CAPITAL según la regla vigente del catálogo, no el
    // recuento de unidades: con tramos y fijos, 150 unidades ≠ 150 de coste.
    const allocated = s.allocatedStatCapital();
    const reset = button(`Reiniciar puntos${allocated > 0 ? ` (${allocated})` : ''}`, () => {
      this.ctx.confirm({
        title: 'Reiniciar características',
        text: `¿Devolver ${allocated} punto${allocated === 1 ? '' : 's'} de capital a la reserva para repartirlos otra vez?`,
        yes: 'Reiniciar',
        onYes: () => this.report(this.ctx.session().resetStatPoints()),
      });
    }, 'small');
    reset.disabled = allocated <= 0;
    const amount = h('input.points-amount', { type: 'number', min: '1', step: '1', value: String(this.spendAmount), title: 'Puntos que gasta cada «+»', disabled: pts <= 0 }) as HTMLInputElement;
    amount.addEventListener('change', () => {
      const n = Math.floor(Number(amount.value));
      this.spendAmount = Number.isFinite(n) && n >= 1 ? n : 1;
      amount.value = String(this.spendAmount);
    });
    // Que escribir la cantidad no dispare atajos del juego.
    amount.addEventListener('keydown', (ev) => ev.stopPropagation());
    this.primary.appendChild(h('div.points-row', null,
      h(`div.points${pts > 0 ? '.has' : ''}` as 'div', { text: pts > 0 ? `Puntos por repartir: ${pts}` : 'Sin puntos por repartir' }),
      h('label.points-amount-label', { title: 'Puntos que gasta cada «+»' }, h('span', { text: 'Cantidad' }), amount),
      reset));
    for (const stat of PRIMARY_STATS) {
      const line = p.stats.find((x) => x.stat === stat);
      const nextCost = s.statPointCost(stat);
      // «Cantidad» es CAPITAL, no unidades: a 2 puntos por unidad, 5 de capital
      // compran 2 unidades. El coste unitario vigente va en el título.
      const plus = h('button.plus', { type: 'button', title: `${statLabel(stat)}: ${nextCost} punto${nextCost === 1 ? '' : 's'} de capital por unidad · ${PRIMARY_HINT[stat]}. Gastar hasta ${this.spendAmount} de capital (≈ ${Math.floor(this.spendAmount / nextCost)} unidad${Math.floor(this.spendAmount / nextCost) === 1 ? '' : 's'})`, text: '+', disabled: pts < nextCost });
      plus.addEventListener('click', () => this.report(this.ctx.session().spendStatPoints(stat, this.spendAmount)));
      const all = h('button.plus.all', { type: 'button', title: `Gastar todo el capital (${pts}) en ${statLabel(stat)}: ${nextCost} punto${nextCost === 1 ? '' : 's'} por unidad`, text: 'Todo', disabled: pts < nextCost });
      all.addEventListener('click', () => this.report(this.ctx.session().spendStatPoints(stat, Infinity)));
      const row = h('div.stat-row.primary', null,
        h('span.n', { text: statLabel(stat) }),
        h('span.cost', { text: `${nextCost}/u`, title: `Cuesta ${nextCost} punto${nextCost === 1 ? '' : 's'} de capital por unidad` }),
        h('b', { text: line ? formatStatValue(stat, line.value) : '0' }),
        plus, all);
      this.bindBreakdown(row, stat);
      this.primary.appendChild(row);
    }

    clear(this.secondary);
    for (const g of GROUPS) {
      if (!g.stats.length) continue;
      const box = h('div.stat-group', null, h('h4', { text: g.title }));
      for (const stat of g.stats) {
        const line = p.stats.find((x) => x.stat === stat);
        if (!line) continue;
        const row = h('div.stat-row', null, h('span.n', { text: statLabel(line.stat) }), h('b', { text: formatStatValue(line.stat, line.value) }));
        this.bindBreakdown(row, line.stat);
        box.appendChild(row);
      }
      this.secondary.appendChild(box);
    }
    const inv = s.inventory();
    if (inv.maxWeight !== undefined) {
      // La fila de «Bono» sólo muestra mods de Fuerza/equipo; aquí va el total
      // real de la mochila con su desglose (base + nivel + bonos).
      const p2 = s.player();
      const base = s.content.progression.inventoryMaxWeight ?? s.content.progression.inventorySize;
      const perLevel = s.content.progression.inventoryWeightPerLevel * (p2.level - 1);
      const bonus = Math.max(0, Math.round((inv.maxWeight - base - perLevel) * 100) / 100);
      const box = h('div.stat-group', null, h('h4', { text: 'Carga' }));
      const row = h('div.stat-row', null,
        h('span.n', { text: 'Capacidad total (Briznas)' }),
        h('b', { text: `${Math.round(inv.maxWeight * 100) / 100}` }));
      row.title = `Base ${base} + ${perLevel} por nivel + ${bonus} de bonos (Fuerza, equipo, bolsas)`;
      box.appendChild(row);
      this.secondary.appendChild(box);
    }
    this.renderElements();
    this.renderSets();
  }

  /** Resistencia y daño plano por elemento, con el tope de resistencia. */
  private renderElements(): void {
    const s = this.ctx.session();
    const p = s.player();
    const val = (id: StatLine['stat']): number => p.stats.find((x) => x.stat === id)?.value ?? 0;
    const cap = s.content.progression.resistCap;
    const body = h('tbody');
    for (const el of ELEMENTS) {
      const res = val(`resist.${el}`);
      const dmg = val(`damage.${el}`);
      const dot = h('i.el-dot');
      dot.style.background = ELEMENT_COLOR[el];
      const resCell = h('td', { text: formatStatValue(`resist.${el}`, Math.min(res, cap)) });
      if (res >= cap) {
        resCell.classList.add('capped');
        resCell.title = `Tope: ${cap} %`;
      }
      const row = h('tr', null, h('td', null, dot, ELEMENT_LABEL[el]), resCell, h('td', { text: dmg ? `+${formatStatValue(`damage.${el}`, dmg)}` : '—' }));
      this.bindBreakdown(row, `resist.${el}`);
      body.appendChild(row);
    }
    this.secondary.appendChild(h('div.stat-group.stat-wide', null,
      h('h4', { text: `Por elemento (tope ${cap} %)` }),
      h('table.eq-elements', null, h('thead', null, h('tr', null, h('th', { text: 'Elemento' }), h('th', { text: 'Resist.' }), h('th', { text: 'Daño +' }))), body)));
  }

  /** Conjuntos con piezas puestas: cuántas y qué escalones están activos. */
  private renderSets(): void {
    const s = this.ctx.session();
    const worn = new Map<string, number>();
    for (const it of Object.values(s.equipment())) {
      const setId = it ? s.content.items[it.itemId]?.setId : undefined;
      if (setId) worn.set(setId, (worn.get(setId) ?? 0) + 1);
    }
    if (worn.size === 0) return;
    const box = h('div.stat-group.stat-wide', null, h('h4', { text: 'Conjuntos' }));
    for (const [setId, count] of worn) {
      const set = s.content.sets[setId];
      if (!set) continue;
      const total = Object.values(s.content.items).filter((d) => d.setId === setId).length;
      box.appendChild(h('div.eq-set-name', { text: `${set.name} (${count}/${total})` }));
      for (const b of set.bonuses) box.appendChild(h(`div.eq-set-bonus${count >= b.pieces ? '.on' : ''}` as 'div', { text: `(${b.pieces}) ${b.modifiers.map(formatModifier).join(', ')}` }));
    }
    this.secondary.appendChild(box);
  }

  private bindBreakdown(row: HTMLElement, stat: StatLine['stat']): void {
    this.ctx.tooltip.bind(row, () => {
      const line = this.ctx.session().player().stats.find((x) => x.stat === stat);
      if (!line) return null;
      const out: TipLine[] = [
        { kind: 'title', text: statLabel(stat), rarity: 'common' },
        { kind: 'sub', text: `Total: ${formatStatValue(stat, line.value)}` },
        { kind: 'sep' },
      ];
      if (!line.breakdown.length) out.push({ kind: 'hint', text: 'Nada lo modifica todavía' });
      for (const b of line.breakdown) {
        out.push({ kind: 'stat', text: `${formatModValue({ stat, op: b.op, value: b.value })}  ·  ${sourceName(this.ctx, b.source)}`, tone: b.op === 'percent' ? 'rolled' : 'implicit' });
      }
      if (line.breakdown.some((b) => b.op === 'percent')) out.push({ kind: 'hint', text: 'Los % multiplican la suma de los valores planos' });
      const about = PRIMARY_HINT[stat as PrimaryStat];
      if (about) out.push({ kind: 'sep' }, { kind: 'text', text: about });
      return out;
    });
  }
}
