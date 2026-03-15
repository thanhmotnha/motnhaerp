'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const STATUS_MAP = {
    pending: { label: 'Chờ SX', color: '#94a3b8', bg: '#f1f5f9', icon: '⏳' },
    in_progress: { label: 'Đang SX', color: '#f59e0b', bg: '#fef3c7', icon: '🔧' },
    completed: { label: 'Hoàn thành', color: '#22c55e', bg: '#dcfce7', icon: '✅' },
    quality_check: { label: 'Kiểm QC', color: '#8b5cf6', bg: '#ede9fe', icon: '🔍' },
    delivered: { label: 'Đã giao', color: '#06b6d4', bg: '#cffafe', icon: '🚚' },
    cancelled: { label: 'Hủy', color: '#ef4444', bg: '#fee2e2', icon: '❌' },
};

const QC_MAP = {
    pending: { label: 'Chờ QC', color: '#94a3b8' },
    passed: { label: 'Đạt', color: '#22c55e' },
    failed: { label: 'Không đạt', color: '#ef4444' },
    rework: { label: 'Sửa lại', color: '#f59e0b' },
};

export default function ProductionBatchesPage() {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0 });
    const router = useRouter();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: '200' });
            if (filterStatus) params.set('status', filterStatus);
            const r = await fetch(`/api/production-batches?${params}`);
            const d = await r.json();
            const list = d.data || [];
            setBatches(list);
            setStats({
                total: d.total || list.length,
                pending: list.filter(b => b.status === 'pending').length,
                inProgress: list.filter(b => b.status === 'in_progress').length,
                completed: list.filter(b => b.status === 'completed' || b.status === 'delivered').length,
            });
        } catch { }
        setLoading(false);
    }, [filterStatus]);

    useEffect(() => { load(); }, [load]);

    const updateStatus = async (id, newStatus) => {
        await fetch(`/api/production-batches/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        });
        load();
    };

    return (
        <div>
            {/* Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 20 }}>
                <div className="stat-card"><div className="stat-icon">🏭</div><div><div className="stat-value">{stats.total}</div><div className="stat-label">Tổng lô SX</div></div></div>
                <div className="stat-card"><div className="stat-icon">⏳</div><div><div className="stat-value">{stats.pending}</div><div className="stat-label">Chờ SX</div></div></div>
                <div className="stat-card"><div className="stat-icon">🔧</div><div><div className="stat-value">{stats.inProgress}</div><div className="stat-label">Đang SX</div></div></div>
                <div className="stat-card"><div className="stat-icon">✅</div><div><div className="stat-value">{stats.completed}</div><div className="stat-label">Hoàn thành</div></div></div>
            </div>

            {/* Toolbar */}
            <div className="card" style={{ marginBottom: 20, padding: '12px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: 180 }}>
                        <option value="">Tất cả trạng thái</option>
                        {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                    </select>
                    <div style={{ flex: 1 }} />
                    <button className="btn btn-ghost" onClick={load}>↻ Làm mới</button>
                </div>
            </div>

            {/* Table */}
            {loading ? <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : (
                <div className="card">
                    <div className="table-container"><table className="data-table">
                        <thead><tr>
                            <th>Mã lô</th><th>Đơn nội thất</th><th>Xưởng</th>
                            <th>Trạng thái</th><th>QC</th><th>Hạng mục</th>
                            <th>Dự kiến</th><th>Thực tế</th><th>Hành động</th>
                        </tr></thead>
                        <tbody>{batches.map(b => {
                            const st = STATUS_MAP[b.status] || STATUS_MAP.pending;
                            const qc = QC_MAP[b.qualityStatus] || QC_MAP.pending;
                            return (
                                <tr key={b.id}>
                                    <td className="accent">{b.code}</td>
                                    <td className="primary" style={{ cursor: 'pointer' }} onClick={() => b.furnitureOrder?.id && router.push(`/furniture-orders/${b.furnitureOrder.id}`)}>
                                        {b.furnitureOrder?.code || '—'} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.furnitureOrder?.name || ''}</span>
                                    </td>
                                    <td style={{ fontSize: 12 }}>{b.workshop?.name || '—'}</td>
                                    <td>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 12, background: st.bg, color: st.color }}>
                                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.color }} />{st.label}
                                        </span>
                                    </td>
                                    <td><span style={{ fontSize: 11, fontWeight: 600, color: qc.color }}>{qc.label}</span></td>
                                    <td style={{ textAlign: 'center' }}>{b._count?.batchItems || 0}</td>
                                    <td style={{ fontSize: 12 }}>
                                        {fmtDate(b.expectedStart)}
                                        {b.expectedEnd && <> → {fmtDate(b.expectedEnd)}</>}
                                    </td>
                                    <td style={{ fontSize: 12 }}>
                                        {b.actualStart ? fmtDate(b.actualStart) : '—'}
                                        {b.actualEnd && <> → {fmtDate(b.actualEnd)}</>}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            {b.status === 'pending' && <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => updateStatus(b.id, 'in_progress')}>▶ Bắt đầu</button>}
                                            {b.status === 'in_progress' && <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => updateStatus(b.id, 'completed')}>✅ Xong</button>}
                                            {b.status === 'completed' && <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => updateStatus(b.id, 'delivered')}>🚚 Giao</button>}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}</tbody>
                    </table></div>
                    {batches.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Chưa có lô sản xuất nào</div>}
                </div>
            )}
        </div>
    );
}
