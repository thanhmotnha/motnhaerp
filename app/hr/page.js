'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const PayrollTab = dynamic(() => import('@/components/hr/PayrollTab'), { ssr: false, loading: () => <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> });
const DailyAttendanceTab = dynamic(() => import('@/components/hr/DailyAttendanceTab'), { ssr: false, loading: () => <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> });
const LeaveCalendarTab = dynamic(() => import('@/components/hr/LeaveCalendarTab'), { ssr: false, loading: () => <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> });
const EmployeeReviewTab = dynamic(() => import('@/components/hr/EmployeeReviewTab'), { ssr: false, loading: () => <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> });
const SalaryAdvanceTab = dynamic(() => import('@/components/hr/SalaryAdvanceTab'), { ssr: false, loading: () => <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> });
const EmployeeContractTab = dynamic(() => import('@/components/EmployeeContractTab'), { ssr: false, loading: () => <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> });
const OfficePayrollTab = dynamic(() => import('@/components/hr/OfficePayrollTab'), { ssr: false, loading: () => <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> });
const WorkshopPayrollTab = dynamic(() => import('@/components/hr/WorkshopPayrollTab'), { ssr: false, loading: () => <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> });
const CommissionTab = dynamic(() => import('@/components/hr/CommissionTab'), { ssr: false, loading: () => <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> });
const EmployeeContractsTab = dynamic(() => import('@/components/hr/EmployeeContractsTab'), { ssr: false, loading: () => <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> });
const HandbookTab = dynamic(() => import('@/components/hr/HandbookTab'), { ssr: false, loading: () => <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> });
const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const MONTHS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

