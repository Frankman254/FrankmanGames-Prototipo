import { describe, expect, it, vi } from 'vitest';
import { emitUiSound, onUiSound, type UiSoundEvent } from '../../src/ui/menus/uiSound';

describe('eventos de sonido de la interfaz', () => {
  it('entrega a cada suscriptor y deja de entregar tras cancelar', () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = onUiSound(a);
    const offB = onUiSound(b);
    const e: UiSoundEvent = { type: 'panel', open: true, shop: false };
    emitUiSound(e);
    expect(a).toHaveBeenCalledWith(e);
    expect(b).toHaveBeenCalledWith(e);
    offA();
    emitUiSound({ type: 'click' });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);
    offB();
  });

  it('cancelarse durante la entrega no rompe el resto de oyentes ni reentra', () => {
    const heard: string[] = [];
    const offSelf = onUiSound(() => {
      heard.push('self');
      offSelf();
    });
    const offOther = onUiSound(() => heard.push('other'));
    emitUiSound({ type: 'click' });
    emitUiSound({ type: 'click' });
    expect(heard).toEqual(['self', 'other', 'other']);
    offOther();
  });
});
