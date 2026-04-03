'use client';

import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Search, RefreshCw, ExternalLink, Clock } from 'lucide-react';
import Link from 'next/link';
import ProjectFinanceDrawer from '@/components/reports/ProjectFinanceDrawer';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));

const STATUS_COLOR = {
    'Đang tiến hành': '#3b82f6',
    'Hoàn thành': '#22c55e',
    'Tạm dừng': '#f59e0b',
    'Hủy': '#ef4444',
};

const STATUSES = ['Tất cả', 'Đang tiến hành', 'Hoàn thành', 'Tạm dừng', 'Hủy'];

const GROUPS = [
    { key: 'Thiết kế', icon: '📐', label: 'Thiết kế' },
    { key: 'Nội thất', icon: '🛋️', label: 'Nội thất' },
    { key: 'Thi công', icon: '🏗️', label: 'Thi công' },
];

export default function PLByProjectPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('Tất cả');
    const [sortField, setSortField] = useState('margin');
    const [sortDir, setSortDir] = useState('asc');
    const [drawerProjectId, setDrawerProjectId] = useState(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/reports/project-pnl');
            if (!res.ok) throw new Error('Lỗi tải dữ liệu');
            setData(await res.json());
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filteredRows = useMemo(() => {
        if (!data?.rows) return [];
        let r = data.rows;
        if (statusFilter !== 'Tất cả') r = r.filter(x => x.status === statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            r = r.filter(x => x.name?.toLowerCase().includes(q) || x.code?.toLowerCase().includes(q) || x.customerName?.toLowerCase().includes(q));
        }
        return [...r].sort((a, b) => {
            const va = a[sortField] ?? 0, vb = b[sortField] ?? 0;
            return sortDir === 'asc' ? va - vb : vb - va;
        });
    }, [data, statusFilter, search, sortField, sortDir]);

    const toggleSort = (field) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    const SortBtn = ({ field, label }) => (
        <button onClick={() => toggleSort(field)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: sortField === field ? 700 : 400, display: 'flex', alignItems: 'center', gap: 2, whiteSpace: 'nowrap' }}>
            {label}{sortField === field && <span style={{ fontSize: 10 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>}
        </button>
    );

    const sum = data?.summary;
    const alertCount = filteredRows.filter(r => r.alert).length;

    return (
        <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>📊 Lãi/Lỗ Theo Dự Án (P&L)</h1>
                    <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Phân tích hiệu quả tài chính — nhóm theo loại hợp đồng chính</p>
                </div>
                <button onClick={load} disabled={loading}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                    <RefreshCw size={14} className={loading ? 'spin' : ''} /> Làm mới
                </button>
            </div>

            {/* KPI Cards */}
            {sum && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
                    <SummaryCard icon={<DollarSign size={20} />} label="Tổng giá trị HĐ" value={fmt(sum.totalContractValue)} color="#3b82f6" />
                    <SummaryCard icon={<TrendingUp size={20} />} label="Đã thu" value={fmt(sum.totalPaid)} color="#22c55e" />
                    <SummaryCard icon={<Clock size={20} />} label="Còn phải thu" value={fmt(sum.totalRemain)} color="#f59e0b" />
                    <SummaryCard icon={<TrendingDown size={20} />} label="Tổng chi phí" value={fmt(sum.totalCost)} color="#ef4444" />
                    <SummaryCard
                        icon={sum.totalProfit >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        label="Lợi nhuận"
                        value={fmt(sum.totalProfit)}
                        color={sum.totalProfit >= 0 ? '#22c55e' : '#ef4444'}
                        sub={sum.totalContractValue > 0 ? `Margin: ${Math.round((sum.totalProfit / sum.totalContractValue) * 100)}%` : ''}
                    />
                    <SummaryCard icon={<AlertTriangle size={20} />} label="Cảnh báo margin thấp" value={`${alertCount} dự án`} color={alertCount > 0 ? '#ef4444' : '#9ca3af'} />
                </div>
            )}

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Tìm dự án, mã, khách hàng..."
                        style={{ width: '100%', paddingLeft: 32, paddingRight: 10, height: 36, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    style={{ height: 36, border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 10px', fontSize: 13, background: '#fff' }}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
            </div>

            {error && <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', marginBottom: 16 }}>{error}</div>}

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Đang tải...</div>
            ) : (
                <>
                    {GROUPS.map(group => {
                        const rows = filteredRows.filter(r => r.groupType === group.key);
                        if (rows.length === 0) return null;
                        const subTotal = {
                            contractValue: rows.reduce((s, r) => s + r.contractValue, 0),
                            paidByCustomer: rows.reduce((s, r) => s + r.paidByCustomer, 0),
                            remainReceivable: rows.reduce((s, r) => s + r.remainReceivable, 0),
                            totalCost: rows.reduce((s, r) => s + r.totalCost, 0),
                            grossProfit: rows.reduce((s, r) => s + r.grossProfit, 0),
                        };
                        const avgMargin = subTotal.contractValue > 0
                            ? Math.round((subTotal.grossProfit / subTotal.contractValue) * 100)
                            : 0;

                        return (
                            <div key={group.key} style={{ marginBottom: 32 }}>
                                {/* Section header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0 8px', borderBottom: '2px solid #e5e7eb', marginBottom: 0 }}>
                                    <span style={{ fontSize: 17, fontWeight: 700 }}>{group.icon} {group.label}</span>
                                    <span style={{ fontSize: 12, color: '#6b7280' }}>({rows.length} dự án)</span>
                                    <span style={{ marginLeft: 'auto', fontSize: 13 }}>
                                        Margin TB: <strong style={{ color: avgMargin < 0 ? '#dc2626' : avgMargin < 10 ? '#d97706' : '#16a34a' }}>{avgMargin}%</strong>
                                    </span>
                                </div>

                                {/* Table */}
                                <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 10px 10px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                        <thead style={{ background: '#f9fafb' }}>
                                            <tr>
                                                <th style={th}>Mã / Dự án</th>
                                                <th style={th}>Khách hàng</th>
                                                <th style={th}>Trạng thái</th>
                                                <th style={{ ...th, textAlign: 'right' }}><SortBtn field="contractValue" label="Giá trị HĐ" /></th>
                                                <th style={{ ...th, textAlign: 'right' }}><SortBtn field="paidByCustomer" label="Đã thu" /></th>
                                                <th style={{ ...th, textAlign: 'right' }}><SortBtn field="remainReceivable" label="Còn phải thu" /></th>
                                                <th style={{ ...th, textAlign: 'right' }}><SortBtn field="totalCost" label="Tổng chi" /></th>
                                                <th style={{ ...th, textAlign: 'right' }}><SortBtn field="grossProfit" label="Lợi nhuận" /></th>
                                                <th style={{ ...th, textAlign: 'right' }}><SortBtn field="margin" label="Margin %" /></th>
                                                <th style={th}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map(r => {
                                                const overdueRemain = r.remainReceivable > 0 && r.status === 'Hoàn thành';
                                                const rowBg = r.margin < 0 ? '#fef2f2' : r.alert ? '#fffbeb' : '#fff';
                                                return (
                                                    <tr key={r.id} style={{ background: rowBg, borderTop: '1px solid #f3f4f6' }}>
                                                        <td style={{ ...td, cursor: 'pointer' }} onClick={() => setDrawerProjectId(r.id)} title="Xem chi tiết tài chính">
                                                            <div style={{ fontWeight: 600, fontSize: 12.5, color: '#2563eb' }}>{r.code || '—'}</div>
                                                            <div style={{ color: '#374151', maxWidth: 220, textDecoration: 'underline', textDecorationColor: '#bfdbfe' }}>{r.name}</div>
                                                            {r.alert && <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#b45309', fontSize: 11, marginTop: 2 }}><AlertTriangle size={11} /> Margin thấp</div>}
                                                        </td>
                                                        <td style={td}>{r.customerName || '—'}</td>
                                                        <td style={td}>
                                                            <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: (STATUS_COLOR[r.status] || '#6b7280') + '20', color: STATUS_COLOR[r.status] || '#6b7280' }}>
                                                                {r.status || '—'}
                                                            </span>
                                                        </td>
                                                        <td style={{ ...td, textAlign: 'right', fontWeight: 500 }}>{r.contractValue > 0 ? fmt(r.contractValue) : '—'}</td>
                                                        <td style={{ ...td, textAlign: 'right', color: '#16a34a' }}>{r.paidByCustomer > 0 ? fmt(r.paidByCustomer) : '—'}</td>
                                                        <td style={{ ...td, textAlign: 'right' }}>
                                                            {r.remainReceivable > 0 ? (
                                                                <span style={{ color: overdueRemain ? '#dc2626' : '#d97706', fontWeight: 600 }}>
                                                                    {fmt(r.remainReceivable)}{overdueRemain && ' ⚠️'}
                                                                </span>
                                                            ) : <span style={{ color: '#9ca3af' }}>—</span>}
                                                        </td>
                                                        <td style={{ ...td, textAlign: 'right', color: '#dc2626' }}>{r.totalCost > 0 ? fmt(r.totalCost) : '—'}</td>
                                                        <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: r.grossProfit >= 0 ? '#16a34a' : '#dc2626' }}>
                                                            {r.contractValue > 0 ? (r.grossProfit >= 0 ? '' : '-') + fmt(Math.abs(r.grossProfit)) : '—'}
                                                        </td>
                                                        <td style={{ ...td, textAlign: 'right' }}>
                                                            {r.contractValue > 0 && <MarginBadge margin={r.margin} />}
                                                        </td>
                                                        <td style={{ ...td, textAlign: 'center' }}>
                                                            <Link href={`/projects/${r.code}`} title="Xem dự án" style={{ color: '#6b7280', display: 'inline-flex' }}>
                                                                <ExternalLink size={14} />
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        {/* Subtotal row */}
                                        <tfoot style={{ background: '#f9fafb', fontWeight: 700, borderTop: '2px solid #e5e7eb' }}>
                                            <tr>
                                                <td style={td} colSpan={3}>Tổng {group.label} ({rows.length})</td>
                                                <td style={{ ...td, textAlign: 'right' }}>{fmt(subTotal.contractValue)}</td>
                                                <td style={{ ...td, textAlign: 'right', color: '#16a34a' }}>{fmt(subTotal.paidByCustomer)}</td>
                                                <td style={{ ...td, textAlign: 'right', color: '#d97706' }}>{subTotal.remainReceivable > 0 ? fmt(subTotal.remainReceivable) : '—'}</td>
                                                <td style={{ ...td, textAlign: 'right', color: '#dc2626' }}>{fmt(subTotal.totalCost)}</td>
                                                <td style={{ ...td, textAlign: 'right', color: subTotal.grossProfit >= 0 ? '#16a34a' : '#dc2626' }}>
                                                    {(subTotal.grossProfit >= 0 ? '' : '-') + fmt(Math.abs(subTotal.grossProfit))}
                                                </td>
                                                <td style={td} colSpan={2}><MarginBadge margin={avgMargin} /></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        );
                    })}

                    {/* Grand total */}
                    {filteredRows.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, padding: '16px 0', borderTop: '2px solid #e5e7eb' }}>
                            {[
                                { label: 'Tổng giá trị HĐ', val: filteredRows.reduce((s, r) => s + r.contractValue, 0), color: '#3b82f6' },
                                { label: 'Đã thu', val: filteredRows.reduce((s, r) => s + r.paidByCustomer, 0), color: '#16a34a' },
                                { label: 'Còn phải thu', val: filteredRows.reduce((s, r) => s + r.remainReceivable, 0), color: '#d97706' },
                                { label: 'Tổng chi', val: filteredRows.reduce((s, r) => s + r.totalCost, 0), color: '#dc2626' },
                                { label: 'Lợi nhuận', val: filteredRows.reduce((s, r) => s + r.grossProfit, 0), color: filteredRows.reduce((s, r) => s + r.grossProfit, 0) >= 0 ? '#16a34a' : '#dc2626' },
                            ].map(k => (
                                <div key={k.label} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px' }}>
                                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Grand Total — {k.label}</div>
                                    <div style={{ fontWeight: 700, fontSize: 15, color: k.color }}>{fmt(k.val)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            <div style={{ marginTop: 12, fontSize: 11, color: '#9ca3af' }}>
                * Lợi nhuận = Đã thu − (Chi nhà thầu + Mua hàng đã trả + Chi phí DA) &nbsp;|&nbsp; Nhóm theo HĐ có giá trị lớn nhất &nbsp;|&nbsp; Cảnh báo: margin &lt; 10%
            </div>

            {drawerProjectId && (
                <ProjectFinanceDrawer
                    projectId={drawerProjectId}
                    onClose={() => setDrawerProjectId(null)}
                />
            )}

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

function SummaryCard({ icon, label, value, color, sub }) {
    return (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ background: color + '18', borderRadius: 8, padding: 8, color }}>{icon}</div>
            <div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{value}</div>
                {sub && <div style={{ fontSize: 11, color }}>{sub}</div>}
            </div>
        </div>
    );
}

function MarginBadge({ margin }) {
    const color = margin < 0 ? '#dc2626' : margin < 10 ? '#d97706' : margin < 20 ? '#2563eb' : '#16a34a';
    return (
        <span style={{ background: color + '18', color, padding: '2px 8px', borderRadius: 20, fontWeight: 700, fontSize: 12 }}>
            {margin}%
        </span>
    );
}

const th = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' };
const td = { padding: '10px 12px', verticalAlign: 'middle' };
