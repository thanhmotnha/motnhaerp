# Kiểm kê (Stock Taking) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo module kiểm kê: phiếu KK linh hoạt (full/theo danh mục/thủ công), nhập số thực, chốt → update `Product.stock` + log điều chỉnh.

**Architecture:** 2 model mới (`StockTaking`, `StockTakingItem`). Lifecycle: tạo phiếu (snapshot systemStock) → đếm (nhập countedStock, save draft) → chốt (update Product.stock + InventoryTransaction type="Điều chỉnh"). Tab mới "Kiểm kê" trong `app/inventory/page.js`.

**Tech Stack:** Next.js 16 App Router, Prisma 6, PostgreSQL, React 19, Zod 4.

---

## File Map

| File | Trách nhiệm |
|---|---|
| `prisma/schema.prisma` | + 2 model `StockTaking`, `StockTakingItem` + back-relations Product/Warehouse |
| `prisma/migrations/20260419090000_stock_taking/migration.sql` | CREATE TABLE + FK + INDEX |
| `lib/validations/stockTaking.js` | **Mới** — Zod schema create + update |
| `app/api/stock-takings/route.js` | **Mới** — GET list + POST create |
| `app/api/stock-takings/[id]/route.js` | **Mới** — GET detail + PUT update + DELETE |
| `app/api/stock-takings/[id]/complete/route.js` | **Mới** — POST chốt phiếu |
| `app/inventory/page.js` | + tab "Kiểm kê" + state + list + modal tạo + modal chi tiết + printStockTaking |

---

## Task 1: Schema — Thêm StockTaking + StockTakingItem

**Files:**
- Modify: `prisma/schema.prisma` (thêm cuối file trước section cuối)
- Create: `prisma/migrations/20260419090000_stock_taking/migration.sql`

- [ ] **Step 1: Thêm 2 model vào schema.prisma**

Tìm vị trí gần các model inventory (sau `StockIssueItem` hoặc cuối file). Thêm:

```prisma
model StockTaking {
  id             String              @id @default(cuid())
  code           String              @unique
  warehouseId    String
  status         String              @default("Nháp")
  note           String              @default("")
  createdById    String              @default("")
  createdAt      DateTime            @default(now())
  completedAt    DateTime?

  warehouse      Warehouse           @relation(fields: [warehouseId], references: [id])
  items          StockTakingItem[]

  @@index([warehouseId])
  @@index([status])
}

model StockTakingItem {
  id             String              @id @default(cuid())
  stockTakingId  String
  productId      String
  systemStock    Int                 @default(0)
  countedStock   Int?
  note           String              @default("")

  stockTaking    StockTaking         @relation(fields: [stockTakingId], references: [id], onDelete: Cascade)
  product        Product             @relation(fields: [productId], references: [id])

  @@index([stockTakingId])
  @@index([productId])
}
```

- [ ] **Step 2: Thêm back-relations**

Trong `model Product`, thêm dòng (cạnh các relations khác):
```prisma
  stockTakingItems       StockTakingItem[]
```

Trong `model Warehouse`, thêm:
```prisma
  stockTakings  StockTaking[]
```

- [ ] **Step 3: Tạo migration SQL**

Tạo file `prisma/migrations/20260419090000_stock_taking/migration.sql`:

```sql
-- CreateTable: StockTaking
CREATE TABLE "StockTaking" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Nháp',
    "note" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "StockTaking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StockTaking_code_key" ON "StockTaking"("code");
CREATE INDEX "StockTaking_warehouseId_idx" ON "StockTaking"("warehouseId");
CREATE INDEX "StockTaking_status_idx" ON "StockTaking"("status");

ALTER TABLE "StockTaking"
  ADD CONSTRAINT "StockTaking_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: StockTakingItem
CREATE TABLE "StockTakingItem" (
    "id" TEXT NOT NULL,
    "stockTakingId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "systemStock" INTEGER NOT NULL DEFAULT 0,
    "countedStock" INTEGER,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "StockTakingItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StockTakingItem_stockTakingId_idx" ON "StockTakingItem"("stockTakingId");
CREATE INDEX "StockTakingItem_productId_idx" ON "StockTakingItem"("productId");

ALTER TABLE "StockTakingItem"
  ADD CONSTRAINT "StockTakingItem_stockTakingId_fkey"
  FOREIGN KEY ("stockTakingId") REFERENCES "StockTaking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StockTakingItem"
  ADD CONSTRAINT "StockTakingItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

- [ ] **Step 4: Apply migration**

```bash
cd d:/Codeapp/motnha && npx prisma migrate deploy
```

Expected: `Applied 1 migration: 20260419090000_stock_taking`.

- [ ] **Step 5: Regenerate client**

```bash
cd d:/Codeapp/motnha && npm run db:generate
```

Expected: `✔ Generated Prisma Client`.

- [ ] **Step 6: Verify tables exist**

```bash
cd d:/Codeapp/motnha && node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const c1=await p.stockTaking.count();const c2=await p.stockTakingItem.count();console.log('StockTaking:',c1,'Item:',c2);await p.\$disconnect();})();"
```

Expected: `StockTaking: 0 Item: 0`.

- [ ] **Step 7: Commit**

```bash
cd d:/Codeapp/motnha && git add prisma/schema.prisma prisma/migrations/20260419090000_stock_taking/
git commit -m "feat(schema): thêm StockTaking + StockTakingItem"
```

---

## Task 2: Validation schema

**Files:**
- Create: `lib/validations/stockTaking.js`

- [ ] **Step 1: Tạo file**

```javascript
import { z } from 'zod';
import { optStr } from './common';