function AttendanceTab() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState({});
    const [saving, setSaving] = useState({});

    const load = () => {
        setLoading(true);
        fetch(`/api/hr/attendance?month=${month}&year=${year}`)
            .then(r => r.json()).then(d => { setData(d); setLoading(false); });
    };
    useEffect(load, [month, year]);

    const handleChange = (empId, field, value) => {
        setEditing(prev => ({ ...prev, [empId]: { ...(prev[empId] || {}), [field]: value } }));
    };

    // BHXH 8% + BHYT 1.5% + BHTN 1% = 10.5% trên lương đóng BH
    const calcBHXH = (emp) => Math.round((emp.insuranceSalary || emp.salary || 0) * 0.105);

    const handleSave = async (emp) => {
        setSaving(prev => ({ ...prev, [emp.id]: true }));
        const overrides = editing[emp.id] || {};
        const workDays = parseFloat(overrides.workDays ?? emp.workDays ?? emp.totalWorkdays);
        const leaveDays = parseFloat(overrides.leaveDays ?? emp.leaveDays ?? 0);
        const unpaidDays = parseFloat(overrides.unpaidDays ?? emp.unpaidDays ?? 0);
        const overtimeHrs = parseFloat(overrides.overtimeHrs ?? emp.overtimeHrs ?? 0);
        const bonus = parseFloat(overrides.bonus ?? emp.bonus ?? 0);
        const deduction = parseFloat(overrides.deduction ?? emp.deduction ?? 0);
        const dailySalary = (emp.salary || 0) / emp.totalWorkdays;
        const bhxh = calcBHXH(emp);
        const netSalary = Math.round((dailySalary * workDays) - (dailySalary * unpaidDays) + (dailySalary / 8 * 1.5 * overtimeHrs) + bonus - deduction - bhxh);
        await fetch('/api/hr/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId: emp.id, month, year, workDays, leaveDays, unpaidDays, overtimeHrs, bonus, deduction, netSalary }),
        });
        setSaving(prev => ({ ...prev, [emp.id]: false }));
        setEditing(prev => { const n = { ...prev }; delete n[emp.id]; return n; });
        load();
    };

    const exportCSV = () => {
        if (!data?.employees) return;
        const bom = '\uFEFF';
        const rows = data.employees.map(e => {
            const ov = editing[e.id] || {};
            return [e.code, e.name, e.position, e.department?.name, e.salary,
            ov.workDays ?? e.workDays, ov.leaveDays ?? e.leaveDays, ov.unpaidDays ?? e.unpaidDays,
            ov.overtimeHrs ?? e.overtimeHrs, ov.bonus ?? e.bonus, ov.deduction ?? e.deduction, e.netSalary].join(',');
        });
        const csv = bom + ['Mã NV,Họ tên,Chức vụ,Phòng ban,Lương cứng,Ngày công,Nghỉ phép,Nghỉ KL,OT(h),Thưởng,Khấu trừ,Thực lĩnh', ...rows].join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        a.download = `cham-cong-T${month}-${year}.csv`; a.click();
    };

    const totalPayroll = data?.employees?.reduce((s, e) => s + (e.netSalary || 0), 0) || 0;

    const printPayslip = (emp) => {
        const ov = editing[emp.id] || {};
        const workDays = parseFloat(ov.workDays ?? emp.workDays ?? emp.totalWorkdays);
        const leaveDays = parseFloat(ov.leaveDays ?? emp.leaveDays ?? 0);
        const unpaidDays = parseFloat(ov.unpaidDays ?? emp.unpaidDays ?? 0);
        const overtimeHrs = parseFloat(ov.overtimeHrs ?? emp.overtimeHrs ?? 0);
        const bonus = parseFloat(ov.bonus ?? emp.bonus ?? 0);
        const deduction = parseFloat(ov.deduction ?? emp.deduction ?? 0);
        const bhxh = calcBHXH(emp);
        const net = emp.netSalary || 0;
        const fmtN = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Phiếu lương ${emp.name}</title>
<style>
  *{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:13px;color:#000;margin:15mm 20mm}
  h2{text-align:center;font-size:16px;text-transform:uppercase;margin:0 0 4px}
  .sub{text-align:center;font-size:12px;color:#555;margin-bottom:16px}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;border:1px solid #ddd;padding:12px;border-radius:4px}
  .info-item{font-size:12px}.lbl{font-weight:bold;color:#555}
  table{width:100%;border-collapse:collapse;margin:10px 0}
  th{background:#f0f0f0;padding:7px 10px;text-align:left;border:1px solid #bbb;font-size:11px}
  td{padding:7px 10px;border:1px solid #ccc;font-size:12px}
  .right{text-align:right}.total{background:#e8f5e9;font-weight:bold}
  .sig{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px;text-align:center}
  .sig h4{font-size:12px;margin:0 0 4px}.sig p{font-size:11px;color:#888;margin:0 0 50px}
  @media print{body{margin:10mm 15mm}}
</style></head><body>
<h2>Phiếu Lương Tháng ${month}/${year}</h2>
<p class="sub">Ngày in: ${new Date().toLocaleDateString('vi-VN')}</p>
<div class="info">
  <div class="info-item"><span class="lbl">Họ tên:</span> ${emp.name}</div>
  <div class="info-item"><span class="lbl">Mã NV:</span> ${emp.code}</div>
  <div class="info-item"><span class="lbl">Chức vụ:</span> ${emp.position || '—'}</div>
  <div class="info-item"><span class="lbl">Phòng ban:</span> ${emp.department?.name || '—'}</div>
</div>
<table>
  <thead><tr><th>Khoản mục</th><th class="right">Số ngày/Giờ</th><th class="right">Giá trị (VND)</th></tr></thead>
  <tbody>
    <tr><td>Lương cứng/tháng</td><td class="right">—</td><td class="right">${fmtN(emp.salary)}</td></tr>
    <tr><td>Ngày công thực tế</td><td class="right">${workDays}/${data.totalWorkdays} ngày</td><td class="right">${fmtN(emp.salary / data.totalWorkdays * workDays)}</td></tr>
    ${unpaidDays > 0 ? `<tr><td style="color:#e53e3e">(-) Nghỉ không lương</td><td class="right">${unpaidDays} ngày</td><td class="right" style="color:#e53e3e">-${fmtN(emp.salary / data.totalWorkdays * unpaidDays)}</td></tr>` : ''}
    ${overtimeHrs > 0 ? `<tr><td>(+) Tăng ca (1.5x)</td><td class="right">${overtimeHrs} giờ</td><td class="right">${fmtN(emp.salary / data.totalWorkdays / 8 * 1.5 * overtimeHrs)}</td></tr>` : ''}
    ${bonus > 0 ? `<tr><td>(+) Thưởng/Phụ cấp</td><td class="right">—</td><td class="right">${fmtN(bonus)}</td></tr>` : ''}
    ${deduction > 0 ? `<tr><td style="color:#e53e3e">(-) Khấu trừ khác</td><td class="right">—</td><td class="right" style="color:#e53e3e">-${fmtN(deduction)}</td></tr>` : ''}
    <tr><td style="color:#d97706">(-) BHXH 8% + BHYT 1.5% + BHTN 1%</td><td class="right">Mức ${fmtN(emp.insuranceSalary || emp.salary)}</td><td class="right" style="color:#d97706">-${fmtN(bhxh)}</td></tr>
    <tr class="total"><td colspan="2">THỰC LĨNH</td><td class="right" style="color:#276749;font-size:14px">${fmtN(net)}</td></tr>
  </tbody>
</table>
<div class="sig">
  <div><h4>Nhân viên</h4><p>(Ký, ghi rõ họ tên)</p></div>
  <div><h4>Giám đốc</h4><p>(Ký, đóng dấu)</p></div>
</div>
<button onclick="window.print()" style="display:block;margin:20px auto;padding:8px 24px;background:#1a3a8f;color:#fff;border:none;border-radius:4px;font-size:13px;cursor:pointer">In phiếu lương</button>
</body></html>`;
        const win = window.open('', '_blank', 'width=750,height=900');
        win.document.write(html);
        win.document.close();
    };

    const printAllPayslips = () => {
        if (!data?.employees?.length) return;
        const fmtN = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
        const slips = data.employees.map(emp => {
            const ov = editing[emp.id] || {};
            const workDays = parseFloat(ov.workDays ?? emp.workDays ?? emp.totalWorkdays);
            const leaveDays = parseFloat(ov.leaveDays ?? emp.leaveDays ?? 0);
            const unpaidDays = parseFloat(ov.unpaidDays ?? emp.unpaidDays ?? 0);
            const overtimeHrs = parseFloat(ov.overtimeHrs ?? emp.overtimeHrs ?? 0);
            const bonus = parseFloat(ov.bonus ?? emp.bonus ?? 0);
            const deduction = parseFloat(ov.deduction ?? emp.deduction ?? 0);
            const daily = (emp.salary || 0) / emp.totalWorkdays;
            const bhxh = calcBHXH(emp);
            const net = Math.round((daily * workDays) - (daily * unpaidDays) + (daily / 8 * 1.5 * overtimeHrs) + bonus - deduction - bhxh);
            return `<div class="slip">
<h2>Phiếu Lương Tháng ${month}/${year}</h2>
<p class="sub">Ngày in: ${new Date().toLocaleDateString('vi-VN')}</p>
<div class="info">
  <div class="info-item"><span class="lbl">Họ tên:</span> ${emp.name}</div>
  <div class="info-item"><span class="lbl">Mã NV:</span> ${emp.code}</div>
  <div class="info-item"><span class="lbl">Chức vụ:</span> ${emp.position || '—'}</div>
  <div class="info-item"><span class="lbl">Phòng ban:</span> ${emp.department?.name || '—'}</div>
</div>
<table><tbody>
  <tr><td>Lương cứng</td><td>${fmtN(emp.salary)} đ</td></tr>
  <tr><td>Ngày công thực tế</td><td>${workDays} ngày</td></tr>
  ${leaveDays > 0 ? `<tr><td>Ngày nghỉ phép</td><td>${leaveDays} ngày</td></tr>` : ''}
  ${unpaidDays > 0 ? `<tr><td>Nghỉ không lương</td><td>${unpaidDays} ngày</td></tr>` : ''}
  ${overtimeHrs > 0 ? `<tr><td>Tăng ca</td><td>${overtimeHrs} giờ</td></tr>` : ''}
  ${bonus > 0 ? `<tr><td>Thưởng</td><td>+${fmtN(bonus)} đ</td></tr>` : ''}
  ${deduction > 0 ? `<tr><td>Khấu trừ</td><td>-${fmtN(deduction)} đ</td></tr>` : ''}
  <tr><td>BHXH/BHYT/BHTN (10.5%)</td><td>-${fmtN(bhxh)} đ</td></tr>
  <tr class="total"><td>Thực lĩnh</td><td>${fmtN(net)} đ</td></tr>
</tbody></table>
<div class="sig">
  <div><h4>Nhân viên</h4><p>(Ký, ghi rõ họ tên)</p></div>
  <div><h4>Giám đốc</h4><p>(Ký, đóng dấu)</p></div>
</div>
</div>`;
        }).join('');

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bảng lương T${month}/${year}</title>
<style>
  *{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:13px;color:#000;margin:0}
  .slip{margin:15mm 20mm;page-break-after:always}
  h2{text-align:center;font-size:16px;text-transform:uppercase;margin:0 0 4px}
  p.sub{text-align:center;font-size:11px;color:#666;margin:0 0 14px}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;background:#f5f5f5;padding:10px 14px;border-radius:4px;margin-bottom:14px}
  .info-item{font-size:12px}.lbl{font-weight:700;margin-right:4px}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  td{padding:6px 8px;border-bottom:1px solid #eee;font-size:13px}
  td:last-child{text-align:right;font-weight:600}
  tr.total td{border-top:2px solid #1a3a8f;font-size:14px;font-weight:700;color:#1a3a8f}
  .sig{display:flex;justify-content:space-around;margin-top:20px;text-align:center}
  .sig h4{font-size:12px;margin:0 0 4px}.sig p{font-size:11px;color:#888;margin:0 0 50px}
  @media print{.slip{margin:10mm 15mm}}
</style></head><body>${slips}
<script>window.onload=()=>window.print();<\/script>
</body></html>`;
        const win = window.open('', '_blank', 'width=800,height=900');
        win.document.write(html);
        win.document.close();
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                <select className="form-select" style={{ width: 90 }} value={month} onChange={e => setMonth(Number(e.target.value))}>
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <select className="form-select" style={{ width: 90 }} value={year} onChange={e => setYear(Number(e.target.value))}>
                    {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
                </select>
                {data && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ngày công chuẩn: <strong>{data.totalWorkdays}</strong> ngày</span>}
                <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--accent-primary)', fontSize: 14 }}>Tổng lương: {fmt(totalPayroll)}</span>
                <button className="btn btn-ghost btn-sm" onClick={exportCSV}>📥 Xuất CSV</button>
                <button className="btn btn-ghost btn-sm" onClick={printAllPayslips} title="In tất cả phiếu lương">🖨️ In tất cả</button>
            </div>
            {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : (
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead><tr>
                            <th>Nhân viên</th>
                            <th style={{ textAlign: 'center' }}>Ngày công</th>
                            <th style={{ textAlign: 'center' }}>Nghỉ phép</th>
                            <th style={{ textAlign: 'center' }}>Nghỉ KL</th>
                            <th style={{ textAlign: 'center' }}>OT (h)</th>
                            <th style={{ textAlign: 'right' }}>Thưởng</th>
                            <th style={{ textAlign: 'right' }}>Khấu trừ</th>
                            <th style={{ textAlign: 'right', color: 'var(--status-warning)', fontSize: 11 }}>BH 10.5%</th>
                            <th style={{ textAlign: 'right' }}>Lương cứng</th>
                            <th style={{ textAlign: 'right', color: 'var(--accent-primary)' }}>Thực lĩnh</th>
                            <th></th>
                        </tr></thead>
                        <tbody>
                            {data.employees.map(emp => {
                                const ov = editing[emp.id] || {};
                                const isDirty = Object.keys(ov).length > 0;
                                const numInput = (field, def) => (
                                    <input type="number" step="0.5" value={ov[field] ?? def}
                                        onChange={e => handleChange(emp.id, field, e.target.value)}
                                        style={{ width: 60, padding: '3px 6px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, textAlign: 'center', background: isDirty && ov[field] !== undefined ? 'var(--accent-primary)10' : 'transparent' }} />
                                );
                                const workDays = parseFloat(ov.workDays ?? emp.workDays ?? emp.totalWorkdays);
                                const unpaidDays = parseFloat(ov.unpaidDays ?? emp.unpaidDays ?? 0);
                                const overtimeHrs = parseFloat(ov.overtimeHrs ?? emp.overtimeHrs ?? 0);
                                const bonus = parseFloat(ov.bonus ?? emp.bonus ?? 0);
                                const deduction = parseFloat(ov.deduction ?? emp.deduction ?? 0);
                                const daily = (emp.salary || 0) / emp.totalWorkdays;
                                const bhxh = calcBHXH(emp);
                                const preview = Math.round((daily * workDays) - (daily * unpaidDays) + (daily / 8 * 1.5 * overtimeHrs) + bonus - deduction - bhxh);
                                return (
                                    <tr key={emp.id} style={{ background: isDirty ? 'rgba(var(--accent-rgb), 0.03)' : undefined }}>
                                        <td>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{emp.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.code} · {emp.department?.name}</div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>{numInput('workDays', emp.workDays ?? emp.totalWorkdays)}</td>
                                        <td style={{ textAlign: 'center' }}>{numInput('leaveDays', emp.leaveDays ?? 0)}</td>
                                        <td style={{ textAlign: 'center' }}>{numInput('unpaidDays', emp.unpaidDays ?? 0)}</td>
                                        <td style={{ textAlign: 'center' }}>{numInput('overtimeHrs', emp.overtimeHrs ?? 0)}</td>
                                        <td style={{ textAlign: 'right' }}>{numInput('bonus', emp.bonus ?? 0)}</td>
                                        <td style={{ textAlign: 'right' }}>{numInput('deduction', emp.deduction ?? 0)}</td>
                                        <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--status-warning)' }}>
                                            -{fmt(bhxh)}
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>BH: {fmt(emp.insuranceSalary || emp.salary)}</div>
                                        </td>
                                        <td style={{ textAlign: 'right', fontSize: 12 }}>{fmt(emp.salary)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)', fontSize: 13 }}>
                                            {fmt(isDirty ? preview : emp.netSalary)}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                {isDirty && (
                                                    <button className="btn btn-primary btn-sm" onClick={() => handleSave(emp)} disabled={saving[emp.id]}>
                                                        {saving[emp.id] ? '...' : 'Lưu'}
                                                    </button>
                                                )}
                                                <button className="btn btn-ghost btn-sm" title="In phiếu lương" onClick={() => printPayslip(emp)}>🖨️</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                <td colSpan={7} style={{ textAlign: 'right', fontSize: 13 }}>Tổng quỹ lương tháng {month}/{year}</td>
                                <td style={{ textAlign: 'right', fontSize: 13 }}>{fmt(data.employees.reduce((s, e) => s + (e.salary || 0), 0))}</td>
                                <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--accent-primary)' }}>{fmt(totalPayroll)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}

const LEAVE_TYPES = ['Nghỉ phép năm', 'Nghỉ bù', 'Nghỉ bệnh', 'Nghỉ không lương', 'Nghỉ thai sản'];
const LEAVE_STATUS_COLOR = { 'Chờ duyệt': 'warning', 'Đã duyệt': 'success', 'Từ chối': 'danger' };

function LeaveTab({ employees }) {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ employeeId: '', type: 'Nghỉ phép năm', startDate: '', endDate: '', days: '', reason: '' });

    const load = () => {
        setLoading(true);
        fetch(`/api/hr/leave-requests?month=${month}&year=${year}`)
            .then(r => r.json()).then(d => { setRequests(d); setLoading(false); });
    };
    useEffect(load, [month, year]);

    const handleAdd = async () => {
        if (!form.employeeId || !form.startDate || !form.endDate) return alert('Chọn nhân viên và ngày nghỉ!');
        setSaving(true);
        await fetch('/api/hr/leave-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        setSaving(false);
        setForm({ employeeId: '', type: 'Nghỉ phép năm', startDate: '', endDate: '', days: '', reason: '' });
        setShowForm(false);
        load();
    };

    const updateStatus = async (id, status, approvedBy = '') => {
        await fetch(`/api/hr/leave-requests/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, approvedBy }) });
        load();
    };

    const deleteReq = async (id) => {
        if (!confirm('Xóa đơn này?')) return;
        await fetch(`/api/hr/leave-requests/${id}`, { method: 'DELETE' });
        load();
    };

    const pending = requests.filter(r => r.status === 'Chờ duyệt').length;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Đơn nghỉ phép</span>
                {pending > 0 && <span className="badge warning">{pending} chờ duyệt</span>}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select className="form-select" style={{ width: 80 }} value={month} onChange={e => setMonth(Number(e.target.value))}>
                        {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>T{i + 1}</option>)}
                    </select>
                    <select className="form-select" style={{ width: 90 }} value={year} onChange={e => setYear(Number(e.target.value))}>
                        {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
                    </select>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>+ Tạo đơn</button>
                </div>
            </div>

            {showForm && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                    <div className="form-row">
                        <div className="form-group" style={{ flex: 2 }}>
                            <label className="form-label">Nhân viên *</label>
                            <select className="form-select" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })}>
                                <option value="">— Chọn nhân viên —</option>
                                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.code})</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Loại nghỉ</label>
                            <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Từ ngày</label>
                            <input className="form-input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Đến ngày</label>
                            <input className="form-input" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Số ngày</label>
                            <input className="form-input" type="number" min={0.5} step={0.5} placeholder="1" value={form.days} onChange={e => setForm({ ...form, days: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Lý do</label>
                        <input className="form-input" placeholder="Lý do nghỉ phép..." value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={saving}>{saving ? 'Đang lưu...' : 'Tạo đơn'}</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Hủy</button>
                    </div>
                </div>
            )}

            {loading ? <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : requests.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Không có đơn nghỉ phép trong tháng này.</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr>
                            <th>Nhân viên</th><th>Loại nghỉ</th><th>Từ ngày</th><th>Đến ngày</th>
                            <th style={{ textAlign: 'right' }}>Số ngày</th><th>Lý do</th><th>Trạng thái</th><th></th>
                        </tr></thead>
                        <tbody>
                            {requests.map(r => (
                                <tr key={r.id}>
                                    <td>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.employee?.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.employee?.code} · {r.employee?.department?.name}</div>
                                    </td>
                                    <td><span className="badge muted">{r.type}</span></td>
                                    <td style={{ fontSize: 12 }}>{fmtDate(r.startDate)}</td>
                                    <td style={{ fontSize: 12 }}>{fmtDate(r.endDate)}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{r.days}</td>
                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.reason || '—'}</td>
                                    <td>
                                        <span className={`badge ${LEAVE_STATUS_COLOR[r.status] || 'muted'}`}>{r.status}</span>
                                        {r.status === 'Chờ duyệt' && (
                                            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-success)', padding: '2px 8px', fontSize: 11 }} onClick={() => updateStatus(r.id, 'Đã duyệt', 'Quản lý')}>✓ Duyệt</button>
                                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)', padding: '2px 8px', fontSize: 11 }} onClick={() => updateStatus(r.id, 'Từ chối')}>✕</button>
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        {r.status === 'Chờ duyệt' && (
                                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)' }} onClick={() => deleteReq(r.id)}>🗑</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const STATUS_OPTS = ['Đang làm', 'Nghỉ phép', 'Nghỉ việc'];
const STATUS_COLOR = { 'Đang làm': 'badge-success', 'Nghỉ phép': 'badge-warning', 'Nghỉ việc': 'badge-default' };

const EMPTY_FORM = { name: '', position: '', phone: '', email: '', salary: '', insuranceSalary: '', departmentId: '', status: 'Đang làm', joinDate: '', payrollType: 'office', positionAllowance: 0, phoneAllowance: 0, transportAllowance: 0, diligenceAllowance: 0, mealAllowanceRate: 0, dailyWage: 0, larkId: '' };

export default function HRPage() {
    return <Suspense><HRContent /></Suspense>;
}

function HRContent() {
    const [data, setData] = useState({ employees: [], departments: [] });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const searchParams = useSearchParams();
    const initialTab = searchParams.get('tab') || 'employees';
    const [mainTab, setMainTab] = useState(initialTab);
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState(null); // employee object being edited
    const [form, setForm] = useState(EMPTY_FORM);

    const fetchData = async () => {
        setLoading(true);
        const p = new URLSearchParams({ limit: 1000 });
        if (filterDept) p.set('departmentId', filterDept);
        const res = await fetch(`/api/employees?${p}`);
        const d = await res.json();
        setData({ employees: d.data || [], departments: d.departments || [] });
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [filterDept]);

    const openAdd = () => {
        setEditTarget(null);
        setForm({ ...EMPTY_FORM, departmentId: data.departments[0]?.id || '' });
        setShowModal(true);
    };

    const openEdit = (e) => {
        setEditTarget(e);
        setForm({
            name: e.name, position: e.position, phone: e.phone,
            email: e.email, salary: e.salary, insuranceSalary: e.insuranceSalary || '',
            departmentId: e.departmentId, status: e.status,
            joinDate: e.joinDate ? e.joinDate.split('T')[0] : '',
            payrollType: e.payrollType || 'office',
            positionAllowance: e.positionAllowance || 0,
            phoneAllowance: e.phoneAllowance || 0,
            transportAllowance: e.transportAllowance || 0,
            diligenceAllowance: e.diligenceAllowance || 0,
            mealAllowanceRate: e.mealAllowanceRate || 0,
            dailyWage: e.dailyWage || 0,
            larkId: e.larkId || '',
        });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        const joinDate = form.joinDate ? new Date(form.joinDate).toISOString() : null;
        const payload = { ...form, salary: Number(form.salary) || 0, insuranceSalary: Number(form.insuranceSalary) || 0, joinDate };
        if (editTarget) {
            await fetch(`/api/employees/${editTarget.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        } else {
            await fetch('/api/employees', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        }
        setShowModal(false);
        fetchData();
    };

    const handleDelete = async (id) => {
        if (!confirm('Xóa nhân viên này?')) return;
        await fetch(`/api/employees/${id}`, { method: 'DELETE' });
        fetchData();
    };

    const allEmployees = data.employees;
    const filtered = allEmployees.filter(e => {
        if (filterStatus && e.status !== filterStatus) return false;
        if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.code.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const activeCount = allEmployees.filter(e => e.status === 'Đang làm').length;
    const onLeaveCount = allEmployees.filter(e => e.status === 'Nghỉ phép').length;
    const totalPayroll = allEmployees.filter(e => e.status === 'Đang làm').reduce((s, e) => s + (e.salary || 0), 0);

    return (
        <div>
            {/* KPI cards */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 24 }}>
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div>
                        <div className="stat-value">{allEmployees.length}</div>
                        <div className="stat-label">Tổng nhân sự</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div>
                        <div className="stat-value" style={{ color: 'var(--status-success)' }}>{activeCount}</div>
                        <div className="stat-label">Đang làm việc</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🏖️</div>
                    <div>
                        <div className="stat-value" style={{ color: 'var(--status-warning)' }}>{onLeaveCount}</div>
                        <div className="stat-label">Nghỉ phép</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">💵</div>
                    <div>
                        <div className="stat-value" style={{ color: 'var(--accent-primary)', fontSize: 16 }}>{fmt(totalPayroll)}</div>
                        <div className="stat-label">Quỹ lương / tháng</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🏢</div>
                    <div>
                        <div className="stat-value">{data.departments.length}</div>
                        <div className="stat-label">Phòng ban</div>
                    </div>
                </div>
            </div>

            {/* Tab switcher */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid var(--border)' }}>
                {[{ key: 'employees', label: '👥 Nhân viên' }, { key: 'attendance', label: '📅 Chấm công & Lương' }, { key: 'daily-attendance', label: '⏰ Chấm công ngày' }, { key: 'leave', label: '🗓️ Nghỉ phép' }, { key: 'leave-calendar', label: '📆 Lịch nghỉ' }, { key: 'payroll', label: '💰 Bảng lương' }, { key: 'reviews', label: '📊 Đánh giá' }, { key: 'advances', label: '💸 Tạm ứng' }, { key: 'contracts', label: '📄 Hợp đồng' }, { key: 'office-payroll', label: '💼 Lương VP' }, { key: 'workshop-payroll', label: '🏭 Lương Xưởng' }, { key: 'commission', label: '💰 Hoa hồng KD' }, { key: 'handbook', label: '📖 Sổ tay' }].map(t => (
                    <button key={t.key} onClick={() => setMainTab(t.key)}
                        style={{ padding: '8px 18px', border: 'none', borderBottom: mainTab === t.key ? '2px solid var(--accent-primary)' : '2px solid transparent', background: 'none', cursor: 'pointer', fontWeight: mainTab === t.key ? 700 : 400, color: mainTab === t.key ? 'var(--accent-primary)' : 'var(--text-muted)', fontSize: 13, marginBottom: -2 }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {mainTab === 'attendance' ? <AttendanceTab /> : mainTab === 'daily-attendance' ? (
                <div className="card" style={{ padding: 24 }}>
                    <DailyAttendanceTab />
                </div>
            ) : mainTab === 'leave-calendar' ? (
                <div className="card" style={{ padding: 24 }}>
                    <LeaveCalendarTab />
                </div>
            ) : mainTab === 'leave' ? (
                <div className="card" style={{ padding: 24 }}>
                    <LeaveTab employees={data.employees} />
                </div>
            ) : mainTab === 'payroll' ? (
                <div className="card" style={{ padding: 24 }}>
                    <PayrollTab />
                </div>
            ) : mainTab === 'reviews' ? (
                <div className="card" style={{ padding: 24 }}>
                    <EmployeeReviewTab />
                </div>
            ) : mainTab === 'advances' ? (
                <div className="card" style={{ padding: 24 }}>
                    <SalaryAdvanceTab />
                </div>
            ) : mainTab === 'office-payroll' ? (
                <div className="card" style={{ padding: 24 }}>
                    <OfficePayrollTab />
                </div>
            ) : mainTab === 'workshop-payroll' ? (
                <div className="card" style={{ padding: 24 }}>
                    <WorkshopPayrollTab />
                </div>
            ) : mainTab === 'commission' ? (
                <div className="card" style={{ padding: 24 }}>
                    <CommissionTab />
                </div>
            ) : mainTab === 'contracts' ? (
                <div className="card" style={{ padding: 24 }}>
                    <EmployeeContractsTab />
                </div>
            ) : mainTab === 'handbook' ? (
                <div className="card" style={{ padding: 24 }}>
                    <HandbookTab />
                </div>
            ) : (<>

                {/* Department cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
                    {data.departments.map(d => (
                        <div
                            key={d.id}
                            className="card"
                            style={{ padding: '12px 16px', cursor: 'pointer', border: filterDept === d.id ? '2px solid var(--accent-primary)' : '2px solid transparent' }}
                            onClick={() => setFilterDept(filterDept === d.id ? '' : d.id)}
                        >
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--accent-primary)', lineHeight: 1.2, marginTop: 4 }}>{d._count?.employees || 0}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>nhân viên</div>
                        </div>
                    ))}
                </div>

                {/* Employee table */}
                <div className="card">
                    <div className="card-header">
                        <h3>Nhân viên {filtered.length !== allEmployees.length && `(${filtered.length}/${allEmployees.length})`}</h3>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-ghost btn-sm" title="Kiểm tra và gửi thông báo sinh nhật hôm nay" onClick={async () => {
                                try {
                                    const res = await fetch('/api/cron/birthday');
                                    const d = await res.json();
                                    alert(d.count > 0 ? `🎂 Đã gửi thông báo: ${d.employees?.join(', ')}` : '✅ Hôm nay không có sinh nhật');
                                } catch { alert('Lỗi kiểm tra sinh nhật'); }
                            }}>🎂</button>
                            <button className="btn btn-primary" onClick={openAdd}>+ Thêm NV</button>
                        </div>
                    </div>
                    <div className="filter-bar" style={{ display: 'flex', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                        <input
                            type="text" className="form-input" placeholder="Tìm theo tên, mã..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            style={{ maxWidth: 220 }}
                        />
                        <select className="form-select" style={{ width: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="">Tất cả trạng thái</option>
                            {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                        </select>
                        {(filterDept || filterStatus || search) && (
                            <button className="btn btn-ghost btn-sm" onClick={() => { setFilterDept(''); setFilterStatus(''); setSearch(''); }}>
                                Xóa bộ lọc
                            </button>
                        )}
                    </div>
                    {loading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Mã</th><th>Họ tên</th><th>Chức vụ</th><th>Phòng ban</th>
                                        <th>Loại</th><th>SĐT</th><th>Lương CB</th><th>PC/tháng</th><th>Ngày vào</th><th>TT</th><th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(e => (
                                        <tr key={e.id}>
                                            <td className="accent">{e.code}</td>
                                            <td className="primary" style={{ cursor: 'pointer' }} onClick={() => openEdit(e)}>{e.name}</td>
                                            <td style={{ fontSize: 13 }}>{e.position}</td>
                                            <td><span className="badge badge-info">{e.department?.name}</span></td>
                                            <td>
                                                <span className={`badge ${e.payrollType === 'workshop' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: 11 }}>
                                                    {e.payrollType === 'workshop' ? '🏭 Xưởng' : '💼 VP'}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 13 }}>{e.phone}</td>
                                            <td style={{ fontWeight: 600 }}>{fmt(e.salary)}</td>
                                            <td style={{ fontSize: 12 }}>
                                                {(() => {
                                                    const total = (e.positionAllowance || 0) + (e.phoneAllowance || 0) + (e.transportAllowance || 0) + (e.diligenceAllowance || 0);
                                                    return total > 0 ? <span style={{ color: 'var(--accent-primary)' }}>{fmt(total)}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>;
                                                })()}
                                            </td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(e.joinDate)}</td>
                                            <td>
                                                <span className={`badge ${STATUS_COLOR[e.status] || 'badge-default'}`}>{e.status}</span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)}>✏️</button>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(e.id)}>🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                {filtered.length > 0 && (
                                    <tfoot>
                                        <tr>
                                            <td colSpan={5} style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 16px' }}>
                                                {filtered.length} nhân viên
                                            </td>
                                            <td style={{ fontWeight: 700, padding: '8px 16px' }}>
                                                {fmt(filtered.filter(e => e.status === 'Đang làm').reduce((s, e) => s + (e.salary || 0), 0))}
                                            </td>
                                            <td colSpan={3} />
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    )}
                    {!loading && filtered.length === 0 && (
                        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Không có nhân viên</div>
                    )}
                </div>

            </>)}

            {/* Modal thêm / sửa */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                        <div className="modal-header">
                            <h3>{editTarget ? `Sửa — ${editTarget.name}` : 'Thêm nhân viên'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Họ tên *</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Chức vụ</label>
                                    <input className="form-input" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phòng ban</label>
                                    <select className="form-select" value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}>
                                        {data.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">SĐT</label>
                                    <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Lương (VND)</label>
                                    <input className="form-input" type="number" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} />
                                    {Number(form.salary) > 0 && <div style={{ fontSize: 11, color: 'var(--accent-primary)', marginTop: 2 }}>{fmt(Number(form.salary))}</div>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Lương đóng BH (VND)</label>
                                    <input className="form-input" type="number" placeholder="Để trống = bằng lương" value={form.insuranceSalary} onChange={e => setForm({ ...form, insuranceSalary: e.target.value })} />
                                    {Number(form.insuranceSalary) > 0 && <div style={{ fontSize: 11, color: 'var(--status-warning)', marginTop: 2 }}>BHXH: {fmt(Math.round(Number(form.insuranceSalary) * 0.105))}/tháng</div>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ngày vào làm</label>
                                    <input className="form-input" type="date" value={form.joinDate} onChange={e => setForm({ ...form, joinDate: e.target.value })} />
                                </div>
                            </div>
                            {editTarget && (
                                <div className="form-group">
                                    <label className="form-label">Trạng thái</label>
                                    <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                        {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', padding: '16px 24px' }}>
                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Phân loại & Phụ cấp</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Loại nhân viên</label>
                                    <select className="form-select" value={form.payrollType || 'office'} onChange={e => setForm({ ...form, payrollType: e.target.value })}>
                                        <option value="office">Văn phòng</option>
                                        <option value="workshop">Nhà xưởng</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">PC Chức vụ (đ/tháng)</label>
                                    <input className="form-input" type="number" value={form.positionAllowance || 0} onChange={e => setForm({ ...form, positionAllowance: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">PC Điện thoại (đ/tháng)</label>
                                    <input className="form-input" type="number" value={form.phoneAllowance || 0} onChange={e => setForm({ ...form, phoneAllowance: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">PC Xăng xe (đ/tháng)</label>
                                    <input className="form-input" type="number" value={form.transportAllowance || 0} onChange={e => setForm({ ...form, transportAllowance: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">PC Chuyên cần (đ/tháng)</label>
                                    <input className="form-input" type="number" value={form.diligenceAllowance || 0} onChange={e => setForm({ ...form, diligenceAllowance: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tiền ăn/ngày (xưởng)</label>
                                    <input className="form-input" type="number" value={form.mealAllowanceRate || 0} onChange={e => setForm({ ...form, mealAllowanceRate: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Lương ngày (xưởng)</label>
                                    <input className="form-input" type="number" value={form.dailyWage || 0} onChange={e => setForm({ ...form, dailyWage: parseInt(e.target.value) || 0 })} />
                                </div>
                            </div>
                        </div>
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Liên kết nhắn tin</div>
                            <div className="form-group">
                                <label className="form-label">Lark ID <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>(ou_xxx — để gửi thông báo qua Lark)</span></label>
                                <input className="form-input" value={form.larkId || ''} onChange={e => setForm({ ...form, larkId: e.target.value })} placeholder="ou_xxxxxxxxxxxxxxxxxx" />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSubmit} disabled={!form.name.trim()}>
                                {editTarget ? 'Cập nhật' : 'Thêm mới'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
