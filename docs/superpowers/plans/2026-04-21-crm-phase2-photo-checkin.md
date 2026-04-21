# CRM Phase 2 — Photo Check-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** NVKD check-in khách có ảnh + metadata (loại gặp, mức độ quan tâm, kết quả, đi cùng); giám đốc review qua trang riêng.

**Architecture:** Reuse `CustomerInteraction` (Phase 1 đã có); thêm 4 field (photos[], interestLevel, outcome, companionIds[]) + index. Upload tận dụng `/api/upload` có sẵn (thêm `'checkin'` vào ALLOWED_UPLOAD_TYPES). Side-effects trong transaction: update `customer.score`, `pipelineStage`, `lastContactAt`. UI: modal mobile-friendly từ trang chi tiết khách + trang `/customers/activities` cho giám đốc.

**Tech Stack:** Next.js 16 App Router, Prisma 6, PostgreSQL, Zod 4, R2 (Cloudflare), NextAuth, TinyMCE không dùng (plain textarea đủ).

**Spec:** `docs/superpowers/specs/2026-04-21-crm-phase2-photo-checkin-design.md`

---

## File Structure

**Schema:**
- Modify: `prisma/schema.prisma` — CustomerInteraction model thêm 4 field + index
- Create: `prisma/migrations/20260421130000_customer_interaction_checkin/migration.sql`

**Validation:**
- Create: `lib/validations/customerInteraction.js`

**API:**
- Modify: `app/api/upload/route.js` — thêm `'checkin'` vào ALLOWED_UPLOAD_TYPES
- Modify: `app/api/customers/[id]/interactions/route.js` — POST thêm permission + side-effects + zod; GET include join
- Create: `app/api/customer-interactions/route.js` — GET list cross-customer

**Permissions:**
- Modify: `contexts/RoleContext.js` — 2 flags mới

**UI:**
- Create: `components/CheckinModal.js`
- Modify: `app/customers/[id]/page.js` — nút Check-in, render modal, timeline với ảnh
- Modify: `app/customers/page.js` — badge lastContactAt
- Create: `app/customers/activities/page.js`
- Modify: `components/Sidebar.js` — thêm item "Hoạt động"

**Test:**
- Create: `scripts/e2e-crm-phase2.mjs`

---

## Task 1: Prisma schema + migration

**Files:**
- Modify: `prisma/schema.prisma` (model CustomerInteraction, dòng 1970-1982)
- Create: `prisma/migrations/20260421130000_customer_interaction_checkin/migration.sql`

- [ ] **Step 1: Mở rộng model CustomerInteraction**

Thay toàn bộ `model CustomerInteraction { ... }` block (dòng 1970-1982 của `prisma/schema.prisma`) bằng:

```prisma
model CustomerInteraction {
  id            String   @id @default(cuid())
  type          String
  content       String
  date          DateTime @default(now())
  customerId    String
  createdBy     String   @default("")
  createdAt     DateTime @default(now())
  photos        String[] @default([])
  interestLevel String   @default("")
  outcome       String   @default("")
  companionIds  String[] @default([])
  customer      Customer @relation(fields: [customerId], references: [id])

  @@index([customerId])
  @@index([date])
  @@index([createdBy])
}
```

- [ ] **Step 2: Tạo migration SQL**

Tạo file `prisma/migrations/20260421130000_customer_interaction_checkin/migration.sql` với nội dung:

```sql
ALTER TABLE "CustomerInteraction"
  ADD COLUMN "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "interestLevel" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "outcome" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "companionIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "CustomerInteraction_createdBy_idx" ON "CustomerInteraction"("createdBy");
```

- [ ] **Step 3: Chạy migrate + regenerate**

```bash
npm run db:migrate
```

Expected output: `Applying migration 20260421130000_customer_interaction_checkin` + `✔ Generated Prisma Client`.

- [ ] **Step 4: Verify cột tồn tại**

Tạo file tạm `scripts/check-phase2-schema.mjs`:

```js
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const test = await p.customerInteraction.findFirst({
  select: { id: true, photos: true, interestLevel: true, outcome: true, companionIds: true },
});
console.log('Schema OK — sample:', test ?? '(no rows yet)');
await p.$disconnect();
```

Chạy: `node scripts/check-phase2-schema.mjs`.
Expected: `Schema OK — sample: ...` (không error "Unknown field").

Sau khi pass, xóa file `scripts/check-phase2-schema.mjs`.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260421130000_customer_interaction_checkin/
git commit -m "feat(crm-phase2-schema): CustomerInteraction thêm photos, interestLevel, outcome, companionIds"
```

---

## Task 2: Zod validation schema

**Files:**
- Create: `lib/validations/customerInteraction.js`

- [ ] **Step 1: Viết schema**

Tạo file `lib/validations/customerInteraction.js`:

```js
import { z } from 'zod';
import { optStr, safePartial } from './common';

export const INTERACTION_TYPES = ['Gặp trực tiếp', 'Điện thoại', 'Zalo', 'Email', 'Ghi chú'];
export const INTEREST_LEVELS = ['', 'Nóng', 'Ấm', 'Lạnh'];
export const OUTCOMES = ['', 'Báo giá', 'Đặt cọc', 'Từ chối', 'Cần gặp lại'];

