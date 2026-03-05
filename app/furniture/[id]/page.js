'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

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
const STATUS_NEXT = {
    draft: 'confirmed', confirmed: 'design_review',
    design_approved: 'material_confirmed', material_confirmed: 'in_production',
    in_production: 'qc_done', qc_done: 'installing', installing: 'completed',
};
const STATUS_NEXT_LABEL = {
    draft: 'Xác nhận đơn', confirmed: 'Gửi duyệt TK',
    design_approved: 'Chốt vật liệu', material_confirmed: 'Mở lệnh SX',
    in_production: 'Chuyển QC', qc_done: 'Bắt đầu lắp',
    installing: 'Hoàn thành',
};

const fmtMoney = (v) => v?.toLocaleString('vi-VN') || '0';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—';

const TABS = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'items', label: 'Hạng mục' },
    { id: 'designs', label: 'Thiết kế' },
    { id: 'materials', label: 'Vật liệu' },
    { id: 'production', label: 'Sản xuất' },
    { id: 'payments', label: 'Thanh toán' },
    { id: 'handover', label: 'Bàn giao' },
];

export default function FurnitureDetailPage({ params }) {
    const { id } = params;
    const router = useRouter();
    const { role } = useRole();
    const toast = useToast();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');
    const [advancing, setAdvancing] = useState(false);

    const fetchOrder = useCallback(async () => {
        try {
            const data = await apiFetch(`/api/furniture-orders/${id}`);
            setOrder(data);
        } catch (e) { toast.error(e.message); }
        setLoading(false);
    }, [id]);

    useEffect(() => { fetchOrder(); }, [fetchOrder]);

    const advanceStatus = async () => {
        const next = STATUS_NEXT[order.status];
        if (!next) return;
        setAdvancing(true);
        try {
            await apiFetch(`/api/furniture-orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: next }) });
            toast.success(`Chuyển sang: ${STATUS_LABEL[next]}`);
            fetchOrder();
        } catch (e) { toast.error(e.message); }
        setAdvancing(false);
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;
    if (!order) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không tìm thấy đơn hàng</div>;

    const nextStatus = STATUS_NEXT[order.status];
    const isCancelled = order.status === 'cancelled';
    const activeItems = (order.items || []).filter(i => i.status !== 'cancelled');
    const paidPct = order.confirmedAmount > 0 ? Math.round((order.paidAmount / order.confirmedAmount) * 100) : 0;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <button className="btn btn-secondary" onClick={() => router.push('/furniture')} style={{ padding: '4px 10px', fontSize: 12 }}>← Danh sách</button>
                        <span style={{ fontWeight: 700, fontSize: 18 }}>{order.code}</span>
                        <span className={`badge ${STATUS_COLOR[order.status] || 'muted'}`}>{STATUS_LABEL[order.status] || order.status}</span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{order.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {order.customer?.name} · {order.customer?.phone}
                        {order.project && <> · Dự án: <strong>{order.project.code}</strong></>}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {nextStatus && !isCancelled && (
                        <button className="btn btn-primary" onClick={advanceStatus} disabled={advancing}>
                            {advancing ? 'Đang xử lý...' : STATUS_NEXT_LABEL[order.status]}
                        </button>
                    )}
                    {order.status === 'completed' && <span className="badge success" style={{ alignSelf: 'center' }}>Hoàn thành</span>}
                </div>
            </div>

            {/* Tabs */}
            <div className="tab-bar" style={{ marginBottom: 16 }}>
                {TABS.map(t => (
                    <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
                ))}
            </div>

            {tab === 'overview' && <OverviewTab order={order} paidPct={paidPct} onRefresh={fetchOrder} role={role} toast={toast} />}
            {tab === 'items' && <ItemsTab order={order} onRefresh={fetchOrder} toast={toast} role={role} />}
            {tab === 'designs' && <DesignsTab order={order} onRefresh={fetchOrder} toast={toast} role={role} />}
            {tab === 'materials' && <MaterialsTab order={order} onRefresh={fetchOrder} toast={toast} />}
            {tab === 'production' && <ProductionTab order={order} onRefresh={fetchOrder} toast={toast} role={role} />}
            {tab === 'payments' && <PaymentsTab order={order} onRefresh={fetchOrder} toast={toast} paidPct={paidPct} />}
            {tab === 'handover' && <HandoverTab order={order} onRefresh={fetchOrder} toast={toast} />}
        </div>
    );
}

/* ───────── Overview Tab ───────── */
function OverviewTab({ order, paidPct, onRefresh, role, toast }) {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
        name: order.name, description: order.description || '', styleNote: order.styleNote || '',
        roomType: order.roomType || '', deliveryAddress: order.deliveryAddress || '',
        salesperson: order.salesperson || '', designer: order.designer || '',
        expectedDelivery: order.expectedDelivery ? order.expectedDelivery.split('T')[0] : '',
        internalNote: order.internalNote || '',
    });
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            await apiFetch(`/api/furniture-orders/${order.id}`, { method: 'PUT', body: JSON.stringify(form) });
            toast.success('Đã lưu');
            setEditing(false);
            onRefresh();
        } catch (e) { toast.error(e.message); }
        setSaving(false);
    };

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
    const activeItems = (order.items || []).filter(i => i.status !== 'cancelled');

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Left: Info card */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ fontWeight: 600 }}>Thông tin đơn hàng</div>
                    {!editing
                        ? <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setEditing(true)}>Sửa</button>
                        : <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setEditing(false)}>Hủy</button>
                            <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={save} disabled={saving}>{saving ? '...' : 'Lưu'}</button>
                          </div>
                    }
                </div>
                {editing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div><label className="form-label">Tên đơn hàng</label><input className="form-input" value={form.name} onChange={set('name')} /></div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <div><label className="form-label">Phong cách</label><input className="form-input" value={form.styleNote} onChange={set('styleNote')} /></div>
                            <div><label className="form-label">Phòng/khu vực</label><input className="form-input" value={form.roomType} onChange={set('roomType')} /></div>
                            <div><label className="form-label">Tư vấn</label><input className="form-input" value={form.salesperson} onChange={set('salesperson')} /></div>
                            <div><label className="form-label">Thiết kế viên</label><input className="form-input" value={form.designer} onChange={set('designer')} /></div>
                        </div>
                        <div><label className="form-label">Ngày giao dự kiến</label><input type="date" className="form-input" value={form.expectedDelivery} onChange={set('expectedDelivery')} /></div>
                        <div><label className="form-label">Địa chỉ giao hàng</label><input className="form-input" value={form.deliveryAddress} onChange={set('deliveryAddress')} /></div>
                        <div><label className="form-label">Mô tả yêu cầu</label><textarea className="form-input" rows={2} value={form.description} onChange={set('description')} /></div>
                        <div><label className="form-label">Ghi chú nội bộ</label><textarea className="form-input" rows={2} value={form.internalNote} onChange={set('internalNote')} /></div>
                    </div>
                ) : (
                    <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: 13 }}>
                        {[
                            ['Mã đơn', order.code],
                            ['Khách hàng', `${order.customer?.name} (${order.customer?.phone})`],
                            ['Dự án', order.project ? `${order.project.code} — ${order.project.name}` : 'Độc lập'],
                            ['Báo giá', order.quotation ? order.quotation.code : '—'],
                            ['Phong cách', order.styleNote || '—'],
                            ['Phòng/khu vực', order.roomType || '—'],
                            ['Tư vấn', order.salesperson || '—'],
                            ['Thiết kế viên', order.designer || '—'],
                            ['Ngày tạo', fmtDate(order.createdAt)],
                            ['Ngày giao dự kiến', fmtDate(order.expectedDelivery)],
                            ['Ngày giao thực tế', fmtDate(order.deliveredAt)],
                            ['Địa chỉ', order.deliveryAddress || '—'],
                        ].map(([k, v]) => (
                            <><dt key={k} style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{k}</dt><dd key={k+'v'} style={{ margin: 0, fontWeight: v === '—' ? 400 : 500 }}>{v}</dd></>
                        ))}
                    </dl>
                )}
            </div>

            {/* Right: Finance card + description */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="card">
                    <div style={{ fontWeight: 600, marginBottom: 12 }}>Tài chính</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                        {[
                            { label: 'Tổng xác nhận', val: fmtMoney(order.confirmedAmount) + 'đ', color: 'var(--accent-primary)' },
                            { label: 'Đã hủy', val: fmtMoney(order.cancelledAmount) + 'đ', color: 'var(--status-danger)' },
                            { label: 'Đặt cọc', val: fmtMoney(order.depositAmount) + 'đ', color: 'var(--text-muted)' },
                            { label: 'Đã thanh toán', val: fmtMoney(order.paidAmount) + 'đ', color: 'var(--status-success)' },
                        ].map(({ label, val, color }) => (
                            <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 12px' }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                                <div style={{ fontWeight: 700, color }}>{val}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginBottom: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                            <span>Tiến độ thanh toán</span><span style={{ fontWeight: 600 }}>{paidPct}%</span>
                        </div>
                        <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${paidPct}%`, background: paidPct >= 100 ? 'var(--status-success)' : 'var(--accent-primary)', borderRadius: 4, transition: 'width 0.3s' }} />
                        </div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                        Còn lại: <strong style={{ color: 'var(--status-danger)' }}>{fmtMoney(order.confirmedAmount - order.paidAmount)}đ</strong>
                    </div>
                </div>

                <div className="card">
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>Tóm tắt hạng mục</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {[
                            { label: 'Tổng món', val: order.items?.length || 0 },
                            { label: 'Hoạt động', val: activeItems.length },
                            { label: 'Đã hủy', val: (order.items || []).filter(i => i.status === 'cancelled').length },
                        ].map(({ label, val }) => (
                            <div key={label} style={{ flex: 1, textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 0' }}>
                                <div style={{ fontSize: 20, fontWeight: 700 }}>{val}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {order.description && (
                    <div className="card">
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>Yêu cầu khách hàng</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{order.description}</div>
                    </div>
                )}
                {order.internalNote && (
                    <div className="card" style={{ borderLeft: '3px solid var(--status-warning)' }}>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>Ghi chú nội bộ</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{order.internalNote}</div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ───────── Items Tab ───────── */
function ItemsTab({ order, onRefresh, toast, role }) {
    const [showAdd, setShowAdd] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState({ name: '', unit: 'bộ', quantity: 1, unitPrice: 0, description: '', specs: '', notes: '' });
    const [saving, setSaving] = useState(false);

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    const addItem = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await apiFetch(`/api/furniture-orders/${order.id}/items`, {
                method: 'POST',
                body: JSON.stringify({ ...form, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) }),
            });
            toast.success('Đã thêm hạng mục');
            setShowAdd(false);
            setForm({ name: '', unit: 'bộ', quantity: 1, unitPrice: 0, description: '', specs: '', notes: '' });
            onRefresh();
        } catch (e) { toast.error(e.message); }
        setSaving(false);
    };

    const cancelItem = async (item) => {
        if (!confirm(`Hủy món "${item.name}"?`)) return;
        try {
            await apiFetch(`/api/furniture-orders/${order.id}/items?itemId=${item.id}`, { method: 'PUT', body: JSON.stringify({ status: 'cancelled', cancelReason: 'Hủy từ UI' }) });
            toast.success('Đã hủy hạng mục');
            onRefresh();
        } catch (e) { toast.error(e.message); }
    };

    const saveEdit = async () => {
        setSaving(true);
        try {
            await apiFetch(`/api/furniture-orders/${order.id}/items?itemId=${editItem.id}`, {
                method: 'PUT',
                body: JSON.stringify({ name: editItem.name, unit: editItem.unit, quantity: Number(editItem.quantity), unitPrice: Number(editItem.unitPrice), notes: editItem.notes }),
            });
            toast.success('Đã cập nhật');
            setEditItem(null);
            onRefresh();
        } catch (e) { toast.error(e.message); }
        setSaving(false);
    };

    const items = order.items || [];

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontWeight: 600 }}>Danh sách hạng mục ({items.length})</div>
                <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)} style={{ fontSize: 12, padding: '5px 12px' }}>+ Thêm hạng mục</button>
            </div>

            {showAdd && (
                <form onSubmit={addItem} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Hạng mục mới</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8 }}>
                        <div><label className="form-label">Tên hạng mục *</label><input className="form-input" required value={form.name} onChange={set('name')} /></div>
                        <div><label className="form-label">ĐVT</label><input className="form-input" value={form.unit} onChange={set('unit')} /></div>
                        <div><label className="form-label">Số lượng</label><input type="number" className="form-input" min={0} value={form.quantity} onChange={set('quantity')} /></div>
                        <div><label className="form-label">Đơn giá</label><input type="number" className="form-input" min={0} value={form.unitPrice} onChange={set('unitPrice')} /></div>
                    </div>
                    <div><label className="form-label">Ghi chú</label><input className="form-input" value={form.notes} onChange={set('notes')} /></div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" className="btn btn-primary" disabled={saving} style={{ fontSize: 12 }}>{saving ? '...' : 'Thêm'}</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)} style={{ fontSize: 12 }}>Hủy</button>
                    </div>
                </form>
            )}

            <table className="data-table">
                <thead><tr>
                    <th>#</th><th>Tên hạng mục</th><th>ĐVT</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th><th>Trạng thái</th><th></th>
                </tr></thead>
                <tbody>
                    {items.map((item, idx) => {
                        const isCancelled = item.status === 'cancelled';
                        const isEditing = editItem?.id === item.id;
                        return (
                            <tr key={item.id} style={{ opacity: isCancelled ? 0.5 : 1 }}>
                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{idx + 1}</td>
                                {isEditing ? (
                                    <>
                                        <td><input className="form-input" value={editItem.name} onChange={e => setEditItem(ei => ({ ...ei, name: e.target.value }))} style={{ minWidth: 180 }} /></td>
                                        <td><input className="form-input" value={editItem.unit} onChange={e => setEditItem(ei => ({ ...ei, unit: e.target.value }))} style={{ width: 60 }} /></td>
                                        <td><input type="number" className="form-input" value={editItem.quantity} onChange={e => setEditItem(ei => ({ ...ei, quantity: e.target.value }))} style={{ width: 70 }} /></td>
                                        <td><input type="number" className="form-input" value={editItem.unitPrice} onChange={e => setEditItem(ei => ({ ...ei, unitPrice: e.target.value }))} style={{ width: 100 }} /></td>
                                        <td style={{ fontSize: 13 }}>{fmtMoney(Number(editItem.quantity) * Number(editItem.unitPrice))}đ</td>
                                        <td></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="btn btn-primary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={saveEdit} disabled={saving}>Lưu</button>
                                                <button className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setEditItem(null)}>Hủy</button>
                                            </div>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td>
                                            <div style={{ fontWeight: 500, fontSize: 13, textDecoration: isCancelled ? 'line-through' : 'none' }}>{item.name}</div>
                                            {item.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.notes}</div>}
                                        </td>
                                        <td style={{ fontSize: 12 }}>{item.unit}</td>
                                        <td style={{ fontSize: 13 }}>{item.quantity}</td>
                                        <td style={{ fontSize: 13 }}>{fmtMoney(item.unitPrice)}đ</td>
                                        <td style={{ fontSize: 13, fontWeight: 600 }}>{fmtMoney(item.amount)}đ</td>
                                        <td>
                                            <span className={`badge ${isCancelled ? 'danger' : item.status === 'completed' ? 'success' : 'muted'}`} style={{ fontSize: 10 }}>
                                                {isCancelled ? 'Đã hủy' : item.status === 'completed' ? 'Xong' : 'Đang làm'}
                                            </span>
                                        </td>
                                        <td>
                                            {!isCancelled && (
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setEditItem({ ...item })}>Sửa</button>
                                                    <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px', color: 'var(--status-danger)' }} onClick={() => cancelItem(item)}>Hủy</button>
                                                </div>
                                            )}
                                        </td>
                                    </>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                        <td colSpan={5} style={{ fontSize: 13, textAlign: 'right', paddingRight: 12 }}>Tổng xác nhận</td>
                        <td style={{ fontSize: 14, color: 'var(--accent-primary)' }}>{fmtMoney(order.confirmedAmount)}đ</td>
                        <td colSpan={2}></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}

/* ───────── Designs Tab ───────── */
function DesignsTab({ order, onRefresh, toast, role }) {
    const [showUpload, setShowUpload] = useState(false);
    const [form, setForm] = useState({ fileUrl: '', versionLabel: '', description: '', renderImageUrl: '' });
    const [submitting, setSubmitting] = useState(false);
    const [approveForm, setApproveForm] = useState({ designId: null, action: '', customerFeedback: '', approvedByName: '', rejectionReason: '' });

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    const uploadDesign = async (e) => {
        e.preventDefault();
        if (!form.fileUrl) { toast.error('Nhập link file bản vẽ'); return; }
        setSubmitting(true);
        try {
            await apiFetch(`/api/furniture-orders/${order.id}/designs`, { method: 'POST', body: JSON.stringify(form) });
            toast.success('Đã tải lên bản vẽ mới');
            setShowUpload(false);
            setForm({ fileUrl: '', versionLabel: '', description: '', renderImageUrl: '' });
            onRefresh();
        } catch (e) { toast.error(e.message); }
        setSubmitting(false);
    };

    const handleApprove = async (designId, action) => {
        try {
            await apiFetch(`/api/furniture-orders/${order.id}/designs?designId=${designId}`, {
                method: 'PUT',
                body: JSON.stringify({ action, ...approveForm }),
            });
            toast.success(action === 'approve' ? 'Đã duyệt bản vẽ' : 'Đã từ chối bản vẽ');
            setApproveForm({ designId: null, action: '', customerFeedback: '', approvedByName: '', rejectionReason: '' });
            onRefresh();
        } catch (e) { toast.error(e.message); }
    };

    const DESIGN_STATUS = { draft: 'Nháp', submitted: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', superseded: 'Thay thế' };
    const DESIGN_COLOR = { draft: 'muted', submitted: 'warning', approved: 'success', rejected: 'danger', superseded: 'muted' };

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontWeight: 600 }}>Bản vẽ thiết kế ({order.designs?.length || 0})</div>
                <button className="btn btn-primary" onClick={() => setShowUpload(!showUpload)} style={{ fontSize: 12, padding: '5px 12px' }}>+ Upload bản vẽ</button>
            </div>

            {showUpload && (
                <form onSubmit={uploadDesign} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Upload bản vẽ mới</div>
                    <div><label className="form-label">Link file bản vẽ *</label><input className="form-input" placeholder="https://drive.google.com/..." value={form.fileUrl} onChange={set('fileUrl')} required /></div>
                    <div><label className="form-label">Link render 3D (nếu có)</label><input className="form-input" placeholder="https://..." value={form.renderImageUrl} onChange={set('renderImageUrl')} /></div>
                    <div><label className="form-label">Nhãn phiên bản</label><input className="form-input" placeholder="Bản vẽ v1" value={form.versionLabel} onChange={set('versionLabel')} /></div>
                    <div><label className="form-label">Ghi chú</label><textarea className="form-input" rows={2} value={form.description} onChange={set('description')} /></div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ fontSize: 12 }}>{submitting ? '...' : 'Upload'}</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowUpload(false)} style={{ fontSize: 12 }}>Hủy</button>
                    </div>
                </form>
            )}

            {(order.designs || []).length === 0
                ? <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có bản vẽ nào</div>
                : (order.designs || []).map(d => (
                    <div key={d.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                                <span style={{ fontWeight: 700, fontSize: 14 }}>v{d.versionNumber} — {d.versionLabel}</span>
                                <span className={`badge ${DESIGN_COLOR[d.status]}`} style={{ marginLeft: 8, fontSize: 10 }}>{DESIGN_STATUS[d.status]}</span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {fmtDateTime(d.createdAt)} · {d.submittedBy}
                            </div>
                        </div>
                        {d.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{d.description}</div>}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            {d.fileUrl && <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}>Xem bản vẽ</a>}
                            {d.renderImageUrl && <a href={d.renderImageUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}>Xem render 3D</a>}
                        </div>
                        {d.status === 'approved' && (
                            <div style={{ fontSize: 11, color: 'var(--status-success)' }}>
                                Duyệt bởi: {d.approvedByName} · {fmtDateTime(d.approvedAt)}
                                {d.customerFeedback && <div>Phản hồi KH: {d.customerFeedback}</div>}
                            </div>
                        )}
                        {d.status === 'rejected' && d.rejectionReason && (
                            <div style={{ fontSize: 11, color: 'var(--status-danger)' }}>Lý do từ chối: {d.rejectionReason}</div>
                        )}
                        {['submitted', 'draft'].includes(d.status) && (
                            approveForm.designId === d.id ? (
                                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ fontWeight: 600, fontSize: 12 }}>{approveForm.action === 'approve' ? 'Xác nhận duyệt' : 'Từ chối bản vẽ'}</div>
                                    <div><label className="form-label">Người duyệt</label><input className="form-input" value={approveForm.approvedByName} onChange={e => setApproveForm(f => ({ ...f, approvedByName: e.target.value }))} /></div>
                                    <div><label className="form-label">Phản hồi KH</label><textarea className="form-input" rows={2} value={approveForm.customerFeedback} onChange={e => setApproveForm(f => ({ ...f, customerFeedback: e.target.value }))} /></div>
                                    {approveForm.action === 'reject' && <div><label className="form-label">Lý do từ chối</label><textarea className="form-input" rows={2} value={approveForm.rejectionReason} onChange={e => setApproveForm(f => ({ ...f, rejectionReason: e.target.value }))} /></div>}
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button className={`btn btn-${approveForm.action === 'approve' ? 'primary' : 'secondary'}`} style={{ fontSize: 11, color: approveForm.action === 'reject' ? 'var(--status-danger)' : '' }} onClick={() => handleApprove(d.id, approveForm.action)}>
                                            {approveForm.action === 'approve' ? 'Xác nhận duyệt' : 'Từ chối'}
                                        </button>
                                        <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => setApproveForm({ designId: null, action: '', customerFeedback: '', approvedByName: '', rejectionReason: '' })}>Hủy</button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                    <button className="btn btn-primary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setApproveForm({ designId: d.id, action: 'approve', customerFeedback: '', approvedByName: '', rejectionReason: '' })}>Duyệt</button>
                                    <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px', color: 'var(--status-danger)' }} onClick={() => setApproveForm({ designId: d.id, action: 'reject', customerFeedback: '', approvedByName: '', rejectionReason: '' })}>Từ chối</button>
                                </div>
                            )
                        )}
                    </div>
                ))
            }
        </div>
    );
}

