// Chat local: canales, órdenes con barra y burbuja. Puro: sin DOM. Todavía no hay
// red, así que lo que se escribe sólo se ve aquí; cuando exista, esto es lo que
// se enviará. El texto nunca se interpreta como HTML (la vista usa textContent).
import { Reader } from '../data/validate';

export interface ChatChannel {
  id: string;
  label: string;
  /** Lo que va tras la barra para hablar por él (`/g hola`). null = sin orden. */
  prefix: string | null;
  color: string;
  readOnly: boolean;
}

export interface EmoteDef {
  id: string;
  command: string;
  icon: string;
  action: string;
}

export interface ChatDef {
  maxLines: number;
  maxLength: number;
  bubble: { minSeconds: number; maxSeconds: number; secondsPerChar: number; emoteSeconds: number };
  channels: ChatChannel[];
  emotes: EmoteDef[];
}

export function parseChatDef(raw: unknown): ChatDef {
  const r = new Reader('ui/chat.json');
  const o = r.obj(raw);
  const br = r.child('bubble');
  const bo = br.obj(o['bubble']);
  const minSeconds = br.num(bo, 'minSeconds', { min: 0.5 });
  const list = (key: string): unknown[] => (Array.isArray(o[key]) ? (o[key] as unknown[]) : r.fail(key, 'debe ser una lista'));
  return {
    maxLines: r.num(o, 'maxLines', { int: true, min: 1 }),
    maxLength: r.num(o, 'maxLength', { int: true, min: 1 }),
    bubble: {
      minSeconds,
      maxSeconds: br.num(bo, 'maxSeconds', { min: minSeconds }),
      secondsPerChar: br.num(bo, 'secondsPerChar', { min: 0 }),
      emoteSeconds: br.num(bo, 'emoteSeconds', { min: 0.5 }),
    },
    channels: list('channels').map((c, i) => {
      const cr = r.child(`channels[${i}]`);
      const co = cr.obj(c);
      return { id: cr.str(co, 'id'), label: cr.str(co, 'label'), prefix: co['prefix'] === null ? null : cr.str(co, 'prefix'), color: cr.str(co, 'color'), readOnly: co['readOnly'] === true };
    }),
    emotes: list('emotes').map((e, i) => {
      const er = r.child(`emotes[${i}]`);
      const eo = er.obj(e);
      return { id: er.str(eo, 'id'), command: er.str(eo, 'command'), icon: er.str(eo, 'icon'), action: er.str(eo, 'action') };
    }),
  };
}

export type ChatCommand =
  | { kind: 'none' }
  | { kind: 'say'; channel: string; text: string }
  | { kind: 'emote'; emote: EmoteDef }
  | { kind: 'help' }
  | { kind: 'unknown'; command: string };

/** Lo que significa una línea escrita, hablando en `current` si no dice otra cosa. */
export function parseChatInput(def: ChatDef, input: string, current: string): ChatCommand {
  const line = input.trim().slice(0, def.maxLength);
  if (!line) return { kind: 'none' };
  if (!line.startsWith('/')) return { kind: 'say', channel: current, text: line };
  const space = line.search(/\s/);
  const command = (space < 0 ? line.slice(1) : line.slice(1, space)).toLowerCase();
  const rest = space < 0 ? '' : line.slice(space).trim();
  if (command === 'ayuda') return { kind: 'help' };
  const byCommand = (c: string): EmoteDef | undefined => def.emotes.find((e) => e.command === c);
  if (command === 'e') {
    const emote = byCommand(rest.toLowerCase());
    return emote ? { kind: 'emote', emote } : { kind: 'unknown', command: `e ${rest}`.trim() };
  }
  const emote = byCommand(command);
  if (emote) return { kind: 'emote', emote };
  const channel = def.channels.find((c) => c.prefix === command);
  if (channel) return rest ? { kind: 'say', channel: channel.id, text: rest } : { kind: 'none' };
  return { kind: 'unknown', command };
}

/** Segundos que dura una burbuja: más texto, más tiempo, con tope. */
export function bubbleSeconds(def: ChatDef, text: string): number {
  const b = def.bubble;
  return Math.min(b.maxSeconds, Math.max(b.minSeconds, text.length * b.secondsPerChar));
}

export interface ChatLine {
  channel: string;
  author: string | null;
  text: string;
}

export class ChatLog {
  readonly lines: ChatLine[] = [];

  constructor(private readonly maxLines: number) {}

  add(line: ChatLine): void {
    this.lines.push(line);
    if (this.lines.length > this.maxLines) this.lines.splice(0, this.lines.length - this.maxLines);
  }

  /** Líneas de un canal; null = todos. */
  view(channel: string | null): ChatLine[] {
    return channel === null ? this.lines : this.lines.filter((l) => l.channel === channel);
  }
}