export const interactionCreateSchema = z.object({
    type: z.enum(INTERACTION_TYPES).default('Gặp trực tiếp'),
    content: z.string().trim().min(1, 'Nội dung bắt buộc'),
    date: z.string().optional().nullable().transform(v => v ? new Date(v) : new Date()),
    photos: z.array(z.string().url()).max(10, 'Tối đa 10 ảnh').optional().default([]),
    interestLevel: z.enum(INTEREST_LEVELS).optional().default(''),
    outcome: z.enum(OUTCOMES).optional().default(''),
    companionIds: z.array(z.string().cuid()).optional().default([]),
}).strict();

export const interactionUpdateSchema = safePartial(interactionCreateSchema);
```

- [ ] **Step 2: Smoke test schema**

Chạy inline test trong terminal:

```bash
node -e "import('./lib/validations/customerInteraction.js').then(m => { const x = m.interactionCreateSchema.parse({ content: 'Gặp KH A', interestLevel: 'Nóng' }); console.log('OK:', x); })"
```

Expected: `OK: { type: 'Gặp trực tiếp', content: 'Gặp KH A', date: ..., photos: [], interestLevel: 'Nóng', outcome: '', companionIds: [] }`

Chạy test reject:

```bash
node -e "import('./lib/validations/customerInteraction.js').then(m => { try { m.interactionCreateSchema.parse({ content: '' }); console.log('FAIL: should reject'); } catch (e) { console.log('OK reject:', e.issues[0].message); } })"
```

Expected: `OK reject: Nội dung bắt buộc`

- [ ] **Step 3: Commit**

```bash
git add lib/validations/customerInteraction.js
git commit -m "feat(crm-phase2): Zod schema cho CustomerInteraction"
```

---

## Task 3: Cho phép upload 'checkin' trên endpoint có sẵn

**Files:**
- Modify: `app/api/upload/route.js:32`

- [ ] **Step 1: Thêm 'checkin' vào ALLOWED_UPLOAD_TYPES**

Edit dòng 32 của `app/api/upload/route.js`:

```js
// TRƯỚC
const ALLOWED_UPLOAD_TYPES = ['products', 'library', 'proofs', 'documents', 'acceptance', 'contracts', 'pdf-covers'];

// SAU
const ALLOWED_UPLOAD_TYPES = ['products', 'library', 'proofs', 'documents', 'acceptance', 'contracts', 'pdf-covers', 'checkin'];
```

- [ ] **Step 2: Verify upload path**

Chạy dev server `PORT=3001 npm run dev` (background).

Trong script `scripts/test-phase2-upload.mjs` (tạo tạm):

```js
import { readFileSync } from 'node:fs';
import { FormData, File } from 'node:buffer';

// Login trước (copy helper từ scripts/e2e-crm-phase1.mjs nếu cần, hoặc dùng session cookie có sẵn)
const COOKIE = process.env.TEST_COOKIE; // set manually from browser devtools
if (!COOKIE) { console.error('set TEST_COOKIE env'); process.exit(1); }

const fd = new FormData();
const buf = Buffer.from('fake-jpeg-content');
fd.append('file', new File([buf], 'test.jpg', { type: 'image/jpeg' }));
fd.append('type', 'checkin');

const r = await fetch('http://localhost:3001/api/upload', {
    method: 'POST',
    headers: { cookie: COOKIE },
    body: fd,
});
console.log(r.status, await r.text());
```

Expected: `200 {"url":"...","thumbnailUrl":""}` (URL có chứa `/checkin/`).

Sau pass, xóa file test.

- [ ] **Step 3: Commit**

```bash
git add app/api/upload/route.js
git commit -m "feat(crm-phase2): cho phép upload type='checkin'"
```

---

## Task 4: Modify POST /api/customers/[id]/interactions — permission + side-effects + zod

**Files:**
- Modify: `app/api/customers/[id]/interactions/route.js` (replace toàn bộ file)

- [ ] **Step 1: Replace file với logic mới**

Ghi đè toàn bộ `app/api/customers/[id]/interactions/route.js`:

```js
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { interactionCreateSchema } from '@/lib/validations/customerInteraction';

const SCORE_MAP = { 'Nóng': 5, 'Ấm': 3, 'Lạnh': 1 };
const PIPELINE_MAP = { 'Đặt cọc': 'Cọc', 'Từ chối': 'Dừng', 'Báo giá': 'Báo giá' };

// GET — list interactions for a customer, kèm join user
export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const interactions = await prisma.customerInteraction.findMany({
        where: { customerId: id },
        orderBy: { date: 'desc' },
    });

    // Collect all user IDs (createdBy + companionIds)
    const userIds = new Set();
    for (const it of interactions) {
        if (it.createdBy) userIds.add(it.createdBy);
        for (const c of it.companionIds || []) userIds.add(c);
    }
    const users = userIds.size > 0
        ? await prisma.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, name: true } })
        : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    return NextResponse.json(interactions.map(it => ({
        ...it,
        createdByUser: userMap.get(it.createdBy) || null,
        companions: (it.companionIds || []).map(cid => userMap.get(cid)).filter(Boolean),
    })));
});

