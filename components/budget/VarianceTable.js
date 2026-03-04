'use client';
import { useState, useEffect } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n));
const STATUS_COLORS = { green: '#10b981', yellow: '#f59e0b', red: '#ef4444' };
const STATUS_LABELS = { green: 'Tốt', yellow: 'Cẩn thận', red: 'Vượt DT' };

export default function VarianceTable({ projectId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [groupBy, setGroupBy] = useState('all'); // all | category

    useEffect(() => {
        setLoading(true);
        fetch(`/api/budget/variance?projectId=${projectId}`)
            .then(r => r.json())
            .then(setData)
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [projectId]);

    if (loading) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;
    if (!data?.items?.length) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có dữ liệu dự toán</div>;

    const items = data.items;
    const { totalBudget, totalActual, totalVariance } = data.summary;

    // Group by category
    const categories = [...new Set(items.map(i => i.category || 'Khác'))];

    return (
        <div>
            {/* Summary bar */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <div className="variance-stat">
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tổng DT</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{fmt(totalBudget)}đ</span>
                </div>
                <div className="variance-stat">
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tổng thực tế</span>
                    <span style={{ fontWeight: 700 }}>{fmt(totalActual)}đ</span>
                </div>
                <div className="variance-stat">
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Chênh lệch</span>
                    <span style={{ fontWeight: 700, color: totalVariance > 0 ? '#ef4444' : '#10b981' }}>
                        {totalVariance > 0 ? '+' : ''}{fmt(totalVariance)}đ
                    </span>
                </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ fontSize: 12, width: '100%' }}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left', minWidth: 180 }}>Vật tư</th>
                            <th>ĐVT</th>
                            <th style={{ textAlign: 'right' }}>SL DT</th>
                            <th style={{ textAlign: 'right' }}>SL Đã đặt</th>
                            <th style={{ textAlign: 'right' }}>ĐG DT</th>
                            <th style={{ textAlign: 'right' }}>ĐG TT</th>
                            <th style={{ textAlign: 'right' }}>CL Giá</th>
                            <th style={{ textAlign: 'right' }}>CL KL</th>
                            <th style={{ width: 120 }}>Tỉ lệ SD</th>
                            <th>TT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(v => (
                            <tr key={v.id} style={{ borderLeft: `3px solid ${STATUS_COLORS[v.status]}` }}>
                                <td style={{ textAlign: 'left' }}>
                                    <div style={{ fontWeight: 600 }}>{v.productName}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{v.productCode}</div>
                                </td>
                                <td style={{ textAlign: 'center', fontSize: 11 }}>{v.unit}</td>
                                <td style={{ textAlign: 'right' }}>{v.budgetQty}</td>
                                <td style={{ textAlign: 'right' }}>{v.orderedQty}</td>
                                <td style={{ textAlign: 'right' }}>{fmt(v.budgetUnitPrice)}</td>
                                <td style={{ textAlign: 'right', color: v.avgActualPrice > v.budgetUnitPrice ? '#ef4444' : 'inherit', fontWeight: v.avgActualPrice > v.budgetUnitPrice ? 700 : 400 }}>
                                    {v.avgActualPrice > 0 ? fmt(v.avgActualPrice) : '—'}
                                </td>
                                <td style={{ textAlign: 'right', color: v.priceVariance > 0 ? '#ef4444' : v.priceVariance < 0 ? '#10b981' : 'inherit' }}>
                                    {v.priceVariance !== 0 ? `${v.priceVariance > 0 ? '+' : ''}${fmt(v.priceVariance)}` : '—'}
                                </td>
                                <td style={{ textAlign: 'right', color: v.qtyVariance > 0 ? '#ef4444' : 'inherit' }}>
                                    {v.qtyVariance !== 0 ? `${v.qtyVariance > 0 ? '+' : ''}${v.qtyVariance}` : '—'}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <div className="variance-progress-bar">
                                            <div className="variance-progress-fill" style={{
                                                width: `${Math.min(v.usagePercent, 100)}%`,
                                                background: STATUS_COLORS[v.status],
                                            }} />
                                        </div>
                                        <span style={{ fontSize: 10, fontWeight: 600, color: STATUS_COLORS[v.status], minWidth: 32 }}>
                                            {v.usagePercent}%
                                        </span>
                                    </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <span className="variance-status-dot" style={{ background: STATUS_COLORS[v.status] }} title={STATUS_LABELS[v.status]} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
