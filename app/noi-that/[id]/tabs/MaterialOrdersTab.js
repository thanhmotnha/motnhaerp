'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/fetchClient';

const TYPE_CONFIG = {
    VAN: { label: 'Ván sản xuất', icon: '🪵', unit: 'tờ' },
    NEP: { label: 'Nẹp chỉ', icon: '📏', unit: 'mét' },
    ACRYLIC: { label: 'Cánh Acrylic', icon: '✨', unit: 'tờ' },
};
const STATUS_BADGE = { DRAFT: 'secondary', ORDERED: 'info', RECEIVED: 'success' };
const STATUS_LABEL = { DRAFT: 'Chưa đặt', ORDERED: 'Đã đặt', RECEIVED: 'Đã nhận' };

const emptyItem = () => ({ name: '', colorCode: '', thickness: '', quantity: 0, unit: '', unitPrice: 0, notes: '' });

const guessType = (applicationArea, materialName) => {
    const s = ((applicationArea || '') + ' ' + (materialName || '')).toLowerCase();
    if (s.includes('acrylic')) return 'ACRYLIC';
    if (s.includes('nẹp') || s.includes('neo chỉ') || s.includes('nep')) return 'NEP';
    return 'VAN';
};

export default function MaterialOrdersTab({ orderId, order, onRefresh }) {
    const [materialOrders, setMaterialOrders] = useState({ VAN: null, NEP: null, ACRYLIC: null });
    const [editType, setEditType] = useState(null);
    const [editItems, setEditItems] = useState([]);
    const [saving, setSaving] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importRows, setImportRows] = useState([]); // { ...item, assignedType }
    const [importing, setImporting] = useState(false);
    const [showPoModal, setShowPoModal] = useState(false);
    const [poType, setPoType] = useState(null);
    const [poForm, setPoForm] = useState({ supplier: '', deliveryDate: '', notes: '', deliveryAddress: '' });
    const [suppliers, setSuppliers] = useState([]);
    const [creatingPo, setCreatingPo] = useState(false);

    const fetchMaterialOrders = useCallback(async () => {
        const data = await apiFetch(`/api/furniture-orders/${orderId}/material-orders`);
        setMaterialOrders(data);
    }, [orderId]);

    useEffect(() => { fetchMaterialOrders(); }, [fetchMaterialOrders]);

    const startEdit = (type) => {
        const mo = materialOrders[type];
        setEditItems(mo?.items?.length > 0 ? mo.items.map(i => ({ ...i })) : [emptyItem()]);
        setEditType(type);
    };

    const saveItems = async () => {
        setSaving(true);
        try {
            await apiFetch(`/api/furniture-orders/${orderId}/material-orders/${editType}`, {
                method: 'PUT',
                body: { items: editItems.filter(i => i.name.trim()) },
            });
            setEditType(null);
            await fetchMaterialOrders();
        } catch (err) {
            alert(err.message || 'Lỗi lưu');
        } finally {
            setSaving(false);
        }
    };

    const openPoModal = async (type) => {
        if (suppliers.length === 0) {
            const d = await apiFetch('/api/suppliers?limit=500');
            setSuppliers(d.data || []);
        }
        setPoType(type);
        setPoForm({ supplier: '', deliveryDate: '', notes: '', deliveryAddress: order.deliveryAddress || '' });
        setShowPoModal(true);
    };

    const createPo = async () => {
        if (!poForm.supplier.trim()) return alert('Nhập tên nhà cung cấp!');
        setCreatingPo(true);
        try {
            await apiFetch(`/api/furniture-orders/${orderId}/material-orders/${poType}/create-po`, {
                method: 'POST',
                body: poForm,
            });
            setShowPoModal(false);
            await fetchMaterialOrders();
            onRefresh();
        } catch (err) {
            alert(err.message || 'Lỗi tạo PO');
        } finally {
            setCreatingPo(false);
        }
    };

    const openImportModal = () => {
        const allItems = (order.materialSelections || [])
            .flatMap(sel => sel.items || [])
            .map(it => ({ ...it, assignedType: guessType(it.applicationArea, it.materialName) }));
        if (allItems.length === 0) return alert('Chưa có vật liệu nào được chốt. Hãy vào tab Chốt VL trước.');
        setImportRows(allItems);
        setShowImportModal(true);
    };

    const submitImport = async () => {
        setImporting(true);
        try {
            const byType = { VAN: [], NEP: [], ACRYLIC: [] };
            importRows.forEach(r => {
                if (r.assignedType && byType[r.assignedType]) {
                    byType[r.assignedType].push({
                        name: r.materialName || r.colorName || '',
                        colorCode: r.colorCode || '',
                        quantity: r.quantity || 0,
                        unit: r.unit || '',
                        unitPrice: r.unitPrice || 0,
                        notes: r.applicationArea || r.notes || '',
                    });
                }
            });
            await Promise.all(
                Object.entries(byType)
                    .filter(([, items]) => items.length > 0)
                    .map(([type, items]) =>
                        apiFetch(`/api/furniture-orders/${orderId}/material-orders/${type}`, {
                            method: 'PUT',
                            body: { items },
                        })
                    )
            );
            setShowImportModal(false);
            await fetchMaterialOrders();
        } catch (err) {
            alert(err.message || 'Lỗi import');
        } finally {
            setImporting(false);
        }
    };

    const updateItem = (idx, field, value) =>
        setEditItems(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: value }; return n; });

    const hasSelectionItems = (order.materialSelections || []).some(s => (s.items || []).length > 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {hasSelectionItems && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" onClick={openImportModal}>
                        📥 Import từ Chốt VL
                    </button>
                </div>
            )}
            {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
                const mo = materialOrders[type];
                const isEditing = editType === type;
                return (
                    <div className="card" key={type}>
                        <div className="card-header">
                            <span className="card-title">{cfg.icon} {cfg.label}</span>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {mo?.status && (
                                    <span className={`badge ${STATUS_BADGE[mo.status] || 'secondary'}`}>
                                        {STATUS_LABEL[mo.status] || mo.status}
                                    </span>
                                )}
                                {mo?.purchaseOrder && (
                                    <a href={`/purchasing`} style={{ fontSize: 12, color: 'var(--status-info)' }} title={mo.purchaseOrder.code}>
                                        📋 {mo.purchaseOrder.code}
                                    </a>
                                )}
                                {!mo?.purchaseOrderId && (
                                    <button className="btn btn-ghost btn-sm"
                                        onClick={() => isEditing ? saveItems() : startEdit(type)}>
                                        {isEditing ? (saving ? 'Đang lưu...' : '💾 Lưu') : '✏️ Sửa'}
                                    </button>
                                )}
                                {!mo?.purchaseOrderId && mo?.items?.length > 0 && !isEditing && (
                                    <button className="btn btn-primary btn-sm" onClick={() => openPoModal(type)}>
                                        🛒 Tạo PO
                                    </button>
                                )}
                            </div>
                        </div>

                        {isEditing ? (
                            <div>
                                <table className="data-table" style={{ fontSize: 12 }}>
                                    <thead>
                                        <tr><th>Tên vật liệu</th><th>Mã màu</th><th>Dày (mm)</th><th>SL</th><th>ĐVT</th><th>Đơn giá</th><th></th></tr>
                                    </thead>
                                    <tbody>
                                        {editItems.map((item, i) => (
                                            <tr key={i}>
                                                <td><input className="form-input" style={{ fontSize: 12 }} value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} /></td>
                                                <td><input className="form-input" style={{ fontSize: 12, width: 70 }} value={item.colorCode} onChange={e => updateItem(i, 'colorCode', e.target.value)} /></td>
                                                <td><input type="number" className="form-input" style={{ fontSize: 12, width: 60 }} value={item.thickness || ''} onChange={e => updateItem(i, 'thickness', e.target.value ? Number(e.target.value) : null)} /></td>
                                                <td><input type="number" className="form-input" style={{ fontSize: 12, width: 60 }} value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} /></td>
                                                <td><input className="form-input" style={{ fontSize: 12, width: 60 }} value={item.unit || cfg.unit} onChange={e => updateItem(i, 'unit', e.target.value)} /></td>
                                                <td><input type="number" className="form-input" style={{ fontSize: 12, width: 90 }} value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))} /></td>
                                                <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)' }} onClick={() => setEditItems(p => p.filter((_, j) => j !== i))}>🗑</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setEditItems(p => [...p, emptyItem()])}>+ Thêm dòng</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setEditType(null)}>Hủy</button>
                                </div>
                            </div>
                        ) : mo?.items?.length > 0 ? (
                            <div className="table-container">
                                <table className="data-table" style={{ fontSize: 13 }}>
                                    <thead><tr><th>Tên vật liệu</th><th>Mã màu</th><th>Dày</th><th>SL</th><th>ĐVT</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
                                    <tbody>
                                        {mo.items.map(item => (
                                            <tr key={item.id}>
                                                <td style={{ fontWeight: 600 }}>{item.name}</td>
                                                <td>{item.colorCode || '—'}</td>
                                                <td>{item.thickness ? `${item.thickness}mm` : '—'}</td>
                                                <td>{item.quantity}</td>
                                                <td>{item.unit || cfg.unit}</td>
                                                <td>{item.unitPrice?.toLocaleString('vi-VN')}</td>
                                                <td style={{ fontWeight: 600 }}>{(item.quantity * item.unitPrice).toLocaleString('vi-VN')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--text-muted)' }}>
                                Chưa có danh sách vật liệu. Nhấn ✏️ Sửa để thêm.
                            </div>
                        )}
                    </div>
                );
            })}

            {showImportModal && (
                <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
                    <div className="modal" style={{ maxWidth: 780, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Import vật liệu từ Chốt VL</h3>
                            <button className="modal-close" onClick={() => setShowImportModal(false)}>×</button>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px' }}>
                            Kiểm tra và phân loại vật liệu trước khi import. Hệ thống đã tự gợi ý loại.
                        </p>
                        <table className="data-table" style={{ fontSize: 12 }}>
                            <thead>
                                <tr><th>Tên vật liệu</th><th>Mã màu</th><th>Khu vực</th><th>SL</th><th>ĐVT</th><th>Đơn giá</th><th>Loại VL</th></tr>
                            </thead>
                            <tbody>
                                {importRows.map((r, i) => (
                                    <tr key={r.id || i}>
                                        <td style={{ fontWeight: 600 }}>{r.materialName || r.colorName}</td>
                                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.colorCode || '—'}</td>
                                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.applicationArea || '—'}</td>
                                        <td>{r.quantity}</td>
                                        <td>{r.unit}</td>
                                        <td>{r.unitPrice?.toLocaleString('vi-VN') || '—'}</td>
                                        <td>
                                            <select className="form-input" style={{ fontSize: 11, width: 100, padding: '2px 6px' }}
                                                value={r.assignedType}
                                                onChange={e => setImportRows(prev => prev.map((x, j) => j === i ? { ...x, assignedType: e.target.value } : x))}>
                                                <option value="VAN">Ván sản xuất</option>
                                                <option value="NEP">Nẹp chỉ</option>
                                                <option value="ACRYLIC">Cánh Acrylic</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                            <button className="btn btn-ghost" onClick={() => setShowImportModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={submitImport} disabled={importing}>
                                {importing ? 'Đang import...' : `📥 Import ${importRows.length} vật liệu`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showPoModal && (
                <div className="modal-overlay" onClick={() => setShowPoModal(false)}>
                    <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Tạo PO — {TYPE_CONFIG[poType]?.label}</h3>
                            <button className="modal-close" onClick={() => setShowPoModal(false)}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nhà cung cấp *</label>
                                <input className="form-input" placeholder="Tên nhà cung cấp" value={poForm.supplier}
                                    onChange={e => setPoForm({ ...poForm, supplier: e.target.value })} list="ncc-list" />
                                <datalist id="ncc-list">
                                    {suppliers.map(s => <option key={s.id} value={s.name} />)}
                                </datalist>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ngày giao</label>
                                    <input type="date" className="form-input" value={poForm.deliveryDate}
                                        onChange={e => setPoForm({ ...poForm, deliveryDate: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Địa chỉ giao</label>
                                    <input className="form-input" value={poForm.deliveryAddress}
                                        onChange={e => setPoForm({ ...poForm, deliveryAddress: e.target.value })} />
                                </div>
                            </div>
                            <textarea className="form-input" rows={2} placeholder="Ghi chú..." value={poForm.notes}
                                onChange={e => setPoForm({ ...poForm, notes: e.target.value })} />
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost" onClick={() => setShowPoModal(false)}>Hủy</button>
                                <button className="btn btn-primary" onClick={createPo} disabled={creatingPo}>
                                    {creatingPo ? 'Đang tạo...' : '🛒 Tạo PO'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
