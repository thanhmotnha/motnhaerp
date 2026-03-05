'use client';
import { useState, useEffect, useCallback } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

function AcceptanceForm({ projectId, onSaved, onCancel }) {
    const [title, setTitle] = useState('');
    const [inspector, setInspector] = useState('');
    const [customerRep, setCustomerRep] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState([{ name: '', status: 'pass', note: '' }]);
    const [saving, setSaving] = useState(false);

    const addItem = () => setItems([...items, { name: '', status: 'pass', note: '' }]);
    const updateItem = (i, field, val) => setItems(items.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
    const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));

    const save = async () => {
        if (!title || !projectId) return alert('Chưa nhập tiêu đề hoặc chọn dự án');
        setSaving(true);
        const res = await fetch('/api/acceptance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, title, items: items.filter(i => i.name), inspector, customerRep, notes }),
        });
        if (res.ok) { onSaved?.(); } else { alert('Lỗi tạo biên bản'); }
        setSaving(false);
    };

    return (
        <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                    <label className="form-label">Tiêu đề *</label>
                    <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="VD: Nghiệm thu phần thô tầng 1" />
                </div>
                <div>
                    <label className="form-label">Cán bộ nghiệm thu</label>
                    <input className="form-input" value={inspector} onChange={e => setInspector(e.target.value)} />
                </div>
                <div>
                    <label className="form-label">Đại diện khách hàng</label>
                    <input className="form-input" value={customerRep} onChange={e => setCustomerRep(e.target.value)} />
                </div>
                <div>
                    <label className="form-label">Ghi chú</label>
                    <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
            </div>

            <div style={{ fontWeight: 700, marginBottom: 8 }}>Hạng mục nghiệm thu</div>
            <table className="data-table" style={{ margin: 0, fontSize: 13 }}>
                <thead><tr><th style={{ width: '40%' }}>Hạng mục</th><th style={{ width: '15%' }}>Kết quả</th><th>Ghi chú</th><th style={{ width: 40 }}></th></tr></thead>
                <tbody>
                    {items.map((it, i) => (
                        <tr key={i}>
                            <td><input className="form-input" style={{ margin: 0 }} value={it.name} onChange={e => updateItem(i, 'name', e.target.value)} placeholder="Tên hạng mục" /></td>
                            <td>
                                <select className="form-select" style={{ margin: 0 }} value={it.status} onChange={e => updateItem(i, 'status', e.target.value)}>
                                    <option value="pass">✅ Đạt</option>
                                    <option value="fail">❌ Không đạt</option>
                                    <option value="na">⬜ N/A</option>
                                </select>
                            </td>
                            <td><input className="form-input" style={{ margin: 0 }} value={it.note} onChange={e => updateItem(i, 'note', e.target.value)} /></td>
                            <td><button className="btn btn-ghost btn-sm" onClick={() => removeItem(i)} style={{ color: 'var(--status-danger)' }}>✕</button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button className="btn btn-ghost btn-sm" onClick={addItem} style={{ marginTop: 8 }}>+ Thêm hạng mục</button>

            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
                {onCancel && <button className="btn btn-ghost" onClick={onCancel}>Hủy</button>}
                <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Đang lưu...' : 'Tạo biên bản'}</button>
            </div>
        </div>
    );
}

export default function AcceptancePage() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [filter, setFilter] = useState('');

    const load = useCallback(() => {
        setLoading(true);
        const q = filter ? `?projectId=${filter}` : '';
        fetch(`/api/acceptance${q}`).then(r => r.json()).then(d => { setReports(d.data || []); setLoading(false); });
    }, [filter]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        fetch('/api/projects?limit=100').then(r => r.json()).then(d => setProjects(d.data || d || [])).catch(() => { });
    }, []);

    const statusColor = { 'Chờ duyệt': 'var(--status-warning)', 'Đạt': 'var(--status-success)', 'Không đạt': 'var(--status-danger)' };

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>📋 Biên bản Nghiệm thu</h1>
                    <p>Quản lý biên bản nghiệm thu các hạng mục thi công</p>
                </div>
                <div className="page-header-right">
                    <select className="form-select" style={{ width: 200 }} value={filter} onChange={e => setFilter(e.target.value)}>
                        <option value="">Tất cả dự án</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                    </select>
                    <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Đóng' : '+ Tạo mới'}</button>
                </div>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-header"><h3>Tạo biên bản nghiệm thu mới</h3></div>
                    <div style={{ padding: '0 0 4px' }}>
                        <div style={{ padding: '12px 20px' }}>
                            <label className="form-label">Chọn dự án *</label>
                            <select className="form-select" value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
                                <option value="">-- Chọn dự án --</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                            </select>
                        </div>
                        {selectedProject && <AcceptanceForm projectId={selectedProject} onSaved={() => { load(); setShowForm(false); }} onCancel={() => setShowForm(false)} />}
                    </div>
                </div>
            )}

            <div className="card">
                <div className="card-header"><h3>Danh sách biên bản ({reports.length})</h3></div>
                {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead><tr><th>Mã</th><th>Tiêu đề</th><th>Dự án</th><th>Trạng thái</th><th>Cán bộ NT</th><th>Đại diện KH</th><th>Ngày tạo</th></tr></thead>
                            <tbody>
                                {reports.length === 0 ? (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Chưa có biên bản nghiệm thu</td></tr>
                                ) : reports.map(r => (
                                    <tr key={r.id}>
                                        <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{r.code}</td>
                                        <td style={{ fontWeight: 500 }}>{r.title}</td>
                                        <td style={{ fontSize: 12 }}>{r.project?.code} - {r.project?.name}</td>
                                        <td><span style={{ fontSize: 12, fontWeight: 600, color: statusColor[r.status] || 'var(--text-muted)', padding: '2px 8px', background: `${statusColor[r.status] || 'var(--text-muted)'}15`, borderRadius: 4 }}>{r.status}</span></td>
                                        <td style={{ fontSize: 12 }}>{r.inspector || '—'}</td>
                                        <td style={{ fontSize: 12 }}>{r.customerRep || '—'}</td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString('vi-VN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
