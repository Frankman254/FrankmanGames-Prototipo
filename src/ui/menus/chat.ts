// Chat fijo por canales con burbuja que sigue al personaje. Intro abre la línea
// para escribir; Intro la envía y Esc la cierra. Sin red todavía: lo escrito se ve
// sólo en esta partida. Los avisos de la sesión entran por el canal Sistema.
import { bubbleSeconds, ChatLog, parseChatInput, type ChatDef, type ChatLine } from '../chatLog';
import { button, clear, h } from './dom';

const CHAT_SIZE_KEY = 'frankmangames.chatSize';
const clampChat = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, Math.round(v)));

const ALL = 'all';

export class ChatBox {
  readonly el = h('div.chat');
  private readonly log: ChatLog;
  private readonly tabs = h('div.chat-tabs');
  private readonly lines = h('div.chat-log');
  private readonly input = h('input.chat-input', { type: 'text', placeholder: 'Intro para escribir · /ayuda' }) as HTMLInputElement;
  private readonly emotes = h('div.chat-emotes');
  private readonly emoteWindow = h('div.emote-window');
  private readonly bubble = h('div.chat-bubble');
  private tab = ALL;
  private speakIn: string;
  private bubbleLeft = 0;

  constructor(private readonly def: ChatDef, private readonly author: () => string, bubbleParent: HTMLElement) {
    this.log = new ChatLog(def.maxLines);
    this.speakIn = def.channels.find((c) => !c.readOnly)?.id ?? '';
    this.input.maxLength = def.maxLength;
    this.input.addEventListener('keydown', (e) => {
      // Escribir no debe disparar atajos de juego.
      e.stopPropagation();
      if (e.key === 'Enter') this.submit();
      else if (e.key === 'Escape') this.input.blur();
    });
    this.input.addEventListener('focus', () => this.el.classList.add('active'));
    this.input.addEventListener('blur', () => this.el.classList.remove('active'));
    // Los clics en el chat no deben mover al personaje.
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    for (const em of def.emotes) {
      // En la fila del chat el emote se escribe en el campo: se envía con Intro o Enviar.
      const b = button(em.icon, () => this.insert(em.icon), 'small chat-emote');
      b.title = em.command;
      this.emotes.appendChild(b);
      // En su ventana se representa sobre el personaje, sin burbuja.
      const big = button(em.icon, () => this.emote(em.command), 'emote-play');
      big.title = `/${em.command}`;
      this.emoteWindow.appendChild(big);
    }
    this.emoteWindow.hidden = true;
    const openEmotes = button('☺', () => (this.emoteWindow.hidden = !this.emoteWindow.hidden), 'small chat-emotes-open');
    openEmotes.title = 'Emotes';
    const send = button('Enviar', () => this.submit(), 'small');
    const row = h('div.chat-row', null, openEmotes, this.input, send);
    this.el.append(this.emoteWindow, this.tabs, this.lines, this.emotes, row);
    this.bubble.hidden = true;
    bubbleParent.appendChild(this.bubble);
    this.renderTabs();
    this.keepSize();
  }

