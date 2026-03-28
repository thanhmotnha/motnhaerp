export const fmtVND = (n) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n) || 0);

export const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('vi-VN') : '—';

export const daysOverdue = (dueDate) => {
    if (!dueDate) return 0;
    const diff = Date.now() - new Date(dueDate).getTime();
    return diff > 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : 0;
};

export const isOverdue = (dueDate) => daysOverdue(dueDate) > 0;
