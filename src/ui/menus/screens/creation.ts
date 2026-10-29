// Creación de personaje: elegir clase (descripción, estadísticas iniciales,
// recurso y hechizos de inicio) y escribir el nombre.
import { PRIMARY_STATS, type ClassDef, type ContentDb } from '../../../rpg/contracts';
import { button, clear, h } from '../dom';
import { ELEMENT_LABEL, formatStatValue, spellTooltip, statLabel } from '../format';
import { namedIcon, spellIcon } from '../icons';
import type { Tooltip } from '../tooltip';

export const NAME_MIN = 2;
export const NAME_MAX = 16;

/** Nombre válido: 2–16 letras, espacios, apóstrofo o guion; sin espacios en los extremos. */
export function validateName(raw: string): string | null {
  const n = raw.trim().replace(/\s+/g, ' ');
  if (n.length < NAME_MIN) return `Mínimo ${NAME_MIN} letras`;
  if (n.length > NAME_MAX) return `Máximo ${NAME_MAX} letras`;
  if (!/^[\p{L}][\p{L} '\-]*$/u.test(n)) return 'Sólo letras, espacios, apóstrofo o guion';
  return null;
}

export function creationScreen(
  content: ContentDb,
  tooltip: Tooltip,
  onStart: (classId: string, name: string) => void,
  onBack: () => void,
): HTMLElement {
  const classes = Object.values(content.classes);
  let chosen = classes[0]!.id;
  const cards = h('div.class-cards');
  const detail = h('div.class-detail');
  const input = h('input.name-input', { type: 'text', maxlength: NAME_MAX, placeholder: 'Nombre del personaje', spellcheck: 'false', autocomplete: 'off' });
  const error = h('div.name-error');
  const start = button('Empezar', () => submit(), 'primary');

  const submit = (): void => {
    const err = validateName(input.value);
    error.textContent = err ?? '';
    if (err) {
      input.focus();
      return;
    }
    onStart(chosen, input.value.trim().replace(/\s+/g, ' '));
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
    e.stopPropagation(); // que escribir no dispare atajos
  });
  input.addEventListener('input', () => (error.textContent = ''));

  const select = (id: string): void => {
    chosen = id;
    for (const c of cards.children) (c as HTMLElement).classList.toggle('on', (c as HTMLElement).dataset['id'] === id);
    renderDetail(content.classes[id]!);
  };

  const renderDetail = (c: ClassDef): void => {
    clear(detail);
    const stats = h('div.class-stats');
    for (const s of PRIMARY_STATS) {
      const v = c.baseStats[s] ?? 0;
      stats.appendChild(h('div.cs-row', null, h('span', { text: statLabel(s) }), h('div.cs-bar', null, h('i', { style: `width:${Math.min(100, (v / 16) * 100)}%` })), h('b', { text: String(v) })));
    }
    const res = c.resource;
    const spells = h('div.class-spells');
    for (const id of c.startingSpells) {
      const sp = content.spells[id];
      if (!sp) continue;
      const chip = h('div.spell-chip', null, h('span.ic', { html: spellIcon(sp) }), h('span', { text: sp.name }));
      tooltip.bind(chip, () => spellTooltip(sp, 1, content, res.name));
      spells.appendChild(chip);
    }
    detail.append(
      h('h3', { text: c.name }),
      h('div.class-role', { text: `${c.role} · afinidad ${c.affinity.map((e) => ELEMENT_LABEL[e]).join(' y ')} (+${c.affinityBonus} %)` }),
      h('p', { text: c.description }),
      h('div.class-cols', null,
        h('div', null, h('h4', { text: 'Estadísticas iniciales' }), stats,
          h('div.cs-extra', { text: `Vida ${formatStatValue('maxHealth', c.baseStats.maxHealth ?? 0)} · armadura ${c.baseStats.armor ?? 0}` })),
        h('div', null, h('h4', { text: 'Recurso' }),
          h('div.res-preview', { style: `--c:${res.color}` }, h('div.fill'), h('span', { text: `${res.name} · ${res.max} · +${res.regenPerSecond}/s` })),
          h('h4', { text: 'Hechizos de inicio' }), spells)),
    );
  };

  for (const c of classes) {
    const card = h('button.class-card', { type: 'button', 'data-id': c.id },
      h('div.cc-icon', { html: namedIcon(c.icon, c.resource.color) }),
      h('div.cc-name', { text: c.name }),
      h('div.cc-role', { text: c.role }));
    card.addEventListener('click', () => select(c.id));
    cards.appendChild(card);
  }
  select(chosen);
  setTimeout(() => input.focus(), 0);

  return h('div.screen.creation-screen', null,
    h('div.panel.creation-panel', null,
      h('header.panel-head', null, h('h2', { text: 'Nuevo personaje' })),
      h('div.panel-body', null,
        h('h4', { text: 'Elige clase' }), cards, detail,
        h('div.name-row', null, input, start),
        error,
        h('div.row-end', null, button('Volver', onBack)))),
  );
}
