'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/fetchClient';

const fmtCur = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const SUPPLY_TYPES = ['Mua ngoài', 'Vật tư đặt hàng', 'Vật tư sản xuất', 'Sản xuất nội bộ', 'Dịch vụ'];
const SUPPLY_ICON = { 'Mua ngoài': '🛒', 'Vật tư đặt hàng': '📦', 'Vật tư sản xuất': '🏭', 'Sản xuất nội bộ': '🔨', 'Dịch vụ': '🧠' };
const SUPPLY_COLOR = {
    'Mua ngoài': { bg: '#f0ebe3', color: '#8a7350' },
    'Vật tư đặt hàng': { bg: '#fef3c7', color: '#92400e' },
    'Vật tư sản xuất': { bg: '#dbeafe', color: '#1e40af' },
    'Sản xuất nội bộ': { bg: '#234093', color: '#fff' },
    'Dịch vụ': { bg: '#f3eeff', color: '#7c3aed' },
};
const normalizeSupply = (t) => (t === 'Mua thương mại' || t === 'Vật tư lưu kho') ? 'Mua ngoài' : (t || 'Mua ngoài');
const CORE_BOARD_TYPES = ['MDF thường', 'MDF chống ẩm', 'MFC', 'Gỗ tự nhiên', 'Nhựa', 'Kính', 'Khác'];

