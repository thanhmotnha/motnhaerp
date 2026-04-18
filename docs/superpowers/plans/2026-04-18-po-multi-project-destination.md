# PO Multi-Project Destination & Materials Report — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép mỗi dòng PO đi tới 1 đích riêng (kho hoặc 1 dự án), form Nhận hàng tự nhóm theo đích, và tab Vật tư ở trang dự án hiển thị báo cáo tổng hợp (đã đặt / đã nhận / đã dùng / còn thiếu từ nhiều nguồn).

**Architecture:** Thêm `projectId?` trên `PurchaseOrderItem`. PO form có toggle 3 mode (Nhập kho / Giao 1 dự án / Chia nhiều dự án). Refactor `/api/purchase-orders/[id]/receive` thành unified endpoint xử lý mixed items (kho + dự án) trong 1 transaction. Thêm API `/api/projects/[id]/materials-report` gộp data từ POItem, MaterialPlan, StockIssue cho tab Vật tư.

**Tech Stack:** Next.js 16 App Router, Prisma 6, PostgreSQL, React 19, Zod 4.

---

## File Map

| File | Trách nhiệm |
|------|-------------|
| `prisma/schema.prisma` | Thêm `projectId` + relation + index trên `PurchaseOrderItem` |
| `prisma/migrations/20260418100000_po_item_project_id/migration.sql` | ALTER + backfill PO cũ |
| `lib/validations/purchaseOrder.js` | Schema nhận `items[].projectId` optional |
| `app/api/purchase-orders/route.js` | POST persist `projectId` per item |
| `app/api/purchase-orders/[id]/route.js` | PUT preserve `projectId` per item |
| `app/api/purchase-orders/[id]/receive/route.js` | Unified receive: xử lý mixed items (kho + project) trong 1 `$transaction` |
| `app/purchasing/page.js` | Toggle 3 mode PO + cột "Giao đến" + form Nhận hàng nhóm theo đích |
| `app/api/projects/[id]/materials-report/route.js` | **Mới** — gộp data báo cáo vật tư dự án |
| `app/projects/[id]/tabs/MaterialTab.js` | Rewrite thành báo cáo tổng hợp 5 stat + table đa nguồn |

---

## Task 1: Schema — Thêm projectId vào PurchaseOrderItem

**Files:**
- Modify: `prisma/schema.prisma` (model `PurchaseOrderItem` ~line 915)
- Create: `prisma/migrations/20260418100000_po_item_project_id/migration.sql`

- [ ] **Step 1: Thêm field `projectId` + relation + index vào schema**

Tìm block `model PurchaseOrderItem` (line 915) và sửa:

```prisma
model PurchaseOrderItem {
  id                   String              @id @default(cuid())
  productName          String
  unit                 String              @default("")
  quantity             Float               @default(0)
  unitPrice            Float               @default(0)
  amount               Float               @default(0)
  receivedQty          Float               @default(0)
  notes                String              @default("")
  variantLabel         String              @default("")
  productId            String?
  purchaseOrderId      String
  materialPlanId       String?
  furnitureOrderItemId String?
  projectId            String?
  furnitureOrderItem   FurnitureOrderItem? @relation(fields: [furnitureOrderItemId], references: [id])
  materialPlan         MaterialPlan?       @relation(fields: [materialPlanId], references: [id])
  purchaseOrder        PurchaseOrder       @relation(fields: [purchaseOrderId], references: [id])
  project              Project?            @relation("PurchaseOrderItemProject", fields: [projectId], references: [id])
  receipts             GoodsReceiptItem[]

  @@index([purchaseOrderId])
  @@index([materialPlanId])
  @@index([projectId])
}
```

- [ ] **Step 2: Thêm back-relation trong model `Project`**

Tìm `model Project` (khoảng line 80–200). Tìm block các relations của Project, thêm dòng:

```prisma
purchaseOrderItems    PurchaseOrderItem[]   @relation("PurchaseOrderItemProject")
```

Đặt gần các relation khác của PO/MaterialPlan trong Project model. Giữ alphabetical hoặc theo vị trí logic.

- [ ] **Step 3: Tạo migration SQL thủ công**

Tạo file `prisma/migrations/20260418100000_po_item_project_id/migration.sql`:

```sql
-- Add projectId column
ALTER TABLE "PurchaseOrderItem" ADD COLUMN "projectId" TEXT;

-- Add foreign key
ALTER TABLE "PurchaseOrderItem"
  ADD CONSTRAINT "PurchaseOrderItem_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index
CREATE INDEX "PurchaseOrderItem_projectId_idx" ON "PurchaseOrderItem"("projectId");

-- Backfill: PO cũ "Giao thẳng dự án" → copy projectId xuống items
UPDATE "PurchaseOrderItem" poi
SET "projectId" = po."projectId"
FROM "PurchaseOrder" po
WHERE poi."purchaseOrderId" = po.id
  AND po."deliveryType" = 'Giao thẳng dự án'
  AND po."projectId" IS NOT NULL;
```

- [ ] **Step 4: Chạy migration**

```bash
npm install
npm run db:migrate
```

Expected: Output có dòng `Applied 1 migration` hoặc `Database is now in sync with your schema.` Không có lỗi.

- [ ] **Step 5: Verify backfill (nếu có PO cũ)**

```bash
npm run db:studio
```

Mở Prisma Studio, vào bảng `PurchaseOrderItem`, filter `projectId != null`. Nếu trong DB có PO cũ với `deliveryType='Giao thẳng dự án'` → các item của PO đó phải có `projectId` matches PO.projectId. Đóng Studio.

- [ ] **Step 6: Regenerate Prisma client**

```bash
npm run db:generate
```

Expected: `✔ Generated Prisma Client`, không lỗi.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260418100000_po_item_project_id/
git commit -m "feat(schema): thêm projectId per PurchaseOrderItem + backfill"
```

---

## Task 2: Validation — Schema nhận items[].projectId

**Files:**
- Modify: `lib/validations/purchaseOrder.js`

- [ ] **Step 1: Thêm `projectId` vào `purchaseOrderItemSchema`**

Tìm `purchaseOrderItemSchema` trong file. Thay block hiện tại:

```javascript
const purchaseOrderItemSchema = z.object({
    productName: z.string().trim().min(1, 'Tên sản phẩm bắt buộc'),
    unit: optStr,
    quantity: optFloat,
    unitPrice: optFloat,
    amount: optFloat,
    receivedQty: optFloat,
    notes: optStr,
    variantLabel: optStr,
    productId: z.string().optional().nullable().default(null),
    materialPlanId: z.string().optional().nullable().default(null),
});
```

Bằng:

```javascript
const purchaseOrderItemSchema = z.object({
    productName: z.string().trim().min(1, 'Tên sản phẩm bắt buộc'),
    unit: optStr,
    quantity: optFloat,
    unitPrice: optFloat,
    amount: optFloat,
    receivedQty: optFloat,
    notes: optStr,
    variantLabel: optStr,
    productId: z.string().optional().nullable().default(null),
    materialPlanId: z.string().optional().nullable().default(null),
    projectId: z.string().optional().nullable().default(null),
});
```

- [ ] **Step 2: Build check**

```bash
npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: `✓ Compiled successfully`, không có validation error.

- [ ] **Step 3: Commit**

