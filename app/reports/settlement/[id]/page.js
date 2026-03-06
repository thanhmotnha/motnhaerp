'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtShort = (n) => {
    if (!n) return '0';
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}tỷ`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(0)}tr`;
    return new Intl.NumberFormat('vi-VN').format(n);
};
const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;

export default function SettlementPage() {
    const { id } = useParams();
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/reports/project-settlement/${id}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [id]);

    if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải quyết toán...</div>;
    if (!data) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Không tìm thấy dự án</div>;

    const p = data.project;
    const r = data.revenue;
    const c = data.costs;
    const pr = data.profitability;
    const isProfit = pr.grossProfit >= 0;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>📊 Quyết toán: {p.code} - {p.name}</h1>
                    <p>{p.customer} · Tiến độ: {p.progress}% · Trạng thái: {p.status}</p>
                </div>
                <div className="page-header-right">
                    <button className="btn btn-ghost" onClick={() => router.push(`/projects/${p.id}`)}>← Về dự án</button>
                    <button className="btn btn-ghost" onClick={() => window.print()}>🖨️ In</button>
                </div>
            </div>

            {/* Summary KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                <div className="card" style={{ padding: '16px 20px', borderTop: '3px solid var(--status-success)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>TỔNG DOANH THU</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--status-success)' }}>{fmtShort(r.received)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ {fmtShort(r.totalValue)} HĐ</div>
                </div>
                <div className="card" style={{ padding: '16px 20px', borderTop: '3px solid var(--status-danger)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>TỔNG CHI PHÍ</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--status-danger)' }}>{fmtShort(c.totalCost)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ngân sách: {fmtShort(pr.budget)}</div>
                </div>
                <div className="card" style={{ padding: '16px 20px', borderTop: `3px solid ${isProfit ? 'var(--status-success)' : 'var(--status-danger)'}` }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>LỢI NHUẬN</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: isProfit ? 'var(--status-success)' : 'var(--status-danger)' }}>{fmtShort(pr.grossProfit)}</div>
                    <div style={{ fontSize: 11, color: isProfit ? 'var(--status-success)' : 'var(--status-danger)', fontWeight: 600 }}>Margin: {pr.grossMargin}%</div>
                </div>
                <div className="card" style={{ padding: '16px 20px', borderTop: `3px solid ${pr.budgetVariance >= 0 ? 'var(--status-success)' : 'var(--status-danger)'}` }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>CHÊNH LỆCH NS</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: pr.budgetVariance >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>{fmtShort(Math.abs(pr.budgetVariance || 0))}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pr.budgetVariance >= 0 ? 'Dưới ngân sách' : 'Vượt ngân sách'} · {pr.budgetUtilization}%</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {/* Revenue breakdown */}
                <div className="card">
                    <div className="card-header" style={{ borderLeft: '4px solid var(--status-success)', paddingLeft: 12 }}><h3>💰 Doanh thu</h3></div>
                    <div style={{ padding: '16px 20px' }}>
                        {[
                            { label: 'Giá trị hợp đồng', val: r.contractValue },
                            { label: 'Phụ lục / bổ sung', val: r.addenda },
                            { label: 'Phát sinh (VO)', val: r.variations },
                        ].map(item => (
                            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                                <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                                <span style={{ fontWeight: 600 }}>{fmt(item.val)}</span>
                            </div>
                        ))}
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 10, marginTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                            <span>Tổng giá trị</span>
                            <span style={{ color: 'var(--accent-primary)' }}>{fmt(r.totalValue)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                            <span style={{ fontSize: 13 }}>Đã thu</span>
                            <span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmt(r.received)}</span>
                        </div>
                        <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, marginTop: 8 }}>
                            <div style={{ height: '100%', width: `${pct(r.received, r.totalValue)}%`, background: 'var(--status-success)', borderRadius: 4, transition: 'width 0.5s' }} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Thu {pct(r.received, r.totalValue)}% · Còn {fmt(r.outstanding)}</div>
                    </div>
                </div>

                {/* Cost breakdown */}
                <div className="card">
                    <div className="card-header" style={{ borderLeft: '4px solid var(--status-danger)', paddingLeft: 12 }}><h3>💸 Chi phí</h3></div>
                    <div style={{ padding: '16px 20px' }}>
                        {[
                            { label: 'Chi phí phát sinh', val: c.expenses, color: 'var(--status-danger)' },
                            { label: 'Mua sắm (PO)', val: c.purchaseOrders, color: 'var(--status-warning)' },
                            { label: 'Thầu phụ', val: c.contractorPayments, color: 'var(--accent-primary)' },
                        ].map(item => (
                            <div key={item.label} style={{ marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                                    <span style={{ fontWeight: 600 }}>{fmt(item.val)}</span>
                                </div>
                                <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3 }}>
                                    <div style={{ height: '100%', width: `${pct(item.val, c.totalCost)}%`, background: item.color, borderRadius: 3 }} />
                                </div>
                            </div>
                        ))}
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 10, marginTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                            <span>Tổng chi</span>
                            <span style={{ color: 'var(--status-danger)' }}>{fmt(c.totalCost)}</span>
                        </div>
                        {c.retention > 0 && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Bảo lãnh giữ lại: {fmt(c.retention)}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Cost by category */}
            {Object.keys(c.byCategory || {}).length > 0 && (
                <div className="card" style={{ marginBottom: 20 }}>
                    <div className="card-header"><h3>📊 Chi phí theo danh mục</h3></div>
                    <div style={{ padding: '16px 20px' }}>
                        {Object.entries(c.byCategory).sort(([, a], [, b]) => b - a).map(([cat, val]) => (
                            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                                <div style={{ width: 120, fontSize: 13, fontWeight: 500 }}>{cat}</div>
                                <div style={{ flex: 1, height: 8, background: 'var(--bg-secondary)', borderRadius: 4 }}>
                                    <div style={{ height: '100%', width: `${pct(val, c.totalCost)}%`, background: 'var(--accent-primary)', borderRadius: 4, opacity: 0.7 }} />
                                </div>
                                <div style={{ width: 100, textAlign: 'right', fontSize: 13, fontWeight: 600 }}>{fmt(val)}</div>
                                <div style={{ width: 40, textAlign: 'right', fontSize: 11, color: 'var(--text-muted)' }}>{pct(val, c.totalCost)}%</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Contracts + Milestones */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div className="card">
                    <div className="card-header"><h3>📄 Hợp đồng ({data.details.contracts?.length || 0})</h3></div>
                    <div className="table-container">
                        <table className="data-table" style={{ fontSize: 12 }}>
                            <thead><tr><th>Mã HĐ</th><th>Tên</th><th style={{ textAlign: 'right' }}>Giá trị</th><th style={{ textAlign: 'right' }}>Đã thu</th></tr></thead>
                            <tbody>
                                {(data.details.contracts || []).map(c => (
                                    <tr key={c.id}>
                                        <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{c.code}</td>
                                        <td>{c.name}</td>
                                        <td style={{ textAlign: 'right' }}>{fmt(c.value)}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>{fmt(c.paid)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header"><h3>🎯 Milestone ({data.milestones?.length || 0})</h3></div>
                    <div style={{ padding: 16 }}>
                        {(data.milestones || []).map((m, i) => (
                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < data.milestones.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.status === 'Hoàn thành' ? 'var(--status-success)' : 'var(--border-color)', flexShrink: 0 }} />
                                <div style={{ flex: 1, fontSize: 13 }}>{m.name}</div>
                                <span style={{ fontSize: 11, color: m.status === 'Hoàn thành' ? 'var(--status-success)' : 'var(--text-muted)', fontWeight: 600 }}>{m.status || 'Chưa bắt đầu'}</span>
                            </div>
                        ))}
                        {(!data.milestones || data.milestones.length === 0) && (
                            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Chưa có milestone</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
