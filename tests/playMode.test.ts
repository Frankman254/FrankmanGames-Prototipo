import { describe, it, expect } from 'vitest';
import { PlayModeController } from '../src/editor/playMode';

describe('PlayModeController', () => {
  it('arranca en estado edit', () => {
    const ctrl = new PlayModeController({
      onToggleSimulation: () => {},
      onApply: () => {},
      onStateChange: () => {},
    });
    expect(ctrl.state).toBe('edit');
    expect(ctrl.isEditing).toBe(true);
    expect(ctrl.isPlaying).toBe(false);
  });

  it('enterPlayMode() cambia a playing', () => {
    let states: string[] = [];
    let simulationPaused = true;
    const ctrl = new PlayModeController({
      onToggleSimulation: (paused) => { simulationPaused = paused; },
      onApply: () => {},
      onStateChange: (s) => { states.push(s); },
    });

    const result = ctrl.enterPlayMode();
    expect(result).toBe(true);
    expect(ctrl.state).toBe('playing');
    expect(ctrl.isPlaying).toBe(true);
    expect(simulationPaused).toBe(false);
    expect(states).toContain('playing');
  });

  it('stopPlayMode() vuelve a edit', () => {
    let states: string[] = [];
    let simulationPaused = false;
    const ctrl = new PlayModeController({
      onToggleSimulation: (paused) => { simulationPaused = paused; },
      onApply: () => {},
      onStateChange: (s) => { states.push(s); },
    });

    ctrl.enterPlayMode();
    const result = ctrl.stopPlayMode();
    expect(result).toBe(true);
    expect(ctrl.state).toBe('edit');
    expect(ctrl.isEditing).toBe(true);
    expect(simulationPaused).toBe(true);
    expect(states).toContain('stopping');
    expect(states).toContain('edit');
  });

  it('enterPlayMode() falla si ya está playing', () => {
    const ctrl = new PlayModeController({
      onToggleSimulation: () => {},
      onApply: () => {},
      onStateChange: () => {},
    });
    ctrl.enterPlayMode();
    const result = ctrl.enterPlayMode();
    expect(result).toBe(false);
  });

  it('stopPlayMode() falla si no está playing', () => {
    const ctrl = new PlayModeController({
      onToggleSimulation: () => {},
      onApply: () => {},
      onStateChange: () => {},
    });
    const result = ctrl.stopPlayMode();
    expect(result).toBe(false);
    expect(ctrl.state).toBe('edit');
  });

  it('onApply se llama al entrar en Play Mode', () => {
    let applied = false;
    const ctrl = new PlayModeController({
      onToggleSimulation: () => {},
      onApply: () => { applied = true; },
      onStateChange: () => {},
    });
    ctrl.enterPlayMode();
    expect(applied).toBe(true);
  });

  it('getSerializableDungeonDoc() devuelve null sin documento', () => {
    const ctrl = new PlayModeController({
      onToggleSimulation: () => {},
      onApply: () => {},
      onStateChange: () => {},
    });
    expect(ctrl.getSerializableDungeonDoc()).toBeNull();
  });
});
