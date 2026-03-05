'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtShort = (n) => {
    if (!n) return '0';
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}tỷ`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(0)}tr`;
    return new Intl.NumberFormat('vi-VN').format(n);
};

const FINANCE_ROLES = ['giam_doc', 'pho_gd', 'ke_toan'];
const BUCKETS = ['0–30', '31–60', '61–90', '>90'];
const BUCKET_COLORS = ['var(--status-success)', 'var(--accent-primary)', 'var(--status-warning)', 'var(--status-danger)'];
const BUCKET_LABELS = { '0–30': '0–30 ngày', '31–60': '31–60 ngày', '61–90': '61–90 ngày', '>90': '>90 ngày' };

function AgingBar({ aging, total }) {
    if (!total) return <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</div>;
    return (
        <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 1, minWidth: 80 }}>
            {BUCKETS.map((b, i) => {
                const pct = total ? ((aging[b] || 0) / total) * 100 : 0;
                return pct > 0 ? <div key={b} title={`${BUCKET_LABELS[b]}: ${fmt(aging[b])}`} style={{ flex: pct, background: BUCKET_COLORS[i], minWidth: 3 }} /> : null;
            })}
        </div>
    );
}

function MonthlyBarChart({ months }) {
    const maxVal = Math.max(...months.map(m => Math.max(m.revenue, m.expense)), 1);
    const W = 680, H = 220, PAD = { top: 16, right: 16, bottom: 44, left: 64 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;
    const barW = (chartW / months.length) * 0.33;
    const groupW = chartW / months.length;
    const yScale = (v) => PAD.top + chartH - (v / maxVal) * chartH;
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({ v: maxVal * f, y: yScale(maxVal * f) }));
    return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, height: 'auto' }}>
            {yTicks.map(t => (
                <g key={t.v}>
                    <line x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y} stroke="var(--border-color)" strokeWidth={0.5} />
                    <text x={PAD.left - 6} y={t.y + 4} textAnchor="end" fontSize={9} fill="var(--text-muted)">{fmtShort(t.v)}</text>
                </g>
            ))}
            {months.map((m, i) => {
                const x = PAD.left + i * groupW;
                const rH = Math.max(1, (m.revenue / maxVal) * chartH);
                const eH = Math.max(1, (m.expense / maxVal) * chartH);
                return (
                    <g key={m.month}>
                        {m.revenue > 0 && <rect x={x + groupW * 0.08} y={yScale(m.revenue)} width={barW} height={rH} fill="var(--accent-primary)" rx={2} opacity={0.85} />}
                        {m.expense > 0 && <rect x={x + groupW * 0.08 + barW + 2} y={yScale(m.expense)} width={barW} height={eH} fill="var(--status-danger)" rx={2} opacity={0.7} />}
                        <text x={x + groupW * 0.5} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={10} fill="var(--text-muted)">{m.label}</text>
                    </g>
                );
            })}
            <rect x={PAD.left} y={H - 12} width={10} height={8} fill="var(--accent-primary)" rx={1} />
            <text x={PAD.left + 14} y={H - 5} fontSize={9} fill="var(--text-muted)">Doanh thu</text>
            <rect x={PAD.left + 80} y={H - 12} width={10} height={8} fill="var(--status-danger)" rx={1} opacity={0.7} />
            <text x={PAD.left + 94} y={H - 5} fontSize={9} fill="var(--text-muted)">Chi phí</text>
        </svg>
    );
}

