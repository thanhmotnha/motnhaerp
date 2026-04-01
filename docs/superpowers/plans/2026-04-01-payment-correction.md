# Payment Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép kế toán tạo yêu cầu đính chính số tiền đã thu sai, Giám đốc/Phó GĐ duyệt hoặc từ chối, có thông báo 2 chiều.

**Architecture:** Thêm model `PaymentCorrection` lưu yêu cầu. Hai API routes xử lý tạo + duyệt/từ chối. `ReceivablesTab.js` được mở rộng: nút đính chính trên mỗi đợt đã thu, modal tạo yêu cầu, panel duyệt cho GĐ/Phó GĐ, badge pending trên tab header. Khi approved, `ContractPayment.paidAmount` và `Contract.paidAmount` được recalculated.

**Tech Stack:** Next.js 16 App Router, Prisma 6, Zod 4, `withAuth` từ `@/lib/apiHandler`, existing `Notification` model, existing `useRole` hook từ `@/contexts/RoleContext`.

---

## File Structure

| File | Action | Trách nhiệm |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Thêm `PaymentCorrection` model + relation vào `ContractPayment` |
| `lib/validations/paymentCorrection.js` | Create | 2 Zod schemas: create + review |
| `app/api/payment-corrections/route.js` | Create | GET list + POST tạo yêu cầu |
| `app/api/payment-corrections/[id]/route.js` | Create | PUT approve/reject |
| `components/finance/ReceivablesTab.js` | Modify | Nút đính chính, modal, badge, panel duyệt |

---

### Task 1: Schema — thêm `PaymentCorrection` model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Mở `prisma/schema.prisma`, tìm `model ContractPayment {` và thêm relation field**

  Tìm dòng `createdAt DateTime @default(now())` trong `model ContractPayment` (dòng ~641). Thêm 1 dòng TRƯỚC `@@index([contractId])`:

  ```prisma
  corrections  PaymentCorrection[]
  ```

  Sau khi sửa đoạn cuối của `ContractPayment` trông như sau:
  ```prisma
  model ContractPayment {
    id                  String   @id @default(cuid())
    phase               String
    amount              Float    @default(0)
    paidAmount          Float    @default(0)
    category            String   @default("Hợp đồng")
    status              String   @default("Chưa thu")
    dueDate             DateTime?
    paidDate            DateTime?
    notes               String   @default("")
    proofUrl            String   @default("")
    retentionRate       Float    @default(0)
    retentionAmount     Float    @default(0)
    retentionReleasedAt DateTime?
    contractId          String
    contract            Contract @relation(fields: [contractId], references: [id], onDelete: Cascade)
    corrections         PaymentCorrection[]
    createdAt           DateTime @default(now())
    @@index([contractId])
  }
  ```

- [ ] **Step 2: Thêm model `PaymentCorrection` sau `model ContractPayment` (sau dòng `}`)**

  ```prisma
  model PaymentCorrection {
    id                  String   @id @default(cuid())
    contractPaymentId   String
    contractPayment     ContractPayment @relation(fields: [contractPaymentId], references: [id], onDelete: Cascade)
    contractId          String
    oldAmount           Float
    newAmount           Float
    reason              String   @db.Text
    status              String   @default("pending")
    rejectionNote       String   @default("")
    requestedBy         String
    reviewedBy          String?
    createdAt           DateTime @default(now())
    reviewedAt          DateTime?
    @@index([contractPaymentId])
    @@index([status])
  }
  ```

- [ ] **Step 3: Push schema**

  ```bash
  cd d:/Codeapp/motnha
  ./node_modules/.bin/prisma db push
  ```

  Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 4: Regenerate client**

  ```bash
  npm run db:generate
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add prisma/schema.prisma
  git commit -m "feat(schema): add PaymentCorrection model"
  ```

---

### Task 2: Validation schemas

**Files:**
- Create: `lib/validations/paymentCorrection.js`

