# CRM Phase 1 — Assign NVKD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gán khách hàng cho NVKD qua `salesPersonId` FK + filter theo role + NVKD claim khách chưa chủ + giám đốc reassign.

**Architecture:** FK đến `User` (do auth gắn với User). Rename field cũ `salesPerson` (string) thành `salesPersonNote` để giữ text legacy. Permission filter ở API layer: `kinh_doanh` chỉ thấy khách của mình + pool `null`. Backfill match theo tên User.

**Tech Stack:** Next.js 16, Prisma 6, PostgreSQL, React 19, Zod 4.

---

## File Map

| File | Trách nhiệm |
|---|---|
| `prisma/schema.prisma` | + `salesPersonId` FK + back-relation trên User, rename `salesPerson` → `salesPersonNote` |
| `prisma/migrations/20260421120000_customer_salesperson_fk/migration.sql` | ALTER + FK + rename + backfill |
| `lib/validations/customer.js` | Schema nhận `salesPersonId` + rename `salesPerson` → `salesPersonNote` |
| `app/api/customers/route.js` | POST auto-assign kinh_doanh · GET filter theo role |
| `app/api/customers/[id]/route.js` | PUT reject `salesPersonId` nếu không phải giám đốc |
| `app/api/customers/[id]/claim/route.js` | **Mới** — POST NVKD nhận khách chưa chủ |
| `contexts/RoleContext.js` | + `canReassignCustomer`, `canClaimCustomer`, `canViewAllCustomers` |
| `app/customers/page.js` | Cột Chủ khách + filter + Claim + hiện tên NVKD |

---

## Task 1: Schema — thêm salesPersonId FK + rename

**Files:**
- Modify: `prisma/schema.prisma` (model `Customer` ~line 31, `User` ~line 16)
- Create: `prisma/migrations/20260421120000_customer_salesperson_fk/migration.sql`

- [ ] **Step 1: Rename field `salesPerson` → `salesPersonNote` trong `model Customer`**

Tìm dòng:
```prisma
  salesPerson     String                @default("")
```
Thay bằng:
```prisma
  salesPersonNote String                @default("")
```

- [ ] **Step 2: Thêm `salesPersonId` + relation vào `Customer`**

Thêm sau dòng `salesPersonNote`:
```prisma
  salesPersonId   String?
  salesPerson     User?                 @relation("CustomerSalesPerson", fields: [salesPersonId], references: [id], onDelete: SetNull)
```

Và thêm index (cạnh các `@@index` khác nếu có, hoặc cuối block):
```prisma
  @@index([salesPersonId])
```

- [ ] **Step 3: Thêm back-relation vào `model User`**

Trong `model User`, thêm:
```prisma
  salesCustomers  Customer[]            @relation("CustomerSalesPerson")
```

- [ ] **Step 4: Tạo migration SQL**

Tạo `prisma/migrations/20260421120000_customer_salesperson_fk/migration.sql`:

```sql
-- Rename old column
ALTER TABLE "Customer" RENAME COLUMN "salesPerson" TO "salesPersonNote";

-- Add FK column
ALTER TABLE "Customer" ADD COLUMN "salesPersonId" TEXT;
CREATE INDEX "Customer_salesPersonId_idx" ON "Customer"("salesPersonId");
ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_salesPersonId_fkey"
  FOREIGN KEY ("salesPersonId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: match unique User theo name
UPDATE "Customer" c
SET "salesPersonId" = u.id
FROM "User" u
WHERE u.name = c."salesPersonNote"
  AND c."salesPersonNote" != ''
  AND c."salesPersonId" IS NULL
  AND (SELECT COUNT(*) FROM "User" WHERE name = c."salesPersonNote") = 1;
```

- [ ] **Step 5: Apply migration + regen client**

```bash
cd d:/Codeapp/motnha && npx prisma migrate deploy && npm run db:generate
```

Expected: `Applied 1 migration`, `✔ Generated Prisma Client`.

- [ ] **Step 6: Verify + log unmatched**

```bash
cd d:/Codeapp/motnha && node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const total=await p.customer.count({where:{deletedAt:null}});const withNvkd=await p.customer.count({where:{salesPersonId:{not:null}}});const unmatch=await p.customer.findMany({where:{salesPersonId:null,salesPersonNote:{not:''}},select:{code:true,name:true,salesPersonNote:true}});console.log('Total:',total,'| Assigned:',withNvkd,'| Unmatched:',unmatch.length);unmatch.slice(0,10).forEach(c=>console.log(' ',c.code,c.name,'→',c.salesPersonNote));await p.\$disconnect();})();"
```

Expected: stats + list tối đa 10 khách chưa match (để giám đốc xem fix sau).

- [ ] **Step 7: Commit**

