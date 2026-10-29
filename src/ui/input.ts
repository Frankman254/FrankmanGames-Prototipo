// Estado de ratón y teclado. Sólo registra; `main.ts` decide qué orden dar.

export class Input {
  /** Botón izquierdo pulsado ahora mismo. */
  leftDown = false;
  x = 0;
  y = 0;
  /** `timeStamp` del último pointerdown izquierdo (misma base que performance.now). */
  lastPressStamp = 0;
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
      }
      for (const fn of this.onPress) fn(e);
    });
    canvas.addEventListener('pointermove', (e) => {
      this.x = e.offsetX;
      this.y = e.offsetY;
    });
    const release = (e: PointerEvent): void => {
      if (e.button === 0) this.leftDown = false;
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', () => (this.leftDown = false));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('blur', () => {
      this.leftDown = false;
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

  endFrame(): void {
    this.pressed.clear();
  }
}
