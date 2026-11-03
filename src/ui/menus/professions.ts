// Oficios: a la izquierda cada oficio con su nivel; a la derecha lo que se recoge
// o se fabrica con él. Fabricar pide estar junto al taller. «Afinar» abre el
// minijuego opcional: tres golpes con la aguja dentro de la banda; cuanto mejor,
// más cerca del máximo salen las tiradas. Los materiales sólo se gastan al acabar
// y fallar da el resultado normal, así que no se pierde nada por intentarlo.
import type { ItemDef } from '../../rpg/contracts';
import { needleAt, strikeScore, type ProfessionsDef, type RecipeDef } from '../../rpg/professions';
import type { UiContext } from './context';
import { button, h } from './dom';
import { RARITY_COLOR } from './icons';
import { Panel } from './panel';

export interface ProfessionsPanelData {
  def: ProfessionsDef;
  items: Record<string, ItemDef>;
}

interface CraftGame {
  recipe: RecipeDef;
  scores: number[];
  center: number;
  startedAt: number;
  needle: HTMLElement;
  band: HTMLElement;
  progress: HTMLElement;
  frame: number;
}

export class ProfessionsPanel extends Panel {
  private selected: string;
  private game: CraftGame | null = null;

  constructor(ctx: UiContext, onClose: () => void, private readonly data: ProfessionsPanelData) {
    super(ctx, 'Oficios', 'panel-professions', onClose);
    this.selected = Object.keys(data.def.professions)[0] ?? '';
  }

  /** Abre por un oficio concreto (al llegar a su taller). */
  show(professionId: string): void {
    if (this.data.def.professions[professionId]) this.selected = professionId;
    this.open();
    this.render();
  }

  override close(): void {
    this.endGame();
    super.close();
  }

  render(): void {
    if (this.game) return; // el minijuego no se repinta por debajo
    const views = this.ctx.session().professions?.() ?? [];
    const list = h('div.job-list');
    for (const p of views) {
      const pct = p.xpToNext > 0 ? Math.min(100, (p.xp / p.xpToNext) * 100) : 100;
      const fill = h('div.job-xp-fill');
      fill.style.width = `${pct}%`;
      const row = h(
        'button.job-row',
        { type: 'button' },
        h('span.job-name', { text: `${p.icon} ${p.name}` }),
        h('span.job-level', { text: `nv. ${p.level}` }),
        h('div.job-xp', { title: p.xpToNext > 0 ? `${Math.floor(p.xp)} / ${p.xpToNext} de experiencia` : 'Nivel máximo' }, fill),
      );
      row.classList.toggle('on', p.id === this.selected);
      row.addEventListener('click', () => {
        this.selected = p.id;
        this.render();
      });
      list.appendChild(row);
    }
    const detail = h('div.job-detail');
    const job = views.find((p) => p.id === this.selected);
    if (job) {
      detail.appendChild(h('p.hint', { text: job.description }));
      this.nodes(detail, job.level);
      this.recipes(detail, job.level);
    }
    this.body.replaceChildren(h('div.job-columns', null, list, detail));
  }

  /** Recursos del mapa que da este oficio. */
  private nodes(into: HTMLElement, level: number): void {
    const rows = Object.values(this.data.def.nodes).filter((n) => n.profession === this.selected);
    if (rows.length === 0) return;
    into.appendChild(h('h4', { text: 'Recursos del mapa' }));
    for (const n of rows) {
      const row = h('div.job-line', null, h('span', { text: n.name }), h('span.job-need', { text: `da ${this.data.items[n.itemId]?.name ?? n.itemId} · nv. ${n.level}` }));
      row.classList.toggle('locked', level < n.level);
      into.appendChild(row);
    }
    into.appendChild(h('p.hint', { text: 'Haz clic en ellos por el mundo para recogerlos; vuelven pasado un rato.' }));
  }

