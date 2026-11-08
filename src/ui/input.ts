// Estado de ratón y teclado. Sólo registra; `main.ts` decide qué orden dar.

/** El botón configurado para moverse sigue el cursor mientras permanezca pulsado. */
export class MoveClickHold {
  constructor(readonly button: 0 | 2) {}

  active(leftDown: boolean, rightDown: boolean): boolean {
    return this.button === 0 ? leftDown : rightDown;
  }
}

export class Input {
  /** Botón izquierdo pulsado ahora mismo. */
  leftDown = false;
  x = 0;
  y = 0;
  /** `timeStamp` del último pointerdown izquierdo (misma base que performance.now). */
  lastPressStamp = 0;
  /** Rueda (botón central) pulsada: arrastrar orbita la cámara. */
  middleDown = false;
  /** Clic derecho pulsado sobre el lienzo. Su función la decide la configuración. */
  rightDown = false;
  /** Lo pone `main.ts`: botón configurado para arrastrar la cámara. */
  orbitButton: () => 0 | 2 = () => 2;
  /** Lo pone `main.ts`: true mientras se mantiene la tecla de girar la cámara (mover el cursor orbita). */
  hoverOrbit: () => boolean = () => false;
  /** Teclas que siguen pulsadas ahora mismo (códigos de `KeyboardEvent.code`). */
  private readonly held = new Set<string>();
  private dragX = 0;
  private dragY = 0;
  private readonly pressed = new Set<string>();
  private readonly onPress: Array<(e: PointerEvent) => void> = [];
  private readonly middleClicks: Array<() => void> = [];
  private middleStart: { x: number; y: number; at: number } | null = null;
  /** Botones que deben soltarse antes de aceptar otro gesto (cambio vuelo/suelo, pausa o foco). */
  private suppressedButtons = 0;
  /**
   * U14: botones pulsados sobre el mundo (el lienzo). Lo que se pulsa sobre una ventana (mochila,
   * hechizos…) no mueve la cámara ni al personaje aunque luego el ratón pase por encima del mundo.
   */
  private canvasButtons = 0;

  /** Clic de rueda sin arrastrar. */
  onMiddleClick(fn: () => void): void {
    this.middleClicks.push(fn);
  }

  constructor(canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', (e) => {
      const bit = e.button === 0 ? 1 : e.button === 1 ? 4 : e.button === 2 ? 2 : 0;
      if ((this.suppressedButtons & bit) !== 0) return;
      this.canvasButtons |= bit;
      this.x = e.offsetX;
      this.y = e.offsetY;
      if (e.button === 0) {
        this.leftDown = true;
        this.lastPressStamp = e.timeStamp;
        canvas.setPointerCapture(e.pointerId);
      } else if (e.button === 1) {
        this.middleDown = true;
        this.middleStart = { x: e.clientX, y: e.clientY, at: e.timeStamp };
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
      this.suppressedButtons &= e.buttons;
      this.canvasButtons &= e.buttons;
      const live = e.buttons & this.canvasButtons & ~this.suppressedButtons;
      this.leftDown = (live & 1) !== 0;
      this.middleDown = (live & 4) !== 0;
      this.rightDown = (live & 2) !== 0;
      const orbitDown = this.orbitButton() === 0 ? this.leftDown : this.rightDown;
      if (this.middleDown || orbitDown || this.hoverOrbit()) {
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
      const bit = e.button === 0 ? 1 : e.button === 1 ? 4 : e.button === 2 ? 2 : 0;
      this.suppressedButtons &= ~bit;
      if (e.button === 0) this.leftDown = false;
      if (e.button === 1) {
        this.middleDown = false;
        // Pulsar sin arrastrar es un clic; arrastrar sigue girando la cámara.
        const m = this.middleStart;
        this.middleStart = null;
        if (m && e.timeStamp - m.at < 350 && Math.hypot(e.clientX - m.x, e.clientY - m.y) < 5) for (const fn of this.middleClicks) fn();
      }
      if (e.button === 2) this.rightDown = false;
    };
    canvas.addEventListener('pointerup', release);
    // Soltar fuera del lienzo (sobre una ventana) también cierra el gesto empezado en el mundo.
    window.addEventListener('pointerup', (e) => {
      this.canvasButtons &= ~(e.button === 0 ? 1 : e.button === 1 ? 4 : e.button === 2 ? 2 : 0);
    });
    canvas.addEventListener('pointercancel', () => {
      this.cancelPointerGestures();
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('blur', () => {
      this.cancelPointerGestures();
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

  /** Corta un gesto sin permitir que un `pointermove` tardío lo reactive antes de soltar el botón. */
  cancelPointerGestures(): void {
    if (this.leftDown) this.suppressedButtons |= 1;
    if (this.rightDown) this.suppressedButtons |= 2;
    if (this.middleDown) this.suppressedButtons |= 4;
    this.leftDown = false;
    this.middleDown = false;
    this.rightDown = false;
    this.middleStart = null;
    this.dragX = 0;
    this.dragY = 0;
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
