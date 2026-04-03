// components/hr/CommissionTab.js
'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

const fmt = v => new Intl.NumberFormat('vi-VN').format(Math.round(v || 0));

export default function CommissionTab() {
    const [commissions, setCommissions] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ employeeId: '', contractId: '', rate: '' });
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [comRes, empRes, conRes] = await Promise.all([
                apiFetch('/api/hr/contract-commissions'),
                apiFetch('/api/employees?limit=200'),
                apiFetch('/api/contracts?limit=200'),
            ]);
            setCommissions(comRes.data || []);
            setEmployees(empRes.data || []);
            setContracts(conRes.data || []);
        } catch (e) { toast.error(e.message); }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!form.employeeId || !form.contractId || !form.rate) return toast.error('Vui lòng điền đầy đủ');
        setSaving(true);
        try {
            await apiFetch('/api/hr/contract-commissions', {
                method: 'POST',
                body: JSON.stringify({ employeeId: form.employeeId, contractId: form.contractId, rate: parseFloat(form.rate) }),
            });
            toast.success('Đã thêm hoa hồng');
            setShowForm(false);
            setForm({ employeeId: '', contractId: '', rate: '' });
            await load();
        } catch (e) { toast.error(e.message); }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!confirm('Xóa gán hoa hồng này?')) return;
        try {
            await apiFetch(`/api/hr/contract-commissions/${id}`, { method: 'DELETE' });
            toast.success('Đã xóa');
            await load();
        } catch (e) { toast.error(e.message); }
    };

    const totalEstimated = commissions.reduce((s, c) => s + (c.estimatedAmount || 0), 0);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>Hoa hồng kinh doanh</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        Gán % hoa hồng cho nhân viên theo hợp đồng dự án
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-primary)' }}>
                        Tổng ước tính: {fmt(totalEstimated)}đ
                    </span>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
                        {showForm ? 'Ẩn form' : '+ Thêm hoa hồng'}
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                    <form onSubmit={handleAdd} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ margin: 0, minWidth: 180 }}>
                            <label className="form-label">Nhân viên *</label>
                            <select className="form-select" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} required>
                                <option value="">-- Chọn --</option>
                                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.code})</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ margin: 0, minWidth: 240 }}>
                            <label className="form-label">Hợp đồng *</label>
                            <select className="form-select" value={form.contractId} onChange={e => setForm({ ...form, contractId: e.target.value })} required>
                                <option value="">-- Chọn --</option>
                                {contracts.map(c => <option key={c.id} value={c.id}>{c.code} — {c.project?.name || 'N/A'}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ margin: 0, width: 100 }}>
                            <label className="form-label">% Hoa hồng *</label>
                            <input className="form-input" type="number" step="0.1" min="0" max="100"
                                value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })}
                                placeholder="VD: 2.5" required />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Đang lưu...' : 'Thêm'}
                        </button>
                    </form>
                </div>
            )}

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : (
                <div className="card" style={{ overflow: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Nhân viên</th>
                                <th>Hợp đồng</th>
                                <th>Dự án</th>
                                <th style={{ textAlign: 'right' }}>Giá trị HĐ</th>
                                <th style={{ textAlign: 'right' }}>% HH</th>
                                <th style={{ textAlign: 'right', color: 'var(--accent-primary)' }}>Ước tính</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {commissions.map(c => (
                                <tr key={c.id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{c.employee.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.employee.code}</div>
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.contract.code}</td>
                                    <td>{c.contract.project?.name || '—'}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                        {fmt((c.contract.contractValue || 0) + (c.contract.variationAmount || 0))}đ
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{c.rate}%</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                                        {fmt(c.estimatedAmount)}đ
                                    </td>
                                    <td>
                                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)' }}
                                            onClick={() => handleDelete(c.id)}>Xóa</button>
                                    </td>
                                </tr>
                            ))}
                            {commissions.length === 0 && (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                                    Chưa có gán hoa hồng nào
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
