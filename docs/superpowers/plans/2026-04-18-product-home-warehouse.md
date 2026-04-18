# Product Home Warehouse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mỗi SP gán 1 kho cố định (`Product.warehouseId`); tồn kho group theo kho; form Nhập/Xuất auto-fill kho theo SP + validate cùng kho; SP mới danh mục "ván" auto-pick Kho Xưởng.

**Architecture:** Thêm field `warehouseId` trên `Product` + migration backfill tất cả SP → Kho Ngô Hùng. API + form tạo/sửa SP yêu cầu chọn kho. UI tồn kho group 2 cấp (Kho → Danh mục). Xuất/Nhập modal + StockIssue tự set kho theo SP đầu tiên, validate tất cả SP cùng kho. Chuyển kho update `Product.warehouseId`.

**Tech Stack:** Next.js 16 App Router, Prisma 6, PostgreSQL, React 19, Zod 4.

---

## File Map

| File | Trách nhiệm |
|---|---|
| `prisma/schema.prisma` | + `warehouseId` trên Product, + back-relation `products[]` trên Warehouse |
| `prisma/migrations/20260418130000_product_home_warehouse/migration.sql` | ALTER + FK + index + backfill UPDATE |
| `lib/validations/product.js` | `warehouseId` trong createSchema (required) |
| `lib/vanCategories.js` | **Mới** — const `VAN_CATEGORIES` dùng chung frontend + backend |
| `app/api/products/route.js` | POST persist warehouseId |
| `app/api/products/[id]/route.js` | PUT persist warehouseId |
| `app/api/inventory/stock/route.js` | Include warehouse in select |
| `app/products/page.js` | Dropdown "Kho" trong form tạo/sửa + auto-switch theo category |
| `app/inventory/page.js` | Group tồn kho 2 cấp (Kho→Danh mục), filter kho, auto-fill kho trong Nhập/Xuất modal |
| `app/api/inventory/route.js` | Validate items cùng kho |
| `app/api/inventory/issues/route.js` | Validate items cùng kho |
| `app/api/warehouses/transfers/[id]/approve/route.js` | Update `Product.warehouseId` khi approve |

---

## Task 1: Schema — Thêm warehouseId vào Product

**Files:**
- Modify: `prisma/schema.prisma` (model `Product` line 164–210, model `Warehouse` line 326–341)
- Create: `prisma/migrations/20260418130000_product_home_warehouse/migration.sql`

- [ ] **Step 1: Thêm field + relation + index vào `model Product`**

Trong `model Product`, thêm 2 dòng ngay sau dòng `categoryId String?` (line ~192):

```prisma
  warehouseId            String?
  warehouse              Warehouse?              @relation(fields: [warehouseId], references: [id])
```

Và thêm index trong block `@@index`:

```prisma
  @@index([categoryId])
  @@index([warehouseId])
```

- [ ] **Step 2: Thêm back-relation vào `model Warehouse`**

Trong `model Warehouse`, thêm dòng:

```prisma
  products     Product[]
```

Đặt gần các relation khác (sau `stockIssues`).

- [ ] **Step 3: Tạo migration SQL**

Tạo file `prisma/migrations/20260418130000_product_home_warehouse/migration.sql`:

```sql
-- Add warehouseId column
ALTER TABLE "Product" ADD COLUMN "warehouseId" TEXT;

-- Add foreign key
ALTER TABLE "Product"
  ADD CONSTRAINT "Product_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index
CREATE INDEX "Product_warehouseId_idx" ON "Product"("warehouseId");

-- Backfill: tất cả SP hiện có → Kho Ngô Hùng (code='KHO01')
UPDATE "Product"
SET "warehouseId" = (SELECT id FROM "Warehouse" WHERE code = 'KHO01' LIMIT 1)
WHERE "warehouseId" IS NULL;
```

- [ ] **Step 4: Apply migration (use deploy due to shadow DB issue)**

