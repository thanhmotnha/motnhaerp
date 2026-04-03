'use client';
import { useState, useEffect, useCallback } from 'react';
import { X, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { apiFetch } from '@/lib/fetchClient';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));

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
    const { revenue, costs, profitability } = data;
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
        </div>
    );
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