```bash
git add lib/validations/purchaseOrder.js
git commit -m "feat(validation): accept projectId per PO item"
```

---

## Task 3: PO Create API — Persist projectId per item

**Files:**
- Modify: `app/api/purchase-orders/route.js` (POST handler, block `prisma.purchaseOrder.create`)

- [ ] **Step 1: Sửa `items: { create }` để pass-through projectId**

Tìm trong POST handler đoạn `const order = await prisma.purchaseOrder.create({`. Trong `data`, phần `items: items ? { create: items } : undefined,` — Zod schema đã parse `items[].projectId` thành `null` mặc định, nên Prisma sẽ persist đúng. KHÔNG cần sửa code ở đây.

Tuy nhiên **cần resolve issue**: nếu `items[].projectId` chứa string rỗng hoặc invalid cuid, Prisma sẽ fail. Thêm normalize:

Thay:

```javascript
const order = await prisma.purchaseOrder.create({
    data: {
        code,
        supplier: poData.supplier,
        supplierId: poData.supplierId || null,
        totalAmount: poData.totalAmount,
        paidAmount: poData.paidAmount,
        status,
        notes: poData.notes,
        projectId: poData.projectId || null,
        quotationId: poData.quotationId || null,
        deliveryAddress: poData.deliveryAddress || '',
        deliveryType: poData.deliveryType || 'Giao thẳng dự án',
        orderDate: poData.orderDate || new Date(),
        deliveryDate: poData.deliveryDate || null,
        receivedDate: poData.receivedDate || null,
        items: items ? { create: items } : undefined,
    },
    include: { items: true, project: { select: { name: true, code: true } } },
});
```

Bằng:

```javascript
const normalizedItems = items?.map(it => ({
    ...it,
    projectId: it.projectId || null,
    productId: it.productId || null,
    materialPlanId: it.materialPlanId || null,
}));

const order = await prisma.purchaseOrder.create({
    data: {
        code,
        supplier: poData.supplier,
        supplierId: poData.supplierId || null,
        totalAmount: poData.totalAmount,
        paidAmount: poData.paidAmount,
        status,
        notes: poData.notes,
        projectId: poData.projectId || null,
        quotationId: poData.quotationId || null,
        deliveryAddress: poData.deliveryAddress || '',
        deliveryType: poData.deliveryType || 'Giao thẳng dự án',
        orderDate: poData.orderDate || new Date(),
        deliveryDate: poData.deliveryDate || null,
        receivedDate: poData.receivedDate || null,
        items: normalizedItems ? { create: normalizedItems } : undefined,
    },
    include: { items: true, project: { select: { name: true, code: true } } },
});
```

- [ ] **Step 2: Test thủ công qua API**

Chạy dev server:

```bash
npm run dev
```

Trong browser console hoặc curl, POST test:

```bash
curl -X POST http://localhost:3000/api/purchase-orders \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{
    "supplier": "TEST NCC",
    "items": [
      { "productName": "Ván test", "quantity": 10, "unitPrice": 100, "amount": 1000, "projectId": null }
    ]
  }'
```

Expected: Response 200 có `items[0].projectId = null`. Nếu thay `null` bằng 1 projectId hợp lệ từ DB, response sẽ có projectId đó.

- [ ] **Step 3: Commit**

```bash
git add app/api/purchase-orders/route.js
git commit -m "feat(po-api): persist projectId per item when creating PO"
```

---

## Task 4: PO Update API — Preserve projectId per item

**Files:**
- Modify: `app/api/purchase-orders/[id]/route.js` (PUT handler — block update items)

- [ ] **Step 1: Đọc file để tìm cách items update**

```bash
grep -n "items" app/api/purchase-orders/\[id\]/route.js | head -30
```

Tìm đoạn trong PUT handler mà xử lý update items. PUT handler thường xóa items cũ → tạo mới, hoặc update từng cái.

- [ ] **Step 2: Thêm projectId vào payload items khi tạo mới/update**

Trong PUT handler, tại mọi chỗ `tx.purchaseOrderItem.create(...)` hoặc `tx.purchaseOrderItem.update(...)`, đảm bảo `projectId` được pass-through. Nếu có pattern map items:

```javascript
const itemsToCreate = newItems.map(it => ({
    productName: it.productName,
    unit: it.unit || '',
    quantity: Number(it.quantity) || 0,
    unitPrice: Number(it.unitPrice) || 0,
    amount: Number(it.amount) || 0,
    notes: it.notes || '',
    variantLabel: it.variantLabel || '',
    productId: it.productId || null,
    materialPlanId: it.materialPlanId || null,
    purchaseOrderId: id,
}));
```

→ Sửa thành:

```javascript
const itemsToCreate = newItems.map(it => ({
    productName: it.productName,
    unit: it.unit || '',
    quantity: Number(it.quantity) || 0,
    unitPrice: Number(it.unitPrice) || 0,
    amount: Number(it.amount) || 0,
    notes: it.notes || '',
    variantLabel: it.variantLabel || '',
    productId: it.productId || null,
    materialPlanId: it.materialPlanId || null,
    projectId: it.projectId || null,
    purchaseOrderId: id,
}));
```

Nếu có pattern update (giữ existing items):

```javascript
await tx.purchaseOrderItem.update({
    where: { id: existing.id },
    data: { /* fields */ },
});
```

→ Thêm `projectId: it.projectId || null,` vào `data`.

- [ ] **Step 3: Block update khi PO đã có GRN**

Tìm đầu PUT handler, thêm check sau khi parse body và trước block `$transaction`:

```javascript
const hasReceipts = await prisma.goodsReceipt.count({ where: { purchaseOrderId: id } });
const hasMaterialPlanReceipts = await prisma.purchaseOrderItem.count({
    where: { purchaseOrderId: id, receivedQty: { gt: 0 } },
});

if ((hasReceipts > 0 || hasMaterialPlanReceipts > 0) && updateData.items !== undefined) {
    return NextResponse.json({
        error: 'PO đã có phiếu nhận — không được sửa danh sách sản phẩm. Hủy phiếu nhận trước nếu cần.',
    }, { status: 422 });
}
```

> Note: cho phép sửa các field khác của PO (notes, deliveryDate), chỉ block thay đổi `items` sau khi đã nhận.

- [ ] **Step 4: Build check**