```bash
cd d:/Codeapp/motnha && npx prisma migrate deploy
```

Expected: `The following migration(s) have been applied: 20260418130000_product_home_warehouse`

- [ ] **Step 5: Regenerate Prisma client**

```bash
cd d:/Codeapp/motnha && npm run db:generate
```

Expected: `✔ Generated Prisma Client`, không lỗi.

- [ ] **Step 6: Verify backfill**

```bash
cd d:/Codeapp/motnha && node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const c1=await p.product.count();const c2=await p.product.count({where:{warehouseId:null}});const c3=await p.product.count({where:{warehouse:{code:'KHO01'}}});console.log('Total:',c1,'Null:',c2,'In Kho Ngô Hùng:',c3);await p.\$disconnect();})();"
```

Expected output: `Total: 1411 Null: 0 In Kho Ngô Hùng: 1411`

- [ ] **Step 7: Commit**

```bash
cd d:/Codeapp/motnha && git add prisma/schema.prisma prisma/migrations/20260418130000_product_home_warehouse/
git commit -m "feat(schema): thêm warehouseId cho Product + backfill Kho Ngô Hùng"
```

---

## Task 2: Shared constants — VAN_CATEGORIES

**Files:**
- Create: `lib/vanCategories.js`

- [ ] **Step 1: Tạo file**

Tạo `d:/Codeapp/motnha/lib/vanCategories.js`:

```javascript
// Danh mục "Ván" — SP thuộc các danh mục này mặc định ở Kho Xưởng
// Dùng chung cho frontend (auto-switch dropdown) + backend (validation nếu cần)
export const VAN_CATEGORIES = ['MDF AC', 'MDF Thái', 'Acrylic', 'Sàn gỗ AC'];

export function isVanCategory(category) {
    return VAN_CATEGORIES.includes(category);
}
```

- [ ] **Step 2: Commit**

```bash
cd d:/Codeapp/motnha && git add lib/vanCategories.js
git commit -m "feat(lib): shared const VAN_CATEGORIES"
```

---

## Task 3: Validation — Product schema nhận warehouseId

**Files:**
- Modify: `lib/validations/product.js`

- [ ] **Step 1: Thêm `warehouseId` vào `productCreateSchema`**

Tìm block `productCreateSchema`:

```javascript
export const productCreateSchema = z.object({
    name: z.string().trim().min(1, 'Tên sản phẩm bắt buộc').max(500),
    category: z.string().trim().min(1, 'Danh mục bắt buộc'),
    unit: z.string().trim().min(1, 'Đơn vị bắt buộc'),
    importPrice: optFloat,
    salePrice: optFloat,
    stock: optInt,
    minStock: optInt,
    supplier: optStr,
    description: optStr,
    dimensions: optStr,
    weight: optFloat,
    color: optStr,
    material: optStr,
    origin: optStr,
    warranty: optStr,
    brand: optStr,
    status: z.enum(PRODUCT_STATUSES).optional().default('Đang bán'),
    supplyType: z.enum(SUPPLY_TYPES).optional().default('Mua ngoài'),
    leadTimeDays: optInt,
    location: optStr,
    image: optStr,
    coreBoard: optStr,
    surfaceCode: optStr,
    categoryId: z.string().optional().nullable().default(null),
}).strict();
```

Thêm 1 dòng `warehouseId` (nullable để backward compat với seed/import scripts cũ, API sẽ auto-default):

```javascript
    warehouseId: z.string().optional().nullable().default(null),
```

Đặt ngay sau dòng `categoryId`. Kết quả:

```javascript
    categoryId: z.string().optional().nullable().default(null),
    warehouseId: z.string().optional().nullable().default(null),
}).strict();
```

