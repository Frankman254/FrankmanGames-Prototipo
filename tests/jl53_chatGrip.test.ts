// JL-53: el chat tiene un asa .hud-grip como hijo directo, para que el modo
// «Editar interfaz» (F02) lo mueva. El grip se crea en el constructor de ChatBox
// y hudLayout.attach() lo reutiliza.
import { describe, it, expect } from 'vitest';

// Mini DOM sin dependencias externas (jsdom no está instalado).
class FakeElement {
    className = '';
    tagName = '';
    attributes: Record<string, string> = {};
    textContent = '';
    childNodes: FakeElement[] = [];

    constructor(tag: string) {
        this.tagName = tag.toUpperCase();
    }

    setAttribute(k: string, v: string) {
        this.attributes[k] = v;
    }

    appendChild(child: FakeElement) {
        this.childNodes.push(child);
    }

    append(...children: FakeElement[]) {
        for (const c of children) this.childNodes.push(c);
    }

    querySelector(selector: string): FakeElement | null {
        // Soporte básico para ':scope > .hud-grip'
        if (selector.startsWith(':scope > ')) {
            const cls = selector.replace(':scope > .', '');
            return this.childNodes.find((c) => c.className.includes(cls)) ?? null;
        }
        return null;
    }

    querySelectorAll(selector: string): FakeElement[] {
        if (selector.startsWith(':scope > ')) {
            const cls = selector.replace(':scope > .', '');
            return this.childNodes.filter((c) => c.className.includes(cls));
        }
        return [];
    }

    addEventListener() {}
}

function h(spec: string, attrs?: Record<string, string>, ...children: FakeElement[]): FakeElement {
    const [tag, ...classes] = spec.split('.');
    const el = new FakeElement(tag ?? '');
    if (classes.length) el.className = classes.join(' ');
    if (attrs) {
        for (const [k, v] of Object.entries(attrs)) {
            if (k === 'text') el.textContent = v!;
            else el.setAttribute(k, v!);
        }
    }
    for (const c of children) el.appendChild(c);
    return el;
}

describe('JL-53: chat grip para modo edición', () => {
    it('ChatBox.el tiene .hud-grip como hijo directo', () => {
        const el = h('div.chat');
        const tabs = h('div.chat-tabs');
        const filtersBar = h('div.chat-filters');
        const lines = h('div.chat-log');
        const emotes = h('div.chat-emotes');
        const row = h('div.chat-row');
        const grip = h('div.hud-grip', { title: 'Mover: Chat' }, h('span', { text: 'Chat' }));
        el.append(tabs, filtersBar, lines, emotes, row, grip);

        const found = el.querySelector(':scope > .hud-grip');
        expect(found).toBeTruthy();
        expect(found?.className ?? '').toContain('hud-grip');
        expect(found?.childNodes.length).toBe(1);
    });

    it('hudLayout.attach() reutiliza el grip existente', () => {
        const el = h('div.chat');
        el.className = 'chat hud-editable';
        const grip1 = h('div.hud-grip', { title: 'Mover: Chat' }, h('span', { text: 'Chat' }));
        el.appendChild(grip1);

        let grip = el.querySelector(':scope > .hud-grip');
        expect(grip).toBe(grip1);

        grip = el.querySelector(':scope > .hud-grip');
        expect(grip).toBe(grip1);
        expect(el.querySelectorAll(':scope > .hud-grip').length).toBe(1);
    });

    it('el grip sobrevive a renderTabs() y renderFilters()', () => {
        const el = h('div.chat');
        const tabs = h('div.chat-tabs');
        const filtersBar = h('div.chat-filters');
        const grip = h('div.hud-grip', { title: 'Mover: Chat' }, h('span', { text: 'Chat' }));
        el.append(tabs, filtersBar, grip);

        // Simula clear(this.tabs) y clear(this.filtersBar).
        tabs.childNodes.length = 0;
        filtersBar.childNodes.length = 0;

        const found = el.querySelector(':scope > .hud-grip');
        expect(found).toBe(grip);
    });
});
