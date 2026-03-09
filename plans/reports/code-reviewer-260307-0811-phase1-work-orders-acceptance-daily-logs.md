# Code Review — Phase 1: Work Orders, Acceptance, Daily Logs

**Date:** 2026-03-07
**Reviewer:** code-reviewer
**Score: 7.5 / 10**

---

## Scope

| File | LoC | Status |
|------|-----|--------|
| `app/api/work-orders/[id]/route.js` | 61 | Đạt — có vài issues |
| `app/work-orders/[id]/page.js` | 264 | Đạt — cần fixes |
| `app/api/acceptance/[id]/route.js` | 57 | Đạt — cần Zod |
| `app/acceptance/[id]/page.js` | 248 | Đạt — hardcode màu |
| `lib/validations/daily-log.js` | 13 | Đạt — field mismatch |
| `app/daily-logs/page.js` | 211 | Đạt — field mismatch |
| `components/Sidebar.js` | 138 | Đạt — tốt |

---

## Critical Issues

### C1. DELETE không soft-delete — `app/api/work-orders/[id]/route.js:57`

```js
// HIỆN TẠI — xóa vĩnh viễn
await prisma.workOrder.delete({ where: { id } });

// CẦN sửa — soft delete
await prisma.workOrder.update({ where: { id }, data: { deletedAt: new Date() } });
```

**Impact:** Mất dữ liệu vĩnh viễn, phá vỡ liên kết với scheduleTask. Toàn bộ codebase dùng `deletedAt: null` filter (pattern đã xác nhận trong `app/api/work-orders/route.js:17`), nhưng DELETE handler lại phá vỡ pattern này.

---

### C2. GET work-order không filter `deletedAt: null` — `app/api/work-orders/[id]/route.js:8`

```js
// HIỆN TẠI — tìm cả record đã xóa
where: { id }

// CẦN sửa
where: { id, deletedAt: null }
```

**Impact:** Có thể hiển thị WO đã bị soft-delete (nếu sau này sửa DELETE thành soft-delete).

---

### C3. Field mismatch `workDone` vs `progress` — `lib/validations/daily-log.js` và `app/daily-logs/page.js`

Schema dùng `workDone`, API POST map sang `progress` (trường DB thực tế). Nhưng GET response trả về field DB `progress`, còn frontend list page đọc `log.progress` đúng. Tuy nhiên:

- Schema validation `dailyLogCreateSchema` **không được dùng** trong API (`app/api/daily-logs/route.js` tự parse body thủ công).
- Field `tomorrowPlan` trong schema và form **không được lưu vào DB** (model `siteLog` không có field này, API bỏ qua).
- Field `workforce` (schema/form) được map sang `workerCount` (DB) trong API — không nhất quán với schema export.

**Impact:** Schema validation bị bỏ qua hoàn toàn, dữ liệu `tomorrowPlan` bị mất silently.

---

## Warnings

### W1. Upload ảnh không dùng `apiFetch` — `app/work-orders/[id]/page.js:78`

```js
// Dùng raw fetch — bỏ qua auth/error handling của apiFetch
const res = await fetch('/api/upload', { method: 'POST', body: fd });
const d = await res.json();
if (d.url) newUrls.push(d.url);
// Không check res.ok — nếu upload fail vẫn tiếp tục silently
```

Cần check `res.ok` hoặc handle error status trước khi dùng `d.url`.

---

### W2. `deleteImage` không có `ConfirmDialog` — `app/work-orders/[id]/page.js:93`

Pattern chuẩn yêu cầu `ConfirmDialog` cho destructive actions. Xóa ảnh là destructive nhưng không có confirm.

---

### W3. Approve acceptance không có `ConfirmDialog` — `app/acceptance/[id]/page.js:60`

Duyệt biên bản nghiệm thu là action có hệ quả pháp lý nhưng không có confirm dialog. Người dùng có thể bấm nhầm.

---

### W4. API acceptance PUT không dùng Zod — `app/api/acceptance/[id]/route.js:24`

```js
// Destructure trực tiếp từ body — không validate
const { status, signedByCustomer, notes, inspector, customerRep, items } = body;
```

Không có validation type/length cho `status`, `notes`, `inspector`. Cần tạo Zod schema và dùng `.strict()` theo pattern.

---

### W5. Hardcode màu RGB trong acceptance page — `app/acceptance/[id]/page.js:11-13`

