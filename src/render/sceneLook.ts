// LUZ-01 (creador, 2026-11-19: «se ve simple, aplícale como un HDR o algo así que se vea más
// vivo»). Revelado de la imagen sin tocar las luces ni sus datos:
//  - curva de tono filmica (ACES) con exposición: los altos ya no se queman en blanco plano
//    y los medios ganan cuerpo, como una foto HDR;
//  - contraste, curvas de color (sombras algo frías, luces cálidas, más saturación) y viñeta.
// Va en un solo pase de pantalla al principio de la cadena: el terreno y el cielo usan
// sombreadores propios que no aplicarían el revelado por material, y así todo sale igual.
// Si la GPU lo permite, la escena se dibuja en media precisión (HDR de verdad): las luces
// por encima de 1 no se recortan antes de la curva. El resplandor (bloom) es otro pase y va
// apagado por defecto. Los ajustes viven en `devVisual` (Opciones › Desarrollo).
import {
    Color4,
    ColorCurves,
    Constants,
    DefaultRenderingPipeline,
    ImageProcessingConfiguration,
    ImageProcessingPostProcess,
    type Camera,
    type Scene,
} from '@babylonjs/core';
import { devVisual, onDevVisual, type DevVisual } from './devVisual';

const TONEMAP_TYPE = {
    aces: ImageProcessingConfiguration.TONEMAPPING_ACES,
    neutra: ImageProcessingConfiguration.TONEMAPPING_KHR_PBR_NEUTRAL,
} as const;

export class SceneLook {
    private bloom: DefaultRenderingPipeline | null = null;
    private pass: ImageProcessingPostProcess | null = null;
    private readonly off: () => void;
    private samples = 1;

    constructor(
        private readonly scene: Scene,
        private readonly camera: Camera,
    ) {
        this.apply(devVisual());
        this.off = onDevVisual((v) => this.apply(v));
    }

    apply(v: DevVisual): void {
        const ip = this.scene.imageProcessingConfiguration;
        ip.applyByPostProcess = true; // los materiales no lo aplican: lo hace el pase
        this.setPass(v.tonemap !== 'ninguna');
        ip.isEnabled = true;
        ip.toneMappingEnabled = v.tonemap !== 'ninguna';
        if (v.tonemap !== 'ninguna') ip.toneMappingType = TONEMAP_TYPE[v.tonemap];
        ip.exposure = v.tonemap === 'ninguna' ? 1 : v.exposure;
        ip.contrast = v.tonemap === 'ninguna' ? 1 : v.contrast;
        const curves = v.tonemap !== 'ninguna' && v.vibrance > 0;
        ip.colorCurvesEnabled = curves;
        if (curves) {
            const c = ip.colorCurves ?? new ColorCurves();
            c.globalSaturation = v.vibrance;
            // Sombras hacia el azul y luces hacia el ámbar: da volumen sin cambiar el tono medio.
            c.shadowsHue = 220;
            c.shadowsDensity = 22;
            c.shadowsSaturation = 20;
            c.highlightsHue = 40;
            c.highlightsDensity = 12;
            c.highlightsSaturation = 15;
            ip.colorCurves = c;
        }
        ip.vignetteEnabled = v.tonemap !== 'ninguna' && v.vignette > 0;
        ip.vignetteWeight = v.vignette * 3;
        ip.vignetteStretch = 0.4;
        ip.vignetteColor = new Color4(0.04, 0.03, 0.06, 0);
        ip.vignetteBlendMode = ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;
        this.setBloom(v.bloom);
    }

    /**
     * MSAA de la escena: con un pase delante, el del lienzo ya no llega a lo dibujado, así que
     * se pide en la textura del pase (WebGL2). La vista lo pone según la calidad: sin MSAA con
     * el estilo pintura (como antes, su contorno hace de suavizado), 4 muestras sin él.
     */
    setSamples(n: number): void {
        this.samples = Math.min(n, this.scene.getEngine().getCaps().maxMSAASamples || 1);
        if (this.pass) this.pass.samples = this.samples;
    }

    private setPass(on: boolean): void {
        if (on && !this.pass) {
            const engine = this.scene.getEngine();
            const caps = engine.getCaps();
            const hdr = caps.textureHalfFloatRender
                ? Constants.TEXTURETYPE_HALF_FLOAT
                : Constants.TEXTURETYPE_UNSIGNED_INT;
            this.pass = new ImageProcessingPostProcess(
                'sceneLook',
                1,
                this.camera,
                Constants.TEXTURE_BILINEAR_SAMPLINGMODE,
                engine,
                false,
                hdr,
                this.scene.imageProcessingConfiguration,
            );
            // Debe ir el primero: lo que venga después (pintura, FXAA) trabaja sobre la imagen revelada.
            const list = this.camera._postProcesses;
            const i = list.indexOf(this.pass);
            if (i > 0) {
                list.splice(i, 1);
                list.unshift(this.pass);
            }
            this.pass.samples = this.samples;
        } else if (!on && this.pass) {
            this.pass.dispose(this.camera);
            this.pass = null;
        }
    }

    private setBloom(on: boolean): void {
        if (on && !this.bloom) {
            const p = new DefaultRenderingPipeline('sceneLookBloom', false, this.scene, [this.camera]);
            // Sólo el resplandor: el revelado lo hace el pase propio y el suavizado los suyos.
            p.imageProcessingEnabled = false;
            p.fxaaEnabled = false;
            p.bloomEnabled = true;
            p.bloomThreshold = 0.82;
            p.bloomWeight = 0.35;
            p.bloomKernel = 48;
            p.bloomScale = 0.5;
            this.bloom = p;
        } else if (!on && this.bloom) {
            this.bloom.dispose();
            this.bloom = null;
        }
    }

    dispose(): void {
        this.off();
        this.setBloom(false);
        this.setPass(false);
    }
}
