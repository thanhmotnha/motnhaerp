'use client';
import { apiFetch } from '@/lib/fetchClient';

const NEXT_ACTION = {
    draft: { label: 'Xác nhận đơn hàng', targetStatus: 'confirmed' },
    in_production: { label: 'Bắt đầu lắp đặt', targetStatus: 'installing' },
    installing: { label: 'Hoàn thành', targetStatus: 'completed' },
};

export default function OverviewTab({ order, onRefresh }) {
    const action = NEXT_ACTION[order.status];

    const advanceStatus = async () => {
        if (!action) return;
        if (!confirm(`Chuyển sang "${action.label}"?`)) return;
        try {
            await apiFetch(`/api/furniture-orders/${order.id}`, {
                method: 'PUT',
                body: { status: action.targetStatus },
            });
            onRefresh();
        } catch (err) {
            alert(err.message || 'Lỗi cập nhật');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
                <div className="card-header">
                    <span className="card-title">Thông tin đơn hàng</span>
                    {action && (
                        <button className="btn btn-primary btn-sm" onClick={advanceStatus}>{action.label} →</button>
                    )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingBottom: 12 }}>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Khách hàng</div>
                        <div style={{ fontWeight: 600 }}>{order.customer?.name}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Dự án</div>
                        <div>{order.project?.name || '—'}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Địa chỉ giao</div>
                        <div>{order.deliveryAddress || '—'}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ngày giao dự kiến</div>
                        <div>{order.expectedDelivery ? new Date(order.expectedDelivery).toLocaleDateString('vi-VN') : '—'}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Phong cách</div>
                        <div>{order.styleNote || '—'}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Loại phòng</div>
                        <div>{order.roomType || '—'}</div>
                    </div>
                </div>
                {order.internalNote && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
                        📝 {order.internalNote}
                    </div>
                )}
            </div>

            {order.items?.length > 0 && (
                <div className="card">
                    <div className="card-header"><span className="card-title">Hạng mục</span></div>
                    <div className="table-container">
                        <table className="data-table" style={{ fontSize: 13 }}>
                            <thead><tr><th>Tên hạng mục</th><th>SL</th><th>ĐVT</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
                            <tbody>
                                {order.items.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.name}</td>
                                        <td>{item.quantity}</td>
                                        <td>{item.unit}</td>
                                        <td>{item.unitPrice?.toLocaleString('vi-VN')}</td>
                                        <td style={{ fontWeight: 600 }}>{item.amount?.toLocaleString('vi-VN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
