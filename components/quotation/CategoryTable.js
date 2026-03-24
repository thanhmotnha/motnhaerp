'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { fmt, UNIT_OPTIONS } from '@/lib/quotation-constants';
import { apiFetch } from '@/lib/fetchClient';
import ColorMaterialPicker from '@/components/quotation/ColorMaterialPicker';

// Inline product search for sub-item name field
function SubItemSearch({ value, onChange, onSelect, products }) {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState([]);
    const [show, setShow] = useState(false);
    const [focused, setFocused] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!focused || !search.trim()) { setResults([]); return; }
        const q = search.toLowerCase();
        setResults((products || []).filter(p => p.name.toLowerCase().includes(q)).slice(0, 8));
    }, [search, products, focused]);

    useEffect(() => {
        const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <input className="form-input form-input-compact" value={focused ? search : value}
                placeholder="Phụ kiện — gõ tìm SP..."
                style={{ fontSize: 12, fontStyle: 'italic' }}
                onFocus={() => { setFocused(true); setSearch(value || ''); setShow(true); }}
                onBlur={() => { setTimeout(() => { setFocused(false); setShow(false); }, 200); }}
                onChange={e => { setSearch(e.target.value); onChange(e.target.value); setShow(true); }} />
            {show && results.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60, background: 'var(--bg-card, #fff)', border: '1px solid var(--border-color)', borderRadius: 6, maxHeight: 180, overflow: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                    {results.map(p => (
                        <div key={p.id} onMouseDown={() => { onSelect(p); setShow(false); setFocused(false); }}
                            style={{ padding: '5px 8px', cursor: 'pointer', fontSize: 11, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)' }}>
                            <span style={{ flex: 1 }}>{p.name}</span>
                            <span style={{ opacity: 0.5, whiteSpace: 'nowrap', marginLeft: 6 }}>{p.unit} · {fmt(p.salePrice)}đ</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Inline variant selector for product rows
function InlineVariants({ productId, basePrice, onPriceChange, onDescChange }) {
    const [attrs, setAttrs] = useState(null); // null=not loaded, []=no variants
    const [selections, setSelections] = useState({});
    const userChanged = useRef(false);

    useEffect(() => {
        if (!productId) return;
        apiFetch(`/api/products/${productId}/attributes`)
            .then(data => {
                setAttrs(data || []);
                const init = {};
                (data || []).forEach(a => {
                    if (a.inputType === 'select' && a.options.length > 0) init[a.id] = a.options[0].id;
                    else init[a.id] = '';
                });
                setSelections(init);
            })
            .catch(() => setAttrs([]));
    }, [productId]);

    useEffect(() => {
        if (!attrs || attrs.length === 0) return;
        if (!userChanged.current) return; // Don't override price on initial load
        let addon = 0;
        const descParts = [];
        attrs.forEach(a => {
            if (a.inputType === 'select') {
                const opt = a.options.find(o => o.id === selections[a.id]);
                if (opt) { addon += (opt.priceAddon || 0); descParts.push(`${a.name}: ${opt.label}`); }
            } else if (selections[a.id]?.trim()) {
                descParts.push(`${a.name}: ${selections[a.id]}`);
            }
        });
        onPriceChange(basePrice + addon);
        onDescChange(descParts.join(', '));
    }, [selections, attrs, basePrice, onPriceChange, onDescChange]);

    const handleChange = (attrId, value) => {
        userChanged.current = true;
        setSelections(s => ({ ...s, [attrId]: value }));
    };

    if (!productId || attrs === null || attrs.length === 0) return null;

    return (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
            {attrs.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: 10, opacity: 0.5, whiteSpace: 'nowrap' }}>{a.name}:</span>
                    {a.inputType === 'select' ? (
                        <select value={selections[a.id] || ''} onChange={e => handleChange(a.id, e.target.value)}
                            style={{ fontSize: 11, padding: '1px 2px', border: '1px solid var(--border-color)', borderRadius: 3, background: 'var(--bg-input)', maxWidth: 130 }}>
                            {!a.required && <option value="">—</option>}
                            {a.options.map(o => (
                                <option key={o.id} value={o.id}>
                                    {o.label}{o.priceAddon > 0 ? ` +${new Intl.NumberFormat('vi-VN').format(o.priceAddon)}` : o.priceAddon < 0 ? ` ${new Intl.NumberFormat('vi-VN').format(o.priceAddon)}` : ''}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <input value={selections[a.id] || ''} onChange={e => handleChange(a.id, e.target.value)}
                            placeholder={a.name} style={{ fontSize: 11, padding: '1px 3px', border: '1px solid var(--border-color)', borderRadius: 3, width: 80 }} />
                    )}
                </div>
            ))}
        </div>
    );
}

// Expandable furniture detail panel for each item
function FurnitureDetailPanel({ item, mi, si, ii, updateItem }) {
    const [pickerOpen, setPickerOpen] = useState(null); // null | 'body' | 'door'

    const handleColorSelect = (product, type) => {
        const prefix = type === 'body' ? 'bodyColor' : 'doorColor';
        updateItem(mi, si, ii, `${prefix}Code`, product.code || product.surfaceCode || '');
        updateItem(mi, si, ii, `${prefix}Name`, product.name || '');
        updateItem(mi, si, ii, `${prefix}Image`, product.image || '');
    };

    const clearColor = (type) => {
        const prefix = type === 'body' ? 'bodyColor' : 'doorColor';
        updateItem(mi, si, ii, `${prefix}Code`, '');
        updateItem(mi, si, ii, `${prefix}Name`, '');
        updateItem(mi, si, ii, `${prefix}Image`, '');
    };

    const uploadImage = async (file, field) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'quotation-details');
        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.url) updateItem(mi, si, ii, field, data.url);
        } catch { }
    };

    const uploadMultiImages = async (files, field) => {
        const current = item[field] || [];
        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'quotation-details');
            try {
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.url) current.push(data.url);
            } catch { }
        }
        updateItem(mi, si, ii, field, [...current]);
    };

    const removeImage = (field, idx) => {
        const arr = [...(item[field] || [])];
        arr.splice(idx, 1);
        updateItem(mi, si, ii, field, arr);
    };

    const uploadAttachment = async (files) => {
        const current = item.attachments || [];
        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'quotation-details');
            try {
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.url) current.push({ name: file.name, url: data.url, type: file.type });
            } catch { }
        }
        updateItem(mi, si, ii, 'attachments', [...current]);
    };

    const removeAttachment = (idx) => {
        const arr = [...(item.attachments || [])];
        arr.splice(idx, 1);
        updateItem(mi, si, ii, 'attachments', arr);
    };

    const inputStyle = { width: '100%', padding: '6px 10px', border: '1px solid var(--border-color)', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', background: 'var(--bg-input, #fff)' };
    const labelStyle = { fontSize: 11, fontWeight: 700, color: 'var(--accent-primary)', marginBottom: 4, display: 'block' };
    const sectionStyle = { padding: '10px 12px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6 };

    return (
        <tr>
            <td colSpan={99} style={{ padding: '8px 12px 12px', background: 'rgba(35,64,147,0.02)', borderBottom: '2px solid var(--accent-primary, #234093)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {/* Công năng */}
                    <div style={sectionStyle}>
                        <label style={labelStyle}>📋 Công năng</label>
                        <textarea value={item.functionality || ''} onChange={e => updateItem(mi, si, ii, 'functionality', e.target.value)}
                            rows={3} placeholder="Mô tả công năng: ngăn kéo, kệ, treo, hộc..." style={{ ...inputStyle, resize: 'vertical' }} />
                        <label style={{ ...labelStyle, marginTop: 4 }}>🖼️ Bản vẽ / Hình ảnh công năng</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {(item.functionalImages || []).map((url, idx) => (
                                <div key={idx} style={{ position: 'relative', width: 64, height: 64 }}>
                                    <img src={url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border-color)' }} />
                                    <button onClick={() => removeImage('functionalImages', idx)}
                                        style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', border: 'none', background: '#ef4444', color: '#fff', fontSize: 9, cursor: 'pointer', lineHeight: 1 }}>×</button>
                                </div>
                            ))}
                            <label style={{ width: 64, height: 64, border: '2px dashed var(--border-color)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 20, opacity: 0.4 }}>
                                +
                                <input type="file" accept="image/*" multiple hidden onChange={e => uploadMultiImages(e.target.files, 'functionalImages')} />
                            </label>
                        </div>
                        {/* File đính kèm */}
                        <label style={{ ...labelStyle, marginTop: 4 }}>📎 File đính kèm</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            {(item.attachments || []).map((f, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: '#fff', border: '1px solid var(--border-color)', borderRadius: 4, fontSize: 11 }}>
                                    <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>📄 {f.name}</a>
                                    <button onClick={() => removeAttachment(idx)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>×</button>
                                </div>
                            ))}
                            <label style={{ padding: '3px 10px', border: '1px dashed var(--border-color)', borderRadius: 4, cursor: 'pointer', fontSize: 11, opacity: 0.6 }}>
                                + Tải file
                                <input type="file" multiple hidden onChange={e => uploadAttachment(e.target.files)} />
                            </label>
                        </div>
                    </div>

                    {/* Màu sắc + Phụ kiện */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={sectionStyle}>
                            <label style={labelStyle}>🎨 Mã màu thùng</label>
                            {item.bodyColorCode || item.bodyColorName ? (
                                <div className="cmp-selected">
                                    {item.bodyColorImage && <img src={item.bodyColorImage} alt="" className="cmp-selected-img" />}
                                    <div className="cmp-selected-info">
                                        <div className="cmp-selected-code">{item.bodyColorCode || '—'}</div>
                                        <div className="cmp-selected-name">{item.bodyColorName || '—'}</div>
                                    </div>
                                    <button className="cmp-pick-btn" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => setPickerOpen('body')}>Đổi</button>
                                    <button className="cmp-selected-clear" onClick={() => clearColor('body')}>×</button>
                                </div>
                            ) : (
                                <button className="cmp-pick-btn" onClick={() => setPickerOpen('body')}>
                                    🎨 Chọn màu thùng từ sản phẩm
                                </button>
                            )}
                        </div>
                        <div style={sectionStyle}>
                            <label style={labelStyle}>🎨 Mã màu cánh</label>
                            {item.doorColorCode || item.doorColorName ? (
                                <div className="cmp-selected">
                                    {item.doorColorImage && <img src={item.doorColorImage} alt="" className="cmp-selected-img" />}
                                    <div className="cmp-selected-info">
                                        <div className="cmp-selected-code">{item.doorColorCode || '—'}</div>
                                        <div className="cmp-selected-name">{item.doorColorName || '—'}</div>
                                    </div>
                                    <button className="cmp-pick-btn" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => setPickerOpen('door')}>Đổi</button>
                                    <button className="cmp-selected-clear" onClick={() => clearColor('door')}>×</button>
                                </div>
                            ) : (
                                <button className="cmp-pick-btn" onClick={() => setPickerOpen('door')}>
                                    🎨 Chọn màu cánh từ sản phẩm
                                </button>
                            )}
                        </div>

                        {/* Color Material Picker Modal */}
                        <ColorMaterialPicker
                            open={!!pickerOpen}
                            onClose={() => setPickerOpen(null)}
                            onSelect={(product) => handleColorSelect(product, pickerOpen)}
                            title={pickerOpen === 'body' ? 'Chọn màu thùng' : 'Chọn màu cánh'}
                        />
                        <div style={sectionStyle}>
                            <label style={labelStyle}>🔩 Phụ kiện</label>
                            <textarea value={item.hardware || ''} onChange={e => updateItem(mi, si, ii, 'hardware', e.target.value)}
                                rows={2} placeholder="Bản lề Blum, ray Tandembox, tay nắm nhôm 128mm..." style={{ ...inputStyle, resize: 'vertical' }} />
                        </div>
                        <div style={sectionStyle}>
                            <label style={labelStyle}>🏠 Ảnh phối cảnh 3D</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {item.renderImage ? (
                                    <div style={{ position: 'relative' }}>
                                        <img src={item.renderImage} alt="" style={{ height: 56, borderRadius: 4, border: '1px solid var(--border-color)' }} />
                                        <button onClick={() => updateItem(mi, si, ii, 'renderImage', '')}
                                            style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', border: 'none', background: '#ef4444', color: '#fff', fontSize: 9, cursor: 'pointer' }}>×</button>
                                    </div>
                                ) : (
                                    <label style={{ padding: '8px 16px', border: '2px dashed var(--border-color)', borderRadius: 6, cursor: 'pointer', fontSize: 11, opacity: 0.5 }}>
                                        + Upload ảnh 3D
                                        <input type="file" accept="image/*" hidden onChange={e => e.target.files[0] && uploadImage(e.target.files[0], 'renderImage')} />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </td>
        </tr>
    );
}

function SubcategorySection({ sub, mi, si, hook, onImageClick, onSubcategoryImageClick }) {
    const [expandedDetails, setExpandedDetails] = useState({});
    const toggleDetail = (ii) => setExpandedDetails(prev => ({ ...prev, [ii]: !prev[ii] }));
    const { updateSubcategoryName, removeSubcategory, updateItem, removeItem, addItem, addFromLibrary, addFromProduct, allSearchItems, mainCategories, addSubItem, removeSubItem, updateSubItem, products } = hook;
    const unitOpts = hook.unitOptions || UNIT_OPTIONS;

    // Quick-add autocomplete state
    const [quickSearch, setQuickSearch] = useState('');
    const [quickResults, setQuickResults] = useState([]);
    const [quickFocusIdx, setQuickFocusIdx] = useState(-1);
    const [showQuickDrop, setShowQuickDrop] = useState(false);
    const quickRef = useRef(null);
    const dropRef = useRef(null);

    // Debounced search
    useEffect(() => {
        if (!quickSearch.trim()) { setQuickResults([]); return; }
        const timer = setTimeout(() => {
            const q = quickSearch.toLowerCase();
            const results = allSearchItems
                .filter(i => i._label.toLowerCase().includes(q) || i._sub.toLowerCase().includes(q))
                .slice(0, 12);
            setQuickResults(results);
            setQuickFocusIdx(-1);
        }, 150);
        return () => clearTimeout(timer);
    }, [quickSearch, allSearchItems]);

    // Close dropdown on outside click
    useEffect(() => {
        const handle = (e) => {
            if (dropRef.current && !dropRef.current.contains(e.target) && !quickRef.current?.contains(e.target)) {
                setShowQuickDrop(false);
            }
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    const handleQuickAdd = useCallback((item) => {
        // Directly add — variant selection will be inline in the table
        hook.setActiveMainIdx(mi);
        hook.setActiveSubIdx(si);
        setTimeout(() => {
            if (item._type === 'library') addFromLibrary(item);
            else addFromProduct(item);
        }, 0);
        setQuickSearch('');
        setQuickResults([]);
        setShowQuickDrop(false);
        setTimeout(() => quickRef.current?.focus(), 50);
    }, [addFromLibrary, addFromProduct, mi, si, hook]);

    const handleQuickKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setQuickFocusIdx(prev => Math.min(prev + 1, quickResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setQuickFocusIdx(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && quickFocusIdx >= 0 && quickResults[quickFocusIdx]) {
            e.preventDefault();
            handleQuickAdd(quickResults[quickFocusIdx]);
        } else if (e.key === 'Escape') {
            setShowQuickDrop(false);
        }
    };

    const canRemoveSub = mainCategories[mi]?.subcategories.length > 1;

    return (
        <div className="card quotation-subcategory-card" style={{ marginBottom: 12 }}>
            <div className="subcategory-header">
                <span style={{ fontWeight: 700, fontSize: 13, opacity: 0.4 }}>#{si + 1}</span>
                {onSubcategoryImageClick && (
                    <div className="subcategory-image-thumb" onClick={() => onSubcategoryImageClick(mi, si)} title="Ảnh khu vực">
                        {sub.image ? (
                            <img src={sub.image} alt="" />
                        ) : (
                            <span className="placeholder" style={{ fontSize: 10, textAlign: 'center', lineHeight: 1.3 }}>🖼️<br />Kéo thả hoặc<br />Click tải ảnh</span>
                        )}
                    </div>
                )}
                <input className="form-input" placeholder="Tên khu vực (VD: Sảnh, Phòng khách...)" value={sub.name}
                    onChange={e => updateSubcategoryName(mi, si, e.target.value)}
                    style={{ flex: 1, fontWeight: 600, fontSize: 14 }} />
                <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 13, whiteSpace: 'nowrap' }}>
                    {fmt(sub.subtotal)} đ
                </span>
                {canRemoveSub && (
                    <button className="btn btn-ghost btn-sm" onClick={() => removeSubcategory(mi, si)}
                        title="Xóa khu vực này">🗑️</button>
                )}
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table className="data-table quotation-detail-table">
                    <thead>
                        <tr>
                            <th style={{ width: 30 }}>#</th>
                            <th style={{ width: 36 }}></th>
                            <th style={{ minWidth: 160 }}>HẠNG MỤC / SẢN PHẨM</th>
                            <th style={{ width: 60 }}>DÀI</th>
                            <th style={{ width: 60 }}>RỘNG</th>
                            <th style={{ width: 60 }}>CAO</th>
                            <th style={{ width: 55 }}>SL</th>
                            <th style={{ width: 60 }}>KL</th>
                            <th style={{ width: 55 }}>ĐVT</th>
                            <th style={{ width: 90 }}>ĐƠN GIÁ</th>
                            <th style={{ width: 100 }}>THÀNH TIỀN</th>
                            <th style={{ minWidth: 120 }}>MÔ TẢ</th>
                            <th style={{ width: 30 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sub.items.map((item, ii) => {
                            return (
                                <React.Fragment key={item._key}>
                                    <tr>
                                        <td style={{ textAlign: 'center', opacity: 0.4, fontSize: 11 }}>{ii + 1}</td>
                                        <td style={{ textAlign: 'center', padding: 2, cursor: onImageClick ? 'pointer' : 'default' }}
                                            onClick={() => onImageClick && onImageClick(mi, si, ii)}>
                                            {item.image ? (
                                                <img src={item.image} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border-color)' }} />
                                            ) : (
                                                <div style={{ width: 28, height: 28, borderRadius: 4, border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, opacity: 0.25 }}>
                                                    {onImageClick ? '📷' : '🖼️'}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <input className="form-input form-input-compact" value={item.name} onChange={e => updateItem(mi, si, ii, 'name', e.target.value)} placeholder="Tên" />
                                            <InlineVariants
                                                productId={item.productId}
                                                basePrice={item.mainMaterial || 0}
                                                onPriceChange={(price) => updateItem(mi, si, ii, 'unitPrice', price)}
                                                onDescChange={(desc) => updateItem(mi, si, ii, 'description', desc)}
                                            />
                                        </td>
                                        <td><input className="form-input form-input-compact" type="number" value={item.length || ''} onChange={e => updateItem(mi, si, ii, 'length', e.target.value)} placeholder="0" /></td>
                                        <td><input className="form-input form-input-compact" type="number" value={item.width || ''} onChange={e => updateItem(mi, si, ii, 'width', e.target.value)} placeholder="0" /></td>
                                        <td><input className="form-input form-input-compact" type="number" value={item.height || ''} onChange={e => updateItem(mi, si, ii, 'height', e.target.value)} placeholder="0" /></td>
                                        <td><input className="form-input form-input-compact" type="number" value={item.quantity || ''} onChange={e => updateItem(mi, si, ii, 'quantity', e.target.value)} placeholder="0" /></td>
                                        <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 500 }}>
                                            {(() => {
                                                const u = (item.unit || '').toLowerCase().trim();
                                                const isDimUnit = ['md', 'mét dài', 'm', 'm²', 'm2', 'm³', 'm3'].includes(u);
                                                const vol = item.volume || 0;
                                                if (isDimUnit && vol !== (Number(item.quantity) || 0)) {
                                                    const formula = u === 'md' || u === 'mét dài' || u === 'm'
                                                        ? `${item.length || 0} × ${item.quantity || 0}`
                                                        : u === 'm²' || u === 'm2'
                                                            ? `${item.length || 0} × ${item.width || 0} × ${item.quantity || 0}`
                                                            : `${item.length || 0} × ${item.width || 0} × ${item.height || 0} × ${item.quantity || 0}`;
                                                    return (
                                                        <span title={formula} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                                                            {fmt(vol)}
                                                            <span style={{ fontSize: 8, background: 'var(--accent-primary)', color: '#fff', padding: '1px 3px', borderRadius: 3, lineHeight: 1 }}>auto</span>
                                                        </span>
                                                    );
                                                }
                                                return <span style={{ opacity: vol > 0 ? 1 : 0.3, fontSize: 11 }}>{fmt(vol)}</span>;
                                            })()}
                                        </td>
                                        <td>
                                            {(() => {
                                                const opts = unitOpts.includes(item.unit) ? unitOpts : [item.unit, ...unitOpts];
                                                return (
                                                    <select className="form-select form-input-compact" value={item.unit} onChange={e => updateItem(mi, si, ii, 'unit', e.target.value)}>
                                                        {opts.map(u => <option key={u} value={u}>{u}</option>)}
                                                    </select>
                                                );
                                            })()}
                                        </td>
                                        <td><input className="form-input form-input-compact" type="number" value={item.unitPrice || ''} onChange={e => updateItem(mi, si, ii, 'unitPrice', e.target.value)} /></td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)', fontSize: 12 }}>{fmt(item.amount)}</td>
                                        <td><input className="form-input form-input-compact" value={item.description} onChange={e => updateItem(mi, si, ii, 'description', e.target.value)} /></td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                <button className="btn btn-ghost" onClick={() => removeItem(mi, si, ii)} style={{ padding: '2px 4px', fontSize: 11 }}>✕</button>
                                                <button className="btn btn-ghost" onClick={() => addSubItem(mi, si, ii)} style={{ padding: '1px 3px', fontSize: 9, opacity: 0.5 }} title="Thêm phụ kiện">+PK</button>
                                                {(() => {
                                                    const hasFurnitureData = item.functionality || item.bodyColorCode || item.doorColorCode || item.hardware || (item.functionalImages?.length > 0);
                                                    return (
                                                        <button className={`btn btn-ghost ${expandedDetails[ii] ? 'btn-active' : ''}`}
                                                            onClick={() => toggleDetail(ii)}
                                                            style={{ padding: '1px 3px', fontSize: 9, opacity: (expandedDetails[ii] || hasFurnitureData) ? 1 : 0.5, color: hasFurnitureData ? '#16a34a' : expandedDetails[ii] ? 'var(--accent-primary)' : undefined, fontWeight: hasFurnitureData ? 800 : 400 }}
                                                            title="Chi tiết nội thất: công năng, màu, phụ kiện">{hasFurnitureData ? '✓NT' : 'NT'}</button>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                    </tr>
                                    {/* Sub-items (phụ kiện) */}
                                    {(item.subItems || []).map((si_item, sii) => (
                                        <tr key={`sub-${item._key}-${sii}`} style={{ background: 'rgba(35,64,147,0.03)' }}>
                                            <td></td>
                                            <td style={{ textAlign: 'center', opacity: 0.3, fontSize: 9 }}>↳</td>
                                            <td style={{ paddingLeft: 24 }}>
                                                <SubItemSearch
                                                    value={si_item.name}
                                                    products={products}
                                                    onChange={v => updateSubItem(mi, si, ii, sii, 'name', v)}
                                                    onSelect={p => {
                                                        updateSubItem(mi, si, ii, sii, 'name', p.name);
                                                        updateSubItem(mi, si, ii, sii, 'unit', p.unit || 'cái');
                                                        updateSubItem(mi, si, ii, sii, 'unitPrice', p.salePrice || 0);
                                                        updateSubItem(mi, si, ii, sii, 'productId', p.id);
                                                    }}
                                                />
                                            </td>
                                            <td><input className="form-input form-input-compact" type="number" value={si_item.length || ''} onChange={e => updateSubItem(mi, si, ii, sii, 'length', e.target.value)} placeholder="0" /></td>
                                            <td><input className="form-input form-input-compact" type="number" value={si_item.width || ''} onChange={e => updateSubItem(mi, si, ii, sii, 'width', e.target.value)} placeholder="0" /></td>
                                            <td><input className="form-input form-input-compact" type="number" value={si_item.height || ''} onChange={e => updateSubItem(mi, si, ii, sii, 'height', e.target.value)} placeholder="0" /></td>
                                            <td><input className="form-input form-input-compact" type="number" value={si_item.quantity || ''} onChange={e => updateSubItem(mi, si, ii, sii, 'quantity', e.target.value)} placeholder="0" /></td>
                                            <td style={{ textAlign: 'right', fontSize: 11, opacity: 0.6 }}>{fmt(si_item.volume || 0)}</td>
                                            <td>
                                                <select className="form-select form-input-compact" value={si_item.unit || 'cái'} onChange={e => updateSubItem(mi, si, ii, sii, 'unit', e.target.value)}>
                                                    {unitOpts.map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                            </td>
                                            <td><input className="form-input form-input-compact" type="number" value={si_item.unitPrice || ''} onChange={e => updateSubItem(mi, si, ii, sii, 'unitPrice', e.target.value)} /></td>
                                            <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 11, opacity: 0.7 }}>{fmt(si_item.amount || 0)}</td>
                                            <td><input className="form-input form-input-compact" value={si_item.description || ''} onChange={e => updateSubItem(mi, si, ii, sii, 'description', e.target.value)} /></td>
                                            <td><button className="btn btn-ghost" onClick={() => removeSubItem(mi, si, ii, sii)} style={{ padding: '2px 4px', fontSize: 10 }}>✕</button></td>
                                        </tr>
                                    ))}
                                    {/* Furniture detail panel */}
                                    {expandedDetails[ii] && (
                                        <FurnitureDetailPanel item={item} mi={mi} si={si} ii={ii} updateItem={updateItem} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div style={{ padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => addItem(mi, si)}>+ Thêm dòng trống</button>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <input
                        ref={quickRef}
                        className="form-input form-input-compact quick-add-input"
                        placeholder="⚡ Nhập nhanh: gõ tên hạng mục hoặc sản phẩm..."
                        value={quickSearch}
                        onChange={e => { setQuickSearch(e.target.value); setShowQuickDrop(true); }}
                        onFocus={() => { hook.setActiveMainIdx(mi); hook.setActiveSubIdx(si); quickResults.length > 0 && setShowQuickDrop(true); }}
                        onKeyDown={handleQuickKeyDown}
                    />
                    {showQuickDrop && quickResults.length > 0 && (
                        <div ref={dropRef} className="quick-add-dropdown">
                            {quickResults.map((r, idx) => (
                                <div key={r.id}
                                    className={`quick-add-option ${idx === quickFocusIdx ? 'quick-add-option-active' : ''}`}
                                    onClick={() => handleQuickAdd(r)}
                                    onMouseEnter={() => setQuickFocusIdx(idx)}>
                                    <span className="quick-add-type">{r._type === 'library' ? '🔨' : '📦'}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="quick-add-name">{r._label}</div>
                                        <div className="quick-add-sub">{r._sub}</div>
                                    </div>
                                    {r._price > 0 && <span className="quick-add-price">{fmt(r._price)}đ</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function CategoryTable({ mi, hook, onImageClick, onSubcategoryImageClick }) {
    const unitOpts = hook.unitOptions || UNIT_OPTIONS;
    const { mainCategories, addSubcategory } = hook;
    const mc = mainCategories[mi];
    if (!mc) return null;

    return (
        <div>
            {mc.subcategories.map((sub, si) => (
                <SubcategorySection key={sub._key} sub={sub} mi={mi} si={si} hook={hook} onImageClick={onImageClick} onSubcategoryImageClick={onSubcategoryImageClick} />
            ))}
            <button className="btn btn-ghost" onClick={() => addSubcategory(mi)}
                style={{ width: '100%', padding: '10px', border: '2px dashed var(--border-color)', borderRadius: 8, fontSize: 13 }}>
                + Thêm khu vực mới
            </button>
        </div>
    );
}
