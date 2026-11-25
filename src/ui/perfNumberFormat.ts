export function formatDecimal(value: number, digits: number): string {
    return value.toFixed(digits);
}

export function formatInteger(value: number, rounding: 'ceil' | 'floor'): string {
    return String(rounding === 'ceil' ? Math.ceil(value) : Math.floor(value));
}

export function formatClockTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
