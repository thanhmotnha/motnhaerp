'use client';
import { useState, useEffect, useRef } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n));

// Budget templates for common construction types
const BUDGET_TEMPLATES = {
    'Nhà phố 3 tầng': [
        { name: 'Xi măng', unit: 'bao', qty: 800, category: 'Vật liệu thô' },
        { name: 'Cát xây', unit: 'm³', qty: 40, category: 'Vật liệu thô' },
        { name: 'Đá 1x2', unit: 'm³', qty: 30, category: 'Vật liệu thô' },
        { name: 'Thép Ø10', unit: 'kg', qty: 2000, category: 'Sắt thép' },
        { name: 'Thép Ø12', unit: 'kg', qty: 1500, category: 'Sắt thép' },
        { name: 'Thép Ø16', unit: 'kg', qty: 800, category: 'Sắt thép' },
        { name: 'Gạch xây', unit: 'viên', qty: 25000, category: 'Vật liệu thô' },
        { name: 'Gạch ốp lát 60x60', unit: 'm²', qty: 200, category: 'Hoàn thiện' },
        { name: 'Sơn nước ngoại thất', unit: 'thùng', qty: 15, category: 'Hoàn thiện' },
        { name: 'Sơn nước nội thất', unit: 'thùng', qty: 20, category: 'Hoàn thiện' },
        { name: 'Ống nước PPR Ø25', unit: 'm', qty: 100, category: 'M&E' },
        { name: 'Dây điện 2.5mm²', unit: 'm', qty: 500, category: 'M&E' },
        { name: 'CB 2P 20A', unit: 'cái', qty: 15, category: 'M&E' },
    ],
    'Biệt thự 2 tầng': [
        { name: 'Xi măng', unit: 'bao', qty: 1200, category: 'Vật liệu thô' },
        { name: 'Cát xây', unit: 'm³', qty: 60, category: 'Vật liệu thô' },
        { name: 'Đá 1x2', unit: 'm³', qty: 45, category: 'Vật liệu thô' },
        { name: 'Thép Ø10', unit: 'kg', qty: 3000, category: 'Sắt thép' },
        { name: 'Thép Ø12', unit: 'kg', qty: 2000, category: 'Sắt thép' },
        { name: 'Thép Ø16', unit: 'kg', qty: 1200, category: 'Sắt thép' },
        { name: 'Thép Ø20', unit: 'kg', qty: 600, category: 'Sắt thép' },
        { name: 'Gạch xây', unit: 'viên', qty: 35000, category: 'Vật liệu thô' },
        { name: 'Gạch ốp lát 80x80', unit: 'm²', qty: 350, category: 'Hoàn thiện' },
        { name: 'Đá granite mặt tiền', unit: 'm²', qty: 60, category: 'Hoàn thiện' },
        { name: 'Sơn nước ngoại thất', unit: 'thùng', qty: 25, category: 'Hoàn thiện' },
        { name: 'Sơn nước nội thất', unit: 'thùng', qty: 30, category: 'Hoàn thiện' },
        { name: 'Ống nước PPR Ø25', unit: 'm', qty: 200, category: 'M&E' },
        { name: 'Dây điện 2.5mm²', unit: 'm', qty: 800, category: 'M&E' },
    ],
    'Nội thất căn hộ': [
        { name: 'Gỗ MDF chống ẩm', unit: 'm²', qty: 80, category: 'Gỗ' },
        { name: 'Vách phẳng MDF', unit: 'm²', qty: 40, category: 'Gỗ' },
        { name: 'Bản lề giảm chấn', unit: 'bộ', qty: 30, category: 'Phụ kiện' },
        { name: 'Ray trượt ngăn kéo', unit: 'bộ', qty: 20, category: 'Phụ kiện' },
        { name: 'Đèn LED panel', unit: 'cái', qty: 15, category: 'Điện' },
        { name: 'Đèn downlight spotlight', unit: 'cái', qty: 25, category: 'Điện' },
        { name: 'Đá thạch anh countertop', unit: 'm dài', qty: 6, category: 'Đá' },
        { name: 'Kính cường lực 10mm', unit: 'm²', qty: 10, category: 'Kính' },
    ],
};

