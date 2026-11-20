// Creación de personaje (UI-CR): tres columnas.
// - Clase: tarjetas y su ficha (rol, de qué vive, recurso, afinidades, hechizos de inicio y los
//   que llegan después). Todo sale de data/rpg/classes.json y spells.json; nada inventado.
// - Escenario: el personaje en 3D (la vista de la mochila, UI-06) con lo elegido, girando; el
//   sexo con iconos encima; el nombre y «Empezar» debajo.
// - Aspecto por pestañas: cuerpo (piel, altura, complexión), cara (cara, ojos, cejas), pelo
//   (peinado y color) y ropa. Lo que el modelo aún no enseña se guarda y lo dice (COLA_OMP).
import type { CharacterSex, ClassDef, ContentDb, Element, SpellDef } from '../../../rpg/contracts';
import { CHARACTER_SEXES } from '../../../rpg/contracts';
import {
    APPEARANCE_FACES,
    BROW_LABEL,
    BROW_STYLES,
    CLOTH_COLORS,
    defaultAppearance,
    EYE_COLORS,
    HAIR_COLORS,
    HAIR_CUT_LABEL,
    HAIR_CUTS,
    MODEL_SUPPORT,
    SKIN_TONES,
    type Appearance,
    type BrowStyle,
    type HairCut,
} from '../../../rpg/appearance';
import { tr, trf } from '../../../i18n';
import { notice } from '../../devConsole';
import type { Preview3d } from '../context';
import { button, clear, h } from '../dom';
import { ELEMENT_LABEL, capitalize, formatStatValue, spellTooltip, statLabel } from '../format';
import { ELEMENT_COLOR, namedIcon, spellIcon } from '../icons';
import type { Tooltip } from '../tooltip';

export const NAME_MIN = 2;
export const NAME_MAX = 24;

