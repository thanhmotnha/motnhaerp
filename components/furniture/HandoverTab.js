'use client';
import { STATUS_LABEL, STATUS_COLOR, fmtDate } from './constants';

export default function HandoverTab({ order, onRefresh, toast }) {
    const tickets = order.warrantyTickets || [];
    const TSTATUS = { 'Mới': 'Mới', 'Đang xử lý': 'Đang xử lý', 'Đã xử lý': 'Đã xử lý', 'Đóng': 'Đóng' };
    const TCOLOR = { 'Mới': 'warning', 'Đang xử lý': 'info', 'Đã xử lý': 'success', 'Đóng': 'muted' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
                <div style={{ fontWeight: 600, marginBottom: 12 }}>Thông tin bàn giao</div>
                <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: 13 }}>
                    <dt style={{ color: 'var(--text-muted)' }}>Trạng thái đơn</dt>
                    <dd style={{ margin: 0 }}><span className={`badge ${STATUS_COLOR[order.status]}`}>{STATUS_LABEL[order.status]}</span></dd>
                    <dt style={{ color: 'var(--text-muted)' }}>Ngày giao thực tế</dt>
                    <dd style={{ margin: 0, fontWeight: 500 }}>{fmtDate(order.deliveredAt)}</dd>
                    <dt style={{ color: 'var(--text-muted)' }}>Ngày giao dự kiến</dt>
                    <dd style={{ margin: 0 }}>{fmtDate(order.expectedDelivery)}</dd>
                    {order.project && <>
                        <dt style={{ color: 'var(--text-muted)' }}>Công trình</dt>
                        <dd style={{ margin: 0 }}>{order.project.code} — sẵn sàng lắp: <strong style={{ color: order.project.siteReadyFlag ? 'var(--status-success)' : 'var(--status-danger)' }}>{order.project.siteReadyFlag ? 'Có' : 'Chưa'}</strong></dd>
                    </>}
                </dl>
            </div>

            <div className="card">
                <div style={{ fontWeight: 600, marginBottom: 12 }}>Phiếu bảo hành ({tickets.length})</div>
                {tickets.length === 0
                    ? <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có phiếu bảo hành nào</div>
                    : <table className="data-table">
                        <thead><tr><th>Mã phiếu</th><th>Mô tả</th><th>Trạng thái</th><th>Ngày tạo</th><th>Ngày xử lý</th></tr></thead>
                        <tbody>
                            {tickets.map(t => (
                                <tr key={t.id}>
                                    <td style={{ fontWeight: 600, fontSize: 12, color: 'var(--accent-primary)' }}>{t.code || t.id.slice(-6)}</td>
                                    <td style={{ fontSize: 13 }}>{t.description}</td>
                                    <td><span className={`badge ${TCOLOR[t.status]}`} style={{ fontSize: 10 }}>{TSTATUS[t.status] || t.status}</span></td>
                                    <td style={{ fontSize: 12 }}>{fmtDate(t.createdAt)}</td>
                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(t.resolvedAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                }
            </div>
        </div>
    );
}
