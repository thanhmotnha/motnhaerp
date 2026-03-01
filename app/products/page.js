'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n);
const fmtCur = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const BRANDS = [{ n: '', logo: '' }, { n: 'Dulux', logo: 'https://logo.clearbit.com/dulux.com' }, { n: 'Jotun', logo: 'https://logo.clearbit.com/jotun.com' }, { n: 'TOA', logo: 'https://logo.clearbit.com/toagroup.com' }, { n: 'Nippon', logo: 'https://logo.clearbit.com/nipponpaint.com' }, { n: 'Hafele', logo: 'https://logo.clearbit.com/hafele.com' }, { n: 'Blum', logo: 'https://logo.clearbit.com/blum.com' }, { n: 'Hettich', logo: 'https://logo.clearbit.com/hettich.com' }, { n: 'Panasonic', logo: 'https://logo.clearbit.com/panasonic.com' }, { n: 'Daikin', logo: 'https://logo.clearbit.com/daikin.com' }, { n: 'Mitsubishi', logo: 'https://logo.clearbit.com/mitsubishielectric.com' }, { n: 'Samsung', logo: 'https://logo.clearbit.com/samsung.com' }, { n: 'LG', logo: 'https://logo.clearbit.com/lg.com' }, { n: 'Rossi', logo: 'https://logo.clearbit.com/rossigroup.com.vn' }, { n: 'Caesar', logo: 'https://logo.clearbit.com/caesar.com.tw' }, { n: 'Toto', logo: 'https://logo.clearbit.com/toto.com' }, { n: 'Grohe', logo: 'https://logo.clearbit.com/grohe.com' }, { n: 'HMF', logo: '' }, { n: 'AA', logo: '' }, { n: 'Hoa Phat', logo: 'https://logo.clearbit.com/hoaphat.com.vn' }];
const PRODUCT_CATS = ['Nội thất thành phẩm', 'Gỗ tự nhiên', 'Gỗ công nghiệp', 'Đá & Gạch', 'Sơn & Keo', 'Phụ kiện nội thất', 'Thiết bị điện', 'Vật liệu xây dựng', 'Rèm cửa', 'Thiết bị vệ sinh', 'Điều hòa', 'Decor', 'Đồ rời', 'Phòng thờ'];

// Editable cell
function EditCell({ value, onChange, type = 'text', style = {}, options }) {
    if (options) return (
        <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '2px 4px', border: '1px solid var(--primary)', borderRadius: 4, fontSize: 12, background: 'var(--bg-input)', ...style }}>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    );
    return <input type={type} value={value ?? ''} onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)} style={{ width: '100%', padding: '2px 4px', border: '1px solid var(--primary)', borderRadius: 4, fontSize: 12, background: 'var(--bg-input)', ...style }} />;
}

