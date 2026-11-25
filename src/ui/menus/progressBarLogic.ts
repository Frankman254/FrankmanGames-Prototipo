export interface ProgressBarState {
    percent: number;
    text: string;
}

export function progressBarState(value: number, max: number, text = ''): ProgressBarState {
    const percent = max > 0 ? Math.max(0, Math.min(100, (100 * value) / max)) : 0;
    return { percent, text };
}