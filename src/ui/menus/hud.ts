// HUD de partida: marco del personaje (vida, recurso con el color de la clase,
// nivel), XP, barra de 6 hechizos con barrido de enfriamiento, pociones rápidas
// (Q/E), estados con tiempo, retrato de la mascota y accesos a los paneles.
// Se refresca cada fotograma con lo que dan las vistas de la sesión.
import type { HotbarSlotState, ItemInstance, QuickUseKind } from '../../rpg/contracts';
import { itemTip, type UiContext } from './context';
import { h, clear } from './dom';
import { dropAttr } from './drag';
import { spellTooltip, type TipLine } from './format';
import { itemIcon, namedIcon, spellIcon, statusIcon } from './icons';
import type { Action } from './keybindings';

interface HotSlot {
  root: HTMLElement;
  icon: HTMLElement;
  sweep: HTMLElement;
  time: HTMLElement;
  cost: HTMLElement;
  spellId: string | null | undefined;
}

interface Potion {
  kind: QuickUseKind;
  root: HTMLElement;
  icon: HTMLElement;
  count: HTMLElement;
  itemId: string | null | undefined;
}

export class GameHud {
  readonly el: HTMLElement;
  private readonly portrait: HTMLElement;
  private readonly levelBadge: HTMLElement;
  private readonly nameEl: HTMLElement;
  private readonly hpFill: HTMLElement;
  private readonly hpText: HTMLElement;
  private readonly resFill: HTMLElement;
  private readonly resText: HTMLElement;
  private readonly xpFill: HTMLElement;
  private readonly xpText: HTMLElement;
  private readonly statusRow: HTMLElement;
  private readonly petBox: HTMLElement;
  private readonly reason: HTMLElement;
  private readonly slots: HotSlot[] = [];
  private readonly potions: Potion[] = [];
  private readonly pointsDot: HTMLElement;
  private reasonTimer = 0;
  private statusKey = '';
  private petKey = '';
  private classKey = '';

  constructor(
    private readonly ctx: UiContext,
    onButton: (a: Action) => void,
  ) {
    this.el = h('div.game-hud');

    // Marco del personaje (arriba a la izquierda).
    this.portrait = h('div.hud-portrait');
    this.levelBadge = h('div.hud-level');
    this.nameEl = h('div.hud-name');
    const hp = h('div.hud-meter.hp', null, (this.hpFill = h('div.fill')), (this.hpText = h('div.txt')));
    const res = h('div.hud-meter.res', null, (this.resFill = h('div.fill')), (this.resText = h('div.txt')));
    this.statusRow = h('div.hud-statuses');
    this.petBox = h('div.hud-pet');
    this.ctx.tooltip.bind(this.petBox, () => {
      const s = this.ctx.session();
      const d = s.content.pets[s.pet()?.petId ?? ''];
      return d
        ? [
            { kind: 'title', text: d.name, rarity: 'rare' },
            { kind: 'sub', text: { fighter: 'Combate a tu lado', collector: 'Recoge botín', guardian: 'Protege con su aura' }[d.behavior] },
            { kind: 'text', text: d.description },
            { kind: 'hint', text: 'Para retirarla, clic derecho en su amuleto (mochila)' },
          ]
        : null;
    });
    this.el.append(
      h('div.hud-frame.hud-bar-zone', null, h('div.hud-portrait-wrap', null, this.portrait, this.levelBadge), h('div.hud-meters', null, this.nameEl, hp, res)),
      this.statusRow,
      this.petBox,
    );

    // Barra de acción (abajo, centro).
    const bar = h('div.hud-actionbar.hud-bar-zone');
    const row = h('div.hud-slots');
    const keys = this.ctx.keys;
    const qh = this.potion('health', keys.label('potionHealth'));
    row.appendChild(qh.root);
    for (let i = 0; i < 6; i++) row.appendChild(this.hotSlot(i, keys.label(`hotbar${i + 1}` as Action)).root);
    const qr = this.potion('resource', keys.label('potionResource'));
    row.appendChild(qr.root);
    const xp = h('div.hud-xp', null, (this.xpFill = h('div.fill')), (this.xpText = h('div.txt')));
    this.reason = h('div.hud-reason');
    bar.append(this.reason, row, xp);

    // Accesos a los paneles.
    const menu = h('div.hud-menu.hud-bar-zone');
    const btn = (action: Action, label: string, icon: string): HTMLElement => {
      const b = h('button.hud-menu-btn', { type: 'button', title: `${label} (${keys.label(action)})` });
      b.innerHTML = namedIcon(icon, '#d9b26a');
      b.appendChild(h('span.k', { text: keys.label(action) }));
      b.addEventListener('click', () => onButton(action));
      menu.appendChild(b);
      return b;
    };
    btn('inventory', 'Mochila', 'chest');
    const c = btn('character', 'Personaje', 'head');
    this.pointsDot = h('span.dot');
    c.appendChild(this.pointsDot);
    btn('spellbook', 'Libro de hechizos', 'scroll');
    btn('pause', 'Menú', 'coin');
    bar.appendChild(menu);
    this.el.appendChild(bar);
  }

