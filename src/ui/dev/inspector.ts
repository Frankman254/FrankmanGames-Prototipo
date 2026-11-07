// Inspector de escena (herramienta de desarrollo, tecla º): saber qué es cada cosa que se ve y
// apagarla para comprobarlo (creador, 2026-11-07: «al fondo se ve un semicírculo y no sé qué es»).
// - Alt + clic en el mundo: nombre de la malla, de quién cuelga, material, distancia y posición.
// - Capas: cada nodo raíz de la escena con su casilla para ocultarlo; niebla y plano lejano.
// Solo existe en `npm run dev` o con la marca de pruebas; no cambia nada del juego.
import type { AbstractMesh, Node, Scene } from '@babylonjs/core';

export class SceneInspector {
  readonly el = document.createElement('div');
  private readonly info = document.createElement('pre');
  private readonly layers = document.createElement('div');
  private open = false;
  private outlined: AbstractMesh | null = null;

  constructor(private readonly scene: Scene, canvas: HTMLCanvasElement, private readonly toggleKey = 'Backquote') {
    this.el.className = 'dev-inspector';
    this.el.hidden = true;
    Object.assign(this.el.style, {
      position: 'fixed', left: '8px', top: '150px', zIndex: '9000', width: '330px', maxHeight: '70vh', overflow: 'auto',
      padding: '8px', font: '11px/1.35 monospace', color: '#eee', background: 'rgba(10,10,14,.92)', border: '1px solid #556', borderRadius: '6px',
    } satisfies Partial<CSSStyleDeclaration>);
    const title = document.createElement('div');
    title.textContent = 'Inspector de escena (º) · Alt + clic en el mundo';
    title.style.cssText = 'font-weight:700;margin-bottom:6px;color:#ffd777';
    this.info.style.cssText = 'white-space:pre-wrap;margin:0 0 8px;color:#cfe';
    this.info.textContent = 'Alt + clic sobre algo para saber qué es.';
    const tools = document.createElement('div');
    tools.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px';
    tools.append(
      this.check('Niebla', () => scene.fogEnabled, (on) => (scene.fogEnabled = on)),
      this.button('Plano lejano ×2', () => {
        const c = scene.activeCamera;
        if (c) c.maxZ *= 2;
        this.say(`Plano lejano: ${Math.round(scene.activeCamera?.maxZ ?? 0)} m`);
      }),
      this.button('Refrescar capas', () => this.listLayers()),
    );
    this.el.append(title, this.info, tools, this.layers);
    document.body.appendChild(this.el);
    window.addEventListener('keydown', (e) => {
      if (e.code !== this.toggleKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      e.preventDefault();
      this.toggle();
    });
    canvas.addEventListener(
      'pointerdown',
      (e) => {
        if (!this.open || !e.altKey || e.button !== 0) return;
        e.stopImmediatePropagation();
        e.preventDefault();
        this.pick(e.offsetX, e.offsetY);
      },
      true,
    );
  }

  toggle(): void {
    this.open = !this.open;
    this.el.hidden = !this.open;
    if (this.open) this.listLayers();
    else this.unoutline();
  }

  /** Lo que hay bajo el cursor, con su cadena de padres (la raíz dice a qué sistema pertenece). */
  pick(x: number, y: number): void {
    const hit = this.scene.pick(x, y, (m) => m.isEnabled() && m.isVisible);
    const m = hit?.pickedMesh ?? null;
    if (!m) {
      this.say('Nada bajo el cursor (cielo o fondo sin malla).');
      return;
    }
    const chain: string[] = [];
    for (let n: Node | null = m; n; n = n.parent) chain.push(n.name || '(sin nombre)');
    const cam = this.scene.activeCamera;
    const p = hit!.pickedPoint;
    const d = cam && p ? cam.position.subtract(p).length() : NaN;
    this.say(
      [
        `Malla: ${m.name}`,
        `Cuelga de: ${chain.slice(1).join(' ← ') || '(raíz)'}`,
        `Material: ${m.material?.name ?? '—'}`,
        `Distancia: ${Number.isFinite(d) ? d.toFixed(1) + ' m' : '—'}`,
        p ? `Punto: ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}` : '',
        `Vértices: ${m.getTotalVertices()}`,
      ].filter(Boolean).join('\n'),
    );
    this.unoutline();
    m.renderOutline = true;
    m.outlineWidth = 0.08;
    this.outlined = m;
    window.setTimeout(() => this.unoutline(), 2500);
  }

  private unoutline(): void {
    if (this.outlined && !this.outlined.isDisposed()) this.outlined.renderOutline = false;
    this.outlined = null;
  }

  /** Nodos raíz de la escena (cada sistema cuelga los suyos de uno): casilla para ocultarlos. */
  private listLayers(): void {
    this.layers.replaceChildren();
    const roots = this.scene.rootNodes.filter((n) => n.getClassName() !== 'Light' && !n.getClassName().endsWith('Camera'));
    const head = document.createElement('div');
    head.textContent = `Capas (${roots.length} nodos raíz)`;
    head.style.cssText = 'margin:4px 0;color:#ffd777';
    this.layers.appendChild(head);
    for (const n of roots.sort((a, b) => a.name.localeCompare(b.name))) {
      const kids = n.getChildMeshes(false).length + ((n as AbstractMesh).getTotalVertices ? 1 : 0);
      this.layers.appendChild(this.check(`${n.name || '(sin nombre)'} · ${kids}`, () => n.isEnabled(false), (on) => n.setEnabled(on)));
    }
  }

  private say(text: string): void {
    this.info.textContent = text;
  }

  private check(label: string, get: () => boolean, set: (on: boolean) => void): HTMLLabelElement {
    const l = document.createElement('label');
    l.style.cssText = 'display:flex;gap:5px;align-items:center;cursor:pointer';
    const c = document.createElement('input');
    c.type = 'checkbox';
    c.checked = get();
    c.addEventListener('change', () => set(c.checked));
    l.append(c, document.createTextNode(label));
    return l;
  }

  private button(label: string, fn: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.style.cssText = 'font:11px monospace;padding:2px 6px;cursor:pointer';
    b.addEventListener('click', fn);
    return b;
  }
}
