export function agingStatus(debt) {
    const balance = (debt.totalAmount || 0) - (debt.paidAmount || 0);
    if (balance <= 0) return { label: 'Đã trả', color: 'success', days: 0, category: 'paid' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (debt.dueDate) {
        const due = new Date(debt.dueDate);
        due.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today - due) / (1000 * 60 * 60 * 24));
        if (diffDays > 30) return { label: `Quá hạn ${diffDays} ngày`, color: 'danger', days: diffDays, category: 'overdue-30' };
        if (diffDays > 0) return { label: `Quá hạn ${diffDays} ngày`, color: 'warning', days: diffDays, category: 'overdue' };
        if (diffDays >= -7) return { label: `Sắp đến hạn (còn ${-diffDays}d)`, color: 'warning-light', days: diffDays, category: 'due-soon' };
        return { label: `Còn ${-diffDays} ngày`, color: 'neutral', days: diffDays, category: 'on-track' };
    }

    const created = new Date(debt.createdAt);
    created.setHours(0, 0, 0, 0);
    const ageDays = Math.floor((today - created) / (1000 * 60 * 60 * 24));
    return { label: `${ageDays} ngày tồn dư`, color: 'neutral', days: ageDays, category: 'no-due' };
}

export function matchesAgingFilter(debt, filter) {
    if (filter === 'all' || !filter) return true;
    const { category } = agingStatus(debt);
    if (filter === 'overdue-30') return category === 'overdue-30';
    if (filter === 'overdue') return category === 'overdue' || category === 'overdue-30';
    if (filter === 'due-soon') return category === 'due-soon';
    if (filter === 'on-track') return category === 'on-track' || category === 'no-due';
    return true;
}

export function agingBadgeStyle(color) {
    const map = {
        success: { background: 'rgba(34,197,94,0.15)', color: 'var(--status-success)' },
        danger: { background: 'rgba(239,68,68,0.2)', color: 'var(--status-danger)', fontWeight: 700 },
        warning: { background: 'rgba(245,158,11,0.2)', color: 'var(--status-warning)' },
        'warning-light': { background: 'rgba(234,179,8,0.15)', color: '#ca8a04' },
        neutral: { background: 'var(--bg-secondary)', color: 'var(--text-muted)' },
    };
    return map[color] || map.neutral;
}
