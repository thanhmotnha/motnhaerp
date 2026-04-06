'use client';
import { useState } from 'react';
import { fmtVND } from '@/lib/projectUtils';
import { apiFetch } from '@/lib/fetchClient';
import PoBulkFromQuotationModal from '@/components/PoBulkFromQuotationModal';

export default function MaterialTab({ project: p, projectId, onRefresh }) {
    const [selectedPlans, setSelectedPlans] = useState([]);
    const [showPOModal, setShowPOModal] = useState(false);
    const [poForm, setPoForm] = useState({ supplier: '', supplierId: '', deliveryDate: '', notes: '', deliveryType: 'Giao thẳng dự án', deliveryAddress: '' });
    const [poItems, setPoItems] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [savingPO, setSavingPO] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);

    const materials = (p.materialPlans || []).filter(m => m.costType !== 'Thầu phụ');
    const totalBudget = materials.reduce((s, m) => s + (Number(m.totalAmount) || 0), 0);
    const needOrder = materials.filter(m => m.status === 'Chưa đặt' || m.status === 'Đặt một phần').length;
    const overBudget = materials.filter(m => m.receivedQty > m.quantity).length;

    const importFromQuotation = async () => {
        if (!confirm('Tạo dự toán vật tư từ báo giá mới nhất?')) return;
        try {
            await apiFetch(`/api/projects/${projectId}/material-plans/import-quotation`, { method: 'POST' });
            onRefresh();
        } catch (err) {
            alert(err.message || 'Không thể import');
        }
    };

    const deletePlan = async (id) => {
        if (!confirm('Xóa hạng mục này?')) return;
        await apiFetch(`/api/material-plans/${id}`, { method: 'DELETE' });
        onRefresh();
    };

    const openPOModal = async () => {
        if (suppliers.length === 0) {
            const res = await fetch('/api/suppliers?limit=500');
            const json = await res.json();
            setSuppliers(json.data || json || []);
        }
        const selected = selectedPlans.length > 0
            ? materials.filter(m => selectedPlans.includes(m.id))
            : materials.filter(m => m.status === 'Chưa đặt' || m.status === 'Đặt một phần');
        setPoItems(selected.map(m => ({
            productName: m.product?.name || '',
            unit: m.product?.unit || '',
            quantity: m.quantity - m.orderedQty,
            unitPrice: m.unitPrice || 0,
            amount: (m.quantity - m.orderedQty) * (m.unitPrice || 0),
            productId: m.productId,
            _mpId: m.id,
        })));
        setPoForm({ supplier: '', supplierId: '', deliveryDate: '', notes: '', deliveryType: 'Giao thẳng dự án', deliveryAddress: p.address || '' });
        setShowPOModal(true);
    };

    const createPO = async () => {
        if (!poForm.supplier.trim()) return alert('Nhập tên nhà cung cấp!');
        if (poItems.length === 0) return alert('Không có vật tư để đặt!');
        setSavingPO(true);
        try {
            await apiFetch('/api/purchase-orders', {
                method: 'POST',
                body: { ...poForm, projectId, items: poItems, materialPlanIds: poItems.map(i => i._mpId) },
            });
        } catch (err) {
            setSavingPO(false);
            return alert(err.message || 'Lỗi tạo PO');
        }
        setSavingPO(false);
        setShowPOModal(false);
        setSelectedPlans([]);
        onRefresh();
    };

    const toggleSelect = (id) => setSelectedPlans(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const toggleAll = (checked) => {
        const eligible = materials.filter(m => m.status === 'Chưa đặt' || m.status === 'Đặt một phần').map(m => m.id);
        setSelectedPlans(checked ? eligible : []);
    };

    return (
        <div>
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 16 }}>
                <div className="stat-card"><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--status-info)' }}>{fmtVND(totalBudget)}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng dự toán</div></div>
                <div className="stat-card"><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--status-warning)' }}>{needOrder}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cần đặt thêm</div></div>
                <div className="stat-card"><div style={{ fontSize: 18, fontWeight: 700, color: overBudget > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>{overBudget}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Vượt dự toán</div></div>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">🧱 Dự toán vật tư</span>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {(p.quotations?.length || 0) > 0 && (
                            <button className="btn btn-ghost btn-sm" onClick={importFromQuotation}>📋 Tạo từ Báo giá</button>
                        )}
                        {(p.quotations?.length || 0) > 0 && (
                            <button className="btn btn-sm" onClick={() => setShowBulkModal(true)}>📋 Tạo PO từ Báo giá</button>
                        )}
                        {needOrder > 0 && (
                            <button className="btn btn-primary btn-sm" onClick={openPOModal}>
                                🛒 Tạo PO {selectedPlans.length > 0 ? `(${selectedPlans.length} vật tư)` : `(${needOrder} vật tư)`}
                            </button>
                        )}
                    </div>
                </div>

                {materials.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có dự toán vật tư</div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 32 }}>
                                        <input type="checkbox"
                                            checked={selectedPlans.length > 0 && selectedPlans.length === materials.filter(m => m.status === 'Chưa đặt' || m.status === 'Đặt một phần').length}
                                            onChange={e => toggleAll(e.target.checked)}
                                        />
                                    </th>
                                    <th>Hạng mục</th>
                                    <th>SL cần</th>
                                    <th>Đã đặt</th>
                                    <th>Đã nhận</th>
                                    <th>Còn thiếu</th>
                                    <th>Đơn giá</th>
                                    <th>Trạng thái</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {materials.map(m => {
                                    const missing = m.quantity - m.receivedQty;
                                    const canOrder = m.status === 'Chưa đặt' || m.status === 'Đặt một phần';
                                    const over = m.receivedQty > m.quantity;
                                    return (
                                        <tr key={m.id} style={{ background: over ? 'rgba(239,68,68,0.06)' : '' }}>
                                            <td>{canOrder && <input type="checkbox" checked={selectedPlans.includes(m.id)} onChange={() => toggleSelect(m.id)} />}</td>
                                            <td>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>{m.product?.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.product?.code}</div>
                                                {over && <div style={{ fontSize: 11, color: 'var(--status-danger)', fontWeight: 600 }}>⚠ Nhận vượt {m.receivedQty - m.quantity} {m.product?.unit}</div>}
                                            </td>
                                            <td>{m.quantity} <span style={{ fontSize: 11, opacity: 0.6 }}>{m.product?.unit}</span></td>
                                            <td style={{ color: 'var(--status-info)' }}>{m.orderedQty}</td>
                                            <td style={{ color: over ? 'var(--status-danger)' : 'var(--status-success)', fontWeight: 600 }}>{m.receivedQty}</td>
                                            <td style={{ color: missing > 0 ? 'var(--status-danger)' : 'var(--status-success)', fontWeight: 700 }}>{missing > 0 ? missing : '✓'}</td>
                                            <td style={{ fontSize: 12 }}>{fmtVND(m.unitPrice)}</td>
                                            <td>
                                                <span className={`badge ${m.status === 'Đã nhận đủ' || m.status === 'Đã đặt đủ' ? 'success' : m.status?.includes('một phần') ? 'warning' : 'danger'}`} style={{ fontSize: 11 }}>
                                                    {m.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <a href={`/purchasing?projectId=${projectId}&mpId=${m.id}`} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} title="Yêu cầu vật tư">📋 YC</a>
                                                    {m.orderedQty === 0 && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--status-danger)' }} onClick={() => deletePlan(m.id)}>🗑</button>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showPOModal && (
                <div className="modal-overlay" onClick={() => setShowPOModal(false)}>
                    <div className="modal" style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Tạo đơn mua hàng</h3>
                            <button className="modal-close" onClick={() => setShowPOModal(false)}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nhà cung cấp *</label>
                                    <input className="form-input" placeholder="Tên nhà cung cấp" value={poForm.supplier}
                                        onChange={e => setPoForm({ ...poForm, supplier: e.target.value })} list="supplier-list" />
                                    <datalist id="supplier-list">
                                        {suppliers.map(s => <option key={s.id} value={s.name} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ngày giao dự kiến</label>
                                    <input className="form-input" type="date" value={poForm.deliveryDate} onChange={e => setPoForm({ ...poForm, deliveryDate: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Địa chỉ giao hàng</label>
                                <input className="form-input" value={poForm.deliveryAddress} onChange={e => setPoForm({ ...poForm, deliveryAddress: e.target.value })} />
                            </div>
                            <table className="data-table" style={{ fontSize: 12 }}>
                                <thead><tr><th>Vật tư</th><th>ĐVT</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
                                <tbody>
                                    {poItems.map((item, i) => (
                                        <tr key={i}>
                                            <td>{item.productName}</td>
                                            <td>{item.unit}</td>
                                            <td>
                                                <input type="number" className="form-input" style={{ width: 64, padding: '4px 6px', fontSize: 12 }} value={item.quantity}
                                                    onChange={e => setPoItems(prev => { const n = [...prev]; n[i] = { ...n[i], quantity: Number(e.target.value), amount: Number(e.target.value) * n[i].unitPrice }; return n; })} />
                                            </td>
                                            <td>{fmtVND(item.unitPrice)}</td>
                                            <td style={{ fontWeight: 600 }}>{fmtVND(item.amount)}</td>
                                        </tr>
                                    ))}
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>Tổng cộng:</td>
                                        <td style={{ fontWeight: 700 }}>{fmtVND(poItems.reduce((s, i) => s + i.amount, 0))}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <textarea className="form-input" rows={2} placeholder="Ghi chú..." value={poForm.notes} onChange={e => setPoForm({ ...poForm, notes: e.target.value })} />
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost" onClick={() => setShowPOModal(false)}>Hủy</button>
                                <button className="btn btn-primary" onClick={createPO} disabled={savingPO}>
                                    {savingPO ? 'Đang tạo...' : 'Tạo đơn mua hàng'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <PoBulkFromQuotationModal
                open={showBulkModal}
                onClose={() => setShowBulkModal(false)}
                prefillProjectId={projectId}
                onSuccess={() => { setShowBulkModal(false); onRefresh(); }}
            />
        </div>
    );
}
