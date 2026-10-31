// Hoja de personaje: estadísticas con desglose por fuente al pasar el ratón,
// reparto de puntos en las principales y progreso de nivel.
import { PRIMARY_STATS, type PrimaryStat, type StatLine } from '../../rpg/contracts';
import { sourceName, type UiContext } from './context';
import { button, clear, h } from './dom';
import { formatModValue, formatStatValue, pulseText, statLabel, type TipLine } from './format';
import { namedIcon } from './icons';
import { Panel } from './panel';

const PRIMARY_HINT: Record<PrimaryStat, string> = {
  strength: 'Daño físico y de tierra',
  agility: 'Daño de tormenta',
  intellect: 'Daño de fuego y de hielo',
  vitality: 'Vida máxima',
  spirit: 'Regeneración de recurso',
  // Textos de la sesión falsa: la rama A debe confirmar qué aporta cada una.
};

const GROUPS: { title: string; stats: string[] }[] = [
  { title: 'Supervivencia', stats: ['maxHealth', 'healthRegen', 'maxResource', 'resourceRegen'] },
  { title: 'Ataque', stats: ['power', 'critChance', 'critBonus', 'cooldownReduction'] },
  { title: 'Movimiento', stats: ['moveSpeed', 'pickupRadius', 'slowResist'] },
];

export class CharacterPanel extends Panel {
  private readonly head: HTMLElement;
  private readonly primary: HTMLElement;
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
    const allocated = PRIMARY_STATS.reduce((sum, stat) => {
      const line = p.stats.find((x) => x.stat === stat);
      return sum + (line?.breakdown.filter((b) => b.source === 'points' && b.op === 'flat').reduce((n, b) => n + b.value, 0) ?? 0);
    }, 0);
    const reset = button(`Reiniciar puntos${allocated > 0 ? ` (${allocated})` : ''}`, () => {
      this.ctx.confirm({
        title: 'Reiniciar características',
        text: `¿Devolver ${allocated} punto${allocated === 1 ? '' : 's'} a la reserva para repartirlos otra vez?`,
        yes: 'Reiniciar',
        onYes: () => this.report(this.ctx.session().resetStatPoints()),
      });
    }, 'small');
    reset.disabled = allocated <= 0;
    this.primary.appendChild(h('div.points-row', null,
      h(`div.points${pts > 0 ? '.has' : ''}` as 'div', { text: pts > 0 ? `Puntos por repartir: ${pts}` : 'Sin puntos por repartir' }),
      reset));
    for (const stat of PRIMARY_STATS) {
      const line = p.stats.find((x) => x.stat === stat);
      const plus = h('button.plus', { type: 'button', title: `+1 ${statLabel(stat)}`, text: '+', disabled: pts <= 0 });
      plus.addEventListener('click', () => this.report(this.ctx.session().spendStatPoint(stat)));
      const row = h('div.stat-row.primary', null,
        h('span.n', null, statLabel(stat), h('small', { text: PRIMARY_HINT[stat] })),
        h('b', { text: line ? formatStatValue(stat, line.value) : '0' }),
        plus);
      this.bindBreakdown(row, stat);
      this.primary.appendChild(row);
    }

    clear(this.secondary);
    const groups = [
      ...GROUPS,
      { title: 'Daño añadido', stats: p.stats.filter((x) => x.stat.startsWith('damage.') && x.value !== 0).map((x) => x.stat) },
      { title: 'Resistencias', stats: p.stats.filter((x) => x.stat.startsWith('resist.')).map((x) => x.stat) },
    ];
    for (const g of groups) {
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
      return out;
    });
  }
}
