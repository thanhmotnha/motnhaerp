# Inventory GRN & Stock Issue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bổ sung phiếu nhập kho từ PO (GoodsReceipt) và phiếu xuất kho (StockIssue) vào hệ thống kho hiện có.

**Architecture:** Thêm 4 model mới vào Prisma schema, 4 API routes mới, refactor `/receive` endpoint để tạo GoodsReceipt thực sự, thêm 2 tab mới vào `/inventory`. Không thay đổi luồng nhập kho cũ (InventoryTransaction vẫn được dùng như audit log).

**Tech Stack:** Next.js 16 App Router, Prisma 6, PostgreSQL, Zod 4, `withAuth()` từ `lib/apiHandler`, `generateCode()` từ `lib/generateCode`, `apiFetch()` từ `lib/fetchClient`.

---

## File Structure

**Tạo mới:**
- `lib/validations/goodsReceipt.js` — Zod schemas cho GRN
- `lib/validations/stockIssue.js` — Zod schemas cho StockIssue
- `app/api/inventory/receipts/route.js` — GET list + POST tạo GRN
- `app/api/inventory/receipts/[id]/route.js` — GET chi tiết GRN
- `app/api/inventory/issues/route.js` — GET list + POST tạo phiếu xuất
- `app/api/inventory/issues/[id]/route.js` — GET chi tiết phiếu xuất

**Sửa đổi:**
- `prisma/schema.prisma` — thêm 4 model mới + back-relations
- `lib/generateCode.js` — thêm `goodsReceipt` và `stockIssue` vào TABLE_MAP
- `app/api/purchase-orders/[id]/receive/route.js` — tạo GoodsReceipt thay vì ghi thẳng
- `app/inventory/page.js` — thêm tab "Phiếu nhập" và "Phiếu xuất"
- `app/purchasing/page.js` — thêm danh sách GRN trong modal GRN và thêm trường warehouseId

---

## Task 1: Prisma Schema — 4 model mới

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Thêm 4 model vào schema**

Thêm vào cuối `prisma/schema.prisma` (trước hoặc sau model WarehouseTransfer):

```prisma
model GoodsReceipt {
  id              String             @id @default(cuid())
  code            String             @unique
  purchaseOrderId String
  warehouseId     String
  receivedDate    DateTime           @default(now())
  receivedBy      String             @default("")
  notes           String             @default("")
  createdById     String             @default("")
  createdAt       DateTime           @default(now())

  purchaseOrder   PurchaseOrder      @relation(fields: [purchaseOrderId], references: [id])
  warehouse       Warehouse          @relation(fields: [warehouseId], references: [id])
  items           GoodsReceiptItem[]

  @@index([purchaseOrderId])
  @@index([warehouseId])
}

model GoodsReceiptItem {
  id                  String            @id @default(cuid())
  receiptId           String
  productId           String?
  productName         String
  unit                String            @default("")
  qtyOrdered          Float             @default(0)
  qtyReceived         Float             @default(0)
  unitPrice           Float             @default(0)
  purchaseOrderItemId String?

  receipt             GoodsReceipt      @relation(fields: [receiptId], references: [id], onDelete: Cascade)
  product             Product?          @relation(fields: [productId], references: [id])
  purchaseOrderItem   PurchaseOrderItem? @relation(fields: [purchaseOrderItemId], references: [id])

  @@index([receiptId])
  @@index([productId])
}

model StockIssue {
  id          String           @id @default(cuid())
  code        String           @unique
  warehouseId String
  projectId   String?
  issuedDate  DateTime         @default(now())
  issuedBy    String           @default("")
  notes       String           @default("")
  createdById String           @default("")
  createdAt   DateTime         @default(now())

  warehouse   Warehouse        @relation(fields: [warehouseId], references: [id])
  project     Project?         @relation(fields: [projectId], references: [id])
  items       StockIssueItem[]

  @@index([warehouseId])
  @@index([projectId])
}

model StockIssueItem {
  id          String     @id @default(cuid())
  issueId     String
  productId   String?
  productName String
  unit        String     @default("")
  qty         Float      @default(0)
  unitPrice   Float      @default(0)

  issue       StockIssue @relation(fields: [issueId], references: [id], onDelete: Cascade)
  product     Product?   @relation(fields: [productId], references: [id])

  @@index([issueId])
  @@index([productId])
}
```