  private recipes(into: HTMLElement, level: number): void {
    const session = this.ctx.session();
    const rows = Object.values(this.data.def.recipes).filter((r) => r.profession === this.selected).sort((a, b) => a.level - b.level);
    if (rows.length === 0) return;
    const station = this.data.def.stations[rows[0]!.station];
    const near = station ? (session.nearStation?.(station.id) ?? false) : false;
    into.appendChild(h('h4', { text: `Recetas · ${station?.name ?? ''}` }));
    if (!near && station) into.appendChild(h('p.hint', { text: `Ve al ${station.name.toLowerCase()} del pueblo para fabricar.` }));
    const bag = session.inventory();
    const have = (itemId: string): number => bag.slots.reduce((a, s) => a + (s?.itemId === itemId ? s.quantity : 0), 0);
    for (const r of rows) {
      const out = this.data.items[r.output];
      const enough = r.inputs.every((i) => have(i.itemId) >= i.quantity);
      const canCraft = near && enough && level >= r.level;
      const name = h('span.job-recipe-name', { text: out?.name ?? r.output });
      if (out) name.style.color = RARITY_COLOR[out.rarity];
      const needs = h('div.job-inputs');
      for (const i of r.inputs) {
        const chip = h('span.job-input', { text: `${this.data.items[i.itemId]?.name ?? i.itemId} ${have(i.itemId)}/${i.quantity}` });
        chip.classList.toggle('short', have(i.itemId) < i.quantity);
        needs.appendChild(chip);
      }
      const direct = button('Fabricar', () => this.craft(r, 0), 'small');
      const tune = button('Afinar', () => this.startGame(r), 'small');
      direct.disabled = tune.disabled = !canCraft;
      tune.title = 'Minijuego opcional: mejores tiradas si aciertas. Fallar no gasta de más.';
      const row = h('div.job-recipe', null, h('div.job-recipe-head', null, name, h('span.job-need', { text: `nv. ${r.level}` })), needs, h('div.job-actions', null, direct, ...((out?.rolls.length ?? 0) > 0 ? [tune] : [])));
      row.classList.toggle('locked', level < r.level);
      into.appendChild(row);
    }
  }

  private craft(r: RecipeDef, quality: number): void {
    const res = this.ctx.session().craft?.(r.id, quality) ?? { ok: false as const, reason: 'No puedes fabricar aquí' };
    this.report(res);
    if (res.ok) this.ctx.toast(`Fabricado: ${this.data.items[r.output]?.name ?? r.output}${quality > 0 ? ` (calidad ${Math.round(quality * 100)} %)` : ''}`, 'loot');
    this.invalidate();
  }

  private startGame(recipe: RecipeDef): void {
    const needle = h('div.craft-needle');
    const band = h('div.craft-band');
    const progress = h('p.hint');
    const strike = button('¡Golpe!', () => this.strike());
    // Espacio pulsa el botón con el foco; no debe llegar a los atajos de juego.
    strike.addEventListener('keydown', (e) => e.stopPropagation());
    this.game = { recipe, scores: [], center: 0, startedAt: performance.now(), needle, band, progress, frame: 0 };
    this.body.replaceChildren(
      h('div.craft-game', null,
        h('h4', { text: `Afinando: ${this.data.items[recipe.output]?.name ?? recipe.output}` }),
        h('p.hint', { text: 'Golpea cuando la aguja cruce la banda. Clic o Espacio.' }),
        h('div.craft-track', null, band, needle),
        progress,
        h('div.job-actions', null, strike, button('Dejarlo', () => this.endGame()))),
    );
    this.nextRound();
    strike.focus();
    const loop = (): void => {
      const g = this.game;
      if (!g) return;
      g.needle.style.left = `${this.needle(g) * 100}%`;
      g.frame = requestAnimationFrame(loop);
    };
    loop();
  }

  private needle(g: CraftGame): number {
    return needleAt((performance.now() - g.startedAt) / 1000, this.data.def.rules.minigame.needleSpeed);
  }

  /** Coloca la banda de la siguiente ronda. */
  private nextRound(): void {
    const g = this.game!;
    const { rounds, bandHalfWidth } = this.data.def.rules.minigame;
    g.center = bandHalfWidth + Math.random() * (1 - 2 * bandHalfWidth);
    g.band.style.left = `${(g.center - bandHalfWidth) * 100}%`;
    g.band.style.width = `${bandHalfWidth * 200}%`;
    g.progress.textContent = `Golpe ${g.scores.length + 1} de ${rounds}${g.scores.length ? ` · precisión hasta ahora ${Math.round((g.scores.reduce((a, b) => a + b, 0) / g.scores.length) * 100)} %` : ''}`;
  }

  private strike(): void {
    const g = this.game;
    if (!g) return;
    const { rounds, bandHalfWidth } = this.data.def.rules.minigame;
    g.scores.push(strikeScore(this.needle(g), g.center, bandHalfWidth));
    if (g.scores.length < rounds) {
      this.nextRound();
      return;
    }
    const quality = g.scores.reduce((a, b) => a + b, 0) / rounds;
    const recipe = g.recipe;
    this.endGame();
    this.craft(recipe, quality);
  }

  private endGame(): void {
    if (!this.game) return;
    cancelAnimationFrame(this.game.frame);
    this.game = null;
    this.invalidate();
  }
}
