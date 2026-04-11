# Tạo PO từ Báo giá — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép tạo nhiều PO cùng lúc từ danh sách sản phẩm trong báo giá, chia theo nhà cung cấp, với 2 entry points (/purchasing và /projects/[id]).

**Architecture:** 2-step modal (chọn items → gán NCC + preview), 2 API endpoints mới, thêm `quotationId` vào PurchaseOrder schema. Modal tách thành component riêng dùng chung ở cả 2 trang.

**Tech Stack:** Next.js 16 App Router, Prisma 6, Zod 4, React 19, `withAuth()`, `generateCode()`, `prisma.$transaction`

---

### Task 1: Prisma schema — thêm quotationId vào PurchaseOrder

**Files:**
- Modify: `prisma/schema.prisma` (lines 869-894)

- [ ] **Step 1: Thêm field quotationId vào PurchaseOrder và back-relation vào Quotation**

Trong `prisma/schema.prisma`, model `PurchaseOrder` (dòng 869), thêm sau dòng `supplierId String?`:
```prisma
  quotationId     String?
```

Thêm relation vào cuối block PurchaseOrder (trước `@@index`):
```prisma
  quotation       Quotation?         @relation(fields: [quotationId], references: [id])
```

Trong model `Quotation` (dòng 209), thêm back-relation sau dòng `items QuotationItem[]`:
```prisma
  purchaseOrders  PurchaseOrder[]
```

Thêm index vào PurchaseOrder:
```prisma
  @@index([quotationId])
```

- [ ] **Step 2: Push schema lên DB**

```bash
cd d:/Codeapp/motnha && npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Regenerate Prisma client**

```bash
npm run db:generate
```

Expected: `Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add quotationId to PurchaseOrder"
```

---

### Task 2: API GET /api/quotations/[id]/po-items

**Files:**
- Create: `app/api/quotations/[id]/po-items/route.js`

Endpoint này trả về flat list các QuotationItem có `productId` (bỏ qua item tự do), kèm thông tin lấy quantity từ `quantity` nếu > 0, fallback về `volume`.

- [ ] **Step 1: Tạo file route**

Tạo `app/api/quotations/[id]/po-items/route.js`:

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;

    const quotation = await prisma.quotation.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, code: true, projectId: true },
    });
    if (!quotation) return NextResponse.json({ error: 'Không tìm thấy báo giá' }, { status: 404 });

    const items = await prisma.quotationItem.findMany({
        where: {
            quotationId: id,
            productId: { not: null },
            parentItemId: null, // chỉ lấy item cấp 1
        },
        select: {
            id: true,
            name: true,
            productId: true,
            unit: true,
            quantity: true,
            volume: true,
            unitPrice: true,
            product: { select: { name: true, unit: true } },
        },
        orderBy: { order: 'asc' },
    });

    const result = items.map(item => ({
        id: item.id,
        name: item.name || item.product?.name || '',
        productId: item.productId,
        unit: item.unit || item.product?.unit || '',
        quantity: (item.quantity > 0 ? item.quantity : item.volume) || 1,
        unitPrice: item.unitPrice || 0,
    }));

    return NextResponse.json({ quotation, items: result });
});
```

- [ ] **Step 2: Test thủ công**

```bash
curl http://localhost:3000/api/quotations/QUOTATION_ID/po-items
```

Expected: `{ quotation: { id, code, projectId }, items: [...] }`

- [ ] **Step 3: Commit**

```bash
git add app/api/quotations/[id]/po-items/route.js
git commit -m "feat(api): GET /api/quotations/[id]/po-items"
```

---

### Task 3: API POST /api/purchase-orders/bulk-from-quotation

**Files:**
- Create: `app/api/purchase-orders/bulk-from-quotation/route.js`

Tạo nhiều PO trong 1 transaction, mỗi group (NCC) 1 PO.

- [ ] **Step 1: Tạo file route**

Tạo `app/api/purchase-orders/bulk-from-quotation/route.js`:

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const itemSchema = z.object({
    productId: z.string().min(1),
    productName: z.string().min(1),
    unit: z.string().default(''),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
});

