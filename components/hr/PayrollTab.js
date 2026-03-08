'use client';
import { useState, useEffect, useCallback } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtShort = (n) => {
    if (!n) return '0';
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}tỷ`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(0)}tr`;
    return new Intl.NumberFormat('vi-VN').format(n);
};

function exportCSV(filename, headers, rows) {
    const bom = '\uFEFF';
    const csv = bom + [headers.join(','), ...rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

export default function PayrollTab() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        fetch(`/api/hr/payroll?month=${month}&year=${year}`)
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [month, year]);

    useEffect(() => { load(); }, [load]);

    const generate = async () => {
        if (!confirm(`Tạo/cập nhật bảng lương tháng ${month}/${year}?`)) return;
        setGenerating(true);
        const res = await fetch('/api/hr/payroll', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ month, year }),
        });
        if (res.ok) { load(); } else { alert('Lỗi tạo bảng lương'); }
        setGenerating(false);
    };

    const handleExport = () => {
        if (!data?.data?.length) return;
        exportCSV(`bang-luong-${month}-${year}.csv`,
            ['Mã NV', 'Họ tên', 'Chức vụ', 'Lương cơ bản', 'Ngày công', 'Tăng ca', 'BHXH NV', 'BHYT NV', 'Thu nhập chịu thuế', 'Thuế TNCN', 'Thực lĩnh'],
            data.data.map(r => [r.employee?.code, r.employee?.name, r.employee?.position, r.baseSalary, r.actualDays, r.overtimeHours, r.bhxhEmployee, r.bhytEmployee, r.taxableIncome, r.personalTax, r.netSalary])
        );
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
                <select className="form-select" style={{ width: 80 }} value={month} onChange={e => setMonth(Number(e.target.value))}>
                    {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>T{i + 1}</option>)}
                </select>
                <select className="form-select" style={{ width: 90 }} value={year} onChange={e => setYear(Number(e.target.value))}>
                    {[2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
                </select>
                <button className="btn btn-primary" onClick={generate} disabled={generating}>{generating ? 'Đang tính...' : '⚡ Tính lương'}</button>
                {data?.data?.length > 0 && <button className="btn btn-ghost" onClick={handleExport}>📥 Xuất CSV</button>}
                <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>BHXH, BHYT, BHTN, thuế TNCN tự động</div>
            </div>

            {data?.summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                    {[
                        { label: 'Số nhân viên', val: data.summary.count, color: 'var(--accent-primary)' },
                        { label: 'Tổng lương gross', val: fmtShort(data.summary.totalGross), color: 'var(--accent-primary)' },
                        { label: 'Tổng thuế TNCN', val: fmtShort(data.summary.totalTax), color: 'var(--status-warning)' },
                        { label: 'Tổng thực lĩnh', val: fmtShort(data.summary.totalNet), color: 'var(--status-success)' },
                    ].map(k => (
                        <div key={k.label} className="card" style={{ padding: '14px 18px' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{k.label}</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.val}</div>
                        </div>
                    ))}
                </div>
            )}

            <table className="data-table" style={{ margin: 0, fontSize: 12 }}>
                <thead><tr>
                    <th>Mã NV</th><th>Họ tên</th><th>Chức vụ</th>
                    <th style={{ textAlign: 'right' }}>Lương CB</th>
                    <th style={{ textAlign: 'right' }}>Ngày công</th>
                    <th style={{ textAlign: 'right' }}>Tăng ca (h)</th>
                    <th style={{ textAlign: 'right' }}>BHXH NV</th>
                    <th style={{ textAlign: 'right' }}>Thuế TNCN</th>
                    <th style={{ textAlign: 'right', fontWeight: 700 }}>Thực lĩnh</th>
                    <th>TT</th>
                </tr></thead>
                <tbody>
                    {loading ? <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Đang tải...</td></tr>
                        : (!data?.data || data.data.length === 0) ? (
                            <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Chưa có dữ liệu. Nhấn "Tính lương" để tạo.</td></tr>
                        ) : data.data.map(r => (
                            <tr key={r.id}>
                                <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{r.employee?.code}</td>
                                <td style={{ fontWeight: 500 }}>{r.employee?.name}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{r.employee?.position || '—'}</td>
                                <td style={{ textAlign: 'right' }}>{fmt(r.baseSalary)}</td>
                                <td style={{ textAlign: 'right' }}>{r.actualDays}/{r.workDays}</td>
                                <td style={{ textAlign: 'right' }}>{r.overtimeHours > 0 ? r.overtimeHours : '—'}</td>
                                <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{fmt(r.bhxhEmployee + r.bhytEmployee + r.bhtnEmployee)}</td>
                                <td style={{ textAlign: 'right', color: r.personalTax > 0 ? 'var(--status-warning)' : 'var(--text-muted)' }}>{r.personalTax > 0 ? fmt(r.personalTax) : '—'}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--status-success)' }}>{fmt(r.netSalary)}</td>
                                <td>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: r.status === 'Đã chi' ? 'var(--status-success)' : r.status === 'Đã duyệt' ? 'var(--accent-primary)' : 'var(--text-muted)', padding: '2px 6px', background: r.status === 'Đã chi' ? 'rgba(22,163,74,0.1)' : 'var(--bg-secondary)', borderRadius: 4 }}>
                                        {r.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                </tbody>
                {data?.data?.length > 0 && (
                    <tfoot><tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                        <td colSpan={3} style={{ textAlign: 'right' }}>Tổng cộng</td>
                        <td style={{ textAlign: 'right' }}>{fmt(data.data.reduce((s, r) => s + r.baseSalary, 0))}</td>
                        <td colSpan={2}></td>
                        <td style={{ textAlign: 'right' }}>{fmt(data.data.reduce((s, r) => s + r.bhxhEmployee + r.bhytEmployee + r.bhtnEmployee, 0))}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(data.data.reduce((s, r) => s + r.personalTax, 0))}</td>
                        <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>{fmt(data.data.reduce((s, r) => s + r.netSalary, 0))}</td>
                        <td></td>
                    </tr></tfoot>
                )}
            </table>
        </div>
    );
}
