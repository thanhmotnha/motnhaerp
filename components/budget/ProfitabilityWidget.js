'use client';
import { useState, useEffect } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(n) || 0));

export default function ProfitabilityWidget({ projectId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/budget/profitability?projectId=${projectId}`)
            .then(r => r.json())
            .then(setData)
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [projectId]);

    if (loading || !data) return null;

    const cards = [
        { label: 'Giá trị HĐ (A)', value: data.contractValue, color: 'var(--accent-primary)', icon: '📄' },
        { label: 'Tổng Dự toán (B)', value: data.budgetTotal, color: '#6366f1', icon: '📋' },
        { label: 'Đã chi (C)', value: data.totalSpent, color: '#f59e0b', icon: '💸' },
        { label: 'LN Mục tiêu (A-B)', value: data.targetProfit ?? 0, color: (data.targetProfit ?? 0) >= 0 ? '#10b981' : '#ef4444', icon: '🎯', sub: `${Number(data.targetMargin) || 0}%` },
        { label: 'LN Tạm tính', value: data.estimatedProfit ?? 0, color: (data.estimatedProfit ?? 0) >= 0 ? '#10b981' : '#ef4444', icon: '📊', sub: `${Number(data.estimatedMargin) || 0}%` },
    ];

    return (
        <div className="profitability-widget">
            {cards.map((c, i) => (
                <div key={i} className="profitability-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 16 }}>{c.icon}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{c.label}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: c.color, fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(c.value)}đ
                    </div>
                    {c.sub && <div style={{ fontSize: 12, color: c.color, fontWeight: 600, marginTop: 2 }}>{c.sub}</div>}
                </div>
            ))}
        </div>
    );
}
