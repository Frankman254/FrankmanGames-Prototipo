// Eventos de sonido que declara la interfaz. El DOM se traduce aquí, en la capa
// que lo posee (fábrica `h()` y base `Panel`), y el audio se suscribe sin espiar
// etiquetas, clases ni atributos ajenos.
export type UiSoundEvent =
  | { type: 'click' }
  | { type: 'panel'; open: boolean; shop: boolean };

type Listener = (e: UiSoundEvent) => void;

const listeners = new Set<Listener>();

/** Suscribe un oyente; devuelve la función para cancelar la suscripción. */
export function onUiSound(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function emitUiSound(e: UiSoundEvent): void {
  for (const fn of [...listeners]) fn(e);
}
