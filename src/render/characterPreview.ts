// UI-06: el personaje en 3D dentro de la mochila, con lo que lleva puesto, respirando y con
// algún gesto de vez en cuando; se gira arrastrando. Lienzo y motor propios (pequeños) para no
// tocar la escena del mundo: sólo dibuja mientras la mochila está abierta y a 30 FPS como mucho.
// El aspecto sale de `playerLookSpec`, el mismo que usa la vista del mundo. La creación de
// personaje usa la misma vista con `creationLookSpec` (clase, sexo y aspecto elegidos).
import {
    ArcRotateCamera,
    Color3,
    Color4,
    DirectionalLight,
    Engine,
    HemisphericLight,
    Scene,
    Vector3,
} from '@babylonjs/core';
import { disposeWhenSettled } from './disposeWhenSettled';
import { AssetCache } from './assetCache';
import { createCharacter, type CharacterModel } from './characters/characterModel';
import type { PlayerChars, PlayerLookSpec } from './characters/playerLook';

const FRAME_MS = 1000 / 30;
/** Cada cuánto hace un gesto (segundos, con algo de azar). */
const GESTURE_EVERY = 7;
const GESTURES = ['cast', 'attack'] as const;
/** De frente, algo girado para que se vea el volumen. */
const FRONT_ALPHA = 0.35;
/** Segundos sin tocarlo tras los que vuelve poco a poco al frente. */
const RETURN_AFTER = 4;

export class CharacterPreview {
    readonly canvas: HTMLCanvasElement;
    get element(): HTMLElement {
        return this.canvas;
    }
    private readonly engine: Engine;
    private readonly scene: Scene;
    private readonly camera: ArcRotateCamera;
    private readonly cache: AssetCache;
    private model: CharacterModel | null = null;
    private key = '';
    private running = false;
    private last = 0;
    private acc = 0;
    private nextGesture = GESTURE_EVERY;
    private gestureIx = 0;
    private dragging = false;
    private sinceDrag = RETURN_AFTER;
    /** Encuadre: el cuerpo entero o la cabeza (creación: pestañas de cara y pelo). */
    private focusPart: 'body' | 'face' = 'body';
    private modelHeight = 1.9;
    /** Cuadros dibujados desde que se abrió (para medir). */
    frames = 0;
    /** La que está dibujando ahora (para las pruebas en Electron). */
    static active: CharacterPreview | null = null;

    constructor(
        private readonly chars: PlayerChars,
        /** Qué personaje enseñar (null: ninguno todavía). */
        private readonly spec: () => PlayerLookSpec | null,
    ) {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'doll-3d';
        this.canvas.setAttribute('aria-label', 'Tu personaje (arrastra para girarlo)');
        this.engine = new Engine(this.canvas, true, { alpha: true, premultipliedAlpha: false, stencil: false }, true);
        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(0, 0, 0, 0);
        // Sin picking: el giro lo lleva `bindDrag`. Además así el lienzo no se vuelve enfocable
        // (Babylon le pone `tabIndex` y salía un marco de foco dorado al pincharlo).
        this.scene.detachControl();
        this.canvas.removeAttribute('tabindex');
        this.cache = new AssetCache(this.scene, chars.assets);
        // +X local del modelo = hacia delante; alfa 0 pone la cámara delante de él.
        this.camera = new ArcRotateCamera('preview', FRONT_ALPHA, 1.42, 4.6, new Vector3(0, 0.95, 0), this.scene);
        this.camera.lowerBetaLimit = 1.0;
        this.camera.upperBetaLimit = 1.7;
        this.camera.fov = 0.6;
        const sky = new HemisphericLight('previewSky', new Vector3(0.1, 1, 0.2), this.scene);
        sky.intensity = 0.85;
        sky.groundColor = new Color3(0.32, 0.28, 0.26);
        const key = new DirectionalLight('previewKey', new Vector3(-0.6, -0.7, -0.35), this.scene);
        key.intensity = 1.05;
        key.diffuse = new Color3(1, 0.94, 0.86);
        const rim = new DirectionalLight('previewRim', new Vector3(0.5, -0.2, 0.8), this.scene);
        rim.intensity = 0.45;
        rim.diffuse = new Color3(0.75, 0.82, 1);
        this.bindDrag();
    }

