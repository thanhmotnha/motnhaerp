'use client';
import { useState, useEffect } from 'react';

const fmt = (n) => Number(n || 0).toLocaleString('vi-VN') + '₫';

export default function BudgetAlertBanner({ projectId }) {
    const [alert, setAlert] = useState(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (!projectId) return;
        fetch(`/api/budget/alerts?projectId=${projectId}`)
            .then(r => r.json())
            .then(d => setAlert(d))
            .catch(() => null);
    }, [projectId]);

    if (!alert?.hasAlert || dismissed) return null;

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(249,115,22,0.06))',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 12,
            animation: 'fadeIn 0.3s ease',
        }}>
            <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(239,68,68,0.15)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                fontSize: 18,
            }}>⚠️</div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#dc2626', marginBottom: 2 }}>
                    Vượt dự toán {alert.overshootPct}%
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Thực chi <strong>{fmt(alert.totalActual)}</strong> / Dự toán <strong>{fmt(alert.lockedBudget)}</strong>
                    {' '}— Vượt <strong style={{ color: '#dc2626' }}>{fmt(alert.overspend)}</strong>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    Vật tư: {fmt(alert.breakdown?.material)} · Thầu phụ: {fmt(alert.breakdown?.contractor)} · Chi phí: {fmt(alert.breakdown?.expense)}
                </div>
            </div>

            <button
                onClick={() => setDismissed(true)}
                style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: 16, padding: 4, flexShrink: 0,
                }}
            >×</button>
        </div>
    );
}
