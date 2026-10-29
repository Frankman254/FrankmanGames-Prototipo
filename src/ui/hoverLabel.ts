// Etiqueta junto al cursor con el nombre del botín que hay debajo (color de su
// rareza). Elemento propio con estilos en línea, para no tocar index.html.

export class HoverLabel {
  private readonly el: HTMLDivElement;
  private shown = '';

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'absolute',
      pointerEvents: 'none',
      font: 'bold 13px system-ui, sans-serif',
      padding: '3px 8px',
      borderRadius: '4px',
      background: 'rgba(10,12,16,.78)',
      border: '1px solid rgba(255,255,255,.15)',
      textShadow: '0 0 3px #000',
      whiteSpace: 'nowrap',
      transform: 'translate(-50%, -140%)',
      display: 'none',
      zIndex: '5',
    } satisfies Partial<CSSStyleDeclaration>);
    parent.appendChild(this.el);
  }

  show(text: string, color: string, x: number, y: number): void {
    if (this.shown !== text) {
      this.el.textContent = text;
      this.shown = text;
    }
    this.el.style.color = color;
    this.el.style.borderColor = color;
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    this.el.style.display = 'block';
  }

  hide(): void {
    this.el.style.display = 'none';
  }
}
