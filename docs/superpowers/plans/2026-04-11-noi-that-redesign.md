# Nội Thất Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign module nội thất — layout Action-First với step bar 6 bước, action banner, tab bar tự động focus, tách MaterialSelectionTab (vòng chốt + xác nhận online) và MaterialOrdersTab (3 card PO).

**Architecture:** Rewrite `app/noi-that/[id]/page.js` + 2 tabs; thêm 2 API mới (send-confirmation, public confirmation); migrate `FurnitureOrder.status` từ English sang Vietnamese; thêm `confirmationToken` + `tokenExpiresAt` vào `MaterialSelection`.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 6, PostgreSQL, `withAuth()`, CSS variables (globals.css)

---

## File Structure

| File | Thay đổi |
|------|----------|
| `prisma/schema.prisma` | Thêm 2 field vào `MaterialSelection`; update default status FurnitureOrder |
| `app/api/furniture-orders/[id]/status/route.js` | Rewrite VALID_TRANSITIONS sang 6 status mới |
| `app/api/furniture-orders/[id]/material-orders/[type]/create-po/route.js` | Update status check |
| `app/api/furniture-orders/[id]/material-selections/[selId]/send-confirmation/route.js` | Tạo mới |
| `app/api/public/material-confirmation/[token]/route.js` | Tạo mới (GET + POST, public) |
| `app/public/material-confirmation/[token]/page.js` | Tạo mới (public page KH xác nhận) |
| `app/noi-that/[id]/page.js` | Rewrite: step bar + action banner + 6 tabs mới |
| `app/noi-that/[id]/tabs/MaterialSelectionTab.js` | Rewrite: vòng chốt cards + Xuất PDF + Gửi KH |
| `app/noi-that/[id]/tabs/MaterialOrdersTab.js` | Rewrite: pull từ vòng confirmed + 3 card PO |

Không thay đổi: `HoSoTab.js`, `CncFilesTab.js`, `IssuesTab.js`, `AcceptanceTab.js`, `OverviewTab.js`, list page.

---

### Task 1: Schema — thêm fields vào MaterialSelection

**Files:**
- Modify: `prisma/schema.prisma:1713-1733`

- [ ] **Step 1: Thêm 2 field vào model MaterialSelection**

Mở `prisma/schema.prisma`, tìm model `MaterialSelection`. Thêm 2 dòng sau `confirmationNote`:

```prisma
  confirmationToken String?   @unique
  selTokenExpiresAt DateTime?
```

Kết quả model sẽ là:
```prisma
model MaterialSelection {
  id               String                  @id @default(cuid())
  furnitureOrderId String
  selectionRound   Int                     @default(1)
  title            String                  @default("")
  notes            String                  @default("")
  status           String                  @default("pending")
  presentedAt      DateTime?
  presentedBy      String                  @default("")
  confirmedAt      DateTime?
  confirmedByName  String                  @default("")
  confirmedIp      String                  @default("")
  confirmationNote String                  @default("")
  confirmationToken String?                @unique
  selTokenExpiresAt DateTime?
  createdAt        DateTime                @default(now())
  updatedAt        DateTime                @updatedAt
  furnitureOrder   FurnitureOrder          @relation(fields: [furnitureOrderId], references: [id], onDelete: Cascade)
  items            MaterialSelectionItem[]

  @@index([furnitureOrderId])
  @@index([status])
}
```

> Lưu ý: dùng tên `selTokenExpiresAt` để tránh trùng với `tokenExpiresAt` đã có trong `FurnitureOrder`.

- [ ] **Step 2: Update default status FurnitureOrder**

Trong `prisma/schema.prisma`, tìm dòng:
```prisma
  status             String               @default("draft")
```
Sửa thành:
```prisma
  status             String               @default("Xác nhận")
```

- [ ] **Step 3: Push schema lên DB**

```bash
npm run db:migrate
```

Expected: migration success, 2 columns mới trong `MaterialSelection`.

- [ ] **Step 4: Regenerate Prisma client**

```bash
npm run db:generate
```

- [ ] **Step 5: Migrate status values hiện có trong DB**

Chạy raw SQL để convert status từ English sang Vietnamese. Dùng Prisma Studio hoặc psql:

```sql
UPDATE "FurnitureOrder"
SET status = CASE status
  WHEN 'draft'             THEN 'Xác nhận'
  WHEN 'confirmed'         THEN 'Xác nhận'
  WHEN 'design_review'     THEN 'Xác nhận'
  WHEN 'design_approved'   THEN 'Xác nhận'
  WHEN 'cancelled'         THEN 'Xác nhận'
  WHEN 'material_confirmed' THEN 'Chốt & Đặt VL'
  WHEN 'material_ordered'  THEN 'Chốt & Đặt VL'
  WHEN 'cnc_ready'         THEN 'CNC'
  WHEN 'in_production'     THEN 'Sản xuất'
  WHEN 'qc_done'           THEN 'Sản xuất'
  WHEN 'installing'        THEN 'Lắp đặt'
  WHEN 'completed'         THEN 'Bảo hành'
  WHEN 'warranty'          THEN 'Bảo hành'
  ELSE status
END
WHERE status IN (
  'draft','confirmed','design_review','design_approved','cancelled',
  'material_confirmed','material_ordered','cnc_ready',
  'in_production','qc_done','installing','completed','warranty'
);
```

Chạy bằng Prisma Studio (Terminal > SQL tab) hoặc psql trực tiếp. Verify:

```sql
SELECT DISTINCT status FROM "FurnitureOrder";
```

Expected: chỉ còn các giá trị: `Xác nhận`, `Chốt & Đặt VL`, `CNC`, `Sản xuất`, `Lắp đặt`, `Bảo hành` (hoặc rỗng nếu bảng trống).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add confirmationToken to MaterialSelection; migrate FurnitureOrder status to Vietnamese"
```

---

### Task 2: Update status transition API + create-po status check

**Files:**
- Modify: `app/api/furniture-orders/[id]/status/route.js`
- Modify: `app/api/furniture-orders/[id]/material-orders/[type]/create-po/route.js:19`

- [ ] **Step 1: Rewrite VALID_TRANSITIONS trong status/route.js**

Thay toàn bộ nội dung `app/api/furniture-orders/[id]/status/route.js`:

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const VALID_TRANSITIONS = {
    'Xác nhận':      ['Chốt & Đặt VL'],
    'Chốt & Đặt VL': ['CNC'],
    'CNC':           ['Sản xuất'],
    'Sản xuất':      ['Lắp đặt'],
    'Lắp đặt':       ['Bảo hành'],
    'Bảo hành':      [],
};

export const PATCH = withAuth(async (request, { params }) => {
    const { id } = await params;
    const { status: newStatus } = await request.json();
    if (!newStatus) return NextResponse.json({ error: 'Thiếu status' }, { status: 400 });

    const order = await prisma.furnitureOrder.findUnique({ where: { id }, select: { status: true } });
    if (!order) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(newStatus)) {
        return NextResponse.json(
            { error: `Không thể chuyển từ '${order.status}' sang '${newStatus}'` },
            { status: 400 }
        );
    }

    const updated = await prisma.furnitureOrder.update({
        where: { id },
        data: { status: newStatus },
    });
    return NextResponse.json(updated);
});
```

