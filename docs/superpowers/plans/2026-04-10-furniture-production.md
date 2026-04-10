# Furniture Production Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng module quản lý đơn hàng sản xuất nội thất (FurnitureOrder) với CNC file management, đặt 3 loại vật liệu (ván/nẹp/acrylic), tự động cập nhật trạng thái khi nhận hàng, và biên bản nghiệm thu có public signing link.

**Architecture:** Phương án C (Hybrid) — FurnitureOrder model đã có trong schema, bổ sung 5 model mới (FurnitureCncFile, FurnitureMaterialOrder, FurnitureMaterialOrderItem, AcceptanceCertificate, AcceptanceCertificateItem), thêm 2 field vào PurchaseOrder (furnitureOrderId, materialType). API dùng withAuth() pattern, UI dùng apiFetch() + globals.css classes. GRN receive route tự động cập nhật FurnitureMaterialOrder.status khi nhận hàng PO.

**Tech Stack:** Next.js 16 App Router, Prisma 6, Zod 4, PostgreSQL, Cloudflare R2 (file upload), globals.css component classes

---

## File Map

**Create:**
- `prisma/schema.prisma` ← thêm 5 model mới + fields vào FurnitureOrder + PurchaseOrder
- `lib/validations/furnitureMaterialOrder.js` ← Zod schemas
- `lib/validations/acceptanceCertificate.js` ← Zod schemas
- `app/api/furniture-orders/[id]/cnc-files/route.js` ← GET list + POST upload
- `app/api/furniture-orders/[id]/cnc-files/[fid]/route.js` ← DELETE
- `app/api/furniture-orders/[id]/confirm-cnc/route.js` ← POST status → cnc_ready
- `app/api/furniture-orders/[id]/material-orders/route.js` ← GET all 3 selections
- `app/api/furniture-orders/[id]/material-orders/[type]/route.js` ← GET/PUT single type
- `app/api/furniture-orders/[id]/material-orders/[type]/create-po/route.js` ← POST tạo PO
- `app/api/furniture-orders/[id]/acceptance/route.js` ← GET/POST
- `app/api/furniture-orders/[id]/acceptance/[aid]/route.js` ← GET/PUT
- `app/api/furniture-orders/[id]/acceptance/[aid]/send/route.js` ← POST gửi link
- `app/api/public/acceptance/[token]/route.js` ← GET public + POST sign
- `app/noi-that/page.js` ← danh sách FurnitureOrder
- `app/noi-that/[id]/page.js` ← detail shell 4 tabs
- `app/noi-that/[id]/tabs/OverviewTab.js`
- `app/noi-that/[id]/tabs/CncFilesTab.js`
- `app/noi-that/[id]/tabs/MaterialOrdersTab.js`
- `app/noi-that/[id]/tabs/AcceptanceTab.js`
- `app/public/acceptance/[token]/page.js` ← public signing page

**Modify:**
- `lib/generateCode.js` ← add furnitureOrder + acceptanceCertificate to TABLE_MAP
- `app/api/purchase-orders/[id]/receive/route.js` ← add GRN hook
- `components/Sidebar.js` ← add 🪵 Nội thất menu item
- `components/Header.js` ← add pageTitles entry
- `app/projects/[id]/page.js` ← add FurnitureTab import + tab entry

---

## Task 1: Prisma Schema — New Models + Field Additions

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add FurnitureCncFile model to schema**

Trong `prisma/schema.prisma`, sau model `FurnitureOrder` (dòng ~1520), thêm:

```prisma
model FurnitureCncFile {
  id               String         @id @default(cuid())
  furnitureOrderId String
  fileName         String
  fileUrl          String
  pieceCount       Int            @default(0)
  notes            String         @default("")
  uploadedAt       DateTime       @default(now())
  furnitureOrder   FurnitureOrder @relation(fields: [furnitureOrderId], references: [id], onDelete: Cascade)

  @@index([furnitureOrderId])
}
```

- [ ] **Step 2: Add FurnitureMaterialOrder + FurnitureMaterialOrderItem models**

Sau `FurnitureCncFile`, thêm:

```prisma
model FurnitureMaterialOrder {
  id               String                     @id @default(cuid())
  furnitureOrderId String
  materialType     String
  purchaseOrderId  String?                    @unique
  status           String                     @default("DRAFT")
  createdAt        DateTime                   @default(now())
  updatedAt        DateTime                   @updatedAt
  furnitureOrder   FurnitureOrder             @relation(fields: [furnitureOrderId], references: [id], onDelete: Cascade)
  purchaseOrder    PurchaseOrder?             @relation(fields: [purchaseOrderId], references: [id])
  items            FurnitureMaterialOrderItem[]

  @@unique([furnitureOrderId, materialType])
  @@index([furnitureOrderId])
  @@index([purchaseOrderId])
}

model FurnitureMaterialOrderItem {
  id                    String                 @id @default(cuid())
  furnitureMaterialOrderId String
  name                  String
  colorCode             String                 @default("")
  imageUrl              String                 @default("")
  thickness             Float?
  quantity              Float                  @default(0)
  unit                  String                 @default("")
  unitPrice             Float                  @default(0)
  notes                 String                 @default("")
  furnitureMaterialOrder FurnitureMaterialOrder @relation(fields: [furnitureMaterialOrderId], references: [id], onDelete: Cascade)

  @@index([furnitureMaterialOrderId])
}
```

- [ ] **Step 3: Add AcceptanceCertificate + AcceptanceCertificateItem models**

Sau `FurnitureMaterialOrderItem`, thêm:

```prisma
model AcceptanceCertificate {
  id               String                      @id @default(cuid())
  code             String                      @unique
  furnitureOrderId String
  quotationId      String?
  status           String                      @default("DRAFT")
  publicToken      String?                     @unique
  customerName     String                      @default("")
  customerSignatureUrl String                  @default("")
  signedAt         DateTime?
  createdAt        DateTime                    @default(now())
  updatedAt        DateTime                    @updatedAt
  furnitureOrder   FurnitureOrder              @relation(fields: [furnitureOrderId], references: [id], onDelete: Cascade)
  quotation        Quotation?                  @relation(fields: [quotationId], references: [id])
  items            AcceptanceCertificateItem[]

  @@index([furnitureOrderId])
  @@index([publicToken])
}

model AcceptanceCertificateItem {
  id            String                @id @default(cuid())
  certificateId String
  itemName      String
  quantity      Float                 @default(0)
  unit          String                @default("")
  amount        Float                 @default(0)
  acceptedAt    DateTime?
  notes         String                @default("")
  certificate   AcceptanceCertificate @relation(fields: [certificateId], references: [id], onDelete: Cascade)

  @@index([certificateId])
}
```

- [ ] **Step 4: Add fields to FurnitureOrder model**

Trong model `FurnitureOrder`, sau dòng `deliveredAt DateTime?`, thêm 2 field:

```prisma
  cncUploadedAt    DateTime?
  cncPieceCount    Int                  @default(0)
```

Và thêm 3 relation fields sau `warrantyTickets WarrantyTicket[]`:

```prisma
  cncFiles         FurnitureCncFile[]
  materialOrders   FurnitureMaterialOrder[]
  acceptanceCertificates AcceptanceCertificate[]
```

- [ ] **Step 5: Add fields to PurchaseOrder model**

Tìm `model PurchaseOrder` trong schema. Thêm 2 field sau `receivedDate DateTime?`:

```prisma
  furnitureOrderId String?
  materialType     String?
```

Thêm relation sau các relation hiện có của PurchaseOrder:

```prisma
  furnitureMaterialOrder FurnitureMaterialOrder?
```

- [ ] **Step 6: Add AcceptanceCertificate relation to Quotation model**

Tìm `model Quotation` trong schema. Thêm vào cuối relations:

```prisma
  acceptanceCertificates AcceptanceCertificate[]
```

- [ ] **Step 7: Run migration**

```bash
npm run db:migrate
```

Expected: Migration applied successfully, no errors. Nếu có lỗi về relation, kiểm tra lại `@relation` names.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add furniture production models (CncFile, MaterialOrder, AcceptanceCertificate)"
```

---

## Task 2: Update generateCode TABLE_MAP + Validation Schemas

**Files:**
- Modify: `lib/generateCode.js`
- Create: `lib/validations/furnitureMaterialOrder.js`
- Create: `lib/validations/acceptanceCertificate.js`

- [ ] **Step 1: Add new models to generateCode TABLE_MAP**

Trong `lib/generateCode.js`, tìm:

```javascript
    goodsReceipt: '"GoodsReceipt"',
    stockIssue: '"StockIssue"',
```

Thay bằng:

```javascript
    goodsReceipt: '"GoodsReceipt"',
    stockIssue: '"StockIssue"',
    furnitureOrder: '"FurnitureOrder"',
    acceptanceCertificate: '"AcceptanceCertificate"',
```

- [ ] **Step 2: Create furnitureMaterialOrder validation schema**

Tạo `lib/validations/furnitureMaterialOrder.js`:

```javascript
import { z } from 'zod';
import { optStr, optFloat } from './common';

const furnitureMaterialOrderItemSchema = z.object({
    name: z.string().trim().min(1, 'Tên vật liệu bắt buộc'),
    colorCode: optStr,
    imageUrl: optStr,
    thickness: z.number().optional().nullable(),
    quantity: optFloat,
    unit: optStr,
    unitPrice: optFloat,
    notes: optStr,
});