export default function BudgetQuickAdd({ projectId, products, onDone, onClose }) {
    const [mode, setMode] = useState('quick'); // quick | excel | template
    const [rows, setRows] = useState([emptyRow()]);
    const [saving, setSaving] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [activeRowIdx, setActiveRowIdx] = useState(null);
    const fileRef = useRef(null);

    function emptyRow() {
        return { productId: '', productName: '', unit: '', quantity: 1, unitPrice: 0, category: '', _key: Date.now() + Math.random() };
    }

    // Filter products for search
    const filteredProducts = productSearch.length >= 1
        ? products.filter(p =>
            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            p.code.toLowerCase().includes(productSearch.toLowerCase())
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

    const removeRow = (idx) => setRows(prev => prev.filter((_, i) => i !== idx));
    const addRow = () => setRows(prev => [...prev, emptyRow()]);

    // Excel import
    const handleExcelFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const XLSX = (await import('xlsx')).default;
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws);

        // Map Excel columns to our format, be flexible with column names
        const imported = [];
        for (const row of json) {
            const name = row['Tên vật tư'] || row['Vật tư'] || row['name'] || row['Tên'] || '';
            const unit = row['ĐVT'] || row['Đơn vị'] || row['unit'] || '';
            const qty = Number(row['Số lượng'] || row['SL'] || row['quantity'] || row['Qty'] || 0);
            const price = Number(row['Đơn giá'] || row['unitPrice'] || row['Giá'] || 0);
            const category = row['Hạng mục'] || row['Loại'] || row['category'] || '';

            if (!name || qty <= 0) continue;

            // Try to match product from DB by name
            const match = products.find(p =>
                p.name.toLowerCase() === name.toLowerCase() ||
                p.code.toLowerCase() === name.toLowerCase()
            );

            imported.push({
                productId: match?.id || '',
                productName: match?.name || name,
                unit: match?.unit || unit,
                quantity: qty,
                unitPrice: match?.importPrice || price,
                category,
                _key: Date.now() + Math.random(),
            });
        }

        if (imported.length === 0) {
            alert('Không tìm thấy dữ liệu hợp lệ. Cần ít nhất cột "Tên vật tư" và "Số lượng"');
            return;
        }

        setRows(imported);
        setMode('quick'); // switch to quick view to review
        alert(`Đã import ${imported.length} dòng. Kiểm tra và bấm "Tạo tất cả" để lưu.`);
        if (fileRef.current) fileRef.current.value = '';
    };

    // Template import
    const applyTemplate = (templateName) => {
        const template = BUDGET_TEMPLATES[templateName];
        if (!template) return;

        const newRows = template.map(t => {
            const match = products.find(p =>
                p.name.toLowerCase().includes(t.name.toLowerCase())
            );
            return {
                productId: match?.id || '',
                productName: match?.name || t.name,
                unit: match?.unit || t.unit,
                quantity: t.qty,
                unitPrice: match?.importPrice || 0,
                category: t.category,
                _key: Date.now() + Math.random(),
            };
        });

        setRows(newRows);
        setMode('quick');
    };

    // Save all
    const handleSaveAll = async () => {
        const validRows = rows.filter(r => r.productId && r.quantity > 0);
        if (validRows.length === 0) return alert('Không có dòng hợp lệ (cần chọn sản phẩm + SL > 0)');

        setSaving(true);
        try {
            const res = await fetch('/api/material-plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    source: 'Dự toán nhanh',
                    items: validRows.map(r => ({
                        productId: r.productId,
                        quantity: Number(r.quantity),
                        unitPrice: Number(r.unitPrice),
                        category: r.category,
                    })),
                }),
            });
            const result = await res.json();
            if (!res.ok) return alert(result.error || 'Lỗi tạo');
            alert(`Tạo ${result.created} kế hoạch vật tư${result.skipped > 0 ? ` (${result.skipped} đã tồn tại)` : ''}`);
            onDone?.();
        } catch (e) {
            alert('Lỗi kết nối');
        }
        setSaving(false);
    };

    const totalAmount = rows.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0), 0);
    const validCount = rows.filter(r => r.productId && r.quantity > 0).length;
    const unmatchedCount = rows.filter(r => !r.productId && r.productName).length;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 900, width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 style={{ margin: 0 }}>📋 Dự toán vật tư</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                </div>

                {/* Mode tabs */}
                <div style={{ display: 'flex', gap: 4, padding: '8px 20px 0', borderBottom: '1px solid var(--border-light)' }}>
                    {[
                        { key: 'quick', label: '✏️ Nhập nhanh', desc: 'Thêm từng dòng' },
                        { key: 'excel', label: '📊 Import Excel', desc: 'Upload file .xlsx' },
                        { key: 'template', label: '📁 Template', desc: 'Chọn mẫu có sẵn' },
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
                                Cần ít nhất cột: <strong>Tên vật tư</strong> + <strong>Số lượng</strong>
                                <br />Tùy chọn: ĐVT, Đơn giá, Hạng mục
                            </div>
                            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
                                onChange={handleExcelFile}
                                style={{ display: 'none' }} id="excel-upload" />
                            <label htmlFor="excel-upload" className="btn btn-primary"
                                style={{ cursor: 'pointer' }}>
                                📁 Chọn file Excel
                            </label>
                        </div>
                        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                            <strong>Mẹo:</strong> Hệ thống sẽ tự khớp tên vật tư với sản phẩm trong kho.
                            Nếu không khớp, bạn có thể sửa sau khi import.
                        </div>
                    </div>
                )}

                {/* Template picker */}
                {mode === 'template' && (
                    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                        {Object.entries(BUDGET_TEMPLATES).map(([name, items]) => (
                            <div key={name} onClick={() => applyTemplate(name)}
                                style={{
                                    border: '1px solid var(--border-light)', borderRadius: 12, padding: 16,
                                    cursor: 'pointer', transition: 'all 0.2s',
                                    background: 'var(--bg-card)',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'rgba(59,130,246,0.05)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'var(--bg-card)'; }}>
                                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>🏗️ {name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{items.length} hạng mục vật tư</div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                    {[...new Set(items.map(i => i.category))].join(' · ')}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Quick add table (also shows after excel/template import) */}
                {mode === 'quick' && (
                    <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
                        {/* Summary bar */}
                        {unmatchedCount > 0 && (
                            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#d97706' }}>
                                ⚠️ {unmatchedCount} dòng chưa khớp sản phẩm — cần chọn sản phẩm để lưu
                            </div>
                        )}

                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table" style={{ fontSize: 12, width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: 30 }}>#</th>
                                        <th style={{ minWidth: 200 }}>Sản phẩm</th>
                                        <th style={{ width: 60 }}>ĐVT</th>
                                        <th style={{ width: 80 }}>SL</th>
                                        <th style={{ width: 110 }}>Đơn giá</th>
                                        <th style={{ width: 110 }}>Thành tiền</th>
                                        <th style={{ width: 100 }}>Hạng mục</th>
                                        <th style={{ width: 30 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, idx) => (
                                        <tr key={row._key} style={{ background: !row.productId && row.productName ? 'rgba(245,158,11,0.06)' : '' }}>
                                            <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                                            <td style={{ position: 'relative' }}>
                                                {row.productId ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <span style={{ fontWeight: 600 }}>{row.productName}</span>
                                                        <button onClick={() => updateRow(idx, 'productId', '')}
                                                            style={{ background: 'none', border: 'none', fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>✕</button>
                                                    </div>
                                                ) : (
                                                    <div style={{ position: 'relative' }}>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            placeholder={row.productName || 'Tìm sản phẩm...'}
                                                            value={activeRowIdx === idx ? productSearch : ''}
                                                            onChange={e => { setProductSearch(e.target.value); setActiveRowIdx(idx); }}
                                                            onFocus={() => setActiveRowIdx(idx)}
                                                            style={{ padding: '4px 8px', fontSize: 12, width: '100%' }}
                                                        />
                                                        {activeRowIdx === idx && filteredProducts.length > 0 && (
                                                            <div style={{
                                                                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                                                                background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                                                                borderRadius: 8, maxHeight: 200, overflow: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                            }}>
                                                                {filteredProducts.map(p => (
                                                                    <div key={p.id} onClick={() => selectProduct(idx, p)}
                                                                        style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border-light)' }}
                                                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                                                                        <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{p.code} · {p.unit}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <input type="text" className="form-input" value={row.unit}
                                                    onChange={e => updateRow(idx, 'unit', e.target.value)}
                                                    style={{ padding: '4px 6px', fontSize: 12, width: '100%', textAlign: 'center' }} />
                                            </td>
                                            <td>
                                                <input type="number" className="form-input" value={row.quantity}
                                                    onChange={e => updateRow(idx, 'quantity', e.target.value)}
                                                    style={{ padding: '4px 6px', fontSize: 12, width: '100%', textAlign: 'right' }} />
                                            </td>
                                            <td>
                                                <input type="number" className="form-input" value={row.unitPrice}
                                                    onChange={e => updateRow(idx, 'unitPrice', e.target.value)}
                                                    style={{ padding: '4px 6px', fontSize: 12, width: '100%', textAlign: 'right' }} />
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 12 }}>
                                                {fmt((Number(row.quantity) || 0) * (Number(row.unitPrice) || 0))}
                                            </td>
                                            <td>
                                                <input type="text" className="form-input" value={row.category}
                                                    onChange={e => updateRow(idx, 'category', e.target.value)}
                                                    style={{ padding: '4px 6px', fontSize: 11, width: '100%' }} />
                                            </td>
                                            <td>
                                                <button onClick={() => removeRow(idx)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14, padding: 0 }}>🗑</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <button onClick={addRow} className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>+ Thêm dòng</button>
                    </div>
                )}

                {/* Footer */}
                {mode === 'quick' && (
                    <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 13 }}>
                            <strong>{validCount}</strong> sản phẩm hợp lệ · Tổng: <strong style={{ color: 'var(--accent-primary)' }}>{fmt(totalAmount)}đ</strong>
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
        </div>
    );
}