```js
'Chờ duyệt': { bg: 'rgba(234,179,8,0.1)', color: '#ca8a04' },
'Đạt': { bg: 'rgba(34,197,94,0.1)', color: '#16a34a' },
'Không đạt': { bg: 'rgba(239,68,68,0.1)', color: '#dc2626' },
```

CSS rules yêu cầu chỉ dùng `var(--*)`. Các màu này nên dùng `var(--status-success)`, `var(--status-warning)`, `var(--status-danger)`.

Tương tự dòng 126-127 (button "Không đạt") hardcode `rgba(239,68,68,0.1)` và `#dc2626`.

---

### W6. Race condition khi upload nhiều ảnh — `app/work-orders/[id]/page.js:74-91`

Upload tuần tự (for loop với await) rồi PUT một lần là đúng. Tuy nhiên nếu user click upload lần 2 trong khi đang upload lần 1, `images` state sẽ conflict. Nên disable input khi `uploading === true` (đã có nhưng chỉ disable button, chưa disable input file).

---

### W7. `acceptanceReport` update không check record tồn tại — `app/api/acceptance/[id]/route.js:48`

Nếu `id` không tồn tại, Prisma sẽ throw `P2025` error nhưng không được catch — trả 500 thay vì 404.

---

## Suggestions

### S1. PUT work-order không dùng transaction khi update scheduleTask

Nếu `workOrder.update` thành công nhưng `scheduleTask.update` fail, dữ liệu không nhất quán. Nên wrap trong `prisma.$transaction`.

### S2. `dailyLogCreateSchema` nên được dùng trong API

Tạo schema xong nhưng không import vào `app/api/daily-logs/route.js`. Thay thế manual validation bằng Zod schema để nhất quán.

### S3. `daily-logs/page.js` thiếu pagination UI

Hard limit `?limit=100` nhưng không có UI cho next page. Chấp nhận được cho MVP, nhưng nên note để làm sau.

### S4. `GET /api/work-orders/[id]` nên trả `images` đã parse

API trả `images` dưới dạng JSON string. Frontend phải `JSON.parse` thủ công (dòng 40). Nên parse ở API level để nhất quán với pattern của các API khác.

### S5. `InfoRow` component bị duplicate

`InfoRow` được định nghĩa giống hệt ở cả `work-orders/[id]/page.js` và `acceptance/[id]/page.js`. Nên extract thành shared component `components/ui/InfoRow.js`.

---

## Positive Observations

- `withAuth()` được dùng đúng trên tất cả API routes.
- Role-based approval (giam_doc / pho_gd) trong acceptance PUT được enforce đúng ở cả backend và frontend.
- `safePartial()` utility xử lý update schema tốt, tránh inject default values.
- `useCallback` dùng đúng trong `daily-logs/page.js` để memoize `load`.
- Sidebar filter role đúng, `daily-logs` không có `roles` restriction (ai cũng xem được — hợp lý cho công trường).
- `scheduleTask` progress auto-update sau khi WO hoàn thành là logic tốt.
- File sizes đều dưới 200 LoC (trừ page.js — 264 LoC, cần theo dõi).

---

## Recommended Actions (theo thứ tự ưu tiên)

1. **[Critical]** Sửa DELETE `/api/work-orders/[id]` thành soft-delete (`deletedAt`).
2. **[Critical]** Dùng Zod schema `dailyLogCreateSchema` trong `POST /api/daily-logs`, hoặc thêm field `tomorrowPlan` vào schema DB.
3. **[High]** Thêm `deletedAt: null` vào GET `/api/work-orders/[id]`.
4. **[High]** Check `res.ok` sau upload trong `handleUpload`.
5. **[High]** Thêm Zod validation vào `PUT /api/acceptance/[id]`.
6. **[Medium]** Thêm `ConfirmDialog` cho `deleteImage` và `approve`.
7. **[Medium]** Thay hardcode màu bằng CSS variables trong `acceptance/[id]/page.js`.
8. **[Medium]** Wrap WO + ScheduleTask update trong `prisma.$transaction`.
9. **[Low]** Extract `InfoRow` thành shared component.

---

## Unresolved Questions

1. Model `siteLog` có field `tomorrowPlan` không? Cần kiểm tra `schema.prisma` để confirm scope của C3.
2. `withAuth` có tự handle Prisma P2025 errors không, hay cần catch thủ công trong acceptance PUT?
3. Upload API `/api/upload` có require auth header không? (hiện tại bypass qua raw `fetch`).
