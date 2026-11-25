// F07: en inglés cambia todo, también lo inventado de data/ (lugares, monstruos, objetos,
// misiones, diálogos). Cada texto para el jugador de los datos tiene su inglés.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';
import en from '../data/i18n/en.json';
import enContent from '../data/i18n/en.content.json';
import enUi from '../data/i18n/en.ui.json';
import { hasTranslation, setLanguage, tr } from '../src/i18n';
import { collectDataTexts } from '../src/i18nTexts';

const FILES = [
    ...readdirSync('data/rpg')
        .filter((f) => f.endsWith('.json'))
        .map((f) => `data/rpg/${f}`),
    'data/zones.json',
    'data/dungeon.json',
    'data/panama.json',
    'data/stones.json',
    'data/weather.json',
    'data/dungeons/cripta-tulivieja.json',
    'data/appearance.json',
    'data/death.json',
    'data/enemies.json',
    'data/ui/chat.json',
    'data/dev/presets.json',
];
const texts = collectDataTexts(
    Object.fromEntries(FILES.map((f) => [f, JSON.parse(readFileSync(f, 'utf8')) as unknown])),
);

const classes = JSON.parse(readFileSync('data/rpg/classes.json', 'utf8')) as {
    classes: Record<string, { role: string; affinity: string[] }>;
};
const spells = JSON.parse(readFileSync('data/rpg/spells.json', 'utf8')) as {
    spells: Record<string, { classId: string }>;
};
const hunterSpellKeys = Object.entries(spells.spells)
    .filter(([, spell]) => spell.classId === 'mangrove_hunter')
    .flatMap(([id]) => [`spell.${id}.name`, `spell.${id}.description`]);
const ELEMENT_LABEL: Record<string, string> = {
    earth: 'tierra',
    fire: 'fuego',
    air: 'aire',
    water: 'agua',
    frost: 'hielo',
    lightning: 'rayo',
};
for (const c of Object.values(classes.classes))
    texts.set(c.affinity.map((e) => ELEMENT_LABEL[e] ?? e).join(' y '), 'data/rpg/classes.json');

function files(dir: string, ext: string, excluded: ReadonlySet<string>): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return excluded.has(entry.name) ? [] : files(path, ext, excluded);
        return path.endsWith(ext) ? [path] : [];
    });
}

function sourceStrings(): Set<string> {
    const found = new Set<string>();
    for (const file of files('src', '.ts', new Set(['fake']))) {
        const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
        const visit = (node: ts.Node): void => {
            if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) found.add(node.text);
            ts.forEachChild(node, visit);
        };
        visit(source);
    }
    return found;
}

function testTranslationStrings(): Set<string> {
    const found = new Set<string>();
    for (const file of files('tests', '.ts', new Set(['fixtures']))) {
        const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
        const visit = (node: ts.Node): void => {
            if (
                ts.isCallExpression(node) &&
                ts.isIdentifier(node.expression) &&
                (node.expression.text === 'tr' || node.expression.text === 'trf')
            ) {
                const input = node.arguments[0];
                if (input && (ts.isStringLiteral(input) || ts.isNoSubstitutionTemplateLiteral(input)))
                    found.add(input.text);
            }
            ts.forEachChild(node, visit);
        };
        visit(source);
    }
    return found;
}

afterEach(() => void setLanguage('es'));