// POST /api/stock-takings — tạo phiếu
export const stockTakingCreateSchema = z.object({
    warehouseId: z.string().min(1, 'Kho bắt buộc'),
    note: optStr,
    // productIds null/missing → snapshot tất cả SP trong kho
    productIds: z.array(z.string()).optional().nullable().default(null),
}).strict();

// PUT /api/stock-takings/[id] — lưu nháp
const stockTakingItemUpdateSchema = z.object({
    id: z.string().min(1),
    countedStock: z.number().int().nullable().optional(),
    note: optStr,
}).strict();

export const stockTakingUpdateSchema = z.object({
    note: optStr.optional(),
    items: z.array(stockTakingItemUpdateSchema).optional(),
}).strict();
```

- [ ] **Step 2: Build check**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
cd d:/Codeapp/motnha && git add lib/validations/stockTaking.js
git commit -m "feat(validation): stock taking schema"
```

---

## Task 3: API — GET list + POST create

**Files:**
- Create: `app/api/stock-takings/route.js`

- [ ] **Step 1: Tạo file**

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';
import { stockTakingCreateSchema } from '@/lib/validations/stockTaking';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const warehouseId = searchParams.get('warehouseId');

    const where = {};
    if (status) where.status = status;
    if (warehouseId) where.warehouseId = warehouseId;

    const takings = await prisma.stockTaking.findMany({
        where,
        include: {
            warehouse: { select: { id: true, name: true } },
            items: { select: { id: true, systemStock: true, countedStock: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });

    // Decorate with counts
    const data = takings.map(st => {
        const counted = st.items.filter(it => it.countedStock !== null).length;
        const diff = st.items.filter(it => it.countedStock !== null && it.countedStock !== it.systemStock).length;
        return {
            id: st.id,
            code: st.code,
            status: st.status,
            note: st.note,
            createdAt: st.createdAt,
            completedAt: st.completedAt,
            warehouse: st.warehouse,
            totalItems: st.items.length,
            countedItems: counted,
            diffItems: diff,
        };
    });

    return NextResponse.json(data);
}, { roles: ['ke_toan', 'giam_doc'] });

export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const data = stockTakingCreateSchema.parse(body);

    // Load products to snapshot
    const whereProducts = {
        deletedAt: null,
        warehouseId: data.warehouseId,
    };
    if (data.productIds && data.productIds.length > 0) {
        whereProducts.id = { in: data.productIds };
    }
    const products = await prisma.product.findMany({
        where: whereProducts,
        select: { id: true, stock: true },
    });

    if (products.length === 0) {
        return NextResponse.json({ error: 'Kho không có SP nào để kiểm kê' }, { status: 400 });
    }

    const code = await generateCode('stockTaking', 'KK');

    const taking = await prisma.stockTaking.create({
        data: {
            code,
            warehouseId: data.warehouseId,
            note: data.note || '',
            createdById: session.user.id,
            items: {
                create: products.map(p => ({
                    productId: p.id,
                    systemStock: p.stock || 0,
                })),
            },
        },
        include: {
            warehouse: { select: { id: true, name: true } },
            items: {
                include: {
                    product: { select: { id: true, code: true, name: true, unit: true, category: true } },
                },
            },
        },
    });

    return NextResponse.json(taking, { status: 201 });
}, { roles: ['ke_toan', 'giam_doc'] });
```

- [ ] **Step 2: Build check**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
cd d:/Codeapp/motnha && git add app/api/stock-takings/route.js
git commit -m "feat(stock-taking-api): GET list + POST create"
```

---

## Task 4: API — GET detail + PUT update + DELETE

**Files:**
- Create: `app/api/stock-takings/[id]/route.js`

- [ ] **Step 1: Tạo file**

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { stockTakingUpdateSchema } from '@/lib/validations/stockTaking';

export const GET = withAuth(async (_request, { params }) => {
    const { id } = await params;
    const taking = await prisma.stockTaking.findUnique({
        where: { id },
        include: {
            warehouse: { select: { id: true, name: true } },
            items: {
                include: {
                    product: { select: { id: true, code: true, name: true, unit: true, category: true, image: true } },
                },
                orderBy: { product: { name: 'asc' } },
            },
        },
    });
    if (!taking) return NextResponse.json({ error: 'Không tìm thấy phiếu kiểm kê' }, { status: 404 });
    return NextResponse.json(taking);
}, { roles: ['ke_toan', 'giam_doc'] });

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const data = stockTakingUpdateSchema.parse(body);

    const existing = await prisma.stockTaking.findUnique({ where: { id }, select: { status: true } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });
    if (existing.status !== 'Nháp') {
        return NextResponse.json({ error: 'Phiếu đã chốt, không sửa được' }, { status: 422 });
    }

    await prisma.$transaction(async (tx) => {
        if (data.note !== undefined) {
            await tx.stockTaking.update({ where: { id }, data: { note: data.note } });
        }
        if (data.items && data.items.length > 0) {
            for (const it of data.items) {
                await tx.stockTakingItem.update({
                    where: { id: it.id },
                    data: {
                        countedStock: it.countedStock ?? null,
                        note: it.note || '',
                    },
                });
            }
        }
    });

    const updated = await prisma.stockTaking.findUnique({
        where: { id },
        include: {
            warehouse: { select: { id: true, name: true } },
            items: {
                include: { product: { select: { id: true, code: true, name: true, unit: true, category: true, image: true } } },
                orderBy: { product: { name: 'asc' } },
            },
        },
    });
    return NextResponse.json(updated);
}, { roles: ['ke_toan', 'giam_doc'] });