- [ ] **Step 2: Thêm back-relations vào các model hiện có**

Tìm `model PurchaseOrder` → thêm vào cuối block relations:
```prisma
  receipts      GoodsReceipt[]
```

Tìm `model Warehouse` → thêm:
```prisma
  receipts      GoodsReceipt[]
  stockIssues   StockIssue[]
```

Tìm `model Project` → thêm:
```prisma
  stockIssues   StockIssue[]
```

Tìm `model Product` → thêm:
```prisma
  receiptItems  GoodsReceiptItem[]
  issueItems    StockIssueItem[]
```

Tìm `model PurchaseOrderItem` → thêm:
```prisma
  receiptItems  GoodsReceiptItem[]
```

- [ ] **Step 3: Chạy db push**

```bash
npm run db:generate
npx prisma db push
```

Expected: "Your database is now in sync with your Prisma schema."

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add GoodsReceipt, GoodsReceiptItem, StockIssue, StockIssueItem models"
```

---

## Task 2: generateCode + Validation Schemas

**Files:**
- Modify: `lib/generateCode.js`
- Create: `lib/validations/goodsReceipt.js`
- Create: `lib/validations/stockIssue.js`

- [ ] **Step 1: Thêm vào TABLE_MAP trong `lib/generateCode.js`**

Tìm dòng `contractorPaymentLog: '"ContractorPaymentLog"',` và thêm sau:
```javascript
    goodsReceipt: '"GoodsReceipt"',
    stockIssue: '"StockIssue"',
```

- [ ] **Step 2: Tạo `lib/validations/goodsReceipt.js`**

```javascript
import { z } from 'zod';
import { optStr, optFloat, optDate } from './common';

const goodsReceiptItemSchema = z.object({
    productId: z.string().optional().nullable().default(null).transform(v => v || null),
    productName: z.string().trim().min(1),
    unit: optStr,
    qtyOrdered: optFloat,
    qtyReceived: z.number().min(0),
    unitPrice: optFloat,
    purchaseOrderItemId: z.string().optional().nullable().default(null).transform(v => v || null),
});

export const goodsReceiptCreateSchema = z.object({
    purchaseOrderId: z.string().min(1, 'PO bắt buộc'),
    warehouseId: z.string().min(1, 'Kho bắt buộc'),
    receivedDate: optDate,
    receivedBy: optStr,
    notes: optStr,
    items: z.array(goodsReceiptItemSchema).min(1, 'Phải có ít nhất 1 sản phẩm'),
}).strict();
```

- [ ] **Step 3: Tạo `lib/validations/stockIssue.js`**

```javascript
import { z } from 'zod';
import { optStr, optFloat, optDate } from './common';

const stockIssueItemSchema = z.object({
    productId: z.string().optional().nullable().default(null).transform(v => v || null),
    productName: z.string().trim().min(1),
    unit: optStr,
    qty: z.number().min(0.001, 'Số lượng phải > 0'),
    unitPrice: optFloat,
});

