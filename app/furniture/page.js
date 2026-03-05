'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';
import Pagination from '@/components/ui/Pagination';

const STATUS_LABEL = {
    draft: 'Nháp', confirmed: 'Đã xác nhận', design_review: 'Chờ duyệt TK',
    design_approved: 'TK đã duyệt', material_confirmed: 'Đã chốt VL',
    in_production: 'Đang SX', qc_done: 'Đã QC', installing: 'Đang lắp',
    completed: 'Hoàn thành', cancelled: 'Đã hủy',
};
const STATUS_COLOR = {
    draft: 'muted', confirmed: 'info', design_review: 'warning',
    design_approved: 'info', material_confirmed: 'info',
    in_production: 'warning', qc_done: 'success', installing: 'warning',
    completed: 'success', cancelled: 'danger',
};

const fmtMoney = (v) => v?.toLocaleString('vi-VN') || '0';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

export default function FurniturePage() {
    const { role } = useRole();
    const router = useRouter();
    const toast = useToast();

    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('');
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 20 });
            if (status) params.set('status', status);
            if (search.trim()) params.set('search', search.trim());
            const data = await apiFetch(`/api/furniture-orders?${params}`);
            setOrders(data.data || []);
            setPagination(data.pagination || null);
        } catch (e) { toast.error(e.message); }
        setLoading(false);
    }, [page, status, search]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);
    useEffect(() => { setPage(1); }, [status, search]);

    // Stats
    const stats = {
        total: pagination?.total || 0,
        inProd: orders.filter(o => o.status === 'in_production').length,
        completed: orders.filter(o => o.status === 'completed').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
    };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h2 style={{ margin: 0 }}>Nội Thất May Đo</h2>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Quản lý đơn hàng nội thất tùy chỉnh</div>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Tạo đơn mới</button>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                {[
                    { label: 'Tổng đơn', value: stats.total, color: 'var(--accent-primary)' },
                    { label: 'Đang SX', value: stats.inProd, color: 'var(--status-warning)' },
                    { label: 'Hoàn thành', value: stats.completed, color: 'var(--status-success)' },
                    { label: 'Đã hủy', value: stats.cancelled, color: 'var(--status-danger)' },
                ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '12px 20px', flex: '0 0 auto' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="card">
                <div className="filter-bar">
                    <input className="form-input" placeholder="Tìm mã đơn, tên, khách hàng..." value={search}
                        onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
                    <select className="form-select" value={status} onChange={e => setStatus(e.target.value)} style={{ maxWidth: 180 }}>
                        <option value="">Tất cả trạng thái</option>
                        {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                </div>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : orders.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có đơn hàng nào</div>
                ) : (
                    <>
                        <table className="data-table">
                            <thead><tr>
                                <th>Mã đơn</th>
                                <th>Tên đơn hàng</th>
                                <th>Khách hàng</th>
                                <th>Dự án</th>
                                <th>Trạng thái</th>
                                <th>Tổng tiền</th>
                                <th>Items</th>
                                <th>Ngày giao</th>
                            </tr></thead>
                            <tbody>
                                {orders.map(order => {
                                    const activeItems = (order.items || []).filter(i => i.status !== 'cancelled');
                                    const cancelledItems = (order.items || []).filter(i => i.status === 'cancelled');
                                    return (
                                        <tr key={order.id} onClick={() => router.push(`/furniture/${order.id}`)}
                                            style={{ cursor: 'pointer' }}>
                                            <td style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: 13 }}>{order.code}</td>
                                            <td>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>{order.name}</div>
                                                {order.roomType && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{order.roomType}</div>}
                                            </td>
                                            <td>
                                                <div style={{ fontSize: 13 }}>{order.customer?.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{order.customer?.phone}</div>
                                            </td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {order.project ? order.project.code : <span style={{ fontStyle: 'italic' }}>Độc lập</span>}
                                            </td>
                                            <td>
                                                <span className={`badge ${STATUS_COLOR[order.status] || 'muted'}`}>
                                                    {STATUS_LABEL[order.status] || order.status}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 13 }}>{fmtMoney(order.confirmedAmount)}đ</td>
                                            <td style={{ fontSize: 12 }}>
                                                {activeItems.length} món
                                                {cancelledItems.length > 0 && <span style={{ color: 'var(--status-danger)', marginLeft: 4 }}>(-{cancelledItems.length})</span>}
                                            </td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(order.expectedDelivery)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <Pagination pagination={pagination} onPageChange={setPage} />
                    </>
                )}
            </div>

            {showCreate && <CreateOrderModal onClose={() => setShowCreate(false)} onCreated={(o) => { setShowCreate(false); router.push(`/furniture/${o.id}`); }} />}
        </div>
    );
}

function CreateOrderModal({ onClose, onCreated }) {
    const toast = useToast();
    const [form, setForm] = useState({ name: '', customerId: '', projectId: '', quotationId: '', description: '', styleNote: '', roomType: '', salesperson: '', designer: '' });
    const [customers, setCustomers] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        apiFetch('/api/customers?limit=200').then(d => setCustomers(d.data || [])).catch(() => {});
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.customerId) { toast.error('Vui lòng nhập tên đơn và chọn khách hàng'); return; }
        setSubmitting(true);
        try {
            const order = await apiFetch('/api/furniture-orders', { method: 'POST', body: JSON.stringify(form) });
            toast.success(`Đã tạo đơn ${order.code}`);
            onCreated(order);
        } catch (e) { toast.error(e.message); }
        setSubmitting(false);
    };

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Tạo đơn hàng nội thất mới</h3>
                    <button className="btn-close" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                            <label className="form-label">Tên đơn hàng *</label>
                            <input className="form-input" placeholder="VD: Nội thất phòng khách nhà anh Tuấn" value={form.name} onChange={set('name')} required />
                        </div>
                        <div>
                            <label className="form-label">Khách hàng *</label>
                            <select className="form-select" value={form.customerId} onChange={set('customerId')} required>
                                <option value="">-- Chọn khách hàng --</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <label className="form-label">Phong cách</label>
                                <input className="form-input" placeholder="Hiện đại, tân cổ điển..." value={form.styleNote} onChange={set('styleNote')} />
                            </div>
                            <div>
                                <label className="form-label">Phòng / khu vực</label>
                                <input className="form-input" placeholder="Phòng khách, bếp..." value={form.roomType} onChange={set('roomType')} />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <label className="form-label">Nhân viên tư vấn</label>
                                <input className="form-input" value={form.salesperson} onChange={set('salesperson')} />
                            </div>
                            <div>
                                <label className="form-label">Thiết kế viên</label>
                                <input className="form-input" value={form.designer} onChange={set('designer')} />
                            </div>
                        </div>
                        <div>
                            <label className="form-label">Mô tả yêu cầu</label>
                            <textarea className="form-input" rows={3} value={form.description} onChange={set('description')} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Đang tạo...' : 'Tạo đơn hàng'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
