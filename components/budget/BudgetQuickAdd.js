'use client';
import { useState, useRef, useEffect } from 'react';
import { BUDGET_TEMPLATES_DEFAULT, COST_TYPES, GROUP1_PRESETS } from '@/lib/budgetTemplates';
import { apiFetch } from '@/lib/fetchClient';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n));

// Normalize Vietnamese text for fuzzy matching
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').trim();

// Smart product matching: exact name > exact code > normalized includes > word intersection
function findProduct(products, searchName) {
    if (!searchName) return null;
    const s = searchName.trim();
    const sLow = s.toLowerCase();
    const sNorm = norm(s);

    // 1. Exact match (name or code)
    let match = products.find(p => p.name?.toLowerCase() === sLow || p.code?.toLowerCase() === sLow);
    if (match) return match;

    // 2. Normalized exact match
    match = products.find(p => norm(p.name) === sNorm);
    if (match) return match;

    // 3. Substring match (either A includes B or B includes A)
    match = products.find(p => norm(p.name).includes(sNorm) || sNorm.includes(norm(p.name)) || norm(p.code || '').includes(sNorm));
    if (match) return match;

    // 4. Word intersection match (all words in search term exist in product name)
    const searchWords = sNorm.split(' ').filter(Boolean);
    if (searchWords.length > 1) {
        match = products.find(p => {
            const pNorm = norm(p.name);
            return searchWords.every(w => pNorm.includes(w));
        });
        if (match) return match;
    }

    return null;
}

const SUPPLIER_TAGS = ['', 'Công ty cấp', 'Thầu phụ cấp'];
const GROUP2_PRESETS = ['Phòng khách', 'Phòng ngủ 01', 'Phòng ngủ 02', 'Phòng bếp', 'Phòng tắm', 'Ban công', 'Tủ bếp', 'Tủ áo', 'Cầu thang', 'Sân vườn'];

// Load budget templates from DB settings or fallback to defaults
function useBudgetTemplates() {
    const [templates, setTemplates] = useState(BUDGET_TEMPLATES_DEFAULT);
    useEffect(() => {
        apiFetch('/api/admin/settings').then(data => {
            if (data?.budget_templates) {
                try { setTemplates(JSON.parse(data.budget_templates)); } catch { }
            }
        }).catch(() => { });
    }, []);
    return templates;
}

