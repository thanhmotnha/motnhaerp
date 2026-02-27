'use client';
import { useState, useEffect } from 'react';

const SUPPLIER_TYPES = ['Vật tư xây dựng', 'Thiết bị vệ sinh', 'Thiết bị điện', 'Nội thất', 'Sắt thép', 'Gạch ốp lát', 'Sơn', 'Nhôm kính', 'Cơ khí', 'Khác'];

const emptyForm = { name: '', type: 'Vật tư xây dựng', contact: '', phone: '', email: '', address: '', taxCode: '', bankAccount: '', bankName: '', rating: 3, notes: '' };

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');

    const fetchData = () => { setLoading(true); fetch('/api/suppliers').then(r => r.json()).then(d => { setSuppliers(d); setLoading(false); }); };
    useEffect(fetchData, []);

    const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
    const openEdit = (s) => { setEditing(s); setForm({ name: s.name, type: s.type, contact: s.contact, phone: s.phone, email: s.email, address: s.address, taxCode: s.taxCode, bankAccount: s.bankAccount, bankName: s.bankName, rating: s.rating, notes: s.notes }); setShowModal(true); };

    const handleSubmit = async () => {
        if (!form.name.trim()) return alert('Nhập tên NCC!');
        if (editing) {
            await fetch(`/api/suppliers/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        } else {
            await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        }
        setShowModal(false);
        fetchData();
    };

    const handleDelete = async (id) => { if (!confirm('Xóa nhà cung cấp này?')) return; await fetch(`/api/suppliers/${id}`, { method: 'DELETE' }); fetchData(); };

    const filtered = suppliers.filter(s => {
        if (filterType && s.type !== filterType) return false;
        if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.code?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    return (
        <div>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="stat-card"><div className="stat-icon">🏭</div><div><div className="stat-value">{suppliers.length}</div><div className="stat-label">Nhà cung cấp</div></div></div>
                <div className="stat-card"><div className="stat-icon">📦</div><div><div className="stat-value">{[...new Set(suppliers.map(s => s.type))].length}</div><div className="stat-label">Loại NCC</div></div></div>
            </div>

            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header">
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <h3 style={{ margin: 0 }}>Danh sách nhà cung cấp</h3>
                        <input className="form-input" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)}
                            style={{ width: 200, fontSize: 13 }} />
                        <select className="form-select" style={{ width: 160 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                            <option value="">Tất cả loại</option>
                            {SUPPLIER_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    <button className="btn btn-primary" onClick={openCreate}>+ Thêm NCC</button>
                </div>
                {loading ? <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> : (
                    <table className="data-table">
                        <thead><tr>
                            <th>Mã</th><th>Tên NCC</th><th>Loại</th><th>Liên hệ</th><th>SĐT</th><th>Ngân hàng</th><th>Đánh giá</th><th style={{ width: 80 }}></th>
                        </tr></thead>
                        <tbody>{filtered.map(s => (
                            <tr key={s.id}>
                                <td className="accent">{s.code}</td>
                                <td className="primary" style={{ cursor: 'pointer' }} onClick={() => openEdit(s)}>{s.name}</td>
                                <td><span className="badge info">{s.type}</span></td>
                                <td style={{ fontSize: 12 }}>{s.contact || '—'}</td>
                                <td>{s.phone || '—'}</td>
                                <td style={{ fontSize: 12 }}>{s.bankAccount ? `${s.bankName} - ${s.bankAccount}` : '—'}</td>
                                <td>{'⭐'.repeat(s.rating)}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>✏️</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(s.id)} style={{ color: 'var(--status-danger)' }}>🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header">
                            <h3>{editing ? '✏️ Sửa nhà cung cấp' : '+ Thêm nhà cung cấp'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Tên NCC *</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VD: An Cường, Bosch..." /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Loại</label>
                                    <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                        {SUPPLIER_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select></div>
                                <div className="form-group"><label className="form-label">Người liên hệ</label>
                                    <input className="form-input" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">SĐT</label>
                                    <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Email</label>
                                    <input className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
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
