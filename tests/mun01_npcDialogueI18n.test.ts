// MUN-01: Que todos los PNJ con diálogo lo tengan en español y en inglés,
// y que ninguno quede mudo.
import { describe, it, expect } from 'vitest';
import npcsJson from '../data/rpg/npcs.json';
import merchantsJson from '../data/rpg/merchants.json';
import questsJson from '../data/rpg/quests.json';
import enContent from '../data/i18n/en.content.json';
import { setLanguage, tr, hasTranslation } from '../src/i18n';

const enKeys = Object.fromEntries(Object.entries(enContent).filter(([k]) => !k.startsWith('_')));
const merchants = merchantsJson.merchants ?? {};

function collectDialogueTexts(): Array<{ source: string; text: string }> {
    const out: Array<{ source: string; text: string }> = [];
    for (const [id, npc] of Object.entries(npcsJson.npcs)) {
        // Mismo parser que content.ts: "merchant": true → nombre de merchants[id].
        const npcRaw = npc as Record<string, unknown>;
        const mSource = npcRaw.merchant === true ? merchants[id as keyof typeof merchants] : undefined;
        const name = (npc as { name?: string }).name ?? mSource?.name;
        const title = (npc as { title?: string }).title ?? mSource?.title;
        if (name) out.push({ source: `npc.name.${id}`, text: name });
        if (title) out.push({ source: `npc.title.${id}`, text: title });
        if (npc.dialogue?.nodes) {
            for (const [nid, node] of Object.entries(npc.dialogue.nodes)) {
                out.push({ source: `npc.dialogue.${id}.${nid}`, text: node.text });
                for (const opt of node.options ?? []) {
                    out.push({ source: `npc.dialogue.${id}.${nid}.opt`, text: opt.text });
                }
            }
        }
    }
    // Misiones: textos que aparecen en diálogos.
    for (const [id, q] of Object.entries(questsJson.quests ?? {})) {
        out.push({ source: `quest.${id}.name`, text: q.name });
        out.push({ source: `quest.${id}.offer`, text: q.offerText });
        out.push({ source: `quest.${id}.progress`, text: q.progressText });
        out.push({ source: `quest.${id}.complete`, text: q.completeText });
        for (const o of q.objectives ?? []) {
            out.push({ source: `quest.${id}.obj`, text: o.text });
        }
    }
    return out;
}

function collectDynamicTexts(): string[] {
    // Textos que Conversation genera en código (src/rpg/quests.ts).
    return ['Volver', 'Acepto', 'Ahora no', 'Comerciar', 'Adiós'];
}

describe('MUN-01: PNJ con diálogo en español e inglés', () => {
    describe('cada texto de datos tiene traducción en en.content.json', () => {
        const texts = collectDialogueTexts();
        for (const { source, text } of texts) {
            it(`${source}: "${text.slice(0, 60)}"`, () => {
                expect(enKeys[text]).toBeDefined();
            });
        }
    });

    describe('textos dinámicos de Conversation tienen traducción', () => {
        for (const text of collectDynamicTexts()) {
            it(`"${text}"`, () => {
                expect(enKeys[text]).toBeDefined();
            });
        }
    });

    describe('tr() traduce correctamente al cambiar a inglés', () => {
        it('traduce los textos dinámicos', () => {
            setLanguage('en');
            expect(tr('Volver')).toBe('Back');
            expect(tr('Acepto')).toBe('I accept');
            expect(tr('Ahora no')).toBe('Not now');
            expect(tr('Comerciar')).toBe('Trade');
            expect(tr('Adiós')).toBe('Goodbye');
            setLanguage('es');
        });

        it('traduce los patrones Entregar: y Sobre «...»…', () => {
            setLanguage('en');
            // El patrón traduce "Entregar:" → "Turn in:" y también traduce el nombre de la misión.
            expect(tr('Entregar: Percas para la cena')).toBe('Turn in: Perch for Dinner');
            expect(tr('Sobre «Percas para la cena»…')).toBe('About «Perch for Dinner»…');
            setLanguage('es');
        });

        it('tr() devuelve el texto original en español', () => {
            setLanguage('es');
            const texts = collectDialogueTexts();
            for (const { text } of texts) {
                expect(tr(text)).toBe(text);
            }
        });

        it('tr() traduce un diálogo completo de un PNJ', () => {
            setLanguage('en');
            // fisher / Marina Junco — primer nodo hello.
            expect(tr('Marina Junco')).toBe('Marina Junco');
            expect(tr('Pescadora')).toBe('Fisher');
            expect(tr('El Charco de la Garza está al suroeste, pasado el boticario. Si el corcho tiembla, no tires: espera a que se hunda del todo.')).toBe(
                "Heron Pond is to the southwest, past the apothecary. If the float trembles, don't pull: wait until it sinks all the way.",
            );
            expect(tr('¿Cómo se pesca?')).toBe('How do I fish?');
            setLanguage('es');
        });

        it('hasTranslation() devuelve true para todos los textos de datos', () => {
            const texts = collectDialogueTexts();
            for (const { text } of texts) {
                expect(hasTranslation('en', text)).toBe(true);
            }
        });
    });

    describe('ningún PNJ queda mudo', () => {
        it('cada PNJ tiene nombre y al menos un nodo de diálogo', () => {
            for (const [id, npc] of Object.entries(npcsJson.npcs)) {
                // Mismo parser que content.ts: "merchant": true → nombre de merchants[id].
                const npcRaw = npc as Record<string, unknown>;
                const mSource = npcRaw.merchant === true ? merchants[id as keyof typeof merchants] : undefined;
                const name = (npc as { name?: string }).name ?? mSource?.name;
                expect(name, `${id}: sin nombre`).toBeDefined();
                // Todos los PNJ en npcs.json tienen diálogo (si no, no estarían aquí).
                expect(npc.dialogue?.nodes, `${id}: sin diálogo`).toBeDefined();
                expect(Object.keys(npc.dialogue!.nodes).length, `${id}: sin nodos`).toBeGreaterThan(0);
            }
        });
    });
});