export default function ProductsPage() {
    const [tab, setTab] = useState('products');

    // Products
    const [products, setProducts] = useState([]);
    const [loadingP, setLoadingP] = useState(true);
    const [searchP, setSearchP] = useState('');
    const [filterCatP, setFilterCatP] = useState('');
    const [editingP, setEditingP] = useState(null); // {id, data}
    const [newProduct, setNewProduct] = useState(null);

    // Library
    const [library, setLibrary] = useState([]);
    const [loadingL, setLoadingL] = useState(true);
    const [searchL, setSearchL] = useState('');
    const [filterCatL, setFilterCatL] = useState('');
    const [editingL, setEditingL] = useState(null);
    const [newLibItem, setNewLibItem] = useState(null);

    // Upload
    const [editingCatName, setEditingCatName] = useState(null);
    const [editingLibCat, setEditingLibCat] = useState(null); // {old, new} for library category rename
    const excelInputRef = useRef(null);
    const [importPreview, setImportPreview] = useState(null);
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(null);
    const [uploadTarget, setUploadTarget] = useState(null);
    const activeThumb = useRef(null);
    const imgUpRef = useRef(null);      // hidden input for product image
    const imgUpTarget = useRef(null);   // 'new' | {id}

    const fetchProducts = () => { setLoadingP(true); fetch('/api/products?limit=1000').then(r => r.json()).then(d => { setProducts(d.data || []); setLoadingP(false); }); };
    const fetchLibrary = () => { setLoadingL(true); fetch('/api/work-item-library?limit=1000').then(r => r.json()).then(d => { setLibrary(d.data || []); setLoadingL(false); }); };
    useEffect(() => { fetchProducts(); fetchLibrary(); }, []);

    // Global paste listener: click ô ảnh → paste ảnh từ clipboard
    const [pasteReady, setPasteReady] = useState(false); // hiện toast "Sẵn sàng paste"
    useEffect(() => {
        const handler = async (e) => {
            if (!imgUpTarget.current) return;
            const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
            if (!item) return;
            e.preventDefault();
            const file = item.getAsFile();
            if (!file) return;
            const fd = new FormData(); fd.append('file', file); fd.append('type', 'products');
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            const { url } = await res.json();
            const target = imgUpTarget.current;
            imgUpTarget.current = null; setPasteReady(false);
            if (target === 'new') {
                setNewProduct(p => ({ ...p, image: url }));
            } else {
                await fetch(`/api/products/${target}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: url }) });
                fetchProducts();
            }
        };
        document.addEventListener('paste', handler);
        return () => document.removeEventListener('paste', handler);
    }, []);

    // --- Products handlers ---
    const [extraCats, setExtraCats] = useState([]);
    const [addingCat, setAddingCat] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const pCats = [...new Set([...products.map(p => p.category), ...extraCats])].sort();
    const filteredP = products.filter(p =>
        (!filterCatP || p.category === filterCatP) &&
        (!searchP || p.name.toLowerCase().includes(searchP.toLowerCase()) || (p.code || '').toLowerCase().includes(searchP.toLowerCase()))
    );

    const startEditP = (p) => setEditingP({ id: p.id, data: { ...p } });
    const saveP = async () => {
        const { id, data } = editingP;
        await fetch(`/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        setEditingP(null); fetchProducts();
    };
    const deleteP = async (id) => { if (!confirm('Xóa sản phẩm?')) return; await fetch(`/api/products/${id}`, { method: 'DELETE' }); fetchProducts(); };
    const duplicateP = async (p) => {
        const { id, code, createdAt, updatedAt, ...rest } = p;
        await fetch('/api/products', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...rest, name: rest.name + ' (2)', stock: 0 }),
        });
        fetchProducts();
    };

    const addNewProduct = () => setNewProduct({ name: '', category: filterCatP || 'Nội thất thành phẩm', unit: 'cái', importPrice: 0, salePrice: 0, stock: 0, minStock: 0, supplier: '', brand: '', description: '', image: '' });

    // Upload ảnh sản phẩm
    const handleImgUpload = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const fd = new FormData(); fd.append('file', file); fd.append('type', 'products');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const { url } = await res.json();
        if (imgUpTarget.current === 'new') {
            setNewProduct(p => ({ ...p, image: url }));
        } else if (imgUpTarget.current) {
            await fetch(`/api/products/${imgUpTarget.current}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: url }) });
            fetchProducts();
        }
        imgUpTarget.current = null; e.target.value = '';
    };
    const saveRenameCategory = async () => {
        if (!editingCatName || editingCatName.new === editingCatName.old) { setEditingCatName(null); return; }
        await fetch('/api/products', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldCategory: editingCatName.old, newCategory: editingCatName.new }) });
        setEditingCatName(null); fetchProducts();
    };
    const saveRenameLibCat = async () => {
        if (!editingLibCat || editingLibCat.new === editingLibCat.old) { setEditingLibCat(null); return; }
        if (!editingLibCat.new.trim()) { setEditingLibCat(null); return; }
        await fetch('/api/work-item-library', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldCategory: editingLibCat.old, newCategory: editingLibCat.new.trim() }) });
        if (filterCatL === editingLibCat.old) setFilterCatL(editingLibCat.new.trim());
        setEditingLibCat(null); fetchLibrary();
    };


    // Excel import
    const handleExcelFile = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const ab = await file.arrayBuffer();
        const wb = XLSX.read(ab, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const preview = rows.map(r => ({
            name: String(r['Tên'] || r['name'] || '').trim(),
            category: String(r['Danh mục'] || r['category'] || 'Nội thất thành phẩm').trim(),
            unit: String(r['ĐVT'] || r['unit'] || 'cái').trim(),
            importPrice: Number(r['Giá nhập'] || r['importPrice'] || 0),
            salePrice: Number(r['Giá bán'] || r['salePrice'] || 0),
            stock: Number(r['Tồn kho'] || r['stock'] || 0),
            brand: String(r['Thương hiệu'] || r['brand'] || '').trim(),
            description: String(r['Mô tả'] || r['description'] || '').trim(),
            image: '',
        })).filter(r => r.name);
        setImportPreview(preview);
        excelInputRef.current.value = '';
    };
    const confirmImport = async () => {
        if (!importPreview?.length) return;
        setImporting(true);
        for (const p of importPreview) {
            await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
        }
        setImporting(false); setImportPreview(null); fetchProducts();
    };
    const saveNewProduct = async () => {
        await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newProduct) });
        setNewProduct(null); fetchProducts();
    };

    // --- Library handlers ---
    const lCats = [...new Set(library.map(i => i.category))].sort();
    const filteredL = library.filter(i =>
        (!filterCatL || i.category === filterCatL) &&
        (!searchL || i.name.toLowerCase().includes(searchL.toLowerCase()) || (i.subcategory || '').toLowerCase().includes(searchL.toLowerCase()))
    );

    const startEditL = (item) => setEditingL({ id: item.id, data: { ...item } });
    const saveL = async () => {
        const { id, data } = editingL;
        await fetch(`/api/work-item-library/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        setEditingL(null); fetchLibrary();
    };
    const deleteL = async (id) => { if (!confirm('Xóa hạng mục?')) return; await fetch(`/api/work-item-library/${id}`, { method: 'DELETE' }); fetchLibrary(); };
    const addNewLib = () => setNewLibItem({ name: '', category: filterCatL || '', subcategory: '', unit: 'cái', mainMaterial: 0, auxMaterial: 0, labor: 0, unitPrice: 0, description: '', image: '' });
    const saveNewLib = async () => {
        await fetch('/api/work-item-library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newLibItem, mainMaterial: Number(newLibItem.mainMaterial), auxMaterial: Number(newLibItem.auxMaterial), labor: Number(newLibItem.labor), unitPrice: Number(newLibItem.unitPrice) }) });
        setNewLibItem(null); fetchLibrary();
    };

    // Upload
    const triggerUpload = (id, entity) => { setUploadTarget({ id, entity }); fileInputRef.current?.click(); };

    const doUploadFile = useCallback(async (file, target) => {
        if (!file || !target) return;
        setUploading(target.id);
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', target.entity === 'product' ? 'products' : 'library');
        try {
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            const { url } = await res.json();
            if (target.entity === 'product') {
                await fetch(`/api/products/${target.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: url }) });
                fetchProducts();
                setEditingP(p => p?.id === target.id ? { ...p, data: { ...p.data, image: url } } : p);
            } else {
                await fetch(`/api/work-item-library/${target.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: url }) });
                fetchLibrary();
                setEditingL(p => p?.id === target.id ? { ...p, data: { ...p.data, image: url } } : p);
            }
        } catch { alert('Upload lỗi'); }
        setUploading(null);
    }, []);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (file && uploadTarget) await doUploadFile(file, uploadTarget);
        setUploadTarget(null); e.target.value = '';
    };

    // Paste ảnh từ clipboard (Ctrl+V) khi đang hover/focus vào thumb
    useEffect(() => {
        const onPaste = async (e) => {
            const target = activeThumb.current;
            if (!target) return;
            const item = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith('image/'));
            if (!item) return;
            e.preventDefault();
            const file = item.getAsFile();
            await doUploadFile(file, target);
        };
        document.addEventListener('paste', onPaste);
        return () => document.removeEventListener('paste', onPaste);
    }, [doUploadFile]);

    const Thumb = ({ image, id, entity }) => (
        <div
            onClick={() => triggerUpload(id, entity)}
            onMouseEnter={() => { activeThumb.current = { id, entity }; }}
            onMouseLeave={() => { if (activeThumb.current?.id === id) activeThumb.current = null; }}
            onFocus={() => { activeThumb.current = { id, entity }; }}
            onBlur={() => { if (activeThumb.current?.id === id) activeThumb.current = null; }}
            tabIndex={0}
            title="Click để chọn file · Ctrl+V để paste ảnh"
            style={{ width: 36, height: 36, cursor: 'pointer', flexShrink: 0, position: 'relative', outline: 'none' }}
            className="thumb-wrap"
        >
            {uploading === id
                ? <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⏳</div>
                : image
                    ? <img src={image} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 5, border: '1px solid var(--border-color)', display: 'block' }} />
                    : <div style={{ width: 36, height: 36, borderRadius: 5, border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, opacity: 0.3 }}>📷</div>
            }
            <div className="thumb-overlay">📤</div>
        </div>
    );

    const lowStock = products.filter(p => p.stock <= p.minStock && p.minStock > 0).length;

    return (
        <div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', marginBottom: 20 }}>
                {[['products', `📦 Sản phẩm (${products.length})`], ['library', `🔧 Hạng mục thi công (${library.length})`]].map(([key, label]) => (
                    <button key={key} onClick={() => setTab(key)} style={{ padding: '9px 22px', border: 'none', borderBottom: tab === key ? '2px solid var(--primary)' : '2px solid transparent', background: 'none', marginBottom: -2, fontSize: 13, fontWeight: tab === key ? 700 : 400, color: tab === key ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer' }}>{label}</button>
                ))}
            </div>

            {/* ===== PRODUCTS ===== */}
            {tab === 'products' && (
                <div>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 16 }}>
                        <div className="stat-card"><div className="stat-icon">📦</div><div><div className="stat-value">{products.length}</div><div className="stat-label">Tổng SP</div></div></div>
                        <div className="stat-card"><div className="stat-icon">📂</div><div><div className="stat-value">{pCats.length}</div><div className="stat-label">Danh mục</div></div></div>
                        <div className="stat-card"><div className="stat-icon">⚠️</div><div><div className="stat-value" style={{ color: lowStock > 0 ? 'var(--status-danger)' : '' }}>{lowStock}</div><div className="stat-label">Sắp hết</div></div></div>
                        <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value" style={{ fontSize: 13 }}>{fmtCur(products.reduce((s, p) => s + p.stock * p.salePrice, 0))}</div><div className="stat-label">Giá trị tồn</div></div></div>
                    </div>
                    <div className="card">
                        {/* Category tab bar */}
                        <div style={{ display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', alignItems: 'center', background: 'var(--surface-alt)' }}>
                            <button
                                className={`btn btn-sm ${!filterCatP ? 'btn-primary' : 'btn-ghost'}`}
                                style={{ fontSize: 12, padding: '4px 12px' }}
                                onClick={() => setFilterCatP('')}>Tất cả ({products.length})</button>
                            {pCats.map(c => (
                                <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    {editingCatName?.old === c ? (
                                        <>
                                            <input autoFocus value={editingCatName.new}
                                                onChange={e => setEditingCatName(p => ({ ...p, new: e.target.value }))}
                                                onBlur={saveRenameCategory}
                                                onKeyDown={e => { if (e.key === 'Enter') saveRenameCategory(); if (e.key === 'Escape') setEditingCatName(null); }}
                                                style={{ fontSize: 12, padding: '3px 8px', border: '1px solid var(--primary)', borderRadius: 4, width: 150 }} />
                                            <button className="btn btn-primary btn-sm" onClick={saveRenameCategory}>✓</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingCatName(null)}>✕</button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                className={`btn btn-sm ${filterCatP === c ? 'btn-primary' : 'btn-ghost'}`}
                                                style={{ fontSize: 12, padding: '4px 12px' }}
                                                onClick={() => setFilterCatP(filterCatP === c ? '' : c)}>
                                                {c} ({products.filter(p => p.category === c).length})
                                            </button>
                                            {filterCatP === c && (
                                                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '2px 5px', opacity: 0.6 }}
                                                    title="Đổi tên" onClick={() => setEditingCatName({ old: c, new: c })}>✏️</button>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                            {/* Thêm danh mục mới */}
                            {addingCat ? (
                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                    <input autoFocus value={newCatName} placeholder="Tên danh mục..."
                                        onChange={e => setNewCatName(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && newCatName.trim()) {
                                                const cat = newCatName.trim();
                                                if (!pCats.includes(cat)) setExtraCats(p => [...p, cat]);
                                                setFilterCatP(cat);
                                                setAddingCat(false); setNewCatName('');
                                                setNewProduct({ name: '', category: cat, unit: 'cái', importPrice: 0, salePrice: 0, stock: 0, minStock: 0, supplier: '', brand: '', description: '', image: '' });
                                            }
                                            if (e.key === 'Escape') { setAddingCat(false); setNewCatName(''); }
                                        }}
                                        style={{ fontSize: 12, padding: '3px 8px', border: '1px solid var(--primary)', borderRadius: 4, width: 160 }} />
                                    <span style={{ fontSize: 11, opacity: 0.5 }}>Enter để tạo</span>
                                    <button className="btn btn-ghost btn-sm" onClick={() => { setAddingCat(false); setNewCatName(''); }}>✕</button>
                                </div>
                            ) : (
                                <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, opacity: 0.6 }}
                                    onClick={() => setAddingCat(true)}>+ Danh mục</button>
                            )}
                        </div>
                        <div className="card-header" style={{ borderTop: 'none' }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
                                <input className="form-input" placeholder="Tìm kiếm..." value={searchP} onChange={e => setSearchP(e.target.value)} style={{ maxWidth: 220, fontSize: 13 }} />
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                <button className="btn btn-primary btn-sm" onClick={addNewProduct}>+ Thêm SP</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => excelInputRef.current?.click()}>📥 Import Excel</button>
                                <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleExcelFile} />
                                <a href="data:text/csv;charset=utf-8,%EF%BB%BFT%C3%AAn%2CDanh%20m%E1%BB%A5c%2C%C4%90VT%2CG%C3%ADa%20nh%E1%BA%ADp%2CG%C3%ADa%20b%C3%A1n%2CT%E1%BB%93n%20kho%2CTh%C6%B0%C6%A1ng%20hi%E1%BB%87u%0ASofa%20g%E1%BB%97%2CN%E1%BB%99i%20th%E1%BA%A5t%20th%C3%A0nh%20ph%E1%BA%A9m%2CC%C3%A1i%2C5000000%2C7500000%2C10%2CHM" download="mau-import-sp.csv" style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>⬇ Tải mẫu</a>
                            </div>
                        </div>
                        {loadingP ? <div style={{ padding: 40, textAlign: 'center', opacity: 0.4 }}>Đang tải...</div> : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                    <thead><tr>
                                        <th style={{ width: 44 }}>Ảnh</th>
                                        <th style={{ minWidth: 180 }}>Tên sản phẩm</th>
                                        <th>Danh mục</th>
                                        <th style={{ width: 60 }}>ĐVT</th>
                                        <th style={{ width: 100 }}>Giá bán</th>
                                        <th style={{ width: 60 }}>Tồn</th>
                                        <th style={{ width: 90 }}>Nguồn cung</th>
                                        <th style={{ width: 120 }}>Thương hiệu</th>
                                        <th style={{ width: 100 }}></th>
                                    </tr></thead>
                                    <tbody>
                                        {/* New row */}
                                        {newProduct && (
                                            <tr style={{ background: 'rgba(99,102,241,0.05)' }}>
                                                <td style={{ padding: 4 }}>
                                                    <div style={{ width: 36, height: 36, borderRadius: 5, border: '2px dashed var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}
                                                        title="Click để chọn ảnh"
                                                        onClick={() => { imgUpTarget.current = 'new'; imgUpRef.current?.click(); }}>
                                                        {newProduct.image
                                                            ? <img src={newProduct.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                                            : <span style={{ fontSize: 16, opacity: 0.4 }}>📷</span>
                                                        }
                                                    </div>
                                                </td>
                                                <td><EditCell value={newProduct.name} onChange={v => setNewProduct(p => ({ ...p, name: v }))} /></td>
                                                <td><EditCell value={newProduct.category} onChange={v => setNewProduct(p => ({ ...p, category: v }))} options={PRODUCT_CATS} /></td>
                                                <td><EditCell value={newProduct.unit} onChange={v => setNewProduct(p => ({ ...p, unit: v }))} /></td>
                                                <td><EditCell value={newProduct.salePrice} onChange={v => setNewProduct(p => ({ ...p, salePrice: v }))} type="number" /></td>
                                                <td><EditCell value={newProduct.stock} onChange={v => setNewProduct(p => ({ ...p, stock: v }))} type="number" /></td>
                                                <td><select value={newProduct.supplyType || 'Sẵn kho'} onChange={e => setNewProduct(p => ({ ...p, supplyType: e.target.value }))} style={{ width: '100%', fontSize: 12, padding: '2px 4px', border: '1px solid var(--primary)', borderRadius: 4, background: 'var(--bg-input)' }}><option>Sẵn kho</option><option>Đặt hàng</option><option>Sản xuất</option></select></td>
                                                <td><select value={newProduct.brand} onChange={e => setNewProduct(p => ({ ...p, brand: e.target.value }))} style={{ width: '100%', fontSize: 12, padding: '2px 4px', border: '1px solid var(--primary)', borderRadius: 4, background: 'var(--bg-input)' }}>{BRANDS.map(b => <option key={b.n} value={b.n}>{b.n || '-- Không --'}</option>)}</select></td>
                                                <td><div style={{ display: 'flex', gap: 4 }}>
                                                    <button className="btn btn-primary btn-sm" onClick={saveNewProduct} style={{ fontSize: 11 }}>✓</button>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => setNewProduct(null)} style={{ fontSize: 11 }}>✕</button>
                                                </div></td>
                                            </tr>
                                        )}
                                        {filteredP.map(p => {
                                            const isEditing = editingP?.id === p.id;
                                            const d = isEditing ? editingP.data : p;
                                            return (
                                                <tr key={p.id} style={{ background: isEditing ? 'rgba(99,102,241,0.04)' : p.stock <= p.minStock && p.minStock > 0 ? 'rgba(231,76,60,0.03)' : '' }}>
                                                    <td style={{ padding: 4, cursor: 'pointer' }}
                                                        onClick={() => { imgUpTarget.current = p.id; imgUpRef.current?.click(); }}>
                                                        <div style={{ width: 36, height: 36, borderRadius: 5, overflow: 'hidden', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {d.image
                                                                ? <img src={d.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                                                : <span style={{ fontSize: 16, opacity: 0.25 }}>📷</span>
                                                            }
                                                        </div>
                                                    </td>
                                                    <td>{isEditing
                                                        ? <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                            <EditCell value={d.name} onChange={v => setEditingP(e => ({ ...e, data: { ...e.data, name: v } }))} />
                                                            <EditCell value={d.description || ''} onChange={v => setEditingP(e => ({ ...e, data: { ...e.data, description: v } }))} style={{ fontSize: 11 }} />
                                                        </div>
                                                        : <div>
                                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                                                            <div style={{ fontSize: 11, opacity: 0.45, fontFamily: 'monospace' }}>{p.code}</div>
                                                            {p.description && <div style={{ fontSize: 11, opacity: 0.45, maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>}
                                                        </div>}
                                                    </td>
                                                    <td>{isEditing ? <EditCell value={d.category} onChange={v => setEditingP(e => ({ ...e, data: { ...e.data, category: v } }))} options={PRODUCT_CATS} /> : <span className="badge badge-default">{p.category}</span>}</td>
                                                    <td>{isEditing ? <EditCell value={d.unit} onChange={v => setEditingP(e => ({ ...e, data: { ...e.data, unit: v } }))} /> : p.unit}</td>
                                                    <td style={{ fontWeight: 600 }}>{isEditing ? <EditCell value={d.salePrice} onChange={v => setEditingP(e => ({ ...e, data: { ...e.data, salePrice: v } }))} type="number" /> : fmtCur(p.salePrice)}</td>
                                                    <td style={{ color: p.stock <= p.minStock && p.minStock > 0 ? 'var(--status-danger)' : '' }}>{isEditing ? <EditCell value={d.stock} onChange={v => setEditingP(e => ({ ...e, data: { ...e.data, stock: v } }))} type="number" /> : p.stock}</td>
                                                    <td style={{ fontSize: 12 }}>{isEditing ? (<select value={d.supplyType || 'Sẵn kho'} onChange={e => setEditingP(ep => ({ ...ep, data: { ...ep.data, supplyType: e.target.value } }))} style={{ width: '100%', fontSize: 12, padding: '2px 4px', border: '1px solid var(--primary)', borderRadius: 4, background: 'var(--bg-input)' }}><option>Sẵn kho</option><option>Đặt hàng</option><option>Sản xuất</option></select>) : <span className={`badge ${p.supplyType === 'Đặt hàng' ? 'warning' : p.supplyType === 'Sản xuất' ? 'info' : 'success'}`}>{p.supplyType || 'Sẵn kho'}</span>}</td>
                                                    <td style={{ fontSize: 12 }}>{isEditing ? (<select value={d.brand || ''} onChange={e => setEditingP(ep => ({ ...ep, data: { ...ep.data, brand: e.target.value } }))} style={{ width: '100%', fontSize: 12, padding: '2px 4px', border: '1px solid var(--primary)', borderRadius: 4, background: 'var(--bg-input)' }}>{BRANDS.map(b => <option key={b.n} value={b.n}>{b.n || '-- Không --'}</option>)}</select>) : (() => { const br = BRANDS.find(b => b.n === p.brand); return p.brand ? (<div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>{br?.logo && <img src={br.logo} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />}<span>{p.brand}</span></div>) : <span style={{ opacity: 0.3 }}>-</span>; })()}</td>
                                                    <td><div style={{ display: 'flex', gap: 4 }}>
                                                        {isEditing
                                                            ? <><button className="btn btn-primary btn-sm" onClick={saveP} style={{ fontSize: 11 }}>✓ Lưu</button><button className="btn btn-ghost btn-sm" onClick={() => setEditingP(null)} style={{ fontSize: 11 }}>✕</button></>
                                                            : <><button className="btn btn-ghost btn-sm" onClick={() => startEditP(p)} title="Sửa">✏️</button><button className="btn btn-ghost btn-sm" onClick={() => duplicateP(p)} title="Copy">📋</button><button className="btn btn-ghost btn-sm" onClick={() => deleteP(p.id)} title="Xóa">🗑️</button></>}
                                                    </div></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ===== LIBRARY ===== */}
            {tab === 'library' && (
                <div style={{ display: 'flex', gap: 0, minHeight: 500, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    {/* Sidebar danh mục flat */}
                    <div style={{ width: 210, flexShrink: 0, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--surface-alt)' }}>
                        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.8 }}>DANH MỤC</div>
                        <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>
                            <input className="form-input" placeholder="Tìm kiếm..." value={searchL} onChange={e => setSearchL(e.target.value)} style={{ fontSize: 12, padding: '5px 8px', width: '100%' }} />
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
                            <div
                                onClick={() => setFilterCatL('')}
                                style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: filterCatL === '' ? 'var(--accent-primary)' : 'transparent', color: filterCatL === '' ? '#fff' : 'var(--text-primary)', fontWeight: filterCatL === '' ? 700 : 400, borderRadius: 6, margin: '0 4px' }}
                            >
                                <span>Tất cả</span>
                                <span style={{ fontSize: 11, opacity: 0.75 }}>{library.length}</span>
                            </div>
                            {lCats.map(c => (
                                <div key={c} style={{ margin: '1px 4px' }}>
                                    {editingLibCat?.old === c ? (
                                        <div style={{ padding: '4px 6px' }}>
                                            <input autoFocus value={editingLibCat.new}
                                                onChange={e => setEditingLibCat(p => ({ ...p, new: e.target.value }))}
                                                onBlur={saveRenameLibCat}
                                                onKeyDown={e => { if (e.key === 'Enter') saveRenameLibCat(); if (e.key === 'Escape') setEditingLibCat(null); }}
                                                style={{ width: '100%', fontSize: 12, padding: '4px 8px', border: '1px solid var(--accent-primary)', borderRadius: 6 }} />
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => setFilterCatL(c)}
                                            onDoubleClick={() => setEditingLibCat({ old: c, new: c })}
                                            title="Double-click để đổi tên"
                                            style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: filterCatL === c ? 'var(--accent-primary)' : 'transparent', color: filterCatL === c ? '#fff' : 'var(--text-primary)', fontWeight: filterCatL === c ? 700 : 400, borderRadius: 6 }}
                                        >
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📁 {c}</span>
                                            <span style={{ fontSize: 11, opacity: 0.7, flexShrink: 0, marginLeft: 4 }}>{library.filter(i => i.category === c).length}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '8px', borderTop: '1px solid var(--border-color)' }}>
                            <button className="btn btn-ghost btn-sm" style={{ width: '100%', fontSize: 12 }}
                                onClick={() => { const name = prompt('Tên danh mục mới:'); if (name?.trim()) { setFilterCatL(name.trim()); setNewLibItem({ name: '', category: name.trim(), subcategory: '', unit: 'cái', mainMaterial: 0, auxMaterial: 0, labor: 0, unitPrice: 0, description: '', image: '' }); } }}>
                                + Thêm danh mục
                            </button>
                        </div>
                    </div>

                    {/* Bảng hạng mục */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', overflow: 'hidden' }}>
                        <div className="card-header" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
                                <span style={{ fontSize: 13, fontWeight: 600 }}>
                                    {filterCatL ? `📁 ${filterCatL}` : 'Tất cả hạng mục'}
                                </span>
                                <span style={{ fontSize: 12, opacity: 0.5 }}>({filteredL.length})</span>
                            </div>
                            <button className="btn btn-primary btn-sm" onClick={addNewLib}>+ Thêm HM</button>
                        </div>
                        {loadingL ? <div style={{ padding: 40, textAlign: 'center', opacity: 0.4 }}>Đang tải...</div> : (
                            <div style={{ overflowX: 'auto', flex: 1 }}>
                                <table className="data-table">
                                    <thead><tr>
                                        <th style={{ width: 44 }}>Ảnh</th>
                                        <th style={{ minWidth: 200 }}>Tên hạng mục</th>
                                        <th style={{ width: 55 }}>ĐVT</th>
                                        <th style={{ width: 120 }}>Đơn giá</th>
                                        <th style={{ width: 120 }}>VL chính</th>
                                        <th style={{ width: 100 }}>NC</th>
                                        <th style={{ width: 80 }}></th>
                                    </tr></thead>
                                    <tbody>
                                        {newLibItem && (
                                            <tr style={{ background: 'rgba(99,102,241,0.05)' }}>
                                                <td style={{ padding: 4 }}><div style={{ width: 36, height: 36, borderRadius: 5, border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>📷</div></td>
                                                <td><EditCell value={newLibItem.name} onChange={v => setNewLibItem(p => ({ ...p, name: v }))} /></td>
                                                <td><EditCell value={newLibItem.unit} onChange={v => setNewLibItem(p => ({ ...p, unit: v }))} /></td>
                                                <td><EditCell value={newLibItem.unitPrice} onChange={v => setNewLibItem(p => ({ ...p, unitPrice: v }))} type="number" /></td>
                                                <td><EditCell value={newLibItem.mainMaterial} onChange={v => setNewLibItem(p => ({ ...p, mainMaterial: v }))} type="number" /></td>
                                                <td><EditCell value={newLibItem.labor} onChange={v => setNewLibItem(p => ({ ...p, labor: v }))} type="number" /></td>
                                                <td><div style={{ display: 'flex', gap: 4 }}>
                                                    <button className="btn btn-primary btn-sm" onClick={saveNewLib} style={{ fontSize: 11 }}>✓</button>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => setNewLibItem(null)} style={{ fontSize: 11 }}>✕</button>
                                                </div></td>
                                            </tr>
                                        )}
                                        {filteredL.map(item => {
                                            const isEditing = editingL?.id === item.id;
                                            const d = isEditing ? editingL.data : item;
                                            return (
                                                <tr key={item.id} style={{ background: isEditing ? 'rgba(99,102,241,0.04)' : '' }}>
                                                    <td style={{ padding: 4 }}><Thumb image={d.image} id={item.id} entity="library" /></td>
                                                    <td>{isEditing
                                                        ? <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                            <EditCell value={d.name} onChange={v => setEditingL(e => ({ ...e, data: { ...e.data, name: v } }))} />
                                                            <EditCell value={d.description || ''} onChange={v => setEditingL(e => ({ ...e, data: { ...e.data, description: v } }))} style={{ fontSize: 11 }} />
                                                        </div>
                                                        : <div>
                                                            <div style={{ fontWeight: 500, fontSize: 13 }}>{item.name}</div>
                                                            {item.description && <div style={{ fontSize: 11, opacity: 0.5, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</div>}
                                                        </div>
                                                    }</td>
                                                    <td>{isEditing ? <EditCell value={d.unit} onChange={v => setEditingL(e => ({ ...e, data: { ...e.data, unit: v } }))} /> : item.unit}</td>
                                                    <td style={{ fontWeight: 600 }}>{isEditing ? <EditCell value={d.unitPrice} onChange={v => setEditingL(e => ({ ...e, data: { ...e.data, unitPrice: v } }))} type="number" /> : (item.unitPrice > 0 ? fmt(item.unitPrice) : '-')}</td>
                                                    <td style={{ fontSize: 12 }}>{isEditing ? <EditCell value={d.mainMaterial} onChange={v => setEditingL(e => ({ ...e, data: { ...e.data, mainMaterial: v } }))} type="number" /> : (item.mainMaterial > 0 ? fmt(item.mainMaterial) : '-')}</td>
                                                    <td style={{ fontSize: 12 }}>{isEditing ? <EditCell value={d.labor} onChange={v => setEditingL(e => ({ ...e, data: { ...e.data, labor: v } }))} type="number" /> : (item.labor > 0 ? fmt(item.labor) : '-')}</td>
                                                    <td><div style={{ display: 'flex', gap: 4 }}>
                                                        {isEditing
                                                            ? <><button className="btn btn-primary btn-sm" onClick={saveL} style={{ fontSize: 11 }}>✓ Lưu</button><button className="btn btn-ghost btn-sm" onClick={() => setEditingL(null)} style={{ fontSize: 11 }}>✕</button></>
                                                            : <><button className="btn btn-ghost btn-sm" onClick={() => startEditL(item)}>✏️</button><button className="btn btn-ghost btn-sm" onClick={() => deleteL(item.id)}>🗑️</button></>}
                                                    </div></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Import preview modal */}
            {importPreview && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, maxWidth: 760, width: '95%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 20px 60px rgba(0,0,0,.4)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>📥 Preview Import — {importPreview.length} sản phẩm</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setImportPreview(null)}>✕</button>
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--border-color)', borderRadius: 6 }}>
                            <table className="data-table" style={{ fontSize: 12 }}>
                                <thead><tr><th>#</th><th>Tên</th><th>Danh mục</th><th>ĐVT</th><th>Giá bán</th><th>Tồn</th><th>TH</th></tr></thead>
                                <tbody>{importPreview.map((p, i) => (
                                    <tr key={i}>
                                        <td style={{ opacity: .4 }}>{i + 1}</td>
                                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                                        <td><span className="badge badge-default">{p.category}</span></td>
                                        <td>{p.unit}</td>
                                        <td>{fmtCur(p.salePrice)}</td>
                                        <td>{p.stock}</td>
                                        <td>{p.brand || '-'}</td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={() => setImportPreview(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={confirmImport} disabled={importing}>
                                {importing ? '⏳ Đang import...' : `✅ Xác nhận import ${importPreview.length} SP`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden image upload input (product images) */}
            <input ref={imgUpRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImgUpload} />

            <style>{`
                .thumb-wrap { position: relative; }
                .thumb-wrap .thumb-overlay { position: absolute; inset: 0; border-radius: 5px; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s; font-size: 13px; color: #fff; }
                .thumb-wrap:hover .thumb-overlay { opacity: 1; }
            `}</style>
        </div>
    );
}
