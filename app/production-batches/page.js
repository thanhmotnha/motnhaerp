'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const ProductionCostTab = dynamic(() => import('@/components/ProductionCostTab'), { ssr: false });

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const STATUS_MAP = {
    pending: { label: 'Chờ SX', color: '#94a3b8', bg: '#f1f5f9', icon: '⏳' },
    in_progress: { label: 'Đang SX', color: '#f59e0b', bg: '#fef3c7', icon: '🔧' },
    completed: { label: 'Hoàn thành', color: '#22c55e', bg: '#dcfce7', icon: '✅' },
    quality_check: { label: 'Kiểm QC', color: '#8b5cf6', bg: '#ede9fe', icon: '🔍' },
    delivered: { label: 'Đã giao', color: '#06b6d4', bg: '#cffafe', icon: '🚚' },
    cancelled: { label: 'Hủy', color: '#ef4444', bg: '#fee2e2', icon: '❌' },
};
const KANBAN_COLS = ['pending', 'in_progress', 'quality_check', 'completed', 'delivered'];

const QC_MAP = {
    pending: { label: 'Chờ QC', color: '#94a3b8' },
    passed: { label: 'Đạt', color: '#22c55e' },
    failed: { label: 'Không đạt', color: '#ef4444' },
    rework: { label: 'Sửa lại', color: '#f59e0b' },
};

/* ── Kanban Card ────────────────────────────────────── */
function KanbanCard({ b, onMove, router }) {
    const st = STATUS_MAP[b.status] || STATUS_MAP.pending;
    const qc = QC_MAP[b.qualityStatus] || QC_MAP.pending;
    const nextMap = { pending: 'in_progress', in_progress: 'quality_check', quality_check: 'completed', completed: 'delivered' };
    const nextStatus = nextMap[b.status];
    return (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', marginBottom: 8, cursor: 'pointer', transition: 'box-shadow .15s', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
            onClick={() => b.furnitureOrder?.id && router.push(`/furniture-orders/${b.furnitureOrder.id}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-primary)' }}>{b.code}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: qc.color }}>{qc.label}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{b.furnitureOrder?.code || '—'} {b.furnitureOrder?.name || ''}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>🏭 {b.workshop?.name || '—'} · {b._count?.batchItems || 0} HM</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>📅 {fmtDate(b.expectedStart)} → {fmtDate(b.expectedEnd)}</div>
            {nextStatus && (
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '2px 8px', width: '100%' }}
                    onClick={e => { e.stopPropagation(); onMove(b.id, nextStatus); }}>
                    → {STATUS_MAP[nextStatus]?.label}
                </button>
            )}
        </div>
    );
}

/* ── Kanban Board ───────────────────────────────────── */
function KanbanBoard({ batches, onMove, router }) {
    return (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
            {KANBAN_COLS.map(col => {
                const st = STATUS_MAP[col];
                const items = batches.filter(b => b.status === col);
                return (
                    <div key={col} style={{ flex: '0 0 240px', minWidth: 220 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '6px 10px', borderRadius: 8, background: st.bg }}>
                            <span style={{ fontSize: 14 }}>{st.icon}</span>
                            <span style={{ fontWeight: 700, fontSize: 13, color: st.color }}>{st.label}</span>
                            <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: st.color, background: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: '0 8px' }}>{items.length}</span>
                        </div>
                        <div style={{ minHeight: 120, background: 'var(--bg-secondary)', borderRadius: 10, padding: 8 }}>
                            {items.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>Trống</div>}
                            {items.map(b => <KanbanCard key={b.id} b={b} onMove={onMove} router={router} />)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function ProductionBatchesPage() {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [viewMode, setViewMode] = useState('table'); // 'table' | 'kanban'
    const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0 });
    const [expandedId, setExpandedId] = useState(null);
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
                    {/* View mode toggle */}
                    <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <button className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`} style={{ borderRadius: 0, fontSize: 12 }} onClick={() => setViewMode('table')}>📋 Bảng</button>
                        <button className={`btn btn-sm ${viewMode === 'kanban' ? 'btn-primary' : 'btn-ghost'}`} style={{ borderRadius: 0, fontSize: 12 }} onClick={() => setViewMode('kanban')}>📊 Kanban</button>
                    </div>
                    <div style={{ flex: 1 }} />
                    <button className="btn btn-ghost" onClick={load}>↻ Làm mới</button>
                </div>
            </div>

            {loading ? <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : viewMode === 'kanban' ? (
                <KanbanBoard batches={batches} onMove={updateStatus} router={router} />
            ) : (
                /* Table */
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
                            return (<>
                                <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}>
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
                                {expandedId === b.id && (
                                    <tr key={`cost-${b.id}`}><td colSpan={9} style={{ padding: '16px 24px', background: 'var(--bg-secondary)' }}>
                                        <ProductionCostTab batchId={b.id} />
                                    </td></tr>
                                )}
                            </>);
                        })}</tbody>
                    </table></div>
                    {batches.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Chưa có lô sản xuất nào</div>}
                </div>
            )}
        </div>
    );
}
