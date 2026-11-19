// LUZ-01 (creador, 2026-11-19: «se ve simple, aplícale como un HDR o algo así que se vea más
// vivo»). Revelado de la imagen sin tocar las luces ni sus datos:
//  - curva de tono filmica (ACES) con exposición: los altos ya no se queman en blanco plano
//    y los medios ganan cuerpo, como una foto HDR;
//  - contraste, curvas de color (sombras algo frías, luces cálidas, más saturación) y viñeta.
// El terreno y el cielo usan sombreadores propios que no aplicarían el revelado por material,
// así que va en un pase de pantalla. Con el estilo pintura (el de siempre) va dentro de su
// pase, sin coste de pase extra (`PAINT_GRADE_GLSL`, más abajo). Con el estilo natural va en
// un pase propio al principio de la cadena; si la GPU lo permite, la escena se dibuja en
// media precisión (HDR de verdad) y las luces por encima de 1 no se recortan antes de la curva.
// El resplandor (bloom) es otro pase y va apagado por defecto. Los ajustes viven en `devVisual` (Opciones › Desarrollo).
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
    /** Con el estilo pintura, su pase ya hace el revelado (`PAINT_GRADE_GLSL`): no hay pase propio. */
    private inPaint = false;

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
        this.setPass(v.tonemap !== 'ninguna' && !this.inPaint);
        // Sin pase propio, los materiales aplican el revelado, como queda al arrancar: Babylon
        // pone `applyByPostProcess = false` al deshacer el pase. Sin esto, el primer cambio en
        // Opciones › Desarrollo dejaba la escena con otro revelado (suelo naranja saturado).
        if (!this.pass) ip.applyByPostProcess = false;
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
     * El estilo pintura ya pasa por la pantalla entera: si está, el revelado va dentro de su pase
     * y el propio se quita, así el modo por defecto no suma ningún pase (WIN-01).
     */
    setPaintGrading(on: boolean): void {
        if (this.inPaint === on) return;
        this.inPaint = on;
        this.apply(devVisual());
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

/** Cifras del revelado para el pase de pintura: modo (0 nada, 1 ACES, 2 neutra) y vec4. */
export function gradeUniforms(v: DevVisual): { mode: number; grade: [number, number, number, number] } {
    if (v.tonemap === 'ninguna') return { mode: 0, grade: [1, 1, 1, 0] };
    return {
        mode: v.tonemap === 'aces' ? 1 : 2,
        grade: [v.exposure, v.contrast, 1 + v.vibrance / 100, v.vignette],
    };
}

/**
 * El mismo revelado en GLSL para meterlo en un pase que ya existe: exposición y curva en
 * espacio lineal, contraste como el de Babylon, saturación, sombras frías / luces cálidas y
 * viñeta. Necesita `vUV` y los uniformes `gradeMode` y `grade`.
 */
export const PAINT_GRADE_GLSL = `
uniform float gradeMode;
uniform vec4 grade;
vec3 gradeAces(vec3 x) {
  x *= 0.6;
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
vec3 gradeNeutral(vec3 c) {
  float x = min(c.r, min(c.g, c.b));
  float off = x < 0.08 ? x - 6.25 * x * x : 0.04;
  c -= off;
  float peak = max(c.r, max(c.g, c.b));
  if (peak < 0.76) return c;
  float d = 0.24;
  float np = 1.0 - d * d / (peak + d - 0.76);
  float g = 1.0 - 1.0 / (0.15 * (peak - np) + 1.0);
  return mix(c * (np / peak), vec3(np), g);
}
vec3 applyGrade(vec3 c, vec2 uv) {
  if (gradeMode < 0.5) return c;
  vec3 lin = pow(max(c, 0.0), vec3(2.2)) * grade.x;
  lin = gradeMode < 1.5 ? gradeAces(lin) : gradeNeutral(lin);
  c = pow(lin, vec3(1.0 / 2.2));
  vec3 hi = c * c * (3.0 - 2.0 * c);
  c = grade.y < 1.0 ? mix(vec3(0.5), c, grade.y) : mix(c, hi, grade.y - 1.0);
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, grade.z);
  c *= mix(vec3(0.95, 0.98, 1.06), vec3(1.04, 1.0, 0.95), smoothstep(0.1, 0.9, l));
  float r = length((uv - 0.5) * vec2(1.0, 0.8));
  c *= 1.0 - grade.w * 0.65 * smoothstep(0.3, 0.85, r);
  return c;
}
`;
