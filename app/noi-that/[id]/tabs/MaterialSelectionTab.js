'use client';
import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/fetchClient';

const STATUS_MAP = {
    pending: { label: 'Chờ chốt', badge: 'warning' },
    confirmed: { label: 'Đã chốt', badge: 'success' },
    changed: { label: 'Đã thay đổi', badge: 'secondary' },
};

const QUICK_ADD = [
    { label: '+ Nẹp nhôm', materialName: 'Nẹp nhôm', unit: 'm' },
    { label: '+ Acrylic', materialName: 'Acrylic', unit: 'tờ' },
    { label: '+ Tay nắm', materialName: 'Tay nắm', unit: 'cái' },
    { label: '+ Bản lề', materialName: 'Bản lề', unit: 'cái' },
    { label: '+ Ray hộp', materialName: 'Ray hộp', unit: 'bộ' },
    { label: '+ Phụ kiện', materialName: 'Phụ kiện', unit: 'cái' },
];

const emptyRow = () => ({
    productId: null, materialName: '', colorCode: '', colorName: '',
    swatchImageUrl: '', applicationArea: '', quantity: 1, unit: 'tờ', notes: '',
});

export default function MaterialSelectionTab({ orderId, order, onRefresh }) {
    const [selections, setSelections] = useState(order.materialSelections || []);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [creating, setCreating] = useState(false);

    // Ván picker
    const [vanPicker, setVanPicker] = useState(null); // row index
    const [vanSearch, setVanSearch] = useState('');
    const [vanResults, setVanResults] = useState([]);
    const [vanLoading, setVanLoading] = useState(false);
    const vanSearchRef = useRef(null);
    const vanTimer = useRef(null);

    // applicationArea suggestions from order items
    const areaSuggestions = (order.items || []).map(i => i.name).filter(Boolean);

    // ── Selections list ──────────────────────────────────────
    const createNew = async () => {
        setCreating(true);
        try {
            const round = selections.length + 1;
            const sel = await apiFetch(`/api/furniture-orders/${orderId}/material-selections`, {
                method: 'POST', body: { title: `Đợt chốt vật liệu ${round}`, items: [] },
            });
            setSelections(prev => [sel, ...prev]);
            openEditor(sel);
        } catch (err) { alert(err.message || 'Lỗi tạo đợt chốt'); }
        setCreating(false);
    };

    const openEditor = (sel) => {
        setEditingId(sel.id);
        setEditForm({
            title: sel.title || '',
            presentedBy: sel.presentedBy || '',
            notes: sel.notes || '',
            items: (sel.items || []).map(it => ({ ...it })),
        });
    };

    const closeEditor = () => { setEditingId(null); setEditForm(null); };

    const deleteSel = async (selId) => {
        if (!confirm('Xóa đợt chốt này?')) return;
        await apiFetch(`/api/furniture-orders/${orderId}/material-selections/${selId}`, { method: 'DELETE' });
        setSelections(prev => prev.filter(s => s.id !== selId));
        if (editingId === selId) closeEditor();
    };

    // ── Items editing ────────────────────────────────────────
    const addRow = (template = {}) => {
        setEditForm(f => ({ ...f, items: [...f.items, { ...emptyRow(), ...template }] }));
    };

    const addVanRow = () => {
        const idx = editForm.items.length;
        setEditForm(f => ({ ...f, items: [...f.items, { ...emptyRow(), materialName: 'Ván MFC', unit: 'tờ' }] }));
        openVanPicker(idx);
    };

    const updateItem = (idx, updates) => {
        setEditForm(f => {
            const items = [...f.items];
            items[idx] = { ...items[idx], ...updates };
            return { ...f, items };
        });
    };

    const removeItem = (idx) => {
        setEditForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
    };

    // Import từ đơn hàng: add ván rows pre-filled with order item names as applicationArea
    const importFromOrder = () => {
        if (!areaSuggestions.length) return alert('Đơn hàng không có hạng mục nào.');
        const newRows = areaSuggestions.map(name => ({
            ...emptyRow(), materialName: 'Ván MFC', applicationArea: name,
        }));
        setEditForm(f => ({ ...f, items: [...f.items, ...newRows] }));
    };

    // ── Save/Confirm ──────────────────────────────────────────
    const saveItems = async () => {
        setSaving(true);
        try {
            const updated = await apiFetch(
                `/api/furniture-orders/${orderId}/material-selections/${editingId}`,
                { method: 'PATCH', body: editForm }
            );
            setSelections(prev => prev.map(s => s.id === editingId ? updated : s));
        } catch (err) { alert(err.message || 'Lỗi lưu'); }
        setSaving(false);
    };

    const confirmSelection = async () => {
        if (!confirm('Chốt vật liệu đợt này? Không thể chỉnh sửa sau khi chốt.')) return;
        setConfirming(true);
        try {
            // Save items first, then confirm status
            const saved = await apiFetch(
                `/api/furniture-orders/${orderId}/material-selections/${editingId}`,
                { method: 'PATCH', body: editForm }
            );
            const confirmed = await apiFetch(
                `/api/furniture-orders/${orderId}/material-selections/${editingId}`,
                { method: 'PUT', body: { status: 'confirmed' } }
            );
            const final = { ...saved, ...confirmed, items: saved.items };
            setSelections(prev => prev.map(s => s.id === editingId ? final : s));
            closeEditor();
            onRefresh();
        } catch (err) { alert(err.message || 'Lỗi xác nhận'); }
        setConfirming(false);
    };

    // ── Ván picker ───────────────────────────────────────────
    const openVanPicker = (rowIdx) => {
        setVanPicker(rowIdx);
        setVanSearch('');
        setVanResults([]);
        setTimeout(() => vanSearchRef.current?.focus(), 100);
    };

    const handleVanSearchChange = (val) => {
        setVanSearch(val);
        clearTimeout(vanTimer.current);
        if (!val.trim()) { setVanResults([]); return; }
        vanTimer.current = setTimeout(async () => {
            setVanLoading(true);
            try {
                const res = await apiFetch(
                    `/api/products?category=V%C3%A1n%20Th%C3%A1i&search=${encodeURIComponent(val)}&limit=24`
                );
                setVanResults(res.data || []);
            } catch { setVanResults([]); }
            setVanLoading(false);
        }, 300);
    };

    // Load all ván initially when picker opens with empty search
    useEffect(() => {
        if (vanPicker === null) return;
        (async () => {
            setVanLoading(true);
            try {
                const res = await apiFetch(`/api/products?category=V%C3%A1n%20Th%C3%A1i&limit=48`);
                setVanResults(res.data || []);
            } catch { setVanResults([]); }
            setVanLoading(false);
        })();
    }, [vanPicker]);

    const pickVan = (product) => {
        if (vanPicker === null) return;
        updateItem(vanPicker, {
            productId: product.id,
            materialName: product.name,
            colorCode: product.color,
            colorName: product.color,
            swatchImageUrl: product.image,
        });
        setVanPicker(null);
    };

    const editingSel = selections.find(s => s.id === editingId);
    const isConfirmed = editingSel?.status === 'confirmed';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Selection list */}
            <div className="card">
                <div className="card-header">
                    <span className="card-title">🎨 Chốt vật liệu</span>
                    <button className="btn btn-primary btn-sm" onClick={createNew} disabled={creating}>
                        {creating ? '⏳...' : '+ Tạo đợt chốt'}
                    </button>
                </div>

                {selections.length === 0 ? (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        Chưa có đợt chốt vật liệu nào
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                        {selections.map((sel, i) => {
                            const st = STATUS_MAP[sel.status] || STATUS_MAP.pending;
                            const isOpen = editingId === sel.id;
                            return (
                                <div key={sel.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                                    background: isOpen ? 'var(--bg-secondary)' : 'transparent',
                                    borderRadius: 6, border: isOpen ? '1px solid var(--border)' : '1px solid transparent',
                                }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontWeight: 600, fontSize: 14 }}>
                                                Đợt {sel.selectionRound}: {sel.title}
                                            </span>
                                            <span className={`badge ${st.badge}`}>{st.label}</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                            {sel.items?.length || 0} vật liệu
                                            {sel.confirmedAt && ` · Chốt: ${new Date(sel.confirmedAt).toLocaleDateString('vi-VN')}`}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        {isOpen ? (
                                            <button className="btn btn-ghost btn-sm" onClick={closeEditor}>✕ Đóng</button>
                                        ) : (
                                            <button className="btn btn-ghost btn-sm" onClick={() => openEditor(sel)}>
                                                {sel.status === 'confirmed' ? '👁 Xem' : '✏️ Sửa'}
                                            </button>
                                        )}
                                        {sel.status !== 'confirmed' && (
                                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)' }}
                                                onClick={() => deleteSel(sel.id)}>Xóa</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Editor */}
            {editForm && (
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">
                            {isConfirmed ? '👁 Xem vật liệu đã chốt' : '✏️ Chỉnh sửa đợt chốt'}
                        </span>
                        {!isConfirmed && (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-ghost btn-sm" onClick={saveItems} disabled={saving}>
                                    {saving ? '⏳...' : '💾 Lưu'}
                                </button>
                                <button className="btn btn-primary btn-sm" onClick={confirmSelection} disabled={confirming || saving}>
                                    {confirming ? '⏳...' : '✅ Chốt vật liệu'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Header fields */}
                    {!isConfirmed && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tên đợt chốt</label>
                                <input className="form-input" value={editForm.title}
                                    onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Người trình bày</label>
                                <input className="form-input" placeholder="Tên KTV / thiết kế" value={editForm.presentedBy}
                                    onChange={e => setEditForm(f => ({ ...f, presentedBy: e.target.value }))} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ghi chú đợt chốt</label>
                                <input className="form-input" placeholder="Ghi chú chung..." value={editForm.notes}
                                    onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    {!isConfirmed && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                            <button className="btn btn-primary btn-sm" onClick={addVanRow}>🎨 Chọn ván màu</button>
                            {QUICK_ADD.map(qa => (
                                <button key={qa.materialName} className="btn btn-ghost btn-sm"
                                    onClick={() => addRow({ materialName: qa.materialName, unit: qa.unit })}>
                                    {qa.label}
                                </button>
                            ))}
                            {areaSuggestions.length > 0 && (
                                <button className="btn btn-ghost btn-sm" onClick={importFromOrder}
                                    title="Nhập hạng mục từ đơn hàng làm gợi ý vị trí áp dụng">
                                    📋 Nhập từ đơn hàng ({areaSuggestions.length})
                                </button>
                            )}
                        </div>
                    )}

                    {/* Items table */}
                    <datalist id="area-list">
                        {areaSuggestions.map(s => <option key={s} value={s} />)}
                    </datalist>

                    {editForm.items.length === 0 ? (
                        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                            Chưa có vật liệu nào. Nhấn "Chọn ván màu" hoặc "+ Thêm" ở trên.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table" style={{ fontSize: 13 }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: 48 }}>Ảnh</th>
                                        <th>Tên vật liệu</th>
                                        <th style={{ width: 90 }}>Mã màu</th>
                                        <th>Hạng mục áp dụng</th>
                                        <th style={{ width: 70 }}>SL</th>
                                        <th style={{ width: 70 }}>ĐVT</th>
                                        <th>Ghi chú</th>
                                        {!isConfirmed && <th style={{ width: 60 }}></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {editForm.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                {item.swatchImageUrl ? (
                                                    <img src={item.swatchImageUrl} alt={item.colorCode}
                                                        style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)' }} />
                                                ) : (
                                                    <div style={{ width: 40, height: 40, borderRadius: 4, background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                                                        🎨
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                {isConfirmed ? (
                                                    <span>{item.materialName}</span>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                        <input className="form-input" style={{ fontSize: 12 }}
                                                            value={item.materialName}
                                                            onChange={e => updateItem(idx, { materialName: e.target.value })} />
                                                        <button className="btn btn-ghost btn-sm" title="Chọn ván từ danh mục"
                                                            onClick={() => openVanPicker(idx)}>🎨</button>
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                {isConfirmed ? (
                                                    <span style={{ fontWeight: 600, color: 'var(--status-info)' }}>{item.colorCode}</span>
                                                ) : (
                                                    <input className="form-input" style={{ fontSize: 12 }}
                                                        value={item.colorCode}
                                                        onChange={e => updateItem(idx, { colorCode: e.target.value })} />
                                                )}
                                            </td>
                                            <td>
                                                {isConfirmed ? (
                                                    <span>{item.applicationArea}</span>
                                                ) : (
                                                    <input className="form-input" style={{ fontSize: 12 }}
                                                        list="area-list"
                                                        placeholder="VD: Tủ bếp trên..."
                                                        value={item.applicationArea}
                                                        onChange={e => updateItem(idx, { applicationArea: e.target.value })} />
                                                )}
                                            </td>
                                            <td>
                                                {isConfirmed ? (
                                                    <span>{item.quantity}</span>
                                                ) : (
                                                    <input className="form-input" type="number" style={{ fontSize: 12 }}
                                                        value={item.quantity}
                                                        onChange={e => updateItem(idx, { quantity: e.target.value })} />
                                                )}
                                            </td>
                                            <td>
                                                {isConfirmed ? (
                                                    <span>{item.unit}</span>
                                                ) : (
                                                    <input className="form-input" style={{ fontSize: 12 }}
                                                        value={item.unit}
                                                        onChange={e => updateItem(idx, { unit: e.target.value })} />
                                                )}
                                            </td>
                                            <td>
                                                {isConfirmed ? (
                                                    <span style={{ color: 'var(--text-muted)' }}>{item.notes}</span>
                                                ) : (
                                                    <input className="form-input" style={{ fontSize: 12 }}
                                                        value={item.notes}
                                                        onChange={e => updateItem(idx, { notes: e.target.value })} />
                                                )}
                                            </td>
                                            {!isConfirmed && (
                                                <td>
                                                    <button className="btn btn-ghost btn-sm"
                                                        style={{ color: 'var(--status-danger)' }}
                                                        onClick={() => removeItem(idx)}>✕</button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Ván picker modal */}
            {vanPicker !== null && (
                <div className="modal-overlay" onClick={() => setVanPicker(null)}>
                    <div className="modal" style={{ maxWidth: 720, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
                        onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">🎨 Chọn màu ván Melamin Thái Lan</h3>
                            <button className="modal-close" onClick={() => setVanPicker(null)}>×</button>
                        </div>
                        <div style={{ padding: '0 0 12px' }}>
                            <input ref={vanSearchRef} className="form-input"
                                placeholder="Tìm theo mã màu (VD: 331, MS 021)..."
                                value={vanSearch}
                                onChange={e => handleVanSearchChange(e.target.value)} />
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {vanLoading ? (
                                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Đang tải...</div>
                            ) : vanResults.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>
                                    {vanSearch ? 'Không tìm thấy màu phù hợp' : 'Nhập mã màu để tìm kiếm'}
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
                                    {vanResults.map(p => (
                                        <button key={p.id} onClick={() => pickVan(p)}
                                            style={{
                                                border: '1px solid var(--border)', borderRadius: 6, padding: 4,
                                                background: 'var(--bg-primary)', cursor: 'pointer',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                                                transition: 'border-color 0.15s',
                                            }}
                                            onMouseOver={e => e.currentTarget.style.borderColor = 'var(--status-info)'}
                                            onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                                            {p.image ? (
                                                <img src={p.image} alt={p.color}
                                                    style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 4 }} />
                                            ) : (
                                                <div style={{ width: '100%', aspectRatio: '1', background: 'var(--bg-secondary)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎨</div>
                                            )}
                                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.2 }}>
                                                {p.color || p.code}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
