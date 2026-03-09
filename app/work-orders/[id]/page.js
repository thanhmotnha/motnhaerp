'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const STATUSES = ['Chờ xử lý', 'Đang xử lý', 'Hoàn thành', 'Quá hạn'];
const PRIORITIES = ['Cao', 'Trung bình', 'Thấp'];

export default function WorkOrderDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { showToast } = useToast();
    const fileRef = useRef();

    const [wo, setWo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({});
    const [images, setImages] = useState([]);
    const [tasks, setTasks] = useState([]);

    const load = async () => {
        try {
            const data = await apiFetch(`/api/work-orders/${id}`);
            setWo(data);
            setForm({
                title: data.title,
                description: data.description || '',
                status: data.status,
                priority: data.priority,
                assignee: data.assignee || '',
                dueDate: data.dueDate ? data.dueDate.split('T')[0] : '',
                category: data.category || '',
                scheduleTaskId: data.scheduleTaskId || '',
            });
            setImages(() => { try { return JSON.parse(data.images || '[]'); } catch { return []; } });
        } catch { showToast('Không tải được phiếu công việc', 'error'); }
        setLoading(false);
    };

    useEffect(() => { load(); }, [id]);

    // Load schedule tasks for linking
    useEffect(() => {
        if (!wo?.projectId) return;
        apiFetch(`/api/schedule-tasks?projectId=${wo.projectId}`)
            .then(setTasks).catch(() => {});
    }, [wo?.projectId]);

    const save = async () => {
        setSaving(true);
        try {
            await apiFetch(`/api/work-orders/${id}`, {
                method: 'PUT',
                body: JSON.stringify(form),
            });
            showToast('Đã cập nhật', 'success');
            setEditing(false);
            load();
        } catch (e) { showToast(e.message, 'error'); }
        setSaving(false);
    };

    const handleUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        setUploading(true);
        try {
            const newUrls = [];
            for (const file of files) {
                const fd = new FormData();
                fd.append('file', file);
                fd.append('type', 'work-orders');
                const res = await fetch('/api/upload', { method: 'POST', body: fd });
                if (!res.ok) throw new Error(`Upload thất bại: ${res.status}`);
                const d = await res.json();
                if (d.url) newUrls.push(d.url);
            }
            const updated = [...images, ...newUrls];
            await apiFetch(`/api/work-orders/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ images: JSON.stringify(updated) }),
            });
            setImages(updated);
            showToast(`Đã upload ${newUrls.length} ảnh`, 'success');
        } catch (e) { showToast(e.message, 'error'); }
        setUploading(false);
    };

    const deleteImage = async (url) => {
        const updated = images.filter(u => u !== url);
        await apiFetch(`/api/work-orders/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ images: JSON.stringify(updated) }),
        });
        setImages(updated);
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;
    if (!wo) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--status-danger)' }}>Không tìm thấy phiếu công việc</div>;

    const priorityColor = wo.priority === 'Cao' ? 'danger' : wo.priority === 'Trung bình' ? 'warning' : 'muted';
    const statusColor = { 'Chờ xử lý': 'warning', 'Đang xử lý': 'info', 'Hoàn thành': 'success', 'Quá hạn': 'danger' };

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <button className="btn btn-ghost btn-sm" onClick={() => router.push('/work-orders')} style={{ marginBottom: 8 }}>
                        ← Danh sách
                    </button>
                    <h1>{wo.code} — {wo.title}</h1>
                    <p style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className={`badge ${priorityColor}`}>{wo.priority}</span>
                        <span className={`badge ${statusColor[wo.status] || 'muted'}`}>{wo.status}</span>
                        {wo.project && <span className="badge info">{wo.project.code}</span>}
                    </p>
                </div>
                <div className="page-header-right">
                    {editing ? (
                        <>
                            <button className="btn btn-ghost" onClick={() => setEditing(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={save} disabled={saving}>
                                {saving ? 'Đang lưu...' : 'Lưu'}
                            </button>
                        </>
                    ) : (
                        <button className="btn btn-secondary" onClick={() => setEditing(true)}>Chỉnh sửa</button>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
                {/* Main info */}
                <div>
                    <div className="card">
                        <div className="card-header"><span className="card-title">Thông tin phiếu</span></div>
                        <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            {editing ? (
                                <>
                                    <div style={{ gridColumn: '1/-1' }}>
                                        <label className="form-label">Tiêu đề *</label>
                                        <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                                    </div>
                                    <div style={{ gridColumn: '1/-1' }}>
                                        <label className="form-label">Mô tả</label>
                                        <textarea className="form-input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="form-label">Trạng thái</label>
                                        <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                            {STATUSES.map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="form-label">Ưu tiên</label>
                                        <select className="form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                                            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="form-label">Người thực hiện</label>
                                        <input className="form-input" value={form.assignee} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))} placeholder="Tên hoặc nhóm" />
                                    </div>
                                    <div>
                                        <label className="form-label">Hạn hoàn thành</label>
                                        <input type="date" className="form-input" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="form-label">Phân loại</label>
                                        <input className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="VD: Điện, Nước, Nội thất..." />
                                    </div>
                                    <div>
                                        <label className="form-label">Liên kết task tiến độ</label>
                                        <select className="form-select" value={form.scheduleTaskId} onChange={e => setForm(f => ({ ...f, scheduleTaskId: e.target.value }))}>
                                            <option value="">— Không liên kết —</option>
                                            {tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <InfoRow label="Dự án" value={wo.project ? `${wo.project.code} — ${wo.project.name}` : '—'} />
                                    <InfoRow label="Người thực hiện" value={wo.assignee || '—'} />
                                    <InfoRow label="Phân loại" value={wo.category || '—'} />
                                    <InfoRow label="Hạn hoàn thành" value={fmtDate(wo.dueDate)} />
                                    {wo.completedAt && <InfoRow label="Hoàn thành lúc" value={fmtDate(wo.completedAt)} />}
                                    <InfoRow label="Ngày tạo" value={fmtDate(wo.createdAt)} />
                                    {wo.description && (
                                        <div style={{ gridColumn: '1/-1', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                                            {wo.description}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Linked schedule task */}
                    {wo.scheduleTask && (
                        <div className="card" style={{ marginTop: 16 }}>
                            <div className="card-header"><span className="card-title">Task tiến độ liên kết</span></div>
                            <div style={{ padding: '12px 20px', fontSize: 13 }}>
                                <div style={{ fontWeight: 600, color: 'var(--accent-primary)', marginBottom: 6 }}>{wo.scheduleTask.name}</div>
                                <div style={{ display: 'flex', gap: 16, color: 'var(--text-muted)' }}>
                                    <span>{fmtDate(wo.scheduleTask.startDate)} → {fmtDate(wo.scheduleTask.endDate)}</span>
                                    <span>Tiến độ: <strong>{wo.scheduleTask.progress}%</strong></span>
                                    <span className={`badge ${wo.scheduleTask.status === 'Hoàn thành' ? 'success' : 'warning'}`}>{wo.scheduleTask.status}</span>
                                </div>
                                <div style={{ marginTop: 10, background: 'var(--bg-secondary)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${wo.scheduleTask.progress}%`, background: 'var(--accent-primary)', borderRadius: 4 }} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Image gallery */}
                <div>
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">Ảnh hoàn công ({images.length})</span>
                            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                                {uploading ? 'Đang upload...' : '+ Thêm ảnh'}
                            </button>
                            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleUpload} />
                        </div>
                        <div style={{ padding: '12px 16px' }}>
                            {images.length === 0 ? (
                                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg-secondary)', borderRadius: 6 }}>
                                    Chưa có ảnh. Bấm "+ Thêm ảnh" để upload.
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                                    {images.map((url, i) => (
                                        <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                                            <img src={url} alt={`Ảnh ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <button onClick={() => deleteImage(url)}
                                                style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 4, width: 22, height: 22, cursor: 'pointer', fontSize: 11 }}>✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
        </div>
    );
}
