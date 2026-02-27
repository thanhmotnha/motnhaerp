'use client';
import { useState, useEffect } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const CONTRACTOR_TYPES = ['Thầu xây dựng', 'CTV thiết kế kiến trúc', 'CTV Kết cấu', 'CTV 3D', 'Thầu mộc', 'Thầu điện', 'Thầu nước', 'Thầu sơn', 'Thầu đá', 'Thầu cơ khí', 'Thầu nhôm kính', 'Thầu trần thạch cao', 'Khác'];

const emptyForm = { name: '', type: 'Thầu xây dựng', phone: '', address: '', taxCode: '', bankAccount: '', bankName: '', rating: 3, notes: '' };

export default function ContractorsPage() {
    const [contractors, setContractors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');

    const fetchData = () => { setLoading(true); fetch('/api/contractors').then(r => r.json()).then(d => { setContractors(d); setLoading(false); }); };
    useEffect(fetchData, []);

    const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
    const openEdit = (c) => {
        setEditing(c);
        setForm({ name: c.name, type: c.type, phone: c.phone, address: c.address, taxCode: c.taxCode, bankAccount: c.bankAccount, bankName: c.bankName, rating: c.rating, notes: c.notes });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!form.name.trim()) return alert('Nhập tên thầu phụ!');
        if (editing) {
            await fetch(`/api/contractors/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        } else {
            await fetch('/api/contractors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        }
        setShowModal(false);
        fetchData();
    };

    const handleDelete = async (id) => { if (!confirm('Xóa thầu phụ này?')) return; await fetch(`/api/contractors/${id}`, { method: 'DELETE' }); fetchData(); };

    const filtered = contractors.filter(c => {
        if (filterType && c.type !== filterType) return false;
        if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.code?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const totalContract = contractors.reduce((s, c) => s + c.payments.reduce((t, p) => t + p.contractAmount, 0), 0);
    const totalPaid = contractors.reduce((s, c) => s + c.payments.reduce((t, p) => t + p.paidAmount, 0), 0);

    return (
        <div>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="stat-card"><div className="stat-icon">👷</div><div><div className="stat-value">{contractors.length}</div><div className="stat-label">Thầu phụ</div></div></div>
                <div className="stat-card"><div className="stat-icon">📝</div><div><div className="stat-value">{fmt(totalContract)}</div><div className="stat-label">Tổng HĐ thầu</div></div></div>
                <div className="stat-card"><div className="stat-icon">✅</div><div><div className="stat-value" style={{ color: 'var(--status-success)' }}>{fmt(totalPaid)}</div><div className="stat-label">Đã thanh toán</div></div></div>
                <div className="stat-card"><div className="stat-icon">⚠️</div><div><div className="stat-value" style={{ color: 'var(--status-danger)' }}>{fmt(totalContract - totalPaid)}</div><div className="stat-label">Còn nợ thầu</div></div></div>
            </div>

            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header">
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <h3 style={{ margin: 0 }}>Danh sách thầu phụ</h3>
                        <input className="form-input" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)}
                            style={{ width: 200, fontSize: 13 }} />
                        <select className="form-select" style={{ width: 160 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                            <option value="">Tất cả loại</option>
                            {CONTRACTOR_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    <button className="btn btn-primary" onClick={openCreate}>+ Thêm thầu phụ</button>
                </div>
                {loading ? <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> : (
                    <table className="data-table">
                        <thead><tr>
                            <th>Mã</th><th>Tên</th><th>Loại</th><th>SĐT</th><th>Ngân hàng</th><th>Đánh giá</th><th>HĐ thầu</th><th>Đã TT</th><th>Nợ</th><th style={{ width: 80 }}></th>
                        </tr></thead>
                        <tbody>{filtered.map(c => {
                            const ct = c.payments.reduce((s, p) => s + p.contractAmount, 0);
                            const pd = c.payments.reduce((s, p) => s + p.paidAmount, 0);
                            return (
                                <tr key={c.id}>
                                    <td className="accent">{c.code}</td>
                                    <td className="primary" style={{ cursor: 'pointer' }} onClick={() => openEdit(c)}>{c.name}</td>
                                    <td><span className="badge badge-default">{c.type}</span></td>
                                    <td>{c.phone || '—'}</td>
                                    <td style={{ fontSize: 12 }}>{c.bankAccount ? `${c.bankName} - ${c.bankAccount}` : '—'}</td>
                                    <td>{'⭐'.repeat(c.rating)}</td>
                                    <td>{ct > 0 ? fmt(ct) : '—'}</td>
                                    <td style={{ color: 'var(--status-success)' }}>{pd > 0 ? fmt(pd) : '—'}</td>
                                    <td style={{ fontWeight: 700, color: ct - pd > 0 ? 'var(--status-danger)' : '' }}>{ct - pd > 0 ? fmt(ct - pd) : '—'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>✏️</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(c.id)} style={{ color: 'var(--status-danger)' }}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}</tbody>
                    </table>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header">
                            <h3>{editing ? '✏️ Sửa thầu phụ' : '+ Thêm thầu phụ'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Tên thầu phụ *</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Loại</label>
                                    <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                        {CONTRACTOR_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select></div>
                                <div className="form-group"><label className="form-label">SĐT</label>
                                    <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Địa chỉ</label>
                                <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Mã số thuế</label>
                                    <input className="form-input" value={form.taxCode} onChange={e => setForm({ ...form, taxCode: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Đánh giá</label>
                                    <select className="form-select" value={form.rating} onChange={e => setForm({ ...form, rating: Number(e.target.value) })}>
                                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{'⭐'.repeat(n)} {n}</option>)}
                                    </select></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">STK ngân hàng</label>
                                    <input className="form-input" value={form.bankAccount} onChange={e => setForm({ ...form, bankAccount: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Ngân hàng</label>
                                    <input className="form-input" value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Ghi chú</label>
                                <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSubmit}>{editing ? 'Cập nhật' : 'Lưu'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