export default function BudgetQuickAdd({ projectId, products, contractors = [], defaultMode = 'materials', onDone, onClose }) {
    const BUDGET_TEMPLATES = useBudgetTemplates();
    const [mode, setMode] = useState('quick'); // quick | excel | template
    const [rows, setRows] = useState([emptyRow(defaultMode === 'subcontractors' ? 'Thầu phụ' : 'Vật tư')]);
    const [saving, setSaving] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [contractorSearch, setContractorSearch] = useState('');
    const [activeRowIdx, setActiveRowIdx] = useState(null);
    const fileRef = useRef(null);

    function emptyRow(costType = 'Vật tư') {
        return { productId: '', productName: '', unit: '', quantity: 1, unitPrice: 0, category: '', costType, group1: '', group2: '', supplierTag: '', _key: Date.now() + Math.random() };
    }

    const filteredProducts = productSearch.length >= 1
        ? products.filter(p =>
            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            p.code.toLowerCase().includes(productSearch.toLowerCase())
        ).slice(0, 10)
        : [];

    const filteredContractors = contractorSearch.length >= 1
        ? contractors.filter(c =>
            c.name.toLowerCase().includes(contractorSearch.toLowerCase()) ||
            (c.code && c.code.toLowerCase().includes(contractorSearch.toLowerCase()))
        ).slice(0, 10)
        : [];

    const updateRow = (idx, field, value) => {
        setRows(prev => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], [field]: value };
            return updated;
        });
    };

    const selectProduct = (idx, product) => {
        setRows(prev => {
            const updated = [...prev];
            updated[idx] = {
                ...updated[idx],
                productId: product.id,
                productName: product.name,
                unit: product.unit,
                unitPrice: product.importPrice || product.salePrice || 0,
            };
            return updated;
        });
        setActiveRowIdx(null);
        setProductSearch('');
    };

    const selectContractor = (idx, contractor) => {
        setRows(prev => {
            const updated = [...prev];
            updated[idx] = {
                ...updated[idx],
                productName: contractor.name,
                supplierTag: contractor.name,
                unit: 'Gói',
            };
            return updated;
        });
        setActiveRowIdx(null);
        setContractorSearch('');
    };

    const removeRow = (idx) => setRows(prev => prev.filter((_, i) => i !== idx));
    const addRow = (costType = 'Vật tư') => setRows(prev => [...prev, emptyRow(costType)]);

    // Excel import
    const handleExcelFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const XLSX = (await import('xlsx')).default;
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws);

        const imported = [];
        for (const row of json) {
            const name = row['Tên vật tư'] || row['Vật tư'] || row['name'] || row['Tên'] || '';
            const unit = row['ĐVT'] || row['Đơn vị'] || row['unit'] || '';
            const qty = Number(row['Số lượng'] || row['SL'] || row['quantity'] || row['Qty'] || 0);
            const price = Number(row['Đơn giá'] || row['unitPrice'] || row['Giá'] || 0);
            const category = row['Hạng mục'] || row['Loại'] || row['category'] || '';
            const costType = row['Loại chi phí'] || row['costType'] || 'Vật tư';
            const group1 = row['Giai đoạn'] || row['group1'] || '';
            const group2 = row['Không gian'] || row['group2'] || '';
            const supplierTag = row['NCC'] || row['supplierTag'] || '';

            if (!name || qty <= 0) continue;

            const match = findProduct(products, name);

            imported.push({
                productId: match?.id || '',
                productName: match?.name || name,
                unit: match?.unit || unit,
                quantity: qty,
                unitPrice: match?.importPrice || price,
                category,
                costType: COST_TYPES.includes(costType) ? costType : 'Vật tư',
                group1, group2, supplierTag,
                _key: Date.now() + Math.random(),
            });
        }

        if (imported.length === 0) {
            alert('Không tìm thấy dữ liệu hợp lệ. Cần ít nhất cột "Tên vật tư" và "Số lượng"');
            return;
        }

        setRows(imported);
        setMode('quick');
        alert(`Đã import ${imported.length} dòng. Kiểm tra và bấm "Tạo tất cả" để lưu.`);
        if (fileRef.current) fileRef.current.value = '';
    };

    // Template import
    const applyTemplate = (templateName) => {
        const template = BUDGET_TEMPLATES[templateName];
        if (!template) return;

        const newRows = template.map(t => {
            const match = findProduct(products, t.name);
            return {
                productId: match?.id || '',
                productName: match?.name || t.name,
                unit: match?.unit || t.unit || '',
                quantity: t.qty,
                unitPrice: match?.importPrice || 0,
                category: t.category || '',
                costType: t.costType || 'Vật tư',
                group1: t.group1 || '',
                group2: t.group2 || '',
                supplierTag: t.supplierTag || '',
                _key: Date.now() + Math.random(),
            };
        });

        setRows(newRows);
        setMode('quick');
    };

    // Save all
    const handleSaveAll = async () => {
        // Rows with name + quantity (even without productId)
        const saveable = rows.filter(r => r.productName && r.productName !== 'Vật tư mới' && Number(r.quantity) > 0);
        if (saveable.length === 0) return alert('Không có dòng hợp lệ (cần có tên SP + SL > 0)');

        setSaving(true);
        try {
            // Auto-create products for unmatched rows
            const needCreate = saveable.filter(r => !r.productId);
            if (needCreate.length > 0) {
                const createRes = await apiFetch('/api/products/batch-create', {
                    method: 'POST',
                    body: JSON.stringify({
                        products: needCreate.map(r => ({
                            name: r.productName,
                            unit: r.unit || 'cái',
                            category: 'Vật liệu',
                            importPrice: Number(r.unitPrice) || 0,
                        })),
                    }),
                });
                if (createRes?.created) {
                    for (const cp of createRes.created) {
                        saveable.forEach(r => {
                            if (!r.productId && r.productName === cp.name) r.productId = cp.id;
                        });
                    }
                }
            }

            const validRows = saveable.filter(r => r.productId);
            if (validRows.length === 0) { setSaving(false); return alert('Không tạo được sản phẩm mới. Vui lòng thử lại.'); }

            const res = await apiFetch('/api/material-plans', {
                method: 'POST',
                body: JSON.stringify({
                    projectId,
                    source: 'Dự toán nhanh',
                    items: validRows.map(r => ({
                        productId: r.productId,
                        quantity: Number(r.quantity),
                        unitPrice: Number(r.unitPrice),
                        category: r.category,
                        costType: r.costType,
                        group1: r.group1,
                        group2: r.group2,
                        supplierTag: r.supplierTag,
                    })),
                }),
            });
            if (res?.error) return alert(res.error);
            alert(`Tạo ${res.created} kế hoạch vật tư${needCreate.length > 0 ? ` (đã tạo ${needCreate.length} SP mới)` : ''}${res.skipped > 0 ? ` · ${res.skipped} đã tồn tại` : ''}`);
            onDone?.();
        } catch (e) {
            alert('Lỗi kết nối: ' + e.message);
        }
        setSaving(false);
    };

    // Batch set group1 for all rows
    const batchSetGroup1 = (val) => setRows(prev => prev.map(r => ({ ...r, group1: val })));

    const totalAmount = rows.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0), 0);
    const validCount = rows.filter(r => r.productId && r.quantity > 0).length;
    const unmatchedCount = rows.filter(r => !r.productId && r.productName).length;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 1100, width: '97vw', maxHeight: '93vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 style={{ margin: 0 }}>📋 Dự toán (Vật tư & Thầu phụ)</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                </div>

                {/* Mode tabs */}
                <div style={{ display: 'flex', gap: 4, padding: '8px 20px 0', borderBottom: '1px solid var(--border-light)' }}>
                    {[
                        { key: 'quick', label: '✏️ Nhập nhanh' },
                        { key: 'excel', label: '📊 Import Excel' },
                        { key: 'template', label: '📁 Template' },
                    ].map(m => (
                        <button key={m.key} onClick={() => setMode(m.key)}
                            style={{
                                padding: '8px 16px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                                borderRadius: '8px 8px 0 0', marginBottom: -1,
                                background: mode === m.key ? 'var(--bg-card)' : 'transparent',
                                color: mode === m.key ? 'var(--accent-primary)' : 'var(--text-muted)',
                                borderBottom: mode === m.key ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            }}>
                            {m.label}
                        </button>
                    ))}
                </div>

                {/* Excel upload */}
                {mode === 'excel' && (
                    <div style={{ padding: 20 }}>
                        <div style={{ border: '2px dashed var(--border-light)', borderRadius: 12, padding: 40, textAlign: 'center' }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Kéo thả file Excel hoặc bấm chọn</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                                Cột bắt buộc: <strong>Tên vật tư</strong> + <strong>Số lượng</strong><br />
                                Tùy chọn: ĐVT, Đơn giá, Hạng mục, <strong>Loại chi phí</strong>, <strong>Giai đoạn</strong>, <strong>Không gian</strong>, NCC
                            </div>
                            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
                                onChange={handleExcelFile}
                                style={{ display: 'none' }} id="excel-upload" />
                            <label htmlFor="excel-upload" className="btn btn-primary" style={{ cursor: 'pointer' }}>
                                📁 Chọn file Excel / file Thiết kế
                            </label>
                        </div>
                    </div>
                )}

                {/* Template picker */}
                {mode === 'template' && (
                    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                        {Object.entries(BUDGET_TEMPLATES).map(([name, items]) => {
                            const costTypes = [...new Set(items.map(i => i.costType))];
                            const groups = [...new Set(items.map(i => i.group1).filter(Boolean))];
                            return (
                                <div key={name} onClick={() => applyTemplate(name)}
                                    style={{
                                        border: '1px solid var(--border-light)', borderRadius: 12, padding: 16,
                                        cursor: 'pointer', transition: 'all 0.2s', background: 'var(--bg-card)',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.transform = 'none'; }}>
                                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>🏗️ {name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{items.length} hạng mục</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                                        📁 {groups.join(' · ')}
                                    </div>
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                        {costTypes.map(ct => (
                                            <span key={ct} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: ct === 'Nhân công' ? '#ede9fe' : ct === 'Thầu phụ' ? '#fff7ed' : '#f0f9ff', color: ct === 'Nhân công' ? '#7c3aed' : ct === 'Thầu phụ' ? '#ea580c' : '#0284c7' }}>{ct}</span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Quick add table */}
                {mode === 'quick' && (() => {
                    const matRows = rows.map((r, i) => ({ ...r, oidx: i })).filter(r => r.costType !== 'Thầu phụ');
                    const subRows = rows.map((r, i) => ({ ...r, oidx: i })).filter(r => r.costType === 'Thầu phụ');

                    return (
                        <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
                            {unmatchedCount > 0 && (
                                <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#d97706' }}>
                                    ⚠️ {unmatchedCount} dòng chưa khớp sản phẩm — cần chọn sản phẩm để lưu
                                </div>
                            )}

                            {/* Batch actions */}
                            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Gán nhanh giai đoạn:</span>
                                {GROUP1_PRESETS.map(g => (
                                    <button key={g} className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 8px' }}
                                        onClick={() => batchSetGroup1(g)}>{g}</button>
                                ))}
                            </div>

                            {defaultMode !== 'subcontractors' && (
                                <div style={{ overflowX: 'auto', marginBottom: 24 }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: 14 }}>🧱 Dự toán Vật tư / Máy / Khác</h4>
                                    <table className="data-table" style={{ fontSize: 12, width: '100%', marginBottom: 8 }}>
                                        <thead>
                                            <tr>
                                                <th style={{ width: 28 }}>#</th>
                                                <th style={{ minWidth: 180 }}>Sản phẩm</th>
                                                <th style={{ width: 55 }}>ĐVT</th>
                                                <th style={{ width: 70 }}>SL</th>
                                                <th style={{ width: 100 }}>Đơn giá</th>
                                                <th style={{ width: 100 }}>Thành tiền</th>
                                                <th style={{ width: 85 }}>Loại CP</th>
                                                <th style={{ width: 100 }}>Giai đoạn</th>
                                                <th style={{ width: 95 }}>Không gian</th>
                                                <th style={{ width: 85 }}>NCC</th>
                                                <th style={{ width: 28 }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {matRows.map((row, idx) => (
                                                <tr key={row._key} style={{ background: !row.productId && row.productName ? 'rgba(245,158,11,0.06)' : '' }}>
                                                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                                                    <td style={{ position: 'relative' }}>
                                                        {row.productId ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <span style={{ fontWeight: 600, fontSize: 11 }}>{row.productName}</span>
                                                                <button onClick={() => updateRow(row.oidx, 'productId', '')}
                                                                    style={{ background: 'none', border: 'none', fontSize: 11, cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>✕</button>
                                                            </div>
                                                        ) : (
                                                            <div style={{ position: 'relative' }}>
                                                                <input type="text" className="form-input"
                                                                    placeholder={row.productName || 'Tìm SP...'}
                                                                    value={activeRowIdx === row.oidx ? productSearch : ''}
                                                                    onChange={e => { setProductSearch(e.target.value); setActiveRowIdx(row.oidx); }}
                                                                    onFocus={() => setActiveRowIdx(row.oidx)}
                                                                    style={{ padding: '3px 6px', fontSize: 11, width: '100%' }} />
                                                                {activeRowIdx === row.oidx && filteredProducts.length > 0 && (
                                                                    <div style={{
                                                                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                                                                        background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                                                                        borderRadius: 8, maxHeight: 200, overflow: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                                    }}>
                                                                        {filteredProducts.map(p => (
                                                                            <div key={p.id} onClick={() => selectProduct(row.oidx, p)}
                                                                                style={{ padding: '5px 8px', cursor: 'pointer', fontSize: 11, borderBottom: '1px solid var(--border-light)' }}
                                                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                                <span style={{ fontWeight: 600 }}>{p.name}</span>
                                                                                <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>{p.code}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td><input type="text" className="form-input" value={row.unit} onChange={e => updateRow(row.oidx, 'unit', e.target.value)} style={{ padding: '3px 4px', fontSize: 11, width: '100%', textAlign: 'center' }} /></td>
                                                    <td><input type="number" className="form-input" value={row.quantity} onChange={e => updateRow(row.oidx, 'quantity', e.target.value)} style={{ padding: '3px 4px', fontSize: 11, width: '100%', textAlign: 'right' }} /></td>
                                                    <td><input type="number" className="form-input" value={row.unitPrice} onChange={e => updateRow(row.oidx, 'unitPrice', e.target.value)} style={{ padding: '3px 4px', fontSize: 11, width: '100%', textAlign: 'right' }} /></td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 11 }}>{fmt((Number(row.quantity) || 0) * (Number(row.unitPrice) || 0))}</td>
                                                    <td>
                                                        <select className="form-input" value={row.costType} onChange={e => updateRow(row.oidx, 'costType', e.target.value)} style={{ padding: '3px 2px', fontSize: 10, width: '100%' }}>
                                                            {COST_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input type="text" className="form-input" list="group1-list" value={row.group1} onChange={e => updateRow(row.oidx, 'group1', e.target.value)} style={{ padding: '3px 4px', fontSize: 10, width: '100%' }} placeholder="VD: Phần thô" />
                                                    </td>
                                                    <td>
                                                        <input type="text" className="form-input" list="group2-list" value={row.group2} onChange={e => updateRow(row.oidx, 'group2', e.target.value)} style={{ padding: '3px 4px', fontSize: 10, width: '100%' }} placeholder="VD: P.Khách" />
                                                    </td>
                                                    <td>
                                                        <select className="form-input" value={row.supplierTag} onChange={e => updateRow(row.oidx, 'supplierTag', e.target.value)} style={{ padding: '3px 2px', fontSize: 10, width: '100%' }}>
                                                            {SUPPLIER_TAGS.map(t => <option key={t} value={t}>{t || '—'}</option>)}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <button onClick={() => removeRow(row.oidx)}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13, padding: 0 }}>🗑</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <button onClick={() => addRow('Vật tư')} className="btn btn-ghost btn-sm">+ Thêm dòng vật tư</button>
                                </div>
                            )}

                            {defaultMode !== 'materials' && (
                                <div style={{ overflowX: 'auto' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: 14 }}>👷 Dự toán Thầu phụ</h4>
                                    <table className="data-table" style={{ fontSize: 12, width: '100%', marginBottom: 8 }}>
                                        <thead>
                                            <tr>
                                                <th style={{ width: 28 }}>#</th>
                                                <th style={{ minWidth: 180 }}>Hạng mục</th>
                                                <th style={{ width: 55 }}>ĐVT</th>
                                                <th style={{ width: 70 }}>SL</th>
                                                <th style={{ width: 100 }}>Đơn giá</th>
                                                <th style={{ width: 100 }}>Thành tiền</th>
                                                <th style={{ width: 85 }}>Loại CP</th>
                                                <th style={{ width: 100 }}>Giai đoạn</th>
                                                <th style={{ width: 95 }}>Không gian</th>
                                                <th style={{ width: 85 }}>NCC</th>
                                                <th style={{ width: 28 }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {subRows.map((row, idx) => (
                                                <tr key={row._key} style={{ background: !row.productId && row.productName ? 'rgba(245,158,11,0.06)' : '' }}>
                                                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                                                    <td style={{ position: 'relative' }}>
                                                        <div style={{ position: 'relative' }}>
                                                            <input type="text" className="form-input"
                                                                placeholder={row.productName || 'Tìm nhà thầu / hạng mục...'}
                                                                value={activeRowIdx === row.oidx ? contractorSearch : (row.productName || '')}
                                                                onChange={e => {
                                                                    setContractorSearch(e.target.value);
                                                                    updateRow(row.oidx, 'productName', e.target.value);
                                                                    setActiveRowIdx(row.oidx);
                                                                }}
                                                                onFocus={() => setActiveRowIdx(row.oidx)}
                                                                style={{ padding: '3px 6px', fontSize: 11, width: '100%' }} />
                                                            {activeRowIdx === row.oidx && filteredContractors.length > 0 && (
                                                                <div style={{
                                                                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                                                                    background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                                                                    borderRadius: 8, maxHeight: 200, overflow: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                                }}>
                                                                    {filteredContractors.map(c => (
                                                                        <div key={c.id} onClick={() => selectContractor(row.oidx, c)}
                                                                            style={{ padding: '5px 8px', cursor: 'pointer', fontSize: 11, borderBottom: '1px solid var(--border-light)' }}
                                                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                            <span style={{ fontWeight: 600 }}>{c.name}</span>
                                                                            {c.phone && <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>- {c.phone}</span>}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td><input type="text" className="form-input" value={row.unit} onChange={e => updateRow(row.oidx, 'unit', e.target.value)} style={{ padding: '3px 4px', fontSize: 11, width: '100%', textAlign: 'center' }} /></td>
                                                    <td><input type="number" className="form-input" value={row.quantity} onChange={e => updateRow(row.oidx, 'quantity', e.target.value)} style={{ padding: '3px 4px', fontSize: 11, width: '100%', textAlign: 'right' }} /></td>
                                                    <td><input type="number" className="form-input" value={row.unitPrice} onChange={e => updateRow(row.oidx, 'unitPrice', e.target.value)} style={{ padding: '3px 4px', fontSize: 11, width: '100%', textAlign: 'right' }} /></td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 11 }}>{fmt((Number(row.quantity) || 0) * (Number(row.unitPrice) || 0))}</td>
                                                    <td>
                                                        <select className="form-input" value={row.costType} onChange={e => updateRow(row.oidx, 'costType', e.target.value)} style={{ padding: '3px 2px', fontSize: 10, width: '100%' }}>
                                                            {COST_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input type="text" className="form-input" list="group1-list" value={row.group1} onChange={e => updateRow(row.oidx, 'group1', e.target.value)} style={{ padding: '3px 4px', fontSize: 10, width: '100%' }} placeholder="VD: Phần thô" />
                                                    </td>
                                                    <td>
                                                        <input type="text" className="form-input" list="group2-list" value={row.group2} onChange={e => updateRow(row.oidx, 'group2', e.target.value)} style={{ padding: '3px 4px', fontSize: 10, width: '100%' }} placeholder="VD: P.Khách" />
                                                    </td>
                                                    <td>
                                                        <select className="form-input" value={row.supplierTag} onChange={e => updateRow(row.oidx, 'supplierTag', e.target.value)} style={{ padding: '3px 2px', fontSize: 10, width: '100%' }}>
                                                            {SUPPLIER_TAGS.map(t => <option key={t} value={t}>{t || '—'}</option>)}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <button onClick={() => removeRow(row.oidx)}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13, padding: 0 }}>🗑</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <button onClick={() => addRow('Thầu phụ')} className="btn btn-ghost btn-sm">+ Thêm dòng thầu phụ</button>
                                </div>
                            )}

                            {/* Datalists for autocomplete */}
                            <datalist id="group1-list">{GROUP1_PRESETS.map(g => <option key={g} value={g} />)}</datalist>
                            <datalist id="group2-list">{GROUP2_PRESETS.map(g => <option key={g} value={g} />)}</datalist>
                        </div>
                    );
                })()}

                {/* Footer */}
                {mode === 'quick' && (
                    <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 13 }}>
                            <strong>{validCount}</strong> SP hợp lệ · Tổng: <strong style={{ color: 'var(--accent-primary)' }}>{fmt(totalAmount)}đ</strong>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-secondary btn-sm" onClick={onClose}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSaveAll} disabled={saving || validCount === 0}>
                                {saving ? '⏳ Đang tạo...' : `✅ Tạo tất cả (${validCount})`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
