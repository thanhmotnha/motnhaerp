'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/fetchClient';

const STATUS_LABEL = {
    draft: 'Nháp', confirmed: 'Xác nhận', cnc_ready: 'Có CNC',
    material_ordered: 'Đặt VL', in_production: 'Sản xuất',
    installing: 'Lắp đặt', completed: 'Hoàn thành', cancelled: 'Hủy',
};
const STATUS_BADGE = {
    draft: 'secondary', confirmed: 'warning', cnc_ready: 'info',
    material_ordered: 'info', in_production: 'warning',
    installing: 'warning', completed: 'success', cancelled: 'danger',
};

export default function FurnitureTab({ projectId }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetch(`/api/furniture-orders?projectId=${projectId}&limit=50`)
            .then(d => setOrders(d.data || []))
            .finally(() => setLoading(false));
    }, [projectId]);

    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">🪵 Đơn hàng Nội thất</span>
                <a href={`/noi-that?projectId=${projectId}`} className="btn btn-sm btn-primary">+ Tạo đơn mới</a>
            </div>
            {loading ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : orders.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có đơn hàng nội thất nào</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr><th>Mã</th><th>Tên đơn hàng</th><th>Trạng thái</th><th>Ngày tạo</th><th></th></tr>
                        </thead>
                        <tbody>
                            {orders.map(o => (
                                <tr key={o.id}>
                                    <td><code style={{ fontSize: 12 }}>{o.code}</code></td>
                                    <td>{o.name}</td>
                                    <td>
                                        <span className={`badge ${STATUS_BADGE[o.status] || 'secondary'}`}>
                                            {STATUS_LABEL[o.status] || o.status}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        {new Date(o.createdAt).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td>
                                        <a href={`/noi-that/${o.id}`} className="btn btn-ghost btn-sm">Chi tiết →</a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