- [ ] **Step 2: Build check**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
cd d:/Codeapp/motnha && git add lib/validations/product.js
git commit -m "feat(validation): product accept warehouseId"
```

---

## Task 4: Product API — POST/PUT persist warehouseId + auto-default

**Files:**
- Modify: `app/api/products/route.js` (POST handler lines 94–114)
- Modify: `app/api/products/[id]/route.js` (PUT handler lines 16–29)

- [ ] **Step 1: Sửa POST handler — auto-default khi thiếu warehouseId**

Trong `app/api/products/route.js`, sửa POST:

```javascript
export const POST = withAuth(async (request) => {
    const body = await request.json();
    const data = productCreateSchema.parse(body);
    const code = await generateCode('product', 'SP');

    // Sync category text ↔ categoryId
    if (data.categoryId) {
        const cat = await prisma.productCategory.findUnique({ where: { id: data.categoryId }, select: { name: true } });
        if (cat) data.category = cat.name;
    } else if (data.category) {
        const cat = await prisma.productCategory.findFirst({ where: { name: data.category } });
        if (cat) data.categoryId = cat.id;
    }

    // Auto-default warehouseId nếu chưa có (seed/import scripts cũ)
    if (!data.warehouseId) {
        const { VAN_CATEGORIES } = await import('@/lib/vanCategories');
        const targetCode = VAN_CATEGORIES.includes(data.category) ? 'KHO02' : 'KHO01';
        const wh = await prisma.warehouse.findUnique({ where: { code: targetCode }, select: { id: true } });
        if (wh) data.warehouseId = wh.id;
    }

    const product = await prisma.product.create({
        data: { code, ...data },
    });
    return NextResponse.json(product, { status: 201 });
});
```

Lý do: frontend sẽ luôn gửi warehouseId (Task 6), nhưng seed/import scripts cũ không gửi → fallback theo category.

- [ ] **Step 2: Sửa PUT handler — accept warehouseId nếu client gửi**

Trong `app/api/products/[id]/route.js`, PUT handler không cần sửa gì vì Zod đã accept `warehouseId` optional. Nhưng để an toàn, verify:

```bash
cd d:/Codeapp/motnha && grep -A 10 "export const PUT" "app/api/products/[id]/route.js"
```

Confirm handler dùng `productUpdateSchema.parse(body)` rồi spread vào `data: data`. Nếu có — không cần sửa.

- [ ] **Step 3: Build check**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
cd d:/Codeapp/motnha && git add app/api/products/route.js
git commit -m "feat(products-api): auto-default warehouseId theo category ván khi create"
```

---

## Task 5: Inventory stock API — return warehouse info

**Files:**
- Modify: `app/api/inventory/stock/route.js`

- [ ] **Step 1: Thêm warehouse vào select**

Thay toàn bộ file:

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async () => {
    const products = await prisma.product.findMany({
        select: {
            id: true, code: true, name: true, category: true,
            unit: true, stock: true, minStock: true,
            importPrice: true, salePrice: true, image: true,
            warehouseId: true,
            warehouse: { select: { id: true, code: true, name: true } },
        },
        orderBy: { name: 'asc' },
    });

    const lowStock = products.filter(p => p.stock <= p.minStock && p.minStock > 0);

    return NextResponse.json({ products, lowStock: lowStock.length });
});
```

- [ ] **Step 2: Build check**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Test API**

```bash
cd d:/Codeapp/motnha && curl -s http://localhost:3000/api/inventory/stock -H "Cookie: <session>" | head -c 1000
```

(Chạy sau khi `npm run dev`) — expected có `warehouse: { id, code, name }` trong mỗi product.

- [ ] **Step 4: Commit**

```bash
cd d:/Codeapp/motnha && git add app/api/inventory/stock/route.js
git commit -m "feat(stock-api): include warehouse info in response"
```

---

## Task 6: Product form UI — dropdown Kho + auto-switch

**Files:**
- Modify: `app/products/page.js` (addForm state + Create/Edit modal)

- [ ] **Step 1: Fetch warehouses state**

Tìm đoạn `const [addForm, setAddForm] = useState(...)` (~line 68). Trước đó, thêm state + fetch:

```javascript
const [warehouses, setWarehouses] = useState([]);

