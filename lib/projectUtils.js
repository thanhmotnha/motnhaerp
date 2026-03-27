// lib/projectUtils.js

export const fmtVND = (n) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n) || 0);

export const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('vi-VN') : '—';

export const milestoneStatus = (progress) => {
    const p = Number(progress);
    if (p === 100) return 'Hoàn thành';
    if (p > 0) return 'Đang làm';
    return 'Chưa bắt đầu';
};

export const calcPhaseAmounts = (phases, contractValue) => {
    const val = Number(contractValue) || 0;
    return phases.map(p => ({ ...p, amount: Math.round(val * p.pct / 100) }));
};

export const PAYMENT_TEMPLATES = {
    'Thiết kế': [
        { phase: 'Đặt cọc thiết kế', pct: 50, category: 'Thiết kế' },
        { phase: 'Nghiệm thu bản vẽ', pct: 50, category: 'Thiết kế' },
    ],
    'Thi công thô': [
        { phase: 'Đặt cọc thi công', pct: 30, category: 'Thi công' },
        { phase: 'Hoàn thiện móng + khung', pct: 30, category: 'Thi công' },
        { phase: 'Hoàn thiện xây thô', pct: 30, category: 'Thi công' },
        { phase: 'Nghiệm thu bàn giao thô', pct: 10, category: 'Thi công' },
    ],
    'Thi công hoàn thiện': [
        { phase: 'Đặt cọc hoàn thiện', pct: 30, category: 'Hoàn thiện' },
        { phase: 'Hoàn thiện trát + ốp lát', pct: 25, category: 'Hoàn thiện' },
        { phase: 'Hoàn thiện sơn + điện nước', pct: 25, category: 'Hoàn thiện' },
        { phase: 'Nghiệm thu bàn giao', pct: 20, category: 'Hoàn thiện' },
    ],
    'Nội thất': [
        { phase: 'Đặt cọc nội thất', pct: 50, category: 'Nội thất' },
        { phase: 'Giao hàng + lắp đặt', pct: 40, category: 'Nội thất' },
        { phase: 'Nghiệm thu hoàn thiện', pct: 10, category: 'Nội thất' },
    ],
};

export const CONTRACT_TYPES = ['Thiết kế', 'Thi công thô', 'Thi công hoàn thiện', 'Nội thất'];
