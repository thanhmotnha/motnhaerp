'use client';
import { fmtVND, fmtDate } from '@/lib/financeUtils';

export default function DebtTab({ summary, retentions, supplierDebt }) {
    const totalSupplierDebt = (supplierDebt || []).reduce((s, po) => s + (po.totalAmount - (po.paidAmount || 0)), 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <div className="stat-card"><div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Phải thu KH</div><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--status-danger)' }}>{fmtVND(summary.receivableOutstanding)}</div></div></div>
                <div className="stat-card"><div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Phải trả NT</div><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--status-warning)' }}>{fmtVND(summary.payableOutstanding)}</div></div></div>
                <div className="stat-card"><div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Nợ nhà CC</div><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--status-warning)' }}>{fmtVND(totalSupplierDebt)}</div></div></div>
                <div className="stat-card"><div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Giữ lại BH</div><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{fmtVND((retentions || []).reduce((s, r) => s + (r.retentionAmount || 0), 0))}</div></div></div>
            </div>

            {/* Section A: Khách hàng chưa trả */}
            <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📈 A. Khách hàng chưa thanh toán</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div className="card" style={{ border: '1px solid var(--border)', padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Tổng phải thu</span><span style={{ fontWeight: 700 }}>{fmtVND(summary.totalReceivable)}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>Đã thu</span><span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmtVND(summary.totalReceived)}</span></div>
                        <div className="progress-bar" style={{ height: 6 }}><div className="progress-fill" style={{ width: `${summary.totalReceivable > 0 ? Math.round((summary.totalReceived || 0) / summary.totalReceivable * 100) : 0}%` }}></div></div>
                        <div style={{ marginTop: 8, fontWeight: 700, color: 'var(--status-danger)', display: 'flex', justifyContent: 'space-between' }}><span>Còn phải thu</span><span>{fmtVND(summary.receivableOutstanding)}</span></div>
                    </div>
                    <div className="card" style={{ border: '1px solid var(--border)', padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Tổng phải trả NT</span><span style={{ fontWeight: 700 }}>{fmtVND(summary.totalPayable)}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>Đã trả</span><span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmtVND(summary.totalPaid)}</span></div>
                        <div className="progress-bar" style={{ height: 6 }}><div className="progress-fill" style={{ width: `${summary.totalPayable > 0 ? Math.round((summary.totalPaid || 0) / summary.totalPayable * 100) : 0}%`, background: 'var(--status-warning)' }}></div></div>
                        <div style={{ marginTop: 8, fontWeight: 700, color: 'var(--status-warning)', display: 'flex', justifyContent: 'space-between' }}><span>Còn phải trả</span><span>{fmtVND(summary.payableOutstanding)}</span></div>
                    </div>
                </div>
            </div>

            {/* Section B: Giữ lại bảo hành */}
            <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🔒 B. Giữ lại bảo hành (nhà thầu)</h3>
                {(retentions || []).length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Không có khoản giữ lại bảo hành</div>
                ) : (
                    <table className="data-table" style={{ margin: 0 }}>
                        <thead><tr><th>Nhà thầu</th><th>Dự án</th><th>Giai đoạn</th><th>HĐ NT</th><th>% Giữ lại</th><th>Số tiền GLL</th></tr></thead>
                        <tbody>{retentions.map(p => (
                            <tr key={p.id}>
                                <td style={{ fontWeight: 600 }}>{p.contractor?.name || '—'}</td>
                                <td>{p.project?.name || '—'}</td>
                                <td>{p.phase || '—'}</td>
                                <td style={{ textAlign: 'right' }}>{fmtVND(p.contractAmount)}</td>
                                <td style={{ textAlign: 'center' }}>{p.retentionRate}%</td>
                                <td style={{ fontWeight: 700, color: 'var(--status-warning)', textAlign: 'right' }}>{fmtVND(p.retentionAmount)}</td>
                            </tr>
                        ))}</tbody>
                        <tfoot><tr style={{ background: 'var(--bg-hover)', fontWeight: 700 }}>
                            <td colSpan={5}>Tổng giữ lại</td>
                            <td style={{ color: 'var(--status-warning)', textAlign: 'right' }}>{fmtVND(retentions.reduce((s, p) => s + (p.retentionAmount || 0), 0))}</td>
                        </tr></tfoot>
                    </table>
                )}
            </div>

            {/* Section C: Nhà cung cấp chưa thanh toán */}
            <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🏪 C. Nhà cung cấp chưa thanh toán</h3>
                {(supplierDebt || []).length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Không có nợ nhà cung cấp</div>
                ) : (
                    <table className="data-table" style={{ margin: 0 }}>
                        <thead><tr><th>Mã PO</th><th>Nhà CC</th><th>Dự án</th><th>Tổng PO</th><th>Đã trả</th><th>Còn lại</th><th>Ngày đặt</th></tr></thead>
                        <tbody>{supplierDebt.map(po => (
                            <tr key={po.id}>
                                <td className="accent">{po.code}</td>
                                <td style={{ fontWeight: 600 }}>{po.supplierRel?.name || po.supplier || '—'}</td>
                                <td>{po.project?.name || '—'}</td>
                                <td style={{ textAlign: 'right' }}>{fmtVND(po.totalAmount)}</td>
                                <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>{fmtVND(po.paidAmount)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--status-warning)' }}>{fmtVND(po.totalAmount - (po.paidAmount || 0))}</td>
                                <td>{fmtDate(po.orderDate)}</td>
                            </tr>
                        ))}</tbody>
                        <tfoot><tr style={{ background: 'var(--bg-hover)', fontWeight: 700 }}>
                            <td colSpan={5}>Tổng còn nợ NCC</td>
                            <td style={{ color: 'var(--status-warning)', textAlign: 'right' }}>{fmtVND(totalSupplierDebt)}</td>
                            <td></td>
                        </tr></tfoot>
                    </table>
                )}
            </div>
        </div>
    );
}