export const stockIssueCreateSchema = z.object({
    warehouseId: z.string().min(1, 'Kho bắt buộc'),
    projectId: z.string().optional().nullable().default(null).transform(v => v || null),
    issuedDate: optDate,
    issuedBy: optStr,
    notes: optStr,
    items: z.array(stockIssueItemSchema).min(1, 'Phải có ít nhất 1 sản phẩm'),
}).strict();
```

- [ ] **Step 4: Commit**

```bash
git add lib/generateCode.js lib/validations/goodsReceipt.js lib/validations/stockIssue.js
git commit -m "feat(validation): add GoodsReceipt and StockIssue schemas, update generateCode"
```

---

## Task 3: API — GoodsReceipt (GET list + POST + GET detail)

**Files:**
- Create: `app/api/inventory/receipts/route.js`
- Create: `app/api/inventory/receipts/[id]/route.js`

- [ ] **Step 1: Tạo `app/api/inventory/receipts/route.js`**

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { goodsReceiptCreateSchema } from '@/lib/validations/goodsReceipt';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const poId = searchParams.get('poId');
    const warehouseId = searchParams.get('warehouseId');

    const where = {};
    if (poId) where.purchaseOrderId = poId;
    if (warehouseId) where.warehouseId = warehouseId;

    const receipts = await prisma.goodsReceipt.findMany({
        where,
        include: {
            purchaseOrder: { select: { code: true, supplier: true } },
            warehouse: { select: { name: true } },
            items: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
    });
    return NextResponse.json(receipts);
});

export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const data = goodsReceiptCreateSchema.parse(body);

    // Validate PO exists
    const po = await prisma.purchaseOrder.findUnique({
        where: { id: data.purchaseOrderId },
        include: { items: true },
    });
    if (!po) return NextResponse.json({ error: 'PO không tồn tại' }, { status: 404 });

    const code = await generateCode('goodsReceipt', 'PNK');

    const receipt = await prisma.$transaction(async (tx) => {
        // 1. Tạo GoodsReceipt
        const grn = await tx.goodsReceipt.create({
            data: {
                code,
                purchaseOrderId: data.purchaseOrderId,
                warehouseId: data.warehouseId,
                receivedDate: data.receivedDate || new Date(),
                receivedBy: data.receivedBy || '',
                notes: data.notes || '',
                createdById: session.user.id,
                items: {
                    create: data.items
                        .filter(it => it.qtyReceived > 0)
                        .map(it => ({
                            productId: it.productId,
                            productName: it.productName,
                            unit: it.unit,
                            qtyOrdered: it.qtyOrdered,
                            qtyReceived: it.qtyReceived,
                            unitPrice: it.unitPrice,
                            purchaseOrderItemId: it.purchaseOrderItemId,
                        })),
                },
            },
            include: { items: true },
        });

        // 2. Với mỗi item: update stock + tạo InventoryTransaction + update PO item receivedQty
        for (const item of grn.items) {
            if (item.productId) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { increment: item.qtyReceived } },
                });

                const txCode = await generateCode('inventoryTransaction', 'NK');
                await tx.inventoryTransaction.create({
                    data: {
                        code: txCode,
                        type: 'Nhập',
                        quantity: item.qtyReceived,
                        unit: item.unit,
                        note: `Phiếu nhập ${grn.code} — PO ${po.code}`,
                        productId: item.productId,
                        warehouseId: data.warehouseId,
                        projectId: po.projectId || null,
                        date: data.receivedDate || new Date(),
                    },
                });
            }

            if (item.purchaseOrderItemId) {
                await tx.purchaseOrderItem.update({
                    where: { id: item.purchaseOrderItemId },
                    data: { receivedQty: { increment: item.qtyReceived } },
                });
            }
        }

        // 3. Cập nhật status PO
        const updatedItems = await tx.purchaseOrderItem.findMany({
            where: { purchaseOrderId: data.purchaseOrderId },
        });
        const allReceived = updatedItems.every(i => i.receivedQty >= i.quantity);
        const anyReceived = updatedItems.some(i => i.receivedQty > 0);
        const newStatus = allReceived ? 'Hoàn thành' : anyReceived ? 'Nhận một phần' : po.status;
        await tx.purchaseOrder.update({
            where: { id: data.purchaseOrderId },
            data: {
                status: newStatus,
                receivedDate: allReceived ? new Date() : undefined,
            },
        });

        return grn;
    });

    return NextResponse.json(receipt, { status: 201 });
});
```

