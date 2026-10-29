import { describe, expect, it } from 'vitest';
import keybindingsJson from '../../data/ui/keybindings.json';
import { KeyMap, parseKeybindings, UI_ACTIONS } from '../../src/ui/menus/keybindings';
import { nextStepText, objectiveText, rewardText } from '../../src/ui/menus/questFormat';
import { session } from '../rpg/helpers';

describe('textos de misiones', () => {
  it('recompensa, objetivos y siguiente paso', () => {
    const s = session();
    const c = s.content;
    expect(rewardText({ xp: 40, gold: 12, items: [{ itemId: 'minor_health_potion', quantity: 3 }], learnSpell: 'gust' }, c)).toBe(
      '40 XP · 12 monedas · Poción de vida menor ×3 · Hechizo: Ráfaga',
    );
    expect(rewardText({ xp: 0, gold: 0, items: [], learnSpell: null }, c)).toBe('Nada más que las gracias');
    expect(objectiveText({ text: 'Lobos', current: 2, required: 3, done: false })).toBe('Lobos 2/3');
    expect(objectiveText({ text: 'Habla con Celso', current: 0, required: 1, done: false })).toBe('Habla con Celso');
    s.questLog.accept('q_perch_supper');
    expect(nextStepText(s.trackedQuest()!)).toBeNull();
    for (let i = 0; i < 3; i++) s.character.emit({ type: 'fished', itemId: 'fish_silver_perch' });
    s.character.give('fish_silver_perch', 2);
    expect(nextStepText(s.questLog.view('q_perch_supper')!)).toBe('Entrégasela a Marina Junco');
  });

  it('J abre el diario y lo resuelve la interfaz', () => {
    const keys = new KeyMap(parseKeybindings(keybindingsJson));
    expect(keys.action('KeyJ')).toBe('journal');
    expect(UI_ACTIONS.has('journal')).toBe(true);
  });
});
