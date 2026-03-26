'use client';
import { useState, useEffect, useMemo } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const months = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];

const statusLabel = { paid: 'Đã thanh toán', overdue: 'Quá hạn', due_soon: 'Sắp đến hạn', pending: 'Chưa đến hạn' };
const statusColor = {
    paid:     { bg: 'var(--color-success-bg, #dcfce7)', text: 'var(--color-success, #16a34a)', dot: '#16a34a' },
    overdue:  { bg: 'var(--color-danger-bg, #fee2e2)',  text: 'var(--color-danger, #dc2626)',  dot: '#dc2626' },
    due_soon: { bg: 'var(--color-warning-bg, #fef9c3)', text: 'var(--color-warning, #ca8a04)', dot: '#ca8a04' },
    pending:  { bg: 'var(--color-muted-bg, #f3f4f6)',   text: 'var(--color-muted, #6b7280)',   dot: '#6b7280' },
};

export default function PaymentSchedulePage() {
    const [data, setData] = useState({ payments: [], monthSummary: [], summary: {} });
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(new Date().getFullYear());
    const [filter, setFilter] = useState('all'); // all | incoming | outgoing
    const [statusFilter, setStatusFilter] = useState('all'); // all | paid | overdue | due_soon | pending
    const [expandedMonth, setExpandedMonth] = useState(new Date().getMonth());

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/payment-schedule?year=${year}&type=${filter}`);
            const json = await res.json();
            setData(json);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [year, filter]);

    const { summary, monthSummary } = data;

    // Group payments by month
    const paymentsByMonth = useMemo(() => {
        const grouped = {};
        for (let m = 0; m < 12; m++) grouped[m] = [];
        (data.payments || []).forEach(p => {
            if (p.month !== null && p.month !== undefined) {
                if (statusFilter === 'all' || p.status === statusFilter) {
                    grouped[p.month].push(p);
                }
            }
        });
        return grouped;
    }, [data.payments, statusFilter]);

    // Chart max for scaling bars
    const chartMax = useMemo(() => {
        return Math.max(1, ...(monthSummary || []).map(m => Math.max(m.incomingTotal, m.outgoingTotal)));
    }, [monthSummary]);

    const currentMonth = new Date().getMonth();

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 16px' }}>
            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>📅 Lịch Thu Chi</h1>
                    <p style={{ color: 'var(--color-text-secondary, #6b7280)', margin: '4px 0 0', fontSize: 14 }}>
                        Theo dõi tiến độ thu chi theo tháng — Năm {year}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <select value={year} onChange={e => setYear(+e.target.value)}
                        style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-border, #e5e7eb)', background: 'var(--color-bg, #fff)', fontSize: 14 }}>
                        {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select value={filter} onChange={e => setFilter(e.target.value)}
                        style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-border, #e5e7eb)', background: 'var(--color-bg, #fff)', fontSize: 14 }}>
                        <option value="all">Tất cả</option>
                        <option value="incoming">Thu vào</option>
                        <option value="outgoing">Chi ra</option>
                    </select>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                        style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-border, #e5e7eb)', background: 'var(--color-bg, #fff)', fontSize: 14 }}>
                        <option value="all">Mọi trạng thái</option>
                        <option value="overdue">Quá hạn</option>
                        <option value="due_soon">Sắp đến hạn</option>
                        <option value="pending">Chưa đến hạn</option>
                        <option value="paid">Đã thanh toán</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-secondary, #6b7280)' }}>Đang tải dữ liệu...</div>
            ) : (
            <>
                {/* ── Summary Cards ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                    <SummaryCard icon="📥" label="Tổng thu" value={fmt(summary.totalIncoming)} color="#16a34a" />
                    <SummaryCard icon="📤" label="Tổng chi" value={fmt(summary.totalOutgoing)} color="#dc2626" />
                    <SummaryCard icon="⚠️" label="Quá hạn" value={`${summary.overdue || 0} khoản — ${fmt(summary.overdueAmount)}`} color="#dc2626" />
                    <SummaryCard icon="⏰" label="Sắp đến hạn" value={`${summary.dueSoon || 0} khoản — ${fmt(summary.dueSoonAmount)}`} color="#ca8a04" />
                    <SummaryCard icon="📊" label={`Tháng ${currentMonth + 1}`} value={`Thu: ${fmt(summary.thisMonthPaid)} / ${fmt(summary.thisMonthExpected)}`} color="#2563eb" />
                </div>

                {/* ── Monthly Bar Chart ── */}
                <div style={{ background: 'var(--color-card, #fff)', borderRadius: 12, border: '1px solid var(--color-border, #e5e7eb)', padding: 20, marginBottom: 24 }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Biểu đồ Thu Chi theo tháng</h3>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 180, padding: '0 4px' }}>
                        {(monthSummary || []).map((m, i) => (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 140, width: '100%' }}>
                                    <div title={`Thu: ${fmt(m.incomingTotal)}`}
                                        style={{ flex: 1, background: 'linear-gradient(to top, #22c55e, #86efac)', borderRadius: '4px 4px 0 0',
                                            height: `${(m.incomingTotal / chartMax) * 140}px`, minHeight: m.incomingTotal > 0 ? 4 : 0,
                                            transition: 'height 0.3s ease', cursor: 'pointer' }}
                                        onClick={() => setExpandedMonth(i)}
                                    />
                                    <div title={`Chi: ${fmt(m.outgoingTotal)}`}
                                        style={{ flex: 1, background: 'linear-gradient(to top, #ef4444, #fca5a5)', borderRadius: '4px 4px 0 0',
                                            height: `${(m.outgoingTotal / chartMax) * 140}px`, minHeight: m.outgoingTotal > 0 ? 4 : 0,
                                            transition: 'height 0.3s ease', cursor: 'pointer' }}
                                        onClick={() => setExpandedMonth(i)}
                                    />
                                </div>
                                <span style={{ fontSize: 11, color: i === currentMonth ? '#2563eb' : 'var(--color-text-secondary, #6b7280)',
                                    fontWeight: i === currentMonth ? 700 : 400 }}>{months[i]}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center', fontSize: 12 }}>
                        <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#22c55e', marginRight: 4, verticalAlign: 'middle' }} />Thu vào</span>
                        <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, background: '#ef4444', marginRight: 4, verticalAlign: 'middle' }} />Chi ra</span>
                    </div>
                </div>

                {/* ── Monthly Timeline ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {months.map((mLabel, mIdx) => {
                        const items = paymentsByMonth[mIdx] || [];
                        const ms = (monthSummary || [])[mIdx] || {};
                        const isExpanded = expandedMonth === mIdx;
                        const isCurrent = mIdx === currentMonth;
                        return (
                            <div key={mIdx} style={{ background: 'var(--color-card, #fff)', borderRadius: 12,
                                border: `1px solid ${isCurrent ? '#3b82f6' : 'var(--color-border, #e5e7eb)'}`,
                                overflow: 'hidden', transition: 'all 0.2s ease' }}>
                                {/* Month Header */}
                                <div onClick={() => setExpandedMonth(isExpanded ? -1 : mIdx)}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px',
                                        cursor: 'pointer', background: isCurrent ? 'rgba(59,130,246,0.05)' : 'transparent',
                                        borderBottom: isExpanded ? '1px solid var(--color-border, #e5e7eb)' : 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span style={{ fontSize: 16, fontWeight: 600 }}>
                                            {isCurrent && '📌 '}Tháng {mIdx + 1}
                                        </span>
                                        {items.length > 0 && (
                                            <span style={{ fontSize: 12, background: 'var(--color-muted-bg, #f3f4f6)', padding: '2px 8px', borderRadius: 12 }}>
                                                {items.length} khoản
                                            </span>
                                        )}
                                        {items.filter(p => p.status === 'overdue').length > 0 && (
                                            <span style={{ fontSize: 12, background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 12 }}>
                                                {items.filter(p => p.status === 'overdue').length} quá hạn
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', fontSize: 13 }}>
                                        <span style={{ color: '#16a34a' }}>↓ {fmt(ms.incomingTotal || 0)}</span>
                                        <span style={{ color: '#dc2626' }}>↑ {fmt(ms.outgoingTotal || 0)}</span>
                                        <span style={{ color: (ms.incomingTotal || 0) - (ms.outgoingTotal || 0) >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                                            = {fmt((ms.incomingTotal || 0) - (ms.outgoingTotal || 0))}
                                        </span>
                                        <span style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</span>
                                    </div>
                                </div>

                                {/* Payment Items */}
                                {isExpanded && items.length > 0 && (
                                    <div style={{ padding: '8px 16px 16px' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                            <thead>
                                                <tr style={{ fontSize: 11, color: 'var(--color-text-secondary, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    <th style={thStyle}>Loại</th>
                                                    <th style={thStyle}>Đợt / Mô tả</th>
                                                    <th style={thStyle}>Dự án / HĐ</th>
                                                    <th style={thStyle}>Đối tác</th>
                                                    <th style={{ ...thStyle, textAlign: 'right' }}>Tổng tiền</th>
                                                    <th style={{ ...thStyle, textAlign: 'right' }}>Đã thu/chi</th>
                                                    <th style={{ ...thStyle, textAlign: 'right' }}>Còn lại</th>
                                                    <th style={thStyle}>Hạn</th>
                                                    <th style={thStyle}>Trạng thái</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map(p => {
                                                    const sc = statusColor[p.status] || statusColor.pending;
                                                    return (
                                                        <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border, #f3f4f6)' }}>
                                                            <td style={tdStyle}>
                                                                <span style={{ background: p.direction === 'incoming' ? '#dcfce7' : '#fee2e2',
                                                                    color: p.direction === 'incoming' ? '#16a34a' : '#dc2626',
                                                                    padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500 }}>
                                                                    {p.direction === 'incoming' ? '📥 Thu' : '📤 Chi'}
                                                                </span>
                                                            </td>
                                                            <td style={tdStyle}>{p.phase}</td>
                                                            <td style={tdStyle}>
                                                                <div style={{ fontWeight: 500 }}>{p.projectCode || ''}</div>
                                                                <div style={{ fontSize: 11, color: 'var(--color-text-secondary, #6b7280)' }}>{p.contractCode || p.projectName || ''}</div>
                                                            </td>
                                                            <td style={tdStyle}>{p.customerName || p.contractorName || '—'}</td>
                                                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500 }}>{fmt(p.amount)}</td>
                                                            <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(p.paidAmount)}</td>
                                                            <td style={{ ...tdStyle, textAlign: 'right', color: p.remaining > 0 ? '#dc2626' : '#16a34a', fontWeight: 500 }}>{fmt(p.remaining)}</td>
                                                            <td style={tdStyle}>{fmtDate(p.dueDate)}</td>
                                                            <td style={tdStyle}>
                                                                <span style={{ background: sc.bg, color: sc.text, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>
                                                                    {statusLabel[p.status] || p.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {isExpanded && items.length === 0 && (
                                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-secondary, #6b7280)', fontSize: 13 }}>
                                        Không có khoản thu/chi nào trong tháng này
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </>
            )}
        </div>
    );
}

// ── Sub-components ──
function SummaryCard({ icon, label, value, color }) {
    return (
        <div style={{ background: 'var(--color-card, #fff)', borderRadius: 12, border: '1px solid var(--color-border, #e5e7eb)',
            padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary, #6b7280)' }}>{icon} {label}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color }}>{value}</div>
        </div>
    );
}

const thStyle = { padding: '8px 8px 6px', textAlign: 'left', borderBottom: '2px solid var(--color-border, #e5e7eb)', fontWeight: 500 };
const tdStyle = { padding: '8px', verticalAlign: 'middle' };