describe('F07: inglés completo de los datos', () => {
    it('encuentra los textos de los datos (nombres, misiones, diálogos)', () => {
        expect(texts.size).toBeGreaterThan(500);
        expect(texts.has('Matón de la Tulivieja')).toBe(true);
        expect(texts.has('Mordisco a la pata')).toBe(true);
        expect(texts.has('Alzador del Guayacán')).toBe(true);
        expect(texts.has('Serena')).toBe(true);
        expect(texts.has('Corto')).toBe(true);
        expect(texts.has('se ríe')).toBe(true);
    });

    it('el 100 % tiene inglés', () => {
        const missing = [...texts].filter(([t]) => !hasTranslation('en', t)).map(([t, f]) => `${f}: ${t}`);
        expect(missing, `faltan en data/i18n/en.content.json:\n${missing.join('\n')}`).toEqual([]);
    });

    it('las traducciones no se quedan en español por descuido', () => {
        // Topónimos y nombres de persona se repiten a propósito; el resto debe cambiar.
        const same = [...texts.keys()].filter((t) => /\s/.test(t) && t.length > 30 && tr(t) === t);
        setLanguage('en');
        expect([...texts.keys()].filter((t) => /\s/.test(t) && t.length > 30 && tr(t) === t)).toEqual([]);
        expect(same.length).toBeGreaterThan(0);
    });

    it('traduce los textos compuestos parte a parte', () => {
        setLanguage('en');
        expect(tr('Cripta de la Tulivieja · piso 5')).toBe('Tulivieja Crypt · floor 5');
        expect(tr('Matón de la Tulivieja · niv. 4')).toBe('Tulivieja Thug · lv. 4');
        expect(tr('Llanos de Azuero · niv. 1–10')).toBe('Azuero Plains · lv. 1–10');
        expect(tr('Sato Cimarrón (niv. 3)')).toBe('Feral Mutt (lv. 3)');
        expect(tr('0 / 50 XP para el nivel 2')).toBe('0 / 50 XP to level 2');
        expect(tr('del Explorador (1/4)')).toBe("Explorer's Set (1/4)");
        expect(tr('(4) +5 Agilidad, +3 % Probabilidad de crítico')).toBe('(4) +5 Agility, +3 % Critical chance');
        expect(tr('da Leño de cedro · nv. 1')).toBe('gives Cedar log · lv. 1');
        expect(tr('🪓 Leñador')).toBe('🪓 Woodcutter');
        // Una frase con coma que está en la tabla se traduce entera, no a trozos.
        expect(tr('Terca, pero conoce todas las veredas.')).toBe('Stubborn, but it knows every trail.');
        setLanguage('es');
        expect(tr('Cripta de la Tulivieja · piso 5')).toBe('Cripta de la Tulivieja · piso 5');
    });

    it('traduce los roles y afinidades compuestos de las clases', () => {
        setLanguage('en');
        expect(tr('Cuerpo a cuerpo · fuego y tierra')).toBe('Melee · Fire and Earth');
        expect(tr('A distancia · rayo y hielo')).toBe('Ranged · Lightning and Ice');
        expect(tr('A distancia · aire y agua')).toBe('Ranged · Air and Water');
    });

    it('cubre claves de traducción comprobadas con plantillas e IDs dinámicos', () => {
        expect(hasTranslation('en', 'Tope: {cap} %')).toBe(true);
        for (const key of hunterSpellKeys) expect(hasTranslation('en', key), key).toBe(true);
    });

    it('no conserva claves de traducción sin texto fuente ni consumidor', () => {
        const used = new Set([
            ...sourceStrings(),
            ...testTranslationStrings(),
            ...texts.keys(),
            ...hunterSpellKeys,
        ]);
        const catalogKeys = new Set([en, enUi, enContent].flatMap((table) => Object.keys(table)));
        const orphan = [...catalogKeys].filter((key) => !key.startsWith('_') && !used.has(key));
        expect(orphan, `claves sin origen (${orphan.length}): ${orphan.slice(0, 40).join(' | ')}`).toEqual([]);
    });

    it('no da traducciones contradictorias a una misma clave', () => {
        const values = new Map<string, Set<string>>();
        for (const table of [en, enUi, enContent])
            for (const [key, value] of Object.entries(table)) {
                if (key.startsWith('_')) continue;
                const translations = values.get(key) ?? new Set<string>();
                translations.add(value);
                values.set(key, translations);
            }
        const conflicts = [...values]
            .filter(([, translations]) => translations.size > 1)
            .map(([key]) => key);
        expect(conflicts, `traducciones distintas: ${conflicts.join(' | ')}`).toEqual([]);
    });
});