```bash
cd d:/Codeapp/motnha && git add prisma/schema.prisma prisma/migrations/20260421120000_customer_salesperson_fk/
git commit -m "feat(crm-schema): Customer.salesPersonId FK tới User + rename legacy field"
```

---

## Task 2: Validation — schema nhận `salesPersonId`

**Files:**
- Modify: `lib/validations/customer.js`

- [ ] **Step 1: Thêm `salesPersonId` + rename field**

Tìm block `customerCreateSchema` có dòng `salesPerson: optStr`. Thay bằng:

```javascript
    salesPersonNote: optStr,
    salesPersonId: z.string().optional().nullable().default(null),
```

Không đổi gì khác.

- [ ] **Step 2: Build check**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
cd d:/Codeapp/motnha && git add lib/validations/customer.js
git commit -m "feat(validation): customer schema nhận salesPersonId + salesPersonNote"
```

---

## Task 3: Role permissions

**Files:**
- Modify: `contexts/RoleContext.js`

- [ ] **Step 1: Thêm permissions mới cho từng role**

Trong object permissions của mỗi role, thêm:

```javascript
canReassignCustomer: role === 'giam_doc',
canClaimCustomer:    role === 'kinh_doanh',
canViewAllCustomers: ['giam_doc', 'ke_toan', 'ky_thuat', 'kho'].includes(role),
```

Cụ thể format tùy theo code hiện tại (spread vào mỗi role object hoặc ternary). Nếu file dùng pattern:
```javascript
const PERMISSIONS = {
    giam_doc: { canApprove: true, ... },
    kinh_doanh: { canApprove: false, ... },
    ...
};
```

Thì thêm vào mỗi key:
- `giam_doc`: `canReassignCustomer: true, canClaimCustomer: false, canViewAllCustomers: true`
- `ke_toan`: `canReassignCustomer: false, canClaimCustomer: false, canViewAllCustomers: true`
- `kinh_doanh`: `canReassignCustomer: false, canClaimCustomer: true, canViewAllCustomers: false`
- `kho`: `canReassignCustomer: false, canClaimCustomer: false, canViewAllCustomers: true`
- `ky_thuat`: `canReassignCustomer: false, canClaimCustomer: false, canViewAllCustomers: true`

- [ ] **Step 2: Build check**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

- [ ] **Step 3: Commit**

```bash
cd d:/Codeapp/motnha && git add contexts/RoleContext.js
git commit -m "feat(roles): +canReassignCustomer, canClaimCustomer, canViewAllCustomers"
```

---

## Task 4: API — POST auto-assign + GET filter + PUT block

**Files:**
- Modify: `app/api/customers/route.js` (POST + GET)
- Modify: `app/api/customers/[id]/route.js` (PUT)

- [ ] **Step 1: POST auto-assign NVKD**

Trong `app/api/customers/route.js` POST handler, trước dòng `const code = await generateCode('customer', 'KH');` (hoặc sau khi parse body), thêm:

```javascript
// Auto-assign cho NVKD, block role không được tạo
if (session.user.role === 'ky_thuat' || session.user.role === 'kho') {
    return NextResponse.json({ error: 'Không có quyền tạo khách hàng' }, { status: 403 });
}
if (session.user.role === 'kinh_doanh') {
    data.salesPersonId = session.user.id;
}
```

> Verify POST handler có `session` param. Nếu không có, đổi signature: `withAuth(async (request, _ctx, session) => { ... })`.

Sau đó, khi tạo Customer, include `salesPersonId`:
```javascript
const customer = await prisma.customer.create({
    data: { code, ...data },
    include: { salesPerson: { select: { id: true, name: true, email: true } } },
});
```

- [ ] **Step 2: GET filter theo role**

Trong GET handler của cùng file, tìm block build `where`:

```javascript
const where = { deletedAt: null };
if (search) { ... }
if (filterType) { ... }
```

Thêm sau các filter cũ:

```javascript
// Role-based ownership filter: kinh_doanh chỉ thấy khách của mình + pool chưa chủ
if (session.user.role === 'kinh_doanh') {
    where.OR = [
        { salesPersonId: session.user.id },
        { salesPersonId: null },
    ];
}
```

Và include `salesPerson` trong response:

```javascript
prisma.customer.findMany({
    where,
    include: {
        projects: { select: { id: true, code: true, status: true } },
        salesPerson: { select: { id: true, name: true, email: true } },
    },
    ...
})
```

- [ ] **Step 3: PUT block reassign**

Trong `app/api/customers/[id]/route.js` PUT handler, sau parse body nhưng trước update:

```javascript
// Block non-giam_doc đổi salesPersonId
if (data.salesPersonId !== undefined && session.user.role !== 'giam_doc') {
    return NextResponse.json({ error: 'Chỉ giám đốc được đổi chủ khách' }, { status: 403 });
}
```

> Đảm bảo PUT handler có `session` param.

- [ ] **Step 4: Build check**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 5: Manual test**

1. Login NVKD → `curl POST /api/customers` với body tạo khách → response có `salesPersonId = user.id`
2. Login giám đốc → GET /api/customers → response include `salesPerson` object
3. Login NVKD B → GET → không thấy khách của NVKD A, thấy khách `salesPersonId=null`
4. Login NVKD → PUT đổi `salesPersonId` → reject 403

- [ ] **Step 6: Commit**

```bash
cd d:/Codeapp/motnha && git add app/api/customers/route.js "app/api/customers/[id]/route.js"
git commit -m "feat(customer-api): POST auto-assign NVKD + GET filter role + PUT block reassign"
```

---

## Task 5: API — POST /claim endpoint

**Files:**
- Create: `app/api/customers/[id]/claim/route.js`

- [ ] **Step 1: Tạo endpoint**

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// POST /api/customers/[id]/claim — NVKD nhận khách chưa có chủ
export const POST = withAuth(async (_request, { params }, session) => {
    if (session.user.role !== 'kinh_doanh') {
        return NextResponse.json({ error: 'Chỉ nhân viên kinh doanh được nhận khách' }, { status: 403 });
    }
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
        where: { id },
        select: { id: true, salesPersonId: true, name: true, deletedAt: true },
    });
    if (!customer || customer.deletedAt) {
        return NextResponse.json({ error: 'Không tìm thấy khách hàng' }, { status: 404 });
    }
    if (customer.salesPersonId) {
        return NextResponse.json({ error: 'Khách đã có chủ, không claim được' }, { status: 422 });
    }

    const updated = await prisma.customer.update({
        where: { id },
        data: { salesPersonId: session.user.id },
        include: { salesPerson: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json(updated);
}, { roles: ['kinh_doanh'] });
```