/* ───────── Materials Tab ───────── */
function MaterialsTab({ order, onRefresh, toast }) {
    const selections = order.materialSelections || [];
    const MSTATUS = { draft: 'Nháp', submitted: 'Chờ duyệt', confirmed: 'Đã chốt', rejected: 'Từ chối' };
    const MCOLOR = { draft: 'muted', submitted: 'warning', confirmed: 'success', rejected: 'danger' };

    return (
        <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 16 }}>Chọn vật liệu ({selections.length} đợt)</div>
            {selections.length === 0
                ? <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có đợt chọn vật liệu</div>
                : selections.map(sel => (
                    <div key={sel.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div style={{ fontWeight: 600 }}>Đợt {sel.selectionRound}</div>
                            <span className={`badge ${MCOLOR[sel.status]}`} style={{ fontSize: 10 }}>{MSTATUS[sel.status]}</span>
                        </div>
                        {sel.status === 'confirmed' && sel.confirmedByName && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Xác nhận bởi: {sel.confirmedByName}</div>
                        )}
                        {(sel.items || []).length > 0 && (
                            <table className="data-table" style={{ fontSize: 12 }}>
                                <thead><tr><th>Vật liệu</th><th>Mã màu</th><th>Ghi chú</th></tr></thead>
                                <tbody>
                                    {sel.items.map(mi => (
                                        <tr key={mi.id}>
                                            <td>{mi.materialName}{mi.product && <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>({mi.product.code})</span>}</td>
                                            <td>{mi.colorCode || '—'}</td>
                                            <td style={{ color: 'var(--text-muted)' }}>{mi.notes || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                ))
            }
        </div>
    );
}

/* ───────── Production Tab ───────── */
function ProductionTab({ order, onRefresh, toast, role }) {
    const [workshops, setWorkshops] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ workshopId: '', plannedStartDate: '', plannedEndDate: '', notes: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        apiFetch('/api/workshops').then(d => setWorkshops(Array.isArray(d) ? d : [])).catch(() => {});
    }, []);

    const createBatch = async (e) => {
        e.preventDefault();
        if (!form.workshopId) { toast.error('Chọn xưởng sản xuất'); return; }
        setSubmitting(true);
        try {
            await apiFetch('/api/production-batches', {
                method: 'POST',
                body: JSON.stringify({ furnitureOrderId: order.id, ...form }),
            });
            toast.success('Đã tạo lệnh sản xuất');
            setShowCreate(false);
            onRefresh();
        } catch (e) { toast.error(e.message); }
        setSubmitting(false);
    };

    const BSTATUS = { planned: 'Chờ', in_progress: 'Đang SX', paused: 'Tạm dừng', completed: 'Xong', cancelled: 'Hủy' };
    const BCOLOR = { planned: 'muted', in_progress: 'warning', paused: 'info', completed: 'success', cancelled: 'danger' };
    const batches = order.batches || [];

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontWeight: 600 }}>Lệnh sản xuất ({batches.length})</div>
                {['giam_doc', 'pho_gd', 'quan_ly_du_an'].includes(role) && (
                    <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)} style={{ fontSize: 12, padding: '5px 12px' }}>+ Tạo lệnh SX</button>
                )}
            </div>

            {showCreate && (
                <form onSubmit={createBatch} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Lệnh sản xuất mới</div>
                    <div><label className="form-label">Xưởng sản xuất *</label>
                        <select className="form-select" value={form.workshopId} onChange={e => setForm(f => ({ ...f, workshopId: e.target.value }))} required>
                            <option value="">-- Chọn xưởng --</option>
                            {workshops.map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div><label className="form-label">Ngày bắt đầu</label><input type="date" className="form-input" value={form.plannedStartDate} onChange={e => setForm(f => ({ ...f, plannedStartDate: e.target.value }))} /></div>
                        <div><label className="form-label">Ngày hoàn thành dự kiến</label><input type="date" className="form-input" value={form.plannedEndDate} onChange={e => setForm(f => ({ ...f, plannedEndDate: e.target.value }))} /></div>
                    </div>
                    <div><label className="form-label">Ghi chú</label><textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ fontSize: 12 }}>{submitting ? '...' : 'Tạo lệnh'}</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)} style={{ fontSize: 12 }}>Hủy</button>
                    </div>
                </form>
            )}

            {batches.length === 0
                ? <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có lệnh sản xuất nào</div>
                : batches.map(batch => (
                    <div key={batch.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{batch.code}</div>
                            <span className={`badge ${BCOLOR[batch.status]}`} style={{ fontSize: 10 }}>{BSTATUS[batch.status]}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                            Xưởng: <strong>{batch.workshop?.name || '—'}</strong>
                            {batch.plannedStartDate && <> · Bắt đầu: {fmtDate(batch.plannedStartDate)}</>}
                            {batch.plannedEndDate && <> · Hoàn thành: {fmtDate(batch.plannedEndDate)}</>}
                        </div>
                        {(batch.batchItems || []).length > 0 && (
                            <table className="data-table" style={{ fontSize: 12 }}>
                                <thead><tr><th>Hạng mục</th><th>Kế hoạch</th><th>Hoàn thành</th><th>QC Đạt</th><th>QC Lỗi</th></tr></thead>
                                <tbody>
                                    {batch.batchItems.map(bi => (
                                        <tr key={bi.id}>
                                            <td>{bi.furnitureOrderItem?.name}</td>
                                            <td>{bi.plannedQty}</td>
                                            <td>{bi.completedQty}</td>
                                            <td style={{ color: 'var(--status-success)' }}>{bi.qcPassedQty}</td>
                                            <td style={{ color: bi.qcFailedQty > 0 ? 'var(--status-danger)' : 'var(--text-muted)' }}>{bi.qcFailedQty}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                ))
            }
        </div>
    );
}

/* ───────── Payments Tab ───────── */
function PaymentsTab({ order, onRefresh, toast, paidPct }) {
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ amount: '', type: 'installment', method: 'bank_transfer', reference: '', note: '' });
    const [submitting, setSubmitting] = useState(false);

    const addPayment = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await apiFetch(`/api/furniture-orders/${order.id}/payments`, {
                method: 'POST',
                body: JSON.stringify({ ...form, amount: Number(form.amount) }),
            });
            toast.success('Đã ghi nhận thanh toán');
            setShowAdd(false);
            setForm({ amount: '', type: 'installment', method: 'bank_transfer', reference: '', note: '' });
            onRefresh();
        } catch (e) { toast.error(e.message); }
        setSubmitting(false);
    };

    const TYPE_LABEL = { deposit: 'Đặt cọc', installment: 'Thanh toán đợt', final: 'Thanh toán cuối', refund: 'Hoàn tiền' };
    const METHOD_LABEL = { cash: 'Tiền mặt', bank_transfer: 'Chuyển khoản', card: 'Thẻ' };
    const payments = order.payments || [];

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 600 }}>Lịch sử thanh toán</div>
                <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)} style={{ fontSize: 12, padding: '5px 12px' }}>+ Ghi nhận TT</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[
                    { label: 'Tổng đơn hàng', val: fmtMoney(order.confirmedAmount) + 'đ', color: 'var(--accent-primary)' },
                    { label: 'Đã thanh toán', val: fmtMoney(order.paidAmount) + 'đ', color: 'var(--status-success)' },
                    { label: 'Còn lại', val: fmtMoney(order.confirmedAmount - order.paidAmount) + 'đ', color: 'var(--status-danger)' },
                ].map(({ label, val, color }) => (
                    <div key={label} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 14px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
                        <div style={{ fontWeight: 700, color, fontSize: 15 }}>{val}</div>
                    </div>
                ))}
            </div>

            {showAdd && (
                <form onSubmit={addPayment} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Ghi nhận thanh toán mới</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        <div><label className="form-label">Số tiền *</label><input type="number" className="form-input" required min={0} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
                        <div><label className="form-label">Loại</label>
                            <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                                {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                        </div>
                        <div><label className="form-label">Phương thức</label>
                            <select className="form-select" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
                                {Object.entries(METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                        </div>
                    </div>
                    <div><label className="form-label">Số tham chiếu</label><input className="form-input" placeholder="Số GD ngân hàng..." value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} /></div>
                    <div><label className="form-label">Ghi chú</label><input className="form-input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ fontSize: 12 }}>{submitting ? '...' : 'Lưu'}</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)} style={{ fontSize: 12 }}>Hủy</button>
                    </div>
                </form>
            )}

            {payments.length === 0
                ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có thanh toán nào</div>
                : <table className="data-table">
                    <thead><tr><th>Ngày</th><th>Loại</th><th>Phương thức</th><th>Số tiền</th><th>Tham chiếu</th><th>Ghi chú</th></tr></thead>
                    <tbody>
                        {payments.map(p => (
                            <tr key={p.id}>
                                <td style={{ fontSize: 12 }}>{fmtDate(p.paidAt)}</td>
                                <td><span className="badge info" style={{ fontSize: 10 }}>{TYPE_LABEL[p.type] || p.type}</span></td>
                                <td style={{ fontSize: 12 }}>{METHOD_LABEL[p.method] || p.method}</td>
                                <td style={{ fontWeight: 700, color: p.type === 'refund' ? 'var(--status-danger)' : 'var(--status-success)', fontSize: 13 }}>
                                    {p.type === 'refund' ? '-' : ''}{fmtMoney(p.amount)}đ
                                </td>
                                <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.reference || '—'}</td>
                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.note || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                  </table>
            }
        </div>
    );
}

/* ───────── Handover Tab ───────── */
function HandoverTab({ order, onRefresh, toast }) {
    const tickets = order.warrantyTickets || [];
    const TSTATUS = { open: 'Mở', in_progress: 'Xử lý', resolved: 'Đã xử lý', closed: 'Đóng' };
    const TCOLOR = { open: 'warning', in_progress: 'info', resolved: 'success', closed: 'muted' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Handover info */}
            <div className="card">
                <div style={{ fontWeight: 600, marginBottom: 12 }}>Thông tin bàn giao</div>
                <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: 13 }}>
                    <dt style={{ color: 'var(--text-muted)' }}>Trạng thái đơn</dt>
                    <dd style={{ margin: 0 }}><span className={`badge ${STATUS_COLOR[order.status]}`}>{STATUS_LABEL[order.status]}</span></dd>
                    <dt style={{ color: 'var(--text-muted)' }}>Ngày giao thực tế</dt>
                    <dd style={{ margin: 0, fontWeight: 500 }}>{fmtDate(order.deliveredAt)}</dd>
                    <dt style={{ color: 'var(--text-muted)' }}>Ngày giao dự kiến</dt>
                    <dd style={{ margin: 0 }}>{fmtDate(order.expectedDelivery)}</dd>
                    {order.project && <>
                        <dt style={{ color: 'var(--text-muted)' }}>Công trình</dt>
                        <dd style={{ margin: 0 }}>{order.project.code} — sẵn sàng lắp: <strong style={{ color: order.project.siteReadyFlag ? 'var(--status-success)' : 'var(--status-danger)' }}>{order.project.siteReadyFlag ? 'Có' : 'Chưa'}</strong></dd>
                    </>}
                </dl>
            </div>

            {/* Warranty tickets */}
            <div className="card">
                <div style={{ fontWeight: 600, marginBottom: 12 }}>Phiếu bảo hành ({tickets.length})</div>
                {tickets.length === 0
                    ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có phiếu bảo hành nào</div>
                    : <table className="data-table">
                        <thead><tr><th>Mã phiếu</th><th>Mô tả</th><th>Trạng thái</th><th>Ngày tạo</th><th>Ngày xử lý</th></tr></thead>
                        <tbody>
                            {tickets.map(t => (
                                <tr key={t.id}>
                                    <td style={{ fontWeight: 600, fontSize: 12, color: 'var(--accent-primary)' }}>{t.code || t.id.slice(-6)}</td>
                                    <td style={{ fontSize: 13 }}>{t.description}</td>
                                    <td><span className={`badge ${TCOLOR[t.status]}`} style={{ fontSize: 10 }}>{TSTATUS[t.status] || t.status}</span></td>
                                    <td style={{ fontSize: 12 }}>{fmtDate(t.createdAt)}</td>
                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(t.resolvedAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                      </table>
                }
            </div>
        </div>
    );
}
