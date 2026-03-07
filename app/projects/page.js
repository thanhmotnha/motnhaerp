'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { exportToCsv } from '@/lib/exportCsv';
const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
export default function ProjectsPage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterType, setFilterType] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [form, setForm] = useState({ name: '', type: 'Thiết kế kiến trúc', status: 'Khảo sát', address: '', area: '', floors: '', budget: '', customerId: '', designer: '', supervisor: '' });
    const router = useRouter();
    const fetchProjects = () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (filterStatus) params.set('status', filterStatus);
        if (filterType) params.set('type', filterType);
        fetch(`/api/projects?${params}`).then(r => r.json()).then(d => { setProjects(d.data || []); setLoading(false); });
    };
    useEffect(() => { fetch('/api/customers?limit=1000').then(r => r.json()).then(d => setCustomers(d.data || [])); }, []);
    useEffect(() => { fetchProjects(); }, [search, filterStatus, filterType]);
    const handleDelete = async (id, e) => { e.stopPropagation(); if (!confirm('Xóa dự án này?')) return; await fetch(`/api/projects/${id}`, { method: 'DELETE' }); fetchProjects(); };
    const handleRename = async (id) => {
        const name = editingName.trim();
        if (!name) { setEditingId(null); return; }
        await fetch(`/api/projects/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
        setEditingId(null);
        setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p));
    };
    const handleCreate = async () => {
        if (!form.name.trim()) return alert('Vui lòng nhập tên dự án');
        if (!form.customerId) return alert('Vui lòng chọn khách hàng');
        const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, area: Number(form.area) || 0, floors: Number(form.floors) || 1, budget: Number(form.budget) || 0 }) });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi tạo dự án'); }
        setShowModal(false); setForm({ name: '', type: 'Thiết kế kiến trúc', status: 'Khảo sát', address: '', area: '', floors: '', budget: '', customerId: '', designer: '', supervisor: '' }); fetchProjects();
    };
    const stColor = { 'Khảo sát': 'badge-default', 'Thiết kế': 'badge-info', 'Thi công': 'badge-warning', 'Nghiệm thu': 'badge-success', 'Bàn giao': 'badge-success' };
    const active = projects.filter(p => p.status === 'Thi công').length;
    const totalContract = projects.reduce((s, p) => s + (p.contractValue || 0), 0);
    const totalPaid = projects.reduce((s, p) => s + (p.paidAmount || 0), 0);
    return (
        <div>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="stat-card"><div className="stat-icon">🏗️</div><div><div className="stat-value">{projects.length}</div><div className="stat-label">Tổng DA</div></div></div>
                <div className="stat-card"><div className="stat-icon">🔨</div><div><div className="stat-value">{active}</div><div className="stat-label">Đang thi công</div></div></div>
                <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value">{fmt(totalContract)}</div><div className="stat-label">Tổng giá trị HĐ</div></div></div>
                <div className="stat-card"><div className="stat-icon">💵</div><div><div className="stat-value">{fmt(totalPaid)}</div><div className="stat-label">Đã thu</div></div></div>
                <div className="stat-card"><div className="stat-icon">⚠️</div><div><div className="stat-value" style={{ color: totalContract - totalPaid > 0 ? 'var(--status-danger)' : '' }}>{fmt(totalContract - totalPaid)}</div><div className="stat-label">Công nợ KH</div></div></div>
            </div>
            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header">
                    <h3>Danh sách dự án</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => exportToCsv(projects, [
                            { key: 'code', label: 'Mã' }, { key: 'name', label: 'Tên dự án' },
                            { key: 'customer.name', label: 'Khách hàng' }, { key: 'type', label: 'Loại' },
                            { key: 'status', label: 'Trạng thái' }, { key: 'contractValue', label: 'Giá trị HĐ' },
                            { key: 'paidAmount', label: 'Đã thu' }, { key: 'progress', label: 'Tiến độ (%)' },
                            { key: 'startDate', label: 'Ngày BD' }, { key: 'endDate', label: 'Ngày KT' },
                        ], 'du-an')}>⬇ Xuất CSV</button>
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Thêm DA</button>
                    </div>
                </div>
                <div className="filter-bar">
                    <input type="text" className="form-input" placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 250 }} />
                    <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)}><option value="">Tất cả loại</option><option>Thiết kế kiến trúc</option><option>Thiết kế nội thất</option><option>Thi công thô</option><option>Thi công hoàn thiện</option><option>Thi công nội thất</option></select>
                    <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="">Tất cả TT</option><option>Khảo sát</option><option>Thiết kế</option><option>Thi công</option><option>Nghiệm thu</option><option>Bàn giao</option></select>
                </div>
                {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : (
                    <div className="table-container"><table className="data-table">
                        <thead><tr><th>Mã</th><th>Dự án</th><th>Khách hàng</th><th>Loại</th><th>Giá trị HĐ</th><th>Đã thu</th><th>Tiến độ</th><th>TT</th><th></th></tr></thead>
                        <tbody>{projects.map(p => (
                            <tr key={p.id} onClick={() => router.push(`/projects/${p.id}`)} style={{ cursor: 'pointer' }}>
                                <td className="accent">{p.code}</td>
                                <td className="primary" onDoubleClick={(e) => { e.stopPropagation(); setEditingId(p.id); setEditingName(p.name); }}>
                                    {editingId === p.id ? (
                                        <input className="form-input" autoFocus value={editingName} onClick={e => e.stopPropagation()}
                                            onChange={e => setEditingName(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') handleRename(p.id); if (e.key === 'Escape') setEditingId(null); }}
                                            onBlur={() => handleRename(p.id)}
                                            style={{ fontSize: 13, padding: '3px 6px', width: '100%' }} />
                                    ) : (<>{p.name}{p.phase ? <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.phase}</div> : null}</>)}
                                </td>
                                <td>{p.customer?.name}</td>
                                <td><span className="badge badge-default">{p.type}</span></td>
                                <td>{fmt(p.contractValue || p.budget)}</td>
                                <td style={{ color: 'var(--status-success)' }}>{fmt(p.paidAmount || 0)}</td>
                                <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div className="progress-bar" style={{ flex: 1 }}><div className="progress-fill" style={{ width: `${p.progress}%` }}></div></div><span style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{p.progress}%</span></div></td>
                                <td><span className={`badge ${stColor[p.status] || 'badge-default'}`}>{p.status}</span></td>
                                <td><button className="btn btn-ghost" onClick={(e) => handleDelete(p.id, e)}>🗑️</button></td>
                            </tr>
                        ))}</tbody>
                    </table></div>
                )}
            </div>

            {/* Modal tạo dự án */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header"><h3>Thêm dự án mới</h3><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Tên dự án *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VD: Biệt thự anh Minh - Vinhomes" /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Khách hàng *</label>
                                    <select className="form-select" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}>
                                        <option value="">Chọn khách hàng...</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group"><label className="form-label">Loại</label>
                                    <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                        <option>Thiết kế kiến trúc</option><option>Thiết kế nội thất</option><option>Thi công thô</option><option>Thi công hoàn thiện</option><option>Thi công nội thất</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group"><label className="form-label">Địa chỉ công trình</label><input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Diện tích (m²)</label><input className="form-input" type="number" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Số tầng</label><input className="form-input" type="number" value={form.floors} onChange={e => setForm({ ...form, floors: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Ngân sách dự kiến</label><input className="form-input" type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Thiết kế viên</label><input className="form-input" value={form.designer} onChange={e => setForm({ ...form, designer: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Giám sát</label><input className="form-input" value={form.supervisor} onChange={e => setForm({ ...form, supervisor: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Trạng thái ban đầu</label>
                                <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                    <option>Khảo sát</option><option>Thiết kế</option><option>Chuẩn bị thi công</option><option>Đang thi công</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button><button className="btn btn-primary" onClick={handleCreate}>Tạo dự án</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}