- [ ] **Step 2: Build check**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

- [ ] **Step 3: Commit**

```bash
cd d:/Codeapp/motnha && git add "app/api/customers/[id]/claim/route.js"
git commit -m "feat(customer-api): POST /claim cho NVKD nhận khách chưa chủ"
```

---

## Task 6: UI — cột Chủ khách + filter + Claim

**Files:**
- Modify: `app/customers/page.js`

- [ ] **Step 1: Fetch role + thêm filter state**

Trên đầu component, nếu chưa có, import role hook:

```javascript
import { useRole } from '@/contexts/RoleContext';
```

Trong component:

```javascript
const { role } = useRole();
const isNvkd = role === 'kinh_doanh';
const [ownerFilter, setOwnerFilter] = useState(isNvkd ? 'mine' : 'all'); // mine | unassigned | all
```

- [ ] **Step 2: Thêm dropdown filter**

Tìm toolbar có `filterSource`/`search`. Thêm dropdown cạnh:

```javascript
<select className="form-select" value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)} style={{ maxWidth: 200 }}>
    {!isNvkd && <option value="all">🏢 Tất cả</option>}
    <option value="mine">🙋 Của tôi</option>
    <option value="unassigned">❓ Chưa chủ</option>
</select>
```

- [ ] **Step 3: Áp filter vào list render**

Tìm chỗ filter customers trước khi render (có thể là `customers.filter(c => ...)` hoặc dùng trực tiếp). Thêm filter:

```javascript
const filteredCustomers = customers.filter(c => {
    if (ownerFilter === 'mine' && c.salesPersonId !== session?.user?.id /* hoặc dùng biến user từ context */) return false;
    if (ownerFilter === 'unassigned' && c.salesPersonId !== null) return false;
    // ... các filter khác
    return true;
});
```

> Nếu `session.user.id` chưa có sẵn trong component, import `useSession` từ `next-auth/react` hoặc từ RoleContext nếu có.

- [ ] **Step 4: Thêm cột "Chủ khách" trong Table view**

Tìm `<thead>` của table — thêm `<th>Chủ khách</th>` (trước cột "Người tạo" nếu có, hoặc sau cột "Nguồn"):

```javascript
<th>Chủ khách</th>
```

Trong body, mỗi row thêm `<td>`:

```javascript
<td style={{ fontSize: 12 }}>
    {c.salesPerson?.name ? (
        <span style={{
            padding: '2px 8px', borderRadius: 12, fontSize: 11,
            background: c.salesPersonId === session?.user?.id ? 'rgba(34,197,94,0.15)' : 'var(--bg-secondary)',
            color: c.salesPersonId === session?.user?.id ? 'var(--status-success)' : 'var(--text-muted)',
        }}>
            {c.salesPerson.name}
        </span>
    ) : (
        <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, background: 'rgba(245,158,11,0.15)', color: 'var(--status-warning)' }}>
            Chưa chủ
        </span>
    )}
</td>
```