export const DELETE = withAuth(async (_request, { params }) => {
    const { id } = await params;
    const existing = await prisma.stockTaking.findUnique({ where: { id }, select: { status: true } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });
    if (existing.status !== 'Nháp') {
        return NextResponse.json({ error: 'Chỉ xóa được phiếu Nháp' }, { status: 422 });
    }
    await prisma.stockTaking.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}, { roles: ['ke_toan', 'giam_doc'] });
```

- [ ] **Step 2: Build check**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
cd d:/Codeapp/motnha && git add "app/api/stock-takings/[id]/route.js"
git commit -m "feat(stock-taking-api): GET/PUT/DELETE single phiếu"
```

---

## Task 5: API — POST /complete (chốt phiếu)

**Files:**
- Create: `app/api/stock-takings/[id]/complete/route.js`

- [ ] **Step 1: Tạo file**

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';

// POST /api/stock-takings/[id]/complete
// Chốt phiếu: update Product.stock + tạo InventoryTransaction type="Điều chỉnh"
export const POST = withAuth(async (_request, { params }, session) => {
    const { id } = await params;

    const taking = await prisma.stockTaking.findUnique({
        where: { id },
        include: {
            items: {
                include: { product: { select: { id: true, unit: true, name: true } } },
            },
        },
    });
    if (!taking) return NextResponse.json({ error: 'Không tìm thấy phiếu' }, { status: 404 });
    if (taking.status !== 'Nháp') {
        return NextResponse.json({ error: 'Phiếu đã chốt' }, { status: 422 });
    }

    const itemsWithCount = taking.items.filter(it => it.countedStock !== null);
    if (itemsWithCount.length === 0) {
        return NextResponse.json({ error: 'Nhập ít nhất 1 SP trước khi chốt' }, { status: 400 });
    }

    // Pre-compute DC code base (Điều chỉnh — format DC###)
    const diffItems = itemsWithCount.filter(it => it.countedStock !== it.systemStock);
    let dcBaseMax = 0;
    if (diffItems.length > 0) {
        const maxResult = await prisma.$queryRawUnsafe(
            `SELECT COALESCE(MAX(CAST(REPLACE(code, $1, '') AS INTEGER)), 0) as max_num
             FROM "InventoryTransaction"
             WHERE code LIKE $2 AND REPLACE(code, $1, '') ~ '^[0-9]+$'`,
            'DC', 'DC%'
        );
        dcBaseMax = Number(maxResult?.[0]?.max_num ?? 0);
    }
    let dcIdx = 0;

    await prisma.$transaction(async (tx) => {
        for (const it of itemsWithCount) {
            const delta = (it.countedStock || 0) - it.systemStock;
            if (delta !== 0) {
                // Update Product.stock to counted value (source of truth)
                await tx.product.update({
                    where: { id: it.productId },
                    data: { stock: it.countedStock || 0 },
                });

                // Log InventoryTransaction
                const dcCode = `DC${String(dcBaseMax + 1 + dcIdx).padStart(3, '0')}`;
                dcIdx++;
                await tx.inventoryTransaction.create({
                    data: {
                        code: dcCode,
                        type: 'Điều chỉnh',
                        quantity: delta,
                        unit: it.product?.unit || '',
                        note: `Kiểm kê ${taking.code}${it.note ? ` — ${it.note}` : ''}`,
                        productId: it.productId,
                        warehouseId: taking.warehouseId,
                        date: new Date(),
                    },
                });
            }
        }

        await tx.stockTaking.update({
            where: { id },
            data: { status: 'Hoàn thành', completedAt: new Date() },
        });
    });

    const updated = await prisma.stockTaking.findUnique({
        where: { id },
        include: {
            warehouse: { select: { id: true, name: true } },
            items: {
                include: { product: { select: { id: true, code: true, name: true, unit: true, category: true, image: true } } },
                orderBy: { product: { name: 'asc' } },
            },
        },
    });
    return NextResponse.json(updated);
}, { roles: ['ke_toan', 'giam_doc'] });
```

- [ ] **Step 2: Build check**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
cd d:/Codeapp/motnha && git add "app/api/stock-takings/[id]/complete/route.js"
git commit -m "feat(stock-taking-api): POST complete — update stock + log điều chỉnh"
```

---

