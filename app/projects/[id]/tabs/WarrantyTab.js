'use client';
import { useState, useEffect } from 'react';
import { fmtDate } from '@/lib/projectUtils';

const WARRANTY_STATUSES = ['Mới', 'Đang xử lý', 'Hoàn thành'];
const PRIORITY_OPTS = ['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp'];
const STATUS_BADGE = { 'Mới': 'danger', 'Đang xử lý': 'warning', 'Hoàn thành': 'success' };

export default function WarrantyTab({ projectId }) {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', reportedBy: '', assignee: '', priority: 'Trung bình' });
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        fetch(`/api/warranty?projectId=${projectId}`)
            .then(r => r.json())
            .then(d => { setTickets(Array.isArray(d) ? d : d.data || []); setLoading(false); });
    };

    useEffect(load, [projectId]);

    const addTicket = async () => {
        if (!form.title.trim()) return alert('Nhập tiêu đề yêu cầu bảo hành!');
        setSaving(true);
        await fetch('/api/warranty', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, projectId }),
        });
        setSaving(false);
        setForm({ title: '', description: '', reportedBy: '', assignee: '', priority: 'Trung bình' });
        setShowForm(false);
        load();
    };

    const updateStatus = async (id, status) => {
        await fetch(`/api/warranty/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        load();
    };

    const deleteTicket = async (id) => {
        if (!confirm('Xóa ticket này?')) return;
        await fetch(`/api/warranty/${id}`, { method: 'DELETE' });
        load();
    };

    const open = tickets.filter(t => t.status === 'Mới' || t.status === 'Đang xử lý').length;

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

    return (
        <div className="card" style={{ padding: 24 }}>
            <div className="card-header" style={{ marginBottom: 20 }}>
                <div>
                    <span className="card-title">🛡️ Bảo hành / After-sales</span>
                    {open > 0 && <span className="badge danger" style={{ marginLeft: 8 }}>{open} đang mở</span>}
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
                    {showForm ? 'Đóng' : '+ Tạo ticket'}
                </button>
            </div>

            {showForm && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tiêu đề *</label>
                            <input className="form-input" placeholder="Mô tả vấn đề bảo hành" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ưu tiên</label>
                            <select className="form-input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                                {PRIORITY_OPTS.map(p => <option key={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Người báo</label>
                            <input className="form-input" placeholder="Tên khách hàng / kỹ thuật" value={form.reportedBy} onChange={e => setForm({ ...form, reportedBy: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Người xử lý</label>
                            <input className="form-input" placeholder="Kỹ thuật phụ trách" value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} />
                        </div>
                    </div>
                    <textarea className="form-input" rows={3} placeholder="Chi tiết vấn đề..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Hủy</button>
                        <button className="btn btn-primary btn-sm" onClick={addTicket} disabled={saving}>
                            {saving ? 'Đang lưu...' : 'Tạo ticket'}
                        </button>
                    </div>
                </div>
            )}

            {tickets.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có yêu cầu bảo hành</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {tickets.map(t => (
                        <div key={t.id} style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8, display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: 200 }}>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</div>
                                {t.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{t.description}</div>}
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                    {t.reportedBy && <span>👤 {t.reportedBy}</span>}
                                    {t.assignee && <span>🔧 {t.assignee}</span>}
                                    <span>{fmtDate(t.createdAt)}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                                <span className={`badge ${STATUS_BADGE[t.status] || 'muted'}`} style={{ fontSize: 11 }}>{t.priority}</span>
                                <select className="form-input" style={{ fontSize: 12, padding: '4px 8px', width: 'auto' }} value={t.status} onChange={e => updateStatus(t.id, e.target.value)}>
                                    {WARRANTY_STATUSES.map(s => <option key={s}>{s}</option>)}
                                </select>
                                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--status-danger)' }} onClick={() => deleteTicket(t.id)}>🗑</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
