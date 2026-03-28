'use client';
import { fmtVND, fmtDate, daysOverdue } from '@/lib/financeUtils';

export default function OverviewTab({ summary, upcomingPayments, transactions }) {
    const overduePayments = (upcomingPayments || []).filter(p => daysOverdue(p.dueDate) > 7);
    const upcoming = (upcomingPayments || []).filter(p => daysOverdue(p.dueDate) <= 7);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Cảnh báo quá hạn */}
            {overduePayments.length > 0 && (
                <div style={{ background: 'var(--status-danger-bg, #fff0f0)', border: '1px solid var(--status-danger)', borderRadius: 8, padding: '12px 16px', color: 'var(--status-danger)' }}>
                    ⚠️ <strong>{overduePayments.length} đợt thu quá hạn hơn 7 ngày</strong> — tổng {fmtVND(overduePayments.reduce((s, p) => s + (p.amount - p.paidAmount), 0))}
                </div>
            )}

            {/* 4 stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                {[
                    { label: 'Tiền mặt ròng', val: summary.netCashflow, color: (summary.netCashflow || 0) >= 0 ? 'var(--status-success)' : 'var(--status-danger)' },
                    { label: 'Thu tháng này', val: summary.manualIncome, color: 'var(--status-success)' },
                    { label: 'Chi tháng này', val: summary.totalExpensePaid, color: 'var(--status-danger)' },
                    { label: 'Công nợ chưa thu', val: summary.receivableOutstanding, color: 'var(--status-warning)' },
                ].map(({ label, val, color }) => (
                    <div key={label} className="stat-card">
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color }}>{fmtVND(val)}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Cần thu tuần này */}
            <div className="card" style={{ border: '1px solid var(--border)', padding: 16 }}>
                <div className="card-header" style={{ marginBottom: 12 }}>
                    <span className="card-title">📅 Cần thu trong 7 ngày tới</span>
                    <span className="badge warning">{upcoming.length} đợt</span>
                </div>
                {upcoming.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Không có đợt thu sắp đến hạn</div>
                ) : (
                    <table className="data-table" style={{ margin: 0 }}>
                        <thead>
                            <tr><th>Dự án</th><th>Đợt</th><th>Số tiền</th><th>Đến hạn</th><th>Trạng thái</th></tr>
                        </thead>
                        <tbody>
                            {upcoming.map(p => (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 600 }}>{p.contract?.project?.name || '—'}</td>
                                    <td>{p.phase}</td>
                                    <td style={{ fontWeight: 700, color: 'var(--status-warning)' }}>{fmtVND(p.amount - (p.paidAmount || 0))}</td>
                                    <td style={{ color: daysOverdue(p.dueDate) > 0 ? 'var(--status-danger)' : 'var(--text-primary)' }}>{fmtDate(p.dueDate)}</td>
                                    <td><span className={`badge ${p.status === 'Đã thu' ? 'success' : daysOverdue(p.dueDate) > 0 ? 'danger' : 'warning'}`}>{p.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Giao dịch gần đây */}
            <div className="card" style={{ border: '1px solid var(--border)', padding: 16 }}>
                <div className="card-header" style={{ marginBottom: 12 }}>
                    <span className="card-title">💳 Giao dịch gần đây</span>
                </div>
                {transactions.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Chưa có giao dịch</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {transactions.slice(0, 10).map(t => (
                            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 500 }}>{t.description}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(t.date)} · {t.category || 'Chưa phân loại'}</div>
                                </div>
                                <div style={{ fontWeight: 700, color: t.type === 'Thu' ? 'var(--status-success)' : 'var(--status-danger)', flexShrink: 0, marginLeft: 16 }}>
                                    {t.type === 'Thu' ? '+' : '-'}{fmtVND(t.amount)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
