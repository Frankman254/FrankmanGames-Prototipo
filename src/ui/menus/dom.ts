// Ayudantes mínimos de DOM para los menús (sin framework).

type Child = Node | string | null | undefined | false;

/** `h('div.panel.dark', { title: 'x' }, hijo1, 'texto')`. Clases con puntos tras la etiqueta. */
export function h<K extends keyof HTMLElementTagNameMap>(
  spec: K | `${K}.${string}`,
  attrs: Record<string, string | number | boolean | undefined> | null = null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const [tag, ...classes] = spec.split('.') as [K, ...string[]];
  const el = document.createElement(tag);
  if (classes.length) el.className = classes.join(' ');
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === false) continue;
      if (k === 'text') el.textContent = String(v);
      else if (k === 'html') el.innerHTML = String(v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function button(label: string, onClick: () => void, cls = ''): HTMLButtonElement {
  const b = h(`button.btn${cls ? '.' + cls.split(' ').join('.') : ''}` as 'button', { type: 'button', text: label });
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return b;
}

/** Opción activable reutilizable (capas, filtros y ajustes compactos). */
export function toggleChoice(
  label: string,
  checked: boolean,
  onChange: (checked: boolean) => void,
  cls = '',
): { el: HTMLLabelElement; input: HTMLInputElement } {
  const input = h('input', { type: 'checkbox' });
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  const classes = `label.choice-toggle${cls ? '.' + cls.trim().split(/\s+/).join('.') : ''}` as 'label';
  return { el: h(classes, null, input, h('span.choice-toggle-label', { text: label })), input };
}