useEffect(() => {
    fetch('/api/inventory?limit=1').then(r => r.json()).then(d => setWarehouses(d.warehouses || []));
}, []);
```

Nếu đã có `useEffect` khác trong file, thêm vào đó hoặc tạo mới. Nếu đã có fetch warehouses sẵn, dùng lại.

- [ ] **Step 2: Sửa initial state addForm — thêm warehouseId**

Current:
```javascript
const [addForm, setAddForm] = useState({ name: '', category: 'Nội thất thành phẩm', unit: 'cái', salePrice: 0, importPrice: 0, brand: '', description: '', supplyType: 'Mua ngoài', stock: 0, minStock: 0, supplier: '', coreBoard: '', surfaceCode: '', image: '' });
```

Sửa thành:
```javascript
const [addForm, setAddForm] = useState({ name: '', category: 'Nội thất thành phẩm', unit: 'cái', salePrice: 0, importPrice: 0, brand: '', description: '', supplyType: 'Mua ngoài', stock: 0, minStock: 0, supplier: '', coreBoard: '', surfaceCode: '', image: '', warehouseId: '' });
```

- [ ] **Step 3: Import VAN_CATEGORIES**

Ở đầu file sau các import khác:

```javascript
import { VAN_CATEGORIES } from '@/lib/vanCategories';
```

- [ ] **Step 4: Thêm auto-switch effect khi category đổi**

Sau block state declarations, thêm:

```javascript
// Auto-switch kho theo category khi create SP mới
useEffect(() => {
    if (!warehouses.length) return;
    const targetCode = VAN_CATEGORIES.includes(addForm.category) ? 'KHO02' : 'KHO01';
    const target = warehouses.find(w => w.code === targetCode);
    if (target && addForm.warehouseId !== target.id) {
        setAddForm(f => ({ ...f, warehouseId: target.id }));
    }
}, [addForm.category, warehouses]);
```

- [ ] **Step 5: Thêm dropdown Kho trong form Add modal**

Tìm form Add modal (modal có input `name="name"` + `category`...). Thêm dropdown ngay sau field `category`:

```javascript
<div className="form-group">
    <label className="form-label">Kho</label>
    <select
        className="form-select"
        value={addForm.warehouseId}
        onChange={e => setAddForm({ ...addForm, warehouseId: e.target.value })}
        required
    >
        <option value="">— Chọn kho —</option>
        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
    </select>
