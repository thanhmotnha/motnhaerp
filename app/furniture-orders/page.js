'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const STATUS_MAP = {
    draft: { label: 'Nháp', color: '#94a3b8', bg: '#f1f5f9' },
    confirmed: { label: 'Đã duyệt', color: '#3b82f6', bg: '#dbeafe' },
    in_production: { label: 'Đang SX', color: '#f59e0b', bg: '#fef3c7' },
    quality_check: { label: 'Kiểm QC', color: '#8b5cf6', bg: '#ede9fe' },
    ready: { label: 'Sẵn giao', color: '#10b981', bg: '#d1fae5' },
    delivered: { label: 'Đã giao', color: '#06b6d4', bg: '#cffafe' },
    completed: { label: 'Hoàn thành', color: '#22c55e', bg: '#dcfce7' },
    cancelled: { label: 'Đã hủy', color: '#ef4444', bg: '#fee2e2' },
};

export default function FurnitureOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [stats, setStats] = useState({ total: 0, totalValue: 0, inProduction: 0, delivered: 0 });
    const router = useRouter();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: '200' });
            if (search) params.set('search', search);
            if (filterStatus) params.set('status', filterStatus);
            const r = await fetch(`/api/furniture-orders?${params}`);
            const d = await r.json();
            const list = d.data || [];
            setOrders(list);
            setStats({
                total: d.total || list.length,
                totalValue: list.reduce((s, o) => s + (o.totalAmount || 0), 0),
                inProduction: list.filter(o => o.status === 'in_production').length,
                delivered: list.filter(o => o.status === 'delivered' || o.status === 'completed').length,
            });
        } catch { }
        setLoading(false);
    }, [search, filterStatus]);

    useEffect(() => { load(); }, [load]);

    return (
        <div>
            {/* Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 20 }}>
                <div className="stat-card"><div className="stat-icon">🪑</div><div><div className="stat-value">{stats.total}</div><div className="stat-label">Đơn nội thất</div></div></div>
                <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value">{fmt(stats.totalValue)}</div><div className="stat-label">Tổng giá trị</div></div></div>
                <div className="stat-card"><div className="stat-icon">🔧</div><div><div className="stat-value">{stats.inProduction}</div><div className="stat-label">Đang SX</div></div></div>
                <div className="stat-card"><div className="stat-icon">✅</div><div><div className="stat-value">{stats.delivered}</div><div className="stat-label">Đã giao/HT</div></div></div>
            </div>

            {/* Toolbar */}
            <div className="card" style={{ marginBottom: 20, padding: '12px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <input type="text" className="form-input" placeholder="🔍 Tìm mã, tên đơn..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
                    <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: 160 }}>
                        <option value="">Tất cả trạng thái</option>
                        {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
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
                            <th>Mã</th><th>Tên đơn</th><th>Khách hàng</th><th>Dự án</th>
                            <th>Trạng thái</th><th>Tổng tiền</th><th>Hạng mục</th>
                            <th>Giao hàng</th><th>Ngày tạo</th>
                        </tr></thead>
                        <tbody>{orders.map(o => {
                            const st = STATUS_MAP[o.status] || STATUS_MAP.draft;
                            return (
                                <tr key={o.id} onClick={() => router.push(`/furniture-orders/${o.id}`)} style={{ cursor: 'pointer' }}>
                                    <td className="accent">{o.code}</td>
                                    <td className="primary">{o.name}</td>
                                    <td>{o.customer?.name || '—'}</td>
                                    <td style={{ fontSize: 12 }}>{o.project?.name || '—'}</td>
                                    <td>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 12, background: st.bg, color: st.color }}>
                                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.color }} />{st.label}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{o.totalAmount > 0 ? fmt(o.totalAmount) : '—'}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        {o._count?.items || 0} SP · {o._count?.designs || 0} TK
                                    </td>
                                    <td style={{ fontSize: 12 }}>{fmtDate(o.expectedDelivery)}</td>
                                    <td style={{ fontSize: 12 }}>{fmtDate(o.createdAt)}</td>
                                </tr>
                            );
                        })}</tbody>
                    </table></div>
                    {orders.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Chưa có đơn nội thất nào</div>}
                </div>
            )}
        </div>
    );
}
