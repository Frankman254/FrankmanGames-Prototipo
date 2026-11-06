// Ayudantes mínimos de DOM para los menús (sin framework).
import { tr } from '../i18n';

type Child = Node | string | null | undefined | false;

/** F07: texto original (español) de lo traducido al crear, para volver a traducirlo al cambiar de idioma. */
const ORIGINAL = new WeakMap<Node, string>();
const ORIGINAL_ATTR = new WeakMap<Element, Record<string, string>>();

function translatedText(text: string): Text {
  const node = document.createTextNode(tr(text));
  ORIGINAL.set(node, text);
  return node;
}

/**
 * Vuelve a traducir, en el idioma actual, todo lo que `h()` creó dentro de `root`
 * (textos y atributos title/placeholder). Así los paneles ya abiertos cambian de idioma.
 */
export function retranslate(root: Node): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n: Node | null = walker.currentNode; n; n = walker.nextNode()) {
    const text = ORIGINAL.get(n);
    if (text !== undefined) n.textContent = tr(text);
    const attrs = n instanceof Element ? ORIGINAL_ATTR.get(n) : undefined;
    if (attrs) for (const [k, v] of Object.entries(attrs)) (n as Element).setAttribute(k, tr(v));
  }
}

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
      if (k === 'text') el.append(translatedText(String(v)));
      else if (k === 'html') el.innerHTML = String(v);
      else if (k === 'title' || k === 'placeholder') {
        el.setAttribute(k, tr(String(v)));
        const a = ORIGINAL_ATTR.get(el) ?? {};
        a[k] = String(v);
        ORIGINAL_ATTR.set(el, a);
      }
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(typeof c === 'string' ? translatedText(c) : c);
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
  return {
    el: h(classes, null, input, h('span.choice-toggle-mark', { 'aria-hidden': 'true' }), h('span.choice-toggle-label', { text: label })),
    input,
  };
}
