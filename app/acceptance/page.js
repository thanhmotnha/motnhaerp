'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

const statusMap = { pending: { label: 'Chờ duyệt', color: '#f59e0b' }, approved: { label: 'Đạt', color: '#22c55e' }, rejected: { label: 'Không đạt', color: '#ef4444' } };

export default function AcceptancePage() {
    const { role } = useRole();
    const toast = useToast();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState('');
    const canManage = role === 'giam_doc';

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/acceptance');
            setReports(res.data || []);
        } catch (e) { toast.error(e.message); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filtered = reports.filter(r =>
        !search || r.title?.toLowerCase().includes(search.toLowerCase()) ||
        r.code?.toLowerCase().includes(search.toLowerCase()) ||
        r.project?.name?.toLowerCase().includes(search.toLowerCase())
    );

    const stats = {
        total: reports.length,
        approved: reports.filter(r => r.status === 'approved').length,
        pending: reports.filter(r => r.status === 'pending' || !r.status).length,
        rejected: reports.filter(r => r.status === 'rejected').length,
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h2 style={{ margin: 0 }}>Biên bản Nghiệm thu</h2>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Quản lý biên bản nghiệm thu công trình</div>
                </div>
                {canManage && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Tạo biên bản</button>}
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Tổng', value: stats.total, color: 'var(--primary)' },
                    { label: 'Đạt', value: stats.approved, color: '#22c55e' },
                    { label: 'Chờ duyệt', value: stats.pending, color: '#f59e0b' },
                    { label: 'Không đạt', value: stats.rejected, color: '#ef4444' },
                ].map(k => (
                    <div key={k.label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.label}</div>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div style={{ marginBottom: 16 }}>
                <input className="form-input" placeholder="Tìm kiếm theo mã, tiêu đề, dự án..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 360 }} />
            </div>

            {/* Table */}
            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : (
                <div className="card" style={{ overflow: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Mã</th><th>Tiêu đề</th><th>Dự án</th><th>Người KT</th><th>Trạng thái</th><th>Ngày tạo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(r => {
                                const st = statusMap[r.status] || statusMap.pending;
                                return (
                                    <tr key={r.id}>
                                        <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{r.code}</td>
                                        <td>{r.title}</td>
                                        <td>{r.project?.name || '—'}</td>
                                        <td>{r.inspector || '—'}</td>
                                        <td><span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: st.color + '18', color: st.color }}>{st.label}</span></td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : '—'}</td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>Chưa có biên bản nào</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Form Modal */}
            {showForm && <AcceptanceFormModal onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); fetchData(); }} toast={toast} />}
        </div>
    );
}

function AcceptanceFormModal({ onClose, onSuccess, toast }) {
    const [form, setForm] = useState({ projectId: '', title: '', inspector: '', customerRep: '', notes: '' });
    const [projects, setProjects] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        apiFetch('/api/projects?limit=200').then(r => setProjects(r.data || [])).catch(() => {});
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.projectId || !form.title) return toast.error('Vui lòng nhập đầy đủ');
        setSaving(true);
        try {
            await apiFetch('/api/acceptance', { method: 'POST', body: JSON.stringify(form) });
            toast.success('Tạo biên bản thành công');
            onSuccess();
        } catch (e) { toast.error(e.message); }
        setSaving(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                <h3 style={{ marginTop: 0 }}>Tạo biên bản Nghiệm thu</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Dự án *</label>
                        <select className="form-input" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} required>
                            <option value="">Chọn dự án</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Tiêu đề *</label>
                        <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group"><label className="form-label">Người kiểm tra</label><input className="form-input" value={form.inspector} onChange={e => setForm({ ...form, inspector: e.target.value })} /></div>
                        <div className="form-group"><label className="form-label">Đại diện KH</label><input className="form-input" value={form.customerRep} onChange={e => setForm({ ...form, customerRep: e.target.value })} /></div>
                    </div>
                    <div className="form-group"><label className="form-label">Ghi chú</label><textarea className="form-input" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                        <button type="button" className="btn" onClick={onClose}>Hủy</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Tạo biên bản'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