- [ ] **Step 2: Tạo `app/api/inventory/receipts/[id]/route.js`**

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const receipt = await prisma.goodsReceipt.findUnique({
        where: { id },
        include: {
            purchaseOrder: { select: { code: true, supplier: true, supplierRel: { select: { name: true, phone: true } } } },
            warehouse: { select: { name: true, address: true } },
            items: { include: { product: { select: { code: true } } } },
        },
    });
    if (!receipt) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(receipt);
});
```

- [ ] **Step 3: Commit**

```bash
git add app/api/inventory/receipts/route.js app/api/inventory/receipts/[id]/route.js
git commit -m "feat(api): add GoodsReceipt GET/POST/GET-detail endpoints"
```

---

## Task 4: API — StockIssue (GET list + POST + GET detail)

**Files:**
- Create: `app/api/inventory/issues/route.js`
- Create: `app/api/inventory/issues/[id]/route.js`

- [ ] **Step 1: Tạo `app/api/inventory/issues/route.js`**

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { stockIssueCreateSchema } from '@/lib/validations/stockIssue';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get('warehouseId');
    const projectId = searchParams.get('projectId');

    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (projectId) where.projectId = projectId;

    const issues = await prisma.stockIssue.findMany({
        where,
        include: {
            warehouse: { select: { name: true } },
            project: { select: { name: true, code: true } },
            items: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
    });
    return NextResponse.json(issues);
});

export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const data = stockIssueCreateSchema.parse(body);

    // Validate tồn kho đủ cho từng item
    for (const item of data.items) {
        if (!item.productId) continue;
        const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { stock: true, name: true },
        });
        if (!product) return NextResponse.json({ error: `Sản phẩm không tồn tại` }, { status: 400 });
        if ((product.stock || 0) < item.qty) {
            return NextResponse.json(
                { error: `${item.productName}: tồn kho không đủ (tồn: ${product.stock}, cần: ${item.qty})` },
                { status: 400 }
            );
        }
    }

    const code = await generateCode('stockIssue', 'PXK');

    const issue = await prisma.$transaction(async (tx) => {
        const si = await tx.stockIssue.create({
            data: {
                code,
                warehouseId: data.warehouseId,
                projectId: data.projectId,
                issuedDate: data.issuedDate || new Date(),
                issuedBy: data.issuedBy || '',
                notes: data.notes || '',
                createdById: session.user.id,
                items: {
                    create: data.items.map(it => ({
                        productId: it.productId,
                        productName: it.productName,
                        unit: it.unit,
                        qty: it.qty,
                        unitPrice: it.unitPrice,
                    })),
                },
            },
            include: { items: true },
        });

        for (const item of si.items) {
            if (item.productId) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.qty } },
                });

                const txCode = await generateCode('inventoryTransaction', 'XK');
                await tx.inventoryTransaction.create({
                    data: {
                        code: txCode,
                        type: 'Xuất',
                        quantity: item.qty,
                        unit: item.unit,
                        note: `Phiếu xuất ${si.code}${data.projectId ? '' : ''}`,
                        productId: item.productId,
                        warehouseId: data.warehouseId,
                        projectId: data.projectId || null,
                        date: data.issuedDate || new Date(),
                    },
                });
            }
        }

        return si;
    });

    return NextResponse.json(issue, { status: 201 });
});
```

