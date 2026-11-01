import type { Vec2 } from './vec2';
import type { LabShape, PlacedLabShape } from './labShapes';
import { labShapeHitsCircle } from './labShapes';

export interface FieldSpec {
  shape: LabShape;
  duration: number;
  pulseEvery: number;
}

export interface FieldState {
  spec: FieldSpec;
  origin: Vec2;
  dir: number;
  end?: Vec2;
  age: number;
  nextPulse: number;
}

export const createField = (spec: FieldSpec, origin: Vec2, dir = 0, end?: Vec2): FieldState => ({ spec, origin: { ...origin }, dir, end, age: 0, nextPulse: 0 });

/** Avanza un campo y devuelve cuántos pulsos debe resolver este tick. */
export function advanceField(field: FieldState, dt: number): number {
  if (dt < 0 || field.age >= field.spec.duration) return 0;
  const before = field.age;
  field.age = Math.min(field.spec.duration, field.age + dt);
  let pulses = 0;
  while (field.nextPulse <= field.age + 1e-9) {
    if (field.nextPulse >= before - 1e-9) pulses++;
    field.nextPulse += Math.max(0.01, field.spec.pulseEvery);
  }
  return pulses;
}

export const activeField = (field: FieldState): boolean => field.age < field.spec.duration;

export function fieldHits(field: FieldState, point: Vec2, radius = 0): boolean {
  const placed: PlacedLabShape = { def: field.spec.shape, origin: field.origin, dir: field.dir, elapsed: field.age };
  if (field.end) placed.end = field.end;
  return labShapeHitsCircle(placed, point, radius);
}

