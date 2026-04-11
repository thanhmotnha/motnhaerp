'use client';
import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/fetchClient';

const PICKER_TYPES = {
    van: {
        title: '🪵 Chọn màu ván MDF',
        categories: ['Ván AC', 'Ván Thái'],
        catLabels: { 'Ván AC': 'An Cường', 'Ván Thái': 'Melamin Thái' },
        materialName: 'Ván MFC',
        unit: 'tờ',
    },
    acrylic: {
        title: '✨ Chọn cánh Acrylic',
        categories: ['Acrylic'],
        catLabels: {},
        materialName: 'Acrylic',
        unit: 'tờ',
    },
    san_go: {
        title: '🏠 Chọn sàn gỗ',
        categories: ['Sàn gỗ AC'],
        catLabels: {},
        materialName: 'Sàn gỗ',
        unit: 'm²',
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

const STATUS_CONFIG = {
    pending:   { label: 'Chờ xác nhận', bg: '#fef9c3', color: '#92400e' },
    confirmed: { label: '✓ Đã xác nhận', bg: '#dcfce7', color: '#16a34a' },
    changed:   { label: 'Đã thay đổi', bg: '#f3f4f6', color: '#6b7280' },
};

function printSelection(sel, orderName) {
    const rows = (sel.items || []).map(it => `
        <tr>
            <td>${it.materialName}</td>
            <td>${it.colorName || ''}${it.colorCode ? ` (${it.colorCode})` : ''}</td>
            <td>${it.applicationArea || ''}</td>
            <td style="text-align:right">${it.quantity} ${it.unit}</td>
        </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Vật liệu ${sel.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; font-size: 13px; }
        h2 { margin-bottom: 4px; }
        p { color: #666; margin: 0 0 16px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 10px; border: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; text-align: left; }
    </style></head><body>
    <h2>${orderName} — ${sel.title}</h2>
    <p>Vòng ${sel.selectionRound} · ${sel.items?.length || 0} loại vật liệu</p>
    <table>
        <thead><tr><th>Vật liệu</th><th>Màu / Mã</th><th>Khu vực</th><th>Số lượng</th></tr></thead>
        <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:20px;color:#999;font-size:11px">In ngày ${new Date().toLocaleDateString('vi-VN')}</p>
    </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.print(); };
}

export default function MaterialSelectionTab({ orderId, order, onRefresh }) {
    const [selections, setSelections] = useState(order.materialSelections || []);
    const firstEmpty = (order.materialSelections || []).find(s => !s.items?.length && s.status !== 'confirmed');
    const [editingId, setEditingId] = useState(firstEmpty?.id ?? null);
    const [editForm, setEditForm] = useState(firstEmpty ? {
        title: firstEmpty.title || '',
        presentedBy: firstEmpty.presentedBy || '',
        notes: firstEmpty.notes || '',
        items: [],
    } : null);
    const [saving, setSaving] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [creating, setCreating] = useState(false);
    const [sendingLink, setSendingLink] = useState({});
    const [confirmLink, setConfirmLink] = useState(null);

    const [picker, setPicker] = useState(null);
    const [pickerSearch, setPickerSearch] = useState('');
    const [pickerResults, setPickerResults] = useState([]);
    const [pickerLoading, setPickerLoading] = useState(false);
    const [pickerCatFilter, setPickerCatFilter] = useState('all');
    const searchRef = useRef(null);
    const searchTimer = useRef(null);

    const areaSuggestions = (order.items || []).map(i => i.name).filter(Boolean);

    const createNew = async () => {
        setCreating(true);
        try {
            const round = selections.length + 1;
            const sel = await apiFetch(`/api/furniture-orders/${orderId}/material-selections`, {
                method: 'POST',
                body: { title: `Vật liệu vòng ${round}`, items: [] },
            });
            setSelections(prev => [...prev, sel]);
            openEditor(sel);
        } catch (err) { alert(err.message || 'Lỗi tạo vòng chốt'); }
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
        if (!confirm('Xóa vòng chốt này?')) return;
        await apiFetch(`/api/furniture-orders/${orderId}/material-selections/${selId}`, { method: 'DELETE' });
        setSelections(prev => prev.filter(s => s.id !== selId));
        if (editingId === selId) closeEditor();
    };

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

    const saveAndConfirm = async () => {
        if (!editForm.items.length) return alert('Chưa có vật liệu nào để chốt.');
        setConfirming(true);
        try {
            await apiFetch(
                `/api/furniture-orders/${orderId}/material-selections/${editingId}`,
                { method: 'PATCH', body: editForm }
            );
            const confirmed = await apiFetch(
                `/api/furniture-orders/${orderId}/material-selections/${editingId}`,
                { method: 'PUT', body: { status: 'confirmed' } }
            );
            setSelections(prev => prev.map(s => s.id === editingId ? confirmed : s));
            closeEditor();
            onRefresh?.();
        } catch (err) { alert(err.message || 'Lỗi chốt vật liệu'); }
        setConfirming(false);
    };

    const sendConfirmationLink = async (selId) => {
        setSendingLink(prev => ({ ...prev, [selId]: true }));
        try {
            const result = await apiFetch(
                `/api/furniture-orders/${orderId}/material-selections/${selId}/send-confirmation`,
                { method: 'POST', body: {} }
            );
            const fullUrl = window.location.origin + result.url;
            setConfirmLink({ url: fullUrl, selId });
            await navigator.clipboard.writeText(fullUrl).catch(() => {});
        } catch (err) { alert(err.message || 'Lỗi tạo link'); }
        setSendingLink(prev => ({ ...prev, [selId]: false }));
    };

    const openPicker = (rowIdx, type) => {
        setPicker({ rowIdx, type });
        setPickerSearch('');
        setPickerResults([]);
        setPickerCatFilter('all');
        setTimeout(() => searchRef.current?.focus(), 50);
    };

    useEffect(() => {
        if (!picker) return;
        const cfg = PICKER_TYPES[picker.type];
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(async () => {
            setPickerLoading(true);
            const results = await fetchFromCategories(cfg.categories, pickerSearch);
            setPickerResults(results);
            setPickerLoading(false);
        }, 200);
    }, [picker, pickerSearch]);

    const selectProduct = (p) => {
        const cfg = PICKER_TYPES[picker.type];
        updateItem(picker.rowIdx, {
            productId: p.id,
            materialName: p.name || cfg.materialName,
            colorName: p.colorName || p.name,
            colorCode: p.colorCode || p.code || '',
            swatchImageUrl: p.imageUrl || p.swatchImageUrl || '',
            unit: cfg.unit,
        });
        setPicker(null);
    };

    const filteredResults = pickerCatFilter === 'all'
        ? pickerResults
        : pickerResults.filter(p => p._category === pickerCatFilter);

    return (
        <div>
            {confirmLink && (
                <div onClick={() => setConfirmLink(null)} style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: '#fff', borderRadius: 10, padding: 24, maxWidth: 480, width: '90%',
                    }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>✉️ Link xác nhận đã tạo</h3>
                        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>
                            Link đã được copy vào clipboard. Gửi cho khách hàng để họ xem và xác nhận vật liệu.
                        </p>
                        <div style={{
                            background: '#f3f4f6', borderRadius: 6, padding: '10px 12px',
                            fontSize: 12, wordBreak: 'break-all', marginBottom: 16, color: '#374151',
                        }}>
                            {confirmLink.url}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={() => navigator.clipboard.writeText(confirmLink.url)}
                                style={{ flex: 1, padding: '8px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                            >
                                📋 Copy lại
                            </button>
                            <button
                                onClick={() => setConfirmLink(null)}
                                style={{ flex: 1, padding: '8px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selections.length === 0 && !editingId && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    Chưa có vòng chốt vật liệu nào.
                </div>
            )}

            {selections.map(sel => {
                const sc = STATUS_CONFIG[sel.status] || STATUS_CONFIG.pending;
                const isEditing = editingId === sel.id;

                return (
                    <div key={sel.id} style={{
                        background: '#fff', border: '1px solid var(--border)',
                        borderRadius: 8, marginBottom: 16, overflow: 'hidden',
                    }}>
                        <div style={{
                            padding: '10px 16px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            borderBottom: '1px solid var(--border)', background: '#fafafa',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontWeight: 700, fontSize: 14 }}>
                                    Vòng {sel.selectionRound} — {sel.title}
                                </span>
                                <span style={{
                                    background: sc.bg, color: sc.color,
                                    padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                                }}>
                                    {sc.label}
                                </span>
                                {sel.confirmedAt && (
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        — {new Date(sel.confirmedAt).toLocaleDateString('vi-VN')}
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                    onClick={() => printSelection(sel, order.name)}
                                    style={{ background: 'var(--bg-secondary)', border: 'none', padding: '4px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                                >
                                    📄 Xuất PDF
                                </button>
                                <button
                                    onClick={() => sendConfirmationLink(sel.id)}
                                    disabled={sendingLink[sel.id]}
                                    style={{ background: 'var(--bg-secondary)', border: 'none', padding: '4px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                                >
                                    {sendingLink[sel.id] ? 'Đang tạo...' : '✉️ Gửi KH xác nhận'}
                                </button>
                                {!isEditing && sel.status !== 'confirmed' && (
                                    <button
                                        onClick={() => openEditor(sel)}
                                        style={{ background: 'none', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                                    >
                                        Sửa
                                    </button>
                                )}
                                <button
                                    onClick={() => deleteSel(sel.id)}
                                    style={{ background: 'none', border: '1px solid #fca5a5', color: '#dc2626', padding: '4px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                                >
                                    Xóa
                                </button>
                            </div>
                        </div>

                        {!isEditing && (
                            <div style={{ padding: '8px 16px' }}>
                                {(!sel.items || sel.items.length === 0) ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '8px 0' }}>Chưa có vật liệu nào.</p>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                        <thead>
                                            <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                                                <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 600 }}>Loại</th>
                                                <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 600 }}>Màu / Mã</th>
                                                <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 600 }}>Khu vực</th>
                                                <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600 }}>SL</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sel.items.map((it, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                                                    <td style={{ padding: '6px 0' }}>{it.materialName}</td>
                                                    <td style={{ padding: '6px 0' }}>
                                                        {it.swatchImageUrl && (
                                                            <img src={it.swatchImageUrl} alt="" style={{ width: 16, height: 16, borderRadius: 3, verticalAlign: 'middle', marginRight: 4, objectFit: 'cover' }} />
                                                        )}
                                                        {it.colorName}{it.colorCode ? ` (${it.colorCode})` : ''}
                                                    </td>
                                                    <td style={{ padding: '6px 0', color: 'var(--text-muted)' }}>{it.applicationArea || '—'}</td>
                                                    <td style={{ padding: '6px 0', textAlign: 'right' }}>{it.quantity} {it.unit}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {isEditing && editForm && (
                            <div style={{ padding: 16 }}>
                                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                                    <div style={{ flex: 2 }}>
                                        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Tên vòng</label>
                                        <input
                                            value={editForm.title}
                                            onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                                            className="form-input"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Trình bày bởi</label>
                                        <input
                                            value={editForm.presentedBy}
                                            onChange={e => setEditForm(f => ({ ...f, presentedBy: e.target.value }))}
                                            className="form-input"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </div>

                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 8 }}>
                                    <thead>
                                        <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                                            <th style={{ width: 120, padding: '4px 6px 4px 0', textAlign: 'left' }}>Vật liệu</th>
                                            <th style={{ width: 130, padding: '4px 6px', textAlign: 'left' }}>Màu / Picker</th>
                                            <th style={{ padding: '4px 6px', textAlign: 'left' }}>Khu vực</th>
                                            <th style={{ width: 60, padding: '4px 6px', textAlign: 'right' }}>SL</th>
                                            <th style={{ width: 50, padding: '4px 6px', textAlign: 'left' }}>Đvt</th>
                                            <th style={{ width: 28 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {editForm.items.map((it, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #f9fafb' }}>
                                                <td style={{ padding: '4px 6px 4px 0' }}>
                                                    <input
                                                        value={it.materialName}
                                                        onChange={e => updateItem(idx, { materialName: e.target.value })}
                                                        className="form-input"
                                                        style={{ width: '100%', fontSize: 12 }}
                                                        placeholder="Tên vật liệu"
                                                    />
                                                </td>
                                                <td style={{ padding: '4px 6px' }}>
                                                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                        {it.swatchImageUrl && (
                                                            <img src={it.swatchImageUrl} alt="" style={{ width: 20, height: 20, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }} />
                                                        )}
                                                        <input
                                                            value={it.colorName}
                                                            onChange={e => updateItem(idx, { colorName: e.target.value })}
                                                            className="form-input"
                                                            style={{ flex: 1, fontSize: 12 }}
                                                            placeholder="Màu"
                                                        />
                                                        {Object.keys(PICKER_TYPES).map(type => (
                                                            <button
                                                                key={type}
                                                                onClick={() => openPicker(idx, type)}
                                                                title={PICKER_TYPES[type].title}
                                                                style={{ padding: '2px 5px', fontSize: 10, border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer', background: '#fff', flexShrink: 0 }}
                                                            >
                                                                {type === 'van' ? '🪵' : type === 'acrylic' ? '✨' : '🏠'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '4px 6px' }}>
                                                    <input
                                                        list={`areas-${sel.id}-${idx}`}
                                                        value={it.applicationArea}
                                                        onChange={e => updateItem(idx, { applicationArea: e.target.value })}
                                                        className="form-input"
                                                        style={{ width: '100%', fontSize: 12 }}
                                                        placeholder="Khu vực áp dụng"
                                                    />
                                                    <datalist id={`areas-${sel.id}-${idx}`}>
                                                        {areaSuggestions.map((a, i) => <option key={i} value={a} />)}
                                                    </datalist>
                                                </td>
                                                <td style={{ padding: '4px 6px' }}>
                                                    <input
                                                        type="number"
                                                        value={it.quantity}
                                                        onChange={e => updateItem(idx, { quantity: Number(e.target.value) })}
                                                        className="form-input"
                                                        style={{ width: '100%', fontSize: 12, textAlign: 'right' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '4px 6px' }}>
                                                    <input
                                                        value={it.unit}
                                                        onChange={e => updateItem(idx, { unit: e.target.value })}
                                                        className="form-input"
                                                        style={{ width: '100%', fontSize: 12 }}
                                                    />
                                                </td>
                                                <td style={{ padding: '4px 0' }}>
                                                    <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16 }}>×</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                                    <button onClick={() => addRow()} style={{ fontSize: 11, padding: '4px 8px', border: '1px dashed var(--border)', borderRadius: 4, cursor: 'pointer', background: '#fff' }}>
                                        + Thêm dòng
                                    </button>
                                    {QUICK_ADD.map((qa, i) => (
                                        <button key={i} onClick={() => addRow({ materialName: qa.materialName, unit: qa.unit })}
                                            style={{ fontSize: 11, padding: '4px 8px', border: '1px dashed #d1d5db', borderRadius: 4, cursor: 'pointer', background: '#fff', color: '#6b7280' }}>
                                            {qa.label}
                                        </button>
                                    ))}
                                    <button onClick={importFromOrder}
                                        style={{ fontSize: 11, padding: '4px 8px', border: '1px dashed #d1d5db', borderRadius: 4, cursor: 'pointer', background: '#fff', color: '#6b7280' }}>
                                        Import từ hạng mục đơn hàng
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <button
                                        onClick={saveAndConfirm}
                                        disabled={confirming || saving}
                                        style={{ fontSize: 13, padding: '8px 18px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        {confirming ? 'Đang chốt...' : '✓ Chốt vật liệu'}
                                    </button>
                                    <button onClick={saveItems} disabled={saving || confirming} className="btn btn-ghost" style={{ fontSize: 13 }}>
                                        {saving ? 'Đang lưu...' : 'Lưu nháp'}
                                    </button>
                                    <button onClick={closeEditor} className="btn btn-ghost" style={{ fontSize: 13, color: 'var(--text-muted)' }}>Hủy</button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            <button
                onClick={createNew}
                disabled={creating}
                style={{
                    width: '100%', background: '#fff',
                    border: '1.5px dashed var(--border)', borderRadius: 8,
                    padding: '12px', color: 'var(--text-muted)', fontSize: 13,
                    cursor: 'pointer',
                }}
            >
                {creating ? 'Đang tạo...' : '+ Thêm vòng chốt mới (khi KH thay đổi)'}
            </button>

            {picker && (
                <div onClick={() => setPicker(null)} style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: '#fff', borderRadius: 10, width: 680, maxHeight: '80vh',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    }}>
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                            <h3 style={{ margin: 0, fontSize: 15 }}>{PICKER_TYPES[picker.type].title}</h3>
                        </div>
                        <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6' }}>
                            <input
                                ref={searchRef}
                                value={pickerSearch}
                                onChange={e => setPickerSearch(e.target.value)}
                                placeholder="Tìm kiếm..."
                                className="form-input"
                                style={{ width: '100%' }}
                            />
                            {Object.keys(PICKER_TYPES[picker.type].catLabels).length > 0 && (
                                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                    <button
                                        onClick={() => setPickerCatFilter('all')}
                                        style={{ padding: '3px 10px', fontSize: 11, borderRadius: 4, border: 'none', cursor: 'pointer', background: pickerCatFilter === 'all' ? '#1d4ed8' : '#f3f4f6', color: pickerCatFilter === 'all' ? '#fff' : '#374151' }}
                                    >Tất cả</button>
                                    {PICKER_TYPES[picker.type].categories.map(cat => (
                                        <button key={cat}
                                            onClick={() => setPickerCatFilter(cat)}
                                            style={{ padding: '3px 10px', fontSize: 11, borderRadius: 4, border: 'none', cursor: 'pointer', background: pickerCatFilter === cat ? '#1d4ed8' : '#f3f4f6', color: pickerCatFilter === cat ? '#fff' : '#374151' }}
                                        >{PICKER_TYPES[picker.type].catLabels[cat] || cat}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1, padding: 16 }}>
                            {pickerLoading && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Đang tải...</p>}
                            {!pickerLoading && filteredResults.length === 0 && (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Không có kết quả</p>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 10 }}>
                            {filteredResults.map(p => (
                                <div key={p.id} onClick={() => selectProduct(p)}
                                    title={`${p.name}${p.colorCode ? ` — ${p.colorCode}` : ''}`}
                                    style={{ cursor: 'pointer', borderRadius: 8, overflow: 'hidden', border: '2px solid transparent', transition: 'border-color 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = '#1d4ed8'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                                >
                                    {(p.imageUrl || p.swatchImageUrl) ? (
                                        <img src={p.imageUrl || p.swatchImageUrl} alt={p.name}
                                            style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                                    ) : (
                                        <div style={{ width: '100%', aspectRatio: '1', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎨</div>
                                    )}
                                    <div style={{ padding: '4px 5px', background: '#fff' }}>
                                        <div style={{ fontSize: 10, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#374151' }}>{p.name}</div>
                                        {p.colorCode && <div style={{ fontSize: 9, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.colorCode}</div>}
                                    </div>
                                </div>
                            ))}
                            </div>
                        </div>
                        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
                            <button onClick={() => setPicker(null)} className="btn btn-ghost" style={{ fontSize: 13 }}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
