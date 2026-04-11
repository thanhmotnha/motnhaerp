'use client';
import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/fetchClient';

const STATUS_MAP = {
    pending: { label: 'Chờ chốt', badge: 'warning' },
    confirmed: { label: 'Đã chốt', badge: 'success' },
    changed: { label: 'Đã thay đổi', badge: 'secondary' },
};

// Config cho từng loại picker vật liệu
const PICKER_TYPES = {
    van: {
        title: '🪵 Chọn màu ván MDF',
        categories: ['Ván AC', 'Ván Thái'],
        catLabels: { 'Ván AC': 'An Cường', 'Ván Thái': 'Melamin Thái' },
        materialName: 'Ván MFC',
        unit: 'tờ',
        btnLabel: '🪵 Chọn ván MDF',
        btnClass: 'btn-primary',
    },
    acrylic: {
        title: '✨ Chọn cánh Acrylic',
        categories: ['Acrylic'],
        catLabels: {},
        materialName: 'Acrylic',
        unit: 'tờ',
        btnLabel: '✨ Chọn Acrylic',
        btnClass: 'btn-ghost',
    },
    san_go: {
        title: '🏠 Chọn sàn gỗ',
        categories: ['Sàn gỗ AC'],
        catLabels: {},
        materialName: 'Sàn gỗ',
        unit: 'm²',
        btnLabel: '🏠 Chọn sàn gỗ',
        btnClass: 'btn-ghost',
    },
};

const QUICK_ADD = [
    { label: '+ Nẹp nhôm', materialName: 'Nẹp nhôm', unit: 'm' },
    { label: '+ Tay nắm', materialName: 'Tay nắm', unit: 'cái' },
    { label: '+ Bản lề', materialName: 'Bản lề', unit: 'cái' },
    { label: '+ Ray hộp', materialName: 'Ray hộp', unit: 'bộ' },
    { label: '+ Phụ kiện', materialName: 'Phụ kiện', unit: 'cái' },
];

const emptyRow = () => ({
    productId: null, materialName: '', colorCode: '', colorName: '',
    swatchImageUrl: '', applicationArea: '', quantity: 1, unit: 'tờ', notes: '',
});

// Fetch products from multiple categories in parallel, merge results
async function fetchFromCategories(categories, search, limit = 30) {
    const fetches = categories.map(cat => {
        const params = new URLSearchParams({ category: cat, limit: String(limit) });
        if (search) params.set('search', search);
        return apiFetch(`/api/products?${params}`)
            .then(r => (r.data || []).map(p => ({ ...p, _category: cat })))
            .catch(() => []);
    });
    const results = await Promise.all(fetches);
    return results.flat();
}