export const furnitureMaterialOrderUpdateSchema = z.object({
    items: z.array(furnitureMaterialOrderItemSchema),
});
```

- [ ] **Step 3: Create acceptanceCertificate validation schema**

Tạo `lib/validations/acceptanceCertificate.js`:

```javascript
import { z } from 'zod';
import { optStr, optFloat } from './common';

const acceptanceCertificateItemSchema = z.object({
    itemName: z.string().trim().min(1, 'Tên hạng mục bắt buộc'),
    quantity: optFloat,
    unit: optStr,
    amount: optFloat,
    notes: optStr,
});

export const acceptanceCertificateCreateSchema = z.object({
    quotationId: z.string().optional().nullable(),
    customerName: optStr,
    items: z.array(acceptanceCertificateItemSchema).min(1, 'Cần ít nhất 1 hạng mục'),
});

export const acceptanceCertificateUpdateSchema = z.object({
    customerName: optStr,
    items: z.array(acceptanceCertificateItemSchema).optional(),
    status: optStr,
});
```

- [ ] **Step 4: Verify common.js has optStr/optFloat helpers**

```bash
grep -n "export const optStr\|export const optFloat" lib/validations/common.js
```

Expected output: lines showing `optStr` and `optFloat` exports. Nếu không có, kiểm tra `common.js`.

- [ ] **Step 5: Commit**

```bash
git add lib/generateCode.js lib/validations/furnitureMaterialOrder.js lib/validations/acceptanceCertificate.js
git commit -m "feat: add generateCode entries + validation schemas for furniture production"
```

---

## Task 3: CNC Files API Routes

**Files:**
- Create: `app/api/furniture-orders/[id]/cnc-files/route.js`
- Create: `app/api/furniture-orders/[id]/cnc-files/[fid]/route.js`
- Create: `app/api/furniture-orders/[id]/confirm-cnc/route.js`

- [ ] **Step 1: Create cnc-files GET/POST route**

Tạo `app/api/furniture-orders/[id]/cnc-files/route.js`:

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { uploadToR2 } from '@/lib/r2';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_req, { params }) => {
    const { id } = await params;
    const files = await prisma.furnitureCncFile.findMany({
        where: { furnitureOrderId: id },
        orderBy: { uploadedAt: 'asc' },
    });
    return NextResponse.json(files);
});

export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const order = await prisma.furnitureOrder.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('file');
    const pieceCount = Number(formData.get('pieceCount') || 0);
    const notes = formData.get('notes') || '';

    if (!file) return NextResponse.json({ error: 'Thiếu file' }, { status: 400 });

    const key = `cnc/${id}/${Date.now()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileUrl = await uploadToR2(key, buffer, file.type);

    const cncFile = await prisma.furnitureCncFile.create({
        data: {
            furnitureOrderId: id,
            fileName: file.name,
            fileUrl,
            pieceCount,
            notes,
        },
    });

    // Update FurnitureOrder.cncPieceCount (sum of all files)
    const allFiles = await prisma.furnitureCncFile.findMany({ where: { furnitureOrderId: id } });
    const totalPieces = allFiles.reduce((s, f) => s + f.pieceCount, 0);
    await prisma.furnitureOrder.update({ where: { id }, data: { cncPieceCount: totalPieces } });

    return NextResponse.json(cncFile, { status: 201 });
});
```

- [ ] **Step 2: Verify uploadToR2 signature in lib/r2.js**

```bash
grep -n "export.*uploadToR2\|export async function uploadToR2" lib/r2.js
```

Nếu signature khác (ví dụ nhận `(key, body, contentType)` với tên khác), điều chỉnh Step 1 cho khớp.

- [ ] **Step 3: Create cnc-files DELETE route**

Tạo `app/api/furniture-orders/[id]/cnc-files/[fid]/route.js`:

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { deleteFromR2 } from '@/lib/r2';
import { NextResponse } from 'next/server';

export const DELETE = withAuth(async (_req, { params }) => {
    const { id, fid } = await params;
    const file = await prisma.furnitureCncFile.findFirst({
        where: { id: fid, furnitureOrderId: id },
    });
    if (!file) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    // Delete from R2 (extract key from URL)
    try {
        const url = new URL(file.fileUrl);
        const key = url.pathname.slice(1); // remove leading slash
        await deleteFromR2(key);
    } catch {
        // Log but don't fail if R2 deletion fails
        console.error('R2 delete failed for', file.fileUrl);
    }

    await prisma.furnitureCncFile.delete({ where: { id: fid } });

    // Recalculate total piece count
    const allFiles = await prisma.furnitureCncFile.findMany({ where: { furnitureOrderId: id } });
    const totalPieces = allFiles.reduce((s, f) => s + f.pieceCount, 0);
    await prisma.furnitureOrder.update({ where: { id }, data: { cncPieceCount: totalPieces } });

    return NextResponse.json({ success: true });
});
```

- [ ] **Step 4: Verify deleteFromR2 exists in lib/r2.js**

```bash
grep -n "deleteFromR2\|export.*delete" lib/r2.js
```

Nếu function không tồn tại, bỏ dòng `await deleteFromR2(key)` (chỉ giữ comment) — file sẽ vẫn bị xóa khỏi DB.

- [ ] **Step 5: Create confirm-cnc route**

Tạo `app/api/furniture-orders/[id]/confirm-cnc/route.js`:

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (_req, { params }) => {
    const { id } = await params;
    const order = await prisma.furnitureOrder.findUnique({
        where: { id },
        include: { cncFiles: true },
    });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (order.cncFiles.length === 0) {
        return NextResponse.json({ error: 'Cần upload ít nhất 1 file CNC' }, { status: 400 });
    }
    if (order.status !== 'confirmed') {
        return NextResponse.json({ error: `Trạng thái hiện tại "${order.status}" không thể chuyển sang cnc_ready` }, { status: 400 });
    }

    const updated = await prisma.furnitureOrder.update({
        where: { id },
        data: { status: 'cnc_ready', cncUploadedAt: new Date() },
    });
    return NextResponse.json(updated);
});
```

- [ ] **Step 6: Test manually**

```
1. Mở dev server: npm run dev
2. Tạo 1 FurnitureOrder với status="confirmed" trong DB (qua Prisma Studio: npm run db:studio)
3. POST /api/furniture-orders/{id}/cnc-files với FormData(file=test.pdf, pieceCount=10)
   → 201 với cncFile record
4. GET /api/furniture-orders/{id}/cnc-files
   → array gồm 1 file
5. POST /api/furniture-orders/{id}/confirm-cnc
   → 200, status="cnc_ready", cncUploadedAt set
6. DELETE /api/furniture-orders/{id}/cnc-files/{fid}
   → 200, file bị xóa
```

- [ ] **Step 7: Commit**

```bash
git add app/api/furniture-orders/[id]/cnc-files/ app/api/furniture-orders/[id]/confirm-cnc/
git commit -m "feat(api): CNC file upload/delete + confirm-cnc route"
```

---

## Task 4: Material Orders API Routes

**Files:**
- Create: `app/api/furniture-orders/[id]/material-orders/route.js`
- Create: `app/api/furniture-orders/[id]/material-orders/[type]/route.js`
- Create: `app/api/furniture-orders/[id]/material-orders/[type]/create-po/route.js`

- [ ] **Step 1: Create material-orders GET route (all 3 types)**

Tạo `app/api/furniture-orders/[id]/material-orders/route.js`:

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const MATERIAL_TYPES = ['VAN', 'NEP', 'ACRYLIC'];

export const GET = withAuth(async (_req, { params }) => {
    const { id } = await params;
    const orders = await prisma.furnitureMaterialOrder.findMany({
        where: { furnitureOrderId: id },
        include: {
            items: true,
            purchaseOrder: { select: { id: true, code: true, status: true, supplier: true } },
        },
        orderBy: { materialType: 'asc' },
    });

    // Return map keyed by type, with empty placeholder if not yet created
    const result = {};
    for (const type of MATERIAL_TYPES) {
        result[type] = orders.find(o => o.materialType === type) || {
            id: null,
            furnitureOrderId: id,
            materialType: type,
            purchaseOrderId: null,
            status: 'DRAFT',
            items: [],
            purchaseOrder: null,
        };
    }
    return NextResponse.json(result);
});
```

- [ ] **Step 2: Create material-orders/[type] GET/PUT route**

Tạo `app/api/furniture-orders/[id]/material-orders/[type]/route.js`:

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { furnitureMaterialOrderUpdateSchema } from '@/lib/validations/furnitureMaterialOrder';
import { NextResponse } from 'next/server';

const VALID_TYPES = ['VAN', 'NEP', 'ACRYLIC'];

export const GET = withAuth(async (_req, { params }) => {
    const { id, type } = await params;
    if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: 'Loại không hợp lệ' }, { status: 400 });

    const order = await prisma.furnitureMaterialOrder.findUnique({
        where: { furnitureOrderId_materialType: { furnitureOrderId: id, materialType: type } },
        include: {
            items: true,
            purchaseOrder: { select: { id: true, code: true, status: true, supplier: true } },
        },
    });
    return NextResponse.json(order || { id: null, materialType: type, status: 'DRAFT', items: [], purchaseOrder: null });
});