  /**
   * El chat cambia de ancho y alto arrastrando su esquina (sin entrar en «Editar interfaz»);
   * el tamaño se guarda en este equipo.
   */
  private keepSize(): void {
    try {
      const saved = JSON.parse(localStorage.getItem(CHAT_SIZE_KEY) ?? 'null') as { w?: unknown; h?: unknown } | null;
      if (saved && typeof saved.w === 'number' && typeof saved.h === 'number') {
        this.el.style.width = `${clampChat(saved.w, 240, 900)}px`;
        this.el.style.height = `${clampChat(saved.h, 120, 700)}px`;
      }
    } catch {
      /* sin almacenamiento: tamaño de siempre */
    }
    if (typeof ResizeObserver === 'undefined') return;
    let timer = 0;
    new ResizeObserver(() => {
      if (!this.el.style.width && !this.el.style.height) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        try {
          localStorage.setItem(CHAT_SIZE_KEY, JSON.stringify({ w: this.el.offsetWidth, h: this.el.offsetHeight }));
        } catch {
          /* sin almacenamiento */
        }
      }, 300);
    }).observe(this.el);
  }

  focus(): void {
    this.input.focus();
  }

  /** Aviso de la sesión. */
  system(text: string): void {
    this.add({ channel: 'system', author: null, text });
  }

  /** Cada fotograma: cuenta atrás de la burbuja. */
  frame(dt: number): void {
    if (this.bubbleLeft <= 0) return;
    this.bubbleLeft -= dt;
    if (this.bubbleLeft <= 0) this.bubble.hidden = true;
  }

  /** Coloca la burbuja sobre la cabeza del personaje (coordenadas de pantalla). */
  anchorBubble(x: number, y: number): void {
    if (this.bubble.hidden) return;
    // La capa de la interfaz lleva zoom; sin descontarlo la burbuja se aleja del personaje.
    const zoom = (this.bubble as unknown as { currentCSSZoom?: number }).currentCSSZoom ?? 1;
    this.bubble.style.left = `${x / zoom}px`;
    this.bubble.style.top = `${y / zoom}px`;
  }

  get bubbleText(): string | null {
    return this.bubble.hidden ? null : this.bubble.textContent;
  }

  /** Escribe en el punto del cursor, sin enviar. */
  private insert(text: string): void {
    const i = this.input;
    const at = i.selectionStart ?? i.value.length;
    const end = i.selectionEnd ?? at;
    if (i.value.length - (end - at) + text.length > this.def.maxLength) return;
    i.value = i.value.slice(0, at) + text + i.value.slice(end);
    i.focus();
    i.setSelectionRange(at + text.length, at + text.length);
  }

  private emote(command: string): void {
    this.run(`/${command}`);
  }

  private submit(): void {
    if (this.input.value.trim() !== '') this.run(this.input.value);
    this.input.value = '';
    this.input.blur();
  }

  private run(line: string): void {
    const cmd = parseChatInput(this.def, line, this.speakIn);
    if (cmd.kind === 'say') {
      this.speakIn = cmd.channel;
      this.add({ channel: cmd.channel, author: this.author(), text: cmd.text });
      this.showBubble(cmd.text, bubbleSeconds(this.def, cmd.text));
    } else if (cmd.kind === 'emote') {
      this.add({ channel: this.speakIn, author: null, text: `${this.author()} ${cmd.emote.action} ${cmd.emote.icon}` });
      this.showBubble(cmd.emote.icon, this.def.bubble.emoteSeconds, true);
    } else if (cmd.kind === 'help') {
      const talk = this.def.channels.filter((c) => c.prefix).map((c) => `/${c.prefix} ${c.label}`).join(' · ');
      this.system(`Canales: ${talk}. Emotes: ${this.def.emotes.map((e) => `/${e.command}`).join(' ')}. Aún no hay red: sólo lo ves tú.`);
    } else if (cmd.kind === 'unknown') {
      this.system(`No conozco /${cmd.command}. Prueba /ayuda`);
    }
  }

  private showBubble(text: string, seconds: number, emoteOnly = false): void {
    this.bubble.classList.toggle('emote-only', emoteOnly);
    this.bubble.textContent = text;
    this.bubble.hidden = false;
    this.bubbleLeft = seconds;
  }

  private add(line: ChatLine): void {
    this.log.add(line);
    if (this.tab === ALL || this.tab === line.channel) this.appendLine(line);
  }

  private appendLine(line: ChatLine): void {
    const color = this.def.channels.find((c) => c.id === line.channel)?.color ?? '';
    const row = h('div.chat-line');
    row.style.color = color;
    row.textContent = line.author ? `${line.author}: ${line.text}` : line.text;
    this.lines.appendChild(row);
    while (this.lines.childElementCount > this.def.maxLines) this.lines.firstElementChild?.remove();
    this.lines.scrollTop = this.lines.scrollHeight;
  }

  private renderTabs(): void {
    clear(this.tabs);
    for (const [id, label] of [[ALL, 'Todo'], ...this.def.channels.map((c) => [c.id, c.label])] as const) {
      const b = button(label, () => {
        this.tab = id;
        const ch = this.def.channels.find((c) => c.id === id);
        if (ch && !ch.readOnly) this.speakIn = ch.id;
        this.renderTabs();
        clear(this.lines);
        for (const l of this.log.view(id === ALL ? null : id)) this.appendLine(l);
      }, 'small chip');
      b.classList.toggle('on', this.tab === id);
      this.tabs.appendChild(b);
    }
  }
}
