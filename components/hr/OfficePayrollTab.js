// components/hr/OfficePayrollTab.js
'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

const fmt = v => new Intl.NumberFormat('vi-VN').format(Math.round(v || 0));
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEARS = [2024, 2025, 2026, 2027];
const STD = 26;

export default function OfficePayrollTab() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [records, setRecords] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [editing, setEditing] = useState({});
    const [saving, setSaving] = useState({});
    const toast = useToast();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch(`/api/hr/office-payroll?month=${month}&year=${year}`);
            setRecords(res.data || []);
            setSummary(res.summary || null);
        } catch (e) { toast.error(e.message); }
        setLoading(false);
    }, [month, year]);

    useEffect(() => { load(); }, [load]);

    const generate = async () => {
        setGenerating(true);
        try {
            await apiFetch('/api/hr/office-payroll', { method: 'POST', body: JSON.stringify({ month, year }) });
            toast.success('Đã tạo bảng lương văn phòng');
            await load();
        } catch (e) { toast.error(e.message); }
        setGenerating(false);
    };

    const handleEdit = (id, field, value) => {
        setEditing(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
    };

    const save = async (rec) => {
        const patch = editing[rec.id];
        if (!patch) return;
        setSaving(prev => ({ ...prev, [rec.id]: true }));
        try {
            const numFields = ['actualDays','positionAllowance','phoneAllowance','transportAllowance','diligenceAllowance','bonus','disciplinaryFine','salaryAdvance'];
            const body = {};
            for (const [k, v] of Object.entries(patch)) {
                body[k] = numFields.includes(k) ? parseFloat(v) || 0 : v;
            }
            await apiFetch(`/api/hr/office-payroll/${rec.id}`, { method: 'PATCH', body: JSON.stringify(body) });
            setEditing(prev => { const n = { ...prev }; delete n[rec.id]; return n; });
            await load();
            toast.success('Đã lưu');
        } catch (e) { toast.error(e.message); }
        setSaving(prev => ({ ...prev, [rec.id]: false }));
    };

    const calcPreview = (rec) => {
        const p = editing[rec.id] || {};
        const get = (f) => parseFloat(p[f] ?? rec[f]) || 0;
        const actualDays = get('actualDays');
        const proratedSalary = Math.round((rec.baseSalary || 0) * actualDays / STD);
        const positionAllowance = get('positionAllowance');
        const phoneAllowance = get('phoneAllowance');
        const transportAllowance = get('transportAllowance');
        const diligenceAllowance = get('diligenceAllowance');
        const bonus = get('bonus');
        const disciplinaryFine = get('disciplinaryFine');
        const salaryAdvance = get('salaryAdvance');
        const grossIncome = proratedSalary + positionAllowance + phoneAllowance + transportAllowance + diligenceAllowance + (rec.commissionAmount || 0) + bonus;
        const netSalary = grossIncome - (rec.bhxhEmployee || 0) - (rec.bhytEmployee || 0) - (rec.bhtnEmployee || 0) - disciplinaryFine - salaryAdvance;
        return { proratedSalary, grossIncome, netSalary };
    };

    const thStyle = { padding: '6px 8px', textAlign: 'right', fontWeight: 600, fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' };
    const thL = { ...thStyle, textAlign: 'left' };
    const tdR = { padding: '6px 8px', verticalAlign: 'middle', fontSize: 12, textAlign: 'right', fontFamily: 'monospace' };
    const tdL = { padding: '6px 8px', verticalAlign: 'middle', fontSize: 12 };

    const numInput = (rec, field, width = 70) => {
        const p = editing[rec.id] || {};
        const val = p[field] ?? rec[field] ?? 0;
        const isDirty = p[field] !== undefined;
        return (
            <input type="number" step="0.5" value={val}
                onChange={e => handleEdit(rec.id, field, e.target.value)}
                style={{
                    width, padding: '3px 5px', fontSize: 11, textAlign: 'right',
                    border: `1px solid ${isDirty ? 'var(--accent-primary)' : 'var(--border)'}`,
                    borderRadius: 4,
                    background: isDirty ? 'rgba(var(--accent-rgb),0.06)' : 'transparent',
                }}
            />
        );
    };

    const totalGross = records.reduce((s, r) => s + (r.grossIncome || 0), 0);
    const totalNet = records.reduce((s, r) => s + (r.netSalary || 0), 0);
    const totalBH = records.reduce((s, r) => s + (r.bhxhEmployee || 0) + (r.bhytEmployee || 0) + (r.bhtnEmployee || 0), 0);

    return (
        <div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                <select className="form-select" style={{ width: 100 }} value={month} onChange={e => setMonth(Number(e.target.value))}>
                    {MONTHS.map(m => <option key={m} value={m}>Tháng {m}</option>)}
                </select>
                <select className="form-select" style={{ width: 90 }} value={year} onChange={e => setYear(Number(e.target.value))}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button className="btn btn-primary btn-sm" onClick={generate} disabled={generating}>
                    {generating ? 'Đang tạo...' : '⚡ Tạo bảng lương'}
                </button>
                {records.length > 0 && (
                    <>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{records.length} nhân viên</span>
                        <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--accent-primary)', fontSize: 14 }}>
                            Còn lĩnh: {fmt(totalNet)}đ
                        </span>
                        <button className="btn btn-ghost btn-sm"
                            onClick={() => window.open(`/api/hr/office-payroll/export?month=${month}&year=${year}`, '_blank')}>
                            📥 Excel
                        </button>
                    </>
                )}
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : records.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Chưa có bảng lương. Nhấn "Tạo bảng lương" để bắt đầu.
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ fontSize: 12, minWidth: 1400 }}>
                        <thead>
                            <tr>
                                <th style={thL}>Tên nhân viên</th>
                                <th style={thStyle}>Lương CB</th>
                                <th style={thStyle}>Ngày TT</th>
                                <th style={thStyle}>Lương ngày</th>
                                <th style={thStyle}>PC ĐT</th>
                                <th style={thStyle}>PC Xăng</th>
                                <th style={thStyle}>PC CC</th>
                                <th style={thStyle}>PC CV</th>
                                <th style={thStyle}>HH KD</th>
                                <th style={thStyle}>Thưởng</th>
                                <th style={{ ...thStyle, color: 'var(--accent-primary)' }}>Gross</th>
                                <th style={{ ...thStyle, color: 'var(--status-danger)', fontSize: 10 }}>BHXH 8%</th>
                                <th style={{ ...thStyle, color: 'var(--status-danger)', fontSize: 10 }}>BHYT 1.5%</th>
                                <th style={{ ...thStyle, color: 'var(--status-danger)', fontSize: 10 }}>BHTN 1%</th>
                                <th style={{ ...thStyle, color: 'var(--status-danger)' }}>Phạt</th>
                                <th style={{ ...thStyle, color: 'var(--status-danger)' }}>TU</th>
                                <th style={{ ...thStyle, color: 'var(--accent-primary)', fontWeight: 700 }}>Còn lĩnh</th>
                                <th style={thL}>Ghi chú</th>
                                <th style={thStyle}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map(rec => {
                                const isDirty = !!editing[rec.id];
                                const pv = isDirty ? calcPreview(rec) : null;
                                return (
                                    <tr key={rec.id} style={{ background: isDirty ? 'rgba(var(--accent-rgb),0.02)' : undefined }}>
                                        <td style={tdL}>
                                            <div style={{ fontWeight: 600 }}>{rec.employee?.name}</div>
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{rec.employee?.code} · {rec.employee?.department?.name}</div>
                                        </td>
                                        <td style={tdR}>{fmt(rec.baseSalary)}</td>
                                        <td style={tdR}>{numInput(rec, 'actualDays', 55)}</td>
                                        <td style={tdR}>{fmt(pv?.proratedSalary ?? rec.proratedSalary)}</td>
                                        <td style={tdR}>{numInput(rec, 'phoneAllowance', 70)}</td>
                                        <td style={tdR}>{numInput(rec, 'transportAllowance', 70)}</td>
                                        <td style={tdR}>{numInput(rec, 'diligenceAllowance', 70)}</td>
                                        <td style={tdR}>{numInput(rec, 'positionAllowance', 70)}</td>
                                        <td style={tdR}>{fmt(rec.commissionAmount)}</td>
                                        <td style={tdR}>{numInput(rec, 'bonus', 70)}</td>
                                        <td style={{ ...tdR, fontWeight: 600 }}>{fmt(pv?.grossIncome ?? rec.grossIncome)}</td>
                                        <td style={{ ...tdR, color: 'var(--status-danger)', fontSize: 11 }}>{fmt(rec.bhxhEmployee)}</td>
                                        <td style={{ ...tdR, color: 'var(--status-danger)', fontSize: 11 }}>{fmt(rec.bhytEmployee)}</td>
                                        <td style={{ ...tdR, color: 'var(--status-danger)', fontSize: 11 }}>{fmt(rec.bhtnEmployee)}</td>
                                        <td style={tdR}>{numInput(rec, 'disciplinaryFine', 70)}</td>
                                        <td style={tdR}>{numInput(rec, 'salaryAdvance', 70)}</td>
                                        <td style={{ ...tdR, fontWeight: 700, color: 'var(--accent-primary)', fontSize: 13 }}>
                                            {fmt(pv?.netSalary ?? rec.netSalary)}
                                        </td>
                                        <td style={tdL}>
                                            <input value={(editing[rec.id]?.notes) ?? (rec.notes || '')}
                                                onChange={e => handleEdit(rec.id, 'notes', e.target.value)}
                                                placeholder="Ghi chú..."
                                                style={{ width: 120, padding: '3px 5px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 }}
                                            />
                                        </td>
                                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                            {isDirty && (
                                                <button className="btn btn-primary btn-sm" onClick={() => save(rec)} disabled={saving[rec.id]}>
                                                    {saving[rec.id] ? '...' : 'Lưu'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                <td colSpan={10} style={{ padding: '8px 8px', textAlign: 'right', fontSize: 12 }}>
                                    Tổng tháng {month}/{year}
                                </td>
                                <td style={{ ...tdR, fontWeight: 700 }}>{fmt(totalGross)}</td>
                                <td colSpan={3} style={{ ...tdR, fontWeight: 600, color: 'var(--status-danger)' }}>{fmt(totalBH)}</td>
                                <td colSpan={2}></td>
                                <td style={{ ...tdR, fontWeight: 700, color: 'var(--accent-primary)' }}>{fmt(totalNet)}</td>
                                <td colSpan={2}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}