export const PUT = withAuth(async (request, { params }) => {
    const { id, type } = await params;
    if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: 'Loại không hợp lệ' }, { status: 400 });

    const body = await request.json();
    const { items } = furnitureMaterialOrderUpdateSchema.parse(body);

    // Upsert the material order
    const existing = await prisma.furnitureMaterialOrder.findUnique({
        where: { furnitureOrderId_materialType: { furnitureOrderId: id, materialType: type } },
    });

    let materialOrder;
    if (existing) {
        // Delete old items and recreate
        await prisma.furnitureMaterialOrderItem.deleteMany({ where: { furnitureMaterialOrderId: existing.id } });
        materialOrder = await prisma.furnitureMaterialOrder.update({
            where: { id: existing.id },
            data: { items: { create: items } },
            include: { items: true },
        });
    } else {
        materialOrder = await prisma.furnitureMaterialOrder.create({
            data: {
                furnitureOrderId: id,
                materialType: type,
                items: { create: items },
            },
            include: { items: true },
        });
    }
    return NextResponse.json(materialOrder);
});
```

- [ ] **Step 3: Create material-orders/[type]/create-po route**

Tạo `app/api/furniture-orders/[id]/material-orders/[type]/create-po/route.js`:

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { NextResponse } from 'next/server';

const TYPE_LABELS = { VAN: 'Ván sản xuất', NEP: 'Nẹp chỉ', ACRYLIC: 'Cánh Acrylic' };
const VALID_TYPES = ['VAN', 'NEP', 'ACRYLIC'];

export const POST = withAuth(async (request, { params }) => {
    const { id, type } = await params;
    if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: 'Loại không hợp lệ' }, { status: 400 });

    const body = await request.json();
    const { supplier, supplierId, deliveryDate, notes, deliveryAddress } = body;
    if (!supplier?.trim()) return NextResponse.json({ error: 'Thiếu nhà cung cấp' }, { status: 400 });

    const furnitureOrder = await prisma.furnitureOrder.findUnique({ where: { id } });
    if (!furnitureOrder) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    const materialOrder = await prisma.furnitureMaterialOrder.findUnique({
        where: { furnitureOrderId_materialType: { furnitureOrderId: id, materialType: type } },
        include: { items: true },
    });
    if (!materialOrder || materialOrder.items.length === 0) {
        return NextResponse.json({ error: 'Chưa có vật liệu trong danh sách' }, { status: 400 });
    }
    if (materialOrder.purchaseOrderId) {
        return NextResponse.json({ error: 'Đã tạo PO cho loại vật liệu này rồi' }, { status: 400 });
    }

    const poCode = await generateCode('purchaseOrder', 'PO');
    const items = materialOrder.items.map(item => ({
        productName: `[${TYPE_LABELS[type]}] ${item.name}${item.colorCode ? ` — ${item.colorCode}` : ''}`,
        unit: item.unit || 'tờ',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.quantity * item.unitPrice,
        notes: item.notes || '',
    }));
    const totalAmount = items.reduce((s, i) => s + i.amount, 0);

    const po = await prisma.purchaseOrder.create({
        data: {
            code: poCode,
            supplier,
            supplierId: supplierId || null,
            totalAmount,
            paidAmount: 0,
            status: 'Chờ duyệt',
            notes: notes || '',
            projectId: furnitureOrder.projectId || null,
            deliveryAddress: deliveryAddress || furnitureOrder.deliveryAddress || '',
            deliveryType: 'Giao về xưởng',
            orderDate: new Date(),
            deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
            furnitureOrderId: id,
            materialType: type,
            items: { create: items },
        },
        include: { items: true },
    });

    // Link PO back to material order
    await prisma.furnitureMaterialOrder.update({
        where: { id: materialOrder.id },
        data: { purchaseOrderId: po.id, status: 'ORDERED' },
    });

    // Check if all 3 types are now ORDERED → update FurnitureOrder status
    const allOrders = await prisma.furnitureMaterialOrder.findMany({
        where: { furnitureOrderId: id },
    });
    const allOrdered = ['VAN', 'NEP', 'ACRYLIC'].every(t =>
        allOrders.find(o => o.materialType === t && o.status !== 'DRAFT')
    );
    if (allOrdered && furnitureOrder.status === 'cnc_ready') {
        await prisma.furnitureOrder.update({ where: { id }, data: { status: 'material_ordered' } });
    }

    return NextResponse.json(po, { status: 201 });
});
```

- [ ] **Step 4: Test manually**

```
1. PUT /api/furniture-orders/{id}/material-orders/VAN
   Body: { "items": [{ "name": "Ván MFC 18mm", "colorCode": "W01", "quantity": 10, "unit": "tờ", "unitPrice": 250000 }] }
   → 200 với materialOrder record

2. GET /api/furniture-orders/{id}/material-orders
   → { VAN: { items: [...] }, NEP: { items: [] }, ACRYLIC: { items: [] } }

3. POST /api/furniture-orders/{id}/material-orders/VAN/create-po
   Body: { "supplier": "Công ty Ván MDF", "deliveryDate": "2026-04-20" }
   → 201 với PO record, status=ORDERED
```

- [ ] **Step 5: Commit**

```bash
git add app/api/furniture-orders/[id]/material-orders/
git commit -m "feat(api): material orders CRUD + create-po for 3 material types"
```

---

## Task 5: GRN Hook — Auto-Update Material Order Status

**Files:**
- Modify: `app/api/purchase-orders/[id]/receive/route.js`

- [ ] **Step 1: Add auto-update hook at end of receive route**

Mở `app/api/purchase-orders/[id]/receive/route.js`. Sau đoạn cập nhật PO status (sau `const updatedPO = await prisma.purchaseOrder.update(...)`), trước `return NextResponse.json(updatedPO)`, thêm:

```javascript
    // Auto-update FurnitureMaterialOrder status khi nhận hàng PO nội thất
    if (updatedPO.furnitureOrderId && allReceived) {
        await prisma.furnitureMaterialOrder.updateMany({
            where: { purchaseOrderId: id },
            data: { status: 'RECEIVED' },
        });

        // Check nếu tất cả 3 type của FurnitureOrder đều RECEIVED
        const furnitureOrderId = updatedPO.furnitureOrderId;
        const allMaterialOrders = await prisma.furnitureMaterialOrder.findMany({
            where: { furnitureOrderId },
        });
        const allReceived3 = ['VAN', 'NEP', 'ACRYLIC'].every(t =>
            allMaterialOrders.find(o => o.materialType === t && o.status === 'RECEIVED')
        );
        if (allReceived3) {
            await prisma.furnitureOrder.update({
                where: { id: furnitureOrderId },
                data: { status: 'in_production' },
            });
        }
    }
```

- [ ] **Step 2: Test manually**

```
1. Đảm bảo có 1 PO với furnitureOrderId set (từ Task 4 create-po)
2. POST /api/purchase-orders/{poId}/receive
   Body: { "items": [{ "id": "{itemId}", "receivedQty": 10 }] }
   → FurnitureMaterialOrder.status = "RECEIVED"
   → Nếu 3 types đều RECEIVED: FurnitureOrder.status = "in_production"
```

- [ ] **Step 3: Commit**

```bash
git add app/api/purchase-orders/[id]/receive/route.js
git commit -m "feat(api): auto-update FurnitureMaterialOrder status on GRN receipt"
```

---

## Task 6: Acceptance Certificate API + Public Routes

**Files:**
- Create: `app/api/furniture-orders/[id]/acceptance/route.js`
- Create: `app/api/furniture-orders/[id]/acceptance/[aid]/route.js`
- Create: `app/api/furniture-orders/[id]/acceptance/[aid]/send/route.js`
- Create: `app/api/public/acceptance/[token]/route.js`

- [ ] **Step 1: Create acceptance GET/POST route**

