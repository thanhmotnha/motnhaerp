'use client';
import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/fetchClient';

const ISSUE_TYPES = [
    { value: 'material', label: '📦 Thiếu vật tư' },
    { value: 'repair', label: '🔨 Sửa chữa / điều chỉnh' },
    { value: 'other', label: '📝 Khác' },
];
const PRIORITY = [
    { value: 'low', label: 'Thấp', color: 'var(--text-muted)' },
    { value: 'normal', label: 'Bình thường', color: 'var(--status-info)' },
    { value: 'high', label: '🔴 Khẩn', color: 'var(--status-danger)' },
];
const STATUS = [
    { value: 'open', label: 'Mới', badge: 'warning' },
    { value: 'in_progress', label: 'Đang xử lý', badge: 'info' },
    { value: 'resolved', label: 'Đã xong', badge: 'success' },
];
const TYPE_ICON = { material: '📦', repair: '🔨', other: '📝' };

const EMPTY_FORM = { issueType: 'material', title: '', description: '', priority: 'normal', imageUrl: '' };

export default function IssuesTab({ orderId }) {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [resolveModal, setResolveModal] = useState(null); // issue id
    const [resolveNote, setResolveNote] = useState('');
    const fileRef = useRef(null);

    const fetchIssues = () => {
        apiFetch(`/api/furniture-orders/${orderId}/issues`)
            .then(d => setIssues(d || []))
            .finally(() => setLoading(false));
    };
    useEffect(() => { fetchIssues(); }, [orderId]);

    const handleUploadImage = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('type', 'documents');
            const res = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' });
            if (!res.ok) throw new Error('Upload thất bại');
            const { url } = await res.json();
            setForm(f => ({ ...f, imageUrl: url }));
        } catch (err) { alert(err.message); }
        setUploading(false);
    };

    const submit = async () => {
        if (!form.title.trim()) return alert('Nhập tiêu đề phát sinh!');
        setSaving(true);
        try {
            const issue = await apiFetch(`/api/furniture-orders/${orderId}/issues`, { method: 'POST', body: form });
            setIssues(prev => [issue, ...prev]);
            setForm(EMPTY_FORM);
            setShowForm(false);
        } catch (err) { alert(err.message || 'Lỗi tạo phát sinh'); }
        setSaving(false);
    };

    const updateStatus = async (iid, status) => {
        const data = { status };
        if (status === 'resolved') data.resolvedNote = resolveNote;
        const updated = await apiFetch(`/api/furniture-orders/${orderId}/issues/${iid}`, { method: 'PUT', body: data });
        setIssues(prev => prev.map(i => i.id === iid ? updated : i));
        setResolveModal(null);
        setResolveNote('');
    };

    const deleteIssue = async (iid) => {
        if (!confirm('Xóa phát sinh này?')) return;
        await apiFetch(`/api/furniture-orders/${orderId}/issues/${iid}`, { method: 'DELETE' });
        setIssues(prev => prev.filter(i => i.id !== iid));
    };

    const open = issues.filter(i => i.status !== 'resolved').length;
    const resolved = issues.filter(i => i.status === 'resolved').length;

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Header */}
            <div className="card">
                <div className="card-header">
                    <div>
                        <span className="card-title">⚠️ Phát sinh thi công</span>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            {open > 0 && <span style={{ color: 'var(--status-warning)', marginRight: 12 }}>{open} chưa xử lý</span>}
                            {resolved > 0 && <span style={{ color: 'var(--status-success)' }}>{resolved} đã xong</span>}
                        </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
                        {showForm ? '✕ Đóng' : '+ Tạo phát sinh'}
                    </button>
                </div>

                {showForm && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loại phát sinh</label>
                                <select className="form-input" value={form.issueType} onChange={e => setForm(f => ({ ...f, issueType: e.target.value }))}>
                                    {ISSUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Mức độ</label>
                                <select className="form-input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                                    {PRIORITY.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ảnh đính kèm</label>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUploadImage} />
                                    <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                                        {uploading ? '⏳...' : form.imageUrl ? '✅ Đã có ảnh' : '📷 Chọn ảnh'}
                                    </button>
                                    {form.imageUrl && <button className="btn btn-ghost btn-sm" onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}>✕</button>}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tiêu đề *</label>
                            <input className="form-input" placeholder="VD: Thiếu 5 tờ ván MS 331, cần đặt thêm..."
                                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Mô tả chi tiết</label>
                            <textarea className="form-input" rows={3} placeholder="Mô tả cụ thể hơn, vị trí, số lượng..."
                                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>Hủy</button>
                            <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? '⏳...' : 'Tạo phát sinh'}</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Issue list */}
            {issues.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    Chưa có phát sinh nào
                </div>
            ) : (
                issues.map(issue => {
                    const st = STATUS.find(s => s.value === issue.status) || STATUS[0];
                    const pri = PRIORITY.find(p => p.value === issue.priority) || PRIORITY[1];
                    return (
                        <div key={issue.id} className="card" style={{ opacity: issue.status === 'resolved' ? 0.7 : 1 }}>
                            <div style={{ display: 'flex', gap: 12 }}>
                                {issue.imageUrl && (
                                    <a href={issue.imageUrl} target="_blank" rel="noreferrer" style={{ flexShrink: 0 }}>
                                        <img src={issue.imageUrl} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                                    </a>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{issue.code}</span>
                                        <span className={`badge ${st.badge}`}>{st.label}</span>
                                        <span style={{ fontSize: 11, color: pri.color }}>{pri.label}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{TYPE_ICON[issue.issueType]} {ISSUE_TYPES.find(t => t.value === issue.issueType)?.label.replace(/^[^ ]+ /, '')}</span>
                                    </div>
                                    <div style={{ fontWeight: 600, marginTop: 4, fontSize: 14 }}>{issue.title}</div>
                                    {issue.description && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, whiteSpace: 'pre-wrap' }}>{issue.description}</div>}
                                    {issue.resolvedNote && (
                                        <div style={{ fontSize: 12, color: 'var(--status-success)', marginTop: 6, background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: 4 }}>
                                            ✅ {issue.resolvedNote}
                                        </div>
                                    )}
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                                        {issue.reportedBy} · {new Date(issue.createdAt).toLocaleDateString('vi-VN')}
                                        {issue.resolvedBy && ` · Xử lý: ${issue.resolvedBy}`}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                                    {issue.status === 'open' && (
                                        <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(issue.id, 'in_progress')}>→ Đang xử lý</button>
                                    )}
                                    {issue.status === 'in_progress' && (
                                        <button className="btn btn-primary btn-sm" onClick={() => { setResolveModal(issue.id); setResolveNote(''); }}>✓ Xong</button>
                                    )}
                                    {issue.status !== 'resolved' && (
                                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)' }} onClick={() => deleteIssue(issue.id)}>Xóa</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })
            )}

            {/* Resolve modal */}
            {resolveModal && (
                <div className="modal-overlay" onClick={() => setResolveModal(null)}>
                    <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Ghi chú hoàn thành</h3>
                            <button className="modal-close" onClick={() => setResolveModal(null)}>×</button>
                        </div>
                        <textarea className="form-input" rows={4} placeholder="VD: Đã đặt thêm 5 tờ ván, nhận ngày 15/4..."
                            value={resolveNote} onChange={e => setResolveNote(e.target.value)} />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                            <button className="btn btn-ghost" onClick={() => setResolveModal(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={() => updateStatus(resolveModal, 'resolved')}>✅ Đánh dấu xong</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
