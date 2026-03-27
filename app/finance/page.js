'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const ReceivablesTab = dynamic(() => import('@/components/finance/ReceivablesTab'), { ssr: false, loading: () => <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> });
const ExpensesTab = dynamic(() => import('@/components/finance/ExpensesTab'), { ssr: false, loading: () => <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> });

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

export default function FinancePage() {
    return <Suspense><FinanceContent /></Suspense>;
}

function FinanceContent() {
    const searchParams = useSearchParams();
    const initialTab = searchParams.get('tab') || 'overview';
    const [activeTab, setActiveTab] = useState(initialTab);
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(true);

    // Dòng tiền & Công nợ data (lazy load)
    const [aging, setAging] = useState(null);
    const [cashflow, setCashflow] = useState(null);
    const [retentions, setRetentions] = useState([]);
    const [receivables, setReceivables] = useState({ payments: [], summary: {} });
    const [transactions, setTransactions] = useState([]);
    const [showTxModal, setShowTxModal] = useState(false);
    const [txForm, setTxForm] = useState({ type: 'Thu', description: '', amount: 0, category: '', date: new Date().toISOString().split('T')[0] });
    const [filterType, setFilterType] = useState('');

    const fetchOverview = async () => {
        setLoading(true);
        const [finRes, recRes] = await Promise.all([
            fetch('/api/finance').then(r => r.json()),
            fetch('/api/finance/receivables').then(r => r.json()),
        ]);
        setSummary(finRes.summary || {});
        setTransactions(finRes.transactions?.data || []);
        setReceivables(recRes);
        setLoading(false);
    };
    const fetchAging = async () => { if (aging) return; const res = await fetch('/api/finance/ar-aging'); setAging(await res.json()); };
    const fetchCashflow = async () => { if (cashflow) return; const res = await fetch('/api/finance/cashflow'); setCashflow(await res.json()); };
    const fetchRetentions = async () => { if (retentions.length) return; const res = await fetch('/api/contractor-payments?retentionOnly=1&limit=500'); if (res.ok) { const data = await res.json(); setRetentions((data.data || []).filter(p => (p.retentionAmount || 0) > 0 && !p.retentionReleased)); } };

    useEffect(() => { fetchOverview(); }, []);

    const handleTabChange = (key) => {
        setActiveTab(key);
        if (key === 'dong_tien') { fetchCashflow(); fetchAging(); }
        if (key === 'cong_no') { fetchRetentions(); }
        if (key === 'bao_cao') { fetchCashflow(); }
    };

    const handleSubmitTx = async () => {
        await fetch('/api/finance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...txForm, amount: Number(txForm.amount), date: new Date(txForm.date) }) });
        setShowTxModal(false);
        setTxForm({ type: 'Thu', description: '', amount: 0, category: '', date: new Date().toISOString().split('T')[0] });
        fetchOverview();
    };

    const TABS = [
        { key: 'overview', label: '📊 Tổng quan' },
        { key: 'thu_tien', label: '💵 Thu tiền' },
        { key: 'chi_phi', label: '💸 Chi phí' },
        { key: 'dong_tien', label: '💧 Dòng tiền' },
        { key: 'cong_no', label: '📋 Công nợ' },
        { key: 'bao_cao', label: '📅 Báo cáo tháng' },
    ];

    // Filter receivable payments for Công nợ tab
    const filterProject_cn = '';
    const filterStatus_cn = '';
    const projects_cn = [...new Set(receivables.payments.map(p => p.contract?.project?.name).filter(Boolean))];

    return (
        <div>
            {/* KPI Cards */}
            <div className="stats-grid">
                <div className="stat-card"><div className="stat-icon">📈</div><div><div className="stat-value" style={{ color: 'var(--status-success)' }}>{fmt(summary.totalReceived)}</div><div className="stat-label">Đã thu từ HĐ</div></div></div>
                <div className="stat-card"><div className="stat-icon">🔴</div><div><div className="stat-value" style={{ color: 'var(--status-danger)' }}>{fmt(summary.receivableOutstanding)}</div><div className="stat-label">Công nợ phải thu</div></div></div>
                <div className="stat-card"><div className="stat-icon">💸</div><div><div className="stat-value" style={{ color: 'var(--status-warning)' }}>{fmt(summary.totalExpensePaid)}</div><div className="stat-label">Đã chi (DA+CT)</div></div></div>
                <div className="stat-card"><div className="stat-icon">📉</div><div><div className="stat-value" style={{ color: 'var(--status-warning)' }}>{fmt(summary.payableOutstanding)}</div><div className="stat-label">Công nợ nhà thầu</div></div></div>
                <div className="stat-card"><div className="stat-icon">💵</div><div><div className="stat-value" style={{ color: (summary.netCashflow || 0) >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>{fmt(summary.netCashflow)}</div><div className="stat-label">Dòng tiền ròng</div></div></div>
            </div>

            {/* Main Tabs */}
            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header">
                    <div className="tab-bar">
                        {TABS.map(t => (
                            <button key={t.key} className={`tab-item ${activeTab === t.key ? 'active' : ''}`}
                                onClick={() => handleTabChange(t.key)}>{t.label}</button>
                        ))}
                    </div>
                    {activeTab === 'dong_tien' && (
                        <button className="btn btn-primary" onClick={() => setShowTxModal(true)}>+ Thêm giao dịch</button>
                    )}
                </div>

                {/* === TAB: Tổng quan === */}
                {activeTab === 'overview' && (
                    <div className="card-body">
                        <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            <div className="card" style={{ border: '1px solid var(--border)' }}>
                                <div className="card-header"><h3>📈 Công nợ phải thu</h3></div>
                                <div className="card-body">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Tổng phải thu</span><span style={{ fontWeight: 700 }}>{fmt(summary.totalReceivable)}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Đã thu</span><span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmt(summary.totalReceived)}</span></div>
                                    <div className="progress-bar" style={{ height: 8, marginBottom: 8 }}><div className="progress-fill" style={{ width: `${summary.totalReceivable > 0 ? Math.round((summary.totalReceived || 0) / summary.totalReceivable * 100) : 0}%` }}></div></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--status-danger)' }}><span>Còn phải thu</span><span>{fmt(summary.receivableOutstanding)}</span></div>
                                </div>
                            </div>
                            <div className="card" style={{ border: '1px solid var(--border)' }}>
                                <div className="card-header"><h3>📉 Công nợ nhà thầu</h3></div>
                                <div className="card-body">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Tổng phải trả</span><span style={{ fontWeight: 700 }}>{fmt(summary.totalPayable)}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Đã trả</span><span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmt(summary.totalPaid)}</span></div>
                                    <div className="progress-bar" style={{ height: 8, marginBottom: 8 }}><div className="progress-fill" style={{ width: `${summary.totalPayable > 0 ? Math.round((summary.totalPaid || 0) / summary.totalPayable * 100) : 0}%`, background: 'var(--status-warning)' }}></div></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--status-warning)' }}><span>Còn phải trả</span><span>{fmt(summary.payableOutstanding)}</span></div>
                                </div>
                            </div>
                            <div className="card" style={{ border: '1px solid var(--border)' }}>
                                <div className="card-header"><h3>💸 Chi phí (DA + Công ty)</h3></div>
                                <div className="card-body">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Tổng phải chi</span><span style={{ fontWeight: 700 }}>{fmt(summary.totalExpenseApproved)}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Đã chi</span><span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmt(summary.totalExpensePaid)}</span></div>
                                    <div className="progress-bar" style={{ height: 8, marginBottom: 8 }}><div className="progress-fill" style={{ width: `${summary.totalExpenseApproved > 0 ? Math.round((summary.totalExpensePaid || 0) / summary.totalExpenseApproved * 100) : 0}%`, background: 'var(--status-danger)' }}></div></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}><span>Chờ duyệt</span><span style={{ fontWeight: 600, color: 'var(--status-warning)' }}>{fmt(summary.totalExpensePending)}</span></div>
                                </div>
                            </div>
                        </div>
                        <div className="dashboard-grid" style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 14, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                                <span>Thu khác</span><span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmt(summary.manualIncome)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: 14, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                                <span>Chi khác</span><span style={{ fontWeight: 700, color: 'var(--status-danger)' }}>{fmt(summary.manualExpense)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* === TAB: Thu tiền === */}
                {activeTab === 'thu_tien' && (
                    <div className="card-body" style={{ padding: 0 }}>
                        <div style={{ padding: 20 }}><ReceivablesTab /></div>
                    </div>
                )}

                {/* === TAB: Chi phí === */}
                {activeTab === 'chi_phi' && (
                    <div className="card-body" style={{ padding: 0 }}>
                        <div style={{ padding: 20 }}><ExpensesTab /></div>
                    </div>
                )}

                {/* === TAB: Dòng tiền === */}
                {activeTab === 'dong_tien' && (
                    <div className="card-body">
                        {/* Cashflow */}
                        {!cashflow ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Đang tải...</div> : (
                            <>
                                <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                                    {[
                                        { label: 'Tổng thu', val: cashflow.totals.inflow, color: 'var(--status-success)' },
                                        { label: 'Tổng chi', val: cashflow.totals.outflow, color: 'var(--status-danger)' },
                                        { label: 'Dòng tiền ròng', val: cashflow.totals.net, color: cashflow.totals.net >= 0 ? 'var(--status-success)' : 'var(--status-danger)' },
                                    ].map(({ label, val, color }) => (
                                        <div key={label} className="stat-card" style={{ flex: 1 }}>
                                            <div><div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div><div style={{ fontSize: 18, fontWeight: 700, color }}>{fmt(val)}</div></div>
                                        </div>
                                    ))}
                                </div>
                                {cashflow.months.length > 0 && (() => {
                                    const months = cashflow.months.slice(-12);
                                    const maxVal = Math.max(...months.map(m => Math.max(m.inflow, m.outflow)), 1);
                                    const W = 760, H = 160, pad = { l: 8, r: 8, t: 12, b: 28 };
                                    const bw = (W - pad.l - pad.r) / months.length;
                                    const barW = Math.max(8, bw * 0.35);
                                    const yScale = v => pad.t + (H - pad.t - pad.b) * (1 - v / maxVal);
                                    const fmtShort = v => v >= 1e9 ? `${(v/1e9).toFixed(1)}tỷ` : v >= 1e6 ? `${(v/1e6).toFixed(0)}tr` : v > 0 ? `${(v/1e3).toFixed(0)}k` : '';
                                    return (
                                        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 4px 4px', marginBottom: 16, overflowX: 'auto' }}>
                                            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
                                                {/* gridlines */}
                                                {[0.25,0.5,0.75,1].map(f => (
                                                    <line key={f} x1={pad.l} x2={W-pad.r} y1={yScale(maxVal*f)} y2={yScale(maxVal*f)} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4,4"/>
                                                ))}
                                                {months.map((m, i) => {
                                                    const cx = pad.l + bw * i + bw / 2;
                                                    const iy = yScale(m.inflow), oy = yScale(m.outflow);
                                                    const baseY = H - pad.b;
                                                    return (
                                                        <g key={m.key}>
                                                            {/* Inflow bar */}
                                                            <rect x={cx - barW - 1} y={iy} width={barW} height={Math.max(2, baseY - iy)} fill="var(--status-success)" opacity="0.85" rx="2"/>
                                                            {/* Outflow bar */}
                                                            <rect x={cx + 1} y={oy} width={barW} height={Math.max(2, baseY - oy)} fill="var(--status-danger)" opacity="0.75" rx="2"/>
                                                            {/* Label tháng */}
                                                            <text x={cx} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--text-muted)">{m.label.replace('T','').split('/').join('/')}</text>
                                                            {/* inflow label on top */}
                                                            {m.inflow > 0 && <text x={cx - barW/2 - 1} y={iy - 3} textAnchor="middle" fontSize="7" fill="var(--status-success)">{fmtShort(m.inflow)}</text>}
                                                        </g>
                                                    );
                                                })}
                                            </svg>
                                            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                                                <span><span style={{ color: 'var(--status-success)', fontWeight: 700 }}>▋</span> Thu vào</span>
                                                <span><span style={{ color: 'var(--status-danger)', fontWeight: 700 }}>▋</span> Chi ra</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                                <table className="data-table" style={{ margin: 0 }}>
                                    <thead><tr><th>Tháng</th><th style={{ textAlign: 'right' }}>Thu vào</th><th style={{ textAlign: 'right' }}>Chi ra</th><th style={{ textAlign: 'right' }}>Ròng</th><th style={{ textAlign: 'right' }}>Luỹ kế</th></tr></thead>
                                    <tbody>{cashflow.months.map(m => (
                                        <tr key={m.key}>
                                            <td style={{ fontWeight: 600 }}>{m.label}</td>
                                            <td style={{ textAlign: 'right', color: 'var(--status-success)', fontWeight: 600 }}>{fmt(m.inflow)}</td>
                                            <td style={{ textAlign: 'right', color: 'var(--status-danger)' }}>{fmt(m.outflow)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: m.net >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>{fmt(m.net)}</td>
                                            <td style={{ textAlign: 'right', color: m.runningBalance >= 0 ? 'var(--primary)' : 'var(--status-danger)' }}>{fmt(m.runningBalance)}</td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            </>
                        )}

                        {/* AR Aging */}
                        {aging && (
                            <div style={{ marginTop: 32 }}>
                                <h3 style={{ marginBottom: 16, fontSize: 16 }}>⏳ AR Aging — Phân tích tuổi nợ</h3>
                                <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                                    {Object.entries(aging.brackets).map(([key, b]) => b.total > 0 && (
                                        <div key={key} className="stat-card" style={{ flex: '1 1 160px', minWidth: 140 }}>
                                            <div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{b.label}</div>
                                                <div style={{ fontSize: 18, fontWeight: 700, color: key === '90plus' ? 'var(--status-danger)' : key === '61_90' ? 'var(--status-warning)' : 'var(--text)' }}>{fmt(b.total)}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{b.items.length} đợt</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 16, paddingTop: 12, borderTop: '2px solid var(--border)', color: 'var(--status-danger)' }}>
                                    Tổng tồn đọng: {fmt(aging.grandTotal)}
                                </div>
                            </div>
                        )}

                        {/* Thu chi khác */}
                        <div style={{ marginTop: 32 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <h3 style={{ fontSize: 16 }}>💳 Thu chi khác</h3>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <select className="form-select" style={{ width: 120 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                                        <option value="">Tất cả</option><option>Thu</option><option>Chi</option>
                                    </select>
                                </div>
                            </div>
                            {loading ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : (
                                <table className="data-table" style={{ margin: 0 }}>
                                    <thead><tr><th>Mã GD</th><th>Loại</th><th>Mô tả</th><th>Số tiền</th><th>Danh mục</th><th>Dự án</th><th>Ngày</th></tr></thead>
                                    <tbody>{transactions.filter(t => !filterType || t.type === filterType).map(t => (
                                        <tr key={t.id}>
                                            <td className="accent">{t.code}</td>
                                            <td><span className={`badge ${t.type === 'Thu' ? 'success' : 'danger'}`}>{t.type}</span></td>
                                            <td>{t.description}</td>
                                            <td style={{ fontWeight: 600, color: t.type === 'Thu' ? 'var(--status-success)' : 'var(--status-danger)' }}>{t.type === 'Thu' ? '+' : '-'}{fmt(t.amount)}</td>
                                            <td><span className="badge muted">{t.category}</span></td>
                                            <td>{t.project?.name || '—'}</td>
                                            <td>{fmtDate(t.date)}</td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* === TAB: Công nợ === */}
                {activeTab === 'cong_no' && (
                    <div className="card-body">
                        <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                            {/* Phải thu */}
                            <div className="card" style={{ border: '1px solid var(--border)' }}>
                                <div className="card-header"><h3>📈 Phải thu KH</h3></div>
                                <div className="card-body">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Tổng phải thu</span><span style={{ fontWeight: 700 }}>{fmt(summary.totalReceivable)}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Đã thu</span><span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmt(summary.totalReceived)}</span></div>
                                    <div className="progress-bar" style={{ height: 8, marginBottom: 8 }}><div className="progress-fill" style={{ width: `${summary.totalReceivable > 0 ? Math.round((summary.totalReceived || 0) / summary.totalReceivable * 100) : 0}%` }}></div></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--status-danger)' }}><span>Còn phải thu</span><span>{fmt(summary.receivableOutstanding)}</span></div>
                                </div>
                            </div>
                            {/* Phải trả */}
                            <div className="card" style={{ border: '1px solid var(--border)' }}>
                                <div className="card-header"><h3>👷 Phải trả NT</h3></div>
                                <div className="card-body">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Tổng HĐ thầu phụ</span><span style={{ fontWeight: 700 }}>{fmt(summary.totalPayable)}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Đã trả</span><span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmt(summary.totalPaid)}</span></div>
                                    <div className="progress-bar" style={{ height: 8, marginBottom: 8 }}><div className="progress-fill" style={{ width: `${summary.totalPayable > 0 ? Math.round((summary.totalPaid || 0) / summary.totalPayable * 100) : 0}%`, background: 'var(--status-warning)' }}></div></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--status-warning)' }}><span>Còn nợ</span><span>{fmt(summary.payableOutstanding)}</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Giữ lại BH */}
                        <h3 style={{ marginBottom: 12, fontSize: 15 }}>🔒 Giữ lại bảo hành</h3>
                        {retentions.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Không có khoản giữ lại bảo hành nào đang chờ hoàn trả.</div>
                        ) : (
                            <>
                                <table className="data-table" style={{ margin: 0 }}>
                                    <thead><tr><th>Nhà thầu</th><th>Dự án</th><th>Giai đoạn</th><th>HĐ NT</th><th>% Giữ lại</th><th>Số tiền GLL</th><th>Trạng thái</th></tr></thead>
                                    <tbody>{retentions.map(p => (
                                        <tr key={p.id}>
                                            <td style={{ fontWeight: 600 }}>{p.contractor?.name || '—'}</td>
                                            <td>{p.project?.name || '—'}</td>
                                            <td>{p.phase || '—'}</td>
                                            <td className="amount">{fmt(p.contractAmount)}</td>
                                            <td style={{ textAlign: 'center' }}>{p.retentionRate}%</td>
                                            <td style={{ fontWeight: 700, color: 'var(--status-warning)' }}>{fmt(p.retentionAmount)}</td>
                                            <td><span className="badge warning">Chưa hoàn trả</span></td>
                                        </tr>
                                    ))}</tbody>
                                    <tfoot><tr style={{ background: 'var(--bg-hover)', fontWeight: 700 }}>
                                        <td colSpan={5}>Tổng giữ lại</td>
                                        <td style={{ color: 'var(--status-warning)', fontWeight: 800 }}>{fmt(retentions.reduce((s, p) => s + (p.retentionAmount || 0), 0))}</td>
                                        <td></td>
                                    </tr></tfoot>
                                </table>
                            </>
                        )}
                    </div>
                )}

                {/* === TAB: Báo cáo tháng === */}
                {activeTab === 'bao_cao' && (() => {
                    const months = cashflow?.months || [];
                    const totalInflow = months.reduce((s, m) => s + (m.inflow || 0), 0);
                    const totalOutflow = months.reduce((s, m) => s + (m.outflow || 0), 0);
                    const totalNet = months.reduce((s, m) => s + (m.net || 0), 0);
                    return (
                        <div className="card-body">
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table" style={{ margin: 0 }}>
                                    <thead>
                                        <tr>
                                            <th>Tháng</th>
                                            <th style={{ color: 'var(--status-success)' }}>Tổng thu</th>
                                            <th style={{ color: 'var(--status-danger)' }}>Tổng chi</th>
                                            <th style={{ fontWeight: 700 }}>Ròng tháng</th>
                                            <th>Số dư tích luỹ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {months.length === 0 ? (
                                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Chưa có dữ liệu dòng tiền theo tháng</td></tr>
                                        ) : months.map(m => (
                                            <tr key={m.key}>
                                                <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{m.label}</td>
                                                <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(m.inflow)}</td>
                                                <td style={{ color: 'var(--status-danger)' }}>{fmt(m.outflow)}</td>
                                                <td style={{ fontWeight: 700, color: m.net >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
                                                    {m.net >= 0 ? '+' : ''}{fmt(m.net)}
                                                </td>
                                                <td style={{ color: m.runningBalance >= 0 ? 'var(--text-primary)' : 'var(--status-danger)', fontSize: 13 }}>
                                                    {fmt(m.runningBalance)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {months.length > 0 && (
                                        <tfoot>
                                            <tr style={{ background: 'var(--bg-hover)', fontWeight: 700 }}>
                                                <td>Tổng cộng</td>
                                                <td style={{ color: 'var(--status-success)' }}>{fmt(totalInflow)}</td>
                                                <td style={{ color: 'var(--status-danger)' }}>{fmt(totalOutflow)}</td>
                                                <td style={{ color: totalNet >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
                                                    {totalNet >= 0 ? '+' : ''}{fmt(totalNet)}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Modal: Thêm giao dịch thủ công */}
            {showTxModal && (
                <div className="modal-overlay" onClick={() => setShowTxModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>Thêm giao dịch</h3><button className="modal-close" onClick={() => setShowTxModal(false)}>×</button></div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Loại</label>
                                    <select className="form-select" value={txForm.type} onChange={e => setTxForm({ ...txForm, type: e.target.value })}>
                                        <option>Thu</option><option>Chi</option>
                                    </select>
                                </div>
                                <div className="form-group"><label className="form-label">Số tiền</label>
                                    <input className="form-input" type="number" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group"><label className="form-label">Mô tả</label>
                                <input className="form-input" value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} />
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Danh mục</label>
                                    <input className="form-input" value={txForm.category} onChange={e => setTxForm({ ...txForm, category: e.target.value })} />
                                </div>
                                <div className="form-group"><label className="form-label">Ngày</label>
                                    <input className="form-input" type="date" value={txForm.date} onChange={e => setTxForm({ ...txForm, date: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowTxModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSubmitTx}>Lưu</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
