'use client';
import { useState, useRef, useEffect } from 'react';
import { BUDGET_TEMPLATES_DEFAULT, COST_TYPES, GROUP1_PRESETS } from '@/lib/budgetTemplates';
import { apiFetch } from '@/lib/fetchClient';

/**
 * Budget Template Tab for Settings page
 * Supports: manual edit, Excel import with product matching, template CRUD
 */
export default function BudgetTemplateTab({ budgetTemplates, setBudgetTemplates, toast }) {
    const [importState, setImportState] = useState(null); // { targetTemplate, rows, step }
    const [products, setProducts] = useState([]);
    const [productsLoaded, setProductsLoaded] = useState(false);
    const fileRef = useRef(null);

    // Load products for matching
    const ensureProducts = async () => {
        if (productsLoaded) return products;
        try {
            const data = await apiFetch('/api/products?limit=2000');
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

        const prods = await ensureProducts();

        const XLSX = (await import('xlsx')).default;
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, { cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];

        // Get all rows as 2D array (handles merged cells better than sheet_to_json)
        const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (allRows.length < 2) { toast.error('File rỗng'); return; }

        // Auto-detect header row: find row containing "vật tư" or "tên" in any cell
        let headerIdx = -1;
        const HEADER_KEYWORDS = ['vật tư', 'tên vật tư', 'tên', 'hạng mục'];
        for (let i = 0; i < Math.min(allRows.length, 15); i++) {
            const row = allRows[i].map(c => String(c || '').toLowerCase().trim());
            if (row.some(c => HEADER_KEYWORDS.some(kw => c.includes(kw)))) {
                headerIdx = i;
                break;
            }
        }

        if (headerIdx < 0) { toast.error('Không tìm thấy dòng header (cần cột "Tên vật tư")'); return; }

        // Map column indices by fuzzy header matching
        const headers = allRows[headerIdx].map(c => String(c || '').toLowerCase().trim());
        const findCol = (...keywords) => headers.findIndex(h => keywords.some(kw => h.includes(kw)));

        const colName = findCol('tên vật tư', 'vật tư', 'tên', 'hạng mục');
        const colUnit = findCol('đơn vị', 'đvt');
        const colQty = findCol('khối lượng', 'số lượng', 'sl', 'qty');
        const colPrice = findCol('giá gốc', 'đơn giá', 'giá');
        const colTotal = findCol('thành tiền', 'tổng');

        if (colName < 0) { toast.error(`Không tìm thấy cột "Tên vật tư" trong header: [${headers.filter(Boolean).join(', ')}]`); return; }

        // Parse data rows (after header)
        const imported = [];
        let currentGroup = ''; // track group headers like "Phần thô", "I VẬT LIỆU"
        const SKIP_PATTERNS = /^(tổng|cộng|total|tổng cộng)/i;
        const GROUP_PATTERNS = /^[IVX]+\.?\s|^[A-Z]{2,}$/; // Roman numerals or ALL CAPS = group header

        for (let i = headerIdx + 1; i < allRows.length; i++) {
            const row = allRows[i];
            const name = String(row[colName] || '').trim();
            const stt = String(row[0] || '').trim();

            // Skip empty rows
            if (!name) continue;

            // Skip summary/total rows
            if (SKIP_PATTERNS.test(name)) continue;

            // Detect group headers: roman numeral STT (I, II, III) or name is ALL CAPS or no qty/unit
            const unit = colUnit >= 0 ? String(row[colUnit] || '').trim() : '';
            const qtyVal = colQty >= 0 ? Number(row[colQty]) : 0;
            const isGroupHeader = (
                (/^[IVX]+$/i.test(stt) && !qtyVal) ||
                (name === name.toUpperCase() && name.length > 2 && !unit) ||
                (!unit && !qtyVal && colTotal >= 0 && Number(row[colTotal]) > 0 && !Number(row[colPrice]))
            );

            if (isGroupHeader) {
                currentGroup = name.replace(/^[IVX]+\.?\s*/i, '').trim();
                // Auto-detect costType from group name
                continue;
            }

            // Normal data row
            const qty = qtyVal || 1;
            const price = colPrice >= 0 ? Number(row[colPrice]) || 0 : 0;

            // Auto-detect costType from group
            let costType = 'Vật tư';
            const groupLower = currentGroup.toLowerCase();
            if (groupLower.includes('nhân công') || groupLower.includes('lao động')) costType = 'Nhân công';
            else if (groupLower.includes('máy') || groupLower.includes('thiết bị')) costType = 'Khác';
            else if (groupLower.includes('thầu phụ')) costType = 'Thầu phụ';

            // Fuzzy match product
            const nameLower = name.toLowerCase();
            const match = prods.find(p =>
                p.name.toLowerCase() === nameLower ||
                p.code?.toLowerCase() === nameLower ||
                p.name.toLowerCase().includes(nameLower) ||
                nameLower.includes(p.name.toLowerCase())
            );

            imported.push({
                name: match?.name || name,
                unit: match?.unit || unit,
                qty,
                unitPrice: price,
                costType,
                group1: currentGroup || '',
                productId: match?.id || null,
                productMatch: match || null,
                _key: Date.now() + Math.random() + i,
            });
        }

        if (imported.length === 0) {
            toast.error(`Không tìm thấy dữ liệu hợp lệ. Header ở dòng ${headerIdx + 1}, cột tên=[${headers[colName]}]`);
            return;
        }

        // Determine target template
        const templateNames = Object.keys(budgetTemplates);
        let targetTemplate = templateNames[0] || 'Mẫu mới';

        setImportState({ targetTemplate, rows: imported, step: 'review' });
        toast.success(`Đã đọc ${imported.length} hạng mục từ Excel. Kiểm tra và xác nhận bên dưới.`);
        if (fileRef.current) fileRef.current.value = '';
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

    // ===== Product search for import review =====
    const [searchQ, setSearchQ] = useState('');
    const [activeIdx, setActiveIdx] = useState(null);

    const filteredProds = searchQ.length >= 1
        ? products.filter(p => p.name.toLowerCase().includes(searchQ.toLowerCase()) || p.code?.toLowerCase().includes(searchQ.toLowerCase())).slice(0, 10)
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
        <>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, paddingBottom: 8, borderBottom: '2px solid var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        🧱 Mẫu dự toán vật tư
                    </h4>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '-8px 0 0 0' }}>Khi tạo dự toán nhanh → tab Template, hệ thống dùng mẫu này.</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {/* Excel Import Button */}
                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelFile} style={{ display: 'none' }} id="budget-excel-import" />
                    <label htmlFor="budget-excel-import" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
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
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table" style={{ margin: 0, fontSize: 12 }}>
                                <thead><tr><th style={{ width: 30 }}>#</th><th>Tên vật tư</th><th style={{ width: 60 }}>ĐVT</th><th style={{ width: 70 }}>SL</th><th style={{ width: 90 }}>Loại CP</th><th style={{ width: 130 }}>Giai đoạn</th><th style={{ width: 35 }}></th></tr></thead>
                                <tbody>
                                    {items.map((item, i) => (
                                        <tr key={i}>
                                            <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{i + 1}</td>
                                            <td><input className="form-input" value={item.name} onChange={e => setBudgetTemplates(prev => ({ ...prev, [tplName]: prev[tplName].map((it, j) => j === i ? { ...it, name: e.target.value } : it) }))} style={{ fontSize: 12 }} /></td>
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
        </>
    );
}
