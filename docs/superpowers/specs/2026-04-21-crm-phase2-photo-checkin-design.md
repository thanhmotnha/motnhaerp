# CRM Phase 2 — Photo Check-in Design Spec

**Date:** 2026-04-21
**Phase:** 2 (Field Activity Tracking — lightweight, không GPS)
**Depends on:** Phase 1 (Customer.salesPersonId)

## Goal

NVKD đi gặp khách có thể check-in bằng **ảnh + ghi chú + metadata có cấu trúc**, nhập được cả trên mobile (tại chỗ) và desktop (về văn phòng). Giám đốc review hoạt động NVKD qua trang riêng.

**Không dùng GPS** — quyết định sau khi brainstorm: volume thấp (1-2 KH/ngày), friction văn hoá, và photo + ghi chú + lịch sử check-in đã đủ để giám đốc đánh giá.

## Scope

### Trong phạm vi
- Mở rộng `CustomerInteraction` với 4 field mới (photos, interestLevel, outcome, companionIds)
- Upload ảnh lên R2 qua endpoint mới
- Modal check-in mobile-friendly trên trang chi tiết khách
- Trang `/customers/activities` cho giám đốc xem tổng hợp
- Side-effects: check-in update `Customer.score` + `pipelineStage` + `lastContactAt`
- Permission: NVKD chỉ check-in cho khách của mình; giám đốc xem all

### Ngoài phạm vi (để Phase 3+)
- VisitPlan / lịch thăm khách trước
- Reminder auto cho "khách cần gặp lại"
- Dashboard KPI đầy đủ (Phase 4)
- Geolocation verify

## Architecture

### Data Model Changes

```prisma
model CustomerInteraction {
  id            String   @id @default(cuid())
  type          String                     // existing: 'Gặp trực tiếp' dùng cho check-in
  content       String                     // ghi chú nội dung trao đổi
  date          DateTime @default(now())
  customerId    String
  createdBy     String   @default("")      // user ID (đổi từ string name → id để query)
  createdAt     DateTime @default(now())

  // NEW FIELDS
  photos        String[] @default([])      // R2 URLs
  interestLevel String   @default("")      // "Nóng" | "Ấm" | "Lạnh" | ""
  outcome       String   @default("")      // "Báo giá" | "Đặt cọc" | "Từ chối" | "Cần gặp lại" | ""
  companionIds  String[] @default([])      // User IDs đi cùng

  customer      Customer @relation(fields: [customerId], references: [id])

  @@index([customerId])
  @@index([date])
  @@index([createdBy])                     // NEW: filter theo NVKD
}
```

**Migration notes:**
- `photos`, `companionIds` là `String[]` (Postgres native array)
- `interestLevel`, `outcome` là string với enum-like values (không dùng Prisma enum vì sau có thể thêm giá trị mới)
- `createdBy` đang chứa string rỗng hoặc tên, cần viết code defensively — không migrate value cũ, chỉ record mới dùng userId

### API Endpoints

