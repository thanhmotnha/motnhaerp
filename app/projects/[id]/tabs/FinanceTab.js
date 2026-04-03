'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/fetchClient';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
const fmtK = (n) => {
    const abs = Math.abs(n || 0);
    if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + ' tỷ';
    if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' tr';
    return fmt(n);
};

function KpiCard({ label, value, sub, color }) {
    return (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '16px 20px', flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: color || 'var(--text-primary)' }}>{fmtK(value)}</div>
            {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
        </div>
    );
}

function SideRow({ label, value, highlight, muted, indent }) {
    return (
        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '5px 0', paddingLeft: indent ? 12 : 0,
            borderBottom: highlight ? '1px solid var(--border)' : undefined,
            marginBottom: highlight ? 4 : 0,
        }}>
            <span style={{ fontSize: 13, color: muted ? 'var(--text-muted)' : 'var(--text-secondary)' }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: highlight ? 700 : 400, color: 'var(--text-primary)' }}>{fmt(value)}</span>
        </div>
    );
}

function PaidRow({ label, total, paid }) {
    const rate = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
    return (
        <div style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ fontWeight: 700 }}>{fmt(total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                <span>Đã chi: {fmt(paid)}</span>
                <span>Còn: {fmt(total - paid)}</span>
            </div>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${rate}%`, background: 'var(--status-info)', borderRadius: 2 }} />
            </div>
        </div>
    );
}

export default function FinanceTab({ projectId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        apiFetch(`/api/projects/${projectId}/pnl`)
            .then(d => { setData(d); setLoading(false); })
            .catch(() => { setError('Không tải được dữ liệu tài chính.'); setLoading(false); });
    }, [projectId]);

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;
    if (error) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--status-danger)' }}>{error}</div>;
    if (!data) return null;

    const { revenue, costs, summary } = data;
    const profitColor = summary.grossProfit >= 0 ? 'var(--status-success)' : 'var(--status-danger)';
    const profitPct = summary.totalRevenue > 0 ? Math.min(100, Math.max(0, (summary.totalCost / summary.totalRevenue) * 100)) : 0;

    const categoryEntries = Object.entries(costs.expenseByCategory || {}).sort((a, b) => b[1].amount - a[1].amount);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* KPI Cards */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <KpiCard label="Tổng doanh thu" value={summary.totalRevenue} sub={`Đã thu: ${fmtK(summary.revenueCollected)}`} />
                <KpiCard label="Tổng chi phí" value={summary.totalCost} sub={`Đã chi: ${fmtK(summary.totalCostPaid)}`} />
                <KpiCard
                    label="Lợi nhuận gộp"
                    value={summary.grossProfit}
                    sub={`Biên: ${summary.grossMargin}%`}
                    color={profitColor}
                />
                <KpiCard
                    label="Cash Profit"
                    value={summary.cashProfit}
                    sub="Thu - Chi thực tế"
                    color={summary.cashProfit >= 0 ? 'var(--status-success)' : 'var(--status-danger)'}
                />
            </div>

            {/* Profit Bar */}
            <div className="card" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                    <span>Chi phí / Doanh thu</span>
                    <span style={{ color: profitColor, fontWeight: 600 }}>
                        {summary.grossProfit >= 0 ? `+${fmtK(summary.grossProfit)} lãi` : `${fmtK(summary.grossProfit)} lỗ`}
                    </span>
                </div>
                <div style={{ height: 10, background: 'var(--border)', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{
                        height: '100%', width: `${profitPct}%`,
                        background: profitPct > 100 ? 'var(--status-danger)' : profitPct > 80 ? 'var(--status-warning)' : 'var(--status-info)',
                        borderRadius: 5, transition: 'width 0.4s'
                    }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    <span>0</span>
                    <span>{fmt(summary.totalRevenue)}</span>
                </div>
            </div>

            {/* Bên A / Bên B */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Bên A — Thu */}
                <div className="card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: 'var(--status-success)', borderBottom: '2px solid var(--status-success)', paddingBottom: 6 }}>
                        BÊN A — DOANH THU
                    </div>
                    <SideRow label="Giá trị hợp đồng" value={revenue.contractValue} />
                    <SideRow label="Phát sinh / điều chỉnh" value={revenue.variationAmount} />
                    <SideRow label="Tổng doanh thu" value={revenue.totalRevenue} highlight />
                    <SideRow label="Đã thu" value={revenue.revenueCollected} />
                    <SideRow label="Còn phải thu" value={revenue.revenueOutstanding} muted />

                    {revenue.contracts?.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chi tiết hợp đồng</div>
                            {revenue.contracts.map(c => (
                                <div key={c.id} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px dashed var(--border)' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>{c.code} {c.name ? `— ${c.name}` : ''}</span>
                                    <span>{fmt(c.contractValue + (c.variationAmount || 0))}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Bên B — Chi */}
                <div className="card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: 'var(--status-danger)', borderBottom: '2px solid var(--status-danger)', paddingBottom: 6 }}>
                        BÊN B — CHI PHÍ
                    </div>
                    <PaidRow label="Vật tư / Đơn hàng (PO)" total={costs.totalPOCost} paid={costs.totalPOPaid} />
                    <PaidRow label="Thầu phụ" total={costs.totalContractorCost} paid={costs.totalContractorPaid} />
                    <div style={{ paddingTop: 8 }}>
                        <SideRow label="Chi phí khác" value={costs.totalExpenses} />
                    </div>
                    <div style={{ marginTop: 8 }}>
                        <SideRow label="Tổng chi phí" value={costs.totalCost} highlight />
                        <SideRow label="Đã thanh toán" value={costs.totalCostPaid} />
                        <SideRow label="Còn phải trả" value={costs.totalCost - costs.totalCostPaid} muted />
                        {costs.totalRetention > 0 && (
                            <SideRow label="Giữ lại bảo hành" value={costs.totalRetention} muted indent />
                        )}
                    </div>
                </div>
            </div>

            {/* Chi phí theo hạng mục */}
            {categoryEntries.length > 0 && (
                <div className="card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Chi phí theo hạng mục</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: 11 }}>
                                <th style={{ textAlign: 'left', padding: '4px 8px 8px 0', fontWeight: 600 }}>Hạng mục</th>
                                <th style={{ textAlign: 'right', padding: '4px 0 8px', fontWeight: 600 }}>Số tiền</th>
                                <th style={{ textAlign: 'right', padding: '4px 0 8px 8px', fontWeight: 600 }}>Tỷ lệ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categoryEntries.map(([cat, val]) => {
                                const pct = costs.totalExpenses > 0 ? ((val.amount / costs.totalExpenses) * 100).toFixed(0) : 0;
                                return (
                                    <tr key={cat} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '7px 8px 7px 0', color: 'var(--text-secondary)' }}>{cat}</td>
                                        <td style={{ textAlign: 'right', padding: '7px 0', fontWeight: 500 }}>{fmt(val.amount)}</td>
                                        <td style={{ textAlign: 'right', padding: '7px 8px 7px 0', color: 'var(--text-muted)' }}>
                                            <span style={{ display: 'inline-block', minWidth: 50 }}>{pct}%</span>
                                            <div style={{ display: 'inline-block', width: 60, height: 4, background: 'var(--border)', borderRadius: 2, verticalAlign: 'middle', marginLeft: 6 }}>
                                                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--status-warning)', borderRadius: 2 }} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700 }}>
                                <td style={{ padding: '8px 0' }}>Tổng</td>
                                <td style={{ textAlign: 'right', padding: '8px 0' }}>{fmt(costs.totalExpenses)}</td>
                                <td />
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

        </div>
    );
}
