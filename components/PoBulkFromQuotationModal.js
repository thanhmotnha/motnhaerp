'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/fetchClient';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

export default function PoBulkFromQuotationModal({ open, onClose, prefillProjectId, onSuccess }) {
    const [step, setStep] = useState(1);
    const [projects, setProjects] = useState([]);
    const [quotations, setQuotations] = useState([]);
    const [suppliers, setSuppliers] = useState([]);

    const [projectId, setProjectId] = useState(prefillProjectId || '');
    const [quotationId, setQuotationId] = useState('');
    const [poItems, setPoItems] = useState([]);
    const [selectAll, setSelectAll] = useState(true);
    const [extraItems, setExtraItems] = useState([{ id: 'ex-0', name: '', unit: '', quantity: 1, unitPrice: 0 }]);

    // Step 2
    const [supplierMap, setSupplierMap] = useState({});
    const [deliveryDate, setDeliveryDate] = useState('');
    const [saving, setSaving] = useState(false);
    const [createdPOs, setCreatedPOs] = useState(null);

    useEffect(() => {
        if (!open) return;
        setStep(1);
        setQuotationId('');
        setPoItems([]);
        setSelectAll(true);
        setExtraItems([{ id: 'ex-0', name: '', unit: '', quantity: 1, unitPrice: 0 }]);
        setSupplierMap({});
        setDeliveryDate('');
        setSaving(false);
        setCreatedPOs(null);
        setProjectId(prefillProjectId || '');

        apiFetch('/api/projects?limit=200').then(r => setProjects(r.data || []));
        apiFetch('/api/suppliers?limit=1000').then(r => setSuppliers(r.data || []));
    }, [open, prefillProjectId]);

    useEffect(() => {
        if (!projectId) {
            setQuotations([]);
            setQuotationId('');
            return;
        }
        apiFetch(`/api/quotations?limit=200&projectId=${projectId}`).then(r => {
            setQuotations((r.data || []).filter(q => !q.deletedAt));
        });
        setQuotationId('');
    }, [projectId]);

    const loadQuotationItems = async (qId) => {
        if (!qId) { setPoItems([]); return; }
        const res = await apiFetch(`/api/quotations/${qId}/po-items`);
        const items = (res.items || []).map(it => ({ ...it, selected: true }));
        setPoItems(items);
        setSelectAll(true);
    };

    const toggleSelectAll = (checked) => {
        setSelectAll(checked);
        setPoItems(prev => prev.map(it => ({ ...it, selected: checked })));
    };

    const toggleItem = (id, checked) => {
        setPoItems(prev => prev.map(it => it.id === id ? { ...it, selected: checked } : it));
    };

    const updateQty = (id, qty) => {
        setPoItems(prev => prev.map(it => it.id === id ? { ...it, quantity: Number(qty) || 0 } : it));
    };

    const selectedItems = poItems.filter(it => it.selected);
    const validExtraItems = extraItems.filter(it => it.name.trim() && it.quantity > 0);
    const allItems = [...selectedItems, ...validExtraItems];

    const setSupplierForItem = (itemId, supplierId) => {
        const sup = suppliers.find(s => s.id === supplierId);
        setSupplierMap(prev => ({
            ...prev,
            [itemId]: { supplierId, supplierName: sup?.name || '' },
        }));
    };

    const groups = () => {
        const map = {};
        for (const it of allItems) {
            const sup = supplierMap[it.id];
            if (!sup?.supplierId) continue;
            if (!map[sup.supplierId]) map[sup.supplierId] = { ...sup, items: [] };
            map[sup.supplierId].items.push(it);
        }
        return Object.values(map);
    };

    const unassigned = allItems.filter(it => !supplierMap[it.id]?.supplierId);

    const handleCreate = async () => {
        if (allItems.length === 0) return alert('Chưa có sản phẩm nào');
        if (unassigned.length > 0) return alert(`${unassigned.length} sản phẩm chưa được gán NCC`);
        const g = groups();
        if (g.length === 0) return alert('Chưa có sản phẩm nào được gán NCC');
        setSaving(true);
        const res = await fetch('/api/purchase-orders/bulk-from-quotation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quotationId: quotationId || null,
                projectId: projectId || null,
                deliveryDate: deliveryDate || null,
                groups: g.map(grp => ({
                    supplierId: grp.supplierId,
                    supplierName: grp.supplierName,
                    items: grp.items.map(it => ({
                        productId: it.productId || null,
                        productName: it.name,
                        unit: it.unit,
                        quantity: it.quantity,
                        unitPrice: it.unitPrice,
                    })),
                })),
            }),
        });
        setSaving(false);
        if (!res.ok) { const e = await res.json(); return alert(e.error || 'Lỗi tạo PO'); }
        const created = await res.json();
        setCreatedPOs(created);
        onSuccess?.();
    };

    const printPO = (po) => {
        const win = window.open('', '_blank', 'width=800,height=600');
        const items = po.items.map((it, i) => `
            <tr>
                <td style="text-align:center">${i + 1}</td>
                <td>${it.productName}</td>
                <td style="text-align:center">${it.unit}</td>
                <td style="text-align:right">${new Intl.NumberFormat('vi-VN').format(it.quantity)}</td>
                <td style="text-align:right">${new Intl.NumberFormat('vi-VN').format(it.unitPrice)}</td>
                <td style="text-align:right">${new Intl.NumberFormat('vi-VN').format(it.quantity * it.unitPrice)}</td>
            </tr>`).join('');
        win.document.write(`<!DOCTYPE html><html><head>
            <meta charset="utf-8"><title>PO ${po.code}</title>
            <style>
                body{font-family:Arial,sans-serif;padding:20px;font-size:13px}
                h2{text-align:center;text-transform:uppercase}
                .info{margin-bottom:16px}
                table{width:100%;border-collapse:collapse}
                th,td{border:1px solid #ccc;padding:6px 8px;font-size:12px}
                th{background:#f5f5f5;text-align:center}
                .total{text-align:right;font-weight:bold;margin-top:8px}
                .sign{display:flex;justify-content:space-around;margin-top:40px;text-align:center}
                @media print{.no-print{display:none}}
            </style>
        </head><body>
            <h2>Đơn đặt hàng</h2>
            <div class="info">
                <b>Mã PO:</b> ${po.code} &nbsp;|&nbsp;
                <b>NCC:</b> ${po.supplier} &nbsp;|&nbsp;
                <b>Ngày:</b> ${new Date().toLocaleDateString('vi-VN')}
                ${po.project ? `&nbsp;|&nbsp;<b>Dự án:</b> ${po.project.code}` : ''}
            </div>
            <table>
                <thead><tr><th>#</th><th>Tên sản phẩm</th><th>ĐVT</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
                <tbody>${items}</tbody>
            </table>
            <div class="total">Tổng cộng: ${new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(po.totalAmount)}</div>
            <div class="sign">
                <div><b>Người lập</b><br/><br/><br/>.................</div>
                <div><b>Kế toán</b><br/><br/><br/>.................</div>
                <div><b>Giám đốc</b><br/><br/><br/>.................</div>
            </div>
            <div class="no-print" style="margin-top:16px;text-align:center">
                <button onclick="window.print()">🖨️ In</button>
            </div>
        </body></html>`);
        win.document.close();
    };

    const printSummary = () => {
        const g = createdPOs ? createdPOs.map(po => ({
            supplier: po.supplier,
            totalAmount: po.totalAmount,
            items: po.items,
        })) : [];

        const quotationCode = quotations.find(q => q.id === quotationId)?.code || '';
        const projectCode = projects.find(p => p.id === projectId)?.code || '';

        const tables = g.map(grp => {
            const rows = grp.items.map((it, i) => `
                <tr>
                    <td style="text-align:center">${i + 1}</td>
                    <td>${it.productName}</td>
                    <td style="text-align:center">${it.unit}</td>
                    <td style="text-align:right">${new Intl.NumberFormat('vi-VN').format(it.quantity)}</td>
                    <td style="text-align:right">${new Intl.NumberFormat('vi-VN').format(it.unitPrice)}</td>
                    <td style="text-align:right">${new Intl.NumberFormat('vi-VN').format(it.quantity * it.unitPrice)}</td>
                </tr>`).join('');
            return `
                <h3 style="margin-top:24px">📦 ${grp.supplier}</h3>
                <table>
                    <thead><tr><th>#</th><th>Tên sản phẩm</th><th>ĐVT</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                <div style="text-align:right;font-weight:bold;margin-top:4px">
                    Tổng: ${new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(grp.totalAmount)}
                </div>`;
        }).join('');

        const grandTotal = g.reduce((s, grp) => s + grp.totalAmount, 0);

        const win = window.open('', '_blank', 'width=900,height=700');
        win.document.write(`<!DOCTYPE html><html><head>
            <meta charset="utf-8"><title>Yêu cầu mua hàng tổng hợp</title>
            <style>
                body{font-family:Arial,sans-serif;padding:20px;font-size:13px}
                h2{text-align:center;text-transform:uppercase}
                .info{margin-bottom:16px}
                table{width:100%;border-collapse:collapse}
                th,td{border:1px solid #ccc;padding:6px 8px;font-size:12px}
                th{background:#f5f5f5;text-align:center}
                .grand{text-align:right;font-size:15px;font-weight:bold;margin-top:12px;border-top:2px solid #333;padding-top:8px}
                .sign{display:flex;justify-content:space-around;margin-top:40px;text-align:center}
                @media print{.no-print{display:none}}
            </style>
        </head><body>
            <h2>Yêu cầu mua hàng</h2>
            <div class="info">
                ${projectCode ? `<b>Dự án:</b> ${projectCode} &nbsp;|&nbsp;` : ''}
                ${quotationCode ? `<b>Báo giá:</b> ${quotationCode} &nbsp;|&nbsp;` : ''}
                <b>Ngày:</b> ${new Date().toLocaleDateString('vi-VN')}
            </div>
            ${tables}
            <div class="grand">Tổng cộng tất cả: ${new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(grandTotal)}</div>
            <div class="sign">
                <div><b>Người lập</b><br/><br/><br/>.................</div>
                <div><b>Kế toán</b><br/><br/><br/>.................</div>
                <div><b>Giám đốc</b><br/><br/><br/>.................</div>
            </div>
            <div class="no-print" style="margin-top:16px;text-align:center">
                <button onclick="window.print()">🖨️ In tổng hợp</button>
            </div>
        </body></html>`);
        win.document.close();
    };

    if (!open) return null;

    if (createdPOs) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3>✅ Đã tạo {createdPOs.length} PO thành công</h3>
                        <button className="modal-close" onClick={onClose}>×</button>
                    </div>
                    <div className="modal-body">
                        <table className="data-table" style={{ marginBottom: 16 }}>
                            <thead><tr><th>Mã PO</th><th>Nhà cung cấp</th><th>Số SP</th><th>Tổng tiền</th><th></th></tr></thead>
                            <tbody>
                                {createdPOs.map(po => (
                                    <tr key={po.id}>
                                        <td className="accent">{po.code}</td>
                                        <td>{po.supplier}</td>
                                        <td style={{ textAlign: 'center' }}>{po.items.length}</td>
                                        <td style={{ textAlign: 'right' }}>{fmt(po.totalAmount)}</td>
                                        <td><button className="btn btn-sm" onClick={() => printPO(po)}>🖨️ In</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="modal-footer">
                        <button className="btn" onClick={printSummary}>🖨️ In tổng hợp</button>
                        <button className="btn btn-primary" onClick={onClose}>Đóng</button>
                    </div>
                </div>
            </div>
        );
    }

    const g = groups();
    const totalGroups = g.length;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: step === 1 ? 760 : 700 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>📋 Tạo PO — Bước {step}/2</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                {step === 1 && (
                    <>
                        <div className="modal-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                <div>
                                    <label className="form-label">Dự án</label>
                                    <select className="form-select" value={projectId}
                                        onChange={e => setProjectId(e.target.value)}
                                        disabled={!!prefillProjectId}>
                                        <option value="">— Chọn dự án —</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Báo giá</label>
                                    <select className="form-select" value={quotationId}
                                        onChange={e => { setQuotationId(e.target.value); loadQuotationItems(e.target.value); }}
                                        disabled={!projectId}>
                                        <option value="">— Chọn báo giá —</option>
                                        {quotations.map(q => <option key={q.id} value={q.id}>{q.code}</option>)}
                                    </select>
                                </div>
                            </div>

                            {poItems.length > 0 && (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: 40 }}>
                                                <input type="checkbox" checked={selectAll}
                                                    onChange={e => toggleSelectAll(e.target.checked)} />
                                            </th>
                                            <th>Tên sản phẩm</th>
                                            <th style={{ width: 80 }}>ĐVT</th>
                                            <th style={{ width: 100 }}>Số lượng</th>
                                            <th style={{ width: 120, textAlign: 'right' }}>Đơn giá</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {poItems.map(it => (
                                            <tr key={it.id}>
                                                <td style={{ textAlign: 'center' }}>
                                                    <input type="checkbox" checked={it.selected}
                                                        onChange={e => toggleItem(it.id, e.target.checked)} />
                                                </td>
                                                <td>{it.name}</td>
                                                <td>{it.unit}</td>
                                                <td>
                                                    <input type="number" className="form-input" min="0" step="0.01"
                                                        value={it.quantity}
                                                        onChange={e => updateQty(it.id, e.target.value)}
                                                        style={{ width: '100%' }} />
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    {fmt(it.unitPrice)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {quotationId && poItems.length === 0 && (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0 0' }}>
                                    Báo giá này không có sản phẩm nào gắn với hệ thống.
                                </p>
                            )}

                            <div style={{ marginTop: 20 }}>
                                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>➕ Sản phẩm bổ sung (không trong báo giá)</div>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Tên sản phẩm</th>
                                            <th style={{ width: 80 }}>ĐVT</th>
                                            <th style={{ width: 90 }}>Số lượng</th>
                                            <th style={{ width: 110 }}>Đơn giá</th>
                                            <th style={{ width: 32 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {extraItems.map((it, idx) => (
                                            <tr key={it.id}>
                                                <td><input className="form-input" placeholder="Tên sản phẩm" value={it.name}
                                                    onChange={e => setExtraItems(prev => prev.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                                                    style={{ width: '100%' }} /></td>
                                                <td><input className="form-input" placeholder="ĐVT" value={it.unit}
                                                    onChange={e => setExtraItems(prev => prev.map((x, i) => i === idx ? { ...x, unit: e.target.value } : x))}
                                                    style={{ width: '100%' }} /></td>
                                                <td><input type="number" className="form-input" min="0" step="0.01" value={it.quantity}
                                                    onChange={e => setExtraItems(prev => prev.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) || 0 } : x))}
                                                    style={{ width: '100%' }} /></td>
                                                <td><input type="number" className="form-input" min="0" step="1000" value={it.unitPrice}
                                                    onChange={e => setExtraItems(prev => prev.map((x, i) => i === idx ? { ...x, unitPrice: Number(e.target.value) || 0 } : x))}
                                                    style={{ width: '100%' }} /></td>
                                                <td><button className="btn btn-sm" style={{ padding: '2px 6px' }}
                                                    onClick={() => setExtraItems(prev => prev.filter((_, i) => i !== idx))}>×</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <button className="btn btn-sm" style={{ marginTop: 6 }}
                                    onClick={() => setExtraItems(prev => [...prev, { id: `ex-${Date.now()}`, name: '', unit: '', quantity: 1, unitPrice: 0 }])}>
                                    + Thêm dòng
                                </button>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={onClose}>Hủy</button>
                            <button className="btn btn-primary"
                                disabled={allItems.length === 0}
                                onClick={() => setStep(2)}>
                                Tiếp theo → ({allItems.length} SP)
                            </button>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        <div className="modal-body">
                            <div style={{ marginBottom: 16 }}>
                                <label className="form-label">Ngày giao hàng chung (tùy chọn)</label>
                                <input type="date" className="form-input" value={deliveryDate}
                                    onChange={e => setDeliveryDate(e.target.value)}
                                    style={{ maxWidth: 200 }} />
                            </div>

                            <table className="data-table" style={{ marginBottom: 20 }}>
                                <thead>
                                    <tr>
                                        <th>Tên sản phẩm</th>
                                        <th style={{ width: 80 }}>SL</th>
                                        <th style={{ width: 220 }}>Nhà cung cấp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allItems.map(it => (
                                        <tr key={it.id}>
                                            <td>
                                                {it.name}
                                                {!it.productId && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>(bổ sung)</span>}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>{it.quantity}</td>
                                            <td>
                                                <select className="form-select"
                                                    value={supplierMap[it.id]?.supplierId || ''}
                                                    onChange={e => setSupplierForItem(it.id, e.target.value)}>
                                                    <option value="">— Chọn NCC —</option>
                                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {totalGroups > 0 && (
                                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 12 }}>
                                    <div style={{ fontWeight: 600, marginBottom: 8 }}>Preview — {totalGroups} PO sẽ được tạo:</div>
                                    {g.map(grp => (
                                        <div key={grp.supplierId} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                                            <span>📦 {grp.supplierName}</span>
                                            <span>{grp.items.length} SP — {fmt(grp.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0))}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {unassigned.length > 0 && (
                                <p style={{ color: 'var(--status-warning)', marginTop: 8, fontSize: 13 }}>
                                    ⚠️ {unassigned.length} sản phẩm chưa được gán NCC
                                </p>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setStep(1)}>← Quay lại</button>
                            <button className="btn btn-primary"
                                disabled={saving || unassigned.length > 0 || totalGroups === 0}
                                onClick={handleCreate}>
                                {saving ? 'Đang tạo...' : `Tạo ${totalGroups} PO ✓`}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
