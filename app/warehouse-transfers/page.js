'use client';
import { useState, useEffect, useCallback } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const STATUS_MAP = {
    'Chờ duyệt': { color: '#f59e0b', bg: '#fef3c7' },
    'Đã chuyển': { color: '#22c55e', bg: '#dcfce7' },
    'Huỷ': { color: '#ef4444', bg: '#fee2e2' },
};

const EMPTY_FORM = {
    fromWarehouseId: '', toWarehouseId: '', productId: '',
    quantity: '', notes: '',
};

export default function WarehouseTransfersPage() {
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [filterStatus, setFilterStatus] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const p = new URLSearchParams();
            if (filterStatus) p.set('status', filterStatus);
            const r = await fetch(`/api/warehouses/transfers?${p}`);
            const d = await r.json();
            setTransfers(Array.isArray(d) ? d : (d.data || []));
        } catch {}
        setLoading(false);
    }, [filterStatus]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        fetch('/api/warehouses?limit=100').then(r => r.json()).then(d => setWarehouses(d.data || []));
        fetch('/api/inventory/stock').then(r => r.json()).then(d => setProducts(d.products || []));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.fromWarehouseId || !form.toWarehouseId || !form.productId || !form.quantity) return;
        if (form.fromWarehouseId === form.toWarehouseId) return alert('Kho nguồn và kho đích phải khác nhau');
        setSaving(true);
        try {
            const res = await fetch('/api/warehouses/transfers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, quantity: Number(form.quantity) }),
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Lỗi tạo phiếu chuyển kho');
                setSaving(false);
                return;
            }
            setShowForm(false);
            setForm(EMPTY_FORM);
            load();
        } catch {}
        setSaving(false);
    };

    const approve = async (id) => {
        const res = await fetch(`/api/warehouses/transfers/${id}/approve`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Đã chuyển' }),
        });
        if (!res.ok) { const e = await res.json(); return alert(e.error || 'Lỗi duyệt'); }
        load();
    };

    const cancel = async (id) => {
        if (!confirm('Huỷ phiếu chuyển kho này?')) return;
        const res = await fetch(`/api/warehouses/transfers/${id}/approve`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Huỷ' }),
        });
        if (!res.ok) { const e = await res.json(); return alert(e.error || 'Lỗi huỷ'); }
        load();
    };

    const removeTransfer = async (id) => {
        if (!confirm('Xóa phiếu chuyển kho này?')) return;
        const res = await fetch(`/api/warehouses/transfers/${id}`, { method: 'DELETE' });
        if (!res.ok) { const e = await res.json(); return alert(e.error || 'Lỗi xóa'); }
        load();
    };

    const printTransfer = (t) => {
        const win = window.open('', '_blank');
        win.document.write(`
            <html><head><title>Phiếu chuyển kho ${t.code}</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 13px; padding: 24px; color: #000; }
                h2 { text-align: center; margin: 0 0 4px; }
                .sub { text-align: center; color: #555; margin-bottom: 16px; }
                .info { margin: 10px 0; }
                table { width: 100%; border-collapse: collapse; margin: 12px 0; }
                th, td { border: 1px solid #999; padding: 6px 10px; text-align: left; }
                th { background: #f5f5f5; font-weight: 600; }
                .sign { display: flex; justify-content: space-between; margin-top: 40px; }
                .sign div { text-align: center; width: 200px; }
                @media print { button { display: none; } }
            </style></head><body>
            <h2>PHIẾU CHUYỂN KHO</h2>
            <div class="sub">Mã: ${t.code} | Ngày: ${fmtDate(t.transferDate || t.createdAt)} | Trạng thái: ${t.status}</div>
            <div class="info"><strong>Từ kho:</strong> ${t.fromWarehouse?.name || '—'} &nbsp;&nbsp; <strong>Đến kho:</strong> ${t.toWarehouse?.name || '—'}</div>
            ${t.createdBy ? `<div class="info"><strong>Người lập:</strong> ${t.createdBy}</div>` : ''}
            ${t.notes ? `<div class="info"><strong>Ghi chú:</strong> ${t.notes}</div>` : ''}
            <table>
                <thead><tr><th>#</th><th>Sản phẩm</th><th>Mã SP</th><th>Số lượng</th></tr></thead>
                <tbody>
                    <tr>
                        <td>1</td>
                        <td>${t.product?.name || '—'}</td>
                        <td>${t.product?.code || '—'}</td>
                        <td style="text-align:right">${fmt(t.quantity)}</td>
                    </tr>
                </tbody>
            </table>
            <div class="sign">
                <div><p>Người lập phiếu</p><br><br><small>(Ký, ghi rõ họ tên)</small></div>
                <div><p>Thủ kho xuất</p><br><br><small>(Ký, ghi rõ họ tên)</small></div>
                <div><p>Thủ kho nhận</p><br><br><small>(Ký, ghi rõ họ tên)</small></div>
            </div>
            <button onclick="window.print()">In phiếu</button>
            </body></html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 400);
    };

    const stats = {
        total: transfers.length,
        pending: transfers.filter(t => t.status === 'Chờ duyệt').length,
        done: transfers.filter(t => t.status === 'Đã chuyển').length,
    };

    return (
        <div>
            {/* Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 20 }}>
                <div className="stat-card"><div className="stat-icon">📦</div><div><div className="stat-value">{stats.total}</div><div className="stat-label">Tổng phiếu</div></div></div>
                <div className="stat-card"><div className="stat-icon">⏳</div><div><div className="stat-value">{stats.pending}</div><div className="stat-label">Chờ duyệt</div></div></div>
                <div className="stat-card"><div className="stat-icon">✅</div><div><div className="stat-value">{stats.done}</div><div className="stat-label">Đã chuyển</div></div></div>
            </div>

            {/* Toolbar */}
            <div className="card" style={{ marginBottom: 20, padding: '12px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: 180 }}>
                        <option value="">Tất cả trạng thái</option>
                        <option value="Chờ duyệt">⏳ Chờ duyệt</option>
                        <option value="Đã chuyển">✅ Đã chuyển</option>
                        <option value="Huỷ">❌ Huỷ</option>
                    </select>
                    <div style={{ flex: 1 }} />
                    <button className="btn btn-ghost" onClick={load}>↻ Làm mới</button>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Tạo phiếu chuyển kho</button>
                </div>
            </div>

            {/* Form modal */}
            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <h3 style={{ marginBottom: 16 }}>📦 Tạo phiếu chuyển kho</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-grid" style={{ gap: 12 }}>
                                <div className="form-group">
                                    <label>Kho nguồn *</label>
                                    <select className="form-select" value={form.fromWarehouseId} onChange={e => setForm(f => ({ ...f, fromWarehouseId: e.target.value }))} required>
                                        <option value="">-- Chọn kho --</option>
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Kho đích *</label>
                                    <select className="form-select" value={form.toWarehouseId} onChange={e => setForm(f => ({ ...f, toWarehouseId: e.target.value }))} required>
                                        <option value="">-- Chọn kho --</option>
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Sản phẩm *</label>
                                    <select className="form-select" value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))} required>
                                        <option value="">-- Chọn SP --</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Số lượng *</label>
                                    <input type="number" className="form-input" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} min="1" required />
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label>Ghi chú</label>
                                    <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Huỷ</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : '✓ Tạo phiếu'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Table */}
            {loading ? <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : (
                <div className="card">
                    <div className="table-container"><table className="data-table">
                        <thead><tr>
                            <th>Mã</th><th>Từ kho</th><th>Đến kho</th>
                            <th>Sản phẩm</th><th>SL</th><th>Trạng thái</th>
                            <th>Ngày</th><th>Người tạo</th><th>Hành động</th>
                        </tr></thead>
                        <tbody>{transfers.map(t => {
                            const st = STATUS_MAP[t.status] || STATUS_MAP['Chờ duyệt'];
                            return (
                                <tr key={t.id}>
                                    <td className="accent">{t.code}</td>
                                    <td>{t.fromWarehouse?.name || '—'}</td>
                                    <td>{t.toWarehouse?.name || '—'}</td>
                                    <td>{t.product?.name || '—'} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.product?.sku || ''}</span></td>
                                    <td style={{ textAlign: 'right' }}>{fmt(t.quantity)}</td>
                                    <td>
                                        <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 12, background: st.bg, color: st.color }}>
                                            {t.status}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 12 }}>{fmtDate(t.transferDate)}</td>
                                    <td style={{ fontSize: 12 }}>{t.createdBy || '—'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                            {t.status === 'Chờ duyệt' && (
                                                <>
                                                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => approve(t.id)} title="Duyệt">✅</button>
                                                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px', color: 'var(--status-warning)' }} onClick={() => cancel(t.id)} title="Huỷ">🚫</button>
                                                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px', color: 'var(--status-danger)' }} onClick={() => removeTransfer(t.id)} title="Xóa">🗑️</button>
                                                </>
                                            )}
                                            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => printTransfer(t)} title="In phiếu">🖨️</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}</tbody>
                    </table></div>
                    {transfers.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Chưa có phiếu chuyển kho nào</div>}
                </div>
            )}
        </div>
    );
}
