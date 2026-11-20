// JL-42: visor 3D pequeño en la ficha del Compendio. Muestra el modelo de la criatura
// (el mismo que usa el juego según data/assets.json, con su paleta y escala), girando
// despacio y con su clip idle; se arrastra para girarlo. Un solo motor Babylon compartido,
// que se libera al cerrar la ventana.
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
import { AssetCache } from '../../render/assetCache';
import { createCharacter, type CharacterModel } from '../../render/characters/characterModel';
import type { AnimationDataDef, AssetManifest } from '../../data/worldSchema';

const FRAME_MS = 1000 / 30;
/** Velocidad de rotación automática (radianes/segundo). */
const AUTO_ROTATE = 0.15;
/** De frente, algo girado para que se vea el volumen. */
const FRONT_ALPHA = 0.35;
/** Segundos sin tocarlo tras los que vuelve poco a poco al frente. */
const RETURN_AFTER = 4;

export interface CreaturePreviewOptions {
    /** Manifiesto de assets (data/assets.json). */
    assets: AssetManifest;
    /** Datos de animación (data/animation.json). */
    animation: AnimationDataDef;
}

/** Vista 3D de una criatura del compendio: un lienzo que se pone en la página y se enciende al abrir. */
export interface CreaturePreview3d {
    readonly element: HTMLElement;
    /** Mostrar una criatura concreta (assetId = 'enemy.<archetype>'). null = ocultar. */
    show(assetId: string | null, scale?: number): void;
    start(): void;
    stop(): void;
    dispose(): void;
}

export class CreaturePreview implements CreaturePreview3d {
    readonly canvas: HTMLCanvasElement;
    get element(): HTMLElement {
        return this.canvas;
    }
    private readonly engine: Engine;
    private readonly scene: Scene;
    private readonly camera: ArcRotateCamera;
    private readonly cache: AssetCache;
    private readonly manifest: AssetManifest;
    private readonly animation: AnimationDataDef;
    private model: CharacterModel | null = null;
    private currentAssetId: string | null = null;
    private running = false;
    private last = 0;
    private acc = 0;
    private dragging = false;
    private sinceDrag = RETURN_AFTER;
    private modelHeight = 1.5;
    private modelScale = 1;
    /** Cuadros dibujados desde que se abrió (para medir). */
    frames = 0;
    /** La que está dibujando ahora (para las pruebas en Electron). */
    static active: CreaturePreview | null = null;

    constructor(opts: CreaturePreviewOptions) {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'comp-preview-3d';
        this.canvas.setAttribute('aria-label', 'Vista 3D de la criatura (arrastra para girarla)');
        this.engine = new Engine(this.canvas, true, { alpha: true, premultipliedAlpha: false, stencil: false }, true);
        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color4(0, 0, 0, 0);
        // Sin picking: el giro lo lleva `bindDrag`. Además así el lienzo no se vuelve enfocable.
        this.scene.detachControl();
        this.canvas.removeAttribute('tabindex');
        this.manifest = opts.assets;
        this.animation = opts.animation;
        this.cache = new AssetCache(this.scene, opts.assets);
        // +X local del modelo = hacia delante; alfa 0 pone la cámara delante de él.
        this.camera = new ArcRotateCamera(
            'compPreview',
            FRONT_ALPHA,
            1.42,
            4.6,
            new Vector3(0, 0.95, 0),
            this.scene,
        );
        this.camera.lowerBetaLimit = 1.0;
        this.camera.upperBetaLimit = 1.7;
        this.camera.fov = 0.6;
        const sky = new HemisphericLight('compPreviewSky', new Vector3(0.1, 1, 0.2), this.scene);
        sky.intensity = 0.85;
        sky.groundColor = new Color3(0.32, 0.28, 0.26);
        const key = new DirectionalLight('compPreviewKey', new Vector3(-0.6, -0.7, -0.35), this.scene);
        key.intensity = 1.05;
        key.diffuse = new Color3(1, 0.94, 0.86);
        const rim = new DirectionalLight('compPreviewRim', new Vector3(0.5, -0.2, 0.8), this.scene);
        rim.intensity = 0.45;
        rim.diffuse = new Color3(0.75, 0.82, 1);
        this.bindDrag();
    }

    /** Arrastrar gira la criatura (sólo en horizontal); doble clic vuelve al frente. */
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

    /** Mostrar una criatura concreta (assetId = 'enemy.<archetype>'). null = ocultar. */
    show(assetId: string | null, scale = 1): void {
        if (assetId === this.currentAssetId && scale === this.modelScale) return;
        this.currentAssetId = assetId;
        this.modelScale = scale;
        this.model?.dispose();
        this.model = null;
        if (!assetId) return;
        // Buscar la entrada en el manifiesto; si no hay, no se puede mostrar.
        const entry = this.manifest[assetId];
        if (!entry) return;
        const m = createCharacter(
            this.scene,
            assetId,
            'compPreview',
            entry,
            this.animation,
            this.cache,
        );
        this.model = m;
        m.play('idle');
        // Ajustar el encuadre según la altura del modelo.
        const frame = (): void => {
            if (this.model !== m) return;
            this.modelHeight = Math.max(0.5, (m.height || 1.5) * scale);
            const y = this.modelHeight * 0.5;
            const r = this.modelHeight * 2.2;
            this.camera.target.set(0, y, 0);
            this.camera.radius = r;
        };
        frame();
        if (m.ready) void m.ready.then(frame);
    }

    start(): void {
        if (this.running) return;
        this.running = true;
        CreaturePreview.active = this;
        this.frames = 0;
        this.last = performance.now();
        this.acc = 0;
        this.engine.runRenderLoop(() => this.tick());
    }

    stop(): void {
        if (!this.running) return;
        this.running = false;
        if (CreaturePreview.active === this) CreaturePreview.active = null;
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
        // Rotación automática lenta cuando no se arrastra.
        if (this.dragging) {
            this.sinceDrag = 0;
        } else if ((this.sinceDrag += dt) > RETURN_AFTER) {
            // Volver al frente por el lado más corto.
            const d = Math.atan2(
                Math.sin(FRONT_ALPHA - this.camera.alpha),
                Math.cos(FRONT_ALPHA - this.camera.alpha),
            );
            this.camera.alpha += d * Math.min(1, dt * 2.5);
        } else {
            // Rotación automática mientras se mantiene la posición.
            this.camera.alpha += AUTO_ROTATE * dt;
        }
        const m = this.model;
        if (m) {
            m.update(dt, 0);
        }
        this.scene.render();
        this.frames++;
    }

    dispose(): void {
        this.stop();
        this.model?.dispose();
        this.model = null;
        this.scene.dispose();
        this.engine.dispose();
        this.canvas.remove();
    }
}
