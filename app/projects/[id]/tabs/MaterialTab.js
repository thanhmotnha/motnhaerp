'use client';
import { useState, useEffect } from 'react';
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
    const [report, setReport] = useState(null);
    const [reportLoading, setReportLoading] = useState(true);
    const [filterCategory, setFilterCategory] = useState('');
    const [filterSource, setFilterSource] = useState('all');

    useEffect(() => {
        let active = true;
        setReportLoading(true);
        apiFetch(`/api/projects/${projectId}/materials-report`)
            .then(d => { if (active) { setReport(d); setReportLoading(false); } })
            .catch(() => { if (active) setReportLoading(false); });
        return () => { active = false; };
    }, [projectId, p?.updatedAt]);

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
            materialPlanId: m.id,
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
                body: { ...poForm, projectId, items: poItems },
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
                <div className="stat-card">
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--status-info)' }}>{fmtVND(report?.summary?.planned || 0)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📋 Dự toán</div>
                </div>
                <div className="stat-card">
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>{fmtVND(report?.summary?.ordered || 0)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>🛒 Đã đặt (giao thẳng)</div>
                </div>
                <div className="stat-card">
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--status-success)' }}>{(report?.summary?.receivedDirectQty || 0) + (report?.summary?.receivedFromStockQty || 0)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📦 Đã nhận (tổng SL)</div>
                </div>
                <div className="stat-card">
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--status-warning)' }}>{report?.summary?.itemCount || 0}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>🔧 Số mã vật tư</div>
                </div>
                <div className="stat-card">
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--status-danger)' }}>{fmtVND(report?.summary?.totalCost || 0)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>💰 Chi phí thực tế</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <select className="form-select form-select-compact" style={{ maxWidth: 200 }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                    <option value="">Tất cả danh mục</option>
                    {Array.from(new Set((report?.items || []).map(i => i.category).filter(Boolean))).sort().map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
                <select className="form-select form-select-compact" style={{ maxWidth: 180 }} value={filterSource} onChange={e => setFilterSource(e.target.value)}>
                    <option value="all">Tất cả nguồn</option>
                    <option value="GT">📍 Chỉ giao thẳng</option>
                    <option value="XK">🏭 Chỉ xuất kho</option>
                </select>
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

                {reportLoading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải báo cáo...</div>
                ) : (report?.items || []).length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có vật tư nào cho dự án này</div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Sản phẩm</th>
                                    <th>ĐVT</th>
                                    <th style={{ textAlign: 'right' }}>Dự toán</th>
                                    <th style={{ textAlign: 'right' }}>Đã đặt</th>
                                    <th style={{ textAlign: 'right' }}>Đã nhận</th>
                                    <th style={{ textAlign: 'right' }}>Đã dùng</th>
                                    <th style={{ textAlign: 'right' }}>Còn thiếu</th>
                                    <th style={{ textAlign: 'center' }}>Nguồn</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(report.items || [])
                                    .filter(it => !filterCategory || it.category === filterCategory)
                                    .filter(it => filterSource === 'all' || it.sources.includes(filterSource))
                                    .map(it => {
                                        const badgeColor = it.missing > 0 ? 'var(--status-danger)' : 'var(--status-success)';
                                        const sourceLabel = it.sources.length === 2 ? '📍+🏭'
                                            : it.sources.includes('GT') ? '📍 GT'
                                            : it.sources.includes('XK') ? '🏭 XK' : '—';
                                        return (
                                            <tr key={`${it.productId || it.name}`}>
                                                <td>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{it.name}</div>
                                                    {it.code && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{it.code}</div>}
                                                </td>
                                                <td style={{ fontSize: 12 }}>{it.unit}</td>
                                                <td style={{ textAlign: 'right', fontSize: 13 }}>{it.planned || '—'}</td>
                                                <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--primary)' }}>{it.ordered || '—'}</td>
                                                <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--status-success)', fontWeight: 600 }}>{it.received || '—'}</td>
                                                <td style={{ textAlign: 'right', fontSize: 13 }}>{it.used || '—'}</td>
                                                <td style={{ textAlign: 'right', fontSize: 13, color: badgeColor, fontWeight: 700 }}>
                                                    {it.missing > 0 ? it.missing : (it.missing < 0 ? `+${-it.missing}` : '✓')}
                                                </td>
                                                <td style={{ textAlign: 'center', fontSize: 11 }}>
                                                    <span className="badge" style={{ background: 'var(--bg-secondary)', padding: '2px 6px' }}>{sourceLabel}</span>
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
