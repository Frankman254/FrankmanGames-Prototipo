// Textos compartidos por el diálogo, el diario y el seguimiento de misiones
// (Slice 06). Sin DOM: se puede testear.
import { tr } from '../../i18n';
import type { ContentDb, QuestRewardDef, QuestState, QuestView } from '../../rpg/contracts';

export const QUEST_STATE_LABEL_RAW: Record<QuestState, string> = {
    locked: 'Bloqueada',
    available: 'Disponible',
    active: 'En curso',
    ready: 'Por entregar',
    completed: 'Completada',
};

/** Etiqueta traducida del estado de una misión. */
export function questStateLabel(state: QuestState): string {
    return tr(QUEST_STATE_LABEL_RAW[state]);
}

/** Compatibilidad: el mismo objeto, sin traducir (para pruebas y datos). */
export const QUEST_STATE_LABEL: Record<QuestState, string> = QUEST_STATE_LABEL_RAW;

/** "40 XP · 12 monedas · Poción de vida menor ×3 · Hechizo: Ráfaga". */
export function rewardText(r: QuestRewardDef, content: Pick<ContentDb, 'items' | 'spells'>): string {
    const parts: string[] = [];
    if (r.xp > 0) parts.push(`${r.xp} XP`);
    if (r.gold > 0) parts.push(`${r.gold} ${tr('monedas')}`);
    for (const it of r.items)
        parts.push(`${content.items[it.itemId]?.name ?? it.itemId}${it.quantity > 1 ? ` ×${it.quantity}` : ''}`);
    if (r.learnSpell) parts.push(`${tr('Hechizo:')} ${content.spells[r.learnSpell]?.name ?? r.learnSpell}`);
    return parts.join(' · ') || tr('Nada más que las gracias');
}

/** "Lobos abatidos 2/3" (los de una sola vez, sin cifras). */
export function objectiveText(o: QuestView['objectives'][number]): string {
    return o.required > 1 ? `${o.text} ${o.current}/${o.required}` : o.text;
}

/** Línea de qué hacer ahora con una misión seguida. */
export function nextStepText(q: QuestView): string | null {
    if (q.state === 'ready') return `${tr('Entrégasela a')} ${q.turnIn.name}`;
    return null;
}
