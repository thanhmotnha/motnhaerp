import { describe, it, expect } from 'vitest';
import { fmt, fmtNumber, fmtDate, timeAgo } from '@/lib/format';

describe('fmt (currency)', () => {
    it('formats number as VND', () => {
        const result = fmt(1500000);
        expect(result).toContain('1.500.000');
    });

    it('handles null/undefined', () => {
        expect(fmt(null as any)).toBe('0 ₫');
        expect(fmt(undefined as any)).toBe('0 ₫');
    });

    it('handles zero', () => {
        const result = fmt(0);
        expect(result).toContain('0');
    });
});

describe('fmtNumber', () => {
    it('formats with thousand separators', () => {
        expect(fmtNumber(1234567)).toBe('1.234.567');
    });

    it('handles NaN', () => {
        expect(fmtNumber(NaN)).toBe('0');
    });
});

describe('fmtDate', () => {
    it('formats date string', () => {
        const result = fmtDate('2025-06-15');
        expect(result).toMatch(/15/);
        expect(result).toMatch(/06/);
        expect(result).toMatch(/2025/);
    });

    it('handles empty string', () => {
        expect(fmtDate('')).toBe('');
    });

    it('handles null', () => {
        expect(fmtDate(null as any)).toBe('');
    });
});

describe('timeAgo', () => {
    it('returns empty for null', () => {
        expect(timeAgo(null as any)).toBe('');
    });

    it('returns "Vừa xong" for recent dates', () => {
        expect(timeAgo(new Date().toISOString())).toBe('Vừa xong');
    });

    it('returns minutes ago', () => {
        const d = new Date(Date.now() - 5 * 60000);
        expect(timeAgo(d.toISOString())).toBe('5 phút trước');
    });

    it('returns hours ago', () => {
        const d = new Date(Date.now() - 3 * 3600000);
        expect(timeAgo(d.toISOString())).toBe('3 giờ trước');
    });

    it('returns days ago', () => {
        const d = new Date(Date.now() - 7 * 86400000);
        expect(timeAgo(d.toISOString())).toBe('7 ngày trước');
    });
});