```bash
npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 5: Commit**

```bash
git add app/api/purchase-orders/\[id\]/route.js
git commit -m "feat(po-api): preserve projectId per item on PUT + block item edit after GRN"
```

---

## Task 5: Unified Receive API — Mixed items in 1 transaction

**Files:**
- Modify: `app/api/purchase-orders/[id]/receive/route.js` (refactor toàn file)

- [ ] **Step 1: Thiết kế request payload mới**

API sẽ nhận payload:

```json
{
  "items": [
    { "id": "poItemId1", "receivedQty": 10 },
    { "id": "poItemId2", "receivedQty": 5 }
  ],
  "warehouseId": "whId",
  "receivedBy": "Tên người",
  "receivedDate": "2026-04-18",
  "note": "Ghi chú"
}
```

- `warehouseId` bắt buộc nếu có ít nhất 1 item có `poItem.projectId = null`
- Items có `projectId` set → update MaterialPlan + tạo ProjectExpense (không dùng warehouseId)
- Items có `projectId = null` → tạo GoodsReceipt + update Product.stock (dùng warehouseId)
- Tất cả trong 1 `$transaction`

- [ ] **Step 2: Rewrite toàn bộ file `receive/route.js`**

Thay toàn file:

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';

// POST /api/purchase-orders/[id]/receive
// Unified receive: handle mixed items (warehouse + project) in 1 transaction
// Body: { items: [{ id, receivedQty }], warehouseId?, receivedBy?, receivedDate?, note? }
export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const { items, warehouseId, receivedBy, receivedDate, note } = await request.json();

    if (!items?.length) return NextResponse.json({ error: 'Không có item nào' }, { status: 400 });

    const po = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: { items: true, project: { select: { id: true, name: true, code: true } } },
    });
    if (!po) return NextResponse.json({ error: 'PO không tồn tại' }, { status: 404 });

    // Split items by destination
    const validItems = items.filter(it => Number(it.receivedQty) > 0);
    if (!validItems.length) return NextResponse.json({ error: 'Nhập số lượng > 0 cho ít nhất 1 sản phẩm' }, { status: 400 });

    const warehouseItems = [];
    const projectItemsByProject = {}; // { projectId: [{poItem, delta}] }

    for (const recv of validItems) {
        const poItem = po.items.find(i => i.id === recv.id);
        if (!poItem) continue;
        const delta = Number(recv.receivedQty);
        if (poItem.projectId) {
            if (!projectItemsByProject[poItem.projectId]) projectItemsByProject[poItem.projectId] = [];
            projectItemsByProject[poItem.projectId].push({ poItem, delta });
        } else {
            warehouseItems.push({ poItem, delta });
        }
    }

    // Validation: if any warehouse items, warehouseId is required
    if (warehouseItems.length > 0 && !warehouseId) {
        return NextResponse.json({ error: 'Phải chọn kho cho các sản phẩm nhập kho' }, { status: 400 });
    }

    // Pre-generate codes outside transaction to avoid collisions
    let grnCode = null;
    if (warehouseItems.length > 0) {
        grnCode = await generateCode('goodsReceipt', 'PNK');
    }
    const expenseCodes = [];
    for (const projectId in projectItemsByProject) {
        for (const _ of projectItemsByProject[projectId]) {
            expenseCodes.push(await generateCode('projectExpense', 'CP'));
        }
    }
    let expenseCodeIdx = 0;

    // Pre-compute InventoryTransaction codes (sequential)
    const productWarehouseItems = warehouseItems.filter(w => w.poItem.productId);
    let txBaseMax = 0;
    if (productWarehouseItems.length > 0) {
        const maxResult = await prisma.$queryRawUnsafe(
            `SELECT COALESCE(MAX(CAST(REPLACE(code, $1, '') AS INTEGER)), 0) as max_num
             FROM "InventoryTransaction"
             WHERE code LIKE $2 AND REPLACE(code, $1, '') ~ '^[0-9]+$'`,
            'NK', 'NK%'
        );
        txBaseMax = Number(maxResult?.[0]?.max_num ?? 0);
    }
    let txCodeIdx = 0;

    await prisma.$transaction(async (tx) => {
        // === A) Warehouse section → GoodsReceipt + Product.stock + InventoryTransaction ===
        if (warehouseItems.length > 0) {
            await tx.goodsReceipt.create({
                data: {
                    code: grnCode,
                    purchaseOrderId: id,
                    warehouseId,
                    receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
                    receivedBy: receivedBy || '',
                    notes: note || '',
                    createdById: session.user.id,
                    items: {
                        create: warehouseItems.map(({ poItem, delta }) => ({
                            productId: poItem.productId,
                            productName: poItem.productName,
                            unit: poItem.unit,
                            qtyOrdered: poItem.quantity,
                            qtyReceived: delta,
                            unitPrice: poItem.unitPrice,
                            variantLabel: poItem.variantLabel || '',
                            purchaseOrderItemId: poItem.id,
                        })),
                    },
                },
            });

            for (const { poItem, delta } of warehouseItems) {
                if (poItem.productId) {
                    // Weighted average price
                    const product = await tx.product.findUnique({
                        where: { id: poItem.productId },
                        select: { stock: true, importPrice: true },
                    });
                    const oldStock = product?.stock ?? 0;
                    const oldPrice = product?.importPrice ?? 0;
                    const avgPrice = (oldStock + delta) > 0
                        ? (oldStock * oldPrice + delta * (poItem.unitPrice || 0)) / (oldStock + delta)
                        : (poItem.unitPrice || 0);

                    await tx.product.update({
                        where: { id: poItem.productId },
                        data: {
                            stock: { increment: delta },
                            importPrice: Math.round(avgPrice),
                        },
                    });

                    const txCode = `NK${String(txBaseMax + 1 + txCodeIdx).padStart(3, '0')}`;
                    txCodeIdx++;
                    await tx.inventoryTransaction.create({
                        data: {
                            code: txCode,
                            type: 'Nhập',
                            quantity: delta,
                            unit: poItem.unit,
                            note: `Phiếu nhập ${grnCode} — PO ${po.code}`,
                            productId: poItem.productId,
                            warehouseId,
                            projectId: null,
                            date: receivedDate ? new Date(receivedDate) : new Date(),
                        },
                    });
                }

                await tx.purchaseOrderItem.update({
                    where: { id: poItem.id },
                    data: { receivedQty: { increment: delta } },
                });
            }
        }

        // === B) Project sections → MaterialPlan + ProjectExpense ===
        for (const projectId in projectItemsByProject) {
            for (const { poItem, delta } of projectItemsByProject[projectId]) {
                // Update PO item received
                await tx.purchaseOrderItem.update({
                    where: { id: poItem.id },
                    data: { receivedQty: { increment: delta } },
                });

                // Update MaterialPlan (auto-create fallback if missing)
                if (poItem.materialPlanId) {
                    const plan = await tx.materialPlan.findUnique({ where: { id: poItem.materialPlanId } });
                    if (plan) {
                        const newReceivedQty = plan.receivedQty + delta;
                        const newStatus = newReceivedQty >= plan.quantity ? 'Đã nhận đủ'
                            : newReceivedQty > 0 ? 'Nhận một phần' : plan.status;
                        await tx.materialPlan.update({
                            where: { id: poItem.materialPlanId },
                            data: { receivedQty: { increment: delta }, status: newStatus },
                        });
                    }
                } else if (poItem.productId) {
                    // Fallback: create ad-hoc MaterialPlan if none linked
                    const existing = await tx.materialPlan.findFirst({
                        where: { projectId, productId: poItem.productId, isLocked: false },
                    });
                    if (existing) {
                        await tx.materialPlan.update({
                            where: { id: existing.id },
                            data: { receivedQty: { increment: delta } },
                        });
                    } else {
                        await tx.materialPlan.create({
                            data: {
                                projectId,
                                productId: poItem.productId,
                                quantity: 0,
                                receivedQty: delta,
                                orderedQty: 0,
                                unitPrice: poItem.unitPrice || 0,
                                totalAmount: delta * (poItem.unitPrice || 0),
                                status: 'Nhận một phần',
                                type: 'Phát sinh',
                                notes: `Auto từ PO ${po.code} (ngoài dự toán)`,
                            },
                        });
                    }
                }

                // Create ProjectExpense for direct-to-site cost
                if (poItem.unitPrice > 0) {
                    const expCode = expenseCodes[expenseCodeIdx++];
                    const amount = delta * poItem.unitPrice;
                    await tx.projectExpense.create({
                        data: {
                            code: expCode,
                            expenseType: 'Mua hàng',
                            description: `[GRN] ${poItem.productName} — ${po.code}`,
                            amount,
                            paidAmount: 0,
                            category: 'Vật tư',
                            status: 'Chờ thanh toán',
                            recipientType: 'supplier',
                            recipientName: po.supplier,
                            projectId,
                            notes: note || '',
                        },
                    });
                }
            }
        }

        // === C) Recalculate PO status ===
        const updatedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
        const allReceived = updatedItems.every(i => i.receivedQty >= i.quantity);
        const anyReceived = updatedItems.some(i => i.receivedQty > 0);
        const newStatus = allReceived ? 'Hoàn thành' : anyReceived ? 'Nhận một phần' : po.status;

        await tx.purchaseOrder.update({
            where: { id },
            data: {
                status: newStatus,
                receivedDate: allReceived ? new Date() : po.receivedDate,
            },
        });
    });

    // === D) Post-transaction: furniture order status (unchanged from old logic) ===
    const updatedPO = await prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true } });

    if (updatedPO.furnitureOrderId && updatedPO.status === 'Hoàn thành') {
        await prisma.furnitureMaterialOrder.updateMany({
            where: { purchaseOrderId: id },
            data: { status: 'RECEIVED' },
        });

        const furnitureOrderId = updatedPO.furnitureOrderId;
        const allMaterialOrders = await prisma.furnitureMaterialOrder.findMany({
            where: { furnitureOrderId },
        });
        const allReceived3 = ['VAN', 'NEP', 'ACRYLIC'].every(t =>
            allMaterialOrders.find(o => o.materialType === t && o.status === 'RECEIVED')
        );
        if (allReceived3) {
            const fo = await prisma.furnitureOrder.findUnique({ where: { id: furnitureOrderId }, select: { status: true } });
            if (fo && fo.status === 'material_ordered') {
                await prisma.furnitureOrder.update({
                    where: { id: furnitureOrderId },
                    data: { status: 'cnc_ready' },
                });
            }
        }
    }

    return NextResponse.json(updatedPO);
});
```

