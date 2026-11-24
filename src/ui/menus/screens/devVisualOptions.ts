// Opciones › Desarrollo: revelado de la escena (LUZ-01), modo de iluminación y luz del
// personaje (LUZ-02, LUZ-03) y letra de los números de daño
// (UI-05). Se guardan aparte de las opciones de la partida (`render/devVisual`) y se
// aplican al momento; la muestra de abajo dibuja el número como saldrá en el juego.
import {
    AIM_SKINS,
    DAMAGE_FONTS,
    DAMAGE_STYLES,
    DEV_VISUAL_DEFAULTS,
    DEV_VISUAL_LIMITS,
    TONEMAPS,
    devVisual,
    setDevVisual,
    type DamageFont,
    type DevVisual,
} from '../../../render/devVisual';
import { paintText, TEX_H, TEX_W } from '../../../render/fx/floatingText';
import { LIGHT_MODE_DEFS, LIGHT_MODES } from '../../../render/lightModes';
import { button, h } from '../dom';

const TONEMAP_NAMES = { aces: 'ACES (filmica, viva)', neutra: 'Neutra (Khronos)', ninguna: 'Ninguna (como antes)' };
const STYLE_NAMES = { plano: 'Plano', relieve: 'Relieve', bloque: 'Bloque 3D' };

export function devVisualOptions(): HTMLElement[] {
    const refreshers: (() => void)[] = [];
    const set = (patch: Partial<DevVisual>): void => {
        setDevVisual(patch);
        drawSample();
    };
    const pick = <K extends 'tonemap' | 'damageFont' | 'damageStyle' | 'lightMode' | 'aimSkin'>(
        label: string,
        key: K,
        list: readonly DevVisual[K][],
        name: (v: DevVisual[K]) => string,
    ): HTMLElement => {
        const sel = h('select', { 'data-opt': `dev.${key}` });
        for (const v of list) sel.appendChild(h('option', { value: v, text: name(v) }));
        sel.value = devVisual()[key];
        sel.addEventListener('change', () => set({ [key]: sel.value } as Partial<DevVisual>));
        refreshers.push(() => (sel.value = devVisual()[key]));
        return h('label.opt-row.pick', null, h('span', { text: label }), sel);
    };
    const slider = (label: string, key: keyof typeof DEV_VISUAL_LIMITS, fmt: (v: number) => string): HTMLElement => {
        const L = DEV_VISUAL_LIMITS[key];
        const out = h('output', { text: fmt(devVisual()[key]) });
        const inp = h('input', { type: 'range', min: L.min, max: L.max, step: L.step, value: devVisual()[key] });
        inp.addEventListener('input', () => {
            set({ [key]: Number(inp.value) });
            out.textContent = fmt(devVisual()[key]);
        });
        refreshers.push(() => {
            inp.value = String(devVisual()[key]);
            out.textContent = fmt(devVisual()[key]);
        });
        return h('label.opt-row', null, h('span', { text: label }), inp, out);
    };
    const bloom = h('input', { type: 'checkbox', 'data-opt': 'dev.bloom' });
    bloom.checked = devVisual().bloom;
    bloom.addEventListener('change', () => set({ bloom: bloom.checked }));
    refreshers.push(() => (bloom.checked = devVisual().bloom));
    const hero = h('input', { type: 'checkbox', 'data-opt': 'dev.heroLight' });
    hero.checked = devVisual().heroLight;
    hero.addEventListener('change', () => set({ heroLight: hero.checked }));
    refreshers.push(() => (hero.checked = devVisual().heroLight));

    const sample = h('canvas', { width: TEX_W * 2, height: TEX_H }) as HTMLCanvasElement;
    sample.style.cssText = 'display:block;max-width:100%;background:#4a6b45;border-radius:6px;margin:4px 0';
    function drawSample(): void {
        const ctx = sample.getContext('2d');
        if (!ctx) return;
        const v = devVisual();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, sample.width, sample.height);
        const f = DAMAGE_FONTS[v.damageFont];
        paintText(ctx, '128', [1, 0.92, 0.55], 64, v.damageStyle, f);
        ctx.setTransform(1, 0, 0, 1, TEX_W, 0);
        paintText(ctx, '57', [1, 0.35, 0.3], 64, v.damageStyle, f);
    }
    drawSample();
    // Las fuentes del sistema pueden tardar en estar listas la primera vez.
    void document.fonts?.ready.then(drawSample);

    const pct = (v: number): string => `${Math.round(v * 100)} %`;
    const dec = (v: number): string => v.toFixed(2).replace('.', ',');
    const fonts = Object.keys(DAMAGE_FONTS) as DamageFont[];
    return [
        h('h4', { text: 'Imagen de la escena' }),
        pick('Curva de tono', 'tonemap', TONEMAPS, (v) => TONEMAP_NAMES[v]),
        slider('Exposición', 'exposure', dec),
        slider('Contraste', 'contrast', dec),
        slider('Viveza del color', 'vibrance', (v) => String(v)),
        slider('Viñeta', 'vignette', pct),
        h('label.opt-row.check', null, h('span', { text: 'Resplandor (bloom, pase extra)' }), bloom),
        h('p.hint', {
            text: 'Revelado tipo HDR en un solo pase de pantalla (la escena en media precisión si la GPU lo permite): curva de tono, contraste, curvas de color y viñeta. El resplandor es otro pase y cuesta más. Es de esta máquina, no de la partida.',
        }),
        h('h4', { text: 'Iluminación' }),
        pick('Modo', 'lightMode', LIGHT_MODES, (v) => LIGHT_MODE_DEFS[v].name),
        h('label.opt-row.check', null, h('span', { text: 'Luz propia del personaje' }), hero),
        h('p.hint', {
            text: 'El modo sube la luz ambiente, hace que el suelo devuelva luz a los costados y bajos, y aclara las sombras. Original es la luz de antes. La luz del personaje va entera de noche y en la cripta, y tenue de día.',
        }),
        h('h4', { text: 'Números de daño' }),
        pick('Letra', 'damageFont', fonts, (v) => DAMAGE_FONTS[v].name),
        pick('Acabado', 'damageStyle', DAMAGE_STYLES, (v) => STYLE_NAMES[v]),
        sample,
        h('h4', { text: 'Indicador de apuntado' }),
        (() => {
            const sel = h('select', { 'data-opt': 'dev.aimSkin' });
            for (const s of AIM_SKINS) sel.appendChild(h('option', { value: s.id, text: s.name }));
            sel.value = devVisual().aimSkin;
            sel.addEventListener('change', () => set({ aimSkin: sel.value }));
            refreshers.push(() => (sel.value = devVisual().aimSkin));
            return h('label.opt-row.pick', null, h('span', { text: 'Skin' }), sel);
        })(),
        h('p.hint', {
            text: 'Cambia el aspecto del marcador del objetivo, la línea de trayectoria y el aro de aterrizaje mientras se apunta un hechizo. Las skins actuales usan geometría simple; las futuras pueden cargar modelos y texturas de Blender.',
        }),
        h(
            'div.opt-row.check',
            null,
            h('span', { text: 'Volver a lo propuesto' }),
            button('Restablecer', () => {
                set({ ...DEV_VISUAL_DEFAULTS });
                for (const r of refreshers) r();
            }),
        ),
    ];
}
