'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const WEATHER_OPTIONS = ['Nắng', 'Mưa', 'Có mây', 'Giông bão', 'Sương mù'];

function DailyLogForm({ projects, onSaved, onCancel }) {
    const { showToast } = useToast();
    const [form, setForm] = useState({
        projectId: '',
        date: new Date().toISOString().split('T')[0],
        weather: 'Nắng',
        workforce: '',
        workDone: '',
        issues: '',
    });
    const [saving, setSaving] = useState(false);

    const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

    const save = async () => {
        if (!form.projectId) return showToast('Vui lòng chọn dự án', 'error');
        if (!form.workDone.trim()) return showToast('Nhập nội dung công việc', 'error');
        setSaving(true);
        try {
            await apiFetch('/api/daily-logs', {
                method: 'POST',
                body: JSON.stringify({ ...form, workforce: Number(form.workforce) || 0 }),
            });
            showToast('Đã tạo nhật ký', 'success');
            onSaved?.();
        } catch (e) { showToast(e.message, 'error'); }
        setSaving(false);
    };

    return (
        <div style={{ padding: '16px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                    <label className="form-label">Dự án *</label>
                    <select className="form-select" value={form.projectId} onChange={e => set('projectId', e.target.value)}>
                        <option value="">-- Chọn dự án --</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="form-label">Ngày</label>
                    <input type="date" className="form-input" value={form.date} onChange={e => set('date', e.target.value)} />
                </div>
                <div>
                    <label className="form-label">Thời tiết</label>
                    <select className="form-select" value={form.weather} onChange={e => set('weather', e.target.value)}>
                        {WEATHER_OPTIONS.map(w => <option key={w}>{w}</option>)}
                    </select>
                </div>
                <div>
                    <label className="form-label">Số nhân công</label>
                    <input type="number" className="form-input" min={0} value={form.workforce}
                        onChange={e => set('workforce', e.target.value)} placeholder="0" />
                </div>
            </div>
            <div style={{ marginBottom: 12 }}>
                <label className="form-label">Công việc thực hiện *</label>
                <textarea className="form-input" rows={3} value={form.workDone}
                    onChange={e => set('workDone', e.target.value)}
                    placeholder="Mô tả công việc đã thực hiện trong ngày..." />
            </div>
            <div style={{ marginBottom: 16 }}>
                <label className="form-label">Sự cố / Vấn đề phát sinh</label>
                <textarea className="form-input" rows={2} value={form.issues}
                    onChange={e => set('issues', e.target.value)} placeholder="Nếu có..." />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                {onCancel && <button className="btn btn-ghost" onClick={onCancel}>Hủy</button>}
                <button className="btn btn-primary" onClick={save} disabled={saving}>
                    {saving ? 'Đang lưu...' : 'Tạo nhật ký'}
                </button>
            </div>
        </div>
    );
}

export default function DailyLogsPage() {
    const [logs, setLogs] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filterProject, setFilterProject] = useState('');

    const load = useCallback(() => {
        setLoading(true);
        const q = filterProject ? `?projectId=${filterProject}&limit=100` : '?limit=100';
        apiFetch(`/api/daily-logs${q}`)
            .then(d => { setLogs(d.data || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, [filterProject]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        apiFetch('/api/projects?limit=200').then(d => setProjects(d.data || [])).catch(() => {});
    }, []);

    const weatherIcon = { 'Nắng': '☀️', 'Mưa': '🌧️', 'Có mây': '⛅', 'Giông bão': '⛈️', 'Sương mù': '🌫️' };

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>📋 Nhật ký công trường</h1>
                    <p>Ghi nhận tiến độ, nhân công và sự cố hàng ngày tại công trình</p>
                </div>
                <div className="page-header-right">
                    <select className="form-select" style={{ width: 220 }} value={filterProject}
                        onChange={e => setFilterProject(e.target.value)}>
                        <option value="">Tất cả dự án</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                    </select>
                    <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                        {showForm ? 'Đóng' : '+ Tạo nhật ký'}
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-header"><h3>Tạo nhật ký mới</h3></div>
                    <DailyLogForm
                        projects={projects}
                        onSaved={() => { load(); setShowForm(false); }}
                        onCancel={() => setShowForm(false)}
                    />
                </div>
            )}

            <div className="card">
                <div className="card-header">
                    <span className="card-title">Danh sách nhật ký ({logs.length})</span>
                </div>
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : logs.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                        Chưa có nhật ký nào. Bấm "+ Tạo nhật ký" để bắt đầu.
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Ngày</th>
                                    <th>Dự án</th>
                                    <th>Thời tiết</th>
                                    <th>Nhân công</th>
                                    <th>Công việc thực hiện</th>
                                    <th>Sự cố</th>
                                    <th>Người ghi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id}>
                                        <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                                            {fmtDate(log.date)}
                                        </td>
                                        <td>
                                            <span className="badge info" style={{ fontSize: 11 }}>
                                                {log.project?.code}
                                            </span>
                                            <span style={{ fontSize: 12, marginLeft: 6, color: 'var(--text-muted)' }}>
                                                {log.project?.name}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 14 }}>
                                            {weatherIcon[log.weather] || ''}  {log.weather}
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 600 }}>
                                            {log.workerCount || 0}
                                        </td>
                                        <td style={{ fontSize: 13, maxWidth: 280 }}>
                                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {log.progress || '—'}
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 12, color: log.issues ? 'var(--status-warning)' : 'var(--text-muted)' }}>
                                            {log.issues
                                                ? <span title={log.issues}>⚠️ {log.issues.substring(0, 40)}{log.issues.length > 40 ? '...' : ''}</span>
                                                : '—'
                                            }
                                        </td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{log.createdBy || '—'}</td>
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
