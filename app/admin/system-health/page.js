'use client';
import { useState, useEffect } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/fetchClient';

const ACTION_COLOR = {
    CREATE: '#22c55e', create: '#22c55e',
    UPDATE: '#3b82f6', update: '#3b82f6',
    DELETE: '#ef4444', delete: '#ef4444',
    APPROVE: '#22c55e', approve: '#22c55e',
    REJECT: '#ef4444', reject: '#ef4444',
};

export default function SystemHealthPage() {
    const { role } = useRole();
    const router = useRouter();
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!role) return; // chờ role load
        if (role !== 'giam_doc') { router.replace('/'); return; }
        fetch('/api/admin/system-health', { credentials: 'include' })
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then(d => { setHealth(d); setLoading(false); })
            .catch(e => { setError(e.message); setLoading(false); });
    }, [role]);

    if (!role || loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Đang kiểm tra hệ thống...</div>;
    if (role !== 'giam_doc') return null;
    if (error) return <div style={{ padding: 40, color: 'var(--status-danger)' }}>Lỗi: {error}</div>;

    const fmtDate = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—';
    const latencyColor = health.dbLatency < 100 ? 'var(--status-success)' : health.dbLatency < 500 ? 'var(--status-warning)' : 'var(--status-danger)';

    const COUNTS = [
        { label: 'Dự án', value: health.counts.projects, icon: '🏗️' },
        { label: 'Khách hàng', value: health.counts.customers, icon: '👥' },
        { label: 'Hợp đồng', value: health.counts.contracts, icon: '📄' },
        { label: 'Báo giá', value: health.counts.quotations, icon: '📋' },
        { label: 'Đơn mua', value: health.counts.purchaseOrders, icon: '🛒' },
        { label: 'Nhân viên', value: health.counts.employees, icon: '👤' },
        { label: 'Phiếu CV', value: health.counts.workOrders, icon: '🔧' },
        { label: 'Tài khoản', value: health.counts.users, icon: '🔑' },
    ];

    const activityDays = Object.entries(health.activityByDay || {});
    const maxAct = Math.max(...activityDays.map(([, v]) => v), 1);

    return (
        <div>
            {/* Status banner */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
                <div className="card" style={{ padding: '14px 20px', flex: '0 0 auto' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Trạng thái DB</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--status-success)' }}>● Online</div>
                </div>
                <div className="card" style={{ padding: '14px 20px', flex: '0 0 auto' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>DB Latency</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: latencyColor }}>{health.dbLatency} ms</div>
                </div>
                <div className="card" style={{ padding: '14px 20px', flex: '0 0 auto' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>HĐ xấu 24h</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: health.errorLogs24h > 0 ? 'var(--status-warning)' : 'var(--status-success)' }}>
                        {health.errorLogs24h}
                    </div>
                </div>
                <div className="card" style={{ padding: '14px 20px', flex: '0 0 auto' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>HĐ 7 ngày</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-primary)' }}>{health.totalActivity7d}</div>
                </div>
                <div className="card" style={{ padding: '14px 20px', flex: '0 0 auto' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Kiểm tra lúc</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtDate(health.checkedAt)}</div>
                </div>
            </div>

            {/* Record counts */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header" style={{ padding: '14px 20px 0' }}>
                    <h3>Thống kê bản ghi</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, padding: 16 }}>
                    {COUNTS.map(c => (
                        <div key={c.label} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                            <div style={{ fontSize: 22, marginBottom: 4 }}>{c.icon}</div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-primary)' }}>{c.value.toLocaleString()}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Activity chart */}
                <div className="card">
                    <div className="card-header"><h3>Hoạt động 7 ngày qua</h3></div>
                    <div style={{ padding: '16px 20px' }}>
                        {activityDays.length === 0 ? (
                            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Không có dữ liệu</div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
                                {activityDays.map(([day, count]) => (
                                    <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{count}</div>
                                        <div style={{ width: '100%', background: 'var(--accent-primary)', opacity: 0.75, borderRadius: '3px 3px 0 0', height: `${(count / maxAct) * 70}px`, minHeight: 4 }} />
                                        <div style={{ fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{day}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent activity */}
                <div className="card">
                    <div className="card-header"><h3>Hoạt động gần đây</h3></div>
                    <div style={{ padding: '0 0 8px' }}>
                        {(health.recentLogs || []).map(log => (
                            <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: ACTION_COLOR[log.action] || '#888', flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>{log.actor || 'Hệ thống'}</span>
                                        {' · '}{log.action}{' · '}{log.entityType}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {log.entityLabel || log.entityId}
                                    </div>
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                                    {new Date(log.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        ))}
                        {(!health.recentLogs?.length) && (
                            <div style={{ padding: '20px 16px', color: 'var(--text-muted)', fontSize: 13 }}>Chưa có hoạt động nào</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
