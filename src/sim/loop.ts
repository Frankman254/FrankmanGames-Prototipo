// Bucle de simulación a paso fijo con acumulador. El render lee `alpha` para
// interpolar entre el estado anterior y el actual.

export interface StepResult {
  /** Ticks de simulación que hay que ejecutar este fotograma. */
  steps: number;
  /** Fracción del siguiente tick ya transcurrida, en [0, 1). */
  alpha: number;
  /** Tiempo descartado porque el fotograma excedió `maxStepsPerFrame`. */
  droppedSeconds: number;
}

export class FixedStepClock {
  readonly dt: number;
  private accumulator = 0;

  constructor(readonly hz: number, readonly maxStepsPerFrame = 8) {
    this.dt = 1 / hz;
  }

  advance(frameSeconds: number): StepResult {
    this.accumulator += Math.max(0, frameSeconds);
    let steps = Math.floor(this.accumulator / this.dt);
    let droppedSeconds = 0;
    if (steps > this.maxStepsPerFrame) {
      // Espiral de la muerte: tras un parón largo no intentamos ponernos al día.
      droppedSeconds = (steps - this.maxStepsPerFrame) * this.dt;
      steps = this.maxStepsPerFrame;
    }
    this.accumulator -= (steps * this.dt) + droppedSeconds;
    return { steps, alpha: this.accumulator / this.dt, droppedSeconds };
  }

  reset(): void {
    this.accumulator = 0;
  }
}
