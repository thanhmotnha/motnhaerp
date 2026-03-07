'use client';
import { useState } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { fmtMoney } from './constants';

export default function ItemsTab({ order, onRefresh, toast, role }) {
    const [showAdd, setShowAdd] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [form, setForm] = useState({ name: '', unit: 'bộ', quantity: 1, unitPrice: 0, description: '', specs: '', notes: '' });
    const [saving, setSaving] = useState(false);
    const [showQPicker, setShowQPicker] = useState(false);
    const [qItems, setQItems] = useState([]);
    const [qItemSel, setQItemSel] = useState({});
    const [loadingQ, setLoadingQ] = useState(false);
    const [importingQ, setImportingQ] = useState(false);

    const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    const loadQuotationItems = async () => {
        if (!order.quotationId) return;
        setLoadingQ(true);
        try {
            const q = await apiFetch(`/api/quotations/${order.quotationId}`);
            const allItems = [];
            (q.categories || []).forEach(cat => {
                (cat.items || []).forEach(item => allItems.push({ ...item, categoryName: cat.name }));
            });
            setQItems(allItems);
        } catch (e) { toast.error(e.message); }
        setLoadingQ(false);
    };

    const importFromQuotation = async () => {
        const selected = qItems.filter(it => qItemSel[it.id]);
        if (!selected.length) { toast.error('Chọn ít nhất 1 hạng mục'); return; }
        setImportingQ(true);
        try {
            for (const item of selected) {
                await apiFetch(`/api/furniture-orders/${order.id}/items`, {
                    method: 'POST',
                    body: JSON.stringify({ name: item.name, unit: item.unit || 'bộ', quantity: item.quantity || 1, unitPrice: item.unitPrice || 0, description: item.description || '' }),
                });
            }
            toast.success(`Đã import ${selected.length} hạng mục từ báo giá`);
            setShowQPicker(false);
            setQItemSel({});
            onRefresh();
        } catch (e) { toast.error(e.message); }
        setImportingQ(false);
    };

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
                <div style={{ display: 'flex', gap: 8 }}>
                    {order.quotationId && (
                        <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }}
                            onClick={() => { setShowQPicker(!showQPicker); if (!showQPicker && !qItems.length) loadQuotationItems(); }}>
                            Chọn từ báo giá
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)} style={{ fontSize: 12, padding: '5px 12px' }}>+ Thêm hạng mục</button>
                </div>
            </div>

            {showQPicker && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Chọn hạng mục từ báo giá {order.quotation?.code}</div>
                    {loadingQ ? (
                        <div style={{ color: 'var(--text-muted)', padding: 12 }}>Đang tải...</div>
                    ) : qItems.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>Báo giá không có hạng mục nào</div>
                    ) : (
                        <>
                            <table className="data-table" style={{ fontSize: 12, marginBottom: 10 }}>
                                <thead><tr><th style={{ width: 32 }}></th><th>Hạng mục</th><th>Nhóm</th><th>ĐVT</th><th>SL</th><th>Đơn giá</th></tr></thead>
                                <tbody>
                                    {qItems.map(it => (
                                        <tr key={it.id} style={{ cursor: 'pointer' }} onClick={() => setQItemSel(s => ({ ...s, [it.id]: !s[it.id] }))}>
                                            <td><input type="checkbox" checked={!!qItemSel[it.id]} readOnly /></td>
                                            <td style={{ fontWeight: 500 }}>{it.name}</td>
                                            <td style={{ color: 'var(--text-muted)' }}>{it.categoryName}</td>
                                            <td>{it.unit || '—'}</td>
                                            <td>{it.quantity}</td>
                                            <td>{fmtMoney(it.unitPrice)}đ</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={importFromQuotation}
                                    disabled={importingQ || !Object.values(qItemSel).some(Boolean)}>
                                    {importingQ ? 'Đang import...' : `Import ${Object.values(qItemSel).filter(Boolean).length} hạng mục`}
                                </button>
                                <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => { setShowQPicker(false); setQItemSel({}); }}>Đóng</button>
                            </div>
                        </>
                    )}
                </div>
            )}

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
                    <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border-color)' }}>
                        <td colSpan={5} style={{ fontSize: 13, textAlign: 'right', paddingRight: 12 }}>Tổng xác nhận</td>
                        <td style={{ fontSize: 14, color: 'var(--accent-primary)' }}>{fmtMoney(order.confirmedAmount)}đ</td>
                        <td colSpan={2}></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
