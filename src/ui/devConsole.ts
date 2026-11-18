// Consola oculta del juego (creador, 2026-11-17): reúne en un sitio los errores de la página, los
// avisos de la consola y los mensajes que el propio juego enseña al jugador (toasts, nombre
// rechazado, hechizo bloqueado…). Se abre con F8. Los agentes de QA la leen sin abrirla con
// `window.__consola.text()`: así ven por qué el juego no les deja pasar en vez de esperar a ciegas.

export type ConsoleLevel = 'error' | 'warn' | 'aviso';

export interface ConsoleEntry {
    /** Segundos desde que arrancó la página. */
    t: number;
    level: ConsoleLevel;
    text: string;
}

/** Cuántas entradas se guardan (las más viejas se descartan). */
export const CONSOLE_MAX = 300;

/** Registro puro, sin DOM: se prueba con Vitest. */
export class ConsoleLog {
    readonly entries: ConsoleEntry[] = [];
    private readonly listeners: ((e: ConsoleEntry) => void)[] = [];
    counts: Record<ConsoleLevel, number> = { error: 0, warn: 0, aviso: 0 };

    push(level: ConsoleLevel, text: string, t: number): ConsoleEntry {
        const e: ConsoleEntry = { t, level, text: text.replace(/\s+/g, ' ').trim().slice(0, 500) };
        // Un mismo mensaje repetido seguido (un error por fotograma) se cuenta, no se apila.
        const last = this.entries[this.entries.length - 1];
        if (last && last.level === level && last.text.replace(/ \(×\d+\)$/, '') === e.text) {
            const n = Number(/\(×(\d+)\)$/.exec(last.text)?.[1] ?? 1) + 1;
            last.text = `${e.text} (×${n})`;
            last.t = t;
            this.counts[level]++;
            for (const f of this.listeners) f(last);
            return last;
        }
        this.entries.push(e);
        if (this.entries.length > CONSOLE_MAX) this.entries.shift();
        this.counts[level]++;
        for (const f of this.listeners) f(e);
        return e;
    }

    onEntry(f: (e: ConsoleEntry) => void): void {
        this.listeners.push(f);
    }

    clear(): void {
        this.entries.length = 0;
        this.counts = { error: 0, warn: 0, aviso: 0 };
    }

    /** Las últimas `n` entradas como texto, una por línea: `[mm:ss] NIVEL texto`. */
    text(n = 40, levels?: ConsoleLevel[]): string {
        return this.entries
            .filter((e) => !levels || levels.includes(e.level))
            .slice(-n)
            .map(formatEntry)
            .join('\n');
    }
}

export function formatEntry(e: ConsoleEntry): string {
    const m = Math.floor(e.t / 60);
    const s = Math.floor(e.t % 60);
    return `[${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}] ${e.level.toUpperCase()} ${e.text}`;
}

/** El registro de la página (uno solo). */
export const devLog = new ConsoleLog();

/** Apunta un mensaje que el juego le enseña al jugador (aviso, rechazo, bloqueo). */
export function notice(text: string, level: ConsoleLevel = 'aviso'): void {
    devLog.push(level, text, performance.now() / 1000);
}

/** Panel DOM de la consola: oculto hasta que se pulsa F8. */
export class DevConsolePanel {
    private readonly el: HTMLDivElement;
    private readonly list: HTMLPreElement;
    private readonly head: HTMLDivElement;

    constructor(private readonly log: ConsoleLog) {
        this.el = document.createElement('div');
        this.el.className = 'dev-console';
        this.el.hidden = true;
        this.head = document.createElement('div');
        this.head.className = 'dev-console-head';
        this.list = document.createElement('pre');
        this.list.className = 'dev-console-list';
        this.el.append(this.head, this.list);
        Object.assign(this.el.style, {
            position: 'fixed',
            left: '12px',
            right: '12px',
            bottom: '12px',
            maxHeight: '42vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(8, 8, 12, 0.92)',
            border: '1px solid #5a4a2a',
            borderRadius: '6px',
            color: '#e8e0cc',
            font: '12px/1.45 Consolas, Menlo, monospace',
            zIndex: '100000',
            pointerEvents: 'auto',
        } satisfies Partial<CSSStyleDeclaration>);
        Object.assign(this.head.style, { padding: '6px 10px', borderBottom: '1px solid #3a3020', color: '#f2d98a' });
        Object.assign(this.list.style, { margin: '0', padding: '6px 10px', overflow: 'auto', whiteSpace: 'pre-wrap' });
        document.body.appendChild(this.el);
        log.onEntry(() => {
            if (!this.el.hidden) this.paint();
        });
    }

    get open(): boolean {
        return !this.el.hidden;
    }

    toggle(): void {
        this.el.hidden = !this.el.hidden;
        if (!this.el.hidden) this.paint();
    }

    private paint(): void {
        const c = this.log.counts;
        this.head.textContent = `Consola · ${c.error} errores · ${c.warn} advertencias · ${c.aviso} avisos del juego   [F8] cerrar`;
        this.list.textContent = this.log.text(CONSOLE_MAX) || 'Sin mensajes.';
        this.list.scrollTop = this.list.scrollHeight;
    }
}