- [ ] **Step 2: Update create-po status check**

Mở `app/api/furniture-orders/[id]/material-orders/[type]/create-po/route.js`, tìm dòng 19:
```javascript
    if (!['material_confirmed', 'material_ordered'].includes(furnitureOrder.status)) {
```
Sửa thành:
```javascript
    if (furnitureOrder.status !== 'Chốt & Đặt VL') {
```

- [ ] **Step 3: Verify dev server khởi động không lỗi**

```bash
npm run dev
```

Truy cập một đơn nội thất bất kỳ, xem API không crash. Ctrl+C sau khi verify.

- [ ] **Step 4: Commit**

```bash
git add app/api/furniture-orders/[id]/status/route.js \
        "app/api/furniture-orders/[id]/material-orders/[type]/create-po/route.js"
git commit -m "feat(api): update furniture status transitions to 6-step Vietnamese flow"
```

---

### Task 3: API send-confirmation

**Files:**
- Create: `app/api/furniture-orders/[id]/material-selections/[selId]/send-confirmation/route.js`

- [ ] **Step 1: Tạo file mới**

Tạo `app/api/furniture-orders/[id]/material-selections/[selId]/send-confirmation/route.js`:

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (request, { params }) => {
    const { selId } = await params;

    const sel = await prisma.materialSelection.findUnique({
        where: { id: selId },
        select: { id: true, furnitureOrderId: true },
    });
    if (!sel) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 ngày

    await prisma.materialSelection.update({
        where: { id: selId },
        data: {
            confirmationToken: token,
            selTokenExpiresAt: expiresAt,
        },
    });

    const url = `/public/material-confirmation/${token}`;
    return NextResponse.json({ token, url, expiresAt });
});
```

- [ ] **Step 2: Test API**

```bash
npm run dev
```

Dùng curl hoặc browser DevTools:
```bash
curl -X POST http://localhost:3000/api/furniture-orders/SOME_ID/material-selections/SOME_SEL_ID/send-confirmation \
  -H "Cookie: next-auth.session-token=..." \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected response:
```json
{ "token": "some-uuid", "url": "/public/material-confirmation/some-uuid", "expiresAt": "..." }
```

- [ ] **Step 3: Commit**

```bash
git add "app/api/furniture-orders/[id]/material-selections/[selId]/send-confirmation/route.js"
git commit -m "feat(api): add send-confirmation endpoint for material selection"
```

---

### Task 4: Public confirmation API + page

**Files:**
- Create: `app/api/public/material-confirmation/[token]/route.js`
- Create: `app/public/material-confirmation/[token]/page.js`

- [ ] **Step 1: Tạo public API route**

Tạo `app/api/public/material-confirmation/[token]/route.js`:

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET — KH lấy thông tin vật liệu để xem
export const GET = withAuth(async (request, { params }) => {
    const { token } = await params;

    const sel = await prisma.materialSelection.findUnique({
        where: { confirmationToken: token },
        include: {
            items: true,
            furnitureOrder: {
                select: {
                    name: true,
                    customer: { select: { name: true } },
                },
            },
        },
    });

    if (!sel) return NextResponse.json({ error: 'Link không hợp lệ hoặc đã hết hạn' }, { status: 404 });
    if (sel.selTokenExpiresAt && sel.selTokenExpiresAt < new Date()) {
        return NextResponse.json({ error: 'Link đã hết hạn' }, { status: 410 });
    }

    return NextResponse.json({
        selectionRound: sel.selectionRound,
        title: sel.title,
        status: sel.status,
        orderName: sel.furnitureOrder.name,
        customerName: sel.furnitureOrder.customer?.name || '',
        confirmedAt: sel.confirmedAt,
        confirmedByName: sel.confirmedByName,
        items: sel.items,
    });
}, { public: true });

