'use client';
import { useState, useEffect } from 'react';
import { fmtDate } from '@/lib/projectUtils';
import { apiFetch } from '@/lib/fetchClient';

const WARRANTY_STATUSES = ['Mới', 'Đang xử lý', 'Hoàn thành'];
const PUNCH_STATUSES = ['Mở', 'Đang xử lý', 'Đã xử lý'];
const PRIORITY_OPTS = ['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp'];
const STATUS_BADGE = { 'Mới': 'danger', 'Đang xử lý': 'warning', 'Hoàn thành': 'success', 'Mở': 'danger', 'Đã xử lý': 'success' };

export default function WarrantyTab({ projectId }) {
    const [tickets, setTickets] = useState([]);
    const [punches, setPunches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showPunchForm, setShowPunchForm] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', reportedBy: '', assignee: '', priority: 'Trung bình' });
    const [punchForm, setPunchForm] = useState({ description: '', area: '', assignee: '', priority: 'Trung bình' });
    const [saving, setSaving] = useState(false);
    const [savingPunch, setSavingPunch] = useState(false);

    const load = () => {
        setLoading(true);
        Promise.all([
            fetch(`/api/warranty?projectId=${projectId}`).then(r => r.json()),
            fetch(`/api/projects/${projectId}/punch-list`).then(r => r.json()),
        ]).then(([w, p]) => {
            setTickets(Array.isArray(w) ? w : w.data || []);
            setPunches(Array.isArray(p) ? p : p.data || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    useEffect(load, [projectId]);

    const addTicket = async () => {
        if (!form.title.trim()) return alert('Nhập tiêu đề yêu cầu bảo hành!');
        setSaving(true);
        await apiFetch('/api/warranty', { method: 'POST', body: { ...form, projectId } });
        setSaving(false);
        setForm({ title: '', description: '', reportedBy: '', assignee: '', priority: 'Trung bình' });
        setShowForm(false);
        load();
    };

    const updateStatus = async (id, status) => {
        await apiFetch(`/api/warranty/${id}`, { method: 'PUT', body: { status } });
        load();
    };

    const deleteTicket = async (id) => {
        if (!confirm('Xóa ticket này?')) return;
        await apiFetch(`/api/warranty/${id}`, { method: 'DELETE' });
        load();
    };

    const addPunch = async () => {
        if (!punchForm.description.trim()) return alert('Nhập mô tả lỗi!');
        setSavingPunch(true);
        await apiFetch(`/api/projects/${projectId}/punch-list`, { method: 'POST', body: punchForm });
        setSavingPunch(false);
        setPunchForm({ description: '', area: '', assignee: '', priority: 'Trung bình' });
        setShowPunchForm(false);
        load();
    };

    const updatePunchStatus = async (id, status) => {
        await apiFetch(`/api/projects/${projectId}/punch-list`, { method: 'PUT', body: { id, status } });
        load();
    };

    const open = tickets.filter(t => t.status === 'Mới' || t.status === 'Đang xử lý').length;
    const openPunches = punches.filter(p => p.status !== 'Đã xử lý').length;

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Bảo hành sau bàn giao */}
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
                                    <span className={`badge ${STATUS_BADGE[t.priority] || 'muted'}`} style={{ fontSize: 11 }}>{t.priority}</span>
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

            {/* Lỗi trước bàn giao (Punch List) */}
            <div className="card" style={{ padding: 24 }}>
                <div className="card-header" style={{ marginBottom: 20 }}>
                    <div>
                        <span className="card-title">📋 Lỗi trước bàn giao</span>
                        {openPunches > 0 && <span className="badge warning" style={{ marginLeft: 8 }}>{openPunches} chưa xử lý</span>}
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowPunchForm(v => !v)}>
                        {showPunchForm ? 'Đóng' : '+ Ghi nhận lỗi'}
                    </button>
                </div>

                {showPunchForm && (
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Mô tả lỗi *</label>
                                <input className="form-input" placeholder="Mô tả vấn đề cần sửa trước bàn giao" value={punchForm.description} onChange={e => setPunchForm({ ...punchForm, description: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ưu tiên</label>
                                <select className="form-input" value={punchForm.priority} onChange={e => setPunchForm({ ...punchForm, priority: e.target.value })}>
                                    {PRIORITY_OPTS.map(p => <option key={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Khu vực</label>
                                <input className="form-input" placeholder="Phòng khách, phòng ngủ..." value={punchForm.area} onChange={e => setPunchForm({ ...punchForm, area: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Người xử lý</label>
                                <input className="form-input" placeholder="Kỹ thuật phụ trách" value={punchForm.assignee} onChange={e => setPunchForm({ ...punchForm, assignee: e.target.value })} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowPunchForm(false)}>Hủy</button>
                            <button className="btn btn-primary btn-sm" onClick={addPunch} disabled={savingPunch}>
                                {savingPunch ? 'Đang lưu...' : 'Ghi nhận'}
                            </button>
                        </div>
                    </div>
                )}

                {punches.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa ghi nhận lỗi nào trước bàn giao</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {punches.map(item => (
                            <div key={item.id} style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: 200 }}>
                                    <div style={{ fontSize: 13, fontWeight: 500 }}>{item.description}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'flex', gap: 12 }}>
                                        {item.area && <span>📍 {item.area}</span>}
                                        {item.assignee && <span>🔧 {item.assignee}</span>}
                                        <span>{fmtDate(item.createdAt)}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                                    <span className={`badge ${STATUS_BADGE[item.priority] || 'muted'}`} style={{ fontSize: 11 }}>{item.priority}</span>
                                    <select className="form-input" style={{ fontSize: 12, padding: '4px 8px', width: 'auto' }} value={item.status} onChange={e => updatePunchStatus(item.id, e.target.value)}>
                                        {PUNCH_STATUSES.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
