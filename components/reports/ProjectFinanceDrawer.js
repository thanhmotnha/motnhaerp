'use client';
import { useState, useEffect, useCallback } from 'react';
import { X, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { apiFetch } from '@/lib/fetchClient';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

export default function ProjectFinanceDrawer({ projectId, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleEsc = useCallback((e) => { if (e.key === 'Escape') onClose(); }, [onClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [handleEsc]);

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        setData(null);
        apiFetch(`/api/reports/project-settlement/${projectId}`)
            .then(d => setData(d))
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [projectId]);

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0,0,0,0.4)',
                }}
            />
            {/* Drawer */}
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1001,
                width: 'min(640px, 100vw)',
                background: 'var(--bg-primary, #fff)',
                boxShadow: '-4px 0 32px rgba(0,0,0,0.15)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
            }}>
                <DrawerHeader data={data} onClose={onClose} />
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                    {loading && <LoadingSkeleton />}
                    {error && <ErrorState message={error} />}
                    {data && <DrawerBody data={data} />}
                </div>
            </div>
        </>
    );
}

function DrawerHeader({ data, onClose }) {
    const p = data?.project;
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid var(--border, #e5e7eb)',
            background: 'var(--bg-secondary, #f9fafb)',
            flexShrink: 0,
        }}>
            <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {p ? `${p.code} — ${p.name}` : 'Đang tải...'}
                </div>
                {p && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary, #6b7280)', marginTop: 2 }}>
                        {p.customer} {p.status && `· ${p.status}`}
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {p && (
                    <Link
                        href={`/reports/settlement/${p.id}`}
                        title="Xem đầy đủ"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 12, color: '#3b82f6', textDecoration: 'none',
                            padding: '4px 10px', border: '1px solid #bfdbfe',
                            borderRadius: 6, background: '#eff6ff',
                        }}
                    >
                        <ExternalLink size={12} /> Xem đầy đủ
                    </Link>
                )}
                <button
                    onClick={onClose}
                    aria-label="Đóng"
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: 6, borderRadius: 8,
                        color: 'var(--text-secondary, #6b7280)',
                    }}
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
}