  private hotSlot(index: number, key: string): HotSlot {
    const root = h('div.hot-slot', { 'data-drop': dropAttr({ kind: 'hotbar', index }) });
    const icon = h('div.icon');
    const sweep = h('div.sweep');
    const time = h('div.time');
    const cost = h('div.cost');
    root.append(icon, sweep, time, cost, h('div.key', { text: key }));
    const slot: HotSlot = { root, icon, sweep, time, cost, spellId: undefined };
    this.slots.push(slot);
    root.addEventListener('click', () => this.cast(index));
    this.ctx.drag.draggable(
      root,
      () => (slot.spellId ? { kind: 'hotbar', index, spellId: slot.spellId } : null),
      () => (slot.spellId ? spellIcon(this.ctx.session().content.spells[slot.spellId]!) : ''),
    );
    this.ctx.tooltip.bind(root, () => this.spellTip(slot.spellId ?? null));
    return slot;
  }

  private potion(kind: QuickUseKind, key: string): Potion {
    const root = h(`div.hot-slot.potion.${kind}` as 'div');
    const icon = h('div.icon');
    const count = h('div.count');
    root.append(icon, count, h('div.key', { text: key }));
    const p: Potion = { kind, root, icon, count, itemId: undefined };
    this.potions.push(p);
    root.addEventListener('click', () => this.quickUse(kind));
    this.ctx.tooltip.bind(root, () => {
      const it = this.bestPotion(kind);
      return it ? itemTip(this.ctx, it.uid, false) : [{ kind: 'text', text: kind === 'health' ? 'Sin pociones de vida' : 'Sin tónicos de recurso' }];
    });
    return p;
  }

  private spellTip(spellId: string | null): TipLine[] | null {
    if (!spellId) return [{ kind: 'hint', text: 'Hueco libre: arrastra aquí un hechizo del libro (K)' }];
    const s = this.ctx.session();
    const sp = s.content.spells[spellId];
    if (!sp) return null;
    const rank = s.spellbook().known.find((k) => k.spellId === spellId)?.rank ?? 1;
    return spellTooltip(sp, rank, s.content, s.content.classes[s.player().classId]?.resource.name ?? 'recurso');
  }

  cast(index: number): void {
    const s = this.ctx.session();
    const r = s.castHotbar?.(index);
    if (r && !r.ok) this.flashReason(r.reason);
    const slot = this.slots[index];
    if (slot && r?.ok) {
      slot.root.classList.remove('fired');
      void slot.root.offsetWidth;
      slot.root.classList.add('fired');
    }
  }

  quickUse(kind: QuickUseKind): void {
    const r = this.ctx.session().quickUse?.(kind);
    if (r && !r.ok) this.flashReason(r.reason);
  }

  flashReason(text: string): void {
    this.reason.textContent = text;
    this.reason.classList.add('on');
    this.reasonTimer = 1.4;
  }

  /** El consumible que usaría la tecla rápida (el de menor valor, como la sesión falsa). */
  private bestPotion(kind: QuickUseKind): ItemInstance | null {
    const s = this.ctx.session();
    const want = kind === 'health' ? 'heal' : 'restoreResource';
    let best: ItemInstance | null = null;
    for (const it of s.inventory().slots) {
      const def = it ? s.content.items[it.itemId] : undefined;
      if (!it || def?.use?.kind !== 'effects' || !def.use.effects.some((e) => e.type === want)) continue;
      if (!best || def.value < s.content.items[best.itemId]!.value) best = it;
    }
    return best;
  }

