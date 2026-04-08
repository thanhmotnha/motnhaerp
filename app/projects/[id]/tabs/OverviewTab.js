'use client';
import { useState, useEffect } from 'react';
import { fmtDate } from '@/lib/projectUtils';
import { apiFetch } from '@/lib/fetchClient';

const LOG_TYPES = ['Điện thoại', 'Gặp mặt', 'Email', 'Zalo', 'Ghi chú'];
const fmtNum = v => new Intl.NumberFormat('vi-VN').format(v || 0);

export default function OverviewTab({ project: p, projectId, onRefresh }) {
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ type: 'Điện thoại', content: '', createdBy: '' });
    const [saving, setSaving] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editForm, setEditForm] = useState({
        name: p.name || '',
        address: p.address || '',
        area: p.area || '',
        floors: p.floors || '',
        manager: p.manager || '',
        designer: p.designer || '',
        supervisor: p.supervisor || '',
        startDate: p.startDate ? p.startDate.slice(0, 10) : '',
        endDate: p.endDate ? p.endDate.slice(0, 10) : '',
        notes: p.notes || '',
    });
    const [savingEdit, setSavingEdit] = useState(false);
    const [overheadData, setOverheadData] = useState(null);
    const [overheadYear, setOverheadYear] = useState(new Date().getFullYear());
    const [overheadLoading, setOverheadLoading] = useState(false);

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

    const saveEdit = async () => {
        setSavingEdit(true);
        await apiFetch(`/api/projects/${projectId}`, {
            method: 'PUT',
            body: {
                ...editForm,
                area: editForm.area ? parseFloat(editForm.area) : null,
                floors: editForm.floors ? parseInt(editForm.floors) : null,
                startDate: editForm.startDate || null,
                endDate: editForm.endDate || null,
            },
        });
        setSavingEdit(false);
        setShowEdit(false);
        onRefresh();
    };

    const recentLogs = (p.trackingLogs || []).slice(0, 5);

    useEffect(() => {
        setOverheadLoading(true);
        apiFetch(`/api/overhead/summary?projectId=${projectId}&year=${overheadYear}`)
            .then(res => setOverheadData(res))
            .catch(() => setOverheadData(null))
            .finally(() => setOverheadLoading(false));
    }, [projectId, overheadYear]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Thông tin dự án */}
            <div className="card" style={{ padding: 20 }}>
                <div className="card-header" style={{ marginBottom: 16 }}>
                    <span className="card-title">📋 Thông tin dự án</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(v => !v)}>
                        {showEdit ? 'Đóng' : '✏️ Chỉnh sửa'}
                    </button>
                </div>

                {showEdit ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tên dự án *</label>
                                <input className="form-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Địa chỉ</label>
                                <input className="form-input" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Diện tích (m²)</label>
                                <input className="form-input" type="number" value={editForm.area} onChange={e => setEditForm({ ...editForm, area: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Số tầng</label>
                                <input className="form-input" type="number" value={editForm.floors} onChange={e => setEditForm({ ...editForm, floors: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Quản lý</label>
                                <input className="form-input" value={editForm.manager} onChange={e => setEditForm({ ...editForm, manager: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Thiết kế</label>
                                <input className="form-input" value={editForm.designer} onChange={e => setEditForm({ ...editForm, designer: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Giám sát</label>
                                <input className="form-input" value={editForm.supervisor} onChange={e => setEditForm({ ...editForm, supervisor: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bắt đầu</label>
                                <input className="form-input" type="date" value={editForm.startDate} onChange={e => setEditForm({ ...editForm, startDate: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Dự kiến xong</label>
                                <input className="form-input" type="date" value={editForm.endDate} onChange={e => setEditForm({ ...editForm, endDate: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ghi chú</label>
                            <textarea className="form-input" rows={2} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(false)}>Hủy</button>
                            <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={savingEdit}>
                                {savingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
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
                    </>
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

            {/* Chi phí chung được phân bổ */}
            <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span className="card-title">🏢 Chi phí chung được phân bổ</span>
                    <select className="form-select" value={overheadYear}
                        onChange={e => setOverheadYear(Number(e.target.value))}
                        style={{ width: 110 }}>
                        {[0, 1, 2].map(offset => {
                            const y = new Date().getFullYear() - offset;
                            return <option key={y} value={y}>Năm {y}</option>;
                        })}
                    </select>
                </div>

                {overheadLoading ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Đang tải...</div>
                ) : !overheadData || overheadData.allocations.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có phân bổ chi phí chung nào trong năm {overheadYear}.</div>
                ) : (
                    <>
                        <table className="data-table" style={{ marginBottom: 12 }}>
                            <thead>
                                <tr>
                                    <th>Đợt phân bổ</th>
                                    <th>Kỳ</th>
                                    <th style={{ textAlign: 'right' }}>Số tiền</th>
                                    <th style={{ textAlign: 'right' }}>Tỷ lệ</th>
                                    <th>Ngày XN</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overheadData.allocations.map(a => (
                                    <tr key={a.batchId}>
                                        <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>{a.batchCode}</td>
                                        <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{a.period || '—'}</td>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtNum(a.amount)}đ</td>
                                        <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-muted)' }}>{a.ratio}%</td>
                                        <td style={{ fontSize: 13 }}>{a.confirmedAt ? new Date(a.confirmedAt).toLocaleDateString('vi-VN') : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                            Tổng: {fmtNum(overheadData.total)}đ
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
