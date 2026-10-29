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
      }
      for (const fn of this.onPress) fn(e);
    });
    canvas.addEventListener('pointermove', (e) => {
      // Con varios botones a la vez sólo llega pointermove: se miran los bits.
      this.middleDown = (e.buttons & 4) !== 0;
      if (this.middleDown) {
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
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', () => {
      this.leftDown = false;
      this.middleDown = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('blur', () => {
      this.leftDown = false;
      this.middleDown = false;
      this.pressed.clear();
    });
    window.addEventListener('keydown', (e) => {
      if (!e.repeat) this.pressed.add(e.code);
    });
  }

  onPointerDown(fn: (e: PointerEvent) => void): void {
    this.onPress.push(fn);
  }

  /** Devuelve true una sola vez por pulsación de la tecla. */
  consumeKey(code: string): boolean {
    return this.pressed.delete(code);
  }

  /** Píxeles arrastrados con la rueda pulsada desde la última llamada. */
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
