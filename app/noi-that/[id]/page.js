'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/fetchClient';
import OverviewTab from './tabs/OverviewTab';
import CncFilesTab from './tabs/CncFilesTab';
import MaterialOrdersTab from './tabs/MaterialOrdersTab';
import AcceptanceTab from './tabs/AcceptanceTab';
import HoSoTab from './tabs/HoSoTab';

const TABS = [
    { key: 'overview', label: 'Tổng quan', icon: '📋' },
    { key: 'hoso', label: 'Hồ sơ & Công năng', icon: '📐' },
    { key: 'cnc', label: 'File CNC', icon: '🔧' },
    { key: 'materials', label: 'Vật liệu', icon: '📦' },
    { key: 'acceptance', label: 'Nghiệm thu', icon: '✅' },
];

const STATUS_STEPS = [
    { key: 'draft', label: 'Nháp' },
    { key: 'confirmed', label: 'Xác nhận' },
    { key: 'material_confirmed', label: 'Chốt VL' },
    { key: 'material_ordered', label: 'Đặt VL' },
    { key: 'cnc_ready', label: 'CNC' },
    { key: 'in_production', label: 'Sản xuất' },
    { key: 'installing', label: 'Lắp đặt' },
    { key: 'warranty', label: 'Bảo hành' },
];

export default function FurnitureOrderDetailPage() {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');

    const fetchOrder = useCallback(async () => {
        try {
            const data = await apiFetch(`/api/furniture-orders/${id}`);
            setOrder(data);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchOrder(); }, [fetchOrder]);

    if (loading || !order) {
        return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;
    }

    const stepIdx = STATUS_STEPS.findIndex(s => s.key === order.status);

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ marginBottom: 20 }}>
                <a href="/noi-that" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>← Danh sách</a>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🪵 {order.name}</h1>
                    <code style={{ fontSize: 13, color: 'var(--text-muted)' }}>{order.code}</code>
                </div>
                {order.project && (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                        Dự án: <a href={`/projects/${order.projectId}`}>{order.project.name}</a>
                    </div>
                )}
            </div>

            {/* Step indicator */}
            <div style={{ display: 'flex', marginBottom: 24, overflowX: 'auto' }}>
                {STATUS_STEPS.map((step, i) => (
                    <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 70 }}>
                        <div style={{
                            textAlign: 'center', fontSize: 11, padding: '6px 4px', flex: 1,
                            background: i < stepIdx ? 'var(--status-success)' : i === stepIdx ? 'var(--status-info)' : 'var(--bg-secondary)',
                            color: i <= stepIdx ? '#fff' : 'var(--text-muted)',
                            borderRadius: i === 0 ? '6px 0 0 6px' : i === STATUS_STEPS.length - 1 ? '0 6px 6px 0' : 0,
                            fontWeight: i === stepIdx ? 700 : 400,
                        }}>
                            {step.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        style={{
                            padding: '8px 16px', fontSize: 13, border: 'none', cursor: 'pointer',
                            background: 'none', borderBottom: tab === t.key ? '2px solid var(--status-info)' : '2px solid transparent',
                            color: tab === t.key ? 'var(--status-info)' : 'var(--text-secondary)',
                            fontWeight: tab === t.key ? 600 : 400,
                        }}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {tab === 'overview' && <OverviewTab order={order} onRefresh={fetchOrder} />}
            {tab === 'hoso' && <HoSoTab orderId={id} order={order} onRefresh={fetchOrder} />}
            {tab === 'cnc' && <CncFilesTab orderId={id} order={order} onRefresh={fetchOrder} />}
            {tab === 'materials' && <MaterialOrdersTab orderId={id} order={order} onRefresh={fetchOrder} />}
            {tab === 'acceptance' && <AcceptanceTab orderId={id} order={order} onRefresh={fetchOrder} />}
        </div>
    );
}
