'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/fetchClient';

const STATUS_LABEL = {
    draft: 'Nháp', confirmed: 'Xác nhận', material_confirmed: 'Chốt VL',
    material_ordered: 'Đặt VL', cnc_ready: 'CNC',
    in_production: 'Sản xuất', installing: 'Lắp đặt',
    warranty: 'Bảo hành', cancelled: 'Hủy',
};
const STATUS_BADGE = {
    draft: 'secondary', confirmed: 'warning', material_confirmed: 'info',
    material_ordered: 'info', cnc_ready: 'info',
    in_production: 'warning', installing: 'warning',
    warranty: 'success', cancelled: 'danger',
};

export default function FurnitureTab({ projectId, project }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [form, setForm] = useState({ name: '', customerId: project?.customerId || '' });
    const [creating, setCreating] = useState(false);

    const fetchOrders = () => {
        apiFetch(`/api/furniture-orders?projectId=${projectId}&limit=50`)
            .then(d => setOrders(d.data || []))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchOrders(); }, [projectId]);

    const openCreate = async () => {
        if (customers.length === 0) {
            try {
                const res = await apiFetch('/api/customers?limit=500');
                setCustomers(res.data || []);
            } catch { setCustomers([]); }
        }
        // Pre-fill customer from project if available
        setForm({ name: '', customerId: project?.customerId || '' });
        setShowCreate(true);
    };

    const createOrder = async () => {
        if (!form.name.trim()) return alert('Nhập tên đơn hàng!');
        if (!form.customerId) return alert('Chọn khách hàng!');
        setCreating(true);
        try {
            const order = await apiFetch('/api/furniture-orders', {
                method: 'POST',
                body: { name: form.name, customerId: form.customerId, projectId },
            });
            setShowCreate(false);
            // Navigate to the new order
            window.location.href = `/noi-that/${order.id}`;
        } catch (err) {
            alert(err.message || 'Lỗi tạo đơn hàng');
        }
        setCreating(false);
    };

    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">🪵 Đơn hàng Nội thất</span>
                <button className="btn btn-sm btn-primary" onClick={openCreate}>+ Tạo đơn mới</button>
            </div>
            {loading ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : orders.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    Chưa có đơn hàng nội thất nào cho dự án này
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr><th>Mã</th><th>Tên đơn hàng</th><th>Trạng thái</th><th>Ngày tạo</th><th></th></tr>
                        </thead>
                        <tbody>
                            {orders.map(o => (
                                <tr key={o.id}>
                                    <td><code style={{ fontSize: 12 }}>{o.code}</code></td>
                                    <td>{o.name}</td>
                                    <td>
                                        <span className={`badge ${STATUS_BADGE[o.status] || 'secondary'}`}>
                                            {STATUS_LABEL[o.status] || o.status}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        {new Date(o.createdAt).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td>
                                        <a href={`/noi-that/${o.id}`} className="btn btn-ghost btn-sm">Chi tiết →</a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Inline create modal */}
            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Tạo đơn hàng nội thất</h3>
                            <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tên đơn hàng *</label>
                                <input className="form-input" autoFocus
                                    placeholder="VD: Nội thất phòng khách, Tủ bếp..."
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    onKeyDown={e => e.key === 'Enter' && createOrder()} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Khách hàng *</label>
                                <select className="form-input" value={form.customerId}
                                    onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}>
                                    <option value="">— Chọn khách hàng —</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: 4 }}>
                                Đơn hàng sẽ được tự động gắn vào dự án này.
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Hủy</button>
                                <button className="btn btn-primary" onClick={createOrder} disabled={creating}>
                                    {creating ? '⏳...' : 'Tạo & Mở đơn hàng'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