    /** Arrastrar gira el personaje (sólo en horizontal); doble clic vuelve al frente. */
    private bindDrag(): void {
        let lastX = 0;
        this.canvas.addEventListener('pointerdown', (e) => {
            this.dragging = true;
            lastX = e.clientX;
            this.canvas.setPointerCapture(e.pointerId);
        });
        this.canvas.addEventListener('pointermove', (e) => {
            if (!this.dragging) return;
            this.camera.alpha -= (e.clientX - lastX) * 0.012;
            lastX = e.clientX;
        });
        const end = (e: PointerEvent): void => {
            this.dragging = false;
            if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
        };
        this.canvas.addEventListener('pointerup', end);
        this.canvas.addEventListener('pointercancel', end);
        this.canvas.addEventListener('dblclick', () => (this.camera.alpha = FRONT_ALPHA));
    }

    /** Gira el personaje (radianes; positivo, hacia la derecha) como si se arrastrara. */
    turn(rad: number): void {
        this.camera.alpha -= rad;
        this.sinceDrag = 0;
    }

    /** Rehace el modelo si cambió lo que lleva puesto (o la clase, el sexo, la apariencia). */
    refresh(): void {
        const spec = this.spec();
        if (!spec || spec.key === this.key) return;
        this.key = spec.key;
        this.model?.dispose();
        const m = createCharacter(
            this.scene,
            spec.assetId,
            'player',
            spec.entry,
            this.chars.animation,
            this.cache,
            spec.palette,
            spec.look,
            spec.colors,
        );
        this.model = m;
        m.play('idle');
        const frame = (): void => {
            if (this.model !== m) return;
            // Encuadre según la altura de referencia (sin la altura elegida): así un personaje
            // alto llena más el marco y uno bajo menos. Con la altura ya escalada el encuadre la
            // anulaba y no se notaba (CLA-CR1).
            const sy = spec.look?.bodyScale?.[0] ?? 1;
            this.modelHeight = Math.max(1.2, (m.height || 1.9) / sy);
            const [y, r] = this.framing();
            this.camera.target.set(0, y, 0);
            this.camera.radius = r;
        };
        frame();
        if (m.ready) void m.ready.then(frame);
    }

    /** Altura del objetivo y distancia de la cámara para el encuadre actual. */
    private framing(): [number, number] {
        const hgt = this.modelHeight;
        return this.focusPart === 'face' ? [hgt * 0.84, hgt * 1.05] : [hgt * 0.5, hgt * 2.2];
    }

    /** Acerca la cámara a la cabeza o la vuelve al cuerpo entero (con transición). */
    focus(part: 'body' | 'face'): void {
        this.focusPart = part;
    }

    start(): void {
        if (this.running) return;
        this.running = true;
        CharacterPreview.active = this;
        this.frames = 0;
        this.last = performance.now();
        this.acc = 0;
        this.refresh();
        this.engine.runRenderLoop(() => this.tick());
    }

    stop(): void {
        if (!this.running) return;
        this.running = false;
        if (CharacterPreview.active === this) CharacterPreview.active = null;
        this.engine.stopRenderLoop();
    }

    private tick(): void {
        const now = performance.now();
        this.acc += now - this.last;
        this.last = now;
        // El lienzo cambia de tamaño con la ventana; sin esto se vería borroso o estirado.
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        if (w === 0 || h === 0) return;
        if (this.acc < FRAME_MS) return;
        const dt = Math.min(this.acc, 100) / 1000;
        this.acc = 0;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cw = Math.round(w * dpr);
        const chh = Math.round(h * dpr);
        if (this.canvas.width !== cw || this.canvas.height !== chh) {
            this.engine.setSize(cw, chh);
        }
        // Tras girarlo a mano, vuelve solo al frente (por el lado más corto).
        if (this.dragging) this.sinceDrag = 0;
        else if ((this.sinceDrag += dt) > RETURN_AFTER) {
            const d = Math.atan2(Math.sin(FRONT_ALPHA - this.camera.alpha), Math.cos(FRONT_ALPHA - this.camera.alpha));
            this.camera.alpha += d * Math.min(1, dt * 2.5);
        }
        // Transición suave hacia el encuadre pedido.
        const [ty, tr] = this.framing();
        const k = Math.min(1, dt * 6);
        this.camera.target.y += (ty - this.camera.target.y) * k;
        this.camera.radius += (tr - this.camera.radius) * k;
        const m = this.model;
        if (m) {
            this.nextGesture -= dt;
            if (m.state !== 'idle' && m.finished) m.play('idle');
            if (this.nextGesture <= 0 && m.state === 'idle') {
                m.play(GESTURES[this.gestureIx++ % GESTURES.length]!);
                this.nextGesture = GESTURE_EVERY + Math.random() * 3;
            }
            m.update(dt, 0);
        }
        this.scene.render();
        this.frames++;
    }

    dispose(): void {
        this.stop();
        this.model?.dispose();
        this.model = null;
        this.canvas.remove();
        disposeWhenSettled(this.scene, this.engine);
    }
}
