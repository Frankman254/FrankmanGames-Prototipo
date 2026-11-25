import { describe, expect, it } from 'vitest';
import { formatClockTime, formatDecimal, formatInteger } from '../../src/ui/perfNumberFormat';

describe('formatDecimal', () => {
    it('preserves the requested decimal precision and native rounding', () => {
        expect(formatDecimal(12.345, 1)).toBe('12.3');
        expect(formatDecimal(12.345, 2)).toBe('12.35');
        expect(formatDecimal(60, 0)).toBe('60');
    });
});

describe('formatInteger', () => {
    it('rounds up health values and down resource values', () => {
        expect(formatInteger(10.1, 'ceil')).toBe('11');
        expect(formatInteger(10.9, 'floor')).toBe('10');
    });

    it('retains the direction of rounding for negative values', () => {
        expect(formatInteger(-1.1, 'ceil')).toBe('-1');
        expect(formatInteger(-1.1, 'floor')).toBe('-2');
    });
});

describe('formatClockTime', () => {
    it('floors elapsed seconds and pads single-digit seconds', () => {
        expect(formatClockTime(125.9)).toBe('2:05');
        expect(formatClockTime(9.9)).toBe('0:09');
    });
});