- [ ] **Step 1: Tạo file**

  ```javascript
  import { z } from 'zod';

  export const correctionCreateSchema = z.object({
      contractPaymentId: z.string().min(1),
      contractId: z.string().min(1),
      newAmount: z.number().positive('Số tiền phải lớn hơn 0'),
      reason: z.string().trim().min(5, 'Lý do tối thiểu 5 ký tự').max(1000),
  }).strict();

  export const correctionReviewSchema = z.object({
      action: z.enum(['approved', 'rejected']),
      rejectionNote: z.string().trim().max(500).optional().default(''),
  }).strict();
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add lib/validations/paymentCorrection.js
  git commit -m "feat(validation): payment correction Zod schemas"
  ```

---

### Task 3: API — GET + POST `/api/payment-corrections`

**Files:**
- Create: `app/api/payment-corrections/route.js`

- [ ] **Step 1: Tạo file**

  ```javascript
  import { withAuth } from '@/lib/apiHandler';
  import prisma from '@/lib/prisma';
  import { NextResponse } from 'next/server';
  import { correctionCreateSchema } from '@/lib/validations/paymentCorrection';

  const FINANCE_ROLES = ['giam_doc', 'pho_gd', 'ke_toan'];

  export const GET = withAuth(async (request, _ctx, session) => {
      if (!FINANCE_ROLES.includes(session.user.role)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status');

      const where = {};
      if (status) where.status = status;

      const corrections = await prisma.paymentCorrection.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: {
              contractPayment: {
                  select: {
                      phase: true,
                      amount: true,
                      contract: {
                          select: { id: true, code: true, name: true },
                      },
                  },
              },
          },
      });

      return NextResponse.json(corrections);
  });

  export const POST = withAuth(async (request, _ctx, session) => {
      if (!FINANCE_ROLES.includes(session.user.role)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const body = await request.json();
      const validated = correctionCreateSchema.parse(body);

      // Check không có pending correction khác cho cùng contractPaymentId
      const existing = await prisma.paymentCorrection.findFirst({
          where: { contractPaymentId: validated.contractPaymentId, status: 'pending' },
      });
      if (existing) {
          return NextResponse.json(
              { error: 'Đã có yêu cầu đính chính đang chờ duyệt cho đợt này' },
              { status: 409 }
          );
      }

      // Lấy oldAmount từ ContractPayment hiện tại
      const payment = await prisma.contractPayment.findUnique({
          where: { id: validated.contractPaymentId },
          select: { paidAmount: true },
      });
      if (!payment) {
          return NextResponse.json({ error: 'Không tìm thấy đợt thanh toán' }, { status: 404 });
      }

      const correction = await prisma.paymentCorrection.create({
          data: {
              contractPaymentId: validated.contractPaymentId,
              contractId: validated.contractId,
              oldAmount: payment.paidAmount,
              newAmount: validated.newAmount,
              reason: validated.reason,
              requestedBy: session.user.id,
          },
      });

      // Tạo notification cho GĐ/Phó GĐ
      await prisma.notification.create({
          data: {
              type: 'warning',
              icon: '✏️',
              title: 'Yêu cầu đính chính thanh toán',
              message: `${session.user.name} yêu cầu đính chính số tiền đã thu`,
              link: '/finance?tab=thu_tien',
              source: 'payment_correction',
          },
      });

      return NextResponse.json(correction, { status: 201 });
  });
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/api/payment-corrections/route.js
  git commit -m "feat(api): GET+POST /api/payment-corrections"
  ```

---

### Task 4: API — PUT `/api/payment-corrections/[id]` (approve/reject)

**Files:**
- Create: `app/api/payment-corrections/[id]/route.js`