const groupSchema = z.object({
    supplierId: z.string().min(1),
    supplierName: z.string().min(1),
    items: z.array(itemSchema).min(1),
});

const bodySchema = z.object({
    quotationId: z.string().min(1),
    projectId: z.string().optional().nullable(),
    deliveryDate: z.string().optional().nullable(),
    groups: z.array(groupSchema).min(1),
}).strict();

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const { quotationId, projectId, deliveryDate, groups } = bodySchema.parse(body);

    const createdPOs = await prisma.$transaction(async (tx) => {
        const results = [];
        for (const group of groups) {
            const code = await generateCode('purchaseOrder', 'PO');
            const totalAmount = group.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);

            const po = await tx.purchaseOrder.create({
                data: {
                    code,
                    supplier: group.supplierName,
                    supplierId: group.supplierId,
                    quotationId,
                    projectId: projectId || null,
                    deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
                    status: 'Nháp',
                    totalAmount,
                    notes: '',
                    items: {
                        create: group.items.map(it => ({
                            productId: it.productId,
                            productName: it.productName,
                            unit: it.unit,
                            quantity: it.quantity,
                            unitPrice: it.unitPrice,
                            amount: it.quantity * it.unitPrice,
                        })),
                    },
                },
                include: {
                    items: true,
                    project: { select: { name: true, code: true } },
                    supplierRel: { select: { name: true } },
                },
            });
            results.push(po);
        }
        return results;
    });

    return NextResponse.json(createdPOs, { status: 201 });
});
```

- [ ] **Step 2: Test thủ công (cần supplierId và quotationId hợp lệ)**

```bash
curl -X POST http://localhost:3000/api/purchase-orders/bulk-from-quotation \
  -H "Content-Type: application/json" \
  -d '{
    "quotationId": "BG_ID",
    "projectId": null,
    "deliveryDate": null,
    "groups": [{
      "supplierId": "SUPPLIER_ID",
      "supplierName": "Test NCC",
      "items": [{"productId": "P_ID", "productName": "Test SP", "unit": "cái", "quantity": 2, "unitPrice": 500000}]
    }]
  }'
