'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/fetchClient';
import HoSoTab from './tabs/HoSoTab';
import CncFilesTab from './tabs/CncFilesTab';
import MaterialSelectionTab from './tabs/MaterialSelectionTab';
import MaterialOrdersTab from './tabs/MaterialOrdersTab';
import IssuesTab from './tabs/IssuesTab';
import AcceptanceTab from './tabs/AcceptanceTab';

const STEPS = [
    { key: 'Xác nhận',      label: 'Xác nhận' },
    { key: 'Chốt & Đặt VL', label: 'Chốt & Đặt VL' },
    { key: 'CNC',            label: 'CNC' },
    { key: 'Sản xuất',       label: 'Sản xuất' },
    { key: 'Lắp đặt',        label: 'Lắp đặt' },
    { key: 'Bảo hành',       label: 'Bảo hành' },
];

function hasPO(order) {
    return Array.isArray(order.materialOrders) &&
        order.materialOrders.some(mo => mo.purchaseOrderId);
}

function getActionBanner(order) {
    const po = hasPO(order);
    const banners = {
        'Xác nhận':      { msg: 'Chốt vật liệu với khách hàng', btn: '→ Thêm vòng chốt', tab: 'materials' },
        'Chốt & Đặt VL': po
            ? { msg: 'PO đã tạo — Chờ nhận hàng, sau đó chuyển sang CNC', btn: '→ Xem PO', tab: 'orders' }
            : { msg: 'Vật liệu đã chốt — Chưa có PO đặt hàng nào', btn: '→ Tạo PO đặt hàng', tab: 'orders' },
        'CNC':           { msg: 'Upload file CNC và xác nhận số tấm', btn: '→ Upload CNC', tab: 'cnc' },
        'Sản xuất':      { msg: 'Đang sản xuất — Cập nhật tiến độ', btn: null, tab: 'materials' },
        'Lắp đặt':       { msg: 'Lắp đặt xong → Tạo biên bản nghiệm thu', btn: '→ Tạo nghiệm thu', tab: 'acceptance' },
        'Bảo hành':      { msg: 'Theo dõi bảo hành', btn: null, tab: 'acceptance' },
    };
    return banners[order.status] || null;
}

function getDefaultTab(order) {
    const po = hasPO(order);
    const map = {
        'Xác nhận':      'materials',
        'Chốt & Đặt VL': po ? 'materials' : 'orders',
        'CNC':           'cnc',
        'Sản xuất':      'materials',
        'Lắp đặt':       'acceptance',
        'Bảo hành':      'acceptance',
    };
    return map[order.status] || 'materials';
}

const TABS = [
    { key: 'materials',  label: 'Vật liệu',  icon: '🧱' },
    { key: 'orders',     label: 'Đặt hàng',  icon: '🛒' },
    { key: 'files',      label: 'Hồ sơ',     icon: '📁' },
    { key: 'cnc',        label: 'CNC',        icon: '✂️' },
    { key: 'issues',     label: 'Phát sinh', icon: '⚠️' },
    { key: 'acceptance', label: 'Nghiệm thu', icon: '📋' },
];

export default function FurnitureOrderDetailPage() {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState(null);

    const fetchOrder = useCallback(async () => {
        try {
            const data = await apiFetch(`/api/furniture-orders/${id}`);
            setOrder(data);
            setTab(prev => prev ?? getDefaultTab(data));
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchOrder(); }, [fetchOrder]);

    if (loading || !order) {
        return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;
    }

    const stepIdx = STEPS.findIndex(s => s.key === order.status);
    const banner = getActionBanner(order);

    return (
        <div>
            {/* Header bar */}
            <div style={{
                background: '#1e3a8a', color: '#fff',
                padding: '10px 20px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <a href="/noi-that" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13 }}>← Nội thất</a>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{order.code} — {order.name}</span>
                    {order.customer && (
                        <span style={{
                            background: 'rgba(255,255,255,0.15)', padding: '2px 10px',
                            borderRadius: 12, fontSize: 12,
                        }}>{order.customer.name}</span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {order.expectedDelivery && (
                        <span style={{ fontSize: 12, opacity: 0.8 }}>
                            Giao: {new Date(order.expectedDelivery).toLocaleDateString('vi-VN')}
                        </span>
                    )}
                    <span style={{
                        background: '#16a34a', padding: '3px 12px',
                        borderRadius: 12, fontSize: 11, fontWeight: 600,
                    }}>{order.status}</span>
                </div>
            </div>

            {/* Step bar */}
            <div style={{ background: '#eff6ff', padding: '10px 20px', display: 'flex', alignItems: 'center', overflowX: 'auto' }}>
                {STEPS.map((step, i) => {
                    const done = i < stepIdx;
                    const active = i === stepIdx;
                    return (
                        <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 80 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{
                                    width: 26, height: 26, borderRadius: '50%',
                                    background: done ? '#16a34a' : active ? '#1d4ed8' : '#e5e7eb',
                                    color: done || active ? '#fff' : '#9ca3af',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                                }}>
                                    {done ? '✓' : i + 1}
                                </div>
                                <span style={{
                                    fontSize: 10, fontWeight: active ? 700 : 400,
                                    color: done ? '#16a34a' : active ? '#1d4ed8' : '#9ca3af',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {step.label}
                                </span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div style={{
                                    flex: 1, height: 2, margin: '0 8px',
                                    background: done ? '#16a34a' : '#e5e7eb',
                                }} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Action banner */}
            {banner && (
                <div style={{
                    background: '#fefce8', borderLeft: '3px solid #f59e0b',
                    padding: '8px 20px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <div>
                        <span style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>⚡ Bước tiếp theo: </span>
                        <span style={{ fontSize: 12, color: '#78350f' }}>{banner.msg}</span>
                    </div>
                    {banner.btn && (
                        <button
                            onClick={() => setTab(banner.tab)}
                            style={{
                                background: '#f59e0b', color: '#fff', border: 'none',
                                padding: '5px 14px', borderRadius: 5, fontSize: 12,
                                fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                            }}
                        >
                            {banner.btn}
                        </button>
                    )}
                </div>
            )}

            {/* Tab bar */}
            <div style={{ borderBottom: '2px solid var(--border)', background: '#fff', padding: '0 20px', display: 'flex', gap: 0 }}>
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{
                        padding: '9px 16px', fontSize: 13, border: 'none', cursor: 'pointer',
                        background: 'none',
                        borderBottom: tab === t.key ? '2px solid #1d4ed8' : '2px solid transparent',
                        color: tab === t.key ? '#1d4ed8' : 'var(--text-secondary)',
                        fontWeight: tab === t.key ? 700 : 400,
                        marginBottom: -2,
                    }}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div style={{ padding: '20px' }}>
                {tab === 'materials'  && <MaterialSelectionTab orderId={id} order={order} onRefresh={fetchOrder} />}
                {tab === 'orders'     && <MaterialOrdersTab orderId={id} order={order} onRefresh={fetchOrder} />}
                {tab === 'files'      && <HoSoTab orderId={id} order={order} onRefresh={fetchOrder} />}
                {tab === 'cnc'        && <CncFilesTab orderId={id} order={order} onRefresh={fetchOrder} />}
                {tab === 'issues'     && <IssuesTab orderId={id} order={order} />}
                {tab === 'acceptance' && <AcceptanceTab orderId={id} order={order} onRefresh={fetchOrder} />}
            </div>
        </div>
    );
}