// POST — KH xác nhận
export const POST = withAuth(async (request, { params }) => {
    const { token } = await params;
    const { name } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Vui lòng nhập họ tên' }, { status: 400 });

    const sel = await prisma.materialSelection.findUnique({
        where: { confirmationToken: token },
        select: { id: true, selTokenExpiresAt: true, status: true },
    });

    if (!sel) return NextResponse.json({ error: 'Link không hợp lệ' }, { status: 404 });
    if (sel.selTokenExpiresAt && sel.selTokenExpiresAt < new Date()) {
        return NextResponse.json({ error: 'Link đã hết hạn' }, { status: 410 });
    }
    if (sel.status === 'confirmed') {
        return NextResponse.json({ error: 'Vật liệu đã được xác nhận trước đó' }, { status: 400 });
    }

    const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        '';

    await prisma.materialSelection.update({
        where: { id: sel.id },
        data: {
            status: 'confirmed',
            confirmedAt: new Date(),
            confirmedByName: name.trim(),
            confirmedIp: ip,
            confirmationToken: null,
            selTokenExpiresAt: null,
        },
    });

    return NextResponse.json({ success: true });
}, { public: true });
```

- [ ] **Step 2: Tạo public page**

Tạo `app/public/material-confirmation/[token]/page.js`:

```javascript
'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function MaterialConfirmationPage() {
    const { token } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [name, setName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    useEffect(() => {
        fetch(`/api/public/material-confirmation/${token}`)
            .then(r => r.json())
            .then(d => {
                if (d.error) setError(d.error);
                else setData(d);
            })
            .catch(() => setError('Không thể tải thông tin'))
            .finally(() => setLoading(false));
    }, [token]);

    const handleConfirm = async () => {
        if (!name.trim()) return alert('Vui lòng nhập họ tên của bạn');
        setSubmitting(true);
        try {
            const res = await fetch(`/api/public/material-confirmation/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            const result = await res.json();
            if (!res.ok) { alert(result.error || 'Lỗi xác nhận'); return; }
            setDone(true);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
            <p style={{ color: '#6b7280' }}>Đang tải...</p>
        </div>
    );

    if (error) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
            <div style={{ textAlign: 'center', maxWidth: 400 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                <h2 style={{ color: '#374151', marginBottom: 8 }}>Link không hợp lệ</h2>
                <p style={{ color: '#6b7280' }}>{error}</p>
            </div>
        </div>
    );

    if (done || data?.status === 'confirmed') return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
            <div style={{ textAlign: 'center', maxWidth: 400 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <h2 style={{ color: '#16a34a', marginBottom: 8 }}>Đã xác nhận vật liệu</h2>
                {data?.confirmedByName && (
                    <p style={{ color: '#6b7280' }}>Xác nhận bởi: <strong>{done ? name : data.confirmedByName}</strong></p>
                )}
                {data?.confirmedAt && (
                    <p style={{ color: '#9ca3af', fontSize: 13 }}>
                        {new Date(data.confirmedAt).toLocaleString('vi-VN')}
                    </p>
                )}
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui' }}>
            {/* Header */}
            <div style={{ background: '#1e3a8a', color: '#fff', padding: '16px 20px' }}>
                <div style={{ maxWidth: 600, margin: '0 auto' }}>
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>Xác nhận vật liệu nội thất</div>
                    <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{data.orderName}</h1>
                    <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>Khách hàng: {data.customerName}</div>
                </div>
            </div>

            <div style={{ maxWidth: 600, margin: '24px auto', padding: '0 16px' }}>
                {/* Selection header */}
                <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 16, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: '#eff6ff' }}>
                        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1d4ed8' }}>
                            Vòng {data.selectionRound} — {data.title}
                        </h2>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
                            Vui lòng xem danh sách vật liệu bên dưới và xác nhận nếu đồng ý.
                        </p>
                    </div>

                    {/* Items table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#f9fafb' }}>
                                <th style={{ padding: '8px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Loại vật liệu</th>
                                <th style={{ padding: '8px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Màu / Mã</th>
                                <th style={{ padding: '8px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Khu vực</th>
                                <th style={{ padding: '8px 16px', textAlign: 'right', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>SL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data.items || []).map((item, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '10px 16px' }}>
                                        <div style={{ fontWeight: 600 }}>{item.materialName}</div>
                                        {item.supplier && <div style={{ fontSize: 11, color: '#9ca3af' }}>{item.supplier}</div>}
                                    </td>
                                    <td style={{ padding: '10px 16px' }}>
                                        <div>{item.colorName || '—'}</div>
                                        {item.colorCode && <div style={{ fontSize: 11, color: '#9ca3af' }}>{item.colorCode}</div>}
                                    </td>
                                    <td style={{ padding: '10px 16px', color: '#6b7280' }}>{item.applicationArea || '—'}</td>
                                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>{item.quantity} {item.unit}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Confirmation form */}
                <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', padding: '20px 16px' }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#374151' }}>Xác nhận đồng ý</h3>
                    <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
                        Nhập họ tên của bạn để xác nhận đã xem và đồng ý với danh sách vật liệu trên.
                    </p>
                    <input
                        type="text"
                        placeholder="Họ và tên của bạn"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        style={{
                            width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
                            borderRadius: 6, fontSize: 14, marginBottom: 12, boxSizing: 'border-box',
                        }}
                    />
                    <button
                        onClick={handleConfirm}
                        disabled={submitting || !name.trim()}
                        style={{
                            width: '100%', background: submitting || !name.trim() ? '#9ca3af' : '#16a34a',
                            color: '#fff', border: 'none', padding: '12px', borderRadius: 6,
                            fontSize: 15, fontWeight: 700, cursor: submitting || !name.trim() ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {submitting ? 'Đang xác nhận...' : '✓ Tôi đồng ý với danh sách vật liệu này'}
                    </button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Verify middleware cho phép public route**

Kiểm tra `middleware.js` — `/public` prefix đã được allow (không cần auth). Kiểm tra `/api/public` prefix cũng được allow bởi `{ public: true }` trong `withAuth`.

Test thủ công: truy cập `http://localhost:3000/public/material-confirmation/fake-token` — phải render trang lỗi (không redirect về login).

- [ ] **Step 4: Commit**

```bash
git add "app/api/public/material-confirmation/[token]/route.js" \
        "app/public/material-confirmation/[token]/page.js"
git commit -m "feat: add public material confirmation page + API for customer approval"
```

---

### Task 5: Rewrite trang chi tiết page.js

**Files:**
- Modify: `app/noi-that/[id]/page.js` (full rewrite)

- [ ] **Step 1: Rewrite page.js**

Thay toàn bộ nội dung `app/noi-that/[id]/page.js`:

```javascript
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/fetchClient';
import HoSoTab from './tabs/HoSoTab';
import CncFilesTab from './tabs/CncFilesTab';
import MaterialSelectionTab from './tabs/MaterialSelectionTab';
import MaterialOrdersTab from './tabs/MaterialOrdersTab';
import IssuesTab from './tabs/IssuesTab';
import AcceptanceTab from './tabs/AcceptanceTab';

const STEPS = [
    { key: 'Xác nhận',      label: 'Xác nhận',     icon: '✓' },
    { key: 'Chốt & Đặt VL', label: 'Chốt & Đặt VL', icon: '🧱' },
    { key: 'CNC',            label: 'CNC',            icon: '✂️' },
    { key: 'Sản xuất',       label: 'Sản xuất',      icon: '🔨' },
    { key: 'Lắp đặt',        label: 'Lắp đặt',       icon: '🔧' },
    { key: 'Bảo hành',       label: 'Bảo hành',      icon: '🛡️' },
];

function getActionBanner(order) {
    const hasPO = order.materialOrders &&
        (order.materialOrders.VAN?.purchaseOrderId ||
         order.materialOrders.NEP?.purchaseOrderId ||
         order.materialOrders.ACRYLIC?.purchaseOrderId);

    const banners = {
        'Xác nhận':      { msg: 'Chốt vật liệu với khách hàng', btn: '→ Thêm vòng chốt', tab: 'materials' },
        'Chốt & Đặt VL': hasPO
            ? { msg: 'PO đã tạo — Chờ nhận hàng, sau đó chuyển sang CNC', btn: '→ Xem PO', tab: 'orders' }
            : { msg: 'Vật liệu đã chốt — Chưa có PO đặt hàng nào', btn: '→ Tạo PO đặt hàng', tab: 'orders' },
        'CNC':           { msg: 'Upload file CNC và xác nhận số tấm', btn: '→ Upload CNC', tab: 'cnc' },
        'Sản xuất':      { msg: 'Đang sản xuất — Cập nhật tiến độ', btn: null, tab: 'materials' },
        'Lắp đặt':       { msg: 'Lắp đặt xong → Tạo biên bản nghiệm thu', btn: '→ Tạo nghiệm thu', tab: 'acceptance' },
        'Bảo hành':      { msg: 'Theo dõi bảo hành', btn: null, tab: 'acceptance' },
    };
    return banners[order.status] || null;
}

function getDefaultTab(order) {
    const hasPO = order.materialOrders &&
        (order.materialOrders.VAN?.purchaseOrderId ||
         order.materialOrders.NEP?.purchaseOrderId ||
         order.materialOrders.ACRYLIC?.purchaseOrderId);

    const map = {
        'Xác nhận':      'materials',
        'Chốt & Đặt VL': hasPO ? 'materials' : 'orders',
        'CNC':           'cnc',
        'Sản xuất':      'materials',
        'Lắp đặt':       'acceptance',
        'Bảo hành':      'acceptance',
    };
    return map[order.status] || 'materials';
}

export default function FurnitureOrderDetailPage() {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState(null); // null until order loaded

    const fetchOrder = useCallback(async () => {
        try {
            const data = await apiFetch(`/api/furniture-orders/${id}`);
            setOrder(data);
            setTab(prev => prev ?? getDefaultTab(data));
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchOrder(); }, [fetchOrder]);

    if (loading || !order) {
        return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;
    }

    const stepIdx = STEPS.findIndex(s => s.key === order.status);
    const banner = getActionBanner(order);

    const TABS = [
        { key: 'materials',  label: 'Vật liệu',  icon: '🧱' },
        { key: 'orders',     label: 'Đặt hàng',  icon: '🛒' },
        { key: 'files',      label: 'Hồ sơ',     icon: '📁' },
        { key: 'cnc',        label: 'CNC',        icon: '✂️' },
        { key: 'issues',     label: 'Phát sinh', icon: '⚠️' },
        { key: 'acceptance', label: 'Nghiệm thu', icon: '📋' },
    ];

    return (
        <div>
            {/* Header bar */}
            <div style={{
                background: '#1e3a8a', color: '#fff',
                padding: '10px 20px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <a href="/noi-that" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13 }}>← Nội thất</a>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{order.code} — {order.name}</span>
                    {order.customer && (
                        <span style={{
                            background: 'rgba(255,255,255,0.15)', padding: '2px 10px',
                            borderRadius: 12, fontSize: 12,
                        }}>{order.customer.name}</span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {order.expectedDelivery && (
                        <span style={{ fontSize: 12, opacity: 0.8 }}>
                            Giao: {new Date(order.expectedDelivery).toLocaleDateString('vi-VN')}
                        </span>
                    )}
                    <span style={{
                        background: '#16a34a', padding: '3px 12px',
                        borderRadius: 12, fontSize: 11, fontWeight: 600,
                    }}>{order.status}</span>
                </div>
            </div>

            {/* Step bar */}
            <div style={{ background: '#eff6ff', padding: '10px 20px', display: 'flex', alignItems: 'center', overflowX: 'auto' }}>
                {STEPS.map((step, i) => {
                    const done = i < stepIdx;
                    const active = i === stepIdx;
                    return (
                        <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 80 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{
                                    width: 26, height: 26, borderRadius: '50%',
                                    background: done ? '#16a34a' : active ? '#1d4ed8' : '#e5e7eb',
                                    color: done || active ? '#fff' : '#9ca3af',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                                }}>
                                    {done ? '✓' : i + 1}
                                </div>
                                <span style={{
                                    fontSize: 10, fontWeight: active ? 700 : 400,
                                    color: done ? '#16a34a' : active ? '#1d4ed8' : '#9ca3af',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {step.label}
                                </span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div style={{
                                    flex: 1, height: 2, margin: '0 8px',
                                    background: done ? '#16a34a' : '#e5e7eb',
                                }} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Action banner */}
            {banner && (
                <div style={{
                    background: '#fefce8', borderLeft: '3px solid #f59e0b',
                    padding: '8px 20px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <div>
                        <span style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>⚡ Bước tiếp theo: </span>
                        <span style={{ fontSize: 12, color: '#78350f' }}>{banner.msg}</span>
                    </div>
                    {banner.btn && (
                        <button
                            onClick={() => setTab(banner.tab)}
                            style={{
                                background: '#f59e0b', color: '#fff', border: 'none',
                                padding: '5px 14px', borderRadius: 5, fontSize: 12,
                                fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                            }}
                        >
                            {banner.btn}
                        </button>
                    )}
                </div>
            )}

            {/* Tab bar */}
            <div style={{ borderBottom: '2px solid var(--border)', background: '#fff', padding: '0 20px', display: 'flex', gap: 0 }}>
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{
                        padding: '9px 16px', fontSize: 13, border: 'none', cursor: 'pointer',
                        background: 'none',
                        borderBottom: tab === t.key ? '2px solid #1d4ed8' : '2px solid transparent',
                        color: tab === t.key ? '#1d4ed8' : 'var(--text-secondary)',
                        fontWeight: tab === t.key ? 700 : 400,
                        marginBottom: -2,
                    }}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div style={{ padding: '20px' }}>
                {tab === 'materials'  && <MaterialSelectionTab orderId={id} order={order} onRefresh={fetchOrder} />}
                {tab === 'orders'     && <MaterialOrdersTab orderId={id} order={order} onRefresh={fetchOrder} />}
                {tab === 'files'      && <HoSoTab orderId={id} order={order} onRefresh={fetchOrder} />}
                {tab === 'cnc'        && <CncFilesTab orderId={id} order={order} onRefresh={fetchOrder} />}
                {tab === 'issues'     && <IssuesTab orderId={id} order={order} />}
                {tab === 'acceptance' && <AcceptanceTab orderId={id} order={order} onRefresh={fetchOrder} />}
            </div>
        </div>
    );
}
```

> Lưu ý: `order.materialOrders` được include trong API GET `furniture-orders/[id]` — xem Task 6 step 1 để verify.

- [ ] **Step 2: Verify API trả về materialOrders**

Mở `app/api/furniture-orders/[id]/route.js`, tìm `include:` block. Đảm bảo có:
```javascript
materialOrders: { include: { items: true } },
```
Nếu không có, thêm vào include block.

- [ ] **Step 3: Test trên browser**

```bash
npm run dev
```

Truy cập `/noi-that/[id]`. Kiểm tra:
- Header bar hiển thị code + tên + KH + status badge
- Step bar hiển thị đúng bước với màu xanh lá (done), xanh dương (active), xám (pending)
- Action banner hiển thị message theo status
- Tab bar có 6 tabs đúng
- Mặc định focus đúng tab theo status

- [ ] **Step 4: Commit**

```bash
git add "app/noi-that/[id]/page.js"
git commit -m "feat(ui): rewrite furniture detail page with 6-step bar + action banner + new tab structure"
```

---

### Task 6: Rewrite MaterialSelectionTab

**Files:**
- Modify: `app/noi-that/[id]/tabs/MaterialSelectionTab.js` (full rewrite)

- [ ] **Step 1: Rewrite MaterialSelectionTab.js**

Thay toàn bộ nội dung `app/noi-that/[id]/tabs/MaterialSelectionTab.js`:

```javascript
'use client';
import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/fetchClient';

// ── Picker config (giữ nguyên từ bản cũ) ─────────────────────────────────────
const PICKER_TYPES = {
    van: {
        title: '🪵 Chọn màu ván MDF',
        categories: ['Ván AC', 'Ván Thái'],
        catLabels: { 'Ván AC': 'An Cường', 'Ván Thái': 'Melamin Thái' },
        materialName: 'Ván MFC',
        unit: 'tờ',
        btnLabel: '🪵 Chọn ván MDF',
        btnClass: 'btn-primary',
    },
    acrylic: {
        title: '✨ Chọn cánh Acrylic',
        categories: ['Acrylic'],
        catLabels: {},
        materialName: 'Acrylic',
        unit: 'tờ',
        btnLabel: '✨ Chọn Acrylic',
        btnClass: 'btn-ghost',
    },
    san_go: {
        title: '🏠 Chọn sàn gỗ',
        categories: ['Sàn gỗ AC'],
        catLabels: {},
        materialName: 'Sàn gỗ',
        unit: 'm²',
        btnLabel: '🏠 Chọn sàn gỗ',
        btnClass: 'btn-ghost',
    },
};

const QUICK_ADD = [
    { label: '+ Nẹp nhôm', materialName: 'Nẹp nhôm', unit: 'm' },
    { label: '+ Tay nắm', materialName: 'Tay nắm', unit: 'cái' },
    { label: '+ Bản lề', materialName: 'Bản lề', unit: 'cái' },
    { label: '+ Ray hộp', materialName: 'Ray hộp', unit: 'bộ' },
    { label: '+ Phụ kiện', materialName: 'Phụ kiện', unit: 'cái' },
];

const emptyRow = () => ({
    productId: null, materialName: '', colorCode: '', colorName: '',
    swatchImageUrl: '', applicationArea: '', quantity: 1, unit: 'tờ', notes: '',
});

async function fetchFromCategories(categories, search, limit = 30) {
    const fetches = categories.map(cat => {
        const params = new URLSearchParams({ category: cat, limit: String(limit) });
        if (search) params.set('search', search);
        return apiFetch(`/api/products?${params}`)
            .then(r => (r.data || []).map(p => ({ ...p, _category: cat })))
            .catch(() => []);
    });
    const results = await Promise.all(fetches);
    return results.flat();
}

const STATUS_CONFIG = {
    pending:   { label: 'Chờ xác nhận', bg: '#fef9c3', color: '#92400e' },
    confirmed: { label: '✓ Đã xác nhận', bg: '#dcfce7', color: '#16a34a' },
    changed:   { label: 'Đã thay đổi', bg: '#f3f4f6', color: '#6b7280' },
};

// ── PDF print helper ───────────────────────────────────────────────────────────
function printSelection(sel, orderName) {
    const rows = (sel.items || []).map(it => `
        <tr>
            <td>${it.materialName}</td>
            <td>${it.colorName || ''}${it.colorCode ? ` (${it.colorCode})` : ''}</td>
            <td>${it.applicationArea || ''}</td>
            <td style="text-align:right">${it.quantity} ${it.unit}</td>
        </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Vật liệu ${sel.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; font-size: 13px; }
        h2 { margin-bottom: 4px; }
        p { color: #666; margin: 0 0 16px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 10px; border: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; text-align: left; }
    </style></head><body>
    <h2>${orderName} — ${sel.title}</h2>
    <p>Vòng ${sel.selectionRound} · ${sel.items?.length || 0} loại vật liệu</p>
    <table>
        <thead><tr><th>Vật liệu</th><th>Màu / Mã</th><th>Khu vực</th><th>Số lượng</th></tr></thead>
        <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:20px;color:#999;font-size:11px">In ngày ${new Date().toLocaleDateString('vi-VN')}</p>
    </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.print(); };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MaterialSelectionTab({ orderId, order, onRefresh }) {
    const [selections, setSelections] = useState(order.materialSelections || []);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [creating, setCreating] = useState(false);
    const [sendingLink, setSendingLink] = useState({}); // selId → boolean
    const [confirmLink, setConfirmLink] = useState(null); // { url } to show after sending

    const [picker, setPicker] = useState(null);
    const [pickerSearch, setPickerSearch] = useState('');
    const [pickerResults, setPickerResults] = useState([]);
    const [pickerLoading, setPickerLoading] = useState(false);
    const [pickerCatFilter, setPickerCatFilter] = useState('all');
    const searchRef = useRef(null);
    const searchTimer = useRef(null);

    const areaSuggestions = (order.items || []).map(i => i.name).filter(Boolean);

    // ── Create new selection ───────────────────────────────────────────────────
    const createNew = async () => {
        setCreating(true);
        try {
            const round = selections.length + 1;
            const sel = await apiFetch(`/api/furniture-orders/${orderId}/material-selections`, {
                method: 'POST',
                body: { title: `Vật liệu vòng ${round}`, items: [] },
            });
            setSelections(prev => [...prev, sel]);
            openEditor(sel);
        } catch (err) { alert(err.message || 'Lỗi tạo vòng chốt'); }
        setCreating(false);
    };

    const openEditor = (sel) => {
        setEditingId(sel.id);
        setEditForm({
            title: sel.title || '',
            presentedBy: sel.presentedBy || '',
            notes: sel.notes || '',
            items: (sel.items || []).map(it => ({ ...it })),
        });
    };

    const closeEditor = () => { setEditingId(null); setEditForm(null); };

    const deleteSel = async (selId) => {
        if (!confirm('Xóa vòng chốt này?')) return;
        await apiFetch(`/api/furniture-orders/${orderId}/material-selections/${selId}`, { method: 'DELETE' });
        setSelections(prev => prev.filter(s => s.id !== selId));
        if (editingId === selId) closeEditor();
    };

    // ── Items editing ──────────────────────────────────────────────────────────
    const addRow = (template = {}) => {
        setEditForm(f => ({ ...f, items: [...f.items, { ...emptyRow(), ...template }] }));
    };

    const updateItem = (idx, updates) => {
        setEditForm(f => {
            const items = [...f.items];
            items[idx] = { ...items[idx], ...updates };
            return { ...f, items };
        });
    };

    const removeItem = (idx) => {
        setEditForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
    };

    const importFromOrder = () => {
        if (!areaSuggestions.length) return alert('Đơn hàng không có hạng mục nào.');
        const newRows = areaSuggestions.map(name => ({
            ...emptyRow(), materialName: 'Ván MFC', applicationArea: name,
        }));
        setEditForm(f => ({ ...f, items: [...f.items, ...newRows] }));
    };

    // ── Save ───────────────────────────────────────────────────────────────────
    const saveItems = async () => {
        setSaving(true);
        try {
            const updated = await apiFetch(
                `/api/furniture-orders/${orderId}/material-selections/${editingId}`,
                { method: 'PATCH', body: editForm }
            );
            setSelections(prev => prev.map(s => s.id === editingId ? updated : s));
        } catch (err) { alert(err.message || 'Lỗi lưu'); }
        setSaving(false);
    };

    // ── Send confirmation link ─────────────────────────────────────────────────
    const sendConfirmationLink = async (selId) => {
        setSendingLink(prev => ({ ...prev, [selId]: true }));
        try {
            const result = await apiFetch(
                `/api/furniture-orders/${orderId}/material-selections/${selId}/send-confirmation`,
                { method: 'POST', body: {} }
            );
            const fullUrl = window.location.origin + result.url;
            setConfirmLink({ url: fullUrl, selId });
            await navigator.clipboard.writeText(fullUrl).catch(() => {});
        } catch (err) { alert(err.message || 'Lỗi tạo link'); }
        setSendingLink(prev => ({ ...prev, [selId]: false }));
    };

    // ── Picker logic (giữ nguyên từ bản cũ) ───────────────────────────────────
    const openPicker = (rowIdx, type) => {
        setPicker({ rowIdx, type });
        setPickerSearch('');
        setPickerResults([]);
        setPickerCatFilter('all');
        setTimeout(() => searchRef.current?.focus(), 50);
    };

    useEffect(() => {
        if (!picker) return;
        const cfg = PICKER_TYPES[picker.type];
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(async () => {
            setPickerLoading(true);
            const results = await fetchFromCategories(cfg.categories, pickerSearch);
            setPickerResults(results);
            setPickerLoading(false);
        }, 200);
    }, [picker, pickerSearch]);

    const selectProduct = (p) => {
        const cfg = PICKER_TYPES[picker.type];
        updateItem(picker.rowIdx, {
            productId: p.id,
            materialName: p.name || cfg.materialName,
            colorName: p.colorName || p.name,
            colorCode: p.colorCode || p.code || '',
            swatchImageUrl: p.imageUrl || p.swatchImageUrl || '',
            unit: cfg.unit,
        });
        setPicker(null);
    };

    const filteredResults = pickerCatFilter === 'all'
        ? pickerResults
        : pickerResults.filter(p => p._category === pickerCatFilter);

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div>
            {/* Confirm link modal */}
            {confirmLink && (
                <div onClick={() => setConfirmLink(null)} style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: '#fff', borderRadius: 10, padding: 24, maxWidth: 480, width: '90%',
                    }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>✉️ Link xác nhận đã tạo</h3>
                        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>
                            Link đã được copy vào clipboard. Gửi cho khách hàng để họ xem và xác nhận vật liệu.
                        </p>
                        <div style={{
                            background: '#f3f4f6', borderRadius: 6, padding: '10px 12px',
                            fontSize: 12, wordBreak: 'break-all', marginBottom: 16, color: '#374151',
                        }}>
                            {confirmLink.url}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                onClick={() => navigator.clipboard.writeText(confirmLink.url)}
                                style={{ flex: 1, padding: '8px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                            >
                                📋 Copy lại
                            </button>
                            <button
                                onClick={() => setConfirmLink(null)}
                                style={{ flex: 1, padding: '8px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Selection cards */}
            {selections.length === 0 && !editingId && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    Chưa có vòng chốt vật liệu nào.
                </div>
            )}

            {selections.map(sel => {
                const sc = STATUS_CONFIG[sel.status] || STATUS_CONFIG.pending;
                const isEditing = editingId === sel.id;

                return (
                    <div key={sel.id} style={{
                        background: '#fff', border: '1px solid var(--border)',
                        borderRadius: 8, marginBottom: 16, overflow: 'hidden',
                    }}>
                        {/* Card header */}
                        <div style={{
                            padding: '10px 16px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            borderBottom: '1px solid var(--border)', background: '#fafafa',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontWeight: 700, fontSize: 14 }}>
                                    Vòng {sel.selectionRound} — {sel.title}
                                </span>
                                <span style={{
                                    background: sc.bg, color: sc.color,
                                    padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                                }}>
                                    {sc.label}
                                </span>
                                {sel.confirmedAt && (
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        — {new Date(sel.confirmedAt).toLocaleDateString('vi-VN')}
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                    onClick={() => printSelection(sel, order.name)}
                                    style={{ background: 'var(--bg-secondary)', border: 'none', padding: '4px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                                >
                                    📄 Xuất PDF
                                </button>
                                <button
                                    onClick={() => sendConfirmationLink(sel.id)}
                                    disabled={sendingLink[sel.id]}
                                    style={{ background: 'var(--bg-secondary)', border: 'none', padding: '4px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                                >
                                    {sendingLink[sel.id] ? 'Đang tạo...' : '✉️ Gửi KH xác nhận'}
                                </button>
                                {!isEditing && sel.status !== 'confirmed' && (
                                    <button
                                        onClick={() => openEditor(sel)}
                                        style={{ background: 'none', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                                    >
                                        Sửa
                                    </button>
                                )}
                                <button
                                    onClick={() => deleteSel(sel.id)}
                                    style={{ background: 'none', border: '1px solid #fca5a5', color: '#dc2626', padding: '4px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                                >
                                    Xóa
                                </button>
                            </div>
                        </div>

                        {/* Items table (read mode) */}
                        {!isEditing && (
                            <div style={{ padding: '8px 16px' }}>
                                {(!sel.items || sel.items.length === 0) ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '8px 0' }}>Chưa có vật liệu nào.</p>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                        <thead>
                                            <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                                                <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 600 }}>Loại</th>
                                                <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 600 }}>Màu / Mã</th>
                                                <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 600 }}>Khu vực</th>
                                                <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600 }}>SL</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sel.items.map((it, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                                                    <td style={{ padding: '6px 0' }}>{it.materialName}</td>
                                                    <td style={{ padding: '6px 0' }}>
                                                        {it.swatchImageUrl && (
                                                            <img src={it.swatchImageUrl} alt="" style={{ width: 16, height: 16, borderRadius: 3, verticalAlign: 'middle', marginRight: 4, objectFit: 'cover' }} />
                                                        )}
                                                        {it.colorName}{it.colorCode ? ` (${it.colorCode})` : ''}
                                                    </td>
                                                    <td style={{ padding: '6px 0', color: 'var(--text-muted)' }}>{it.applicationArea || '—'}</td>
                                                    <td style={{ padding: '6px 0', textAlign: 'right' }}>{it.quantity} {it.unit}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {/* Edit mode */}
                        {isEditing && editForm && (
                            <div style={{ padding: 16 }}>
                                {/* Title + metadata row */}
                                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                                    <div style={{ flex: 2 }}>
                                        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Tên vòng</label>
                                        <input
                                            value={editForm.title}
                                            onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                                            className="form-input"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Trình bày bởi</label>
                                        <input
                                            value={editForm.presentedBy}
                                            onChange={e => setEditForm(f => ({ ...f, presentedBy: e.target.value }))}
                                            className="form-input"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </div>

                                {/* Items table */}
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 8 }}>
                                    <thead>
                                        <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                                            <th style={{ width: 120, padding: '4px 6px 4px 0', textAlign: 'left' }}>Vật liệu</th>
                                            <th style={{ width: 130, padding: '4px 6px', textAlign: 'left' }}>Màu / Picker</th>
                                            <th style={{ padding: '4px 6px', textAlign: 'left' }}>Khu vực</th>
                                            <th style={{ width: 60, padding: '4px 6px', textAlign: 'right' }}>SL</th>
                                            <th style={{ width: 50, padding: '4px 6px', textAlign: 'left' }}>Đvt</th>
                                            <th style={{ width: 28 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {editForm.items.map((it, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #f9fafb' }}>
                                                <td style={{ padding: '4px 6px 4px 0' }}>
                                                    <input
                                                        value={it.materialName}
                                                        onChange={e => updateItem(idx, { materialName: e.target.value })}
                                                        className="form-input"
                                                        style={{ width: '100%', fontSize: 12 }}
                                                        placeholder="Tên vật liệu"
                                                    />
                                                </td>
                                                <td style={{ padding: '4px 6px' }}>
                                                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                        {it.swatchImageUrl && (
                                                            <img src={it.swatchImageUrl} alt="" style={{ width: 20, height: 20, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }} />
                                                        )}
                                                        <input
                                                            value={it.colorName}
                                                            onChange={e => updateItem(idx, { colorName: e.target.value })}
                                                            className="form-input"
                                                            style={{ flex: 1, fontSize: 12 }}
                                                            placeholder="Màu"
                                                        />
                                                        {Object.keys(PICKER_TYPES).map(type => (
                                                            <button
                                                                key={type}
                                                                onClick={() => openPicker(idx, type)}
                                                                title={PICKER_TYPES[type].btnLabel}
                                                                style={{ padding: '2px 5px', fontSize: 10, border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer', background: '#fff', flexShrink: 0 }}
                                                            >
                                                                {type === 'van' ? '🪵' : type === 'acrylic' ? '✨' : '🏠'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '4px 6px' }}>
                                                    <input
                                                        list={`areas-${sel.id}-${idx}`}
                                                        value={it.applicationArea}
                                                        onChange={e => updateItem(idx, { applicationArea: e.target.value })}
                                                        className="form-input"
                                                        style={{ width: '100%', fontSize: 12 }}
                                                        placeholder="Khu vực áp dụng"
                                                    />
                                                    <datalist id={`areas-${sel.id}-${idx}`}>
                                                        {areaSuggestions.map((a, i) => <option key={i} value={a} />)}
                                                    </datalist>
                                                </td>
                                                <td style={{ padding: '4px 6px' }}>
                                                    <input
                                                        type="number"
                                                        value={it.quantity}
                                                        onChange={e => updateItem(idx, { quantity: Number(e.target.value) })}
                                                        className="form-input"
                                                        style={{ width: '100%', fontSize: 12, textAlign: 'right' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '4px 6px' }}>
                                                    <input
                                                        value={it.unit}
                                                        onChange={e => updateItem(idx, { unit: e.target.value })}
                                                        className="form-input"
                                                        style={{ width: '100%', fontSize: 12 }}
                                                    />
                                                </td>
                                                <td style={{ padding: '4px 0' }}>
                                                    <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16 }}>×</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Quick add buttons */}
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                                    <button onClick={() => addRow()} style={{ fontSize: 11, padding: '4px 8px', border: '1px dashed var(--border)', borderRadius: 4, cursor: 'pointer', background: '#fff' }}>
                                        + Thêm dòng
                                    </button>
                                    {QUICK_ADD.map((qa, i) => (
                                        <button key={i} onClick={() => addRow({ materialName: qa.materialName, unit: qa.unit })}
                                            style={{ fontSize: 11, padding: '4px 8px', border: '1px dashed #d1d5db', borderRadius: 4, cursor: 'pointer', background: '#fff', color: '#6b7280' }}>
                                            {qa.label}
                                        </button>
                                    ))}
                                    {areaSuggestions.length > 0 && (
                                        <button onClick={importFromOrder}
                                            style={{ fontSize: 11, padding: '4px 8px', border: '1px dashed #d1d5db', borderRadius: 4, cursor: 'pointer', background: '#fff', color: '#6b7280' }}>
                                            Import từ hạng mục đơn hàng
                                        </button>
                                    )}
                                </div>

                                {/* Action buttons */}
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={saveItems} disabled={saving} className="btn btn-primary" style={{ fontSize: 13 }}>
                                        {saving ? 'Đang lưu...' : 'Lưu vật liệu'}
                                    </button>
                                    <button onClick={closeEditor} className="btn btn-ghost" style={{ fontSize: 13 }}>Hủy</button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Add new round button */}
            <button
                onClick={createNew}
                disabled={creating}
                style={{
                    width: '100%', background: '#fff',
                    border: '1.5px dashed var(--border)', borderRadius: 8,
                    padding: '12px', color: 'var(--text-muted)', fontSize: 13,
                    cursor: 'pointer',
                }}
            >
                {creating ? 'Đang tạo...' : '+ Thêm vòng chốt mới (khi KH thay đổi)'}
            </button>

            {/* Picker modal */}
            {picker && (
                <div onClick={() => setPicker(null)} style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: '#fff', borderRadius: 10, width: 540, maxHeight: '80vh',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    }}>
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                            <h3 style={{ margin: 0, fontSize: 15 }}>{PICKER_TYPES[picker.type].title}</h3>
                        </div>
                        <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6' }}>
                            <input
                                ref={searchRef}
                                value={pickerSearch}
                                onChange={e => setPickerSearch(e.target.value)}
                                placeholder="Tìm kiếm..."
                                className="form-input"
                                style={{ width: '100%' }}
                            />
                            {Object.keys(PICKER_TYPES[picker.type].catLabels).length > 0 && (
                                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                    <button
                                        onClick={() => setPickerCatFilter('all')}
                                        style={{ padding: '3px 10px', fontSize: 11, borderRadius: 4, border: 'none', cursor: 'pointer', background: pickerCatFilter === 'all' ? '#1d4ed8' : '#f3f4f6', color: pickerCatFilter === 'all' ? '#fff' : '#374151' }}
                                    >Tất cả</button>
                                    {PICKER_TYPES[picker.type].categories.map(cat => (
                                        <button key={cat}
                                            onClick={() => setPickerCatFilter(cat)}
                                            style={{ padding: '3px 10px', fontSize: 11, borderRadius: 4, border: 'none', cursor: 'pointer', background: pickerCatFilter === cat ? '#1d4ed8' : '#f3f4f6', color: pickerCatFilter === cat ? '#fff' : '#374151' }}
                                        >{PICKER_TYPES[picker.type].catLabels[cat] || cat}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
                            {pickerLoading && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Đang tải...</p>}
                            {!pickerLoading && filteredResults.length === 0 && (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Không có kết quả</p>
                            )}
                            {filteredResults.map(p => (
                                <div key={p.id} onClick={() => selectProduct(p)}
                                    style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                                    onMouseLeave={e => e.currentTarget.style.background = ''}
                                >
                                    {(p.imageUrl || p.swatchImageUrl) && (
                                        <img src={p.imageUrl || p.swatchImageUrl} alt="" style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                                    )}
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                                        {p.colorCode && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.colorCode}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
                            <button onClick={() => setPicker(null)} className="btn btn-ghost" style={{ fontSize: 13 }}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Test trên browser**

```bash
npm run dev
```

Truy cập tab Vật liệu. Kiểm tra:
- Danh sách selections hiển thị đúng với badge status (vàng/xanh/xám)
- Nút "Xuất PDF" mở cửa sổ print
- Nút "✉️ Gửi KH xác nhận" gọi API và hiện link modal với copy
- Nút "Thêm vòng chốt mới" tạo selection mới
- Picker vật liệu hoạt động (3 loại van/acrylic/san_go)

- [ ] **Step 3: Commit**

```bash
git add "app/noi-that/[id]/tabs/MaterialSelectionTab.js"
git commit -m "feat(ui): rewrite MaterialSelectionTab — vòng chốt cards + PDF export + customer confirmation link"
```

---

### Task 7: Rewrite MaterialOrdersTab

**Files:**
- Modify: `app/noi-that/[id]/tabs/MaterialOrdersTab.js` (full rewrite)

- [ ] **Step 1: Rewrite MaterialOrdersTab.js**

Thay toàn bộ nội dung `app/noi-that/[id]/tabs/MaterialOrdersTab.js`:

```javascript
'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/fetchClient';

const CARD_CONFIG = {
    VAN:     { label: 'VÁN MDF',  icon: '🪵', headerBg: '#dbeafe', headerColor: '#1d4ed8', btnBg: '#1d4ed8' },
    ACRYLIC: { label: 'ACRYLIC',  icon: '✨', headerBg: '#fce7f3', headerColor: '#be185d', btnBg: '#be185d' },
    NEP:     { label: 'NẸP',      icon: '📏', headerBg: '#dcfce7', headerColor: '#16a34a', btnBg: '#16a34a' },
};

const guessType = (applicationArea, materialName) => {
    const s = ((applicationArea || '') + ' ' + (materialName || '')).toLowerCase();
    if (s.includes('acrylic')) return 'ACRYLIC';
    if (s.includes('nẹp') || s.includes('nep')) return 'NEP';
    return 'VAN';
};

export default function MaterialOrdersTab({ orderId, order, onRefresh }) {
    const [materialOrders, setMaterialOrders] = useState({ VAN: null, NEP: null, ACRYLIC: null });
    const [suppliers, setSuppliers] = useState([]);
    const [selectedSuppliers, setSelectedSuppliers] = useState({ VAN: '', NEP: '', ACRYLIC: '' });
    const [creating, setCreating] = useState({ VAN: false, NEP: false, ACRYLIC: false });

    const fetchData = useCallback(async () => {
        const [moData, suppData] = await Promise.all([
            apiFetch(`/api/furniture-orders/${orderId}/material-orders`),
            apiFetch('/api/suppliers?limit=100').then(r => r.data || []).catch(() => []),
        ]);
        setMaterialOrders(moData);
        setSuppliers(suppData);
    }, [orderId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Find the confirmed selection (most recent one with status=confirmed)
    const confirmedSel = (order.materialSelections || [])
        .filter(s => s.status === 'confirmed')
        .sort((a, b) => new Date(b.confirmedAt || 0) - new Date(a.confirmedAt || 0))[0];

    // Group confirmed items by type
    const itemsByType = { VAN: [], ACRYLIC: [], NEP: [] };
    if (confirmedSel?.items) {
        for (const it of confirmedSel.items) {
            const t = guessType(it.applicationArea, it.materialName);
            itemsByType[t].push(it);
        }
    }

    const handleCreatePO = async (type) => {
        const supplierId = selectedSuppliers[type];
        if (!supplierId) return alert('Vui lòng chọn nhà cung cấp');
        setCreating(prev => ({ ...prev, [type]: true }));
        try {
            await apiFetch(
                `/api/furniture-orders/${orderId}/material-orders/${type}/create-po`,
                {
                    method: 'POST',
                    body: {
                        supplier: suppliers.find(s => s.id === supplierId)?.name || supplierId,
                        supplierId,
                    },
                }
            );
            await fetchData();
            onRefresh?.();
        } catch (err) {
            alert(err.message || 'Lỗi tạo PO');
        }
        setCreating(prev => ({ ...prev, [type]: false }));
    };

    // No confirmed selection
    if (!confirmedSel) {
        return (
            <div style={{
                background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8,
                padding: '16px 20px', color: '#991b1b', fontSize: 13,
            }}>
                ⚠️ Chưa có vật liệu nào được xác nhận — Vào tab <strong>Vật liệu</strong> để hoàn tất vòng chốt trước.
            </div>
        );
    }

    const totalItems = (confirmedSel.items || []).length;
    const summary = `${confirmedSel.selectionRound > 0 ? `Vòng ${confirmedSel.selectionRound}` : confirmedSel.title} — ${totalItems} loại vật liệu`;

    return (
        <div>
            {/* Pull banner */}
            <div style={{
                background: '#fef9c3', border: '1px solid #f59e0b', borderRadius: 8,
                padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#78350f',
            }}>
                ⚡ Pull tự động từ {summary}. Chọn supplier và tạo PO cho từng loại.
            </div>

            {/* 3 cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {['VAN', 'ACRYLIC', 'NEP'].map(type => {
                    const cfg = CARD_CONFIG[type];
                    const mo = materialOrders[type];
                    const hasPO = !!mo?.purchaseOrderId;
                    const items = itemsByType[type];

                    return (
                        <div key={type} style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ background: cfg.headerBg, padding: '8px 14px', fontWeight: 700, fontSize: 13, color: cfg.headerColor }}>
                                {cfg.icon} {cfg.label}
                            </div>
                            <div style={{ padding: '12px 14px' }}>
                                {items.length === 0 ? (
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>Không có vật liệu loại này.</p>
                                ) : (
                                    <div style={{ marginBottom: 12 }}>
                                        {items.map((it, i) => (
                                            <div key={i} style={{ fontSize: 12, color: '#4b5563', marginBottom: 4 }}>
                                                <span style={{ fontWeight: 600 }}>{it.materialName}</span>
                                                {it.colorName ? ` — ${it.colorName}` : ''}
                                                {it.colorCode ? ` (${it.colorCode})` : ''}
                                                <span style={{ color: 'var(--text-muted)' }}> × {it.quantity} {it.unit}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {hasPO ? (
                                    <a
                                        href={`/purchasing/${mo.purchaseOrderId}`}
                                        style={{
                                            display: 'block', textAlign: 'center',
                                            background: '#dcfce7', color: '#16a34a',
                                            padding: '7px', borderRadius: 6,
                                            fontSize: 12, fontWeight: 700, textDecoration: 'none',
                                        }}
                                    >
                                        ✓ Xem PO đặt hàng →
                                    </a>
                                ) : (
                                    <>
                                        <div style={{ marginBottom: 8 }}>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Nhà cung cấp</div>
                                            <select
                                                value={selectedSuppliers[type]}
                                                onChange={e => setSelectedSuppliers(prev => ({ ...prev, [type]: e.target.value }))}
                                                className="form-input"
                                                style={{ width: '100%', fontSize: 12 }}
                                            >
                                                <option value="">Chọn nhà cung cấp...</option>
                                                {suppliers.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button
                                            onClick={() => handleCreatePO(type)}
                                            disabled={creating[type] || !selectedSuppliers[type] || items.length === 0}
                                            style={{
                                                width: '100%', background: creating[type] || !selectedSuppliers[type] || items.length === 0
                                                    ? '#9ca3af' : cfg.btnBg,
                                                color: '#fff', border: 'none', padding: '7px',
                                                borderRadius: 6, fontSize: 12, fontWeight: 600,
                                                cursor: creating[type] || !selectedSuppliers[type] || items.length === 0 ? 'not-allowed' : 'pointer',
                                            }}
                                        >
                                            {creating[type] ? 'Đang tạo...' : 'Tạo PO'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Verify API trả về materialSelections với items**

Mở `app/api/furniture-orders/[id]/route.js`, tìm include block. Đảm bảo:
```javascript
materialSelections: { include: { items: true } },
```
Nếu không có, thêm vào.

- [ ] **Step 3: Test trên browser**

```bash
npm run dev
```

Tab Đặt hàng:
- Nếu chưa có vòng confirmed: banner đỏ
- Nếu có vòng confirmed: banner vàng + 3 card
- Mỗi card hiển thị đúng vật liệu theo loại (guessType)
- Dropdown supplier hoạt động
- Nút "Tạo PO" disabled khi chưa chọn supplier hoặc không có items
- Sau khi tạo PO: hiển thị link "✓ Xem PO đặt hàng →"

- [ ] **Step 4: Commit**

```bash
git add "app/noi-that/[id]/tabs/MaterialOrdersTab.js"
git commit -m "feat(ui): rewrite MaterialOrdersTab — pull from confirmed round + 3 card PO creation"
```

---

## Tóm tắt kiểm tra cuối

Sau khi hoàn thành tất cả tasks, verify end-to-end:

1. Vào `/noi-that`, mở một đơn hàng
2. Header bar hiển thị code, tên, KH, status badge
3. Step bar: bước hiện tại màu xanh dương, bước đã qua màu xanh lá, bước chưa tới màu xám
4. Action banner hiển thị message + button phù hợp với status
5. Click action banner button → chuyển sang đúng tab
6. Tab Vật liệu: tạo vòng chốt, thêm items, Xuất PDF (print dialog), Gửi KH (link modal + auto copy)
7. Truy cập `/public/material-confirmation/[token]` (không đăng nhập) → trang xác nhận KH
8. KH nhập tên + click đồng ý → status của selection đổi sang `confirmed`
9. Tab Đặt hàng: sau khi selection confirmed → thấy pull banner + 3 cards
10. Chọn supplier + Tạo PO → card đổi sang link xem PO
11. Chuyển status đơn hàng qua các bước (dùng action banner hoặc API trực tiếp) → step bar cập nhật đúng
