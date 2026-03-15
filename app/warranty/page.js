'use client';
import { useState, useEffect, useCallback } from 'react';

const PRIORITY = ['Thấp', 'Trung bình', 'Cao', 'Khẩn'];
const STATUS = ['Mới', 'Đang xử lý', 'Đã xử lý', 'Đóng'];
const CATEGORIES = ['Bảo hành', 'Sửa chữa', 'Khiếu nại', 'Khác'];
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const STATUS_COLOR = {
    'Mới': 'var(--status-info)',
    'Đang xử lý': 'var(--status-warning)',
    'Đã xử lý': 'var(--status-success)',
    'Đóng': 'var(--text-muted)',
};
const PRIORITY_COLOR = {
    'Thấp': 'var(--text-muted)',
    'Trung bình': 'var(--status-info)',
    'Cao': 'var(--status-warning)',
    'Khẩn': 'var(--status-danger)',
};

function WarrantyForm({ projects, onSaved, onCancel }) {
    const [form, setForm] = useState({ projectId: '', title: '', description: '', reportedBy: '', assignee: '', priority: 'Trung bình' });
    const [saving, setSaving] = useState(false);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const save = async () => {
        if (!form.projectId || !form.title.trim()) return alert('Vui lòng chọn dự án và nhập tiêu đề');
        setSaving(true);
        const res = await fetch('/api/warranty', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        if (res.ok) { onSaved?.(); }
        else { const e = await res.json(); alert(e.error || 'Lỗi tạo phiếu bảo hành'); }
        setSaving(false);
    };

    return (
        <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                    <label className="form-label">Dự án *</label>
                    <select className="form-select" value={form.projectId} onChange={e => set('projectId', e.target.value)}>
                        <option value="">-- Chọn dự án --</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="form-label">Mức độ ưu tiên</label>
                    <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                        {PRIORITY.map(p => <option key={p}>{p}</option>)}
                    </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Tiêu đề *</label>
                    <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="VD: Rò rỉ mái tầng 3 khu A" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Mô tả chi tiết</label>
                    <textarea className="form-input" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Mô tả vấn đề, vị trí, thời gian phát sinh..." style={{ resize: 'vertical' }} />
                </div>
                <div>
                    <label className="form-label">Người báo cáo</label>
                    <input className="form-input" value={form.reportedBy} onChange={e => set('reportedBy', e.target.value)} placeholder="Tên khách hàng / nhân viên" />
                </div>
                <div>
                    <label className="form-label">Nhân viên xử lý</label>
                    <input className="form-input" value={form.assignee} onChange={e => set('assignee', e.target.value)} placeholder="Assign cho ai?" />
                </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                {onCancel && <button className="btn btn-ghost" onClick={onCancel}>Hủy</button>}
                <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Đang lưu...' : 'Tạo phiếu'}</button>
            </div>
        </div>
    );
}

function EditRow({ ticket, onSaved, onCancel }) {
    const [assignee, setAssignee] = useState(ticket.assignee);
    const [status, setStatus] = useState(ticket.status);
    const [notes, setNotes] = useState(ticket.notes);
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        await fetch(`/api/warranty/${ticket.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assignee, status, notes }),
        });
        onSaved?.();
        setSaving(false);
    };

    return (
        <tr style={{ background: 'var(--bg-secondary)' }}>
            <td colSpan={8} style={{ padding: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: 8, alignItems: 'end' }}>
                    <div>
                        <label className="form-label" style={{ fontSize: 11 }}>Nhân viên xử lý</label>
                        <input className="form-input" style={{ margin: 0 }} value={assignee} onChange={e => setAssignee(e.target.value)} />
                    </div>
                    <div>
                        <label className="form-label" style={{ fontSize: 11 }}>Trạng thái</label>
                        <select className="form-select" style={{ margin: 0 }} value={status} onChange={e => setStatus(e.target.value)}>
                            {STATUS.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="form-label" style={{ fontSize: 11 }}>Ghi chú xử lý</label>
                        <input className="form-input" style={{ margin: 0 }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Đã làm gì để xử lý?" />
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? '...' : 'Lưu'}</button>
                        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Hủy</button>
                    </div>
                </div>
            </td>
        </tr>
    );
}

export default function WarrantyPage() {
    const [tickets, setTickets] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filterProject, setFilterProject] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [editingId, setEditingId] = useState(null);

    const load = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filterProject) params.set('projectId', filterProject);
        if (filterStatus) params.set('status', filterStatus);
        if (filterCategory) params.set('category', filterCategory);
        fetch(`/api/warranty?${params}`).then(r => r.json()).then(d => { setTickets(d || []); setLoading(false); });
    }, [filterProject, filterStatus, filterCategory]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetch('/api/projects?limit=200').then(r => r.json()).then(d => setProjects(d.data || d || [])).catch(() => { });
    }, []);

    const counts = STATUS.reduce((acc, s) => ({ ...acc, [s]: tickets.filter(t => t.status === s).length }), {});
    const slaBreachedCount = tickets.filter(t => t.slaBreached).length;

    const checkSLA = async () => {
        await fetch('/api/warranty/check-sla', { method: 'POST' });
        load();
    };

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>🔧 Quản lý Bảo hành</h1>
                    <p>Theo dõi và xử lý phiếu bảo hành sau bàn giao</p>
                </div>
                <div className="page-header-right">
                    <select className="form-select" style={{ width: 200 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                        <option value="">Tất cả dự án</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                    </select>
                    <select className="form-select" style={{ width: 150 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">Tất cả trạng thái</option>
                        {STATUS.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <select className="form-select" style={{ width: 150 }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                        <option value="">Tất cả loại</option>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <button className="btn btn-ghost" onClick={checkSLA} title="Kiểm tra & đánh dấu vi phạm SLA">🔄 Check SLA</button>
                    <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>{showForm ? 'Đóng' : '+ Tạo phiếu'}</button>
                </div>
            </div>

            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                {STATUS.map(s => (
                    <div key={s} className="card" style={{ padding: '12px 16px', borderLeft: `3px solid ${STATUS_COLOR[s]}` }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: STATUS_COLOR[s] }}>{counts[s] || 0}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s}</div>
                    </div>
                ))}
            </div>
            {slaBreachedCount > 0 && (
                <div className="card" style={{ padding: '10px 16px', marginBottom: 16, borderLeft: '3px solid var(--status-danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    <span style={{ fontWeight: 600, color: 'var(--status-danger)' }}>{slaBreachedCount} phiếu vi phạm SLA</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>— cần xử lý gấp</span>
                </div>
            )}

            {showForm && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-header"><h3>Tạo phiếu bảo hành mới</h3></div>
                    <WarrantyForm projects={projects} onSaved={() => { load(); setShowForm(false); }} onCancel={() => setShowForm(false)} />
                </div>
            )}

            <div className="card">
                <div className="card-header"><h3>Danh sách phiếu ({tickets.length})</h3></div>
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Mã</th>
                                    <th>Tiêu đề</th>
                                    <th>Dự án</th>
                                    <th>Ưu tiên</th>
                                    <th>Trạng thái</th>
                                    <th>Người báo cáo</th>
                                    <th>Xử lý</th>
                                    <th>Ngày tạo</th>
                                    <th>Loại</th>
                                    <th>Hạn BH</th>
                                    <th>SLA</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.length === 0 ? (
                                    <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Chưa có phiếu bảo hành nào</td></tr>
                                ) : tickets.map(t => (
                                    <>
                                        <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setEditingId(editingId === t.id ? null : t.id)}>
                                            <td style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: 12 }}>{t.code}</td>
                                            <td style={{ fontWeight: 500 }}>
                                                {t.title}
                                                {t.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t.notes}</div>}
                                            </td>
                                            <td style={{ fontSize: 12 }}>{t.project?.code} - {t.project?.name}</td>
                                            <td>
                                                <span style={{ fontSize: 11, fontWeight: 600, color: PRIORITY_COLOR[t.priority], padding: '2px 6px', background: `${PRIORITY_COLOR[t.priority]}18`, borderRadius: 4 }}>
                                                    {t.priority}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLOR[t.status], padding: '2px 8px', background: `${STATUS_COLOR[t.status]}18`, borderRadius: 4 }}>
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 12 }}>{t.reportedBy || '—'}</td>
                                            <td style={{ fontSize: 12 }}>{t.assignee || <span style={{ color: 'var(--status-warning)' }}>Chưa assign</span>}</td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(t.createdAt).toLocaleDateString('vi-VN')}</td>
                                            <td><span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: '#f1f5f9' }}>{t.category || '—'}</span></td>
                                            <td style={{ fontSize: 11 }}>{fmtDate(t.warrantyEndDate)}</td>
                                            <td>
                                                {t.slaBreached ? (
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', padding: '2px 8px', borderRadius: 8, background: '#fee2e2' }}>⚠ Quá hạn</span>
                                                ) : t.slaDeadline ? (
                                                    <span style={{ fontSize: 11, color: '#15803d' }}>✅ {fmtDate(t.slaDeadline)}</span>
                                                ) : '—'}
                                            </td>
                                            <td>
                                                <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setEditingId(editingId === t.id ? null : t.id); }}>
                                                    {editingId === t.id ? 'Đóng' : 'Sửa'}
                                                </button>
                                            </td>
                                        </tr>
                                        {editingId === t.id && (
                                            <EditRow key={`edit-${t.id}`} ticket={t} onSaved={() => { load(); setEditingId(null); }} onCancel={() => setEditingId(null)} />
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
