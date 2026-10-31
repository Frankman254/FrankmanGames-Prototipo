// Panel del medidor de daño (sólo desarrollo; tecla Fin). Lee `DamageMeter`
// unas cuatro veces por segundo y lo pinta en texto; no toca la partida.
import type { DamageMeter, MeterReport } from '../../sim/damageMeter';
import { BASIC_ATTACK } from '../../sim/damageMeter';

const n0 = (v: number): string => Math.round(v).toLocaleString('es-ES');
const n1 = (v: number): string => v.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const secs = (v: number | null): string => (v === null ? '—' : `${n1(v)} s`);

export class DamageMeterView {
  readonly el: HTMLElement;
  private readonly body: HTMLElement;
  private timer = 0;

  constructor(
    parent: HTMLElement,
    private readonly meter: DamageMeter,
    /** Nombre visible de un hechizo o de un arquetipo. */
    private readonly names: { ability(id: string): string; enemy(id: string): string },
    keyLabel: string,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'dev-meter';
    this.el.hidden = true;
    Object.assign(this.el.style, {
      position: 'absolute', top: '50%', left: '8px', transform: 'translateY(-50%)', width: '320px', maxHeight: '60vh', overflowY: 'auto', zIndex: '40',
      font: '12px/1.4 ui-monospace, monospace', color: '#f1e6cf', background: 'rgba(10,8,6,.82)', border: '1px solid rgba(217,178,106,.5)',
      borderRadius: '6px', padding: '8px 10px', pointerEvents: 'auto', whiteSpace: 'pre',
    } satisfies Partial<CSSStyleDeclaration>);
    const head = document.createElement('div');
    Object.assign(head.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', whiteSpace: 'normal' });
    const title = document.createElement('b');
    title.textContent = `Medidor de daño [${keyLabel}]`;
    const reset = document.createElement('button');
    reset.textContent = 'Reiniciar';
    reset.className = 'btn small';
    reset.addEventListener('click', () => {
      this.meter.reset();
      this.paint();
    });
    head.append(title, reset);
    this.body = document.createElement('div');
    this.el.append(head, this.body);
    parent.appendChild(this.el);
  }

  get visible(): boolean {
    return !this.el.hidden;
  }

  toggle(): void {
    this.el.hidden = !this.el.hidden;
    if (!this.el.hidden) this.paint();
  }

  update(dt: number): void {
    if (this.el.hidden) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.25;
    this.paint();
  }

  private paint(): void {
    this.body.textContent = meterText(this.meter.report(), this.names);
  }
}

/** El informe en líneas de texto (también sirve para copiarlo a la bitácora). */
export function meterText(r: MeterReport, names: { ability(id: string): string; enemy(id: string): string }): string {
  const ab = (id: string): string => (id === BASIC_ATTACK ? 'Ataque básico' : names.ability(id));
  const big = (b: MeterReport['biggestDealt']): string => (b ? `${n0(b.amount)}${b.crit ? ' (crítico)' : ''} · ${ab(b.ability)}` : '—');
  const lines = [
    `Combate     ${n1(r.seconds)} s`,
    `DPS hecho   ${n1(r.dps)}  (últimos 5 s: ${n1(r.recentDps)})`,
    `DPS recib.  ${n1(r.dtps)}`,
    `Curación/s  ${n1(r.hps)}`,
    `Hecho ${n0(r.dealt)} · recibido ${n0(r.taken)} · curado ${n0(r.healed)}`,
    `Golpe máx.  ${big(r.biggestDealt)}`,
    `Recib. máx. ${big(r.biggestTaken)}`,
    '',
    `Muertes ${r.kills} · TTK último ${secs(r.ttk.last)} · media ${secs(r.ttk.mean)}`,
    `            mín ${secs(r.ttk.min)} · máx ${secs(r.ttk.max)}`,
  ];
  for (const k of r.recentKills.slice(0, 4)) lines.push(`  ${names.enemy(k.archetype).slice(0, 22).padEnd(22)} ${secs(k.seconds)}`);
  lines.push('', 'Hechizo                 daño   %  golpes crít  máx');
  const total = Math.max(1, r.dealt);
  for (const l of r.abilities) {
    lines.push(`${ab(l.ability).slice(0, 20).padEnd(20)} ${n0(l.total).padStart(7)} ${String(Math.round((l.total / total) * 100)).padStart(3)} ${String(l.hits).padStart(6)} ${String(l.crits).padStart(4)} ${n0(l.max).padStart(4)}`);
  }
  if (r.abilities.length === 0) lines.push('  (aún sin golpes)');
  return lines.join('\n');
}