  update(dt: number): void {
    const s = this.ctx.session();
    const p = s.player();
    const cls = s.content.classes[p.classId];
    if (this.classKey !== p.classId && cls) {
      this.classKey = p.classId;
      this.portrait.innerHTML = namedIcon(cls.icon, cls.resource.color);
      this.el.style.setProperty('--res-color', cls.resource.color);
    }
    this.nameEl.textContent = p.name;
    this.levelBadge.textContent = String(p.level);
    this.hpFill.style.width = `${(100 * p.health) / Math.max(1, p.maxHealth)}%`;
    this.hpText.textContent = `${p.health} / ${p.maxHealth}`;
    this.resFill.style.width = `${(100 * p.resource) / Math.max(1, p.maxResource)}%`;
    this.resText.textContent = `${cls?.resource.name ?? 'Recurso'} ${p.resource} / ${p.maxResource}`;
    this.xpFill.style.width = `${(100 * p.xp) / Math.max(1, p.xpToNext)}%`;
    this.xpText.textContent = `Nivel ${p.level} · ${p.xp} / ${p.xpToNext} XP`;
    this.pointsDot.hidden = p.unspentStatPoints <= 0;

    // Barra de hechizos.
    const book = s.spellbook();
    const state: HotbarSlotState[] =
      s.hotbarState?.() ?? book.hotbar.map((spellId) => ({ spellId, cooldownRemaining: 0, cooldownTotal: 0, affordable: true }));
    this.slots.forEach((slot, i) => {
      const st = state[i];
      const id = st?.spellId ?? null;
      if (slot.spellId !== id) {
        slot.spellId = id;
        const sp = id ? s.content.spells[id] : undefined;
        slot.icon.innerHTML = sp ? spellIcon(sp) : '';
        slot.root.classList.toggle('empty', !sp);
        const rank = book.known.find((k) => k.spellId === id)?.rank ?? 1;
        slot.cost.textContent = sp ? String(Math.round(sp.resourceCost * (1 - ((rank - 1) * sp.perRank.costPercent) / 100))) : '';
      }
      const rem = st?.cooldownRemaining ?? 0;
      const tot = st?.cooldownTotal ?? 0;
      if (rem > 0 && tot > 0) {
        const deg = Math.round((360 * rem) / tot);
        slot.sweep.style.background = `conic-gradient(rgba(8,6,3,.78) 0deg ${deg}deg, transparent ${deg}deg 360deg)`;
        slot.time.textContent = rem >= 1 ? String(Math.ceil(rem)) : rem.toFixed(1);
      } else {
        slot.sweep.style.background = '';
        slot.time.textContent = '';
      }
      slot.root.classList.toggle('poor', !!id && st?.affordable === false);
      slot.root.classList.toggle('ready', !!id && rem <= 0 && st?.affordable !== false);
    });

    for (const pot of this.potions) {
      const it = this.bestPotion(pot.kind);
      const id = it?.itemId ?? null;
      if (pot.itemId !== id) {
        pot.itemId = id;
        const def = id ? s.content.items[id] : undefined;
        pot.icon.innerHTML = def ? itemIcon(def) : '';
        pot.root.classList.toggle('empty', !def);
      }
      // Cuenta total de ese tipo (todas las pilas del mismo objeto).
      const total = id ? s.inventory().slots.reduce((a, x) => a + (x?.itemId === id ? x.quantity : 0), 0) : 0;
      pot.count.textContent = total ? String(total) : '';
    }

    this.updateStatuses(p.statuses);
    this.updatePet();

    if (this.reasonTimer > 0) {
      this.reasonTimer -= dt;
      if (this.reasonTimer <= 0) this.reason.classList.remove('on');
    }
  }

  private updateStatuses(list: { statusId: string; remaining: number; stacks: number }[]): void {
    const s = this.ctx.session();
    const key = list.map((x) => `${x.statusId}:${x.stacks}`).join('|');
    if (key !== this.statusKey) {
      this.statusKey = key;
      clear(this.statusRow);
      for (const st of list) {
        const def = s.content.statuses[st.statusId];
        if (!def) continue;
        const el = h(`div.hud-status.${def.kind}` as 'div', { 'data-status': st.statusId });
        el.innerHTML = statusIcon(def);
        el.append(h('div.t'));
        if (st.stacks > 1) el.append(h('div.n', { text: String(st.stacks) }));
        this.ctx.tooltip.bind(el, () => {
          const cur = this.ctx.session().player().statuses.find((x) => x.statusId === st.statusId);
          return [
            { kind: 'title', text: def.name, rarity: def.kind === 'buff' ? 'uncommon' : 'common' },
            { kind: 'sub', text: def.kind === 'buff' ? 'Beneficio' : 'Perjuicio' },
            { kind: 'text', text: def.description },
            { kind: 'hint', text: cur ? `Quedan ${cur.remaining.toFixed(1)} s` : 'Terminado' },
          ];
        });
        this.statusRow.appendChild(el);
      }
    }
    // Tiempo restante en cada icono.
    const els = this.statusRow.children;
    for (let i = 0; i < els.length; i++) {
      const el = els[i] as HTMLElement;
      const st = list.find((x) => x.statusId === el.dataset['status']);
      const t = el.querySelector<HTMLElement>('.t');
      if (st && t) t.textContent = st.remaining >= 10 ? `${Math.ceil(st.remaining)}` : st.remaining.toFixed(1);
    }
  }

  private updatePet(): void {
    const s = this.ctx.session();
    const pet = s.pet();
    const key = pet ? `${pet.petId}:${pet.itemUid}` : '';
    if (key !== this.petKey) {
      this.petKey = key;
      clear(this.petBox);
      this.petBox.hidden = !pet;
      if (pet) {
        const def = s.content.pets[pet.petId];
        const face = h('div.pet-face');
        face.innerHTML = namedIcon(def?.icon ?? 'pet_fox', '#d9b26a');
        this.petBox.append(face, h('div.pet-info', null, h('div.pet-name', { text: def?.name ?? pet.petId }), h('div.hud-meter.pet', null, h('div.fill'))));
      }
    }
    if (pet) {
      const fill = this.petBox.querySelector<HTMLElement>('.fill');
      if (fill) fill.style.width = `${(100 * pet.health) / Math.max(1, pet.maxHealth)}%`;
    }
  }
}
