'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import PoBulkFromQuotationModal from '@/components/PoBulkFromQuotationModal';
import { useRouter, useSearchParams } from 'next/navigation';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
const fmtNum = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;

const STATUS_BADGE = { 'Đã thanh toán': 'badge-success', 'Đã giao': 'badge-info', 'Đang giao': 'badge-warning', 'Nháp': 'badge-default' };

function PurchasingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [projects, setProjects] = useState([]);
    const [suppliers, setSuppliers] = useState([]);

    // Create PO modal
    const [showModal, setShowModal] = useState(false);
    const [poForm, setPoForm] = useState({ supplier: '', supplierId: null, projectId: '', deliveryDate: '', notes: '' });
    const [poItems, setPoItems] = useState([{ productName: '', unit: 'cái', quantity: 1, unitPrice: 0, amount: 0, productId: null }]);
    const [saving, setSaving] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);

    // Product autocomplete
    const [productSearches, setProductSearches] = useState({}); // { rowIdx: query }
    const [productResults, setProductResults] = useState({}); // { rowIdx: [] }
    const [activeRowIdx, setActiveRowIdx] = useState(null);
    const searchTimers = useRef({});

    // Budget picker (from dự toán)
    const [budgetItems, setBudgetItems] = useState([]);
    const [budgetLoading, setBudgetLoading] = useState(false);
    const [showBudgetPicker, setShowBudgetPicker] = useState(false);
    const [selectedBudgetIds, setSelectedBudgetIds] = useState(new Set());

    // Product picker (chọn nhiều SP từ danh mục)
    const [showProductPicker, setShowProductPicker] = useState(false);
    const [pickerSearch, setPickerSearch] = useState('');
    const [pickerResults, setPickerResults] = useState([]);
    const [pickerLoading, setPickerLoading] = useState(false);
    const [pickerSelected, setPickerSelected] = useState({}); // { productId: { product, qty } }
    const [pickerFilterBySupplier, setPickerFilterBySupplier] = useState(true);
    const pickerTimer = useRef(null);

    // GRN (Goods Receipt Note) state
    const [grnPO, setGrnPO] = useState(null);
    const [grnItems, setGrnItems] = useState([]);
    const [grnNote, setGrnNote] = useState('');
    const [grnSaving, setGrnSaving] = useState(false);
    const [grnWarehouseId, setGrnWarehouseId] = useState('');
    const [warehouses, setWarehouses] = useState([]);
    const [poReceipts, setPoReceipts] = useState([]);

    const fetchOrders = () => {
        setLoading(true);
        fetch('/api/purchase-orders?limit=1000').then(r => r.json()).then(d => { setOrders(d.data || []); setLoading(false); });
    };

    const openGrn = async (poId, e) => {
        e.stopPropagation();
        const [poRes, receiptsRes, whRes] = await Promise.all([
            fetch(`/api/purchase-orders/${poId}`),
            fetch(`/api/inventory/receipts?poId=${poId}`),
            fetch('/api/warehouses'),
        ]);
        const po = await poRes.json();
        const receipts = await receiptsRes.json();
        const whs = await whRes.json();
        setWarehouses(whs.data || whs || []);
        setPoReceipts(Array.isArray(receipts) ? receipts : []);
        setGrnPO(po);
        const defaultWh = (whs.data || whs || [])[0];
        setGrnWarehouseId(defaultWh?.id || '');
        setGrnItems((po.items || []).map(it => ({
            id: it.id,
            productId: it.productId || null,
            productName: it.productName,
            unit: it.unit,
            quantity: it.quantity,
            receivedQty: it.receivedQty || 0,
            unitPrice: it.unitPrice || 0,
            toReceive: Math.max(0, it.quantity - (it.receivedQty || 0)),
        })));
        setGrnNote('');
    };

    const submitGrn = async () => {
        const validItems = grnItems.filter(it => (it.toReceive || 0) > 0);
        if (!validItems.length) return alert('Nhập số lượng cần nhận cho ít nhất 1 sản phẩm');
        if (!grnWarehouseId) return alert('Vui lòng chọn kho nhập');
        setGrnSaving(true);
        const res = await fetch('/api/inventory/receipts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                purchaseOrderId: grnPO.id,
                warehouseId: grnWarehouseId,
                receivedBy: '',
                notes: grnNote,
                items: validItems.map(it => ({
                    productId: it.productId,
                    productName: it.productName,
                    unit: it.unit,
                    qtyOrdered: it.quantity,
                    qtyReceived: Number(it.toReceive),
                    unitPrice: it.unitPrice,
                    purchaseOrderItemId: it.id,
                })),
            }),
        });
        setGrnSaving(false);
        if (!res.ok) { const e = await res.json(); return alert(e.error || 'Lỗi nhận hàng'); }
        alert('Đã tạo phiếu nhập kho thành công!');
        setGrnPO(null);
        fetchOrders();
    };

    useEffect(() => {
        fetchOrders();
        fetch('/api/projects?limit=200').then(r => r.json()).then(d => setProjects(d.data || []));
        fetch('/api/suppliers?limit=1000').then(r => r.json()).then(d => setSuppliers(d.data || []));
    }, []);

    // Pre-fill from URL params (from products bulk action)
    useEffect(() => {
        const createPO = searchParams.get('createPO');
        const productIds = searchParams.get('products')?.split(',').filter(Boolean) || [];
        if (createPO && productIds.length > 0) {
            fetch('/api/products?limit=1000&sort=name_asc').then(r => r.json()).then(d => {
                const all = d.data || [];
                const items = productIds.map(pid => {
                    const p = all.find(x => x.id === pid);
                    return p ? { productName: p.name, unit: p.unit || 'cái', quantity: 1, unitPrice: p.salePrice || 0, amount: p.salePrice || 0, productId: p.id } : null;
                }).filter(Boolean);
                if (items.length > 0) {
                    setPoItems(items);
                    setPoForm(f => ({ ...f, supplier: items[0] ? (d.data?.find(p => p.id === items[0].productId)?.supplier || '') : '' }));
                    setShowModal(true);
                }
            });
        }
    }, [searchParams]);

    const totalValue = orders.reduce((s, o) => s + o.totalAmount, 0);
    const totalPaid = orders.reduce((s, o) => s + o.paidAmount, 0);
    const statuses = ['Chờ duyệt', 'Chờ duyệt vượt định mức', 'Nháp', 'Đang đặt', 'Đã xác nhận', 'Đang giao', 'Đã giao', 'Đã thanh toán'];
    const filtered = filterStatus ? orders.filter(o => o.status === filterStatus) : orders;

    const updateItem = (i, field, value) => {
        setPoItems(items => items.map((it, idx) => {
            if (idx !== i) return it;
            const updated = { ...it, [field]: value };
            updated.amount = (Number(updated.quantity) || 0) * (Number(updated.unitPrice) || 0);
            return updated;
        }));
    };

    const poTotal = poItems.reduce((s, it) => s + (it.amount || 0), 0);

    // Product autocomplete handlers
    const handleProductSearch = (rowIdx, query) => {
        setProductSearches(prev => ({ ...prev, [rowIdx]: query }));
        updateItem(rowIdx, 'productName', query);
        clearTimeout(searchTimers.current[rowIdx]);
        if (!query.trim()) { setProductResults(prev => ({ ...prev, [rowIdx]: [] })); return; }
        searchTimers.current[rowIdx] = setTimeout(() => {
            fetch(`/api/products?search=${encodeURIComponent(query)}&limit=10`)
                .then(r => r.json())
                .then(d => setProductResults(prev => ({ ...prev, [rowIdx]: d.data || [] })));
        }, 250);
    };

    const selectProduct = (rowIdx, product) => {
        setPoItems(items => items.map((it, idx) => idx !== rowIdx ? it : {
            ...it,
            productName: product.name,
            unit: product.unit || 'cái',
            unitPrice: product.salePrice || 0,
            amount: (it.quantity || 1) * (product.salePrice || 0),
            productId: product.id,
        }));
        setProductResults(prev => ({ ...prev, [rowIdx]: [] }));
        setProductSearches(prev => ({ ...prev, [rowIdx]: '' }));
        setActiveRowIdx(null);
    };

    // Budget picker handlers
    const openBudgetPicker = async () => {
        if (!poForm.projectId) return alert('Chọn dự án trước');
        setBudgetLoading(true);
        setShowBudgetPicker(true);
        setSelectedBudgetIds(new Set());
        const res = await fetch(`/api/material-plans?projectId=${poForm.projectId}&limit=500`);
        const d = await res.json();
        setBudgetItems(d.data || []);
        setBudgetLoading(false);
    };

    const addFromBudget = () => {
        const selected = budgetItems.filter(m => selectedBudgetIds.has(m.id));
        const newItems = selected.map(m => ({
            productName: m.product?.name || m.productName || '',
            unit: m.product?.unit || 'cái',
            quantity: Math.max(0, (m.quantity || 0) - (m.orderedQty || 0)),
            unitPrice: m.unitPrice || m.product?.salePrice || 0,
            amount: Math.max(0, (m.quantity || 0) - (m.orderedQty || 0)) * (m.unitPrice || m.product?.salePrice || 0),
            productId: m.productId || null,
        })).filter(it => it.quantity > 0);
        if (newItems.length === 0) return alert('Tất cả các mục đã đặt đủ số lượng');
        setPoItems(prev => {
            const base = prev.filter(it => it.productName.trim());
            return base.length ? [...base, ...newItems] : newItems;
        });
        setShowBudgetPicker(false);
    };

    // Product picker handlers
    const pickerSupplierName = poForm.supplierId
        ? (suppliers.find(s => s.id === poForm.supplierId)?.name || '')
        : '';

    const fetchPickerProducts = (q, filterSupplier) => {
        clearTimeout(pickerTimer.current);
        setPickerLoading(true);
        pickerTimer.current = setTimeout(() => {
            const params = new URLSearchParams({ limit: '80', sort: 'name_asc' });
            if (q) params.set('search', q);
            if (filterSupplier && pickerSupplierName) params.set('supplier', pickerSupplierName);
            fetch(`/api/products?${params}`)
                .then(r => r.json())
                .then(d => { setPickerResults(d.data || []); setPickerLoading(false); });
        }, q ? 250 : 0);
    };

    const openProductPicker = () => {
        setShowProductPicker(true);
        setPickerSearch('');
        setPickerSelected({});
        setPickerFilterBySupplier(!!pickerSupplierName);
        fetchPickerProducts('', !!pickerSupplierName);
    };

    const handlePickerSearch = (q) => {
        setPickerSearch(q);
        fetchPickerProducts(q, pickerFilterBySupplier);
    };

    const handlePickerFilterToggle = (val) => {
        setPickerFilterBySupplier(val);
        fetchPickerProducts(pickerSearch, val);
    };

    const togglePickerProduct = (product) => {
        setPickerSelected(prev => {
            if (prev[product.id]) { const next = { ...prev }; delete next[product.id]; return next; }
            return { ...prev, [product.id]: { product, qty: 1 } };
        });
    };

    const addFromProductPicker = () => {
        const newItems = Object.values(pickerSelected).map(({ product, qty }) => ({
            productName: product.name,
            unit: product.unit || 'cái',
            quantity: qty || 1,
            unitPrice: product.salePrice || 0,
            amount: (qty || 1) * (product.salePrice || 0),
            productId: product.id,
        }));
        if (!newItems.length) return;
        setPoItems(prev => {
            const base = prev.filter(it => it.productName.trim());
            return base.length ? [...base, ...newItems] : newItems;
        });
        setShowProductPicker(false);
    };

    const createPO = async () => {
        if (!poForm.supplier.trim()) return alert('Vui lòng nhập nhà cung cấp');
        if (poItems.every(it => !it.productName.trim())) return alert('Vui lòng nhập ít nhất 1 sản phẩm');
        setSaving(true);
        const validItems = poItems.filter(it => it.productName.trim());
        const res = await fetch('/api/purchase-orders', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...poForm,
                projectId: poForm.projectId || null,
                totalAmount: poTotal,
                items: validItems,
            }),
        });
        setSaving(false);
        if (!res.ok) { const e = await res.json(); return alert(e.error || 'Lỗi tạo PO'); }
        setShowModal(false);
        setPoForm({ supplier: '', supplierId: null, projectId: '', deliveryDate: '', notes: '' });
        setPoItems([{ productName: '', unit: 'cái', quantity: 1, unitPrice: 0, amount: 0, productId: null }]);
        setFilterStatus('');
        fetchOrders();
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <h2 style={{ margin: 0 }}>🛒 Mua sắm vật tư toàn công ty</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn" onClick={() => setShowBulkModal(true)}>📋 Tạo PO từ Báo giá</button>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Tạo PO mới</button>
                </div>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 24 }}>
                <div className="stat-card"><div className="stat-icon">🛒</div><div><div className="stat-value">{orders.length}</div><div className="stat-label">Tổng đơn hàng</div></div></div>
                <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value">{fmt(totalValue)}</div><div className="stat-label">Tổng giá trị</div></div></div>
                <div className="stat-card"><div className="stat-icon">✅</div><div><div className="stat-value" style={{ color: 'var(--status-success)' }}>{fmt(totalPaid)}</div><div className="stat-label">Đã thanh toán</div></div></div>
                <div className="stat-card"><div className="stat-icon">📦</div><div><div className="stat-value" style={{ color: 'var(--status-warning)' }}>{orders.filter(o => o.status === 'Đang giao').length}</div><div className="stat-label">Đang giao</div></div></div>
                <div className="stat-card"><div className="stat-icon">⏳</div><div><div className="stat-value" style={{ color: 'var(--status-info)' }}>{orders.filter(o => o.status === 'Đang đặt').length}</div><div className="stat-label">Đang đặt</div></div></div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>Danh sách đơn mua hàng</h3>
                    <div className="filter-bar" style={{ margin: 0 }}>
                        <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="">Tất cả</option>
                            {statuses.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : (
                    <div className="table-container"><table className="data-table">
                        <thead><tr><th>Mã PO</th><th>NCC</th><th>Dự án</th><th>Tổng tiền</th><th>Đã TT</th><th>Số SP</th><th>Ngày đặt</th><th>Giao hàng</th><th>Trạng thái</th><th></th></tr></thead>
                        <tbody>{filtered.map(o => {
                            const rate = pct(o.paidAmount, o.totalAmount);
                            const canReceive = !['Hoàn thành', 'Hủy'].includes(o.status);
                            return (
                                <tr key={o.id}>
                                    <td className="accent">{o.code}</td>
                                    <td className="primary">{o.supplier}</td>
                                    <td>{o.project
                                        ? <span className="badge badge-info" style={{ cursor: 'pointer' }} onClick={() => router.push(`/projects/${o.project.code || o.projectId}`)}>{o.project.code}</span>
                                        : <span style={{ opacity: 0.3, fontSize: 12 }}>—</span>}
                                    </td>
                                    <td className="amount">{fmt(o.totalAmount)}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div className="progress-bar" style={{ flex: 1, maxWidth: 50 }}><div className="progress-fill" style={{ width: `${rate}%` }}></div></div>
                                            <span style={{ fontSize: 12 }}>{rate}%</span>
                                        </div>
                                    </td>
                                    <td>{o.items?.length || 0}</td>
                                    <td style={{ fontSize: 12 }}>{fmtDate(o.orderDate)}</td>
                                    <td style={{ fontSize: 12 }}>{fmtDate(o.deliveryDate)}</td>
                                    <td><span className={`badge ${STATUS_BADGE[o.status] || 'badge-default'}`}>{o.status}</span></td>
                                    <td>
                                        {canReceive && (
                                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, whiteSpace: 'nowrap' }}
                                                onClick={e => openGrn(o.id, e)}>📦 Nhận hàng</button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}</tbody>
                    </table></div>
                )}
                {!loading && filtered.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Không có dữ liệu</div>}
            </div>

            {/* Create PO Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-modal)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-lg)', width: '95%', maxWidth: 900, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
                        <div className="modal-header">
                            <h3>Tạo đơn mua hàng (PO)</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {/* Row 1: NCC + Dự án */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Nhà cung cấp *</label>
                                    <select className="form-select" value={poForm.supplierId || ''} autoFocus
                                        onChange={e => {
                                            const sup = suppliers.find(s => s.id === e.target.value);
                                            setPoForm(f => ({ ...f, supplierId: sup?.id || null, supplier: sup?.name || '' }));
                                        }}>
                                        <option value="">-- Chọn nhà cung cấp --</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}{s.isBlacklisted ? ' 🚫' : ''}</option>)}
                                    </select>
                                    {!poForm.supplierId && (
                                        <input className="form-input" style={{ marginTop: 6, fontSize: 12 }} value={poForm.supplier} onChange={e => setPoForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Hoặc nhập tên NCC thủ công..." />
                                    )}
                                    {(() => {
                                        const sup = suppliers.find(s => s.id === poForm.supplierId);
                                        if (!sup) return null;
                                        const debt = (sup.totalPurchase || 0) - (sup.totalPaid || 0);
                                        const remaining = sup.creditLimit > 0 ? sup.creditLimit - debt : null;
                                        return (
                                            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                {sup.isBlacklisted && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--status-danger)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--status-danger)', fontWeight: 600 }}>🚫 NCC này đang trong Blacklist</div>}
                                                {sup.creditLimit > 0 && <div style={{ background: 'var(--bg-secondary)', borderRadius: 6, padding: '4px 10px', fontSize: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                                    <span>Hạn mức: <strong>{new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(sup.creditLimit)}</strong></span>
                                                    <span>Nợ: <strong style={{ color: 'var(--status-danger)' }}>{new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(debt)}</strong></span>
                                                    <span>Còn: <strong style={{ color: remaining >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>{new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(remaining)}</strong></span>
                                                </div>}
                                                {sup.creditLimit > 0 && poTotal > (remaining ?? Infinity) && !sup.isBlacklisted && <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid var(--status-warning)', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#b45309', fontWeight: 600 }}>⚠️ Vượt hạn mức tín dụng</div>}
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label">Dự án (không bắt buộc)</label>
                                        <select className="form-select" value={poForm.projectId} onChange={e => setPoForm(f => ({ ...f, projectId: e.target.value }))}>
                                            <option value="">-- Không gắn dự án --</option>
                                            {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Ngày giao hàng</label>
                                            <input className="form-input" type="date" value={poForm.deliveryDate} onChange={e => setPoForm(f => ({ ...f, deliveryDate: e.target.value }))} />
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Ghi chú</label>
                                            <input className="form-input" value={poForm.notes} onChange={e => setPoForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ghi chú..." />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Items table */}
                            <div style={{ marginTop: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                                    <label className="form-label" style={{ margin: 0 }}>Danh sách sản phẩm</label>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button className="btn btn-ghost btn-sm" onClick={openProductPicker}>
                                            🔍 Chọn sản phẩm
                                        </button>
                                        <button className="btn btn-ghost btn-sm" onClick={openBudgetPicker} title="Thêm từ dự toán vật tư của dự án">
                                            📋 Từ dự toán
                                        </button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setPoItems(it => [...it, { productName: '', unit: 'cái', quantity: 1, unitPrice: 0, amount: 0, productId: null }])}>
                                            + Dòng trống
                                        </button>
                                    </div>
                                </div>
                                <div style={{ border: '1px solid var(--border-color)', borderRadius: 6, minHeight: 280, maxHeight: 380, overflowY: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                        <thead>
                                            <tr style={{ background: 'var(--surface-alt)' }}>
                                                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: 11 }}>Tên sản phẩm</th>
                                                <th style={{ padding: '8px 8px', width: 65, textAlign: 'left', fontWeight: 600, fontSize: 11 }}>ĐVT</th>
                                                <th style={{ padding: '8px 8px', width: 80, textAlign: 'left', fontWeight: 600, fontSize: 11 }}>Số lượng</th>
                                                <th style={{ padding: '8px 8px', width: 110, textAlign: 'left', fontWeight: 600, fontSize: 11 }}>Đơn giá</th>
                                                <th style={{ padding: '8px 8px', width: 110, textAlign: 'right', fontWeight: 600, fontSize: 11 }}>Thành tiền</th>
                                                <th style={{ width: 36 }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {poItems.map((it, i) => (
                                                <tr key={i} style={{ borderTop: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: '6px 8px', position: 'relative' }}>
                                                        <input className="form-input" style={{ fontSize: 12, padding: '4px 8px' }}
                                                            value={activeRowIdx === i ? (productSearches[i] ?? it.productName) : it.productName}
                                                            onChange={e => handleProductSearch(i, e.target.value)}
                                                            onFocus={() => { setActiveRowIdx(i); setProductSearches(prev => ({ ...prev, [i]: it.productName })); }}
                                                            onBlur={() => setTimeout(() => setActiveRowIdx(null), 150)}
                                                            placeholder="Tên sản phẩm (gõ để tìm)..." />
                                                        {activeRowIdx === i && (productResults[i] || []).length > 0 && (
                                                            <div style={{ position: 'absolute', top: '100%', left: 0, minWidth: 340, zIndex: 200, background: 'var(--bg-card, #fff)', border: '1px solid var(--border-color)', borderRadius: 6, boxShadow: '0 6px 20px rgba(0,0,0,0.18)', maxHeight: 260, overflowY: 'auto' }}>
                                                                {(productResults[i] || []).map(p => (
                                                                    <div key={p.id} onMouseDown={() => selectProduct(i, p)}
                                                                        style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light, #eee)' }}
                                                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover, #f5f5f5)'}
                                                                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                                                                        <span>{p.name} {p.code && <span style={{ opacity: 0.45, fontSize: 11, marginLeft: 6 }}>{p.code}</span>}</span>
                                                                        <span style={{ opacity: 0.55, flexShrink: 0, marginLeft: 12, fontSize: 12 }}>{p.unit}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '6px 4px' }}>
                                                        <input className="form-input" style={{ fontSize: 12, padding: '4px 6px' }} value={it.unit}
                                                            onChange={e => updateItem(i, 'unit', e.target.value)} />
                                                    </td>
                                                    <td style={{ padding: '6px 4px' }}>
                                                        <input className="form-input" type="number" style={{ fontSize: 12, padding: '4px 6px' }} value={it.quantity}
                                                            onChange={e => updateItem(i, 'quantity', Number(e.target.value))} min="0" step="0.1" />
                                                    </td>
                                                    <td style={{ padding: '6px 4px' }}>
                                                        <input className="form-input" type="number" style={{ fontSize: 12, padding: '4px 6px' }} value={it.unitPrice}
                                                            onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))} min="0" />
                                                    </td>
                                                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, fontSize: 12 }}>
                                                        {fmtNum(it.amount)}
                                                    </td>
                                                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                                                        {poItems.length > 1 && (
                                                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}
                                                                onClick={() => setPoItems(it => it.filter((_, idx) => idx !== i))}>✕</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr style={{ background: 'var(--surface-alt)', borderTop: '2px solid var(--border-color)' }}>
                                                <td colSpan={4} style={{ padding: '10px 12px', fontWeight: 700, fontSize: 13 }}>TỔNG CỘNG</td>
                                                <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, fontSize: 14, color: 'var(--primary)' }}>{fmt(poTotal)}</td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={createPO} disabled={saving || suppliers.find(s => s.id === poForm.supplierId)?.isBlacklisted}>{saving ? 'Đang tạo...' : 'Tạo đơn hàng'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Budget picker modal */}
            {showBudgetPicker && (
                <div className="modal-overlay" onClick={() => setShowBudgetPicker(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, width: '95%' }}>
                        <div className="modal-header">
                            <h3>📋 Chọn từ dự toán vật tư</h3>
                            <button className="modal-close" onClick={() => setShowBudgetPicker(false)}>×</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: 440, overflowY: 'auto' }}>
                            {budgetLoading ? (
                                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                            ) : budgetItems.length === 0 ? (
                                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có dự toán vật tư cho dự án này</div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: 'var(--surface-alt)' }}>
                                            <th style={{ padding: '8px 10px', width: 32 }}>
                                                <input type="checkbox" onChange={e => setSelectedBudgetIds(e.target.checked ? new Set(budgetItems.map(m => m.id)) : new Set())} />
                                            </th>
                                            <th style={{ padding: '8px 10px', textAlign: 'left' }}>Sản phẩm</th>
                                            <th style={{ padding: '8px 8px', textAlign: 'right', width: 80 }}>Kế hoạch</th>
                                            <th style={{ padding: '8px 8px', textAlign: 'right', width: 80 }}>Đã đặt</th>
                                            <th style={{ padding: '8px 8px', textAlign: 'right', width: 80 }}>Còn đặt</th>
                                            <th style={{ padding: '8px 8px', width: 50 }}>ĐVT</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {budgetItems.map(m => {
                                            const remaining = Math.max(0, (m.quantity || 0) - (m.orderedQty || 0));
                                            const done = remaining === 0;
                                            return (
                                                <tr key={m.id} style={{ borderTop: '1px solid var(--border-color)', opacity: done ? 0.5 : 1 }}>
                                                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                                        <input type="checkbox" disabled={done}
                                                            checked={selectedBudgetIds.has(m.id)}
                                                            onChange={e => setSelectedBudgetIds(prev => {
                                                                const next = new Set(prev);
                                                                e.target.checked ? next.add(m.id) : next.delete(m.id);
                                                                return next;
                                                            })} />
                                                    </td>
                                                    <td style={{ padding: '6px 10px' }}>
                                                        <div style={{ fontWeight: 500 }}>{m.product?.name || '—'}</div>
                                                        {m.product?.code && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.product.code}</div>}
                                                    </td>
                                                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmtNum(m.quantity)}</td>
                                                    <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--status-success)' }}>{fmtNum(m.orderedQty)}</td>
                                                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: done ? 'var(--text-muted)' : 'var(--status-danger)' }}>{fmtNum(remaining)}</td>
                                                    <td style={{ padding: '6px 8px', color: 'var(--text-muted)', fontSize: 12 }}>{m.product?.unit || '—'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowBudgetPicker(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={addFromBudget} disabled={selectedBudgetIds.size === 0}>
                                Thêm {selectedBudgetIds.size > 0 ? `${selectedBudgetIds.size} mục` : ''} vào PO
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Product picker modal */}
            {showProductPicker && (
                <div className="modal-overlay" onClick={() => setShowProductPicker(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, width: '95%' }}>
                        <div className="modal-header">
                            <h3>🔍 Chọn sản phẩm đặt hàng</h3>
                            <button className="modal-close" onClick={() => setShowProductPicker(false)}>×</button>
                        </div>
                        <div className="modal-body" style={{ padding: '12px 20px' }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                                <input className="form-input" placeholder="Tìm tên, mã sản phẩm..."
                                    value={pickerSearch} onChange={e => handlePickerSearch(e.target.value)}
                                    autoFocus style={{ flex: 1 }} />
                                {pickerSupplierName && (
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: pickerFilterBySupplier ? 'var(--primary)' : 'transparent', color: pickerFilterBySupplier ? '#fff' : 'var(--text-secondary)' }}>
                                        <input type="checkbox" checked={pickerFilterBySupplier} onChange={e => handlePickerFilterToggle(e.target.checked)} style={{ display: 'none' }} />
                                        {pickerFilterBySupplier ? '✓' : ''} Chỉ SP của {pickerSupplierName}
                                    </label>
                                )}
                            </div>
                            <div style={{ maxHeight: 420, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 6 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary, #f8f8f8)', zIndex: 1 }}>
                                        <tr>
                                            <th style={{ padding: '8px 10px', width: 36, fontWeight: 600 }}></th>
                                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>Sản phẩm</th>
                                            <th style={{ padding: '8px 8px', width: 60, textAlign: 'left', fontWeight: 600 }}>ĐVT</th>
                                            <th style={{ padding: '8px 8px', width: 110, textAlign: 'right', fontWeight: 600 }}>Đơn giá</th>
                                            <th style={{ padding: '8px 8px', width: 100, textAlign: 'center', fontWeight: 600 }}>Số lượng</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pickerLoading ? (
                                            <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</td></tr>
                                        ) : pickerResults.length === 0 ? (
                                            <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Không tìm thấy sản phẩm</td></tr>
                                        ) : pickerResults.map(p => {
                                            const sel = pickerSelected[p.id];
                                            return (
                                                <tr key={p.id} onClick={() => togglePickerProduct(p)}
                                                    style={{ borderTop: '1px solid var(--border-color)', cursor: 'pointer', background: sel ? 'var(--bg-accent, #eef5ff)' : '' }}>
                                                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                        <input type="checkbox" readOnly checked={!!sel} style={{ width: 15, height: 15 }} />
                                                    </td>
                                                    <td style={{ padding: '8px 10px' }}>
                                                        <div style={{ fontWeight: sel ? 600 : 400 }}>{p.name}</div>
                                                        {p.code && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.code}</div>}
                                                    </td>
                                                    <td style={{ padding: '8px 8px', color: 'var(--text-muted)' }}>{p.unit || '—'}</td>
                                                    <td style={{ padding: '8px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                                                        {p.salePrice > 0 ? fmt(p.salePrice) : '—'}
                                                    </td>
                                                    <td style={{ padding: '6px 8px' }} onClick={e => e.stopPropagation()}>
                                                        {sel && (
                                                            <input type="number" className="form-input" min={1} step={1}
                                                                value={sel.qty}
                                                                onChange={e => setPickerSelected(prev => ({ ...prev, [p.id]: { ...prev[p.id], qty: Number(e.target.value) || 1 } }))}
                                                                style={{ textAlign: 'center', padding: '4px 6px', fontSize: 13 }} />
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {Object.keys(pickerSelected).length > 0 && (
                                <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
                                    Đã chọn <strong style={{ color: 'var(--primary)' }}>{Object.keys(pickerSelected).length}</strong> sản phẩm
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowProductPicker(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={addFromProductPicker} disabled={Object.keys(pickerSelected).length === 0}>
                                Thêm {Object.keys(pickerSelected).length > 0 ? `${Object.keys(pickerSelected).length} sản phẩm` : ''} vào PO
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* GRN Modal */}
            {grnPO && (
                <div className="modal-overlay" onClick={() => setGrnPO(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, width: '95%' }}>
                        <div className="modal-header">
                            <h3>📦 Nhận hàng — {grnPO.code}</h3>
                            <button className="modal-close" onClick={() => setGrnPO(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                                NCC: <strong>{grnPO.supplier}</strong>
                                {grnPO.project && <> &nbsp;|&nbsp; Dự án: <strong>{grnPO.project.code}</strong></>}
                            </div>
                            <div className="form-group" style={{ marginBottom: 12 }}>
                                <label className="form-label">Kho nhập *</label>
                                <select className="form-select" value={grnWarehouseId} onChange={e => setGrnWarehouseId(e.target.value)}>
                                    <option value="">— Chọn kho —</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            {poReceipts.length > 0 && (
                                <div style={{ marginBottom: 12, background: 'var(--bg-secondary)', borderRadius: 8, padding: 12 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Đã nhập trước ({poReceipts.length} lần):</div>
                                    {poReceipts.map(r => (
                                        <div key={r.id} style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
                                            {r.code} — {new Date(r.receivedDate).toLocaleDateString('vi-VN')} — {r.warehouse?.name} — {r.items.length} mặt hàng
                                        </div>
                                    ))}
                                </div>
                            )}
                            <table className="data-table" style={{ margin: 0 }}>
                                <thead><tr>
                                    <th>Sản phẩm</th>
                                    <th style={{ width: 55, textAlign: 'center' }}>ĐVT</th>
                                    <th style={{ width: 80, textAlign: 'center' }}>Đặt</th>
                                    <th style={{ width: 80, textAlign: 'center' }}>Đã nhận</th>
                                    <th style={{ width: 100, textAlign: 'center' }}>Nhận lần này</th>
                                </tr></thead>
                                <tbody>
                                    {grnItems.map((it, i) => (
                                        <tr key={it.id}>
                                            <td style={{ fontSize: 13 }}>{it.productName}</td>
                                            <td style={{ textAlign: 'center', fontSize: 12 }}>{it.unit}</td>
                                            <td style={{ textAlign: 'center', fontSize: 13 }}>{fmtNum(it.quantity)}</td>
                                            <td style={{ textAlign: 'center', fontSize: 13, color: it.receivedQty >= it.quantity ? 'var(--status-success)' : 'var(--text-muted)' }}>
                                                {fmtNum(it.receivedQty)}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <input
                                                    className="form-input form-input-compact"
                                                    type="number" min="0"
                                                    max={it.quantity - it.receivedQty}
                                                    value={it.toReceive}
                                                    onChange={e => setGrnItems(prev => prev.map((x, idx) => idx === i ? { ...x, toReceive: Number(e.target.value) || 0 } : x))}
                                                    style={{ width: 80, textAlign: 'center' }}
                                                    disabled={it.receivedQty >= it.quantity}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="form-group" style={{ marginTop: 12 }}>
                                <label className="form-label">Ghi chú nhận hàng</label>
                                <input className="form-input" value={grnNote} onChange={e => setGrnNote(e.target.value)} placeholder="Tình trạng hàng, ghi chú thêm..." />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setGrnPO(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={submitGrn} disabled={grnSaving}>
                                {grnSaving ? '⏳ Đang lưu...' : '✅ Xác nhận nhận hàng'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PoBulkFromQuotationModal
                open={showBulkModal}
                onClose={() => setShowBulkModal(false)}
                prefillProjectId={null}
                onSuccess={() => { setShowBulkModal(false); fetchOrders(); }}
            />
        </div>
    );
}

export default function PurchasingPage() {
    return (
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', opacity: 0.4 }}>Đang tải...</div>}>
            <PurchasingContent />
        </Suspense>
    );
}