export default function MaterialSelectionTab({ orderId, order, onRefresh }) {
    const [selections, setSelections] = useState(order.materialSelections || []);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [creating, setCreating] = useState(false);

    // Generic picker state
    const [picker, setPicker] = useState(null); // { rowIdx, type } — type is key of PICKER_TYPES
    const [pickerSearch, setPickerSearch] = useState('');
    const [pickerResults, setPickerResults] = useState([]);
    const [pickerLoading, setPickerLoading] = useState(false);
    const [pickerCatFilter, setPickerCatFilter] = useState('all'); // 'all' | category name
    const searchRef = useRef(null);
    const searchTimer = useRef(null);

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

    // ── Items editing ─────────────────────────────────────────
    const addRow = (template = {}) => {
        setEditForm(f => ({ ...f, items: [...f.items, { ...emptyRow(), ...template }] }));
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

    const importFromOrder = () => {
        if (!areaSuggestions.length) return alert('Đơn hàng không có hạng mục nào.');
        const newRows = areaSuggestions.map(name => ({
            ...emptyRow(), materialName: 'Ván MFC', applicationArea: name,
        }));
        setEditForm(f => ({ ...f, items: [...f.items, ...newRows] }));
    };

    // ── Save / Confirm ─────────────────────────────────────────
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
            const saved = await apiFetch(
                `/api/furniture-orders/${orderId}/material-selections/${editingId}`,
                { method: 'PATCH', body: editForm }
            );
            const confirmed = await apiFetch(
                `/api/furniture-orders/${orderId}/material-selections/${editingId}`,
                { method: 'PUT', body: { status: 'confirmed' } }
            );
            setSelections(prev => prev.map(s => s.id === editingId ? { ...saved, ...confirmed, items: saved.items } : s));
            closeEditor();
            onRefresh();
        } catch (err) { alert(err.message || 'Lỗi xác nhận'); }
        setConfirming(false);
    };

    // ── Generic picker ─────────────────────────────────────────
    const openPicker = (type, rowIdx) => {
        // If rowIdx is undefined, add a new row first
        const actualIdx = rowIdx !== undefined ? rowIdx : editForm.items.length;
        if (rowIdx === undefined) {
            const cfg = PICKER_TYPES[type];
            setEditForm(f => ({ ...f, items: [...f.items, { ...emptyRow(), materialName: cfg.materialName, unit: cfg.unit }] }));
        }
        setPicker({ rowIdx: actualIdx, type });
        setPickerSearch('');
        setPickerCatFilter('all');
        setPickerResults([]);
        setTimeout(() => searchRef.current?.focus(), 100);
    };

    const closePicker = () => { setPicker(null); setPickerResults([]); setPickerSearch(''); };

    // Load initial results when picker opens
    useEffect(() => {
        if (!picker) return;
        const cfg = PICKER_TYPES[picker.type];
        (async () => {
            setPickerLoading(true);
            const results = await fetchFromCategories(cfg.categories, '', 30);
            setPickerResults(results);
            setPickerLoading(false);
        })();
    }, [picker?.type, picker?.rowIdx]); // re-run only when type/rowIdx changes, not on search

    const handleSearchChange = (val) => {
        setPickerSearch(val);
        clearTimeout(searchTimer.current);
        if (!picker) return;
        const cfg = PICKER_TYPES[picker.type];
        searchTimer.current = setTimeout(async () => {
            setPickerLoading(true);
            const results = await fetchFromCategories(cfg.categories, val.trim(), 30);
            setPickerResults(results);
            setPickerLoading(false);
        }, 300);
    };

    const pickProduct = (product) => {
        if (!picker) return;
        updateItem(picker.rowIdx, {
            productId: product.id,
            materialName: product.name,
            colorCode: product.color || product.code,
            colorName: product.color || '',
            swatchImageUrl: product.image || '',
        });
        closePicker();
    };

    const pickerCfg = picker ? PICKER_TYPES[picker.type] : null;
    const displayedResults = pickerCfg && pickerCatFilter !== 'all'
        ? pickerResults.filter(p => p._category === pickerCatFilter)
        : pickerResults;

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
                        {selections.map(sel => {
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
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ghi chú</label>
                                <input className="form-input" placeholder="Ghi chú chung..." value={editForm.notes}
                                    onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
                            </div>
                        </div>
                    )}

                    {/* Quick add buttons */}
                    {!isConfirmed && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                            {Object.entries(PICKER_TYPES).map(([type, cfg]) => (
                                <button key={type} className={`btn ${cfg.btnClass} btn-sm`}
                                    onClick={() => openPicker(type)}>
                                    {cfg.btnLabel}
                                </button>
                            ))}
                            {QUICK_ADD.map(qa => (
                                <button key={qa.materialName} className="btn btn-ghost btn-sm"
                                    onClick={() => addRow({ materialName: qa.materialName, unit: qa.unit })}>
                                    {qa.label}
                                </button>
                            ))}
                            {areaSuggestions.length > 0 && (
                                <button className="btn btn-ghost btn-sm" onClick={importFromOrder}
                                    style={{ borderLeft: '1px solid var(--border)', paddingLeft: 12 }}>
                                    📋 Nhập từ đơn hàng ({areaSuggestions.length})
                                </button>
                            )}
                        </div>
                    )}

                    <datalist id="area-list">
                        {areaSuggestions.map(s => <option key={s} value={s} />)}
                    </datalist>

                    {editForm.items.length === 0 ? (
                        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                            Chưa có vật liệu nào. Nhấn các nút ở trên để thêm.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table" style={{ fontSize: 13 }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: 48 }}>Ảnh</th>
                                        <th>Tên vật liệu</th>
                                        <th style={{ width: 100 }}>Mã màu</th>
                                        <th>Hạng mục áp dụng</th>
                                        <th style={{ width: 70 }}>SL</th>
                                        <th style={{ width: 65 }}>ĐVT</th>
                                        <th>Ghi chú</th>
                                        {!isConfirmed && <th style={{ width: 50 }}></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {editForm.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                {item.swatchImageUrl ? (
                                                    <img src={item.swatchImageUrl} alt={item.colorCode}
                                                        style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border)', cursor: 'pointer' }}
                                                        onClick={() => !isConfirmed && openPicker('van', idx)} />
                                                ) : (
                                                    <div style={{ width: 40, height: 40, borderRadius: 4, background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: isConfirmed ? 'default' : 'pointer' }}
                                                        onClick={() => !isConfirmed && openPicker('van', idx)}>
                                                        🎨
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                {isConfirmed ? (
                                                    <span>{item.materialName}</span>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        <input className="form-input" style={{ fontSize: 12 }}
                                                            value={item.materialName}
                                                            onChange={e => updateItem(idx, { materialName: e.target.value })} />
                                                        <button className="btn btn-ghost btn-sm" title="Chọn từ danh mục"
                                                            style={{ flexShrink: 0 }}
                                                            onClick={() => openPicker('van', idx)}>🔍</button>
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

            {/* Generic product picker modal */}
            {picker && pickerCfg && (
                <div className="modal-overlay" onClick={closePicker}>
                    <div className="modal" style={{ maxWidth: 760, maxHeight: '82vh', display: 'flex', flexDirection: 'column' }}
                        onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{pickerCfg.title}</h3>
                            <button className="modal-close" onClick={closePicker}>×</button>
                        </div>

                        {/* Search */}
                        <div style={{ marginBottom: 10 }}>
                            <input ref={searchRef} className="form-input"
                                placeholder="Tìm theo tên, mã màu..."
                                value={pickerSearch}
                                onChange={e => handleSearchChange(e.target.value)} />
                        </div>

                        {/* Category tabs (only if multiple categories) */}
                        {pickerCfg.categories.length > 1 && (
                            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                                <button
                                    className="btn btn-sm"
                                    style={{
                                        background: pickerCatFilter === 'all' ? 'var(--status-info)' : 'var(--bg-secondary)',
                                        color: pickerCatFilter === 'all' ? '#fff' : 'var(--text-secondary)',
                                        border: 'none',
                                    }}
                                    onClick={() => setPickerCatFilter('all')}>
                                    Tất cả ({pickerResults.length})
                                </button>
                                {pickerCfg.categories.map(cat => {
                                    const count = pickerResults.filter(p => p._category === cat).length;
                                    return (
                                        <button key={cat}
                                            className="btn btn-sm"
                                            style={{
                                                background: pickerCatFilter === cat ? 'var(--status-info)' : 'var(--bg-secondary)',
                                                color: pickerCatFilter === cat ? '#fff' : 'var(--text-secondary)',
                                                border: 'none',
                                            }}
                                            onClick={() => setPickerCatFilter(cat)}>
                                            {pickerCfg.catLabels[cat] || cat} ({count})
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Product grid */}
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {pickerLoading ? (
                                <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Đang tải...</div>
                            ) : displayedResults.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>
                                    {pickerSearch ? 'Không tìm thấy sản phẩm phù hợp' : 'Chưa có sản phẩm trong danh mục này'}
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
                                    {displayedResults.map(p => (
                                        <button key={p.id} onClick={() => pickProduct(p)}
                                            style={{
                                                border: '1px solid var(--border)', borderRadius: 6, padding: 6,
                                                background: 'var(--bg-primary)', cursor: 'pointer',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                                                textAlign: 'center',
                                            }}
                                            onMouseOver={e => e.currentTarget.style.borderColor = 'var(--status-info)'}
                                            onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                                            {p.image ? (
                                                <img src={p.image} alt={p.color || p.code}
                                                    style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 4 }} />
                                            ) : (
                                                <div style={{ width: '100%', aspectRatio: '1', background: 'var(--bg-secondary)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                                    {pickerCfg.title.charAt(0)}
                                                </div>
                                            )}
                                            <span style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.3, wordBreak: 'break-all' }}>
                                                {p.color || p.code}
                                            </span>
                                            {pickerCfg.categories.length > 1 && (
                                                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                                                    {pickerCfg.catLabels[p._category] || p._category}
                                                </span>
                                            )}
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