/** Nombre válido: 2–24 letras o dígitos, espacios, apóstrofo o guion; sin espacios en los extremos (NOM-01, creador 2026-11-18: máx. 24, dígitos permitidos). */
export function validateName(raw: string): string | null {
    const n = raw.trim().replace(/\s+/g, ' ');
    if (n.length < NAME_MIN) return `Mínimo ${NAME_MIN} caracteres`;
    if (n.length > NAME_MAX) return `Máximo ${NAME_MAX} caracteres`;
    if (!/^[\p{L}\p{N}][\p{L}\p{N} '\-]*$/u.test(n)) return 'Sólo letras, números, espacios, apóstrofo o guion';
    return null;
}

/** Lo elegido en cada momento (lo lee la vista 3D). */
export interface CreationPick {
    classId: string;
    sex: CharacterSex;
    appearance: Appearance;
}

export interface CreationOptions {
    /** Vista 3D con lo elegido; sin ella, una silueta teñida. */
    preview?: (pick: () => CreationPick) => Preview3d;
    /** Se llama al salir de la pantalla (para soltar la vista 3D). */
    onCleanup?: (fn: () => void) => void;
}

// ─── Resumen de la clase (sólo datos reales) ──────────────────────────────────────────────

/** Hechizos propios de una clase, por nivel de aprendizaje. */
export function classSpells(content: ContentDb, classId: string): SpellDef[] {
    return Object.values(content.spells)
        .filter((s) => s.classId === classId)
        .sort((a, b) => (a.unlockLevel ?? 1) - (b.unlockLevel ?? 1) || a.name.localeCompare(b.name));
}

export interface KitSummary {
    total: number;
    maxLevel: number;
    /** Cuántos hechizos de cada elemento, de más a menos. */
    elements: { element: Element; count: number }[];
    /** Cuántos golpean en área, controlan, protegen, mejoran o mueven. */
    styles: { id: 'area' | 'control' | 'defense' | 'buff' | 'mobility'; label: string; count: number }[];
}

const MOBILITY = new Set(['dash', 'blink', 'swap']);
const DEFENSE = new Set(['shield', 'heal']);

/** Recuento del repertorio de una clase: elementos y estilo de sus hechizos. */
export function kitSummary(spells: readonly SpellDef[]): KitSummary {
    const el = new Map<Element, number>();
    const st = { area: 0, control: 0, defense: 0, buff: 0, mobility: 0 };
    let maxLevel = 1;
    for (const s of spells) {
        el.set(s.element, (el.get(s.element) ?? 0) + 1);
        maxLevel = Math.max(maxLevel, s.unlockLevel ?? 1);
        const types = new Set(s.effects.map((e) => e.type));
        if (s.area.type !== 'single' && s.area.type !== 'self') st.area++;
        if (s.tags.includes('control')) st.control++;
        if (s.tags.includes('defense') || [...types].some((t) => DEFENSE.has(t))) st.defense++;
        if (s.tags.includes('buff')) st.buff++;
        if ([...types].some((t) => MOBILITY.has(t))) st.mobility++;
    }
    const LABEL = {
        area: 'En área',
        control: 'Control',
        defense: 'Defensa',
        buff: 'Mejoras',
        mobility: 'Movilidad',
    } as const;
    return {
        total: spells.length,
        maxLevel,
        elements: [...el].map(([element, count]) => ({ element, count })).sort((a, b) => b.count - a.count),
        styles: (Object.keys(st) as (keyof typeof st)[])
            .map((id) => ({ id, label: LABEL[id], count: st[id] }))
            .filter((s) => s.count > 0),
    };
}

// ─── Iconos propios (SVG en línea, dibujados para este juego) ─────────────────────────────

/** Busto de frente para elegir sexo. */
function sexIcon(sex: CharacterSex): string {
    const body =
        sex === 'masculino'
            ? // Hombros anchos, pelo corto, mandíbula marcada.
              `<path d="M8 46c1-9 7-13 16-13s15 4 16 13z"/>
               <path d="M17 19c0-6 3-10 7-10s7 4 7 10c0 6-3 11-7 11s-7-5-7-11z"/>
               <path d="M16.5 17c0-6 3.5-9.5 7.5-9.5S31.5 11 31.5 17c-2-3-5-4-7.5-4s-5.5 1-7.5 4z" class="hair"/>`
            : // Hombros estrechos, melena por los hombros.
              `<path d="M11 46c1-8 6-12 13-12s12 4 13 12z"/>
               <path d="M14.5 33c-1-4 0-9 1-14 1-7 4-11 8.5-11s7.5 4 8.5 11c1 5 2 10 1 14-2-1-4-2-5-4h-9c-1 2-3 3-5 4z" class="hair"/>
               <path d="M18 19c0-5 2.5-8.5 6-8.5s6 3.5 6 8.5c0 5.5-2.5 10-6 10s-6-4.5-6-10z"/>`;
    return `<svg viewBox="0 0 48 48" aria-hidden="true" class="cr-sex-svg">${body}</svg>`;
}

/** Cabeza con el peinado (piel y pelo con los colores elegidos). */
function hairIcon(cut: HairCut, skin: string, hair: string): string {
    const head = `<ellipse cx="20" cy="22" rx="8.5" ry="10" fill="#${skin}"/>`;
    const neck = `<path d="M15 30h10v6H15z" fill="#${skin}"/>`;
    const shapes: Record<HairCut, string> = {
        short: `<path d="M11 21c0-8 4-12 9-12s9 4 9 12c-2-4-5-6-9-6s-7 2-9 6z"/>`,
        long: `<path d="M10.5 34c-1-7-1-14 0-19 1.5-5 5-7 9.5-7s8 2 9.5 7c1 5 1 12 0 19-2-2-3-5-3-9v-7c-2-2-4-3-6.5-3s-4.5 1-6.5 3v7c0 4-1 7-3 9z"/>`,
        bun: `<circle cx="20" cy="6.5" r="4.2"/><path d="M11 21c0-8 4-11.5 9-11.5s9 3.5 9 11.5c-2-4-5-6.5-9-6.5s-7 2.5-9 6.5z"/>`,
        bald: `<path d="M12.5 18c1.5-4 4-6 7.5-6s6 2 7.5 6c-2-1.5-4.5-2.5-7.5-2.5s-5.5 1-7.5 2.5z" opacity="0.35"/>`,
    };
    return `<svg viewBox="0 0 40 40" aria-hidden="true">${neck}${head}<g fill="#${hair}" stroke="rgba(0,0,0,0.45)" stroke-width="0.6">${shapes[cut]}</g></svg>`;
}

/** Ojos con la forma de ceja elegida. */
function browIcon(style: BrowStyle, hair: string): string {
    const d: Record<BrowStyle, { path: string; w: number }> = {
        natural: { path: 'M5 13c3-2.5 7-3 11-1.5', w: 2.2 },
        thick: { path: 'M4.5 13.5c3.5-3 8-3.4 12-1.5', w: 3.6 },
        thin: { path: 'M5.5 12.5c3-1.8 7-2.2 10.5-1', w: 1.2 },
        arched: { path: 'M5 14c2-4.5 7-5.5 11-2', w: 2 },
    };
    const b = d[style];
    const eye = (x: number): string =>
        `<ellipse cx="${x}" cy="20" rx="4.2" ry="2.6" fill="#f3ece2"/><circle cx="${x}" cy="20" r="1.8" fill="#2a1d14"/>`;
    const brow = (tx: number, flip: boolean): string =>
        `<path d="${b.path}" transform="translate(${tx} 0)${flip ? ' scale(-1 1) translate(-21 0)' : ''}" stroke="#${hair}" stroke-width="${b.w}" fill="none" stroke-linecap="round"/>`;
    return `<svg viewBox="0 0 42 28" aria-hidden="true">${brow(0, false)}${brow(21, true)}${eye(10.5)}${eye(31.5)}</svg>`;
}

/** Silueta teñida con los colores elegidos (cuando no hay vista 3D). */
function figureSvg(a: Appearance, sex: CharacterSex): string {
    const fem = sex === 'femenino';
    const sy = 1 + a.height * 0.06;
    const sx = 1 + a.build * 0.1;
    const hairLong = a.hair === 'long' ? `<path d="M41 30c-3 8-3 18-1 26h20c2-8 2-18-1-26z" fill="#${a.hairColor}"/>` : '';
    const hairTop =
        a.hair === 'bald'
            ? ''
            : `<path d="M39 28c0-9 5-14 11-14s11 5 11 14c-3-4-6-6-11-6s-8 2-11 6z" fill="#${a.hairColor}"/>` +
              (a.hair === 'bun' ? `<circle cx="50" cy="12" r="5" fill="#${a.hairColor}"/>` : '');
    return `<svg viewBox="0 0 100 200" class="cr-figure" aria-hidden="true">
      <g transform="translate(50 196) scale(${sx} ${sy}) translate(-50 -196)">
        ${hairLong}
        <rect x="${fem ? 36 : 33}" y="44" width="${fem ? 28 : 34}" height="52" rx="10" fill="#${a.cloth}"/>
        <rect x="${fem ? 38 : 35}" y="88" width="${fem ? 24 : 30}" height="8" fill="#${a.trim}"/>
        <rect x="${fem ? 26 : 22}" y="48" width="9" height="46" rx="4.5" fill="#${a.cloth}"/>
        <rect x="${fem ? 65 : 69}" y="48" width="9" height="46" rx="4.5" fill="#${a.cloth}"/>
        <circle cx="${fem ? 30.5 : 26.5}" cy="98" r="4.5" fill="#${a.skin}"/>
        <circle cx="${fem ? 69.5 : 73.5}" cy="98" r="4.5" fill="#${a.skin}"/>
        <rect x="38" y="96" width="11" height="90" rx="5" fill="#${a.trim}"/>
        <rect x="51" y="96" width="11" height="90" rx="5" fill="#${a.trim}"/>
        <rect x="45" y="38" width="10" height="9" fill="#${a.skin}"/>
        <ellipse cx="50" cy="28" rx="11" ry="13" fill="#${a.skin}"/>
        ${hairTop}
      </g>
    </svg>`;
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────────────────

type Tab = 'cuerpo' | 'cara' | 'pelo' | 'ropa';
const TABS: readonly { id: Tab; label: string }[] = [
    { id: 'cuerpo', label: 'Cuerpo' },
    { id: 'cara', label: 'Cara' },
    { id: 'pelo', label: 'Pelo' },
    { id: 'ropa', label: 'Ropa' },
];
const SEX_LABEL: Record<CharacterSex, string> = { masculino: 'Masculino', femenino: 'Femenino' };

export function creationScreen(
    content: ContentDb,
    tooltip: Tooltip,
    onStart: (classId: string, name: string, sex: CharacterSex, appearance: Appearance) => void,
    onBack: () => void,
    opts: CreationOptions = {},
): HTMLElement {
    const classes = Object.values(content.classes);
    let chosen = classes[0]!.id;
    let sex: CharacterSex = 'masculino';
    let look: Appearance = defaultAppearance(chosen, sex);
    /** Si el jugador ya tocó el aspecto, cambiar de clase o sexo no se lo deshace. */
    let touched = false;
    let tab: Tab = 'cuerpo';

    // Escenario: vista 3D (o silueta) y su giro.
    const preview = opts.preview?.(() => ({ classId: chosen, sex, appearance: look })) ?? null;
    const figure = h('div.cr-figure-box');
    const stageView = h('div.cr-view', null, preview ? preview.element : figure);
    const stageClass = h('div.cr-stage-class');
    const refresh = (): void => {
        if (preview) preview.refresh();
        else figure.innerHTML = figureSvg(look, sex);
    };
    if (preview) {
        opts.onCleanup?.(() => {
            preview.stop();
            preview.dispose?.();
        });
        setTimeout(() => preview.start(), 0);
    }
    const turnBtn = (label: string, rad: number, title: string): HTMLButtonElement => {
        const b = button(label, () => preview?.turn?.(rad), 'small cr-turn');
        b.title = title;
        b.setAttribute('aria-label', title);
        return b;
    };

    // Sexo con iconos.
    const sexRow = h('div.cr-sex', { role: 'radiogroup', 'aria-label': 'Sexo' });
    const renderSex = (): void => {
        clear(sexRow);
        for (const s of CHARACTER_SEXES) {
            const b = h(
                'button.cr-sex-btn',
                { type: 'button', role: 'radio', 'aria-checked': String(s === sex), 'data-sex': s, title: SEX_LABEL[s] },
                h('span.cr-sex-ic', { html: sexIcon(s) }),
                h('span.cr-sex-name', { text: SEX_LABEL[s] }),
            );
            if (s === sex) b.classList.add('on');
            b.addEventListener('click', () => {
                if (sex === s) return;
                sex = s;
                if (!touched) look = defaultAppearance(chosen, sex);
                renderSex();
                renderLook();
            });
            sexRow.append(b);
        }
    };

    // ── Aspecto ──
    const tabsRow = h('div.cr-tabs', { role: 'tablist' });
    const pane = h('div.cr-pane', { role: 'tabpanel' });
    const set = (patch: Partial<Appearance>): void => {
        look = { ...look, ...patch };
        touched = true;
        renderLook();
    };
    const section = (label: string, pending: boolean, ...body: HTMLElement[]): HTMLElement =>
        h(
            'div.cr-opt',
            null,
            h(
                'div.cr-opt-head',
                null,
                h('span', { text: label }),
                pending
                    ? h('span.cr-pending', {
                          text: 'Pendiente del modelo',
                          title: 'Se guarda en tu personaje; el modelo 3D aún no lo enseña',
                      })
                    : null,
            ),
            ...body,
        );
    const swatches = (colors: readonly string[], value: string, pick: (c: string) => void): HTMLElement =>
        h(
            'div.cr-swatches',
            null,
            ...colors.map((c) => {
                const b = h('button.swatch', {
                    type: 'button',
                    title: `#${c}`,
                    style: `--sw:#${c}`,
                    'aria-pressed': String(value === c),
                });
                if (value === c) b.classList.add('on');
                b.addEventListener('click', () => pick(c));
                return b;
            }),
        );
    const tiles = <T>(
        items: readonly T[],
        current: T,
        label: (v: T) => string,
        pick: (v: T) => void,
        icon?: (v: T) => string,
    ): HTMLElement =>
        h(
            `div.cr-tiles${icon ? '.with-ic' : ''}` as 'div',
            null,
            ...items.map((v) => {
                const b = h(
                    'button.cr-tile',
                    { type: 'button', 'aria-pressed': String(v === current) },
                    icon ? h('span.cr-tile-ic', { html: icon(v) }) : null,
                    h('span.cr-tile-name', { text: label(v) }),
                );
                if (v === current) b.classList.add('on');
                b.addEventListener('click', () => pick(v));
                return b;
            }),
        );
    const slider = (
        label: string,
        key: 'height' | 'build',
        ends: [string, string],
    ): HTMLElement => {
        const out = h('b.cr-slider-val');
        const showVal = (v: number): void => {
            out.textContent = v === 0 ? 'Media' : `${v > 0 ? '+' : ''}${Math.round(v * 100)}`;
        };
        const input = h('input.cr-slider', {
            type: 'range',
            min: -100,
            max: 100,
            step: 5,
            value: Math.round(look[key] * 100),
            'aria-label': label,
        });
        showVal(look[key]);
        input.addEventListener('input', () => {
            const v = Number(input.value) / 100;
            look = { ...look, [key]: v };
            touched = true;
            showVal(v);
            refresh();
        });
        input.addEventListener('dblclick', () => {
            input.value = '0';
            input.dispatchEvent(new Event('input'));
        });
        return section(
            label,
            !MODEL_SUPPORT[key],
            h(
                'div.cr-slider-row',
                null,
                h('span.cr-slider-end', { text: ends[0] }),
                input,
                h('span.cr-slider-end', { text: ends[1] }),
                out,
            ),
        );
    };
    const renderTabs = (): void => {
        clear(tabsRow);
        for (const t of TABS) {
            const b = h('button.cr-tab', {
                type: 'button',
                role: 'tab',
                'aria-selected': String(t.id === tab),
                'data-tab': t.id,
                text: t.label,
            });
            if (t.id === tab) b.classList.add('on');
            b.addEventListener('click', () => {
                tab = t.id;
                // Cara y pelo se ven mejor de cerca.
                preview?.focus?.(tab === 'cara' || tab === 'pelo' ? 'face' : 'body');
                renderTabs();
                renderLook();
            });
            tabsRow.append(b);
        }
    };
    const renderLook = (): void => {
        clear(pane);
        if (tab === 'cuerpo') {
            pane.append(
                section('Tono de piel', false, swatches(SKIN_TONES, look.skin, (c) => set({ skin: c }))),
                slider('Altura', 'height', ['Baja', 'Alta']),
                slider('Complexión', 'build', ['Delgada', 'Robusta']),
            );
        } else if (tab === 'cara') {
            pane.append(
                section(
                    'Rostro',
                    !MODEL_SUPPORT.face,
                    tiles(
                        APPEARANCE_FACES.map((_, i) => i),
                        look.face,
                        (i) => APPEARANCE_FACES[i]!,
                        (i) => set({ face: i }),
                    ),
                ),
                section(
                    'Cejas',
                    !MODEL_SUPPORT.brows,
                    tiles(
                        BROW_STYLES,
                        look.brows,
                        (b) => BROW_LABEL[b],
                        (b) => set({ brows: b }),
                        (b) => browIcon(b, look.hairColor),
                    ),
                ),
                section('Color de ojos', !MODEL_SUPPORT.eyes, swatches(EYE_COLORS, look.eyes, (c) => set({ eyes: c }))),
            );
        } else if (tab === 'pelo') {
            pane.append(
                section(
                    'Peinado',
                    !MODEL_SUPPORT.hair,
                    tiles(
                        HAIR_CUTS,
                        look.hair,
                        (c) => HAIR_CUT_LABEL[c],
                        (c) => set({ hair: c }),
                        (c) => hairIcon(c, look.skin, look.hairColor),
                    ),
                ),
                section('Color de pelo', false, swatches(HAIR_COLORS, look.hairColor, (c) => set({ hairColor: c }))),
            );
        } else {
            pane.append(
                section('Color principal', false, swatches(CLOTH_COLORS, look.cloth, (c) => set({ cloth: c }))),
                section('Color secundario', false, swatches(CLOTH_COLORS, look.trim, (c) => set({ trim: c }))),
                h(
                    'div.cr-cloth-sample',
                    { style: `--a:#${look.cloth};--b:#${look.trim}` },
                    h('i'),
                    h('span', { text: 'Ribetes y pantalón con el secundario' }),
                ),
            );
        }
        refresh();
    };
    const pickOne = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)]!;
    const randomize = (): void => {
        const step = (): number => Math.round((Math.random() * 2 - 1) * 20) / 20;
        look = {
            face: Math.floor(Math.random() * APPEARANCE_FACES.length),
            hair: pickOne(HAIR_CUTS),
            skin: pickOne(SKIN_TONES),
            hairColor: pickOne(HAIR_COLORS),
            cloth: pickOne(CLOTH_COLORS),
            trim: pickOne(CLOTH_COLORS),
            brows: pickOne(BROW_STYLES),
            eyes: pickOne(EYE_COLORS),
            height: step(),
            build: step(),
        };
        touched = true;
        renderLook();
    };
    const resetLook = (): void => {
        look = defaultAppearance(chosen, sex);
        touched = false;
        renderLook();
    };

    // ── Clase ──
    const cards = h('div.class-cards.cr-cards', { role: 'radiogroup', 'aria-label': 'Clase' });
    const info = h('div.cr-info');

    const spellRow = (sp: SpellDef, resName: string): HTMLElement => {
        const row = h(
            'div.cr-spell',
            null,
            h('span.cr-spell-ic', { html: spellIcon(sp) }),
            h(
                'div.cr-spell-txt',
                null,
                h(
                    'div.cr-spell-name',
                    null,
                    h('b', { text: sp.name }),
                    h('span.cr-el', { style: `--el:${ELEMENT_COLOR[sp.element]}`, text: ELEMENT_LABEL[sp.element] }),
                ),
                h('div.cr-spell-desc', { text: sp.description }),
                h('div.cr-spell-meta', {
                    text: [
                        sp.resourceCost > 0 ? `${sp.resourceCost} de ${resName}` : 'sin coste',
                        sp.cooldown > 0 ? `recarga ${sp.cooldown} s` : 'sin recarga',
                    ].join(' · '),
                }),
            ),
        );
        tooltip.bind(row, () => spellTooltip(sp, 1, content, resName));
        return row;
    };

    const renderInfo = (c: ClassDef): void => {
        clear(info);
        const res = c.resource;
        const all = classSpells(content, c.id);
        const kit = kitSummary(all);
        const starting = c.startingSpells.map((id) => content.spells[id]).filter((s): s is SpellDef => !!s);
        const later = all.filter((s) => !c.startingSpells.includes(s.id)).slice(0, 8);
        const remaining = all.length - starting.length - later.length;

        const tags = h(
            'div.cr-tags',
            null,
            h('span.cr-tag.role', { text: capitalize(c.role) }),
            c.mainStat ? h('span.cr-tag', { text: trf('Escala con {stat}', { stat: tr(statLabel(c.mainStat)) }) }) : null,
            ...c.affinity.map((e) =>
                h('span.cr-tag.el', {
                    style: `--el:${ELEMENT_COLOR[e]}`,
                    text: `${capitalize(ELEMENT_LABEL[e])} +${c.affinityBonus} %`,
                    title: trf('Afinidad: los hechizos de {element} hacen +{bonus} % de daño', {
                        element: tr(ELEMENT_LABEL[e]),
                        bonus: c.affinityBonus,
                    }),
                }),
            ),
        );

        const elBar = h('div.cr-elbar');
        for (const e of kit.elements)
            elBar.append(
                h('i', {
                    style: `--el:${ELEMENT_COLOR[e.element]};flex:${e.count}`,
                    title: `${capitalize(ELEMENT_LABEL[e.element])}: ${e.count}`,
                }),
            );
        const elLegend = h(
            'div.cr-legend',
            null,
            ...kit.elements.map((e) =>
                h(
                    'span',
                    { style: `--el:${ELEMENT_COLOR[e.element]}` },
                    h('i'),
                    `${capitalize(ELEMENT_LABEL[e.element])} ${e.count}`,
                ),
            ),
        );

        const laterGrid = h('div.cr-later');
        for (const sp of later) {
            const cell = h(
                'div.cr-later-cell',
                null,
                h('span.cr-later-ic', { html: spellIcon(sp) }),
                h('span.cr-later-lv', { text: trf('Nv {n}', { n: sp.unlockLevel ?? 1 }) }),
            );
            tooltip.bind(cell, () => [
                ...spellTooltip(sp, 1, content, res.name),
                { kind: 'hint', text: `Se aprende al llegar al nivel ${sp.unlockLevel ?? 1}` },
            ]);
            laterGrid.append(cell);
        }

        info.append(
            h(
                'div.cr-info-head',
                null,
                h('div.cr-info-ic', { html: namedIcon(c.icon, res.color) }),
                h('div', null, h('h3', { text: c.name }), tags),
            ),
            h('p.cr-desc', { text: c.description }),
            h('h4', { text: 'Mecánicas' }),
            h(
                'div.cr-mech',
                null,
                h(
                    'div.cr-mech-row',
                    null,
                    h('span.cr-mech-k', { text: 'Recurso' }),
                    h(
                        'div.res-preview.cr-res',
                        { style: `--c:${res.color}` },
                        h('div.fill'),
                        h('span', { text: `${res.name} · ${res.max} · +${res.regenPerSecond}/s` }),
                    ),
                ),
                h(
                    'div.cr-mech-row',
                    null,
                    h('span.cr-mech-k', { text: 'Vida' }),
                    h('span.cr-mech-v', {
                        text: `${formatStatValue('maxHealth', c.baseStats.maxHealth ?? 0)} · +${c.baseStats.healthRegen ?? 0}/s`,
                    }),
                ),
                h(
                    'div.cr-mech-row',
                    null,
                    h('span.cr-mech-k', { text: 'Repertorio' }),
                    h('span.cr-mech-v', { text: trf('{n} hechizos propios, hasta el nivel {level}', { n: kit.total, level: kit.maxLevel }) }),
                ),
                elBar,
                elLegend,
                h(
                    'div.cr-styles',
                    null,
                    ...kit.styles.map((s) =>
                        h('span.cr-style', { 'data-style': s.id }, h('b', { text: String(s.count) }), s.label),
                    ),
                ),
            ),
            h('h4', { text: 'Hechizos de inicio' }),
            h('div.cr-spells', null, ...starting.map((sp) => spellRow(sp, res.name))),
            ...(later.length ? [h('h4', { text: 'Más adelante' }), laterGrid] : []),
            ...(remaining > 0 ? [h('div.cr-more', { text: trf('y {n} más al subir de nivel', { n: remaining }) })] : []),
        );
        clear(stageClass);
        stageClass.append(
            h('b', { text: c.name }),
            h('span', { text: `${capitalize(c.role)} · ${c.affinity.map((e) => ELEMENT_LABEL[e]).join(' y ')}` }),
        );
    };

    const select = (id: string): void => {
        chosen = id;
        for (const card of cards.children) {
            const el = card as HTMLElement;
            const on = el.dataset['id'] === id;
            el.classList.toggle('on', on);
            el.setAttribute('aria-checked', String(on));
        }
        renderInfo(content.classes[id]!);
        if (!touched) look = defaultAppearance(chosen, sex);
        renderLook();
    };

    for (const c of classes) {
        const card = h(
            'button.class-card.cr-card',
            { type: 'button', role: 'radio', 'data-id': c.id, style: `--c:${c.resource.color}` },
            h('div.cc-icon', { html: namedIcon(c.icon, c.resource.color) }),
            h('div.cc-name', { text: c.name }),
            h('div.cc-role', { text: `${capitalize(c.role)} · ${c.resource.name}` }),
        );
        card.addEventListener('click', () => select(c.id));
        cards.appendChild(card);
    }

    // ── Nombre ──
    const input = h('input.name-input', {
        type: 'text',
        maxlength: NAME_MAX,
        placeholder: 'Nombre del personaje',
        spellcheck: 'false',
        autocomplete: 'off',
        'aria-label': 'Nombre del personaje',
    });
    const error = h('div.name-error', { role: 'alert' });
    const start = button('Empezar', () => submit(), 'primary');
    const submit = (): void => {
        const err = validateName(input.value);
        error.textContent = err ?? '';
        if (err) {
            // A la consola oculta (F8 / __consola): QA ve por qué no empieza la partida.
            notice(`Creación de personaje: nombre «${input.value}» rechazado: ${err}`, 'warn');
            input.focus();
            return;
        }
        onStart(chosen, input.value.trim().replace(/\s+/g, ' '), sex, { ...look });
    };
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
        e.stopPropagation(); // que escribir no dispare atajos
    });
    input.addEventListener('input', () => (error.textContent = ''));

    renderSex();
    renderTabs();
    select(chosen);
    setTimeout(() => input.focus(), 0);

    return h(
        'div.screen.creation-screen',
        null,
        h(
            'div.panel.creation-panel.cr',
            null,
            h('header.panel-head', null, h('h2', { text: 'Nuevo personaje' })),
            h(
                'div.cr-body',
                null,
                h('section.cr-col.cr-class', null, h('h4', { text: 'Clase' }), cards, info),
                h(
                    'section.cr-col.cr-stage',
                    null,
                    sexRow,
                    stageView,
                    h(
                        'div.cr-stage-foot',
                        null,
                        preview ? turnBtn('⟲', -0.5, 'Girar a la izquierda') : null,
                        stageClass,
                        preview ? turnBtn('⟳', 0.5, 'Girar a la derecha') : null,
                    ),
                    preview ? h('div.cr-hint', { text: 'Arrastra para girarlo · doble clic: de frente' }) : null,
                ),
                h(
                    'section.cr-col.cr-look',
                    null,
                    h('h4', { text: 'Aspecto' }),
                    tabsRow,
                    pane,
                    h(
                        'div.cr-look-tools',
                        null,
                        button('Aleatorio', randomize, 'small'),
                        button('Por defecto', resetLook, 'small'),
                    ),
                ),
            ),
            h(
                'footer.cr-foot',
                null,
                button('Volver', onBack),
                h('div.cr-name', null, h('div.name-row', null, input, start), error),
            ),
        ),
    );
}
