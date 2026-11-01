/** Alpha exponencial independiente de la frecuencia de render. */
export function dampingAlpha(rate: number, dt: number): number {
  if (!(dt > 0) || !(rate > 0)) return 0;
  return 1 - Math.exp(-rate * dt);
}

export function damp(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * dampingAlpha(rate, dt);
}

export function wrapDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

export function shortestAngleDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

export function dampAngle(current: number, target: number, rate: number, dt: number): number {
  return wrapDegrees(current + shortestAngleDelta(current, target) * dampingAlpha(rate, dt));
}

export function moveAngleTowards(current: number, target: number, maxDelta: number): number {
  const delta = shortestAngleDelta(current, target);
  return wrapDegrees(current + Math.sign(delta) * Math.min(Math.abs(delta), Math.max(0, maxDelta)));
}
