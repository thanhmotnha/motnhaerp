'use client';
import { useState, useEffect } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

const SUPPLIER_TYPES = ['Vật tư xây dựng', 'Thiết bị vệ sinh', 'Thiết bị điện', 'Nội thất', 'Sắt thép', 'Gạch ốp lát', 'Sơn', 'Nhôm kính', 'Cơ khí', 'Khác'];
const CONTRACTOR_TYPES = ['Thầu xây dựng', 'CTV thiết kế kiến trúc', 'CTV Kết cấu', 'CTV 3D', 'Thầu mộc', 'Thầu điện', 'Thầu nước', 'Thầu sơn', 'Thầu đá', 'Thầu cơ khí', 'Thầu nhôm kính', 'Thầu trần thạch cao', 'Khác'];

const emptySup = { name: '', type: 'Vật tư xây dựng', contact: '', phone: '', email: '', address: '', taxCode: '', bankAccount: '', bankName: '', rating: 3, notes: '' };
const emptyCon = { name: '', type: 'Thầu xây dựng', phone: '', address: '', taxCode: '', bankAccount: '', bankName: '', rating: 3, notes: '' };

export default function PartnersPage() {
    const [tab, setTab] = useState('ncc');
    const [suppliers, setSuppliers] = useState([]);
    const [contractors, setContractors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [supForm, setSupForm] = useState(emptySup);
    const [conForm, setConForm] = useState(emptyCon);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');

    const fetchData = async () => {
        setLoading(true);
        const [s, c] = await Promise.all([
            fetch('/api/suppliers?limit=1000').then(r => r.json()).then(d => d.data || []).catch(() => []),
            fetch('/api/contractors?limit=1000').then(r => r.json()).then(d => d.data || []).catch(() => []),
        ]);
        setSuppliers(s); setContractors(c); setLoading(false);
    };
    useEffect(() => { fetchData(); }, []);

    // === Suppliers CRUD ===
    const openCreateSup = () => { setEditing(null); setSupForm(emptySup); setShowModal('ncc'); };
    const openEditSup = (s) => { setEditing(s); setSupForm({ name: s.name, type: s.type, contact: s.contact, phone: s.phone, email: s.email, address: s.address, taxCode: s.taxCode, bankAccount: s.bankAccount, bankName: s.bankName, rating: s.rating, notes: s.notes }); setShowModal('ncc'); };
    const submitSup = async () => {
        if (!supForm.name.trim()) return alert('Nhập tên NCC!');
        if (editing) await fetch(`/api/suppliers/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(supForm) });
        else await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(supForm) });
        setShowModal(false); fetchData();
    };
    const delSup = async (id) => { if (!confirm('Xóa NCC này?')) return; await fetch(`/api/suppliers/${id}`, { method: 'DELETE' }); fetchData(); };

    // === Contractors CRUD ===
    const openCreateCon = () => { setEditing(null); setConForm(emptyCon); setShowModal('tp'); };
    const openEditCon = (c) => { setEditing(c); setConForm({ name: c.name, type: c.type, phone: c.phone, address: c.address, taxCode: c.taxCode, bankAccount: c.bankAccount, bankName: c.bankName, rating: c.rating, notes: c.notes }); setShowModal('tp'); };
    const submitCon = async () => {
        if (!conForm.name.trim()) return alert('Nhập tên thầu phụ!');
        if (editing) await fetch(`/api/contractors/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(conForm) });
        else await fetch('/api/contractors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(conForm) });
        setShowModal(false); fetchData();
    };
    const delCon = async (id) => { if (!confirm('Xóa thầu phụ này?')) return; await fetch(`/api/contractors/${id}`, { method: 'DELETE' }); fetchData(); };

    // === Filter ===
    const filteredSup = suppliers.filter(s => {
        if (filterType && s.type !== filterType) return false;
        if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.code?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });
    const filteredCon = contractors.filter(c => {
        if (filterType && c.type !== filterType) return false;
        if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.code?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const totalConContract = contractors.reduce((s, c) => s + (c.payments?.reduce((t, p) => t + p.contractAmount, 0) || 0), 0);
    const totalConPaid = contractors.reduce((s, c) => s + (c.payments?.reduce((t, p) => t + p.paidAmount, 0) || 0), 0);

    return (
        <div>
            {/* Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="stat-card"><div className="stat-icon">🏭</div><div><div className="stat-value">{suppliers.length}</div><div className="stat-label">Nhà cung cấp</div></div></div>
                <div className="stat-card"><div className="stat-icon">👷</div><div><div className="stat-value">{contractors.length}</div><div className="stat-label">Thầu phụ / CTV</div></div></div>
                <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value">{fmt(totalConContract)}</div><div className="stat-label">Tổng HĐ thầu phụ</div></div></div>
                <div className="stat-card"><div className="stat-icon">💸</div><div><div className="stat-value">{fmt(totalConPaid)}</div><div className="stat-label">Đã thanh toán TP</div></div></div>
            </div>

            {/* Tabs */}
            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header" style={{ flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)' }}>
                        {[{ key: 'ncc', label: '🏭 Nhà cung cấp', count: suppliers.length }, { key: 'tp', label: '👷 Thầu phụ / CTV', count: contractors.length }].map(t => (
                            <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); setFilterType(''); }}
                                style={{ padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer', border: 'none', borderBottom: tab === t.key ? '3px solid var(--accent-primary)' : '3px solid transparent', background: 'none', color: tab === t.key ? 'var(--accent-primary)' : 'var(--text-muted)', transition: '0.2s' }}>
                                {t.label} <span className="badge muted" style={{ marginLeft: 4 }}>{t.count}</span>
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <input className="form-input" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200, fontSize: 13 }} />
                            <select className="form-select" style={{ width: 180 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                                <option value="">Tất cả loại</option>
                                {(tab === 'ncc' ? SUPPLIER_TYPES : CONTRACTOR_TYPES).map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <button className="btn btn-primary" onClick={tab === 'ncc' ? openCreateSup : openCreateCon}>
                            + Thêm {tab === 'ncc' ? 'NCC' : 'Thầu phụ'}
                        </button>
                    </div>
                </div>

                {loading ? <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> : tab === 'ncc' ? (
                    /* ========== NCC Table ========== */
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ margin: 0 }}>
                            <thead><tr>
                                <th>Mã</th><th>Tên NCC</th><th>Loại</th><th>Liên hệ</th><th>SĐT</th><th>Ngân hàng</th><th>Đánh giá</th><th style={{ width: 80 }}></th>
                            </tr></thead>
                            <tbody>{filteredSup.length === 0 ? (
                                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Không có dữ liệu</td></tr>
                            ) : filteredSup.map(s => (
                                <tr key={s.id}>
                                    <td className="accent">{s.code}</td>
                                    <td className="primary" style={{ cursor: 'pointer' }} onClick={() => openEditSup(s)}>{s.name}</td>
                                    <td><span className="badge info">{s.type}</span></td>
                                    <td style={{ fontSize: 12 }}>{s.contact || '—'}</td>
                                    <td>{s.phone || '—'}</td>
                                    <td style={{ fontSize: 12 }}>{s.bankAccount ? `${s.bankName} - ${s.bankAccount}` : '—'}</td>
                                    <td>{'⭐'.repeat(s.rating)}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openEditSup(s)}>✏️</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => delSup(s.id)} style={{ color: 'var(--status-danger)' }}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                ) : (
                    /* ========== Thầu phụ Table ========== */
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ margin: 0 }}>
                            <thead><tr>
                                <th>Mã</th><th>Tên thầu phụ</th><th>Loại</th><th>SĐT</th><th>Tổng HĐ</th><th>Đã TT</th><th>Công nợ</th><th>Đánh giá</th><th style={{ width: 80 }}></th>
                            </tr></thead>
                            <tbody>{filteredCon.length === 0 ? (
                                <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Không có dữ liệu</td></tr>
                            ) : filteredCon.map(c => {
                                const contractAmt = c.payments?.reduce((t, p) => t + p.contractAmount, 0) || 0;
                                const paidAmt = c.payments?.reduce((t, p) => t + p.paidAmount, 0) || 0;
                                const debt = contractAmt - paidAmt;
                                return (
                                    <tr key={c.id}>
                                        <td className="accent">{c.code}</td>
                                        <td className="primary" style={{ cursor: 'pointer' }} onClick={() => openEditCon(c)}>{c.name}</td>
                                        <td><span className="badge warning">{c.type}</span></td>
                                        <td>{c.phone || '—'}</td>
                                        <td className="amount">{fmt(contractAmt)}</td>
                                        <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(paidAmt)}</td>
                                        <td style={{ color: debt > 0 ? 'var(--status-danger)' : 'var(--text-muted)', fontWeight: 600 }}>{fmt(debt)}</td>
                                        <td>{'⭐'.repeat(c.rating)}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => openEditCon(c)}>✏️</button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => delCon(c.id)} style={{ color: 'var(--status-danger)' }}>🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}</tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal NCC */}
            {showModal === 'ncc' && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header">
                            <h3>{editing ? '✏️ Sửa nhà cung cấp' : '+ Thêm nhà cung cấp'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Tên NCC *</label>
                                <input className="form-input" value={supForm.name} onChange={e => setSupForm({ ...supForm, name: e.target.value })} placeholder="VD: An Cường, Bosch..." /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Loại</label>
                                    <select className="form-select" value={supForm.type} onChange={e => setSupForm({ ...supForm, type: e.target.value })}>
                                        {SUPPLIER_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select></div>
                                <div className="form-group"><label className="form-label">Người liên hệ</label>
                                    <input className="form-input" value={supForm.contact} onChange={e => setSupForm({ ...supForm, contact: e.target.value })} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">SĐT</label>
                                    <input className="form-input" value={supForm.phone} onChange={e => setSupForm({ ...supForm, phone: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Email</label>
                                    <input className="form-input" value={supForm.email} onChange={e => setSupForm({ ...supForm, email: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Địa chỉ</label>
                                <input className="form-input" value={supForm.address} onChange={e => setSupForm({ ...supForm, address: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Mã số thuế</label>
                                    <input className="form-input" value={supForm.taxCode} onChange={e => setSupForm({ ...supForm, taxCode: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Đánh giá</label>
                                    <select className="form-select" value={supForm.rating} onChange={e => setSupForm({ ...supForm, rating: Number(e.target.value) })}>
                                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{'⭐'.repeat(n)} {n}</option>)}
                                    </select></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">STK ngân hàng</label>
                                    <input className="form-input" value={supForm.bankAccount} onChange={e => setSupForm({ ...supForm, bankAccount: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Ngân hàng</label>
                                    <input className="form-input" value={supForm.bankName} onChange={e => setSupForm({ ...supForm, bankName: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Ghi chú</label>
                                <textarea className="form-input" rows={2} value={supForm.notes} onChange={e => setSupForm({ ...supForm, notes: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={submitSup}>{editing ? 'Cập nhật' : 'Lưu'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Thầu phụ */}
            {showModal === 'tp' && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header">
                            <h3>{editing ? '✏️ Sửa thầu phụ' : '+ Thêm thầu phụ'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Tên thầu phụ *</label>
                                <input className="form-input" value={conForm.name} onChange={e => setConForm({ ...conForm, name: e.target.value })} placeholder="VD: Anh Tuấn - Thợ mộc..." /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Loại</label>
                                    <select className="form-select" value={conForm.type} onChange={e => setConForm({ ...conForm, type: e.target.value })}>
                                        {CONTRACTOR_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select></div>
                                <div className="form-group"><label className="form-label">SĐT</label>
                                    <input className="form-input" value={conForm.phone} onChange={e => setConForm({ ...conForm, phone: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Địa chỉ</label>
                                <input className="form-input" value={conForm.address} onChange={e => setConForm({ ...conForm, address: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Mã số thuế</label>
                                    <input className="form-input" value={conForm.taxCode} onChange={e => setConForm({ ...conForm, taxCode: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Đánh giá</label>
                                    <select className="form-select" value={conForm.rating} onChange={e => setConForm({ ...conForm, rating: Number(e.target.value) })}>
                                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{'⭐'.repeat(n)} {n}</option>)}
                                    </select></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">STK ngân hàng</label>
                                    <input className="form-input" value={conForm.bankAccount} onChange={e => setConForm({ ...conForm, bankAccount: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Ngân hàng</label>
                                    <input className="form-input" value={conForm.bankName} onChange={e => setConForm({ ...conForm, bankName: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Ghi chú</label>
                                <textarea className="form-input" rows={2} value={conForm.notes} onChange={e => setConForm({ ...conForm, notes: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={submitCon}>{editing ? 'Cập nhật' : 'Lưu'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