```

Expected: `[{ id, code, supplier, totalAmount, items: [...] }]` với status 201

- [ ] **Step 3: Commit**

```bash
git add app/api/purchase-orders/bulk-from-quotation/route.js
git commit -m "feat(api): POST bulk-from-quotation — tạo nhiều PO từ báo giá"
```

---

### Task 4: Component PoBulkFromQuotationModal

**Files:**
- Create: `components/PoBulkFromQuotationModal.js`

Component 2-step modal dùng chung cho /purchasing và /projects/[id]. Props: `{ open, onClose, prefillProjectId, onSuccess }`.

- [ ] **Step 1: Tạo component**

Tạo `components/PoBulkFromQuotationModal.js`:

```javascript
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
    const [poItems, setPoItems] = useState([]); // { id, name, productId, unit, quantity, unitPrice, selected }
    const [selectAll, setSelectAll] = useState(true);

    // Step 2
    const [supplierMap, setSupplierMap] = useState({}); // productId -> { supplierId, supplierName }
    const [deliveryDate, setDeliveryDate] = useState('');
    const [saving, setSaving] = useState(false);
    const [createdPOs, setCreatedPOs] = useState(null);

    useEffect(() => {
        if (!open) return;
        setStep(1);
        setQuotationId('');
        setPoItems([]);
        setSelectAll(true);
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

    const setSupplierForItem = (productId, supplierId) => {
        const sup = suppliers.find(s => s.id === supplierId);
        setSupplierMap(prev => ({
            ...prev,
            [productId]: { supplierId, supplierName: sup?.name || '' },
        }));
    };

    // Group selected items by supplier for preview
    const groups = () => {
        const map = {};
        for (const it of selectedItems) {
            const sup = supplierMap[it.productId];
            if (!sup?.supplierId) continue;
            if (!map[sup.supplierId]) map[sup.supplierId] = { ...sup, items: [] };
            map[sup.supplierId].items.push(it);
        }
        return Object.values(map);
    };

    const unassigned = selectedItems.filter(it => !supplierMap[it.productId]?.supplierId);

    const handleCreate = async () => {
        if (unassigned.length > 0) return alert(`${unassigned.length} sản phẩm chưa được gán NCC`);
        const g = groups();
        if (g.length === 0) return alert('Chưa có sản phẩm nào được gán NCC');
        setSaving(true);
        const res = await fetch('/api/purchase-orders/bulk-from-quotation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quotationId,
                projectId: projectId || null,
                deliveryDate: deliveryDate || null,
                groups: g.map(grp => ({
                    supplierId: grp.supplierId,
                    supplierName: grp.supplierName,
                    items: grp.items.map(it => ({
                        productId: it.productId,
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

    // === Màn hình sau khi tạo xong ===
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
                    <h3>📋 Tạo PO từ Báo giá — Bước {step}/2</h3>
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
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>
                                    Báo giá này không có sản phẩm nào gắn với hệ thống.
                                </p>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={onClose}>Hủy</button>
                            <button className="btn btn-primary"
                                disabled={selectedItems.length === 0}
                                onClick={() => setStep(2)}>
                                Tiếp theo → ({selectedItems.length} SP)
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
                                    {selectedItems.map(it => (
                                        <tr key={it.id}>
                                            <td>{it.name}</td>
                                            <td style={{ textAlign: 'center' }}>{it.quantity}</td>
                                            <td>
                                                <select className="form-select"
                                                    value={supplierMap[it.productId]?.supplierId || ''}
                                                    onChange={e => setSupplierForItem(it.productId, e.target.value)}>
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
```

- [ ] **Step 2: Commit**

```bash
git add components/PoBulkFromQuotationModal.js
git commit -m "feat(ui): PoBulkFromQuotationModal — 2-step modal tạo PO từ báo giá"
```

---

### Task 5: Nút entry point trong /purchasing

**Files:**
- Modify: `app/purchasing/page.js`

Thêm state `showBulkModal`, import component, thêm nút cạnh "+ Tạo PO mới", và `<PoBulkFromQuotationModal>` vào JSX.

- [ ] **Step 1: Thêm import và state**

Trong `app/purchasing/page.js`, thêm import sau dòng `import { useState, useEffect, Suspense }`:

```javascript
import PoBulkFromQuotationModal from '@/components/PoBulkFromQuotationModal';
```

Thêm state vào `PurchasingContent` (sau dòng `const [saving, setSaving] = useState(false)`):

```javascript
const [showBulkModal, setShowBulkModal] = useState(false);
```

- [ ] **Step 2: Thêm nút vào header**

Tìm dòng:
```javascript
<button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Tạo PO mới</button>
```

Thay bằng:
```javascript
<div style={{ display: 'flex', gap: 8 }}>
    <button className="btn" onClick={() => setShowBulkModal(true)}>📋 Tạo PO từ Báo giá</button>
    <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Tạo PO mới</button>
</div>
```

- [ ] **Step 3: Thêm modal vào JSX**

Tìm closing tag của component (trước `</div>` cuối cùng của `return`), thêm:

```javascript
<PoBulkFromQuotationModal
    open={showBulkModal}
    onClose={() => setShowBulkModal(false)}
    prefillProjectId={null}
    onSuccess={() => { setShowBulkModal(false); fetchOrders(); }}
/>
```

- [ ] **Step 4: Kiểm tra trang /purchasing hiển thị đúng, nút mở modal hoạt động**

Mở `http://localhost:3000/purchasing`, click "Tạo PO từ Báo giá", modal mở bước 1.

- [ ] **Step 5: Commit**

```bash
git add app/purchasing/page.js
git commit -m "feat(purchasing): add Tạo PO từ Báo giá button"
```

---

### Task 6: Nút entry point trong /projects/[id] tab Mua hàng

**Files:**
- Modify: `app/projects/[id]/page.js` (hoặc MaterialTab nếu tab mua hàng nằm ở đó)

Cần xác định tab nào chứa phần mua hàng của dự án. Grep để tìm.

- [ ] **Step 1: Xác định file tab Mua hàng**

```bash
grep -rn "purchase-orders\|purchaseOrder\|Mua hàng\|PurchaseOrder" app/projects/ --include="*.js" -l
```

Đọc file tìm được để hiểu cấu trúc.

- [ ] **Step 2: Thêm import và state showBulkModal**

Trong file tab chứa phần mua hàng, thêm:

```javascript
import PoBulkFromQuotationModal from '@/components/PoBulkFromQuotationModal';
```

Thêm state:
```javascript
const [showBulkModal, setShowBulkModal] = useState(false);
```

- [ ] **Step 3: Thêm nút vào header của section mua hàng**

Tìm nút tạo PO hiện có (nếu có) hoặc header của table PO, thêm nút cạnh bên:

```javascript
<button className="btn" onClick={() => setShowBulkModal(true)}>📋 Tạo PO từ Báo giá</button>
```

- [ ] **Step 4: Thêm modal với prefillProjectId**

Thêm vào cuối JSX của component (lấy `project.id` từ props hoặc context):

```javascript
<PoBulkFromQuotationModal
    open={showBulkModal}
    onClose={() => setShowBulkModal(false)}
    prefillProjectId={project?.id}
    onSuccess={() => { setShowBulkModal(false); fetchPOs?.(); }}
/>
```

- [ ] **Step 5: Test trên trang /projects/[code]**

Mở tab Mua hàng của 1 dự án có báo giá, click nút, modal mở với dự án đã pre-fill.

- [ ] **Step 6: Commit**

```bash
git add app/projects/
git commit -m "feat(projects): add Tạo PO từ Báo giá button in purchasing tab"
```

---

### Task 7: Build check + push

- [ ] **Step 1: Chạy build**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | tail -30
```

Expected: `✓ Compiled successfully` hoặc chỉ có warnings, không có errors.

- [ ] **Step 2: Sửa lỗi build nếu có**

Đọc lỗi, fix. Các lỗi thường gặp:
- Missing `'use client'` directive
- Import không tìm thấy — kiểm tra đường dẫn
- Zod strict mode reject field lạ — kiểm tra schema

- [ ] **Step 3: Chạy tests**

```bash
npm test 2>&1 | tail -20
```

Expected: tất cả pass (hoặc không có test liên quan fail do feature mới).

- [ ] **Step 4: Commit + push**

```bash
git add -A
git status
git commit -m "feat: Tạo PO từ Báo giá — bulk PO creation from quotation"
git push
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|-------------|------|
| Thêm `quotationId` vào PurchaseOrder | Task 1 |
| Back-relation `purchaseOrders` vào Quotation | Task 1 |
| GET /api/quotations/[id]/po-items — flat list, chỉ có productId, qty fallback volume | Task 2 |
| POST /api/purchase-orders/bulk-from-quotation — transaction, generateCode, status Nháp | Task 3 |
| 2-step modal: bước 1 chọn + điều chỉnh qty | Task 4 |
| Bước 2 gán NCC + preview nhóm | Task 4 |
| NCC nhớ trong session theo productId | Task 4 (`supplierMap` state) |
| Ngày giao hàng chung | Task 4 |
| Sau khi tạo: danh sách PO + in từng PO | Task 4 |
| In tổng hợp — 1 tờ gộp tất cả NCC | Task 4 |
| Entry point /purchasing | Task 5 |
| Entry point /projects/[id] tab Mua hàng với prefill projectId | Task 6 |
| Build pass | Task 7 |

### Placeholder scan

Không có TBD hoặc "implement later". Task 6 để Step 1 grep vì không biết chính xác file nào chứa tab — đây là discovery step hợp lý.

### Type consistency

- `supplierMap` dùng `productId` làm key xuyên suốt Task 4
- `groups()` function trả về `{ supplierId, supplierName, items[] }` — đúng với body của POST
- `generateCode('purchaseOrder', 'PO')` — đúng với TABLE_MAP đã có sẵn
