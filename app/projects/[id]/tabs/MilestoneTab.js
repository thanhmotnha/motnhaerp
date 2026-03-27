'use client';
import { useState } from 'react';
import { fmtDate, milestoneStatus } from '@/lib/projectUtils';

export default function MilestoneTab({ project: p, projectId, onRefresh }) {
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', plannedDate: '', description: '' });
    const [saving, setSaving] = useState(false);

    const milestones = p.milestones || [];
    const done = milestones.filter(m => m.progress === 100).length;
    const overall = milestones.length > 0 ? Math.round(milestones.reduce((s, m) => s + (Number(m.progress) || 0), 0) / milestones.length) : 0;

    const updateProgress = async (msId, progress) => {
        await fetch(`/api/milestones/${msId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ progress: Number(progress), status: milestoneStatus(progress) }),
        });
        onRefresh();
    };

    const addMilestone = async () => {
        if (!form.name.trim()) return alert('Nhập tên mốc tiến độ!');
        setSaving(true);
        await fetch('/api/milestones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, projectId, progress: 0, status: 'Chưa bắt đầu' }),
        });
        setSaving(false);
        setForm({ name: '', plannedDate: '', description: '' });
        setShowForm(false);
        onRefresh();
    };

    return (
        <div className="card" style={{ padding: 24 }}>
            <div className="card-header" style={{ marginBottom: 20 }}>
                <div>
                    <span className="card-title">📊 Tiến độ dự án</span>
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 200, height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${overall}%`, height: '100%', background: overall === 100 ? 'var(--status-success)' : 'var(--accent-primary)', transition: '0.3s' }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{done}/{milestones.length} mốc ({overall}%)</span>
                    </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
                    {showForm ? 'Đóng' : '+ Thêm mốc'}
                </button>
            </div>

            {showForm && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tên mốc</label>
                        <input className="form-input" placeholder="Hoàn thiện phần móng..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ngày dự kiến</label>
                        <input className="form-input" type="date" value={form.plannedDate} onChange={e => setForm({ ...form, plannedDate: e.target.value })} />
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={addMilestone} disabled={saving}>
                        {saving ? 'Đang lưu...' : 'Thêm'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Hủy</button>
                </div>
            )}

            {milestones.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Chưa có mốc tiến độ</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {milestones.map(ms => {
                        const progress = Number(ms.progress) || 0;
                        const overdue = ms.plannedDate && new Date() > new Date(ms.plannedDate) && progress < 100;
                        return (
                            <div key={ms.id} style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: 200 }}>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{ms.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, display: 'flex', gap: 12 }}>
                                        {ms.plannedDate && <span>Dự kiến: {fmtDate(ms.plannedDate)}</span>}
                                        {ms.actualDate && <span>Thực tế: {fmtDate(ms.actualDate)}</span>}
                                        {overdue && <span style={{ color: 'var(--status-danger)', fontWeight: 600 }}>⚠ Trễ hạn</span>}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 120, height: 6, background: 'var(--bg-primary)', borderRadius: 3 }}>
                                        <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? 'var(--status-success)' : 'var(--accent-primary)', borderRadius: 3, transition: '0.3s' }} />
                                    </div>
                                    <input
                                        type="number"
                                        min={0} max={100}
                                        className="form-input"
                                        style={{ width: 64, padding: '4px 8px', fontSize: 13, textAlign: 'center' }}
                                        defaultValue={progress}
                                        onBlur={e => { if (Number(e.target.value) !== progress) updateProgress(ms.id, e.target.value); }}
                                    />
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>%</span>
                                    <span className={`badge ${progress === 100 ? 'success' : progress > 0 ? 'warning' : 'muted'}`} style={{ fontSize: 11 }}>
                                        {milestoneStatus(progress)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
