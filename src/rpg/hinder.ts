// Controles en tiempo real del combate táctico (el equivalente a perder
// movimiento o el turno): agotamiento, embotamiento y desorientación. Cortos,
// con rendimientos decrecientes por familia y acortados por `slowResist`.
// Funciones puras: el mundo les pasa el registro del objetivo y la hora.
import type { HinderFamily, StatusDef } from './contracts';
import type { TacticsRules } from './content';
import type { StatusSet } from './status';

/** Última aplicación de cada familia sobre un actor. */
export type HinderLog = Map<HinderFamily, { count: number; last: number }>;

/**
 * Duración efectiva de un control: `base` × factor de rendimientos
 * decrecientes × (1 − slowResist %, con tope). Anota la aplicación en `log`
 * aunque salga 0: la ventana cuenta desde el último intento, así que encadenar
 * el mismo control alarga la inmunidad. Devuelve 0 si el objetivo es inmune por ahora.
 */
export function hinderDuration(
  base: number,
  family: HinderFamily,
  now: number,
  log: HinderLog,
  slowResist: number,
  rules: TacticsRules['hinder'],
): number {
  const prev = log.get(family);
  const count = prev && now - prev.last <= rules.window ? prev.count : 0;
  const f = rules.factors[Math.min(count, rules.factors.length - 1)]!;
  log.set(family, { count: count + 1, last: now });
  const resist = Math.min(Math.max(0, slowResist), rules.slowResistCap) / 100;
  return base * f * (1 - resist);
}

/** Fracción en que los controles activos frenan los enfriamientos (0 = nada), con tope. */
export function cooldownSlow(statuses: StatusSet, cap: number): number {
  let slow = 0;
  for (const s of statuses.list) slow += (s.def.hinder?.cooldownSlow ?? 0) * s.stacks;
  return Math.min(cap, slow);
}

/** Primer embotamiento activo (el próximo lanzamiento tarda más o falla), o undefined. */
export function dazeOf(statuses: StatusSet): StatusDef | undefined {
  return statuses.list.find((s) => s.def.hinder?.family === 'daze')?.def;
}

/** ¿Está desorientado (sin hechizos de desplazamiento)? */
export function isDisoriented(statuses: StatusSet): boolean {
  return statuses.list.some((s) => s.def.hinder?.family === 'disorient');
}
