import { tr } from '../../i18n';
import type { ContentDb, QuestView } from '../../rpg/contracts';
import { nextStepText, objectiveText, questStateLabel, rewardText } from './questFormat';

export function questJournalSections(quests: QuestView[]): { open: QuestView[]; done: QuestView[] } {
    return {
        open: quests.filter((q) => q.state === 'active' || q.state === 'ready'),
        done: quests.filter((q) => q.state === 'completed'),
    };
}

export interface QuestJournalText {
    name: string;
    chain: string | null;
    summary: string;
    state: string;
    objectives: { text: string; done: boolean }[];
    meta: string;
    reward: string;
}

export function questJournalText(q: QuestView, content: Pick<ContentDb, 'items' | 'spells'>): QuestJournalText {
    const meta =
        q.state === 'ready'
            ? `${tr('Entrégasela a')} ${q.turnIn.name}`
            : `${tr('Encargo de')} ${q.giver.name}${q.turnIn.id !== q.giver.id ? ` · ${tr('se entrega a')} ${q.turnIn.name}` : ''}`;

    return {
        name: q.name,
        chain: q.chain,
        summary: q.summary,
        state: questStateLabel(q.state),
        objectives: q.objectives.map((o) => ({ text: objectiveText(o), done: o.done })),
        meta,
        reward: `${tr('Recompensa:')} ${rewardText(q.rewards, content)}`,
    };
}

export interface QuestTrackerPresentation {
    key: string;
    name: string;
    objectives: { text: string; done: boolean }[];
    next: string | null;
}

export function questTrackerPresentation(q: QuestView): QuestTrackerPresentation {
    return {
        key: `${q.id}|${q.state}|${q.objectives.map((o) => o.current).join(',')}`,
        name: q.name,
        objectives: q.objectives.map((o) => ({ text: objectiveText(o), done: o.done })),
        next: nextStepText(q),
    };
}
