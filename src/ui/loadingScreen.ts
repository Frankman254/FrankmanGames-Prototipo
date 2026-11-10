// Pantalla de carga: tapa el juego mientras se construye un sitio nuevo
// (piso de la cripta, partida cargada, viaje por Piedra Pintada) y hasta que
// los modelos terminan de llegar. Se pinta antes del trabajo pesado (dos
// fotogramas) para que se vea aunque el hilo quede congelado un momento.
import './styles/carga.css';
import { UI_LAYER_Z } from './menus/windows';

export interface LoadingText {
  /** Línea pequeña de arriba («Bajando a», «Viajando a», «Cargando partida»). */
  kicker: string;
  /** Destino, en grande. */
  title: string;
  /** Detalle opcional (franja de nivel, provincia). */
  sub?: string;
}

export interface LoadingDeps {
  /** Modelos que aún se están cargando. */
  busy(): number;
  /** Se resuelve cuando la escena tiene sombreadores y texturas listos. */
  ready?(): Promise<unknown>;
  /** Detiene la simulación mientras la pantalla tapa el juego. */
  pause(on: boolean): void;
}

// Consejos sobre lo que ya hace el juego (nada de promesas de contenido).
const TIPS = [
  'Las Piedras Pintadas recuerdan dónde despiertas al caer.',
  'Mantén pulsado el botón de andar y el personaje sigue al cursor.',
  'Los monstruos cerca de tu nivel dan más experiencia; los muy débiles, casi nada.',
  'Con lluvia el fuego pega menos; con sol fuerte, más.',
  'En Características puedes escribir cuántos puntos gasta cada «+», o gastarlos todos con «Todo».',
  'Cuanto más hondo bajas en la cripta, mejores son sus cofres.',
  'En forma espectral no se puede viajar: busca un Alzador.',
  'Las puertas cerradas de la cripta se abren con un clic al llegar a ellas.',
  'Los objetos que no caben en la mochila pueden esperar en el banco de El Cruce.',
];

const nextFrame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()));
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Tiempo mínimo a la vista, para que no parpadee en cargas instantáneas. */
const MIN_MS = 650;
/** Si algo no termina de cargar, la pantalla se quita igual a los 15 s. */
const MAX_WAIT_MS = 15000;
const FADE_MS = 280;

export class LoadingScreen {
  private root: HTMLElement | null = null;
  private kicker!: HTMLElement;
  private title!: HTMLElement;
  private sub!: HTMLElement;
  private bar!: HTMLElement;
  private status!: HTMLElement;
  private tip!: HTMLElement;
  private active = false;
  private tipIndex = Math.floor(Math.random() * TIPS.length);

  constructor(private readonly deps: LoadingDeps) {}

  /** La pantalla está puesta (el juego no debe aceptar órdenes). */
  get showing(): boolean {
    return this.active;
  }

  /**
   * Muestra la pantalla, hace `work` (síncrono, el que congela) y espera a que
   * los modelos y la escena estén listos antes de quitarla.
   */
  async run(text: LoadingText, work: () => void): Promise<void> {
    if (this.active) {
      // Ya hay una carga delante: se suma a ella.
      this.label(text);
      work();
      return;
    }
    this.active = true;
    this.deps.pause(true);
    const started = performance.now();
    try {
      this.show(text);
      this.progress(0.12, 'Preparando el lugar…');
      await nextFrame();
      await nextFrame();
      try {
        work();
      } catch (err) {
        console.error('[carga]', err);
      }
      this.progress(0.5, 'Cargando modelos…');
      await nextFrame();
      let peak = 1;
      let calm = 0;
      const limit = performance.now() + MAX_WAIT_MS;
      while (performance.now() < limit) {
        const n = this.deps.busy();
        peak = Math.max(peak, n);
        this.progress(0.5 + 0.38 * (1 - n / peak), n > 0 ? `Cargando modelos (${n})…` : 'Preparando la escena…');
        calm = n === 0 ? calm + 1 : 0;
        if (calm >= 3) break;
        await nextFrame();
      }
      if (this.deps.ready) await Promise.race([this.deps.ready().catch(() => undefined), wait(5000)]);
      this.progress(1, 'Listo');
      const left = MIN_MS - (performance.now() - started);
      if (left > 0) await wait(left);
    } finally {
      this.deps.pause(false);
      await this.hide();
      this.active = false;
    }
  }

  private build(): HTMLElement {
    const el = (cls: string, parent: HTMLElement, tag = 'div'): HTMLElement => {
      const e = document.createElement(tag);
      e.className = cls;
      parent.appendChild(e);
      return e;
    };
    const root = document.createElement('div');
    root.className = 'carga';
    root.style.zIndex = String(UI_LAYER_Z.auxiliary + 5);
    root.setAttribute('role', 'status');
    root.setAttribute('aria-live', 'polite');
    el('carga-fondo', root);
    el('carga-cenefa arriba', root);
    el('carga-cenefa abajo', root);
    const card = el('carga-tarjeta', root);
    const emblem = el('carga-emblema', card);
    for (let i = 0; i < 4; i++) el('carga-capa', emblem);
    this.kicker = el('carga-kicker', card);
    this.title = el('carga-titulo', card);
    this.sub = el('carga-sub', card);
    const track = el('carga-barra', card);
    this.bar = el('carga-relleno', track);
    this.status = el('carga-estado', card);
    this.tip = el('carga-consejo', root);
    document.body.appendChild(root);
    return root;
  }

  private show(text: LoadingText): void {
    this.root ??= this.build();
    this.label(text);
    this.tipIndex = (this.tipIndex + 1) % TIPS.length;
    this.tip.textContent = TIPS[this.tipIndex]!;
    this.root.classList.remove('fuera');
    this.root.hidden = false;
  }

  private label(text: LoadingText): void {
    if (!this.root) return;
    this.kicker.textContent = text.kicker;
    this.title.textContent = text.title;
    this.sub.textContent = text.sub ?? '';
    this.sub.hidden = !text.sub;
  }

  private progress(f: number, status: string): void {
    this.bar.style.width = `${Math.round(Math.max(0, Math.min(1, f)) * 100)}%`;
    this.status.textContent = status;
  }

  private async hide(): Promise<void> {
    if (!this.root) return;
    this.root.classList.add('fuera');
    await wait(FADE_MS);
    this.root.hidden = true;
  }
}
