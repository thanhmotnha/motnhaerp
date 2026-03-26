'use client';
import { useState, useEffect, useMemo } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

export default function CashflowForecastPage() {
    const [forecast, setForecast] = useState(null);
    const [history, setHistory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('forecast'); // forecast | history
    const [days, setDays] = useState(90);
    const [expandedWeek, setExpandedWeek] = useState(-1);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [fRes, hRes] = await Promise.all([
                    fetch(`/api/reports/cashflow-forecast?days=${days}`),
                    fetch('/api/finance/cashflow?months=12'),
                ]);
                setForecast(await fRes.json());
                setHistory(await hRes.json());
            } catch (e) { console.error(e); }
            setLoading(false);
        })();
    }, [days]);

    const weeks = forecast?.weeks || [];
    const months = history?.months || [];

    // Chart calculations
    const fChartMax = useMemo(() => Math.max(1, ...weeks.map(w => Math.max(w.inflow, w.outflow, Math.abs(w.balance)))), [weeks]);
    const hChartMax = useMemo(() => Math.max(1, ...months.map(m => Math.max(m.inflow, m.outflow))), [months]);

    // Stats
    const alertWeeks = weeks.filter(w => w.alert).length;
    const peakDeficit = Math.min(0, ...weeks.map(w => w.balance));

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 16px' }}>
            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>💰 Dự Báo Dòng Tiền</h1>
                    <p style={{ color: 'var(--color-text-secondary, #6b7280)', margin: '4px 0 0', fontSize: 14 }}>
                        Theo dõi cash flow forecast và lịch sử dòng tiền
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', background: 'var(--color-muted-bg, #f3f4f6)', borderRadius: 8, padding: 2 }}>
                        {['forecast', 'history'].map(v => (
                            <button key={v} onClick={() => setView(v)}
                                style={{ padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                                    background: view === v ? '#fff' : 'transparent', color: view === v ? '#2563eb' : '#6b7280',
                                    boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>
                                {v === 'forecast' ? '📈 Dự báo' : '📊 Lịch sử'}
                            </button>
                        ))}
                    </div>
                    {view === 'forecast' && (
                        <select value={days} onChange={e => setDays(+e.target.value)}
                            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-border, #e5e7eb)', background: 'var(--color-bg, #fff)', fontSize: 14 }}>
                            <option value={30}>30 ngày</option>
                            <option value={60}>60 ngày</option>
                            <option value={90}>90 ngày</option>
                            <option value={180}>6 tháng</option>
                        </select>
                    )}
                </div>
            </div>

            {loading ? (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-secondary, #6b7280)' }}>Đang tải dữ liệu...</div>
            ) : (
            <>
                {/* ── Summary Cards ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                    {view === 'forecast' ? (<>
                        <SCard icon="📥" label="Dự kiến thu" value={fmt(forecast?.totalInflow)} color="#16a34a" />
                        <SCard icon="📤" label="Dự kiến chi" value={fmt(forecast?.totalOutflow)} color="#dc2626" />
                        <SCard icon="📊" label="Dòng tiền ròng" value={fmt(forecast?.netCashflow)} color={forecast?.netCashflow >= 0 ? '#16a34a' : '#dc2626'} />
                        <SCard icon="💼" label="Lương hàng tháng" value={fmt(forecast?.monthlyPayroll)} color="#7c3aed" />
                        <SCard icon="⚠️" label="Tuần cảnh báo" value={`${alertWeeks} tuần âm`}
                            color={alertWeeks > 0 ? '#dc2626' : '#16a34a'} sub={peakDeficit < 0 ? `Thấp nhất: -${fmt(Math.abs(peakDeficit))}` : 'Không có thâm hụt'} />
                    </>) : (<>
                        <SCard icon="📥" label="Tổng thu (12 tháng)" value={fmt(history?.totals?.inflow)} color="#16a34a" />
                        <SCard icon="📤" label="Tổng chi (12 tháng)" value={fmt(history?.totals?.outflow)} color="#dc2626" />
                        <SCard icon="📊" label="Lãi / Lỗ ròng" value={fmt(history?.totals?.net)} color={history?.totals?.net >= 0 ? '#16a34a' : '#dc2626'} />
                    </>)}
                </div>

                {/* ── FORECAST VIEW ── */}
                {view === 'forecast' && (
                <>
                    {/* Area-style chart */}
                    <div style={{ background: 'var(--color-card, #fff)', borderRadius: 12, border: '1px solid var(--color-border, #e5e7eb)', padding: 20, marginBottom: 24 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Biểu đồ dòng tiền theo tuần ({days} ngày)</h3>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 200, padding: '0 4px' }}>
                            {weeks.map((w, i) => (
                                <div key={i} onClick={() => setExpandedWeek(expandedWeek === i ? -1 : i)}
                                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 150, width: '100%' }}>
                                        <div title={`Thu: ${fmt(w.inflow)}`}
                                            style={{ flex: 1, background: 'linear-gradient(to top, #22c55e, #86efac)', borderRadius: '3px 3px 0 0',
                                                height: `${(w.inflow / fChartMax) * 150}px`, minHeight: w.inflow > 0 ? 3 : 0, transition: 'height 0.3s ease' }} />
                                        <div title={`Chi: ${fmt(w.outflow)}`}
                                            style={{ flex: 1, background: 'linear-gradient(to top, #ef4444, #fca5a5)', borderRadius: '3px 3px 0 0',
                                                height: `${(w.outflow / fChartMax) * 150}px`, minHeight: w.outflow > 0 ? 3 : 0, transition: 'height 0.3s ease' }} />
                                    </div>
                                    {/* Balance indicator */}
                                    <div style={{ width: '100%', height: 4, borderRadius: 2, marginTop: 2,
                                        background: w.balance >= 0 ? `rgba(34,197,94,${Math.min(1, w.balance / fChartMax)})` : `rgba(239,68,68,${Math.min(1, Math.abs(w.balance) / fChartMax)})` }} />
                                    <span style={{ fontSize: 10, color: w.alert ? '#dc2626' : 'var(--color-text-secondary, #6b7280)',
                                        fontWeight: w.alert ? 700 : 400 }}>{w.label}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center', fontSize: 12 }}>
                            <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#22c55e', marginRight: 4, verticalAlign: 'middle' }} />Thu vào</span>
                            <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#ef4444', marginRight: 4, verticalAlign: 'middle' }} />Chi ra</span>
                            <span><span style={{ display: 'inline-block', width: 12, height: 4, borderRadius: 2, background: '#22c55e', marginRight: 4, verticalAlign: 'middle' }} />Số dư dương</span>
                            <span><span style={{ display: 'inline-block', width: 12, height: 4, borderRadius: 2, background: '#ef4444', marginRight: 4, verticalAlign: 'middle' }} />Số dư âm</span>
                        </div>
                    </div>

                    {/* Weekly detail table */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {weeks.map((w, i) => (
                            <div key={i} style={{ background: 'var(--color-card, #fff)', borderRadius: 12,
                                border: `1px solid ${w.alert ? '#fca5a5' : 'var(--color-border, #e5e7eb)'}`, overflow: 'hidden' }}>
                                <div onClick={() => setExpandedWeek(expandedWeek === i ? -1 : i)}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px',
                                        cursor: 'pointer', background: w.alert ? 'rgba(239,68,68,0.04)' : 'transparent',
                                        borderBottom: expandedWeek === i ? '1px solid var(--color-border, #e5e7eb)' : 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{ fontWeight: 600, fontSize: 14 }}>
                                            {w.alert && '🔴 '}{w.label}
                                        </span>
                                        <span style={{ fontSize: 12, color: 'var(--color-text-secondary, #6b7280)' }}>
                                            {fmtDate(w.start)} → {fmtDate(w.end)}
                                        </span>
                                        {w.items?.length > 0 && (
                                            <span style={{ fontSize: 11, background: 'var(--color-muted-bg, #f3f4f6)', padding: '2px 8px', borderRadius: 12 }}>
                                                {w.items.length} khoản
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 13 }}>
                                        <span style={{ color: '#16a34a' }}>↓ {fmt(w.inflow)}</span>
                                        <span style={{ color: '#dc2626' }}>↑ {fmt(w.outflow)}</span>
                                        <span style={{ color: w.net >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                                            Net: {w.net >= 0 ? '+' : ''}{fmt(w.net)}
                                        </span>
                                        <span style={{ color: w.balance >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700, fontSize: 14 }}>
                                            Σ {fmt(w.balance)}
                                        </span>
                                        <span style={{ transform: expandedWeek === i ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</span>
                                    </div>
                                </div>

                                {expandedWeek === i && w.items?.length > 0 && (
                                    <div style={{ padding: '8px 16px 12px' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                            <thead>
                                                <tr style={{ fontSize: 11, color: 'var(--color-text-secondary, #6b7280)', textTransform: 'uppercase' }}>
                                                    <th style={thStyle}>Loại</th>
                                                    <th style={thStyle}>Mô tả</th>
                                                    <th style={{ ...thStyle, textAlign: 'right' }}>Số tiền</th>
                                                    <th style={thStyle}>Ngày</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {w.items.map((item, j) => (
                                                    <tr key={j} style={{ borderBottom: '1px solid var(--color-border, #f3f4f6)' }}>
                                                        <td style={tdStyle}>
                                                            <span style={{ background: item.type === 'in' ? '#dcfce7' : '#fee2e2',
                                                                color: item.type === 'in' ? '#16a34a' : '#dc2626',
                                                                padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500 }}>
                                                                {item.type === 'in' ? '📥 Thu' : '📤 Chi'}
                                                            </span>
                                                        </td>
                                                        <td style={tdStyle}>{item.label}</td>
                                                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500,
                                                            color: item.type === 'in' ? '#16a34a' : '#dc2626' }}>{fmt(item.amount)}</td>
                                                        <td style={tdStyle}>{fmtDate(item.date)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {expandedWeek === i && (!w.items || w.items.length === 0) && (
                                    <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-secondary, #6b7280)', fontSize: 13 }}>
                                        Không có khoản thu/chi nào trong tuần này
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
                )}

                {/* ── HISTORY VIEW ── */}
                {view === 'history' && (
                <>
                    {/* Bar chart for monthly history */}
                    <div style={{ background: 'var(--color-card, #fff)', borderRadius: 12, border: '1px solid var(--color-border, #e5e7eb)', padding: 20, marginBottom: 24 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Dòng tiền thực tế — 12 tháng qua</h3>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 200, padding: '0 4px' }}>
                            {months.map((m, i) => (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 160, width: '100%' }}>
                                        <div title={`Thu: ${fmt(m.inflow)}`}
                                            style={{ flex: 1, background: 'linear-gradient(to top, #22c55e, #86efac)', borderRadius: '4px 4px 0 0',
                                                height: `${(m.inflow / hChartMax) * 160}px`, minHeight: m.inflow > 0 ? 4 : 0, transition: 'height 0.3s' }} />
                                        <div title={`Chi: ${fmt(m.outflow)}`}
                                            style={{ flex: 1, background: 'linear-gradient(to top, #ef4444, #fca5a5)', borderRadius: '4px 4px 0 0',
                                                height: `${(m.outflow / hChartMax) * 160}px`, minHeight: m.outflow > 0 ? 4 : 0, transition: 'height 0.3s' }} />
                                    </div>
                                    <span style={{ fontSize: 10, color: 'var(--color-text-secondary, #6b7280)' }}>{m.label}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center', fontSize: 12 }}>
                            <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#22c55e', marginRight: 4, verticalAlign: 'middle' }} />Thu vào</span>
                            <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#ef4444', marginRight: 4, verticalAlign: 'middle' }} />Chi ra</span>
                        </div>
                    </div>

                    {/* Monthly detail table */}
                    <div style={{ background: 'var(--color-card, #fff)', borderRadius: 12, border: '1px solid var(--color-border, #e5e7eb)', padding: 20 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Chi tiết theo tháng</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ fontSize: 11, color: 'var(--color-text-secondary, #6b7280)', textTransform: 'uppercase' }}>
                                    <th style={thStyle}>Tháng</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Thu vào</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Chi ra</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Lãi/Lỗ</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Số dư luỹ kế</th>
                                </tr>
                            </thead>
                            <tbody>
                                {months.map((m, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border, #f3f4f6)' }}>
                                        <td style={{ ...tdStyle, fontWeight: 500 }}>{m.label}</td>
                                        <td style={{ ...tdStyle, textAlign: 'right', color: '#16a34a' }}>{fmt(m.inflow)}</td>
                                        <td style={{ ...tdStyle, textAlign: 'right', color: '#dc2626' }}>{fmt(m.outflow)}</td>
                                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600,
                                            color: m.net >= 0 ? '#16a34a' : '#dc2626' }}>{m.net >= 0 ? '+' : ''}{fmt(m.net)}</td>
                                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700,
                                            color: m.runningBalance >= 0 ? '#2563eb' : '#dc2626' }}>{fmt(m.runningBalance)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ fontWeight: 700, borderTop: '2px solid var(--color-border, #e5e7eb)' }}>
                                    <td style={tdStyle}>Tổng</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', color: '#16a34a' }}>{fmt(history?.totals?.inflow)}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', color: '#dc2626' }}>{fmt(history?.totals?.outflow)}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right',
                                        color: history?.totals?.net >= 0 ? '#16a34a' : '#dc2626' }}>
                                        {history?.totals?.net >= 0 ? '+' : ''}{fmt(history?.totals?.net)}
                                    </td>
                                    <td style={tdStyle}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </>
                )}
            </>
            )}
        </div>
    );
}

function SCard({ icon, label, value, color, sub }) {
    return (
        <div style={{ background: 'var(--color-card, #fff)', borderRadius: 12, border: '1px solid var(--color-border, #e5e7eb)',
            padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary, #6b7280)' }}>{icon} {label}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: 'var(--color-text-secondary, #6b7280)' }}>{sub}</div>}
        </div>
    );
}

const thStyle = { padding: '8px 8px 6px', textAlign: 'left', borderBottom: '2px solid var(--color-border, #e5e7eb)', fontWeight: 500 };
const tdStyle = { padding: '8px', verticalAlign: 'middle' };
