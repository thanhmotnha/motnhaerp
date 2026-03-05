'use client';
import { useState, useEffect } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n));
const STATUS_COLORS = { green: '#10b981', yellow: '#f59e0b', red: '#ef4444' };
const STATUS_LABELS = { green: 'Tốt', yellow: 'Cẩn thận', red: 'Vượt DT' };
const COST_TYPES = ['Tất cả', 'Vật tư', 'Nhân công', 'Thầu phụ', 'Khác'];

export default function VarianceTable({ projectId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('flat'); // flat | grouped
    const [costFilter, setCostFilter] = useState('Tất cả');
    const [collapsed, setCollapsed] = useState({});

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

    const items = costFilter === 'Tất cả' ? data.items : data.items.filter(i => i.costType === costFilter);
    const { totalBudget, totalActual, totalVariance, overallCpi } = data.summary;

    const toggleGroup = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

    // Group items by group1 > group2
    const grouped = {};
    items.forEach(item => {
        const g1 = item.group1 || 'Chưa phân loại';
        const g2 = item.group2 || '';
        if (!grouped[g1]) grouped[g1] = { items: [], subgroups: {}, budget: 0, actual: 0 };
        grouped[g1].budget += item.budgetTotal;
        grouped[g1].actual += item.actualTotal;
        if (g2) {
            if (!grouped[g1].subgroups[g2]) grouped[g1].subgroups[g2] = { items: [], budget: 0, actual: 0 };
            grouped[g1].subgroups[g2].items.push(item);
            grouped[g1].subgroups[g2].budget += item.budgetTotal;
            grouped[g1].subgroups[g2].actual += item.actualTotal;
        } else {
            grouped[g1].items.push(item);
        }
    });

    const cpiColor = (cpi) => !cpi ? 'var(--text-muted)' : cpi >= 1 ? '#10b981' : cpi >= 0.95 ? '#f59e0b' : '#ef4444';

    const renderRow = (v) => (
        <tr key={v.id} style={{ borderLeft: `3px solid ${STATUS_COLORS[v.status]}` }}>
            <td style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600 }}>{v.productName}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {v.productCode}
                    {v.costType && v.costType !== 'Vật tư' && <span className="badge" style={{ fontSize: 9, padding: '1px 5px', background: v.costType === 'Nhân công' ? '#8b5cf6' : v.costType === 'Thầu phụ' ? '#f97316' : '#6b7280', color: '#fff' }}>{v.costType}</span>}
                    {v.supplierTag && <span style={{ fontSize: 9, color: v.supplierTag === 'Thầu phụ cấp' ? '#f97316' : 'var(--accent-primary)' }}>• {v.supplierTag}</span>}
                    {v.drawingUrl && <a href={v.drawingUrl} target="_blank" rel="noopener noreferrer" title="Xem bản vẽ" style={{ fontSize: 10, textDecoration: 'none' }}>📐</a>}
                </div>
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
            {/* CPI column */}
            <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, color: cpiColor(v.cpi) }}>
                {v.cpi !== null ? v.cpi.toFixed(2) : '—'}
            </td>
            <td style={{ textAlign: 'center' }}>
                <span className="variance-status-dot" style={{ background: STATUS_COLORS[v.status] }} title={STATUS_LABELS[v.status]} />
            </td>
        </tr>
    );

    const renderGroupHeader = (name, budget, actual, level, itemCount) => {
        const key = `${level}-${name}`;
        const isCollapsed = collapsed[key];
        const grpCpi = actual > 0 ? (budget / actual) : null;
        const variance = actual - budget;
        return (
            <tr key={key} onClick={() => toggleGroup(key)} style={{
                cursor: 'pointer', background: level === 1 ? 'rgba(59,130,246,0.06)' : 'rgba(99,102,241,0.04)',
                borderLeft: `3px solid ${level === 1 ? 'var(--accent-primary)' : '#a78bfa'}`,
            }}>
                <td colSpan={5} style={{ fontWeight: 700, fontSize: level === 1 ? 13 : 12, paddingLeft: level === 1 ? 12 : 28 }}>
                    <span style={{ marginRight: 6, fontSize: 10 }}>{isCollapsed ? '▶' : '▼'}</span>
                    {name} <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-muted)' }}>({itemCount})</span>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12 }}>{fmt(budget)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12, color: variance > 0 ? '#ef4444' : '#10b981' }}>
                    {variance !== 0 ? `${variance > 0 ? '+' : ''}${fmt(variance)}` : '—'}
                </td>
                <td colSpan={2}></td>
                <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 13, color: cpiColor(grpCpi) }}>
                    {grpCpi !== null ? grpCpi.toFixed(2) : '—'}
                </td>
                <td></td>
            </tr>
        );
    };

    return (
        <div>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Summary */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
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
                    {overallCpi !== null && (
                        <div className="variance-stat">
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>CPI tổng</span>
                            <span style={{ fontWeight: 700, fontSize: 16, color: cpiColor(overallCpi) }}>{overallCpi.toFixed(2)}</span>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {COST_TYPES.map(ct => (
                        <button key={ct} onClick={() => setCostFilter(ct)}
                            className={`btn btn-sm ${costFilter === ct ? 'btn-primary' : 'btn-ghost'}`}
                            style={{ fontSize: 11, padding: '3px 10px' }}>{ct}</button>
                    ))}
                    <span style={{ color: 'var(--border-light)', margin: '0 2px' }}>|</span>
                    <button onClick={() => setViewMode(viewMode === 'flat' ? 'grouped' : 'flat')}
                        className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '3px 10px' }}>
                        {viewMode === 'flat' ? '📁 Nhóm' : '📋 Phẳng'}
                    </button>
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
                            <th style={{ width: 60, textAlign: 'center' }} title="Cost Performance Index = Giá DT / Giá TT. >1 = tiết kiệm, <1 = thâm hụt">CPI</th>
                            <th>TT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {viewMode === 'flat' ? (
                            items.map(v => renderRow(v))
                        ) : (
                            Object.entries(grouped).map(([g1Name, g1Data]) => {
                                const g1Key = `1-${g1Name}`;
                                const g1Items = g1Data.items;
                                const subgroups = Object.entries(g1Data.subgroups);
                                const totalItems = g1Items.length + subgroups.reduce((s, [, sg]) => s + sg.items.length, 0);
                                return [
                                    renderGroupHeader(g1Name, g1Data.budget, g1Data.actual, 1, totalItems),
                                    ...(!collapsed[g1Key] ? [
                                        ...g1Items.map(v => renderRow(v)),
                                        ...subgroups.flatMap(([g2Name, g2Data]) => {
                                            const g2Key = `2-${g2Name}`;
                                            return [
                                                renderGroupHeader(g2Name, g2Data.budget, g2Data.actual, 2, g2Data.items.length),
                                                ...(!collapsed[g2Key] ? g2Data.items.map(v => renderRow(v)) : []),
                                            ];
                                        }),
                                    ] : []),
                                ];
                            }).flat()
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
