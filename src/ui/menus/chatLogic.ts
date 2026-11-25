import type { ChatLine } from '../chatLog';

export interface ChatFilters {
    combat: boolean;
    loot: boolean;
    system: boolean;
}

export function chatLineMatchesView(channel: string | null, line: ChatLine, filters: ChatFilters): boolean {
    if (channel !== null && line.channel !== channel) return false;
    const category = line.category ?? 'system';
    return category === 'combat' ? filters.combat : category === 'loot' ? filters.loot : filters.system;
}