## Task 6: UI — Tab "Kiểm kê" + list phiếu

**Files:**
- Modify: `app/inventory/page.js`

- [ ] **Step 1: Thêm state phiếu kiểm kê**

Tìm block các `useState` (khoảng line 13-50). Thêm:

```javascript
const [stockTakings, setStockTakings] = useState([]);
const [stShowCreate, setStShowCreate] = useState(false);
const [stDetail, setStDetail] = useState(null); // phiếu đang mở chi tiết

// Create form state
const [stForm, setStForm] = useState({ warehouseId: '', note: '', mode: 'all', selectedCategories: [], selectedProductIds: [] });
const [stCreateSaving, setStCreateSaving] = useState(false);

// Detail state
const [stDetailItems, setStDetailItems] = useState([]);
const [stDetailSaving, setStDetailSaving] = useState(false);
const [stDetailFilter, setStDetailFilter] = useState('all'); // all | uncounted | diff
const [stDetailSearch, setStDetailSearch] = useState('');
```

- [ ] **Step 2: Thêm fetch function**

Gần các fetch function khác (fetchTx, fetchStock...), thêm:

```javascript
const fetchStockTakings = async () => {
    const res = await fetch('/api/stock-takings');
    const d = await res.json();
    setStockTakings(Array.isArray(d) ? d : []);
};
```

Và trong useEffect chính (khi load trang hoặc switch tab), thêm fetch khi activeTab === 'kiem-ke'.

- [ ] **Step 3: Thêm tab "Kiểm kê" vào tab bar**

Tìm khu vực tab buttons (search `activeTab === 'stock'` để định vị). Thêm tab mới:

```javascript
<button onClick={() => setActiveTab('kiem-ke')} className={activeTab === 'kiem-ke' ? 'tab-active' : ''}>
    📋 Kiểm kê
</button>
```

(Đặt vị trí nhất quán với các tab khác — adapt class/style theo pattern hiện tại)

- [ ] **Step 4: Thêm useEffect fetch khi mở tab**

Thêm useEffect:

```javascript
useEffect(() => {
    if (activeTab === 'kiem-ke') {
        fetchStockTakings();
    }
}, [activeTab]);
```

- [ ] **Step 5: Thêm TAB content**

Tìm các block `{activeTab === 'stock' && (...)}` và tương tự. Thêm block mới sau:

```javascript
{/* TAB: Kiểm kê */}
{activeTab === 'kiem-ke' && (
    <>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{stockTakings.length} phiếu kiểm kê</div>
            <button className="btn btn-primary" onClick={() => {
                setStForm({ warehouseId: txData.warehouses[0]?.id || '', note: '', mode: 'all', selectedCategories: [], selectedProductIds: [] });
                setStShowCreate(true);
            }}>+ Tạo phiếu kiểm kê</button>
        </div>
        <div className="table-container">
            <table className="data-table" style={{ fontSize: 13 }}>
                <thead>
                    <tr>
                        <th>Mã</th>
                        <th>Kho</th>
                        <th>Ngày tạo</th>
                        <th style={{ textAlign: 'center' }}>SL SP</th>
                        <th style={{ textAlign: 'center' }}>Đã đếm</th>
                        <th style={{ textAlign: 'center' }}>Chênh lệch</th>
                        <th>Trạng thái</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {stockTakings.map(st => (
                        <tr key={st.id} onClick={() => openStockTakingDetail(st.id)} style={{ cursor: 'pointer' }}>
                            <td className="accent">{st.code}</td>
                            <td>{st.warehouse?.name || '—'}</td>
                            <td>{fmtDate(st.createdAt)}</td>
                            <td style={{ textAlign: 'center' }}>{st.totalItems}</td>
                            <td style={{ textAlign: 'center', color: 'var(--status-info)' }}>{st.countedItems}</td>
                            <td style={{ textAlign: 'center', color: st.diffItems > 0 ? 'var(--status-warning)' : 'var(--text-muted)', fontWeight: 600 }}>
                                {st.diffItems || '—'}
                            </td>
                            <td>
                                <span className="badge" style={{
                                    background: st.status === 'Hoàn thành' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                                    color: st.status === 'Hoàn thành' ? 'var(--status-success)' : 'var(--status-warning)',
                                    fontSize: 11, padding: '2px 8px',
                                }}>{st.status}</span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                                {st.status === 'Hoàn thành' && (
                                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); printStockTaking(st.id); }}>🖨️</button>
                                )}
                            </td>
                        </tr>
                    ))}
                    {stockTakings.length === 0 && (
                        <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>Chưa có phiếu kiểm kê nào</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </>
)}
```

- [ ] **Step 6: Thêm stub function `openStockTakingDetail` + `printStockTaking`**

Gần các function khác, thêm (stub — sẽ hoàn thiện ở Task 8 + 9):

```javascript
const openStockTakingDetail = async (id) => {
    const res = await fetch(`/api/stock-takings/${id}`);
    const d = await res.json();
    setStDetail(d);
    setStDetailItems((d.items || []).map(it => ({
        ...it,
        countedInput: it.countedStock !== null ? String(it.countedStock) : '',
    })));
    setStDetailFilter('all');
    setStDetailSearch('');
};

const printStockTaking = async (id) => {
    // Will implement in Task 9
    alert('In phiếu kiểm kê — sẽ làm ở task sau');
};
```