- [ ] **Step 1: Tạo file**

  ```javascript
  import { withAuth } from '@/lib/apiHandler';
  import prisma from '@/lib/prisma';
  import { NextResponse } from 'next/server';
  import { correctionReviewSchema } from '@/lib/validations/paymentCorrection';

  const REVIEW_ROLES = ['giam_doc', 'pho_gd'];

  export const PUT = withAuth(async (request, { params }, session) => {
      if (!REVIEW_ROLES.includes(session.user.role)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { id } = await params;
      const body = await request.json();
      const { action, rejectionNote } = correctionReviewSchema.parse(body);

      const correction = await prisma.paymentCorrection.findUnique({
          where: { id },
          select: { id: true, status: true, contractPaymentId: true, contractId: true, newAmount: true, requestedBy: true },
      });
      if (!correction) {
          return NextResponse.json({ error: 'Không tìm thấy yêu cầu đính chính' }, { status: 404 });
      }
      if (correction.status !== 'pending') {
          return NextResponse.json({ error: 'Yêu cầu đã được xử lý' }, { status: 400 });
      }

      if (action === 'approved') {
          // Lấy ContractPayment để xác định status mới
          const cp = await prisma.contractPayment.findUnique({
              where: { id: correction.contractPaymentId },
              select: { amount: true },
          });

          const newPaid = correction.newAmount;
          const newStatus = newPaid <= 0 ? 'Chưa thu'
              : newPaid >= (cp?.amount || 0) ? 'Đã thu'
              : 'Thu một phần';

          await prisma.$transaction(async (tx) => {
              // Cập nhật ContractPayment
              await tx.contractPayment.update({
                  where: { id: correction.contractPaymentId },
                  data: { paidAmount: newPaid, status: newStatus },
              });

              // Recalc Contract.paidAmount
              const total = await tx.contractPayment.aggregate({
                  where: { contractId: correction.contractId },
                  _sum: { paidAmount: true },
              });
              await tx.contract.update({
                  where: { id: correction.contractId },
                  data: { paidAmount: total._sum.paidAmount || 0 },
              });

              // Cập nhật correction
              await tx.paymentCorrection.update({
                  where: { id },
                  data: { status: 'approved', reviewedBy: session.user.id, reviewedAt: new Date() },
              });
          });

          // Notification cho người tạo yêu cầu
          await prisma.notification.create({
              data: {
                  type: 'success',
                  icon: '✅',
                  title: 'Yêu cầu đính chính được duyệt',
                  message: `Số tiền đã được cập nhật thành công`,
                  link: '/finance?tab=thu_tien',
                  source: 'payment_correction',
              },
          });
      } else {
          // rejected
          await prisma.paymentCorrection.update({
              where: { id },
              data: {
                  status: 'rejected',
                  rejectionNote: rejectionNote || '',
                  reviewedBy: session.user.id,
                  reviewedAt: new Date(),
              },
          });

          await prisma.notification.create({
              data: {
                  type: 'danger',
                  icon: '❌',
                  title: 'Yêu cầu đính chính bị từ chối',
                  message: rejectionNote ? `Lý do: ${rejectionNote}` : 'Yêu cầu đính chính bị từ chối',
                  link: '/finance?tab=thu_tien',
                  source: 'payment_correction',
              },
          });
      }

      return NextResponse.json({ ok: true });
  });
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/api/payment-corrections/[id]/route.js
  git commit -m "feat(api): PUT /api/payment-corrections/[id] — approve/reject"
  ```

---

### Task 5: Frontend — ReceivablesTab.js

**Files:**
- Modify: `components/finance/ReceivablesTab.js`

Đây là task lớn nhất. Đọc file hiện tại trước để hiểu đúng vị trí các thay đổi.

**Tổng quan thay đổi:**
1. Import thêm `useRole` và `useToast`
2. Thêm state cho corrections và correction modal
3. Thêm `fetchCorrections()` và gọi khi mount
4. Badge pending trên sub-tab "💵 Đợt thanh toán" (chỉ cho `giam_doc`, `pho_gd`)
5. Panel duyệt phía trên bảng đợt thanh toán (chỉ cho `giam_doc`, `pho_gd`)
6. Nút "✏️ Đính chính" trong cột Thao tác
7. Modal đính chính