function DrawerBody({ data }) {
    const { revenue, costs, profitability, details } = data;
    const isProfit = profitability.grossProfit >= 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 4 KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                <KpiCard label="Giá trị HĐ" value={fmt(revenue.totalValue)} color="#3b82f6" sub={revenue.variations > 0 ? `+${fmt(revenue.variations)} phát sinh` : null} />
                <KpiCard label="Đã thu" value={fmt(revenue.received)} color="#16a34a" sub={revenue.outstanding > 0 ? `Còn nợ: ${fmt(revenue.outstanding)}` : 'Đã thu đủ'} subColor={revenue.outstanding > 0 ? '#dc2626' : '#16a34a'} />
                <KpiCard label="Tổng chi phí" value={fmt(costs.totalCost)} color="#dc2626" sub={`PO + Thầu + Chi phí`} />
                <KpiCard
                    label="Lợi nhuận"
                    value={(isProfit ? '' : '-') + fmt(Math.abs(profitability.grossProfit))}
                    color={isProfit ? '#16a34a' : '#dc2626'}
                    sub={`Tỷ suất ${profitability.grossMargin}%`}
                    subColor={isProfit ? '#16a34a' : '#dc2626'}
                    highlight
                />
            </div>

            {/* A / B columns */}
            <SideAB data={data} />

            {/* Profit bar */}
            <ProfitBar profit={profitability.grossProfit} margin={profitability.grossMargin} revenue={revenue.received} />

            {/* Detail: Thầu phụ */}
            {details.contractorPayments?.length > 0 && (
                <DetailSection title="Thầu phụ" count={details.contractorPayments.length} total={fmt(costs.contractorPayments)}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-secondary,#f9fafb)', borderBottom: '1px solid var(--border,#e5e7eb)' }}>
                                <th style={thStyle}>Nhà thầu</th>
                                <th style={thStyle}>Hạng mục</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Giá trị HĐ</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Đã TT</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Giữ lại</th>
                                <th style={thStyle}>TT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {details.contractorPayments.map((cp, i) => (
                                <tr key={cp.id} style={{ borderBottom: '1px solid var(--border,#e5e7eb)', background: i % 2 === 1 ? 'var(--bg-secondary,#f9fafb)' : undefined }}>
                                    <td style={tdStyle}><span style={{ fontWeight: 500 }}>{cp.contractor?.name || '—'}</span></td>
                                    <td style={{ ...tdStyle, color: 'var(--text-muted,#9ca3af)' }}>{cp.phase || '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(cp.contractAmount)}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', color: '#16a34a' }}>{fmt(cp.paidAmount)}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', color: cp.retentionAmount > 0 ? '#b45309' : 'inherit' }}>{cp.retentionAmount > 0 ? fmt(cp.retentionAmount) : '—'}</td>
                                    <td style={tdStyle}><StatusBadge status={cp.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border,#e5e7eb)', background: 'var(--bg-secondary,#f9fafb)' }}>
                                <td style={tdStyle} colSpan={2}>Tổng</td>
                                <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(details.contractorPayments.reduce((s, c) => s + (c.contractAmount || 0), 0))}</td>
                                <td style={{ ...tdStyle, textAlign: 'right', color: '#16a34a' }}>{fmt(details.contractorPayments.reduce((s, c) => s + (c.paidAmount || 0), 0))}</td>
                                <td style={{ ...tdStyle, textAlign: 'right', color: '#b45309' }}>{fmt(details.contractorPayments.reduce((s, c) => s + (c.retentionAmount || 0), 0))}</td>
                                <td />
                            </tr>
                        </tfoot>
                    </table>
                </DetailSection>
            )}

            {/* Detail: Vật tư / PO */}
            {details.purchaseOrders?.length > 0 && (
                <DetailSection title="Vật tư / Đơn hàng (PO)" count={details.purchaseOrders.length} total={fmt(costs.purchaseOrders)}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-secondary,#f9fafb)', borderBottom: '1px solid var(--border,#e5e7eb)' }}>
                                <th style={thStyle}>Mã PO</th>
                                <th style={thStyle}>Nhà cung cấp</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Tổng tiền</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Đã TT</th>
                                <th style={thStyle}>TT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {details.purchaseOrders.map((po, i) => (
                                <tr key={po.id} style={{ borderBottom: '1px solid var(--border,#e5e7eb)', background: i % 2 === 1 ? 'var(--bg-secondary,#f9fafb)' : undefined }}>
                                    <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--text-accent,#3b82f6)' }}>{po.code}</td>
                                    <td style={tdStyle}>{po.supplier || '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(po.totalAmount)}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', color: '#16a34a' }}>{fmt(po.paidAmount)}</td>
                                    <td style={tdStyle}><StatusBadge status={po.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border,#e5e7eb)', background: 'var(--bg-secondary,#f9fafb)' }}>
                                <td style={tdStyle} colSpan={2}>Tổng</td>
                                <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(details.purchaseOrders.reduce((s, p) => s + (p.totalAmount || 0), 0))}</td>
                                <td style={{ ...tdStyle, textAlign: 'right', color: '#16a34a' }}>{fmt(details.purchaseOrders.reduce((s, p) => s + (p.paidAmount || 0), 0))}</td>
                                <td />
                            </tr>
                        </tfoot>
                    </table>
                </DetailSection>
            )}

            {/* Detail: Chi phí phát sinh */}
            {details.expenses?.length > 0 && (
                <DetailSection title="Chi phí phát sinh" count={details.expenses.length} total={fmt(costs.expenses)}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-secondary,#f9fafb)', borderBottom: '1px solid var(--border,#e5e7eb)' }}>
                                <th style={thStyle}>Ngày</th>
                                <th style={thStyle}>Mô tả</th>
                                <th style={thStyle}>Hạng mục</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Số tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {details.expenses.map((e, i) => (
                                <tr key={e.id + i} style={{ borderBottom: '1px solid var(--border,#e5e7eb)', background: i % 2 === 1 ? 'var(--bg-secondary,#f9fafb)' : undefined }}>
                                    <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: 'var(--text-muted,#9ca3af)' }}>{fmtDate(e.date)}</td>
                                    <td style={tdStyle}>{e.description || '—'}</td>
                                    <td style={tdStyle}>{e.category ? <span style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{e.category}</span> : '—'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(e.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border,#e5e7eb)', background: 'var(--bg-secondary,#f9fafb)' }}>
                                <td style={tdStyle} colSpan={3}>Tổng</td>
                                <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(details.expenses.reduce((s, e) => s + (e.amount || 0), 0))}</td>
                            </tr>
                        </tfoot>
                    </table>
                </DetailSection>
            )}
        </div>
    );
}

const thStyle = { padding: '6px 8px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text-secondary,#6b7280)', whiteSpace: 'nowrap' };
const tdStyle = { padding: '7px 8px', verticalAlign: 'middle' };

function DetailSection({ title, count, total, children }) {
    const [open, setOpen] = useState(true);
    return (
        <div style={{ border: '1px solid var(--border,#e5e7eb)', borderRadius: 10, overflow: 'hidden' }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: 'var(--bg-secondary,#f9fafb)',
                    border: 'none', cursor: 'pointer', fontSize: 13,
                }}
            >
                <span style={{ fontWeight: 600 }}>{title} <span style={{ color: 'var(--text-muted,#9ca3af)', fontWeight: 400 }}>({count})</span></span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{total}</span>
                    <span style={{ color: 'var(--text-muted,#9ca3af)' }}>{open ? '▲' : '▼'}</span>
                </span>
            </button>
            {open && <div style={{ overflowX: 'auto' }}>{children}</div>}
        </div>
    );
}

function StatusBadge({ status }) {
    const map = {
        'Đã duyệt': { bg: '#dcfce7', color: '#15803d' },
        'Đã giao': { bg: '#dbeafe', color: '#1d4ed8' },
        'Hoàn thành': { bg: '#f0fdf4', color: '#15803d' },
        'Chờ duyệt': { bg: '#fef9c3', color: '#b45309' },
        'approved': { bg: '#dcfce7', color: '#15803d' },
        'paid': { bg: '#f0fdf4', color: '#15803d' },
    };
    const s = map[status] || { bg: '#f3f4f6', color: '#6b7280' };
    return <span style={{ ...s, padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>{status || '—'}</span>;
}

function KpiCard({ label, value, color, sub, subColor, highlight }) {
    return (
        <div style={{
            background: highlight ? (color + '10') : 'var(--bg-secondary, #f9fafb)',
            border: `1px solid ${highlight ? color + '40' : 'var(--border, #e5e7eb)'}`,
            borderRadius: 10, padding: '12px 14px',
        }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary, #6b7280)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: subColor || 'var(--text-secondary, #6b7280)', marginTop: 2 }}>{sub}</div>}
        </div>
    );
}

function SideAB({ data }) {
    const { details, revenue, costs } = data;

    const poPaid = details.purchaseOrders.reduce((s, p) => s + (p.paidAmount || 0), 0);
    const contractorPaid = details.contractorPayments.reduce((s, c) => s + (c.paidAmount || 0), 0);
    const remaining = (costs.purchaseOrders + costs.contractorPayments) - (poPaid + contractorPaid);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* BÊN A */}
            <div style={{ border: '1px solid #bfdbfe', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ background: '#1d4ed8', color: '#fff', padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>
                    BÊN A — DOANH THU
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {details.contracts.map(c => (
                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: '1px solid #f0f4ff' }}>
                            <span style={{ color: 'var(--text-secondary, #6b7280)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.name}>{c.code}</span>
                            <span style={{ fontWeight: 500 }}>{fmt(c.value)}</span>
                        </div>
                    ))}
                    <SideRow label="Tổng giá trị HĐ" value={fmt(revenue.totalValue)} bold color="#1d4ed8" />
                    <div style={{ height: 8 }} />
                    <SideRow label="✓ Đã thu" value={fmt(revenue.received)} color="#16a34a" bold />
                    {revenue.outstanding > 0 && (
                        <div style={{ background: '#fef3c7', borderRadius: 6, padding: '6px 8px', display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                            <span style={{ color: '#b45309', fontWeight: 600 }}>KH còn nợ</span>
                            <span style={{ color: '#b45309', fontWeight: 700 }}>{fmt(revenue.outstanding)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* BÊN B */}
            <div style={{ border: '1px solid #fecaca', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ background: '#b91c1c', color: '#fff', padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>
                    BÊN B — CHI PHÍ
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {costs.purchaseOrders > 0 && <SideRow label="Nhập vật tư (PO)" value={fmt(costs.purchaseOrders)} />}
                    {costs.contractorPayments > 0 && <SideRow label="Thầu phụ" value={fmt(costs.contractorPayments)} />}
                    {costs.expenses > 0 && <SideRow label="Chi phí phát sinh" value={fmt(costs.expenses)} />}
                    <SideRow label="Tổng chi bên B" value={fmt(costs.totalCost)} bold color="#b91c1c" />
                    {remaining > 0 && (
                        <div style={{ background: '#fef3c7', borderRadius: 6, padding: '6px 8px', display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                            <span style={{ color: '#b45309', fontWeight: 600 }}>Còn phải trả NCC/Thầu</span>
                            <span style={{ color: '#b45309', fontWeight: 700 }}>{fmt(remaining)}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SideRow({ label, value, bold, color }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: '1px solid #f9f9f9' }}>
            <span style={{ color: color || 'var(--text-secondary, #6b7280)', fontWeight: bold ? 700 : 400 }}>{label}</span>
            <span style={{ fontWeight: bold ? 700 : 500, color: color || 'inherit' }}>{value}</span>
        </div>
    );
}

function ProfitBar({ profit, margin, revenue }) {
    const isProfit = profit >= 0;
    const barWidth = revenue > 0 ? Math.min(Math.abs(margin), 100) : 0;
    return (
        <div style={{
            background: isProfit ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${isProfit ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: 10, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
        }}>
            <div style={{ fontWeight: 700, color: isProfit ? '#15803d' : '#dc2626', fontSize: 13, whiteSpace: 'nowrap' }}>
                {isProfit ? '📈' : '📉'} LỢI NHUẬN GỘP
            </div>
            <div style={{ flex: 1, background: isProfit ? '#dcfce7' : '#fee2e2', borderRadius: 4, height: 10, overflow: 'hidden' }}>
                <div style={{ background: isProfit ? '#16a34a' : '#dc2626', height: '100%', width: `${barWidth}%`, transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: isProfit ? '#15803d' : '#dc2626', whiteSpace: 'nowrap' }}>
                {(isProfit ? '' : '-')}{fmt(Math.abs(profit))}đ
            </div>
            <div style={{
                background: isProfit ? '#15803d' : '#dc2626', color: '#fff',
                padding: '3px 10px', borderRadius: 20, fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
            }}>
                {margin}%
            </div>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, opacity: 0.5 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                {[1,2,3,4].map(i => <div key={i} style={{ height: 72, background: 'var(--bg-secondary, #f3f4f6)', borderRadius: 10 }} />)}
            </div>
            <div style={{ height: 160, background: 'var(--bg-secondary, #f3f4f6)', borderRadius: 10 }} />
            <div style={{ height: 52, background: 'var(--bg-secondary, #f3f4f6)', borderRadius: 10 }} />
        </div>
    );
}

function ErrorState({ message }) {
    return (
        <div style={{ padding: 20, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 13 }}>
            Lỗi tải dữ liệu: {message}
        </div>
    );
}