// POST — create interaction; NVKD chỉ tạo cho khách của mình
export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();
    const data = interactionCreateSchema.parse(body);

    const customer = await prisma.customer.findUnique({
        where: { id },
        select: { id: true, salesPersonId: true, deletedAt: true },
    });
    if (!customer || customer.deletedAt) {
        return NextResponse.json({ error: 'Không tìm thấy khách hàng' }, { status: 404 });
    }
    if (session.user.role === 'kinh_doanh' && customer.salesPersonId !== session.user.id) {
        return NextResponse.json({ error: 'Bạn chỉ có thể check-in cho khách của mình' }, { status: 403 });
    }
    if (session.user.role === 'ky_thuat' || session.user.role === 'kho') {
        return NextResponse.json({ error: 'Không có quyền check-in' }, { status: 403 });
    }

    const result = await prisma.$transaction(async (tx) => {
        const interaction = await tx.customerInteraction.create({
            data: {
                ...data,
                customerId: id,
                createdBy: session.user.id,
            },
        });

        const customerUpdate = { lastContactAt: new Date() };
        if (data.interestLevel && SCORE_MAP[data.interestLevel] !== undefined) {
            customerUpdate.score = SCORE_MAP[data.interestLevel];
        }
        if (data.outcome && PIPELINE_MAP[data.outcome]) {
            customerUpdate.pipelineStage = PIPELINE_MAP[data.outcome];
        }
        await tx.customer.update({ where: { id }, data: customerUpdate });

        return interaction;
    });

    return NextResponse.json(result, { status: 201 });
});
```

- [ ] **Step 2: Test permission qua HTTP (dev server :3001)**

Reuse NVKD + GD test users đã có. Tạo `scripts/test-phase2-post.mjs`:

```js
import { setTimeout as sleep } from 'node:timers/promises';
const BASE = 'http://localhost:3001';
async function getCsrf() { const r = await fetch(`${BASE}/api/auth/csrf`); return { csrfToken: (await r.json()).csrfToken, cookies: r.headers.getSetCookie() }; }
async function login(email, password) {
    const { csrfToken, cookies } = await getCsrf();
    const r = await fetch(`${BASE}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', cookie: cookies.map(c => c.split(';')[0]).join('; ') },
        body: new URLSearchParams({ csrfToken, login: email, password, rememberMe: 'false', callbackUrl: `${BASE}/`, json: 'true' }),
        redirect: 'manual',
    });
    const setCookies = r.headers.getSetCookie();
    return [...cookies, ...setCookies].map(c => c.split(';')[0]).join('; ');
}
async function api(cookie, path, opts = {}) {
    const r = await fetch(`${BASE}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', cookie, ...(opts.headers || {}) } });
    const t = await r.text(); try { return { status: r.status, body: JSON.parse(t) }; } catch { return { status: r.status, body: t }; }
}

const gd = await login('test.gd@motnha.vn', 'Test@1234');
const nvkd = await login('test.nvkd@motnha.vn', 'Test@1234');

// GD tạo 1 khách mới
const cgd = await api(gd, '/api/customers', { method: 'POST', body: JSON.stringify({ name: 'Phase2 KH của GD', phone: '0900000100' }) });
console.log('create by GD:', cgd.status);

// NVKD thử check-in khách đó → 403
const r1 = await api(nvkd, `/api/customers/${cgd.body.id}/interactions`, {
    method: 'POST', body: JSON.stringify({ content: 'test', interestLevel: 'Nóng' }),
});
console.log('NVKD POST khách GD (phải 403):', r1.status);
if (r1.status !== 403) { console.error('FAIL'); process.exit(1); }

// NVKD tạo khách của mình + check-in → 201 + score=5 + pipelineStage updated khi outcome
const cnvkd = await api(nvkd, '/api/customers', { method: 'POST', body: JSON.stringify({ name: 'Phase2 KH của NVKD', phone: '0900000101' }) });
const r2 = await api(nvkd, `/api/customers/${cnvkd.body.id}/interactions`, {
    method: 'POST', body: JSON.stringify({ content: 'Đã đặt cọc', interestLevel: 'Nóng', outcome: 'Đặt cọc' }),
});
console.log('NVKD POST khách của mình (phải 201):', r2.status, 'photos:', r2.body.photos);
if (r2.status !== 201) process.exit(1);

// Verify customer updated
const c2 = await api(gd, `/api/customers/${cnvkd.body.id}`);
console.log('Customer after checkin — score:', c2.body.score, 'pipelineStage:', c2.body.pipelineStage, 'lastContactAt:', !!c2.body.lastContactAt);
if (c2.body.score !== 5 || c2.body.pipelineStage !== 'Cọc' || !c2.body.lastContactAt) { console.error('FAIL side-effect'); process.exit(1); }

// Cleanup
await api(gd, `/api/customers/${cgd.body.id}`, { method: 'DELETE' });
await api(gd, `/api/customers/${cnvkd.body.id}`, { method: 'DELETE' });
console.log('\n✓ Task 4 tests PASS');
```

Chạy: `node scripts/test-phase2-post.mjs`.
Expected: `✓ Task 4 tests PASS`.

Sau pass, xóa file test.

- [ ] **Step 3: Commit**

```bash
git add app/api/customers/[id]/interactions/route.js
git commit -m "feat(crm-phase2-api): POST interactions thêm permission + side-effects (score/pipelineStage)"
```

---

## Task 5: GET /api/customer-interactions — list cross-customer cho giám đốc

**Files:**
- Create: `app/api/customer-interactions/route.js`

- [ ] **Step 1: Viết endpoint**

Tạo file `app/api/customer-interactions/route.js`:

```js
import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET — list interactions across customers (for giám đốc / kế toán)
export const GET = withAuth(async (request, _ctx, session) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);

    const salesPersonId = searchParams.get('salesPersonId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const outcome = searchParams.get('outcome');
    const type = searchParams.get('type');

    const where = {};

    // Role-based filter
    if (session.user.role === 'kinh_doanh') {
        where.createdBy = session.user.id;
    } else if (session.user.role === 'ky_thuat' || session.user.role === 'kho') {
        return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    } else if (salesPersonId) {
        where.createdBy = salesPersonId;
    }

    if (from || to) {
        where.date = {};
        if (from) where.date.gte = new Date(from);
        if (to) where.date.lte = new Date(to);
    }
    if (outcome) where.outcome = outcome;
    if (type) where.type = type;

    const [items, total] = await Promise.all([
        prisma.customerInteraction.findMany({
            where,
            include: {
                customer: { select: { id: true, code: true, name: true, phone: true, salesPersonId: true } },
            },
            orderBy: { date: 'desc' },
            skip,
            take: limit,
        }),
        prisma.customerInteraction.count({ where }),
    ]);

    // Join users (createdBy + companionIds)
    const userIds = new Set();
    for (const it of items) {
        if (it.createdBy) userIds.add(it.createdBy);
        for (const c of it.companionIds || []) userIds.add(c);
    }
    const users = userIds.size > 0
        ? await prisma.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, name: true } })
        : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    const enriched = items.map(it => ({
        ...it,
        createdByUser: userMap.get(it.createdBy) || null,
        companions: (it.companionIds || []).map(cid => userMap.get(cid)).filter(Boolean),
    }));

    return NextResponse.json(paginatedResponse(enriched, total, { page, limit }));
});
```

- [ ] **Step 2: Smoke test**

Tạo `scripts/test-phase2-list.mjs`:

```js
const BASE = 'http://localhost:3001';
async function getCsrf() { const r = await fetch(`${BASE}/api/auth/csrf`); return { csrfToken: (await r.json()).csrfToken, cookies: r.headers.getSetCookie() }; }
async function login(email, password) {
    const { csrfToken, cookies } = await getCsrf();
    const r = await fetch(`${BASE}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', cookie: cookies.map(c => c.split(';')[0]).join('; ') },
        body: new URLSearchParams({ csrfToken, login: email, password, rememberMe: 'false', callbackUrl: `${BASE}/`, json: 'true' }),
        redirect: 'manual',
    });
    return [...cookies, ...r.headers.getSetCookie()].map(c => c.split(';')[0]).join('; ');
}
async function api(cookie, path, opts = {}) {
    const r = await fetch(`${BASE}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', cookie, ...(opts.headers || {}) } });
    const t = await r.text(); try { return { status: r.status, body: JSON.parse(t) }; } catch { return { status: r.status, body: t }; }
}

const gd = await login('test.gd@motnha.vn', 'Test@1234');
const r1 = await api(gd, '/api/customer-interactions?limit=5');
console.log('GD list:', r1.status, 'total:', r1.body?.pagination?.total, 'has data:', Array.isArray(r1.body?.data));
if (r1.status !== 200) process.exit(1);

const nvkd = await login('test.nvkd@motnha.vn', 'Test@1234');
const r2 = await api(nvkd, '/api/customer-interactions?limit=50');
console.log('NVKD list count:', r2.body?.data?.length);
console.log('✓ Task 5 PASS');
```

Chạy: `node scripts/test-phase2-list.mjs`.
Expected: status 200, data array, pagination có `total`.

- [ ] **Step 3: Commit**

```bash
git add app/api/customer-interactions/route.js
git commit -m "feat(crm-phase2-api): GET /api/customer-interactions list + filter theo role"
```

---

## Task 6: Role permissions — canCreateCheckin + canViewAllActivities

**Files:**
- Modify: `contexts/RoleContext.js` (PERMISSIONS object, dòng 13-59)

- [ ] **Step 1: Thêm 2 flags vào từng role**

Edit `contexts/RoleContext.js`. Mỗi role object trong `PERMISSIONS` bổ sung 2 dòng cuối (trước `filterProject`):

Cho `giam_doc`:
```js
    canCreateCheckin: true, canViewAllActivities: true,
```

Cho `ke_toan`:
```js
    canCreateCheckin: true, canViewAllActivities: true,
```

Cho `kinh_doanh`:
```js
    canCreateCheckin: true, canViewAllActivities: false,
```

Cho `kho`:
```js
    canCreateCheckin: false, canViewAllActivities: false,
```

Cho `ky_thuat`:
```js
    canCreateCheckin: false, canViewAllActivities: false,
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
git add contexts/RoleContext.js
git commit -m "feat(crm-phase2-roles): thêm canCreateCheckin + canViewAllActivities"
```

---

## Task 7: CheckinModal component

**Files:**
- Create: `components/CheckinModal.js`

- [ ] **Step 1: Viết component**

Tạo file `components/CheckinModal.js`:

```jsx
'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const INTERACTION_TYPES = ['Gặp trực tiếp', 'Điện thoại', 'Zalo', 'Email', 'Ghi chú'];
const INTEREST_LEVELS = [
    { key: 'Nóng', color: '#dc2626', bg: '#fee2e2' },
    { key: 'Ấm', color: '#d97706', bg: '#fef3c7' },
    { key: 'Lạnh', color: '#2563eb', bg: '#dbeafe' },
];
const OUTCOMES = ['', 'Báo giá', 'Đặt cọc', 'Từ chối', 'Cần gặp lại'];

export default function CheckinModal({ customerId, customerName, open, onClose, onDone }) {
    const { data: session } = useSession();
    const [type, setType] = useState('Gặp trực tiếp');
    const [content, setContent] = useState('');
    const [photos, setPhotos] = useState([]); // [{url, uploading}]
    const [interestLevel, setInterestLevel] = useState('');
    const [outcome, setOutcome] = useState('');
    const [companionIds, setCompanionIds] = useState([]);
    const [users, setUsers] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        fetch('/api/users').then(r => r.ok ? r.json() : []).then(arr => {
            setUsers((arr || []).filter(u => u.id !== session?.user?.id));
        });
    }, [open, session?.user?.id]);

    useEffect(() => {
        if (!open) {
            setType('Gặp trực tiếp'); setContent(''); setPhotos([]);
            setInterestLevel(''); setOutcome(''); setCompanionIds([]); setError('');
        }
    }, [open]);

    if (!open) return null;

    const handleFiles = async (files) => {
        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) {
                setError(`${file.name} quá 5MB`);
                continue;
            }
            const placeholder = { url: '', name: file.name, uploading: true };
            setPhotos(prev => [...prev, placeholder]);
            const fd = new FormData();
            fd.append('file', file);
            fd.append('type', 'checkin');
            try {
                const r = await fetch('/api/upload', { method: 'POST', body: fd });
                if (!r.ok) throw new Error('Upload fail');
                const { url } = await r.json();
                setPhotos(prev => prev.map(p => p === placeholder ? { url, name: file.name, uploading: false } : p));
            } catch (e) {
                setError(`Upload ${file.name} lỗi`);
                setPhotos(prev => prev.filter(p => p !== placeholder));
            }
        }
    };

    const submit = async () => {
        if (!content.trim()) { setError('Nhập nội dung'); return; }
        if (photos.some(p => p.uploading)) { setError('Đợi ảnh upload xong'); return; }
        setSubmitting(true); setError('');
        try {
            const r = await fetch(`/api/customers/${customerId}/interactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    content: content.trim(),
                    photos: photos.map(p => p.url).filter(Boolean),
                    interestLevel,
                    outcome,
                    companionIds,
                }),
            });
            if (!r.ok) {
                const err = await r.json().catch(() => ({}));
                throw new Error(err.error || 'Lỗi');
            }
            onDone?.();
            onClose();
        } catch (e) {
            setError(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, width: '95vw' }}>
                <div className="modal-header">
                    <h3>📸 Check-in: {customerName}</h3>
                    <button className="btn-icon" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <label>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Loại gặp</div>
                        <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
                            {INTERACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </label>

                    <label>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Nội dung *</div>
                        <textarea className="form-input" rows={4} value={content} onChange={e => setContent(e.target.value)} placeholder="Nội dung trao đổi..." />
                    </label>

                    <div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Ảnh (tối đa 10, mỗi ảnh 5MB)</div>
                        <input type="file" accept="image/*" capture="environment" multiple onChange={e => handleFiles(e.target.files)} />
                        {photos.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 6, marginTop: 8 }}>
                                {photos.map((p, i) => (
                                    <div key={i} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 6, overflow: 'hidden', background: '#f1f5f9' }}>
                                        {p.uploading
                                            ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 11 }}>Đang tải…</div>
                                            : <img src={p.url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        }
                                        <button className="btn-icon" style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: 2 }}
                                            onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}>✕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Mức độ quan tâm</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {INTEREST_LEVELS.map(lv => (
                                <button key={lv.key} type="button"
                                    onClick={() => setInterestLevel(interestLevel === lv.key ? '' : lv.key)}
                                    style={{
                                        padding: '6px 16px', borderRadius: 999, border: `1px solid ${lv.color}`,
                                        background: interestLevel === lv.key ? lv.color : lv.bg,
                                        color: interestLevel === lv.key ? '#fff' : lv.color,
                                        cursor: 'pointer', fontWeight: 600,
                                    }}>{lv.key}</button>
                            ))}
                        </div>
                    </div>

                    <label>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Kết quả</div>
                        <select className="form-select" value={outcome} onChange={e => setOutcome(e.target.value)}>
                            {OUTCOMES.map(o => <option key={o} value={o}>{o || '(chưa có)'}</option>)}
                        </select>
                    </label>

                    <label>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Đi cùng ai (optional)</div>
                        <select className="form-select" multiple size={Math.min(5, users.length || 3)}
                            value={companionIds}
                            onChange={e => setCompanionIds([...e.target.selectedOptions].map(o => o.value))}>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                        </select>
                    </label>

                    {error && <div style={{ color: '#dc2626', fontSize: 13 }}>⚠ {error}</div>}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Hủy</button>
                    <button className="btn btn-primary" onClick={submit} disabled={submitting}>
                        {submitting ? 'Đang lưu…' : 'Lưu check-in'}
                    </button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
git add components/CheckinModal.js
git commit -m "feat(crm-phase2-ui): CheckinModal component (mobile-friendly)"
```

---

## Task 8: Wire modal vào trang chi tiết khách + render timeline với ảnh

**Files:**
- Modify: `app/customers/[id]/page.js` (multiple locations)

- [ ] **Step 1: Import modal + state**

Đầu file (sau imports hiện có):

```js
import CheckinModal from '@/components/CheckinModal';
import { useRole } from '@/contexts/RoleContext';
```

Trong component `CustomerDetailPage`, sau dòng `const [showInteractionForm, setShowInteractionForm] = useState(false);` (dòng 44):

```js
    const [showCheckinModal, setShowCheckinModal] = useState(false);
    const { permissions } = useRole();
```

- [ ] **Step 2: Thêm nút "+ Check-in" ở header trang**

Tìm vùng header có các nút action (gần sau dòng hiển thị customer info). Thêm nút (nếu `permissions.canCreateCheckin`):

```jsx
{permissions.canCreateCheckin && (
    <button className="btn btn-primary" onClick={() => setShowCheckinModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        📸 Check-in
    </button>
)}
```

Đặt cạnh các nút sẵn có (ví dụ cạnh nút "Chỉnh sửa" hoặc trên tab bar). Chính xác vị trí: trong `div` chứa nút "Chỉnh sửa" hoặc nếu không có thì tạo hàng nút mới dưới tên khách.

- [ ] **Step 3: Render modal ở cuối component**

Trước dòng cuối `</div>` của return:

```jsx
<CheckinModal
    customerId={id}
    customerName={c?.name || ''}
    open={showCheckinModal}
    onClose={() => setShowCheckinModal(false)}
    onDone={fetchData}
/>
```

- [ ] **Step 4: Cập nhật timeline interactions với ảnh + badges**

Tìm block `{(c.interactions || []).map(int => (` (khoảng dòng 363), thay phần render mỗi interaction bằng:

```jsx
{(c.interactions || []).map(int => (
    <div key={int.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>{int.type}</span>
                {int.interestLevel && (
                    <span className="badge" style={{
                        background: int.interestLevel === 'Nóng' ? '#fee2e2' : int.interestLevel === 'Ấm' ? '#fef3c7' : '#dbeafe',
                        color: int.interestLevel === 'Nóng' ? '#dc2626' : int.interestLevel === 'Ấm' ? '#d97706' : '#2563eb',
                    }}>{int.interestLevel}</span>
                )}
                {int.outcome && <span className="badge" style={{ background: '#e0e7ff', color: '#4338ca' }}>{int.outcome}</span>}
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(int.date).toLocaleString('vi-VN')}</span>
        </div>
        <div style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>{int.content}</div>
        {int.photos && int.photos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 6, marginBottom: 8 }}>
                {int.photos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt="" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }} />
                    </a>
                ))}
            </div>
        )}
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {int.createdByUser?.name || int.createdBy || 'Ẩn danh'}
            {int.companions && int.companions.length > 0 && (
                <> · Đi cùng: {int.companions.map(c => c.name).join(', ')}</>
            )}
        </div>
    </div>
))}
```

- [ ] **Step 5: Test manual trên dev server**

`PORT=3001 npm run dev` (background).

Mở browser `http://localhost:3001/customers/[id]` (login test.nvkd, id của khách của NVKD). Bấm nút "+ Check-in" → modal mở → chụp/upload ảnh → submit → timeline hiển thị interaction mới với ảnh.

- [ ] **Step 6: Commit**

```bash
git add app/customers/[id]/page.js
git commit -m "feat(crm-phase2-ui): tích hợp CheckinModal + render timeline có ảnh"
```

---

## Task 9: Badge lastContactAt trên customer list

**Files:**
- Modify: `app/customers/page.js` (tìm chỗ render kanban card + table row)

- [ ] **Step 1: Thêm helper timeAgo + badge**

Ngay đầu file `app/customers/page.js` (sau imports), thêm helper nếu chưa có:

```js
const daysSince = (d) => d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null;
const ContactBadge = ({ lastContactAt }) => {
    const days = daysSince(lastContactAt);
    if (days === null) return <span className="badge" style={{ background: '#f1f5f9', color: '#64748b' }}>Chưa liên hệ</span>;
    const color = days > 14 ? '#dc2626' : days > 7 ? '#d97706' : '#16a34a';
    const bg = days > 14 ? '#fee2e2' : days > 7 ? '#fef3c7' : '#dcfce7';
    return <span className="badge" style={{ background: bg, color }}>🕐 {days === 0 ? 'Hôm nay' : `${days}d trước`}</span>;
};
```

- [ ] **Step 2: Render badge trong table row**

Tìm row render (trong `<tbody>` hoặc trong map khách), thêm `<ContactBadge lastContactAt={cust.lastContactAt} />` ở cột phù hợp — ví dụ sau cột "Trạng thái" hoặc gắn vào cell "Tên".

Cách đơn giản nhất: thêm vào cell có tên khách:

```jsx
<td>
    <div>{cust.name}</div>
    <div style={{ marginTop: 4 }}><ContactBadge lastContactAt={cust.lastContactAt} /></div>
</td>
```

- [ ] **Step 3: Render badge trong kanban card**

Tìm block render kanban card (nơi hiển thị tên + phone khách trong mỗi cột). Thêm `<ContactBadge ... />` sau số điện thoại.

- [ ] **Step 4: Build check**

```bash
npm run build
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 5: Commit**

```bash
git add app/customers/page.js
git commit -m "feat(crm-phase2-ui): badge lastContactAt trên list + kanban (cảnh báo >14d)"
```

---

## Task 10: Trang /customers/activities

**Files:**
- Create: `app/customers/activities/page.js`

- [ ] **Step 1: Viết trang**

Tạo file `app/customers/activities/page.js`:

```jsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/fetchClient';
import { useRole } from '@/contexts/RoleContext';

const OUTCOMES = ['', 'Báo giá', 'Đặt cọc', 'Từ chối', 'Cần gặp lại'];

export default function ActivitiesPage() {
    const { permissions } = useRole();
    const [items, setItems] = useState([]);
    const [salesPeople, setSalesPeople] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        salesPersonId: '',
        from: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
        to: new Date().toISOString().slice(0, 10),
        outcome: '',
    });
    const [lightbox, setLightbox] = useState(null);

    useEffect(() => {
        fetch('/api/users?role=kinh_doanh').then(r => r.ok ? r.json() : []).then(setSalesPeople);
    }, []);

    useEffect(() => {
        setLoading(true);
        const qs = new URLSearchParams();
        if (filters.salesPersonId) qs.set('salesPersonId', filters.salesPersonId);
        if (filters.from) qs.set('from', filters.from);
        if (filters.to) qs.set('to', `${filters.to}T23:59:59`);
        if (filters.outcome) qs.set('outcome', filters.outcome);
        qs.set('limit', '50');
        apiFetch(`/api/customer-interactions?${qs}`)
            .then(res => setItems(res?.data || []))
            .finally(() => setLoading(false));
    }, [filters.salesPersonId, filters.from, filters.to, filters.outcome]);

    if (!permissions.canViewAllActivities) {
        return <div className="card" style={{ padding: 40, textAlign: 'center' }}>Bạn không có quyền xem trang này.</div>;
    }

    // Group by salesPerson for summary
    const summary = items.reduce((acc, it) => {
        const name = it.createdByUser?.name || 'Ẩn danh';
        acc[name] = (acc[name] || 0) + 1;
        return acc;
    }, {});

    return (
        <div style={{ padding: 16 }}>
            <h2>📋 Hoạt động NVKD</h2>

            <div className="card" style={{ padding: 12, marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select className="form-select" value={filters.salesPersonId} onChange={e => setFilters(f => ({ ...f, salesPersonId: e.target.value }))} style={{ width: 220 }}>
                    <option value="">Tất cả NVKD</option>
                    {salesPeople.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <input type="date" className="form-input" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} style={{ width: 160 }} />
                <input type="date" className="form-input" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} style={{ width: 160 }} />
                <select className="form-select" value={filters.outcome} onChange={e => setFilters(f => ({ ...f, outcome: e.target.value }))} style={{ width: 180 }}>
                    {OUTCOMES.map(o => <option key={o} value={o}>{o || 'Mọi kết quả'}</option>)}
                </select>
            </div>

            <div className="card" style={{ padding: 12, marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div><strong>Tổng:</strong> {items.length}</div>
                {Object.entries(summary).map(([name, n]) => (
                    <div key={name}><strong>{name}:</strong> {n}</div>
                ))}
            </div>

            {loading && <div style={{ padding: 20, textAlign: 'center' }}>Đang tải…</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(it => (
                    <div key={it.id} className="card" style={{ padding: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div>
                                <Link href={`/customers/${it.customer?.id}`} style={{ fontWeight: 600 }}>{it.customer?.code} — {it.customer?.name}</Link>
                                <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>{it.customer?.phone}</span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(it.date).toLocaleString('vi-VN')}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                            <span className="badge">{it.type}</span>
                            {it.interestLevel && <span className="badge" style={{ background: '#fef3c7', color: '#d97706' }}>{it.interestLevel}</span>}
                            {it.outcome && <span className="badge" style={{ background: '#e0e7ff', color: '#4338ca' }}>{it.outcome}</span>}
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                NVKD: {it.createdByUser?.name || '?'}
                                {it.companions?.length > 0 && <> · Đi cùng: {it.companions.map(c => c.name).join(', ')}</>}
                            </span>
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{it.content}</div>
                        {it.photos?.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 4, marginTop: 8 }}>
                                {it.photos.map((url, i) => (
                                    <img key={i} src={url} alt="" onClick={() => setLightbox(url)}
                                        style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }} />
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                {!loading && items.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có hoạt động trong khoảng này.</div>}
            </div>

            {lightbox && (
                <div onClick={() => setLightbox(null)} style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
                }}>
                    <img src={lightbox} style={{ maxWidth: '95%', maxHeight: '95%' }} />
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: `✓ Compiled successfully` + route `/customers/activities` listed.

- [ ] **Step 3: Commit**

```bash
git add app/customers/activities/page.js
git commit -m "feat(crm-phase2-ui): trang /customers/activities cho giám đốc"
```

---

## Task 11: Sidebar menu + E2E smoke test + push

**Files:**
- Modify: `components/Sidebar.js`
- Create: `scripts/e2e-crm-phase2.mjs`

- [ ] **Step 1: Thêm menu item "Hoạt động"**

Trong `components/Sidebar.js`, tìm dòng `{ href: '/customers', ... }` (dòng 26). Sau dòng đó, thêm item mới:

```js
{ href: '/customers/activities', icon: '📋', label: 'Hoạt động NVKD', roles: ['giam_doc', 'ke_toan'] },
```

Lưu ý: nếu icon không phải component mà là emoji string, giữ nguyên string. Nếu Sidebar dùng icon component từ `lucide-react`, import `ClipboardList` hoặc `Activity` và dùng `icon: Activity`.

Xem lại `components/Sidebar.js` để biết pattern icon đúng, điều chỉnh nếu cần.

- [ ] **Step 2: Viết E2E script**

Tạo file `scripts/e2e-crm-phase2.mjs`:

```js
// E2E smoke test CRM Phase 2 — Photo check-in
const BASE = 'http://localhost:3001';

async function getCsrf() { const r = await fetch(`${BASE}/api/auth/csrf`); return { csrfToken: (await r.json()).csrfToken, cookies: r.headers.getSetCookie() }; }
async function login(email, password) {
    const { csrfToken, cookies } = await getCsrf();
    const r = await fetch(`${BASE}/api/auth/callback/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', cookie: cookies.map(c => c.split(';')[0]).join('; ') },
        body: new URLSearchParams({ csrfToken, login: email, password, rememberMe: 'false', callbackUrl: `${BASE}/`, json: 'true' }),
        redirect: 'manual',
    });
    return [...cookies, ...r.headers.getSetCookie()].map(c => c.split(';')[0]).join('; ');
}
async function api(cookie, path, opts = {}) {
    const r = await fetch(`${BASE}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', cookie, ...(opts.headers || {}) } });
    const t = await r.text(); try { return { status: r.status, body: JSON.parse(t) }; } catch { return { status: r.status, body: t }; }
}
function assertEq(name, got, expect) {
    const ok = got === expect;
    console.log(`${ok ? '✓' : '✗'} ${name}: got=${JSON.stringify(got)}, expect=${JSON.stringify(expect)}`);
    if (!ok) process.exitCode = 1;
}

const gd = await login('test.gd@motnha.vn', 'Test@1234');
const nvkd = await login('test.nvkd@motnha.vn', 'Test@1234');
console.log('✓ Logged in 2 users');

// Tạo khách của NVKD
const c = await api(nvkd, '/api/customers', { method: 'POST', body: JSON.stringify({ name: 'Phase2 E2E', phone: '0900000200' }) });
const cid = c.body.id;

// Upload 1 ảnh giả
const fd = new FormData();
fd.append('file', new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], 'test.jpg', { type: 'image/jpeg' }));
fd.append('type', 'checkin');
const up = await fetch(`${BASE}/api/upload`, { method: 'POST', headers: { cookie: nvkd }, body: fd });
const upJson = await up.json();
assertEq('Upload status', up.status, 200);

// Check-in với ảnh + metadata
const r1 = await api(nvkd, `/api/customers/${cid}/interactions`, {
    method: 'POST',
    body: JSON.stringify({
        content: 'E2E gặp khách',
        photos: [upJson.url],
        interestLevel: 'Nóng',
        outcome: 'Đặt cọc',
        companionIds: [],
    }),
});
assertEq('NVKD check-in → 201', r1.status, 201);
assertEq('Photos stored', r1.body.photos?.length, 1);
assertEq('InterestLevel stored', r1.body.interestLevel, 'Nóng');
assertEq('Outcome stored', r1.body.outcome, 'Đặt cọc');

// Verify customer side-effects
const c2 = await api(gd, `/api/customers/${cid}`);
assertEq('Customer score updated = 5', c2.body.score, 5);
assertEq('Customer pipelineStage updated', c2.body.pipelineStage, 'Cọc');
assertEq('lastContactAt set', !!c2.body.lastContactAt, true);

// NVKD thử check-in khách không phải của mình
const otherC = await api(gd, '/api/customers', { method: 'POST', body: JSON.stringify({ name: 'E2E other', phone: '0900000201' }) });
const r2 = await api(nvkd, `/api/customers/${otherC.body.id}/interactions`, {
    method: 'POST',
    body: JSON.stringify({ content: 'hack attempt' }),
});
assertEq('NVKD check-in khách người khác → 403', r2.status, 403);

// GD GET list
const r3 = await api(gd, `/api/customer-interactions?limit=50`);
assertEq('GD list status', r3.status, 200);
const found = (r3.body.data || []).some(it => it.id === r1.body.id);
assertEq('GD thấy interaction vừa tạo', found, true);

// NVKD GET list chỉ thấy của mình
const r4 = await api(nvkd, `/api/customer-interactions?limit=50`);
assertEq('NVKD list status', r4.status, 200);
const allMine = (r4.body.data || []).every(it => it.createdBy === it.createdByUser?.id);
assertEq('NVKD chỉ thấy của mình', allMine, true);

// Cleanup
await api(gd, `/api/customers/${cid}`, { method: 'DELETE' });
await api(gd, `/api/customers/${otherC.body.id}`, { method: 'DELETE' });

console.log('\n' + (process.exitCode ? '✗ SOME FAILED' : '✓ ALL E2E PASS'));
```

- [ ] **Step 3: Chạy dev server + E2E**

```bash
# Terminal 1
PORT=3001 npm run dev
# Terminal 2 (sau khi server ready)
node scripts/e2e-crm-phase2.mjs
```

Expected: `✓ ALL E2E PASS` (toàn bộ 11 assertions ✓).

- [ ] **Step 4: Production build**

```bash
npm run build
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 5: Push**

```bash
git add components/Sidebar.js scripts/e2e-crm-phase2.mjs
git commit -m "feat(crm-phase2): menu Hoạt động NVKD + E2E smoke test"
git push origin main
```

---

## Post-Plan Checklist

- [ ] Toàn bộ migration chạy thành công (prod & dev).
- [ ] `npm run build` pass ở task 11.
- [ ] E2E script 11 assertion pass.
- [ ] 2 test users (test.nvkd@motnha.vn, test.gd@motnha.vn) giữ nguyên để test tiếp Phase 3+4.
- [ ] Deploy thành công qua GitHub Actions (check `https://erp.motnha.vn` sau 2-3 phút).

**Phase 2 hoàn tất.** Phase 3 (VisitPlan) chỉ làm nếu user yêu cầu — hiện tại có thể dừng ở đây và observe real-world usage vài tuần trước.
