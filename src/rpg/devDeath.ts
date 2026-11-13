// Herramientas solo de desarrollo para forzar la muerte y agotar el Pulso.
// No se exportan en producción: solo se usan desde main.ts cuando devTools = true.
import type { Character } from './character';
import type { Energy } from './energy';

/**
 * Fuerza la muerte del jugador: vida a 0 y estado espectral activo.
 * Devuelve true si el personaje estaba vivo y ahora está muerto.
 */
export function forceDeath(character: Character): boolean {
  if (!character.alive) return false;
  character.health = 0;
  character.spectral.die();
  return true;
}

/**
 * Agota el Pulso completamente: lo baja a 0 y activa la penalización.
 * Devuelve true si el Pulso bajó.
 */
export function exhaustPulse(energy: Energy): boolean {
  if (energy.value <= 0) return false;
  energy.value = 0;
  energy.exhausted = true;
  return true;
}

/**
 * Combina ambos: mata al personaje y agota el Pulso.
 * Útil para probar el flujo completo de muerte + agotamiento.
 */
export function forceDeathAndExhaust(character: Character, energy: Energy): boolean {
  const died = forceDeath(character);
  const exhausted = exhaustPulse(energy);
  return died || exhausted;
}