- [ ] **Step 1: Thêm imports ở đầu file**

  Thay dòng 1-2 hiện tại:
  ```javascript
  'use client';
  import { useState, useEffect, useRef } from 'react';
  ```

  Thành:
  ```javascript
  'use client';
  import { useState, useEffect, useRef } from 'react';
  import { useRole } from '@/contexts/RoleContext';
  import { useToast } from '@/components/ui/Toast';
  ```

- [ ] **Step 2: Thêm hook calls và state ở đầu component**

  Tìm dòng `export default function ReceivablesTab() {` (dòng 8). Sau dòng:
  ```javascript
  const proofRef = useRef();
  ```

  Thêm:
  ```javascript
  const { role } = useRole();
  const { showToast } = useToast();
  const canReview = role === 'giam_doc' || role === 'pho_gd';
  const [corrections, setCorrections] = useState([]);
  const [correctionModal, setCorrectionModal] = useState(null); // { payment }
  const [correctionForm, setCorrectionForm] = useState({ newAmount: '', reason: '' });
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [rejectingId, setRejectingId] = useState(null); // correction id đang reject
  const [rejectNote, setRejectNote] = useState('');
  const [reviewingId, setReviewingId] = useState(null); // loading state khi approve/reject
  ```

- [ ] **Step 3: Thêm hàm `fetchCorrections` và gọi trong `useEffect`**

  Tìm hàm `fetchAll`:
  ```javascript
  const fetchAll = async () => {
      setLoading(true);
      const [cRes, rRes] = await Promise.all([
          fetch('/api/contracts?limit=1000').then(r => r.json()).then(d => d.data || []),
          fetch('/api/finance/receivables').then(r => r.json()),
      ]);
      setContracts(cRes);
      setReceivables(rRes);
      setLoading(false);
  };
  useEffect(() => { fetchAll(); }, []);
  ```

  Thay bằng:
  ```javascript
  const fetchAll = async () => {
      setLoading(true);
      const [cRes, rRes] = await Promise.all([
          fetch('/api/contracts?limit=1000').then(r => r.json()).then(d => d.data || []),
          fetch('/api/finance/receivables').then(r => r.json()),
      ]);
      setContracts(cRes);
      setReceivables(rRes);
      setLoading(false);
  };

  const fetchCorrections = async () => {
      try {
          const data = await fetch('/api/payment-corrections').then(r => r.ok ? r.json() : []);
          setCorrections(data);
      } catch { }
  };

  useEffect(() => { fetchAll(); fetchCorrections(); }, []);
  ```

