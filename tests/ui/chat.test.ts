import { describe, expect, it } from 'vitest';
import chatJson from '../../data/ui/chat.json';
import { bubbleSeconds, ChatLog, parseChatDef, parseChatInput } from '../../src/ui/chatLog';

const def = parseChatDef(chatJson);

describe('órdenes del chat', () => {
  it('sin barra habla por el canal actual', () => {
    expect(parseChatInput(def, '  hola  ', 'group')).toEqual({ kind: 'say', channel: 'group', text: 'hola' });
  });

  it('una línea vacía no hace nada', () => {
    expect(parseChatInput(def, '   ', 'general').kind).toBe('none');
    expect(parseChatInput(def, '/g', 'general').kind).toBe('none');
  });

  it('los prefijos cambian de canal', () => {
    expect(parseChatInput(def, '/g vamos', 'general')).toEqual({ kind: 'say', channel: 'group', text: 'vamos' });
    expect(parseChatInput(def, '/C vendo mula', 'general')).toEqual({ kind: 'say', channel: 'trade', text: 'vendo mula' });
  });

  it('los emotes valen con /e y a secas', () => {
    expect(parseChatInput(def, '/saludar', 'general')).toMatchObject({ kind: 'emote', emote: { id: 'wave' } });
    expect(parseChatInput(def, '/e bailar', 'general')).toMatchObject({ kind: 'emote', emote: { id: 'dance' } });
  });

  it('avisa de lo que no conoce, y no se puede hablar por Sistema con una orden', () => {
    expect(parseChatInput(def, '/zzz', 'general')).toEqual({ kind: 'unknown', command: 'zzz' });
    expect(parseChatInput(def, '/e nada', 'general').kind).toBe('unknown');
    expect(parseChatInput(def, '/system hola', 'general').kind).toBe('unknown');
    expect(parseChatInput(def, '/ayuda', 'general').kind).toBe('help');
  });

  it('corta lo que supere la longitud máxima', () => {
    const long = parseChatInput(def, 'x'.repeat(def.maxLength + 50), 'general');
    expect(long.kind === 'say' && long.text.length).toBe(def.maxLength);
  });

  it('el texto no se transforma: el marcado queda como texto', () => {
    const c = parseChatInput(def, '<img src=x>', 'general');
    expect(c).toEqual({ kind: 'say', channel: 'general', text: '<img src=x>' });
  });
});

describe('burbuja y registro', () => {
  it('la burbuja dura más con más texto, con mínimo y tope', () => {
    expect(bubbleSeconds(def, 'hola')).toBe(def.bubble.minSeconds);
    expect(bubbleSeconds(def, 'x'.repeat(100))).toBeGreaterThan(def.bubble.minSeconds);
    expect(bubbleSeconds(def, 'x'.repeat(10000))).toBe(def.bubble.maxSeconds);
  });

  it('el registro filtra por canal y olvida lo más viejo', () => {
    const log = new ChatLog(3);
    for (const [i, channel] of ['general', 'system', 'general', 'group'].entries()) log.add({ channel, author: null, text: String(i) });
    expect(log.view(null).map((l) => l.text)).toEqual(['1', '2', '3']);
    expect(log.view('general').map((l) => l.text)).toEqual(['2']);
  });
});
