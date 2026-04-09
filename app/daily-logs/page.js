'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

const weatherIcons = { 'Nắng': '☀️', 'Mưa': '🌧️', 'Âm u': '☁️', 'Mưa nhẹ': '🌦️' };

export default function DailyLogsPage() {
    const { role } = useRole();
    const toast = useToast();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const canLog = ['giam_doc', 'ky_thuat'].includes(role);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/daily-logs?limit=100');
            setLogs(res.data || []);
        } catch (e) { toast.error(e.message); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const todayLogs = logs.filter(l => {
        const d = new Date(l.date);
        const now = new Date();
        return d.toDateString() === now.toDateString();
    });

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h2 style={{ margin: 0 }}>Nhật ký Công trường</h2>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Ghi nhận tiến độ hàng ngày</div>
                </div>
                {canLog && <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Ghi nhật ký</button>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Tổng bản ghi', value: logs.length, color: 'var(--primary)' },
                    { label: 'Hôm nay', value: todayLogs.length, color: '#22c55e' },
                    { label: 'Nhân sự TB', value: logs.length ? Math.round(logs.reduce((s, l) => s + (l.workerCount || 0), 0) / logs.length) : 0, color: '#3b82f6' },
                ].map(k => (
                    <div key={k.label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.label}</div>
                    </div>
                ))}
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : logs.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có nhật ký nào</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {logs.map(l => (
                        <div key={l.id} className="card" style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                                <div>
                                    <span style={{ fontWeight: 600 }}>{l.project?.name || '—'}</span>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{l.project?.code}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 }}>
                                    <span>{weatherIcons[l.weather] || '🌤️'} {l.weather}</span>
                                    <span>👷 {l.workerCount} người</span>
                                    <span style={{ color: 'var(--text-muted)' }}>{new Date(l.date).toLocaleDateString('vi-VN')}</span>
                                </div>
                            </div>
                            <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                                <strong>Công việc:</strong> {l.progress || '—'}
                            </div>
                            {l.issues && <div style={{ fontSize: 13, color: '#ef4444', marginTop: 4 }}>⚠️ {l.issues}</div>}
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Người ghi: {l.createdBy || '—'}</div>
                        </div>
                    ))}
                </div>
            )}

            {showForm && <DailyLogForm onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); fetchData(); }} toast={toast} />}
        </div>
    );
}

function DailyLogForm({ onClose, onSuccess, toast }) {
    const [form, setForm] = useState({ projectId: '', weather: 'Nắng', workforce: '', workDone: '', issues: '' });
    const [projects, setProjects] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        apiFetch('/api/projects?limit=200').then(r => setProjects(r.data || [])).catch(() => {});
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.projectId || !form.workDone) return toast.error('Vui lòng nhập đầy đủ');
        setSaving(true);
        try {
            await apiFetch('/api/daily-logs', { method: 'POST', body: JSON.stringify(form) });
            toast.success('Ghi nhật ký thành công');
            onSuccess();
        } catch (e) { toast.error(e.message); }
        setSaving(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                <h3 style={{ marginTop: 0 }}>Ghi nhật ký Công trường</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Dự án *</label>
                        <select className="form-input" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} required>
                            <option value="">Chọn dự án</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Thời tiết</label>
                            <select className="form-input" value={form.weather} onChange={e => setForm({ ...form, weather: e.target.value })}>
                                {Object.keys(weatherIcons).map(w => <option key={w} value={w}>{weatherIcons[w]} {w}</option>)}
                            </select>
                        </div>
                        <div className="form-group"><label className="form-label">Số nhân công</label><input className="form-input" type="number" value={form.workforce} onChange={e => setForm({ ...form, workforce: e.target.value })} /></div>
                    </div>
                    <div className="form-group"><label className="form-label">Công việc đã làm *</label><textarea className="form-input" rows={3} value={form.workDone} onChange={e => setForm({ ...form, workDone: e.target.value })} required /></div>
                    <div className="form-group"><label className="form-label">Vấn đề / sự cố</label><textarea className="form-input" rows={2} value={form.issues} onChange={e => setForm({ ...form, issues: e.target.value })} /></div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                        <button type="button" className="btn" onClick={onClose}>Hủy</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Ghi nhật ký'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