- [ ] **Step 4: Thêm handlers cho correction**

  Tìm `// === Thu tiền ===` (dòng ~67). Ngay TRƯỚC dòng đó, thêm:

  ```javascript
  // === Đính chính ===
  const pendingCorrections = corrections.filter(c => c.status === 'pending');
  const pendingByPaymentId = new Set(pendingCorrections.map(c => c.contractPaymentId));

  const openCorrectionModal = (payment) => {
      setCorrectionForm({ newAmount: payment.paidAmount || 0, reason: '' });
      setCorrectionModal({ payment });
  };

  const submitCorrection = async () => {
      const { payment } = correctionModal;
      const newAmount = Number(correctionForm.newAmount);
      if (!newAmount || newAmount <= 0) return showToast('Số tiền phải lớn hơn 0', 'error');
      if (newAmount === payment.paidAmount) return showToast('Số tiền mới phải khác số tiền cũ', 'error');
      if (!correctionForm.reason.trim() || correctionForm.reason.trim().length < 5) return showToast('Lý do tối thiểu 5 ký tự', 'error');

      setSubmittingCorrection(true);
      try {
          const res = await fetch('/api/payment-corrections', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  contractPaymentId: payment.id,
                  contractId: payment.contractId,
                  newAmount,
                  reason: correctionForm.reason.trim(),
              }),
          });
          if (res.status === 409) { showToast('Đã có yêu cầu đính chính đang chờ duyệt cho đợt này', 'error'); setSubmittingCorrection(false); return; }
          if (!res.ok) throw new Error('Lỗi gửi yêu cầu');
          showToast('Đã gửi yêu cầu đính chính', 'success');
          setCorrectionModal(null);
          fetchCorrections();
      } catch (e) {
          showToast(e.message || 'Lỗi', 'error');
      }
      setSubmittingCorrection(false);
  };

  const reviewCorrection = async (correctionId, action, note = '') => {
      setReviewingId(correctionId);
      try {
          const res = await fetch(`/api/payment-corrections/${correctionId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action, rejectionNote: note }),
          });
          if (!res.ok) throw new Error('Lỗi xử lý yêu cầu');
          showToast(action === 'approved' ? 'Đã duyệt đính chính' : 'Đã từ chối yêu cầu', action === 'approved' ? 'success' : 'error');
          setRejectingId(null);
          setRejectNote('');
          fetchCorrections();
          fetchAll(); // reload paidAmount
      } catch (e) {
          showToast(e.message || 'Lỗi', 'error');
      }
      setReviewingId(null);
  };
  ```

- [ ] **Step 5: Thêm badge trên sub-tab "Đợt thanh toán"**

  Tìm đoạn `TABS` và render sub-tabs:
  ```javascript
  const TABS = [
      { key: 'overview', label: '📊 Tổng quan HĐ' },
      { key: 'phases', label: '💵 Đợt thanh toán' },
  ];
  ```

  Thay bằng:
  ```javascript
  const TABS = [
      { key: 'overview', label: '📊 Tổng quan HĐ' },
      { key: 'phases', label: '💵 Đợt thanh toán', badge: canReview ? pendingCorrections.length : 0 },
  ];
  ```

  Tìm đoạn render các tab button:
  ```javascript
  {TABS.map(t => (
      <button key={t.key} onClick={() => setTab(t.key)}
          style={{ padding: '10px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer', border: 'none', background: 'transparent', color: tab === t.key ? 'var(--text-accent)' : 'var(--text-muted)', borderBottom: tab === t.key ? '2px solid var(--accent-primary)' : '2px solid transparent' }}>
          {t.label}
      </button>
  ))}
  ```

  Thay bằng:
  ```javascript
  {TABS.map(t => (
      <button key={t.key} onClick={() => setTab(t.key)}
          style={{ padding: '10px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer', border: 'none', background: 'transparent', color: tab === t.key ? 'var(--text-accent)' : 'var(--text-muted)', borderBottom: tab === t.key ? '2px solid var(--accent-primary)' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: 6 }}>
          {t.label}
          {t.badge > 0 && (
              <span style={{ background: 'var(--status-danger)', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px', lineHeight: '16px' }}>
                  {t.badge}
              </span>
          )}
      </button>
  ))}
  ```

- [ ] **Step 6: Thêm panel duyệt + nút đính chính trong tab `phases`**

  Trong tab `phases`, tìm đoạn bắt đầu bằng:
  ```javascript
  {loading ? <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> : filteredPayments.length === 0 ? (
  ```

  Thêm panel duyệt TRƯỚC đoạn đó (ngay sau dòng `{/* Contract chips */}` section kết thúc):

  ```javascript
  {/* Panel duyệt đính chính — chỉ GĐ/Phó GĐ */}
  {canReview && pendingCorrections.length > 0 && (
      <div style={{ marginBottom: 16, border: '1px solid var(--status-warning)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ background: 'var(--status-warning)', color: '#fff', padding: '8px 14px', fontWeight: 700, fontSize: 13 }}>
              📋 Yêu cầu đính chính chờ duyệt ({pendingCorrections.length})
          </div>
          {pendingCorrections.map(c => (
              <div key={c.id} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>
                              {c.contractPayment?.contract?.code} — {c.contractPayment?.phase}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                              Số cũ: <span style={{ color: 'var(--status-danger)', fontWeight: 600 }}>{fmt(c.oldAmount)}</span>
                              {' → '}
                              Số mới: <span style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(c.newAmount)}</span>
                          </div>
                          <div style={{ fontSize: 12, marginTop: 4 }}>
                              <strong>Lý do:</strong> {c.reason}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                              {new Date(c.createdAt).toLocaleString('vi-VN')}
                          </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexDirection: 'column', alignItems: 'flex-end' }}>
                          {rejectingId === c.id ? (
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                  <input
                                      className="form-input"
                                      placeholder="Lý do từ chối..."
                                      value={rejectNote}
                                      onChange={e => setRejectNote(e.target.value)}
                                      style={{ fontSize: 12, width: 200 }}
                                      autoFocus
                                  />
                                  <button className="btn btn-danger btn-sm" style={{ fontSize: 11 }}
                                      disabled={reviewingId === c.id}
                                      onClick={() => reviewCorrection(c.id, 'rejected', rejectNote)}>
                                      {reviewingId === c.id ? '⏳' : 'Xác nhận'}
                                  </button>
                                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                                      onClick={() => { setRejectingId(null); setRejectNote(''); }}>
                                      Hủy
                                  </button>
                              </div>
                          ) : (
                              <>
                                  <button className="btn btn-success btn-sm" style={{ fontSize: 11 }}
                                      disabled={reviewingId === c.id}
                                      onClick={() => reviewCorrection(c.id, 'approved')}>
                                      {reviewingId === c.id ? '⏳' : '✅ Duyệt'}
                                  </button>
                                  <button className="btn btn-danger btn-sm" style={{ fontSize: 11 }}
                                      onClick={() => { setRejectingId(c.id); setRejectNote(''); }}>
                                      ❌ Từ chối
                                  </button>
                              </>
                          )}
                      </div>
                  </div>
              </div>
          ))}
      </div>
  )}
  ```

- [ ] **Step 7: Thêm nút "✏️ Đính chính" trong cột Thao tác của bảng**

  Tìm đoạn render cột Thao tác trong bảng:
  ```javascript
  <td>
      <div style={{ display: 'flex', gap: 4 }}>
          {p.status !== 'Đã thu' && <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onClick={() => startCollect(p)}>💵 Thu tiền</button>}
          {(p.paidAmount || 0) > 0 && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => printReceipt(p)}>🧾 Phiếu thu</button>}
      </div>
  </td>
  ```

  Thay bằng:
  ```javascript
  <td>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {p.status !== 'Đã thu' && <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onClick={() => startCollect(p)}>💵 Thu tiền</button>}
          {(p.paidAmount || 0) > 0 && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => printReceipt(p)}>🧾 Phiếu thu</button>}
          {(p.paidAmount || 0) > 0 && !pendingByPaymentId.has(p.id) && (
              <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => openCorrectionModal(p)}>✏️ Đính chính</button>
          )}
          {pendingByPaymentId.has(p.id) && (
              <span style={{ fontSize: 10, color: 'var(--status-warning)', fontWeight: 600 }}>⏳ Đang chờ duyệt</span>
          )}
      </div>
  </td>
  ```

- [ ] **Step 8: Thêm modal đính chính trước thẻ đóng `</div>` cuối cùng**

  Tìm đoạn cuối file, ngay TRƯỚC `</div>` cuối cùng (sau modal thu tiền đóng `</div>`):

  ```javascript
  {/* Modal đính chính */}
  {correctionModal && (
      <div className="modal-overlay" onClick={() => !submittingCorrection && setCorrectionModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
              <div className="modal-header">
                  <h3>✏️ Yêu cầu đính chính số tiền</h3>
                  <button className="modal-close" onClick={() => !submittingCorrection && setCorrectionModal(null)}>×</button>
              </div>
              <div className="modal-body">
                  <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                      <div><strong>HĐ:</strong> {correctionModal.payment.contract?.code} — {correctionModal.payment.contract?.name}</div>
                      <div><strong>Đợt:</strong> {correctionModal.payment.phase}</div>
                      <div><strong>Đã thu hiện tại:</strong> <span style={{ color: 'var(--status-danger)', fontWeight: 600 }}>{fmt(correctionModal.payment.paidAmount)}</span></div>
                  </div>
                  <div className="form-group">
                      <label className="form-label">Số tiền đúng *</label>
                      <input
                          className="form-input"
                          type="number"
                          value={correctionForm.newAmount}
                          onChange={e => setCorrectionForm(prev => ({ ...prev, newAmount: e.target.value }))}
                          autoFocus
                      />
                  </div>
                  <div className="form-group">
                      <label className="form-label">Lý do đính chính * <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 400 }}>(tối thiểu 5 ký tự)</span></label>
                      <textarea
                          className="form-input"
                          rows={3}
                          value={correctionForm.reason}
                          onChange={e => setCorrectionForm(prev => ({ ...prev, reason: e.target.value }))}
                          placeholder="Ví dụ: Kế toán nhập nhầm số tiền, đúng phải là..."
                          style={{ resize: 'vertical' }}
                      />
                  </div>
              </div>
              <div className="modal-footer">
                  <button className="btn btn-ghost" onClick={() => setCorrectionModal(null)} disabled={submittingCorrection}>Hủy</button>
                  <button className="btn btn-primary" onClick={submitCorrection} disabled={submittingCorrection || Number(correctionForm.newAmount) === correctionModal.payment.paidAmount}>
                      {submittingCorrection ? '⏳ Đang gửi...' : '📤 Gửi yêu cầu'}
                  </button>
              </div>
          </div>
      </div>
  )}
  ```

- [ ] **Step 9: Commit**

  ```bash
  git add components/finance/ReceivablesTab.js
  git commit -m "feat(finance): payment correction UI — request, review panel, badge"
  ```

---

### Task 6: Push và deploy

- [ ] **Step 1: Push lên main**

  ```bash
  git push origin main
  ```

  Expected: deploy tự động qua GitHub Actions, xong sau ~2-3 phút.

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| `PaymentCorrection` model với đầy đủ fields | Task 1 |
| Zod schemas create + review | Task 2 |
| GET list + POST tạo yêu cầu | Task 3 |
| POST check 409 nếu có pending | Task 3 |
| POST lấy oldAmount từ DB | Task 3 |
| POST tạo Notification | Task 3 |
| PUT approve: update paidAmount + status + recalc contract | Task 4 |
| PUT approve: transaction an toàn | Task 4 |
| PUT reject: lưu rejectionNote | Task 4 |
| PUT tạo Notification cho cả 2 case | Task 4 |
| Nút "✏️ Đính chính" chỉ hiện khi paidAmount > 0 và không có pending | Task 5 Step 7 |
| Badge số pending trên tab header (chỉ GĐ/Phó GĐ) | Task 5 Step 5 |
| Panel duyệt với số cũ → số mới + lý do | Task 5 Step 6 |
| Inline reject input với lý do | Task 5 Step 6 |
| Modal tạo yêu cầu: số mới + lý do | Task 5 Step 8 |
| Disable submit nếu newAmount === oldAmount | Task 5 Step 8 |
| Phân quyền tạo: ke_toan/pho_gd/giam_doc | Task 3 |
| Phân quyền duyệt: chỉ giam_doc/pho_gd | Task 4 |
| Sau từ chối, kế toán tạo lại được | Task 3 — chỉ block `pending`, không block `rejected` |

**Không có placeholder nào.** Tất cả code đầy đủ. Types nhất quán: `correctionCreateSchema`, `correctionReviewSchema`, `corrections` state, `pendingCorrections`, `pendingByPaymentId` dùng xuyên suốt.
