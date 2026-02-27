'use client';
import { useState, useEffect } from 'react';

const formatCurrency = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

export default function InventoryPage() {
    const [data, setData] = useState({ transactions: [], warehouses: [] });
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('');
    const [activeWarehouse, setActiveWarehouse] = useState('');

    const fetchData = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filterType) params.set('type', filterType);
        if (activeWarehouse) params.set('warehouseId', activeWarehouse);
        const res = await fetch(`/api/inventory?${params}`);
        const d = await res.json();
        setData(d);
        setLoading(false);
    };
    useEffect(() => { fetchData(); }, [filterType, activeWarehouse]);

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                {data.warehouses.map(w => (
                    <div key={w.id} className={`card ${activeWarehouse === w.id ? 'active' : ''}`} style={{ padding: 16, cursor: 'pointer', border: activeWarehouse === w.id ? '2px solid var(--accent-primary)' : '2px solid transparent' }} onClick={() => setActiveWarehouse(activeWarehouse === w.id ? '' : w.id)}>
                        <div style={{ fontSize: 20, marginBottom: 4 }}>🏭</div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{w.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{w.address}</div>
                    </div>
                ))}
            </div>

            <div className="card">
                <div className="card-header"><h3>Lịch sử Nhập/Xuất kho</h3></div>
                <div className="filter-bar">
                    <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="">Tất cả</option><option value="Nhập">Nhập kho</option><option value="Xuất">Xuất kho</option>
                    </select>
                </div>
                {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : (
                    <table className="data-table">
                        <thead><tr><th>Mã PK</th><th>Loại</th><th>Sản phẩm</th><th>SL</th><th>Kho</th><th>Dự án</th><th>Ghi chú</th><th>Ngày</th></tr></thead>
                        <tbody>
                            {data.transactions.map(t => (
                                <tr key={t.id}>
                                    <td className="accent">{t.code}</td>
                                    <td><span className={`badge ${t.type === 'Nhập' ? 'badge-success' : 'badge-warning'}`}>{t.type}</span></td>
                                    <td className="primary">{t.product?.name}</td>
                                    <td>{t.quantity} {t.unit}</td>
                                    <td>{t.warehouse?.name}</td>
                                    <td>{t.project?.name || '-'}</td>
                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.note}</td>
                                    <td>{new Date(t.date).toLocaleDateString('vi-VN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
