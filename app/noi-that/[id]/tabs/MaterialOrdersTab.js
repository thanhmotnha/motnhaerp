'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/fetchClient';

const CARD_CONFIG = {
    VAN:     { label: 'VÁN MDF',  icon: '🪵', headerBg: '#dbeafe', headerColor: '#1d4ed8', btnBg: '#1d4ed8' },
    ACRYLIC: { label: 'ACRYLIC',  icon: '✨', headerBg: '#fce7f3', headerColor: '#be185d', btnBg: '#be185d' },
    NEP:     { label: 'NẸP',      icon: '📏', headerBg: '#dcfce7', headerColor: '#16a34a', btnBg: '#16a34a' },
};

const guessType = (applicationArea, materialName) => {
    const s = ((applicationArea || '') + ' ' + (materialName || '')).toLowerCase();
    if (s.includes('acrylic')) return 'ACRYLIC';
    if (s.includes('nẹp') || s.includes('nep')) return 'NEP';
    return 'VAN';
};

export default function MaterialOrdersTab({ orderId, order, onRefresh }) {
    const [materialOrders, setMaterialOrders] = useState({ VAN: null, NEP: null, ACRYLIC: null });
    const [suppliers, setSuppliers] = useState([]);
    const [selectedSuppliers, setSelectedSuppliers] = useState({ VAN: '', NEP: '', ACRYLIC: '' });
    const [creating, setCreating] = useState({ VAN: false, NEP: false, ACRYLIC: false });

    const fetchData = useCallback(async () => {
        const [moData, suppData] = await Promise.all([
            apiFetch(`/api/furniture-orders/${orderId}/material-orders`),
            apiFetch('/api/suppliers?limit=100').then(r => r.data || []).catch(() => []),
        ]);
        setMaterialOrders(moData);
        setSuppliers(suppData);
    }, [orderId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const confirmedSel = (order.materialSelections || [])
        .filter(s => s.status === 'confirmed')
        .sort((a, b) => new Date(b.confirmedAt || 0) - new Date(a.confirmedAt || 0))[0];

    const itemsByType = { VAN: [], ACRYLIC: [], NEP: [] };
    if (confirmedSel?.items) {
        for (const it of confirmedSel.items) {
            const t = guessType(it.applicationArea, it.materialName);
            itemsByType[t].push(it);
        }
    }

    const handleCreatePO = async (type) => {
        const supplierId = selectedSuppliers[type];
        if (!supplierId) return alert('Vui lòng chọn nhà cung cấp');
        setCreating(prev => ({ ...prev, [type]: true }));
        try {
            await apiFetch(
                `/api/furniture-orders/${orderId}/material-orders/${type}/create-po`,
                {
                    method: 'POST',
                    body: {
                        supplier: suppliers.find(s => s.id === supplierId)?.name || supplierId,
                        supplierId,
                    },
                }
            );
            await fetchData();
            onRefresh?.();
        } catch (err) {
            alert(err.message || 'Lỗi tạo PO');
        }
        setCreating(prev => ({ ...prev, [type]: false }));
    };

    if (!confirmedSel) {
        return (
            <div style={{
                background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8,
                padding: '16px 20px', color: '#991b1b', fontSize: 13,
            }}>
                ⚠️ Chưa có vật liệu nào được xác nhận — Vào tab <strong>Vật liệu</strong> để hoàn tất vòng chốt trước.
            </div>
        );
    }

    const totalItems = (confirmedSel.items || []).length;
    const summary = `Vòng ${confirmedSel.selectionRound} — ${totalItems} loại vật liệu`;

    return (
        <div>
            <div style={{
                background: '#fef9c3', border: '1px solid #f59e0b', borderRadius: 8,
                padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#78350f',
            }}>
                ⚡ Pull tự động từ {summary}. Chọn supplier và tạo PO cho từng loại.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {['VAN', 'ACRYLIC', 'NEP'].map(type => {
                    const cfg = CARD_CONFIG[type];
                    const mo = materialOrders[type];
                    const hasPO = !!mo?.purchaseOrderId;
                    const items = itemsByType[type];

                    return (
                        <div key={type} style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ background: cfg.headerBg, padding: '8px 14px', fontWeight: 700, fontSize: 13, color: cfg.headerColor }}>
                                {cfg.icon} {cfg.label}
                            </div>
                            <div style={{ padding: '12px 14px' }}>
                                {items.length === 0 ? (
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>Không có vật liệu loại này.</p>
                                ) : (
                                    <div style={{ marginBottom: 12 }}>
                                        {items.map((it, i) => (
                                            <div key={i} style={{ fontSize: 12, color: '#4b5563', marginBottom: 4 }}>
                                                <span style={{ fontWeight: 600 }}>{it.materialName}</span>
                                                {it.colorName ? ` — ${it.colorName}` : ''}
                                                {it.colorCode ? ` (${it.colorCode})` : ''}
                                                <span style={{ color: 'var(--text-muted)' }}> × {it.quantity} {it.unit}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {hasPO ? (
                                    <a
                                        href={`/purchasing/${mo.purchaseOrderId}`}
                                        style={{
                                            display: 'block', textAlign: 'center',
                                            background: '#dcfce7', color: '#16a34a',
                                            padding: '7px', borderRadius: 6,
                                            fontSize: 12, fontWeight: 700, textDecoration: 'none',
                                        }}
                                    >
                                        ✓ Xem PO đặt hàng →
                                    </a>
                                ) : (
                                    <>
                                        <div style={{ marginBottom: 8 }}>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Nhà cung cấp</div>
                                            <select
                                                value={selectedSuppliers[type]}
                                                onChange={e => setSelectedSuppliers(prev => ({ ...prev, [type]: e.target.value }))}
                                                className="form-input"
                                                style={{ width: '100%', fontSize: 12 }}
                                            >
                                                <option value="">Chọn nhà cung cấp...</option>
                                                {suppliers.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button
                                            onClick={() => handleCreatePO(type)}
                                            disabled={creating[type] || !selectedSuppliers[type] || items.length === 0}
                                            style={{
                                                width: '100%',
                                                background: creating[type] || !selectedSuppliers[type] || items.length === 0
                                                    ? '#9ca3af' : cfg.btnBg,
                                                color: '#fff', border: 'none', padding: '7px',
                                                borderRadius: 6, fontSize: 12, fontWeight: 600,
                                                cursor: creating[type] || !selectedSuppliers[type] || items.length === 0
                                                    ? 'not-allowed' : 'pointer',
                                            }}
                                        >
                                            {creating[type] ? 'Đang tạo...' : 'Tạo PO'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