#### 1. POST `/api/upload/photo` (NEW)
- Accept `multipart/form-data` với field `file`
- Validate: image/*, max 5MB/ảnh
- Upload R2 key: `checkin/{userId}/{timestamp}-{random}.{ext}`
- Return `{ url: "https://..." }`
- Role: tất cả authenticated user

#### 2. `POST /api/customers/[id]/interactions` (MODIFY existing)
- Accept body: `{ type, content, date?, photos?, interestLevel?, outcome?, companionIds? }`
- Validate qua Zod schema mới (`interactionCreateSchema`)
- Permission: NVKD chỉ tạo cho customer.salesPersonId === session.user.id; giám đốc/kế toán all
- Side-effects (chạy trong `$transaction`):
  - Create interaction với createdBy = session.user.id
  - Update customer.lastContactAt = now
  - Nếu `interestLevel` có giá trị: update `customer.score` theo map (Lạnh=1, Ấm=3, Nóng=5)
  - Nếu `outcome` ∈ ["Đặt cọc","Từ chối","Báo giá"]: update `customer.pipelineStage` (Đặt cọc→"Cọc", Từ chối→"Dừng", Báo giá→"Báo giá")

#### 3. `GET /api/customers/[id]/interactions` (MODIFY)
- Include `createdByUser` (join User via createdBy) và `companions` (join User[] via companionIds)
- Response: `[{ ...interaction, createdByUser: {id,name}, companions: [{id,name}] }]`

#### 4. `GET /api/customer-interactions` (NEW)
- List interactions across all customers
- Query params: `?salesPersonId=&from=&to=&outcome=&limit=&page=`
- Include: customer (id, code, name), createdByUser, companions
- Permission:
  - `kinh_doanh`: tự filter createdBy = self
  - `giam_doc`, `ke_toan`: tự do
  - other: 403

### UI Changes

#### A. Modal Check-in (`components/CheckinModal.js` — NEW)
Triggered từ nút **"+ Check-in"** trên `/customers/[id]`.
- Mobile-friendly: single column, camera input `<input type="file" accept="image/*" capture="environment" multiple>`
- Upload từng ảnh lên `/api/upload/photo` ngay khi chọn (show preview + progress)
- Form fields:
  - Ghi chú (textarea, bắt buộc)
  - Loại gặp (select: "Lần đầu" / "Tư vấn" / "Khảo sát nhà" / "Chốt HĐ" / "Thăm hỏi")
  - Mức độ quan tâm (3 button pill: Nóng/Ấm/Lạnh)
  - Kết quả (select: "" / "Báo giá" / "Đặt cọc" / "Từ chối" / "Cần gặp lại")
  - Đi cùng ai (multi-select dropdown từ /api/users)
- Submit → POST interactions → reload timeline

#### B. Trang chi tiết khách (`app/customers/[id]/page.js` — MODIFY)
- Nút "+ Check-in" to, icon camera, nổi bật bên cạnh các nút hiện tại
- Timeline interactions render: avatar NVKD, content, gallery ảnh thumb (click → lightbox), chip outcome + interestLevel, "đi cùng: X, Y"

#### C. Danh sách khách (`app/customers/page.js` — MODIFY nhẹ)
- Thêm badge nhỏ "Gần đây: Xd" (X ngày từ `lastContactAt`) trên kanban card + table row
- Màu cảnh báo nếu > 14 ngày chưa liên hệ (đỏ nhạt)

#### D. Trang mới `app/customers/activities/page.js`
- Chỉ giám đốc + kế toán thấy (sidebar item check permission)
- Filter: NVKD (dropdown), khoảng ngày, outcome, loại gặp
- List/timeline view: mỗi row = 1 interaction, ảnh thumb, khách, NVKD, outcome badge, ngày
- Summary top: tổng số gặp / NVKD trong kỳ
- Click row → drawer mở chi tiết interaction

### Role Permissions (cập nhật `contexts/RoleContext.js`)
```js
canCreateCheckin:   true  // kinh_doanh, giam_doc, ke_toan (cho user tự ghi nhận hộ)
canViewAllActivities: true // giam_doc, ke_toan only
```
- `kinh_doanh`: tạo được check-in nhưng chỉ cho khách của mình
- `ky_thuat`, `kho`: không tạo được

### Sidebar (components/Sidebar.js)
Thêm menu item "Hoạt động" dưới nhóm CRM, chỉ hiện nếu `canViewAllActivities`.

## Data Flow

```
[NVKD mobile]
  Trang KH chi tiết → nút "Check-in"
    → modal mở → chụp 1-3 ảnh → preview
    → fill note + dropdowns
    → submit:
        1. (đã upload từng ảnh → có URLs)
        2. POST /api/customers/{id}/interactions
           body: { type:"Gặp trực tiếp", content, photos:[urls], interestLevel, outcome, companionIds }
        3. Server: validate + permission + create + side-effects (transaction)
        4. Response: interaction + updated customer
    → close modal, refresh timeline + refresh customer (updated pipelineStage/score)

[Giám đốc desktop]
  Sidebar "Hoạt động" → /customers/activities
    → default filter: hôm nay + all NVKD
    → list 20 gần nhất
    → thumb click → lightbox; row click → drawer chi tiết
```

## Error Handling

- Upload ảnh fail → toast lỗi, giữ form, cho retry
- Permission 403 → toast "Không có quyền check-in cho khách này"
- R2 chưa cấu hình (dev local) → API upload return 503 với message rõ
- Photo > 5MB → client-side reject trước khi upload
- Network lỗi khi submit → local retry với `content` đã nhập (không bắt NVKD nhập lại)

## Testing

### Unit / Integration
- Zod schema `interactionCreateSchema` validate đúng các trường bắt buộc/optional
- `interestLevel` map sang score đúng
- `outcome` map sang pipelineStage đúng
- NVKD POST cho khách người khác → 403
- NVKD GET /customer-interactions → chỉ thấy của mình

### E2E (manual hoặc script giống Phase 1)
- Mobile (DevTools viewport 375px): camera input + submit hoạt động
- NVKD check-in khách của mình → timeline có ảnh, customer.score cập nhật
- Giám đốc vào /customers/activities → thấy check-in NVKD vừa tạo
- NVKD thấy 403 khi cố check-in khách của NVKD khác

## Non-Goals

- Không làm offline-first (volume 1-2/ngày không cần)
- Không xây native app, chỉ web responsive
- Không đồng bộ với Google Maps / Zalo
- Không bắt buộc ảnh (nếu user chỉ ghi chú text — không force)

## Open Questions

Không có — design đã cover đủ cho Phase 2. Câu hỏi phụ sẽ giải quyết trong plan.

---

**Next step:** Sau khi approve spec → invoke `writing-plans` skill để sinh plan chi tiết step-by-step.
