'use client';
import { useState, useEffect } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n));

export default function SCurveChart({ projectId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tooltip, setTooltip] = useState(null);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/budget/s-curve?projectId=${projectId}`)
            .then(r => r.json())
            .then(setData)
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [projectId]);

    if (loading) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải biểu đồ...</div>;
    if (!data?.dataPoints?.length) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có dữ liệu</div>;

    const { dataPoints, summary } = data;
    const W = 700, H = 320, PAD = { top: 20, right: 20, bottom: 40, left: 70 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;

    const maxVal = Math.max(...dataPoints.map(d => Math.max(d.budget, d.actual)), 1);
    const xScale = (i) => PAD.left + (i / (dataPoints.length - 1 || 1)) * chartW;
    const yScale = (v) => PAD.top + chartH - (v / maxVal) * chartH;

    // Build SVG paths
    const budgetPath = dataPoints.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(d.budget).toFixed(1)}`).join(' ');
    const actualPath = dataPoints.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(d.actual).toFixed(1)}`).join(' ');

    // Fill area between budget and actual
    const lastActualIdx = dataPoints.findLastIndex(d => d.actual > 0);
    const fillPoints = lastActualIdx > 0 ? [
        ...dataPoints.slice(0, lastActualIdx + 1).map((d, i) => `${xScale(i).toFixed(1)},${yScale(d.actual).toFixed(1)}`),
        ...dataPoints.slice(0, lastActualIdx + 1).reverse().map((d, i) => `${xScale(lastActualIdx - i).toFixed(1)},${yScale(d.budget).toFixed(1)}`),
    ].join(' ') : '';

    // Y-axis ticks
    const yTicks = 5;
    const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => Math.round(maxVal * i / yTicks));

    const isOverBudget = summary.variance > 0;

    return (
        <div>
            {/* Summary cards */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ padding: '8px 16px', background: 'rgba(59,130,246,0.08)', borderRadius: 8, flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>📋 Dự toán</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#3b82f6' }}>{fmt(summary.budgetTotal)}đ</div>
                </div>
                <div style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>💸 Thực chi</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#ef4444' }}>{fmt(summary.actualTotal)}đ</div>
                </div>
                <div style={{ padding: '8px 16px', background: isOverBudget ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', borderRadius: 8, flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{isOverBudget ? '⚠️ Vượt DT' : '✅ Tiết kiệm'}</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: isOverBudget ? '#ef4444' : '#10b981' }}>
                        {isOverBudget ? '+' : ''}{fmt(summary.variance)}đ
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div style={{ overflowX: 'auto' }}>
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, height: 'auto', minHeight: 250 }}>
                    {/* Grid lines */}
                    {yTickVals.map((v, i) => (
                        <g key={i}>
                            <line x1={PAD.left} y1={yScale(v)} x2={W - PAD.right} y2={yScale(v)}
                                stroke="var(--border-light)" strokeWidth={0.5} strokeDasharray={i === 0 ? '' : '3,3'} />
                            <text x={PAD.left - 8} y={yScale(v) + 4} textAnchor="end"
                                fill="var(--text-muted)" fontSize={9}>{v > 1e6 ? `${(v / 1e6).toFixed(0)}tr` : fmt(v)}</text>
                        </g>
                    ))}

                    {/* X-axis labels */}
                    {dataPoints.map((d, i) => {
                        if (dataPoints.length > 20 && i % 4 !== 0) return null;
                        return (
                            <text key={i} x={xScale(i)} y={H - 8} textAnchor="middle"
                                fill="var(--text-muted)" fontSize={9}>{d.label}</text>
                        );
                    })}

                    {/* Variance fill area */}
                    {fillPoints && (
                        <polygon points={fillPoints}
                            fill={isOverBudget ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)'}
                            stroke="none" />
                    )}

                    {/* Budget line */}
                    <path d={budgetPath} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" />

                    {/* Actual line */}
                    <path d={actualPath} fill="none" stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round" strokeDasharray="" />

                    {/* Data points (dots) */}
                    {dataPoints.map((d, i) => {
                        if (d.actual === 0 && i > 0) return null;
                        return (
                            <g key={i}>
                                <circle cx={xScale(i)} cy={yScale(d.actual)} r={3} fill="#ef4444" stroke="#fff" strokeWidth={1.5}
                                    style={{ cursor: 'pointer' }}
                                    onMouseEnter={() => setTooltip({ x: xScale(i), y: yScale(d.actual), d })}
                                    onMouseLeave={() => setTooltip(null)} />
                            </g>
                        );
                    })}

                    {/* Legend */}
                    <g transform={`translate(${PAD.left + 10}, ${PAD.top + 10})`}>
                        <line x1={0} y1={0} x2={20} y2={0} stroke="#3b82f6" strokeWidth={2.5} />
                        <text x={25} y={4} fontSize={10} fill="var(--text-secondary)">Kế hoạch (DT)</text>
                        <line x1={100} y1={0} x2={120} y2={0} stroke="#ef4444" strokeWidth={2.5} />
                        <text x={125} y={4} fontSize={10} fill="var(--text-secondary)">Thực chi</text>
                    </g>

                    {/* Tooltip */}
                    {tooltip && (
                        <g>
                            <rect x={tooltip.x - 60} y={tooltip.y - 48} width={120} height={40} rx={6}
                                fill="var(--bg-card)" stroke="var(--border-light)" strokeWidth={1} />
                            <text x={tooltip.x} y={tooltip.y - 34} textAnchor="middle" fontSize={9} fill="var(--text-muted)">{tooltip.d.label}</text>
                            <text x={tooltip.x} y={tooltip.y - 22} textAnchor="middle" fontSize={9} fill="#3b82f6">DT: {fmt(tooltip.d.budget)}đ</text>
                            <text x={tooltip.x} y={tooltip.y - 12} textAnchor="middle" fontSize={9} fill="#ef4444">TT: {fmt(tooltip.d.actual)}đ</text>
                        </g>
                    )}
                </svg>
            </div>
        </div>
    );
}
