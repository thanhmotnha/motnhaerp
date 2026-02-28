'use client';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/fetchClient';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));

const emptyItem = () => ({
    _key: Date.now() + Math.random(),
    name: '', unit: 'm²', quantity: 0,
    unitPrice: 0, amount: 0, description: '',
    length: 0, width: 0, height: 0, image: '',
});
const emptyCategory = () => ({
    _key: Date.now() + Math.random(),
    name: '', items: [emptyItem()], subtotal: 0,
});

export default function EditQuotationPage() {
    const router = useRouter();
    const params = useParams();
    const toast = useToast();
    const [customers, setCustomers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [library, setLibrary] = useState([]);
    const [products, setProducts] = useState([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const imgInputRef = useRef(null);
    const imgUploadTarget = useRef(null); // {ci, ii}
    const [treeSearch, setTreeSearch] = useState('');
    const [expandedNodes, setExpandedNodes] = useState({});
    const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);
    const [treeTab, setTreeTab] = useState('library');
    const [editingLibItem, setEditingLibItem] = useState(null);
    const [editingProdCat, setEditingProdCat] = useState(null);

    const [form, setForm] = useState({
        customerId: '', projectId: '', type: 'Thi công thô', notes: '',
        vat: 10, discount: 0, managementFeeRate: 5, designFee: 0, otherFee: 0, adjustment: 0, adjustmentType: 'amount', status: 'Nháp',
    });
    const [categories, setCategories] = useState([emptyCategory()]);

    useEffect(() => {
        apiFetch('/api/customers?limit=1000').then(d => setCustomers(d.data || []));
        apiFetch('/api/projects?limit=1000').then(d => setProjects(d.data || []));
        apiFetch('/api/work-item-library?limit=1000').then(d => setLibrary(d.data || []));
        apiFetch('/api/products?limit=1000').then(d => setProducts(d.data || []));

        apiFetch(`/api/quotations/${params.id}`).then(q => {
            setForm({
                customerId: q.customerId || '',
                projectId: q.projectId || '',
                type: q.type || 'Thi công thô',
                notes: q.notes || '',
                vat: q.vat ?? 10,
                discount: q.discount ?? 0,
                managementFeeRate: q.managementFeeRate ?? 5,
                designFee: q.designFee ?? 0,
                otherFee: q.otherFee ?? 0,
                adjustment: q.adjustment ?? 0,
                adjustmentType: q.adjustmentType || 'amount',
                status: q.status || 'Nháp',
            });
            if (q.categories && q.categories.length > 0) {
                const cats = q.categories.map(cat => ({
                    _key: Date.now() + Math.random(),
                    name: cat.name, subtotal: cat.subtotal || 0,
                    items: (cat.items || []).map(item => ({
                        _key: Date.now() + Math.random(),
                        name: item.name || '',
                        unit: item.unit || 'm²',
                        quantity: item.quantity || 0,
                        unitPrice: item.unitPrice || 0,
                        amount: item.amount || 0,
                        description: item.description || '',
                        length: item.length || 0,
                        width: item.width || 0,
                        height: item.height || 0,
                    })),
                }));
                setCategories(cats);
            }
            setLoading(false);
        });
    }, [params.id]);

    const filteredProjects = useMemo(() => {
        if (!form.customerId) return projects;
        return projects.filter(p => p.customerId === form.customerId);
    }, [form.customerId, projects]);

    const libTree = useMemo(() => {
        const map = {};
        const search = treeSearch.toLowerCase();
        library.forEach(item => {
            if (search && !item.name.toLowerCase().includes(search) && !item.category.toLowerCase().includes(search)) return;
            const sub = item.category || 'Khác';
            if (!map[sub]) map[sub] = [];
            map[sub].push(item);
        });
        return map;
    }, [library, treeSearch]);

    const prodTree = useMemo(() => {
        const map = {};
        const search = treeSearch.toLowerCase();
        products.forEach(p => {
            if (search && !p.name.toLowerCase().includes(search) && !p.category.toLowerCase().includes(search)) return;
            const cat = p.category || 'Khác';
            if (!map[cat]) map[cat] = [];
            map[cat].push(p);
        });
        return map;
    }, [products, treeSearch]);

    useEffect(() => {
        const nodes = {};
        const tree = treeTab === 'library' ? libTree : prodTree;
        Object.keys(tree).forEach(k => { nodes[k] = true; });
        setExpandedNodes(nodes);
    }, [library, products, treeTab]);

    const toggleNode = (key) => setExpandedNodes(prev => ({ ...prev, [key]: !prev[key] }));

    // === Calculation ===
    const recalc = (cats) => cats.map(cat => {
        const items = cat.items.map(item => {
            const autoQty = (item.length && item.width && item.height)
                ? item.length * item.width * item.height
                : (item.length && item.width) ? item.length * item.width : null;
            const quantity = autoQty !== null ? autoQty : (item.quantity || 0);
            const amount = quantity * (item.unitPrice || 0);
            return { ...item, quantity, amount };
        });
        return { ...cat, items, subtotal: items.reduce((s, i) => s + i.amount, 0) };
    });

    const directCost = categories.reduce((s, c) => s + c.subtotal, 0);
    const managementFee = directCost * (form.managementFeeRate || 0) / 100;
    const adjustmentAmount = form.adjustmentType === 'percent' ? directCost * (form.adjustment || 0) / 100 : (form.adjustment || 0);
    const total = directCost + managementFee + (form.designFee || 0) + (form.otherFee || 0) + adjustmentAmount;
    const discountAmount = total * ((form.discount || 0) / 100);
    const afterDiscount = total - discountAmount;
    const vatAmount = afterDiscount * ((form.vat || 0) / 100);
    const grandTotal = afterDiscount + vatAmount;

    // === Handlers ===
    const addCategory = () => { setCategories([...categories, emptyCategory()]); setActiveCategoryIdx(categories.length); };
    const removeCategory = (ci) => {
        if (categories.length <= 1) return;
        const next = recalc(categories.filter((_, i) => i !== ci));
        setCategories(next); setActiveCategoryIdx(Math.min(ci, next.length - 1));
    };
    const updateCategoryName = (ci, name) => { const c = [...categories]; c[ci] = { ...c[ci], name }; setCategories(c); };
    const addItem = (ci) => { const c = [...categories]; c[ci] = { ...c[ci], items: [...c[ci].items, emptyItem()] }; setCategories(c); };
    const removeItem = (ci, ii) => {
        const c = [...categories]; if (c[ci].items.length <= 1) return;
        c[ci] = { ...c[ci], items: c[ci].items.filter((_, i) => i !== ii) }; setCategories(recalc(c));
    };
    const updateItem = (ci, ii, field, value) => {
        const c = [...categories];
        const numFields = ['quantity', 'unitPrice', 'length', 'width', 'height'];
        c[ci].items[ii] = { ...c[ci].items[ii], [field]: numFields.includes(field) ? parseFloat(value) || 0 : value };
        setCategories(recalc(c));
    };

    const uploadItemImage = useCallback(async (file, ci, ii) => {
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', 'products');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const { url } = await res.json();
        const c = [...categories];
        c[ci].items[ii] = { ...c[ci].items[ii], image: url };
        setCategories(c);
    }, [categories]);

    const handleImgChange = async (e) => {
        const file = e.target.files?.[0];
        const t = imgUploadTarget.current;
        if (file && t) await uploadItemImage(file, t.ci, t.ii);
        imgUploadTarget.current = null; e.target.value = '';
    };

    const addFromLibrary = (libItem) => {
        updateCategoryName(activeCategoryIdx, libItem.name);
    };
    const addFromProduct = (prod) => {
        const ci = activeCategoryIdx;
        const c = [...categories];
        const newItem = {
            _key: Date.now() + Math.random(),
            name: prod.name, unit: prod.unit, quantity: 0,
            unitPrice: prod.salePrice, amount: 0,
            description: `${prod.brand ? prod.brand + ' - ' : ''}${prod.description || ''}`.trim(),
            image: prod.image || '', length: 0, width: 0, height: 0,
        };
        const existing = c[ci].items.filter(i => i.name.trim() !== '');
        c[ci] = { ...c[ci], items: [...existing, newItem] };
        setCategories(recalc(c));
    };
    const isItemInCategory = (name) => false; // cho phép thêm SP trùng tên (nhiều kích thước khác nhau)

    const saveLibItem = async () => {
        if (!editingLibItem) return;
        await apiFetch(`/api/work-item-library/${editingLibItem.id}`, {
            method: 'PUT', body: JSON.stringify({ name: editingLibItem.name }),
        });
        apiFetch('/api/work-item-library?limit=1000').then(d => setLibrary(d.data || []));
        setEditingLibItem(null);
    };
    const saveProdCategory = async () => {
        if (!editingProdCat || !editingProdCat.name.trim()) { setEditingProdCat(null); return; }
        await apiFetch('/api/products', {
            method: 'PATCH', body: JSON.stringify({ oldCategory: editingProdCat.old, newCategory: editingProdCat.name }),
        });
        apiFetch('/api/products?limit=1000').then(d => setProducts(d.data || []));
        setEditingProdCat(null);
    };

    // === Save ===
    const handleSave = async () => {
        setSaving(true);
        try {
            const body = {
                ...form, directCost, managementFee, adjustmentAmount, total, grandTotal,
                categories: categories.map(cat => ({
                    name: cat.name, subtotal: cat.subtotal,
                    items: cat.items.map(({ _key, ...item }) => item),
                })),
            };
            await apiFetch(`/api/quotations/${params.id}`, {
                method: 'PUT', body: JSON.stringify(body),
            });
            toast.success('Đã cập nhật báo giá thành công!');
        } catch (e) { toast.error(e.message); }
        setSaving(false);
    };

    // === Render tree leaf ===
    const renderTreeLeaf = (item, onClick, type = 'library') => {
        const price = type === 'products' ? item.salePrice : item.unitPrice;
        const isEditingThis = editingLibItem?.id === item.id;
        if (type === 'library') {
            return (
                <div key={item.id} className="tree-node tree-leaf"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                    onClick={() => !isEditingThis && onClick(item)}
                    title="Click để đặt tên hạng mục · Double-click để đổi tên">
                    <span className="tree-icon" style={{ fontSize: 14 }}>📂</span>
                    {isEditingThis ? (
                        <input autoFocus value={editingLibItem.name}
                            onChange={e => setEditingLibItem(p => ({ ...p, name: e.target.value }))}
                            onBlur={saveLibItem}
                            onKeyDown={e => { if (e.key === 'Enter') saveLibItem(); if (e.key === 'Escape') setEditingLibItem(null); }}
                            onClick={e => e.stopPropagation()}
                            style={{ flex: 1, fontSize: 12, padding: '1px 4px', border: '1px solid var(--primary)', borderRadius: 3 }} />
                    ) : (
                        <span className="tree-label" onDoubleClick={e => { e.stopPropagation(); setEditingLibItem({ id: item.id, name: item.name }); }}>
                            {item.name}
                        </span>
                    )}
                </div>
            );
        }
        const added = isItemInCategory(item.name);
        return (
            <div key={item.id} className={`tree-node tree-leaf ${added ? 'tree-leaf-added' : ''}`}
                onClick={() => !added && onClick(item)}
                title={`${item.description || ''}\nĐG: ${fmt(price)}đ/${item.unit}`}>
                {item.image ? (
                    <img src={item.image} alt="" className="tree-thumb" />
                ) : (
                    <span className="tree-icon">{added ? '✅' : '➕'}</span>
                )}
                <span className="tree-label">{item.name}</span>
                <span className="tree-price">{fmt(price)}</span>
            </div>
        );
    };

    if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>⏳ Đang tải...</div>;

    return (
        <div style={{ display: 'flex', gap: 16, minHeight: 'calc(100vh - 80px)' }}>
            {/* LEFT: Tree sidebar */}
            <div className="card tree-sidebar" style={{ width: 300, minWidth: 300, maxHeight: 'calc(100vh - 80px)', position: 'sticky', top: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                        <button className={`btn btn-sm ${treeTab === 'library' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setTreeTab('library')} style={{ flex: 1, fontSize: 11 }}>🔧 Hạng mục</button>
                        <button className={`btn btn-sm ${treeTab === 'products' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setTreeTab('products')} style={{ flex: 1, fontSize: 11 }}>📦 Sản phẩm</button>
                    </div>
                    <input className="form-input form-input-compact" placeholder="🔍 Tìm kiếm..." value={treeSearch}
                        onChange={e => setTreeSearch(e.target.value)} style={{ width: '100%' }} />
                    <div style={{ fontSize: 11, marginTop: 6, opacity: 0.5 }}>
                        → <strong style={{ color: 'var(--accent-primary)' }}>{categories[activeCategoryIdx]?.name || `Hạng mục #${activeCategoryIdx + 1}`}</strong>
                    </div>
                </div>
                <div style={{ overflow: 'auto', flex: 1, padding: '4px 0' }}>
                    {treeTab === 'library' ? (
                        Object.entries(libTree).map(([sub, items]) => (
                            <div key={sub}>
                                <div className="tree-node tree-sub" onClick={() => toggleNode(sub)}>
                                    <span className="tree-arrow">{expandedNodes[sub] ? '▾' : '▸'}</span>
                                    <span className="tree-icon">📂</span>
                                    <span className="tree-label">{sub}</span>
                                    <span className="tree-count">{items.length}</span>
                                </div>
                                {expandedNodes[sub] && items.map(item => renderTreeLeaf(item, addFromLibrary, 'library'))}
                            </div>
                        ))
                    ) : (
                        Object.entries(prodTree).map(([cat, items]) => (
                            <div key={cat}>
                                <div className="tree-node tree-sub" onClick={() => editingProdCat?.old !== cat && toggleNode(cat)}
                                    title="Double-click để đổi tên danh mục">
                                    <span className="tree-arrow">{expandedNodes[cat] ? '▾' : '▸'}</span>
                                    <span className="tree-icon">📦</span>
                                    {editingProdCat?.old === cat ? (
                                        <input autoFocus value={editingProdCat.name}
                                            onChange={e => setEditingProdCat(p => ({ ...p, name: e.target.value }))}
                                            onBlur={saveProdCategory}
                                            onKeyDown={e => { if (e.key === 'Enter') saveProdCategory(); if (e.key === 'Escape') setEditingProdCat(null); }}
                                            onClick={e => e.stopPropagation()}
                                            style={{ flex: 1, fontSize: 12, padding: '1px 4px', border: '1px solid var(--primary)', borderRadius: 3 }} />
                                    ) : (
                                        <span className="tree-label" onDoubleClick={e => { e.stopPropagation(); setEditingProdCat({ old: cat, name: cat }); }}>{cat}</span>
                                    )}
                                    <span className="tree-count">{items.length}</span>
                                </div>
                                {expandedNodes[cat] && items.map(item => renderTreeLeaf(item, addFromProduct, 'products'))}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ margin: 0 }}>✏️ Sửa Báo Giá</h2>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost" onClick={() => router.push('/quotations')}>← Quay lại</button>
                        <button className="btn btn-ghost" onClick={() => window.open(`/quotations/${params.id}/pdf`, '_blank')}>📄 Xem PDF</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? '⏳...' : '💾 Cập nhật'}</button>
                    </div>
                </div>

                {/* Thông tin chung */}
                <div className="card" style={{ marginBottom: 16 }}>
                    <div className="card-header"><h3>Thông tin chung</h3></div>
                    <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                            <div>
                                <label className="form-label">Khách hàng *</label>
                                <select className="form-select" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value, projectId: '' })}>
                                    <option value="">-- Chọn KH --</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Dự án</label>
                                <select className="form-select" value={form.projectId || ''} onChange={e => setForm({ ...form, projectId: e.target.value || null })}>
                                    <option value="">-- Chọn DA --</option>
                                    {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Loại</label>
                                <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                    <option>Thiết kế kiến trúc</option><option>Thiết kế nội thất</option><option>Thi công thô</option><option>Thi công hoàn thiện</option><option>Thi công nội thất</option>
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Trạng thái</label>
                                <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                    <option>Nháp</option>
                                    <option>Hợp đồng</option>
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Ghi chú</label>
                                <input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Category tabs */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {categories.map((cat, ci) => (
                        <button key={cat._key} className={`btn ${ci === activeCategoryIdx ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                            onClick={() => setActiveCategoryIdx(ci)} style={{ fontSize: 12 }}>
                            {cat.name || `Hạng mục #${ci + 1}`}
                            <span style={{ opacity: 0.5, marginLeft: 4 }}>({fmt(cat.subtotal)}đ)</span>
                        </button>
                    ))}
                    <button className="btn btn-ghost btn-sm" onClick={addCategory} style={{ fontSize: 18, padding: '2px 10px' }}>+</button>
                </div>

                {/* Active category table */}
                {categories.map((cat, ci) => ci !== activeCategoryIdx ? null : (
                    <div className="card quotation-category-card" key={cat._key} style={{ marginBottom: 16 }}>
                        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-alt, #f0f4ff)' }}>
                            <span style={{ fontWeight: 700, fontSize: 14, opacity: 0.5 }}>#{ci + 1}</span>
                            <input className="form-input" placeholder="Tên khu vực (VD: Sảnh, Phòng khách...)" value={cat.name}
                                onChange={e => updateCategoryName(ci, e.target.value)} style={{ flex: 1, fontWeight: 600, fontSize: 15 }} />
                            <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 14 }}>{fmt(cat.subtotal)} đ</span>
                            <button className="btn btn-ghost btn-sm" onClick={() => removeCategory(ci)}>🗑️</button>
                        </div>
                        <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                            <table className="data-table quotation-detail-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 30 }}>#</th>
                                        <th style={{ width: 36 }}></th>
                                        <th style={{ minWidth: 160 }}>Hạng mục / Sản phẩm</th>
                                        <th style={{ width: 65 }}>Dài (m)</th>
                                        <th style={{ width: 65 }}>Rộng (m)</th>
                                        <th style={{ width: 65 }}>Cao (m)</th>
                                        <th style={{ width: 65 }}>SL</th>
                                        <th style={{ width: 55 }}>ĐVT</th>
                                        <th style={{ width: 90 }}>Đơn giá</th>
                                        <th style={{ width: 100 }}>Thành tiền</th>
                                        <th style={{ minWidth: 120 }}>Mô tả</th>
                                        <th style={{ width: 30 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cat.items.map((item, ii) => (
                                        <tr key={item._key}>
                                            <td style={{ textAlign: 'center', opacity: 0.4, fontSize: 11 }}>{ii + 1}</td>
                                            <td style={{ textAlign: 'center', padding: 2, cursor: 'pointer' }}
                                                title="Click để tải ảnh"
                                                onClick={() => { imgUploadTarget.current = { ci, ii }; imgInputRef.current?.click(); }}>
                                                {item.image ? (
                                                    <img src={item.image} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border-color)' }} />
                                                ) : (
                                                    <div style={{ width: 28, height: 28, borderRadius: 4, border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, opacity: 0.25 }}>📷</div>
                                                )}
                                            </td>
                                            <td><input className="form-input form-input-compact" value={item.name} onChange={e => updateItem(ci, ii, 'name', e.target.value)} placeholder="Tên" /></td>
                                            <td><input className="form-input form-input-compact" type="number" value={item.length || ''} onChange={e => updateItem(ci, ii, 'length', e.target.value)} placeholder="0" /></td>
                                            <td><input className="form-input form-input-compact" type="number" value={item.width || ''} onChange={e => updateItem(ci, ii, 'width', e.target.value)} placeholder="0" /></td>
                                            <td><input className="form-input form-input-compact" type="number" value={item.height || ''} onChange={e => updateItem(ci, ii, 'height', e.target.value)} placeholder="0" /></td>
                                            <td style={{ textAlign: 'right', fontSize: 12 }}>
                                                {(item.length && item.width)
                                                    ? fmt(item.quantity)
                                                    : <input className="form-input form-input-compact" type="number" value={item.quantity || ''} onChange={e => updateItem(ci, ii, 'quantity', e.target.value)} />}
                                            </td>
                                            <td>
                                                <select className="form-select form-input-compact" value={item.unit} onChange={e => updateItem(ci, ii, 'unit', e.target.value)}>
                                                    <option>m²</option><option>m³</option><option>m</option><option>cái</option><option>bộ</option>
                                                    <option>tấm</option><option>kg</option><option>hộp</option><option>cuộn</option>
                                                    <option>lít</option><option>chiếc</option><option>phòng</option><option>mét</option>
                                                </select>
                                            </td>
                                            <td><input className="form-input form-input-compact" type="number" value={item.unitPrice || ''} onChange={e => updateItem(ci, ii, 'unitPrice', e.target.value)} /></td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)', fontSize: 12 }}>{fmt(item.amount)}</td>
                                            <td><input className="form-input form-input-compact" value={item.description} onChange={e => updateItem(ci, ii, 'description', e.target.value)} /></td>
                                            <td><button className="btn btn-ghost" onClick={() => removeItem(ci, ii)} style={{ padding: '2px 4px', fontSize: 11 }}>✕</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ padding: '8px 12px' }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => addItem(ci)}>➕ Thêm dòng trống</button>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Summary */}
                <div className="card">
                    <div className="card-header"><h3>Tổng kết báo giá</h3></div>
                    <div className="card-body">
                        <div className="quotation-summary-grid">
                            <div className="quotation-summary-row"><span>Chi phí trực tiếp</span><span className="quotation-summary-value">{fmt(directCost)} đ</span></div>
                            <div className="quotation-summary-row">
                                <span>Phí quản lý <input className="form-input form-input-compact" type="number" value={form.managementFeeRate || ''} onChange={e => setForm({ ...form, managementFeeRate: parseFloat(e.target.value) || 0 })} style={{ width: 50, display: 'inline-block', margin: '0 4px' }} />%</span>
                                <span className="quotation-summary-value">{fmt(managementFee)} đ</span>
                            </div>
                            <div className="quotation-summary-row">
                                <span>Phí thiết kế <input className="form-input form-input-compact" type="number" value={form.designFee || ''} onChange={e => setForm({ ...form, designFee: parseFloat(e.target.value) || 0 })} style={{ width: 90, display: 'inline-block', marginLeft: 6 }} /></span>
                                <span className="quotation-summary-value">{fmt(form.designFee)} đ</span>
                            </div>
                            <div className="quotation-summary-row">
                                <span>Chi phí khác <input className="form-input form-input-compact" type="number" value={form.otherFee || ''} onChange={e => setForm({ ...form, otherFee: parseFloat(e.target.value) || 0 })} style={{ width: 90, display: 'inline-block', marginLeft: 6 }} /></span>
                                <span className="quotation-summary-value">{fmt(form.otherFee)} đ</span>
                            </div>
                            <div className="quotation-summary-row">
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>Điều chỉnh giá
                                    <input className="form-input form-input-compact" type="number" value={form.adjustment || ''} onChange={e => setForm({ ...form, adjustment: parseFloat(e.target.value) || 0 })} style={{ width: 100, display: 'inline-block' }} placeholder="+tăng / -giảm" />
                                    <div style={{ display: 'inline-flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-light)', fontSize: 11 }}>
                                        <button type="button" onClick={() => setForm({ ...form, adjustmentType: 'amount' })} style={{ padding: '2px 8px', border: 'none', cursor: 'pointer', background: form.adjustmentType === 'amount' ? 'var(--primary)' : 'transparent', color: form.adjustmentType === 'amount' ? '#fff' : 'var(--text-secondary)', fontWeight: 600 }}>đ</button>
                                        <button type="button" onClick={() => setForm({ ...form, adjustmentType: 'percent' })} style={{ padding: '2px 8px', border: 'none', cursor: 'pointer', background: form.adjustmentType === 'percent' ? 'var(--primary)' : 'transparent', color: form.adjustmentType === 'percent' ? '#fff' : 'var(--text-secondary)', fontWeight: 600 }}>%</button>
                                    </div>
                                    {form.adjustmentType === 'percent' && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>tính theo %</span>}
                                </span>
                                <span className="quotation-summary-value" style={{ color: adjustmentAmount > 0 ? 'var(--status-success)' : adjustmentAmount < 0 ? 'var(--status-danger)' : '' }}>{adjustmentAmount >= 0 ? '+' : ''}{fmt(adjustmentAmount)} đ</span>
                            </div>
                            <div className="quotation-summary-row quotation-summary-subtotal"><span>Tổng cộng</span><span className="quotation-summary-value">{fmt(total)} đ</span></div>
                            <div className="quotation-summary-row">
                                <span>Chiết khấu <input className="form-input form-input-compact" type="number" value={form.discount || ''} onChange={e => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} style={{ width: 50, display: 'inline-block', margin: '0 4px' }} />%</span>
                                <span className="quotation-summary-value" style={{ color: 'var(--status-danger)' }}>-{fmt(discountAmount)} đ</span>
                            </div>
                            <div className="quotation-summary-row">
                                <span>VAT <input className="form-input form-input-compact" type="number" value={form.vat || ''} onChange={e => setForm({ ...form, vat: parseFloat(e.target.value) || 0 })} style={{ width: 50, display: 'inline-block', margin: '0 4px' }} />%</span>
                                <span className="quotation-summary-value">{fmt(vatAmount)} đ</span>
                            </div>
                            <div className="quotation-summary-row quotation-summary-grand"><span>TỔNG GIÁ TRỊ BÁO GIÁ</span><span className="quotation-summary-value">{fmt(grandTotal)} đ</span></div>
                        </div>
                    </div>
                </div>
            </div>
            <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImgChange} />
        </div>
    );
}
