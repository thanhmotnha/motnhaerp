'use client';
import { useState, useRef, useEffect } from 'react';
import { BUDGET_TEMPLATES_DEFAULT, COST_TYPES, GROUP1_PRESETS } from '@/lib/budgetTemplates';
import { apiFetch } from '@/lib/fetchClient';

// Normalize Vietnamese text for fuzzy matching
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').trim();

// Smart product matching: exact name > exact code > normalized includes > word intersection
function findProduct(products, searchName) {
    if (!searchName || !products) return null;
    const s = searchName.trim();
    const sLow = s.toLowerCase();
    const sNorm = norm(s);

    let match = products.find(p => p.name?.toLowerCase() === sLow || p.code?.toLowerCase() === sLow);
    if (match) return match;

    match = products.find(p => norm(p.name) === sNorm);
    if (match) return match;

    match = products.find(p => norm(p.name).includes(sNorm) || sNorm.includes(norm(p.name)) || norm(p.code || '').includes(sNorm));
    if (match) return match;

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

/**
 * Budget Template Tab for Settings page
 * Supports: manual edit, Excel import with product matching, template CRUD
 */
export default function BudgetTemplateTab({ budgetTemplates, setBudgetTemplates, toast }) {
    const [importState, setImportState] = useState(null); // { targetTemplate, rows, step }
    const [products, setProducts] = useState([]);
    const [productsLoaded, setProductsLoaded] = useState(false);
    const [importing, setImporting] = useState(false); // loading state for OCR/Excel
    const fileRef = useRef(null);
    const imgRef = useRef(null);

    // Load products for matching
    const ensureProducts = async () => {
        if (productsLoaded) return products;
        try {
            const data = await apiFetch('/api/products?limit=5000');
            const list = data.data || data || [];
            setProducts(list);
            setProductsLoaded(true);
            return list;
        } catch { return []; }
    };

    // ===== Excel Import — smart parser for real-world budget Excel =====
    const handleExcelFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);

        try {
            const prods = await ensureProducts();

            const XLSX = (await import('xlsx')).default;
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data, { cellDates: true });
            const ws = wb.Sheets[wb.SheetNames[0]];

            // Get all rows as 2D array (handles merged cells better than sheet_to_json)
            const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            console.log('[Budget Import] Total rows:', allRows.length, 'First 5:', allRows.slice(0, 5));

            if (allRows.length < 2) { toast.error('File rỗng'); setImporting(false); return; }

            // Auto-detect header row: find row containing "vật tư" or "tên" in any cell
            let headerIdx = -1;
            const HEADER_KEYWORDS = ['vật tư', 'tên vật tư', 'tên', 'hạng mục', 'đơn vị', 'khối lượng'];
            for (let i = 0; i < Math.min(allRows.length, 20); i++) {
                const row = allRows[i].map(c => String(c || '').toLowerCase().trim());
                const matchCount = row.filter(c => HEADER_KEYWORDS.some(kw => c.includes(kw))).length;
                if (matchCount >= 2) { // Need at least 2 matching keywords for confidence
                    headerIdx = i;
                    break;
                }
            }

            // Fallback: try single keyword match
            if (headerIdx < 0) {
                for (let i = 0; i < Math.min(allRows.length, 20); i++) {
                    const row = allRows[i].map(c => String(c || '').toLowerCase().trim());
                    if (row.some(c => c.includes('vật tư') || c.includes('tên vật tư'))) {
                        headerIdx = i;
                        break;
                    }
                }
            }

            console.log('[Budget Import] Header row index:', headerIdx);
            if (headerIdx < 0) {
                toast.error('Không tìm thấy dòng header. Thử dùng "📷 Dán ảnh" thay thế.');
                setImporting(false);
                return;
            }

            // Map column indices by fuzzy header matching
            const headers = allRows[headerIdx].map(c => String(c || '').toLowerCase().trim());
            console.log('[Budget Import] Headers:', headers);
            const findCol = (...keywords) => headers.findIndex(h => keywords.some(kw => h.includes(kw)));

            const colName = findCol('tên vật tư', 'vật tư', 'tên', 'hạng mục');
            const colUnit = findCol('đơn vị', 'đvt');
            const colQty = findCol('khối lượng', 'số lượng', 'sl', 'qty');
            const colPrice = findCol('giá gốc', 'đơn giá', 'giá');
            const colTotal = findCol('thành tiền', 'tổng');

            console.log('[Budget Import] Col indices:', { colName, colUnit, colQty, colPrice, colTotal });

            if (colName < 0) {
                toast.error(`Không tìm thấy cột tên vật tư. Headers: [${headers.filter(Boolean).join(', ')}]. Thử dùng "📷 Dán ảnh" thay thế.`);
                setImporting(false);
                return;
            }

            // Parse data rows (after header)
            const imported = [];
            let currentGroup = '';
            const SKIP_PATTERNS = /^(tổng|cộng|total|tổng cộng)/i;

            for (let i = headerIdx + 1; i < allRows.length; i++) {
                const row = allRows[i];
                const name = String(row[colName] || '').trim();
                const stt = String(row[0] || '').trim();

                if (!name) continue;
                if (SKIP_PATTERNS.test(name)) continue;

                const unit = colUnit >= 0 ? String(row[colUnit] || '').trim() : '';
                const qtyVal = colQty >= 0 ? Number(row[colQty]) : 0;
                const isGroupHeader = (
                    (/^[IVX]+$/i.test(stt) && !qtyVal) ||
                    (name === name.toUpperCase() && name.length > 2 && !unit) ||
                    (!unit && !qtyVal && colTotal >= 0 && Number(row[colTotal]) > 0 && !Number(row[colPrice]))
                );

                if (isGroupHeader) {
                    currentGroup = name.replace(/^[IVX]+\.?\s*/i, '').trim();
                    continue;
                }

                const qty = qtyVal || 1;
                const price = colPrice >= 0 ? Number(row[colPrice]) || 0 : 0;

                let costType = 'Vật tư';
                const groupLower = currentGroup.toLowerCase();
                if (groupLower.includes('nhân công') || groupLower.includes('lao động')) costType = 'Nhân công';
                else if (groupLower.includes('máy') || groupLower.includes('thiết bị')) costType = 'Khác';
                else if (groupLower.includes('thầu phụ')) costType = 'Thầu phụ';

                const match = findProduct(prods, name);

                imported.push({
                    name: match?.name || name,
                    unit: match?.unit || unit,
                    qty, unitPrice: price, costType,
                    group1: currentGroup || '',
                    productId: match?.id || null,
                    productMatch: match || null,
                    _key: Date.now() + Math.random() + i,
                });
            }

            console.log('[Budget Import] Imported rows:', imported.length);

            if (imported.length === 0) {
                toast.error(`Không tìm thấy dữ liệu hợp lệ sau header dòng ${headerIdx + 1}. Thử dùng "📷 Dán ảnh" thay thế.`);
                setImporting(false);
                return;
            }

            const templateNames = Object.keys(budgetTemplates);
            setImportState({ targetTemplate: templateNames[0] || 'Mẫu mới', rows: imported, step: 'review' });
            toast.success(`Đã đọc ${imported.length} hạng mục từ Excel`);
        } catch (err) {
            console.error('[Budget Import] Error:', err);
            toast.error(`Lỗi đọc Excel: ${err.message}. Thử dùng "📷 Dán ảnh" thay thế.`);
        }
        setImporting(false);
        if (fileRef.current) fileRef.current.value = '';
    };

    // ===== Image OCR Import — Gemini Vision =====
    const handleImageFile = async (file) => {
        if (!file) return;
        setImporting(true);
        toast.info?.('🔍 Đang nhận dạng ảnh...') || toast.success('🔍 Đang nhận dạng ảnh...');

        try {
            const prods = await ensureProducts();

            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/ocr-budget', { method: 'POST', body: formData });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'OCR failed');

            const items = data.items || [];
            console.log('[OCR Budget] Items:', items);

            if (items.length === 0) {
                toast.error('Không nhận dạng được hạng mục. Thử chụp rõ hơn hoặc dùng Excel.');
                setImporting(false);
                return;
            }

            // Match products
            const imported = items.map((item, i) => {
                const match = findProduct(prods, item.name);
                return {
                    name: match?.name || item.name,
                    unit: match?.unit || item.unit || '',
                    qty: Number(item.qty) || 1,
                    unitPrice: Number(item.unitPrice) || 0,
                    costType: COST_TYPES.includes(item.costType) ? item.costType : 'Vật tư',
                    group1: item.group || '',
                    productId: match?.id || null,
                    productMatch: match || null,
                    _key: Date.now() + Math.random() + i,
                };
            });

            const templateNames = Object.keys(budgetTemplates);
            setImportState({ targetTemplate: templateNames[0] || 'Mẫu mới', rows: imported, step: 'review' });
            toast.success(`Nhận dạng được ${imported.length} hạng mục từ ảnh`);
        } catch (err) {
            console.error('[OCR Budget] Error:', err);
            toast.error(`Lỗi nhận dạng: ${err.message}`);
        }
        setImporting(false);
        if (imgRef.current) imgRef.current.value = '';
    };

    const handleImageInput = (e) => {
        const file = e.target.files?.[0];
        if (file) handleImageFile(file);
    };

    // Handle paste from clipboard
    const handlePaste = async (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) handleImageFile(file);
                return;
            }
        }
    };

    const confirmImport = () => {
        if (!importState) return;
        const { targetTemplate, rows } = importState;

        const cleanRows = rows.map(r => ({
            name: r.name,
            unit: r.unit,
            qty: r.qty,
            costType: r.costType,
            group1: r.group1,
        }));

        setBudgetTemplates(prev => ({
            ...prev,
            [targetTemplate]: [...(prev[targetTemplate] || []), ...cleanRows],
        }));

        toast.success(`Đã thêm ${cleanRows.length} hạng mục vào mẫu "${targetTemplate}"`);
        setImportState(null);
    };

    // ===== Product search for import review + template editing =====
    const [searchQ, setSearchQ] = useState('');
    const [activeIdx, setActiveIdx] = useState(null);
    // Template row product search: key = "tpl:templateName:rowIdx"
    const [tplSearchQ, setTplSearchQ] = useState('');
    const [tplActiveKey, setTplActiveKey] = useState(null);

    const filteredProds = searchQ.length >= 1
        ? products.filter(p => p.name.toLowerCase().includes(searchQ.toLowerCase()) || p.code?.toLowerCase().includes(searchQ.toLowerCase())).slice(0, 10)
        : [];

    const tplFilteredProds = tplSearchQ.length >= 1
        ? products.filter(p => p.name.toLowerCase().includes(tplSearchQ.toLowerCase()) || p.code?.toLowerCase().includes(tplSearchQ.toLowerCase())).slice(0, 10)
        : [];

    const selectProductForRow = (idx, product) => {
        setImportState(prev => ({
            ...prev,
            rows: prev.rows.map((r, i) => i === idx ? { ...r, name: product.name, unit: product.unit || r.unit, productId: product.id, productMatch: product } : r),
        }));
        setActiveIdx(null);
        setSearchQ('');
    };

    const updateImportRow = (idx, field, value) => {
        setImportState(prev => ({
            ...prev,
            rows: prev.rows.map((r, i) => i === idx ? { ...r, [field]: value } : r),
        }));
    };

    const removeImportRow = (idx) => {
        setImportState(prev => ({
            ...prev,
            rows: prev.rows.filter((_, i) => i !== idx),
        }));
    };

    const unmatchedCount = importState?.rows.filter(r => !r.productMatch).length || 0;

    return (
        <div onPaste={handlePaste}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, paddingBottom: 8, borderBottom: '2px solid var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        🧱 Mẫu dự toán vật tư
                    </h4>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '-8px 0 0 0' }}>Khi tạo dự toán nhanh → tab Template, hệ thống dùng mẫu này.</p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {/* Image OCR Button */}
                    <input ref={imgRef} type="file" accept="image/*" onChange={handleImageInput} style={{ display: 'none' }} id="budget-img-import" />
                    <label htmlFor="budget-img-import" className="btn btn-primary btn-sm" style={{ cursor: importing ? 'wait' : 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, opacity: importing ? 0.7 : 1 }}>
                        {importing ? '⏳ Đang xử lý...' : '📷 Dán ảnh / Chụp'}
                    </label>
                    {/* Excel Import Button */}
                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelFile} style={{ display: 'none' }} id="budget-excel-import" />
                    <label htmlFor="budget-excel-import" className="btn btn-secondary btn-sm" style={{ cursor: importing ? 'wait' : 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, opacity: importing ? 0.7 : 1 }}>
                        📊 Import Excel
                    </label>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setBudgetTemplates({ ...BUDGET_TEMPLATES_DEFAULT })}>🔄 Reset</button>
                    <button className="btn btn-primary btn-sm" onClick={() => {
                        const name = prompt('Tên mẫu dự toán mới:');
                        if (!name || budgetTemplates[name]) return;
                        setBudgetTemplates(prev => ({ ...prev, [name]: [{ name: 'Vật tư mới', unit: 'cái', qty: 1, costType: 'Vật tư', group1: 'Phần thô' }] }));
                    }}>➕ Thêm mẫu</button>
                </div>
            </div>

            {/* Paste zone hint */}
            {!importState && !importing && (
                <div style={{ background: 'rgba(59,130,246,0.05)', border: '2px dashed rgba(59,130,246,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                    💡 <strong>Ctrl+V</strong> để dán ảnh bảng dự toán từ clipboard · hoặc bấm <strong>📷 Dán ảnh</strong> để chọn file ảnh · <strong>📊 Import Excel</strong> cho file .xlsx
                </div>
            )}

            {/* Loading state */}
            {importing && (
                <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, padding: '20px', marginBottom: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Đang xử lý...</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Nhận dạng và phân tích dữ liệu</div>
                </div>
            )}

            {/* ===== Import Review Modal ===== */}
            {importState?.step === 'review' && (
                <div style={{ border: '2px solid var(--accent-primary)', borderRadius: 12, marginBottom: 20, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(99,102,241,0.05))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>📊 Review Import Excel — {importState.rows.length} dòng</div>
                            {unmatchedCount > 0 && (
                                <div style={{ fontSize: 11, color: '#d97706', marginTop: 4 }}>
                                    ⚠️ {unmatchedCount} dòng chưa khớp sản phẩm — có thể bỏ qua hoặc chọn SP tương ứng
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: 12 }}>Thêm vào:</span>
                            <select className="form-select" style={{ fontSize: 12, width: 'auto' }}
                                value={importState.targetTemplate}
                                onChange={e => setImportState(prev => ({ ...prev, targetTemplate: e.target.value }))}>
                                {Object.keys(budgetTemplates).map(n => <option key={n} value={n}>{n}</option>)}
                                <option value="__new__">+ Mẫu mới...</option>
                            </select>
                            {importState.targetTemplate === '__new__' && (
                                <input className="form-input" placeholder="Tên mẫu mới" style={{ fontSize: 12, width: 160 }}
                                    onChange={e => setImportState(prev => ({ ...prev, targetTemplate: e.target.value }))} />
                            )}
                        </div>
                    </div>

                    <div style={{ maxHeight: 500, overflowY: 'auto', padding: '0' }}>
                        <table className="data-table" style={{ margin: 0, fontSize: 12 }}>
                            <thead><tr>
                                <th style={{ width: 30 }}>#</th>
                                <th style={{ minWidth: 200 }}>Tên vật tư / Sản phẩm</th>
                                <th style={{ width: 60 }}>ĐVT</th>
                                <th style={{ width: 70 }}>SL</th>
                                <th style={{ width: 90 }}>Loại CP</th>
                                <th style={{ width: 130 }}>Giai đoạn</th>
                                <th style={{ width: 70 }}>Khớp SP?</th>
                                <th style={{ width: 30 }}></th>
                            </tr></thead>
                            <tbody>
                                {importState.rows.map((row, idx) => (
                                    <tr key={row._key} style={{ background: row.productMatch ? '' : 'rgba(245,158,11,0.06)' }}>
                                        <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                                        <td style={{ position: 'relative' }}>
                                            {row.productMatch ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <span style={{ fontSize: 10, color: 'var(--status-success)' }}>✓</span>
                                                    <input className="form-input" value={row.name} onChange={e => updateImportRow(idx, 'name', e.target.value)} style={{ fontSize: 12, flex: 1 }} />
                                                    <button onClick={() => updateImportRow(idx, 'productMatch', null)}
                                                        style={{ background: 'none', border: 'none', fontSize: 11, cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>✕</button>
                                                </div>
                                            ) : (
                                                <div style={{ position: 'relative' }}>
                                                    <input className="form-input" placeholder={row.name || 'Tìm SP...'}
                                                        value={activeIdx === idx ? searchQ : ''}
                                                        onChange={e => { setSearchQ(e.target.value); setActiveIdx(idx); }}
                                                        onFocus={() => { setActiveIdx(idx); ensureProducts(); }}
                                                        style={{ fontSize: 12, width: '100%', borderColor: 'var(--status-warning)' }} />
                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Excel: {row.name}</div>
                                                    {activeIdx === idx && filteredProds.length > 0 && (
                                                        <div style={{
                                                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                                                            background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                                                            borderRadius: 8, maxHeight: 200, overflow: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                        }}>
                                                            {filteredProds.map(p => (
                                                                <div key={p.id} onClick={() => selectProductForRow(idx, p)}
                                                                    style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 11, borderBottom: '1px solid var(--border-light)' }}
                                                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                                                                    <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 10 }}>{p.code} · {p.unit}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td><input className="form-input" value={row.unit} onChange={e => updateImportRow(idx, 'unit', e.target.value)} style={{ fontSize: 11, textAlign: 'center' }} /></td>
                                        <td><input type="number" className="form-input" value={row.qty} onChange={e => updateImportRow(idx, 'qty', Number(e.target.value))} style={{ fontSize: 11, textAlign: 'right' }} /></td>
                                        <td>
                                            <select className="form-input" value={row.costType} onChange={e => updateImportRow(idx, 'costType', e.target.value)} style={{ fontSize: 10 }}>
                                                {COST_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                                            </select>
                                        </td>
                                        <td><input className="form-input" list="import-group1-list" value={row.group1} onChange={e => updateImportRow(idx, 'group1', e.target.value)} style={{ fontSize: 11 }} /></td>
                                        <td style={{ textAlign: 'center' }}>
                                            {row.productMatch
                                                ? <span className="badge success" style={{ fontSize: 9 }}>✓ Khớp</span>
                                                : <span className="badge warning" style={{ fontSize: 9 }}>—</span>}
                                        </td>
                                        <td>
                                            <button style={{ background: 'none', border: 'none', color: 'var(--status-danger)', cursor: 'pointer', fontSize: 12 }} onClick={() => removeImportRow(idx)}>✕</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <datalist id="import-group1-list">{GROUP1_PRESETS.map(g => <option key={g} value={g} />)}</datalist>

                    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {importState.rows.length} dòng · {importState.rows.length - unmatchedCount} khớp SP · {unmatchedCount} chưa khớp
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setImportState(null)}>Hủy</button>
                            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={confirmImport} disabled={importState.rows.length === 0}>
                                ✅ Xác nhận thêm {importState.rows.length} hạng mục
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== Existing Templates ===== */}
            {Object.entries(budgetTemplates).map(([tplName, items]) => {
                const groups = [...new Set(items.map(i => i.group1).filter(Boolean))];
                return (
                    <div key={tplName} style={{ marginBottom: 20, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ padding: '10px 16px', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <span style={{ fontWeight: 700, fontSize: 14 }}>🏗️ {tplName}</span>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{items.length} hạng mục</span>
                                {groups.length > 0 && <span style={{ fontSize: 10, color: 'var(--text-secondary)', marginLeft: 8 }}>📁 {groups.join(' · ')}</span>}
                            </div>
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--status-danger)' }}
                                onClick={() => { if (confirm(`Xoá mẫu "${tplName}"?`)) setBudgetTemplates(prev => { const c = { ...prev }; delete c[tplName]; return c; }); }}>
                                🗑️
                            </button>
                        </div>
                        <div style={{ overflowX: 'visible' }}>
                            <table className="data-table" style={{ margin: 0, fontSize: 12 }}>
                                <thead><tr><th style={{ width: 30 }}>#</th><th>Tên vật tư</th><th style={{ width: 60 }}>ĐVT</th><th style={{ width: 70 }}>SL</th><th style={{ width: 90 }}>Loại CP</th><th style={{ width: 130 }}>Giai đoạn</th><th style={{ width: 35 }}></th></tr></thead>
                                <tbody>
                                    {items.map((item, i) => (
                                        <tr key={i}>
                                            <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{i + 1}</td>
                                            <td style={{ position: 'relative' }}>
                                                <input className="form-input"
                                                    value={item.name}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setTplSearchQ(val);
                                                        setTplActiveKey(`${tplName}:${i}`);
                                                        setBudgetTemplates(prev => ({ ...prev, [tplName]: prev[tplName].map((it, j) => j === i ? { ...it, name: val } : it) }));
                                                    }}
                                                    onFocus={() => { setTplActiveKey(`${tplName}:${i}`); setTplSearchQ(item.name || ''); ensureProducts(); }}
                                                    onBlur={() => setTimeout(() => { setTplActiveKey(null); setTplSearchQ(''); }, 200)}
                                                    placeholder="Tìm sản phẩm..."
                                                    style={{ fontSize: 12 }} />
                                                {tplActiveKey === `${tplName}:${i}` && tplFilteredProds.length > 0 && (
                                                    <div style={{
                                                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                                                        background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                                                        borderRadius: 8, maxHeight: 200, overflow: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                    }}>
                                                        {tplFilteredProds.map(p => (
                                                            <div key={p.id}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    setBudgetTemplates(prev => ({ ...prev, [tplName]: prev[tplName].map((it, j) => j === i ? { ...it, name: p.name, unit: p.unit || it.unit } : it) }));
                                                                    setTplActiveKey(null);
                                                                    setTplSearchQ('');
                                                                }}
                                                                style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 11, borderBottom: '1px solid var(--border-light)' }}
                                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                <span style={{ fontWeight: 600 }}>{p.name}</span>
                                                                <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 10 }}>{p.code} · {p.unit}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td><input className="form-input" value={item.unit} onChange={e => setBudgetTemplates(prev => ({ ...prev, [tplName]: prev[tplName].map((it, j) => j === i ? { ...it, unit: e.target.value } : it) }))} style={{ fontSize: 11, textAlign: 'center' }} /></td>
                                            <td><input className="form-input" type="number" value={item.qty} onChange={e => setBudgetTemplates(prev => ({ ...prev, [tplName]: prev[tplName].map((it, j) => j === i ? { ...it, qty: Number(e.target.value) } : it) }))} style={{ fontSize: 11, textAlign: 'right' }} /></td>
                                            <td>
                                                <select className="form-input" value={item.costType} onChange={e => setBudgetTemplates(prev => ({ ...prev, [tplName]: prev[tplName].map((it, j) => j === i ? { ...it, costType: e.target.value } : it) }))} style={{ fontSize: 10 }}>
                                                    {COST_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                                                </select>
                                            </td>
                                            <td>
                                                <input className="form-input" list="budget-group1-list" value={item.group1 || ''} onChange={e => setBudgetTemplates(prev => ({ ...prev, [tplName]: prev[tplName].map((it, j) => j === i ? { ...it, group1: e.target.value } : it) }))} style={{ fontSize: 11 }} />
                                            </td>
                                            <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)', fontSize: 11 }} onClick={() => setBudgetTemplates(prev => ({ ...prev, [tplName]: prev[tplName].filter((_, j) => j !== i) }))}>✕</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)' }}>
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setBudgetTemplates(prev => ({ ...prev, [tplName]: [...prev[tplName], { name: '', unit: 'cái', qty: 1, costType: 'Vật tư', group1: '' }] }))}>
                                ➕ Thêm hạng mục
                            </button>
                        </div>
                    </div>
                );
            })}
            <datalist id="budget-group1-list">{GROUP1_PRESETS.map(g => <option key={g} value={g} />)}</datalist>
        </div>
    );
}