function exportCSV(filename, headers, rows) {
    const bom = '\uFEFF';
    const csv = bom + [headers.join(','), ...rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

export default function ReportsPage() {
    const router = useRouter();
    const { role } = useRole();
    const canSeeFinance = FINANCE_ROLES.includes(role);
    const [tab, setTab] = useState('overview');
    const [debt, setDebt] = useState(null);
    const [projects, setProjects] = useState([]);
    const [monthly, setMonthly] = useState(null);
    const [monthlyYear, setMonthlyYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [loadingMonthly, setLoadingMonthly] = useState(false);
    const [pnl, setPnl] = useState(null);
    const [loadingPnl, setLoadingPnl] = useState(false);
    const [agingRecv, setAgingRecv] = useState(null);
    const [loadingAging, setLoadingAging] = useState(false);
    const [cashflow, setCashflow] = useState(null);
    const [loadingCashflow, setLoadingCashflow] = useState(false);

    const [funnel, setFunnel] = useState(null);
    const [portfolio, setPortfolio] = useState(null);
    const [loadingPortfolio, setLoadingPortfolio] = useState(false);

    // New tabs state
    const [profitData, setProfitData] = useState(null);
    const [loadingProfit, setLoadingProfit] = useState(false);
    const [apData, setApData] = useState(null);
    const [loadingAp, setLoadingAp] = useState(false);
    const [reminders, setReminders] = useState(null);
    const [loadingReminders, setLoadingReminders] = useState(false);

    useEffect(() => {
        Promise.all([
            fetch('/api/reports/debt').then(r => r.ok ? r.json() : null).catch(() => null),
            fetch('/api/reports/projects').then(r => r.ok ? r.json() : []).catch(() => []),
            fetch('/api/reports/funnel').then(r => r.ok ? r.json() : null).catch(() => null),
        ]).then(([d, p, f]) => { setDebt(d); setProjects(p || []); setFunnel(f); setLoading(false); });
    }, []);

    useEffect(() => {
        if (tab !== 'monthly') return;
        setLoadingMonthly(true);
        fetch(`/api/reports/monthly?year=${monthlyYear}`)
            .then(r => r.json()).then(d => { setMonthly(d); setLoadingMonthly(false); });
    }, [tab, monthlyYear]);

    useEffect(() => {
        if (tab !== 'pnl' || pnl) return;
        setLoadingPnl(true);
        fetch('/api/reports/project-pnl').then(r => r.json()).then(d => { setPnl(d); setLoadingPnl(false); });
    }, [tab]);

    useEffect(() => {
        if (tab !== 'aging_recv' || agingRecv) return;
        setLoadingAging(true);
        fetch('/api/reports/aging-receivables').then(r => r.json()).then(d => { setAgingRecv(d); setLoadingAging(false); });
    }, [tab]);

    useEffect(() => {
        if (tab !== 'cashflow' || cashflow) return;
        setLoadingCashflow(true);
        fetch('/api/reports/cashflow-forecast?days=90').then(r => r.json()).then(d => { setCashflow(d); setLoadingCashflow(false); });
    }, [tab]);

    useEffect(() => {
        if (tab !== 'portfolio' || portfolio) return;
        setLoadingPortfolio(true);
        fetch('/api/reports/portfolio').then(r => r.json()).then(d => { setPortfolio(d); setLoadingPortfolio(false); });
    }, [tab]);

    useEffect(() => {
        if (tab !== 'profit_project' || profitData) return;
        setLoadingProfit(true);
        fetch('/api/reports/profit-by-project').then(r => r.ok ? r.json() : null).then(d => { setProfitData(d); setLoadingProfit(false); }).catch(() => setLoadingProfit(false));
    }, [tab]);

    useEffect(() => {
        if (tab !== 'ap' || apData) return;
        setLoadingAp(true);
        fetch('/api/reports/accounts-payable').then(r => r.ok ? r.json() : null).then(d => { setApData(d); setLoadingAp(false); }).catch(() => setLoadingAp(false));
    }, [tab]);

    useEffect(() => {
        if (tab !== 'reminders' || reminders) return;
        setLoadingReminders(true);
        fetch('/api/reports/payment-reminders').then(r => r.ok ? r.json() : null).then(d => { setReminders(d); setLoadingReminders(false); }).catch(() => setLoadingReminders(false));
    }, [tab]);

    if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải báo cáo...</div>;

    const totalPayable = (debt?.supplierTotal || 0) + (debt?.contractorTotal || 0);
    const totalReceivable = projects.reduce((s, p) => s + Math.max(0, (p.contractValue || 0) - (p.paidAmount || 0)), 0);
    const activeProjects = projects.filter(p => !['Bàn giao', 'Hủy'].includes(p.status)).length;

    const TABS = [
        { key: 'overview', label: '🗺️ Tổng quan' },
        ...(canSeeFinance ? [
            { key: 'monthly', label: '📊 Doanh thu tháng' },
            { key: 'pnl', label: '💹 P&L Dự án' },
            { key: 'aging_recv', label: '⏰ Tuổi nợ KH' },
            { key: 'cashflow', label: '💸 Dòng tiền' },
            { key: 'supplier_debt', label: '🏭 Công nợ NCC' },
            { key: 'contractor_debt', label: '👷 Công nợ thầu' },
            { key: 'reminders', label: '🔔 Nhắc TT' },
        ] : []),
        { key: 'projects', label: '🏗️ Thu chi dự án' },
        ...(canSeeFinance ? [
            { key: 'profit_project', label: '📊 Lãi/lỗ DA' },
            { key: 'ap', label: '💳 Công nợ NCC v2' },
            { key: 'portfolio', label: '🎯 Portfolio' },
        ] : []),
    ];

    const handleExportProjects = () => exportCSV('du-an.csv',
        ['Mã DA', 'Tên dự án', 'Khách hàng', 'Trạng thái', 'Giá trị HĐ', 'Đã thu', 'Còn thu', 'Chi thầu', 'Chi VT', 'Tổng chi'],
        projects.map(p => [p.code, p.name, p.customer?.name, p.status, p.contractValue, p.paidAmount, Math.max(0, (p.contractValue || 0) - (p.paidAmount || 0)), p.contractorCost, p.poCost, (p.contractorCost || 0) + (p.poCost || 0)])
    );
    const handleExportDebt = (type) => {
        const list = type === 'supplier' ? debt?.topSuppliers : debt?.topContractors;
        if (!list) return;
        exportCSV(`cong-no-${type}.csv`,
            ['Mã', 'Tên', 'Loại', 'Tổng nợ', '0-30', '31-60', '61-90', '>90'],
            list.map(s => [s.code, s.name, s.type, s.totalDebt, s.aging['0–30'] || 0, s.aging['31–60'] || 0, s.aging['61–90'] || 0, s.aging['>90'] || 0])
        );
    };
    const handleExportMonthly = () => {
        if (!monthly) return;
        exportCSV(`doanh-thu-${monthlyYear}.csv`, ['Tháng', 'Doanh thu', 'Chi phí', 'Lợi nhuận'],
            monthly.months.map(m => [m.label, m.revenue, m.expense, m.profit]));
    };

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>📈 Báo cáo & Thống kê</h1>
                    <p>Dữ liệu thực từ hệ thống — công nợ, dự án, tài chính</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
                {[
                    { label: 'Dự án hoạt động', value: `${activeProjects}`, color: 'var(--accent-primary)', icon: '🏗️' },
                    canSeeFinance && { label: 'Phải thu KH', value: fmtShort(totalReceivable), color: 'var(--status-success)', icon: '💰' },
                    canSeeFinance && { label: 'Phải trả NCC', value: fmtShort(debt?.supplierTotal), color: 'var(--status-warning)', icon: '🏭' },
                    canSeeFinance && { label: 'Phải trả thầu', value: fmtShort(debt?.contractorTotal), color: 'var(--status-danger)', icon: '👷' },
                    canSeeFinance && { label: 'Tổng phải trả', value: fmtShort(totalPayable), color: 'var(--status-danger)', icon: '📊' },
                ].filter(Boolean).map(k => (
                    <div key={k.label} className="card" style={{ padding: '14px 18px' }}>
                        <div style={{ fontSize: 22, marginBottom: 4 }}>{k.icon}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{k.value}</div>
                    </div>
                ))}
            </div>

            <div className="card">
                <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border-color)', paddingLeft: 16 }}>
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            style={{ padding: '10px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer', border: 'none', borderBottom: tab === t.key ? '3px solid var(--accent-primary)' : '3px solid transparent', background: 'none', color: tab === t.key ? 'var(--accent-primary)' : 'var(--text-muted)', transition: '0.2s' }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {tab === 'overview' && (
                    <div style={{ padding: 24 }}>
                        {canSeeFinance && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                                {[
                                    { label: '🏭 Phân kỳ nợ NCC', total: debt?.supplierTotal, aging: debt?.supplierAging, color: 'var(--status-warning)' },
                                    { label: '👷 Phân kỳ nợ thầu', total: debt?.contractorTotal, aging: debt?.contractorAging, color: 'var(--status-danger)' },
                                ].map(block => (
                                    <div key={block.label} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 20 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{block.label}</div>
                                        <div style={{ fontSize: 20, fontWeight: 700, color: block.color, marginBottom: 10 }}>{fmt(block.total)}</div>
                                        <AgingBar aging={block.aging || {}} total={block.total || 0} />
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
                                            {BUCKETS.filter(b => (block.aging?.[b] || 0) > 0).map(b => (
                                                <div key={b}>
                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{BUCKET_LABELS[b]}</div>
                                                    <div style={{ fontWeight: 600, fontSize: 12, color: BUCKET_COLORS[BUCKETS.indexOf(b)] }}>{fmtShort(block.aging?.[b])}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>🏗️ Tình trạng dự án</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                {Object.entries(projects.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {}))
                                    .sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                                        <div key={status} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 18px', textAlign: 'center', cursor: 'pointer' }}
                                            onClick={() => router.push(`/projects?status=${encodeURIComponent(status)}`)}>
                                            <div style={{ fontSize: 22, fontWeight: 700 }}>{count}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{status}</div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                        {canSeeFinance && debt?.topSuppliers?.length > 0 && (
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>🔝 Top NCC nợ nhiều nhất</div>
                                {debt.topSuppliers.slice(0, 5).map(s => (
                                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 8 }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--accent-primary)' }} onClick={() => router.push(`/partners/suppliers/${s.id}`)}>{s.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.code} · {s.type}</div>
                                        </div>
                                        <div style={{ textAlign: 'right', minWidth: 140 }}>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--status-danger)', marginBottom: 4 }}>{fmt(s.totalDebt)}</div>
                                            <AgingBar aging={s.aging} total={s.totalDebt} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {funnel && (
                            <div style={{ marginTop: 24 }}>
                                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>🔀 Phễu chuyển đổi CRM</div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
                                    {funnel.stages.map((stage, i) => {
                                        const maxCount = funnel.stages[0]?.count || 1;
                                        const widthPct = Math.max(30, (stage.count / maxCount) * 100);
                                        return (
                                            <div key={stage.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                                                {i > 0 && stage.rate != null && (
                                                    <div style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: stage.rate >= 50 ? 'var(--status-success)' : 'var(--status-warning)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                        {stage.rate}%
                                                    </div>
                                                )}
                                                <div style={{ width: `${widthPct}%`, background: stage.color || 'var(--accent-primary)', borderRadius: 6, padding: '14px 8px', textAlign: 'center', transition: 'width 0.4s', minHeight: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                    <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{stage.count}</div>
                                                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{stage.label}</div>
                                                </div>
                                                {i < funnel.stages.length - 1 && (
                                                    <div style={{ fontSize: 18, color: 'var(--text-muted)', marginTop: 4 }}>↓</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                {funnel.details && Object.keys(funnel.details).length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                                        {Object.entries(funnel.details).map(([status, count]) => (
                                            <div key={status} style={{ background: 'var(--bg-secondary)', borderRadius: 6, padding: '4px 12px', fontSize: 12 }}>
                                                <span style={{ color: 'var(--text-muted)' }}>{status}: </span>
                                                <span style={{ fontWeight: 700 }}>{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {tab === 'monthly' && canSeeFinance && (
                    <div style={{ padding: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                            <label style={{ fontSize: 13, fontWeight: 600 }}>Năm:</label>
                            <select className="form-select" style={{ width: 100 }} value={monthlyYear} onChange={e => setMonthlyYear(Number(e.target.value))}>
                                {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
                            </select>
                            {monthly && <button className="btn btn-ghost btn-sm" onClick={handleExportMonthly}>📥 Xuất CSV</button>}
                        </div>
                        {loadingMonthly ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : monthly ? (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
                                    {[
                                        { label: 'TỔNG DOANH THU', val: monthly.summary.totalRevenue, color: 'var(--accent-primary)' },
                                        { label: 'TỔNG CHI PHÍ', val: monthly.summary.totalExpense, color: 'var(--status-danger)' },
                                        { label: 'LỢI NHUẬN', val: monthly.summary.totalProfit, color: monthly.summary.totalProfit >= 0 ? 'var(--status-success)' : 'var(--status-danger)' },
                                    ].map(k => (
                                        <div key={k.label} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '14px 20px' }}>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{k.label}</div>
                                            <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{fmtShort(k.val)}</div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ marginBottom: 24 }}><MonthlyBarChart months={monthly.months} /></div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="data-table" style={{ margin: 0 }}>
                                        <thead><tr>
                                            <th>Tháng</th>
                                            <th style={{ textAlign: 'right' }}>Doanh thu</th>
                                            <th style={{ textAlign: 'right' }}>Chi phí</th>
                                            <th style={{ textAlign: 'right' }}>Lợi nhuận</th>
                                            <th style={{ textAlign: 'right', fontSize: 11 }}>Lũy kế DT</th>
                                        </tr></thead>
                                        <tbody>
                                            {monthly.months.map(m => (
                                                <tr key={m.month}>
                                                    <td style={{ fontWeight: 600 }}>{m.label}/{monthlyYear}</td>
                                                    <td style={{ textAlign: 'right', color: 'var(--accent-primary)', fontWeight: 600 }}>{m.revenue > 0 ? fmt(m.revenue) : '—'}</td>
                                                    <td style={{ textAlign: 'right', color: 'var(--status-danger)' }}>{m.expense > 0 ? fmt(m.expense) : '—'}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: m.profit >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
                                                        {(m.revenue > 0 || m.expense > 0) ? fmt(m.profit) : '—'}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>{fmtShort(m.cumRevenue)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : null}
                    </div>
                )}

                {tab === 'supplier_debt' && canSeeFinance && (
                    <div>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Tổng nợ NCC:</span>
                            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--status-danger)' }}>{fmt(debt?.supplierTotal)}</span>
                            {BUCKETS.filter(b => (debt?.supplierAging?.[b] || 0) > 0).map(b => (
                                <div key={b} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{BUCKET_LABELS[b]}</div>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: BUCKET_COLORS[BUCKETS.indexOf(b)] }}>{fmt(debt?.supplierAging?.[b])}</div>
                                </div>
                            ))}
                            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => handleExportDebt('supplier')}>📥 Xuất CSV</button>
                        </div>
                        {!debt?.topSuppliers?.length ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có NCC tồn nợ ✅</div> : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table" style={{ margin: 0 }}>
                                    <thead><tr><th>NCC</th><th>Loại</th><th style={{ textAlign: 'right' }}>Tổng nợ</th><th>Phân kỳ</th>{BUCKETS.map(b => <th key={b} style={{ textAlign: 'right', fontSize: 11 }}>{BUCKET_LABELS[b]}</th>)}<th></th></tr></thead>
                                    <tbody>
                                        {debt.topSuppliers.map(s => (
                                            <tr key={s.id}>
                                                <td><div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.code}</div></td>
                                                <td style={{ fontSize: 12 }}>{s.type}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--status-danger)', fontSize: 13 }}>{fmt(s.totalDebt)}</td>
                                                <td style={{ minWidth: 100 }}><AgingBar aging={s.aging} total={s.totalDebt} /></td>
                                                {BUCKETS.map((b, i) => <td key={b} style={{ textAlign: 'right', fontSize: 12, color: (s.aging[b] || 0) > 0 ? BUCKET_COLORS[i] : 'var(--text-muted)' }}>{(s.aging[b] || 0) > 0 ? fmtShort(s.aging[b]) : '—'}</td>)}
                                                <td><button className="btn btn-ghost btn-sm" onClick={() => router.push(`/partners/suppliers/${s.id}`)}>Xem →</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'contractor_debt' && canSeeFinance && (
                    <div>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Tổng nợ thầu:</span>
                            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--status-danger)' }}>{fmt(debt?.contractorTotal)}</span>
                            {BUCKETS.filter(b => (debt?.contractorAging?.[b] || 0) > 0).map(b => (
                                <div key={b} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{BUCKET_LABELS[b]}</div>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: BUCKET_COLORS[BUCKETS.indexOf(b)] }}>{fmt(debt?.contractorAging?.[b])}</div>
                                </div>
                            ))}
                            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => handleExportDebt('contractor')}>📥 Xuất CSV</button>
                        </div>
                        {!debt?.topContractors?.length ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có thầu phụ tồn nợ ✅</div> : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table" style={{ margin: 0 }}>
                                    <thead><tr><th>Thầu phụ</th><th>Loại</th><th style={{ textAlign: 'right' }}>Tổng nợ</th><th>Phân kỳ</th>{BUCKETS.map(b => <th key={b} style={{ textAlign: 'right', fontSize: 11 }}>{BUCKET_LABELS[b]}</th>)}<th></th></tr></thead>
                                    <tbody>
                                        {debt.topContractors.map(c => (
                                            <tr key={c.id}>
                                                <td><div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.code}</div></td>
                                                <td style={{ fontSize: 12 }}>{c.type}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--status-danger)', fontSize: 13 }}>{fmt(c.totalDebt)}</td>
                                                <td style={{ minWidth: 100 }}><AgingBar aging={c.aging} total={c.totalDebt} /></td>
                                                {BUCKETS.map((b, i) => <td key={b} style={{ textAlign: 'right', fontSize: 12, color: (c.aging[b] || 0) > 0 ? BUCKET_COLORS[i] : 'var(--text-muted)' }}>{(c.aging[b] || 0) > 0 ? fmtShort(c.aging[b]) : '—'}</td>)}
                                                <td><button className="btn btn-ghost btn-sm" onClick={() => router.push(`/partners/contractors/${c.id}`)}>Xem →</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'pnl' && canSeeFinance && (
                    <div style={{ padding: 24 }}>
                        {loadingPnl ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : pnl && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
                                    {[
                                        { label: 'Tổng giá trị HĐ', val: pnl.summary.totalContractValue, color: 'var(--accent-primary)' },
                                        { label: 'Đã thu từ KH', val: pnl.summary.totalPaid, color: 'var(--status-success)' },
                                        { label: 'Tổng chi phí', val: pnl.summary.totalCost, color: 'var(--status-danger)' },
                                        { label: 'Lợi nhuận gộp', val: pnl.summary.totalProfit, color: pnl.summary.totalProfit >= 0 ? 'var(--status-success)' : 'var(--status-danger)' },
                                    ].map(k => (
                                        <div key={k.label} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px' }}>
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{k.label}</div>
                                            <div style={{ fontSize: 16, fontWeight: 700, color: k.color }}>{fmtShort(k.val)}</div>
                                        </div>
                                    ))}
                                </div>
                                {pnl.summary.alertCount > 0 && (
                                    <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--status-danger)' }}>
                                        ⚠️ {pnl.summary.alertCount} dự án có margin &lt; 10% — cần kiểm tra
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                                    <button className="btn btn-ghost btn-sm" onClick={() => exportCSV('pnl-du-an.csv',
                                        ['Mã DA', 'Dự án', 'Khách hàng', 'Trạng thái', 'Giá trị HĐ', 'Đã thu', 'Chi thầu', 'Chi VT', 'Chi khác', 'Tổng chi', 'Lợi nhuận', 'Margin %'],
                                        pnl.rows.map(r => [r.code, r.name, r.customerName, r.status, r.contractValue, r.paidByCustomer, r.contractorCost, r.poCost, r.expenseCost, r.totalCost, r.grossProfit, r.margin]))}>
                                        📥 Xuất CSV
                                    </button>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="data-table" style={{ margin: 0 }}>
                                        <thead><tr>
                                            <th>Dự án</th><th>Trạng thái</th>
                                            <th style={{ textAlign: 'right' }}>Giá trị HĐ</th>
                                            <th style={{ textAlign: 'right' }}>Đã thu</th>
                                            <th style={{ textAlign: 'right' }}>Tổng chi</th>
                                            <th style={{ textAlign: 'right' }}>Lợi nhuận</th>
                                            <th style={{ textAlign: 'right' }}>Margin</th>
                                            <th></th>
                                        </tr></thead>
                                        <tbody>
                                            {pnl.rows.map(r => (
                                                <tr key={r.id} style={{ background: r.alert ? 'rgba(220,38,38,0.03)' : undefined }}>
                                                    <td>
                                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.code} · {r.customerName}</div>
                                                    </td>
                                                    <td><span className="badge muted">{r.status}</span></td>
                                                    <td style={{ textAlign: 'right', fontSize: 12 }}>{r.contractValue > 0 ? fmt(r.contractValue) : '—'}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--status-success)' }}>{r.paidByCustomer > 0 ? fmt(r.paidByCustomer) : '—'}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--status-danger)' }}>{r.totalCost > 0 ? fmt(r.totalCost) : '—'}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: r.grossProfit >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>{r.contractValue > 0 ? fmt(r.grossProfit) : '—'}</td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        {r.contractValue > 0 && (
                                                            <span style={{ fontWeight: 700, fontSize: 13, color: r.margin < 10 ? 'var(--status-danger)' : r.margin < 20 ? 'var(--status-warning)' : 'var(--status-success)' }}>
                                                                {r.margin}%{r.alert && ' ⚠️'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td><button className="btn btn-ghost btn-sm" onClick={() => router.push(`/projects/${r.id}`)}>Xem →</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {tab === 'aging_recv' && canSeeFinance && (
                    <div style={{ padding: 24 }}>
                        {loadingAging ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : agingRecv && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
                                    {[
                                        { key: 'current', label: 'Chưa đến hạn', color: 'var(--status-success)' },
                                        { key: '1-30', label: '1–30 ngày', color: 'var(--accent-primary)' },
                                        { key: '31-60', label: '31–60 ngày', color: 'var(--status-warning)' },
                                        { key: '61-90', label: '61–90 ngày', color: '#f97316' },
                                        { key: '>90', label: '>90 ngày', color: 'var(--status-danger)' },
                                    ].map(b => (
                                        <div key={b.key} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px', textAlign: 'center', borderTop: `3px solid ${b.color}` }}>
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{b.label}</div>
                                            <div style={{ fontWeight: 700, fontSize: 15, color: b.color }}>{fmtShort(agingRecv.bucketTotals[b.key] || 0)}</div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14 }}>Tổng phải thu: <span style={{ color: 'var(--status-warning)' }}>{fmt(agingRecv.totalOutstanding)}</span></div>
                                    <button className="btn btn-ghost btn-sm" onClick={() => exportCSV('aging-phai-thu.csv',
                                        ['Hợp đồng', 'Đợt thanh toán', 'Khách hàng', 'Dự án', 'Còn lại', 'Hạn thu', 'Quá hạn (ngày)', 'Nhóm'],
                                        agingRecv.rows.map(r => [r.contractCode, r.phase, r.customerName, r.projectName, r.outstanding, r.dueDate ? new Date(r.dueDate).toLocaleDateString('vi-VN') : '—', r.daysOverdue ?? 'Chưa đến hạn', r.bucket]))}>
                                        📥 Xuất CSV
                                    </button>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="data-table" style={{ margin: 0 }}>
                                        <thead><tr>
                                            <th>Khách hàng / Dự án</th>
                                            <th>Đợt thanh toán</th>
                                            <th style={{ textAlign: 'right' }}>Còn lại</th>
                                            <th>Hạn thu</th>
                                            <th style={{ textAlign: 'center' }}>Quá hạn</th>
                                            <th></th>
                                        </tr></thead>
                                        <tbody>
                                            {agingRecv.rows.map(r => (
                                                <tr key={r.id}>
                                                    <td>
                                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.customerName}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.projectName}</div>
                                                    </td>
                                                    <td style={{ fontSize: 13 }}>{r.phase}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--status-warning)' }}>{fmt(r.outstanding)}</td>
                                                    <td style={{ fontSize: 12 }}>{r.dueDate ? new Date(r.dueDate).toLocaleDateString('vi-VN') : '—'}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {r.daysOverdue !== null ? (
                                                            <span style={{ fontWeight: 700, fontSize: 12, color: r.daysOverdue > 60 ? 'var(--status-danger)' : r.daysOverdue > 30 ? '#f97316' : 'var(--status-warning)' }}>
                                                                {r.daysOverdue === 0 ? 'Hôm nay' : `${r.daysOverdue} ngày`}
                                                            </span>
                                                        ) : <span style={{ fontSize: 11, color: 'var(--status-success)' }}>Chưa đến</span>}
                                                    </td>
                                                    <td>{r.contractId && <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/contracts/${r.contractId}`)}>Xem →</button>}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {tab === 'cashflow' && canSeeFinance && (
                    <div style={{ padding: 24 }}>
                        {loadingCashflow ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : cashflow && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
                                    {[
                                        { label: 'Dự kiến thu (90 ngày)', val: cashflow.totalInflow, color: 'var(--status-success)' },
                                        { label: 'Dự kiến chi (90 ngày)', val: cashflow.totalOutflow, color: 'var(--status-danger)' },
                                        { label: 'Net Cash Flow', val: cashflow.netCashflow, color: cashflow.netCashflow >= 0 ? 'var(--status-success)' : 'var(--status-danger)' },
                                    ].map(k => (
                                        <div key={k.label} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '14px 20px' }}>
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{k.label}</div>
                                            <div style={{ fontWeight: 700, fontSize: 18, color: k.color }}>{fmtShort(k.val)}</div>
                                        </div>
                                    ))}
                                </div>
                                {cashflow.weeks.some(w => w.alert) && (
                                    <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--status-danger)' }}>
                                        ⚠️ Cảnh báo: có {cashflow.weeks.filter(w => w.alert).length} tuần dự báo balance âm — cần chuẩn bị vốn
                                    </div>
                                )}
                                <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                                    <table className="data-table" style={{ margin: 0 }}>
                                        <thead><tr>
                                            <th>Tuần</th>
                                            <th style={{ textAlign: 'right' }}>Dự kiến thu</th>
                                            <th style={{ textAlign: 'right' }}>Dự kiến chi</th>
                                            <th style={{ textAlign: 'right' }}>Net</th>
                                            <th style={{ textAlign: 'right' }}>Balance tích lũy</th>
                                        </tr></thead>
                                        <tbody>
                                            {cashflow.weeks.map(w => (
                                                <tr key={w.label} style={{ background: w.alert ? 'rgba(220,38,38,0.04)' : undefined }}>
                                                    <td style={{ fontWeight: 600, fontSize: 13 }}>
                                                        {w.label} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({new Date(w.start).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })})</span>
                                                    </td>
                                                    <td style={{ textAlign: 'right', color: 'var(--status-success)', fontSize: 12 }}>{w.inflow > 0 ? fmt(w.inflow) : '—'}</td>
                                                    <td style={{ textAlign: 'right', color: 'var(--status-danger)', fontSize: 12 }}>{w.outflow > 0 ? fmt(w.outflow) : '—'}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: w.net >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>{w.net !== 0 ? fmt(w.net) : '—'}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: w.alert ? 'var(--status-danger)' : 'var(--text-primary)' }}>
                                                        {fmt(w.balance)}{w.alert && ' 🔴'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    * Dự kiến chi bao gồm PO chưa thanh toán + lương tháng ({fmtShort(cashflow.monthlyPayroll)}/tháng). Balance tích lũy chưa tính số dư đầu kỳ.
                                </div>
                            </>
                        )}
                    </div>
                )}

                {tab === 'projects' && (
                    <div style={{ overflowX: 'auto' }}>
                        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost btn-sm" onClick={handleExportProjects}>📥 Xuất CSV</button>
                        </div>
                        {!projects.length ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu</div> : (
                            <table className="data-table" style={{ margin: 0 }}>
                                <thead><tr>
                                    <th>Dự án</th><th>Trạng thái</th>
                                    {canSeeFinance && <><th style={{ textAlign: 'right' }}>Giá trị HĐ</th><th style={{ textAlign: 'right' }}>Đã thu</th><th style={{ textAlign: 'right' }}>Còn thu</th><th style={{ textAlign: 'right' }}>Chi thầu</th><th style={{ textAlign: 'right' }}>Chi VT</th><th style={{ textAlign: 'right' }}>Tổng chi</th></>}
                                    <th></th>
                                </tr></thead>
                                <tbody>
                                    {projects.map(p => {
                                        const receivable = Math.max(0, (p.contractValue || 0) - (p.paidAmount || 0));
                                        const totalCost = (p.contractorCost || 0) + (p.poCost || 0);
                                        return (
                                            <tr key={p.id}>
                                                <td><div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.code} · {p.customer?.name}</div></td>
                                                <td><span className={`badge ${p.status === 'Bàn giao' ? 'success' : 'muted'}`}>{p.status}</span></td>
                                                {canSeeFinance && <>
                                                    <td style={{ textAlign: 'right', fontSize: 12 }}>{p.contractValue > 0 ? fmt(p.contractValue) : '—'}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--status-success)' }}>{p.paidAmount > 0 ? fmt(p.paidAmount) : '—'}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: receivable > 0 ? 'var(--status-warning)' : 'var(--text-muted)' }}>{receivable > 0 ? fmt(receivable) : '—'}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12 }}>{p.contractorCost > 0 ? fmt(p.contractorCost) : '—'}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12 }}>{p.poCost > 0 ? fmt(p.poCost) : '—'}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: totalCost > 0 ? 'var(--status-danger)' : 'var(--text-muted)' }}>{totalCost > 0 ? fmt(totalCost) : '—'}</td>
                                                </>}
                                                <td><button className="btn btn-ghost btn-sm" onClick={() => router.push(`/projects/${p.id}`)}>Xem →</button></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {canSeeFinance && (
                                    <tfoot><tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                        <td colSpan={2} style={{ textAlign: 'right', fontSize: 13 }}>Tổng cộng</td>
                                        <td style={{ textAlign: 'right', fontSize: 13 }}>{fmt(projects.reduce((s, p) => s + (p.contractValue || 0), 0))}</td>
                                        <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--status-success)' }}>{fmt(projects.reduce((s, p) => s + (p.paidAmount || 0), 0))}</td>
                                        <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--status-warning)' }}>{fmt(totalReceivable)}</td>
                                        <td style={{ textAlign: 'right', fontSize: 13 }}>{fmt(projects.reduce((s, p) => s + (p.contractorCost || 0), 0))}</td>
                                        <td style={{ textAlign: 'right', fontSize: 13 }}>{fmt(projects.reduce((s, p) => s + (p.poCost || 0), 0))}</td>
                                        <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--status-danger)' }}>{fmt(projects.reduce((s, p) => s + (p.contractorCost || 0) + (p.poCost || 0), 0))}</td>
                                        <td></td>
                                    </tr></tfoot>
                                )}
                            </table>
                        )}
                    </div>
                )}
                {tab === 'portfolio' && (
                    <div style={{ padding: 24 }}>
                        {loadingPortfolio ? (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Đang tải...</div>
                        ) : portfolio ? (
                            <>
                                {/* Portfolio KPIs */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
                                    {[
                                        { label: 'Tổng dự án', value: portfolio.kpis.total, color: 'var(--accent-primary)' },
                                        { label: 'Đang thi công', value: portfolio.kpis.active, color: 'var(--status-warning)' },
                                        { label: 'Tổng doanh thu', value: fmtShort(portfolio.kpis.portfolioRevenue), color: 'var(--status-success)' },
                                        { label: 'Tổng chi phí', value: fmtShort(portfolio.kpis.portfolioCost), color: 'var(--status-danger)' },
                                        { label: 'Lợi nhuận gộp', value: fmtShort(portfolio.kpis.portfolioProfit), color: portfolio.kpis.portfolioProfit >= 0 ? 'var(--status-success)' : 'var(--status-danger)' },
                                        { label: 'Biên LN TB', value: `${portfolio.kpis.avgMargin}%`, color: 'var(--accent-secondary)' },
                                    ].map(k => (
                                        <div key={k.label} style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '14px 16px' }}>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{k.label}</div>
                                            <div style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{k.value}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Cost Benchmark by type */}
                                {portfolio.benchmark?.length > 0 && (
                                    <div style={{ marginBottom: 28 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Chi phí/m² theo loại dự án</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {portfolio.benchmark.map(b => {
                                                const maxBm = portfolio.benchmark[0].avgCostPerSqm || 1;
                                                return (
                                                    <div key={b.type} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                        <div style={{ width: 140, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{b.type}</div>
                                                        <div style={{ flex: 1, height: 24, background: 'var(--bg-secondary)', borderRadius: 6, overflow: 'hidden' }}>
                                                            <div style={{ width: `${(b.avgCostPerSqm / maxBm) * 100}%`, height: '100%', background: 'var(--accent-primary)', opacity: 0.7, borderRadius: 6, minWidth: 4 }} />
                                                        </div>
                                                        <div style={{ width: 120, textAlign: 'right', fontSize: 13, fontWeight: 700 }}>
                                                            {new Intl.NumberFormat('vi-VN').format(b.avgCostPerSqm)} đ/m²
                                                        </div>
                                                        <div style={{ width: 60, textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>{b.count} DA</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Per-project table */}
                                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Chi tiết từng dự án</div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="data-table" style={{ margin: 0 }}>
                                        <thead><tr>
                                            <th>Dự án</th><th>Loại</th><th>Tiến độ</th>
                                            <th style={{ textAlign: 'right' }}>Doanh thu</th>
                                            <th style={{ textAlign: 'right' }}>Chi phí</th>
                                            <th style={{ textAlign: 'right' }}>LN gộp</th>
                                            <th style={{ textAlign: 'right' }}>Biên LN</th>
                                            <th style={{ textAlign: 'right' }}>Chi/m²</th>
                                            <th></th>
                                        </tr></thead>
                                        <tbody>
                                            {portfolio.projects.map(p => (
                                                <tr key={p.id}>
                                                    <td>
                                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.code} · {p.customer?.name}</div>
                                                    </td>
                                                    <td style={{ fontSize: 12 }}>{p.type}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <div style={{ flex: 1, height: 6, background: 'var(--bg-secondary)', borderRadius: 3 }}>
                                                                <div style={{ width: `${p.progress}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: 3 }} />
                                                            </div>
                                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 28 }}>{p.progress}%</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontSize: 12 }}>{p.contractValue > 0 ? fmtShort(p.contractValue) : '—'}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12 }}>{p.totalCost > 0 ? fmtShort(p.totalCost) : '—'}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: p.grossProfit >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
                                                        {p.contractValue > 0 ? fmtShort(p.grossProfit) : '—'}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: p.margin >= 20 ? 'var(--status-success)' : p.margin >= 10 ? 'var(--status-warning)' : 'var(--status-danger)' }}>
                                                        {p.contractValue > 0 ? `${p.margin}%` : '—'}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>
                                                        {p.costPerSqm > 0 ? `${new Intl.NumberFormat('vi-VN').format(p.costPerSqm)}` : '—'}
                                                    </td>
                                                    <td><button className="btn btn-ghost btn-sm" onClick={() => router.push(`/projects/${p.id}`)}>→</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : null}
                    </div>
                )}

                {tab === 'profit_project' && canSeeFinance && (
                    <div style={{ padding: 24 }}>
                        {loadingProfit ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : profitData && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
                                    {[
                                        { label: 'Tổng doanh thu', val: profitData.summary.totalRevenue, color: 'var(--status-success)' },
                                        { label: 'Tổng chi phí', val: profitData.summary.totalCost, color: 'var(--status-danger)' },
                                        { label: 'Tổng lợi nhuận', val: profitData.summary.totalProfit, color: profitData.summary.totalProfit >= 0 ? 'var(--status-success)' : 'var(--status-danger)' },
                                        { label: 'DA có lãi', val: profitData.summary.profitableCount, color: 'var(--status-success)' },
                                        { label: 'DA lỗ', val: profitData.summary.lossCount, color: 'var(--status-danger)' },
                                    ].map(k => (
                                        <div key={k.label} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px' }}>
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{k.label}</div>
                                            <div style={{ fontSize: 16, fontWeight: 700, color: k.color }}>{typeof k.val === 'number' && k.val > 999 ? fmtShort(k.val) : k.val}</div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                                    <button className="btn btn-ghost btn-sm" onClick={() => exportCSV('lai-lo-du-an.csv',
                                        ['Mã DA', 'Tên', 'Khách hàng', 'Trạng thái', 'Doanh thu', 'Chi phí', 'PO', 'Thầu phụ', 'Tổng chi', 'Lãi/lỗ', 'Margin %'],
                                        profitData.data.map(r => [r.code, r.name, r.customer, r.status, r.revenue, r.expenses, r.purchaseOrders, r.contractorCosts, r.totalCost, r.profit, r.margin]))}>📥 Xuất CSV</button>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="data-table" style={{ margin: 0 }}>
                                        <thead><tr>
                                            <th>Dự án</th><th>Trạng thái</th>
                                            <th style={{ textAlign: 'right' }}>Doanh thu</th>
                                            <th style={{ textAlign: 'right' }}>Chi phí PS</th>
                                            <th style={{ textAlign: 'right' }}>PO</th>
                                            <th style={{ textAlign: 'right' }}>Thầu phụ</th>
                                            <th style={{ textAlign: 'right' }}>Tổng chi</th>
                                            <th style={{ textAlign: 'right' }}>Lãi/lỗ</th>
                                            <th style={{ textAlign: 'right' }}>Margin</th>
                                            <th></th>
                                        </tr></thead>
                                        <tbody>
                                            {profitData.data.map(r => (
                                                <tr key={r.id} style={{ background: r.profit < 0 ? 'rgba(220,38,38,0.03)' : undefined }}>
                                                    <td><div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.code} · {r.customer}</div></td>
                                                    <td><span className="badge muted">{r.status}</span></td>
                                                    <td style={{ textAlign: 'right', color: 'var(--status-success)', fontSize: 12 }}>{r.revenue > 0 ? fmt(r.revenue) : '—'}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12 }}>{r.expenses > 0 ? fmt(r.expenses) : '—'}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12 }}>{r.purchaseOrders > 0 ? fmt(r.purchaseOrders) : '—'}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12 }}>{r.contractorCosts > 0 ? fmt(r.contractorCosts) : '—'}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--status-danger)', fontWeight: 600 }}>{r.totalCost > 0 ? fmt(r.totalCost) : '—'}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: r.profit >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>{fmt(r.profit)}</td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <span style={{ fontWeight: 700, fontSize: 13, color: r.margin < 0 ? 'var(--status-danger)' : r.margin < 10 ? 'var(--status-warning)' : 'var(--status-success)' }}>{r.margin}%</span>
                                                    </td>
                                                    <td><button className="btn btn-ghost btn-sm" onClick={() => router.push(`/projects/${r.id}`)}>→</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {tab === 'ap' && canSeeFinance && (
                    <div style={{ padding: 24 }}>
                        {loadingAp ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : apData && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                                    {[
                                        { label: 'Nợ NCC', val: apData.summary.totalSupplierDebt, color: 'var(--status-warning)' },
                                        { label: 'Nợ thầu phụ', val: apData.summary.totalContractorDebt, color: 'var(--status-danger)' },
                                        { label: 'Số NCC còn nợ', val: apData.summary.supplierCount, color: 'var(--accent-primary)' },
                                        { label: 'Số thầu còn nợ', val: apData.summary.contractorCount, color: 'var(--accent-primary)' },
                                    ].map(k => (
                                        <div key={k.label} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px' }}>
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{k.label}</div>
                                            <div style={{ fontSize: 16, fontWeight: 700, color: k.color }}>{typeof k.val === 'number' && k.val > 999 ? fmtShort(k.val) : k.val}</div>
                                        </div>
                                    ))}
                                </div>
                                {apData.suppliers.length > 0 && (
                                    <div style={{ marginBottom: 28 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>🏭 Nhà cung cấp ({apData.suppliers.length})</div>
                                        <table className="data-table" style={{ margin: 0 }}>
                                            <thead><tr><th>NCC</th><th style={{ textAlign: 'right' }}>Tổng nợ</th><th>Đơn hàng chưa TT</th></tr></thead>
                                            <tbody>
                                                {apData.suppliers.map(s => (
                                                    <tr key={s.name}>
                                                        <td><div style={{ fontWeight: 600 }}>{s.name}</div>{s.phone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.phone}</div>}</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--status-danger)' }}>{fmt(s.totalOwed)}</td>
                                                        <td style={{ fontSize: 12 }}>{s.orders.map(o => <div key={o.id} style={{ marginBottom: 2 }}><span style={{ fontWeight: 600 }}>{o.code}</span> · {o.project?.name || '—'} · còn {fmt(o.remaining)}</div>)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {apData.contractors.length > 0 && (
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>👷 Thầu phụ ({apData.contractors.length})</div>
                                        <table className="data-table" style={{ margin: 0 }}>
                                            <thead><tr><th>Thầu phụ</th><th style={{ textAlign: 'right' }}>Tổng nợ</th><th>Chi tiết</th></tr></thead>
                                            <tbody>
                                                {apData.contractors.map(c => (
                                                    <tr key={c.name}>
                                                        <td><div style={{ fontWeight: 600 }}>{c.name}</div>{c.phone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.phone}</div>}</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--status-danger)' }}>{fmt(c.totalOwed)}</td>
                                                        <td style={{ fontSize: 12 }}>{c.payments.map(p => <div key={p.id} style={{ marginBottom: 2 }}>{p.phase} · {p.project?.name || '—'} · còn {fmt(p.remaining)}</div>)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {tab === 'reminders' && canSeeFinance && (
                    <div style={{ padding: 24 }}>
                        {loadingReminders ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : reminders && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                                    {[
                                        { label: '🔴 Quá hạn', count: reminders.summary.overdueCount, val: reminders.summary.overdueAmount, color: 'var(--status-danger)' },
                                        { label: '🟡 Sắp đến hạn (7 ngày)', count: reminders.summary.dueSoonCount, val: reminders.summary.dueSoonAmount, color: 'var(--status-warning)' },
                                        { label: '🟢 Sắp tới (30 ngày)', count: reminders.summary.upcomingCount, val: reminders.summary.upcomingAmount, color: 'var(--status-success)' },
                                    ].map(k => (
                                        <div key={k.label} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '14px 16px', borderTop: `3px solid ${k.color}` }}>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{k.label}</div>
                                            <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.count}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtShort(k.val)}</div>
                                        </div>
                                    ))}
                                </div>
                                {reminders.overdue.length > 0 && (
                                    <div style={{ marginBottom: 24 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--status-danger)', marginBottom: 10 }}>🔴 Quá hạn ({reminders.overdue.length})</div>
                                        {reminders.overdue.map(p => (
                                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(220,38,38,0.04)', borderRadius: 8, border: '1px solid rgba(220,38,38,0.15)', marginBottom: 6 }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.phase}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.contract} · {p.customer} · {p.projectCode}</div>
                                                    {p.customerPhone && <div style={{ fontSize: 11, color: 'var(--accent-primary)' }}>📞 {p.customerPhone}</div>}
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontWeight: 700, color: 'var(--status-danger)' }}>{fmt(p.remaining)}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--status-danger)' }}>Trễ {Math.abs(p.daysUntilDue)} ngày</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {reminders.dueSoon.length > 0 && (
                                    <div style={{ marginBottom: 24 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--status-warning)', marginBottom: 10 }}>🟡 Sắp đến hạn ({reminders.dueSoon.length})</div>
                                        {reminders.dueSoon.map(p => (
                                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(217,119,6,0.04)', borderRadius: 8, border: '1px solid rgba(217,119,6,0.15)', marginBottom: 6 }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.phase}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.contract} · {p.customer} · {p.projectCode}</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontWeight: 700, color: 'var(--status-warning)' }}>{fmt(p.remaining)}</div>
                                                    <div style={{ fontSize: 11 }}>{p.daysUntilDue === 0 ? 'Hôm nay' : `Còn ${p.daysUntilDue} ngày`}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {reminders.upcoming.length > 0 && (
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>🟢 Sắp tới ({reminders.upcoming.length})</div>
                                        <table className="data-table" style={{ margin: 0, fontSize: 12 }}>
                                            <thead><tr><th>Đợt TT</th><th>KH</th><th>Dự án</th><th style={{ textAlign: 'right' }}>Số tiền</th><th>Hạn</th></tr></thead>
                                            <tbody>{reminders.upcoming.map(p => (
                                                <tr key={p.id}>
                                                    <td style={{ fontWeight: 600 }}>{p.phase}</td>
                                                    <td>{p.customer}</td>
                                                    <td>{p.projectCode}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(p.remaining)}</td>
                                                    <td>{p.dueDate ? new Date(p.dueDate).toLocaleDateString('vi-VN') : '—'}</td>
                                                </tr>
                                            ))}</tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
