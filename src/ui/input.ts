// Estado de ratón y teclado. Sólo registra; `main.ts` decide qué orden dar.

export class Input {
  /** Botón izquierdo pulsado ahora mismo. */
  leftDown = false;
  x = 0;
  y = 0;
  /** `timeStamp` del último pointerdown izquierdo (misma base que performance.now). */
  lastPressStamp = 0;
  /** Rueda (botón central) pulsada: arrastrar orbita la cámara. */
  middleDown = false;
  /** Clic derecho (dos dedos en el trackpad) pulsado sobre el lienzo: también orbita. */
  rightDown = false;
  /** Lo pone `main.ts`: true mientras se mantiene la tecla de girar la cámara (mover el cursor orbita). */
  hoverOrbit: () => boolean = () => false;
  /** Teclas que siguen pulsadas ahora mismo (códigos de `KeyboardEvent.code`). */
  private readonly held = new Set<string>();
  private dragX = 0;
  private dragY = 0;
  private readonly pressed = new Set<string>();
  private readonly onPress: Array<(e: PointerEvent) => void> = [];

  constructor(canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', (e) => {
      this.x = e.offsetX;
      this.y = e.offsetY;
      if (e.button === 0) {
        this.leftDown = true;
        this.lastPressStamp = e.timeStamp;
        canvas.setPointerCapture(e.pointerId);
      } else if (e.button === 1) {
        this.middleDown = true;
        canvas.setPointerCapture(e.pointerId);
        e.preventDefault(); // sin auto-desplazamiento del navegador
      } else if (e.button === 2) {
        this.rightDown = true;
        canvas.setPointerCapture(e.pointerId);
      }
      for (const fn of this.onPress) fn(e);
    });
    canvas.addEventListener('pointermove', (e) => {
      // Con varios botones a la vez sólo llega pointermove: se miran los bits.
      this.middleDown = (e.buttons & 4) !== 0;
      this.rightDown = (e.buttons & 2) !== 0;
      if (this.middleDown || this.rightDown || this.hoverOrbit()) {
        this.dragX += e.movementX;
        this.dragY += e.movementY;
      }
      this.x = e.offsetX;
      this.y = e.offsetY;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 1) e.preventDefault();
    });
    const release = (e: PointerEvent): void => {
      if (e.button === 0) this.leftDown = false;
      if (e.button === 1) this.middleDown = false;
      if (e.button === 2) this.rightDown = false;
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', () => {
      this.leftDown = false;
      this.middleDown = false;
      this.rightDown = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('blur', () => {
      this.leftDown = false;
      this.middleDown = false;
      this.rightDown = false;
      this.pressed.clear();
      this.held.clear();
    });
    window.addEventListener('keyup', (e) => this.held.delete(e.code));
    window.addEventListener('keydown', (e) => {
      // Las teclas F de depuración no deben disparar acciones del navegador (F3 buscar, F7 cursor…).
      if (/^F\d+$/.test(e.code) && e.code !== 'F11' && e.code !== 'F12') e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.held.add(e.code);
    });
  }

  onPointerDown(fn: (e: PointerEvent) => void): void {
    this.onPress.push(fn);
  }

  /** Devuelve true una sola vez por pulsación de la tecla. */
  consumeKey(code: string): boolean {
    return this.pressed.delete(code);
  }

  /** ¿Alguna de estas teclas sigue pulsada? */
  isHeld(codes: readonly string[]): boolean {
    for (const c of codes) if (this.held.has(c)) return true;
    return false;
  }

  /** Píxeles arrastrados para girar la cámara (rueda, clic derecho o tecla de giro) desde la última llamada. */
  consumeOrbitDrag(): { dx: number; dy: number } {
    const d = { dx: this.dragX, dy: this.dragY };
    this.dragX = 0;
    this.dragY = 0;
    return d;
  }

  endFrame(): void {
    this.pressed.clear();
  }
}