export default function ProductDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [tab, setTab] = useState('info');
    const [product, setProduct] = useState(null);
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    // BOM
    const [bom, setBom] = useState([]);
    const [loadingBom, setLoadingBom] = useState(false);
    const [allProducts, setAllProducts] = useState([]);
    const [bomSearch, setBomSearch] = useState('');
    const [showBomForm, setShowBomForm] = useState(false);
    const [bomForm, setBomForm] = useState({ componentId: '', quantity: 1, unit: '', notes: '' });

    // Kho
    const [txList, setTxList] = useState([]);
    const [loadingTx, setLoadingTx] = useState(false);

    // Biến thể (Attributes)
    const [attributes, setAttributes] = useState([]);
    const [loadingAttr, setLoadingAttr] = useState(true);
    const [attrForm, setAttrForm] = useState({ name: '', inputType: 'select', required: true });
    const [showAttrForm, setShowAttrForm] = useState(false);
    const [optionForms, setOptionForms] = useState({});
    const [showOptionForm, setShowOptionForm] = useState({});
    const [variantTemplates, setVariantTemplates] = useState([]);
    const [showTemplateMenu, setShowTemplateMenu] = useState(false);

    // Categories from DB
    const [allCats, setAllCats] = useState([]);

    function flatCats(cats, depth = 0) {
        const r = [];
        for (const c of cats) {
            r.push({ id: c.id, name: c.name, depth });
            if (c.children?.length) r.push(...flatCats(c.children, depth + 1));
        }
        return r;
    }

    // Preload all data in parallel on mount
    useEffect(() => {
        let cancelled = false;
        Promise.all([
            apiFetch(`/api/products/${id}`).catch(() => null),
            apiFetch('/api/product-categories').catch(() => []),
            apiFetch(`/api/products/${id}/attributes`).catch(() => []),
            apiFetch('/api/variant-templates').catch(() => []),
        ]).then(([p, cats, attrs, templates]) => {
            if (cancelled) return;
            if (!p) { router.push('/products'); return; }
            setProduct(p);
            setForm({ ...p });
            setDirty(false);
            setAllCats(flatCats(cats || []));
            setAttributes(attrs || []);
            setVariantTemplates(templates || []);
            setLoadingAttr(false);
        });
        return () => { cancelled = true; };
    }, [id]);

    const fetchProduct = async () => {
        try {
            const p = await apiFetch(`/api/products/${id}`);
            setProduct(p);
            setForm({ ...p });
            setDirty(false);
        } catch { router.push('/products'); }
    };

    const fetchBom = async () => {
        setLoadingBom(true);
        try { setBom(await apiFetch(`/api/products/${id}/bom`)); } catch { setBom([]); }
        setLoadingBom(false);
    };

    const fetchTx = async () => {
        setLoadingTx(true);
        try { const d = await apiFetch(`/api/inventory?productId=${id}&limit=50`); setTxList(d.data || []); } catch { setTxList([]); }
        setLoadingTx(false);
    };

    const fetchAttributes = async () => {
        setLoadingAttr(true);
        try { setAttributes(await apiFetch(`/api/products/${id}/attributes`)); } catch { setAttributes([]); }
        setLoadingAttr(false);
    };

    useEffect(() => {
        if (tab === 'bom') { fetchBom(); apiFetch('/api/products?limit=1000').then(d => setAllProducts(d.data || [])).catch(() => {}); }
        if (tab === 'inventory') fetchTx();
        // attributes + templates already preloaded on mount, no lazy fetch needed
    }, [tab]);

    const set = (field, value) => { setForm(f => ({ ...f, [field]: value })); setDirty(true); };

    const saveInfo = async () => {
        setSaving(true);
        try {
            const { id: _id, code, createdAt, updatedAt, deletedAt, categoryRef, inventoryTx, quotationItems, materialPlans, purchaseItems, bomComponents, bomUsedIn, ...data } = form;
            await apiFetch(`/api/products/${id}`, { method: 'PUT', body: data });
            await fetchProduct();
        } catch (e) { alert(e.message); }
        setSaving(false);
    };

    const uploadImage = async (file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', 'products');
        try {
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.url) set('image', data.url);
        } catch {}
    };

    // BOM handlers
    const addBomItem = async () => {
        if (!bomForm.componentId) return alert('Vui lòng chọn vật tư thành phần');
        await apiFetch(`/api/products/${id}/bom`, { method: 'POST', body: bomForm });
        setShowBomForm(false); setBomForm({ componentId: '', quantity: 1, unit: '', notes: '' }); setBomSearch(''); fetchBom();
    };
    const deleteBomItem = async (bomId) => { if (!confirm('Xóa vật tư khỏi định mức?')) return; await apiFetch(`/api/products/${id}/bom/${bomId}`, { method: 'DELETE' }); fetchBom(); };
    const filteredComponents = allProducts.filter(p => p.id !== id && (!bomSearch || p.name.toLowerCase().includes(bomSearch.toLowerCase()) || p.code?.toLowerCase().includes(bomSearch.toLowerCase())));

    // Attribute handlers
    const addAttribute = async () => {
        if (!attrForm.name.trim()) return alert('Nhập tên thuộc tính');
        await apiFetch(`/api/products/${id}/attributes`, { method: 'POST', body: attrForm });
        setShowAttrForm(false); setAttrForm({ name: '', inputType: 'select', required: true }); fetchAttributes();
    };
    const deleteAttribute = async (attrId) => { if (!confirm('Xóa thuộc tính?')) return; await apiFetch(`/api/products/${id}/attributes/${attrId}`, { method: 'DELETE' }); fetchAttributes(); };
    const addOption = async (attrId) => {
        const f = optionForms[attrId] || {};
        if (!f.label?.trim()) return alert('Nhập nhãn');
        await apiFetch(`/api/products/${id}/attributes/${attrId}/options`, { method: 'POST', body: { label: f.label, priceAddon: Number(f.priceAddon) || 0 } });
        setOptionForms(p => ({ ...p, [attrId]: { label: '', priceAddon: 0 } })); fetchAttributes();
    };
    const deleteOption = async (attrId, optId) => { if (!confirm('Xóa tùy chọn?')) return; await apiFetch(`/api/products/${id}/attributes/${attrId}/options/${optId}`, { method: 'DELETE' }); fetchAttributes(); };
    const applyTemplate = async (tid) => { await apiFetch(`/api/products/${id}/attributes`, { method: 'PATCH', body: { templateId: tid } }); fetchAttributes(); setShowTemplateMenu(false); };
    const saveAsTemplate = async (attr) => {
        await apiFetch('/api/variant-templates', { method: 'POST', body: { name: attr.name, inputType: attr.inputType, required: attr.required, options: attr.options.map(o => ({ label: o.label, priceAddon: o.priceAddon })) } });
        alert(`Đã lưu "${attr.name}" thành mẫu!`);
        apiFetch('/api/variant-templates').then(setVariantTemplates).catch(() => {});
    };

    if (!product) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', opacity: 0.4 }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>
                <div>Đang tải sản phẩm...</div>
            </div>
        </div>
    );

    const supplyType = normalizeSupply(product.supplyType);
    const supplyStyle = SUPPLY_COLOR[supplyType] || SUPPLY_COLOR['Mua ngoài'];
    const isManuf = supplyType === 'Sản xuất nội bộ' || supplyType === 'Vật tư sản xuất';
    const isSvc = supplyType === 'Dịch vụ';
    const stockOk = product.stock > (product.minStock || 0);
    const stockOut = product.stock === 0;

    const TABS = [
        { key: 'info', label: 'Thông tin', icon: '📋' },
        ...(isManuf ? [{ key: 'bom', label: 'Định mức BOM', icon: '🔩' }] : []),
        ...(!isSvc ? [
            { key: 'attributes', label: 'Biến thể', icon: '🎛' },
            { key: 'inventory', label: 'Lịch sử kho', icon: '📦' },
        ] : []),
    ];

    return (
        <div className="pd-page">
            {/* ===== HERO HEADER ===== */}
            <div className="pd-hero">
                <button className="pd-back" onClick={() => router.push('/products')}>
                    <span style={{ fontSize: 16 }}>←</span> Sản phẩm
                </button>

                <div className="pd-hero-content">
                    {/* Product image */}
                    <div className="pd-hero-image-wrap">
                        {form?.image ? (
                            <img src={form.image} alt="" className="pd-hero-image" />
                        ) : (
                            <div className="pd-hero-placeholder">📷</div>
                        )}
                        <label className="pd-hero-image-overlay">
                            📤 Đổi ảnh
                            <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                        </label>
                        {form?.image && (
                            <button className="pd-hero-image-remove" onClick={() => set('image', '')}>×</button>
                        )}
                    </div>

                    {/* Product info */}
                    <div className="pd-hero-info">
                        <div className="pd-hero-badges">
                            <span className="pd-supply-badge" style={{ background: supplyStyle.bg, color: supplyStyle.color }}>
                                {SUPPLY_ICON[supplyType]} {supplyType}
                            </span>
                            {product.brand && <span className="pd-badge-muted">{product.brand}</span>}
                            {product.status && product.status !== 'Đang kinh doanh' && <span className="pd-badge-muted">{product.status}</span>}
                        </div>

                        <h1 className="pd-hero-name">{product.name}</h1>

                        <div className="pd-hero-meta">
                            <span className="pd-meta-code">{product.code}</span>
                            {product.category && <span className="pd-meta-sep">·</span>}
                            {product.category && <span>{product.category}</span>}
                            {product.unit && <span className="pd-meta-sep">·</span>}
                            {product.unit && <span>{product.unit}</span>}
                        </div>

                        {/* Price cards */}
                        <div className="pd-price-row">
                            <div className="pd-price-card pd-price-sale">
                                <div className="pd-price-label">Giá bán</div>
                                <div className="pd-price-value">{fmt(product.salePrice)}<span className="pd-price-unit">đ</span></div>
                            </div>
                            <div className="pd-price-card pd-price-import">
                                <div className="pd-price-label">Giá nhập</div>
                                <div className="pd-price-value">{fmt(product.importPrice)}<span className="pd-price-unit">đ</span></div>
                            </div>
                            {!isSvc && (
                                <div className={`pd-price-card ${stockOut ? 'pd-stock-danger' : stockOk ? 'pd-stock-ok' : 'pd-stock-warn'}`}>
                                    <div className="pd-price-label">Tồn kho</div>
                                    <div className="pd-price-value">{fmt(product.stock)} <span className="pd-price-unit">{product.unit}</span></div>
                                </div>
                            )}
                            {product.salePrice > 0 && product.importPrice > 0 && (
                                <div className="pd-price-card pd-price-margin">
                                    <div className="pd-price-label">Lợi nhuận</div>
                                    <div className="pd-price-value">{Math.round((product.salePrice - product.importPrice) / product.salePrice * 100)}%</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== TABS ===== */}
            <div className="pd-tabs">
                {TABS.map(t => (
                    <button key={t.key} className={`pd-tab ${tab === t.key ? 'pd-tab-active' : ''}`} onClick={() => setTab(t.key)}>
                        <span className="pd-tab-icon">{t.icon}</span> {t.label}
                    </button>
                ))}
            </div>

            {/* ===== TAB: THÔNG TIN ===== */}
            {tab === 'info' && form && (
                <div className="pd-info-grid">
                    {/* Left column — Main fields */}
                    <div className="pd-section">
                        <div className="pd-section-title">Thông tin cơ bản</div>
                        <div className="pd-field-grid">
                            <div className="pd-field pd-field-wide">
                                <label className="pd-label">Tên sản phẩm</label>
                                <input className="form-input" value={form.name || ''} onChange={e => set('name', e.target.value)} style={{ fontWeight: 600, fontSize: 14 }} />
                            </div>
                            <div className="pd-field">
                                <label className="pd-label">Danh mục</label>
                                <select className="form-select" value={form.categoryId || ''} onChange={e => {
                                    const cat = allCats.find(c => c.id === e.target.value);
                                    if (cat) { set('categoryId', cat.id); set('category', cat.name); }
                                }}>
                                    <option value="">-- Chọn --</option>
                                    {allCats.map(c => <option key={c.id} value={c.id}>{'\u00A0\u00A0'.repeat(c.depth)}{c.name}</option>)}
                                </select>
                            </div>
                            <div className="pd-field" style={{ maxWidth: 100 }}>
                                <label className="pd-label">ĐVT</label>
                                <input className="form-input" value={form.unit || ''} onChange={e => set('unit', e.target.value)} />
                            </div>
                        </div>

                        <div className="pd-section-title" style={{ marginTop: 20 }}>Nguồn cung</div>
                        <div className="pd-supply-pills">
                            {SUPPLY_TYPES.map(t => {
                                const sc = SUPPLY_COLOR[t] || {};
                                const active = normalizeSupply(form.supplyType) === t;
                                return (
                                    <button key={t} className={`pd-supply-pill ${active ? 'pd-supply-active' : ''}`}
                                        style={active ? { background: sc.bg, color: sc.color, borderColor: sc.bg } : {}}
                                        onClick={() => set('supplyType', t)}>
                                        {SUPPLY_ICON[t]} {t}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="pd-section-title" style={{ marginTop: 20 }}>Giá & Tồn kho</div>
                        <div className="pd-field-grid">
                            <div className="pd-field">
                                <label className="pd-label">Giá nhập</label>
                                <input className="form-input" type="number" value={form.importPrice || 0} onChange={e => set('importPrice', Number(e.target.value))} />
                            </div>
                            <div className="pd-field">
                                <label className="pd-label">Giá bán</label>
                                <input className="form-input" type="number" value={form.salePrice || 0} onChange={e => set('salePrice', Number(e.target.value))} />
                            </div>
                            {!isSvc && <>
                                <div className="pd-field">
                                    <label className="pd-label">Tồn kho</label>
                                    <input className="form-input" type="number" value={form.stock ?? 0} onChange={e => set('stock', Number(e.target.value))} />
                                </div>
                                <div className="pd-field">
                                    <label className="pd-label">Tồn tối thiểu</label>
                                    <input className="form-input" type="number" value={form.minStock ?? 0} onChange={e => set('minStock', Number(e.target.value))} />
                                </div>
                            </>}
                        </div>
                    </div>

                    {/* Right column — Details */}
                    <div className="pd-section">
                        <div className="pd-section-title">Chi tiết sản phẩm</div>
                        <div className="pd-field-grid">
                            <div className="pd-field">
                                <label className="pd-label">Thương hiệu</label>
                                <input className="form-input" value={form.brand || ''} onChange={e => set('brand', e.target.value)} />
                            </div>
                            <div className="pd-field">
                                <label className="pd-label">Nhà cung cấp</label>
                                <input className="form-input" value={form.supplier || ''} onChange={e => set('supplier', e.target.value)} />
                            </div>
                            <div className="pd-field">
                                <label className="pd-label">Kích thước</label>
                                <input className="form-input" value={form.dimensions || ''} onChange={e => set('dimensions', e.target.value)} placeholder="DxRxC mm" />
                            </div>
                            <div className="pd-field">
                                <label className="pd-label">Trọng lượng (kg)</label>
                                <input className="form-input" type="number" value={form.weight || 0} onChange={e => set('weight', Number(e.target.value))} />
                            </div>
                            <div className="pd-field">
                                <label className="pd-label">Màu sắc</label>
                                <input className="form-input" value={form.color || ''} onChange={e => set('color', e.target.value)} />
                            </div>
                            <div className="pd-field">
                                <label className="pd-label">Chất liệu</label>
                                <input className="form-input" value={form.material || ''} onChange={e => set('material', e.target.value)} />
                            </div>
                            <div className="pd-field">
                                <label className="pd-label">Xuất xứ</label>
                                <input className="form-input" value={form.origin || ''} onChange={e => set('origin', e.target.value)} />
                            </div>
                            <div className="pd-field">
                                <label className="pd-label">Bảo hành</label>
                                <input className="form-input" value={form.warranty || ''} onChange={e => set('warranty', e.target.value)} placeholder="12 tháng" />
                            </div>
                        </div>

                        {isManuf && (<>
                            <div className="pd-section-title" style={{ marginTop: 20 }}>Sản xuất</div>
                            <div className="pd-field-grid">
                                <div className="pd-field">
                                    <label className="pd-label">Chất liệu cốt</label>
                                    <select className="form-select" value={form.coreBoard || ''} onChange={e => set('coreBoard', e.target.value)}>
                                        <option value="">-- Chọn --</option>
                                        {CORE_BOARD_TYPES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="pd-field">
                                    <label className="pd-label">Mã bề mặt</label>
                                    <input className="form-input" value={form.surfaceCode || ''} onChange={e => set('surfaceCode', e.target.value)} placeholder="388EV, U5002..." />
                                </div>
                            </div>
                        </>)}

                        <div className="pd-section-title" style={{ marginTop: 20 }}>Mô tả</div>
                        <textarea className="form-input" rows={3} value={form.description || ''} onChange={e => set('description', e.target.value)} style={{ resize: 'vertical', width: '100%' }} />
                    </div>

                    {/* Sticky save bar */}
                    {dirty && (
                        <div className="pd-save-bar">
                            <span style={{ fontSize: 13 }}>Bạn có thay đổi chưa lưu</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ ...product }); setDirty(false); }}>Hoàn tác</button>
                                <button className="btn btn-primary btn-sm" onClick={saveInfo} disabled={saving}>
                                    {saving ? 'Đang lưu...' : '💾 Lưu thay đổi'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ===== TAB: BOM ===== */}
            {tab === 'bom' && (
                <div className="pd-section" style={{ maxWidth: 900 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                            <div className="pd-section-title" style={{ marginBottom: 2 }}>Định mức vật tư (BOM)</div>
                            <div style={{ fontSize: 12, opacity: 0.5 }}>Nguyên vật liệu cần dùng để sản xuất: <strong>{product.name}</strong></div>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowBomForm(v => !v)}>
                            {showBomForm ? '✕ Đóng' : '+ Thêm thành phần'}
                        </button>
                    </div>

                    {showBomForm && (
                        <div style={{ padding: 16, background: 'var(--bg-secondary, #f8fafc)', borderRadius: 10, marginBottom: 16, border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                <div style={{ flex: 2, minWidth: 200, position: 'relative' }}>
                                    <label className="pd-label">Tìm vật tư *</label>
                                    <input className="form-input" placeholder="Tìm theo tên hoặc mã..." value={bomSearch}
                                        onChange={e => { setBomSearch(e.target.value); setBomForm(f => ({ ...f, componentId: '' })); }} />
                                    {bomSearch && !bomForm.componentId && (
                                        <div style={{ position: 'absolute', zIndex: 10, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, top: '100%', left: 0, right: 0, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', marginTop: 2 }}>
                                            {filteredComponents.slice(0, 20).map(p => (
                                                <div key={p.id} onClick={() => { setBomForm(f => ({ ...f, componentId: p.id, unit: p.unit })); setBomSearch(p.name); }}
                                                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border-color)', transition: 'background .1s' }}
                                                    onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover, #f1f5f9)'}
                                                    onMouseOut={e => e.currentTarget.style.background = ''}>
                                                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                                                    <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 8 }}>{p.code} · {p.unit}</span>
                                                </div>
                                            ))}
                                            {filteredComponents.length === 0 && <div style={{ padding: '10px 12px', opacity: 0.4, fontSize: 13 }}>Không tìm thấy</div>}
                                        </div>
                                    )}
                                </div>
                                <div style={{ width: 90 }}>
                                    <label className="pd-label">Số lượng</label>
                                    <input className="form-input" type="number" min="0.01" step="0.01" value={bomForm.quantity} onChange={e => setBomForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
                                </div>
                                <div style={{ width: 70 }}>
                                    <label className="pd-label">ĐVT</label>
                                    <input className="form-input" value={bomForm.unit} onChange={e => setBomForm(f => ({ ...f, unit: e.target.value }))} />
                                </div>
                                <div style={{ flex: 1, minWidth: 120 }}>
                                    <label className="pd-label">Ghi chú</label>
                                    <input className="form-input" value={bomForm.notes} onChange={e => setBomForm(f => ({ ...f, notes: e.target.value }))} placeholder="Mã màu, spec..." />
                                </div>
                                <button className="btn btn-primary btn-sm" onClick={addBomItem}>Thêm</button>
                            </div>
                        </div>
                    )}

                    {loadingBom ? <div style={{ padding: 40, textAlign: 'center', opacity: 0.4 }}>Đang tải...</div> : (
                        <div className="table-container" style={{ borderRadius: 10, overflow: 'hidden' }}>
                            <table className="data-table">
                                <thead><tr>
                                    <th style={{ width: 44 }}>Ảnh</th><th>Vật tư thành phần</th><th>Danh mục</th>
                                    <th style={{ width: 80 }}>ĐVT</th><th style={{ width: 80 }}>SL</th><th>Ghi chú</th><th style={{ width: 50 }}></th>
                                </tr></thead>
                                <tbody>
                                    {bom.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, opacity: 0.4 }}>Chưa có vật tư — nhấn "+ Thêm thành phần"</td></tr>}
                                    {bom.map(item => (
                                        <tr key={item.id}>
                                            <td style={{ padding: 4 }}>
                                                {item.component?.image
                                                    ? <img src={item.component.image} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 5, border: '1px solid var(--border-color)' }} />
                                                    : <div style={{ width: 36, height: 36, borderRadius: 5, border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2, fontSize: 14 }}>📦</div>
                                                }
                                            </td>
                                            <td><div style={{ fontWeight: 600, fontSize: 13 }}>{item.component?.name}</div><div style={{ fontSize: 11, opacity: 0.4, fontFamily: 'monospace' }}>{item.component?.code}</div></td>
                                            <td><span className="badge badge-default" style={{ fontSize: 11 }}>{item.component?.category}</span></td>
                                            <td style={{ fontSize: 13 }}>{item.unit || item.component?.unit}</td>
                                            <td style={{ fontWeight: 700, fontSize: 14 }}>{item.quantity}</td>
                                            <td style={{ fontSize: 12, opacity: 0.6 }}>{item.notes || '—'}</td>
                                            <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)' }} onClick={() => deleteBomItem(item.id)}>🗑</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ===== TAB: BIẾN THỂ ===== */}
            {tab === 'attributes' && (loadingAttr ? <div style={{ padding: 40, textAlign: 'center', opacity: 0.4 }}>Đang tải biến thể...</div> :
                <div style={{ maxWidth: 800 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                        <div>
                            <div className="pd-section-title" style={{ marginBottom: 2 }}>Cấu hình biến thể</div>
                            <div style={{ fontSize: 12, opacity: 0.5 }}>Tùy chọn (Loại thùng, Mã màu...) cho: <strong>{product.name}</strong></div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-primary btn-sm" onClick={() => setShowAttrForm(v => !v)}>+ Thêm thuộc tính</button>
                            <div style={{ position: 'relative' }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowTemplateMenu(v => !v)}>📦 Áp dụng mẫu</button>
                                {showTemplateMenu && (
                                    <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 10, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', minWidth: 220, padding: 4, marginTop: 4 }}>
                                        {variantTemplates.length === 0
                                            ? <div style={{ padding: 12, fontSize: 12, opacity: 0.5 }}>Chưa có mẫu</div>
                                            : variantTemplates.map(t => (
                                                <div key={t.id} onClick={() => applyTemplate(t.id)} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 6, fontSize: 13 }}
                                                    onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover, #f1f5f9)'} onMouseOut={e => e.currentTarget.style.background = ''}>
                                                    {t.name} <span style={{ fontSize: 11, opacity: 0.4 }}>· {t.options?.length || 0} options</span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {showAttrForm && (
                        <div className="pd-section" style={{ marginBottom: 16, padding: 16 }}>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                <div style={{ flex: 2, minWidth: 160 }}>
                                    <label className="pd-label">Tên thuộc tính *</label>
                                    <input className="form-input" placeholder="VD: Loại thùng, Mã màu..." value={attrForm.name} onChange={e => setAttrForm(f => ({ ...f, name: e.target.value }))} autoFocus />
                                </div>
                                <div>
                                    <label className="pd-label">Loại nhập</label>
                                    <select className="form-select" value={attrForm.inputType} onChange={e => setAttrForm(f => ({ ...f, inputType: e.target.value }))}>
                                        <option value="select">Chọn danh sách</option><option value="text">Văn bản</option>
                                    </select>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', paddingBottom: 6 }}>
                                    <input type="checkbox" checked={attrForm.required} onChange={e => setAttrForm(f => ({ ...f, required: e.target.checked }))} /> Bắt buộc
                                </label>
                                <button className="btn btn-primary btn-sm" onClick={addAttribute}>Thêm</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowAttrForm(false)}>Hủy</button>
                            </div>
                        </div>
                    )}

                    {attributes.length === 0 && !showAttrForm && (
                        <div className="pd-section" style={{ padding: 40, textAlign: 'center', opacity: 0.4 }}>
                            Chưa có thuộc tính — bấm "+ Thêm thuộc tính" để bắt đầu
                        </div>
                    )}

                    {attributes.map(attr => (
                        <div key={attr.id} className="pd-section" style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
                            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary, #f8fafc)' }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 700, fontSize: 14 }}>{attr.name}</span>
                                    <span className={`badge ${attr.inputType === 'select' ? 'info' : 'muted'}`} style={{ fontSize: 10 }}>{attr.inputType === 'select' ? 'Chọn' : 'Text'}</span>
                                    {attr.required && <span className="badge warning" style={{ fontSize: 10 }}>Bắt buộc</span>}
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="btn btn-ghost btn-sm" onClick={() => saveAsTemplate(attr)} title="Lưu mẫu" style={{ fontSize: 11 }}>💾</button>
                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)', fontSize: 11 }} onClick={() => deleteAttribute(attr.id)}>🗑</button>
                                </div>
                            </div>
                            {attr.inputType === 'select' ? (
                                <div style={{ padding: '12px 16px' }}>
                                    {attr.options.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                                            {attr.options.map(opt => (
                                                <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: 6, border: '1px solid var(--border-color)', fontSize: 13 }}>
                                                    <span style={{ fontWeight: 500 }}>{opt.label}</span>
                                                    {opt.priceAddon > 0 && <span style={{ fontSize: 11, color: 'var(--status-success)', fontWeight: 600 }}>+{fmtCur(opt.priceAddon)}</span>}
                                                    <button onClick={() => deleteOption(attr.id, opt.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1 }}>×</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {showOptionForm[attr.id] ? (
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                            <div style={{ flex: 2, minWidth: 140 }}>
                                                <label className="pd-label">Nhãn *</label>
                                                <input className="form-input" placeholder="VD: Picomat" value={optionForms[attr.id]?.label || ''} onChange={e => setOptionForms(p => ({ ...p, [attr.id]: { ...p[attr.id], label: e.target.value } }))} autoFocus />
                                            </div>
                                            <div style={{ width: 140 }}>
                                                <label className="pd-label">+Giá thêm</label>
                                                <input type="number" className="form-input" step="1000" value={optionForms[attr.id]?.priceAddon || 0} onChange={e => setOptionForms(p => ({ ...p, [attr.id]: { ...p[attr.id], priceAddon: e.target.value } }))} />
                                            </div>
                                            <button className="btn btn-primary btn-sm" onClick={() => addOption(attr.id)}>Thêm</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => setShowOptionForm(p => ({ ...p, [attr.id]: false }))}>Đóng</button>
                                        </div>
                                    ) : (
                                        <button className="btn btn-ghost btn-sm" onClick={() => setShowOptionForm(p => ({ ...p, [attr.id]: true }))}>+ Tùy chọn</button>
                                    )}
                                </div>
                            ) : (
                                <div style={{ padding: '12px 16px', fontSize: 13, opacity: 0.5, fontStyle: 'italic' }}>Người dùng nhập văn bản tự do khi cấu hình</div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ===== TAB: LỊCH SỬ KHO ===== */}
            {tab === 'inventory' && (
                <div style={{ maxWidth: 900 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div className="pd-section-title">Lịch sử nhập/xuất kho</div>
                        <div style={{ fontSize: 13, opacity: 0.6 }}>Tồn hiện tại: <strong style={{ fontSize: 16, color: 'var(--primary)' }}>{fmt(product.stock)}</strong> {product.unit}</div>
                    </div>
                    {loadingTx ? <div style={{ padding: 40, textAlign: 'center', opacity: 0.4 }}>Đang tải...</div> : (
                        <div className="table-container" style={{ borderRadius: 10, overflow: 'hidden' }}>
                            <table className="data-table">
                                <thead><tr><th>Mã phiếu</th><th style={{ width: 80 }}>Loại</th><th style={{ width: 100 }}>Số lượng</th><th>Kho</th><th>Dự án</th><th>Ghi chú</th><th style={{ width: 100 }}>Ngày</th></tr></thead>
                                <tbody>
                                    {txList.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, opacity: 0.4 }}>Chưa có phiếu nhập/xuất kho</td></tr>}
                                    {txList.map(tx => (
                                        <tr key={tx.id}>
                                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{tx.code}</td>
                                            <td><span className={`badge ${tx.type === 'Nhập' ? 'badge-success' : 'badge-warning'}`}>{tx.type}</span></td>
                                            <td style={{ fontWeight: 600, color: tx.type === 'Nhập' ? 'var(--status-success)' : 'var(--status-danger)' }}>
                                                {tx.type === 'Nhập' ? '+' : '-'}{fmt(tx.quantity)} {tx.unit}
                                            </td>
                                            <td style={{ fontSize: 12 }}>{tx.warehouse?.name || '—'}</td>
                                            <td style={{ fontSize: 12 }}>{tx.project?.name || '—'}</td>
                                            <td style={{ fontSize: 12, opacity: 0.6 }}>{tx.note || '—'}</td>
                                            <td style={{ fontSize: 12 }}>{fmtDate(tx.date)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