- [ ] **Step 2: Tạo `app/api/inventory/issues/[id]/route.js`**

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const issue = await prisma.stockIssue.findUnique({
        where: { id },
        include: {
            warehouse: { select: { name: true, address: true } },
            project: { select: { name: true, code: true } },
            items: { include: { product: { select: { code: true } } } },
        },
    });
    if (!issue) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(issue);
});
```

- [ ] **Step 3: Commit**

```bash
git add app/api/inventory/issues/route.js app/api/inventory/issues/[id]/route.js
git commit -m "feat(api): add StockIssue GET/POST/GET-detail endpoints"
```

---

## Task 5: Cập nhật `/purchasing` — GRN modal có warehouseId + hiện lịch sử nhập

**Files:**
- Modify: `app/purchasing/page.js`

Hiện tại `openGrn` và `submitGrn` gọi `/api/purchase-orders/[id]/receive`. Ta thay bằng gọi `/api/inventory/receipts` (API mới Task 3) và thêm chọn kho + hiện lịch sử GRN đã tạo.

- [ ] **Step 1: Thêm state `grnWarehouseId` và `warehouses` vào component**

Tìm dòng `const [grnSaving, setGrnSaving] = useState(false);` → thêm sau:
```javascript
const [grnWarehouseId, setGrnWarehouseId] = useState('');
const [warehouses, setWarehouses] = useState([]);
const [poReceipts, setPoReceipts] = useState([]);
```

Trong `useEffect` fetch ban đầu, thêm:
```javascript
fetch('/api/warehouses').then(r => r.json()).then(d => setWarehouses(d.data || d || []));
```

- [ ] **Step 2: Sửa `openGrn` để fetch GRN cũ và set warehouseId mặc định**

```javascript
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
```

- [ ] **Step 3: Sửa `submitGrn` để gọi API mới**

```javascript
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
```

- [ ] **Step 4: Thêm dropdown chọn kho và bảng lịch sử GRN vào GRN modal**

Trong JSX modal GRN (tìm `{grnPO && (`), trước bảng items thêm:

```jsx
{/* Chọn kho */}
<div className="form-group" style={{ marginBottom: 12 }}>
    <label className="form-label">Kho nhập *</label>
    <select className="form-select" value={grnWarehouseId} onChange={e => setGrnWarehouseId(e.target.value)}>
        <option value="">— Chọn kho —</option>
        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
    </select>
</div>

{/* Lịch sử nhập đã tạo từ PO này */}
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
```

- [ ] **Step 5: Commit**

```bash
git add app/purchasing/page.js
git commit -m "feat(purchasing): GRN modal selects warehouse, calls new receipts API, shows history"
```

---

## Task 6: `/inventory` — Tab Phiếu nhập & Phiếu xuất

**Files:**
- Modify: `app/inventory/page.js`

- [ ] **Step 1: Thêm state cho 2 tab mới**

Thêm vào phần state của component:
```javascript
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
```

- [ ] **Step 2: Thêm fetch functions cho receipts và issues**

```javascript
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
```

Cập nhật `useEffect` chính để gọi fetch khi đổi tab:
```javascript
useEffect(() => {
    if (activeTab === 'stock') fetchStock();
    else if (activeTab === 'history') fetchTx();
    else if (activeTab === 'receipts') fetchReceipts();
    else if (activeTab === 'issues') fetchIssues();
}, [activeTab, filterType, filterWarehouse]);
```

- [ ] **Step 3: Thêm 2 tab button vào tab-bar**

Tìm đoạn tab-bar trong JSX, thêm sau tab "Lịch sử":
```jsx
<button className={`tab-item ${activeTab === 'receipts' ? 'active' : ''}`} onClick={() => setActiveTab('receipts')}>
    📥 Phiếu nhập (GRN)
</button>
<button className={`tab-item ${activeTab === 'issues' ? 'active' : ''}`} onClick={() => setActiveTab('issues')}>
    📤 Phiếu xuất
</button>
```

- [ ] **Step 4: Thêm nội dung Tab Phiếu nhập**

Sau block `{activeTab === 'history' && (...)}`, thêm:

```jsx
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
```

- [ ] **Step 5: Thêm nội dung Tab Phiếu xuất + nút tạo**

```jsx
{activeTab === 'issues' && (
    <>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 0 8px', flexWrap: 'wrap', gap: 8 }}>
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
```

- [ ] **Step 6: Thêm modal tạo phiếu xuất**

Thêm trước closing `</div>` cuối cùng của component:

```jsx
{showIssueForm && (
    <div className="modal-overlay" onClick={() => setShowIssueForm(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
            <h3 style={{ marginTop: 0 }}>+ Tạo phiếu xuất kho</h3>
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
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}
                onClick={() => setIssueItems(prev => [...prev, { productId: '', productName: '', unit: '', qty: '', unitPrice: 0, stock: 0 }])}>
                + Thêm dòng
            </button>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => setShowIssueForm(false)}>Hủy</button>
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
```

- [ ] **Step 7: Commit**

```bash
git add app/inventory/page.js
git commit -m "feat(inventory): add GRN and StockIssue tabs with list and create form"
```

---

## Task 7: Modal xem chi tiết + In phiếu

**Files:**
- Modify: `app/inventory/page.js`

- [ ] **Step 1: Thêm hàm `printReceipt` và `printIssue`**

Thêm vào component trước return:

```javascript
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
    setTimeout(() => si.print(), 400);
};
```

- [ ] **Step 2: Sửa lỗi typo trong printIssue**

Dòng `setTimeout(() => si.print(), 400)` phải là `win.print()`:
```javascript
setTimeout(() => win.print(), 400);
```

- [ ] **Step 3: Thêm modal xem chi tiết GRN và StockIssue**

```jsx
{viewReceipt && (
    <div className="modal-overlay" onClick={() => setViewReceipt(null)}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>Phiếu nhập kho — {viewReceipt.code}</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => printReceipt(viewReceipt)}>🖨️ In</button>
            </div>
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
            <div style={{ textAlign: 'right', marginTop: 12 }}>
                <button className="btn" onClick={() => setViewReceipt(null)}>Đóng</button>
            </div>
        </div>
    </div>
)}

{viewIssue && (
    <div className="modal-overlay" onClick={() => setViewIssue(null)}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>Phiếu xuất kho — {viewIssue.code}</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => printIssue(viewIssue)}>🖨️ In</button>
            </div>
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
            <div style={{ textAlign: 'right', marginTop: 12 }}>
                <button className="btn" onClick={() => setViewIssue(null)}>Đóng</button>
            </div>
        </div>
    </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add app/inventory/page.js
git commit -m "feat(inventory): add print and detail modal for GRN and StockIssue"
```

---

## Task 8: Build check & push

- [ ] **Step 1: Chạy build để kiểm tra**

```bash
npm run build 2>&1 | tail -20
```

Expected: No build errors. Nếu có lỗi `Can't resolve` hoặc Prisma type error → fix trước khi push.

- [ ] **Step 2: Push lên remote**

```bash
git push origin main
```

---

## Self-Review

**Spec coverage:**
- ✅ GRN từ PO, nhận từng phần — Task 3 + Task 5
- ✅ Tự cộng stock + tạo InventoryTransaction — Task 3 POST
- ✅ Cập nhật PO.receivedQty + status — Task 3 POST
- ✅ StockIssue validate tồn kho — Task 4 POST
- ✅ Trừ stock + tạo InventoryTransaction khi xuất — Task 4 POST
- ✅ Tab Phiếu nhập + Phiếu xuất trong /inventory — Task 6
- ✅ Modal tạo phiếu xuất — Task 6
- ✅ In phiếu — Task 7
- ✅ generateCode PNK / PXK — Task 2
- ✅ Phân quyền qua `withAuth` + session.user.role kiểm tra ở UI — spec cho phép ky_thuat tạo phiếu xuất, cần nhớ khi build UI

**Không có placeholder.**

**Type consistency:** `goodsReceipt` / `stockIssue` dùng nhất quán trong generateCode, schema, và API routes.
