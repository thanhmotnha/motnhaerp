'use client';
import { useState } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n));

export default function BudgetLockBar({ projectId, budgetStatus, budgetTotal, budgetLockedAt, budgetLockedBy, onLocked }) {
    const [locking, setLocking] = useState(false);
    const isLocked = budgetStatus === 'locked';

    const handleLock = async () => {
        if (!confirm('Khóa dự toán? Sau khi khóa, mọi thay đổi cần phiếu điều chỉnh.')) return;
        setLocking(true);
        try {
            const res = await fetch('/api/budget/lock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, lockedBy: 'Admin' }),
            });
            if (res.ok) {
                const data = await res.json();
                onLocked?.(data);
            } else {
                const err = await res.json();
                alert(err.error || 'Lỗi khóa dự toán');
            }
        } catch { alert('Lỗi kết nối'); }
        setLocking(false);
    };

    return (
        <div className="budget-lock-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>{isLocked ? '🔒' : '📝'}</span>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                        Dự toán: <span style={{ color: isLocked ? 'var(--status-success)' : '#f59e0b' }}>{isLocked ? 'Đã khóa' : 'Nháp'}</span>
                    </div>
                    {isLocked && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Khóa bởi {budgetLockedBy || '—'} lúc {budgetLockedAt ? new Date(budgetLockedAt).toLocaleString('vi-VN') : '—'}
                        </div>
                    )}
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {budgetTotal > 0 && (
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tổng dự toán</div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent-primary)' }}>{fmt(budgetTotal)}đ</div>
                    </div>
                )}
                {!isLocked && (
                    <button className="btn btn-warning btn-sm" onClick={handleLock} disabled={locking}>
                        {locking ? '⏳' : '🔒'} Khóa dự toán
                    </button>
                )}
            </div>
        </div>
    );
}
