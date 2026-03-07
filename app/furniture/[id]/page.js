'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';
import { STATUS_LABEL, STATUS_COLOR, STATUS_NEXT, STATUS_NEXT_LABEL } from '@/components/furniture/constants';
import OverviewTab from '@/components/furniture/OverviewTab';
import ItemsTab from '@/components/furniture/ItemsTab';
import DesignsTab from '@/components/furniture/DesignsTab';
import MaterialsTab from '@/components/furniture/MaterialsTab';
import ProductionTab from '@/components/furniture/ProductionTab';
import PaymentsTab from '@/components/furniture/PaymentsTab';
import HandoverTab from '@/components/furniture/HandoverTab';

const TABS = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'items', label: 'Hạng mục' },
    { id: 'designs', label: 'Thiết kế' },
    { id: 'materials', label: 'Vật liệu' },
    { id: 'production', label: 'Sản xuất' },
    { id: 'payments', label: 'Thanh toán' },
    { id: 'handover', label: 'Bàn giao' },
];

export default function FurnitureDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { role } = useRole();
    const toast = useToast();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');
    const [advancing, setAdvancing] = useState(false);

    const fetchOrder = useCallback(async () => {
        try {
            const data = await apiFetch(`/api/furniture-orders/${id}`);
            setOrder(data);
        } catch (e) { toast.error(e.message); }
        setLoading(false);
    }, [id]);

    useEffect(() => { fetchOrder(); }, [fetchOrder]);

    const advanceStatus = async () => {
        const next = STATUS_NEXT[order.status];
        if (!next) return;
        setAdvancing(true);
        try {
            await apiFetch(`/api/furniture-orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: next }) });
            toast.success(`Chuyển sang: ${STATUS_LABEL[next]}`);
            fetchOrder();
        } catch (e) { toast.error(e.message); }
        setAdvancing(false);
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;
    if (!order) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không tìm thấy đơn hàng</div>;

    const nextStatus = STATUS_NEXT[order.status];
    const isCancelled = order.status === 'cancelled';
    const paidPct = order.confirmedAmount > 0 ? Math.round((order.paidAmount / order.confirmedAmount) * 100) : 0;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <button className="btn btn-secondary" onClick={() => router.push('/furniture')} style={{ padding: '4px 10px', fontSize: 12 }}>← Danh sách</button>
                        <span style={{ fontWeight: 700, fontSize: 18 }}>{order.code}</span>
                        <span className={`badge ${STATUS_COLOR[order.status] || 'muted'}`}>{STATUS_LABEL[order.status] || order.status}</span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{order.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {order.customer?.name} · {order.customer?.phone}
                        {order.project && <> · Dự án: <strong>{order.project.code}</strong></>}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {nextStatus && !isCancelled && (
                        <button className="btn btn-primary" onClick={advanceStatus} disabled={advancing}>
                            {advancing ? 'Đang xử lý...' : STATUS_NEXT_LABEL[order.status]}
                        </button>
                    )}
                    {order.status === 'completed' && <span className="badge success" style={{ alignSelf: 'center' }}>Hoàn thành</span>}
                </div>
            </div>

            {/* Tabs */}
            <div className="tab-bar" style={{ marginBottom: 16 }}>
                {TABS.map(t => (
                    <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
                ))}
            </div>

            {tab === 'overview' && <OverviewTab order={order} paidPct={paidPct} onRefresh={fetchOrder} role={role} toast={toast} />}
            {tab === 'items' && <ItemsTab order={order} onRefresh={fetchOrder} toast={toast} role={role} />}
            {tab === 'designs' && <DesignsTab order={order} onRefresh={fetchOrder} toast={toast} role={role} />}
            {tab === 'materials' && <MaterialsTab order={order} onRefresh={fetchOrder} toast={toast} />}
            {tab === 'production' && <ProductionTab order={order} onRefresh={fetchOrder} toast={toast} role={role} />}
            {tab === 'payments' && <PaymentsTab order={order} onRefresh={fetchOrder} toast={toast} paidPct={paidPct} />}
            {tab === 'handover' && <HandoverTab order={order} onRefresh={fetchOrder} toast={toast} />}
        </div>
    );
}
