'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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

function FurnitureOrderListContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '', customerId: '', projectId: searchParams.get('projectId') || '', quotationId: '' });
    const [customers, setCustomers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [quotations, setQuotations] = useState([]);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const qs = new URLSearchParams({ limit: '50' });
            if (search) qs.set('search', search);
            if (filterStatus) qs.set('status', filterStatus);
            if (searchParams.get('projectId')) qs.set('projectId', searchParams.get('projectId'));
            const data = await apiFetch(`/api/furniture-orders?${qs}`);
            setOrders(data.data || []);
            setTotal(data.pagination?.total || 0);
        } finally {
            setLoading(false);
        }
    }, [search, filterStatus, searchParams]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const openCreateModal = async () => {
        const fetches = [];
        if (customers.length === 0) fetches.push(apiFetch('/api/customers?limit=500').then(d => setCustomers(d.data || [])));
        if (projects.length === 0) fetches.push(apiFetch('/api/projects?limit=500').then(d => setProjects(d.data || [])));
        if (quotations.length === 0) fetches.push(apiFetch('/api/quotations?limit=500').then(d => setQuotations(d.data || [])));
        await Promise.all(fetches);
        setShowCreateModal(true);
    };

    const pickQuotation = (quotationId) => {
        const q = quotations.find(q => q.id === quotationId);
        setCreateForm(f => ({
            ...f,
            quotationId,
            customerId: q?.customerId || f.customerId,
            projectId: q?.projectId || f.projectId,
            name: q ? `Nội thất — ${q.code}` : f.name,
        }));
    };

    const createOrder = async () => {
        if (!createForm.name.trim()) return alert('Nhập tên đơn hàng!');
        if (!createForm.customerId) return alert('Chọn khách hàng!');
        try {
            const order = await apiFetch('/api/furniture-orders', {
                method: 'POST',
                body: {
                    name: createForm.name,
                    customerId: createForm.customerId,
                    projectId: createForm.projectId || null,
                    quotationId: createForm.quotationId || null,
                },
            });
            setShowCreateModal(false);
            router.push(`/noi-that/${order.id}`);
        } catch (err) {
            alert(err.message || 'Lỗi tạo đơn hàng');
        }
    };

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🪵 Đơn hàng Nội thất</h1>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{total} đơn hàng</div>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>+ Tạo đơn hàng</button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <input className="form-input" style={{ width: 260 }} placeholder="Tìm theo mã, tên..."
                    value={search} onChange={e => setSearch(e.target.value)} />
                <select className="form-input" style={{ width: 180 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">Tất cả trạng thái</option>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </div>

            <div className="card">
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : orders.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có đơn hàng nào</div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr><th>Mã</th><th>Tên đơn hàng</th><th>Khách hàng</th><th>Dự án</th><th>Trạng thái</th><th>Ngày tạo</th><th></th></tr>
                            </thead>
                            <tbody>
                                {orders.map(o => (
                                    <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/noi-that/${o.id}`)}>
                                        <td><code style={{ fontSize: 12 }}>{o.code}</code></td>
                                        <td style={{ fontWeight: 600 }}>{o.name}</td>
                                        <td style={{ fontSize: 13 }}>{o.customer?.name}</td>
                                        <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{o.project?.name}</td>
                                        <td>
                                            <span className={`badge ${STATUS_BADGE[o.status] || 'secondary'}`}>
                                                {STATUS_LABEL[o.status] || o.status}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {new Date(o.createdAt).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <a href={`/noi-that/${o.id}`} className="btn btn-ghost btn-sm">→</a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Tạo đơn hàng nội thất</h3>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Từ Báo giá (nếu có)</label>
                                <select className="form-input" value={createForm.quotationId}
                                    onChange={e => pickQuotation(e.target.value)}>
                                    <option value="">-- Không chọn --</option>
                                    {quotations.map(q => <option key={q.id} value={q.id}>{q.code}{q.customer?.name ? ` — ${q.customer.name}` : ''}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tên đơn hàng *</label>
                                <input className="form-input" placeholder="VD: Nội thất biệt thự Vinhomes" value={createForm.name}
                                    onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Khách hàng *</label>
                                <select className="form-input" value={createForm.customerId}
                                    onChange={e => setCreateForm({ ...createForm, customerId: e.target.value })}>
                                    <option value="">-- Chọn khách hàng --</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Dự án (nếu có)</label>
                                <select className="form-input" value={createForm.projectId}
                                    onChange={e => setCreateForm({ ...createForm, projectId: e.target.value })}>
                                    <option value="">-- Không gắn dự án --</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                                <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Hủy</button>
                                <button className="btn btn-primary" onClick={createOrder}>Tạo đơn hàng</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function FurnitureOrderListPage() {
    return (
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>}>
            <FurnitureOrderListContent />
        </Suspense>
    );
}
