'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

const fmt = v => new Intl.NumberFormat('vi-VN').format(v || 0);
const statusColors = { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444' };
const statusLabels = { green: 'Tốt', yellow: 'Cảnh báo', red: 'Vượt mức' };

export default function BudgetPage() {
    const toast = useToast();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [projectId, setProjectId] = useState('');
    const [projects, setProjects] = useState([]);

    useEffect(() => {
        apiFetch('/api/projects?limit=200').then(r => {
            const list = r.data || [];
            setProjects(list);
            if (list.length > 0) setProjectId(list[0].id);
        }).catch(() => {});
    }, []);

    const fetchData = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const res = await apiFetch(`/api/budget/variance?projectId=${projectId}`);
            setData(res);
        } catch (e) { toast.error(e.message); setData(null); }
        setLoading(false);
    }, [projectId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const s = data?.summary || {};

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h2 style={{ margin: 0 }}>Ngân sách & Chi phí</h2>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>So sánh dự toán với thực tế (Budget Variance)</div>
                </div>
                <select className="form-input" value={projectId} onChange={e => setProjectId(e.target.value)} style={{ maxWidth: 300 }}>
                    <option value="">Chọn dự án</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>

            {!projectId ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chọn dự án để xem ngân sách</div>
            ) : loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : !data?.items?.length ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có dữ liệu ngân sách cho dự án này</div>
            ) : (
                <>
                    {/* Summary KPI */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
                        {[
                            { label: 'Dự toán', value: fmt(s.totalBudget) + 'đ', color: '#3b82f6' },
                            { label: 'Thực tế', value: fmt(s.totalActual) + 'đ', color: s.totalVariance > 0 ? '#ef4444' : '#22c55e' },
                            { label: 'Chênh lệch', value: (s.totalVariance > 0 ? '+' : '') + fmt(s.totalVariance) + 'đ', color: s.totalVariance > 0 ? '#ef4444' : '#22c55e' },
                            { label: 'CPI', value: s.overallCpi || '—', color: (s.overallCpi || 0) >= 1 ? '#22c55e' : '#ef4444' },
                        ].map(k => (
                            <div key={k.label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
                                <div style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Group Summary */}
                    {data.groupSummary?.length > 0 && (
                        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                            <h4 style={{ margin: '0 0 12px' }}>Theo nhóm</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                                {data.groupSummary.map(g => (
                                    <div key={g.name} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-tertiary)' }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{g.name} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({g.items} mục)</span></div>
                                        <div style={{ fontSize: 12 }}>DT: {fmt(g.budget)} — TT: {fmt(g.actual)}</div>
                                        <div style={{ fontSize: 12, color: g.variance > 0 ? '#ef4444' : '#22c55e', fontWeight: 600 }}>CL: {g.variance > 0 ? '+' : ''}{fmt(g.variance)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Detail Table */}
                    <div className="card" style={{ overflow: 'auto' }}>
                        <table className="data-table" style={{ fontSize: 13 }}>
                            <thead>
                                <tr><th>Vật tư</th><th>Mã</th><th>ĐVT</th><th>SL DT</th><th>Giá DT</th><th>Tổng DT</th><th>SL TT</th><th>Giá TT</th><th>Tổng TT</th><th>CL</th><th>CPI</th><th>TT</th></tr>
                            </thead>
                            <tbody>
                                {data.items.map(i => {
                                    const sc = statusColors[i.status] || '#888';
                                    return (
                                        <tr key={i.id}>
                                            <td style={{ fontWeight: 500 }}>{i.productName}</td>
                                            <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{i.productCode}</td>
                                            <td>{i.unit}</td>
                                            <td style={{ textAlign: 'right' }}>{fmt(i.budgetQty)}</td>
                                            <td style={{ textAlign: 'right' }}>{fmt(i.budgetUnitPrice)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(i.budgetTotal)}</td>
                                            <td style={{ textAlign: 'right' }}>{fmt(i.receivedQty || i.orderedQty)}</td>
                                            <td style={{ textAlign: 'right' }}>{fmt(Math.round(i.avgActualPrice))}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(Math.round(i.actualTotal))}</td>
                                            <td style={{ textAlign: 'right', color: i.priceVariance > 0 ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{i.priceVariance > 0 ? '+' : ''}{fmt(Math.round(i.priceVariance))}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 600, color: (i.cpi || 0) >= 1 ? '#22c55e' : '#ef4444' }}>{i.cpi ?? '—'}</td>
                                            <td><span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: sc + '18', color: sc }}>{statusLabels[i.status]}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
