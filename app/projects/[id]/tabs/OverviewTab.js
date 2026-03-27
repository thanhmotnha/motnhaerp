'use client';
import { useState } from 'react';
import { fmtDate } from '@/lib/projectUtils';
import { apiFetch } from '@/lib/fetchClient';

const LOG_TYPES = ['Điện thoại', 'Gặp mặt', 'Email', 'Zalo', 'Ghi chú'];

export default function OverviewTab({ project: p, projectId, onRefresh }) {
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ type: 'Điện thoại', content: '', createdBy: '' });
    const [saving, setSaving] = useState(false);

    const addLog = async () => {
        if (!form.content.trim()) return alert('Nhập nội dung nhật ký!');
        setSaving(true);
        await apiFetch('/api/tracking-logs', {
            method: 'POST',
            body: { ...form, projectId },
        });
        setSaving(false);
        setForm({ type: 'Điện thoại', content: '', createdBy: '' });
        setShowForm(false);
        onRefresh();
    };

    const recentLogs = (p.trackingLogs || []).slice(0, 5);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Thông tin dự án */}
            <div className="card" style={{ padding: 20 }}>
                <div className="card-header" style={{ marginBottom: 16 }}>
                    <span className="card-title">📋 Thông tin dự án</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    {[
                        { l: 'Khách hàng', v: p.customer?.name },
                        { l: 'Địa chỉ', v: p.address },
                        { l: 'Loại dự án', v: p.type },
                        { l: 'Diện tích', v: p.area ? `${p.area}m²` : '—' },
                        { l: 'Số tầng', v: p.floors || '—' },
                        { l: 'Bắt đầu', v: fmtDate(p.startDate) },
                        { l: 'Dự kiến xong', v: fmtDate(p.endDate) },
                        { l: 'Quản lý', v: p.manager || '—' },
                        { l: 'Thiết kế', v: p.designer || '—' },
                        { l: 'Giám sát', v: p.supervisor || '—' },
                    ].map(({ l, v }) => (
                        <div key={l}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{l}</div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{v || '—'}</div>
                        </div>
                    ))}
                </div>
                {p.notes && (
                    <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 6, fontSize: 13 }}>
                        <strong>Ghi chú:</strong> {p.notes}
                    </div>
                )}
            </div>

            {/* Nhật ký gần đây */}
            <div className="card" style={{ padding: 20 }}>
                <div className="card-header" style={{ marginBottom: 16 }}>
                    <span className="card-title">📒 Nhật ký theo dõi</span>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
                        {showForm ? 'Đóng' : '+ Thêm nhật ký'}
                    </button>
                </div>

                {showForm && (
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <select className="form-input" style={{ flex: '0 0 150px' }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                {LOG_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                            <input className="form-input" style={{ flex: 1, minWidth: 120 }} placeholder="Người ghi" value={form.createdBy} onChange={e => setForm({ ...form, createdBy: e.target.value })} />
                        </div>
                        <textarea className="form-input" rows={3} placeholder="Nội dung nhật ký..." value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Hủy</button>
                            <button className="btn btn-primary btn-sm" onClick={addLog} disabled={saving}>
                                {saving ? 'Đang lưu...' : 'Lưu nhật ký'}
                            </button>
                        </div>
                    </div>
                )}

                {recentLogs.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>Chưa có nhật ký</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {recentLogs.map(log => (
                            <div key={log.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 80, flexShrink: 0 }}>
                                    <div>{fmtDate(log.createdAt)}</div>
                                    <span className="badge muted" style={{ fontSize: 10, marginTop: 4 }}>{log.type}</span>
                                </div>
                                <div style={{ fontSize: 13 }}>
                                    <div>{log.content}</div>
                                    {log.createdBy && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>— {log.createdBy}</div>}
                                </div>
                            </div>
                        ))}
                        {(p.trackingLogs?.length || 0) > 5 && (
                            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', paddingTop: 8 }}>
                                Còn {p.trackingLogs.length - 5} nhật ký cũ hơn
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