- [ ] **Step 7: Build check**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 8: Commit**

```bash
cd d:/Codeapp/motnha && git add app/inventory/page.js
git commit -m "feat(inventory-ui): thêm tab Kiểm kê + list phiếu"
```

---

## Task 7: UI — Modal tạo phiếu (3 chế độ chọn SP)

**Files:**
- Modify: `app/inventory/page.js`

- [ ] **Step 1: Thêm submit function**

Gần các function, thêm:

```javascript
const submitCreateStockTaking = async () => {
    if (!stForm.warehouseId) return alert('Chọn kho');
    const productsInWh = stockData.products.filter(p => p.warehouseId === stForm.warehouseId);
    let productIds = null; // null → all
    if (stForm.mode === 'category') {
        if (stForm.selectedCategories.length === 0) return alert('Chọn ít nhất 1 danh mục');
        productIds = productsInWh.filter(p => stForm.selectedCategories.includes(p.category)).map(p => p.id);
    } else if (stForm.mode === 'manual') {
        if (stForm.selectedProductIds.length === 0) return alert('Chọn ít nhất 1 SP');
        productIds = stForm.selectedProductIds;
    }
    if (productIds !== null && productIds.length === 0) {
        return alert('Không có SP nào khớp điều kiện');
    }
    setStCreateSaving(true);
    const res = await fetch('/api/stock-takings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            warehouseId: stForm.warehouseId,
            note: stForm.note,
            productIds,
        }),
    });
    setStCreateSaving(false);
    if (!res.ok) { const e = await res.json(); return alert(e.error || 'Lỗi tạo phiếu'); }
    const created = await res.json();
    setStShowCreate(false);
    fetchStockTakings();
    // Auto-open detail
    openStockTakingDetail(created.id);
};
```

- [ ] **Step 2: Render modal tạo phiếu**

Ở cuối phần JSX trả về của component (cạnh các modal khác), thêm:

```javascript
{stShowCreate && (
    <div className="modal-overlay" onClick={() => setStShowCreate(false)}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
                <h3>Tạo phiếu kiểm kê</h3>
                <button className="modal-close" onClick={() => setStShowCreate(false)}>×</button>
            </div>
            <div className="modal-body">
                <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="form-label">Kho *</label>
                    <select className="form-select" value={stForm.warehouseId} onChange={e => setStForm({ ...stForm, warehouseId: e.target.value, selectedCategories: [], selectedProductIds: [] })}>
                        <option value="">— Chọn kho —</option>
                        {txData.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="form-label">Ghi chú</label>
                    <input className="form-input" value={stForm.note} onChange={e => setStForm({ ...stForm, note: e.target.value })} placeholder="VD: Kiểm kê cuối tháng 4" />
                </div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="form-label">Chọn SP để kiểm kê</label>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        {[
                            { v: 'all', label: 'Tất cả SP trong kho' },
                            { v: 'category', label: 'Theo danh mục' },
                            { v: 'manual', label: 'Chọn thủ công' },
                        ].map(opt => (
                            <button key={opt.v} type="button"
                                className={`btn btn-sm ${stForm.mode === opt.v ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setStForm({ ...stForm, mode: opt.v })}>
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {stForm.mode === 'category' && stForm.warehouseId && (
                        <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6, padding: 8 }}>
                            {[...new Set(stockData.products.filter(p => p.warehouseId === stForm.warehouseId).map(p => p.category).filter(Boolean))].sort().map(cat => (
                                <label key={cat} style={{ display: 'block', padding: 4, cursor: 'pointer' }}>
                                    <input type="checkbox"
                                        checked={stForm.selectedCategories.includes(cat)}
                                        onChange={e => {
                                            const next = e.target.checked
                                                ? [...stForm.selectedCategories, cat]
                                                : stForm.selectedCategories.filter(c => c !== cat);
                                            setStForm({ ...stForm, selectedCategories: next });
                                        }}
                                    />
                                    <span style={{ marginLeft: 6 }}>{cat}</span>
                                </label>
                            ))}
                        </div>
                    )}

                    {stForm.mode === 'manual' && stForm.warehouseId && (
                        <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6, padding: 8 }}>
                            {stockData.products.filter(p => p.warehouseId === stForm.warehouseId).map(p => (
                                <label key={p.id} style={{ display: 'block', padding: 3, cursor: 'pointer', fontSize: 12 }}>
                                    <input type="checkbox"
                                        checked={stForm.selectedProductIds.includes(p.id)}
                                        onChange={e => {
                                            const next = e.target.checked
                                                ? [...stForm.selectedProductIds, p.id]
                                                : stForm.selectedProductIds.filter(id => id !== p.id);
                                            setStForm({ ...stForm, selectedProductIds: next });
                                        }}
                                    />
                                    <span style={{ marginLeft: 6 }}>{p.name} <span style={{ color: 'var(--text-muted)' }}>({p.code}) — tồn: {p.stock}</span></span>
                                </label>
                            ))}
                        </div>
                    )}

                    {(() => {
                        if (!stForm.warehouseId) return null;
                        const whProducts = stockData.products.filter(p => p.warehouseId === stForm.warehouseId);
                        let count = 0;
                        if (stForm.mode === 'all') count = whProducts.length;
                        else if (stForm.mode === 'category') count = whProducts.filter(p => stForm.selectedCategories.includes(p.category)).length;
                        else if (stForm.mode === 'manual') count = stForm.selectedProductIds.length;
                        return <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Sẽ kiểm kê: <strong>{count}</strong> SP</div>;
                    })()}
                </div>
            </div>
            <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setStShowCreate(false)}>Hủy</button>
                <button className="btn btn-primary" onClick={submitCreateStockTaking} disabled={stCreateSaving}>
                    {stCreateSaving ? 'Đang tạo...' : 'Tạo phiếu'}
                </button>
            </div>
        </div>
    </div>
)}
```

- [ ] **Step 3: Build check**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
cd d:/Codeapp/motnha && git add app/inventory/page.js
git commit -m "feat(inventory-ui): modal tạo phiếu kiểm kê với 3 chế độ chọn SP"
```