- [ ] **Step 5: Thêm nút "Nhận khách" cho row chưa chủ (chỉ NVKD)**

Trong cột actions của mỗi row:

```javascript
{isNvkd && !c.salesPersonId && (
    <button className="btn btn-sm btn-primary" style={{ fontSize: 11 }} onClick={async (e) => {
        e.stopPropagation();
        if (!confirm(`Nhận khách "${c.name}" làm khách của bạn?`)) return;
        const res = await fetch(`/api/customers/${c.id}/claim`, { method: 'POST' });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi'); }
        loadCustomers(); // hoặc fetchCustomers()
    }}>🙋 Nhận</button>
)}
```

- [ ] **Step 6: Kanban view cũng hiện Chủ khách**

Tìm render card kanban. Thêm dòng nhỏ hiện tên chủ:

```javascript
<div style={{ fontSize: 10, color: c.salesPersonId === session?.user?.id ? 'var(--status-success)' : 'var(--text-muted)' }}>
    {c.salesPerson?.name ? `👤 ${c.salesPerson.name}` : '❓ Chưa chủ'}
</div>
```

- [ ] **Step 7: Edit modal — dropdown Chủ khách**

Trong form modal edit/create khách:
- Load list NVKD users: thêm state `const [salesPeople, setSalesPeople] = useState([]);` + fetch:

```javascript
useEffect(() => {
    fetch('/api/users?role=kinh_doanh').then(r => r.json()).then(d => setSalesPeople(Array.isArray(d?.data) ? d.data : (Array.isArray(d) ? d : [])));
}, []);
```

- Thêm field dropdown:

```javascript
<div className="form-group">
    <label className="form-label">Chủ khách</label>
    <select
        className="form-select"
        value={form.salesPersonId || ''}
        onChange={e => setForm({ ...form, salesPersonId: e.target.value || null })}
        disabled={!permissions?.canReassignCustomer}
        title={!permissions?.canReassignCustomer ? 'Chỉ giám đốc được đổi chủ khách' : ''}
    >
        <option value="">— Chưa gán —</option>
        {salesPeople.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
    </select>
</div>
```

Import `useRole` để lấy `permissions` nếu chưa có.

- [ ] **Step 8: Build + manual test**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: build thành công.

Run dev:
1. NVKD login → /customers → thấy khách của mình (badge xanh) + filter "Của tôi" mặc định
2. Chọn filter "Chưa chủ" → thấy khách pool → click "🙋 Nhận" → khách chuyển sang của mình
3. Giám đốc login → "Tất cả" hiện hết → mở modal sửa → dropdown "Chủ khách" enabled → chọn NVKD khác → save → OK
4. NVKD mở modal sửa → dropdown Chủ khách disabled, tooltip hiện

- [ ] **Step 9: Commit**

```bash
cd d:/Codeapp/motnha && git add app/customers/page.js
git commit -m "feat(customer-ui): cột Chủ khách + filter + nút Claim + edit dropdown"
```

---

## Task 7: Smoke test E2E + push

- [ ] **Step 1: Check users role kinh_doanh**

```bash
cd d:/Codeapp/motnha && node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const users=await p.user.findMany({where:{role:'kinh_doanh',active:true},select:{id:true,name:true,email:true}});console.log('NVKD users:',users.length);users.forEach(u=>console.log(' ',u.name,u.email));await p.\$disconnect();})();"
```

Nếu chưa có user role `kinh_doanh` → tạo 1 test user qua `/app/api/users` hoặc seed.

- [ ] **Step 2: Full flow test**

1. Đăng nhập Giám đốc → /customers → thấy toàn bộ, filter dropdown có 3 option
2. Đăng nhập NVKD A → /customers → chỉ thấy của mình + chưa chủ
3. NVKD A tạo khách mới → verify DB: `salesPersonId = userA.id`
4. NVKD A → filter "Chưa chủ" → click "Nhận" 1 khách → khách của NVKD A
5. NVKD A thử PUT đổi `salesPersonId` qua curl → 403
6. Giám đốc → modal edit khách → đổi sang NVKD B → NVKD A không còn thấy khách đó
7. Xóa User NVKD A (disable) → khách của A → `salesPersonId=null` (onDelete SET NULL)

- [ ] **Step 3: Final build**

```bash
cd d:/Codeapp/motnha && npm run build
```

Expected: build success.

- [ ] **Step 4: Push**

```bash
cd d:/Codeapp/motnha && git push origin main
```

- [ ] **Step 5: Fixup nếu có**

Nếu smoke test phát hiện bug → fix + commit với prefix `fix(crm):` rồi push.