</div>
```

- [ ] **Step 6: Validate warehouseId trước khi submit**

Trong hàm submit (tìm `const addProduct = async` hoặc tương tự), thêm check:

```javascript
if (!addForm.warehouseId) {
    alert('Vui lòng chọn kho');
    return;
}
```

Trước dòng `fetch('/api/products'...`.

- [ ] **Step 7: Tương tự cho Edit modal**

Nếu có `editForm` state (line ~70), đảm bảo khi `setEditModal(product)`, init `editForm` bao gồm `warehouseId: product.warehouseId || ''`. Tìm chỗ đó và thêm field. Trong Edit modal, thêm dropdown Kho giống Step 5 nhưng dùng `editForm.warehouseId`.

- [ ] **Step 8: Build check**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 9: Smoke test UI**

`npm run dev` → vào `/products` → "+ Thêm SP":
1. Chọn category "Nội thất thành phẩm" → dropdown Kho tự chọn "Kho Ngô Hùng"
2. Đổi category sang "MDF AC" → dropdown Kho tự đổi sang "Kho Xưởng"
3. Lưu SP → check DB: `warehouseId` matches dropdown

- [ ] **Step 10: Commit**

```bash
cd d:/Codeapp/motnha && git add app/products/page.js
git commit -m "feat(products-ui): dropdown Kho + auto-switch theo category ván"
```

---

## Task 7: Tồn kho hiện tại — Group theo Kho → Danh mục

**Files:**
- Modify: `app/inventory/page.js` (lines ~293–303 stockFiltered/stockByCategory + lines ~399–449 render)

- [ ] **Step 1: Thêm filter state + compute `stockByWarehouse`**

Tìm block `const stockFiltered = ...` (~line 293). Thay toàn bộ block tính `stockFiltered` + `stockByCategory` + `totalFilteredValue`:

Current:
```javascript
const stockFiltered = stockData.products.filter(p =>
    p.stock > 0 &&
    (!stockSearch || p.name.toLowerCase().includes(stockSearch.toLowerCase()) || p.code.toLowerCase().includes(stockSearch.toLowerCase()))
);
const stockByCategory = stockFiltered.reduce((acc, p) => {
    const cat = p.category || 'Khác';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
}, {});
const totalFilteredValue = stockFiltered.reduce((s, p) => s + (p.stock || 0) * (p.importPrice || 0), 0);
```

Thay bằng:

```javascript
const stockFiltered = stockData.products.filter(p =>
    p.stock > 0 &&
    (!stockWarehouseFilter || p.warehouseId === stockWarehouseFilter) &&
    (!stockSearch || p.name.toLowerCase().includes(stockSearch.toLowerCase()) || p.code.toLowerCase().includes(stockSearch.toLowerCase()))
);

// Group: Kho → Danh mục → Products
const stockByWarehouse = stockFiltered.reduce((acc, p) => {
    const whName = p.warehouse?.name || 'Chưa gán kho';
    const whId = p.warehouseId || '_none';
    if (!acc[whId]) acc[whId] = { name: whName, categories: {}, products: [] };
    acc[whId].products.push(p);
    const cat = p.category || 'Khác';
    if (!acc[whId].categories[cat]) acc[whId].categories[cat] = [];
    acc[whId].categories[cat].push(p);
    return acc;
}, {});

const totalFilteredValue = stockFiltered.reduce((s, p) => s + (p.stock || 0) * (p.importPrice || 0), 0);
```

- [ ] **Step 2: Thêm state `stockWarehouseFilter`**

Tìm các `useState` phía trên (line ~13-30). Thêm:

```javascript
const [stockWarehouseFilter, setStockWarehouseFilter] = useState('');
```

Cạnh `stockSearch`.

- [ ] **Step 3: Thêm filter dropdown Kho trong Tồn kho tab**

Tìm filter bar của Tồn kho tab (chỗ có `<input ... value={stockSearch}>`, khoảng line 380). Thêm dropdown ngay cạnh:

```javascript
<select
    className="form-select"
    value={stockWarehouseFilter}
    onChange={e => setStockWarehouseFilter(e.target.value)}
    style={{ maxWidth: 180 }}
>
    <option value="">🏭 Tất cả kho</option>
    {(txData.warehouses || []).map(w => (
        <option key={w.id} value={w.id}>{w.name}</option>
    ))}
</select>
```

- [ ] **Step 4: Replace render block — group 2 cấp**

Tìm block `{Object.entries(stockByCategory).map(...)}` (~line 399). Thay toàn bộ block đó bằng:

```javascript
{Object.entries(stockByWarehouse).map(([whId, wh]) => {
    const whValue = wh.products.reduce((s, p) => s + (p.stock || 0) * (p.importPrice || 0), 0);
    return (
        <div key={whId} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '8px 0', borderBottom: '2px solid var(--border)', marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>🏭 {wh.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{wh.products.length} mã · {fmt(whValue)}</span>
            </div>
            {Object.entries(wh.categories).map(([cat, items]) => (
                <div key={cat} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                        {cat} <span style={{ fontWeight: 400 }}>({items.length})</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                        {items.map(p => {
                            const isLow = p.minStock > 0 && p.stock <= p.minStock;
                            return (
                                <div key={p.id} style={{
                                    background: 'var(--bg-card)',
                                    border: `1px solid ${isLow ? 'var(--status-warning)' : 'var(--border)'}`,
                                    borderRadius: 8,
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}>
                                    <div style={{
                                        width: '100%',
                                        aspectRatio: '1 / 1',
                                        background: 'var(--bg-secondary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                    }}>
                                        {p.image ? (
                                            <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontSize: 32, color: 'var(--text-muted)' }}>📦</span>
                                        )}
                                    </div>
                                    <div style={{ padding: '8px 10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.code}</div>
                                        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: isLow ? 'var(--status-warning)' : 'var(--accent-primary)', marginTop: 'auto' }}>
                                            {p.stock}
                                            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>{p.unit}</span>
                                        </div>
                                        {isLow && <div style={{ fontSize: 10, color: 'var(--status-warning)', marginTop: 2 }}>Sắp hết</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
})}
```

- [ ] **Step 5: Build check**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 6: Smoke test**

`npm run dev` → `/inventory` → tab Tồn kho hiện tại:
- Có filter dropdown "🏭 Tất cả kho"
- Group ngoài cùng là Kho Ngô Hùng (hầu hết SP) + Kho Xưởng (ván, nếu có)
- Mỗi kho bên trong group theo danh mục

- [ ] **Step 7: Commit**

```bash
cd d:/Codeapp/motnha && git add app/inventory/page.js
git commit -m "feat(inventory-ui): tồn kho group 2 cấp Kho→Danh mục + filter kho"
```

---

## Task 8: Nhập/Xuất modal — auto-fill kho + validate cùng kho

**Files:**
- Modify: `app/inventory/page.js` (modal Nhập/Xuất, lines ~607–673)

- [ ] **Step 1: Auto-set warehouseId khi pick SP đầu tiên**

Tìm trong modal Nhập/Xuất đoạn onChange dropdown chọn SP:

```javascript
<select className="form-select" value={item.productId} onChange={e => {
    const p = stockData.products.find(p => p.id === e.target.value);
    setFormItems(prev => prev.map((it, idx) => idx === i ? { ...it, productId: e.target.value, unit: p?.unit || '' } : it));
}}>
```

Sửa thành (auto-set warehouseId vào `form` khi đây là SP đầu tiên có productId):

```javascript
<select className="form-select" value={item.productId} onChange={e => {
    const p = stockData.products.find(p => p.id === e.target.value);
    setFormItems(prev => prev.map((it, idx) => idx === i ? { ...it, productId: e.target.value, unit: p?.unit || '' } : it));
    // Auto-set warehouseId của SP đầu tiên
    if (p?.warehouseId && !form.warehouseId) {
        setForm(f => ({ ...f, warehouseId: p.warehouseId }));
    }
}}>
```

- [ ] **Step 2: Disable dropdown kho khi đã có SP**

Tìm dropdown kho trong modal:

```javascript
<select className="form-select" value={form.warehouseId} onChange={e => setForm({ ...form, warehouseId: e.target.value })}>
    {txData.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
</select>
```

Sửa thành:

```javascript
<select
    className="form-select"
    value={form.warehouseId}
    onChange={e => setForm({ ...form, warehouseId: e.target.value })}
    disabled={formItems.some(it => it.productId)}
    title={formItems.some(it => it.productId) ? 'Kho auto-fill theo SP đã chọn' : ''}
>
    <option value="">— Chọn kho —</option>
    {txData.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
</select>
```

- [ ] **Step 3: Thêm validate & warning banner trong modal**

Trong modal body, ngay trên nút Lưu, thêm warning khi có SP từ 2 kho khác nhau:

```javascript
{(() => {
    const whIds = [...new Set(formItems.filter(it => it.productId).map(it => {
        const p = stockData.products.find(x => x.id === it.productId);
        return p?.warehouseId;
    }).filter(Boolean))];
    if (whIds.length > 1) {
        return (
            <div style={{ padding: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid var(--status-danger)', borderRadius: 6, color: 'var(--status-danger)', fontSize: 12, marginBottom: 8 }}>
                ⚠ SP thuộc nhiều kho khác nhau. Phải tách thành nhiều phiếu riêng cho từng kho.
            </div>
        );
    }
    return null;
})()}
```

Và trong hàm `submitForm` (hoặc tương tự), trước khi fetch POST, block submit:

```javascript
const whIds = [...new Set(formItems.filter(it => it.productId).map(it => {
    const p = stockData.products.find(x => x.id === it.productId);
    return p?.warehouseId;
}).filter(Boolean))];
if (whIds.length > 1) {
    alert('SP thuộc nhiều kho khác nhau — tách phiếu riêng');
    return;
}
```

Tìm hàm `submitForm` bằng grep:

```bash
cd d:/Codeapp/motnha && grep -n "submitForm\|const submit" app/inventory/page.js | head -5
```

- [ ] **Step 4: Build check**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 5: Smoke test**

`npm run dev` → `/inventory` → nút "+ Nhập/Xuất kho":
1. Pick 1 SP (VD: Phụ kiện) → dropdown Kho auto-fill "Kho Ngô Hùng" + bị disable
2. Thêm 1 SP từ danh mục "MDF AC" (ở Kho Xưởng) → banner cảnh báo xuất hiện
3. Submit → alert và không gửi API

- [ ] **Step 6: Commit**

```bash
cd d:/Codeapp/motnha && git add app/inventory/page.js
git commit -m "feat(inventory-ui): auto-fill kho theo SP + validate cùng kho"
```

---

## Task 9: API validate — items cùng kho

**Files:**
- Modify: `app/api/inventory/route.js` (POST handler)
- Modify: `app/api/inventory/issues/route.js` (POST handler)

- [ ] **Step 1: Sửa `/api/inventory` POST validate items cùng kho**

Sau block load products (line ~55), thêm validate before $transaction:

Tìm đoạn:
```javascript
const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, unit: true, importPrice: true, stock: true },
});
const productMap = Object.fromEntries(products.map(p => [p.id, p]));
```

Thay bằng:
```javascript
const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, unit: true, importPrice: true, stock: true, warehouseId: true },
});
const productMap = Object.fromEntries(products.map(p => [p.id, p]));

// Validate tất cả SP cùng kho với data.warehouseId
for (const item of items) {
    const p = productMap[item.productId];
    if (!p) continue;
    if (p.warehouseId && p.warehouseId !== data.warehouseId) {
        return NextResponse.json({
            error: `${p.name}: thuộc kho khác với phiếu — tách phiếu riêng cho mỗi kho`,
        }, { status: 400 });
    }
}
```

- [ ] **Step 2: Sửa `/api/inventory/issues` POST validate items cùng kho**

Tìm block validate stock (~line 39-51):

```javascript
for (const item of data.items) {
    const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { stock: true, name: true },
    });
    ...
}
```

Thay `select: { stock: true, name: true }` thành `select: { stock: true, name: true, warehouseId: true }`, và thêm validate:

```javascript
for (const item of data.items) {
    const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { stock: true, name: true, warehouseId: true },
    });
    if (!product) {
        throw Object.assign(new Error(`${item.productName}: sản phẩm không tồn tại`), { status: 400 });
    }
    if (product.warehouseId && product.warehouseId !== data.warehouseId) {
        throw Object.assign(new Error(`${product.name}: thuộc kho khác với phiếu xuất — tách phiếu riêng`), { status: 400 });
    }
    if ((product.stock || 0) < item.qty) {
        throw Object.assign(new Error(`${item.productName}: tồn kho không đủ`), { status: 400 });
    }
}
```

- [ ] **Step 3: Build check**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
cd d:/Codeapp/motnha && git add app/api/inventory/route.js app/api/inventory/issues/route.js
git commit -m "feat(inventory-api): validate items cùng kho với phiếu"
```

---

## Task 10: WarehouseTransfer approve — update Product.warehouseId

**Files:**
- Modify: `app/api/warehouses/transfers/[id]/approve/route.js`

- [ ] **Step 1: Thêm update Product.warehouseId trong transaction**

Tìm trong transaction block:

```javascript
await prisma.$transaction(async (tx) => {
    await tx.inventoryTransaction.create({
        data: {
            code: xkCode,
            type: 'Xuất chuyển kho',
            ...
        }
    });

    await tx.inventoryTransaction.create({
        data: {
            code: nkCode,
            type: 'Nhập chuyển kho',
            ...
        }
    });

    await tx.warehouseTransfer.update({
        where: { id },
        data: { status: 'Đã chuyển', transferDate: new Date() }
    });
});
```

Thêm 1 update sau 2 InventoryTransaction, trước warehouseTransfer update:

```javascript
await prisma.$transaction(async (tx) => {
    await tx.inventoryTransaction.create({
        data: {
            code: xkCode,
            type: 'Xuất chuyển kho',
            quantity: -transfer.quantity,
            productId: transfer.productId,
            warehouseId: transfer.fromWarehouseId,
            note: `Chuyển kho → ${transfer.code}`,
        }
    });

    await tx.inventoryTransaction.create({
        data: {
            code: nkCode,
            type: 'Nhập chuyển kho',
            quantity: transfer.quantity,
            productId: transfer.productId,
            warehouseId: transfer.toWarehouseId,
            note: `Nhận từ chuyển kho ← ${transfer.code}`,
        }
    });

    // 1 SP chỉ ở 1 kho → chuyển kho = đổi home warehouse
    await tx.product.update({
        where: { id: transfer.productId },
        data: { warehouseId: transfer.toWarehouseId },
    });

    await tx.warehouseTransfer.update({
        where: { id },
        data: { status: 'Đã chuyển', transferDate: new Date() }
    });
});
```

- [ ] **Step 2: Build check**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
cd d:/Codeapp/motnha && git add "app/api/warehouses/transfers/[id]/approve/route.js"
git commit -m "feat(warehouse-transfer): update Product.warehouseId khi approve"
```

---

## Task 11: Smoke test E2E + push

- [ ] **Step 1: Full manual test**

```bash
cd d:/Codeapp/motnha && npm run dev
```

1. **Products page**: Tạo SP mới category "MDF AC" → dropdown Kho auto-chọn Kho Xưởng → lưu → verify Prisma Studio: `warehouseId` = Kho Xưởng id
2. **Products page**: Tạo SP mới category "Phụ kiện" → dropdown Kho auto-chọn Kho Ngô Hùng → lưu
3. **Inventory Tồn kho tab**: 2 group Kho hiện đúng, filter "Kho Xưởng" → chỉ SP MDF/Acrylic/Sàn gỗ
4. **Inventory Nhập kho**: pick 1 SP Kho Ngô Hùng → dropdown auto-fill + disable. Pick thêm SP Kho Xưởng → banner cảnh báo + block submit
5. **Inventory Xuất kho (Phiếu xuất tab)**: tương tự validate cùng kho
6. **Chuyển kho**: Tạo phiếu chuyển SP Kho Ngô Hùng → Kho Xưởng → Approve → verify `Product.warehouseId` đã đổi
7. **Tồn kho lại**: SP đó giờ ở Kho Xưởng

- [ ] **Step 2: Final build**

```bash
cd d:/Codeapp/motnha && npm run build
```

Expected: Build thành công, không lỗi.

- [ ] **Step 3: Push**

```bash
cd d:/Codeapp/motnha && git push origin main
```

- [ ] **Step 4: Commit fixup nếu có**

Nếu smoke test phát hiện bug → fix, commit riêng với prefix `fix(...)`.