---

## Task 8: UI — Modal chi tiết phiếu (nhập số thực + save nháp)

**Files:**
- Modify: `app/inventory/page.js`

- [ ] **Step 1: Thêm save draft function**

```javascript
const saveStockTakingDraft = async () => {
    if (!stDetail) return;
    setStDetailSaving(true);
    const res = await fetch(`/api/stock-takings/${stDetail.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            items: stDetailItems.map(it => ({
                id: it.id,
                countedStock: it.countedInput === '' ? null : Number(it.countedInput),
                note: it.note || '',
            })),
        }),
    });
    setStDetailSaving(false);
    if (!res.ok) { const e = await res.json(); return alert(e.error || 'Lỗi lưu'); }
    const updated = await res.json();
    setStDetail(updated);
    setStDetailItems((updated.items || []).map(it => ({
        ...it,
        countedInput: it.countedStock !== null ? String(it.countedStock) : '',
    })));
    fetchStockTakings();
};

const deleteStockTaking = async () => {
    if (!stDetail) return;
    if (!confirm(`Xóa phiếu kiểm kê ${stDetail.code}?`)) return;
    const res = await fetch(`/api/stock-takings/${stDetail.id}`, { method: 'DELETE' });
    if (!res.ok) { const e = await res.json(); return alert(e.error || 'Lỗi xóa'); }
    setStDetail(null);
    fetchStockTakings();
};
```

- [ ] **Step 2: Render detail modal (draft state)**

Cuối JSX (cạnh các modal khác), thêm:

```javascript
{stDetail && (
    <div className="modal-overlay" onClick={() => setStDetail(null)}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 900, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
                <h3>📋 Phiếu kiểm kê {stDetail.code}
                    <span className="badge" style={{ marginLeft: 10, fontSize: 11, padding: '2px 8px',
                        background: stDetail.status === 'Hoàn thành' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                        color: stDetail.status === 'Hoàn thành' ? 'var(--status-success)' : 'var(--status-warning)',
                    }}>{stDetail.status}</span>
                </h3>
                <button className="modal-close" onClick={() => setStDetail(null)}>×</button>
            </div>
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                    Kho: <strong>{stDetail.warehouse?.name}</strong>
                    &nbsp;|&nbsp; Ngày tạo: <strong>{fmtDate(stDetail.createdAt)}</strong>
                    {stDetail.note && <> &nbsp;|&nbsp; Ghi chú: <strong>{stDetail.note}</strong></>}
                </div>

                {(() => {
                    const total = stDetailItems.length;
                    const counted = stDetailItems.filter(it => it.countedInput !== '').length;
                    const diff = stDetailItems.filter(it => it.countedInput !== '' && Number(it.countedInput) !== it.systemStock).length;
                    return (
                        <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 13 }}>
                            <div>Đã đếm: <strong>{counted}/{total}</strong></div>
                            <div>Chênh lệch: <strong style={{ color: diff > 0 ? 'var(--status-warning)' : 'var(--text-muted)' }}>{diff} mã</strong></div>
                        </div>
                    );
                })()}

                <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <input className="form-input" placeholder="Tìm SP..." value={stDetailSearch} onChange={e => setStDetailSearch(e.target.value)} style={{ maxWidth: 240 }} />
                    <select className="form-select" value={stDetailFilter} onChange={e => setStDetailFilter(e.target.value)} style={{ maxWidth: 180 }}>
                        <option value="all">Tất cả</option>
                        <option value="uncounted">Chưa đếm</option>
                        <option value="diff">Có chênh lệch</option>
                    </select>
                </div>

                <table className="data-table" style={{ fontSize: 12 }}>
                    <thead>
                        <tr>
                            <th>SP</th>
                            <th>ĐVT</th>
                            <th style={{ textAlign: 'right' }}>Hệ thống</th>
                            <th style={{ textAlign: 'center' }}>Số thực</th>
                            <th style={{ textAlign: 'right' }}>Chênh lệch</th>
                            <th>Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stDetailItems
                            .filter(it => {
                                if (stDetailFilter === 'uncounted' && it.countedInput !== '') return false;
                                if (stDetailFilter === 'diff') {
                                    if (it.countedInput === '') return false;
                                    if (Number(it.countedInput) === it.systemStock) return false;
                                }
                                if (stDetailSearch && !it.product?.name?.toLowerCase().includes(stDetailSearch.toLowerCase()) && !it.product?.code?.toLowerCase().includes(stDetailSearch.toLowerCase())) return false;
                                return true;
                            })
                            .map(it => {
                                const i = stDetailItems.findIndex(x => x.id === it.id);
                                const delta = it.countedInput === '' ? null : Number(it.countedInput) - it.systemStock;
                                const readonly = stDetail.status !== 'Nháp';
                                return (
                                    <tr key={it.id}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{it.product?.name || '(Đã xóa)'}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{it.product?.code}</div>
                                        </td>
                                        <td>{it.product?.unit}</td>
                                        <td style={{ textAlign: 'right' }}>{it.systemStock}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            {readonly ? (
                                                it.countedStock !== null ? it.countedStock : '—'
                                            ) : (
                                                <input className="form-input form-input-compact" type="number" min="0" style={{ width: 80, textAlign: 'center' }}
                                                    value={it.countedInput}
                                                    onChange={e => setStDetailItems(prev => prev.map((x, idx) => idx === i ? { ...x, countedInput: e.target.value } : x))}
                                                />
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: delta === null ? 'var(--text-muted)' : (delta > 0 ? 'var(--status-success)' : delta < 0 ? 'var(--status-danger)' : 'var(--text-muted)') }}>
                                            {delta === null ? '—' : (delta > 0 ? `+${delta}` : delta)}
                                        </td>
                                        <td>
                                            {readonly ? (it.note || '') : (
                                                <input className="form-input form-input-compact" style={{ fontSize: 12 }}
                                                    value={it.note || ''}
                                                    onChange={e => setStDetailItems(prev => prev.map((x, idx) => idx === i ? { ...x, note: e.target.value } : x))}
                                                />
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                    </tbody>
                </table>
            </div>
            <div className="modal-footer">
                {stDetail.status === 'Nháp' ? (
                    <>
                        <button className="btn btn-ghost" style={{ color: 'var(--status-danger)' }} onClick={deleteStockTaking}>🗑️ Xóa phiếu</button>
                        <div style={{ flex: 1 }} />
                        <button className="btn btn-ghost" onClick={() => setStDetail(null)}>Đóng</button>
                        <button className="btn btn-ghost" onClick={saveStockTakingDraft} disabled={stDetailSaving}>
                            {stDetailSaving ? 'Đang lưu...' : '💾 Lưu nháp'}
                        </button>
                        <button className="btn btn-primary" onClick={completeStockTaking} disabled={stDetailSaving}>✅ Chốt phiếu</button>
                    </>
                ) : (
                    <>
                        <button className="btn btn-ghost btn-sm" onClick={() => printStockTaking(stDetail.id)}>🖨️ In phiếu</button>
                        <div style={{ flex: 1 }} />
                        <button className="btn btn-primary" onClick={() => setStDetail(null)}>Đóng</button>
                    </>
                )}
            </div>
        </div>
    </div>
)}
```

- [ ] **Step 3: Build check**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: `✓ Compiled successfully`.

(Note: `completeStockTaking` chưa định nghĩa — sẽ làm ở Task 9. Build sẽ báo lỗi "is not defined" ở runtime nhưng compile OK vì JSX không validate.)

- [ ] **Step 4: Commit**

```bash
cd d:/Codeapp/motnha && git add app/inventory/page.js
git commit -m "feat(inventory-ui): modal chi tiết phiếu kiểm kê + lưu nháp"
```

---

## Task 9: UI — Complete flow + print

**Files:**
- Modify: `app/inventory/page.js`

- [ ] **Step 1: Thêm `completeStockTaking`**

Gần `saveStockTakingDraft`:

```javascript
const completeStockTaking = async () => {
    if (!stDetail) return;
    const toCount = stDetailItems.filter(it => it.countedInput !== '');
    const diffCount = toCount.filter(it => Number(it.countedInput) !== it.systemStock).length;
    const uncounted = stDetailItems.length - toCount.length;

    if (toCount.length === 0) return alert('Nhập ít nhất 1 SP trước khi chốt');

    const msg = `Chốt phiếu kiểm kê ${stDetail.code}?\n\n` +
        `• ${diffCount} SP có chênh lệch → cập nhật stock\n` +
        `• ${uncounted} SP chưa đếm → bỏ qua (không đụng stock)\n\n` +
        `Thao tác này không thể hoàn tác.`;
    if (!confirm(msg)) return;

    // Save draft trước, rồi complete
    setStDetailSaving(true);
    const saveRes = await fetch(`/api/stock-takings/${stDetail.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            items: stDetailItems.map(it => ({
                id: it.id,
                countedStock: it.countedInput === '' ? null : Number(it.countedInput),
                note: it.note || '',
            })),
        }),
    });
    if (!saveRes.ok) {
        setStDetailSaving(false);
        const e = await saveRes.json();
        return alert(e.error || 'Lỗi lưu nháp');
    }

    const res = await fetch(`/api/stock-takings/${stDetail.id}/complete`, { method: 'POST' });
    setStDetailSaving(false);
    if (!res.ok) { const e = await res.json(); return alert(e.error || 'Lỗi chốt phiếu'); }
    const updated = await res.json();
    setStDetail(updated);
    setStDetailItems((updated.items || []).map(it => ({
        ...it,
        countedInput: it.countedStock !== null ? String(it.countedStock) : '',
    })));
    fetchStockTakings();
    fetchStock(); // refresh tồn kho
    alert('✅ Đã chốt phiếu kiểm kê! Stock đã được cập nhật.');
};
```

- [ ] **Step 2: Thay `printStockTaking` stub bằng bản đầy đủ**

Thay function cũ (đang chỉ alert) bằng:

```javascript
const printStockTaking = async (id) => {
    const res = await fetch(`/api/stock-takings/${id}`);
    const st = await res.json();
    if (!st || !st.items) return alert('Không tải được phiếu');

    const win = window.open('', '_blank');
    win.document.write(`
        <html><head><title>Phiếu kiểm kê ${st.code}</title>
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
        <h2>PHIẾU KIỂM KÊ KHO</h2>
        <div class="sub">Mã: ${st.code} | Kho: ${st.warehouse?.name || ''} | Ngày: ${new Date(st.createdAt).toLocaleDateString('vi-VN')}</div>
        <p><strong>Trạng thái:</strong> ${st.status} ${st.completedAt ? ` (Hoàn thành: ${new Date(st.completedAt).toLocaleDateString('vi-VN')})` : ''}</p>
        ${st.note ? `<p><strong>Ghi chú:</strong> ${st.note}</p>` : ''}
        <table>
            <thead><tr><th>#</th><th>Tên SP</th><th>ĐVT</th><th>Hệ thống</th><th>Thực tế</th><th>Chênh lệch</th><th>Ghi chú</th></tr></thead>
            <tbody>
                ${(st.items || []).map((it, i) => {
                    const delta = it.countedStock === null ? '—' : (it.countedStock - it.systemStock);
                    const deltaStr = delta === '—' ? '—' : (delta > 0 ? `+${delta}` : delta);
                    return `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${it.product?.name || '(Đã xóa)'}</td>
                            <td>${it.product?.unit || ''}</td>
                            <td style="text-align:right">${it.systemStock}</td>
                            <td style="text-align:right">${it.countedStock !== null ? it.countedStock : '—'}</td>
                            <td style="text-align:right">${deltaStr}</td>
                            <td>${it.note || ''}</td>
                        </tr>`;
                }).join('')}
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
```

- [ ] **Step 3: Build check**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
cd d:/Codeapp/motnha && git add app/inventory/page.js
git commit -m "feat(inventory-ui): chốt phiếu kiểm kê + in phiếu"
```

---

## Task 10: E2E smoke test + push

- [ ] **Step 1: Manual test**

```bash
cd d:/Codeapp/motnha && npm run dev
```

1. Vào `/inventory` → tab "📋 Kiểm kê" → table rỗng
2. Bấm "+ Tạo phiếu kiểm kê" → chọn Kho Ngô Hùng, mode "Tất cả SP trong kho" → Tạo phiếu
3. Modal chi tiết mở, có list SP với "Số hệ thống" có sẵn, "Số thực" trống
4. Nhập vài số thực (1 SP đúng y hệ thống, 1 SP cao hơn, 1 SP thấp hơn)
5. "💾 Lưu nháp" → đóng modal, list refresh, thấy `Đã đếm: 3/X`
6. Mở lại phiếu → số đã lưu vẫn giữ
7. "✅ Chốt phiếu" → confirm dialog → OK → alert "Đã chốt"
8. Tab Tồn kho → kiểm stock của SP vừa kiểm → khớp số thực
9. Tab Lịch sử nhập/xuất → có các bản ghi type "Điều chỉnh" với code DC###
10. Tab Kiểm kê → phiếu status "Hoàn thành"
11. Bấm 🖨️ → preview phiếu mở, in được

- [ ] **Step 2: Test các chế độ tạo khác**

1. Tạo phiếu mode "Theo danh mục" → chọn 1 danh mục → verify chỉ SP đó trong phiếu
2. Tạo phiếu mode "Chọn thủ công" → tick 2 SP → verify chỉ 2 SP trong phiếu

- [ ] **Step 3: Test edge cases**

1. Tạo phiếu kho rỗng → API trả 400 "không có SP nào"
2. Chốt phiếu chưa đếm SP nào → 400 "Nhập ít nhất 1 SP"
3. Xóa phiếu Nháp → OK
4. Thử xóa phiếu Hoàn thành → 422 lỗi

- [ ] **Step 4: Final build**

```bash
cd d:/Codeapp/motnha && npm run build
```

Expected: Build success.

- [ ] **Step 5: Push**

```bash
cd d:/Codeapp/motnha && git push origin main
```

- [ ] **Step 6: Commit fixup nếu có**

Nếu smoke test phát hiện bug → fix, commit với prefix `fix(stock-taking): ...` rồi push.
