'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const STATUS_MAP = {
    'Chờ xử lý': { color: '#94a3b8', bg: '#f1f5f9', icon: '⏳' },
    'Đang thực hiện': { color: '#f59e0b', bg: '#fef3c7', icon: '🔧' },
    'Hoàn thành': { color: '#22c55e', bg: '#dcfce7', icon: '✅' },
    'Tạm dừng': { color: '#8b5cf6', bg: '#ede9fe', icon: '⏸️' },
    'Hủy': { color: '#ef4444', bg: '#fee2e2', icon: '❌' },
};
const PRIORITIES = ['Cao', 'Trung bình', 'Thấp'];
const STATUSES = Object.keys(STATUS_MAP);

const emptyForm = { title: '', description: '', priority: 'Trung bình', status: 'Chờ xử lý', assignee: '', dueDate: '', projectId: '', category: '' };

export default function WorkOrdersPage() {
    const router = useRouter();
    const { role } = useRole();
    const [orders, setOrders] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [filterProject, setFilterProject] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);

    const fetchData = async () => {
        setLoading(true);
        const params = new URLSearchParams({ limit: '500' });
        if (filterStatus) params.set('status', filterStatus);
        if (filterPriority) params.set('priority', filterPriority);
        if (filterProject) params.set('projectId', filterProject);
        if (search) params.set('search', search);
        const [woRes, pRes] = await Promise.all([
            fetch(`/api/work-orders?${params}`).then(r => r.json()).catch(() => ({ data: [] })),
            fetch('/api/projects?limit=500').then(r => r.json()).catch(() => ({ data: [] })),
        ]);
        setOrders(woRes.data || []);
        setProjects(pRes.data || []);
        setLoading(false);
    };
    useEffect(() => { fetchData(); }, [filterStatus, filterPriority, filterProject]);

    const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
    const openEdit = (wo) => {
        setEditing(wo);
        setForm({ title: wo.title, description: wo.description || '', priority: wo.priority, status: wo.status, assignee: wo.assignee || '', dueDate: wo.dueDate ? wo.dueDate.slice(0, 10) : '', projectId: wo.projectId, category: wo.category || '' });
        setShowModal(true);
    };
    const submit = async () => {
        if (!form.title.trim() || !form.projectId) return alert('Nhập tiêu đề và chọn dự án!');
        const body = { ...form, dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null };
        if (editing) await fetch(`/api/work-orders/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        else await fetch('/api/work-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        setShowModal(false); fetchData();
    };
    const del = async (id) => {
        if (!confirm('Xóa lệnh công việc này?')) return;
        await fetch(`/api/work-orders/${id}`, { method: 'DELETE' });
        fetchData();
    };
    const quickStatus = async (id, status) => {
        await fetch(`/api/work-orders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    };

    const filtered = orders.filter(o => !search || o.title?.toLowerCase().includes(search.toLowerCase()) || o.code?.toLowerCase().includes(search.toLowerCase()));

    // KPI
    const total = filtered.length;
    const inProgress = filtered.filter(o => o.status === 'Đang thực hiện').length;
    const done = filtered.filter(o => o.status === 'Hoàn thành').length;
    const overdue = filtered.filter(o => o.dueDate && new Date(o.dueDate) < new Date() && o.status !== 'Hoàn thành' && o.status !== 'Hủy').length;
    const kpis = [
        { label: 'Tổng WO', value: total, icon: '📋', color: 'var(--accent-primary)' },
        { label: 'Đang thực hiện', value: inProgress, icon: '🔧', color: '#f59e0b' },
        { label: 'Hoàn thành', value: done, icon: '✅', color: '#22c55e' },
        { label: 'Quá hạn', value: overdue, icon: '⚠️', color: '#ef4444' },
    ];

    return (
        <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div><h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Lệnh công việc (Work Orders)</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Quản lý lệnh sản xuất, thi công, bảo trì</p></div>
                <button className="btn btn-primary" onClick={openCreate}>+ Tạo WO</button>
            </div>

            {/* KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
                {kpis.map(k => (
                    <div key={k.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span style={{ fontSize: 28 }}>{k.icon}</span>
                        <div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.label}</div><div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div></div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <input className="input" placeholder="Tìm theo tên/mã..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchData()} style={{ width: 240 }} />
                <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 160 }}>
                    <option value="">Tất cả trạng thái</option>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="input" value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ width: 140 }}>
                    <option value="">Tất cả ưu tiên</option>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select className="input" value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ width: 200 }}>
                    <option value="">Tất cả dự án</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>

            {/* Table */}
            {loading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Đang tải...</div> : (
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%' }}>
                        <thead><tr>
                            <th>Mã</th><th>Tiêu đề</th><th>Dự án</th><th>Ưu tiên</th><th>Trạng thái</th><th>Người thực hiện</th><th>Hạn</th><th style={{ width: 120 }}>Thao tác</th>
                        </tr></thead>
                        <tbody>
                            {filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Chưa có lệnh công việc</td></tr>}
                            {filtered.map(wo => {
                                const st = STATUS_MAP[wo.status] || STATUS_MAP['Chờ xử lý'];
                                const isOverdue = wo.dueDate && new Date(wo.dueDate) < new Date() && wo.status !== 'Hoàn thành' && wo.status !== 'Hủy';
                                return (
                                    <tr key={wo.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(wo)}>
                                        <td style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: 13 }}>{wo.code}</td>
                                        <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wo.title}</td>
                                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{wo.project?.code || '—'}</td>
                                        <td><span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8, background: wo.priority === 'Cao' ? '#fee2e2' : wo.priority === 'Thấp' ? '#f1f5f9' : '#fef3c7', color: wo.priority === 'Cao' ? '#ef4444' : wo.priority === 'Thấp' ? '#94a3b8' : '#f59e0b' }}>{wo.priority}</span></td>
                                        <td>
                                            <select className="input" value={wo.status} onClick={e => e.stopPropagation()} onChange={e => quickStatus(wo.id, e.target.value)} style={{ fontSize: 11, padding: '2px 6px', background: st.bg, color: st.color, fontWeight: 600, border: 'none', borderRadius: 6, width: 'auto', cursor: 'pointer' }}>
                                                {STATUSES.map(s => <option key={s} value={s}>{STATUS_MAP[s]?.icon} {s}</option>)}
                                            </select>
                                        </td>
                                        <td style={{ fontSize: 12 }}>{wo.assignee || '—'}</td>
                                        <td style={{ fontSize: 12, color: isOverdue ? '#ef4444' : 'var(--text-secondary)', fontWeight: isOverdue ? 600 : 400 }}>{isOverdue && '⚠ '}{fmtDate(wo.dueDate)}</td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(wo)}>✏️</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => del(wo.id)} style={{ color: '#ef4444' }}>🗑</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                        <div className="modal-header"><h3>{editing ? 'Sửa WO' : 'Tạo Work Order'}</h3><button className="btn btn-ghost" onClick={() => setShowModal(false)}>✕</button></div>
                        <div style={{ display: 'grid', gap: 12, padding: '16px 0' }}>
                            <div>
                                <label className="form-label">Tiêu đề *</label>
                                <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="VD: Lắp đặt hệ thống điện tầng 2" />
                            </div>
                            <div>
                                <label className="form-label">Dự án *</label>
                                <select className="input" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
                                    <option value="">-- Chọn dự án --</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div><label className="form-label">Ưu tiên</label>
                                    <select className="input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                        {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                                    </select></div>
                                <div><label className="form-label">Trạng thái</label>
                                    <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                                    </select></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div><label className="form-label">Người thực hiện</label>
                                    <input className="input" value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} placeholder="Tên nhân sự" /></div>
                                <div><label className="form-label">Hạn hoàn thành</label>
                                    <input className="input" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
                            </div>
                            <div><label className="form-label">Phân loại</label>
                                <input className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="VD: Điện, Nước, Xây dựng..." /></div>
                            <div><label className="form-label">Mô tả</label>
                                <textarea className="input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Chi tiết công việc..." /></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={submit}>{editing ? 'Cập nhật' : 'Tạo mới'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
