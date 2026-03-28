import { describe, it, expect } from 'vitest';
import { fmtVND, fmtDate, isOverdue, daysOverdue } from '@/lib/financeUtils';

describe('fmtVND', () => {
    it('formats number to VND', () => {
        expect(fmtVND(1000000)).toContain('1.000.000');
    });
    it('handles 0', () => {
        expect(fmtVND(0)).toContain('0');
    });
    it('handles null', () => {
        expect(fmtVND(null)).toContain('0');
    });
});

describe('fmtDate', () => {
    it('formats ISO date to vi-VN', () => {
        expect(fmtDate('2026-03-28T00:00:00Z')).toMatch(/\d+\/\d+\/\d+/);
    });
    it('returns — for null', () => {
        expect(fmtDate(null)).toBe('—');
    });
});

describe('daysOverdue', () => {
    it('returns positive number for past date', () => {
        const past = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
        expect(daysOverdue(past)).toBeGreaterThan(8);
    });
    it('returns 0 for future date', () => {
        const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
        expect(daysOverdue(future)).toBe(0);
    });
    it('returns 0 for null', () => {
        expect(daysOverdue(null)).toBe(0);
    });
});