- [ ] **Step 3: Build check**

```bash
npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Test bằng curl — PO toàn kho**

Tạo 1 PO mode "Nhập kho" (tất cả items `projectId = null`) qua UI trước (để có data test). Lấy `poId` và `itemId` từ response, sau đó:

```bash
curl -X POST http://localhost:3000/api/purchase-orders/<poId>/receive \
  -H "Content-Type: application/json" \
  -H "Cookie: <session>" \
  -d '{
    "items": [{ "id": "<itemId>", "receivedQty": 5 }],
    "warehouseId": "<whId>",
    "receivedBy": "Test"
  }'
```

Expected: 200, response có `status: 'Nhận một phần'` hoặc `'Hoàn thành'`, `items[0].receivedQty` tăng. Verify qua Prisma Studio: `Product.stock` tăng +5, có `GoodsReceipt` mới, có `InventoryTransaction`.

- [ ] **Step 5: Test bằng curl — PO toàn dự án**

Tạo PO với items có `projectId` set → lấy itemId:

```bash
curl -X POST http://localhost:3000/api/purchase-orders/<poId>/receive \
  -H "Content-Type: application/json" \
  -H "Cookie: <session>" \
  -d '{
    "items": [{ "id": "<itemId>", "receivedQty": 5 }],
    "receivedBy": "Test"
  }'
```

Expected: 200, `MaterialPlan.receivedQty` tăng +5, có `ProjectExpense` mới. Không có `GoodsReceipt`, không đụng `Product.stock`.

- [ ] **Step 6: Test bằng curl — PO mixed**

Tạo PO có 2 items: 1 projectId null, 1 projectId set → nhận cả 2:

```bash
curl -X POST http://localhost:3000/api/purchase-orders/<poId>/receive \
  -H "Content-Type: application/json" \
  -H "Cookie: <session>" \
  -d '{
    "items": [
      { "id": "<item1Id>", "receivedQty": 3 },
      { "id": "<item2Id>", "receivedQty": 2 }
    ],
    "warehouseId": "<whId>"
  }'
