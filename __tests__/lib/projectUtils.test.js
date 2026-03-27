import { calcPhaseAmounts, milestoneStatus, fmtVND, fmtDate } from '@/lib/projectUtils';

describe('calcPhaseAmounts', () => {
    it('tính đúng số tiền từ % và giá trị HĐ', () => {
        const phases = [{ phase: 'Đặt cọc', pct: 30, category: 'Thi công' }];
        const result = calcPhaseAmounts(phases, 1000000);
        expect(result[0].amount).toBe(300000);
    });

    it('trả về 0 khi contractValue = 0', () => {
        const phases = [{ phase: 'Đặt cọc', pct: 30, category: 'Thi công' }];
        const result = calcPhaseAmounts(phases, 0);
        expect(result[0].amount).toBe(0);
    });
});

describe('milestoneStatus', () => {
    it('trả về Hoàn thành khi progress = 100', () => {
        expect(milestoneStatus(100)).toBe('Hoàn thành');
    });

    it('trả về Đang làm khi progress > 0', () => {
        expect(milestoneStatus(50)).toBe('Đang làm');
    });

    it('trả về Chưa bắt đầu khi progress = 0', () => {
        expect(milestoneStatus(0)).toBe('Chưa bắt đầu');
    });
});

describe('fmtVND', () => {
    it('format số thành VND', () => {
        expect(fmtVND(1000000)).toContain('1.000.000');
    });

    it('trả về 0 khi null/undefined', () => {
        expect(fmtVND(null)).toContain('0');
    });
});

describe('fmtDate', () => {
    it('format date thành dd/mm/yyyy', () => {
        const result = fmtDate('2025-01-15');
        expect(result).toMatch(/15\/1\/2025|15\/01\/2025|15-1-2025|15-01-2025/);
    });

    it('trả về — khi null', () => {
        expect(fmtDate(null)).toBe('—');
    });
});
