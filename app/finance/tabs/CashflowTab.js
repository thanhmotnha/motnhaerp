'use client';
import { useState } from 'react';
import { fmtVND, fmtDate } from '@/lib/financeUtils';

export default function CashflowTab({ cashflow, transactions, onAddTx }) {
    const [filterType, setFilterType] = useState('');

    if (!cashflow) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

    const months = cashflow.months || [];
    const totals = cashflow.totals || {};
    const runningBalance = months.length > 0 ? months[months.length - 1].runningBalance : 0;

    // SVG chart (12 tháng gần nhất)
    const chartMonths = months.slice(-12);
    const maxVal = Math.max(...chartMonths.map(m => Math.max(m.inflow || 0, m.outflow || 0)), 1);
    const W = 760, H = 160, pad = { l: 8, r: 8, t: 12, b: 28 };
    const bw = (W - pad.l - pad.r) / Math.max(chartMonths.length, 1);
    const barW = Math.max(8, bw * 0.35);
    const yScale = v => pad.t + (H - pad.t - pad.b) * (1 - v / maxVal);
    const fmtShort = v => v >= 1e9 ? `${(v / 1e9).toFixed(1)}tỷ` : v >= 1e6 ? `${(v / 1e6).toFixed(0)}tr` : v > 0 ? `${(v / 1e3).toFixed(0)}k` : '';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                {[
                    { label: 'Số dư hiện tại', val: runningBalance, color: runningBalance >= 0 ? 'var(--status-success)' : 'var(--status-danger)' },
                    { label: 'Tổng thu', val: totals.inflow, color: 'var(--status-success)' },
                    { label: 'Tổng chi', val: totals.outflow, color: 'var(--status-danger)' },
                    { label: 'Dòng tiền ròng', val: totals.net, color: (totals.net || 0) >= 0 ? 'var(--status-success)' : 'var(--status-danger)' },
                ].map(({ label, val, color }) => (
                    <div key={label} className="stat-card">
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color }}>{fmtVND(val)}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Biểu đồ SVG */}
            {chartMonths.length > 0 && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 4px 4px', overflowX: 'auto' }}>
                    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
                        {[0.25, 0.5, 0.75, 1].map(f => (
                            <line key={f} x1={pad.l} x2={W - pad.r} y1={yScale(maxVal * f)} y2={yScale(maxVal * f)} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4,4" />
                        ))}
                        {chartMonths.map((m, i) => {
                            const cx = pad.l + bw * i + bw / 2;
                            const iy = yScale(m.inflow || 0), oy = yScale(m.outflow || 0);
                            const baseY = H - pad.b;
                            return (
                                <g key={m.key}>
                                    <rect x={cx - barW - 1} y={iy} width={barW} height={Math.max(2, baseY - iy)} fill="var(--status-success)" opacity="0.85" rx="2" />
                                    <rect x={cx + 1} y={oy} width={barW} height={Math.max(2, baseY - oy)} fill="var(--status-danger)" opacity="0.75" rx="2" />
                                    <text x={cx} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--text-muted)">{m.label}</text>
                                    {(m.inflow || 0) > 0 && <text x={cx - barW / 2 - 1} y={iy - 3} textAnchor="middle" fontSize="7" fill="var(--status-success)">{fmtShort(m.inflow)}</text>}
                                </g>
                            );
                        })}
                    </svg>
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                        <span><span style={{ color: 'var(--status-success)', fontWeight: 700 }}>▋</span> Thu vào</span>
                        <span><span style={{ color: 'var(--status-danger)', fontWeight: 700 }}>▋</span> Chi ra</span>
                    </div>
                </div>
            )}

            {/* Bảng tháng */}
            <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ margin: 0 }}>
                    <thead><tr><th>Tháng</th><th style={{ textAlign: 'right' }}>Thu vào</th><th style={{ textAlign: 'right' }}>Chi ra</th><th style={{ textAlign: 'right' }}>Ròng</th><th style={{ textAlign: 'right' }}>Luỹ kế</th></tr></thead>
                    <tbody>
                        {months.length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Chưa có dữ liệu</td></tr>
                        ) : months.map(m => (
                            <tr key={m.key}>
                                <td style={{ fontWeight: 600 }}>{m.label}</td>
                                <td style={{ textAlign: 'right', color: 'var(--status-success)', fontWeight: 600 }}>{fmtVND(m.inflow)}</td>
                                <td style={{ textAlign: 'right', color: 'var(--status-danger)' }}>{fmtVND(m.outflow)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: (m.net || 0) >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>{fmtVND(m.net)}</td>
                                <td style={{ textAlign: 'right', color: (m.runningBalance || 0) >= 0 ? 'var(--primary)' : 'var(--status-danger)' }}>{fmtVND(m.runningBalance)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Thu chi khác */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600 }}>💳 Thu chi thủ công</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <select className="form-input" style={{ width: 120 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                            <option value="">Tất cả</option><option>Thu</option><option>Chi</option>
                        </select>
                        <button className="btn btn-primary btn-sm" onClick={onAddTx}>+ Thêm</button>
                    </div>
                </div>
                <table className="data-table" style={{ margin: 0 }}>
                    <thead><tr><th>Mã GD</th><th>Loại</th><th>Mô tả</th><th>Số tiền</th><th>Danh mục</th><th>Dự án</th><th>Ngày</th></tr></thead>
                    <tbody>
                        {transactions.filter(t => !filterType || t.type === filterType).length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Chưa có giao dịch</td></tr>
                        ) : transactions.filter(t => !filterType || t.type === filterType).map(t => (
                            <tr key={t.id}>
                                <td className="accent">{t.code}</td>
                                <td><span className={`badge ${t.type === 'Thu' ? 'success' : 'danger'}`}>{t.type}</span></td>
                                <td>{t.description}</td>
                                <td style={{ fontWeight: 600, color: t.type === 'Thu' ? 'var(--status-success)' : 'var(--status-danger)' }}>{t.type === 'Thu' ? '+' : '-'}{fmtVND(t.amount)}</td>
                                <td><span className="badge muted">{t.category || '—'}</span></td>
                                <td>{t.project?.name || '—'}</td>
                                <td>{fmtDate(t.date)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