```

Expected: 200, item1 → stock++, item2 → MaterialPlan.receivedQty++ và ProjectExpense. 1 transaction, rollback all nếu lỗi.

- [ ] **Step 7: Commit**

```bash
git add app/api/purchase-orders/\[id\]/receive/route.js
git commit -m "feat(po-receive): unified receive handles mixed warehouse + project items"
```

---

## Task 6: PO Form UI — 3-mode toggle + per-item destination

**Files:**
- Modify: `app/purchasing/page.js` (form tạo PO, khoảng line 583–700+)

- [ ] **Step 1: Thêm state cho `deliveryType` default "Giao 1 dự án"**

Tìm dòng `const [poForm, setPoForm] = useState(...)` (line 25). Đã có `deliveryType: 'Giao thẳng dự án'` — tốt. Không cần đổi state hiện tại.

Nhưng cần thêm 1 giá trị mới cho mode "Chia nhiều dự án". Dùng `deliveryType` với 3 giá trị: `'Nhập kho'`, `'Giao thẳng dự án'`, `'Chia nhiều'`.

- [ ] **Step 2: Sửa toggle UI từ 2 nút thành 3 nút**

Tìm block toggle (line 583–597):

```javascript
<div className="form-group" style={{ margin: 0 }}>
    <label className="form-label">Loại giao hàng *</label>
    <div style={{ display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {[
            { value: 'Giao thẳng dự án', label: '📍 Giao dự án' },
            { value: 'Nhập kho', label: '🏭 Nhập kho' },
        ].map(opt => (
            <button key={opt.value} type="button"
                style={{ flex: 1, padding: '7px 4px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: poForm.deliveryType === opt.value ? 'var(--primary)' : 'var(--bg-secondary)', color: poForm.deliveryType === opt.value ? '#fff' : 'var(--text-secondary)' }}
                onClick={() => setPoForm(f => ({ ...f, deliveryType: opt.value, projectId: opt.value === 'Nhập kho' ? '' : f.projectId, deliveryAddress: opt.value === 'Nhập kho' ? '' : f.deliveryAddress }))}>
                {opt.label}
            </button>
        ))}
    </div>
</div>
```

Thay bằng:

```javascript
<div className="form-group" style={{ margin: 0 }}>
    <label className="form-label">Loại giao hàng *</label>
    <div style={{ display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {[
            { value: 'Nhập kho', label: '🏭 Nhập kho' },
            { value: 'Giao thẳng dự án', label: '📍 Giao 1 dự án' },
            { value: 'Chia nhiều', label: '⚙️ Chia nhiều dự án' },
        ].map(opt => (
            <button key={opt.value} type="button"
                style={{ flex: 1, padding: '7px 4px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: poForm.deliveryType === opt.value ? 'var(--primary)' : 'var(--bg-secondary)', color: poForm.deliveryType === opt.value ? '#fff' : 'var(--text-secondary)' }}
                onClick={() => {
                    const next = opt.value;
                    const curr = poForm.deliveryType;
                    // When switching out of "Chia nhiều", warn if items already have per-item projectId
                    if (curr === 'Chia nhiều' && next !== 'Chia nhiều') {
                        const perItemSet = poItems.some(i => i.projectId);
                        if (perItemSet && !confirm('Các dự án đã chọn theo dòng sẽ bị ghi đè. Tiếp tục?')) return;
                    }
                    // Apply side-effects
                    setPoForm(f => ({
                        ...f,
                        deliveryType: next,
                        projectId: next === 'Nhập kho' ? '' : f.projectId,
                        deliveryAddress: next === 'Nhập kho' ? '' : f.deliveryAddress,
                    }));
                    // Reset per-item projectId khi chuyển khỏi "Chia nhiều"
                    if (next !== 'Chia nhiều') {
                        setPoItems(prev => prev.map(it => ({ ...it, projectId: null })));
                    }
                }}>
                {opt.label}
            </button>
        ))}
    </div>
</div>
```

- [ ] **Step 3: Thêm cột "Giao đến" cho items table (chỉ hiện khi mode "Chia nhiều")**

Tìm items table trong form modal tạo PO. Tìm `<thead>` của bảng items. Thêm conditional column:

Trước `</tr>` trong `<thead>`, thêm:

```javascript
{poForm.deliveryType === 'Chia nhiều' && <th style={{ width: 140 }}>Giao đến</th>}
```

Trong `<tbody>`, mỗi row item — trước `</tr>`, thêm cell:

```javascript
{poForm.deliveryType === 'Chia nhiều' && (
    <td>
        <select
            className="form-select form-select-compact"
            style={{ fontSize: 12, padding: '3px 4px', width: '100%' }}
            value={item.projectId || ''}
            onChange={e => setPoItems(prev => prev.map((x, idx) => idx === i ? { ...x, projectId: e.target.value || null } : x))}
        >
            <option value="">🏭 Vào kho</option>
            {projects.filter(p => p.status !== 'Hoàn thành').map(p => (
                <option key={p.id} value={p.id}>📍 {p.code} — {p.name}</option>
            ))}
        </select>
        {i === 0 && (
            <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 10, padding: '2px 6px', marginTop: 2 }}
                onClick={() => {
                    const firstProjectId = poItems[0]?.projectId || null;
                    setPoItems(prev => prev.map(it => ({ ...it, projectId: firstProjectId })));
                }}
            >
                ↓ Áp dụng xuống
            </button>
        )}
    </td>
)}
```

- [ ] **Step 4: Thêm `projectId: null` vào EMPTY item template + initial state**

Tìm `const [poItems, setPoItems] = useState([{ ... }])` (line 26). Thay:

```javascript
const [poItems, setPoItems] = useState([{ productName: '', unit: 'cái', quantity: 1, unitPrice: 0, amount: 0, productId: null, variantLabel: '', variantSelections: {} }]);
```

Bằng:

```javascript
const [poItems, setPoItems] = useState([{ productName: '', unit: 'cái', quantity: 1, unitPrice: 0, amount: 0, productId: null, variantLabel: '', variantSelections: {}, projectId: null }]);
```

Và tất cả chỗ thêm row mới (pattern `setPoItems(prev => [...prev, {...}])` hoặc similar) — đảm bảo item mới có `projectId: null`.

- [ ] **Step 5: Khi submit PO với mode "Giao 1 dự án" — auto-apply projectId**

Tìm function tạo PO (tìm pattern `await fetch('/api/purchase-orders'` hoặc `apiFetch('/api/purchase-orders', { method: 'POST'`). Trước khi gửi body, thêm:

```javascript
const itemsToSend = poItems.map(it => ({
    ...it,
    projectId: poForm.deliveryType === 'Chia nhiều'
        ? (it.projectId || null)
        : poForm.deliveryType === 'Giao thẳng dự án'
            ? (poForm.projectId || null)
            : null,  // Nhập kho
}));
```

Rồi gửi `items: itemsToSend` trong body.

- [ ] **Step 6: Build check**

```bash
npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 7: Smoke test UI**

Chạy `npm run dev`. Vào `/purchasing` → "Tạo PO mới":

1. Mode "🏭 Nhập kho": không có dropdown dự án, cột "Giao đến" ẩn → submit → check DB: items đều `projectId=null`
2. Mode "📍 Giao 1 dự án": có dropdown dự án, cột "Giao đến" ẩn → chọn DA, submit → check DB: items đều có `projectId = DA đã chọn`
3. Mode "⚙️ Chia nhiều dự án": cột "Giao đến" hiện, mỗi dòng có dropdown → tạo 3 items (1 vào kho, 2 đi 2 dự án khác nhau), submit → check DB: items[0].projectId=null, items[1].projectId=DA1, items[2].projectId=DA2
4. Switch mode sau khi đã chọn per-item → confirm dialog hiện

- [ ] **Step 8: Commit**

```bash
git add app/purchasing/page.js
git commit -m "feat(po-form): toggle 3 mode + cột Giao đến + áp dụng xuống"
```

---

## Task 7: Receive modal UI — Grouped by destination

**Files:**
- Modify: `app/purchasing/page.js` (GRN modal — khoảng line 956–1030 + `submitGrn` function line 117–147)

- [ ] **Step 1: Sửa `openGrn` để load projectId + tên dự án cho từng item**

Tìm hàm `openGrn` (line 88). Thay block `setGrnItems(...)`:

```javascript
setGrnItems((po.items || []).map(it => ({
    id: it.id,
    productId: it.productId || null,
    productName: it.productName,
    unit: it.unit,
    quantity: it.quantity,
    receivedQty: it.receivedQty || 0,
    unitPrice: it.unitPrice || 0,
    toReceive: 0,
    variantLabel: it.variantLabel || '',
})));
```

Bằng:

```javascript
setGrnItems((po.items || []).map(it => ({
    id: it.id,
    productId: it.productId || null,
    productName: it.productName,
    unit: it.unit,
    quantity: it.quantity,
    receivedQty: it.receivedQty || 0,
    unitPrice: it.unitPrice || 0,
    toReceive: 0,
    variantLabel: it.variantLabel || '',
    projectId: it.projectId || null,
})));
```

> Lưu ý: API `GET /api/purchase-orders/[id]` cần trả `items` có field `projectId`. Prisma `findUnique({ include: { items: true } })` sẽ tự bao gồm. Kiểm tra lại API GET nếu không thấy projectId trong response.

- [ ] **Step 2: Rewrite GRN modal render — nhóm items theo đích**

Tìm block GRN modal (khoảng line 956–1030, search cho `grnPO && (`). Thay block `<div className="modal-body">` nội dung, tìm đoạn từ sau dòng `NCC: <strong>{grnPO.supplier}</strong>` đến trước `<div className="form-group" style={{ marginTop: 12 }}>` (ghi chú).

Block cũ:

```javascript
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
<table className="data-table" style={{ fontSize: 12 }}>
    ...
</table>
```

Thay bằng:

```javascript
<div style={{ marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>
    NCC: <strong>{grnPO.supplier}</strong>
    {grnPO.project && <> &nbsp;|&nbsp; Dự án chính: <strong>{grnPO.project.code}</strong></>}
</div>

{(() => {
    // Group items: warehouse (projectId null) + per-project
    const warehouseItems = grnItems.filter(it => !it.projectId);
    const byProject = {};
    for (const it of grnItems) {
        if (it.projectId) {
            if (!byProject[it.projectId]) byProject[it.projectId] = [];
            byProject[it.projectId].push(it);
        }
    }
    const findProject = (pid) => projects.find(p => p.id === pid);

    const ItemRow = ({ it }) => {
        const i = grnItems.findIndex(x => x.id === it.id);
        return (
            <tr key={it.id}>
                <td style={{ fontSize: 13 }}>
                    {it.productName}
                    {it.variantLabel && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{it.variantLabel}</div>}
                </td>
                <td style={{ textAlign: 'center', fontSize: 12 }}>{it.unit}</td>
                <td style={{ textAlign: 'center', fontSize: 13 }}>{fmtNum(it.quantity)}</td>
                <td style={{ textAlign: 'center', fontSize: 13, color: it.receivedQty >= it.quantity ? 'var(--status-success)' : 'var(--text-muted)' }}>
                    {fmtNum(it.receivedQty)}
                </td>
                <td style={{ textAlign: 'center' }}>
                    <input
                        className="form-input form-input-compact"
                        type="number" min="0"
                        value={it.toReceive}
                        onChange={e => setGrnItems(prev => prev.map((x, idx) => idx === i ? { ...x, toReceive: Number(e.target.value) || 0 } : x))}
                        style={{ width: 80, textAlign: 'center' }}
                    />
                </td>
            </tr>
        );
    };

    const ItemsTable = ({ items }) => (
        <table className="data-table" style={{ fontSize: 12, marginBottom: 12 }}>
            <thead><tr>
                <th>Sản phẩm</th>
                <th style={{ width: 65, textAlign: 'center' }}>ĐVT</th>
                <th style={{ width: 80, textAlign: 'center' }}>Đặt</th>
                <th style={{ width: 80, textAlign: 'center' }}>Đã nhận</th>
                <th style={{ width: 100, textAlign: 'center' }}>Nhận lần này</th>
            </tr></thead>
            <tbody>
                {items.map(it => <ItemRow key={it.id} it={it} />)}
            </tbody>
        </table>
    );

    return (
        <>
            {warehouseItems.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <strong style={{ fontSize: 13 }}>🏭 Vào kho</strong>
                        <select className="form-select" style={{ flex: 1, maxWidth: 200, fontSize: 12 }} value={grnWarehouseId} onChange={e => setGrnWarehouseId(e.target.value)}>
                            <option value="">— Chọn kho —</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <ItemsTable items={warehouseItems} />
                </div>
            )}
            {Object.entries(byProject).map(([projectId, items]) => {
                const proj = findProject(projectId);
                return (
                    <div key={projectId} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10, marginBottom: 12 }}>
                        <div style={{ marginBottom: 8 }}>
                            <strong style={{ fontSize: 13 }}>📍 Giao thẳng công trình</strong>
                            {proj && <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--text-secondary)' }}>{proj.code} — {proj.name}</span>}
                            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>(không qua kho)</span>
                        </div>
                        <ItemsTable items={items} />
                    </div>
                );
            })}
        </>
    );
})()}
```

- [ ] **Step 3: Sửa `submitGrn` gọi endpoint mới `/receive`**

Thay toàn hàm `submitGrn` (line 117–147):

```javascript
const submitGrn = async () => {
    const validItems = grnItems.filter(it => (it.toReceive || 0) > 0);
    if (!validItems.length) return alert('Nhập số lượng cần nhận cho ít nhất 1 sản phẩm');
    const hasWarehouseItems = validItems.some(it => !it.projectId);
    if (hasWarehouseItems && !grnWarehouseId) return alert('Vui lòng chọn kho nhập cho các sản phẩm vào kho');
    setGrnSaving(true);
    const res = await fetch(`/api/purchase-orders/${grnPO.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            items: validItems.map(it => ({ id: it.id, receivedQty: Number(it.toReceive) })),
            warehouseId: hasWarehouseItems ? grnWarehouseId : null,
            receivedBy: '',
            note: grnNote,
        }),
    });
    setGrnSaving(false);
    if (!res.ok) { const e = await res.json(); return alert(e.error || 'Lỗi nhận hàng'); }
    alert('Đã tạo phiếu nhận hàng thành công!');
    setGrnPO(null);
    fetchOrders();
};
```

- [ ] **Step 4: Verify `GET /api/purchase-orders/[id]` trả về `projectId` cho items**

```bash
grep -n "items" app/api/purchase-orders/\[id\]/route.js | grep -i "include\|select"
```

Nếu GET dùng `include: { items: true }` hoặc `include: { items: { ... } }` không có explicit select → OK, tất cả field trả về. Nếu dùng `select: { items: { select: { ... } } }` → phải thêm `projectId: true, project: { select: { id: true, code: true, name: true } }`. Sửa nếu cần.

- [ ] **Step 5: Build + test thủ công**

```bash
npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: Compiled successfully.

Chạy `npm run dev`, tạo 1 PO mode "Chia nhiều dự án" có 2 items (1 vào kho, 1 DA), rồi nhấn "Nhận hàng" → xem modal:
- Phải có 2 section: "🏭 Vào kho" + "📍 Giao thẳng công trình DA-xxx"
- Chỉ section kho mới có dropdown chọn kho
- Điền số lượng → submit → check DB: cả 2 luồng ghi nhận đúng

- [ ] **Step 6: Commit**

```bash
git add app/purchasing/page.js
git commit -m "feat(po-grn): form nhận hàng nhóm items theo đích (kho/dự án)"
```

---

## Task 8: Materials Report API

**Files:**
- Create: `app/api/projects/[id]/materials-report/route.js`

- [ ] **Step 1: Tạo file API mới**

Tạo `app/api/projects/[id]/materials-report/route.js`:

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/projects/[id]/materials-report
// Returns aggregated materials report for a project:
// - planned: from MaterialPlan
// - ordered: from PurchaseOrderItem WHERE projectId = this project
// - receivedDirect: from MaterialPlan.receivedQty (giao thẳng)
// - receivedFromStock: from StockIssueItem WHERE issue.projectId = this
// - used: receivedFromStock + receivedDirect (GT coi như đã dùng ngay)
// - cost: ProjectExpense WHERE projectId or allocations.projectId
export const GET = withAuth(async (_request, { params }) => {
    const { id: projectId } = await params;

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, code: true, name: true },
    });
    if (!project) return NextResponse.json({ error: 'Dự án không tồn tại' }, { status: 404 });

    // 1. MaterialPlan — dự toán + receivedDirect
    const plans = await prisma.materialPlan.findMany({
        where: { projectId },
        include: {
            product: { select: { id: true, code: true, name: true, unit: true, category: true } },
        },
    });

    // 2. PurchaseOrderItem — đã đặt cho dự án này (giao thẳng)
    const poItems = await prisma.purchaseOrderItem.findMany({
        where: { projectId },
        include: {
            purchaseOrder: { select: { id: true, code: true, status: true, orderDate: true } },
        },
    });

    // 3. StockIssueItem — xuất kho cho dự án này
    const stockIssueItems = await prisma.stockIssueItem.findMany({
        where: { issue: { projectId } },
        include: {
            issue: { select: { id: true, code: true, issuedDate: true } },
            product: { select: { id: true, code: true, name: true, unit: true, category: true } },
        },
    });

    // 4. ProjectExpense — chi phí (direct + allocated)
    const expensesDirect = await prisma.projectExpense.aggregate({
        where: { projectId, deletedAt: null, status: { not: 'Từ chối' } },
        _sum: { amount: true },
    });
    const expensesAllocated = await prisma.expenseAllocation.aggregate({
        where: { projectId, expense: { deletedAt: null, status: { not: 'Từ chối' } } },
        _sum: { amount: true },
    });
    const totalCost = (expensesDirect._sum.amount || 0) + (expensesAllocated._sum.amount || 0);

    // Build per-product aggregated items
    // Key by productId (if set) else by productName
    const itemsByKey = {};
    const keyOf = (productId, productName) => productId || `name:${productName}`;

    // Seed from MaterialPlan
    for (const plan of plans) {
        const key = keyOf(plan.productId, plan.product?.name || '');
        if (!itemsByKey[key]) {
            itemsByKey[key] = {
                productId: plan.productId,
                name: plan.product?.name || '',
                code: plan.product?.code || '',
                unit: plan.product?.unit || '',
                category: plan.product?.category || plan.category || 'Khác',
                planned: 0,
                ordered: 0,
                receivedDirect: 0,
                receivedFromStock: 0,
                plannedValue: 0,
                sources: new Set(),
            };
        }
        itemsByKey[key].planned += Number(plan.quantity || 0);
        itemsByKey[key].receivedDirect += Number(plan.receivedQty || 0);
        itemsByKey[key].plannedValue += Number(plan.totalAmount || 0);
    }

    // Add from PO items (ordered)
    for (const poi of poItems) {
        const key = keyOf(poi.productId, poi.productName);
        if (!itemsByKey[key]) {
            itemsByKey[key] = {
                productId: poi.productId,
                name: poi.productName,
                code: '',
                unit: poi.unit || '',
                category: 'Khác',
                planned: 0,
                ordered: 0,
                receivedDirect: 0,
                receivedFromStock: 0,
                plannedValue: 0,
                sources: new Set(),
            };
        }
        itemsByKey[key].ordered += Number(poi.quantity || 0);
        itemsByKey[key].sources.add('GT');
    }

    // Add from StockIssue
    for (const sii of stockIssueItems) {
        const pname = sii.product?.name || sii.productName || '';
        const key = keyOf(sii.productId, pname);
        if (!itemsByKey[key]) {
            itemsByKey[key] = {
                productId: sii.productId,
                name: pname,
                code: sii.product?.code || '',
                unit: sii.unit || sii.product?.unit || '',
                category: sii.product?.category || 'Khác',
                planned: 0,
                ordered: 0,
                receivedDirect: 0,
                receivedFromStock: 0,
                plannedValue: 0,
                sources: new Set(),
            };
        }
        itemsByKey[key].receivedFromStock += Number(sii.qty || 0);
        itemsByKey[key].sources.add('XK');
    }

    const items = Object.values(itemsByKey).map(it => {
        const received = it.receivedDirect + it.receivedFromStock;
        const used = received;  // GT coi như đã dùng ngay; XK = đã dùng khi xuất kho
        const missing = it.planned - received;
        return {
            ...it,
            received,
            used,
            missing,
            sources: Array.from(it.sources),
        };
    }).sort((a, b) => a.name.localeCompare(b.name, 'vi'));

    return NextResponse.json({
        project,
        summary: {
            planned: items.reduce((s, i) => s + i.plannedValue, 0),
            ordered: poItems.reduce((s, i) => s + (Number(i.amount) || Number(i.quantity) * Number(i.unitPrice || 0)), 0),
            receivedDirectQty: items.reduce((s, i) => s + i.receivedDirect, 0),
            receivedFromStockQty: items.reduce((s, i) => s + i.receivedFromStock, 0),
            totalCost,
            itemCount: items.length,
        },
        items,
    });
});
```

- [ ] **Step 2: Verify StockIssueItem model tồn tại**

```bash
grep -n "model StockIssueItem" prisma/schema.prisma
```

Nếu KHÔNG có model `StockIssueItem`, bỏ phần `stockIssueItems` và `receivedFromStock` khỏi report (thành 0). Nếu schema dùng tên khác (VD `StockIssue` có `items` field relation), điều chỉnh query cho khớp:

```bash
grep -n "model StockIssue\|issueItems" prisma/schema.prisma
```

Điều chỉnh query nếu tên khác.

- [ ] **Step 3: Test endpoint**

```bash
npm run dev
```

Lấy 1 projectId từ DB (Prisma Studio). Gọi:

```bash
curl http://localhost:3000/api/projects/<projectId>/materials-report \
  -H "Cookie: <session>"
```

Expected: 200 với JSON có `summary` + `items[]`. Verify:
- `summary.planned` matches tổng `MaterialPlan.totalAmount` cho dự án này
- `items[]` có từng SP với đầy đủ cột
- `sources` array đúng (`['GT']` hoặc `['XK']` hoặc `['GT', 'XK']`)

- [ ] **Step 4: Build check**

```bash
npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: Compiled successfully.

- [ ] **Step 5: Commit**

```bash
git add app/api/projects/\[id\]/materials-report/route.js
git commit -m "feat(api): thêm báo cáo vật tư tổng hợp cho dự án"
```

---

## Task 9: MaterialTab UI — Rewrite thành báo cáo tổng hợp

**Files:**
- Modify: `app/projects/[id]/tabs/MaterialTab.js` (rewrite gần toàn bộ)

- [ ] **Step 1: Thêm state fetch report data**

Mở file `app/projects/[id]/tabs/MaterialTab.js`. Thêm imports:

```javascript
'use client';
import { useState, useEffect } from 'react';
import { fmtVND } from '@/lib/projectUtils';
import { apiFetch } from '@/lib/fetchClient';
import PoBulkFromQuotationModal from '@/components/PoBulkFromQuotationModal';
```

Trong component, thêm state và fetch:

```javascript
const [report, setReport] = useState(null);
const [reportLoading, setReportLoading] = useState(true);
const [filterCategory, setFilterCategory] = useState('');
const [filterSource, setFilterSource] = useState('all');

useEffect(() => {
    let active = true;
    setReportLoading(true);
    apiFetch(`/api/projects/${projectId}/materials-report`)
        .then(d => { if (active) { setReport(d); setReportLoading(false); } })
        .catch(() => { if (active) setReportLoading(false); });
    return () => { active = false; };
}, [projectId, p?.updatedAt]);
```

- [ ] **Step 2: Thay stats-grid top với 5 stat cards**

Tìm block `<div className="stats-grid" ...>` (line 86–90). Thay bằng:

```javascript
<div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 16 }}>
    <div className="stat-card">
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--status-info)' }}>{fmtVND(report?.summary?.planned || 0)}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📋 Dự toán</div>
    </div>
    <div className="stat-card">
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>{fmtVND(report?.summary?.ordered || 0)}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>🛒 Đã đặt (giao thẳng)</div>
    </div>
    <div className="stat-card">
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--status-success)' }}>{(report?.summary?.receivedDirectQty || 0) + (report?.summary?.receivedFromStockQty || 0)}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📦 Đã nhận (tổng SL)</div>
    </div>
    <div className="stat-card">
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--status-warning)' }}>{report?.summary?.itemCount || 0}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>🔧 Số mã vật tư</div>
    </div>
    <div className="stat-card">
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--status-danger)' }}>{fmtVND(report?.summary?.totalCost || 0)}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>💰 Chi phí thực tế</div>
    </div>
</div>
```

- [ ] **Step 3: Thêm filter (danh mục + nguồn)**

Ngay sau stats-grid, trước `<div className="card">`, thêm:

```javascript
<div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
    <select className="form-select form-select-compact" style={{ maxWidth: 200 }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
        <option value="">Tất cả danh mục</option>
        {Array.from(new Set((report?.items || []).map(i => i.category).filter(Boolean))).sort().map(c => (
            <option key={c} value={c}>{c}</option>
        ))}
    </select>
    <select className="form-select form-select-compact" style={{ maxWidth: 180 }} value={filterSource} onChange={e => setFilterSource(e.target.value)}>
        <option value="all">Tất cả nguồn</option>
        <option value="GT">📍 Chỉ giao thẳng</option>
        <option value="XK">🏭 Chỉ xuất kho</option>
    </select>
</div>
```

- [ ] **Step 4: Thay table hiện tại (line 113–167) bằng table báo cáo**

Tìm block `<div className="table-container">` bên trong `<div className="card">`. Thay toàn bộ table bằng:

```javascript
{reportLoading ? (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải báo cáo...</div>
) : (report?.items || []).length === 0 ? (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có vật tư nào cho dự án này</div>
) : (
    <div className="table-container">
        <table className="data-table">
            <thead>
                <tr>
                    <th>Sản phẩm</th>
                    <th>ĐVT</th>
                    <th style={{ textAlign: 'right' }}>Dự toán</th>
                    <th style={{ textAlign: 'right' }}>Đã đặt</th>
                    <th style={{ textAlign: 'right' }}>Đã nhận</th>
                    <th style={{ textAlign: 'right' }}>Đã dùng</th>
                    <th style={{ textAlign: 'right' }}>Còn thiếu</th>
                    <th style={{ textAlign: 'center' }}>Nguồn</th>
                </tr>
            </thead>
            <tbody>
                {(report.items || [])
                    .filter(it => !filterCategory || it.category === filterCategory)
                    .filter(it => filterSource === 'all' || it.sources.includes(filterSource))
                    .map(it => {
                        const badgeColor = it.missing > 0 ? 'var(--status-danger)' : 'var(--status-success)';
                        const sourceLabel = it.sources.length === 2 ? '📍+🏭'
                            : it.sources.includes('GT') ? '📍 GT'
                            : it.sources.includes('XK') ? '🏭 XK' : '—';
                        return (
                            <tr key={`${it.productId || it.name}`}>
                                <td>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{it.name}</div>
                                    {it.code && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{it.code}</div>}
                                </td>
                                <td style={{ fontSize: 12 }}>{it.unit}</td>
                                <td style={{ textAlign: 'right', fontSize: 13 }}>{it.planned || '—'}</td>
                                <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--primary)' }}>{it.ordered || '—'}</td>
                                <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--status-success)', fontWeight: 600 }}>{it.received || '—'}</td>
                                <td style={{ textAlign: 'right', fontSize: 13 }}>{it.used || '—'}</td>
                                <td style={{ textAlign: 'right', fontSize: 13, color: badgeColor, fontWeight: 700 }}>
                                    {it.missing > 0 ? it.missing : (it.missing < 0 ? `+${-it.missing}` : '✓')}
                                </td>
                                <td style={{ textAlign: 'center', fontSize: 11 }}>
                                    <span className="badge" style={{ background: 'var(--bg-secondary)', padding: '2px 6px' }}>{sourceLabel}</span>
                                </td>
                            </tr>
                        );
                    })}
            </tbody>
        </table>
    </div>
)}
```

- [ ] **Step 5: Giữ lại phần "Tạo PO từ Báo giá" + "Tạo PO" (UX hiện tại)**

Phần top buttons trong card header (line 93–107) giữ nguyên. Chỉ thay table bên trong card. Block `showPOModal` + `PoBulkFromQuotationModal` cuối file giữ nguyên.

- [ ] **Step 6: Build + smoke test**

```bash
npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: Compiled successfully.

```bash
npm run dev
```

Vào `/projects/<id>` → tab "Vật tư":
- 5 stat cards hiện đúng số
- Table hiện list vật tư với đủ cột
- Filter "Nguồn" → "Chỉ giao thẳng" → chỉ items có `sources` chứa `'GT'`
- Filter "Nguồn" → "Chỉ xuất kho" → chỉ items có `sources` chứa `'XK'`
- Tạo 1 PO giao thẳng dự án + nhận hàng → refresh trang → thấy item mới với nguồn 📍 GT

- [ ] **Step 7: Commit**

```bash
git add app/projects/\[id\]/tabs/MaterialTab.js
git commit -m "feat(project-material): rewrite MaterialTab thành báo cáo tổng hợp đa nguồn"
```

---

## Task 10: Smoke test end-to-end + push

- [ ] **Step 1: Full flow test**

```bash
npm run dev
```

1. Tạo 1 PO mode "⚙️ Chia nhiều dự án" với 3 dòng:
   - Ván 6mm (10 tấm) → 🏭 Kho chính
   - Ván 17mm (20 tấm) → 📍 DA-001
   - Đinh (5 kg) → 📍 DA-002
2. Lưu PO → check Prisma Studio bảng `PurchaseOrderItem`: 3 rows có `projectId` đúng
3. Duyệt PO → nhấn "Nhận hàng":
   - Modal hiện 3 section riêng biệt
   - Kho section có dropdown "Kho chính"
   - DA-001 section không có dropdown kho
4. Nhập số lượng đủ cho cả 3 section → submit
5. Check kết quả:
   - `Product.stock` của Ván 6mm tăng +10
   - `InventoryTransaction` code NK### mới tạo cho Ván 6mm
   - `MaterialPlan.receivedQty` của DA-001 tăng +20 (hoặc tạo mới nếu chưa có)
   - `MaterialPlan.receivedQty` của DA-002 tăng +5
   - 2 `ProjectExpense` được tạo (1 cho DA-001, 1 cho DA-002)
6. Vào `/projects/DA-001` → tab "Vật tư":
   - Stat "Đã đặt (giao thẳng)" có giá trị
   - Table hiện Ván 17mm với cột "Đã nhận" = 20, nguồn 📍 GT
7. Tạo StockIssue xuất 5 tấm Ván 6mm từ Kho chính cho DA-001:
   - Vào `/inventory` → tab "Xuất kho" → tạo phiếu xuất cho DA-001, chọn Ván 6mm, qty 5
8. Quay lại tab Vật tư DA-001:
   - Ván 6mm xuất hiện trong table, cột "Đã nhận" += 5, nguồn 🏭 XK
9. Migration test: nếu có PO cũ với `deliveryType='Giao thẳng dự án'` trong DB → kiểm Prisma Studio, các `PurchaseOrderItem` của PO đó đã có `projectId` đúng

- [ ] **Step 2: Build final**

```bash
npm run build
```

Expected: Build thành công, không có lỗi TypeScript/module.

- [ ] **Step 3: Push**

```bash
git push origin main
```

- [ ] **Step 4: Commit final (nếu có fixup)**

Nếu smoke test phát hiện bug — fix → commit từng fix riêng:

```bash
git add <files>
git commit -m "fix(po-multi-project): <mô tả fix>"
git push origin main
```
