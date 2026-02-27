'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;

export default function PurchasingPage() {
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');

    useEffect(() => { fetch('/api/purchase-orders').then(r => r.json()).then(d => { setOrders(d); setLoading(false); }); }, []);

    const totalValue = orders.reduce((s, o) => s + o.totalAmount, 0);
    const totalPaid = orders.reduce((s, o) => s + o.paidAmount, 0);
    const statuses = ['Đang đặt', 'Đã xác nhận', 'Đang giao', 'Đã giao', 'Đã thanh toán'];

    const filtered = filterStatus ? orders.filter(o => o.status === filterStatus) : orders;

    return (
        <div>
            <h2 style={{ marginBottom: 24 }}>🛒 Mua sắm vật tư toàn công ty</h2>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 24 }}>
                <div className="stat-card"><div className="stat-icon">🛒</div><div><div className="stat-value">{orders.length}</div><div className="stat-label">Tổng đơn hàng</div></div></div>
                <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value">{fmt(totalValue)}</div><div className="stat-label">Tổng giá trị</div></div></div>
                <div className="stat-card"><div className="stat-icon">✅</div><div><div className="stat-value" style={{ color: 'var(--status-success)' }}>{fmt(totalPaid)}</div><div className="stat-label">Đã thanh toán</div></div></div>
                <div className="stat-card"><div className="stat-icon">📦</div><div><div className="stat-value" style={{ color: 'var(--status-warning)' }}>{orders.filter(o => o.status === 'Đang giao').length}</div><div className="stat-label">Đang giao</div></div></div>
                <div className="stat-card"><div className="stat-icon">⏳</div><div><div className="stat-value" style={{ color: 'var(--status-info)' }}>{orders.filter(o => o.status === 'Đang đặt').length}</div><div className="stat-label">Đang đặt</div></div></div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>Danh sách đơn mua hàng</h3>
                    <div className="filter-bar" style={{ margin: 0 }}>
                        <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="">Tất cả</option>
                            {statuses.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : (
                    <table className="data-table">
                        <thead><tr><th>Mã PO</th><th>NCC</th><th>Dự án</th><th>Tổng tiền</th><th>Đã TT</th><th>Số SP</th><th>Ngày đặt</th><th>Giao hàng</th><th>Trạng thái</th></tr></thead>
                        <tbody>{filtered.map(o => {
                            const rate = pct(o.paidAmount, o.totalAmount);
                            return (
                                <tr key={o.id} onClick={() => o.project && router.push(`/projects/${o.projectId}`)} style={{ cursor: 'pointer' }}>
                                    <td className="accent">{o.code}</td>
                                    <td className="primary">{o.supplier}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.supplierPhone}</div></td>
                                    <td><span className="badge info">{o.project?.code}</span></td>
                                    <td className="amount">{fmt(o.totalAmount)}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div className="progress-bar" style={{ flex: 1, maxWidth: 50 }}><div className="progress-fill" style={{ width: `${rate}%` }}></div></div>
                                            <span style={{ fontSize: 12 }}>{rate}%</span>
                                        </div>
                                    </td>
                                    <td>{o.items?.length || 0}</td>
                                    <td style={{ fontSize: 12 }}>{fmtDate(o.orderDate)}</td>
                                    <td style={{ fontSize: 12 }}>{fmtDate(o.deliveryDate)}</td>
                                    <td><span className={`badge ${o.status === 'Đã thanh toán' ? 'success' : o.status === 'Đã giao' ? 'info' : o.status === 'Đang giao' ? 'warning' : 'muted'}`}>{o.status}</span></td>
                                </tr>
                            );
                        })}</tbody>
                    </table>
                )}
                {!loading && filtered.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Không có dữ liệu</div>}
            </div>
        </div>
    );
}
