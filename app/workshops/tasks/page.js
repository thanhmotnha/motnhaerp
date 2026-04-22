'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

const STATUS_COLS = [
    { key: 'Chưa làm', color: '#94a3b8', bg: '#f1f5f9' },
    { key: 'Đang làm', color: '#2980b9', bg: '#dbeafe' },
    { key: 'Xong', color: '#16a085', bg: '#dcfce7' },
    { key: 'Tạm hoãn', color: '#d97706', bg: '#fef3c7' },
];

const PRIORITIES = [
    { key: 'Thấp', color: '#6b7280' },
    { key: 'Bình thường', color: '#2980b9' },
    { key: 'Cao', color: '#d97706' },
    { key: 'Gấp', color: '#dc2626' },
];

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const today = () => new Date().toISOString().slice(0, 10);
const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);

export default function WorkshopTasksPage() {
    const toast = useToast();
    const [tasks, setTasks] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [view, setView] = useState('kanban'); // kanban | byWorker
    const [dateFilter, setDateFilter] = useState(today());

    const [form, setForm] = useState({
        workerIds: [],
        title: '',
        description: '',
        dueDate: tomorrow(),
        priority: 'Bình thường',
        projectId: '',
    });

    const load = useCallback(async () => {
        try {
            const qs = new URLSearchParams({ limit: '500' });
            if (dateFilter) {
                qs.set('from', dateFilter);
                qs.set('to', `${dateFilter}T23:59:59`);
            }
            const [tasksRes, workersRes, projRes] = await Promise.all([
                apiFetch(`/api/workshop-tasks?${qs}`),
                apiFetch('/api/users?role=kho'),
                apiFetch('/api/projects?limit=500'),
            ]);
            setTasks(tasksRes?.data || []);
            const wArr = Array.isArray(workersRes) ? workersRes : (workersRes?.data || []);
            setWorkers(wArr);
            setProjects(projRes?.data || []);
        } catch (e) {
            toast.showToast(e.message || 'Lỗi tải dữ liệu', 'error');
        } finally { setLoading(false); }
    }, [dateFilter]);

    useEffect(() => { load(); }, [load]);

    const submit = async () => {
        if (form.workerIds.length === 0) return toast.showToast('Chọn thợ', 'error');
        if (!form.title.trim()) return toast.showToast('Nhập tên công việc', 'error');
        try {
            const res = await apiFetch('/api/workshop-tasks', {
                method: 'POST',
                body: JSON.stringify({
                    workerIds: form.workerIds,
                    title: form.title.trim(),
                    description: form.description,
                    dueDate: form.dueDate,
                    priority: form.priority,
                    projectId: form.projectId || null,
                }),
            });
            toast.showToast(`Đã tạo ${res.created} công việc`, 'success');
            setForm({ workerIds: [], title: '', description: '', dueDate: tomorrow(), priority: 'Bình thường', projectId: '' });
            setShowForm(false);
            load();
        } catch (e) { toast.showToast(e.message || 'Lỗi', 'error'); }
    };

    const updateStatus = async (taskId, status) => {
        try {
            await apiFetch(`/api/workshop-tasks/${taskId}`, {
                method: 'PUT',
                body: JSON.stringify({ status }),
            });
            load();
        } catch (e) { toast.showToast(e.message || 'Lỗi', 'error'); }
    };

    const del = async (taskId) => {
        if (!confirm('Xóa công việc này?')) return;
        try {
            await apiFetch(`/api/workshop-tasks/${taskId}`, { method: 'DELETE' });
            toast.showToast('Đã xóa', 'success');
            load();
        } catch (e) { toast.showToast(e.message || 'Lỗi', 'error'); }
    };

    const tasksByStatus = STATUS_COLS.reduce((acc, c) => {
        acc[c.key] = tasks.filter(t => t.status === c.key);
        return acc;
    }, {});

    const workerSummary = workers.map(w => {
        const wt = tasks.filter(t => t.workerId === w.id);
        return {
            ...w,
            total: wt.length,
            done: wt.filter(t => t.status === 'Xong').length,
            inProgress: wt.filter(t => t.status === 'Đang làm').length,
            todo: wt.filter(t => t.status === 'Chưa làm').length,
        };
    });

    return (
        <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🔨 Công việc xưởng</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>
                        Phân việc cho thợ xưởng — kanban theo trạng thái
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="date" className="form-input" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ width: 160 }} />
                    <button className="btn btn-secondary" onClick={() => setView(view === 'kanban' ? 'byWorker' : 'kanban')}>
                        {view === 'kanban' ? '👷 Theo thợ' : '📋 Kanban'}
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Phân việc</button>
                </div>
            </div>

            {/* Summary bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                {STATUS_COLS.map(c => (
                    <div key={c.key} className="card" style={{ padding: 12, background: c.bg, borderLeft: `4px solid ${c.color}` }}>
                        <div style={{ fontSize: 11, color: c.color, fontWeight: 700, textTransform: 'uppercase' }}>{c.key}</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: c.color, marginTop: 2 }}>{tasksByStatus[c.key].length}</div>
                    </div>
                ))}
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải…</div>
            ) : view === 'kanban' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    {STATUS_COLS.map(col => (
                        <div key={col.key} style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 10, minHeight: 200 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: col.color, marginBottom: 8, paddingBottom: 6, borderBottom: `2px solid ${col.color}` }}>
                                {col.key} ({tasksByStatus[col.key].length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {tasksByStatus[col.key].map(t => (
                                    <TaskCard key={t.id} task={t} onStatusChange={updateStatus} onDelete={del} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                // byWorker view
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {workerSummary.map(w => {
                        const wt = tasks.filter(t => t.workerId === w.id);
                        return (
                            <div key={w.id} className="card" style={{ padding: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 18, background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                                        {w.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>{w.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {w.total} công việc · {w.done}/{w.total} xong
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <StatChip label={`${w.todo}`} color="#94a3b8" title="Chưa làm" />
                                        <StatChip label={`${w.inProgress}`} color="#2980b9" title="Đang làm" />
                                        <StatChip label={`${w.done}`} color="#16a085" title="Xong" />
                                    </div>
                                </div>
                                {wt.length === 0 ? (
                                    <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                                        Chưa phân việc
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {wt.map(t => (
                                            <TaskCard key={t.id} task={t} onStatusChange={updateStatus} onDelete={del} compact />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {workerSummary.length === 0 && (
                        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                            Chưa có thợ xưởng. Tạo user với role "Xưởng" trong Cài đặt → Người dùng.
                        </div>
                    )}
                </div>
            )}

            {/* Form modal */}
            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <div className="modal-header">
                            <h3>Phân việc cho thợ xưởng</h3>
                            <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Thợ nhận việc * ({form.workerIds.length} chọn)</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {workers.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có thợ nào</div>}
                                    {workers.map(w => (
                                        <button
                                            key={w.id}
                                            type="button"
                                            onClick={() => {
                                                setForm(f => ({
                                                    ...f,
                                                    workerIds: f.workerIds.includes(w.id)
                                                        ? f.workerIds.filter(x => x !== w.id)
                                                        : [...f.workerIds, w.id],
                                                }));
                                            }}
                                            style={{
                                                padding: '6px 14px', borderRadius: 20, fontSize: 13,
                                                background: form.workerIds.includes(w.id) ? 'var(--primary)' : 'transparent',
                                                color: form.workerIds.includes(w.id) ? '#fff' : 'var(--text-primary)',
                                                border: '1px solid var(--border-color)',
                                                cursor: 'pointer',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {form.workerIds.includes(w.id) && '✓ '}{w.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Tên công việc *</label>
                                <input
                                    className="form-input" value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    placeholder="VD: Gia công tủ bếp — 5m"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Mô tả chi tiết</label>
                                <textarea
                                    className="form-input" rows={3} value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    placeholder="Vật liệu, kích thước, yêu cầu chất lượng..."
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Deadline *</label>
                                    <input
                                        type="date" className="form-input" value={form.dueDate}
                                        onChange={e => setForm({ ...form, dueDate: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Mức ưu tiên</label>
                                    <select className="form-select" value={form.priority}
                                        onChange={e => setForm({ ...form, priority: e.target.value })}>
                                        {PRIORITIES.map(p => <option key={p.key}>{p.key}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Dự án liên quan (optional)</label>
                                <select className="form-select" value={form.projectId}
                                    onChange={e => setForm({ ...form, projectId: e.target.value })}>
                                    <option value="">— Không gắn dự án —</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={submit}>
                                Tạo {form.workerIds.length > 0 ? `${form.workerIds.length} ` : ''}công việc
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// fmtDate is declared at module top
function TaskCard({ task, onStatusChange, onDelete, compact }) {
    const pri = PRIORITIES.find(p => p.key === task.priority) || PRIORITIES[1];
    return (
        <div style={{
            background: 'var(--bg-card)', borderRadius: 8, padding: 10,
            border: '1px solid var(--border-color)',
            borderLeft: `3px solid ${pri.color}`,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{task.title}</div>
                    {!compact && task.description && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, whiteSpace: 'pre-wrap' }}>{task.description}</div>
                    )}
                </div>
                <button onClick={() => onDelete(task.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0, fontSize: 12 }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, padding: '2px 6px', background: pri.color + '22', color: pri.color, borderRadius: 4, fontWeight: 600 }}>{pri.key}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>👤 {task.worker?.name}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>📅 {fmtDate(task.dueDate)}</span>
                {task.project && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>📁 {task.project.name}</span>}
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                <select
                    value={task.status}
                    onChange={e => onStatusChange(task.id, e.target.value)}
                    style={{ flex: 1, fontSize: 11, padding: '3px 6px', border: '1px solid var(--border-color)', borderRadius: 4, background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                >
                    {STATUS_COLS.map(s => <option key={s.key} value={s.key}>{s.key}</option>)}
                </select>
            </div>
        </div>
    );
}

function StatChip({ label, color, title }) {
    return (
        <div title={title} style={{
            minWidth: 28, height: 28, borderRadius: 14, background: color + '22', color,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
        }}>{label}</div>
    );
}
