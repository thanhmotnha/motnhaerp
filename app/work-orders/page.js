'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

export default function WorkOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const router = useRouter();

    const fetchOrders = () => { fetch('/api/work-orders?limit=1000').then(r => r.json()).then(d => { setOrders(d.data || []); setLoading(false); }); };
    useEffect(fetchOrders, []);

    const updateStatus = async (id, status) => {
        await fetch(`/api/work-orders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        fetchOrders();
    };

    const filtered = orders.filter(w => {
        if (filterStatus && w.status !== filterStatus) return false;
        if (filterPriority && w.priority !== filterPriority) return false;
        if (search && !w.title.toLowerCase().includes(search.toLowerCase()) && !w.code.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const pending = orders.filter(w => w.status === 'Chờ xử lý').length;
    const inProgress = orders.filter(w => w.status === 'Đang xử lý').length;
    const done = orders.filter(w => w.status === 'Hoàn thành').length;
    const highPriority = orders.filter(w => w.priority === 'Cao').length;

    return (
        <div>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon revenue">📋</span></div><div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{orders.length}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tổng phiếu</div></div>
                <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon quotations">⏳</span></div><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--status-warning)', marginTop: 8 }}>{pending}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chờ xử lý</div></div>
                <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon projects">🔄</span></div><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--status-info)', marginTop: 8 }}>{inProgress}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Đang xử lý</div></div>
                <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon customers">✅</span></div><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--status-success)', marginTop: 8 }}>{done}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Hoàn thành</div></div>
                <div className="stat-card"><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--status-danger)' }}>{highPriority}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ưu tiên cao</div></div>
            </div>

            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header"><span className="card-title">Phiếu công việc</span></div>
                <div className="filter-bar">
                    <input type="text" className="form-input" placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 250 }} />
                    <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">Tất cả TT</option><option>Chờ xử lý</option><option>Đang xử lý</option><option>Hoàn thành</option><option>Quá hạn</option>
                    </select>
                    <select className="form-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                        <option value="">Tất cả ưu tiên</option><option>Cao</option><option>Trung bình</option><option>Thấp</option>
                    </select>
                </div>
                {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : (
                    <table className="data-table">
                        <thead><tr><th>Mã</th><th>Tiêu đề</th><th>Dự án</th><th>Loại</th><th>Ưu tiên</th><th>Người thực hiện</th><th>Hạn</th><th>Trạng thái</th></tr></thead>
                        <tbody>{filtered.map(wo => (
                            <tr key={wo.id}>
                                <td className="accent">{wo.code}</td>
                                <td className="primary" style={{ cursor: 'pointer' }} onClick={() => wo.project && router.push(`/projects/${wo.projectId}`)}>{wo.title}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{wo.description}</div></td>
                                <td><span className="badge info">{wo.project?.code}</span> <span style={{ fontSize: 12 }}>{wo.project?.name}</span></td>
                                <td><span className="badge muted">{wo.category}</span></td>
                                <td><span className={`badge ${wo.priority === 'Cao' ? 'danger' : wo.priority === 'Trung bình' ? 'warning' : 'muted'}`}>{wo.priority}</span></td>
                                <td style={{ fontSize: 13 }}>{wo.assignee || '—'}</td>
                                <td style={{ fontSize: 12 }}>{fmtDate(wo.dueDate)}</td>
                                <td>
                                    <select value={wo.status} onChange={e => updateStatus(wo.id, e.target.value)} className="form-select" style={{ padding: '4px 28px 4px 8px', fontSize: 12, minWidth: 110 }}>
                                        <option>Chờ xử lý</option><option>Đang xử lý</option><option>Hoàn thành</option><option>Quá hạn</option>
                                    </select>
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
