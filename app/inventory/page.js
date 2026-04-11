'use client';
import { useState, useEffect } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN');

const EMPTY_FORM = {
    type: 'Nhập', warehouseId: '', note: '', projectId: '', date: new Date().toISOString().split('T')[0],
};
const EMPTY_ITEM = { productId: '', quantity: '', unit: '' };

export default function InventoryPage() {
    const [activeTab, setActiveTab] = useState('stock');
    const [txData, setTxData] = useState({ transactions: [], warehouses: [] });
    const [stockData, setStockData] = useState({ products: [], lowStock: 0 });
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('');
    const [filterWarehouse, setFilterWarehouse] = useState('');
    const [stockSearch, setStockSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formItems, setFormItems] = useState([{ ...EMPTY_ITEM }]);
    const [projects, setProjects] = useState([]);
    const [saving, setSaving] = useState(false);
    const [reorderAlerts, setReorderAlerts] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [issues, setIssues] = useState([]);
    const [viewReceipt, setViewReceipt] = useState(null);
    const [viewIssue, setViewIssue] = useState(null);
    const [showIssueForm, setShowIssueForm] = useState(false);
    const [issueWarehouseId, setIssueWarehouseId] = useState('');
    const [issueProjectId, setIssueProjectId] = useState('');
    const [issueIssuedBy, setIssueIssuedBy] = useState('');
    const [issueNotes, setIssueNotes] = useState('');
    const [issueItems, setIssueItems] = useState([{ productId: '', productName: '', unit: '', qty: '', unitPrice: 0, stock: 0 }]);
    const [issueSaving, setIssueSaving] = useState(false);

    // Edit receipt
    const [editReceipt, setEditReceipt] = useState(null);
    const [editReceiptItems, setEditReceiptItems] = useState([]);
    const [editReceiptMeta, setEditReceiptMeta] = useState({ receivedBy: '', notes: '', receivedDate: '' });
    const [editReceiptSaving, setEditReceiptSaving] = useState(false);

    // Edit issue
    const [editIssue, setEditIssue] = useState(null);
    const [editIssueItems, setEditIssueItems] = useState([]);
    const [editIssueMeta, setEditIssueMeta] = useState({ warehouseId: '', projectId: '', issuedBy: '', notes: '', issuedDate: '' });
    const [editIssueSaving, setEditIssueSaving] = useState(false);

    const fetchTx = async () => {
        setLoading(true);
        const p = new URLSearchParams({ limit: 200 });
        if (filterType) p.set('type', filterType);
        if (filterWarehouse) p.set('warehouseId', filterWarehouse);
        const res = await fetch(`/api/inventory?${p}`);
        const d = await res.json();
        setTxData({ transactions: d.data || [], warehouses: d.warehouses || [] });
        setLoading(false);
    };

    const fetchStock = async () => {
        setLoading(true);
        const res = await fetch('/api/inventory/stock');
        const d = await res.json();
        setStockData(d);
        setLoading(false);
    };

    const fetchReceipts = async () => {
        setLoading(true);
        const res = await fetch('/api/inventory/receipts');
        const d = await res.json();
        setReceipts(Array.isArray(d) ? d : []);
        setLoading(false);
    };

    const fetchIssues = async () => {
        setLoading(true);
        const res = await fetch('/api/inventory/issues');
        const d = await res.json();
        setIssues(Array.isArray(d) ? d : []);
        setLoading(false);
    };

    const printReceipt = (r) => {
        const win = window.open('', '_blank');
        win.document.write(`
            <html><head><title>Phiếu nhập kho ${r.code}</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 13px; padding: 24px; color: #000; }
                h2 { text-align: center; margin: 0 0 4px; }
                .sub { text-align: center; color: #555; margin-bottom: 16px; }
                table { width: 100%; border-collapse: collapse; margin: 12px 0; }
                th, td { border: 1px solid #999; padding: 6px 10px; text-align: left; }
                th { background: #f5f5f5; font-weight: 600; }
                .sign { display: flex; justify-content: space-between; margin-top: 40px; }
                .sign div { text-align: center; width: 200px; }
                @media print { button { display: none; } }
            </style></head><body>
            <h2>PHIẾU NHẬP KHO</h2>
            <div class="sub">Mã: ${r.code} | Ngày: ${new Date(r.receivedDate).toLocaleDateString('vi-VN')} | Kho: ${r.warehouse?.name || ''}</div>
            <p><strong>PO:</strong> ${r.purchaseOrder?.code} &nbsp;&nbsp; <strong>NCC:</strong> ${r.purchaseOrder?.supplier || ''}</p>
            <p><strong>Người nhận:</strong> ${r.receivedBy || '—'} &nbsp;&nbsp; <strong>Ghi chú:</strong> ${r.notes || '—'}</p>
            <table>
                <thead><tr><th>#</th><th>Tên sản phẩm</th><th>ĐVT</th><th>SL đặt</th><th>SL nhận</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
                <tbody>
                    ${(r.items || []).map((it, i) => `
                        <tr>
                            <td>${i + 1}</td><td>${it.productName}</td><td>${it.unit}</td>
                            <td style="text-align:right">${it.qtyOrdered}</td>
                            <td style="text-align:right">${it.qtyReceived}</td>
                            <td style="text-align:right">${new Intl.NumberFormat('vi-VN').format(it.unitPrice)}</td>
                            <td style="text-align:right">${new Intl.NumberFormat('vi-VN').format(it.qtyReceived * it.unitPrice)}</td>
                        </tr>`).join('')}
                </tbody>
            </table>
            <div class="sign">
                <div><p>Người lập phiếu</p><br><br><small>(Ký, ghi rõ họ tên)</small></div>
                <div><p>Thủ kho</p><br><br><small>(Ký, ghi rõ họ tên)</small></div>
                <div><p>Kế toán</p><br><br><small>(Ký, ghi rõ họ tên)</small></div>
            </div>
            <button onclick="window.print()">In phiếu</button>
            </body></html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 400);
    };

    const printIssue = (si) => {
        const win = window.open('', '_blank');
        win.document.write(`
            <html><head><title>Phiếu xuất kho ${si.code}</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 13px; padding: 24px; color: #000; }
                h2 { text-align: center; margin: 0 0 4px; }
                .sub { text-align: center; color: #555; margin-bottom: 16px; }
                table { width: 100%; border-collapse: collapse; margin: 12px 0; }
                th, td { border: 1px solid #999; padding: 6px 10px; text-align: left; }
                th { background: #f5f5f5; font-weight: 600; }
                .sign { display: flex; justify-content: space-between; margin-top: 40px; }
                .sign div { text-align: center; width: 200px; }
                @media print { button { display: none; } }
            </style></head><body>
            <h2>PHIẾU XUẤT KHO</h2>
            <div class="sub">Mã: ${si.code} | Ngày: ${new Date(si.issuedDate).toLocaleDateString('vi-VN')} | Kho: ${si.warehouse?.name || ''}</div>
            <p><strong>Dự án:</strong> ${si.project ? `${si.project.code} — ${si.project.name}` : '—'} &nbsp;&nbsp; <strong>Người lập:</strong> ${si.issuedBy || '—'}</p>
            <p><strong>Ghi chú:</strong> ${si.notes || '—'}</p>
            <table>
                <thead><tr><th>#</th><th>Tên vật tư</th><th>ĐVT</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
                <tbody>
                    ${(si.items || []).map((it, i) => `
                        <tr>
                            <td>${i + 1}</td><td>${it.productName}</td><td>${it.unit}</td>
                            <td style="text-align:right">${it.qty}</td>
                            <td style="text-align:right">${new Intl.NumberFormat('vi-VN').format(it.unitPrice)}</td>
                            <td style="text-align:right">${new Intl.NumberFormat('vi-VN').format(it.qty * it.unitPrice)}</td>
                        </tr>`).join('')}
                </tbody>
            </table>
            <div class="sign">
                <div><p>Người lập phiếu</p><br><br><small>(Ký, ghi rõ họ tên)</small></div>
                <div><p>Người nhận</p><br><br><small>(Ký, ghi rõ họ tên)</small></div>
                <div><p>Thủ kho</p><br><br><small>(Ký, ghi rõ họ tên)</small></div>
            </div>
            <button onclick="window.print()">In phiếu</button>
            </body></html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 400);
    };

    useEffect(() => {
        if (activeTab === 'stock') fetchStock();
        else if (activeTab === 'history') fetchTx();
        else if (activeTab === 'receipts') fetchReceipts();
        else if (activeTab === 'issues') fetchIssues();
    }, [activeTab, filterType, filterWarehouse]);

    useEffect(() => {
        fetch('/api/inventory/stock').then(r => r.json()).then(d => setStockData(d));
        fetch('/api/inventory?limit=1').then(r => r.json()).then(d => setTxData(t => ({ ...t, warehouses: d.warehouses || [] })));
        fetch('/api/projects?limit=500').then(r => r.json()).then(d => setProjects(d.data || []));
        fetch('/api/inventory/reorder-alerts').then(r => r.json()).then(d => setReorderAlerts(Array.isArray(d) ? d : []));
    }, []);

    const openModal = () => {
        setForm({ ...EMPTY_FORM, warehouseId: txData.warehouses[0]?.id || '' });
        setFormItems([{ ...EMPTY_ITEM }]);
        setShowModal(true);
    };

    const handleSubmit = async () => {
        const validItems = formItems.filter(it => it.productId && Number(it.quantity) > 0);
        if (!validItems.length) return alert('Thêm ít nhất 1 sản phẩm với số lượng > 0');
        if (!form.warehouseId) return alert('Chọn kho');
        setSaving(true);
        const res = await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: form.type,
                warehouseId: form.warehouseId,
                projectId: form.projectId || null,
                note: form.note,
                date: form.date,
                items: validItems.map(it => ({ productId: it.productId, quantity: Number(it.quantity), unit: it.unit })),
            }),
        });
        if (!res.ok) {
            const err = await res.json();
            setSaving(false);
            return alert(err.error || 'Lỗi khi tạo giao dịch kho');
        }
        setSaving(false);
        setShowModal(false);
        fetchStock();
        if (activeTab === 'history') fetchTx();
    };

    const openEditReceipt = (r) => {
        setEditReceiptItems((r.items || []).map(it => ({
            productId: it.productId || '',
            productName: it.productName,
            unit: it.unit,
            qtyOrdered: it.qtyOrdered,
            qtyReceived: it.qtyReceived,
            unitPrice: it.unitPrice,
            purchaseOrderItemId: it.purchaseOrderItemId || null,
        })));
        setEditReceiptMeta({
            receivedBy: r.receivedBy || '',
            notes: r.notes || '',
            receivedDate: r.receivedDate ? r.receivedDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
        });
        setEditReceipt(r);
    };

    const saveEditReceipt = async () => {
        const items = editReceiptItems.filter(it => it.productId && Number(it.qtyReceived) > 0);
        if (!items.length) return alert('Cần ít nhất 1 sản phẩm');
        setEditReceiptSaving(true);
        try {
            const res = await fetch(`/api/inventory/receipts/${editReceipt.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items, ...editReceiptMeta }),
            });
            if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Lỗi lưu'); }
            setEditReceipt(null);
            fetchReceipts(); fetchStock();
        } catch (e) { alert(e.message); }
        setEditReceiptSaving(false);
    };

    const openEditIssue = (si) => {
        setEditIssueItems((si.items || []).map(it => ({
            productId: it.productId || '',
            productName: it.productName,
            unit: it.unit,
            qty: it.qty,
            unitPrice: it.unitPrice,
        })));
        setEditIssueMeta({
            warehouseId: si.warehouseId || '',
            projectId: si.projectId || '',
            issuedBy: si.issuedBy || '',
            notes: si.notes || '',
            issuedDate: si.issuedDate ? si.issuedDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
        });
        setEditIssue(si);
    };

    const saveEditIssue = async () => {
        const items = editIssueItems.filter(it => it.productId && Number(it.qty) > 0);
        if (!items.length) return alert('Cần ít nhất 1 sản phẩm');
        setEditIssueSaving(true);
        try {
            const res = await fetch(`/api/inventory/issues/${editIssue.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items, ...editIssueMeta }),
            });
            if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Lỗi lưu'); }
            setEditIssue(null);
            fetchIssues(); fetchStock();
        } catch (e) { alert(e.message); }
        setEditIssueSaving(false);
    };

    const stockFiltered = stockData.products.filter(p =>
        !stockSearch || p.name.toLowerCase().includes(stockSearch.toLowerCase()) || p.code.toLowerCase().includes(stockSearch.toLowerCase())
    );

    const totalStockValue = stockData.products.reduce((s, p) => s + (p.stock || 0) * (p.importPrice || 0), 0);
    return (
        <div>
            {/* Reorder Alert Banner */}
            {reorderAlerts.length > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--status-danger)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ fontSize: 20 }}>⚠️</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: 'var(--status-danger)', marginBottom: 4 }}>
                            {reorderAlerts.length} vật tư dưới ngưỡng tồn kho tối thiểu
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                            {reorderAlerts.slice(0, 8).map(p => (
                                <span key={p.id} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    <strong>{p.name}</strong>: {p.stock} {p.unit} / min {p.reorderPoint}
                                </span>
                            ))}
                            {reorderAlerts.length > 8 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>+{reorderAlerts.length - 8} khác</span>}
                        </div>
                    </div>
                </div>
            )}
            {/* KPI */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 24 }}>
                <div className="stat-card">
                    <div className="stat-icon">📦</div>
                    <div>
                        <div className="stat-value">{stockData.products.length}</div>
                        <div className="stat-label">Mã hàng (SKU)</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🏭</div>
                    <div>
                        <div className="stat-value">{txData.warehouses.length}</div>
                        <div className="stat-label">Kho</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ color: stockData.lowStock > 0 ? 'var(--status-danger)' : undefined }}>⚠️</div>
                    <div>
                        <div className="stat-value" style={{ color: stockData.lowStock > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                            {stockData.lowStock}
                        </div>
                        <div className="stat-label">Sắp hết hàng</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">💰</div>
                    <div>
                        <div className="stat-value" style={{ fontSize: 15, color: 'var(--accent-primary)' }}>{fmt(totalStockValue)}</div>
                        <div className="stat-label">Giá trị tồn kho</div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <div className="tab-bar">
                        <button className={`tab-item ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => setActiveTab('stock')}>
                            📊 Tồn kho hiện tại
                        </button>
                        <button className={`tab-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                            📋 Lịch sử nhập/xuất
                        </button>
                        <button className={`tab-item ${activeTab === 'receipts' ? 'active' : ''}`} onClick={() => setActiveTab('receipts')}>
                            📥 Phiếu nhập (GRN)
                        </button>
                        <button className={`tab-item ${activeTab === 'issues' ? 'active' : ''}`} onClick={() => setActiveTab('issues')}>
                            📤 Phiếu xuất
                        </button>
                    </div>
                    <button className="btn btn-primary" onClick={openModal}>+ Nhập/Xuất kho</button>
                </div>

                {/* TAB: Tồn kho */}
                {activeTab === 'stock' && (
                    <>
                        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                            <input
                                type="text" className="form-input" placeholder="Tìm sản phẩm..."
                                value={stockSearch} onChange={e => setStockSearch(e.target.value)}
                                style={{ maxWidth: 280 }}
                            />
                        </div>
                        {loading ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                        ) : (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Mã</th><th>Tên sản phẩm</th><th>Danh mục</th>
                                            <th style={{ textAlign: 'right' }}>Tồn kho</th>
                                            <th style={{ textAlign: 'right' }}>Tồn tối thiểu</th>
                                            <th style={{ textAlign: 'right' }}>Đơn giá nhập</th>
                                            <th style={{ textAlign: 'right' }}>Giá trị tồn</th>
                                            <th>TT</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stockFiltered.map(p => {
                                            const isLow = p.minStock > 0 && p.stock <= p.minStock;
                                            const isOut = p.stock <= 0;
                                            return (
                                                <tr key={p.id} style={{ background: isOut ? 'rgba(239,68,68,0.04)' : isLow ? 'rgba(245,158,11,0.04)' : undefined }}>
                                                    <td className="accent">{p.code}</td>
                                                    <td className="primary">{p.name}</td>
                                                    <td><span className="badge badge-info" style={{ fontSize: 11 }}>{p.category}</span></td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: isOut ? 'var(--status-danger)' : isLow ? 'var(--status-warning)' : undefined }}>
                                                        {p.stock} {p.unit}
                                                    </td>
                                                    <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 13 }}>
                                                        {p.minStock > 0 ? `${p.minStock} ${p.unit}` : '—'}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontSize: 13 }}>{fmt(p.importPrice)}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt((p.stock || 0) * (p.importPrice || 0))}</td>
                                                    <td>
                                                        {isOut && <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--status-danger)', fontSize: 10 }}>Hết hàng</span>}
                                                        {isLow && !isOut && <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--status-warning)', fontSize: 10 }}>Sắp hết</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    {stockFiltered.length > 0 && (
                                        <tfoot>
                                            <tr>
                                                <td colSpan={6} style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                                                    {stockFiltered.length} mã hàng
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, padding: '8px 16px' }}>
                                                    {fmt(stockFiltered.reduce((s, p) => s + (p.stock || 0) * (p.importPrice || 0), 0))}
                                                </td>
                                                <td />
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        )}
                    </>
                )}

                {/* TAB: Lịch sử */}
                {activeTab === 'history' && (
                    <>
                        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10 }}>
                            <select className="form-select" style={{ width: 140 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                                <option value="">Tất cả</option>
                                <option value="Nhập">Nhập kho</option>
                                <option value="Xuất">Xuất kho</option>
                            </select>
                            <select className="form-select" style={{ width: 180 }} value={filterWarehouse} onChange={e => setFilterWarehouse(e.target.value)}>
                                <option value="">Tất cả kho</option>
                                {txData.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        {loading ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                        ) : (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr><th>Mã PK</th><th>Loại</th><th>Sản phẩm</th><th>SL</th><th>Kho</th><th>Dự án</th><th>Ghi chú</th><th>Ngày</th></tr>
                                    </thead>
                                    <tbody>
                                        {txData.transactions.map(t => (
                                            <tr key={t.id}>
                                                <td className="accent">{t.code}</td>
                                                <td><span className={`badge ${t.type === 'Nhập' ? 'badge-success' : 'badge-warning'}`}>{t.type}</span></td>
                                                <td className="primary">{t.product?.name}</td>
                                                <td style={{ fontWeight: 600, color: t.type === 'Nhập' ? 'var(--status-success)' : 'var(--status-warning)' }}>
                                                    {t.type === 'Nhập' ? '+' : '-'}{t.quantity} {t.unit}
                                                </td>
                                                <td style={{ fontSize: 13 }}>{t.warehouse?.name}</td>
                                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.project?.name || '—'}</td>
                                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.note}</td>
                                                <td style={{ fontSize: 12 }}>{fmtDate(t.date)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {!loading && txData.transactions.length === 0 && (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có giao dịch kho</div>
                        )}
                    </>
                )}

                {/* TAB: Phiếu nhập GRN */}
                {activeTab === 'receipts' && (
                    loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Mã GRN</th><th>Ngày nhận</th><th>PO</th><th>NCC</th>
                                        <th>Kho</th><th style={{ textAlign: 'right' }}>Số SP</th>
                                        <th>Người nhận</th><th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {receipts.map(r => (
                                        <tr key={r.id}>
                                            <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{r.code}</td>
                                            <td style={{ fontSize: 13 }}>{new Date(r.receivedDate).toLocaleDateString('vi-VN')}</td>
                                            <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{r.purchaseOrder?.code}</td>
                                            <td style={{ fontSize: 12 }}>{r.purchaseOrder?.supplier}</td>
                                            <td style={{ fontSize: 12 }}>{r.warehouse?.name}</td>
                                            <td style={{ textAlign: 'right', fontSize: 13 }}>{r.items?.length}</td>
                                            <td style={{ fontSize: 12 }}>{r.receivedBy || '—'}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => setViewReceipt(r)}>Xem</button>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => printReceipt(r)}>🖨️ In</button>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => openEditReceipt(r)}>✏️</button>
                                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)' }} onClick={async () => {
                                                        if (!confirm(`Xóa phiếu nhập kho ${r.code}? Tồn kho sẽ được hoàn lại.`)) return;
                                                        const res = await fetch(`/api/inventory/receipts/${r.id}`, { method: 'DELETE' });
                                                        if (!res.ok) { const e = await res.json(); return alert(e.error || 'Lỗi xóa'); }
                                                        fetchReceipts(); fetchStock();
                                                    }}>🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {receipts.length === 0 && (
                                        <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>Chưa có phiếu nhập kho nào</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )
                )}

                {/* TAB: Phiếu xuất */}
                {activeTab === 'issues' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 8px', flexWrap: 'wrap', gap: 8 }}>
                            <button className="btn btn-primary" onClick={() => {
                                setIssueItems([{ productId: '', productName: '', unit: '', qty: '', unitPrice: 0, stock: 0 }]);
                                setIssueWarehouseId(txData.warehouses[0]?.id || '');
                                setIssueProjectId('');
                                setIssueIssuedBy('');
                                setIssueNotes('');
                                setShowIssueForm(true);
                            }}>+ Tạo phiếu xuất</button>
                        </div>
                        {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Mã PXK</th><th>Ngày xuất</th><th>Kho</th><th>Dự án</th>
                                            <th style={{ textAlign: 'right' }}>Số SP</th>
                                            <th>Người lập</th><th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {issues.map(si => (
                                            <tr key={si.id}>
                                                <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{si.code}</td>
                                                <td style={{ fontSize: 13 }}>{new Date(si.issuedDate).toLocaleDateString('vi-VN')}</td>
                                                <td style={{ fontSize: 12 }}>{si.warehouse?.name}</td>
                                                <td style={{ fontSize: 12 }}>{si.project ? `${si.project.code} — ${si.project.name}` : '—'}</td>
                                                <td style={{ textAlign: 'right', fontSize: 13 }}>{si.items?.length}</td>
                                                <td style={{ fontSize: 12 }}>{si.issuedBy || '—'}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => setViewIssue(si)}>Xem</button>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => printIssue(si)}>🖨️ In</button>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => openEditIssue(si)}>✏️</button>
                                                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)' }} onClick={async () => {
                                                            if (!confirm(`Xóa phiếu xuất kho ${si.code}? Tồn kho sẽ được hoàn lại.`)) return;
                                                            const res = await fetch(`/api/inventory/issues/${si.id}`, { method: 'DELETE' });
                                                            if (!res.ok) { const e = await res.json(); return alert(e.error || 'Lỗi xóa'); }
                                                            fetchIssues(); fetchStock();
                                                        }}>🗑️</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {issues.length === 0 && (
                                            <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>Chưa có phiếu xuất kho nào</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal nhập/xuất kho */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <div className="modal-header">
                            <h3>Phiếu nhập/xuất kho</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Loại *</label>
                                    <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                        <option value="Nhập">Nhập kho</option>
                                        <option value="Xuất">Xuất kho</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ngày</label>
                                    <input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Kho *</label>
                                    <select className="form-select" value={form.warehouseId} onChange={e => setForm({ ...form, warehouseId: e.target.value })}>
                                        <option value="">— Chọn kho —</option>
                                        {txData.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Dự án (tuỳ chọn)</label>
                                    <select className="form-select" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
                                        <option value="">— Không gắn DA —</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: 12 }}>
                                <label className="form-label">Ghi chú</label>
                                <input className="form-input" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
                            </div>
                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Danh sách sản phẩm:</div>
                            {formItems.map((item, i) => (
                                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 100px 28px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                                    <select className="form-select" value={item.productId} onChange={e => {
                                        const p = stockData.products.find(p => p.id === e.target.value);
                                        setFormItems(prev => prev.map((it, idx) => idx === i ? { ...it, productId: e.target.value, unit: p?.unit || '' } : it));
                                    }}>
                                        <option value="">— Chọn sản phẩm —</option>
                                        {stockData.products.map(p => <option key={p.id} value={p.id}>{p.name} (tồn: {p.stock} {p.unit})</option>)}
                                    </select>
                                    <input className="form-input" type="number" min="0.001" step="0.001" placeholder="Số lượng" value={item.quantity}
                                        onChange={e => setFormItems(prev => prev.map((it, idx) => idx === i ? { ...it, quantity: e.target.value } : it))}
                                        style={{ textAlign: 'center' }} />
                                    <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-danger)', fontSize: 18, lineHeight: 1 }}
                                        onClick={() => setFormItems(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                                </div>
                            ))}
                            <button className="btn btn-ghost btn-sm" onClick={() => setFormItems(prev => [...prev, { ...EMPTY_ITEM }])}>+ Thêm sản phẩm</button>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                                {saving ? 'Đang lưu...' : `Tạo phiếu ${form.type}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal tạo phiếu xuất */}
            {showIssueForm && (
                <div className="modal-overlay" onClick={() => setShowIssueForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, width: '95%' }}>
                        <div className="modal-header">
                            <h3>+ Tạo phiếu xuất kho</h3>
                            <button className="modal-close" onClick={() => setShowIssueForm(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Kho *</label>
                                    <select className="form-select" value={issueWarehouseId} onChange={e => setIssueWarehouseId(e.target.value)}>
                                        <option value="">— Chọn kho —</option>
                                        {txData.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Dự án</label>
                                    <select className="form-select" value={issueProjectId} onChange={e => setIssueProjectId(e.target.value)}>
                                        <option value="">— Không gắn dự án —</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Người lập</label>
                                    <input className="form-input" value={issueIssuedBy} onChange={e => setIssueIssuedBy(e.target.value)} placeholder="Tên người lập phiếu" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ghi chú</label>
                                    <input className="form-input" value={issueNotes} onChange={e => setIssueNotes(e.target.value)} />
                                </div>
                            </div>
                            <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Danh sách vật tư xuất:</div>
                            {issueItems.map((item, i) => (
                                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 100px 28px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                                    <select className="form-select" value={item.productId} onChange={e => {
                                        const p = stockData.products.find(p => p.id === e.target.value);
                                        setIssueItems(prev => prev.map((it, idx) => idx === i ? {
                                            ...it, productId: e.target.value,
                                            productName: p?.name || '',
                                            unit: p?.unit || '',
                                            unitPrice: p?.importPrice || 0,
                                            stock: p?.stock || 0,
                                        } : it));
                                    }}>
                                        <option value="">— Chọn sản phẩm —</option>
                                        {stockData.products.map(p => <option key={p.id} value={p.id}>{p.name} (tồn: {p.stock} {p.unit})</option>)}
                                    </select>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>{item.unit}</div>
                                    <input className="form-input" type="number" min="0.001" step="0.001" placeholder="SL" value={item.qty}
                                        onChange={e => setIssueItems(prev => prev.map((it, idx) => idx === i ? { ...it, qty: e.target.value } : it))} />
                                    <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-danger)', fontSize: 16 }}
                                        onClick={() => setIssueItems(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                                </div>
                            ))}
                            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 8 }}
                                onClick={() => setIssueItems(prev => [...prev, { productId: '', productName: '', unit: '', qty: '', unitPrice: 0, stock: 0 }])}>
                                + Thêm dòng
                            </button>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowIssueForm(false)}>Hủy</button>
                            <button className="btn btn-primary" disabled={issueSaving} onClick={async () => {
                                const items = issueItems.filter(it => it.productId && Number(it.qty) > 0);
                                if (!items.length) return alert('Thêm ít nhất 1 sản phẩm với số lượng > 0');
                                if (!issueWarehouseId) return alert('Chọn kho');
                                setIssueSaving(true);
                                const res = await fetch('/api/inventory/issues', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        warehouseId: issueWarehouseId,
                                        projectId: issueProjectId || null,
                                        issuedBy: issueIssuedBy,
                                        notes: issueNotes,
                                        items: items.map(it => ({
                                            productId: it.productId,
                                            productName: it.productName,
                                            unit: it.unit,
                                            qty: Number(it.qty),
                                            unitPrice: it.unitPrice,
                                        })),
                                    }),
                                });
                                setIssueSaving(false);
                                if (!res.ok) { const e = await res.json(); return alert(e.error || 'Lỗi tạo phiếu xuất'); }
                                setShowIssueForm(false);
                                fetchIssues();
                                fetchStock();
                            }}>{issueSaving ? 'Đang lưu...' : 'Tạo phiếu xuất'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal xem chi tiết GRN */}
            {viewReceipt && (
                <div className="modal-overlay" onClick={() => setViewReceipt(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, width: '95%' }}>
                        <div className="modal-header">
                            <h3>Phiếu nhập kho — {viewReceipt.code}</h3>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => printReceipt(viewReceipt)}>🖨️ In</button>
                                <button className="modal-close" onClick={() => setViewReceipt(null)}>×</button>
                            </div>
                        </div>
                        <div className="modal-body">
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                                PO: {viewReceipt.purchaseOrder?.code} | NCC: {viewReceipt.purchaseOrder?.supplier} | Kho: {viewReceipt.warehouse?.name}<br />
                                Ngày: {new Date(viewReceipt.receivedDate).toLocaleDateString('vi-VN')} | Người nhận: {viewReceipt.receivedBy || '—'}
                            </div>
                            <table className="data-table">
                                <thead><tr><th>Sản phẩm</th><th>ĐVT</th><th style={{ textAlign: 'right' }}>SL đặt</th><th style={{ textAlign: 'right' }}>SL nhận</th></tr></thead>
                                <tbody>
                                    {(viewReceipt.items || []).map(it => (
                                        <tr key={it.id}>
                                            <td>{it.productName}</td><td>{it.unit}</td>
                                            <td style={{ textAlign: 'right' }}>{it.qtyOrdered}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{it.qtyReceived}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setViewReceipt(null)}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal xem chi tiết StockIssue */}
            {viewIssue && (
                <div className="modal-overlay" onClick={() => setViewIssue(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, width: '95%' }}>
                        <div className="modal-header">
                            <h3>Phiếu xuất kho — {viewIssue.code}</h3>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => printIssue(viewIssue)}>🖨️ In</button>
                                <button className="modal-close" onClick={() => setViewIssue(null)}>×</button>
                            </div>
                        </div>
                        <div className="modal-body">
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                                Kho: {viewIssue.warehouse?.name} | Dự án: {viewIssue.project ? `${viewIssue.project.code} — ${viewIssue.project.name}` : '—'}<br />
                                Ngày: {new Date(viewIssue.issuedDate).toLocaleDateString('vi-VN')} | Người lập: {viewIssue.issuedBy || '—'}
                            </div>
                            <table className="data-table">
                                <thead><tr><th>Vật tư</th><th>ĐVT</th><th style={{ textAlign: 'right' }}>Số lượng</th></tr></thead>
                                <tbody>
                                    {(viewIssue.items || []).map(it => (
                                        <tr key={it.id}>
                                            <td>{it.productName}</td><td>{it.unit}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{it.qty}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setViewIssue(null)}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal sửa phiếu nhập kho */}
            {editReceipt && (
                <div className="modal-overlay" onClick={() => setEditReceipt(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, width: '95%' }}>
                        <div className="modal-header">
                            <h3>✏️ Sửa phiếu nhập kho — {editReceipt.code}</h3>
                            <button className="modal-close" onClick={() => setEditReceipt(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ngày nhận</label>
                                    <input className="form-input" type="date" value={editReceiptMeta.receivedDate}
                                        onChange={e => setEditReceiptMeta(m => ({ ...m, receivedDate: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Người nhận</label>
                                    <input className="form-input" value={editReceiptMeta.receivedBy}
                                        onChange={e => setEditReceiptMeta(m => ({ ...m, receivedBy: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ghi chú</label>
                                    <input className="form-input" value={editReceiptMeta.notes}
                                        onChange={e => setEditReceiptMeta(m => ({ ...m, notes: e.target.value }))} />
                                </div>
                            </div>
                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Danh sách hàng nhận:</div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 8 }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-secondary)' }}>
                                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>Sản phẩm</th>
                                        <th style={{ padding: '6px 8px', width: 55 }}>ĐVT</th>
                                        <th style={{ padding: '6px 8px', width: 80, textAlign: 'right' }}>SL nhận</th>
                                        <th style={{ padding: '6px 8px', width: 110, textAlign: 'right' }}>Đơn giá</th>
                                        <th style={{ width: 28 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {editReceiptItems.map((it, i) => (
                                        <tr key={i}>
                                            <td style={{ padding: '3px 4px' }}>
                                                <select className="form-select" style={{ fontSize: 12 }} value={it.productId}
                                                    onChange={e => {
                                                        const p = stockData.products.find(p => p.id === e.target.value);
                                                        setEditReceiptItems(prev => prev.map((x, j) => j === i ? { ...x, productId: e.target.value, productName: p?.name || x.productName, unit: p?.unit || x.unit } : x));
                                                    }}>
                                                    <option value="">— Chọn —</option>
                                                    {stockData.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </td>
                                            <td style={{ padding: '3px 4px' }}><input className="form-input" style={{ fontSize: 12 }} value={it.unit} onChange={e => setEditReceiptItems(prev => prev.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} /></td>
                                            <td style={{ padding: '3px 4px' }}><input className="form-input" type="number" style={{ fontSize: 12, textAlign: 'right' }} value={it.qtyReceived} onChange={e => setEditReceiptItems(prev => prev.map((x, j) => j === i ? { ...x, qtyReceived: e.target.value } : x))} /></td>
                                            <td style={{ padding: '3px 4px' }}><input className="form-input" type="number" style={{ fontSize: 12, textAlign: 'right' }} value={it.unitPrice} onChange={e => setEditReceiptItems(prev => prev.map((x, j) => j === i ? { ...x, unitPrice: e.target.value } : x))} /></td>
                                            <td style={{ padding: '3px 4px' }}><button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-danger)', fontSize: 16 }} onClick={() => setEditReceiptItems(prev => prev.filter((_, j) => j !== i))}>×</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditReceiptItems(prev => [...prev, { productId: '', productName: '', unit: '', qtyOrdered: 0, qtyReceived: '', unitPrice: 0 }])}>+ Thêm dòng</button>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setEditReceipt(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveEditReceipt} disabled={editReceiptSaving}>
                                {editReceiptSaving ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal sửa phiếu xuất kho */}
            {editIssue && (
                <div className="modal-overlay" onClick={() => setEditIssue(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, width: '95%' }}>
                        <div className="modal-header">
                            <h3>✏️ Sửa phiếu xuất kho — {editIssue.code}</h3>
                            <button className="modal-close" onClick={() => setEditIssue(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Kho</label>
                                    <select className="form-select" value={editIssueMeta.warehouseId}
                                        onChange={e => setEditIssueMeta(m => ({ ...m, warehouseId: e.target.value }))}>
                                        {txData.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Dự án</label>
                                    <select className="form-select" value={editIssueMeta.projectId}
                                        onChange={e => setEditIssueMeta(m => ({ ...m, projectId: e.target.value }))}>
                                        <option value="">— Không gắn —</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ngày xuất</label>
                                    <input className="form-input" type="date" value={editIssueMeta.issuedDate}
                                        onChange={e => setEditIssueMeta(m => ({ ...m, issuedDate: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Người lập</label>
                                    <input className="form-input" value={editIssueMeta.issuedBy}
                                        onChange={e => setEditIssueMeta(m => ({ ...m, issuedBy: e.target.value }))} />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ghi chú</label>
                                    <input className="form-input" value={editIssueMeta.notes}
                                        onChange={e => setEditIssueMeta(m => ({ ...m, notes: e.target.value }))} />
                                </div>
                            </div>
                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Danh sách vật tư xuất:</div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 8 }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-secondary)' }}>
                                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>Vật tư (tồn kho)</th>
                                        <th style={{ padding: '6px 8px', width: 55 }}>ĐVT</th>
                                        <th style={{ padding: '6px 8px', width: 80, textAlign: 'right' }}>SL</th>
                                        <th style={{ padding: '6px 8px', width: 110, textAlign: 'right' }}>Đơn giá</th>
                                        <th style={{ width: 28 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {editIssueItems.map((it, i) => (
                                        <tr key={i}>
                                            <td style={{ padding: '3px 4px' }}>
                                                <select className="form-select" style={{ fontSize: 12 }} value={it.productId}
                                                    onChange={e => {
                                                        const p = stockData.products.find(p => p.id === e.target.value);
                                                        setEditIssueItems(prev => prev.map((x, j) => j === i ? { ...x, productId: e.target.value, productName: p?.name || '', unit: p?.unit || x.unit, unitPrice: p?.importPrice || x.unitPrice } : x));
                                                    }}>
                                                    <option value="">— Chọn —</option>
                                                    {stockData.products.map(p => <option key={p.id} value={p.id}>{p.name} (tồn: {p.stock} {p.unit})</option>)}
                                                </select>
                                            </td>
                                            <td style={{ padding: '3px 4px' }}><input className="form-input" style={{ fontSize: 12 }} value={it.unit} onChange={e => setEditIssueItems(prev => prev.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} /></td>
                                            <td style={{ padding: '3px 4px' }}><input className="form-input" type="number" style={{ fontSize: 12, textAlign: 'right' }} value={it.qty} onChange={e => setEditIssueItems(prev => prev.map((x, j) => j === i ? { ...x, qty: e.target.value } : x))} /></td>
                                            <td style={{ padding: '3px 4px' }}><input className="form-input" type="number" style={{ fontSize: 12, textAlign: 'right' }} value={it.unitPrice} onChange={e => setEditIssueItems(prev => prev.map((x, j) => j === i ? { ...x, unitPrice: e.target.value } : x))} /></td>
                                            <td style={{ padding: '3px 4px' }}><button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-danger)', fontSize: 16 }} onClick={() => setEditIssueItems(prev => prev.filter((_, j) => j !== i))}>×</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditIssueItems(prev => [...prev, { productId: '', productName: '', unit: '', qty: '', unitPrice: 0 }])}>+ Thêm dòng</button>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setEditIssue(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveEditIssue} disabled={editIssueSaving}>
                                {editIssueSaving ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
