'use client';
import { fmtVND } from '@/lib/financeUtils';

export default function ReportTab({ cashflow }) {
    if (!cashflow) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

    const months = cashflow.months || [];
    const totalInflow = months.reduce((s, m) => s + (m.inflow || 0), 0);
    const totalOutflow = months.reduce((s, m) => s + (m.outflow || 0), 0);
    const totalNet = months.reduce((s, m) => s + (m.net || 0), 0);

    return (
        <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ margin: 0 }}>
                <thead>
                    <tr>
                        <th>Tháng</th>
                        <th style={{ textAlign: 'right', color: 'var(--status-success)' }}>Tổng thu</th>
                        <th style={{ textAlign: 'right', color: 'var(--status-danger)' }}>Tổng chi</th>
                        <th style={{ textAlign: 'right', fontWeight: 700 }}>Ròng tháng</th>
                        <th style={{ textAlign: 'right' }}>Số dư tích luỹ</th>
                    </tr>
                </thead>
                <tbody>
                    {months.length === 0 ? (
                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Chưa có dữ liệu</td></tr>
                    ) : months.map(m => (
                        <tr key={m.key}>
                            <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{m.label}</td>
                            <td style={{ textAlign: 'right', color: 'var(--status-success)', fontWeight: 600 }}>{fmtVND(m.inflow)}</td>
                            <td style={{ textAlign: 'right', color: 'var(--status-danger)' }}>{fmtVND(m.outflow)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: (m.net || 0) >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
                                {(m.net || 0) >= 0 ? '+' : ''}{fmtVND(m.net)}
                            </td>
                            <td style={{ textAlign: 'right', color: (m.runningBalance || 0) >= 0 ? 'var(--text-primary)' : 'var(--status-danger)' }}>
                                {fmtVND(m.runningBalance)}
                            </td>
                        </tr>
                    ))}
                </tbody>
                {months.length > 0 && (
                    <tfoot>
                        <tr style={{ background: 'var(--bg-hover)', fontWeight: 700 }}>
                            <td>Tổng cộng</td>
                            <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>{fmtVND(totalInflow)}</td>
                            <td style={{ textAlign: 'right', color: 'var(--status-danger)' }}>{fmtVND(totalOutflow)}</td>
                            <td style={{ textAlign: 'right', color: totalNet >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
                                {totalNet >= 0 ? '+' : ''}{fmtVND(totalNet)}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
    );
}