Tạo `app/api/furniture-orders/[id]/acceptance/route.js`:

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { generateCode } from '@/lib/generateCode';
import { acceptanceCertificateCreateSchema } from '@/lib/validations/acceptanceCertificate';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_req, { params }) => {
    const { id } = await params;
    const certificates = await prisma.acceptanceCertificate.findMany({
        where: { furnitureOrderId: id },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(certificates);
});

export const POST = withAuth(async (request, { params }) => {
    const { id } = await params;
    const order = await prisma.furnitureOrder.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    const body = await request.json();
    const { items, quotationId, customerName } = acceptanceCertificateCreateSchema.parse(body);

    const code = await generateCode('acceptanceCertificate', 'BB');
    const cert = await prisma.acceptanceCertificate.create({
        data: {
            code,
            furnitureOrderId: id,
            quotationId: quotationId || null,
            customerName: customerName || order.name || '',
            items: { create: items },
        },
        include: { items: true },
    });
    return NextResponse.json(cert, { status: 201 });
});
```

- [ ] **Step 2: Create acceptance/[aid] GET/PUT route**

Tạo `app/api/furniture-orders/[id]/acceptance/[aid]/route.js`:

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { acceptanceCertificateUpdateSchema } from '@/lib/validations/acceptanceCertificate';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_req, { params }) => {
    const { aid } = await params;
    const cert = await prisma.acceptanceCertificate.findUnique({
        where: { id: aid },
        include: { items: true, furnitureOrder: { select: { id: true, name: true, code: true } } },
    });
    if (!cert) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json(cert);
});

export const PUT = withAuth(async (request, { params }) => {
    const { aid } = await params;
    const body = await request.json();
    const { items, ...headerData } = acceptanceCertificateUpdateSchema.parse(body);

    const cert = await prisma.$transaction(async (tx) => {
        if (items !== undefined) {
            await tx.acceptanceCertificateItem.deleteMany({ where: { certificateId: aid } });
            await tx.acceptanceCertificateItem.createMany({
                data: items.map(item => ({ ...item, certificateId: aid })),
            });
        }
        return tx.acceptanceCertificate.update({
            where: { id: aid },
            data: headerData,
            include: { items: true },
        });
    });
    return NextResponse.json(cert);
});
```

- [ ] **Step 3: Create acceptance/[aid]/send route**

Tạo `app/api/furniture-orders/[id]/acceptance/[aid]/send/route.js`:

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export const POST = withAuth(async (_req, { params }) => {
    const { aid } = await params;
    const cert = await prisma.acceptanceCertificate.findUnique({ where: { id: aid } });
    if (!cert) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (cert.items?.length === 0) return NextResponse.json({ error: 'Biên bản chưa có hạng mục' }, { status: 400 });

    const token = cert.publicToken || randomUUID();
    const updated = await prisma.acceptanceCertificate.update({
        where: { id: aid },
        data: { publicToken: token, status: 'SENT' },
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'https://erp.motnha.vn';
    return NextResponse.json({
        ...updated,
        publicUrl: `${baseUrl}/public/acceptance/${token}`,
    });
});
```

- [ ] **Step 4: Create public acceptance route (no auth)**

Tạo `app/api/public/acceptance/[token]/route.js`:

```javascript
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = async (_req, { params }) => {
    const { token } = await params;
    const cert = await prisma.acceptanceCertificate.findUnique({
        where: { publicToken: token },
        include: {
            items: true,
            furnitureOrder: { select: { id: true, name: true, code: true, deliveryAddress: true } },
        },
    });
    if (!cert) return NextResponse.json({ error: 'Link không hợp lệ hoặc đã hết hạn' }, { status: 404 });
    return NextResponse.json(cert);
};

export const POST = async (request, { params }) => {
    const { token } = await params;
    const cert = await prisma.acceptanceCertificate.findUnique({ where: { publicToken: token } });
    if (!cert) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (cert.status === 'SIGNED') return NextResponse.json({ error: 'Đã ký rồi' }, { status: 400 });

    const body = await request.json();
    const { customerName, customerSignatureUrl } = body;
    if (!customerSignatureUrl) return NextResponse.json({ error: 'Thiếu chữ ký' }, { status: 400 });

    const updated = await prisma.acceptanceCertificate.update({
        where: { id: cert.id },
        data: {
            status: 'SIGNED',
            customerName: customerName || cert.customerName,
            customerSignatureUrl,
            signedAt: new Date(),
        },
        include: { items: true },
    });
    return NextResponse.json(updated);
};
```

- [ ] **Step 5: Test manually**

```
1. POST /api/furniture-orders/{id}/acceptance
   Body: { "customerName": "Nguyễn Văn A", "items": [{ "itemName": "Tủ phòng ngủ", "quantity": 2, "unit": "bộ", "amount": 10000000 }] }
   → 201 với certificate record

2. POST /api/furniture-orders/{id}/acceptance/{aid}/send
   → 200 với publicUrl

3. GET /api/public/acceptance/{token}
   → certificate data (no auth needed)

4. POST /api/public/acceptance/{token}/sign
   Body: { "customerName": "Nguyễn Văn A", "customerSignatureUrl": "data:image/png;base64,..." }
   → status = SIGNED
```

- [ ] **Step 6: Commit**

```bash
git add app/api/furniture-orders/[id]/acceptance/ app/api/public/acceptance/
git commit -m "feat(api): acceptance certificate CRUD + public signing endpoint"
```

---

## Task 7: Navigation — Sidebar, Header, Project Tab

**Files:**
- Modify: `lib/generateCode.js` (already done in Task 2)
- Modify: `components/Sidebar.js`
- Modify: `components/Header.js`
- Create: `app/projects/[id]/tabs/FurnitureTab.js`
- Modify: `app/projects/[id]/page.js`

- [ ] **Step 1: Add menu item to Sidebar**

Trong `components/Sidebar.js`, tìm section chứa `{ href: '/projects', icon: Building2, label: 'Dự án' }`. Thêm sau dòng đó:

```javascript
{ href: '/noi-that', icon: Armchair, label: 'Nội thất', roles: ['giam_doc', 'ky_thuat', 'kho'] },
```

Thêm import `Armchair` vào import từ `lucide-react`:

```javascript
import { ..., Armchair } from 'lucide-react';
```

- [ ] **Step 2: Add page title to Header**

Trong `components/Header.js`, tìm object `pageTitles`. Thêm:

```javascript
    '/noi-that': 'Đơn hàng Nội thất',
```

- [ ] **Step 3: Create FurnitureTab for Project detail**

Tạo `app/projects/[id]/tabs/FurnitureTab.js`:

```javascript
'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/fetchClient';

export default function FurnitureTab({ projectId }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiFetch(`/api/furniture-orders?projectId=${projectId}&limit=50`)
            .then(d => setOrders(d.data || []))
            .finally(() => setLoading(false));
    }, [projectId]);

    const STATUS_LABEL = {
        draft: 'Nháp', confirmed: 'Xác nhận', cnc_ready: 'Có CNC',
        material_ordered: 'Đặt VL', in_production: 'Sản xuất',
        installing: 'Lắp đặt', completed: 'Hoàn thành', cancelled: 'Hủy',
    };
    const STATUS_BADGE = {
        draft: 'secondary', confirmed: 'warning', cnc_ready: 'info',
        material_ordered: 'info', in_production: 'warning',
        installing: 'warning', completed: 'success', cancelled: 'danger',
    };

    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">🪵 Đơn hàng Nội thất</span>
                <a href={`/noi-that?projectId=${projectId}`} className="btn btn-sm btn-primary">
                    + Tạo đơn mới
                </a>
            </div>
            {loading ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : orders.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Chưa có đơn hàng nội thất nào
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Mã</th><th>Tên đơn hàng</th><th>Trạng thái</th><th>Ngày tạo</th><th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(o => (
                                <tr key={o.id}>
                                    <td><code style={{ fontSize: 12 }}>{o.code}</code></td>
                                    <td>{o.name}</td>
                                    <td>
                                        <span className={`badge ${STATUS_BADGE[o.status] || 'secondary'}`}>
                                            {STATUS_LABEL[o.status] || o.status}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        {new Date(o.createdAt).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td>
                                        <a href={`/noi-that/${o.id}`} className="btn btn-ghost btn-sm">Chi tiết →</a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 4: Add FurnitureTab to project page**

Trong `app/projects/[id]/page.js`:

Thêm import:
```javascript
import FurnitureTab from './tabs/FurnitureTab';
```

Trong array `TABS`, thêm:
```javascript
    { key: 'furniture', label: 'Nội thất', icon: '🪵' },
```

Trong phần render tabs, tìm đoạn switch/conditional rendering. Thêm:
```javascript
{tab === 'furniture' && <FurnitureTab projectId={id} />}
```

- [ ] **Step 5: Commit**

```bash
git add components/Sidebar.js components/Header.js app/projects/[id]/tabs/FurnitureTab.js app/projects/[id]/page.js
git commit -m "feat(nav): add Nội thất sidebar item, Header title, FurnitureTab in project"
```

---

## Task 8: /noi-that List Page

**Files:**
- Create: `app/noi-that/page.js`

- [ ] **Step 1: Create furniture orders list page**

Tạo `app/noi-that/page.js`:

```javascript
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { apiFetch } from '@/lib/fetchClient';

const STATUS_LABEL = {
    draft: 'Nháp', confirmed: 'Xác nhận', cnc_ready: 'Có CNC',
    material_ordered: 'Đặt VL', in_production: 'Sản xuất',
    installing: 'Lắp đặt', completed: 'Hoàn thành', cancelled: 'Hủy',
};
const STATUS_BADGE = {
    draft: 'secondary', confirmed: 'warning', cnc_ready: 'info',
    material_ordered: 'info', in_production: 'warning',
    installing: 'warning', completed: 'success', cancelled: 'danger',
};
const ALL_STATUSES = Object.keys(STATUS_LABEL);

function FurnitureOrderListContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
    const [showCreateModal, setShowCreateModal] = useState(searchParams.get('action') === 'create');
    const [createForm, setCreateForm] = useState({ name: '', customerId: '', projectId: searchParams.get('projectId') || '' });
    const [customers, setCustomers] = useState([]);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const qs = new URLSearchParams({ limit: '50' });
            if (search) qs.set('search', search);
            if (filterStatus) qs.set('status', filterStatus);
            if (searchParams.get('projectId')) qs.set('projectId', searchParams.get('projectId'));
            const data = await apiFetch(`/api/furniture-orders?${qs}`);
            setOrders(data.data || []);
            setTotal(data.pagination?.total || 0);
        } finally {
            setLoading(false);
        }
    }, [search, filterStatus, searchParams]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const openCreateModal = async () => {
        if (customers.length === 0) {
            const d = await apiFetch('/api/customers?limit=500');
            setCustomers(d.data || []);
        }
        setShowCreateModal(true);
    };

    const createOrder = async () => {
        if (!createForm.name.trim()) return alert('Nhập tên đơn hàng!');
        if (!createForm.customerId) return alert('Chọn khách hàng!');
        try {
            const order = await apiFetch('/api/furniture-orders', {
                method: 'POST',
                body: { name: createForm.name, customerId: createForm.customerId, projectId: createForm.projectId || null },
            });
            setShowCreateModal(false);
            router.push(`/noi-that/${order.id}`);
        } catch (err) {
            alert(err.message || 'Lỗi tạo đơn hàng');
        }
    };

    return (
        <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🪵 Đơn hàng Nội thất</h1>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{total} đơn hàng</div>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>+ Tạo đơn hàng</button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <input
                    className="form-input"
                    style={{ width: 260 }}
                    placeholder="Tìm theo mã, tên..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <select className="form-input" style={{ width: 180 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">Tất cả trạng thái</option>
                    {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
            </div>

            <div className="card">
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : orders.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có đơn hàng nào</div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Mã</th><th>Tên đơn hàng</th><th>Khách hàng</th>
                                    <th>Dự án</th><th>Trạng thái</th><th>Ngày tạo</th><th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(o => (
                                    <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/noi-that/${o.id}`)}>
                                        <td><code style={{ fontSize: 12 }}>{o.code}</code></td>
                                        <td style={{ fontWeight: 600 }}>{o.name}</td>
                                        <td style={{ fontSize: 13 }}>{o.customer?.name}</td>
                                        <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{o.project?.name}</td>
                                        <td>
                                            <span className={`badge ${STATUS_BADGE[o.status] || 'secondary'}`}>
                                                {STATUS_LABEL[o.status] || o.status}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {new Date(o.createdAt).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <a href={`/noi-that/${o.id}`} className="btn btn-ghost btn-sm">→</a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Tạo đơn hàng nội thất</h3>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tên đơn hàng *</label>
                                <input className="form-input" placeholder="VD: Nội thất biệt thự Vinhomes" value={createForm.name}
                                    onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Khách hàng *</label>
                                <select className="form-input" value={createForm.customerId}
                                    onChange={e => setCreateForm({ ...createForm, customerId: e.target.value })}>
                                    <option value="">-- Chọn khách hàng --</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                                <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Hủy</button>
                                <button className="btn btn-primary" onClick={createOrder}>Tạo đơn hàng</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function FurnitureOrderListPage() {
    return (
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>}>
            <FurnitureOrderListContent />
        </Suspense>
    );
}
```

- [ ] **Step 2: Test manually**

```
1. Vào http://localhost:3000/noi-that
   → Trang list hiển thị
2. Nhấn "+ Tạo đơn hàng" → modal mở
3. Nhập tên, chọn khách hàng → Tạo
   → Redirect sang /noi-that/{id}
```

- [ ] **Step 3: Commit**

```bash
git add app/noi-that/page.js
git commit -m "feat(ui): /noi-that list page with create modal"
```

---

## Task 9: /noi-that/[id] Detail Page — 4 Tabs

**Files:**
- Create: `app/noi-that/[id]/page.js`
- Create: `app/noi-that/[id]/tabs/OverviewTab.js`
- Create: `app/noi-that/[id]/tabs/CncFilesTab.js`
- Create: `app/noi-that/[id]/tabs/MaterialOrdersTab.js`
- Create: `app/noi-that/[id]/tabs/AcceptanceTab.js`

- [ ] **Step 1: Create detail page shell**

Tạo `app/noi-that/[id]/page.js`:

```javascript
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/fetchClient';
import OverviewTab from './tabs/OverviewTab';
import CncFilesTab from './tabs/CncFilesTab';
import MaterialOrdersTab from './tabs/MaterialOrdersTab';
import AcceptanceTab from './tabs/AcceptanceTab';

const TABS = [
    { key: 'overview', label: 'Tổng quan', icon: '📋' },
    { key: 'cnc', label: 'File CNC', icon: '🔧' },
    { key: 'materials', label: 'Vật liệu', icon: '📦' },
    { key: 'acceptance', label: 'Nghiệm thu', icon: '✅' },
];

const STATUS_STEPS = [
    { key: 'draft', label: 'Nháp' },
    { key: 'confirmed', label: 'Xác nhận' },
    { key: 'cnc_ready', label: 'CNC OK' },
    { key: 'material_ordered', label: 'Đặt VL' },
    { key: 'in_production', label: 'Sản xuất' },
    { key: 'installing', label: 'Lắp đặt' },
    { key: 'completed', label: 'Hoàn thành' },
];

export default function FurnitureOrderDetailPage() {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');

    const fetchOrder = useCallback(async () => {
        try {
            const data = await apiFetch(`/api/furniture-orders/${id}`);
            setOrder(data);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchOrder(); }, [fetchOrder]);

    if (loading || !order) {
        return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;
    }

    const stepIdx = STATUS_STEPS.findIndex(s => s.key === order.status);

    return (
        <div style={{ padding: '20px 24px' }}>
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
                <a href="/noi-that" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>← Danh sách</a>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🪵 {order.name}</h1>
                    <code style={{ fontSize: 13, color: 'var(--text-muted)' }}>{order.code}</code>
                </div>
                {order.project && (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                        Dự án: <a href={`/projects/${order.projectId}`}>{order.project.name}</a>
                    </div>
                )}
            </div>

            {/* Step indicator */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 24, overflowX: 'auto' }}>
                {STATUS_STEPS.map((step, i) => (
                    <div key={step.key} style={{
                        display: 'flex', alignItems: 'center', flex: 1, minWidth: 80,
                    }}>
                        <div style={{
                            textAlign: 'center', fontSize: 11, padding: '6px 8px',
                            background: i < stepIdx ? 'var(--status-success)' : i === stepIdx ? 'var(--status-info)' : 'var(--bg-secondary)',
                            color: i <= stepIdx ? '#fff' : 'var(--text-muted)',
                            borderRadius: i === 0 ? '6px 0 0 6px' : i === STATUS_STEPS.length - 1 ? '0 6px 6px 0' : 0,
                            flex: 1, fontWeight: i === stepIdx ? 700 : 400,
                        }}>
                            {step.label}
                        </div>
                        {i < STATUS_STEPS.length - 1 && (
                            <div style={{ width: 12, height: 24, background: i < stepIdx ? 'var(--status-success)' : 'var(--bg-secondary)', flexShrink: 0 }} />
                        )}
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: 20 }}>
                {TABS.map(t => (
                    <button
                        key={t.key}
                        className={`tab-btn ${tab === t.key ? 'active' : ''}`}
                        onClick={() => setTab(t.key)}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {tab === 'overview' && <OverviewTab order={order} onRefresh={fetchOrder} />}
            {tab === 'cnc' && <CncFilesTab orderId={id} order={order} onRefresh={fetchOrder} />}
            {tab === 'materials' && <MaterialOrdersTab orderId={id} order={order} onRefresh={fetchOrder} />}
            {tab === 'acceptance' && <AcceptanceTab orderId={id} order={order} onRefresh={fetchOrder} />}
        </div>
    );
}
```

- [ ] **Step 2: Create OverviewTab**

Tạo `app/noi-that/[id]/tabs/OverviewTab.js`:

```javascript
'use client';
import { apiFetch } from '@/lib/fetchClient';

const NEXT_ACTION = {
    draft: { label: 'Xác nhận đơn hàng', targetStatus: 'confirmed' },
    confirmed: null, // CNC tab handles confirm-cnc
    cnc_ready: null, // Material tab handles material ordering
    material_ordered: null, // Auto via GRN
    in_production: { label: 'Bắt đầu lắp đặt', targetStatus: 'installing' },
    installing: null, // Acceptance tab handles completion
};

export default function OverviewTab({ order, onRefresh }) {
    const action = NEXT_ACTION[order.status];

    const advanceStatus = async () => {
        if (!action) return;
        if (!confirm(`Chuyển sang trạng thái "${action.label}"?`)) return;
        try {
            await apiFetch(`/api/furniture-orders/${order.id}`, {
                method: 'PUT',
                body: { status: action.targetStatus },
            });
            onRefresh();
        } catch (err) {
            alert(err.message || 'Lỗi cập nhật trạng thái');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
                <div className="card-header">
                    <span className="card-title">Thông tin đơn hàng</span>
                    {action && (
                        <button className="btn btn-primary btn-sm" onClick={advanceStatus}>
                            {action.label} →
                        </button>
                    )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 0 12px 0' }}>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Khách hàng</div>
                        <div style={{ fontWeight: 600 }}>{order.customer?.name}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Dự án</div>
                        <div>{order.project?.name || '—'}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Địa chỉ giao</div>
                        <div>{order.deliveryAddress || '—'}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ngày giao dự kiến</div>
                        <div>{order.expectedDelivery ? new Date(order.expectedDelivery).toLocaleDateString('vi-VN') : '—'}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Phong cách</div>
                        <div>{order.styleNote || '—'}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Loại phòng</div>
                        <div>{order.roomType || '—'}</div>
                    </div>
                </div>
                {order.internalNote && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
                        📝 {order.internalNote}
                    </div>
                )}
            </div>

            {order.items?.length > 0 && (
                <div className="card">
                    <div className="card-header"><span className="card-title">Hạng mục</span></div>
                    <div className="table-container">
                        <table className="data-table" style={{ fontSize: 13 }}>
                            <thead><tr><th>Tên hạng mục</th><th>SL</th><th>ĐVT</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
                            <tbody>
                                {order.items.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.name}</td>
                                        <td>{item.quantity}</td>
                                        <td>{item.unit}</td>
                                        <td>{item.unitPrice?.toLocaleString('vi-VN')}</td>
                                        <td style={{ fontWeight: 600 }}>{item.amount?.toLocaleString('vi-VN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 3: Create CncFilesTab**

Tạo `app/noi-that/[id]/tabs/CncFilesTab.js`:

```javascript
'use client';
import { useState, useEffect, useRef } from 'react';

export default function CncFilesTab({ orderId, order, onRefresh }) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [pieceCount, setPieceCount] = useState(0);
    const [notes, setNotes] = useState('');
    const fileRef = useRef(null);

    const fetchFiles = async () => {
        setLoading(true);
        const res = await fetch(`/api/furniture-orders/${orderId}/cnc-files`);
        const data = await res.json();
        setFiles(data);
        setLoading(false);
    };

    useEffect(() => { fetchFiles(); }, [orderId]);

    const uploadFile = async () => {
        const file = fileRef.current?.files?.[0];
        if (!file) return alert('Chọn file trước!');
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('pieceCount', pieceCount);
            formData.append('notes', notes);
            const res = await fetch(`/api/furniture-orders/${orderId}/cnc-files`, {
                method: 'POST',
                body: formData,
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Lỗi upload');
            fileRef.current.value = '';
            setPieceCount(0);
            setNotes('');
            await fetchFiles();
        } catch (err) {
            alert(err.message);
        } finally {
            setUploading(false);
        }
    };

    const deleteFile = async (fid) => {
        if (!confirm('Xóa file này?')) return;
        await fetch(`/api/furniture-orders/${orderId}/cnc-files/${fid}`, { method: 'DELETE' });
        await fetchFiles();
    };

    const confirmCnc = async () => {
        if (!confirm('Xác nhận CNC hoàn tất? Trạng thái sẽ chuyển sang "Có CNC".')) return;
        const res = await fetch(`/api/furniture-orders/${orderId}/confirm-cnc`, { method: 'POST' });
        if (!res.ok) {
            const d = await res.json();
            return alert(d.error || 'Lỗi');
        }
        onRefresh();
    };

    const totalPieces = files.reduce((s, f) => s + f.pieceCount, 0);
    const canConfirm = order.status === 'confirmed' && files.length > 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
                <div className="card-header">
                    <span className="card-title">Upload File CNC</span>
                    {canConfirm && (
                        <button className="btn btn-primary btn-sm" onClick={confirmCnc}>
                            ✅ Xác nhận CNC hoàn tất
                        </button>
                    )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'end' }}>
                    <div>
                        <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>File DXF/PDF</label>
                        <input type="file" ref={fileRef} accept=".dxf,.pdf,.dwg" className="form-input" />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Số tấm</label>
                        <input type="number" className="form-input" style={{ width: 80 }} value={pieceCount}
                            onChange={e => setPieceCount(Number(e.target.value))} min={0} />
                    </div>
                    <button className="btn btn-primary" onClick={uploadFile} disabled={uploading}>
                        {uploading ? 'Đang tải...' : '⬆ Upload'}
                    </button>
                </div>
                <input className="form-input" style={{ marginTop: 8 }} placeholder="Ghi chú..."
                    value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">Danh sách file CNC</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tổng: <strong>{totalPieces}</strong> tấm</span>
                </div>
                {loading ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : files.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có file nào</div>
                ) : (
                    <div className="table-container">
                        <table className="data-table" style={{ fontSize: 13 }}>
                            <thead><tr><th>Tên file</th><th>Số tấm</th><th>Ghi chú</th><th>Ngày upload</th><th></th></tr></thead>
                            <tbody>
                                {files.map(f => (
                                    <tr key={f.id}>
                                        <td>
                                            <a href={f.fileUrl} target="_blank" rel="noopener noreferrer"
                                                style={{ color: 'var(--status-info)' }}>
                                                📄 {f.fileName}
                                            </a>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{f.pieceCount}</td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{f.notes || '—'}</td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {new Date(f.uploadedAt).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td>
                                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)' }}
                                                onClick={() => deleteFile(f.id)}>🗑</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Create MaterialOrdersTab**

Tạo `app/noi-that/[id]/tabs/MaterialOrdersTab.js`:

```javascript
'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/fetchClient';

const TYPE_CONFIG = {
    VAN: { label: 'Ván sản xuất', icon: '🪵', unit: 'tờ' },
    NEP: { label: 'Nẹp chỉ', icon: '📏', unit: 'mét' },
    ACRYLIC: { label: 'Cánh Acrylic', icon: '✨', unit: 'tờ' },
};
const STATUS_BADGE = { DRAFT: 'secondary', ORDERED: 'info', RECEIVED: 'success' };
const STATUS_LABEL = { DRAFT: 'Chưa đặt', ORDERED: 'Đã đặt', RECEIVED: 'Đã nhận' };

const emptyItem = () => ({ name: '', colorCode: '', thickness: '', quantity: 0, unit: '', unitPrice: 0, notes: '' });

export default function MaterialOrdersTab({ orderId, order, onRefresh }) {
    const [materialOrders, setMaterialOrders] = useState({ VAN: null, NEP: null, ACRYLIC: null });
    const [editType, setEditType] = useState(null);
    const [editItems, setEditItems] = useState([]);
    const [saving, setSaving] = useState(false);
    const [showPoModal, setShowPoModal] = useState(false);
    const [poType, setPoType] = useState(null);
    const [poForm, setPoForm] = useState({ supplier: '', deliveryDate: '', notes: '', deliveryAddress: '' });
    const [suppliers, setSuppliers] = useState([]);
    const [creatingPo, setCreatingPo] = useState(false);

    const fetchMaterialOrders = useCallback(async () => {
        const data = await apiFetch(`/api/furniture-orders/${orderId}/material-orders`);
        setMaterialOrders(data);
    }, [orderId]);

    useEffect(() => { fetchMaterialOrders(); }, [fetchMaterialOrders]);

    const startEdit = (type) => {
        const mo = materialOrders[type];
        setEditItems(mo?.items?.length > 0 ? mo.items.map(i => ({ ...i })) : [emptyItem()]);
        setEditType(type);
    };

    const saveItems = async () => {
        setSaving(true);
        try {
            await apiFetch(`/api/furniture-orders/${orderId}/material-orders/${editType}`, {
                method: 'PUT',
                body: { items: editItems.filter(i => i.name.trim()) },
            });
            setEditType(null);
            await fetchMaterialOrders();
        } catch (err) {
            alert(err.message || 'Lỗi lưu');
        } finally {
            setSaving(false);
        }
    };

    const openPoModal = async (type) => {
        if (suppliers.length === 0) {
            const d = await apiFetch('/api/suppliers?limit=500');
            setSuppliers(d.data || []);
        }
        setPoType(type);
        setPoForm({ supplier: '', deliveryDate: '', notes: '', deliveryAddress: order.deliveryAddress || '' });
        setShowPoModal(true);
    };

    const createPo = async () => {
        if (!poForm.supplier.trim()) return alert('Nhập tên nhà cung cấp!');
        setCreatingPo(true);
        try {
            await apiFetch(`/api/furniture-orders/${orderId}/material-orders/${poType}/create-po`, {
                method: 'POST',
                body: poForm,
            });
            setShowPoModal(false);
            await fetchMaterialOrders();
            onRefresh();
        } catch (err) {
            alert(err.message || 'Lỗi tạo PO');
        } finally {
            setCreatingPo(false);
        }
    };

    const updateItem = (idx, field, value) => {
        setEditItems(prev => {
            const n = [...prev];
            n[idx] = { ...n[idx], [field]: value };
            return n;
        });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
                const mo = materialOrders[type];
                const isEditing = editType === type;
                return (
                    <div className="card" key={type}>
                        <div className="card-header">
                            <span className="card-title">{cfg.icon} {cfg.label}</span>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {mo?.status && (
                                    <span className={`badge ${STATUS_BADGE[mo.status] || 'secondary'}`}>
                                        {STATUS_LABEL[mo.status] || mo.status}
                                    </span>
                                )}
                                {mo?.purchaseOrder && (
                                    <a href={`/purchasing`} style={{ fontSize: 12, color: 'var(--status-info)' }}>
                                        📋 {mo.purchaseOrder.code}
                                    </a>
                                )}
                                {!mo?.purchaseOrderId && (
                                    <button className="btn btn-ghost btn-sm" onClick={() => isEditing ? saveItems() : startEdit(type)}>
                                        {isEditing ? (saving ? 'Đang lưu...' : '💾 Lưu') : '✏️ Sửa'}
                                    </button>
                                )}
                                {!mo?.purchaseOrderId && mo?.items?.length > 0 && !isEditing && (
                                    <button className="btn btn-primary btn-sm" onClick={() => openPoModal(type)}>
                                        🛒 Tạo PO
                                    </button>
                                )}
                            </div>
                        </div>

                        {isEditing ? (
                            <div>
                                <table className="data-table" style={{ fontSize: 12 }}>
                                    <thead>
                                        <tr><th>Tên vật liệu</th><th>Mã màu</th><th>Dày (mm)</th><th>SL</th><th>ĐVT</th><th>Đơn giá</th><th></th></tr>
                                    </thead>
                                    <tbody>
                                        {editItems.map((item, i) => (
                                            <tr key={i}>
                                                <td><input className="form-input" style={{ fontSize: 12 }} value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} /></td>
                                                <td><input className="form-input" style={{ fontSize: 12, width: 70 }} value={item.colorCode} onChange={e => updateItem(i, 'colorCode', e.target.value)} /></td>
                                                <td><input type="number" className="form-input" style={{ fontSize: 12, width: 60 }} value={item.thickness || ''} onChange={e => updateItem(i, 'thickness', e.target.value ? Number(e.target.value) : null)} /></td>
                                                <td><input type="number" className="form-input" style={{ fontSize: 12, width: 60 }} value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} /></td>
                                                <td><input className="form-input" style={{ fontSize: 12, width: 60 }} value={item.unit || cfg.unit} onChange={e => updateItem(i, 'unit', e.target.value)} /></td>
                                                <td><input type="number" className="form-input" style={{ fontSize: 12, width: 90 }} value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))} /></td>
                                                <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)' }} onClick={() => setEditItems(p => p.filter((_, j) => j !== i))}>🗑</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setEditItems(p => [...p, emptyItem()])}>+ Thêm dòng</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setEditType(null)}>Hủy</button>
                                </div>
                            </div>
                        ) : mo?.items?.length > 0 ? (
                            <div className="table-container">
                                <table className="data-table" style={{ fontSize: 13 }}>
                                    <thead><tr><th>Tên vật liệu</th><th>Mã màu</th><th>Dày</th><th>SL</th><th>ĐVT</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
                                    <tbody>
                                        {mo.items.map(item => (
                                            <tr key={item.id}>
                                                <td style={{ fontWeight: 600 }}>{item.name}</td>
                                                <td>{item.colorCode || '—'}</td>
                                                <td>{item.thickness ? `${item.thickness}mm` : '—'}</td>
                                                <td>{item.quantity}</td>
                                                <td>{item.unit || cfg.unit}</td>
                                                <td>{item.unitPrice?.toLocaleString('vi-VN')}</td>
                                                <td style={{ fontWeight: 600 }}>{(item.quantity * item.unitPrice).toLocaleString('vi-VN')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--text-muted)' }}>
                                Chưa có danh sách vật liệu. Nhấn ✏️ Sửa để thêm.
                            </div>
                        )}
                    </div>
                );
            })}

            {showPoModal && (
                <div className="modal-overlay" onClick={() => setShowPoModal(false)}>
                    <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Tạo PO — {TYPE_CONFIG[poType]?.label}</h3>
                            <button className="modal-close" onClick={() => setShowPoModal(false)}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nhà cung cấp *</label>
                                <input className="form-input" placeholder="Tên nhà cung cấp" value={poForm.supplier}
                                    onChange={e => setPoForm({ ...poForm, supplier: e.target.value })} list="ncc-list" />
                                <datalist id="ncc-list">
                                    {suppliers.map(s => <option key={s.id} value={s.name} />)}
                                </datalist>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ngày giao</label>
                                    <input type="date" className="form-input" value={poForm.deliveryDate}
                                        onChange={e => setPoForm({ ...poForm, deliveryDate: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Địa chỉ giao</label>
                                    <input className="form-input" value={poForm.deliveryAddress}
                                        onChange={e => setPoForm({ ...poForm, deliveryAddress: e.target.value })} />
                                </div>
                            </div>
                            <textarea className="form-input" rows={2} placeholder="Ghi chú..." value={poForm.notes}
                                onChange={e => setPoForm({ ...poForm, notes: e.target.value })} />
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost" onClick={() => setShowPoModal(false)}>Hủy</button>
                                <button className="btn btn-primary" onClick={createPo} disabled={creatingPo}>
                                    {creatingPo ? 'Đang tạo...' : '🛒 Tạo PO'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 5: Create AcceptanceTab**

Tạo `app/noi-that/[id]/tabs/AcceptanceTab.js`:

```javascript
'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/fetchClient';

const emptyItem = () => ({ itemName: '', quantity: 1, unit: 'bộ', amount: 0, notes: '' });

export default function AcceptanceTab({ orderId, order, onRefresh }) {
    const [certs, setCerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newItems, setNewItems] = useState([emptyItem()]);
    const [customerName, setCustomerName] = useState(order.customer?.name || '');
    const [creating, setCreating] = useState(false);
    const [sendingId, setSendingId] = useState(null);
    const [sentUrl, setSentUrl] = useState(null);

    const fetchCerts = useCallback(async () => {
        setLoading(true);
        const data = await apiFetch(`/api/furniture-orders/${orderId}/acceptance`);
        setCerts(data);
        setLoading(false);
    }, [orderId]);

    useEffect(() => { fetchCerts(); }, [fetchCerts]);

    const createCert = async () => {
        const validItems = newItems.filter(i => i.itemName.trim());
        if (validItems.length === 0) return alert('Thêm ít nhất 1 hạng mục!');
        setCreating(true);
        try {
            await apiFetch(`/api/furniture-orders/${orderId}/acceptance`, {
                method: 'POST',
                body: { customerName, items: validItems },
            });
            setShowCreateModal(false);
            setNewItems([emptyItem()]);
            await fetchCerts();
        } catch (err) {
            alert(err.message || 'Lỗi tạo biên bản');
        } finally {
            setCreating(false);
        }
    };

    const sendCert = async (aid) => {
        setSendingId(aid);
        try {
            const data = await apiFetch(`/api/furniture-orders/${orderId}/acceptance/${aid}/send`, { method: 'POST' });
            setSentUrl(data.publicUrl);
            await fetchCerts();
        } catch (err) {
            alert(err.message || 'Lỗi gửi link');
        } finally {
            setSendingId(null);
        }
    };

    const updateNewItem = (idx, field, value) => {
        setNewItems(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: value }; return n; });
    };

    const STATUS_LABEL = { DRAFT: 'Nháp', SENT: 'Đã gửi', SIGNED: 'Đã ký' };
    const STATUS_BADGE = { DRAFT: 'secondary', SENT: 'warning', SIGNED: 'success' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    + Tạo biên bản nghiệm thu
                </button>
            </div>

            {sentUrl && (
                <div className="card" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
                    <div style={{ fontSize: 13 }}>
                        ✅ Link gửi khách: <a href={sentUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--status-success)', fontWeight: 600 }}>{sentUrl}</a>
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => { navigator.clipboard.writeText(sentUrl); alert('Đã copy!'); }}>📋 Copy link</button>
                </div>
            )}

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : certs.length === 0 ? (
                <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Chưa có biên bản nghiệm thu
                </div>
            ) : (
                certs.map(cert => (
                    <div className="card" key={cert.id}>
                        <div className="card-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <code style={{ fontSize: 13 }}>{cert.code}</code>
                                <span className={`badge ${STATUS_BADGE[cert.status] || 'secondary'}`}>
                                    {STATUS_LABEL[cert.status] || cert.status}
                                </span>
                                {cert.signedAt && (
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        Ký {new Date(cert.signedAt).toLocaleDateString('vi-VN')}
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {cert.status !== 'SIGNED' && (
                                    <button className="btn btn-ghost btn-sm" onClick={() => sendCert(cert.id)} disabled={sendingId === cert.id}>
                                        {sendingId === cert.id ? 'Đang gửi...' : '🔗 Gửi link KH'}
                                    </button>
                                )}
                                {cert.publicToken && (
                                    <a href={`/public/acceptance/${cert.publicToken}`} target="_blank" rel="noopener noreferrer"
                                        className="btn btn-ghost btn-sm">👁 Xem</a>
                                )}
                            </div>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                            Khách hàng: {cert.customerName}
                        </div>
                        <table className="data-table" style={{ fontSize: 12 }}>
                            <thead><tr><th>Hạng mục</th><th>SL</th><th>ĐVT</th><th>Thành tiền</th><th>Ngày nghiệm thu</th></tr></thead>
                            <tbody>
                                {cert.items?.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.itemName}</td>
                                        <td>{item.quantity}</td>
                                        <td>{item.unit}</td>
                                        <td>{item.amount?.toLocaleString('vi-VN')}</td>
                                        <td style={{ color: 'var(--text-muted)' }}>
                                            {item.acceptedAt ? new Date(item.acceptedAt).toLocaleDateString('vi-VN') : '—'}
                                        </td>
                                    </tr>
                                ))}
                                <tr>
                                    <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>Tổng:</td>
                                    <td style={{ fontWeight: 700 }}>
                                        {cert.items?.reduce((s, i) => s + i.amount, 0).toLocaleString('vi-VN')}
                                    </td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                ))
            )}

            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" style={{ maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Tạo biên bản nghiệm thu</h3>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tên khách hàng</label>
                                <input className="form-input" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                            </div>
                            <table className="data-table" style={{ fontSize: 12 }}>
                                <thead><tr><th>Hạng mục</th><th>SL</th><th>ĐVT</th><th>Thành tiền</th><th></th></tr></thead>
                                <tbody>
                                    {newItems.map((item, i) => (
                                        <tr key={i}>
                                            <td><input className="form-input" style={{ fontSize: 12 }} value={item.itemName} onChange={e => updateNewItem(i, 'itemName', e.target.value)} placeholder="Tên hạng mục" /></td>
                                            <td><input type="number" className="form-input" style={{ fontSize: 12, width: 60 }} value={item.quantity} onChange={e => updateNewItem(i, 'quantity', Number(e.target.value))} /></td>
                                            <td><input className="form-input" style={{ fontSize: 12, width: 60 }} value={item.unit} onChange={e => updateNewItem(i, 'unit', e.target.value)} /></td>
                                            <td><input type="number" className="form-input" style={{ fontSize: 12, width: 110 }} value={item.amount} onChange={e => updateNewItem(i, 'amount', Number(e.target.value))} /></td>
                                            <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)' }} onClick={() => setNewItems(p => p.filter((_, j) => j !== i))}>🗑</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button className="btn btn-ghost btn-sm" onClick={() => setNewItems(p => [...p, emptyItem()])}>+ Thêm hạng mục</button>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Hủy</button>
                                <button className="btn btn-primary" onClick={createCert} disabled={creating}>
                                    {creating ? 'Đang tạo...' : 'Tạo biên bản'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 6: Test manually**

```
1. Vào /noi-that/{id}
   → Header + step indicator + 4 tabs hiển thị
2. Tab Tổng quan → thông tin đơn hàng, nút "Xác nhận đơn hàng"
3. Tab File CNC → upload file, confirm CNC
4. Tab Vật liệu → nhập danh sách ván/nẹp/acrylic, tạo PO
5. Tab Nghiệm thu → tạo biên bản, gửi link
```

- [ ] **Step 7: Commit**

```bash
git add app/noi-that/[id]/
git commit -m "feat(ui): /noi-that/[id] detail page with 4 tabs (overview, CNC, materials, acceptance)"
```

---

## Task 10: Public Acceptance Signing Page

**Files:**
- Create: `app/public/acceptance/[token]/page.js`

- [ ] **Step 1: Create public acceptance page**

Tạo `app/public/acceptance/[token]/page.js`:

```javascript
'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

export default function PublicAcceptancePage() {
    const { token } = useParams();
    const [cert, setCert] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [signing, setSigning] = useState(false);
    const [signed, setSigned] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [signatureMode, setSignatureMode] = useState('draw'); // draw | upload
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const uploadRef = useRef(null);

    useEffect(() => {
        fetch(`/api/public/acceptance/${token}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) setError(data.error);
                else {
                    setCert(data);
                    setCustomerName(data.customerName || '');
                    if (data.status === 'SIGNED') setSigned(true);
                }
            })
            .catch(() => setError('Không thể tải dữ liệu'))
            .finally(() => setLoading(false));
    }, [token]);

    const startDraw = (e) => {
        setIsDrawing(true);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };
    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000';
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };
    const stopDraw = () => setIsDrawing(false);
    const clearCanvas = () => {
        const canvas = canvasRef.current;
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    };

    const submitSign = async () => {
        let signatureUrl;
        if (signatureMode === 'draw') {
            const canvas = canvasRef.current;
            signatureUrl = canvas.toDataURL('image/png');
            // Check if canvas is empty
            const ctx = canvas.getContext('2d');
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            if (!data.some(v => v !== 0)) return alert('Vui lòng ký tên vào ô chữ ký!');
        } else {
            const file = uploadRef.current?.files?.[0];
            if (!file) return alert('Chọn ảnh chữ ký!');
            signatureUrl = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
        }

        setSigning(true);
        try {
            const res = await fetch(`/api/public/acceptance/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerName, customerSignatureUrl: signatureUrl }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Lỗi ký');
            setSigned(true);
        } catch (err) {
            alert(err.message);
        } finally {
            setSigning(false);
        }
    };

    if (loading) return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>Đang tải...</div>
    );
    if (error) return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif', color: '#ef4444' }}>
            ❌ {error}
        </div>
    );
    if (signed) return (
        <div style={{ maxWidth: 600, margin: '60px auto', padding: 24, fontFamily: 'sans-serif', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ color: '#22c55e', marginBottom: 8 }}>Đã ký thành công!</h2>
            <p style={{ color: '#6b7280' }}>Biên bản nghiệm thu đã được xác nhận.</p>
            {cert?.signedAt && (
                <p style={{ fontSize: 14, color: '#9ca3af' }}>
                    Ngày ký: {new Date(cert.signedAt).toLocaleString('vi-VN')}
                </p>
            )}
        </div>
    );

    const total = cert?.items?.reduce((s, i) => s + i.amount, 0) || 0;

    return (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px', fontFamily: 'sans-serif' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px 0' }}>BIÊN BẢN NGHIỆM THU</h2>
                <div style={{ fontSize: 14, color: '#6b7280' }}>
                    {cert?.furnitureOrder?.name} — {cert?.code}
                </div>
            </div>

            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                            <th style={{ textAlign: 'left', padding: '8px 4px' }}>Hạng mục</th>
                            <th style={{ textAlign: 'center', padding: '8px 4px', width: 50 }}>SL</th>
                            <th style={{ textAlign: 'center', padding: '8px 4px', width: 50 }}>ĐVT</th>
                            <th style={{ textAlign: 'right', padding: '8px 4px', width: 120 }}>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cert?.items?.map((item, i) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '8px 4px' }}>{item.itemName}</td>
                                <td style={{ textAlign: 'center', padding: '8px 4px' }}>{item.quantity}</td>
                                <td style={{ textAlign: 'center', padding: '8px 4px' }}>{item.unit}</td>
                                <td style={{ textAlign: 'right', padding: '8px 4px' }}>{item.amount?.toLocaleString('vi-VN')} đ</td>
                            </tr>
                        ))}
                        <tr style={{ borderTop: '2px solid #e5e7eb', fontWeight: 700 }}>
                            <td colSpan={3} style={{ padding: '10px 4px', textAlign: 'right' }}>Tổng cộng:</td>
                            <td style={{ textAlign: 'right', padding: '10px 4px' }}>{total.toLocaleString('vi-VN')} đ</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Xác nhận nghiệm thu</h3>

                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }}>Họ tên người ký</label>
                    <input
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="Nhập họ tên..."
                    />
                </div>

                <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                            <input type="radio" checked={signatureMode === 'draw'} onChange={() => setSignatureMode('draw')} />
                            Ký trực tiếp
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                            <input type="radio" checked={signatureMode === 'upload'} onChange={() => setSignatureMode('upload')} />
                            Upload ảnh chữ ký
                        </label>
                    </div>

                    {signatureMode === 'draw' ? (
                        <div>
                            <canvas
                                ref={canvasRef}
                                width={400} height={150}
                                style={{ border: '1px solid #d1d5db', borderRadius: 6, cursor: 'crosshair', touchAction: 'none', width: '100%', maxWidth: 400 }}
                                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                                onTouchStart={e => { e.preventDefault(); startDraw(e.touches[0]); }}
                                onTouchMove={e => { e.preventDefault(); draw(e.touches[0]); }}
                                onTouchEnd={stopDraw}
                            />
                            <button onClick={clearCanvas} style={{ fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>🗑 Xóa</button>
                        </div>
                    ) : (
                        <input type="file" ref={uploadRef} accept="image/*" style={{ fontSize: 14 }} />
                    )}
                </div>

                <button
                    onClick={submitSign}
                    disabled={signing}
                    style={{
                        width: '100%', padding: '12px', background: '#22c55e', color: '#fff',
                        border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer',
                        opacity: signing ? 0.7 : 1,
                    }}
                >
                    {signing ? 'Đang xử lý...' : '✅ Xác nhận và ký tên'}
                </button>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Test manually**

```
1. Tạo AcceptanceCertificate → gửi link (Task 9)
   → Nhận URL dạng /public/acceptance/{uuid}
2. Mở URL trong incognito (không cần đăng nhập)
   → Trang hiển thị danh sách hạng mục + form ký
3. Ký tên → Submit
   → Thông báo "Đã ký thành công"
4. GET /api/furniture-orders/{id}/acceptance → cert.status = "SIGNED"
```

- [ ] **Step 3: Commit**

```bash
git add app/public/acceptance/
git commit -m "feat(ui): public acceptance signing page with canvas signature pad"
```

---

## Self-Review Checklist

Sau khi hoàn thành tất cả tasks, kiểm tra:

- [ ] `npm run build` — không có TypeScript/ESLint errors
- [ ] Tất cả `/api/furniture-orders/[id]/cnc-files`, `/material-orders`, `/acceptance` routes trả về đúng data
- [ ] GRN hook: nhận PO → FurnitureMaterialOrder.status = RECEIVED → nếu đủ 3 types → FurnitureOrder.status = in_production
- [ ] Public page `/public/acceptance/[token]` accessible không cần auth (test incognito)
- [ ] Sidebar hiển thị "🪵 Nội thất" cho đúng roles
- [ ] Step indicator trên detail page phản ánh đúng status
- [ ] generateCode('furnitureOrder', 'NT') và generateCode('acceptanceCertificate', 'BB') hoạt động

---

## Final Commit

```bash
git add -A
git commit -m "feat: furniture production module complete (CNC files, material orders, acceptance certificate)"
```
