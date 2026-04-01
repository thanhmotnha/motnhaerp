# Payment Correction — Design Spec

**Date:** 2026-04-01  
**Status:** Approved  
**Goal:** Cho phép kế toán yêu cầu đính chính số tiền đã thu sai, Giám đốc/Phó GĐ duyệt hoặc từ chối, có thông báo 2 chiều.

---

## Background

Khi kế toán thu tiền qua `ReceivablesTab`, `paidAmount` được cộng dồn vào `ContractPayment`. Không có cách sửa nếu nhập sai. Fix thủ công trong DB là không bền vững. Cần flow kiểm soát: kế toán tạo yêu cầu → giám đốc duyệt → hệ thống áp dụng.

---

## Data Model

Thêm model `PaymentCorrection` vào `prisma/schema.prisma`, đặt sau `model ContractPayment`:

```prisma
model PaymentCorrection {
  id                  String   @id @default(cuid())
  contractPaymentId   String
  contractPayment     ContractPayment @relation(fields: [contractPaymentId], references: [id], onDelete: Cascade)
  contractId          String
  oldAmount           Float
  newAmount           Float
  reason              String   @db.Text
  status              String   @default("pending")  // pending | approved | rejected
  rejectionNote       String   @default("")
  requestedBy         String   // userId
  reviewedBy          String?  // userId
  createdAt           DateTime @default(now())
  reviewedAt          DateTime?
  @@index([contractPaymentId])
  @@index([status])
}
```

`ContractPayment` cần thêm relation field:
```prisma
corrections  PaymentCorrection[]
```

---

## API Routes

### `app/api/payment-corrections/route.js`

**GET** — list corrections (filter by status via `?status=pending`). Role: tất cả finance roles.  
**POST** — tạo yêu cầu mới. Body: `{ contractPaymentId, contractId, newAmount, reason }`.
- Validate: `newAmount > 0`, `reason` không rỗng
- Check: không được có correction `pending` khác cho cùng `contractPaymentId` → trả 409
- Tạo `PaymentCorrection` với `oldAmount` lấy từ `ContractPayment.paidAmount` hiện tại, `requestedBy = session.user.id`
- Tạo `Notification` broadcast: `type: 'warning', icon: '✏️', title: 'Yêu cầu đính chính thanh toán', link: '/finance?tab=thu_tien'`
- Role: `ke_toan`, `pho_gd`, `giam_doc`

### `app/api/payment-corrections/[id]/route.js`

**PUT** — approve hoặc reject. Body: `{ action: 'approved' | 'rejected', rejectionNote? }`.
- Role: `giam_doc`, `pho_gd`
- Nếu `approved`:
  - Update `ContractPayment.paidAmount = newAmount`
  - Update `ContractPayment.status` nếu cần (`Đã thu` / `Thu một phần` / `Chưa thu` theo so sánh với `amount`)
  - Recalc `Contract.paidAmount` (aggregate toàn bộ đợt)
  - Update `PaymentCorrection.status = 'approved'`, `reviewedBy`, `reviewedAt`
  - Tạo `Notification`: `type: 'success', icon: '✅', title: 'Yêu cầu đính chính được duyệt'`
- Nếu `rejected`:
  - Update `PaymentCorrection.status = 'rejected'`, `rejectionNote`, `reviewedBy`, `reviewedAt`
  - Tạo `Notification`: `type: 'danger', icon: '❌', title: 'Yêu cầu đính chính bị từ chối'`

---

## Validation

`lib/validations/paymentCorrection.js`:

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

---

## Frontend — `components/finance/ReceivablesTab.js`

### Nút "✏️ Đính chính"

Trong danh sách đợt thanh toán (tab `phases`), thêm nút bên cạnh nút thu tiền, chỉ hiện khi:
- `p.status === 'Đã thu' || p.status === 'Thu một phần'` (đã có paidAmount)
- Không có correction `pending` cho đợt này (check từ danh sách corrections đã fetch)
- Role: tất cả finance roles

### Modal đính chính (kế toán tạo)

- Hiện: tên đợt, số tiền đã thu hiện tại (readonly)
- Input: số tiền mới (number), lý do (textarea, bắt buộc)
- Submit → POST `/api/payment-corrections`
- Sau submit: reload danh sách corrections, show toast "Đã gửi yêu cầu đính chính"

### Badge pending trên tab header

- Fetch `GET /api/payment-corrections?status=pending` khi mount
- Nếu `count > 0` và role là `giam_doc` / `pho_gd`: hiện badge đỏ số lượng bên cạnh label "Thu tiền"
- Kế toán không thấy badge (họ chỉ tạo, không duyệt)

### Panel duyệt (giám đốc/phó GĐ)

- Nếu role là `giam_doc` / `pho_gd` và có pending corrections: hiện section "📋 Yêu cầu đính chính chờ duyệt" phía trên danh sách đợt
- Mỗi row: tên hợp đồng, đợt, số cũ → số mới, lý do, ngày tạo, người yêu cầu
- Nút "Duyệt" (xanh) và "Từ chối" (đỏ)
- Từ chối mở inline input nhập lý do → confirm
- Sau action: reload, show toast

---

## Phân quyền

| Action | ke_toan | pho_gd | giam_doc | ky_thuat |
|--------|---------|--------|----------|---------|
| Tạo yêu cầu | ✅ | ✅ | ✅ | ❌ |
| Duyệt/từ chối | ❌ | ✅ | ✅ | ❌ |
| Xem danh sách pending | ❌ (badge ẩn) | ✅ | ✅ | ❌ |

---

## Error Cases

| Case | Xử lý |
|------|-------|
| Đã có pending correction cho đợt này | API trả 409, FE hiện toast lỗi |
| `newAmount` bằng `oldAmount` | Validate FE: disable nút submit |
| Correction bị xóa trong lúc duyệt | API trả 404, FE reload |
| Kế toán tạo lại sau khi bị từ chối | Cho phép — status cũ là `rejected` không block |

---

## Files Summary

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Thêm `PaymentCorrection` model + relation vào `ContractPayment` |
| `lib/validations/paymentCorrection.js` | Tạo mới — 2 Zod schemas |
| `app/api/payment-corrections/route.js` | Tạo mới — GET + POST |
| `app/api/payment-corrections/[id]/route.js` | Tạo mới — PUT approve/reject |
| `components/finance/ReceivablesTab.js` | Sửa — thêm nút, modal, badge, panel duyệt |
