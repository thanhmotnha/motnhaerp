'use client';
import { useState, useEffect } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const STATUS_COLORS = { 'Chờ duyệt': '#f59e0b', 'Đã duyệt': '#3b82f6', 'Đã chi': '#10b981', 'Từ chối': '#ef4444', 'Đã trừ lương': '#6b7280' };

export default function SalaryAdvanceTab() {
    const [employees, setEmployees] = useState([]);
    const [selectedEmp, setSelectedEmp] = useState('');
    const [advances, setAdvances] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ amount: '', reason: '', requestedBy: '' });

    useEffect(() => {
        fetch('/api/employees?limit=500').then(r => r.json()).then(d => setEmployees(d.data || []));
    }, []);

    const loadAdvances = (empId) => {
        if (!empId) return;
        setLoading(true);
        fetch(`/api/employees/${empId}/advances`).then(r => r.json()).then(d => { setAdvances(d); setLoading(false); });
    };
    useEffect(() => { if (selectedEmp) loadAdvances(selectedEmp); }, [selectedEmp]);

    const handleSubmit = async () => {
        if (!selectedEmp || !form.amount) return alert('Chọn nhân viên và nhập số tiền');
        await fetch(`/api/employees/${selectedEmp}/advances`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
        });
        setShowForm(false);
        setForm({ amount: '', reason: '', requestedBy: '' });
        loadAdvances(selectedEmp);
    };

    const updateStatus = async (advId, status) => {
        await fetch(`/api/employees/${selectedEmp}/advances`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: advId, status }),
        });
        loadAdvances(selectedEmp);
    };

    const totalPending = advances.filter(a => a.status === 'Chờ duyệt').reduce((s, a) => s + a.amount, 0);
    const totalPaid = advances.filter(a => ['Đã chi', 'Đã trừ lương'].includes(a.status)).reduce((s, a) => s + a.amount, 0);

    return (
        <div>
            <div className="card-header" style={{ marginBottom: 16 }}>
                <span className="card-title">💸 Tạm ứng lương</span>
                <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>+ Tạo tạm ứng</button>
            </div>

            {/* Employee selector */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                <select className="form-select" value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} style={{ maxWidth: 300 }}>
                    <option value="">-- Chọn nhân viên --</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.position || 'N/A'}</option>)}
                </select>
                {selectedEmp && advances.length > 0 && (
                    <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                        <span>⏳ Chờ duyệt: <strong style={{ color: '#f59e0b' }}>{fmt(totalPending)}</strong></span>
                        <span>✅ Đã chi: <strong style={{ color: '#10b981' }}>{fmt(totalPaid)}</strong></span>
                    </div>
                )}
            </div>

            {/* Add form */}
            {showForm && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid var(--border-light)' }}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Số tiền (VND)</label>
                            <input className="form-input" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0" />
                            {Number(form.amount) > 0 && <div style={{ fontSize: 11, color: 'var(--accent-primary)', marginTop: 2 }}>{fmt(Number(form.amount))}</div>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Người yêu cầu</label>
                            <input className="form-input" value={form.requestedBy} onChange={e => setForm({ ...form, requestedBy: e.target.value })} placeholder="Tên người yêu cầu" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Lý do</label>
                        <textarea className="form-input" rows={2} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Lý do tạm ứng..." />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Hủy</button>
                        <button className="btn btn-primary btn-sm" onClick={handleSubmit}>Lưu</button>
                    </div>
                </div>
            )}

            {/* Advances list */}
            {!selectedEmp ? (
                <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Chọn nhân viên để xem tạm ứng</div>
            ) : loading ? (
                <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>
            ) : advances.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Chưa có tạm ứng nào</div>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
                    <thead>
                        <tr style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'left' }}>
                            <th style={{ padding: '8px 12px' }}>Ngày</th>
                            <th style={{ padding: '8px 12px' }}>Số tiền</th>
                            <th style={{ padding: '8px 12px' }}>Lý do</th>
                            <th style={{ padding: '8px 12px' }}>Trạng thái</th>
                            <th style={{ padding: '8px 12px' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {advances.map(a => (
                            <tr key={a.id} style={{ background: 'var(--bg-secondary)', borderRadius: 8 }}>
                                <td style={{ padding: '10px 12px', fontSize: 13 }}>{fmtDate(a.date)}</td>
                                <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700 }}>{fmt(a.amount)}</td>
                                <td style={{ padding: '10px 12px', fontSize: 13 }}>{a.reason || '—'}</td>
                                <td style={{ padding: '10px 12px' }}>
                                    <span className="badge" style={{ background: `${STATUS_COLORS[a.status] || '#6b7280'}22`, color: STATUS_COLORS[a.status] || '#6b7280', fontWeight: 600 }}>
                                        {a.status}
                                    </span>
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                    {a.status === 'Chờ duyệt' && (
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn btn-primary btn-sm" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => updateStatus(a.id, 'Đã duyệt')}>Duyệt</button>
                                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '2px 8px', color: 'var(--status-danger)' }} onClick={() => updateStatus(a.id, 'Từ chối')}>Từ chối</button>
                                        </div>
                                    )}
                                    {a.status === 'Đã duyệt' && (
                                        <button className="btn btn-primary btn-sm" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => updateStatus(a.id, 'Đã chi')}>Đã chi</button>
                                    )}
                                    {a.status === 'Đã chi' && (
                                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => updateStatus(a.id, 'Đã trừ lương')}>Trừ lương</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
